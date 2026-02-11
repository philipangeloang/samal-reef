import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import Resend from "next-auth/providers/resend";

import { db } from "@/server/db";
import { env } from "@/env";
import { emailService } from "@/server/email";
import {
  accounts,
  sessions,
  users,
  verificationTokens,
} from "@/server/db/schema";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: string; // 'ADMIN' | 'STAFF' | 'AFFILIATE' | 'INVESTOR' | 'VISITOR'
      status: string; // 'ACTIVE' | 'SUSPENDED'
    } & DefaultSession["user"];
  }

  interface User {
    role: string;
    status: string;
  }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  providers: [
    /**
     * Magic Link (Passwordless) Authentication via Resend
     * Users receive an email with a magic link to sign in
     * Magic links are valid for 7 days
     * Custom ocean-themed email template
     */
    Resend({
      apiKey: env.RESEND_API_KEY,
      from: "Reef Resort <noreply@reefresort.co>",
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      // Use our custom ocean-themed email template
      sendVerificationRequest: async ({ identifier: email, url }) => {
        await emailService.sendMagicLink({
          to: email,
          magicLink: url,
        });
      },
    }),
  ],
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  /**
   * Custom pages - Use our branded auth pages
   */
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    error: "/auth/signin", // Redirect errors to signin page with error in URL
  },
  /**
   * Trust the host header - required for ngrok and reverse proxies
   */
  trustHost: true,
  callbacks: {
    /**
     * Session callback - Add user role and status to session
     */
    session: ({ session, user }) => ({
      ...session,
      user: {
        ...session.user,
        id: user.id,
        role: user.role,
        status: user.status,
      },
    }),
  },
} satisfies NextAuthConfig;
