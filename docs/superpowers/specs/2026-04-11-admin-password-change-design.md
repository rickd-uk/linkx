# Admin Password Change — Design Spec

**Date:** 2026-04-11  
**Status:** Approved

---

## Overview

Add the ability for the admin to change their password from the admin dashboard without touching the server environment or restarting the app.

---

## Data Layer

Admin password is currently stored as plain text in the `ADMIN_PASSWORD` env var. After a change, the new password is stored as a bcrypt hash in the existing `Setting` table under the key `admin_password_hash`.

The env var remains the bootstrap/fallback credential — it is used if no DB hash exists yet, enabling zero-breaking-change rollout.

---

## Auth Flow Changes

**File:** `src/app/api/auth/route.ts`

Login flow (POST `/api/auth`):

1. Read `admin_password_hash` from `Setting` table.
2. If the key exists → verify submitted password with `bcrypt.compare(submitted, hash)`.
3. If the key does not exist → fall back to plain string comparison against `ADMIN_PASSWORD` env var (existing behavior).
4. Token generation on success is unchanged (base64 `username:timestamp`).

---

## New API Endpoint

**File:** `src/app/api/admin/change-password/route.ts`  
**Method:** `POST /api/admin/change-password`  
**Auth:** Requires valid admin token via `checkAuth`

**Request body:**
```json
{ "currentPassword": "string", "newPassword": "string" }
```

**Server logic:**
1. Reject if `currentPassword` or `newPassword` missing.
2. Validate `newPassword` length ≥ 8 characters.
3. Verify `currentPassword`:
   - If `admin_password_hash` exists in `Setting` → `bcrypt.compare`
   - Else → compare against `ADMIN_PASSWORD` env var
4. If verification fails → `401 { error: "Current password is incorrect" }`
5. Hash `newPassword` with `bcrypt` (10 salt rounds).
6. Upsert `admin_password_hash` in `Setting` table.
7. Return `200 { success: true }`.

**No session invalidation** — the current session remains valid after the change.

---

## UI

**Location:** `src/app/[secretPath]/dashboard/page.tsx`

A "Change Password" button is added to the dashboard header, near the existing logout button. Clicking it opens a modal dialog.

**Modal fields:**
- Current password (password input)
- New password (password input)
- Confirm new password (password input)

**Client-side validation (before submission):**
- New password must be ≥ 8 characters
- New password and confirm new password must match

**Submission behavior:**
- Button shows a loading state while the request is in flight
- On success: inline success message, modal auto-closes after 1.5 seconds
- On error: inline error message, modal stays open

**No new component file** — the modal is implemented inline in `dashboard/page.tsx` following existing patterns (other modals like `AddLinkModal` are separate components, but this one is small enough to stay inline).

---

## Files Changed

| File | Change |
|------|--------|
| `src/app/api/auth/route.ts` | Add DB hash lookup before env var fallback |
| `src/app/api/admin/change-password/route.ts` | New endpoint |
| `src/app/[secretPath]/dashboard/page.tsx` | Add button + inline modal |

---

## Out of Scope

- Changing the admin username
- Password strength requirements beyond minimum length
- Email notification on password change
- Audit logging of password changes
