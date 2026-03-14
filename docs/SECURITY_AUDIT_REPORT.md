# Security Audit Report — Samba4 AD WebUI

> **Auditor:** Security Review (automated)
> **Datum:** 2026-03-13
> **Scope:** Vollstaendiger Quellcode-Review (Server, Client, Docker, Konfiguration)
> **Version:** 0.1.0 (Commit b0c5179)

---

## Executive Summary

Die Samba4 AD WebUI ist eine React/Express-Applikation, die als Administrationsoberflaeche fuer ein Samba4 Active Directory dient. Die Authentifizierung basiert auf einem Hybrid-Bind-Pattern, bei dem AD-Credentials AES-256-GCM-verschluesselt im JWT gespeichert werden.

Die Codebasis zeigt solide Grundlagen (korrekte AES-256-GCM-Implementierung, LDAP-Filter-Escaping in der Suche, LDAPS fuer Passwortaenderungen), weist jedoch mehrere sicherheitsrelevante Luecken auf, die vor einem Produktivbetrieb behoben werden muessen.

**Zusammenfassung der Findings:**

| Severity | Anzahl |
|----------|--------|
| Critical | 2 |
| High | 5 |
| Medium | 5 |
| Low | 3 |
| Info | 3 |
| **Gesamt** | **18** |

---

## Findings

---

### F-01: LDAP Injection in Login-Funktion (Critical)

**Severity:** Critical
**OWASP:** A03:2021 — Injection
**Betroffene Datei:** `server/src/services/auth.ts`, Zeilen 59-69

**Problem:**
Die Login-Funktion konstruiert LDAP-Suchfilter mit unkontrollierter Benutzereingabe. Nach erfolgreichem LDAP-Bind wird der Username direkt in einen LDAP-Filter eingesetzt, ohne Escaping:

```typescript
filter: `(userPrincipalName=${upn})`
// und:
filter: `(sAMAccountName=${samName})`
```

Ein Angreifer, der gueltige Credentials besitzt, koennte durch einen manipulierten Benutzernamen (z.B. `admin)(|(objectClass=*`) den LDAP-Filter manipulieren und potenziell andere User-DNs zurueckbekommen. Dadurch wuerde das JWT mit einem fremden DN ausgestellt, und nachfolgende Operationen liefen unter falscher Identitaet.

**Empfohlene Massnahme:**
- LDAP-Filter-Escaping auf den `upn`- und `samName`-Wert anwenden, bevor sie in den Filter eingesetzt werden
- Die bestehende `escapeLdapFilter()`-Funktion aus `search.ts` extrahieren und zentral wiederverwenden

---

### F-02: Regulaere LDAP-Verbindungen unverschluesselt (Critical)

**Severity:** Critical
**OWASP:** A02:2021 — Cryptographic Failures
**Betroffene Dateien:** `server/src/config.ts` Zeile 13, `server/src/services/ldap.ts`, alle Services die `config.ldap.url` verwenden

**Problem:**
Alle regulaeren LDAP-Operationen (Benutzer auslesen, Gruppen verwalten, Baum laden, Suche) verwenden `ldap://` (Port 389) — also unverschluesselte Klartext-Verbindungen. Nur Passwortaenderungen verwenden LDAPS.

Das bedeutet:
- AD-Credentials des eingeloggten Users werden bei jedem API-Call im Klartext ueber das Netzwerk uebertragen (LDAP Simple Bind)
- Alle LDAP-Daten (Benutzernamen, E-Mails, Gruppenmitgliedschaften, etc.) sind im Netzwerk sichtbar
- In einem Docker/Cloud-Deployment sind die LDAP-Verbindungen nicht auf localhost beschraenkt

**Empfohlene Massnahme:**
- `LDAP_URL` auf `ldaps://` umstellen oder StartTLS erzwingen
- Alternativ: eine einzige LDAP-URL konfigurieren, die immer verschluesselt ist
- Validierung beim Startup: warnen oder abbrechen, wenn `LDAP_URL` kein `ldaps://` verwendet und `NODE_ENV=production`

---

### F-03: Keine HTTP Security Headers (Helmet.js fehlt) (High)

**Severity:** High
**OWASP:** A05:2021 — Security Misconfiguration
**Betroffene Datei:** `server/src/index.ts`

