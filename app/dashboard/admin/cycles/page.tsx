"use client";

import { useState, useEffect } from "react";
import TopBar from "@/components/dashboard/TopBar";
import ConfirmDialog from "@/components/ConfirmDialog";
import toast from "react-hot-toast";
import { Calendar, Plus, CheckCircle, Loader2 } from "lucide-react";

export default function AdminCyclesPage() {
  const [loading, setLoading] = useState(true);
  const [cycles, setCycles] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [newCycle, setNewCycle] = useState({
    name: "",
    year: new Date().getFullYear(),
    goalSetOpen: "",
    q1Open: "",
    q2Open: "",
    q3Open: "",
    q4Open: "",
  });
  const [validationError, setValidationError] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [editingCycle, setEditingCycle] = useState<any>(null);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    fetchCycles(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCycles = async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true);
      const res = await fetch("/api/cycles");
      const data = await res.json();
      setCycles(data.cycles || []);
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to load cycles");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCycle = async () => {
    if (!newCycle.name || !newCycle.goalSetOpen) {
      toast.error("Name and Goal Set Open date are required");
      return;
    }

    // Client-side date validation
    const goalSetOpen = new Date(newCycle.goalSetOpen);
    const q1Open = new Date(newCycle.q1Open);
    const q2Open = new Date(newCycle.q2Open);
    const q3Open = new Date(newCycle.q3Open);
    const q4Open = new Date(newCycle.q4Open);

    if (q1Open <= goalSetOpen) {
      setValidationError("Q1 Open date must be after Goal Set Open date");
      return;
    }

    if (q2Open <= q1Open) {
      setValidationError("Q2 Open date must be after Q1 Open date");
      return;
    }

    if (q3Open <= q2Open) {
      setValidationError("Q3 Open date must be after Q2 Open date");
      return;
    }

    if (q4Open <= q3Open) {
      setValidationError("Q4 Open date must be after Q3 Open date");
      return;
    }

    setValidationError("");
    setActionLoading(editingCycle ? editingCycle.id : "create");
    
    try {
      const url = editingCycle ? `/api/cycles/${editingCycle.id}` : "/api/cycles";
      const method = editingCycle ? "PATCH" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newCycle,
          goalSetOpen: new Date(newCycle.goalSetOpen).toISOString(),
          q1Open: new Date(newCycle.q1Open).toISOString(),
          q2Open: new Date(newCycle.q2Open).toISOString(),
          q3Open: new Date(newCycle.q3Open).toISOString(),
          q4Open: new Date(newCycle.q4Open).toISOString(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Failed to ${editingCycle ? "update" : "create"} cycle`);
      }

      toast.success(`Cycle ${editingCycle ? "updated" : "created"} successfully`);
      setShowCreateModal(false);
      setEditingCycle(null);
      setNewCycle({
        name: "",
        year: new Date().getFullYear(),
        goalSetOpen: "",
        q1Open: "",
        q2Open: "",
        q3Open: "",
        q4Open: "",
      });
      setValidationError("");
      // FIX 6: Always refresh cycles after edit to show fresh data from DB
      fetchCycles();
    } catch (error: any) {
      console.error(`${editingCycle ? "Update" : "Create"} error:`, error);
      toast.error(error.message || `Failed to ${editingCycle ? "update" : "create"} cycle`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleActivateCycle = async (cycleId: string) => {
    // 1. Instant UI update
    setCycles((prev) => prev.map((c) => ({ ...c, isActive: c.id === cycleId })));
    toast.success("Cycle activated successfully");

    // 2. Background sync
    try {
      const res = await fetch(`/api/cycles/${cycleId}/activate`, {
        method: "POST",
      });

      if (!res.ok) {
        // Revert on failure
        fetchCycles();
        toast.error("Failed to activate cycle");
      }
    } catch (error: any) {
      // Revert on failure
      fetchCycles();
      toast.error("Failed to activate cycle");
    }
  };

  const handleDelete = async (cycleId: string, cycleLabel: string) => {
    setDeleteTarget({ id: cycleId, label: cycleLabel });
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    // 1. Instant UI update
    setCycles((prev) => prev.filter((c) => c.id !== deleteTarget.id));
    toast.success("Cycle deleted successfully");
    setShowDeleteDialog(false);
    setDeleteTarget(null);

    // 2. Background sync
    try {
      const res = await fetch(`/api/cycles/${deleteTarget.id}`, { method: "DELETE" });

      if (!res.ok) {
        // Revert on failure
        fetchCycles();
        toast.error("Failed to delete cycle");
      }
    } catch (error: any) {
      // Revert on failure
      fetchCycles();
      toast.error("Failed to delete cycle");
    }
  };

  const handleEdit = (cycle: any) => {
    setEditingCycle(cycle);
    setNewCycle({
      name: cycle.name,
      year: cycle.year,
      goalSetOpen: new Date(cycle.goalSetOpen).toISOString().split("T")[0],
      q1Open: new Date(cycle.q1Open).toISOString().split("T")[0],
      q2Open: new Date(cycle.q2Open).toISOString().split("T")[0],
      q3Open: new Date(cycle.q3Open).toISOString().split("T")[0],
      q4Open: new Date(cycle.q4Open).toISOString().split("T")[0],
    });
    setShowCreateModal(true);
  };

  const handleDeactivate = (cycleId: string, cycleName: string) => {
    setDeactivateTarget({ id: cycleId, name: cycleName });
    setShowDeactivateDialog(true);
  };

  const confirmDeactivate = async () => {
    if (!deactivateTarget) return;

    // 1. Instant UI update
    setCycles((prev) => prev.map((c) => ({ ...c, isActive: false })));
    toast.success("Cycle deactivated successfully");
    setShowDeactivateDialog(false);
    setDeactivateTarget(null);

    // 2. Background sync
    try {
      const res = await fetch(`/api/cycles/${deactivateTarget.id}/deactivate`, {
        method: "POST",
      });

      if (!res.ok) {
        // Revert on failure
        fetchCycles();
        toast.error("Failed to deactivate cycle");
      }
    } catch (error: any) {
      // Revert on failure
      fetchCycles();
      toast.error("Failed to deactivate cycle");
    }
  };

  if (loading) {
    return (
      <div>
        <TopBar title="Manage Cycles" subtitle="Create and activate goal cycles" />
        <div className="p-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 bg-white/5 rounded-xl animate-pulse border border-white/10"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <TopBar title="Manage Cycles" subtitle={`${cycles.length} cycle${cycles.length !== 1 ? "s" : ""} in the system`} />

      <div className="p-6 lg:p-8 space-y-6">
        {/* Create Button */}
        <div className="flex justify-end">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-[#ff4444] hover:bg-[#ff5555] text-white rounded-lg font-semibold transition-all"
          >
            <Plus className="w-5 h-5" />
            Create New Cycle
          </button>
        </div>

        {/* Cycles List */}
        {cycles.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Cycles Yet</h3>
            <p className="text-gray-400 mb-6">Create your first goal cycle to get started</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#ff4444] hover:bg-[#ff5555] text-white rounded-lg font-semibold transition-all"
            >
              <Plus className="w-5 h-5" />
              Create First Cycle
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {cycles.map((cycle) => (
              <div
                key={cycle.id}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">{cycle.name}</h3>
                    <p className="text-sm text-gray-400">Year: {cycle.year}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {cycle.isActive ? (
                      <>
                        <span className="px-3 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded-full text-xs font-medium">
                          ACTIVE
                        </span>
                        <button
                          onClick={() => handleEdit(cycle)}
                          className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm rounded-lg transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeactivate(cycle.id, cycle.name)}
                          disabled={actionLoading === cycle.id}
                          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {actionLoading === cycle.id ? "Deactivating..." : "Deactivate"}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEdit(cycle)}
                          className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm rounded-lg transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleActivateCycle(cycle.id)}
                          disabled={actionLoading === cycle.id}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {actionLoading === cycle.id ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Activating...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4" />
                              Activate
                            </>
                          )}
                        </button>
                        <button
                          onClick={() =>
                            handleDelete(cycle.id, `FY ${cycle.year}-${cycle.year + 1}`)
                          }
                          disabled={actionLoading === cycle.id}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Goal Set Open</p>
                    <p className="text-sm text-white">
                      {new Date(cycle.goalSetOpen).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Q1 Open</p>
                    <p className="text-sm text-white">
                      {new Date(cycle.q1Open).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Q2 Open</p>
                    <p className="text-sm text-white">
                      {new Date(cycle.q2Open).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Q3 Open</p>
                    <p className="text-sm text-white">
                      {new Date(cycle.q3Open).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Q4 Open</p>
                    <p className="text-sm text-white">
                      {new Date(cycle.q4Open).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a1a1f] border border-white/10 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold text-white mb-4">
                {editingCycle ? "Edit Cycle" : "Create New Cycle"}
              </h3>

              {/* FIX 6: Warning banner for active cycle edits */}
              {editingCycle && editingCycle.isActive && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4 text-yellow-400 text-sm">
                  ⚠️ You are editing the active cycle. Date changes take effect immediately for all users.
                </div>
              )}

              {validationError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-4">
                  {validationError}
                </div>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Cycle Name *</label>
                    <input
                      type="text"
                      value={newCycle.name}
                      onChange={(e) => setNewCycle({ ...newCycle, name: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff4444]"
                      placeholder="FY 2025-26"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Year *</label>
                    <input
                      type="number"
                      value={newCycle.year}
                      onChange={(e) =>
                        setNewCycle({ ...newCycle, year: parseInt(e.target.value) })
                      }
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff4444]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Goal Set Open Date *</label>
                  <input
                    type="date"
                    value={newCycle.goalSetOpen}
                    onChange={(e) => setNewCycle({ ...newCycle, goalSetOpen: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#ff4444]"
                  />
                  {/* FIX 6: Show note about correct date */}
                  {editingCycle && editingCycle.isActive && editingCycle.year === 2026 && (
                    <p className="text-xs text-blue-400 mt-1">
                      💡 FY 2026-27 Goal Set Open should be 5/1/2026
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Q1 Open Date *</label>
                    <input
                      type="date"
                      value={newCycle.q1Open}
                      onChange={(e) => setNewCycle({ ...newCycle, q1Open: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#ff4444]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Q2 Open Date *</label>
                    <input
                      type="date"
                      value={newCycle.q2Open}
                      onChange={(e) => setNewCycle({ ...newCycle, q2Open: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#ff4444]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Q3 Open Date *</label>
                    <input
                      type="date"
                      value={newCycle.q3Open}
                      onChange={(e) => setNewCycle({ ...newCycle, q3Open: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#ff4444]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Q4 Open Date *</label>
                    <input
                      type="date"
                      value={newCycle.q4Open}
                      onChange={(e) => setNewCycle({ ...newCycle, q4Open: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#ff4444]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-6">
                <button
                  onClick={handleCreateCycle}
                  disabled={actionLoading === "create" || actionLoading === editingCycle?.id}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#ff4444] hover:bg-[#ff5555] text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading === "create" || actionLoading === editingCycle?.id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {editingCycle ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      {editingCycle ? "Update Cycle" : "Create Cycle"}
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingCycle(null);
                    setNewCycle({
                      name: "",
                      year: new Date().getFullYear(),
                      goalSetOpen: "",
                      q1Open: "",
                      q2Open: "",
                      q3Open: "",
                      q4Open: "",
                    });
                    setValidationError("");
                  }}
                  disabled={actionLoading === "create" || actionLoading === editingCycle?.id}
                  className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Professional Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Cycle"
        message={`Are you sure you want to delete ${deleteTarget?.label}? This action cannot be undone. The cycle will be permanently removed from the system.`}
        confirmText="Delete Cycle"
        cancelText="Cancel"
        type="danger"
        loading={actionLoading === deleteTarget?.id}
      />

      {/* Professional Deactivate Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeactivateDialog}
        onClose={() => {
          setShowDeactivateDialog(false);
          setDeactivateTarget(null);
        }}
        onConfirm={confirmDeactivate}
        title="Deactivate Cycle"
        message={`Are you sure you want to deactivate ${deactivateTarget?.name}? Employees will not be able to set goals until a new cycle is activated.`}
        confirmText="Deactivate"
        cancelText="Cancel"
        type="warning"
        loading={actionLoading === deactivateTarget?.id}
      />
    </div>
  );
}
