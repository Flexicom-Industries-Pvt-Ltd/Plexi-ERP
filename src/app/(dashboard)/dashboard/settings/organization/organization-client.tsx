"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Building2, MapPin, Factory, GitMerge, Edit, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

import { toast } from "sonner";
import { DepartmentFormModal } from "@/components/organization/department-form-modal";
import { SectionFormModal } from "@/components/organization/section-form-modal";
import { LocationFormModal } from "@/components/organization/location-form-modal";
import { MachineFormModal } from "@/components/organization/machine-form-modal";
import { 
  createDepartment, updateDepartment, 
  createSection, updateSection,
  createLocation, updateLocation,
  createMachine, updateMachine 
} from "@/actions/organization";

type Props = {
  departments: any[];
  sections: any[];
  locations: any[];
  machines: any[];
};

export function OrganizationClient({ departments, sections, locations, machines }: Props) {
  // --- STATE ---
  const [activeDeptModal, setActiveDeptModal] = useState(false);
  const [editDept, setEditDept] = useState<any | null>(null);

  const [activeSecModal, setActiveSecModal] = useState(false);
  const [editSec, setEditSec] = useState<any | null>(null);

  const [activeLocModal, setActiveLocModal] = useState(false);
  const [editLoc, setEditLoc] = useState<any | null>(null);

  const [activeMacModal, setActiveMacModal] = useState(false);
  const [editMac, setEditMac] = useState<any | null>(null);

  const [isPending, setIsPending] = useState(false);

  // --- HANDLERS ---
  const handleDeptSubmit = async (data: any) => {
    setIsPending(true);
    const res = editDept 
      ? await updateDepartment({ id: editDept.id, ...data })
      : await createDepartment(data);
    setIsPending(false);
    
    if (res?.success) {
      toast.success(editDept ? "Department updated successfully" : "Department created successfully");
      setActiveDeptModal(false);
    } else if (res?.error) {
      toast.error(res.error.message || "An error occurred");
    }
  };

  const handleSecSubmit = async (data: any) => {
    setIsPending(true);
    const res = editSec 
      ? await updateSection({ id: editSec.id, ...data })
      : await createSection(data);
    setIsPending(false);
    
    if (res?.success) {
      toast.success(editSec ? "Section updated successfully" : "Section created successfully");
      setActiveSecModal(false);
    } else if (res?.error) {
      toast.error(res.error.message || "An error occurred");
    }
  };

  const handleLocSubmit = async (data: any) => {
    setIsPending(true);
    const res = editLoc 
      ? await updateLocation({ id: editLoc.id, ...data })
      : await createLocation(data);
    setIsPending(false);
    
    if (res?.success) {
      toast.success(editLoc ? "Location updated successfully" : "Location created successfully");
      setActiveLocModal(false);
    } else if (res?.error) {
      toast.error(res.error.message || "An error occurred");
    }
  };

  const handleMacSubmit = async (data: any) => {
    setIsPending(true);
    const res = editMac 
      ? await updateMachine({ id: editMac.id, ...data })
      : await createMachine(data);
    setIsPending(false);
    
    if (res?.success) {
      toast.success(editMac ? "Machine updated successfully" : "Machine created successfully");
      setActiveMacModal(false);
    } else if (res?.error) {
      toast.error(res.error.message || "An error occurred");
    }
  };

  return (
    <>
      <Tabs defaultValue="departments" className="w-full">
        <TabsList className="grid w-full grid-cols-4 md:w-[800px] mb-8">
          <TabsTrigger value="departments">
            <Building2 className="w-4 h-4 mr-2" />
            Departments
          </TabsTrigger>
          <TabsTrigger value="sections">
            <GitMerge className="w-4 h-4 mr-2" />
            Sections
          </TabsTrigger>
          <TabsTrigger value="locations">
            <MapPin className="w-4 h-4 mr-2" />
            Locations
          </TabsTrigger>
          <TabsTrigger value="machines">
            <Factory className="w-4 h-4 mr-2" />
            Machines
          </TabsTrigger>
        </TabsList>

        {/* DEPARTMENTS TAB */}
        <TabsContent value="departments" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Departments</CardTitle>
                <CardDescription>Manage the top-level organizational structure of the factory.</CardDescription>
              </div>
              <Button onClick={() => { setEditDept(null); setActiveDeptModal(true); }} className="bg-[#e64132] hover:bg-[#e64132]/90">
                <PlusCircle className="w-4 h-4 mr-2" />
                Add Department
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Sections</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No departments found.
                      </TableCell>
                    </TableRow>
                  )}
                  {departments.map((dept) => (
                    <TableRow key={dept.id}>
                      <TableCell className="font-mono text-xs">{dept.code}</TableCell>
                      <TableCell className="font-medium">{dept.name}</TableCell>
                      <TableCell>{dept._count.sections} Sections</TableCell>
                      <TableCell>
                        <Badge variant={dept.isActive ? "default" : "secondary"}>
                          {dept.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => { setEditDept(dept); setActiveDeptModal(true); }}>
                          <Edit className="w-4 h-4 text-muted-foreground hover:text-primary" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SECTIONS TAB */}
        <TabsContent value="sections" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Production Sections</CardTitle>
                <CardDescription>Manage granular sections under departments.</CardDescription>
              </div>
              <Button onClick={() => { setEditSec(null); setActiveSecModal(true); }} className="bg-[#e64132] hover:bg-[#e64132]/90">
                <PlusCircle className="w-4 h-4 mr-2" />
                Add Section
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Machines</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sections.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No sections found.
                      </TableCell>
                    </TableRow>
                  )}
                  {sections.map((sec) => (
                    <TableRow key={sec.id}>
                      <TableCell className="font-mono text-xs">{sec.code}</TableCell>
                      <TableCell className="font-medium">{sec.name}</TableCell>
                      <TableCell>{sec.department?.name}</TableCell>
                      <TableCell>{sec._count.machines} Machines</TableCell>
                      <TableCell>
                        <Badge variant={sec.isActive ? "default" : "secondary"}>
                          {sec.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => { setEditSec(sec); setActiveSecModal(true); }}>
                          <Edit className="w-4 h-4 text-muted-foreground hover:text-primary" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LOCATIONS TAB */}
        <TabsContent value="locations" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Factory & Storage Locations</CardTitle>
                <CardDescription>Manage physical locations and zones.</CardDescription>
              </div>
              <Button onClick={() => { setEditLoc(null); setActiveLocModal(true); }} className="bg-[#e64132] hover:bg-[#e64132]/90">
                <PlusCircle className="w-4 h-4 mr-2" />
                Add Location
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locations.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No locations found.
                      </TableCell>
                    </TableRow>
                  )}
                  {locations.map((loc) => (
                    <TableRow key={loc.id}>
                      <TableCell className="font-mono text-xs">{loc.code}</TableCell>
                      <TableCell className="font-medium">{loc.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{loc.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={loc.isActive ? "default" : "secondary"}>
                          {loc.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => { setEditLoc(loc); setActiveLocModal(true); }}>
                          <Edit className="w-4 h-4 text-muted-foreground hover:text-primary" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MACHINES TAB */}
        <TabsContent value="machines" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Machine Master Data</CardTitle>
                <CardDescription>Manage factory machinery and equipment.</CardDescription>
              </div>
              <Button onClick={() => { setEditMac(null); setActiveMacModal(true); }} className="bg-[#e64132] hover:bg-[#e64132]/90">
                <PlusCircle className="w-4 h-4 mr-2" />
                Add Machine
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Is Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {machines.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No machines found.
                      </TableCell>
                    </TableRow>
                  )}
                  {machines.map((mac) => (
                    <TableRow key={mac.id}>
                      <TableCell className="font-medium">{mac.name}</TableCell>
                      <TableCell>{mac.section?.name}</TableCell>
                      <TableCell>
                        <Badge variant={mac.status === 'ACTIVE' ? "default" : "destructive"}>
                          {mac.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={mac.isActive ? "default" : "secondary"}>
                          {mac.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => { setEditMac(mac); setActiveMacModal(true); }}>
                          <Edit className="w-4 h-4 text-muted-foreground hover:text-primary" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <DepartmentFormModal 
        isOpen={activeDeptModal} 
        onOpenChange={setActiveDeptModal} 
        entity={editDept} 
        onSubmit={handleDeptSubmit} 
        isPending={isPending} 
      />

      <SectionFormModal 
        isOpen={activeSecModal} 
        onOpenChange={setActiveSecModal} 
        entity={editSec} 
        departments={departments}
        onSubmit={handleSecSubmit} 
        isPending={isPending} 
      />

      <LocationFormModal 
        isOpen={activeLocModal} 
        onOpenChange={setActiveLocModal} 
        entity={editLoc} 
        onSubmit={handleLocSubmit} 
        isPending={isPending} 
      />

      <MachineFormModal 
        isOpen={activeMacModal} 
        onOpenChange={setActiveMacModal} 
        entity={editMac} 
        sections={sections}
        onSubmit={handleMacSubmit} 
        isPending={isPending} 
      />
    </>
  );
}
