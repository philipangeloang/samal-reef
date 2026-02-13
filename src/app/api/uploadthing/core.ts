import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { ownerships } from "@/server/db/schema";
import { eq } from "drizzle-orm";

const f = createUploadthing();

/**
 * UploadThing File Router
 * Handles MOA document uploads with security checks
 */
export const ourFileRouter = {
  /**
   * MOA Document Uploader
   * - Only authenticated investors can upload
   * - User must own the ownership they're uploading for
   * - Max file size: 10MB
   * - Only PDF files allowed
   */
  moaUploader: f({
    pdf: {
      maxFileSize: "8MB",
      maxFileCount: 1,
    },
  })
    // Verify user is authenticated and owns the ownership
    .middleware(async ({ req }) => {
      const session = await auth();

      // Check if user is authenticated
      if (!session?.user) {
        throw new UploadThingError("Unauthorized");
      }

      // Get ownershipId from request metadata
      const ownershipIdStr = req.headers.get("x-ownership-id");
      if (!ownershipIdStr) {
        throw new UploadThingError("Ownership ID is required");
      }

      const ownershipId = parseInt(ownershipIdStr, 10);
      if (isNaN(ownershipId)) {
        throw new UploadThingError("Invalid ownership ID");
      }

      // Verify ownership belongs to user
      const ownership = await db.query.ownerships.findFirst({
        where: eq(ownerships.id, ownershipId),
      });

      if (!ownership) {
        throw new UploadThingError("Ownership not found");
      }

      if (ownership.userId !== session.user.id) {
        throw new UploadThingError("You don't own this ownership");
      }

      // Check if MOA is already signed
      if (ownership.isSigned) {
        throw new UploadThingError("MOA is already signed for this ownership");
      }

      // Pass metadata to onUploadComplete
      return {
        userId: session.user.id,
        ownershipId,
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("MOA upload complete:", {
        userId: metadata.userId,
        ownershipId: metadata.ownershipId,
        fileUrl: file.ufsUrl,
        fileKey: file.key,
      });

      // Return data to client
      return {
        uploadedBy: metadata.userId,
        ownershipId: metadata.ownershipId,
        fileUrl: file.ufsUrl,
        fileKey: file.key,
      };
    }),

  /**
   * Proof of Payment Uploader
   * - Only authenticated users can upload
   * - Used for manual payment verification
   * - Max file size: 5MB
   * - Accepts images (screenshots of payment confirmations)
   */
  proofOfPayment: f({
    image: {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
  })
    .middleware(async () => {
      const session = await auth();

      // Check if user is authenticated
      if (!session?.user) {
        throw new UploadThingError("Unauthorized - Please log in to upload");
      }

      return {
        userId: session.user.id,
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Proof of payment upload complete:", {
        userId: metadata.userId,
        fileUrl: file.ufsUrl,
        fileKey: file.key,
      });

      return {
        uploadedBy: metadata.userId,
        fileUrl: file.ufsUrl,
        fileKey: file.key,
      };
    }),

  /**
   * Gallery Image Uploader
   * - Only admin users can upload
   * - Accepts multiple images at once (up to 10)
   * - Max file size: 8MB each
   */
  galleryUploader: f({
    image: {
      maxFileSize: "8MB",
      maxFileCount: 10,
    },
  })
    .middleware(async () => {
      const session = await auth();

      if (!session?.user) {
        throw new UploadThingError("Unauthorized");
      }

      if (session.user.role !== "ADMIN") {
        throw new UploadThingError("Admin access required");
      }

      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return {
        uploadedBy: metadata.userId,
        fileUrl: file.ufsUrl,
        fileKey: file.key,
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
