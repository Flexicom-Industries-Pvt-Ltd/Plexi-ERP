"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ShieldCheck, Mail, Briefcase, Building, UserCog } from "lucide-react";

type UserTableProps = {
  users: any[];
  isPending: boolean;
  onToggleStatus: (id: string, currentStatus: boolean) => Promise<void>;
  onEdit: (user: any) => void;
};

export function UserTable({ users, isPending, onToggleStatus, onEdit }: UserTableProps) {
  const getInitials = (name: string) => {
    return name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'US';
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden shadow-sm">
      <Table>
        <TableHeader className="bg-secondary/30">
          <TableRow className="hover:bg-transparent border-border/50">
            <TableHead className="font-semibold text-foreground/80 pl-6 py-4">User</TableHead>
            <TableHead className="font-semibold text-foreground/80">Role</TableHead>
            <TableHead className="font-semibold text-foreground/80">Department</TableHead>
            <TableHead className="font-semibold text-foreground/80">Status</TableHead>
            <TableHead className="font-semibold text-foreground/80 text-right pr-6">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-16">
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="p-4 rounded-full bg-secondary/50">
                    <ShieldCheck className="w-8 h-8 text-primary/40" />
                  </div>
                  <p className="text-sm font-medium">No users found in the system.</p>
                </div>
              </TableCell>
            </TableRow>
          )}
          {users.map((user) => (
            <TableRow 
              key={user.id} 
              className="border-border/50 hover:bg-secondary/20 transition-colors group"
            >
              <TableCell className="py-4 pl-6">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border border-primary/10 bg-gradient-to-br from-secondary to-white shadow-sm group-hover:shadow transition-all">
                    <AvatarFallback className="bg-transparent text-primary font-semibold text-xs">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground">{user.name || 'Unnamed User'}</span>
                    <div className="flex items-center text-[11px] text-muted-foreground gap-1.5 mt-0.5">
                      <Mail className="w-3 h-3" />
                      <span>{user.email}</span>
                      {user.employeeId && (
                        <>
                          <span className="text-border mx-0.5">•</span>
                          <span className="font-mono bg-secondary/60 px-1.5 py-0.5 rounded-md text-primary/80 font-medium">
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
                    <span className="text-sm font-medium text-foreground/90">{user.role.name}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-xs italic">Unassigned</span>
                )}
              </TableCell>
              <TableCell>
                {user.department ? (
                  <div className="flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-muted-foreground/80" />
                    <span className="text-sm text-foreground/90">{user.department.name}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-xs italic">None</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2.5">
                  <Switch 
                    checked={user.isActive} 
                    onCheckedChange={() => onToggleStatus(user.id, user.isActive)}
                    disabled={isPending}
                    className="data-[state=checked]:bg-primary scale-90"
                  />
                  <Badge variant="outline" className={user.isActive ? "text-primary bg-primary/5 border-primary/20 font-medium" : "text-muted-foreground bg-secondary/50 border-transparent font-normal"}>
                    {user.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </TableCell>
              <TableCell className="text-right pr-6">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/10 hover:text-primary rounded-lg"
                  onClick={() => onEdit(user)}
                >
                  <UserCog className="w-4 h-4 mr-1.5" />
                  Edit
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
