# User Password Change Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow logged-in users to change their password from the UserMenu dropdown, invalidating other sessions while keeping the current one active via a fresh JWT.

**Architecture:** A new `POST /api/user/change-password` endpoint verifies the current password, hashes the new one, sets `forceLogoutAt = now` on the user record to kill other sessions, and returns a fresh JWT. The UI lives in `UserMenu.tsx` as an inline modal triggered from the dropdown menu.

**Tech Stack:** Next.js 15 App Router, Prisma (SQLite), bcrypt, jsonwebtoken, TypeScript, Tailwind CSS

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/app/api/user/change-password/route.ts` | Create | Verify current password, update hash, invalidate other sessions, return fresh token |
| `src/components/UserMenu.tsx` | Modify | Add Change Password menu item and inline modal |

---

### Task 1: Create the user change-password API endpoint

**Files:**
- Create: `src/app/api/user/change-password/route.ts`

- [ ] **Step 1: Create the directory**

  ```bash
  mkdir -p src/app/api/user/change-password
  ```

- [ ] **Step 2: Create the route file**

  Create `src/app/api/user/change-password/route.ts` with this exact content:

  ```ts
  import { NextResponse } from "next/server";
  import bcrypt from "bcrypt";
  import { prisma } from "@/lib/prisma";
  import { getUserFromRequest, createUserToken, userUnauthorizedResponse } from "@/lib/userAuth";

  export async function POST(request: Request) {
    const userPayload = getUserFromRequest(request);
    if (!userPayload) {
      return userUnauthorizedResponse();
    }

    try {
      const { currentPassword, newPassword } = await request.json();

      if (!currentPassword || !newPassword) {
        return NextResponse.json(
          { error: "currentPassword and newPassword are required" },
          { status: 400 },
        );
      }

      if (newPassword.length < 8) {
        return NextResponse.json(
          { error: "New password must be at least 8 characters" },
          { status: 400 },
        );
      }

      const user = await prisma.user.findUnique({
        where: { id: userPayload.userId },
      });

      if (!user) {
        return userUnauthorizedResponse();
      }

      const currentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);

      if (!currentPasswordValid) {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 401 },
        );
      }

      const newHash = await bcrypt.hash(newPassword, 10);
      const now = new Date();

      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: newHash,
          forceLogoutAt: now,
        },
      });

      // Issue fresh token so current session stays valid
      const newToken = createUserToken(user.id, user.username);

      return NextResponse.json({ success: true, token: newToken });
    } catch (error) {
      console.error("Change password error:", error);
      return NextResponse.json(
        { error: "Failed to change password" },
        { status: 500 },
      );
    }
  }
  ```

- [ ] **Step 3: Get a valid user token for testing**

  First, register or log in as a test user. The dev server may be on port 3000 or 3002 — check which is active.

  ```bash
  TOKEN=$(curl -s -X POST http://localhost:3002/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"testuser","password":"testpassword"}' | jq -r .token)
  echo $TOKEN
  ```

  If no test user exists, create one first via the signup endpoint:
  ```bash
  curl -s -X POST http://localhost:3002/api/auth/signup \
    -H "Content-Type: application/json" \
    -d '{"username":"testuser","password":"testpassword"}' | jq .
  ```

- [ ] **Step 4: Test — reject unauthenticated request**

  ```bash
  curl -s -X POST http://localhost:3002/api/user/change-password \
    -H "Content-Type: application/json" \
    -d '{"currentPassword":"testpassword","newPassword":"newpassword123"}' | jq .
  ```
  Expected: `{ "error": "Authentication required" }` with status 401

- [ ] **Step 5: Test — reject short new password**

  ```bash
  curl -s -X POST http://localhost:3002/api/user/change-password \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"currentPassword":"testpassword","newPassword":"short"}' | jq .
  ```
  Expected: `{ "error": "New password must be at least 8 characters" }` with status 400

- [ ] **Step 6: Test — reject wrong current password**

  ```bash
  curl -s -X POST http://localhost:3002/api/user/change-password \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"currentPassword":"wrongpassword","newPassword":"newpassword123"}' | jq .
  ```
  Expected: `{ "error": "Current password is incorrect" }` with status 401

- [ ] **Step 7: Test — successful password change**

  ```bash
  curl -s -X POST http://localhost:3002/api/user/change-password \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"currentPassword":"testpassword","newPassword":"newpassword123"}' | jq .
  ```
  Expected: `{ "success": true, "token": "<new-jwt-string>" }`

- [ ] **Step 8: Verify old token is now rejected**

  ```bash
  curl -s http://localhost:3002/api/auth/me \
    -H "Authorization: Bearer $TOKEN" | jq .
  ```
  Expected: `{ "error": "..." }` with status 401 (old token invalidated by forceLogoutAt)

- [ ] **Step 9: Verify new token works**

  ```bash
  NEW_TOKEN=$(curl -s -X POST http://localhost:3002/api/user/change-password \
    ... # use the token returned in step 7)
  # Or just re-login with new password:
  NEW_TOKEN=$(curl -s -X POST http://localhost:3002/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"testuser","password":"newpassword123"}' | jq -r .token)
  curl -s http://localhost:3002/api/auth/me \
    -H "Authorization: Bearer $NEW_TOKEN" | jq .
  ```
  Expected: user object with status 200

- [ ] **Step 10: Commit**

  ```bash
  git add src/app/api/user/change-password/route.ts
  git commit -m "feat(user): add change-password endpoint with session invalidation"
  ```

---

### Task 2: Add Change Password UI to UserMenu

**Files:**
- Modify: `src/components/UserMenu.tsx`

- [ ] **Step 1: Read the current UserMenu file**

  Read `src/components/UserMenu.tsx` to understand the current structure before editing. The file is ~126 lines. Key areas:
  - Imports at top (includes `User, LogOut, ChevronDown, HelpCircle` from lucide-react)
  - `useAuth` hook destructured at line ~13: `const { user, loading, isAuthenticated, logout } = useAuth()`
  - Dropdown JSX starts around line 89
  - "Help & About" link around line 104
  - "Log Out" button around line 112

- [ ] **Step 2: Add the KeyRound icon import**

  Find the lucide-react import line:
  ```ts
  import { User, LogOut, ChevronDown, HelpCircle } from "lucide-react";
  ```

  Replace with:
  ```ts
  import { User, LogOut, ChevronDown, HelpCircle, KeyRound } from "lucide-react";
  ```

- [ ] **Step 3: Add modal state variables**

  Find:
  ```ts
  const [isOpen, setIsOpen] = useState(false);
  const [signupsEnabled, setSignupsEnabled] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);
  ```

  Replace with:
  ```ts
  const [isOpen, setIsOpen] = useState(false);
  const [signupsEnabled, setSignupsEnabled] = useState(true);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [cpCurrentPassword, setCpCurrentPassword] = useState("");
  const [cpNewPassword, setCpNewPassword] = useState("");
  const [cpConfirmPassword, setCpConfirmPassword] = useState("");
  const [cpError, setCpError] = useState<string | null>(null);
  const [cpSuccess, setCpSuccess] = useState(false);
  const [cpLoading, setCpLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  ```

- [ ] **Step 4: Add the handleChangePassword function**

  Find `if (loading) {` and add this function just before it:

  ```ts
  const handleChangePassword = async () => {
    setCpError(null);
    if (cpNewPassword.length < 8) {
      setCpError("New password must be at least 8 characters");
      return;
    }
    if (cpNewPassword !== cpConfirmPassword) {
      setCpError("New passwords do not match");
      return;
    }
    setCpLoading(true);
    try {
      const token = localStorage.getItem("user_token");
      const res = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: cpCurrentPassword, newPassword: cpNewPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("user_token", data.token);
        setCpSuccess(true);
        setTimeout(() => {
          setShowChangePassword(false);
          setCpCurrentPassword("");
          setCpNewPassword("");
          setCpConfirmPassword("");
          setCpSuccess(false);
        }, 1500);
      } else {
        setCpError(data.error ?? "Failed to change password");
      }
    } catch {
      setCpError("Failed to change password");
    } finally {
      setCpLoading(false);
    }
  };
  ```

- [ ] **Step 5: Add the Change Password menu item**

  Find the "Help & About" link and "Log Out" button block:
  ```tsx
  <Link
    href="/help"
    onClick={() => setIsOpen(false)}
    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
  >
    <HelpCircle className="w-4 h-4" />
    Help &amp; About
  </Link>
  <button
    onClick={() => {
      logout();
      setIsOpen(false);
    }}
    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
  >
    <LogOut className="w-4 h-4" />
    Log Out
  </button>
  ```

  Replace with:
  ```tsx
  <Link
    href="/help"
    onClick={() => setIsOpen(false)}
    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
  >
    <HelpCircle className="w-4 h-4" />
    Help &amp; About
  </Link>
  <button
    onClick={() => { setIsOpen(false); setShowChangePassword(true); setCpError(null); setCpSuccess(false); }}
    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
  >
    <KeyRound className="w-4 h-4" />
    Change Password
  </button>
  <button
    onClick={() => {
      logout();
      setIsOpen(false);
    }}
    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
  >
    <LogOut className="w-4 h-4" />
    Log Out
  </button>
  ```

- [ ] **Step 6: Add the modal JSX**

  Find the very last line of the component's return — the closing `</div>` that closes `<div className="relative" ref={menuRef}>`. Add the modal just before it:

  ```tsx
  {showChangePassword && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h2>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
            <input
              type="password"
              value={cpCurrentPassword}
              onChange={(e) => setCpCurrentPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={cpLoading || cpSuccess}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input
              type="password"
              value={cpNewPassword}
              onChange={(e) => setCpNewPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={cpLoading || cpSuccess}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
            <input
              type="password"
              value={cpConfirmPassword}
              onChange={(e) => setCpConfirmPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleChangePassword()}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={cpLoading || cpSuccess}
            />
          </div>
        </div>

        {cpError && (
          <p className="mt-3 text-sm text-red-600">{cpError}</p>
        )}
        {cpSuccess && (
          <p className="mt-3 text-sm text-green-600">Password changed successfully!</p>
        )}

        <div className="mt-5 flex gap-2 justify-end">
          <button
            onClick={() => { setShowChangePassword(false); setCpCurrentPassword(""); setCpNewPassword(""); setCpConfirmPassword(""); setCpError(null); setCpSuccess(false); }}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            disabled={cpLoading || cpSuccess}
          >
            Cancel
          </button>
          <button
            onClick={handleChangePassword}
            disabled={cpLoading || cpSuccess}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            {cpLoading ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  )}
  ```

- [ ] **Step 7: Run TypeScript check**

  ```bash
  npx tsc --noEmit 2>&1 | head -20
  ```
  Expected: no output (zero errors)

- [ ] **Step 8: Commit**

  ```bash
  git add src/components/UserMenu.tsx
  git commit -m "feat(user): add change password menu item and modal to UserMenu"
  ```
