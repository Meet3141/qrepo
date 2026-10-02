# QRepo Frontend Refactoring Report

Date: 2026-10-02 · Branch: `main` (HEAD `c537b37`) · **Nothing committed.**

## 1. Executive Summary

The QRepo frontend was audited against the backend that is in this repository, call by call. It was then refactored so that every screen talks to the real API through shared service modules. All API failures now surface through a single toast system with consistent wording.

- **Backend untouched.** No backend code, contract, schema or authentication behaviour was changed in this task. The backend changes visible in `git status` are from the previous task (the platform APIs).
- **What changed, in summary:**
  - a centralised session layer and route guards;
  - one error-to-message mapper and one toast system;
  - every `alert()`, `window.confirm()` and swallowed `console.error` replaced;
  - three backend capabilities that existed but were not connected are now wired up (unit management, the draft **EDIT** review action, the AI health check);
  - hard-coded dashboard numbers and a fake activity feed replaced with real data.
- **Verification:**
  - the production build passes, and lint reports 0 errors;
  - every role's flows were exercised in a real browser against the real FastAPI backend, including deliberately triggered 401, 403, 409, 422, 503 and network failures.

**Inputs missing from the workspace.** `qrepo_frontend.zip` and `DESIGN.md` are not in the workspace. I worked on the in-repo `frontend/`, which is the same project, and treated the design tokens already defined in `frontend/src/index.css` as the design reference.

## 2. Frontend Architecture Reviewed

| Area | Finding |
|---|---|
| Framework / build | React 19, Vite 8 (rolldown), JSX (no TypeScript) |
| Package manager | npm (`package-lock.json`) |
| Routing | react-router-dom 7. `createBrowserRouter` in `main.jsx` wraps `<App>`, which declares `<Routes>`. `Layout` is the authenticated shell (Sidebar and TopBar). |
| State | Local component state only, with no global store. The session lived in `localStorage` (`token`, `user_role`). |
| UI | Tailwind v4 with Material-style tokens (`index.css` `@theme`) and Material Symbols icons. `lucide-react`, `clsx` and `tailwind-merge` are present. |
| HTTP | axios `apiClient` (`api/client.js`). Base URL comes from `VITE_API_BASE_URL`, falling back to `http://localhost:8000/api/v1`. A Bearer token is attached by an interceptor. |
| Auth | JWT from `POST /auth/login`, stored in `localStorage`. The role comes from `GET /auth/me`. |
| Notifications | **None.** Before this work, errors went to `alert()`, inline banners or `console.error`, or were silently dropped. |
| Route guards | **None.** Any URL rendered without a token, and any role could open any page. |
| Mock or hard-coded data found | <ul><li>Faculty dashboard: 0 for every statistic, "Welcome back, Professor".</li><li>HOD dashboard: "—" for faculty, approvals and papers.</li><li>Student dashboard: a fake activity feed ("Assessment graded: MA201 Quiz 3", …) and 0 for exams and completed assessments.</li><li>TopBar: a fake unread-notification dot.</li><li>Sidebar: "System Logs" pointed at the AI placeholder page.</li></ul> |
| Dead or placeholder code | <ul><li>`api/questions.js`: an unused re-export.</li><li>`AIConfigPlaceholder` in `App.jsx`.</li><li>Document page filter and sort icon buttons with no handlers.</li><li>"Remember me", "Forgot password?" and the SSO buttons did nothing.</li><li>The Student subjects "View" button did nothing.</li></ul> |

## 3. API Integration Audit

All paths are relative to `/api/v1`. **Auth** gives the backend dependency. **Error handling** describes the state after this refactor.

