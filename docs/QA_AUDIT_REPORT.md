# QA Audit Report — Samba4 AD WebUI

> **Audit Date:** 2026-03-13
> **Auditor:** QA Audit (automated, Claude)
> **Scope:** Full codebase review — server, client, shared types, tests
> **Codebase Version:** Commit `b0c5179` (main branch)

---

## Executive Summary

The Samba4 AD WebUI codebase is well-structured and follows consistent patterns. The monorepo setup with shared types, the hybrid bind auth pattern, and the ADUC-style properties dialogs are implemented cleanly. TypeScript strict mode is enabled, code conventions are consistent, and error handling follows a predictable pattern throughout.

**Key strengths:**
- Clean separation of concerns (routes/services/middleware)
- Consistent error wrapping pattern in all services
- Proper async/await with try/finally for LDAP connection cleanup
- Good use of TanStack Query for server state and Zustand for UI state
- Shared types between frontend and backend

**Critical issues found:** 2 (LDAP injection, API client crash on 204)
**High issues found:** 4
**Medium issues found:** 6

---

## Findings

### F01 — LDAP Injection in auth.ts login flow
| | |
|---|---|
| **Priority** | P0 — Critical |
| **Category** | Security / Error Handling |
| **Files** | `server/src/services/auth.ts:60,69` |

**Problem:** The `login()` function interpolates user-supplied values directly into LDAP filter strings without escaping:
```typescript
filter: `(userPrincipalName=${upn})`
filter: `(sAMAccountName=${samName})`
```
An attacker could craft a username like `admin)(objectClass=*` to manipulate the LDAP filter. While the impact is limited (the bind already succeeded at this point, so this only affects the attribute lookup after authentication), it violates defense-in-depth and could leak information about directory objects.

The search service (`server/src/services/search.ts:46-50`) correctly escapes LDAP filter characters with `escapeLdapFilter()`, but this function is not used in `auth.ts`.

**Recommended fix:** Use the existing `escapeLdapFilter` pattern (or extract it to a shared util) and apply it to the UPN and sAMAccountName values in `auth.ts` before building the filter strings.

---

### F02 — API client crashes on HTTP 204 No Content responses
| | |
|---|---|
| **Priority** | P0 — Critical |
| **Category** | Error Handling / Frontend |
| **Files** | `client/src/api/client.ts:62` |

**Problem:** The `request()` function always calls `response.json()` on successful responses:
```typescript
return response.json() as Promise<T>
```
Several backend endpoints return `204 No Content` with no body (e.g., `PATCH /api/users`, `DELETE /api/users`, `POST /api/users/password`, enable, disable). Calling `.json()` on a 204 response throws a `SyntaxError: Unexpected end of JSON input`.

The frontend functions like `updateUser()`, `deleteUser()`, `resetPassword()` declare a return type of `Promise<void>` but pass through this crashing code path.

**Impact:** Every update, delete, password reset, enable, and disable operation will throw an error in the client even when the server operation succeeds. TanStack Query mutations will report failure despite the operation completing on the backend, confusing users with false error states.

**Recommended fix:** Check for 204 status (or empty body) before calling `response.json()`:
```typescript
if (response.status === 204 || response.headers.get('content-length') === '0') {
  return undefined as T
}
return response.json() as Promise<T>
```

---

### F03 — No React Error Boundary
| | |
|---|---|
| **Priority** | P1 — High |
| **Category** | Frontend / Robustness |
| **Files** | `client/src/App.tsx` |

**Problem:** The application has no React Error Boundary. An unhandled exception in any component (e.g., unexpected null data, rendering error) will crash the entire application with a white screen. React Error Boundaries catch rendering errors and can display a fallback UI.

**Recommended fix:** Add an `ErrorBoundary` component wrapping the main app routes. Display a user-friendly error page with a "reload" button.

---

### F04 — No input validation on API endpoints (no schema validation)
| | |
|---|---|
| **Priority** | P1 — High |
| **Category** | API Design / Security |
| **Files** | All `server/src/routes/*.ts` |

**Problem:** Request bodies are accepted without schema validation. The routes do basic null checks for required fields, but there is no type validation, length limits, or format validation. For example:
- `POST /api/users` accepts any `req.body` and passes it directly to `createUser(authReq.credentials, req.body)` — an attacker could inject unexpected LDAP attributes
- DN parameters from query strings are passed directly to LDAP operations without format validation
- No maximum length enforcement on any string fields

**Impact:** While LDAP itself will reject invalid operations, the error messages will be raw LDAP errors that may leak internal information. Proper validation would provide better error messages and an additional security layer.

