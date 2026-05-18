"use client";

import { useState, useEffect } from "react";
import TopBar from "@/components/dashboard/TopBar";
import toast from "react-hot-toast";
import { Shield, Plus, Edit2, Trash2, Check, X, Loader2, AlertTriangle } from "lucide-react";

export default function AdminThrustAreasPage() {
  const [loading, setLoading] = useState(true);
  const [thrustAreas, setThrustAreas] = useState<any[]>([]);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; area: any }>({
    open: false,
    area: null,
  });

  useEffect(() => {
    fetchThrustAreas();
  }, []);

  const fetchThrustAreas = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/thrust-areas");
      const data = await res.json();
      setThrustAreas(data.thrustAreas || []);
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to load thrust areas");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newName || newName.trim() === "") {
      toast.error("Name is required");
      return;
    }

    setActionLoading("add");
    try {
      const res = await fetch("/api/thrust-areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add thrust area");
      }

      toast.success("Thrust area added successfully");
      setNewName("");
      fetchThrustAreas();
    } catch (error: any) {
      console.error("Add error:", error);
      toast.error(error.message || "Failed to add thrust area");
    } finally {
      setActionLoading(null);
    }
  };

  const handleEdit = async (id: string) => {
    if (!editName || editName.trim() === "") {
      toast.error("Name is required");
      return;
    }

    setActionLoading(id);
    try {
      const res = await fetch(`/api/thrust-areas/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update thrust area");
      }

      toast.success("Thrust area updated successfully");
      setEditingId(null);
      setEditName("");
      fetchThrustAreas();
    } catch (error: any) {
      console.error("Update error:", error);
      toast.error(error.message || "Failed to update thrust area");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string, goalCount: number) => {
    if (goalCount > 0) {
      toast.error(`Cannot delete. This thrust area is used by ${goalCount} goal(s)`);
      return;
    }

    setActionLoading(id);
    try {
      const res = await fetch(`/api/thrust-areas/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete thrust area");
      }

      toast.success("Thrust area deleted successfully");
      setDeleteModal({ open: false, area: null });
      fetchThrustAreas();
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error(error.message || "Failed to delete thrust area");
    } finally {
      setActionLoading(null);
    }
  };

  const openDeleteModal = (area: any) => {
    if ((area._count?.goals || 0) > 0) {
      toast.error(`Cannot delete. This thrust area is used by ${area._count.goals} goal(s)`);
      return;
    }
    setDeleteModal({ open: true, area });
  };

  const startEdit = (area: any) => {
    setEditingId(area.id);
    setEditName(area.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  if (loading) {
    return (
      <div>
        <TopBar title="Thrust Areas" subtitle="Manage goal thrust areas" />
        <div className="p-8 text-center">
          <Loader2 className="w-8 h-8 text-[#ff4444] animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <TopBar
        title="Thrust Areas"
        subtitle={`${thrustAreas.length} thrust area${thrustAreas.length !== 1 ? "s" : ""}`}
      />

      <div className="p-6 lg:p-8 space-y-6">
        {/* Add New */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Add New Thrust Area</h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleAdd()}
              placeholder="Enter thrust area name..."
              className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff4444]"
            />
            <button
              onClick={handleAdd}
              disabled={actionLoading === "add"}
              className="flex items-center gap-2 px-6 py-3 bg-[#ff4444] hover:bg-[#ff5555] text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading === "add" ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Add Thrust Area
                </>
              )}
            </button>
          </div>
        </div>

        {/* List */}
        {thrustAreas.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-12 text-center">
            <Shield className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Thrust Areas</h3>
            <p className="text-gray-400">Add your first thrust area to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {thrustAreas.map((area) => (
              <div
                key={area.id}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all"
              >
                {editingId === area.id ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleEdit(area.id)}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white focus:outline-none focus:ring-2 focus:ring-[#ff4444]"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(area.id)}
                        disabled={actionLoading === area.id}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm transition-all disabled:opacity-50"
                      >
                        {actionLoading === area.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        disabled={actionLoading === area.id}
                        className="px-3 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm transition-all disabled:opacity-50"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-white mb-1">{area.name}</h3>
                        <p className="text-sm text-gray-400">
                          {area._count?.goals || 0} goal{area._count?.goals !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="w-10 h-10 bg-[#ff4444]/20 rounded-full flex items-center justify-center">
                        <Shield className="w-5 h-5 text-[#ff4444]" />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-3 border-t border-white/10">
                      <button
                        onClick={() => startEdit(area)}
                        disabled={actionLoading === area.id}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm transition-all disabled:opacity-50"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => openDeleteModal(area)}
                        disabled={actionLoading === area.id || (area._count?.goals || 0) > 0}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        title={
                          (area._count?.goals || 0) > 0
                            ? `In use by ${area._count.goals} goal(s)`
                            : "Delete"
                        }
                      >
                        {actionLoading === area.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.open && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1f] border border-white/10 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Delete Thrust Area</h3>
                <p className="text-sm text-gray-400">This action cannot be undone</p>
              </div>
            </div>

            <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
              <p className="text-sm text-gray-400 mb-1">Thrust Area</p>
              <p className="text-white font-medium">{deleteModal.area?.name}</p>
            </div>

            <p className="text-gray-300 mb-6">
              Are you sure you want to delete this thrust area? This action is permanent and cannot be reversed.
            </p>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleDelete(deleteModal.area.id, deleteModal.area._count?.goals || 0)}
                disabled={actionLoading === deleteModal.area?.id}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading === deleteModal.area?.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </>
                )}
              </button>
              <button
                onClick={() => setDeleteModal({ open: false, area: null })}
                disabled={actionLoading === deleteModal.area?.id}
                className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg font-semibold transition-all disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
