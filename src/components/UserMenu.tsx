"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { User, LogOut, ChevronDown, HelpCircle, KeyRound } from "lucide-react";

interface UserMenuProps {
  remainingBudget?: number;
}

export default function UserMenu({ remainingBudget }: UserMenuProps) {
  const { user, loading, isAuthenticated, logout, checkAuth } = useAuth();
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

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Check if signups are enabled
  useEffect(() => {
    const checkSignupsEnabled = async () => {
      try {
        const response = await fetch("/api/settings");
        if (response.ok) {
          const settings = await response.json();
          setSignupsEnabled(settings.signups_enabled !== "false");
        }
      } catch {
        // Default to enabled on error
      }
    };
    checkSignupsEnabled();
  }, []);

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
        checkAuth();
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

  if (loading) {
    return <div className="w-20 h-8 rounded bg-blue-500/30 animate-pulse" />;
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="text-white hover:text-blue-200 text-sm font-medium px-2 py-1"
        >
          Log In
        </Link>
        {signupsEnabled && (
          <Link
            href="/signup"
            className="bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium hover:bg-blue-50"
          >
            Sign Up
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-white hover:text-blue-200 px-3 py-1.5 rounded transition-colors"
      >
        <User className="w-5 h-5" />
        <span className="text-base font-medium">{user?.username}</span>
        {remainingBudget !== undefined && (
          <span className="text-sm bg-orange-500 text-white px-2 py-0.5 rounded-full font-medium">
            {remainingBudget}
          </span>
        )}
        <ChevronDown
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-base font-medium text-gray-900">
              {user?.username}
            </p>
            {user?.email && (
              <p className="text-sm text-gray-500 truncate">{user.email}</p>
            )}
            {remainingBudget !== undefined && (
              <p className="text-sm text-orange-600 mt-1 font-medium">
                {remainingBudget} votes remaining today
              </p>
            )}
          </div>
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
        </div>
      )}

      {showChangePassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
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
                onClick={() => { setShowChangePassword(false); setCpCurrentPassword(""); setCpNewPassword(""); setCpConfirmPassword(""); setCpError(null); setCpSuccess(false); setCpLoading(false); }}
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
    </div>
  );
}