**Recommended fix:** Add Zod schemas for request validation, at minimum for create and update operations. A middleware or per-route validation would catch malformed requests early with clear error messages.

---

### F05 — No request body size limit
| | |
|---|---|
| **Priority** | P1 — High |
| **Category** | Security / Robustness |
| **Files** | `server/src/index.ts:18` |

**Problem:** `express.json()` is used without a `limit` option. The default Express limit is 100kb, which is reasonable, but this should be explicitly set to prevent future Express version changes from introducing a larger default. More importantly, there is no protection against large request bodies at the infrastructure level.

**Recommended fix:** Explicitly set `express.json({ limit: '100kb' })` and consider adding `express-rate-limit` for production.

---

### F06 — Missing HTTP security headers (no Helmet.js)
| | |
|---|---|
| **Priority** | P1 — High |
| **Category** | Security |
| **Files** | `server/src/index.ts` |

**Problem:** The documentation already notes this: no `helmet` middleware is used. This means no `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, `Content-Security-Policy`, etc. For an admin tool handling AD credentials, security headers are important.

**Recommended fix:** Install and configure `helmet` with sensible defaults.

---

### F07 — CORS is fully open
| | |
|---|---|
| **Priority** | P2 — Medium |
| **Category** | Security |
| **Files** | `server/src/index.ts:17` |

**Problem:** `app.use(cors())` is called without any origin restriction. This allows any website to make authenticated requests to the API if the user has a valid token in localStorage. While the Bearer token model mitigates CSRF attacks (an attacker site cannot read the token from another origin's localStorage), the open CORS policy is overly permissive for production.

**Recommended fix:** Configure CORS with specific allowed origins, at minimum for production mode:
```typescript
app.use(cors({
  origin: config.nodeEnv === 'production' ? 'https://your-domain' : true,
}))
```

---

### F08 — Client-side pagination fetches ALL objects from LDAP then slices
| | |
|---|---|
| **Priority** | P2 — Medium |
| **Category** | Performance |
| **Files** | `server/src/services/objects.ts:57-96`, `server/src/services/search.ts:90-135` |

**Problem:** Both `listObjects()` and `searchObjects()` fetch all matching entries from LDAP, sort them in memory, then slice for pagination. For containers with thousands of objects, this means:
1. Every page request fetches ALL objects from LDAP
2. The full result set is sorted in-memory
3. Only then is the page slice returned

The search service has a `sizeLimit: 200` which caps results, but `listObjects` has no such limit.

**Impact:** Performance degradation in large directories. An OU with 10,000 users would transfer all 10,000 entries on every page navigation.

**Recommended fix:** For the object list, consider using LDAP paged results control (`ldapts` supports `PagedResultsControl`). For the short term, at minimum add a `sizeLimit` to `listObjects` queries. Note that true server-side pagination with LDAP is challenging due to LDAP's limited sorting capabilities, but the size limit is important.

---

### F09 — Duplicate helper functions across services
| | |
|---|---|
| **Priority** | P2 — Medium |
| **Category** | Code Quality / Maintainability |
| **Files** | `server/src/services/users.ts`, `server/src/services/groups.ts`, `server/src/services/computers.ts`, `server/src/services/objects.ts`, `server/src/services/search.ts`, `server/src/services/tree.ts` |

**Problem:** Several helper functions are duplicated across service files:
1. **`str()`, `strArr()`, `num()` converters** — identical implementations in `users.ts`, `groups.ts`, `computers.ts`
2. **`toStringArray()`** — duplicated in `objects.ts`, `search.ts`, `tree.ts`
3. **`determineObjectType()`** — duplicated in `objects.ts` and `search.ts`
4. **`isAccountEnabled()`** — duplicated in `objects.ts` and `search.ts`
5. **`Credentials` interface** — defined identically in 8+ service files

**Recommended fix:** Extract to shared utils:
- `server/src/utils/ldapHelpers.ts` — `str()`, `strArr()`, `num()`, `toStringArray()`
- `server/src/utils/objectMapping.ts` — `determineObjectType()`, `isAccountEnabled()`
- `server/src/types.ts` — `Credentials` interface

---

### F10 — Update operations in services build modifications from unvalidated keys
| | |
|---|---|
| **Priority** | P2 — Medium |
| **Category** | Security / Code Quality |
| **Files** | `server/src/services/users.ts:199`, `server/src/services/groups.ts:117`, `server/src/services/computers.ts:131` |

**Problem:** The `updateUser()`, `updateGroup()`, and `updateComputer()` functions iterate over `Object.entries(changes)` and create LDAP modifications for any key present. This means a malicious or buggy client could send attributes not intended for modification (e.g., `objectClass`, `objectSid`). While LDAP permissions will block most unauthorized changes, this is a defense-in-depth concern.

**Recommended fix:** Add allowlists of modifiable attributes for each object type and filter incoming changes against them.

---

### F11 — No service-level integration tests
| | |
|---|---|
| **Priority** | P2 — Medium |
| **Category** | Testing |
| **Files** | `server/src/services/*.ts` |

**Problem:** All existing unit tests cover pure utility functions (crypto, UAC, DN parsing, password encoding, LDAP filters, group types) and middleware. There are **no tests for any service functions** (users, groups, computers, objects, tree, search, OUs, attributes, auth). These are the core business logic of the application.

The E2E tests cover the full stack but require a running Samba4 DC, making them unsuitable for CI without infrastructure. There is a significant gap in testing the service layer in isolation.

**Recommended fix:** Add integration tests for service functions using mocked LDAP clients. Test key scenarios:
- User CRUD operations
- Error handling (LDAP errors, not-found, permission denied)
- Password reset flow (multi-step with cleanup)
- Recursive OU deletion
- Group member management

---

### F12 — Recursive OU deletion sorts by DN length instead of DN depth
| | |
|---|---|
| **Priority** | P2 — Medium |
| **Category** | Robustness |
| **Files** | `server/src/services/ous.ts:108-111` |

**Problem:** The recursive OU deletion sorts child DNs by string length to delete deepest first:
```typescript
.sort((a, b) => b.length - a.length)
```
This heuristic works in most cases because deeper DNs are typically longer, but it can fail with short OU names at deeper levels vs. long OU names at shallow levels. For example:
- `CN=X,OU=A,OU=B,DC=lab,DC=dev` (length 33) — depth 4
- `CN=VeryLongComputerName,OU=B,DC=lab,DC=dev` (length 43) — depth 3

The longer DN would be deleted first, but the shallower entry should be deleted first.

**Recommended fix:** Sort by the number of commas in the DN (which corresponds to depth) instead of string length:
```typescript
.sort((a, b) => b.split(',').length - a.split(',').length)
```

---

### F13 — ObjectList component has excessive state and complexity
| | |
|---|---|
| **Priority** | P3 — Low |
| **Category** | Maintainability / Frontend |
| **Files** | `client/src/components/objects/ObjectList.tsx` |

**Problem:** The `ObjectList` component manages 15+ pieces of state, 8 mutation hooks, and handles keyboard shortcuts, context menus, multiple dialog types, and object operations. This makes it difficult to understand, maintain, and test. The component is over 450 lines.

**Recommended fix:** Extract dialog management into a custom hook (e.g., `useObjectDialogs`). Extract keyboard shortcut handling into `useKeyboardShortcuts`. Consider extracting the delete/move/enable/disable operations into a `useObjectActions` hook.

---

### F14 — No token refresh mechanism in the frontend
| | |
|---|---|
| **Priority** | P3 — Low |
| **Category** | Frontend / Robustness |
| **Files** | `client/src/api/client.ts`, `client/src/hooks/useAuth.ts` |

**Problem:** The backend has a `POST /api/auth/refresh` endpoint and the client has an `api/auth.ts:refreshToken()` function, but neither is actually used. The auth hook has no automatic token refresh. With a 15-minute JWT expiry, users will be silently logged out when their token expires and their next API call fails with 401. The API client does clear the token on 401, but there is no proactive refresh or user notification.

**Recommended fix:** Implement an interceptor in the API client that catches 401 errors and attempts a token refresh before redirecting to login. Alternatively, set up a timer based on the JWT expiry to proactively refresh.

---

### F15 — `getMe()` return type mismatch
| | |
|---|---|
| **Priority** | P3 — Low |
| **Category** | Code Quality |
| **Files** | `client/src/api/auth.ts:25-27`, `server/src/routes/auth.ts:63-66` |

**Problem:** The `getMe()` API function declares `Promise<User>` as return type, but the backend returns `{ user: authReq.user }` — an object with a `user` property. The frontend useAuth hook calls `getMe().then((u) => setUser(u))`, which would set the user to `{ user: { dn, ... } }` instead of the actual user object.

**Recommended fix:** Either change the API client to `apiGet<{ user: User }>('/api/auth/me').then(r => r.user)` or change the backend to return the user directly.

---

### F16 — `moveUser` API response field mismatch
| | |
|---|---|
| **Priority** | P3 — Low |
| **Category** | API Design |
| **Files** | `client/src/api/users.ts:32-34`, `server/src/routes/users.ts:213-214` |

**Problem:** The client `moveUser()` expects `{ newDn: string }` in the response, but the server returns `{ dn: newDn }`. Same pattern for `moveGroup` and `moveComputer`. The field name mismatch means the client never gets the new DN correctly. This doesn't cause a crash because the mutation hooks don't use the response value, but it's a latent bug.

**Recommended fix:** Align the response field names between client and server.

---

### F17 — OU rename/update response inconsistency
| | |
|---|---|
| **Priority** | P4 — Info |
| **Category** | API Design |
| **Files** | `server/src/routes/ous.ts` |

**Problem:** The OU routes return inconsistent success formats:
- `PATCH /api/ous` returns `{ success: true }` (200)
- `DELETE /api/ous` returns `{ success: true }` (200)
- `POST /api/ous/rename` returns `{ newDn }` (200)

Other entity routes (users, groups, computers) use `204 No Content` for updates and deletes. The inconsistency between entity types makes the API less predictable.

**Recommended fix:** Standardize on either `204 No Content` or `{ success: true }` across all routes.

---

### F18 — Tree node `hasChildren` always returns true
| | |
|---|---|
| **Priority** | P4 — Info |
| **Category** | Frontend / UX |
| **Files** | `server/src/services/tree.ts:59` |

**Problem:** Every tree node has `hasChildren: true` hardcoded for performance reasons (avoids an additional LDAP query per node). This means every node shows an expand chevron, even empty containers. Clicking expands to reveal nothing, which is a minor UX inconsistency.

This is an acceptable tradeoff for performance, documented in code with a comment.

---

### F19 — E2E test cleanup relies on test execution order
| | |
|---|---|
| **Priority** | P4 — Info |
| **Category** | Testing |
| **Files** | `client/e2e/users.spec.ts:113-132` |

**Problem:** The user E2E test creates a user in `test.describe` and has a separate cleanup test outside the describe block. This relies on test execution order and the cleanup test uses `page.on('dialog', ...)` for a native browser dialog, but the application uses a custom React dialog for deletion confirmation — so the cleanup may not work correctly.

**Recommended fix:** Use `test.afterAll` for cleanup or use Playwright fixtures for test data lifecycle management.

---

## Summary Table

| # | Priority | Category | Description |
|---|----------|----------|-------------|
| F01 | P0 | Security | LDAP injection in auth.ts login filter |
| F02 | P0 | Error Handling | API client crashes on 204 No Content |
| F03 | P1 | Frontend | No React Error Boundary |
| F04 | P1 | API Design / Security | No input schema validation |
| F05 | P1 | Security | No explicit request body size limit |
| F06 | P1 | Security | Missing HTTP security headers |
| F07 | P2 | Security | CORS fully open |
| F08 | P2 | Performance | Pagination fetches all LDAP objects |
| F09 | P2 | Maintainability | Duplicate helper functions |
| F10 | P2 | Security | Unvalidated attribute keys in updates |
| F11 | P2 | Testing | No service-level tests |
| F12 | P2 | Robustness | Recursive OU delete sort bug |
| F13 | P3 | Maintainability | ObjectList component complexity |
| F14 | P3 | Robustness | No automatic token refresh |
| F15 | P3 | Code Quality | getMe() return type mismatch |
| F16 | P3 | API Design | Move response field mismatch |
| F17 | P4 | API Design | OU route response inconsistency |
| F18 | P4 | UX | Tree hasChildren always true |
| F19 | P4 | Testing | E2E cleanup relies on test order |

---

## Positive Observations

1. **TypeScript strict mode** is enabled in `tsconfig.base.json` and inherited by all packages.
2. **LDAP connection cleanup** is consistently handled with `try/finally/unbind` in every service.
3. **Error wrapping** follows a consistent pattern with `statusCode` and `code` properties.
4. **Crypto implementation** is solid — AES-256-GCM with random IVs, proper auth tag handling.
5. **Password encoding** correctly uses UTF-16LE with double-quote wrapping per AD specification.
6. **TanStack Query cache invalidation** is thorough — mutations correctly invalidate related queries.
7. **Frontend loading/error states** are consistently implemented across all components.
8. **Accessibility** benefits from Radix UI primitives (proper dialog, tabs, context menu semantics).
9. **Unit test quality** for utilities is good — edge cases, round-trip tests, error conditions covered.
10. **E2E test coverage** spans all major features (auth, CRUD for all entity types, search, keyboard shortcuts).
