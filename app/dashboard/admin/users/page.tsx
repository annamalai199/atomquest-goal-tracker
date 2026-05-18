"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import TopBar from "@/components/dashboard/TopBar";
import toast from "react-hot-toast";
import { Users, Edit2, Save, X, Loader2, UserPlus, Shield, Briefcase, User, Eye, EyeOff } from "lucide-react";

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "EMPLOYEE",
    department: "",
    managerId: "",
  });

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/users");
      const data = await res.json();
      
      const allUsers = data.users || [];
      setUsers(allUsers);
      
      // Extract managers for dropdown
      const managerList = allUsers.filter((u: any) => u.role === "MANAGER");
      setManagers(managerList);
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (user: any) => {
    setEditingUser(user.id);
    setEditData({
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department || "",
      managerId: user.managerId || "",
    });
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setEditData({});
  };

  const handleSaveEdit = async (userId: string) => {
    setActionLoading(userId);
    try {
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          ...editData,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update user");
      }

      // Optimistic update
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                ...editData,
                manager: editData.managerId
                  ? managers.find((m) => m.id === editData.managerId)
                  : null,
              }
            : u
        )
      );

      toast.success("User updated successfully");
      setEditingUser(null);
      setEditData({});
    } catch (error: any) {
      console.error("Update error:", error);
      toast.error(error.message || "Failed to update user");
      fetchUsers(); // Refresh on error
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      toast.error("Name, email, and password are required");
      return;
    }

    setActionLoading("create");
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create user");
      }

      toast.success("User created successfully");
      setShowCreateModal(false);
      setNewUser({
        name: "",
        email: "",
        password: "",
        role: "EMPLOYEE",
        department: "",
        managerId: "",
      });
      fetchUsers();
    } catch (error: any) {
      console.error("Create error:", error);
      toast.error(error.message || "Failed to create user");
    } finally {
      setActionLoading(null);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "ADMIN":
        return <Shield className="w-4 h-4 text-red-400" />;
      case "MANAGER":
        return <Briefcase className="w-4 h-4 text-blue-400" />;
      case "EMPLOYEE":
        return <User className="w-4 h-4 text-green-400" />;
      default:
        return <User className="w-4 h-4 text-gray-400" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "MANAGER":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "EMPLOYEE":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  if (loading) {
    return (
      <div>
        <TopBar title="Manage Users" subtitle="User management and role assignment" />
        <div className="p-8 text-center">
          <Loader2 className="w-8 h-8 text-[#ff4444] animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <TopBar
        title="Manage Users"
        subtitle={`${users.length} user${users.length !== 1 ? "s" : ""} in the system`}
      />

      <div className="p-6 lg:p-8 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-gray-400" />
              <h3 className="text-sm text-gray-400">Total Users</h3>
            </div>
            <p className="text-2xl font-bold text-white">{users.length}</p>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-5 h-5 text-red-400" />
              <h3 className="text-sm text-gray-400">Admins</h3>
            </div>
            <p className="text-2xl font-bold text-red-400">
              {users.filter((u) => u.role === "ADMIN").length}
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <Briefcase className="w-5 h-5 text-blue-400" />
              <h3 className="text-sm text-gray-400">Managers</h3>
            </div>
            <p className="text-2xl font-bold text-blue-400">
              {users.filter((u) => u.role === "MANAGER").length}
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <User className="w-5 h-5 text-green-400" />
              <h3 className="text-sm text-gray-400">Employees</h3>
            </div>
            <p className="text-2xl font-bold text-green-400">
              {users.filter((u) => u.role === "EMPLOYEE").length}
            </p>
          </div>
        </div>

        {/* Create User Button */}
        <div className="flex justify-end">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-[#ff4444] hover:bg-[#ff5555] text-white rounded-lg font-semibold transition-all"
          >
            <UserPlus className="w-5 h-5" />
            Create New User
          </button>
        </div>

        {/* Users Table */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Manager
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Goals
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {users.map((user) => {
                  const isEditing = editingUser === user.id;
                  const currentEdit = isEditing ? editData : user;

                  return (
                    <tr key={user.id} className="hover:bg-white/5 transition-colors">
                      {/* User Info */}
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={currentEdit.name}
                              onChange={(e) =>
                                setEditData({ ...editData, name: e.target.value })
                              }
                              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#ff4444]"
                              placeholder="Name"
                            />
                            <input
                              type="email"
                              value={currentEdit.email}
                              onChange={(e) =>
                                setEditData({ ...editData, email: e.target.value })
                              }
                              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#ff4444]"
                              placeholder="Email"
                            />
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm font-medium text-white">{user.name}</p>
                            <p className="text-xs text-gray-400">{user.email}</p>
                          </div>
                        )}
                      </td>

                      {/* Role */}
                      <td className="px-6 py-4 text-center">
                        {isEditing ? (
                          <select
                            value={currentEdit.role}
                            onChange={(e) =>
                              setEditData({ ...editData, role: e.target.value })
                            }
                            className="px-3 py-2 bg-white/10 border border-white/20 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#ff4444]"
                          >
                            <option value="EMPLOYEE">Employee</option>
                            <option value="MANAGER">Manager</option>
                            <option value="ADMIN">Admin</option>
                          </select>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${getRoleBadgeColor(
                              user.role
                            )}`}
                          >
                            {getRoleIcon(user.role)}
                            {user.role}
                          </span>
                        )}
                      </td>

                      {/* Department */}
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <input
                            type="text"
                            value={currentEdit.department || ""}
                            onChange={(e) =>
                              setEditData({ ...editData, department: e.target.value })
                            }
                            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#ff4444]"
                            placeholder="Department"
                          />
                        ) : (
                          <p className="text-sm text-white">{user.department || "—"}</p>
                        )}
                      </td>

                      {/* Manager Assignment */}
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <select
                            value={currentEdit.managerId || ""}
                            onChange={(e) =>
                              setEditData({ ...editData, managerId: e.target.value })
                            }
                            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#ff4444]"
                            disabled={currentEdit.role !== "EMPLOYEE"}
                          >
                            <option value="">No Manager</option>
                            {managers.map((manager) => (
                              <option key={manager.id} value={manager.id}>
                                {manager.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <p className="text-sm text-white">
                            {user.manager?.name || "—"}
                          </p>
                        )}
                      </td>

                      {/* Goals Count */}
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-medium text-white">
                          {user._count?.goals || 0}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => handleSaveEdit(user.id)}
                                disabled={actionLoading === user.id}
                                className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Save"
                              >
                                {actionLoading === user.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Save className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                onClick={cancelEdit}
                                disabled={actionLoading === user.id}
                                className="p-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-all disabled:opacity-50"
                                title="Cancel"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => startEdit(user)}
                              className="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-all"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1f] border border-white/10 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Create New User</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Name *</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff4444]"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Email *</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff4444]"
                  placeholder="john@company.com"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full px-4 py-3 pr-12 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff4444]"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors duration-50"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Role *</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#ff4444]"
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Department</label>
                <input
                  type="text"
                  value={newUser.department}
                  onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff4444]"
                  placeholder="Engineering"
                />
              </div>

              {newUser.role === "EMPLOYEE" && (
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Manager</label>
                  <select
                    value={newUser.managerId}
                    onChange={(e) => setNewUser({ ...newUser, managerId: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#ff4444]"
                  >
                    <option value="">No Manager</option>
                    {managers.map((manager) => (
                      <option key={manager.id} value={manager.id}>
                        {manager.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 mt-6">
              <button
                onClick={handleCreateUser}
                disabled={actionLoading === "create"}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#ff4444] hover:bg-[#ff5555] text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading === "create" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Create User
                  </>
                )}
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                disabled={actionLoading === "create"}
                className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-all disabled:opacity-50"
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