| Frontend Feature | Frontend File | Backend Endpoint | Method | Authentication | Request Verified | Response Verified | Error Handling | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|
| Sign in | `pages/Login.jsx`, `api/auth.js` | `/auth/login` | POST | none | ✅ `{email,password}` | ✅ `data.access_token` | Toast (backend message, e.g. "Invalid credentials") | FIXED | Inline error replaced by a toast. "Remember me" now chooses localStorage or sessionStorage. A signed-in user who visits /login is redirected. |
| Current user | `components/Session.jsx` | `/auth/me` | GET | Bearer | – | ✅ `email, full_name, role.name` | 401 → single "session expired" toast, then login | FIXED | Previously fetched separately by TopBar and Login. Now loaded once per session and shared through context. |
| Self registration | – | `/auth/register` | POST | none | – | – | – | NOT_APPLICABLE | No self-signup in the UI. Accounts are created by Admin or HOD. |
| Effective permissions | `components/Session.jsx` | `/permissions/me` | GET | Bearer | – | ✅ `string[]` | Silent fallback: actions stay visible and the backend still enforces access | FIXED | Was never consumed. Now drives the document upload/delete, AI generate and analytics UI. |
| List subjects | Subject mgmt, Documents, Question Bank, Generator, all dashboards, Student pages | `/subjects` | GET | any role | – | ✅ `SubjectResponse[]` | Toast + retryable error state | FIXED | Previously `console.error` only, so pages showed a false "No subjects" state. |
| Create / edit subject | `pages/SubjectManagement.jsx` | `/subjects`, `/subjects/{id}` | POST / PUT | Admin, HOD | ✅ `name, code, description, faculty_id` | ✅ | Toast (e.g. "Subject with this code already exists") | FIXED | `faculty_id` assignment was not exposed, so Faculty could never manage units. Now chosen from `/faculty`. The Add/Edit/Delete buttons were shown to Faculty (always a 403) and are now hidden. |
| Delete subject | `pages/SubjectManagement.jsx` | `/subjects/{id}` | DELETE | Admin, HOD | ✅ | ✅ | Toast + ConfirmDialog | FIXED | `alert()` removed. The confirmation now states that units, documents, AI questions and papers cascade. |
| List units | Subject mgmt, Documents, Question Bank, Generator, Student subjects | `/subjects/{id}/units` | GET | any role | – | ✅ | Toast | FIXED | Errors were swallowed before. |
| Create / edit / delete unit | `pages/SubjectManagement.jsx` (`UnitsPanel`) | `/subjects/{id}/units`, `/units/{id}` | POST / PUT / DELETE | Admin, HOD, assigned Faculty | ✅ `unit_number, title, description` | ✅ | Toast | FIXED | **Not connected before** (`unitService` existed but was unused). Without units, no document could be uploaded. |
| Get one unit / document | – | `/units/{id}`, `/documents/{id}` | GET | – | – | – | – | NOT_APPLICABLE | Lists already return the full objects. The service functions are kept. |
| Update document | – | `/documents/{id}` | PUT | Admin, HOD, Faculty | – | – | – | NOT_APPLICABLE | No rename UI in the design. |
| List documents | `pages/DocumentManagement.jsx` | `/units/{id}/documents` | GET | any role | – | ✅ | Toast | FIXED | Size column added from `file_size`. |
| Upload document | `pages/DocumentManagement.jsx` | `/units/{id}/documents` | POST (multipart) | permission `documents.upload` | ✅ `file` | ✅ | Client-side type/size check + toast | FIXED | The UI accepted `.doc`, which the backend rejects (it allows only pdf, docx and txt). Drag and drop is now implemented (it was advertised but missing). Multiple files and the 10 MB limit are mirrored from `storage.py`. |
| Extract text | `pages/DocumentManagement.jsx` | `/documents/{id}/process` | POST | Admin, HOD, Faculty | ✅ | ✅ `processing_status` | Toast | FIXED | `alert()` removed. Spinner shown, and the list refreshes. |
| Delete document | `pages/DocumentManagement.jsx` | `/documents/{id}` | DELETE | permission `documents.delete` | ✅ | ✅ | Toast + ConfirmDialog | FIXED | `window.confirm` removed. The button is gated by the permission matrix. |
| Generate questions | `pages/QuestionBank.jsx`, `pages/PaperGenerator.jsx` | `/ai/questions/generate` | POST | permission `ai.generate_questions` | ✅ enums, `number_of_questions` 5 or 6 | ✅ | Toast. AI 502/503/504 messages are shown as written by the backend. | FIXED | Inline error removed. The button is hidden or disabled when the role lacks the permission. |
| List generations | `pages/QuestionBank.jsx` | `/ai/generations?subject_id&limit` | GET | Admin, HOD, Faculty | ✅ | ✅ | Toast + retryable state | FIXED | – |
| Generation detail | `pages/QuestionBank.jsx` | `/ai/generations/{id}` | GET | Admin, HOD, Faculty | – | ✅ | Toast | FIXED | `alert()` removed. |
| Review draft | `components/DraftReview.jsx` | `/ai/drafts/{id}/review` | POST | Admin, HOD, Faculty | ✅ `action, edits, rejection_reason, comment, rating` | ✅ updated draft | Toast | FIXED | **EDIT action was not connected.** It now supports question text, options and correct option, answer, explanation, difficulty, Bloom level and marks, and sends only the changed fields. The review dialog had been duplicated in two pages and is now one shared component. |
| AI provider health | `pages/Settings.jsx` | `/ai/health` | GET | Admin | – | ✅ `available, latency_ms, error_category` | Inline state + toast | FIXED | **Not connected before.** The page was a static placeholder. |
| Users CRUD, export, roles | `pages/UserManagement.jsx` | `/users`, `/users/{id}`, `/users/export`, `/roles` | GET / POST / PUT / DELETE | Admin | ✅ | ✅ | Toast | FIXED | Inline banners became toasts. Suspend now has a double-click guard. A role/department list failure used to be silently ignored. |
| Departments and permission matrix | `pages/RoleManagement.jsx` | `/departments…`, `/permissions/matrix`, `/permissions/matrix/reset` | GET / POST / PUT / DELETE | Admin | ✅ | ✅ | Toast | FIXED | Inline banners became toasts. |
| Faculty management | `pages/HodFacultyManagement.jsx` | `/faculty`, `/faculty/{id}`, `/faculty/export` | GET / POST / PATCH | Admin, HOD | ✅ | ✅ | Toast (422 shows field detail) | FIXED | Inline banners became toasts. The deactivate/move actions now have a double-submit guard. |
| HOD dashboard | `pages/HodDashboard.jsx` | `/faculty`, `/papers?page_size=1`, `/subjects` | GET | Admin, HOD | – | ✅ | Toast | FIXED | Faculty count, pending approvals and total papers were hard-coded "—". |
| Faculty dashboard | `pages/FacultyDashboard.jsx` | `/subjects`, `/papers?page_size=1`, `/analytics/faculty/overview` | GET | Admin, HOD, Faculty | – | ✅ | Toast | FIXED | <ul><li>Statistics were hard-coded to 0, and the "Generated Papers" card was duplicated.</li><li>Now shows: subjects assigned to the user, total papers, approved papers, and AI drafts awaiting review.</li></ul> |
| Papers (list, build, edit, submit, review, comment, delete) | `pages/GeneratedPapers.jsx`, `pages/HodApprovals.jsx`, `components/papers.jsx` | `/papers…` | GET / POST / PUT / DELETE | Admin, HOD, Faculty + permissions | ✅ | ✅ | Toast | FIXED | Form validation errors are now toasts. The ConfirmDialog error banner was removed. |
| Paper PDF | `api/platform.js` (`downloadFile`) | `/papers/{id}/pdf?include_answers` | GET (blob) | Admin, HOD, Faculty | ✅ | ✅ 200 `application/pdf`, filename header | Toast. JSON error bodies inside a Blob are decoded centrally. | WORKING | – |
| CSV exports | `api/platform.js` | `/users/export`, `/departments/export`, `/faculty/export`, `/analytics/faculty/heatmap/export` | GET (blob) | as above | ✅ | ✅ | Toast | WORKING | – |
| Admin dashboard | `pages/AdminDashboard.jsx` | `/analytics/admin/overview`, `/analytics/admin/activity` | GET | Admin | – | ✅ | Toast + retryable state | FIXED | The banner became a toast with a retry. The chart was misaligned when the activity column grew. |
| System logs | `pages/SystemLogs.jsx` (new) | `/analytics/admin/activity?limit=100` | GET | Admin | – | ✅ | Toast + retryable state | FIXED | The Sidebar "System Logs" link pointed at the AI placeholder. It now uses the existing activity endpoint, with a type filter. |
| Faculty analytics | `pages/FacultyAnalytics.jsx` | `/analytics/faculty/overview`, `/papers` (balanced draft) | GET / POST | permission `analytics.view` | ✅ | ✅ | Toast | FIXED | Inline banners became toasts. |
| Repository search | `components/TopBar.jsx` | – | – | – | – | – | – | BLOCKED_BY_BACKEND | No search endpoint. The field is shown disabled and labelled "not available yet". |
| Notifications, help | `components/TopBar.jsx` | – | – | – | – | – | – | BLOCKED_BY_BACKEND | No endpoint. The non-functional buttons and fake unread dot were removed. |
| Forgot password, Google/Microsoft SSO | `pages/Login.jsx` | – | – | – | – | – | Info toast | BLOCKED_BY_BACKEND | No endpoint. The buttons explain the situation instead of doing nothing. |
| Student exams, results, performance | `pages/StudentDashboard.jsx`, `pages/StudentAnalytics.jsx` | – | – | – | – | – | – | BLOCKED_BY_BACKEND | No data model. The cards say "not tracked yet" instead of showing a fabricated 0. |

