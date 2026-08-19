"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile } from "@/actions/users";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

type Props = {
  user: any;
};

export function ProfileClient({ user }: Props) {
  const [isPending, setIsPending] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name || "",
    phone: user.phone || "",
    password: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    try {
      const dataToUpdate: any = {
        name: formData.name,
        phone: formData.phone
      };
      
      if (formData.password.trim() !== "") {
        dataToUpdate.password = formData.password;
      }

      await updateProfile(user.id, dataToUpdate);
      toast.success("Profile updated successfully");
      
      // Clear password field after success
      setFormData(prev => ({ ...prev, password: "" }));
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Personal Details</CardTitle>
            <CardDescription>Update your contact information and password.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email (Read Only)</Label>
              <Input id="email" value={user.email} disabled />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" name="name" value={formData.name} onChange={handleChange} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} />
            </div>

            <div className="space-y-2 pt-4 border-t">
              <Label htmlFor="password">Change Password</Label>
              <Input 
                id="password" 
                name="password" 
                type="password" 
                placeholder="Leave blank to keep current password"
                value={formData.password} 
                onChange={handleChange} 
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isPending} className="bg-[#e64132] hover:bg-[#e64132]/90 text-white">
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Access & Roles</CardTitle>
          <CardDescription>Your current permissions in the system.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <span className="text-sm font-medium text-muted-foreground block mb-1">Assigned Role</span>
            {user.role ? (
              <Badge className="text-sm px-3 py-1 bg-[#2d2f83]">{user.role.name}</Badge>
            ) : (
              <span className="text-sm italic">No role assigned</span>
            )}
          </div>
          
          <div>
            <span className="text-sm font-medium text-muted-foreground block mb-1">Department</span>
            {user.department ? (
              <span className="text-sm">{user.department.name}</span>
            ) : (
              <span className="text-sm italic">No department assigned</span>
            )}
          </div>

          <div>
            <span className="text-sm font-medium text-muted-foreground block mb-1">Account Status</span>
            <Badge variant={user.isActive ? "default" : "destructive"}>
              {user.isActive ? "Active" : "Inactive / Suspended"}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
