"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck, User, Building, Mail, Key } from "lucide-react";

type UserFormModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  user: any | null; // The user being edited, or null for creating a new user
  roles: any[];
  departments: any[];
  onSubmit: (data: any) => Promise<void>;
  isPending: boolean;
};

export function UserFormModal({
  isOpen,
  onOpenChange,
  user,
  roles,
  departments,
  onSubmit,
  isPending
}: UserFormModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    employeeId: "",
    password: "",
    roleId: "",
    departmentId: ""
  });

  // Reset form when modal opens/closes or user changes
  useEffect(() => {
    if (isOpen) {
      if (user) {
        setFormData({
          name: user.name || "",
          email: user.email || "",
          employeeId: user.employeeId || "",
          password: "", // Always empty on edit
          roleId: user.roleId || "",
          departmentId: user.departmentId || ""
        });
      } else {
        setFormData({
          name: "",
          email: "",
          employeeId: "",
          password: "",
          roleId: "",
          departmentId: ""
        });
      }
    }
  }, [isOpen, user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (name: string, value: string | null) => {
    setFormData({ ...formData, [name]: value || "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl rounded-2xl bg-white">
        {/* Header Section with subtle gradient background */}
        <div className="bg-gradient-to-r from-secondary/50 to-white p-6 pb-4 border-b border-border/40">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
              <span className="p-2 rounded-lg bg-primary/10 text-primary">
                {user ? <User className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
              </span>
              {user ? "Edit User Profile" : "Add New User"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground mt-1">
              {user 
                ? "Update access and details for this user." 
                : "Create a new user and assign roles and departments."}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 pt-4 space-y-5">
          <div className="space-y-4">
            
            {/* Split Grid for Name and Email */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground/60" />
                  <Input 
                    id="name" 
                    name="name" 
                    value={formData.name} 
                    onChange={handleChange} 
                    placeholder="John Doe" 
                    className="pl-9 bg-secondary/20 focus-visible:ring-primary/30 border-transparent focus:border-primary/50 transition-all rounded-lg"
                  />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <Label htmlFor="employeeId" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Employee ID</Label>
                <Input 
                  id="employeeId" 
                  name="employeeId" 
                  value={formData.employeeId} 
                  onChange={handleChange} 
                  placeholder="EMP-001" 
                  className="bg-secondary/20 focus-visible:ring-primary/30 border-transparent focus:border-primary/50 transition-all rounded-lg"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground/60" />
                <Input 
                  id="email" 
                  name="email" 
                  type="email" 
                  required 
                  value={formData.email} 
                  onChange={handleChange} 
                  placeholder="john.doe@flexicom.com" 
                  className="pl-9 bg-secondary/20 focus-visible:ring-primary/30 border-transparent focus:border-primary/50 transition-all rounded-lg"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Password {user && <span className="font-normal text-[10px] lowercase text-muted-foreground ml-1">(Leave blank to keep current)</span>}
              </Label>
              <div className="relative">
                <Key className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground/60" />
                <Input 
                  id="password" 
                  name="password" 
                  type="password" 
                  required={!user} 
                  value={formData.password} 
                  onChange={handleChange} 
                  placeholder={user ? "••••••••" : "Create a strong password"} 
                  className="pl-9 bg-secondary/20 focus-visible:ring-primary/30 border-transparent focus:border-primary/50 transition-all rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="roleId" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> Role
                </Label>
                <Select value={formData.roleId || ""} onValueChange={(val) => handleSelectChange('roleId', val)}>
                  <SelectTrigger id="roleId" className="bg-secondary/20 focus:ring-primary/30 border-transparent focus:border-primary/50 rounded-lg">
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-lg border-border/40">
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id || ""} className="rounded-lg hover:bg-secondary/50 cursor-pointer">
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="departmentId" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5" /> Department
                </Label>
                <Select value={formData.departmentId || ""} onValueChange={(val) => handleSelectChange('departmentId', val)}>
                  <SelectTrigger id="departmentId" className="bg-secondary/20 focus:ring-primary/30 border-transparent focus:border-primary/50 rounded-lg">
                    <SelectValue placeholder="Select Dept" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-lg border-border/40">
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id || ""} className="rounded-lg hover:bg-secondary/50 cursor-pointer">
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
          </div>

          <DialogFooter className="pt-6 mt-2 border-t border-border/40">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => onOpenChange(false)} 
              disabled={isPending}
              className="rounded-lg hover:bg-secondary/50 text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isPending} 
              className="rounded-lg bg-primary hover:bg-primary/90 text-white shadow-md hover:shadow-lg transition-all"
            >
              {isPending ? "Saving..." : user ? "Update Profile" : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
