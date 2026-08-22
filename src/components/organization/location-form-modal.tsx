"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin } from "lucide-react";
import { LocationType } from "@/generated/prisma";

type Props = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  entity: any | null; 
  onSubmit: (data: any) => Promise<void>;
  isPending: boolean;
};

const LOCATION_TYPES = [
  { value: "GATE", label: "Gate" },
  { value: "WAREHOUSE", label: "Warehouse" },
  { value: "PRODUCTION_FLOOR", label: "Production Floor" },
  { value: "SCRAP_YARD", label: "Scrap Yard" },
  { value: "OFFICE", label: "Office" },
];

export function LocationFormModal({
  isOpen,
  onOpenChange,
  entity,
  onSubmit,
  isPending
}: Props) {
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    type: "WAREHOUSE" as LocationType,
    description: "",
  });

  useEffect(() => {
    if (isOpen) {
      if (entity) {
        setFormData({
          name: entity.name || "",
          code: entity.code || "",
          type: entity.type || "WAREHOUSE",
          description: entity.description || "",
        });
      } else {
        setFormData({
          name: "",
          code: "",
          type: "WAREHOUSE",
          description: "",
        });
      }
    }
  }, [isOpen, entity]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (val: string | null) => {
    setFormData({ ...formData, type: (val as LocationType) || "WAREHOUSE" });
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
                <MapPin className="w-5 h-5" />
              </span>
              {entity ? "Edit Location" : "Add Location"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground mt-1">
              {entity ? "Update the physical location details." : "Create a new physical zone or facility."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="p-6 pt-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="type" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Location Type</Label>
            <Select value={formData.type} onValueChange={handleSelectChange}>
              <SelectTrigger id="type" className="bg-secondary/20 focus:ring-primary/30 border-transparent focus:border-primary/50 rounded-lg">
                <SelectValue placeholder="Select Type">
                  {LOCATION_TYPES.find(t => t.value === formData.type)?.label || "Select Type"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="rounded-xl shadow-lg border-border/40">
                {LOCATION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value} className="rounded-lg hover:bg-secondary/50 cursor-pointer">
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Location Name</Label>
            <Input 
              id="name" 
              name="name" 
              value={formData.name} 
              onChange={handleChange} 
              placeholder="e.g. Main Warehouse" 
              required
              className="bg-secondary/20 focus-visible:ring-primary/30 border-transparent focus:border-primary/50 transition-all rounded-lg"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="code" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Location Code</Label>
            <Input 
              id="code" 
              name="code" 
              value={formData.code} 
              onChange={handleChange} 
              placeholder="e.g. WH-01" 
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
              placeholder="Brief description of the location..." 
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
