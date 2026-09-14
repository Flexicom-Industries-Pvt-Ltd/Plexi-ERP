"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Shield, Trash2, Edit } from "lucide-react";
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
  const [permissions, setPermissions] = useState<Record<string, { canRead: boolean; canCreate: boolean; canUpdate: boolean; canDelete: boolean }>>({});

  const handleOpenDialog = (role?: any) => {
    if (role) {
      setEditingRole(role);
      setName(role.name);
      setDescription(role.description || "");
      
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
        const res = await updateRole({ id: editingRole.id, name, description, permissions: permissionsArray });
        if (res.success) {
          toast.success("Role updated successfully");
          setIsDialogOpen(false);
        } else {
          toast.error(res.error.message);
        }
      } else {
        const res = await createRole({ name, description, permissions: permissionsArray });
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
            <CardDescription>Configure roles and feature access.</CardDescription>
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
                <TableHead>Users Assigned</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
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
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingRole ? "Edit Role" : "Create New Role"}</DialogTitle>
            <DialogDescription>
              Define module-level permissions for this role.
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
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending} className="bg-[#2d2f83] hover:bg-[#2d2f83]/90">
                {isPending ? "Saving..." : "Save Role"}
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
        itemType="role"
        isLoading={isPending}
      />
    </>
  );
}
