// src/components/AuthorManagement.tsx
"use client";

import React, { useState } from "react";

interface AuthorManagementProps {
  authors: string[];
  onAuthorUpdated: () => void;
}

export default function AuthorManagement({
  authors,
  onAuthorUpdated,
}: AuthorManagementProps) {
  const [editingAuthor, setEditingAuthor] = useState<string | null>(null);
  const [deletingAuthor, setDeletingAuthor] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [deleteAssociatedLinks, setDeleteAssociatedLinks] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isAddingAuthor, setIsAddingAuthor] = useState(false);
  const [newAuthorName, setNewAuthorName] = useState("");

  const handleRenameClick = (author: string) => {
    setEditingAuthor(author);
    setNewName(author);
    setError("");
    setSuccess("");
    setDeletingAuthor(null);
    setIsAddingAuthor(false);
  };

  const handleRenameSubmit = async (authorName: string) => {
    if (!newName.trim() || newName.trim() === authorName) {
      setEditingAuthor(null);
      return;
    }

    setIsProcessing(true);
    setError("");

    try {
      const token = localStorage.getItem("admin_token");
      const response = await fetch(
        `/api/authors/${encodeURIComponent(authorName)}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ newName: newName.trim() }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to rename author");
      }

      setSuccess(
        `Renamed to "${newName.trim()}". ${data.updatedCount} links updated.`,
      );
      setEditingAuthor(null);
      setNewName("");
      onAuthorUpdated();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rename author");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteClick = (author: string) => {
    setDeletingAuthor(author);
    setDeleteAssociatedLinks(false);
    setError("");
    setSuccess("");
    setIsAddingAuthor(false);
  };

  const handleCancelDelete = () => {
    setDeletingAuthor(null);
    setDeleteAssociatedLinks(false);
    setError("");
  };

  const handleDeleteConfirm = async (authorName: string) => {
    setIsProcessing(true);
    setError("");

    try {
      const token = localStorage.getItem("admin_token");
      const response = await fetch(
        `/api/authors/${encodeURIComponent(authorName)}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ deleteLinks: deleteAssociatedLinks }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete author");
      }

      if (deleteAssociatedLinks) {
        setSuccess(
          `Author deleted and ${data.deletedLinksCount} associated links removed.`,
        );
      } else {
        setSuccess(
          `Author removed from ${data.updatedLinksCount} links (set to URL hostname).`,
        );
      }

      setDeletingAuthor(null);
      setDeleteAssociatedLinks(false);
      onAuthorUpdated();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete author");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddAuthorClick = () => {
    setIsAddingAuthor(true);
    setNewAuthorName("");
    setError("");
    setSuccess("");
    setEditingAuthor(null);
    setDeletingAuthor(null);
  };

  const handleCancelAdd = () => {
    setIsAddingAuthor(false);
    setNewAuthorName("");
    setError("");
  };

  const handleAddAuthorSubmit = async () => {
    if (!newAuthorName.trim()) {
      setError("Author name cannot be empty");
      return;
    }

    if (authors.includes(newAuthorName.trim())) {
      setError("Author already exists");
      return;
    }

    setIsProcessing(true);
    setError("");

    try {
      const token = localStorage.getItem("admin_token");
      const response = await fetch("/api/authors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ authorName: newAuthorName.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add author");
      }

      setSuccess(`Author "${newAuthorName.trim()}" added successfully!`);
      setIsAddingAuthor(false);
      setNewAuthorName("");
      onAuthorUpdated();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add author");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="py-3">
      {/* Header with Add button */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-500">
          {authors.length} {authors.length === 1 ? "author" : "authors"}
        </p>
        <button
          onClick={handleAddAuthorClick}
          className="bg-blue-600 text-white p-1.5 rounded-md hover:bg-blue-700 transition-colors"
          title="Add Author"
          type="button"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-3 bg-red-50 text-red-600 p-2 rounded text-xs">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-3 bg-green-50 text-green-600 p-2 rounded text-xs">
          {success}
        </div>
      )}

      {/* Add Author Form */}
      {isAddingAuthor && (
        <div className="mb-3 border border-gray-200 rounded-lg p-3 bg-gray-50">
          <div className="space-y-2">
            <input
              type="text"
              value={newAuthorName}
              onChange={(e) => setNewAuthorName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddAuthorSubmit();
                }
              }}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
              placeholder="New author name"
              disabled={isProcessing}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddAuthorSubmit}
                disabled={isProcessing}
                className="flex-1 bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {isProcessing ? "Adding..." : "Add"}
              </button>
              <button
                onClick={handleCancelAdd}
                disabled={isProcessing}
                className="flex-1 bg-gray-300 text-gray-700 px-3 py-1.5 rounded text-sm hover:bg-gray-400 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Authors Grid */}
      {authors.length === 0 && !isAddingAuthor ? (
        <p className="text-xs text-gray-500">No authors yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {authors.map((author) => (
            <div
              key={author}
              className="border border-gray-200 rounded-lg p-2 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              {editingAuthor === author ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleRenameSubmit(author);
                      }
                    }}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                    placeholder="New author name"
                    disabled={isProcessing}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRenameSubmit(author)}
                      disabled={isProcessing}
                      className="flex-1 bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isProcessing ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => {
                        setEditingAuthor(null);
                        setNewName("");
                      }}
                      disabled={isProcessing}
                      className="flex-1 bg-gray-300 text-gray-700 px-2 py-1 rounded text-xs hover:bg-gray-400 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : deletingAuthor === author ? (
                <div className="space-y-2">
                  <p className="text-xs text-red-600 font-medium">
                    Delete &quot;{author}&quot;?
                  </p>
                  <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={deleteAssociatedLinks}
                      onChange={(e) =>
                        setDeleteAssociatedLinks(e.target.checked)
                      }
                      className="rounded"
                    />
                    Also delete links
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDeleteConfirm(author)}
                      disabled={isProcessing}
                      className="flex-1 bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700 disabled:opacity-50"
                    >
                      {isProcessing ? "Deleting..." : "Delete"}
                    </button>
                    <button
                      onClick={handleCancelDelete}
                      disabled={isProcessing}
                      className="flex-1 bg-gray-300 text-gray-700 px-2 py-1 rounded text-xs hover:bg-gray-400 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-900 truncate flex-1">
                    {author}
                  </span>
                  <div className="flex gap-1 ml-2">
                    <button
                      onClick={() => handleRenameClick(author)}
                      className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors"
                      title="Rename author"
                      type="button"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteClick(author)}
                      className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors"
                      title="Delete author"
                      type="button"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-500 mt-3">
        <strong>Note:</strong> Renaming updates all links. Deleting sets
        links to their URL hostname.
      </p>
    </div>
  );
}
