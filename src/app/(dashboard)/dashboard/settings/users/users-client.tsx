"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, ShieldCheck } from "lucide-react";
import { createUser, updateUser, toggleUserStatus } from "@/actions/users";
import { toast } from "sonner";
import { UserTable } from "@/components/users/user-table";
import { UserFormModal } from "@/components/users/user-form-modal";

type Props = {
  users: any[];
  roles: any[];
  departments: any[];
};

export function UsersClient({ users, roles, departments }: Props) {
  const [isPending, setIsPending] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    setIsPending(true);
    try {
      const res = await toggleUserStatus({ id, isActive: !currentStatus });
      if (!res.success) {
        throw new Error(res.error.message || "Failed to update user status");
      }
      toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
    } catch (error: any) {
      toast.error(error.message || "Failed to update user status");
    } finally {
      setIsPending(false);
    }
  };

  const handleOpenModal = (user: any = null) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleSubmit = async (formData: any) => {
    setIsPending(true);
    try {
      if (editingUser) {
        // Prevent sending empty password if not changing
        const { password, ...payloadWithoutPassword } = formData;
        const payload = password ? formData : payloadWithoutPassword;
        
        const res = await updateUser({ id: editingUser.id, ...payload });
        if (!res.success) {
          throw new Error(res.error.message || "Failed to update user");
        }
        toast.success("User updated successfully");
      } else {
        if (!formData.password) {
          toast.error("Password is required for new users");
          setIsPending(false);
          return;
        }
        const res = await createUser(formData);
        if (!res.success) {
          throw new Error(res.error.message || "Failed to create user");
        }
        toast.success("User created successfully");
      }
      setIsModalOpen(false);
    } catch (error: any) {
      toast.error(error.message || `Failed to ${editingUser ? 'update' : 'create'} user`);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-primary" />
            User Directory
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage user access, roles, and organizational assignments.
          </p>
        </div>
        <Button 
          onClick={() => handleOpenModal()} 
          className="bg-primary hover:bg-primary/90 text-white shadow-sm hover:shadow-md transition-all rounded-full px-6"
        >
          <PlusCircle className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      <UserTable 
        users={users} 
        isPending={isPending} 
        onToggleStatus={handleToggleStatus} 
        onEdit={handleOpenModal} 
      />

      <UserFormModal 
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        user={editingUser}
        roles={roles}
        departments={departments}
        onSubmit={handleSubmit}
        isPending={isPending}
      />
    </div>
  );
}
