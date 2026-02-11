"use client";

import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface Unit {
  id: number;
  name: string;
  totalOwned: number;
}

interface DeleteUnitDialogProps {
  unit: Unit;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteUnitDialog({
  unit,
  open,
  onOpenChange,
}: DeleteUnitDialogProps) {
  const utils = api.useUtils();

  const deleteUnit = api.units.delete.useMutation({
    onSuccess: async () => {
      toast.success("Unit deleted successfully");
      await utils.units.invalidate();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete unit");
    },
  });

  const hasOwnerships = unit.totalOwned > 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Unit</AlertDialogTitle>
          <AlertDialogDescription>
            {hasOwnerships ? (
              <>
                <strong className="text-red-600">
                  Cannot delete this unit.
                </strong>
                <br />
                <br />
                &quot;{unit.name}&quot; has existing ownerships (
                {(unit.totalOwned / 100).toFixed(2)}% owned). Units with
                ownerships cannot be deleted to maintain data integrity.
              </>
            ) : (
              <>
                Are you sure you want to delete{" "}
                <strong>&quot;{unit.name}&quot;</strong>? This action cannot be
                undone.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {!hasOwnerships && (
            <Button
              variant="destructive"
              onClick={() => deleteUnit.mutate({ id: unit.id })}
              disabled={deleteUnit.isPending}
            >
              {deleteUnit.isPending ? "Deleting..." : "Delete"}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
