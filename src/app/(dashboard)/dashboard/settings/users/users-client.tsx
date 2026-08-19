"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, UserCog, ShieldCheck, Mail, Building, Briefcase, KeyRound } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toggleUserStatus, createUser, updateUser } from "@/actions/users";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Props = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  users: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  roles: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  departments: any[];
};

export function UsersClient({ users, roles, departments }: Props) {
  const [isPending, setIsPending] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editingUser, setEditingUser] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    employeeId: "",
    password: "",
    roleId: "",
    departmentId: ""
  });

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    setIsPending(true);
    try {
      await toggleUserStatus(id, !currentStatus);
      toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      toast.error("Failed to update user status");
    } finally {
      setIsPending(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleOpenSheet = (user: any = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name || "",
        email: user.email || "",
        employeeId: user.employeeId || "",
        password: "", // Always empty on edit
        roleId: user.roleId || "",
        departmentId: user.departmentId || ""
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: "",
        email: "",
        employeeId: "",
        password: "",
        roleId: "",
        departmentId: ""
      });
    }
    setIsSheetOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);

    try {
      if (editingUser) {
        // Prevent sending empty password if not changing
        const { password, ...payloadWithoutPassword } = formData;
        const payload = password ? formData : payloadWithoutPassword;
        
        await updateUser(editingUser.id, payload);
        toast.success("User updated successfully");
      } else {
        if (!formData.password) {
          toast.error("Password is required for new users");
          setIsPending(false);
          return;
        }
        await createUser(formData);
        toast.success("User created successfully");
      }
      setIsSheetOpen(false);
    } catch (error) {
      toast.error(`Failed to ${editingUser ? 'update' : 'create'} user`);
    } finally {
      setIsPending(false);
    }
  };

  const getInitials = (name: string) => {
    return name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'US';
  };

  return (
    <div className="flex flex-col gap-6">
      <Card className="border-primary/10 shadow-sm bg-white/50 backdrop-blur-xl">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-primary/5 pb-4">
          <div>
            <CardTitle className="text-xl">Directory</CardTitle>
            <CardDescription>Manage user access and organizational roles.</CardDescription>
          </div>
          <Button onClick={() => handleOpenSheet()} className="bg-primary hover:bg-primary/90 text-white shadow-sm transition-all hover:scale-105 active:scale-95">
            <PlusCircle className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-secondary/20">
              <TableRow className="border-primary/5 hover:bg-transparent">
                <TableHead className="font-semibold text-primary">User Profile</TableHead>
                <TableHead className="font-semibold text-primary">Role</TableHead>
                <TableHead className="font-semibold text-primary">Department</TableHead>
                <TableHead className="font-semibold text-primary">Status</TableHead>
                <TableHead className="font-semibold text-primary text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <ShieldCheck className="w-8 h-8 text-muted-foreground/50" />
                      <p>No users found in the system.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {users.map((user, i) => (
                <TableRow 
                  key={user.id} 
                  className="border-primary/5 hover:bg-primary/[0.02] transition-colors"
                >
                  <TableCell className="py-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border border-primary/10 shadow-sm">
                        <AvatarFallback className="bg-primary/5 text-primary font-medium text-xs">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">{user.name || 'Unnamed User'}</span>
                        <div className="flex items-center text-xs text-muted-foreground gap-1.5 mt-0.5">
                          <Mail className="w-3 h-3" />
                          <span>{user.email}</span>
                          {user.employeeId && (
                            <>
                              <span className="text-primary/20">•</span>
                              <span className="font-mono text-[10px] bg-secondary/50 px-1.5 py-0.5 rounded text-primary">
                                ID: {user.employeeId}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.role ? (
                      <div className="flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-primary/60" />
                        <span className="text-sm font-medium">{user.role.name}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs italic">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.department ? (
                      <div className="flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-sm">{user.department.name}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs italic">None</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Switch 
                        checked={user.isActive} 
                        onCheckedChange={() => handleToggleStatus(user.id, user.isActive)}
                        disabled={isPending}
                        className="data-[state=checked]:bg-green-500"
                      />
                      <Badge variant="outline" className={user.isActive ? "text-green-600 bg-green-50 border-green-200" : "text-muted-foreground bg-secondary/50 border-border"}>
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-4">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="hover:bg-primary/10 hover:text-primary transition-colors"
                      onClick={() => handleOpenSheet(user)}
                    >
                      <UserCog className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-2xl text-primary flex items-center gap-2">
              {editingUser ? 'Edit User' : 'Add New User'}
            </DialogTitle>
            <DialogDescription>
              {editingUser ? 'Update the details and permissions for this user.' : 'Create a new user account in the system.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="flex flex-col gap-5">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input 
                  id="name" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="e.g. John Doe"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employeeId">Employee ID</Label>
                  <Input 
                    id="employeeId" 
                    value={formData.employeeId} 
                    onChange={e => setFormData({...formData, employeeId: e.target.value})} 
                    placeholder="EMP-001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email"
                    value={formData.email} 
                    onChange={e => setFormData({...formData, email: e.target.value})} 
                    placeholder="john@example.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">
                  {editingUser ? 'New Password (leave blank to keep current)' : 'Password'}
                </Label>
                <div className="relative">
                  <Input 
                    id="password" 
                    type="password"
                    value={formData.password} 
                    onChange={e => setFormData({...formData, password: e.target.value})} 
                    placeholder="••••••••"
                    required={!editingUser}
                  />
                  <KeyRound className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={formData.roleId || undefined} onValueChange={(val) => setFormData({...formData, roleId: val || ""})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map(r => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={formData.departmentId || undefined} onValueChange={(val) => setFormData({...formData, departmentId: val || ""})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="mt-8">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsSheetOpen(false)}
                disabled={isPending}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90">
                {isPending ? "Saving..." : "Save User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
