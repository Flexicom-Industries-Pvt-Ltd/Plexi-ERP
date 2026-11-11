"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Shield, Trash2, Edit, Camera, Upload, AlertCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { createRole, updateRole, deleteRole } from "@/actions/roles";
import { z } from "zod";
import { RolePermissionSchema } from "@/lib/schemas/roles";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

type RolePermissionInput = z.infer<typeof RolePermissionSchema>;

type Props = {
  roles: any[];
  modules: string[];
};

export function RolesClient({ roles, modules }: Props) {
  const [isPending, setIsPending] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any | null>(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  
  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [canUploadPhoto, setCanUploadPhoto] = useState(false);
  const [canCapturePhoto, setCanCapturePhoto] = useState(true);
  const [permissions, setPermissions] = useState<Record<string, { canRead: boolean; canCreate: boolean; canUpdate: boolean; canDelete: boolean }>>({});

  const handleOpenDialog = (role?: any) => {
    if (role) {
      setEditingRole(role);
      setName(role.name);
      setDescription(role.description || "");
      setCanUploadPhoto(role.canUploadPhoto || false);
      setCanCapturePhoto(role.canCapturePhoto ?? true);
      
      const perms: any = {};
      modules.forEach(m => {
        const rp = role.permissions.find((p: any) => p.module === m);
        perms[m] = {
          canRead: rp?.canRead || false,
          canCreate: rp?.canCreate || false,
          canUpdate: rp?.canUpdate || false,
          canDelete: rp?.canDelete || false,
        };
      });
      setPermissions(perms);
    } else {
      setEditingRole(null);
      setName("");
      setDescription("");
      setCanUploadPhoto(false);
      setCanCapturePhoto(true);
      
      const perms: any = {};
      modules.forEach(m => {
        perms[m] = { canRead: false, canCreate: false, canUpdate: false, canDelete: false };
      });
      setPermissions(perms);
    }
    setIsDialogOpen(true);
  };

  const handleCheckboxChange = (module: string, action: "canRead" | "canCreate" | "canUpdate" | "canDelete", checked: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [module]: {
        ...prev[module],
        [action]: checked,
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);

    try {
      const permissionsArray: RolePermissionInput[] = Object.entries(permissions).map(([module, perms]) => ({
        module: module as any,
        canRead: perms.canRead,
        canCreate: perms.canCreate,
        canUpdate: perms.canUpdate,
        canDelete: perms.canDelete,
      }));

      if (editingRole) {
        const res = await updateRole({
          id: editingRole.id,
          name,
          description,
          canUploadPhoto,
          canCapturePhoto,
          permissions: permissionsArray,
        });
        if (res.success) {
          toast.success("Role updated successfully");
          setIsDialogOpen(false);
        } else {
          toast.error(res.error.message);
        }
      } else {
        const res = await createRole({
          name,
          description,
          canUploadPhoto,
          canCapturePhoto,
          permissions: permissionsArray,
        });
        if (res.success) {
          toast.success("Role created successfully");
          setIsDialogOpen(false);
        } else {
          toast.error(res.error.message);
        }
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsPending(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsPending(true);
    try {
      const res = await deleteRole({ id: deleteTarget.id });
      if (res.success) {
        toast.success("Role deleted successfully");
        setDeleteTarget(null);
      } else {
        toast.error(res.error.message);
      }
    } catch {
      toast.error("Failed to delete role");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>System Roles</CardTitle>
            <CardDescription>Configure roles, evidence media access, and feature permissions.</CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog()} className="bg-[#e64132] hover:bg-[#e64132]/90">
            <PlusCircle className="w-4 h-4 mr-2" />
            Add Role
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Photo & Media Policy</TableHead>
                <TableHead>Users Assigned</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No roles found.
                  </TableCell>
                </TableRow>
              )}
              {roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-[#2d2f83]" />
                      <span className="font-medium">{role.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{role.description || "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {role.canUploadPhoto && role.canCapturePhoto ? (
                        <Badge variant="outline" className="text-[11px] font-medium bg-slate-50 text-slate-700 border-slate-200">
                          📷 Camera + 📁 Upload
                        </Badge>
                      ) : role.canCapturePhoto ? (
                        <Badge variant="outline" className="text-[11px] font-medium bg-blue-50 text-blue-700 border-blue-200">
                          📷 Live Camera Only
                        </Badge>
                      ) : role.canUploadPhoto ? (
                        <Badge variant="outline" className="text-[11px] font-medium bg-purple-50 text-purple-700 border-purple-200">
                          📁 Upload Only
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[11px] font-medium bg-red-50 text-red-600 border-red-200">
                          ⛔ No Photo Access
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{role._count?.users || 0} Users</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(role)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTarget({ id: role.id, name: role.name })}
                      disabled={isPending || role._count?.users > 0}
                      title={role._count?.users > 0 ? "Cannot delete role with assigned users" : "Delete role"}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl md:max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingRole ? "Edit Role" : "Create New Role"}</DialogTitle>
            <DialogDescription>
              Define evidence photo policies and module-level permissions for this role.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Role Name</Label>
                <Input 
                  id="name" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="e.g. Production Manager"
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input 
                  id="description" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  placeholder="Brief role responsibilities"
                />
              </div>
            </div>

            {/* Evidence Photo & Media Policy (RBAC) */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5 text-slate-700" />
                  <span>Evidence Photo & Media Permissions</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Control which photo evidence options are rendered for users with this role across factory modules.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {/* 1. Device File Upload */}
                <label className="flex items-start gap-2.5 p-2.5 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer shadow-2xs">
                  <Checkbox
                    id="canUploadPhoto"
                    checked={canUploadPhoto}
                    onCheckedChange={(c) => setCanUploadPhoto(!!c)}
                    className="mt-0.5"
                  />
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                      <Upload className="h-3.5 w-3.5 text-purple-600" />
                      Allow Device File Upload
                    </span>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      Enables uploading existing images from filesystem or gallery (e.g. Supervisors / Managers).
                    </p>
                  </div>
                </label>

                {/* 2. Live Camera Capture */}
                <label className="flex items-start gap-2.5 p-2.5 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer shadow-2xs">
                  <Checkbox
                    id="canCapturePhoto"
                    checked={canCapturePhoto}
                    onCheckedChange={(c) => setCanCapturePhoto(!!c)}
                    className="mt-0.5"
                  />
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                      <Camera className="h-3.5 w-3.5 text-blue-600" />
                      Allow Live Camera Capture
                    </span>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      Enables real-time camera capture on the factory floor (Audited physical presence for Operators).
                    </p>
                  </div>
                </label>
              </div>

              {!canUploadPhoto && !canCapturePhoto && (
                <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px] flex items-center gap-2">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  <span>
                    <strong>Notice:</strong> Both photo options are disabled. Users with this role cannot attach photos.
                  </span>
                </div>
              )}
            </div>

            <div className="flex-1 flex flex-col min-h-0 border rounded-md">
              <div className="bg-muted p-2 border-b font-medium text-sm">
                Module Permissions
              </div>
              <div className="flex-1 overflow-y-auto">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Module</TableHead>
                        <TableHead className="text-center w-20">Read</TableHead>
                        <TableHead className="text-center w-20">Create</TableHead>
                        <TableHead className="text-center w-20">Update</TableHead>
                        <TableHead className="text-center w-20">Delete</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {modules.map((module) => (
                        <TableRow key={module}>
                          <TableCell className="font-medium">
                            {module.replace(/_/g, " ")}
                          </TableCell>
                          <TableCell className="text-center">
                            <Checkbox 
                              checked={permissions[module]?.canRead} 
                              onCheckedChange={(c) => handleCheckboxChange(module, "canRead", !!c)} 
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Checkbox 
                              checked={permissions[module]?.canCreate} 
                              onCheckedChange={(c) => handleCheckboxChange(module, "canCreate", !!c)} 
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Checkbox 
                              checked={permissions[module]?.canUpdate} 
                              onCheckedChange={(c) => handleCheckboxChange(module, "canUpdate", !!c)} 
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Checkbox 
                              checked={permissions[module]?.canDelete} 
                              onCheckedChange={(c) => handleCheckboxChange(module, "canDelete", !!c)} 
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="bg-[#e64132] hover:bg-[#e64132]/90">
                {isPending ? "Saving..." : editingRole ? "Save Changes" : "Create Role"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Role"
        itemName={deleteTarget?.name}
        itemType="Role"
        description={`Are you sure you want to delete role "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete Role"
      />
    </>
  );
}
