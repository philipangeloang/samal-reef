"use client";

import { useState } from "react";
import { api, type RouterOutputs } from "@/trpc/react";
import { siteConfig } from "@/site.config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Loader2,
  CreditCard,
  GripVertical,
  ExternalLink,
} from "lucide-react";

type PaymentMethod = RouterOutputs["manualPayment"]["getAllMethods"][number];

interface PaymentMethodsManagerProps {
  initialMethods: PaymentMethod[];
}

interface MethodFormData {
  id: string;
  name: string;
  instructions: string;
  accountNumber: string;
  accountName: string;
  qrCodeUrl: string;
  isActive: boolean;
  sortOrder: number;
}

const emptyFormData: MethodFormData = {
  id: "",
  name: "",
  instructions: "",
  accountNumber: "",
  accountName: "",
  qrCodeUrl: "",
  isActive: true,
  sortOrder: 0,
};

export function PaymentMethodsManager({
  initialMethods,
}: PaymentMethodsManagerProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [formData, setFormData] = useState<MethodFormData>(emptyFormData);
  const [editingMethodId, setEditingMethodId] = useState<string | null>(null);

  const utils = api.useUtils();

  // Get all payment methods
  const { data: methods, isLoading } = api.manualPayment.getAllMethods.useQuery(
    undefined,
    {
      initialData: initialMethods,
    },
  );

  // Create mutation
  const createMutation = api.manualPayment.createMethod.useMutation({
    onSuccess: () => {
      toast.success("Payment method created successfully");
      setCreateDialogOpen(false);
      setFormData(emptyFormData);
      utils.manualPayment.getAllMethods.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Update mutation
  const updateMutation = api.manualPayment.updateMethod.useMutation({
    onSuccess: () => {
      toast.success("Payment method updated successfully");
      setEditDialogOpen(false);
      setFormData(emptyFormData);
      setEditingMethodId(null);
      utils.manualPayment.getAllMethods.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleCreate = () => {
    if (!formData.id.trim() || !formData.name.trim() || !formData.instructions.trim()) {
      toast.error("ID, Name, and Instructions are required");
      return;
    }

    createMutation.mutate({
      id: formData.id.toLowerCase().replace(/\s+/g, "-"),
      name: formData.name.trim(),
      instructions: formData.instructions.trim(),
      accountNumber: formData.accountNumber.trim() || undefined,
      accountName: formData.accountName.trim() || undefined,
      qrCodeUrl: formData.qrCodeUrl.trim() || undefined,
      isActive: formData.isActive,
      sortOrder: formData.sortOrder,
    });
  };

  const handleUpdate = () => {
    if (!editingMethodId) return;

    updateMutation.mutate({
      id: editingMethodId,
      name: formData.name.trim() || undefined,
      instructions: formData.instructions.trim() || undefined,
      accountNumber: formData.accountNumber.trim() || null,
      accountName: formData.accountName.trim() || null,
      qrCodeUrl: formData.qrCodeUrl.trim() || null,
      isActive: formData.isActive,
      sortOrder: formData.sortOrder,
    });
  };

  const handleToggleActive = (method: PaymentMethod) => {
    updateMutation.mutate({
      id: method.id,
      isActive: !method.isActive,
    });
  };

  const openEditDialog = (method: PaymentMethod) => {
    setEditingMethodId(method.id);
    setFormData({
      id: method.id,
      name: method.name,
      instructions: method.instructions,
      accountNumber: method.accountNumber ?? "",
      accountName: method.accountName ?? "",
      qrCodeUrl: method.qrCodeUrl ?? "",
      isActive: method.isActive,
      sortOrder: method.sortOrder,
    });
    setEditDialogOpen(true);
  };

  const openCreateDialog = () => {
    setFormData({
      ...emptyFormData,
      sortOrder: (methods?.length ?? 0) + 1,
    });
    setCreateDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <>
      <Card className="border-cyan-500/20 bg-gradient-to-br from-gray-900/80 to-gray-950/80">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-cyan-100">
            <CreditCard className="h-5 w-5" />
            Payment Methods
          </CardTitle>
          <Button
            onClick={openCreateDialog}
            className="bg-cyan-600 hover:bg-cyan-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Method
          </Button>
        </CardHeader>
        <CardContent>
          {!methods || methods.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <CreditCard className="mx-auto h-12 w-12 text-cyan-400/50" />
              <p className="mt-4">No payment methods configured</p>
              <p className="text-sm">Add payment methods to enable manual payments</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-cyan-500/20">
                  <TableHead className="w-12 text-cyan-100/70">#</TableHead>
                  <TableHead className="text-cyan-100/70">ID</TableHead>
                  <TableHead className="text-cyan-100/70">Name</TableHead>
                  <TableHead className="text-cyan-100/70">Account</TableHead>
                  <TableHead className="text-cyan-100/70">QR Code</TableHead>
                  <TableHead className="text-cyan-100/70">Status</TableHead>
                  <TableHead className="text-cyan-100/70">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {methods.map((method) => (
                  <TableRow key={method.id} className="border-cyan-500/10">
                    <TableCell className="text-gray-400">
                      <GripVertical className="h-4 w-4" />
                      <span className="ml-1">{method.sortOrder}</span>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-cyan-100">
                      {method.id}
                    </TableCell>
                    <TableCell className="text-cyan-100">
                      {method.name}
                    </TableCell>
                    <TableCell>
                      {method.accountNumber ? (
                        <div>
                          <p className="text-cyan-100/80">{method.accountNumber}</p>
                          {method.accountName && (
                            <p className="text-xs text-gray-400">{method.accountName}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {method.qrCodeUrl ? (
                        <a
                          href={method.qrCodeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm text-cyan-400 hover:text-cyan-300"
                        >
                          View <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={method.isActive ? "default" : "secondary"}
                        className={
                          method.isActive
                            ? "bg-green-500/20 text-green-400"
                            : "bg-gray-500/20 text-gray-400"
                        }
                      >
                        {method.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(method)}
                          className="text-cyan-400 hover:text-cyan-300"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Switch
                          checked={method.isActive}
                          onCheckedChange={() => handleToggleActive(method)}
                          disabled={updateMutation.isPending}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Method Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg border-cyan-500/20 bg-gray-900">
          <DialogHeader>
            <DialogTitle className="text-cyan-100">
              Add Payment Method
            </DialogTitle>
            <DialogDescription>
              Create a new manual payment method that users can select
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-id" className="text-cyan-100/70">
                  ID (unique identifier)
                </Label>
                <Input
                  id="create-id"
                  placeholder="e.g., gcash, maya, bdo"
                  value={formData.id}
                  onChange={(e) =>
                    setFormData({ ...formData, id: e.target.value })
                  }
                  className="border-gray-700 bg-gray-800"
                />
                <p className="text-xs text-gray-500">
                  Lowercase, no spaces. Use dashes or underscores.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-name" className="text-cyan-100/70">
                  Display Name
                </Label>
                <Input
                  id="create-name"
                  placeholder="e.g., GCash"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="border-gray-700 bg-gray-800"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-instructions" className="text-cyan-100/70">
                Instructions (Markdown supported)
              </Label>
              <Textarea
                id="create-instructions"
                placeholder="Step-by-step payment instructions..."
                value={formData.instructions}
                onChange={(e) =>
                  setFormData({ ...formData, instructions: e.target.value })
                }
                className="min-h-[120px] border-gray-700 bg-gray-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-account-number" className="text-cyan-100/70">
                  Account Number (optional)
                </Label>
                <Input
                  id="create-account-number"
                  placeholder="e.g., 0917-123-4567"
                  value={formData.accountNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, accountNumber: e.target.value })
                  }
                  className="border-gray-700 bg-gray-800"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-account-name" className="text-cyan-100/70">
                  Account Name (optional)
                </Label>
                <Input
                  id="create-account-name"
                  placeholder={`e.g., ${siteConfig.brand.name} Inc.`}
                  value={formData.accountName}
                  onChange={(e) =>
                    setFormData({ ...formData, accountName: e.target.value })
                  }
                  className="border-gray-700 bg-gray-800"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-qr" className="text-cyan-100/70">
                QR Code URL (optional)
              </Label>
              <Input
                id="create-qr"
                placeholder="https://..."
                value={formData.qrCodeUrl}
                onChange={(e) =>
                  setFormData({ ...formData, qrCodeUrl: e.target.value })
                }
                className="border-gray-700 bg-gray-800"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg bg-gray-800/50 p-4">
              <div>
                <Label className="text-cyan-100/70">Active</Label>
                <p className="text-xs text-gray-500">
                  Inactive methods won&apos;t be shown to users
                </p>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false);
                setFormData(emptyFormData);
              }}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Method
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Method Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg border-cyan-500/20 bg-gray-900">
          <DialogHeader>
            <DialogTitle className="text-cyan-100">
              Edit Payment Method
            </DialogTitle>
            <DialogDescription>
              Update the payment method details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-cyan-100/70">ID</Label>
              <Input
                value={formData.id}
                disabled
                className="border-gray-700 bg-gray-800/50 text-gray-400"
              />
              <p className="text-xs text-gray-500">
                ID cannot be changed after creation
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-name" className="text-cyan-100/70">
                Display Name
              </Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="border-gray-700 bg-gray-800"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-instructions" className="text-cyan-100/70">
                Instructions (Markdown supported)
              </Label>
              <Textarea
                id="edit-instructions"
                value={formData.instructions}
                onChange={(e) =>
                  setFormData({ ...formData, instructions: e.target.value })
                }
                className="min-h-[120px] border-gray-700 bg-gray-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-account-number" className="text-cyan-100/70">
                  Account Number
                </Label>
                <Input
                  id="edit-account-number"
                  value={formData.accountNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, accountNumber: e.target.value })
                  }
                  className="border-gray-700 bg-gray-800"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-account-name" className="text-cyan-100/70">
                  Account Name
                </Label>
                <Input
                  id="edit-account-name"
                  value={formData.accountName}
                  onChange={(e) =>
                    setFormData({ ...formData, accountName: e.target.value })
                  }
                  className="border-gray-700 bg-gray-800"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-qr" className="text-cyan-100/70">
                QR Code URL
              </Label>
              <Input
                id="edit-qr"
                value={formData.qrCodeUrl}
                onChange={(e) =>
                  setFormData({ ...formData, qrCodeUrl: e.target.value })
                }
                className="border-gray-700 bg-gray-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-sort" className="text-cyan-100/70">
                  Sort Order
                </Label>
                <Input
                  id="edit-sort"
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) =>
                    setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })
                  }
                  className="border-gray-700 bg-gray-800"
                />
              </div>
              <div className="flex items-center justify-between rounded-lg bg-gray-800/50 p-4">
                <Label className="text-cyan-100/70">Active</Label>
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                setFormData(emptyFormData);
                setEditingMethodId(null);
              }}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={updateMutation.isPending}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Pencil className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
