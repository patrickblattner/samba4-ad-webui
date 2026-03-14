# Samba4 AD WebUI — Projektdokumentation

> Erstellt am: 2026-03-13
> Zweck: Grundlage für Security Audit und Qualitätssicherungsprüfung

---

## 1. Projektübersicht

**Name:** samba4-ad-webui
**Version:** 0.1.0
**Typ:** Web-Applikation zur Administration eines Samba4 Active Directory
**Vorbild:** Microsoft RSAT "Active Directory Users and Computers" (ADUC/MMC Snap-in)

### Scope
- Verwaltung von Benutzern, Gruppen und Computerobjekten
- OU-Verwaltung (Erstellen, Umbenennen, Löschen inkl. rekursiv)
- Attribut-Editor für direkte LDAP-Attributbearbeitung
- Globale Suche über das Directory
- **Kein** DNS-Management, **keine** GPO-Verwaltung

### Deployment
- Docker-Container (App only)
- Verbindet sich mit einem externen Samba4 DC via LDAP/LDAPS
- Multi-Stage Docker Build (Node 22 Alpine)
- Production Port: 3000

---

## 2. Architektur

### 2.1 Tech Stack

| Schicht | Technologie |
|---------|------------|
| Frontend | React 19 + Vite 6 + shadcn/ui (Radix UI + Tailwind CSS 3) |
| State Management | TanStack Query 5 (Server-State) + Zustand 5 (UI-State) |
| Backend | Node.js / Express 4 |
| LDAP Client | ldapts 7 (TypeScript-native) |
| Auth | JWT (jsonwebtoken 9) + AES-256-GCM verschlüsselte Credentials |
| Monorepo | npm workspaces: `shared/`, `server/`, `client/` |
| Sprache | TypeScript 5 (ES Modules, strict mode) |
| Tests | Vitest (Unit/Integration), Playwright (E2E) |

### 2.2 Datenfluss

```
Browser (React)
    ↓ REST/JSON + Bearer Token
Express Backend (Node.js)
    ↓ LDAP/LDAPS (ldapts)
Samba4 Active Directory (DC)
```

1. User führt Aktion im Web-UI aus (z.B. "Benutzer erstellen")
2. React sendet REST-Request an Express-Backend
3. Express übersetzt Request in LDAP-Operationen via `ldapts`
4. LDAP-Operationen laufen unter der Identität des eingeloggten Users (Hybrid Bind)
5. Backend gibt Ergebnis als JSON zurück
6. Frontend zeigt Ergebnis an (TanStack Query Cache Update)

### 2.3 Ordnerstruktur

```
samba4-ad-webui/
├── shared/              # Gemeinsame TypeScript-Typen (@samba-ad/shared)
│   └── src/types/       # API, Auth, User, Group, Computer, OU, Tree, LDAP, UAC, GroupType
├── client/              # React Frontend (Vite + shadcn/ui)
│   └── src/
│       ├── components/  # UI-Komponenten (ui/, layout/, tree/, objects/, users/, groups/, ...)
│       ├── pages/       # LoginPage, DirectoryPage
│       ├── api/         # API Client / Fetch-Wrapper
│       ├── hooks/       # TanStack Query Hooks
│       ├── stores/      # Zustand Stores
│       └── App.tsx      # React Router Setup
├── server/              # Node.js/Express Backend
│   └── src/
│       ├── routes/      # Express Route Handler (auth, users, groups, computers, tree, objects, search, ous, attributes)
│       ├── services/    # LDAP Operations (auth, ldap, users, groups, computers, objects, tree, search, ous, attributes, crypto)
│       ├── middleware/  # Auth (JWT + Credential Decryption), Error Handler
│       └── utils/       # DN Parsing, UAC Helpers, Password Encoding, LDAP Filter Builder, GroupType
├── docker/              # Dockerfile & Docker Compose
├── .env / .env.example  # Umgebungsvariablen
├── CLAUDE.md            # Projektinstruktionen
├── AGENTS.md            # Coding Rules & Conventions
└── BACKLOG.md           # Kanban Board
```

---

## 3. Authentifizierung & Autorisierung

### 3.1 Hybrid Bind Pattern

Die Applikation verwendet **keinen Service Account**. Stattdessen:

1. **Login:** User gibt AD-Credentials ein → Backend bindet via LDAP als User (UPN bind) → bei Erfolg wird ein JWT ausgestellt
2. **JWT-Payload:** Enthält `dn`, `sAMAccountName`, `displayName` + AES-256-GCM-verschlüsselte Credentials
3. **Jeder API-Request:** Auth-Middleware verifiziert JWT, entschlüsselt Credentials, erstellt frischen LDAP-Client, bindet als User
4. **Alle Operationen** laufen unter der Identität des eingeloggten Users (Delegation durch AD-Berechtigungen)

