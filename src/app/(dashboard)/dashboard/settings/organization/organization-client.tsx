"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Building2, MapPin, Factory } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type Props = {
  departments: any[];
  sections: any[];
  locations: any[];
  machines: any[];
};

export function OrganizationClient({ departments, sections, locations, machines }: Props) {
  return (
    <Tabs defaultValue="departments" className="w-full">
      <TabsList className="grid w-full grid-cols-3 md:w-[600px] mb-8">
        <TabsTrigger value="departments">
          <Building2 className="w-4 h-4 mr-2" />
          Departments
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
              <CardTitle>Departments & Sections</CardTitle>
              <CardDescription>Manage the organizational structure of the factory.</CardDescription>
            </div>
            <Button className="bg-[#e64132] hover:bg-[#e64132]/90">
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
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
            <Button className="bg-[#e64132] hover:bg-[#e64132]/90">
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
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
            <Button className="bg-[#e64132] hover:bg-[#e64132]/90">
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {machines.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No machines found.
                    </TableCell>
                  </TableRow>
                )}
                {machines.map((mac) => (
                  <TableRow key={mac.id}>
                    <TableCell className="font-medium">{mac.name}</TableCell>
                    <TableCell>{mac.section.name}</TableCell>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

    </Tabs>
  );
}