## 4. API Issues Found

1. **No authentication guard.** Every protected route rendered without a token, and any role could open any page. Pages then failed one by one with 401 or 403 errors.
2. **Incomplete 401 handling.** The interceptor removed the token but did not redirect (`// window.location.href` was commented out). Users stayed on a broken page.
3. **Silent failures.**
   - `SubjectManagement`, `DocumentManagement`, `QuestionBank`, `PaperGenerator`, the four dashboards and both student pages only called `console.error`, so the UI showed misleading empty states.
   - `UserManagement` used `.catch(() => {})` for the roles and departments lists.
4. **`alert()` and `window.confirm()` for errors and confirmations**, in SubjectManagement, DocumentManagement, QuestionBank and PaperGenerator.
5. **Raw backend messages read inline** (`err.response?.data?.message || …`) in four pages, with no handling of:
   - network errors;
   - 422 field details;
   - 500 detail leakage: the backend 500 text can contain exception strings, such as "Failed to extract text: …".
6. **Inconsistent response handling.** Some services returned the envelope (`res.data`) while callers read `.data` again. Others unwrapped it. Pages also bypassed the services and called `apiClient` directly.
7. **Upload contract mismatch.** The UI accepted `.doc`, which the backend rejects with a 400. Size and type were never checked on the client.
8. **Backend capabilities not connected:**
   - unit CRUD (so document upload was impossible in a fresh install);
   - subject `faculty_id` assignment;
   - the draft `EDIT` review action;
   - `GET /ai/health`;
   - `GET /permissions/me`.