### 3.2 Kryptografie

| Parameter | Wert |
|-----------|------|
| Algorithmus | AES-256-GCM |
| Schlüssellänge | 256 Bit (32 Byte hex) |
| IV | 16 Byte (zufällig pro Verschlüsselung) |
| Auth Tag | 16 Byte |
| Format | `iv:authTag:ciphertext` (hex-encoded) |
| Schlüssel-Quelle | `CREDENTIAL_ENCRYPTION_KEY` Umgebungsvariable |

### 3.3 JWT-Konfiguration

| Parameter | Wert |
|-----------|------|
| Algorithmus | HS256 (Standard jsonwebtoken) |
| Gültigkeit | 15 Minuten (konfigurierbar via `JWT_EXPIRY`) |
| Secret | `JWT_SECRET` Umgebungsvariable |
| Token-Transport | `Authorization: Bearer <token>` Header |
| Speicherung (Client) | `localStorage` |

### 3.4 Token Refresh

- `POST /api/auth/refresh` — verlängert Token ohne erneute Passworteingabe
- Entschlüsselt Credentials aus altem Token, bindet erneut an LDAP, erstellt neues JWT

---

## 4. API-Schnittstellen

### 4.1 Authentifizierung

| Method | Endpoint | Auth | Beschreibung |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | Nein | Login mit username/password |
| POST | `/api/auth/refresh` | Ja | Token erneuern |
| GET | `/api/auth/me` | Ja | Aktueller Benutzer |
| GET | `/api/health` | Nein | Health Check |

### 4.2 Benutzer

| Method | Endpoint | Auth | Beschreibung |
|--------|----------|------|-------------|
| GET | `/api/users?dn=<dn>` | Ja | Benutzer abrufen |
| POST | `/api/users` | Ja | Benutzer erstellen |
| PATCH | `/api/users?dn=<dn>` | Ja | Benutzer aktualisieren |
| DELETE | `/api/users?dn=<dn>` | Ja | Benutzer löschen |
| POST | `/api/users/password?dn=<dn>` | Ja | Passwort zurücksetzen |
| POST | `/api/users/enable?dn=<dn>` | Ja | Konto aktivieren |
| POST | `/api/users/disable?dn=<dn>` | Ja | Konto deaktivieren |
| POST | `/api/users/move?dn=<dn>` | Ja | Benutzer verschieben |

### 4.3 Gruppen

| Method | Endpoint | Auth | Beschreibung |
|--------|----------|------|-------------|
| GET | `/api/groups?dn=<dn>` | Ja | Gruppe abrufen |
| POST | `/api/groups` | Ja | Gruppe erstellen |
| PATCH | `/api/groups?dn=<dn>` | Ja | Gruppe aktualisieren |
| DELETE | `/api/groups?dn=<dn>` | Ja | Gruppe löschen |
| POST | `/api/groups/members?dn=<dn>` | Ja | Mitglieder hinzufügen |
| DELETE | `/api/groups/members?dn=<dn>` | Ja | Mitglieder entfernen |
| POST | `/api/groups/move?dn=<dn>` | Ja | Gruppe verschieben |

### 4.4 Computer

| Method | Endpoint | Auth | Beschreibung |
|--------|----------|------|-------------|
| GET | `/api/computers?dn=<dn>` | Ja | Computer abrufen |
| POST | `/api/computers` | Ja | Computer pre-stagen |
| PATCH | `/api/computers?dn=<dn>` | Ja | Computer aktualisieren |
| DELETE | `/api/computers?dn=<dn>` | Ja | Computer löschen |
| POST | `/api/computers/move?dn=<dn>` | Ja | Computer verschieben |

### 4.5 Verzeichnisbaum

| Method | Endpoint | Auth | Beschreibung |
|--------|----------|------|-------------|
| GET | `/api/tree` | Ja | Wurzelknoten abrufen |
| GET | `/api/tree/children?dn=<dn>` | Ja | Kindknoten abrufen |

### 4.6 Objektliste & Suche

| Method | Endpoint | Auth | Beschreibung |
|--------|----------|------|-------------|
| GET | `/api/objects?base=<dn>&type=<type>&page=<p>&pageSize=<ps>` | Ja | Objekte auflisten |
| GET | `/api/search?q=<term>&type=<type>&page=<p>&pageSize=<ps>` | Ja | Globale Suche |

