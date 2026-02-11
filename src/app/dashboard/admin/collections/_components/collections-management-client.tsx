"use client";

import { useState } from "react";
import { api, type RouterOutputs } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, ToggleLeft, ToggleRight } from "lucide-react";
import { CreateCollectionDialog } from "./create-collection-dialog";
import { EditCollectionDialog } from "./edit-collection-dialog";
import { DeleteCollectionDialog } from "./delete-collection-dialog";

type Collection = RouterOutputs["collection"]["getAll"][number];

interface CollectionsManagementClientProps {
  initialCollections: Collection[];
}

export function CollectionsManagementClient({
  initialCollections,
}: CollectionsManagementClientProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [deletingCollection, setDeletingCollection] = useState<Collection | null>(null);

  const { data: collections = initialCollections } = api.collection.getAll.useQuery(
    undefined,
    {
      initialData: initialCollections,
      refetchOnMount: false,
    },
  );

  const utils = api.useUtils();

  const toggleActive = api.collection.toggleActive.useMutation({
    onSuccess: async () => {
      toast.success("Collection status updated");
      await utils.collection.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update status");
    },
  });

  const handleToggleActive = (id: number) => {
    toggleActive.mutate({ id });
  };

  const getStatusBadge = (isActive: boolean) => {
    return (
      <Badge className={isActive ? "bg-green-400/20 text-green-300" : "bg-gray-400/20 text-gray-300"}>
        {isActive ? "Active" : "Inactive"}
      </Badge>
    );
  };

  return (
    <>
      <Card className="border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">Property Collections</CardTitle>
              <CardDescription className="text-cyan-100/60">
                {collections.length} total collection(s)
              </CardDescription>
            </div>
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="border-cyan-400/30 bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400/20"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Collection
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border border-cyan-400/20">
            <Table>
              <TableHeader>
                <TableRow className="border-cyan-400/20 bg-[#0a1929]/50 hover:bg-[#0a1929]/70">
                  <TableHead className="text-cyan-100">Name</TableHead>
                  <TableHead className="text-cyan-100">Slug</TableHead>
                  <TableHead className="text-cyan-100">Location</TableHead>
                  <TableHead className="text-cyan-100">Units</TableHead>
                  <TableHead className="text-cyan-100">Pricing Tiers</TableHead>
                  <TableHead className="text-cyan-100">Status</TableHead>
                  <TableHead className="text-right text-cyan-100">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {collections.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-cyan-100/60">
                      No collections found. Create your first collection to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  collections.map((collection) => (
                    <TableRow
                      key={collection.id}
                      className="border-cyan-400/10 transition-colors hover:bg-cyan-400/5"
                    >
                      <TableCell className="font-medium text-white">
                        {collection.name}
                      </TableCell>
                      <TableCell>
                        <code className="rounded bg-cyan-400/10 px-2 py-1 text-xs text-cyan-300">
                          {collection.slug}
                        </code>
                      </TableCell>
                      <TableCell className="text-cyan-100/70">
                        {collection.location || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-blue-400/20 text-blue-300">
                          {collection.unitCount}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-purple-400/20 text-purple-300">
                          {collection.pricingTierCount}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(collection.isActive)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleActive(collection.id)}
                            disabled={toggleActive.isPending}
                            className="text-cyan-300 hover:bg-cyan-400/20 hover:text-cyan-200"
                            title={collection.isActive ? "Deactivate" : "Activate"}
                          >
                            {collection.isActive ? (
                              <ToggleRight className="h-4 w-4" />
                            ) : (
                              <ToggleLeft className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingCollection(collection)}
                            className="text-cyan-300 hover:bg-cyan-400/20 hover:text-cyan-200"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingCollection(collection)}
                            className="text-red-400 hover:bg-red-400/20 hover:text-red-300"
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

      <CreateCollectionDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      {editingCollection && (
        <EditCollectionDialog
          collection={editingCollection}
          open={!!editingCollection}
          onOpenChange={(open) => !open && setEditingCollection(null)}
        />
      )}

      {deletingCollection && (
        <DeleteCollectionDialog
          collection={deletingCollection}
          open={!!deletingCollection}
          onOpenChange={(open) => !open && setDeletingCollection(null)}
        />
      )}
    </>
  );
}