9. **Wrong navigation target.** "System Logs" pointed at the AI placeholder page.
10. **Hard-coded or fake data** on the Faculty, HOD and Student dashboards and the TopBar notification badge.
11. **Duplicate implementations:**
    - draft rendering and the review modal were duplicated between QuestionBank and PaperGenerator;
    - `/auth/me` was fetched by both TopBar and Login;
    - logout logic was duplicated in Sidebar and `authService`.
12. **Role-inappropriate actions.** The Subject Add/Edit/Delete buttons were shown to Faculty, for whom the backend always returns 403.

## 5. API Connections Fixed

- **Unit management (new UI).** `POST /subjects/{id}/units`, `PUT/DELETE /units/{id}`, in an expandable units panel per subject.
- **Faculty assignment on subjects.** `faculty_id` on `POST/PUT /subjects`, with options from `GET /faculty`.
- **Draft review EDIT action.** `POST /ai/drafts/{id}/review` with `edits`, sending only the fields that changed.
- **AI provider health.** `GET /ai/health` on the Settings / AI Configuration page.
- **Effective permissions.** `GET /permissions/me` drives the UI for document upload/delete, AI generation and analytics.
- **System Logs.** `GET /analytics/admin/activity?limit=100`.
- **Dashboards now use real data:**
  - HOD: `/faculty`, `/papers` status counts, `/subjects`;
  - Faculty: assigned `/subjects`, `/papers` totals, `/analytics/faculty/overview` KPIs;
  - Student: `/subjects`.
- **Student subjects.** "View" now lists the units from `GET /subjects/{id}/units`.
- **Document upload.** The accept list and validation match the backend. Drag and drop and multiple files work.

## 6. Missing Backend APIs

These could not be implemented without inventing backend behaviour. Each UI degrades gracefully, as described.

