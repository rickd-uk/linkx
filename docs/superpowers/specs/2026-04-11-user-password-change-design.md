# User Password Change — Design Spec

**Date:** 2026-04-11  
**Status:** Approved

---

## Overview

Allow logged-in users to change their own password from the UserMenu dropdown. Other active sessions (e.g. other devices) are invalidated on change; the current session stays active via a fresh JWT.

---

## API Endpoint

**File:** `src/app/api/user/change-password/route.ts`  
**Method:** `POST /api/user/change-password`  
**Auth:** Requires valid user JWT via `getUserFromRequest`

**Request body:**
```json
{ "currentPassword": "string", "newPassword": "string" }
```

**Server logic:**
1. Reject if `currentPassword` or `newPassword` missing → 400
2. Validate `newPassword` length ≥ 8 characters → 400
3. Identify user from JWT via `getUserFromRequest`
4. Load user from DB, verify `currentPassword` with `bcrypt.compare` against `User.passwordHash`
5. If verification fails → `401 { error: "Current password is incorrect" }`
6. Hash `newPassword` with bcrypt (10 salt rounds)
7. Update `User` record: set `passwordHash` to new hash, set `forceLogoutAt = new Date()` to invalidate all existing tokens
8. Issue a fresh JWT via `createUserToken` for the current session
9. Return `200 { success: true, token: "<new-jwt>" }`

**Client on success:** replace `user_token` in localStorage with the returned token so the current session remains valid.

---

## UI

**File:** `src/components/UserMenu.tsx`

A "Change Password" menu item added between "Help & About" and "Log Out" in the dropdown.

Clicking it opens an inline modal (rendered inside `UserMenu.tsx`) with:
- Current password (password input)
- New password (password input)
- Confirm new password (password input)

**Client-side validation (before submission):**
- New password must be ≥ 8 characters
- New password and confirm new password must match

**Submission behavior:**
- Button shows loading state while request is in flight
- On success: store new token in localStorage, show "Password changed successfully!", auto-close after 1.5s
- On error: show inline error message, modal stays open

---

## Files Changed

| File | Change |
|------|--------|
| `src/app/api/user/change-password/route.ts` | New endpoint |
| `src/components/UserMenu.tsx` | Add menu item + inline modal |

---

## Out of Scope

- Email notification on password change
- Password strength requirements beyond minimum length
- Changing username or email