### 4.7 Organisationseinheiten

| Method | Endpoint | Auth | Beschreibung |
|--------|----------|------|-------------|
| POST | `/api/ous` | Ja | OU erstellen |
| PATCH | `/api/ous?dn=<dn>` | Ja | OU aktualisieren |
| DELETE | `/api/ous?dn=<dn>&recursive=<bool>` | Ja | OU löschen |
| POST | `/api/ous/rename?dn=<dn>` | Ja | OU umbenennen |

### 4.8 Attribut-Editor

| Method | Endpoint | Auth | Beschreibung |
|--------|----------|------|-------------|
| GET | `/api/attributes?dn=<dn>` | Ja | Alle Attribute abrufen |
| PATCH | `/api/attributes?dn=<dn>` | Ja | Attribute ändern |

---

## 5. Umgebungsvariablen

| Variable | Beschreibung | Beispielwert | Pflicht |
|----------|-------------|-------------|---------|
| `LDAP_URL` | LDAP-Verbindungs-URL | `ldap://localhost:389` | Ja |
| `LDAPS_URL` | LDAPS-Verbindungs-URL (für Passwortänderungen) | `ldaps://localhost:636` | Ja |
| `LDAP_BASE_DN` | Basis-DN des AD | `DC=lab,DC=dev` | Ja |
| `JWT_SECRET` | Geheimschlüssel für JWT-Signierung | `change-me-in-production` | Ja |
| `JWT_EXPIRY` | JWT-Gültigkeitsdauer | `15m` | Ja |
| `CREDENTIAL_ENCRYPTION_KEY` | 32-Byte Hex-Schlüssel für AES-256-GCM | `0123456...` (64 hex chars) | Ja |
| `PORT` | Server-Port | `3001` | Nein (Default: 3001) |
| `NODE_ENV` | Umgebung | `development` / `production` | Nein |

---

## 6. Shared Types (Schnittstellendefinitionen)

### 6.1 API-Typen (`shared/src/types/api.ts`)
- `ApiResponse<T>` — Generische API-Antwort mit `success`, `data`, `error`
- `PaginatedResponse<T>` — Paginierte Liste mit `items`, `total`, `page`, `pageSize`, `totalPages`
- `ApiError` — Fehlerformat mit `code`, `message`, `details`
- `ObjectSummary` — Kompakte Objektdarstellung für Listen

### 6.2 Auth-Typen (`shared/src/types/auth.ts`)
- `LoginRequest` — `{ username, password }`
- `LoginResponse` — `{ token, user: { dn, sAMAccountName, displayName } }`
- `JwtPayload` — `{ dn, sAMAccountName, displayName, encryptedCredentials, iat, exp }`

### 6.3 User-Typen (`shared/src/types/user.ts`)
- `AdUser` — 50+ Attribute (General, Address, Account, Profile, Telephones, Organization, MemberOf)
- `CreateUserRequest` — `{ parentDn, sAMAccountName, displayName, userPrincipalName, password, enabled }`
- `UpdateUserRequest` — Alle änderbaren Felder (nullable)

### 6.4 Group-Typen (`shared/src/types/group.ts`)
- `AdGroup` — `{ dn, sAMAccountName, description, mail, groupType, info, member, memberOf, managedBy }`
- `CreateGroupRequest` — `{ parentDn, name, sAMAccountName, groupType, description }`
- `UpdateGroupRequest` — `{ description, mail, info, managedBy }`

### 6.5 Computer-Typen (`shared/src/types/computer.ts`)
- `AdComputer` — `{ dn, sAMAccountName, dNSHostName, description, operatingSystem*, location, memberOf, managedBy, userAccountControl }`
- `CreateComputerRequest` — `{ parentDn, name, sAMAccountName, description }`
- `UpdateComputerRequest` — `{ description, location, managedBy }`

### 6.6 OU-Typen (`shared/src/types/ou.ts`)
- `OrganizationalUnit` — `{ dn, name, description }`

### 6.7 Tree-Typen (`shared/src/types/tree.ts`)
- `TreeNode` — `{ dn, name, type: 'domain'|'ou'|'container'|'builtinDomain', hasChildren, children? }`

### 6.8 LDAP-Typen (`shared/src/types/ldap.ts`)
- `LdapAttribute` — `{ name, values: string[] }`
- `LdapEntry` — `{ dn, attributes: LdapAttribute[] }`
- `AttributeChange` — `{ name, operation: 'replace'|'add'|'delete', values: string[] }`