| Capability the UI implies | What the UI does now |
|---|---|
| Repository-wide search (TopBar) | Field is disabled and labelled "Search is not available yet". |
| Notifications and help (TopBar) | Non-functional buttons and the fake unread dot were removed. |
| Forgot password / password reset | Info toast: "Password reset is not available yet. Please contact your administrator." |
| Google / Microsoft SSO | Info toast saying SSO is not configured. |
| Self-service profile or password change | Settings shows the account read-only and says to contact an administrator. Only Admin `PUT /users/{id}` exists. |
| Student enrolment, exam schedules, assessment results, performance analytics | Student cards show "—" with "not tracked yet". There are no fake numbers or feed items. |
| Editing the AI model or key from the UI | Settings shows live provider health and notes that configuration is server-side (`.env`). |
| Subject ↔ department relationship | The HOD dashboard lists all subjects. The card was relabelled from "Department Subjects" to "Subjects", because subjects carry no department. |

## 7. Frontend Refactoring Performed

**New modules:**
- `api/session.js`: token and role storage (local or session storage), the `ROLES`, `STAFF` and `PERMISSIONS` catalog, `dashboardFor(role)`, and a session-expiry event.
- `api/errors.js`: `getErrorMessage(err)` (status-aware, safe) and `notifyError(err)` (skips errors that have already been handled).
- `components/Toast.jsx`: a dependency-free toast store and `<Toaster/>`.
- `components/Session.jsx`:
  - `SessionProvider` (user and permissions loaded once, logout, redirect on expiry);
  - `RequireAuth`;
  - `RequireRole`.
- `components/DraftReview.jsx`: the shared `DraftReviewDialog` (ACCEPT, EDIT, REJECT) and `DraftCard`.
- `components/ActivityList.jsx`: the shared event list for the dashboard and System Logs.
- `pages/Settings.jsx`: replaces the inline placeholder.
- `pages/SystemLogs.jsx`.

**Service layer.** `api/subjects.js`, `units.js`, `documents.js`, `ai.js` and `platform.js` now all return unwrapped `data` through the shared `unwrap()` in `client.js`. Pages no longer call `apiClient` directly. `api/questions.js` (an unused re-export) was deleted.

**HTTP client.**
- The token comes from the session module.
- 401 errors are handled once globally: one toast, the session is cleared, and the user is redirected.
- Login and register calls are excluded, so a wrong password stays a normal error.
- JSON error bodies inside Blob responses (downloads) are decoded centrally.

**Routing.**
- Every authenticated route is wrapped in `RequireAuth`.
- Each route declares the roles the backend allows (`App.jsx`).
- A user who opens a page their role cannot use is sent to their own dashboard with a toast.
- The Login page redirects users who are already signed in.
- The NotFound page links to the user's dashboard.

**Pages:**
- **Rewritten on the existing design:**
  - SubjectManagement (units panel, faculty assignment, role-aware actions);
  - DocumentManagement (permission-aware, validation, drag and drop, size column, ConfirmDialog).
- **Targeted refactors:** QuestionBank, PaperGenerator, all dashboards, the student pages, Login, TopBar, Sidebar, Layout and NotFound.
- **Pages built in the previous task, converted from banners to toasts:** UserManagement, RoleManagement, GeneratedPapers, HodApprovals, HodFacultyManagement, FacultyAnalytics, AdminDashboard.

**UI kit (`components/ui.jsx`).**
- Added `LoadError`, a load-failure state with a "Try again" button.
- `ConfirmDialog` and `PaperForm` no longer take an `error` prop, because errors are toasts now.

## 8. Error Handling and Toast System

**No new dependency.** No toast library existed, so I wrote a small one (about 80 lines) that uses the existing design tokens. It is styled with surface colours, an 8px radius and Material Symbols, and positioned top-centre so it never covers dialog action buttons. Testing showed that a bottom-right position hid the **Build paper** button.

**Messages by status:**

| Case | Message shown |
|---|---|
| Network or timeout | "Unable to connect to the server. Please check your connection and try again." |
| 400 / 403 / 404 / 409 | The backend's specific message when it is meaningful, otherwise the standard message. Generic backend strings such as "Insufficient permissions" are mapped to the standard wording. |
| 401 | Handled globally: "Your session has expired. Please sign in again.", then redirect to Login. On the login form itself, the backend message is shown ("Invalid credentials"). |
| 422 | "Some of the provided information is invalid." plus up to three field details, e.g. "password: Password must contain …". |
| 429 | Standard rate-limit message. |
| 500 | Always the generic server message. Backend detail is never shown. |
| 502 / 503 / 504 | The backend's message is shown, because the AI service returns user-friendly text such as "AI question generation is not configured on this server." Otherwise the generic message. |
| Unknown | "Something went wrong. Please try again." |

