"use client";

import { useState } from "react";
import { api, type RouterOutputs } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Link as LinkIcon,
  Unlink,
  Loader2,
  Building2,
  Wifi,
  AlertTriangle,
} from "lucide-react";

type Unit = RouterOutputs["booking"]["getUnitsForLinking"][number];
type SmoobuApartment = RouterOutputs["booking"]["getSmoobuApartments"][number];

interface SmoobuSettingsClientProps {
  initialUnits: Unit[];
}

export function SmoobuSettingsClient({
  initialUnits,
}: SmoobuSettingsClientProps) {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [selectedApartmentId, setSelectedApartmentId] = useState<string>("");

  const utils = api.useUtils();

  // Get units
  const { data: units, isLoading: unitsLoading } = api.booking.getUnitsForLinking.useQuery(
    undefined,
    {
      initialData: initialUnits,
      refetchInterval: 30000,
    },
  );

  // Get Smoobu apartments
  const { data: smoobuApartments, isLoading: apartmentsLoading } =
    api.booking.getSmoobuApartments.useQuery(undefined, {
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    });

  // Test connection mutation
  const testConnectionMutation = api.booking.testSmoobuConnection.useMutation({
    onSuccess: (result) => {
      if (result.connected) {
        toast.success("Successfully connected to Smoobu!");
      } else {
        toast.error(`Connection failed: ${result.error ?? "Unknown error"}`);
      }
    },
    onError: (error) => {
      toast.error(`Connection test failed: ${error.message}`);
    },
  });

  // Link mutation
  const linkMutation = api.booking.linkUnitToSmoobu.useMutation({
    onSuccess: () => {
      toast.success("Unit linked to Smoobu successfully");
      setLinkDialogOpen(false);
      setSelectedUnit(null);
      setSelectedApartmentId("");
      utils.booking.getUnitsForLinking.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Unlink mutation
  const unlinkMutation = api.booking.unlinkUnitFromSmoobu.useMutation({
    onSuccess: () => {
      toast.success("Unit unlinked from Smoobu");
      utils.booking.getUnitsForLinking.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const openLinkDialog = (unit: Unit) => {
    setSelectedUnit(unit);
    setSelectedApartmentId(unit.smoobuApartmentId?.toString() ?? "");
    setLinkDialogOpen(true);
  };

  const handleLink = () => {
    if (!selectedUnit || !selectedApartmentId) return;
    linkMutation.mutate({
      unitId: selectedUnit.id,
      smoobuApartmentId: parseInt(selectedApartmentId),
    });
  };

  const handleUnlink = (unit: Unit) => {
    unlinkMutation.mutate({ unitId: unit.id });
  };

  // Get available apartments (not already linked)
  const linkedApartmentIds = units
    ?.filter((u) => u.smoobuApartmentId !== null)
    .map((u) => u.smoobuApartmentId) ?? [];

  const availableApartments = smoobuApartments?.filter(
    (apt) =>
      !linkedApartmentIds.includes(apt.id) ||
      apt.id === selectedUnit?.smoobuApartmentId,
  );

  // Stats
  const linkedCount = units?.filter((u) => u.isLinked).length ?? 0;
  const unlinkedCount = units?.filter((u) => !u.isLinked).length ?? 0;

  return (
    <>
      {/* Connection Status */}
      <Card className="border-cyan-500/20 bg-gradient-to-br from-gray-900/80 to-gray-950/80">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">Smoobu Connection</CardTitle>
              <CardDescription>Test and manage your Smoobu API connection</CardDescription>
            </div>
            <Button
              onClick={() => testConnectionMutation.mutate()}
              disabled={testConnectionMutation.isPending}
              variant="outline"
              className="border-cyan-500/30 bg-transparent text-cyan-300 hover:bg-cyan-500/10"
            >
              {testConnectionMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Wifi className="mr-2 h-4 w-4" />
                  Test Connection
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-cyan-100/60">Linked Units</p>
              <p className="text-green-400 font-semibold">{linkedCount}</p>
            </div>
            <div>
              <p className="text-sm text-cyan-100/60">Smoobu Apartments</p>
              <p className="text-cyan-400 font-semibold">
                {apartmentsLoading ? "..." : smoobuApartments?.length ?? 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-green-500/20 bg-gradient-to-br from-gray-900/80 to-gray-950/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-cyan-100/70">
              Linked Units
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <LinkIcon className="h-8 w-8 text-green-400" />
              <span className="text-3xl font-bold text-white">{linkedCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-500/20 bg-gradient-to-br from-gray-900/80 to-gray-950/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-cyan-100/70">
              Unlinked Units
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-yellow-400" />
              <span className="text-3xl font-bold text-white">{unlinkedCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-cyan-500/20 bg-gradient-to-br from-gray-900/80 to-gray-950/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-cyan-100/70">
              Smoobu Apartments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-cyan-400" />
              <span className="text-3xl font-bold text-white">
                {apartmentsLoading ? "..." : smoobuApartments?.length ?? 0}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Units Table */}
      <Card className="border-cyan-500/20 bg-gradient-to-br from-gray-900/80 to-gray-950/80">
        <CardHeader>
          <CardTitle className="text-white">Unit Linking</CardTitle>
          <CardDescription>Link your units to Smoobu apartments for real-time availability</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {unitsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
            </div>
          ) : !units?.length ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Building2 className="mb-3 h-12 w-12 text-cyan-500/50" />
              <p className="text-cyan-100/60">No units found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-cyan-500/20 hover:bg-transparent">
                    <TableHead className="text-cyan-100">Unit</TableHead>
                    <TableHead className="text-cyan-100">Collection</TableHead>
                    <TableHead className="text-cyan-100">Smoobu Apartment</TableHead>
                    <TableHead className="text-cyan-100">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {units.map((unit) => (
                    <TableRow
                      key={unit.id}
                      className="border-cyan-500/10 hover:bg-cyan-500/5"
                    >
                      <TableCell>
                        <span className="font-medium text-white">{unit.name}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-cyan-100/60">{unit.collection.name}</span>
                      </TableCell>
                      <TableCell>
                        {unit.smoobuApartmentId ? (
                          <span className="text-green-400">ID: {unit.smoobuApartmentId}</span>
                        ) : (
                          <span className="text-yellow-400">Not linked</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openLinkDialog(unit)}
                            className="border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10"
                          >
                            <LinkIcon className="mr-1 h-3 w-3" />
                            {unit.isLinked ? "Edit" : "Link"}
                          </Button>
                          {unit.isLinked && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUnlink(unit)}
                              disabled={unlinkMutation.isPending}
                              className="border-red-500/30 text-red-300 hover:bg-red-500/10"
                            >
                              <Unlink className="mr-1 h-3 w-3" />
                              Unlink
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Link Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="border-cyan-500/20 bg-gray-900">
          <DialogHeader>
            <DialogTitle className="text-cyan-100">Link Unit to Smoobu</DialogTitle>
            <DialogDescription>
              Select a Smoobu apartment to link with {selectedUnit?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-cyan-100/60">Smoobu Apartment</label>
              <Select value={selectedApartmentId} onValueChange={setSelectedApartmentId}>
                <SelectTrigger className="mt-1 border-cyan-500/30 bg-gray-900/50">
                  <SelectValue placeholder="Select apartment" />
                </SelectTrigger>
                <SelectContent>
                  {apartmentsLoading ? (
                    <SelectItem value="" disabled>
                      Loading apartments...
                    </SelectItem>
                  ) : availableApartments?.length ? (
                    availableApartments.map((apt) => (
                      <SelectItem key={apt.id} value={apt.id.toString()}>
                        {apt.name} (ID: {apt.id})
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="" disabled>
                      No available apartments
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setLinkDialogOpen(false)}
              disabled={linkMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleLink}
              disabled={!selectedApartmentId || linkMutation.isPending}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
            >
              {linkMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Linking...
                </>
              ) : (
                <>
                  <LinkIcon className="mr-2 h-4 w-4" />
                  Link Unit
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
