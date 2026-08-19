"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, UserCog } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toggleUserStatus } from "@/actions/users";
import { toast } from "sonner";

type Props = {
  users: any[];
  roles: any[];
  departments: any[];
};

export function UsersClient({ users, roles, departments }: Props) {
  const [isPending, setIsPending] = useState(false);

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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>System Users</CardTitle>
          <CardDescription>Manage user access and roles.</CardDescription>
        </div>
        <Button className="bg-[#e64132] hover:bg-[#e64132]/90">
          <PlusCircle className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Active Access</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No users found.
                </TableCell>
              </TableRow>
            )}
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{user.name || 'Unnamed User'}</span>
                    <span className="text-xs text-muted-foreground">{user.email}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {user.role ? (
                    <Badge variant="outline">{user.role.name}</Badge>
                  ) : (
                    <span className="text-muted-foreground text-sm">No Role</span>
                  )}
                </TableCell>
                <TableCell>
                  {user.department?.name || <span className="text-muted-foreground text-sm">-</span>}
                </TableCell>
                <TableCell>
                  <Badge variant={user.isActive ? "default" : "secondary"}>
                    {user.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Switch 
                    checked={user.isActive} 
                    onCheckedChange={() => handleToggleStatus(user.id, user.isActive)}
                    disabled={isPending}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon">
                    <UserCog className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