**Rules applied:**
- **Deduplication.** The same message and kind within 3 s shows once. Errors already handled by the 401 interceptor carry `handled` and are skipped.
- **No success toast after a failure.** Success toasts are emitted only after the awaited call resolves.
- **Feedback:**
  - every user-triggered mutation shows a success or error toast;
  - load failures show a toast plus a retryable `LoadError` state;
  - client-side validation (difficulty mix, required review fields, file type and size) uses the same toasts.
- **Double-submit prevention.** Every mutation button is disabled while its request runs, or guarded by a busy flag. This covers subject, unit, document, review, paper and faculty actions and the user suspend toggle.

## 9. Authentication and Authorization Handling

- **Token storage.** The token is stored in `localStorage` with "Remember me", or in `sessionStorage` without it. The role is stored next to it, and both are cleared together.
- **Route guards.**
  - `RequireAuth` blocks every authenticated route when there is no token.
  - `RequireRole` mirrors the backend's role dependencies. The backend still enforces everything; the guard avoids broken pages and floods of 403 errors.
- **Permission matrix.** `GET /permissions/me` is loaded once, so an Admin's matrix changes are reflected in the UI for:
  - document upload and delete;
  - AI generation;
  - Faculty dashboard analytics.
- **Expiry.** A 401 from any request produces one toast, clears the session, and redirects to `/login`. Verified with a token for a user who no longer exists and with a forged token.

## 10. Functionality Tested

**Setup.** Real FastAPI backend (`uvicorn app.main:app`) on a scratch SQLite database migrated with `alembic upgrade head` and seeded with one user per role. Vite dev server, in the in-app browser.

| Flow | Result |
|---|---|
| Unauthenticated visit to `/admin/users` | Redirected to `/login` ✅ |
| Wrong password | Toast "Invalid credentials", form stays usable ✅ |
| SSO button / Forgot password | Info toast ✅ |
| Admin login | Admin dashboard with real KPIs, chart and activity ✅ |
| Admin opens `/student/analytics` | Redirected to own dashboard plus "no permission" toast ✅ (initially the toast was lost on first load; fixed and re-verified) |
| Session expiry (stale or forged token) | Exactly one "session expired" toast, then login ✅ (initially two toasts; fixed and re-verified) |
| Network failure (backend stopped) | "Unable to connect to the server…" toast ✅ |
| AI not configured (503) | Curated backend message as a toast, and Settings shows "Unavailable" inline ✅ |
| 422 validation (weak faculty password) | Toast with the field detail ✅ |
| 409-style conflict (Admin suspends own account) | "You cannot remove your own administrator access", user stays Active ✅ |
| System Logs, Settings (account and AI health) | Load with real data ✅ |
| Faculty dashboard | 1 assigned subject, 1 paper, 0 approved, 0 drafts pending (matches the database) ✅ |
| HOD dashboard | 2 active faculty (CSE), 1 pending, 2 papers ✅ |
| Student dashboard and subjects | Real subject count, honest placeholders, units listed via "View" ✅ |
| Student opens `/question-bank` | Redirected plus toast ✅ |
| Remember-me off | Token in `sessionStorage` only ✅ |
| Sign out | Both storages cleared, back on `/login` ✅ |
| Browser console | No uncaught exceptions or React warnings. Only the network logs from the deliberately failed requests. ✅ |

## 11. Routes Tested

- **Admin:** `/login`, `/dashboard/admin`, `/admin/users`, `/admin/roles`, `/admin/logs`, `/settings/ai`, `/dashboard/subjects`, `/dashboard/documents`, `/question-bank`, `/faculty/analytics`, `/hod/faculty`.
- **Faculty:** `/dashboard/faculty`, `/generator`, `/dashboard/papers`.
- **HOD:** `/dashboard/hod`, `/hod/approvals`, `/hod/faculty`.
- **Student:** `/dashboard/student`, `/student/subjects`.
- **Guarded redirects:** `/student/analytics` as Admin, `/question-bank` as Student, any route without a token.
- **Not individually opened:** `/subjects` and `/documents`, which render the same components as `/dashboard/subjects` and `/dashboard/documents`. NotFound was compiled but not visited.

## 12. CRUD Operations Tested

