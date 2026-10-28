# EOTC Senbet Tmhrtbet Learning Platform — Security Review & RBAC Architecture

## 1. Executive Summary

This security review details the defensive posture, authorization barriers, cryptographic safeguards, and offline trust boundaries implemented across the **EOTC Senbet Tmhrtbet Learning Platform MVP**.

The platform is designed to protect church educational intellectual property, ensure accurate student assessment records, prevent unauthorized curriculum tampering, and provide resilient offline learning without compromising authentication integrity.

---

## 2. Threat Model & Trust Boundaries

```
                      INTERNET / UNTRUSTED CLIENTS
                                  │
    ┌─────────────────────────────┴─────────────────────────────┐
    ▼                                                           ▼
[Web Client PWA]                                        [Mobile App (Expo)]
- Stores: IndexedDB                                     - Stores: SQLite + Files
- Trust: Low (Client Side)                              - Trust: Low (Client Side)
    │                                                           │
    └─────────────────────────────┬─────────────────────────────┘
                                  │ HTTPS + JWT Bearer Tokens
                                  ▼
                   ┌─────────────────────────────┐
                   │    Express.js API Gateway   │  ◄── TRUST BOUNDARY 1:
                   │  - Rate Limiting            │      Authentication & Role Guards
                   │  - Zod Request Sanitization │
                   └──────────────┬──────────────┘
                                  │
                   ┌──────────────┴──────────────┐
                   │     Internal Core Domain    │  ◄── TRUST BOUNDARY 2:
                   │  - Idempotent Sync Service  │      Idempotency & Server Score Validation
                   │  - Publishing Manifest Engine│
                   └──────────────┬──────────────┘
                                  │
                   ┌──────────────┴──────────────┐
                   │  PostgreSQL 16 Database     │  ◄── TRUST BOUNDARY 3:
                   │  - Bcrypt Hashes (Cost 10)  │      Data Persistence & Session State
                   │  - SHA-256 Refresh Tokens   │
                   └─────────────────────────────┘
```

---

## 3. Authentication Architecture & Session Security

### 3.1. Password Security
- **Algorithm**: `bcryptjs` with salt round work factor of `10`.
- **Validation**: Enforces minimum 8 characters via Zod `CreateUserRequestSchema` and `ResetPasswordSchema`.
- **Sanitization**: Password hashes are strictly omitted (`select: { passwordHash: false }` or explicitly stripped) from all API responses and audit logs.

### 3.2. Access Tokens
- **Standard**: JSON Web Tokens (JWT) signed with HMAC-SHA256 (`HS256`).
- **Lifespan**: Short-lived (15 minutes).
- **Payload**: Contains minimal non-sensitive identity claims (`userId`, `email`, `role`).

### 3.3. Refresh Tokens & Token Rotation
- **Entropy**: 40 bytes of cryptographically secure random bytes generated via Node.js `crypto.randomBytes(40).toString('hex')`.
- **Storage**: Plaintext refresh tokens are never stored in the database. Instead, the server computes `crypto.createHash('sha256').update(token).digest('hex')` and stores only the SHA-256 digest in `refresh_sessions`.
- **Rotation**: Every `/api/auth/refresh` request issues a new refresh token and revokes the predecessor.
- **Reuse Detection**: If a revoked refresh token is presented to `/api/auth/refresh`, the server flags a potential replay attack (`TOKEN_REUSE_DETECTED`), immediately revokes all refresh sessions for that user family, and rejects the request with HTTP 401.

---

## 4. Role-Based Access Control (RBAC) Matrix

