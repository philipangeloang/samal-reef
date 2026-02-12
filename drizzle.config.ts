import { type Config } from "drizzle-kit";

import { env } from "@/env";
import { siteConfig } from "@/site.config";

export default {
  schema: "./src/server/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
  tablesFilter: [`${siteConfig.tablePrefix}_*`],
} satisfies Config;