| Entity | Create | Read | Update | Delete |
|---|---|---|---|---|
| Subject | ✅ with faculty assignment; duplicate code → error toast, dialog kept open | ✅ | not tested in the browser (same form and handler as create) | ✅ via ConfirmDialog |
| Unit | ✅ (number auto-suggested) | ✅ | not tested in the browser (same form as create) | not tested in the browser (same ConfirmDialog as subjects and documents) |
| Document | ✅ upload; `.doc` rejected on the client | ✅ | ✅ extract text → COMPLETED | ✅ |
| AI draft review | – | ✅ | ✅ EDIT (correct option changed, status EDITED); "no changes" guard verified | – |
| Paper | ✅ build; difficulty mix ≠ 100% → toast | ✅ detail | ✅ edit on a Pending paper blocked with a toast | not re-tested in this task (verified in the previous task) |
| Paper review | – | – | ✅ reject without comment blocked; approve → success toast | – |
| Faculty | ✅ 422 path | ✅ | – | – |
| User | – | ✅ | ✅ guarded self-suspend shows an error and leaves the state unchanged | – |
| PDF | – | ✅ 200, `application/pdf`, 74 KB, filename `CS201-Midterm-Examination-Trees.pdf` | – | – |

## 13. Remaining Issues

**Lint warnings.** `oxlint` reports **0 errors** and 24 warnings:
- 18 × `react(set-state-in-effect)`: the standard "fetch in `useEffect`, then `setState`" pattern used throughout the codebase;
- 6 × `react(only-export-components)`: shared helpers exported next to components. This only affects hot-reload granularity.

**Other open items:**
- **Large bundle.** The build warns about a chunk over 500 kB, because there is no route-level code splitting. This was already the case before this work.
- **Dialogs lose unsaved input on outside click.** Clicking the backdrop closes any dialog. This is existing `Modal` behaviour.
- **Unlabelled form fields in two older forms.** Some fields in the QuestionBank and PaperGenerator forms use `<label>` without `htmlFor` (an accessibility nit, out of scope).
- **Misleading quick-action link.** The Faculty "Generate Paper" link opens the Question Generator (`/generator`). Papers are built under Generated Papers. This follows the original navigation.
- **SQLite-only testing.**
  - On SQLite, foreign keys are not enforced, so deleting a subject left orphaned rows in the scratch database.
  - On PostgreSQL every subject foreign key is `ON DELETE CASCADE`, which matches the new confirmation text, but **PostgreSQL itself was not exercised**. There is no `backend/.env` in the workspace.
- **Missing inputs.** `DESIGN.md` and `qrepo_frontend.zip` are not in the workspace (see §1).

## 14. Design Compliance

- **Existing design tokens reused.** No new design system was introduced. Every new element uses the existing Tailwind tokens: surface and outline colours, `rounded-xl` cards (16px), `rounded-lg` buttons and inputs (8px), and Inter through the existing theme.
- **Layouts kept as they were.** Dashboards and page layouts keep their structure and grids. Visual changes are limited to:
  - the toast container and the new `LoadError` state;
  - the Subjects units panel and assigned-faculty column;
  - the Documents size column and drag-highlight;
  - the removal of non-functional TopBar buttons;
  - the AI chart alignment fix on the Admin dashboard.
- **Responsive.** Checked at 375 px and 1024 px.

## 15. Build and Runtime Verification

- `npx vite build`: ✅ passes. Only the existing chunk-size warning remains.
- `npx oxlint`: ✅ 0 errors (24 warnings, see §13).
- `npx oxlint -D no-undef`: no undefined identifiers apart from browser globals. This check caught dangling setters left by the banner-to-toast conversion, which were fixed before release.
- Dev server: started, with no unresolved imports.
- Runtime: the flows in §10 ran with no uncaught exceptions.
- **Backend:** not modified in this task (`git diff --stat -- backend` shows only the previous task's changes).

## 16. Final Project Status

All frontend-side integration problems that can be fixed without backend changes are fixed and verified in the browser against the real API. The six capabilities in §6 remain **BLOCKED_BY_BACKEND**, and their UIs degrade honestly.

**Remaining risks:**
- **PostgreSQL** was not tested, because there is no `.env`.
- **Live Gemini generation** was not tested, because no API key is configured. Its error path was verified; its success path renders through the shared `DraftCard` already used for stored generations.

**Nothing has been committed.**
