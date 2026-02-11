/**
 * Email Service using Resend
 *
 * This module provides a centralized email service for sending emails
 * throughout the application using Resend as the email provider.
 */

import { Resend } from "resend";
import { env } from "@/env";

// Initialize Resend client
const resend = new Resend(env.RESEND_API_KEY);

// Email configuration
const FROM_EMAIL = "Reef Resort <noreply@reefresort.co>";
const FROM_NAME = "Reef Resort";

/**
 * Email sending utilities
 */
export const emailService = {
  /**
   * Send magic link email for passwordless authentication
   */
  async sendMagicLink(params: { to: string; magicLink: string }) {
    const { to, magicLink } = params;

    try {
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject: "🌊 Sign in to Reef Resort",
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Sign in to Reef Resort</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(180deg, #0a1929 0%, #0d1f31 50%, #0f2435 100%);">
            <!-- Main Container -->
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(180deg, #0a1929 0%, #0d1f31 50%, #0f2435 100%); min-height: 100vh;">
              <tr>
                <td style="padding: 40px 20px;">
                  <!-- Email Card -->
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, rgba(13, 31, 49, 0.95) 0%, rgba(10, 25, 41, 0.95) 100%); border-radius: 16px; border: 1px solid rgba(34, 211, 238, 0.2); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(34, 211, 238, 0.1);">
                    <tr>
                      <td style="padding: 48px 40px;">
                        <!-- Logo/Brand -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="text-align: center; padding-bottom: 32px;">
                              <div style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, rgba(34, 211, 238, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%); border-radius: 12px; border: 1px solid rgba(34, 211, 238, 0.3);">
                                <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff;">
                                  🌊 Reef Resort
                                </h1>
                              </div>
                            </td>
                          </tr>
                        </table>

                        <!-- Main Content -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="padding-top: 24px;">
                              <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #e0f2fe; text-align: center;">
                                Welcome Back to Paradise
                              </h2>
                              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: rgba(224, 242, 254, 0.8); text-align: center;">
                                Click the button below to securely sign in to your Reef Resort account. Your investment dashboard awaits!
                              </p>
                            </td>
                          </tr>
                        </table>

                        <!-- CTA Button -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="padding: 32px 0; text-align: center;">
                              <a href="${magicLink}" style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, #22d3ee 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; font-size: 18px; font-weight: 600; border-radius: 12px; box-shadow: 0 10px 30px rgba(34, 211, 238, 0.3), 0 0 20px rgba(34, 211, 238, 0.2); transition: all 0.3s ease;">
                                🔐 Sign In to Dashboard
                              </a>
                            </td>
                          </tr>
                        </table>

                        <!-- Security Info -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="padding: 24px; background: rgba(34, 211, 238, 0.08); border-radius: 12px; border: 1px solid rgba(34, 211, 238, 0.15);">
                              <p style="margin: 0 0 12px 0; font-size: 14px; color: #22d3ee; font-weight: 600;">
                                🛡️ Security Information
                              </p>
                              <p style="margin: 0 0 8px 0; font-size: 13px; line-height: 1.6; color: rgba(224, 242, 254, 0.7);">
                                • This magic link will expire in <strong style="color: #22d3ee;">7 days</strong>
                              </p>
                              <p style="margin: 0 0 8px 0; font-size: 13px; line-height: 1.6; color: rgba(224, 242, 254, 0.7);">
                                • The link can only be used <strong style="color: #22d3ee;">once</strong>
                              </p>
                              <p style="margin: 0; font-size: 13px; line-height: 1.6; color: rgba(224, 242, 254, 0.7);">
                                • If you didn't request this, you can safely ignore this email
                              </p>
                            </td>
                          </tr>
                        </table>

                        <!-- Alternative Link -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="padding-top: 32px; border-top: 1px solid rgba(34, 211, 238, 0.15); margin-top: 32px;">
                              <p style="margin: 0 0 8px 0; font-size: 12px; color: rgba(224, 242, 254, 0.6); text-align: center;">
                                Button not working? Copy and paste this link:
                              </p>
                              <p style="margin: 0; font-size: 12px; color: #22d3ee; text-align: center; word-break: break-all;">
                                <a href="${magicLink}" style="color: #22d3ee; text-decoration: underline;">
                                  ${magicLink}
                                </a>
                              </p>
                            </td>
                          </tr>
                        </table>

                      </td>
                    </tr>
                  </table>

                  <!-- Footer -->
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 32px auto 0;">
                    <tr>
                      <td style="text-align: center; padding: 0 20px;">
                        <p style="margin: 0 0 8px 0; font-size: 13px; color: rgba(224, 242, 254, 0.5);">
                          Reef Resort - Your Gateway to Paradise Investment
                        </p>
                        <p style="margin: 0; font-size: 12px; color: rgba(224, 242, 254, 0.4);">
                          This email was sent to ${to}
                        </p>
                      </td>
                    </tr>
                  </table>

                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      });

      if (error) {
        console.error("Failed to send magic link email:", error);
        throw new Error("Failed to send email");
      }

      return data;
    } catch (error) {
      console.error("Error in sendMagicLink:", error);
      throw error;
    }
  },

  /**
   * Send affiliate invitation email
   */
  async sendAffiliateInvitation(params: {
    to: string;
    inviteLink: string;
    commissionRate: string;
  }) {
    const { to, inviteLink, commissionRate } = params;

    try {
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject: "🎉 You're invited to join Reef Resort as an Affiliate",
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Affiliate Invitation</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(180deg, #0a1929 0%, #0d1f31 50%, #0f2435 100%);">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(180deg, #0a1929 0%, #0d1f31 50%, #0f2435 100%); min-height: 100vh;">
              <tr>
                <td style="padding: 40px 20px;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, rgba(13, 31, 49, 0.95) 0%, rgba(10, 25, 41, 0.95) 100%); border-radius: 16px; border: 1px solid rgba(34, 211, 238, 0.2); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(34, 211, 238, 0.1);">
                    <tr>
                      <td style="padding: 48px 40px;">
                        <!-- Logo -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="text-align: center; padding-bottom: 32px;">
                              <div style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, rgba(34, 211, 238, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%); border-radius: 12px; border: 1px solid rgba(34, 211, 238, 0.3);">
                                <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff;">
                                  🌊 Reef Resort
                                </h1>
                              </div>
                            </td>
                          </tr>
                        </table>

                        <!-- Main Content -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="padding-top: 24px;">
                              <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #e0f2fe; text-align: center;">
                                You're Invited to Join Our Affiliate Program! 🎉
                              </h2>
                              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: rgba(224, 242, 254, 0.8); text-align: center;">
                                Start earning commissions by sharing Reef Resort with your network.
                              </p>
                            </td>
                          </tr>
                        </table>

                        <!-- Commission Rate Box -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="padding: 24px; background: rgba(34, 211, 238, 0.08); border-radius: 12px; border: 1px solid rgba(34, 211, 238, 0.15); margin-bottom: 24px;">
                              <p style="margin: 0 0 8px 0; font-size: 14px; color: rgba(224, 242, 254, 0.7); text-align: center;">
                                Your Commission Rate
                              </p>
                              <p style="margin: 0; font-size: 32px; font-weight: 700; color: #22d3ee; text-align: center;">
                                ${commissionRate}%
                              </p>
                            </td>
                          </tr>
                        </table>

                        <!-- Benefits -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0;">
                          <tr>
                            <td>
                              <p style="margin: 0 0 12px 0; font-size: 14px; color: #22d3ee; font-weight: 600;">
                                💰 What You'll Get:
                              </p>
                              <p style="margin: 0 0 8px 0; font-size: 13px; line-height: 1.6; color: rgba(224, 242, 254, 0.7);">
                                • Earn ${commissionRate}% commission on every referred sale
                              </p>
                              <p style="margin: 0 0 8px 0; font-size: 13px; line-height: 1.6; color: rgba(224, 242, 254, 0.7);">
                                • Unique tracking links to monitor your referrals
                              </p>
                              <p style="margin: 0 0 8px 0; font-size: 13px; line-height: 1.6; color: rgba(224, 242, 254, 0.7);">
                                • Real-time analytics dashboard
                              </p>
                              <p style="margin: 0; font-size: 13px; line-height: 1.6; color: rgba(224, 242, 254, 0.7);">
                                • Passive income opportunity
                              </p>
                            </td>
                          </tr>
                        </table>

                        <!-- CTA Button -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="padding: 32px 0; text-align: center;">
                              <a href="${inviteLink}" style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, #22d3ee 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; font-size: 18px; font-weight: 600; border-radius: 12px; box-shadow: 0 10px 30px rgba(34, 211, 238, 0.3), 0 0 20px rgba(34, 211, 238, 0.2);">
                                ✨ Accept Invitation
                              </a>
                            </td>
                          </tr>
                        </table>

                        <!-- Expiration Notice -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="padding-top: 32px; border-top: 1px solid rgba(34, 211, 238, 0.15);">
                              <p style="margin: 0 0 8px 0; font-size: 12px; color: rgba(224, 242, 254, 0.6); text-align: center;">
                                ⏰ This invitation link will expire in 7 days
                              </p>
                              <p style="margin: 0; font-size: 12px; color: rgba(224, 242, 254, 0.5); text-align: center;">
                                Or copy and paste: <span style="color: #22d3ee;">${inviteLink}</span>
                              </p>
                            </td>
                          </tr>
                        </table>

                      </td>
                    </tr>
                  </table>

                  <!-- Footer -->
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 32px auto 0;">
                    <tr>
                      <td style="text-align: center; padding: 0 20px;">
                        <p style="margin: 0 0 8px 0; font-size: 13px; color: rgba(224, 242, 254, 0.5);">
                          Reef Resort - Earn While You Share Paradise
                        </p>
                        <p style="margin: 0; font-size: 12px; color: rgba(224, 242, 254, 0.4);">
                          This email was sent to ${to}
                        </p>
                      </td>
                    </tr>
                  </table>

                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      });

      if (error) {
        console.error("Failed to send affiliate invitation email:", error);
        throw new Error("Failed to send email");
      }

      return data;
    } catch (error) {
      console.error("Error in sendAffiliateInvitation:", error);
      throw error;
    }
  },

  /**
   * Send purchase confirmation email
   */
  async sendPurchaseConfirmation(params: {
    to: string;
    userName: string;
    unitName: string;
    percentage: string;
    amount: string;
    paymentMethod: string;
  }) {
    const { to, userName, unitName, percentage, amount, paymentMethod } =
      params;

    try {
      const { data, error} = await resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject: "✅ Purchase Confirmed - Reef Resort",
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Purchase Confirmation</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(180deg, #0a1929 0%, #0d1f31 50%, #0f2435 100%);">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(180deg, #0a1929 0%, #0d1f31 50%, #0f2435 100%); min-height: 100vh;">
              <tr>
                <td style="padding: 40px 20px;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, rgba(13, 31, 49, 0.95) 0%, rgba(10, 25, 41, 0.95) 100%); border-radius: 16px; border: 1px solid rgba(34, 211, 238, 0.2); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(34, 211, 238, 0.1);">
                    <tr>
                      <td style="padding: 48px 40px;">
                        <!-- Logo -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="text-align: center; padding-bottom: 32px;">
                              <div style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, rgba(34, 211, 238, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%); border-radius: 12px; border: 1px solid rgba(34, 211, 238, 0.3);">
                                <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff;">
                                  🌊 Reef Resort
                                </h1>
                              </div>
                            </td>
                          </tr>
                        </table>

                        <!-- Main Content -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="padding-top: 24px;">
                              <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #e0f2fe; text-align: center;">
                                Purchase Confirmed! ✅
                              </h2>
                              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: rgba(224, 242, 254, 0.8); text-align: center;">
                                Hi ${userName}, thank you for your investment in paradise!
                              </p>
                            </td>
                          </tr>
                        </table>

                        <!-- Purchase Details -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="padding: 24px; background: rgba(34, 211, 238, 0.08); border-radius: 12px; border: 1px solid rgba(34, 211, 238, 0.15);">
                              <p style="margin: 0 0 16px 0; font-size: 14px; color: #22d3ee; font-weight: 600;">
                                📋 Ownership Details:
                              </p>
                              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                  <td style="padding: 8px 0;">
                                    <p style="margin: 0; font-size: 13px; color: rgba(224, 242, 254, 0.6);">Unit</p>
                                    <p style="margin: 4px 0 0 0; font-size: 15px; color: #ffffff; font-weight: 600;">${unitName}</p>
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px 0;">
                                    <p style="margin: 0; font-size: 13px; color: rgba(224, 242, 254, 0.6);">Ownership</p>
                                    <p style="margin: 4px 0 0 0; font-size: 15px; color: #ffffff; font-weight: 600;">${percentage}</p>
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px 0;">
                                    <p style="margin: 0; font-size: 13px; color: rgba(224, 242, 254, 0.6);">Amount Paid</p>
                                    <p style="margin: 4px 0 0 0; font-size: 15px; color: #ffffff; font-weight: 600;">₱${amount}</p>
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px 0;">
                                    <p style="margin: 0; font-size: 13px; color: rgba(224, 242, 254, 0.6);">Payment Method</p>
                                    <p style="margin: 4px 0 0 0; font-size: 15px; color: #ffffff; font-weight: 600;">${paymentMethod}</p>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>

                        <!-- Next Steps -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0;">
                          <tr>
                            <td>
                              <p style="margin: 0 0 12px 0; font-size: 14px; color: #22d3ee; font-weight: 600;">
                                🎯 What's Next:
                              </p>
                              <p style="margin: 0 0 8px 0; font-size: 13px; line-height: 1.6; color: rgba(224, 242, 254, 0.7);">
                                • Access your investor dashboard to view your portfolio
                              </p>
                              <p style="margin: 0 0 8px 0; font-size: 13px; line-height: 1.6; color: rgba(224, 242, 254, 0.7);">
                                • Track your investment history and revenue share
                              </p>
                              <p style="margin: 0; font-size: 13px; line-height: 1.6; color: rgba(224, 242, 254, 0.7);">
                                • Purchase additional ownership shares anytime
                              </p>
                            </td>
                          </tr>
                        </table>

                        <!-- CTA Button -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="padding: 32px 0; text-align: center;">
                              <a href="${env.NEXT_PUBLIC_APP_URL}/dashboard/investor" style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, #22d3ee 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; font-size: 18px; font-weight: 600; border-radius: 12px; box-shadow: 0 10px 30px rgba(34, 211, 238, 0.3), 0 0 20px rgba(34, 211, 238, 0.2);">
                                📊 View Dashboard
                              </a>
                            </td>
                          </tr>
                        </table>

                      </td>
                    </tr>
                  </table>

                  <!-- Footer -->
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 32px auto 0;">
                    <tr>
                      <td style="text-align: center; padding: 0 20px;">
                        <p style="margin: 0 0 8px 0; font-size: 13px; color: rgba(224, 242, 254, 0.5);">
                          Reef Resort - Your Gateway to Paradise Investment
                        </p>
                        <p style="margin: 0; font-size: 12px; color: rgba(224, 242, 254, 0.4);">
                          This email was sent to ${to}
                        </p>
                      </td>
                    </tr>
                  </table>

                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      });

      if (error) {
        console.error("Failed to send purchase confirmation email:", error);
        throw new Error("Failed to send email");
      }

      return data;
    } catch (error) {
      console.error("Error in sendPurchaseConfirmation:", error);
      throw error;
    }
  },

  /**
   * Send welcome email to new investors
   */
  async sendInvestorWelcome(params: { to: string; userName: string }) {
    const { to, userName } = params;

    try {
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject: "🌴 Welcome to Reef Resort!",
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome!</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(180deg, #0a1929 0%, #0d1f31 50%, #0f2435 100%);">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(180deg, #0a1929 0%, #0d1f31 50%, #0f2435 100%); min-height: 100vh;">
              <tr>
                <td style="padding: 40px 20px;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, rgba(13, 31, 49, 0.95) 0%, rgba(10, 25, 41, 0.95) 100%); border-radius: 16px; border: 1px solid rgba(34, 211, 238, 0.2); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(34, 211, 238, 0.1);">
                    <tr>
                      <td style="padding: 48px 40px;">
                        <!-- Logo -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="text-align: center; padding-bottom: 32px;">
                              <div style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, rgba(34, 211, 238, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%); border-radius: 12px; border: 1px solid rgba(34, 211, 238, 0.3);">
                                <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff;">
                                  🌊 Reef Resort
                                </h1>
                              </div>
                            </td>
                          </tr>
                        </table>

                        <!-- Main Content -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="padding-top: 24px;">
                              <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #e0f2fe; text-align: center;">
                                Welcome to Paradise, ${userName}! 🌴
                              </h2>
                              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: rgba(224, 242, 254, 0.8); text-align: center;">
                                Congratulations on your first investment! You're now part of the Reef Resort family.
                              </p>
                            </td>
                          </tr>
                        </table>

                        <!-- Features -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="padding: 24px; background: rgba(34, 211, 238, 0.08); border-radius: 12px; border: 1px solid rgba(34, 211, 238, 0.15);">
                              <p style="margin: 0 0 16px 0; font-size: 14px; color: #22d3ee; font-weight: 600;">
                                📊 Your Dashboard Features:
                              </p>
                              <p style="margin: 0 0 8px 0; font-size: 13px; line-height: 1.6; color: rgba(224, 242, 254, 0.7);">
                                • View your complete ownership portfolio
                              </p>
                              <p style="margin: 0 0 8px 0; font-size: 13px; line-height: 1.6; color: rgba(224, 242, 254, 0.7);">
                                • Track your investment history and returns
                              </p>
                              <p style="margin: 0; font-size: 13px; line-height: 1.6; color: rgba(224, 242, 254, 0.7);">
                                • Purchase additional ownership shares
                              </p>
                            </td>
                          </tr>
                        </table>

                        <!-- CTA Button -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="padding: 32px 0; text-align: center;">
                              <a href="${env.NEXT_PUBLIC_APP_URL}/dashboard/investor" style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, #22d3ee 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; font-size: 18px; font-weight: 600; border-radius: 12px; box-shadow: 0 10px 30px rgba(34, 211, 238, 0.3), 0 0 20px rgba(34, 211, 238, 0.2);">
                                🚀 Go to Dashboard
                              </a>
                            </td>
                          </tr>
                        </table>

                        <!-- Support -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="padding-top: 24px; border-top: 1px solid rgba(34, 211, 238, 0.15);">
                              <p style="margin: 0; font-size: 13px; line-height: 1.6; color: rgba(224, 242, 254, 0.6); text-align: center;">
                                Have questions? Our support team is here to help!
                              </p>
                            </td>
                          </tr>
                        </table>

                      </td>
                    </tr>
                  </table>

                  <!-- Footer -->
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 32px auto 0;">
                    <tr>
                      <td style="text-align: center; padding: 0 20px;">
                        <p style="margin: 0 0 8px 0; font-size: 13px; color: rgba(224, 242, 254, 0.5);">
                          Reef Resort - Your Gateway to Paradise Investment
                        </p>
                        <p style="margin: 0; font-size: 12px; color: rgba(224, 242, 254, 0.4);">
                          This email was sent to ${to}
                        </p>
                      </td>
                    </tr>
                  </table>

                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      });

      if (error) {
        console.error("Failed to send investor welcome email:", error);
        throw new Error("Failed to send email");
      }

      return data;
    } catch (error) {
      console.error("Error in sendInvestorWelcome:", error);
      throw error;
    }
  },

  /**
   * Send welcome email to new affiliates
   */
  async sendAffiliateWelcome(params: {
    to: string;
    userName: string;
    affiliateCode: string;
    commissionRate: string;
  }) {
    const { to, userName, affiliateCode, commissionRate } = params;

    try {
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject: "🎊 Welcome to Reef Resort Affiliate Program!",
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome Affiliate!</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(180deg, #0a1929 0%, #0d1f31 50%, #0f2435 100%);">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(180deg, #0a1929 0%, #0d1f31 50%, #0f2435 100%); min-height: 100vh;">
              <tr>
                <td style="padding: 40px 20px;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, rgba(13, 31, 49, 0.95) 0%, rgba(10, 25, 41, 0.95) 100%); border-radius: 16px; border: 1px solid rgba(34, 211, 238, 0.2); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(34, 211, 238, 0.1);">
                    <tr>
                      <td style="padding: 48px 40px;">
                        <!-- Logo -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="text-align: center; padding-bottom: 32px;">
                              <div style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, rgba(34, 211, 238, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%); border-radius: 12px; border: 1px solid rgba(34, 211, 238, 0.3);">
                                <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff;">
                                  🌊 Reef Resort
                                </h1>
                              </div>
                            </td>
                          </tr>
                        </table>

                        <!-- Main Content -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="padding-top: 24px;">
                              <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #e0f2fe; text-align: center;">
                                Welcome, ${userName}! 🎊
                              </h2>
                              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: rgba(224, 242, 254, 0.8); text-align: center;">
                                You're now part of the Reef Resort affiliate program. Start earning today!
                              </p>
                            </td>
                          </tr>
                        </table>

                        <!-- Affiliate Details -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="padding: 24px; background: rgba(34, 211, 238, 0.08); border-radius: 12px; border: 1px solid rgba(34, 211, 238, 0.15);">
                              <p style="margin: 0 0 16px 0; font-size: 14px; color: #22d3ee; font-weight: 600;">
                                🎯 Your Affiliate Details:
                              </p>
                              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                  <td style="padding: 8px 0;">
                                    <p style="margin: 0; font-size: 13px; color: rgba(224, 242, 254, 0.6);">Affiliate Code</p>
                                    <p style="margin: 4px 0 0 0; font-size: 18px; color: #22d3ee; font-weight: 700; font-family: monospace;">${affiliateCode}</p>
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px 0;">
                                    <p style="margin: 0; font-size: 13px; color: rgba(224, 242, 254, 0.6);">Commission Rate</p>
                                    <p style="margin: 4px 0 0 0; font-size: 18px; color: #ffffff; font-weight: 700;">${commissionRate}%</p>
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px 0;">
                                    <p style="margin: 0; font-size: 13px; color: rgba(224, 242, 254, 0.6);">Your Referral Link</p>
                                    <p style="margin: 4px 0 0 0; font-size: 13px; color: #22d3ee; word-break: break-all;">
                                      ${env.NEXT_PUBLIC_APP_URL}?ref=${affiliateCode}
                                    </p>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>

                        <!-- Next Steps -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0;">
                          <tr>
                            <td>
                              <p style="margin: 0 0 12px 0; font-size: 14px; color: #22d3ee; font-weight: 600;">
                                🚀 Get Started:
                              </p>
                              <p style="margin: 0 0 8px 0; font-size: 13px; line-height: 1.6; color: rgba(224, 242, 254, 0.7);">
                                • Share your referral link on social media
                              </p>
                              <p style="margin: 0 0 8px 0; font-size: 13px; line-height: 1.6; color: rgba(224, 242, 254, 0.7);">
                                • Track your referrals in real-time
                              </p>
                              <p style="margin: 0; font-size: 13px; line-height: 1.6; color: rgba(224, 242, 254, 0.7);">
                                • Watch your earnings grow
                              </p>
                            </td>
                          </tr>
                        </table>

                        <!-- CTA Button -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="padding: 32px 0; text-align: center;">
                              <a href="${env.NEXT_PUBLIC_APP_URL}/dashboard/affiliate" style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, #22d3ee 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; font-size: 18px; font-weight: 600; border-radius: 12px; box-shadow: 0 10px 30px rgba(34, 211, 238, 0.3), 0 0 20px rgba(34, 211, 238, 0.2);">
                                📊 View Affiliate Dashboard
                              </a>
                            </td>
                          </tr>
                        </table>

                      </td>
                    </tr>
                  </table>

                  <!-- Footer -->
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 32px auto 0;">
                    <tr>
                      <td style="text-align: center; padding: 0 20px;">
                        <p style="margin: 0 0 8px 0; font-size: 13px; color: rgba(224, 242, 254, 0.5);">
                          Reef Resort - Earn While You Share Paradise
                        </p>
                        <p style="margin: 0; font-size: 12px; color: rgba(224, 242, 254, 0.4);">
                          This email was sent to ${to}
                        </p>
                      </td>
                    </tr>
                  </table>

                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      });

      if (error) {
        console.error("Failed to send affiliate welcome email:", error);
        throw new Error("Failed to send email");
      }

      return data;
    } catch (error) {
      console.error("Error in sendAffiliateWelcome:", error);
      throw error;
    }
  },

  /**
   * Send commission earned notification
   */
  async sendCommissionEarned(params: {
    to: string;
    userName: string;
    commissionAmount: string;
    unitName: string;
    percentage: string;
  }) {
    const { to, userName, commissionAmount, unitName, percentage } = params;

    try {
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject: "💰 You earned a commission!",
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Commission Earned</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(180deg, #0a1929 0%, #0d1f31 50%, #0f2435 100%);">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(180deg, #0a1929 0%, #0d1f31 50%, #0f2435 100%); min-height: 100vh;">
              <tr>
                <td style="padding: 40px 20px;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, rgba(13, 31, 49, 0.95) 0%, rgba(10, 25, 41, 0.95) 100%); border-radius: 16px; border: 1px solid rgba(34, 211, 238, 0.2); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(34, 211, 238, 0.1);">
                    <tr>
                      <td style="padding: 48px 40px;">
                        <!-- Logo -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="text-align: center; padding-bottom: 32px;">
                              <div style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, rgba(34, 211, 238, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%); border-radius: 12px; border: 1px solid rgba(34, 211, 238, 0.3);">
                                <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff;">
                                  🌊 Reef Resort
                                </h1>
                              </div>
                            </td>
                          </tr>
                        </table>

                        <!-- Main Content -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="padding-top: 24px;">
                              <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #e0f2fe; text-align: center;">
                                Congratulations, ${userName}! 💰
                              </h2>
                              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: rgba(224, 242, 254, 0.8); text-align: center;">
                                You've earned a new commission from a referred sale!
                              </p>
                            </td>
                          </tr>
                        </table>

                        <!-- Commission Amount -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="padding: 32px; background: rgba(34, 211, 238, 0.08); border-radius: 12px; border: 1px solid rgba(34, 211, 238, 0.15); text-align: center;">
                              <p style="margin: 0 0 8px 0; font-size: 14px; color: rgba(224, 242, 254, 0.7);">
                                Commission Earned
                              </p>
                              <p style="margin: 0; font-size: 48px; font-weight: 700; color: #22d3ee;">
                                ₱${commissionAmount}
                              </p>
                            </td>
                          </tr>
                        </table>

                        <!-- Sale Details -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0;">
                          <tr>
                            <td style="padding: 20px; background: rgba(34, 211, 238, 0.05); border-radius: 12px;">
                              <p style="margin: 0 0 12px 0; font-size: 14px; color: #22d3ee; font-weight: 600;">
                                📊 Sale Details:
                              </p>
                              <p style="margin: 0 0 8px 0; font-size: 13px; line-height: 1.6; color: rgba(224, 242, 254, 0.7);">
                                <strong style="color: #ffffff;">Unit:</strong> ${unitName}
                              </p>
                              <p style="margin: 0; font-size: 13px; line-height: 1.6; color: rgba(224, 242, 254, 0.7);">
                                <strong style="color: #ffffff;">Ownership Sold:</strong> ${percentage}
                              </p>
                            </td>
                          </tr>
                        </table>

                        <!-- Encouragement -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="text-align: center; padding: 16px 0;">
                              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: rgba(224, 242, 254, 0.7);">
                                Keep sharing your referral link to earn more commissions!
                              </p>
                            </td>
                          </tr>
                        </table>

                        <!-- CTA Button -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="padding: 32px 0; text-align: center;">
                              <a href="${env.NEXT_PUBLIC_APP_URL}/dashboard/affiliate" style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, #22d3ee 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; font-size: 18px; font-weight: 600; border-radius: 12px; box-shadow: 0 10px 30px rgba(34, 211, 238, 0.3), 0 0 20px rgba(34, 211, 238, 0.2);">
                                💵 View Earnings
                              </a>
                            </td>
                          </tr>
                        </table>

                      </td>
                    </tr>
                  </table>

                  <!-- Footer -->
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 32px auto 0;">
                    <tr>
                      <td style="text-align: center; padding: 0 20px;">
                        <p style="margin: 0 0 8px 0; font-size: 13px; color: rgba(224, 242, 254, 0.5);">
                          Reef Resort - Earn While You Share Paradise
                        </p>
                        <p style="margin: 0; font-size: 12px; color: rgba(224, 242, 254, 0.4);">
                          This email was sent to ${to}
                        </p>
                      </td>
                    </tr>
                  </table>

                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      });

      if (error) {
        console.error("Failed to send commission earned email:", error);
        throw new Error("Failed to send email");
      }

      return data;
    } catch (error) {
      console.error("Error in sendCommissionEarned:", error);
      throw error;
    }
  },

  /**
   * Send welcome email to guest purchasers with magic link to access dashboard
   */
  async sendGuestPurchaseWelcome(params: {
    to: string;
    unitName: string;
    percentage: string;
    amount: string;
  }) {
    const { to, unitName, percentage, amount } = params;

    // Generate sign-in URL (magic link will be sent by NextAuth)
    const signInUrl = `${env.NEXT_PUBLIC_APP_URL}/auth/signin?email=${encodeURIComponent(to)}&callbackUrl=${encodeURIComponent("/dashboard/investor")}`;

    try {
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject: "🎉 Welcome to Reef Resort - Your Purchase is Complete!",
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome!</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(180deg, #0a1929 0%, #0d1f31 50%, #0f2435 100%);">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(180deg, #0a1929 0%, #0d1f31 50%, #0f2435 100%); min-height: 100vh;">
              <tr>
                <td style="padding: 40px 20px;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, rgba(13, 31, 49, 0.95) 0%, rgba(10, 25, 41, 0.95) 100%); border-radius: 16px; border: 1px solid rgba(34, 211, 238, 0.2); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(34, 211, 238, 0.1);">
                    <tr>
                      <td style="padding: 48px 40px;">
                        <!-- Logo -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="text-align: center; padding-bottom: 32px;">
                              <div style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, rgba(34, 211, 238, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%); border-radius: 12px; border: 1px solid rgba(34, 211, 238, 0.3);">
                                <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff;">
                                  🌊 Reef Resort
                                </h1>
                              </div>
                            </td>
                          </tr>
                        </table>

                        <!-- Main Content -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="padding-top: 24px;">
                              <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #e0f2fe; text-align: center;">
                                Welcome to Reef Resort! 🎉
                              </h2>
                              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: rgba(224, 242, 254, 0.8); text-align: center;">
                                Thank you for your purchase. Your investment is now complete!
                              </p>
                            </td>
                          </tr>
                        </table>

                        <!-- Purchase Details -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="padding: 24px; background: rgba(34, 211, 238, 0.08); border-radius: 12px; border: 1px solid rgba(34, 211, 238, 0.15);">
                              <p style="margin: 0 0 16px 0; font-size: 14px; color: #22d3ee; font-weight: 600;">
                                📋 Purchase Details:
                              </p>
                              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                  <td style="padding: 8px 0;">
                                    <p style="margin: 0; font-size: 13px; color: rgba(224, 242, 254, 0.6);">Unit</p>
                                    <p style="margin: 4px 0 0 0; font-size: 15px; color: #ffffff; font-weight: 600;">${unitName}</p>
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px 0;">
                                    <p style="margin: 0; font-size: 13px; color: rgba(224, 242, 254, 0.6);">Ownership</p>
                                    <p style="margin: 4px 0 0 0; font-size: 15px; color: #ffffff; font-weight: 600;">${percentage}</p>
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px 0;">
                                    <p style="margin: 0; font-size: 13px; color: rgba(224, 242, 254, 0.6);">Amount Paid</p>
                                    <p style="margin: 4px 0 0 0; font-size: 15px; color: #ffffff; font-weight: 600;">₱${amount}</p>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>

                        <!-- Account Info -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0;">
                          <tr>
                            <td>
                              <h3 style="margin: 0 0 12px 0; font-size: 18px; color: #e0f2fe; font-weight: 600;">
                                Your Account is Ready ✨
                              </h3>
                              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: rgba(224, 242, 254, 0.7);">
                                We've automatically created an account for you using <strong style="color: #22d3ee;">${to}</strong>
                              </p>
                              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: rgba(224, 242, 254, 0.7);">
                                Click the button below to sign in and access your investor dashboard:
                              </p>
                            </td>
                          </tr>
                        </table>

                        <!-- CTA Button -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="padding: 16px 0; text-align: center;">
                              <a href="${signInUrl}" style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, #22d3ee 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; font-size: 18px; font-weight: 600; border-radius: 12px; box-shadow: 0 10px 30px rgba(34, 211, 238, 0.3), 0 0 20px rgba(34, 211, 238, 0.2);">
                                🔐 Sign In to Dashboard
                              </a>
                            </td>
                          </tr>
                        </table>

                        <!-- Magic Link Notice -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="padding: 16px; background: rgba(34, 211, 238, 0.05); border-radius: 8px; text-align: center;">
                              <p style="margin: 0; font-size: 13px; line-height: 1.6; color: rgba(224, 242, 254, 0.6);">
                                📧 You'll receive a magic link in a separate email to securely sign in. No password needed!
                              </p>
                            </td>
                          </tr>
                        </table>

                        <!-- What's Next -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0;">
                          <tr>
                            <td>
                              <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #e0f2fe; font-weight: 600;">
                                🎯 What's Next?
                              </h3>
                              <p style="margin: 0 0 8px 0; font-size: 13px; line-height: 1.6; color: rgba(224, 242, 254, 0.7);">
                                From your investor dashboard, you can:
                              </p>
                              <p style="margin: 0 0 6px 0; font-size: 13px; line-height: 1.6; color: rgba(224, 242, 254, 0.7);">
                                • View your ownership portfolio
                              </p>
                              <p style="margin: 0 0 6px 0; font-size: 13px; line-height: 1.6; color: rgba(224, 242, 254, 0.7);">
                                • Track your investment history
                              </p>
                              <p style="margin: 0 0 6px 0; font-size: 13px; line-height: 1.6; color: rgba(224, 242, 254, 0.7);">
                                • Purchase additional ownership shares
                              </p>
                              <p style="margin: 0; font-size: 13px; line-height: 1.6; color: rgba(224, 242, 254, 0.7);">
                                • Manage your account settings
                              </p>
                            </td>
                          </tr>
                        </table>

                        <!-- Support -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="padding-top: 24px; border-top: 1px solid rgba(34, 211, 238, 0.15); text-align: center;">
                              <p style="margin: 0; font-size: 13px; line-height: 1.6; color: rgba(224, 242, 254, 0.6);">
                                Have questions? Our support team is here to help!
                              </p>
                            </td>
                          </tr>
                        </table>

                      </td>
                    </tr>
                  </table>

                  <!-- Footer -->
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 32px auto 0;">
                    <tr>
                      <td style="text-align: center; padding: 0 20px;">
                        <p style="margin: 0 0 8px 0; font-size: 13px; color: rgba(224, 242, 254, 0.5);">
                          Reef Resort - Your Gateway to Paradise Investment
                        </p>
                        <p style="margin: 0; font-size: 12px; color: rgba(224, 242, 254, 0.4);">
                          This email was sent to ${to} because a purchase was completed using this email address
                        </p>
                      </td>
                    </tr>
                  </table>

                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      });

      if (error) {
        console.error("Failed to send guest purchase welcome email:", error);
        throw new Error("Failed to send email");
      }

      return data;
    } catch (error) {
      console.error("Error in sendGuestPurchaseWelcome:", error);
      throw error;
    }
  },

  /**
   * Send MOA ready email after successful purchase
   */
  async sendMoaReadyEmail(params: {
    to: string;
    userName: string;
    unitName: string;
    percentage: string;
    ownershipId: number;
  }) {
    const { to, userName, unitName, percentage, ownershipId } = params;
    const moaSigningUrl = `${env.NEXT_PUBLIC_APP_URL}/moa/sign/${ownershipId}`;

    try {
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject: "📄 Sign Your Memorandum of Agreement - Reef Resort",
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Sign Your MOA</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(180deg, #0a1929 0%, #0d1f31 50%, #0f2435 100%);">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(180deg, #0a1929 0%, #0d1f31 50%, #0f2435 100%); min-height: 100vh;">
              <tr>
                <td style="padding: 40px 20px;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, rgba(13, 31, 49, 0.95) 0%, rgba(10, 25, 41, 0.95) 100%); border-radius: 16px; border: 1px solid rgba(34, 211, 238, 0.2); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(34, 211, 238, 0.1);">
                    <tr>
                      <td style="padding: 48px 40px;">
                        <!-- Logo -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="text-align: center; padding-bottom: 32px;">
                              <div style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, rgba(34, 211, 238, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%); border-radius: 12px; border: 1px solid rgba(34, 211, 238, 0.3);">
                                <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff;">
                                  🌊 Reef Resort
                                </h1>
                              </div>
                            </td>
                          </tr>
                        </table>

                        <!-- Main Content -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="padding-top: 24px;">
                              <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #e0f2fe; text-align: center;">
                                Your Purchase is Complete! 📄
                              </h2>
                              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: rgba(224, 242, 254, 0.8); text-align: center;">
                                Hi ${userName}, please sign your Memorandum of Agreement to finalize your ownership.
                              </p>
                            </td>
                          </tr>
                        </table>

                        <!-- Ownership Details -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="padding: 24px; background: rgba(34, 211, 238, 0.08); border-radius: 12px; border: 1px solid rgba(34, 211, 238, 0.15);">
                              <p style="margin: 0 0 16px 0; font-size: 14px; color: #22d3ee; font-weight: 600;">
                                📋 Ownership Details:
                              </p>
                              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                  <td style="padding: 8px 0;">
                                    <p style="margin: 0; font-size: 13px; color: rgba(224, 242, 254, 0.6);">Unit</p>
                                    <p style="margin: 4px 0 0 0; font-size: 15px; color: #ffffff; font-weight: 600;">${unitName}</p>
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px 0;">
                                    <p style="margin: 0; font-size: 13px; color: rgba(224, 242, 254, 0.6);">Ownership</p>
                                    <p style="margin: 4px 0 0 0; font-size: 15px; color: #ffffff; font-weight: 600;">${percentage}</p>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>

                        <!-- Next Step -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0;">
                          <tr>
                            <td>
                              <p style="margin: 0 0 12px 0; font-size: 14px; color: #22d3ee; font-weight: 600;">
                                ✍️ Next Step:
                              </p>
                              <p style="margin: 0 0 8px 0; font-size: 13px; line-height: 1.6; color: rgba(224, 242, 254, 0.7);">
                                • Review your Memorandum of Agreement
                              </p>
                              <p style="margin: 0 0 8px 0; font-size: 13px; line-height: 1.6; color: rgba(224, 242, 254, 0.7);">
                                • Add your digital signature
                              </p>
                              <p style="margin: 0; font-size: 13px; line-height: 1.6; color: rgba(224, 242, 254, 0.7);">
                                • Download your signed document for your records
                              </p>
                            </td>
                          </tr>
                        </table>

                        <!-- CTA Button -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="padding: 32px 0; text-align: center;">
                              <a href="${moaSigningUrl}" style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, #22d3ee 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; font-size: 18px; font-weight: 600; border-radius: 12px; box-shadow: 0 10px 30px rgba(34, 211, 238, 0.3), 0 0 20px rgba(34, 211, 238, 0.2);">
                                ✍️ Sign MOA Now
                              </a>
                            </td>
                          </tr>
                        </table>

                        <!-- Optional Notice -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="padding: 16px; background: rgba(34, 211, 238, 0.05); border-radius: 8px; text-align: center;">
                              <p style="margin: 0; font-size: 13px; line-height: 1.6; color: rgba(224, 242, 254, 0.6);">
                                💡 You can sign this later from your investor dashboard, but we recommend completing it now.
                              </p>
                            </td>
                          </tr>
                        </table>

                      </td>
                    </tr>
                  </table>

                  <!-- Footer -->
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 32px auto 0;">
                    <tr>
                      <td style="text-align: center; padding: 0 20px;">
                        <p style="margin: 0 0 8px 0; font-size: 13px; color: rgba(224, 242, 254, 0.5);">
                          Reef Resort - Your Gateway to Paradise Investment
                        </p>
                        <p style="margin: 0; font-size: 12px; color: rgba(224, 242, 254, 0.4);">
                          This email was sent to ${to}
                        </p>
                      </td>
                    </tr>
                  </table>

                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      });

      if (error) {
        console.error("Failed to send MOA ready email:", error);
        throw new Error("Failed to send email");
      }

      return data;
    } catch (error) {
      console.error("Error in sendMoaReadyEmail:", error);
      throw error;
    }
  },

  /**
   * Send MOA signed confirmation to investor
   */
  async sendMoaSignedConfirmation(params: {
    to: string;
    userName: string;
    unitName: string;
    moaUrl: string;
  }) {
    const { to, userName, unitName, moaUrl } = params;

    try {
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject: "✅ Your MOA Has Been Signed - Reef Resort",
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>MOA Signed</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(180deg, #0a1929 0%, #0d1f31 50%, #0f2435 100%);">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(180deg, #0a1929 0%, #0d1f31 50%, #0f2435 100%); min-height: 100vh;">
              <tr>
                <td style="padding: 40px 20px;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, rgba(13, 31, 49, 0.95) 0%, rgba(10, 25, 41, 0.95) 100%); border-radius: 16px; border: 1px solid rgba(34, 211, 238, 0.2); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(34, 211, 238, 0.1);">
                    <tr>
                      <td style="padding: 48px 40px;">
                        <!-- Logo -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="text-align: center; padding-bottom: 32px;">
                              <div style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, rgba(34, 211, 238, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%); border-radius: 12px; border: 1px solid rgba(34, 211, 238, 0.3);">
                                <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff;">
                                  🌊 Reef Resort
                                </h1>
                              </div>
                            </td>
                          </tr>
                        </table>

                        <!-- Main Content -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="padding-top: 24px;">
                              <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #e0f2fe; text-align: center;">
                                MOA Successfully Signed! ✅
                              </h2>
                              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: rgba(224, 242, 254, 0.8); text-align: center;">
                                Hi ${userName}, your Memorandum of Agreement for ${unitName} has been signed and securely stored.
                              </p>
                            </td>
                          </tr>
                        </table>

                        <!-- Success Box -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="padding: 32px; background: rgba(34, 211, 238, 0.08); border-radius: 12px; border: 1px solid rgba(34, 211, 238, 0.15); text-align: center;">
                              <p style="margin: 0 0 16px 0; font-size: 48px;">📄</p>
                              <p style="margin: 0 0 8px 0; font-size: 14px; color: #22d3ee; font-weight: 600;">
                                Document Status
                              </p>
                              <p style="margin: 0; font-size: 18px; font-weight: 700; color: #ffffff;">
                                SIGNED & STORED
                              </p>
                            </td>
                          </tr>
                        </table>

                        <!-- Next Steps -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0;">
                          <tr>
                            <td>
                              <p style="margin: 0 0 12px 0; font-size: 14px; color: #22d3ee; font-weight: 600;">
                                📁 Your Document:
                              </p>
                              <p style="margin: 0 0 8px 0; font-size: 13px; line-height: 1.6; color: rgba(224, 242, 254, 0.7);">
                                • Your signed MOA is securely stored in your account
                              </p>
                              <p style="margin: 0 0 8px 0; font-size: 13px; line-height: 1.6; color: rgba(224, 242, 254, 0.7);">
                                • You can download it anytime from your dashboard
                              </p>
                              <p style="margin: 0; font-size: 13px; line-height: 1.6; color: rgba(224, 242, 254, 0.7);">
                                • Keep this document for your records
                              </p>
                            </td>
                          </tr>
                        </table>

                        <!-- CTA Buttons -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="padding: 16px 0; text-align: center;">
                              <a href="${moaUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #22d3ee 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 10px; margin: 0 8px; box-shadow: 0 10px 30px rgba(34, 211, 238, 0.3);">
                                📥 Download MOA
                              </a>
                              <a href="${env.NEXT_PUBLIC_APP_URL}/dashboard/investor" style="display: inline-block; padding: 14px 32px; background: rgba(34, 211, 238, 0.1); color: #22d3ee; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 10px; margin: 0 8px; border: 1px solid rgba(34, 211, 238, 0.3);">
                                📊 View Dashboard
                              </a>
                            </td>
                          </tr>
                        </table>

                      </td>
                    </tr>
                  </table>

                  <!-- Footer -->
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 32px auto 0;">
                    <tr>
                      <td style="text-align: center; padding: 0 20px;">
                        <p style="margin: 0 0 8px 0; font-size: 13px; color: rgba(224, 242, 254, 0.5);">
                          Reef Resort - Your Gateway to Paradise Investment
                        </p>
                        <p style="margin: 0; font-size: 12px; color: rgba(224, 242, 254, 0.4);">
                          This email was sent to ${to}
                        </p>
                      </td>
                    </tr>
                  </table>

                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      });

      if (error) {
        console.error("Failed to send MOA signed confirmation:", error);
        throw new Error("Failed to send email");
      }

      return data;
    } catch (error) {
      console.error("Error in sendMoaSignedConfirmation:", error);
      throw error;
    }
  },

  /**
   * Send MOA signed notification to admin
   */
  async sendAdminMoaSignedNotification(params: {
    investorName: string;
    investorEmail: string;
    unitName: string;
    percentage: string;
    moaUrl: string;
    ownershipId: number;
  }) {
    const { investorName, investorEmail, unitName, percentage, moaUrl, ownershipId } = params;

    // Get admin email from environment or use a default
    const adminEmail = env.NEXT_PUBLIC_APP_URL.includes("localhost")
      ? "admin@reefresort.co"  // Development fallback
      : "admin@reefresort.co"; // Production admin email

    try {
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: adminEmail,
        subject: `✅ New MOA Signed - ${investorName} (${unitName})`,
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>MOA Signed - Admin Notification</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(180deg, #0a1929 0%, #0d1f31 50%, #0f2435 100%);">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(180deg, #0a1929 0%, #0d1f31 50%, #0f2435 100%); min-height: 100vh;">
              <tr>
                <td style="padding: 40px 20px;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, rgba(13, 31, 49, 0.95) 0%, rgba(10, 25, 41, 0.95) 100%); border-radius: 16px; border: 1px solid rgba(34, 211, 238, 0.2); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(34, 211, 238, 0.1);">
                    <tr>
                      <td style="padding: 48px 40px;">
                        <!-- Logo -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="text-align: center; padding-bottom: 32px;">
                              <div style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, rgba(34, 211, 238, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%); border-radius: 12px; border: 1px solid rgba(34, 211, 238, 0.3);">
                                <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff;">
                                  🌊 Reef Resort Admin
                                </h1>
                              </div>
                            </td>
                          </tr>
                        </table>

                        <!-- Main Content -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="padding-top: 24px;">
                              <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #e0f2fe; text-align: center;">
                                New MOA Signed ✅
                              </h2>
                              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: rgba(224, 242, 254, 0.8); text-align: center;">
                                An investor has signed their Memorandum of Agreement
                              </p>
                            </td>
                          </tr>
                        </table>

                        <!-- Investor & Property Details -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="padding: 24px; background: rgba(34, 211, 238, 0.08); border-radius: 12px; border: 1px solid rgba(34, 211, 238, 0.15);">
                              <p style="margin: 0 0 16px 0; font-size: 14px; color: #22d3ee; font-weight: 600;">
                                📋 Transaction Details:
                              </p>
                              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                  <td style="padding: 8px 0;">
                                    <p style="margin: 0; font-size: 13px; color: rgba(224, 242, 254, 0.6);">Investor</p>
                                    <p style="margin: 4px 0 0 0; font-size: 15px; color: #ffffff; font-weight: 600;">${investorName}</p>
                                    <p style="margin: 2px 0 0 0; font-size: 13px; color: #22d3ee;">${investorEmail}</p>
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px 0;">
                                    <p style="margin: 0; font-size: 13px; color: rgba(224, 242, 254, 0.6);">Property Unit</p>
                                    <p style="margin: 4px 0 0 0; font-size: 15px; color: #ffffff; font-weight: 600;">${unitName}</p>
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px 0;">
                                    <p style="margin: 0; font-size: 13px; color: rgba(224, 242, 254, 0.6);">Ownership</p>
                                    <p style="margin: 4px 0 0 0; font-size: 15px; color: #ffffff; font-weight: 600;">${percentage}</p>
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px 0;">
                                    <p style="margin: 0; font-size: 13px; color: rgba(224, 242, 254, 0.6);">Ownership ID</p>
                                    <p style="margin: 4px 0 0 0; font-size: 15px; color: #ffffff; font-weight: 600;">#${ownershipId}</p>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>

                        <!-- CTA Button -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="padding: 32px 0; text-align: center;">
                              <a href="${moaUrl}" style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, #22d3ee 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; font-size: 18px; font-weight: 600; border-radius: 12px; box-shadow: 0 10px 30px rgba(34, 211, 238, 0.3), 0 0 20px rgba(34, 211, 238, 0.2); margin: 0 8px;">
                                📥 Download MOA
                              </a>
                              <a href="${env.NEXT_PUBLIC_APP_URL}/dashboard/admin/moas" style="display: inline-block; padding: 16px 48px; background: rgba(34, 211, 238, 0.1); color: #22d3ee; text-decoration: none; font-size: 18px; font-weight: 600; border-radius: 12px; border: 1px solid rgba(34, 211, 238, 0.3); margin: 0 8px;">
                                🗂️ View All MOAs
                              </a>
                            </td>
                          </tr>
                        </table>

                      </td>
                    </tr>
                  </table>

                  <!-- Footer -->
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 32px auto 0;">
                    <tr>
                      <td style="text-align: center; padding: 0 20px;">
                        <p style="margin: 0 0 8px 0; font-size: 13px; color: rgba(224, 242, 254, 0.5);">
                          Reef Resort Admin Notification
                        </p>
                        <p style="margin: 0; font-size: 12px; color: rgba(224, 242, 254, 0.4);">
                          This is an automated notification
                        </p>
                      </td>
                    </tr>
                  </table>

                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      });

      if (error) {
        console.error("Failed to send admin MOA signed notification:", error);
        throw new Error("Failed to send email");
      }

      return data;
    } catch (error) {
      console.error("Error in sendAdminMoaSignedNotification:", error);
      throw error;
    }
  },

  /**
   * Send manual payment under review email
   */
  async sendManualPaymentUnderReview(params: {
    to: string;
    userName: string;
    referenceCode: string;
    collectionName: string;
    percentage: string;
    amount: string;
    paymentMethod: string;
  }) {
    const { to, userName, referenceCode, collectionName, percentage, amount, paymentMethod } = params;

    try {
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject: "🕐 Payment Under Review - Reef Resort",
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Payment Under Review</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(180deg, #0a1929 0%, #0d1f31 50%, #0f2435 100%);">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(180deg, #0a1929 0%, #0d1f31 50%, #0f2435 100%); min-height: 100vh;">
              <tr>
                <td style="padding: 40px 20px;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, rgba(13, 31, 49, 0.95) 0%, rgba(10, 25, 41, 0.95) 100%); border-radius: 16px; border: 1px solid rgba(34, 211, 238, 0.2); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(34, 211, 238, 0.1);">
                    <tr>
                      <td style="padding: 48px 40px;">
                        <!-- Logo -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="text-align: center; padding-bottom: 32px;">
                              <div style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, rgba(34, 211, 238, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%); border-radius: 12px; border: 1px solid rgba(34, 211, 238, 0.3);">
                                <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff;">
                                  🌊 Reef Resort
                                </h1>
                              </div>
                            </td>
                          </tr>
                        </table>

                        <!-- Main Content -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="padding-top: 24px;">
                              <div style="text-align: center; margin-bottom: 24px;">
                                <div style="display: inline-block; padding: 12px; background: rgba(234, 179, 8, 0.2); border-radius: 50%;">
                                  <span style="font-size: 32px;">🕐</span>
                                </div>
                              </div>
                              <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #e0f2fe; text-align: center;">
                                Payment Under Review
                              </h2>
                              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: rgba(224, 242, 254, 0.8); text-align: center;">
                                Hi ${userName || "Investor"}, we've received your payment submission and it's now being reviewed by our team.
                              </p>
                            </td>
                          </tr>
                        </table>

                        <!-- Submission Details -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0;">
                          <tr>
                            <td style="padding: 24px; background: rgba(34, 211, 238, 0.08); border-radius: 12px; border: 1px solid rgba(34, 211, 238, 0.15);">
                              <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #22d3ee;">
                                Submission Details
                              </h3>
                              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                  <td style="padding: 8px 0; border-bottom: 1px solid rgba(34, 211, 238, 0.1);">
                                    <span style="color: rgba(224, 242, 254, 0.6); font-size: 14px;">Reference Code</span>
                                  </td>
                                  <td style="padding: 8px 0; border-bottom: 1px solid rgba(34, 211, 238, 0.1); text-align: right;">
                                    <span style="color: #22d3ee; font-size: 14px; font-weight: 600; font-family: monospace;">${referenceCode}</span>
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px 0; border-bottom: 1px solid rgba(34, 211, 238, 0.1);">
                                    <span style="color: rgba(224, 242, 254, 0.6); font-size: 14px;">Property</span>
                                  </td>
                                  <td style="padding: 8px 0; border-bottom: 1px solid rgba(34, 211, 238, 0.1); text-align: right;">
                                    <span style="color: #ffffff; font-size: 14px; font-weight: 500;">${collectionName}</span>
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px 0; border-bottom: 1px solid rgba(34, 211, 238, 0.1);">
                                    <span style="color: rgba(224, 242, 254, 0.6); font-size: 14px;">Ownership</span>
                                  </td>
                                  <td style="padding: 8px 0; border-bottom: 1px solid rgba(34, 211, 238, 0.1); text-align: right;">
                                    <span style="color: #ffffff; font-size: 14px; font-weight: 500;">${percentage}</span>
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px 0; border-bottom: 1px solid rgba(34, 211, 238, 0.1);">
                                    <span style="color: rgba(224, 242, 254, 0.6); font-size: 14px;">Amount</span>
                                  </td>
                                  <td style="padding: 8px 0; border-bottom: 1px solid rgba(34, 211, 238, 0.1); text-align: right;">
                                    <span style="color: #4ade80; font-size: 14px; font-weight: 600;">₱${amount}</span>
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px 0;">
                                    <span style="color: rgba(224, 242, 254, 0.6); font-size: 14px;">Payment Method</span>
                                  </td>
                                  <td style="padding: 8px 0; text-align: right;">
                                    <span style="color: #ffffff; font-size: 14px; font-weight: 500;">${paymentMethod}</span>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>

                        <!-- What's Next -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="padding: 24px; background: rgba(34, 211, 238, 0.05); border-radius: 12px; border: 1px solid rgba(34, 211, 238, 0.1);">
                              <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #e0f2fe;">
                                What happens next?
                              </h3>
                              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                  <td style="padding: 8px 0; vertical-align: top; width: 30px;">
                                    <span style="display: inline-block; width: 24px; height: 24px; line-height: 24px; text-align: center; background: rgba(34, 211, 238, 0.2); border-radius: 50%; color: #22d3ee; font-size: 12px; font-weight: 600;">1</span>
                                  </td>
                                  <td style="padding: 8px 0; vertical-align: top;">
                                    <p style="margin: 0; color: rgba(224, 242, 254, 0.8); font-size: 14px;">Our team will verify your payment within 24-48 hours</p>
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px 0; vertical-align: top; width: 30px;">
                                    <span style="display: inline-block; width: 24px; height: 24px; line-height: 24px; text-align: center; background: rgba(34, 211, 238, 0.2); border-radius: 50%; color: #22d3ee; font-size: 12px; font-weight: 600;">2</span>
                                  </td>
                                  <td style="padding: 8px 0; vertical-align: top;">
                                    <p style="margin: 0; color: rgba(224, 242, 254, 0.8); font-size: 14px;">Once approved, you'll receive a confirmation email with your unit assignment</p>
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px 0; vertical-align: top; width: 30px;">
                                    <span style="display: inline-block; width: 24px; height: 24px; line-height: 24px; text-align: center; background: rgba(34, 211, 238, 0.2); border-radius: 50%; color: #22d3ee; font-size: 12px; font-weight: 600;">3</span>
                                  </td>
                                  <td style="padding: 8px 0; vertical-align: top;">
                                    <p style="margin: 0; color: rgba(224, 242, 254, 0.8); font-size: 14px;">You can then sign your Memorandum of Agreement and complete your investment</p>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>

                        <!-- Contact Info -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 24px;">
                          <tr>
                            <td style="padding: 20px; background: rgba(59, 130, 246, 0.08); border-radius: 12px; border: 1px solid rgba(59, 130, 246, 0.15); text-align: center;">
                              <p style="margin: 0 0 12px 0; font-size: 14px; color: rgba(224, 242, 254, 0.8);">
                                Need help with your payment? Contact us on Facebook:
                              </p>
                              <a href="https://www.facebook.com/reefresortofficial" style="display: inline-block; padding: 10px 24px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 500; border-radius: 8px;">
                                📱 Message us on Facebook
                              </a>
                            </td>
                          </tr>
                        </table>

                        <!-- Footer -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="padding-top: 32px; text-align: center;">
                              <p style="margin: 0 0 8px 0; font-size: 13px; color: rgba(224, 242, 254, 0.5);">
                                Questions? Reply to this email or contact us at
                              </p>
                              <a href="mailto:support@reefresort.co" style="color: #22d3ee; text-decoration: none; font-size: 13px;">
                                support@reefresort.co
                              </a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      });

      if (error) {
        console.error("Failed to send manual payment under review email:", error);
        throw new Error("Failed to send email");
      }

      return data;
    } catch (error) {
      console.error("Error in sendManualPaymentUnderReview:", error);
      throw error;
    }
  },

  /**
   * Send booking confirmation email
   */
  async sendBookingConfirmation(params: {
    to: string;
    guestName: string;
    collectionName: string;
    unitName: string | null;
    checkIn: string;
    checkOut: string;
    guests: number;
    totalPrice: string;
    bookingId: number;
  }) {
    const { to, guestName, collectionName, unitName, checkIn, checkOut, guests, totalPrice, bookingId } = params;

    // Parse date without timezone conversion (avoids off-by-one day bug)
    const formatDate = (dateStr: string) => {
      const [year, month, day] = dateStr.split("-").map(Number);
      const date = new Date(year!, month! - 1, day);
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    };

    try {
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject: `🏖️ Booking Confirmed - ${collectionName}`,
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Booking Confirmation</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(180deg, #0a1929 0%, #0d1f31 50%, #0f2435 100%);">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(180deg, #0a1929 0%, #0d1f31 50%, #0f2435 100%); min-height: 100vh;">
              <tr>
                <td style="padding: 40px 20px;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, rgba(13, 31, 49, 0.95) 0%, rgba(10, 25, 41, 0.95) 100%); border-radius: 16px; border: 1px solid rgba(34, 211, 238, 0.2); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(34, 211, 238, 0.1);">
                    <tr>
                      <td style="padding: 48px 40px;">
                        <!-- Header -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="text-align: center; padding-bottom: 32px;">
                              <div style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, rgba(34, 211, 238, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%); border-radius: 12px; border: 1px solid rgba(34, 211, 238, 0.3);">
                                <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff;">
                                  🌊 Reef Resort
                                </h1>
                              </div>
                            </td>
                          </tr>
                        </table>

                        <!-- Success Icon -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="text-align: center; padding-bottom: 24px;">
                              <div style="display: inline-block; width: 80px; height: 80px; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); border-radius: 50%; line-height: 80px; font-size: 40px;">
                                ✓
                              </div>
                            </td>
                          </tr>
                        </table>

                        <!-- Welcome Message -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="text-align: center;">
                              <h2 style="margin: 0 0 8px 0; font-size: 28px; font-weight: 700; color: #ffffff;">
                                Booking Confirmed!
                              </h2>
                              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: rgba(224, 242, 254, 0.8);">
                                Hi ${guestName}, your reservation is confirmed. Get ready for an amazing stay!
                              </p>
                            </td>
                          </tr>
                        </table>

                        <!-- Booking Details -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="padding: 24px; background: rgba(34, 211, 238, 0.08); border-radius: 12px; border: 1px solid rgba(34, 211, 238, 0.15);">
                              <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #22d3ee;">
                                🏖️ Reservation Details
                              </p>

                              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                  <td style="padding: 8px 0; color: rgba(224, 242, 254, 0.7); font-size: 14px;">Property:</td>
                                  <td style="padding: 8px 0; color: #ffffff; font-size: 14px; font-weight: 600; text-align: right;">${collectionName}</td>
                                </tr>
                                ${unitName ? `
                                <tr>
                                  <td style="padding: 8px 0; color: rgba(224, 242, 254, 0.7); font-size: 14px;">Unit:</td>
                                  <td style="padding: 8px 0; color: #ffffff; font-size: 14px; font-weight: 600; text-align: right;">${unitName}</td>
                                </tr>
                                ` : ""}
                                <tr>
                                  <td style="padding: 8px 0; color: rgba(224, 242, 254, 0.7); font-size: 14px;">Check-in:</td>
                                  <td style="padding: 8px 0; color: #ffffff; font-size: 14px; font-weight: 600; text-align: right;">${formatDate(checkIn)}</td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px 0; color: rgba(224, 242, 254, 0.7); font-size: 14px;">Check-out:</td>
                                  <td style="padding: 8px 0; color: #ffffff; font-size: 14px; font-weight: 600; text-align: right;">${formatDate(checkOut)}</td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px 0; color: rgba(224, 242, 254, 0.7); font-size: 14px;">Guests:</td>
                                  <td style="padding: 8px 0; color: #ffffff; font-size: 14px; font-weight: 600; text-align: right;">${guests}</td>
                                </tr>
                                <tr>
                                  <td style="padding: 16px 0 0 0; border-top: 1px solid rgba(34, 211, 238, 0.2); color: rgba(224, 242, 254, 0.7); font-size: 14px;">Total Paid:</td>
                                  <td style="padding: 16px 0 0 0; border-top: 1px solid rgba(34, 211, 238, 0.2); color: #22d3ee; font-size: 20px; font-weight: 700; text-align: right;">₱${totalPrice}</td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>

                        <!-- Booking Reference -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 24px;">
                          <tr>
                            <td style="text-align: center; padding: 16px; background: rgba(59, 130, 246, 0.1); border-radius: 8px; border: 1px solid rgba(59, 130, 246, 0.2);">
                              <p style="margin: 0 0 4px 0; font-size: 12px; color: rgba(224, 242, 254, 0.6);">Booking Reference</p>
                              <p style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff; font-family: monospace;">BK-${String(bookingId).padStart(6, "0")}</p>
                            </td>
                          </tr>
                        </table>

                        <!-- What's Next -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 24px;">
                          <tr>
                            <td style="padding: 20px; background: rgba(34, 211, 238, 0.05); border-radius: 12px;">
                              <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #22d3ee;">📋 What's Next?</p>
                              <ul style="margin: 0; padding: 0 0 0 16px; color: rgba(224, 242, 254, 0.8); font-size: 13px; line-height: 1.8;">
                                <li>You'll receive check-in instructions 24 hours before arrival</li>
                                <li>Keep this email for your records</li>
                                <li>Contact us if you need to make any changes</li>
                              </ul>
                            </td>
                          </tr>
                        </table>

                        <!-- Footer -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="padding-top: 32px; text-align: center;">
                              <p style="margin: 0 0 8px 0; font-size: 13px; color: rgba(224, 242, 254, 0.5);">
                                Questions? Contact us at
                              </p>
                              <a href="mailto:support@reefresort.co" style="color: #22d3ee; text-decoration: none; font-size: 13px;">
                                support@reefresort.co
                              </a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      });

      if (error) {
        console.error("Failed to send booking confirmation email:", error);
        throw new Error("Failed to send email");
      }

      return data;
    } catch (error) {
      console.error("Error in sendBookingConfirmation:", error);
      throw error;
    }
  },

  /**
   * Send booking cancellation email
   */
  async sendBookingCancellation(params: {
    to: string;
    guestName: string;
    collectionName: string;
    checkIn: string;
    checkOut: string;
    reason?: string;
  }) {
    const { to, guestName, collectionName, checkIn, checkOut, reason } = params;

    // Parse date without timezone conversion (avoids off-by-one day bug)
    const formatDate = (dateStr: string) => {
      const [year, month, day] = dateStr.split("-").map(Number);
      const date = new Date(year!, month! - 1, day);
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    };

    try {
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject: `Booking Cancelled - ${collectionName}`,
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Booking Cancelled</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(180deg, #0a1929 0%, #0d1f31 50%, #0f2435 100%);">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(180deg, #0a1929 0%, #0d1f31 50%, #0f2435 100%); min-height: 100vh;">
              <tr>
                <td style="padding: 40px 20px;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, rgba(13, 31, 49, 0.95) 0%, rgba(10, 25, 41, 0.95) 100%); border-radius: 16px; border: 1px solid rgba(34, 211, 238, 0.2); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);">
                    <tr>
                      <td style="padding: 48px 40px;">
                        <!-- Header -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="text-align: center; padding-bottom: 32px;">
                              <div style="display: inline-block; padding: 16px 32px; background: rgba(239, 68, 68, 0.1); border-radius: 12px; border: 1px solid rgba(239, 68, 68, 0.3);">
                                <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff;">
                                  🌊 Reef Resort
                                </h1>
                              </div>
                            </td>
                          </tr>
                        </table>

                        <!-- Message -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="text-align: center;">
                              <h2 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: #ffffff;">
                                Booking Cancelled
                              </h2>
                              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: rgba(224, 242, 254, 0.8);">
                                Hi ${guestName}, your reservation at ${collectionName} has been cancelled.
                              </p>
                            </td>
                          </tr>
                        </table>

                        <!-- Booking Details -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="padding: 24px; background: rgba(239, 68, 68, 0.08); border-radius: 12px; border: 1px solid rgba(239, 68, 68, 0.15);">
                              <p style="margin: 0 0 16px 0; font-size: 14px; font-weight: 600; color: #ef4444;">
                                Cancelled Reservation
                              </p>

                              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                  <td style="padding: 8px 0; color: rgba(224, 242, 254, 0.7); font-size: 14px;">Property:</td>
                                  <td style="padding: 8px 0; color: #ffffff; font-size: 14px; font-weight: 600; text-align: right;">${collectionName}</td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px 0; color: rgba(224, 242, 254, 0.7); font-size: 14px;">Check-in:</td>
                                  <td style="padding: 8px 0; color: #ffffff; font-size: 14px; text-align: right;">${formatDate(checkIn)}</td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px 0; color: rgba(224, 242, 254, 0.7); font-size: 14px;">Check-out:</td>
                                  <td style="padding: 8px 0; color: #ffffff; font-size: 14px; text-align: right;">${formatDate(checkOut)}</td>
                                </tr>
                                ${reason ? `
                                <tr>
                                  <td colspan="2" style="padding: 16px 0 0 0; border-top: 1px solid rgba(239, 68, 68, 0.2);">
                                    <p style="margin: 0 0 4px 0; font-size: 12px; color: rgba(224, 242, 254, 0.6);">Reason:</p>
                                    <p style="margin: 0; font-size: 14px; color: rgba(224, 242, 254, 0.9);">${reason}</p>
                                  </td>
                                </tr>
                                ` : ""}
                              </table>
                            </td>
                          </tr>
                        </table>

                        <!-- Book Again CTA -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 24px;">
                          <tr>
                            <td style="text-align: center;">
                              <p style="margin: 0 0 16px 0; font-size: 14px; color: rgba(224, 242, 254, 0.7);">
                                We hope to see you again soon!
                              </p>
                              <a href="https://reefresort.co/book" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #22d3ee 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 10px;">
                                Book Another Stay
                              </a>
                            </td>
                          </tr>
                        </table>

                        <!-- Footer -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="padding-top: 32px; text-align: center;">
                              <p style="margin: 0 0 8px 0; font-size: 13px; color: rgba(224, 242, 254, 0.5);">
                                Questions? Contact us at
                              </p>
                              <a href="mailto:support@reefresort.co" style="color: #22d3ee; text-decoration: none; font-size: 13px;">
                                support@reefresort.co
                              </a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      });

      if (error) {
        console.error("Failed to send booking cancellation email:", error);
        throw new Error("Failed to send email");
      }

      return data;
    } catch (error) {
      console.error("Error in sendBookingCancellation:", error);
      throw error;
    }
  },
};
