"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface EditNameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditNameDialog({ open, onOpenChange }: EditNameDialogProps) {
  const { data: session, update } = useSession();
  const [name, setName] = useState(session?.user?.name ?? "");

  // Update local state when session changes
  useEffect(() => {
    setName(session?.user?.name ?? "");
  }, [session?.user?.name]);

  const updateName = api.user.updateName.useMutation({
    onSuccess: async () => {
      toast.success("Name updated successfully");
      // Refresh the session to get the updated name
      await update();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update name");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    updateName.mutate({
      name: name.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-cyan-400/30 bg-gradient-to-br from-[#0d1f31]/95 to-[#0a1929]/95 sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-white">Edit Your Name</DialogTitle>
            <DialogDescription className="text-cyan-100/60">
              Update your display name for your account
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-cyan-100">
                Name <span className="text-red-400">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={255}
                className="border-cyan-400/30 bg-[#0a1929]/50 text-white placeholder:text-cyan-100/40"
                disabled={updateName.isPending}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateName.isPending}
              className="border-cyan-400/30 text-cyan-100 hover:bg-cyan-400/10"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateName.isPending}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-600 hover:to-blue-600"
            >
              {updateName.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
