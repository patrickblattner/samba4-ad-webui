# samba4-ad-webui – Project Backlog (Kanban)

Columns: **Backlog** -> **Todo** -> **In Progress** -> **Done**

Tasks are ordered by priority within each column.

---

## In Progress

### [Security] CORS vollständig offen (#12)
- Origin-Einschränkung konfigurieren

---

## Todo

---

## Backlog

### [Security] JWT Secret unsicherer Default (#13)
- Startup-Validierung: Server darf mit Default-Secret nicht starten

### [Security] Fehlende Validierung des Encryption Key (#14)
- Key-Länge prüfen, leeren Fallback verhindern

### [Security] JWT in localStorage (#15)
- Risikobewertung: HttpOnly Cookie als Alternative prüfen

### [Security] Token Refresh ohne LDAP-Re-Validierung (#16)
- Bei Refresh prüfen, ob AD-Konto noch aktiv ist

### [Security] Fehlende Schema-Validierung (#17)
- Zod/Joi für API-Input-Validierung einführen

### [Security] DN-Parameter ohne Validierung (#18)
- DN-Format validieren bevor es als LDAP-Target verwendet wird

### [Security] Keine Body-Size-Limitierung (#19)
- express.json({ limit: '1mb' }) o.ä. setzen

### [QA] Keine Input Schema-Validierung (#23)
- Zod/Joi für API-Eingaben (überschneidet sich mit #17)

### [QA] Pagination holt alle Objekte (#26)
- Server-side Pagination via LDAP paging statt in-memory slice

### [QA] Duplicate Helper Functions (#27)
- toStringArray, determineObjectType etc. zentralisieren

### [QA] Attribute Keys ohne Allowlist (#28)
- Update-Operationen sollen nur erlaubte Attribute akzeptieren

### [QA] Keine Service-Level Tests (#29)
- Integration Tests für LDAP-Services

### [QA] OU Delete Sort Bug (#30)
- Rekursive Löschung sortiert nach DN-Länge statt Tiefe

---

## Done

- [#11 [Security] Rate Limiting Login](https://github.com/patrickblattner/samba4-ad-webui/issues/11)
- [#10 [Security] HTTP Security Headers](https://github.com/patrickblattner/samba4-ad-webui/issues/10)
- [#22 [QA] React Error Boundary](https://github.com/patrickblattner/samba4-ad-webui/issues/22)
- [#21 [QA] API Client crasht bei HTTP 204](https://github.com/patrickblattner/samba4-ad-webui/issues/21)
- [#1 Phase 1: Authentication (Login, JWT, LDAP Bind)](https://github.com/patrickblattner/samba4-ad-webui/issues/1)
- [#2 Phase 2: Tree View + Object Listing](https://github.com/patrickblattner/samba4-ad-webui/issues/2)
- [#3 Phase 3: User Management (CRUD, Properties, Password)](https://github.com/patrickblattner/samba4-ad-webui/issues/3)
- [#4 Phase 4: Group Management](https://github.com/patrickblattner/samba4-ad-webui/issues/4)
- [#5 Phase 5: Computer Management](https://github.com/patrickblattner/samba4-ad-webui/issues/5)
- [#6 Phase 6: Attribute Editor + OU Management](https://github.com/patrickblattner/samba4-ad-webui/issues/6)
- [#7 Phase 7: Context Menus, Search, Polish](https://github.com/patrickblattner/samba4-ad-webui/issues/7)
- [#8 [Security] LDAP Injection in Login-Funktion](https://github.com/patrickblattner/samba4-ad-webui/issues/8)
- [#9 [Security] Warnung bei unverschlüsselter LDAP-Verbindung](https://github.com/patrickblattner/samba4-ad-webui/issues/9)
