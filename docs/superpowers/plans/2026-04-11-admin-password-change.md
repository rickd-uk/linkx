# Admin Password Change Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow the admin to change their password from the dashboard, storing the new password as a bcrypt hash in the `Setting` table with env var as fallback.

**Architecture:** The `Setting` table stores an `admin_password_hash` key. Login checks this key first (bcrypt compare), falling back to the plain `ADMIN_PASSWORD` env var if absent. A new `POST /api/admin/change-password` endpoint handles the update. The dashboard gets a "Change Password" button in the header that opens an inline modal.

**Tech Stack:** Next.js 15 App Router, Prisma (SQLite), bcrypt (already installed), TypeScript, Tailwind CSS

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/app/api/auth/route.ts` | Modify | Add DB hash lookup before env var fallback on login |
| `src/app/api/admin/change-password/route.ts` | Create | Verify current password, hash and store new password |
| `src/app/[secretPath]/dashboard/page.tsx` | Modify | Add Change Password button + inline modal |

---

### Task 1: Update login to check DB hash first

**Files:**
- Modify: `src/app/api/auth/route.ts`

- [ ] **Step 1: Open the file and read the current login logic**

  Current file at `src/app/api/auth/route.ts` does a plain string compare:
  ```ts
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
  ```

- [ ] **Step 2: Replace the login handler with DB-aware password check**

  Replace the entire file content with:

  ```ts
  import { NextResponse } from "next/server";
  import bcrypt from "bcrypt";
  import { prisma } from "@/lib/prisma";

  export async function POST(request: Request) {
    try {
      const { username, password } = await request.json();

      const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
      const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

      if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
        console.error("ADMIN_USERNAME or ADMIN_PASSWORD environment variables not set!");
        return NextResponse.json(
          { error: "Server configuration error" },
          { status: 500 },
        );
      }

      if (username !== ADMIN_USERNAME) {
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      }

      // Check DB hash first, fall back to env var
      const hashSetting = await prisma.setting.findUnique({
        where: { key: "admin_password_hash" },
      });

      let passwordValid: boolean;
      if (hashSetting) {
        passwordValid = await bcrypt.compare(password, hashSetting.value);
      } else {
        passwordValid = password === ADMIN_PASSWORD;
      }

      if (!passwordValid) {
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      }

      const token = Buffer.from(`${username}:${Date.now()}`).toString("base64");
      return NextResponse.json({ success: true, token, message: "Login successful" });
    } catch (error) {
      console.error("Auth error:", error);
      return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
    }
  }
  ```

- [ ] **Step 3: Verify login still works with env var credentials**

  Start the dev server if not running: `npm run dev`

  Run:
  ```bash
  curl -s -X POST http://localhost:3000/api/auth \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"dev123"}' | jq .
  ```
  Expected: `{ "success": true, "token": "...", "message": "Login successful" }`

  Run with wrong password:
  ```bash
  curl -s -X POST http://localhost:3000/api/auth \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"wrong"}' | jq .
  ```
  Expected: `{ "error": "Invalid credentials" }` with status 401

- [ ] **Step 4: Commit**

  ```bash
  git add src/app/api/auth/route.ts
  git commit -m "feat(auth): check db password hash before env var on admin login"
  ```

---

### Task 2: Create the change-password API endpoint

**Files:**
- Create: `src/app/api/admin/change-password/route.ts`

- [ ] **Step 1: Create the directory and file**

  ```bash
  mkdir -p src/app/api/admin/change-password
  ```

  Create `src/app/api/admin/change-password/route.ts`:

  ```ts
  import { NextResponse } from "next/server";
  import bcrypt from "bcrypt";
  import { prisma } from "@/lib/prisma";
  import { checkAuth, unauthorizedResponse } from "@/lib/auth";

  export async function POST(request: Request) {
    if (!checkAuth(request)) {
      return unauthorizedResponse();
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

      // Verify current password (DB hash takes precedence over env var)
      const hashSetting = await prisma.setting.findUnique({
        where: { key: "admin_password_hash" },
      });

      let currentPasswordValid: boolean;
      if (hashSetting) {
        currentPasswordValid = await bcrypt.compare(currentPassword, hashSetting.value);
      } else {
        const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";
        currentPasswordValid = currentPassword === ADMIN_PASSWORD;
      }

      if (!currentPasswordValid) {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 401 },
        );
      }

      // Hash and store new password
      const newHash = await bcrypt.hash(newPassword, 10);
      await prisma.setting.upsert({
        where: { key: "admin_password_hash" },
        update: { value: newHash },
        create: { key: "admin_password_hash", value: newHash },
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("Change password error:", error);
      return NextResponse.json(
        { error: "Failed to change password" },
        { status: 500 },
      );
    }
  }
  ```

- [ ] **Step 2: Get a valid admin token for testing**

  ```bash
  TOKEN=$(curl -s -X POST http://localhost:3000/api/auth \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"dev123"}' | jq -r .token)
  echo $TOKEN
  ```

- [ ] **Step 3: Test - reject wrong current password**

  ```bash
  curl -s -X POST http://localhost:3000/api/admin/change-password \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"currentPassword":"wrong","newPassword":"newpassword123"}' | jq .
  ```
  Expected: `{ "error": "Current password is incorrect" }` with status 401

- [ ] **Step 4: Test - reject short new password**

  ```bash
  curl -s -X POST http://localhost:3000/api/admin/change-password \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"currentPassword":"dev123","newPassword":"short"}' | jq .
  ```
  Expected: `{ "error": "New password must be at least 8 characters" }` with status 400

- [ ] **Step 5: Test - successful password change**

  ```bash
  curl -s -X POST http://localhost:3000/api/admin/change-password \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"currentPassword":"dev123","newPassword":"newpassword123"}' | jq .
  ```
  Expected: `{ "success": true }`

- [ ] **Step 6: Verify new password works for login**

  ```bash
  curl -s -X POST http://localhost:3000/api/auth \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"newpassword123"}' | jq .
  ```
  Expected: `{ "success": true, "token": "...", "message": "Login successful" }`

  Verify old password no longer works:
  ```bash
  curl -s -X POST http://localhost:3000/api/auth \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"dev123"}' | jq .
  ```
  Expected: `{ "error": "Invalid credentials" }` with status 401

- [ ] **Step 7: Reset password back to dev123 for dev environment**

  ```bash
  NEW_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"newpassword123"}' | jq -r .token)

  curl -s -X POST http://localhost:3000/api/admin/change-password \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $NEW_TOKEN" \
    -d '{"currentPassword":"newpassword123","newPassword":"dev123XXX"}' | jq .
  ```
  Note: dev123 is only 6 chars, so set it to something ≥ 8 for testing (e.g. `dev12345`), or clear the DB hash via prisma studio to restore env var fallback:
  ```bash
  npx prisma studio
  # Delete the admin_password_hash row in the Setting table
  ```

- [ ] **Step 8: Commit**

  ```bash
  git add src/app/api/admin/change-password/route.ts
  git commit -m "feat(admin): add change-password endpoint with bcrypt and db storage"
  ```

---

### Task 3: Add Change Password button and modal to dashboard

**Files:**
- Modify: `src/app/[secretPath]/dashboard/page.tsx`

- [ ] **Step 1: Add modal state variables**

  In `src/app/[secretPath]/dashboard/page.tsx`, find the block of `useState` declarations near the top (around line 30–53). Add these three new state variables after the existing ones:

  ```ts
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [cpCurrentPassword, setCpCurrentPassword] = useState("");
  const [cpNewPassword, setCpNewPassword] = useState("");
  const [cpConfirmPassword, setCpConfirmPassword] = useState("");
  const [cpError, setCpError] = useState<string | null>(null);
  const [cpSuccess, setCpSuccess] = useState(false);
  const [cpLoading, setCpLoading] = useState(false);
  ```

- [ ] **Step 2: Add the changePassword handler function**

  Find `const fetchStats = async () => {` (around line 62). Add this function just before it:

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
      const token = localStorage.getItem("admin_token");
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: cpCurrentPassword, newPassword: cpNewPassword }),
      });
      const data = await res.json();
      if (res.ok) {
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

- [ ] **Step 3: Add the Change Password button to the header**

  Find this block in the JSX (around line 345–358):
  ```tsx
  <div className="flex gap-2">
    <button
      onClick={() => setIsAddModalOpen(true)}
      className="bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 text-sm font-medium transition-colors"
    >
      + Add
    </button>
    <button
      onClick={handleLogout}
      className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-300 text-sm font-medium transition-colors"
    >
      Logout
    </button>
  </div>
  ```

  Replace with:
  ```tsx
  <div className="flex gap-2">
    <button
      onClick={() => setIsAddModalOpen(true)}
      className="bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 text-sm font-medium transition-colors"
    >
      + Add
    </button>
    <button
      onClick={() => { setShowChangePassword(true); setCpError(null); setCpSuccess(false); }}
      className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-300 text-sm font-medium transition-colors"
    >
      Change Password
    </button>
    <button
      onClick={handleLogout}
      className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-300 text-sm font-medium transition-colors"
    >
      Logout
    </button>
  </div>
  ```

- [ ] **Step 4: Add the modal JSX**

  Find the closing `</div>` at the very end of the return statement (the one that closes `<div className="min-h-screen bg-gray-50">`). Add the modal just before it:

  ```tsx
  {/* Change Password Modal */}
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
            disabled={cpLoading}
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

- [ ] **Step 5: Verify in the browser**

  Navigate to `http://localhost:3000/qwertyuiop123/dashboard` (logged in as admin).

  Check:
  - "Change Password" button appears between "+ Add" and "Logout" in the header
  - Clicking it opens the modal
  - Submitting with mismatched new passwords shows "New passwords do not match"
  - Submitting with a new password < 8 chars shows "New password must be at least 8 characters"
  - Submitting with wrong current password shows "Current password is incorrect"
  - Submitting with correct current password and valid new password shows "Password changed successfully!" then closes the modal
  - Logging out and logging back in with the new password works

- [ ] **Step 6: Commit**

  ```bash
  git add src/app/[secretPath]/dashboard/page.tsx
  git commit -m "feat(dashboard): add change password button and modal"
  ```