### 6.9 UAC-Flags (`shared/src/types/uac.ts`)
- Bitmask-Konstanten: `ACCOUNTDISABLE`, `NORMAL_ACCOUNT`, `WORKSTATION_TRUST_ACCOUNT`, `DONT_EXPIRE_PASSWORD`, etc.

### 6.10 GroupType (`shared/src/types/groupType.ts`)
- Bitmask: `GLOBAL`, `DOMAIN_LOCAL`, `UNIVERSAL`, `SECURITY`
- Scopes: `'global'|'domainLocal'|'universal'`
- Categories: `'security'|'distribution'`

---

## 7. Server-Services (Geschäftslogik)

### 7.1 auth.ts — Authentifizierung
- `login(username, password)` — LDAP bind + JWT Erstellung
- `refreshToken(existingToken)` — Token erneuern mit re-bind

### 7.2 ldap.ts — LDAP Client Wrapper
- `createClient(url)` — ldapts Client erstellen
- `bindAsUser(client, dn, password)` — User-Bind
- `search(client, baseDn, options)` — LDAP-Suche
- `unbind(client)` — Verbindung schließen
- `createBoundClient(url, dn, password)` — Convenience-Factory

### 7.3 crypto.ts — Verschlüsselung
- `encrypt(plaintext, key)` — AES-256-GCM
- `decrypt(encrypted, key)` — AES-256-GCM
- Format: `iv:authTag:ciphertext` (hex)

### 7.4 users.ts — Benutzerverwaltung
- CRUD: `getUser`, `createUser`, `updateUser`, `deleteUser`
- `resetPassword` — Passwort setzen via LDAPS (UTF-16LE encoding)
- `enableUser` / `disableUser` — UAC Flag manipulation
- `moveUser` — User in andere OU verschieben (modifyDN)

### 7.5 groups.ts — Gruppenverwaltung
- CRUD: `getGroup`, `createGroup`, `updateGroup`, `deleteGroup`
- `addMembers` / `removeMembers` — Mitgliederverwaltung
- `moveGroup` — Gruppe verschieben

### 7.6 computers.ts — Computerverwaltung
- CRUD: `getComputer`, `createComputer`, `updateComputer`, `deleteComputer`
- Pre-Staging: `WORKSTATION_TRUST_ACCOUNT + ACCOUNTDISABLE`
- `moveComputer` — Computer verschieben

### 7.7 objects.ts — Objektliste
- `listObjects(credentials, baseDn, type, page, pageSize)` — Paginierte Liste

### 7.8 tree.ts — Verzeichnisbaum
- `getTreeChildren(credentials, baseDn)` — OUs und Container auflisten

### 7.9 search.ts — Globale Suche
- `searchObjects(credentials, term, type, page, pageSize)` — Suche über sAMAccountName, displayName, cn, mail

### 7.10 ous.ts — OU-Verwaltung
- `createOu`, `updateOu`, `deleteOu` (mit rekursiver Löschung), `renameOu`

### 7.11 attributes.ts — Attribut-Editor
- `getAttributes(credentials, dn)` — Alle Attribute lesen
- `updateAttributes(credentials, dn, changes)` — Attribute ändern

---

## 8. Frontend-Architektur

### 8.1 Seiten
- **LoginPage** — Login-Formular mit Fehlerbehandlung
- **DirectoryPage** — Haupt-ADUC-Interface (Tree + Objektliste + Dialoge)

### 8.2 State Management
- **TanStack Query** (Server State): Query Keys wie `['user', dn]`, `['objects', baseDn, type, page]`
- **Zustand** (UI State): `directoryStore` (Tree-Selektion), `dialogStore` (Dialog-Sichtbarkeit)

### 8.3 Properties-Dialoge (ADUC-Nachbau)
- **User:** 7 Tabs (General, Address, Account, Profile, Telephones, Organization, MemberOf)
- **Group:** 4 Tabs (General, Members, MemberOf, ManagedBy)
- **Computer:** 5 Tabs (General, OperatingSystem, Location, MemberOf, ManagedBy)
- **Attribute Editor:** Direkter LDAP-Attributzugriff

### 8.4 API-Client (`client/src/api/client.ts`)
- Zentraler Fetch-Wrapper mit automatischem Token-Handling
- Token aus `localStorage`
- Automatische `Authorization: Bearer` Header

---

## 9. Sicherheitsrelevante Aspekte

### 9.1 Authentifizierung
- Credentials werden im JWT verschlüsselt gespeichert (AES-256-GCM)
- JWT wird im Client in `localStorage` gespeichert
- Kein Refresh-Token-Rotation-Mechanismus
- JWT Secret und Encryption Key als Umgebungsvariablen

