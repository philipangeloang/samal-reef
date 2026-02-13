import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";
import { pricingRouter } from "@/server/api/routers/pricing";
import { unitsRouter } from "@/server/api/routers/units";
import { affiliateRouter } from "@/server/api/routers/affiliate";
import { purchaseRouter } from "@/server/api/routers/purchase";
import { adminRouter } from "@/server/api/routers/admin";
import { collectionRouter } from "@/server/api/routers/collection";
import { userRouter } from "@/server/api/routers/user";
import { moaRouter } from "@/server/api/routers/moa";
import { manualPaymentRouter } from "@/server/api/routers/manual-payment";
import { bookingRouter } from "@/server/api/routers/booking";
import { staffEntryRouter } from "@/server/api/routers/staff-entry";
import { galleryRouter } from "@/server/api/routers/gallery";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  pricing: pricingRouter,
  units: unitsRouter,
  affiliate: affiliateRouter,
  purchase: purchaseRouter,
  admin: adminRouter,
  collection: collectionRouter,
  user: userRouter,
  moa: moaRouter,
  manualPayment: manualPaymentRouter,
  booking: bookingRouter,
  staffEntry: staffEntryRouter,
  gallery: galleryRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.units.getAll();
 */
export const createCaller = createCallerFactory(appRouter);
