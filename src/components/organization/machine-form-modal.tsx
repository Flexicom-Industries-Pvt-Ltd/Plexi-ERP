"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Factory } from "lucide-react";

type Props = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  entity: any | null; 
  sections: any[];
  onSubmit: (data: any) => Promise<void>;
  isPending: boolean;
};

const MACHINE_STATUS = [
  { value: "ACTIVE", label: "Active" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "INACTIVE", label: "Inactive" },
];

export function MachineFormModal({
  isOpen,
  onOpenChange,
  entity,
  sections,
  onSubmit,
  isPending
}: Props) {
  const [formData, setFormData] = useState({
    name: "",
    sectionId: "",
    serialNumber: "",
    make: "",
    model: "",
    status: "ACTIVE",
  });

  useEffect(() => {
    if (isOpen) {
      if (entity) {
        setFormData({
          name: entity.name || "",
          sectionId: entity.sectionId || "",
          serialNumber: entity.serialNumber || "",
          make: entity.make || "",
          model: entity.model || "",
          status: entity.status || "ACTIVE",
        });
      } else {
        setFormData({
          name: "",
          sectionId: "",
          serialNumber: "",
          make: "",
          model: "",
          status: "ACTIVE",
        });
      }
    }
  }, [isOpen, entity]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (name: string, val: string | null) => {
    setFormData({ ...formData, [name]: val || "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl rounded-2xl bg-white">
        <div className="bg-gradient-to-r from-secondary/50 to-white p-6 pb-4 border-b border-border/40">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
              <span className="p-2 rounded-lg bg-primary/10 text-primary">
                <Factory className="w-5 h-5" />
              </span>
              {entity ? "Edit Machine" : "Add Machine"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground mt-1">
              {entity ? "Update machine details." : "Register a new machine under a section."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="p-6 pt-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="sectionId" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Production Section</Label>
            <Select value={formData.sectionId || ""} onValueChange={(val) => handleSelectChange('sectionId', val)}>
              <SelectTrigger id="sectionId" className="bg-secondary/20 focus:ring-primary/30 border-transparent focus:border-primary/50 rounded-lg">
                <SelectValue placeholder="Select Section">
                  {sections.find(s => s.id === formData.sectionId)?.name || "Select Section"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="rounded-xl shadow-lg border-border/40">
                {sections.map((sec) => (
                  <SelectItem key={sec.id} value={sec.id} className="rounded-lg hover:bg-secondary/50 cursor-pointer">
                    {sec.name} ({sec.department?.name || 'Unknown'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Machine Name</Label>
            <Input 
              id="name" 
              name="name" 
              value={formData.name} 
              onChange={handleChange} 
              placeholder="e.g. Extruder #1" 
              required
              className="bg-secondary/20 focus-visible:ring-primary/30 border-transparent focus:border-primary/50 transition-all rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="make" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Make (Optional)</Label>
              <Input 
                id="make" 
                name="make" 
                value={formData.make} 
                onChange={handleChange} 
                placeholder="e.g. Bosch" 
                className="bg-secondary/20 focus-visible:ring-primary/30 border-transparent focus:border-primary/50 transition-all rounded-lg"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="model" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Model (Optional)</Label>
              <Input 
                id="model" 
                name="model" 
                value={formData.model} 
                onChange={handleChange} 
                placeholder="e.g. X100" 
                className="bg-secondary/20 focus-visible:ring-primary/30 border-transparent focus:border-primary/50 transition-all rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="serialNumber" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Serial No. (Optional)</Label>
              <Input 
                id="serialNumber" 
                name="serialNumber" 
                value={formData.serialNumber} 
                onChange={handleChange} 
                placeholder="SN-001" 
                className="bg-secondary/20 focus-visible:ring-primary/30 border-transparent focus:border-primary/50 transition-all rounded-lg"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</Label>
              <Select value={formData.status || ""} onValueChange={(val) => handleSelectChange('status', val)}>
                <SelectTrigger id="status" className="bg-secondary/20 focus:ring-primary/30 border-transparent focus:border-primary/50 rounded-lg">
                  <SelectValue placeholder="Select Status">
                    {MACHINE_STATUS.find(s => s.value === formData.status)?.label || "Select Status"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl shadow-lg border-border/40">
                  {MACHINE_STATUS.map((status) => (
                    <SelectItem key={status.value} value={status.value} className="rounded-lg hover:bg-secondary/50 cursor-pointer">
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
