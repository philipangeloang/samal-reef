"use client";

import { useState, useEffect } from "react";
import { api, type RouterOutputs } from "@/trpc/react";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Loader2 } from "lucide-react";

type Collection = RouterOutputs["collection"]["getAll"][number];

const conditionTypeLabels: Record<string, string> = {
  ALWAYS: "Always",
  MIN_NIGHTS: "Min. Nights",
  DATE_RANGE: "Date Range",
  WEEKEND: "Weekend Check-in",
};

interface EditCollectionDialogProps {
  collection: Collection;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditCollectionDialog({
  collection,
  open,
  onOpenChange,
}: EditCollectionDialogProps) {
  // General fields
  const [name, setName] = useState(collection.name);
  const [slug, setSlug] = useState(collection.slug);
  const [description, setDescription] = useState(collection.description ?? "");
  const [imageUrl, setImageUrl] = useState(collection.imageUrl ?? "");
  const [location, setLocation] = useState(collection.location ?? "");
  const [isActive, setIsActive] = useState(collection.isActive);
  const [displayOrder, setDisplayOrder] = useState(collection.displayOrder.toString());

  // Booking pricing fields
  const [bookingPricePerNight, setBookingPricePerNight] = useState(
    collection.bookingPricePerNight ?? ""
  );
  const [bookingCleaningFee, setBookingCleaningFee] = useState(
    collection.bookingCleaningFee ?? "50.00"
  );
  const [bookingServiceFeePercent, setBookingServiceFeePercent] = useState(
    collection.bookingServiceFeePercent ?? "10.00"
  );
  const [bookingMinNights, setBookingMinNights] = useState(
    (collection.bookingMinNights ?? 1).toString()
  );
  const [bookingMaxGuests, setBookingMaxGuests] = useState(
    (collection.bookingMaxGuests ?? 6).toString()
  );

  // Add discount form state
  const [showAddDiscount, setShowAddDiscount] = useState(false);
  const [newDiscountLabel, setNewDiscountLabel] = useState("");
  const [newDiscountPercent, setNewDiscountPercent] = useState("");
  const [newConditionType, setNewConditionType] = useState<string>("ALWAYS");
  const [newMinNights, setNewMinNights] = useState("");
  const [newDateStart, setNewDateStart] = useState("");
  const [newDateEnd, setNewDateEnd] = useState("");

  useEffect(() => {
    setName(collection.name);
    setSlug(collection.slug);
    setDescription(collection.description ?? "");
    setImageUrl(collection.imageUrl ?? "");
    setLocation(collection.location ?? "");
    setIsActive(collection.isActive);
    setDisplayOrder(collection.displayOrder.toString());
    // Booking pricing
    setBookingPricePerNight(collection.bookingPricePerNight ?? "");
    setBookingCleaningFee(collection.bookingCleaningFee ?? "50.00");
    setBookingServiceFeePercent(collection.bookingServiceFeePercent ?? "10.00");
    setBookingMinNights((collection.bookingMinNights ?? 1).toString());
    setBookingMaxGuests((collection.bookingMaxGuests ?? 6).toString());
  }, [collection]);

  const utils = api.useUtils();

  // Fetch discounts for this collection
  const { data: discounts = [], isLoading: discountsLoading } =
    api.collection.getDiscounts.useQuery(
      { collectionId: collection.id },
      { enabled: open },
    );

  const updateCollection = api.collection.update.useMutation({
    onSuccess: async () => {
      toast.success("Collection updated successfully");
      await utils.collection.invalidate();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update collection");
    },
  });

  const addDiscountMutation = api.collection.addDiscount.useMutation({
    onSuccess: () => {
      toast.success("Discount added");
      utils.collection.getDiscounts.invalidate({ collectionId: collection.id });
      resetAddForm();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteDiscountMutation = api.collection.deleteDiscount.useMutation({
    onSuccess: () => {
      toast.success("Discount removed");
      utils.collection.getDiscounts.invalidate({ collectionId: collection.id });
    },
    onError: (error) => toast.error(error.message),
  });

  const toggleDiscountMutation = api.collection.updateDiscount.useMutation({
    onSuccess: () => {
      utils.collection.getDiscounts.invalidate({ collectionId: collection.id });
    },
    onError: (error) => toast.error(error.message),
  });

  const resetAddForm = () => {
    setShowAddDiscount(false);
    setNewDiscountLabel("");
    setNewDiscountPercent("");
    setNewConditionType("ALWAYS");
    setNewMinNights("");
    setNewDateStart("");
    setNewDateEnd("");
  };

  const handleAddDiscount = () => {
    if (!newDiscountLabel.trim()) {
      toast.error("Discount label is required");
      return;
    }
    if (!newDiscountPercent.trim() || parseFloat(newDiscountPercent) <= 0) {
      toast.error("Discount percent must be greater than 0");
      return;
    }

    let conditionValue: string | null = null;
    if (newConditionType === "MIN_NIGHTS") {
      if (!newMinNights || parseInt(newMinNights) <= 0) {
        toast.error("Minimum nights must be greater than 0");
        return;
      }
      conditionValue = JSON.stringify({ minNights: parseInt(newMinNights) });
    } else if (newConditionType === "DATE_RANGE") {
      if (!newDateStart || !newDateEnd) {
        toast.error("Start and end dates are required");
        return;
      }
      conditionValue = JSON.stringify({ startDate: newDateStart, endDate: newDateEnd });
    }

    addDiscountMutation.mutate({
      collectionId: collection.id,
      label: newDiscountLabel.trim(),
      percent: newDiscountPercent.trim(),
      conditionType: newConditionType as "ALWAYS" | "MIN_NIGHTS" | "DATE_RANGE" | "WEEKEND",
      conditionValue,
    });
  };

  const getConditionDescription = (
    type: string,
    value: string | null,
  ): string => {
    switch (type) {
      case "ALWAYS":
        return "All bookings";
      case "MIN_NIGHTS": {
        const v = value ? (JSON.parse(value) as { minNights: number }) : null;
        return v ? `${v.minNights}+ nights` : "Min nights";
      }
      case "DATE_RANGE": {
        const v = value
          ? (JSON.parse(value) as { startDate: string; endDate: string })
          : null;
        return v ? `${v.startDate} to ${v.endDate}` : "Date range";
      }
      case "WEEKEND":
        return "Fri/Sat check-in";
      default:
        return type;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Collection name is required");
      return;
    }

    if (!slug.trim()) {
      toast.error("Slug is required");
      return;
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      toast.error("Slug must contain only lowercase letters, numbers, and hyphens");
      return;
    }

    updateCollection.mutate({
      id: collection.id,
      name: name.trim(),
      slug: slug.trim(),
      description: description.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
      location: location.trim() || undefined,
      isActive,
      displayOrder: parseInt(displayOrder) || 0,
      // Booking pricing
      bookingPricePerNight: bookingPricePerNight.trim() || null,
      bookingCleaningFee: bookingCleaningFee.trim() || null,
      bookingServiceFeePercent: bookingServiceFeePercent.trim() || null,
      bookingMinNights: parseInt(bookingMinNights) || null,
      bookingMaxGuests: parseInt(bookingMaxGuests) || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-cyan-400/30 bg-linear-to-br from-[#0d1f31]/95 to-[#0a1929]/95 sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-white">Edit Collection</DialogTitle>
            <DialogDescription className="text-cyan-100/60">
              Update collection details and booking pricing
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="general" className="mt-4">
            <TabsList className="grid w-full grid-cols-3 bg-[#0a1929]/50">
              <TabsTrigger value="general" className="data-[state=active]:bg-cyan-500/20">
                General
              </TabsTrigger>
              <TabsTrigger value="booking" className="data-[state=active]:bg-cyan-500/20">
                Pricing
              </TabsTrigger>
              <TabsTrigger value="discounts" className="data-[state=active]:bg-cyan-500/20">
                Discounts
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="mt-4 space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name" className="text-cyan-100">
                  Collection Name <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="edit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Reef Resort Bungalows"
                  required
                  className="border-cyan-400/30 bg-[#0a1929]/50 text-white placeholder:text-cyan-100/40"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-slug" className="text-cyan-100">
                  URL Slug <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="edit-slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="reef-resort-bungalows"
                  required
                  className="border-cyan-400/30 bg-[#0a1929]/50 font-mono text-white placeholder:text-cyan-100/40"
                />
                <p className="text-xs text-cyan-100/60">
                  Used in URLs. Lowercase letters, numbers, and hyphens only.
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-location" className="text-cyan-100">
                  Location
                </Label>
                <Input
                  id="edit-location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Roatan, Honduras"
                  className="border-cyan-400/30 bg-[#0a1929]/50 text-white placeholder:text-cyan-100/40"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-description" className="text-cyan-100">
                  Description
                </Label>
                <Textarea
                  id="edit-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Luxurious beachfront properties with stunning ocean views..."
                  rows={3}
                  className="border-cyan-400/30 bg-[#0a1929]/50 text-white placeholder:text-cyan-100/40"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-imageUrl" className="text-cyan-100">
                  Hero Image URL
                </Label>
                <Input
                  id="edit-imageUrl"
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="border-cyan-400/30 bg-[#0a1929]/50 text-white placeholder:text-cyan-100/40"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-displayOrder" className="text-cyan-100">
                  Display Order
                </Label>
                <Input
                  id="edit-displayOrder"
                  type="number"
                  min="0"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(e.target.value)}
                  placeholder="0"
                  className="border-cyan-400/30 bg-[#0a1929]/50 text-white placeholder:text-cyan-100/40"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-isActive"
                  checked={isActive}
                  onCheckedChange={(checked) => setIsActive(checked === true)}
                  className="border-cyan-400/30"
                />
                <Label htmlFor="edit-isActive" className="text-cyan-100">
                  Active (visible on frontend)
                </Label>
              </div>
            </TabsContent>

            <TabsContent value="booking" className="mt-4 space-y-4">
              <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-3">
                <p className="text-sm text-cyan-100/70">
                  Set pricing for guests booking stays at this property. Leave empty to disable bookings.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="edit-pricePerNight" className="text-cyan-100">
                    Price Per Night (PHP)
                  </Label>
                  <Input
                    id="edit-pricePerNight"
                    type="number"
                    step="0.01"
                    min="0"
                    value={bookingPricePerNight}
                    onChange={(e) => setBookingPricePerNight(e.target.value)}
                    placeholder="150.00"
                    className="border-cyan-400/30 bg-[#0a1929]/50 text-white placeholder:text-cyan-100/40"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="edit-cleaningFee" className="text-cyan-100">
                    Cleaning Fee (PHP)
                  </Label>
                  <Input
                    id="edit-cleaningFee"
                    type="number"
                    step="0.01"
                    min="0"
                    value={bookingCleaningFee}
                    onChange={(e) => setBookingCleaningFee(e.target.value)}
                    placeholder="50.00"
                    className="border-cyan-400/30 bg-[#0a1929]/50 text-white placeholder:text-cyan-100/40"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="edit-serviceFee" className="text-cyan-100">
                    Service Fee (%)
                  </Label>
                  <Input
                    id="edit-serviceFee"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={bookingServiceFeePercent}
                    onChange={(e) => setBookingServiceFeePercent(e.target.value)}
                    placeholder="10.00"
                    className="border-cyan-400/30 bg-[#0a1929]/50 text-white placeholder:text-cyan-100/40"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="edit-minNights" className="text-cyan-100">
                    Minimum Nights
                  </Label>
                  <Input
                    id="edit-minNights"
                    type="number"
                    min="1"
                    value={bookingMinNights}
                    onChange={(e) => setBookingMinNights(e.target.value)}
                    placeholder="1"
                    className="border-cyan-400/30 bg-[#0a1929]/50 text-white placeholder:text-cyan-100/40"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="edit-maxGuests" className="text-cyan-100">
                    Maximum Guests
                  </Label>
                  <Input
                    id="edit-maxGuests"
                    type="number"
                    min="1"
                    value={bookingMaxGuests}
                    onChange={(e) => setBookingMaxGuests(e.target.value)}
                    placeholder="6"
                    className="border-cyan-400/30 bg-[#0a1929]/50 text-white placeholder:text-cyan-100/40"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="discounts" className="mt-4 space-y-4">
              <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-3">
                <p className="text-sm text-cyan-100/70">
                  Add conditional discounts. Same condition type: best wins. Different types: stack additively.
                </p>
              </div>

              {/* Existing discounts list */}
              {discountsLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
                </div>
              ) : discounts.length === 0 ? (
                <p className="py-4 text-center text-sm text-cyan-100/50">
                  No discounts configured yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {discounts.map((d) => (
                    <div
                      key={d.id}
                      className={`flex items-center justify-between rounded-lg border p-3 ${
                        d.isActive
                          ? "border-green-500/30 bg-green-500/5"
                          : "border-cyan-400/10 bg-cyan-400/5 opacity-60"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">{d.label}</span>
                          <Badge className="bg-green-500/20 text-green-300 text-xs">
                            {parseFloat(d.percent)}% OFF
                          </Badge>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-cyan-100/50">
                          <Badge variant="outline" className="border-cyan-400/20 text-cyan-300/70 text-xs">
                            {conditionTypeLabels[d.conditionType] ?? d.conditionType}
                          </Badge>
                          <span>{getConditionDescription(d.conditionType, d.conditionValue)}</span>
                        </div>
                      </div>
                      <div className="ml-3 flex items-center gap-1.5">
                        <Checkbox
                          checked={d.isActive}
                          onCheckedChange={(checked) =>
                            toggleDiscountMutation.mutate({
                              id: d.id,
                              isActive: checked === true,
                            })
                          }
                          className="border-cyan-400/30"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteDiscountMutation.mutate({ id: d.id })}
                          disabled={deleteDiscountMutation.isPending}
                          className="h-8 w-8 p-0 text-red-400 hover:bg-red-400/10 hover:text-red-300"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add discount form */}
              {showAddDiscount ? (
                <div className="space-y-3 rounded-lg border border-cyan-400/20 bg-[#0a1929]/50 p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                      <Label className="text-xs text-cyan-100">Label</Label>
                      <Input
                        value={newDiscountLabel}
                        onChange={(e) => setNewDiscountLabel(e.target.value)}
                        placeholder="Early Bird Special"
                        className="border-cyan-400/30 bg-[#0a1929]/50 text-white placeholder:text-cyan-100/40"
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs text-cyan-100">Discount (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={newDiscountPercent}
                        onChange={(e) => setNewDiscountPercent(e.target.value)}
                        placeholder="15.00"
                        className="border-cyan-400/30 bg-[#0a1929]/50 text-white placeholder:text-cyan-100/40"
                      />
                    </div>
                  </div>

                  <div className="grid gap-1.5">
                    <Label className="text-xs text-cyan-100">Condition</Label>
                    <Select value={newConditionType} onValueChange={setNewConditionType}>
                      <SelectTrigger className="border-cyan-400/30 bg-[#0a1929]/50 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALWAYS">Always (no condition)</SelectItem>
                        <SelectItem value="MIN_NIGHTS">Minimum nights stay</SelectItem>
                        <SelectItem value="DATE_RANGE">Date range</SelectItem>
                        <SelectItem value="WEEKEND">Weekend check-in (Fri/Sat)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Conditional fields */}
                  {newConditionType === "MIN_NIGHTS" && (
                    <div className="grid gap-1.5">
                      <Label className="text-xs text-cyan-100">Minimum nights</Label>
                      <Input
                        type="number"
                        min="1"
                        value={newMinNights}
                        onChange={(e) => setNewMinNights(e.target.value)}
                        placeholder="7"
                        className="border-cyan-400/30 bg-[#0a1929]/50 text-white placeholder:text-cyan-100/40"
                      />
                    </div>
                  )}

                  {newConditionType === "DATE_RANGE" && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="grid gap-1.5">
                        <Label className="text-xs text-cyan-100">Start date</Label>
                        <Input
                          type="date"
                          value={newDateStart}
                          onChange={(e) => setNewDateStart(e.target.value)}
                          className="border-cyan-400/30 bg-[#0a1929]/50 text-white"
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label className="text-xs text-cyan-100">End date</Label>
                        <Input
                          type="date"
                          value={newDateEnd}
                          onChange={(e) => setNewDateEnd(e.target.value)}
                          className="border-cyan-400/30 bg-[#0a1929]/50 text-white"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={resetAddForm}
                      className="text-cyan-100/70"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddDiscount}
                      disabled={addDiscountMutation.isPending}
                      className="bg-cyan-500 text-white hover:bg-cyan-600"
                    >
                      {addDiscountMutation.isPending ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : null}
                      Add
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddDiscount(true)}
                  className="w-full border-dashed border-cyan-400/30 text-cyan-300 hover:bg-cyan-400/10"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Discount
                </Button>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-cyan-400/30 text-cyan-100 hover:bg-cyan-400/10"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateCollection.isPending}
              className="bg-linear-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-600 hover:to-blue-600"
            >
              {updateCollection.isPending ? "Updating..." : "Update Collection"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