**Problem:**
Die Express-App verwendet kein `helmet` (oder aequivalent). Es fehlen:
- `Content-Security-Policy` (CSP) — kein XSS-Schutz auf Netzwerkebene
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY` — Clickjacking-Schutz fehlt
- `Strict-Transport-Security` (HSTS) — keine HTTPS-Erzwingung
- `X-XSS-Protection`
- `Referrer-Policy`

**Empfohlene Massnahme:**
```bash
npm install helmet
```
```typescript
import helmet from 'helmet'
app.use(helmet())
```

---

### F-04: Kein Rate Limiting auf Login-Endpoint (High)

**Severity:** High
**OWASP:** A07:2021 — Identification and Authentication Failures
**Betroffene Datei:** `server/src/routes/auth.ts`, `server/src/index.ts`

**Problem:**
Der Login-Endpoint (`POST /api/auth/login`) hat keinerlei Brute-Force-Schutz. Ein Angreifer kann unbegrenzt viele Login-Versuche durchfuehren.

Zwar limitiert der LDAP-Server selbst eventuell fehlgeschlagene Anmeldungen (Account Lockout Policy), aber:
- Nicht jede AD-Konfiguration hat Account Lockout aktiviert
- Der Server wird durch die vielen LDAP-Binds belastet (DoS-Vektor)
- Keine Verzoegerung zwischen fehlgeschlagenen Versuchen

**Empfohlene Massnahme:**
```bash
npm install express-rate-limit
```
```typescript
import rateLimit from 'express-rate-limit'
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: 10,                    // max 10 Versuche pro IP
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many login attempts' } }
})
app.use('/api/auth/login', loginLimiter)
```

---

### F-05: CORS vollstaendig offen (High)

**Severity:** High
**OWASP:** A05:2021 — Security Misconfiguration
**Betroffene Datei:** `server/src/index.ts`, Zeile 18

**Problem:**
```typescript
app.use(cors())
```
Ohne Konfiguration erlaubt `cors()` Anfragen von **jeder Origin**. In Produktion sollte nur die eigene Domain erlaubt sein. Ein Angreifer koennte von einer beliebigen Website aus API-Requests an das Backend senden, wenn er ein gueltiges JWT hat (z.B. durch XSS-Exfiltration).

**Empfohlene Massnahme:**
```typescript
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}))
```

---

### F-06: JWT Secret ist ein unsicherer Default-Wert (High)

**Severity:** High
**OWASP:** A02:2021 — Cryptographic Failures
**Betroffene Dateien:** `server/src/config.ts` Zeile 19, `.env` Zeile 8, `.env.example` Zeile 8

**Problem:**
```typescript
secret: process.env.JWT_SECRET || 'change-me-in-production',
```
- Der Fallback-Wert `'change-me-in-production'` ist ein guessable String
- Die `.env`-Datei enthaelt exakt diesen Wert — auch wenn die `.env`-Datei nicht committed wird, ist der Wert in `.env.example` sichtbar und koennte uebersehen werden
- Keine Validierung beim Startup, ob ein sicherer Wert gesetzt wurde

Ein Angreifer, der das JWT-Secret kennt, kann beliebige JWTs erzeugen. Da Credentials im JWT verschluesselt sind, reicht das Secret allein nicht zum Zugriff, aber er koennte Tokens mit beliebigen User-Identitaeten erstellen (wenn auch ohne gueltige verschluesselte Credentials).

**Empfohlene Massnahme:**
- Startup-Check: Abbruch wenn `JWT_SECRET` den Standardwert hat und `NODE_ENV=production`
- Minimum-Laenge fuer JWT_SECRET erzwingen (mind. 32 Zeichen)
- `.env.example` mit Platzhalter statt echtem Wert

---

### F-07: Keine Validierung des Encryption Key (High)

**Severity:** High
**OWASP:** A02:2021 — Cryptographic Failures
**Betroffene Datei:** `server/src/config.ts` Zeile 24

**Problem:**
```typescript
encryptionKey: process.env.CREDENTIAL_ENCRYPTION_KEY || '',
```
- Der Fallback ist ein **leerer String** — wenn die Umgebungsvariable fehlt, wuerde `Buffer.from('', 'hex')` einen leeren Buffer erzeugen, was zu einem Crypto-Fehler fuehrt, aber erst bei einem Login-Versuch (nicht beim Startup)
- Die `.env`- und `.env.example`-Dateien enthalten einen offensichtlich unsicheren Sequenz-Key (`0123456789abcdef...`)
- Keine Validierung, dass der Key 64 Hex-Zeichen (32 Bytes) hat

**Empfohlene Massnahme:**
- Startup-Check: Validierung dass `CREDENTIAL_ENCRYPTION_KEY` exakt 64 Hex-Zeichen hat
- Abbruch wenn der Key der `.env.example`-Standardwert ist und `NODE_ENV=production`

---

### F-08: JWT in localStorage — XSS-Risiko (Medium)

**Severity:** Medium
**OWASP:** A07:2021 — Identification and Authentication Failures
**Betroffene Datei:** `client/src/api/client.ts`, Zeilen 1-13

**Problem:**
Der JWT wird in `localStorage` gespeichert. Jeder XSS-Angriff (auch ueber eine Drittanbieter-Bibliothek) kann den Token auslesen. Da der Token verschluesselte AD-Credentials enthaelt, wuerde ein Token-Diebstahl vollen Zugriff auf das AD ermoeglichen (solange der Token nicht abgelaufen ist).

**Empfohlene Massnahme:**
- Token in einem `HttpOnly`, `Secure`, `SameSite=Strict` Cookie speichern
- ODER: sicherstellen, dass eine strenge CSP (Content-Security-Policy) implementiert ist, die Inline-Scripts verhindert
- Token-Refresh-Rotation implementieren (jedes Refresh invalidiert den alten Token)

---

### F-09: Token Refresh ohne LDAP-Re-Validierung (Medium)

**Severity:** Medium
**OWASP:** A07:2021 — Identification and Authentication Failures
**Betroffene Datei:** `server/src/services/auth.ts`, Zeilen 117-134

**Problem:**
Die `refreshToken()`-Funktion stellt ein neues JWT aus, ohne die Credentials erneut gegen LDAP zu pruefen. Das bedeutet:
- Ein gesperrtes AD-Konto kann den Token unbegrenzt erneuern
- Ein geaendertes Passwort wird nicht bemerkt
- Die verschluesselten Credentials im neuen Token sind identisch mit denen im alten

Der alte Token wird bei nachfolgenden API-Calls zwar bei jedem Request gegen LDAP geprüft (Hybrid Bind), aber der Refresh-Endpoint gibt ein neues Token aus, das weitere 15 Minuten gueltig ist.

**Empfohlene Massnahme:**
- Im `refreshToken()` die verschluesselten Credentials entschluesseln und einen LDAP-Bind durchfuehren, bevor ein neues Token ausgestellt wird
- Dadurch wird sichergestellt, dass das Konto noch aktiv und das Passwort noch gueltig ist

---

### F-10: Keine Input-Schema-Validierung auf API-Endpoints (Medium)

**Severity:** Medium
**OWASP:** A03:2021 — Injection
**Betroffene Dateien:** Alle Dateien unter `server/src/routes/`

**Problem:**
Die API-Endpoints validieren nur, ob Pflichtfelder vorhanden sind (einfache Truthy-Checks). Es gibt keine Schema-Validierung (z.B. Zod, Joi, AJV) fuer:
- Datentypen (ist `groupType` wirklich eine Zahl?)
- String-Laengen (kann ein Angreifer megabyte-grosse Strings als `description` senden?)
- Erlaubte Werte (ist `type` wirklich `'user'|'group'|'computer'|'all'`?)
- Unerwartete Felder (werden unbekannte Felder an LDAP weitergeleitet?)

Besonders kritisch: `PATCH /api/users` und `PATCH /api/attributes` leiten `req.body` direkt an LDAP-Modify-Operationen weiter. Ein Angreifer koennte damit beliebige LDAP-Attribute setzen (z.B. `userAccountControl`, `adminCount`).

**Empfohlene Massnahme:**
- Zod-Schemas fuer alle Request-Bodies definieren
- Request-Bodies gegen diese Schemas validieren
- Unbekannte Felder abweisen (`strict()`)

---

### F-11: DN-Parameter ohne Validierung als LDAP-BaseDN verwendet (Medium)

**Severity:** Medium
**OWASP:** A01:2021 — Broken Access Control
**Betroffene Dateien:** Alle Routen die `dn` als Query-Parameter akzeptieren

**Problem:**
Die `dn`-Query-Parameter werden unkontrolliert als LDAP-BaseDN oder Operation-Target verwendet. Obwohl das Hybrid-Bind-Pattern sicherstellt, dass nur Operationen ausgefuehrt werden, fuer die der eingeloggte User AD-Berechtigungen hat, fehlt eine grundlegende Validierung:
- Kein Check, ob der DN syntaktisch gueltig ist
- Kein Check, ob der DN innerhalb des konfigurierten `LDAP_BASE_DN` liegt
- Ein leerer DN koennte zum Root-DSE fuehren

**Empfohlene Massnahme:**
- DN-Syntax-Validierung (muss mit `CN=`, `OU=`, `DC=` beginnen)
- Sicherstellen, dass der DN als Suffix den konfigurierten `LDAP_BASE_DN` enthaelt
- Leere/Null-DN-Werte konsequent ablehnen

---

### F-12: Keine Request-Body-Groessenlimitierung (Medium)

**Severity:** Medium
**OWASP:** A05:2021 — Security Misconfiguration
**Betroffene Datei:** `server/src/index.ts`, Zeile 18

**Problem:**
```typescript
app.use(express.json())
```
Express' Standard-Limit fuer JSON-Bodies ist 100 KB. Das ist bereits ein vernuenftiger Default, aber:
- Es ist nicht explizit konfiguriert (koennte sich mit Express-Updates aendern)
- Fuer eine AD-Admin-App waeren 50 KB ausreichend
- Es fehlt eine explizite Absicherung gegen DoS via grosse Payloads

**Empfohlene Massnahme:**
```typescript
app.use(express.json({ limit: '50kb' }))
```

---

### F-13: Docker-Container laeuft als root (Low)

**Severity:** Low
**OWASP:** A05:2021 — Security Misconfiguration
**Betroffene Datei:** `docker/Dockerfile`

**Problem:**
Das Dockerfile definiert keinen `USER`-Befehl. Der Container laeuft als `root`. Wenn ein Angreifer Code-Ausfuehrung im Container erlangt (z.B. durch eine Node.js-Vulnerability), hat er root-Rechte im Container.

**Empfohlene Massnahme:**
```dockerfile
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser
```

---

### F-14: TLS-Zertifikatsvalidierung deaktiviert (Low)

**Severity:** Low
**OWASP:** A02:2021 — Cryptographic Failures
**Betroffene Datei:** `server/src/services/ldap.ts`, Zeilen 14-17

**Problem:**
```typescript
tlsOptions: {
  rejectUnauthorized: false,
}
```
LDAPS-Verbindungen akzeptieren selbst-signierte oder ungueltige Zertifikate. Das macht die Applikation anfaellig fuer Man-in-the-Middle-Angriffe auf die LDAPS-Verbindung.

In Entwicklungsumgebungen mit selbst-signierten Zertifikaten ist dies akzeptabel, sollte aber in Produktion konfigurierbar sein.

**Empfohlene Massnahme:**
- Umgebungsvariable `LDAP_TLS_REJECT_UNAUTHORIZED` einfuehren
- In Produktion auf `true` setzen (oder CA-Zertifikat via `LDAP_CA_CERT` konfigurierbar machen)

---

### F-15: Error-Handler leakt Stack Traces in Development (Low)

**Severity:** Low
**OWASP:** A05:2021 — Security Misconfiguration
**Betroffene Datei:** `server/src/middleware/errorHandler.ts`, Zeile 14

**Problem:**
```typescript
...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
```
Die Implementierung ist korrekt (Stack Traces nur in Development). Allerdings:
- Fehler-Nachrichten wie `"Failed to create user: Entry Already Exists"` enthalten LDAP-Server-Fehlermeldungen, die einem Angreifer Informationen ueber die interne Architektur geben
- `console.error('[Error]', err)` loggt den vollen Error (inkl. Stack) immer — in Produktion sollte ein strukturierter Logger verwendet werden

**Empfohlene Massnahme:**
- Generische Fehlermeldungen an den Client zurueckgeben, interne Details nur loggen
- Strukturierten Logger (z.B. `pino`, `winston`) statt `console.error` verwenden

---

### F-16: Kein `algorithm`-Parameter bei JWT-Verifizierung (Info)

**Severity:** Info
**OWASP:** A02:2021 — Cryptographic Failures
**Betroffene Datei:** `server/src/middleware/auth.ts`, Zeile 40

**Problem:**
```typescript
const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload
```
Es wird kein `algorithms`-Parameter an `jwt.verify()` uebergeben. Die `jsonwebtoken`-Bibliothek verwendet standardmaessig den Algorithmus aus dem Token-Header. Obwohl die aktuelle Version von `jsonwebtoken` (v9) den `none`-Algorithmus-Angriff verhindert, ist es Best Practice, den erlaubten Algorithmus explizit anzugeben.

**Empfohlene Massnahme:**
```typescript
const decoded = jwt.verify(token, config.jwt.secret, { algorithms: ['HS256'] }) as JwtPayload
```

---

### F-17: Refresh-Endpoint ohne Auth-Middleware (Info)

**Severity:** Info
**Betroffene Datei:** `server/src/routes/auth.ts`, Zeilen 38-57

**Problem:**
Der Refresh-Endpoint (`POST /api/auth/refresh`) akzeptiert den Token im Request-Body statt ueber den Authorization-Header. Er verwendet nicht die `requireAuth`-Middleware. Das ist funktional korrekt (da `jwt.verify()` intern aufgerufen wird), aber es umgeht die zentrale Auth-Middleware-Logik.

**Empfohlene Massnahme:**
- Token aus dem Authorization-Header lesen (konsistent mit allen anderen Endpoints)
- Die `requireAuth`-Middleware verwenden und den Token aus `req` extrahieren

---

### F-18: Keine Audit-Logging fuer AD-Operationen (Info)

**Severity:** Info
**OWASP:** A09:2021 — Security Logging and Monitoring Failures
**Betroffene Dateien:** Alle Services (`server/src/services/*.ts`)

**Problem:**
Es gibt kein Audit-Log fuer AD-Operationen (Benutzer erstellen, loeschen, Passwort zuruecksetzen, OU loeschen, etc.). In einer AD-Administrations-App ist nachvollziehbar zu protokollieren, wer wann welche Aenderung vorgenommen hat, essentiell fuer Compliance und Incident Response.

**Empfohlene Massnahme:**
- Strukturiertes Audit-Logging einfuehren (wer, was, wann, Ergebnis)
- Mindestens: Login-Versuche (erfolgreich/fehlgeschlagen), Objekt-Erstellung, Objekt-Loeschung, Passwort-Resets, OU-Loeschungen

---

## Risikobewertung

### Kritische Risiken (sofort beheben)
1. **LDAP Injection im Login** (F-01) — Kann zur Identitaets-Uebernahme fuehren
2. **Unverschluesselte LDAP-Verbindungen** (F-02) — AD-Credentials werden im Klartext uebertragen

### Hohe Risiken (vor Production-Release beheben)
3. **Fehlende Security Headers** (F-03) — Clickjacking, XSS-Amplifikation
4. **Kein Rate Limiting** (F-04) — Brute-Force-Angriffe moeglich
5. **CORS offen** (F-05) — Cross-Origin-Angriffe moeglich
6. **Unsicherer JWT-Secret-Default** (F-06) — Token-Faelschung bei Standardkonfiguration
7. **Keine Encryption-Key-Validierung** (F-07) — Betrieb mit schwachem/fehlendem Key moeglich

### Mittlere Risiken (zeitnah beheben)
8. **JWT in localStorage** (F-08) — Token-Diebstahl bei XSS
9. **Token Refresh ohne Re-Validierung** (F-09) — Gesperrte Konten behalten Zugang
10. **Fehlende Schema-Validierung** (F-10) — Beliebige LDAP-Attribute setzbar
11. **DN-Parameter unkontrolliert** (F-11) — Zugriff ausserhalb des BaseDN moeglich
12. **Keine Body-Size-Limits** (F-12) — DoS-Vektor

---

## Positiv-Befunde

- **AES-256-GCM korrekt implementiert** — Zufaelliger IV, Auth-Tag-Validierung, Standard-Bibliothek
- **LDAP-Filter-Escaping in der Suche** — `escapeLdapFilter()` in `search.ts` escaped korrekt
- **LDAPS fuer Passwortaenderungen** — Password-Resets nur ueber verschluesselte Verbindung
- **JWT-Expiry konfiguriert** — 15 Minuten Standard, angemessen kurz
- **Error-Handler unterscheidet Development/Production** — Stack Traces nur in Dev
- **.env nicht im Git** — `.gitignore` konfiguriert, `.env` ist nicht tracked
- **Keine bekannten npm-Vulnerabilities** — `npm audit` zeigt 0 Schwachstellen
- **Hybrid Bind Pattern** — Kein Service Account, alle Operationen unter User-Identitaet
- **Password Encoding korrekt** — UTF-16LE mit Anfuehrungszeichen (AD-Standard)
