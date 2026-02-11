"use client";

import { useState } from "react";
import { api, type RouterOutputs } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, Eye } from "lucide-react";
import Link from "next/link";
import { CreateUnitDialog } from "./create-unit-dialog";
import { EditUnitDialog } from "./edit-unit-dialog";
import { DeleteUnitDialog } from "./delete-unit-dialog";

type Unit = RouterOutputs["units"]["getAll"][number];

interface UnitsManagementClientProps {
  initialUnits: Unit[];
}

export function UnitsManagementClient({ initialUnits }: UnitsManagementClientProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [deletingUnit, setDeletingUnit] = useState<Unit | null>(null);
  const [collectionFilter, setCollectionFilter] = useState<string>("all");

  const { data: units = initialUnits } = api.units.getAll.useQuery(undefined, {
    initialData: initialUnits,
    refetchOnMount: false,
  });

  const { data: collections = [] } = api.collection.getAll.useQuery();

  // Filter units by collection
  const filteredUnits =
    collectionFilter === "all"
      ? units
      : units.filter((unit) => unit.collectionId.toString() === collectionFilter);

  const getStatusBadge = (status: Unit["status"]) => {
    const colors = {
      AVAILABLE: "bg-green-400/20 text-green-300",
      SOLD_OUT: "bg-gray-400/20 text-gray-300",
      DRAFT: "bg-orange-400/20 text-orange-300",
    } as const;

    return (
      <Badge className={colors[status]}>
        {status.replace("_", " ")}
      </Badge>
    );
  };

  return (
    <>
      <Card className="border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">Property Units</CardTitle>
              <CardDescription className="text-cyan-100/60">
                {filteredUnits.length} of {units.length} units
              </CardDescription>
            </div>
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="border-cyan-400/30 bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400/20"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Unit
            </Button>
          </div>

          {/* Filter Section */}
          <div className="mt-4 flex items-center gap-3">
            <Select
              value={collectionFilter}
              onValueChange={setCollectionFilter}
            >
              <SelectTrigger className="w-[250px] border-cyan-400/30 bg-[#0a1929]/50 text-cyan-100">
                <SelectValue placeholder="Filter by collection" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Collections</SelectItem>
                {collections.map((collection) => (
                  <SelectItem key={collection.id} value={collection.id.toString()}>
                    {collection.name} ({collection.slug})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {collectionFilter !== "all" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCollectionFilter("all")}
                className="text-cyan-300 hover:bg-cyan-400/20 hover:text-cyan-200"
              >
                Clear Filter
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border border-cyan-400/20">
            <Table>
              <TableHeader>
                <TableRow className="border-cyan-400/20 bg-[#0a1929]/50 hover:bg-[#0a1929]/70">
                  <TableHead className="text-cyan-100">Name</TableHead>
                  <TableHead className="text-cyan-100">Status</TableHead>
                  <TableHead className="text-cyan-100">Availability</TableHead>
                  <TableHead className="text-cyan-100">Created</TableHead>
                  <TableHead className="text-right text-cyan-100">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUnits.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-cyan-100/60">
                      {units.length === 0
                        ? "No units found. Create your first unit to get started."
                        : "No units match the selected filter."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUnits.map((unit) => (
                    <TableRow
                      key={unit.id}
                      className="border-cyan-400/10 transition-colors hover:bg-cyan-400/5"
                    >
                      <TableCell>
                        <div>
                          <div className="font-medium text-white">{unit.name}</div>
                          {unit.description && (
                            <div className="line-clamp-1 text-sm text-cyan-100/60">
                              {unit.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(unit.status)}</TableCell>
                      <TableCell>
                        <div className="text-sm text-cyan-100/70">
                          {(unit.availablePercentage / 100).toFixed(0)}% available
                        </div>
                        <div className="text-xs text-cyan-100/50">
                          {(unit.totalOwned / 100).toFixed(0)}% owned
                        </div>
                      </TableCell>
                      <TableCell className="text-cyan-100/70">
                        {new Date(unit.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/dashboard/admin/units/${unit.id}`}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-blue-300 hover:bg-blue-400/20 hover:text-blue-200"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingUnit(unit)}
                            className="text-cyan-300 hover:bg-cyan-400/20 hover:text-cyan-200"
                            title="Edit Unit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingUnit(unit)}
                            className="text-red-400 hover:bg-red-400/20 hover:text-red-300"
                            title="Delete Unit"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <CreateUnitDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      {editingUnit && (
        <EditUnitDialog
          unit={editingUnit}
          open={!!editingUnit}
          onOpenChange={(open) => !open && setEditingUnit(null)}
        />
      )}

      {deletingUnit && (
        <DeleteUnitDialog
          unit={deletingUnit}
          open={!!deletingUnit}
          onOpenChange={(open) => !open && setDeletingUnit(null)}
        />
      )}
    </>
  );
}
