"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GitMerge } from "lucide-react";

type Props = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  entity: any | null; 
  departments: any[];
  onSubmit: (data: any) => Promise<void>;
  isPending: boolean;
};

export function SectionFormModal({
  isOpen,
  onOpenChange,
  entity,
  departments,
  onSubmit,
  isPending
}: Props) {
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    departmentId: "",
    description: "",
  });

  useEffect(() => {
    if (isOpen) {
      if (entity) {
        setFormData({
          name: entity.name || "",
          code: entity.code || "",
          departmentId: entity.departmentId || "",
          description: entity.description || "",
        });
      } else {
        setFormData({
          name: "",
          code: "",
          departmentId: "",
          description: "",
        });
      }
    }
  }, [isOpen, entity]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (val: string | null) => {
    setFormData({ ...formData, departmentId: val || "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden border-none shadow-2xl rounded-2xl bg-white">
        <div className="bg-gradient-to-r from-secondary/50 to-white p-6 pb-4 border-b border-border/40">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
              <span className="p-2 rounded-lg bg-primary/10 text-primary">
                <GitMerge className="w-5 h-5" />
              </span>
              {entity ? "Edit Section" : "Add Section"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground mt-1">
              {entity ? "Update the section details." : "Create a new section under a department."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="p-6 pt-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="departmentId" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Department</Label>
            <Select value={formData.departmentId || ""} onValueChange={handleSelectChange}>
              <SelectTrigger id="departmentId" className="bg-secondary/20 focus:ring-primary/30 border-transparent focus:border-primary/50 rounded-lg">
                <SelectValue placeholder="Select Department">
                  {departments.find(d => d.id === formData.departmentId)?.name || "Select Department"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="rounded-xl shadow-lg border-border/40">
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id} className="rounded-lg hover:bg-secondary/50 cursor-pointer">
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Section Name</Label>
            <Input 
              id="name" 
              name="name" 
              value={formData.name} 
              onChange={handleChange} 
              placeholder="e.g. Assembly Line A" 
              required
              className="bg-secondary/20 focus-visible:ring-primary/30 border-transparent focus:border-primary/50 transition-all rounded-lg"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="code" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Section Code</Label>
            <Input 
              id="code" 
              name="code" 
              value={formData.code} 
              onChange={handleChange} 
              placeholder="e.g. ASM-A" 
              required
              className="uppercase bg-secondary/20 focus-visible:ring-primary/30 border-transparent focus:border-primary/50 transition-all rounded-lg"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description (Optional)</Label>
            <Textarea 
              id="description" 
              name="description" 
              value={formData.description} 
              onChange={handleChange} 
              placeholder="Brief description of the section..." 
              className="bg-secondary/20 focus-visible:ring-primary/30 border-transparent focus:border-primary/50 transition-all rounded-lg resize-none h-24"
            />
          </div>

          <DialogFooter className="pt-4 mt-2 border-t border-border/40">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => onOpenChange(false)} 
              disabled={isPending}
              className="rounded-lg hover:bg-secondary/50"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isPending} 
              className="rounded-lg bg-primary hover:bg-primary/90 text-white shadow-md"
            >
              {isPending ? "Saving..." : entity ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