### 9.2 LDAP-Kommunikation
- LDAP (Port 389) für reguläre Operationen
- LDAPS (Port 636) für Passwortänderungen
- Kein StartTLS für reguläre Operationen (plain LDAP möglich)

### 9.3 HTTP-Sicherheit
- CORS via `cors` Middleware
- Kein Helmet.js (HTTP Security Headers)
- Kein Rate Limiting
- Kein CSRF-Schutz (REST API mit Bearer Token)

### 9.4 Input Validation
- DN-Parameter via Query String
- LDAP Filter Escaping in `ldapFilters.ts` und `search.ts`
- Keine explizite Schema-Validation (z.B. Zod/Joi) auf API-Eingaben

### 9.5 Passwort-Handling
- Passwörter werden als UTF-16LE encoded an AD gesendet (Standard für AD password changes)
- Passwort-Reset nur über LDAPS
- Keine Passwort-Policy-Enforcement im Backend (delegiert an AD)

---

## 10. Bestehende Tests

### 10.1 Unit Tests (Vitest)
- `server/src/services/crypto.test.ts` — Crypto encrypt/decrypt
- `server/src/middleware/auth.test.ts` — Auth middleware
- `server/src/utils/dnUtils.test.ts` — DN parsing
- `server/src/utils/uac.test.ts` — UAC flag manipulation
- `server/src/utils/password.test.ts` — Password encoding
- `server/src/utils/ldapFilters.test.ts` — LDAP filter builder
- `server/src/utils/groupType.test.ts` — GroupType helpers

### 10.2 E2E Tests (Playwright)
- `client/e2e/auth.spec.ts` — Login/Logout
- `client/e2e/directory.spec.ts` — Verzeichnis-Navigation
- `client/e2e/users.spec.ts` — Benutzeroperationen
- `client/e2e/groups.spec.ts` — Gruppenoperationen
- `client/e2e/computers.spec.ts` — Computeroperationen
- `client/e2e/ous.spec.ts` — OU-Operationen
- `client/e2e/attributes.spec.ts` — Attribut-Editor
- `client/e2e/search.spec.ts` — Suche
- `client/e2e/context-menus.spec.ts` — Kontextmenüs
- `client/e2e/keyboard.spec.ts` — Keyboard Shortcuts

### 10.3 Playwright-Konfiguration
- Headless: **true** (Browser läuft im Hintergrund)
- Browser: Chromium
- Parallel: false
- WebServer: Backend (3001) + Frontend (5173) werden automatisch gestartet

---

## 11. Docker Deployment

### 11.1 Multi-Stage Build
1. **Builder Stage:** Node 22 Alpine, installiert Dependencies, baut alle Workspaces
2. **Runner Stage:** Node 22 Alpine, kopiert Production-Artifacts, Expose Port 3000

### 11.2 Umgebungsvariablen (Production)
Alle unter Abschnitt 5 genannten Variablen müssen im Container gesetzt sein.

---

## 12. Abhängigkeiten

### 12.1 Server Runtime Dependencies
| Paket | Version | Zweck |
|-------|---------|-------|
| express | ^4.21.2 | HTTP Server |
| ldapts | ^7.2.1 | LDAP Client (TypeScript) |
| jsonwebtoken | ^9.0.2 | JWT |
| cors | ^2.8.5 | CORS Middleware |
| dotenv | ^16.4.7 | Env-Variablen |

### 12.2 Client Runtime Dependencies
| Paket | Version | Zweck |
|-------|---------|-------|
| react | ^19.0.0 | UI Framework |
| react-router-dom | ^7.1.3 | Routing |
| @tanstack/react-query | ^5.66.0 | Server State |
| zustand | ^5.0.3 | UI State |
| @radix-ui/react-* | ^1.x | Accessible UI Components |
| lucide-react | ^0.474.0 | Icons |
| tailwindcss | ^3.4.17 | CSS |

---

## Anhang: Dateien-Inventar

- **Shared Types:** 12 Dateien
- **Server Routes:** 9 Dateien
- **Server Services:** 12 Dateien (inkl. Tests)
- **Server Middleware:** 3 Dateien (inkl. Tests)
- **Server Utils:** 10 Dateien (inkl. Tests)
- **Client Pages:** 2 Dateien
- **Client Components:** ~40 Dateien
- **Client API Clients:** 10 Dateien
- **Client Hooks:** 11 Dateien
- **Client Stores:** 2 Dateien
- **E2E Tests:** 10 Dateien
- **Config:** ~10 Dateien (package.json, tsconfig, vite, tailwind, playwright, docker)
