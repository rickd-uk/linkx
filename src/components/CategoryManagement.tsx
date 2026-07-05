// src/components/CategoryManagement.tsx
"use client";

import React, { useState } from "react";

interface Category {
  name: string;
  icon: string;
}

interface CategoryManagementProps {
  onCategoryUpdated: () => void;
}

export default function CategoryManagement({
  onCategoryUpdated,
}: CategoryManagementProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("");
  const [deletingCategory, setDeletingCategory] = useState<string | null>(null);
  const [deleteAssociatedLinks, setDeleteAssociatedLinks] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("📁");

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      const response = await fetch("/api/categories?withIcons=true", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchCategories();
  }, []);

  const handleRenameClick = (category: Category) => {
    setEditingCategory(category.name);
    setNewName(category.name);
    setNewIcon(category.icon);
    setError("");
    setSuccess("");
    setIsAddingCategory(false);
  };

  const handleCancelRename = () => {
    setEditingCategory(null);
    setNewName("");
    setNewIcon("");
    setError("");
  };

  const handleRenameSubmit = async (oldName: string, oldIcon: string) => {
    if (!newName.trim()) {
      setError("Category name cannot be empty");
      return;
    }

    const nameChanged = newName.trim() !== oldName;
    const iconChanged = newIcon.trim() !== oldIcon;

    if (!nameChanged && !iconChanged) {
      handleCancelRename();
      return;
    }

    setIsProcessing(true);
    setError("");

    try {
      const token = localStorage.getItem("admin_token");
      const response = await fetch(
        `/api/categories/${encodeURIComponent(oldName)}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            newName: nameChanged ? newName.trim() : undefined,
            icon: iconChanged ? newIcon.trim() : undefined,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update category");
      }

      setSuccess("Category updated successfully.");
      setEditingCategory(null);
      setNewName("");
      setNewIcon("");
      fetchCategories();
      onCategoryUpdated();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update category",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteClick = (category: string) => {
    setDeletingCategory(category);
    setDeleteAssociatedLinks(false);
    setError("");
    setSuccess("");
    setIsAddingCategory(false);
  };

  const handleCancelDelete = () => {
    setDeletingCategory(null);
    setDeleteAssociatedLinks(false);
    setError("");
  };

  const handleDeleteConfirm = async (categoryName: string) => {
    setIsProcessing(true);
    setError("");

    try {
      const token = localStorage.getItem("admin_token");
      const response = await fetch(
        `/api/categories/${encodeURIComponent(categoryName)}`,
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
        throw new Error(data.error || "Failed to delete category");
      }

      if (deleteAssociatedLinks) {
        setSuccess(
          `Category deleted and ${data.deletedLinksCount} associated links removed.`,
        );
      } else {
        setSuccess(
          `Category removed from ${data.updatedLinksCount} links (set to no category).`,
        );
      }

      setDeletingCategory(null);
      setDeleteAssociatedLinks(false);
      onCategoryUpdated();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete category",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddCategoryClick = () => {
    setIsAddingCategory(true);
    setNewCategoryName("");
    setError("");
    setSuccess("");
    setEditingCategory(null);
    setDeletingCategory(null);
  };

  const handleCancelAdd = () => {
    setIsAddingCategory(false);
    setNewCategoryName("");
    setError("");
  };

  const handleAddCategorySubmit = async () => {
    if (!newCategoryName.trim()) {
      setError("Category name cannot be empty");
      return;
    }

    if (categories.some(c => c.name === newCategoryName.trim())) {
      setError("Category already exists");
      return;
    }

    setIsProcessing(true);
    setError("");

    try {
      const token = localStorage.getItem("admin_token");
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          categoryName: newCategoryName.trim(),
          icon: newCategoryIcon.trim() || "📁",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add category");
      }

      setSuccess(`Category "${newCategoryName.trim()}" added successfully!`);
      setIsAddingCategory(false);
      setNewCategoryName("");
      setNewCategoryIcon("📁");
      fetchCategories();
      onCategoryUpdated();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add category");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="py-3">
      {/* Header with Add button */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-500">
          {categories.length}{" "}
          {categories.length === 1 ? "category" : "categories"}
        </p>
        <button
          onClick={handleAddCategoryClick}
          disabled={isAddingCategory}
          className="bg-blue-600 text-white p-1.5 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
          title="Add Category"
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

      {/* Add Category Form */}
      {isAddingCategory && (
        <div className="mb-3 border border-gray-200 rounded-lg p-3 bg-gray-50">
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={newCategoryIcon}
                onChange={(e) => setNewCategoryIcon(e.target.value)}
                className="w-16 px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg text-center"
                placeholder="📁"
                disabled={isProcessing}
                maxLength={2}
              />
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCategorySubmit();
                  }
                }}
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                placeholder="New category name"
                disabled={isProcessing}
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddCategorySubmit}
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

      {/* Categories Grid */}
      {loading ? (
        <p className="text-xs text-gray-500">Loading categories...</p>
      ) : categories.length === 0 && !isAddingCategory ? (
        <p className="text-xs text-gray-500">No categories yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {categories.map((category) => (
            <div
              key={category.name}
              className="border border-gray-200 rounded-lg p-2 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              {editingCategory === category.name ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newIcon}
                      onChange={(e) => setNewIcon(e.target.value)}
                      className="w-12 px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg text-center"
                      placeholder="📁"
                      disabled={isProcessing}
                      maxLength={2}
                    />
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleRenameSubmit(category.name, category.icon);
                        }
                      }}
                      className="flex-1 px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                      placeholder="Category name"
                      disabled={isProcessing}
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRenameSubmit(category.name, category.icon)}
                      disabled={isProcessing}
                      className="flex-1 bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isProcessing ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={handleCancelRename}
                      disabled={isProcessing}
                      className="flex-1 bg-gray-300 text-gray-700 px-2 py-1 rounded text-xs hover:bg-gray-400 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : deletingCategory === category.name ? (
                <div className="space-y-2">
                  <p className="text-sm text-red-600 font-medium flex items-center gap-2">
                    <span>{category.icon}</span>
                    Delete &quot;{category.name}&quot;?
                  </p>
                  <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={deleteAssociatedLinks}
                      onChange={(e) =>
                        setDeleteAssociatedLinks(e.target.checked)
                      }
                      disabled={isProcessing}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Also delete links</span>
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDeleteConfirm(category.name)}
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
                  <span className="text-sm font-medium text-gray-900 truncate flex-1 flex items-center gap-2">
                    <span className="text-lg">{category.icon}</span>
                    {category.name}
                  </span>
                  <div className="flex gap-1 ml-2">
                    <button
                      onClick={() => handleRenameClick(category)}
                      className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors"
                      title="Rename category"
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
                      onClick={() => handleDeleteClick(category.name)}
                      className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors"
                      title="Delete category"
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
        <strong>Note:</strong> Renaming updates all links. Deleting removes or
        sets links to no category.
      </p>
    </div>
  );
}