| Endpoint Group | Method | Path | Allowed Roles | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Auth** | POST | `/api/auth/login` | Anonymous | Authenticates credentials |
| **Auth** | POST | `/api/auth/refresh` | Anonymous | Rotates refresh session |
| **Auth** | POST | `/api/auth/logout` | Authenticated | Revokes current session |
| **Admin Users** | GET, POST | `/api/admin/users` | `ADMIN` | List and create users |
| **Admin Users** | PATCH | `/api/admin/users/:id/status` | `ADMIN` | Deactivate/reactivate users |
| **Admin Users** | PATCH | `/api/admin/users/:id/role` | `ADMIN` | Promote/demote user roles |
| **Admin Users** | POST | `/api/admin/users/:id/reset-password` | `ADMIN` | Administrative password reset |
| **Curriculum Authoring** | POST, PATCH, DELETE | `/api/admin/curriculum/grades/*` | `ADMIN` | Curriculum hierarchy management |
| **Curriculum Authoring** | POST, PATCH, DELETE | `/api/admin/curriculum/subjects/*` | `ADMIN` | Subject management |
| **Curriculum Authoring** | POST, PATCH, DELETE | `/api/admin/curriculum/chapters/*` | `ADMIN` | Chapter authoring |
| **Textbook Management** | PUT | `/api/admin/curriculum/chapters/:id/textbook` | `ADMIN` | Clamped PDF page range mapping |
| **Quiz Authoring** | POST | `/api/admin/curriculum/chapters/:id/quizzes` | `ADMIN` | Practice quiz creation |
| **Quiz Authoring** | POST | `/api/admin/curriculum/quizzes/:id/questions` | `ADMIN` | Question and choice authoring |
| **References** | POST | `/api/admin/curriculum/chapters/:id/references` | `ADMIN` | External URLs and downloadable PDFs |
| **Publishing** | POST | `/api/admin/curriculum/chapters/:id/publish` | `ADMIN` | Atomic package build & SHA-256 manifest |
| **Student Discovery** | GET | `/api/student/curriculum` | `STUDENT`, `TEACHER`, `ADMIN` | View published curriculum hierarchy |
| **Student Packages** | GET | `/api/student/packages/:chapterId` | `STUDENT`, `TEACHER`, `ADMIN` | Download canonical package manifest |
| **Student Sync Batch** | POST | `/api/student/sync/batch` | `STUDENT`, `TEACHER`, `ADMIN` | Idempotent attempt and progress push |
| **Student Sync Pull** | GET | `/api/student/sync/pull` | `STUDENT`, `TEACHER`, `ADMIN` | Delta cursor synchronization |

---

## 5. Offline Trust Model & Practice Assessment Disclosure

### 5.1. Why Practice Quizzes Are Stored Locally
To fulfill the non-negotiable requirement of reliable offline learning in areas with poor or intermittent connectivity, students must be able to complete quizzes and receive immediate instructional feedback without contacting the server.
- The `LearningPackageManifest` includes questions, choices, and `isCorrect` flags.
- **Classification**: The MVP explicitly classifies all offline quizzes as **Practice Quizzes**.
- They are intended for formative self-assessment and knowledge reinforcement, not high-stakes proctored certification.

### 5.2. Server-Side Score Recalculation
Even though clients calculate scores locally for instant UI feedback, the backend `SyncService` **never trusts client-reported scores**:
1. When `/api/student/sync/batch` receives an attempt, it reads the actual question choices and points from PostgreSQL.
2. It re-evaluates every submitted `selectedChoiceId` against server truth.
3. It sets `score`, `maxScore`, and `passed` according to server-evaluated points.

---

## 6. Data Integrity & Idempotency Safeguards

### 6.1. Package Manifest Integrity
- Every published chapter package is compiled into a deterministic JSON manifest.
- The server generates a canonical SHA-256 hash across the package payload (`checksumSha256`).
- Both Web and Mobile download managers verify the SHA-256 hash upon completion before marking a package as `AVAILABLE_OFFLINE`.

### 6.2. Duplicate Prevention via Client Attempt UUIDs
- Clients generate a UUID v4 (`clientAttemptUuid`) prior to taking any offline quiz.
- The database enforces a `UNIQUE` constraint on `(userId, clientAttemptUuid)`.
- Re-transmissions caused by spotty network reconnections match existing records and return HTTP 200 with status `DUPLICATE`, guaranteeing zero duplicate records.

---

## 7. Security Audit Verification

The platform's security mechanisms are verified on every continuous integration run via automated test suites:
- `apps/api/tests/auth.test.ts` (21 tests): Covers password hashing, token expiration, rotation, reuse detection, and admin RBAC.
- `apps/api/tests/e2e.test.ts` (Journey 4): Verifies student endpoint isolation (403), unauthenticated rejection (401), invalid signature handling (401), and session invalidation.
