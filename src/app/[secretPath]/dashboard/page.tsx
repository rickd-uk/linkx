"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AddLinkModal from "@/components/AddLinkModal";
import EditLinkModal from "@/components/EditLinkModal";
import CSVUpload from "@/components/CSVUpload";
import CategoryManagement from "@/components/CategoryManagement";
import AuthorManagement from "@/components/AuthorManagement";
import TestDataManager from "@/components/TestDataManager";

interface Link {
  id: string;
  title: string;
  url: string;
  category: string;
  author: string | null;
  description: string | null;
  publicationDay?: number | null;
  publicationMonth?: number | null;
  publicationYear?: number | null;
  timestamp: string;
  totalVotes?: number;
  hotScore?: number;
  boost?: number;
  isPublic?: boolean;
  createdById?: string | null;
  submittedBy?: string | null;
}

export default function AdminDashboard() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedLink, setSelectedLink] = useState<Link | null>(null);
  const [links, setStories] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<{ name: string; icon: string }[]>([]);
  const [authors, setAuthors] = useState<string[]>([]);
  const [selectedLinks, setSelectedStories] = useState<Set<string>>(
    new Set(),
  );
  const [showCategoryManagement, setShowCategoryManagement] = useState(false);
  const [showAuthorManagement, setShowAuthorManagement] = useState(false);
  const [showCsvUpload, setShowCsvUpload] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [managedUsers, setManagedUsers] = useState<{ id: string; username: string; email: string | null; createdAt: string; lastSeenAt: string | null; bannedUntil: string | null }[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [banDurations, setBanDurations] = useState<Record<string, string>>({});
  const [userFilter, setUserFilter] = useState("");
  const [signupsEnabled, setSignupsEnabled] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [stats, setStats] = useState<{ realUsers: number; activeToday: number; totalLinks: number; publicLinks: number; totalVotes: number; totalUsers: number } | null>(null);
  const router = useRouter();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [cpCurrentPassword, setCpCurrentPassword] = useState("");
  const [cpNewPassword, setCpNewPassword] = useState("");
  const [cpConfirmPassword, setCpConfirmPassword] = useState("");
  const [cpError, setCpError] = useState<string | null>(null);
  const [cpSuccess, setCpSuccess] = useState(false);
  const [cpLoading, setCpLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      router.push("/qwertyuiop123/login");
    }
  }, [router]);

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

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch("/api/admin/stats", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setStats(await res.json());
    } catch { /* non-critical */ }
  };

  useEffect(() => {
    fetchStories();
    fetchCategoriesAndAuthors();
    fetchSettings();
    fetchStats();
  }, []);

  const fetchManagedUsers = async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch("/api/admin/users", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setManagedUsers(data.users);
      } else {
        const data = await res.json().catch(() => ({}));
        setUsersError(`Error ${res.status}: ${data.error || "Failed to load users"}`);
      }
    } catch (e) {
      setUsersError(String(e));
    } finally { setUsersLoading(false); }
  };

  const userAction = async (userId: string, action: string, bannedUntil?: string) => {
    const token = localStorage.getItem("admin_token");
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId, action, bannedUntil }),
    });
    if (res.ok) {
      fetchManagedUsers();
      fetchStats();
    } else {
      alert("Action failed");
    }
  };

  const deleteAllRealUsers = async () => {
    if (!confirm("Delete ALL registered (non-test) users? This cannot be undone.")) return;
    const token = localStorage.getItem("admin_token");
    const res = await fetch("/api/admin/users", { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const data = await res.json();
      alert(`Deleted ${data.deleted} users.`);
      fetchManagedUsers();
      fetchStats();
    } else {
      alert("Failed to delete users");
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/settings");
      if (response.ok) {
        const settings = await response.json();
        setSignupsEnabled(settings.signups_enabled !== "false");
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    }
  };

  const toggleSignups = async () => {
    setSavingSettings(true);
    try {
      const token = localStorage.getItem("admin_token");
      const newValue = !signupsEnabled;
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          key: "signups_enabled",
          value: String(newValue),
        }),
      });

      if (response.ok) {
        setSignupsEnabled(newValue);
      } else {
        alert("Failed to update setting");
      }
    } catch (error) {
      console.error("Failed to toggle signups:", error);
      alert("Failed to update setting");
    } finally {
      setSavingSettings(false);
    }
  };

  const fetchStories = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("admin_token");
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await fetch("/api/links?includePrivate=true", { headers });
      if (response.ok) {
        const data = await response.json();
        setStories(data.links ?? []);
      }
    } catch (error) {
      console.error("Failed to fetch links:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoriesAndAuthors = async () => {
    try {
      const adminToken = localStorage.getItem("admin_token");
      const catResponse = await fetch("/api/categories?withIcons=true&includePrivate=true", {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const categories = await catResponse.json();
      setCategories(categories);

      const authorsResponse = await fetch("/api/authors");
      const authorsData = await authorsResponse.json();
      setAuthors(authorsData); // now returns string[] directly
    } catch (error) {
      console.error("Failed to fetch categories and authors:", error);
    }
  };

  const handleLinkAdded = () => {
    fetchStories();
    fetchCategoriesAndAuthors();
    setSelectedStories(new Set());
  };

  const handleEditClick = (link: Link) => {
    setSelectedLink(link);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = async (link: Link) => {
    console.log("handleDeleteClick called with link:", link);
    try {
      const token = localStorage.getItem("admin_token");
      console.log("Sending DELETE request to:", `/api/links/${link.id}`);
      const response = await fetch(`/api/links/${link.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      console.log("Response received:", response.status, response.ok);

      if (response.status === 401) {
        localStorage.removeItem("admin_token");
        alert("Session expired. Please login again.");
        router.push("/qwertyuiop123/login");
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete link");
      }

      console.log("Delete successful, refreshing links and categories...");
      await fetchStories();
      await fetchCategoriesAndAuthors();
    } catch (error) {
      console.error("Error deleting link:", error);
      alert(
        `Failed to delete link: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  const handleSelectLink = (linkId: string) => {
    const newSelected = new Set(selectedLinks);
    if (newSelected.has(linkId)) {
      newSelected.delete(linkId);
    } else {
      newSelected.add(linkId);
    }
    setSelectedStories(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedLinks.size === links.length && links.length > 0) {
      setSelectedStories(new Set());
    } else {
      setSelectedStories(new Set(links.map((s) => s.id)));
    }
  };

  const handleBulkDelete = async () => {
    console.log(
      "handleBulkDelete called with selection:",
      Array.from(selectedLinks),
    );
    if (selectedLinks.size === 0) {
      alert("Please select at least one link to delete.");
      return;
    }

    try {
      const token = localStorage.getItem("admin_token");
      console.log("Starting bulk delete for", selectedLinks.size, "links");

      const deletePromises = Array.from(selectedLinks).map(
        async (linkId) => {
          console.log("Deleting link:", linkId);
          const response = await fetch(`/api/links/${linkId}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.status === 401) {
            localStorage.removeItem("admin_token");
            alert("Session expired. Please login again.");
            router.push("/qwertyuiop123/login");
            return { linkId, success: false };
          }

          return { linkId, success: response.ok };
        },
      );

      const results = await Promise.all(deletePromises);
      console.log("Bulk delete results:", results);
      const failedDeletes = results.filter((r) => !r.success);

      if (failedDeletes.length > 0) {
        alert(
          `Successfully deleted ${results.length - failedDeletes.length} links.\n` +
            `Failed to delete ${failedDeletes.length} links.`,
        );
      }

      setSelectedStories(new Set());
      await fetchStories();
      await fetchCategoriesAndAuthors();
    } catch (error) {
      console.error("Error during bulk delete:", error);
      alert(
        `An error occurred while deleting links: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    router.push("/qwertyuiop123/login");
  };

  const fmtPubDate = (link: Link): string => {
    if (!link.publicationYear) return "—";
    if (link.publicationDay && link.publicationMonth)
      return new Date(link.publicationYear, link.publicationMonth - 1, link.publicationDay)
        .toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    if (link.publicationMonth)
      return new Date(link.publicationYear, link.publicationMonth - 1)
        .toLocaleDateString("en-GB", { month: "short", year: "numeric" });
    return String(link.publicationYear);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Compact */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
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
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">

        {/* ── Stats Bar ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Registered users", value: stats?.realUsers, color: "text-blue-600", sub: stats && stats.totalUsers > stats.realUsers ? `${stats.totalUsers} total incl. test` : undefined },
            { label: "Active today", value: stats?.activeToday, color: "text-green-600" },
            { label: "Total links", value: stats?.totalLinks, color: "text-indigo-600", sub: stats ? `${stats.publicLinks} public` : undefined },
            { label: "Total votes", value: stats?.totalVotes, color: "text-purple-600" },
          ].map(({ label, value, color, sub }) => (
            <div key={label} className="bg-white rounded-lg shadow px-4 py-3">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
              <p className={`text-3xl font-bold mt-0.5 ${color}`}>
                {value ?? <span className="text-gray-300 text-2xl">—</span>}
              </p>
              {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
            </div>
          ))}
        </div>

        {/* ── Two-column tool groups ─────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Left: Configuration */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-1">Configuration</p>

            {/* Categories */}
            <div className="bg-white rounded-lg shadow">
              <button onClick={() => setShowCategoryManagement(!showCategoryManagement)}
                className="w-full px-4 py-2.5 flex justify-between items-center hover:bg-gray-50 transition-colors" type="button">
                <h2 className="text-sm font-semibold text-gray-900">Manage Categories</h2>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${showCategoryManagement ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {showCategoryManagement && (
                <div className="px-4 pb-3 border-t border-gray-100">
                  <CategoryManagement onCategoryUpdated={handleLinkAdded} />
                </div>
              )}
            </div>

            {/* Authors */}
            <div className="bg-white rounded-lg shadow">
              <button onClick={() => setShowAuthorManagement(!showAuthorManagement)}
                className="w-full px-4 py-2.5 flex justify-between items-center hover:bg-gray-50 transition-colors" type="button">
                <h2 className="text-sm font-semibold text-gray-900">Manage Authors</h2>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${showAuthorManagement ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {showAuthorManagement && (
                <div className="px-4 pb-3 border-t border-gray-100">
                  <AuthorManagement authors={authors} onAuthorUpdated={handleLinkAdded} />
                </div>
              )}
            </div>

            {/* User Management */}
            <div className="bg-white rounded-lg shadow">
              <button onClick={() => { setShowUserManagement(!showUserManagement); if (!showUserManagement) fetchManagedUsers(); }}
                className="w-full px-4 py-2.5 flex justify-between items-center hover:bg-gray-50 transition-colors" type="button">
                <h2 className="text-sm font-semibold text-gray-900">User Management</h2>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${showUserManagement ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {showUserManagement && (
                <div className="border-t border-gray-100">
                  {/* Delete all real users */}
                  <div className="px-4 py-2 flex justify-end border-b border-gray-50">
                    <button onClick={deleteAllRealUsers} type="button"
                      className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors">
                      Delete all registered users
                    </button>
                  </div>

                  {usersLoading ? (
                    <p className="text-xs text-gray-400 px-4 py-3">Loading…</p>
                  ) : usersError ? (
                    <p className="text-xs text-red-500 px-4 py-3">{usersError}</p>
                  ) : managedUsers.length === 0 ? (
                    <p className="text-xs text-gray-400 px-4 py-3">No registered users.</p>
                  ) : (
                    <ul className="divide-y divide-gray-50">
                      {managedUsers.map(u => {
                        const isBanned = u.bannedUntil && new Date(u.bannedUntil) > new Date();
                        return (
                          <li key={u.id} className="px-4 py-2.5">
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {u.username}
                                  {isBanned && <span className="ml-1.5 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">banned</span>}
                                </p>
                                <p className="text-xs text-gray-400 truncate">{u.email || "no email"} · joined {new Date(u.createdAt).toLocaleDateString()}</p>
                                {isBanned && <p className="text-xs text-red-500">until {new Date(u.bannedUntil!).toLocaleString()}</p>}
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {isBanned ? (
                                  <button onClick={() => userAction(u.id, "unban")} type="button"
                                    className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200 transition-colors">
                                    Unban
                                  </button>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    <select
                                      value={banDurations[u.id] || "1d"}
                                      onChange={e => setBanDurations(prev => ({ ...prev, [u.id]: e.target.value }))}
                                      className="text-xs border border-gray-200 rounded px-1 py-0.5 text-gray-600">
                                      <option value="1h">1h</option>
                                      <option value="1d">1d</option>
                                      <option value="7d">7d</option>
                                      <option value="30d">30d</option>
                                      <option value="perm">Perm</option>
                                    </select>
                                    <button onClick={() => {
                                      const dur = banDurations[u.id] || "1d";
                                      const ms: Record<string, number> = { "1h": 3600000, "1d": 86400000, "7d": 604800000, "30d": 2592000000 };
                                      const until = dur === "perm" ? new Date("2099-01-01").toISOString() : new Date(Date.now() + ms[dur]).toISOString();
                                      userAction(u.id, "ban", until);
                                    }} type="button"
                                      className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded hover:bg-orange-200 transition-colors">
                                      Ban
                                    </button>
                                  </div>
                                )}
                                <button onClick={() => userAction(u.id, "logout")} type="button"
                                  className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded hover:bg-yellow-200 transition-colors">
                                  Logout
                                </button>
                                <button onClick={() => userAction(u.id, "delete")} type="button"
                                  className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200 transition-colors">
                                  Delete
                                </button>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="bg-white rounded-lg shadow">
              <button onClick={() => setShowControls(!showControls)}
                className="w-full px-4 py-2.5 flex justify-between items-center hover:bg-gray-50 transition-colors" type="button">
                <h2 className="text-sm font-semibold text-gray-900">Controls</h2>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${showControls ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {showControls && (
                <div className="px-4 pb-4 pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">User Signups</p>
                      <p className="text-xs text-gray-500">{signupsEnabled ? "New users can register" : "Signups are disabled"}</p>
                    </div>
                    <button onClick={toggleSignups} disabled={savingSettings}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${signupsEnabled ? "bg-green-500" : "bg-gray-300"} ${savingSettings ? "opacity-50 cursor-not-allowed" : ""}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${signupsEnabled ? "translate-x-6" : "translate-x-1"}`} />
                    </button>
                  </div>
                  <div className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium">
                    <span className={`w-2 h-2 rounded-full ${signupsEnabled ? "bg-green-500" : "bg-red-500"}`} />
                    <span className={signupsEnabled ? "text-green-700" : "text-red-700"}>
                      {signupsEnabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Content & Testing */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-1">Content &amp; Testing</p>

            {/* CSV Upload */}
            <div className="bg-white rounded-lg shadow">
              <button onClick={() => setShowCsvUpload(!showCsvUpload)}
                className="w-full px-4 py-2.5 flex justify-between items-center hover:bg-gray-50 transition-colors" type="button">
                <h2 className="text-sm font-semibold text-gray-900">CSV Upload</h2>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${showCsvUpload ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {showCsvUpload && (
                <div className="px-4 pb-3 border-t border-gray-100">
                  <CSVUpload onUploadComplete={handleLinkAdded} />
                </div>
              )}
            </div>

            {/* Test Data */}
            <TestDataManager onGeneratedAction={fetchStories} />
          </div>
        </div>

        {/* ── Links Table ───────────────────────────────────────────── */}
        {selectedLinks.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">
              {selectedLinks.size} {selectedLinks.size === 1 ? "link" : "links"} selected
            </span>
            <button onClick={(e) => { e.stopPropagation(); handleBulkDelete(); }} type="button"
              className="bg-red-600 text-white px-3 py-1.5 rounded-md hover:bg-red-700 text-sm font-medium transition-colors">
              Delete Selected
            </button>
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          <div className="px-4 py-3 border-b border-gray-200 flex flex-wrap gap-3 items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Links</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {(() => {
                  const filtered = links.filter(l => !userFilter || (l.submittedBy ?? "").toLowerCase().includes(userFilter.toLowerCase()));
                  const shown = Math.min(filtered.length, 500);
                  return `${shown}${filtered.length > 500 ? ` of ${filtered.length} (capped at 500)` : ""} links${userFilter ? ` by "${userFilter}"` : ""}`;
                })()}
              </p>
            </div>
            <div className="relative">
              <input type="text" placeholder="Filter by user..." value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="border border-gray-300 rounded-md pl-8 pr-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48" />
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {userFilter && (
                <button onClick={() => setUserFilter("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>
          </div>
          {loading ? (
            <div className="p-6 text-center text-gray-500 text-sm">Loading links...</div>
          ) : links.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">No links yet. Click &quot;Add Link&quot; to add your first one.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">
                      <input type="checkbox"
                        checked={selectedLinks.size === links.length && links.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="hidden sm:table-cell px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Author</th>
                    <th className="hidden md:table-cell px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pub date</th>
                    <th className="hidden md:table-cell px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Added</th>
                    <th className="hidden sm:table-cell px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Visibility</th>
                    <th className="hidden lg:table-cell px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Votes</th>
                    <th className="hidden lg:table-cell px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">By</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {links
                    .filter(l => !userFilter || (l.submittedBy ?? "").toLowerCase().includes(userFilter.toLowerCase()))
                    .slice(0, 500)
                    .map((link) => (
                    <tr key={link.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <input type="checkbox" checked={selectedLinks.has(link.id)}
                          onChange={() => handleSelectLink(link.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                      </td>
                      <td className="px-4 py-2">
                        <div className="text-sm">
                          <a href={link.url} target="_blank" rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 font-medium">{link.title}</a>
                          {link.description && (
                            <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{link.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">{link.category || "—"}</span>
                      </td>
                      <td className="hidden sm:table-cell px-4 py-2 whitespace-nowrap text-sm text-gray-900">{link.author || "—"}</td>
                      <td className="hidden md:table-cell px-4 py-2 whitespace-nowrap text-xs text-gray-500">{fmtPubDate(link)}</td>
                      <td className="hidden md:table-cell px-4 py-2 whitespace-nowrap text-xs text-gray-500">{new Date(link.timestamp).toLocaleDateString()}</td>
                      <td className="hidden sm:table-cell px-4 py-2 whitespace-nowrap">
                        {link.isPublic
                          ? <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded">Public</span>
                          : <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">Private</span>}
                      </td>
                      <td className="hidden lg:table-cell px-4 py-2 whitespace-nowrap text-xs text-gray-500">{link.totalVotes ?? 0}</td>
                      <td className="hidden lg:table-cell px-4 py-2 whitespace-nowrap text-xs text-gray-500">{link.submittedBy ?? "—"}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <button onClick={(e) => { e.stopPropagation(); handleEditClick(link); }}
                            className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors" title="Edit link" type="button">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(link); }}
                            className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors" title="Delete link" type="button">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Add Link Modal */}
      <AddLinkModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleLinkAdded}
        categories={categories}
        authors={authors}
      />

      {/* Edit Link Modal */}
      <EditLinkModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedLink(null);
        }}
        onSuccess={() => {
          fetchStories();
          fetchCategoriesAndAuthors();
          setIsEditModalOpen(false);
          setSelectedLink(null);
        }}
        link={selectedLink}
        categories={categories}
        authors={authors}
      />

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
    </div>
  );
}
