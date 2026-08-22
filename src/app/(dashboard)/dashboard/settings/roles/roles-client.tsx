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

type RolePermissionInput = z.infer<typeof RolePermissionSchema>;

type Props = {
  roles: any[];
  modules: string[];
};

export function RolesClient({ roles, modules }: Props) {
  const [isPending, setIsPending] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any | null>(null);
  
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
        [action]: checked
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    
    // Transform permissions object back to array
    const permissionsArray: RolePermissionInput[] = modules.map(m => ({
      module: m as any,
      ...permissions[m]
    }));

    try {
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
    } catch (err) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsPending(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this role?")) return;
    setIsPending(true);
    try {
      const res = await deleteRole({ id });
      if (res.success) {
        toast.success("Role deleted successfully");
      } else {
        toast.error(res.error.message);
      }
    } catch (err) {
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
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(role.id)} disabled={isPending || role._count?.users > 0}>
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingRole ? 'Edit Role' : 'Create New Role'}</DialogTitle>
              <DialogDescription>
                Define the role details and assign fine-grained permissions for each module.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Role Name *</Label>
                  <Input 
                    id="name" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    placeholder="e.g. Store Manager" 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input 
                    id="description" 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    placeholder="Optional description" 
                  />
                </div>
              </div>

              <div>
                <Label className="text-base font-semibold mb-3 block">Module Permissions</Label>
                <div className="border rounded-md">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="w-[200px]">Module</TableHead>
                        <TableHead className="text-center">Read</TableHead>
                        <TableHead className="text-center">Create</TableHead>
                        <TableHead className="text-center">Update</TableHead>
                        <TableHead className="text-center">Delete</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {modules.map(module => (
                        <TableRow key={module}>
                          <TableCell className="font-medium text-sm">
                            {module.replace(/_/g, ' ')}
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
    </>
  );
}
