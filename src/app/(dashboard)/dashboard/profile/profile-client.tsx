"use client";

import { useState } from "react";
import { User, Shield, Activity, Lock, Save, Loader2, Key } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface ProfileClientProps {
  user: any;
  recentActivity: any[];
}

export function ProfileClient({ user, recentActivity }: ProfileClientProps) {
  const [activeTab, setActiveTab] = useState("general");
  
  // General Info State
  const [name, setName] = useState(user.name || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);

  // Security State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingSecurity, setIsSavingSecurity] = useState(false);

  const handleUpdateGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingGeneral(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone })
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Profile updated successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setIsSavingGeneral(false);
    }
  };

  const handleUpdateSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    setIsSavingSecurity(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update password");
      
      toast.success("Password updated securely");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to update security credentials");
    } finally {
      setIsSavingSecurity(false);
    }
  };

  const tabs = [
    { id: "general", label: "General", icon: User },
    { id: "security", label: "Security", icon: Lock },
    { id: "permissions", label: "Permissions", icon: Shield },
    { id: "activity", label: "Recent Activity", icon: Activity },
  ];

  return (
    <div className="flex flex-col md:flex-row gap-6 h-full">
      {/* Sidebar Navigation */}
      <div className="w-full md:w-64 shrink-0 flex flex-col gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                isActive 
                  ? "bg-primary text-white shadow-md shadow-primary/20" 
                  : "bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-slate-100"
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? "text-white" : "text-slate-400"}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        
        {/* General Tab */}
        {activeTab === "general" && (
          <div className="p-6 md:p-8 animate-in fade-in duration-300">
            <h2 className="text-xl font-bold text-slate-800 mb-6">Personal Information</h2>
            
            <div className="flex items-center gap-6 mb-8 pb-8 border-b border-slate-100">
              <div className="h-20 w-20 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold border-2 border-primary/20">
                {user.name?.substring(0, 2).toUpperCase() || "SU"}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800">{user.name}</h3>
                <p className="text-sm text-slate-500">{user.role?.name || "No Role"} • {user.department?.name || "No Department"}</p>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                  Active Account
                </div>
              </div>
            </div>

            <form onSubmit={handleUpdateGeneral} className="max-w-md space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Employee ID</label>
                <input
                  type="text"
                  disabled
                  value={user.employeeId || "N/A"}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-500 cursor-not-allowed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Email Address</label>
                <input
                  type="email"
                  disabled
                  value={user.email || ""}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-500 cursor-not-allowed"
                />
                <p className="text-xs text-slate-400">Contact IT support to change your email address.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSavingGeneral}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {isSavingGeneral ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === "security" && (
          <div className="p-6 md:p-8 animate-in fade-in duration-300">
            <h2 className="text-xl font-bold text-slate-800 mb-2">Security Credentials</h2>
            <p className="text-sm text-slate-500 mb-8">Update your password to keep your account secure.</p>

            <form onSubmit={handleUpdateSecurity} className="max-w-md space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">New Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Confirm New Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSavingSecurity}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-900 transition-colors disabled:opacity-50"
                >
                  {isSavingSecurity ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
                  Update Password
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Permissions Tab */}
        {activeTab === "permissions" && (
          <div className="p-6 md:p-8 animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-bold text-slate-800">My Access Rights</h2>
                <p className="text-sm text-slate-500 mt-1">Your assigned role is <span className="font-semibold text-primary">{user.role?.name}</span>.</p>
              </div>
              <Shield className="h-8 w-8 text-primary/20" />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {user.role?.permissions.map((p: any) => (
                <div key={p.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <h4 className="font-semibold text-slate-700 mb-3">{p.module.replace(/_/g, ' ')}</h4>
                  <div className="flex flex-wrap gap-2">
                    {p.canRead && <span className="px-2 py-1 rounded bg-blue-100 text-blue-700 text-xs font-medium">Read</span>}
                    {p.canCreate && <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-700 text-xs font-medium">Create</span>}
                    {p.canUpdate && <span className="px-2 py-1 rounded bg-amber-100 text-amber-700 text-xs font-medium">Update</span>}
                    {p.canDelete && <span className="px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-medium">Delete</span>}
                    {!p.canRead && !p.canCreate && !p.canUpdate && !p.canDelete && (
                      <span className="px-2 py-1 rounded bg-slate-200 text-slate-500 text-xs font-medium">No Access</span>
                    )}
                  </div>
                </div>
              ))}
              {(!user.role?.permissions || user.role.permissions.length === 0) && user.role?.name !== "SUPERADMIN" && (
                <p className="text-sm text-slate-500 col-span-2">No explicit module permissions assigned to your role.</p>
              )}
              {user.role?.name === "SUPERADMIN" && (
                <div className="col-span-2 p-6 rounded-xl border border-emerald-200 bg-emerald-50 flex items-center justify-center">
                  <p className="text-emerald-700 font-medium">You have unrestricted Super Admin access to all modules.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === "activity" && (
          <div className="p-6 md:p-8 animate-in fade-in duration-300 flex-1 overflow-y-auto">
            <h2 className="text-xl font-bold text-slate-800 mb-6">Recent Activity</h2>
            
            {recentActivity.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">No recent activity found.</p>
              </div>
            ) : (
              <div className="relative border-l-2 border-slate-100 ml-3 space-y-8 pb-8">
                {recentActivity.map((log: any) => (
                  <div key={log.id} className="relative pl-6">
                    <div className={`absolute -left-[9px] top-1.5 h-4 w-4 rounded-full border-2 border-white shadow-sm ${
                      log.severity === "ERROR" ? "bg-red-500" : 
                      log.severity === "WARN" ? "bg-amber-500" : 
                      "bg-blue-500"
                    }`} />
                    <div>
                      <p className="text-sm font-medium text-slate-800">{log.action}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          {log.module}
                        </span>
                        <span className="text-xs text-slate-400">
                          {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
