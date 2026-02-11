import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "./core";

/**
 * UploadThing Route Handler
 * Handles file upload requests at /api/uploadthing
 */
export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,

  // Optional: Configure additional settings
  config: {
    // You can add CORS settings if needed
    // uploadthingId: process.env.UPLOADTHING_APP_ID,
    // uploadthingSecret: process.env.UPLOADTHING_SECRET,
  },
});
