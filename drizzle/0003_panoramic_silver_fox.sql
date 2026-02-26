ALTER TABLE "samal-reef_affiliate_invitation" ADD COLUMN "bookingCommissionRate" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "samal-reef_affiliate_link" ADD COLUMN "bookingCommissionRate" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "samal-reef_affiliate_profile" ADD COLUMN "defaultBookingCommissionRate" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "samal-reef_ownership" ADD COLUMN "rmaUrl" varchar(500);--> statement-breakpoint
ALTER TABLE "samal-reef_ownership" ADD COLUMN "isRmaSigned" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "samal-reef_ownership" ADD COLUMN "rmaSignedAt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "samal-reef_ownership" ADD COLUMN "rmaSignerName" varchar(255);--> statement-breakpoint
CREATE INDEX "ownership_rma_signed_idx" ON "samal-reef_ownership" USING btree ("isRmaSigned");