/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { siteConfig } from "@/site.config";
import { api } from "@/trpc/react";
import { EditNameDialog } from "./edit-name-dialog";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  Users,
  Building2,
  DollarSign,
  Settings,
  LogOut,
  Tag,
  Home,
  ChevronUp,
  Wallet,
  BarChart3,
  FileText,
  UserPen,
  Layers,
  Receipt,
  ClipboardCheck,
  CalendarDays,
  Settings2,
  CheckCircle,
  Briefcase,
  ShieldCheck,
  ImageIcon,
} from "lucide-react";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

const navItems: NavItem[] = [
  {
    title: "Overview",
    href: "/dashboard/admin",
    icon: LayoutDashboard,
    roles: ["ADMIN"],
  },
  {
    title: "Collections",
    href: "/dashboard/admin/collections",
    icon: Layers,
    roles: ["ADMIN"],
  },
  {
    title: "Gallery",
    href: "/dashboard/admin/gallery",
    icon: ImageIcon,
    roles: ["ADMIN"],
  },
  {
    title: "Units",
    href: "/dashboard/admin/units",
    icon: Building2,
    roles: ["ADMIN"],
  },
  {
    title: "Pricing",
    href: "/dashboard/admin/pricing",
    icon: Tag,
    roles: ["ADMIN"],
  },
  {
    title: "Transactions",
    href: "/dashboard/admin/transactions",
    icon: Receipt,
    roles: ["ADMIN"],
  },
  {
    title: "Users",
    href: "/dashboard/admin/users",
    icon: Settings,
    roles: ["ADMIN"],
  },
  {
    title: "Affiliates",
    href: "/dashboard/admin/affiliates",
    icon: Users,
    roles: ["ADMIN"],
  },
  {
    title: "Commissions",
    href: "/dashboard/admin/commissions",
    icon: DollarSign,
    roles: ["ADMIN"],
  },
  {
    title: "MOAs",
    href: "/dashboard/admin/moas",
    icon: FileText,
    roles: ["ADMIN"],
  },
  {
    title: "Manual Payments",
    href: "/dashboard/admin/manual-payments",
    icon: ClipboardCheck,
    roles: ["ADMIN"],
  },
  {
    title: "Bookings",
    href: "/dashboard/admin/bookings",
    icon: CalendarDays,
    roles: ["ADMIN"],
  },
  // TODO: Re-enable when revenue/payout features are ready for production
  // {
  //   title: "Booking Revenue",
  //   href: "/dashboard/admin/booking-revenue",
  //   icon: BarChart3,
  //   roles: ["ADMIN"],
  // },
  {
    title: "Smoobu",
    href: "/dashboard/admin/smoobu",
    icon: Settings2,
    roles: ["ADMIN"],
  },

  // Staff routes
  {
    title: "Overview",
    href: "/dashboard/staff",
    icon: LayoutDashboard,
    roles: ["STAFF"],
  },
  {
    title: "Add Ownership",
    href: "/dashboard/staff/add-ownership",
    icon: Building2,
    roles: ["STAFF"],
  },
  {
    title: "Add Booking",
    href: "/dashboard/staff/add-booking",
    icon: CalendarDays,
    roles: ["STAFF"],
  },
  {
    title: "My Submissions",
    href: "/dashboard/staff/submissions",
    icon: ClipboardCheck,
    roles: ["STAFF"],
  },

  // Affiliate routes
  {
    title: "Overview",
    href: "/dashboard/affiliate",
    icon: LayoutDashboard,
    roles: ["AFFILIATE"],
  },
  // Owner routes
  {
    title: "Overview",
    href: "/dashboard/investor",
    icon: LayoutDashboard,
    roles: ["INVESTOR"],
  },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isEditNameOpen, setIsEditNameOpen] = useState(false);

  // Fetch user profiles to determine what dashboards they can access
  const { data: profiles } = api.user.getMyProfiles.useQuery(undefined, {
    enabled: !!session?.user,
  });

  if (!session?.user) return null;

  const userRole = session.user.role;

  // Determine current dashboard view
  const isOnAffiliateDashboard = pathname.startsWith("/dashboard/affiliate");
  const isOnInvestorDashboard = pathname.startsWith("/dashboard/investor");
  const isOnAdminDashboard = pathname.startsWith("/dashboard/admin");
  const isOnStaffDashboard = pathname.startsWith("/dashboard/staff");

  // Context-aware filtering: Only show nav for current dashboard
  const filteredNavItems = navItems.filter((item) => {
    if (!item.roles) return true;

    // Admin dashboard
    if (isOnAdminDashboard && item.roles.includes("ADMIN")) return true;

    // Staff dashboard - only show staff nav
    if (isOnStaffDashboard && item.roles.includes("STAFF")) return true;

    // Affiliate dashboard - only show affiliate nav
    if (isOnAffiliateDashboard && item.roles.includes("AFFILIATE")) return true;

    // Owner dashboard - only show owner nav
    if (isOnInvestorDashboard && item.roles.includes("INVESTOR")) return true;

    return false;
  });

  // Use actual name from database, fallback to email-derived name
  const username =
    session.user.name ?? session.user.email?.split("@")[0] ?? "User";
  const userInitials = username.substring(0, 2).toUpperCase();

  return (
    <Sidebar className="border-cyan-400/20 bg-gradient-to-b from-[#0d1f31] to-[#0a1929]">
      {/* Logo Header */}
      <SidebarHeader className="border-b border-cyan-400/20">
        <Link href="/" className="flex items-center gap-3 px-2 py-4">
          <Image
            src="/Logo.png"
            alt={siteConfig.brand.name}
            width={32}
            height={32}
            className="h-8 w-8"
          />
          <span className="bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-lg font-bold text-transparent">
            {siteConfig.brand.name}
          </span>
        </Link>
      </SidebarHeader>

      {/* Navigation Menu */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredNavItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={
                        isActive
                          ? "bg-cyan-400/20 text-cyan-300 hover:bg-cyan-400/30"
                          : "text-cyan-100/60 hover:bg-cyan-400/10 hover:text-cyan-100"
                      }
                    >
                      <Link href={item.href}>
                        <Icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* User Menu Footer */}
      <SidebarFooter className="border-t border-cyan-400/20">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center gap-3 rounded-lg p-2 transition-colors hover:bg-cyan-400/10 focus:ring-2 focus:ring-cyan-400 focus:outline-none">
                  <Avatar className="h-8 w-8 border-2 border-cyan-400">
                    <AvatarFallback className="bg-gradient-to-r from-cyan-400 to-blue-400 text-xs text-white">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-1 flex-col items-start text-left">
                    <p className="text-xs font-medium text-white">{username}</p>
                    <p className="text-[10px] text-cyan-100/60">{userRole}</p>
                  </div>
                  <ChevronUp className="h-4 w-4 text-cyan-100/60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                side="top"
                className="w-56 border-cyan-400/20 bg-[#0d1f31]"
              >
                <DropdownMenuItem asChild>
                  <Link
                    href="/"
                    className="flex cursor-pointer items-center text-cyan-100/70 hover:text-cyan-100 focus:text-cyan-100"
                  >
                    <Home className="mr-2 h-4 w-4" />
                    Back to Home
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    href="/dashboard/bookings"
                    className="flex cursor-pointer items-center text-cyan-100/70 hover:text-cyan-100 focus:text-cyan-100"
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    My Bookings
                  </Link>
                </DropdownMenuItem>

                {/* Dashboard Switcher - Show if user has multiple dashboard options */}
                {profiles &&
                  (profiles?.hasAffiliateProfile ||
                    profiles?.hasInvestorProfile ||
                    profiles?.isStaff ||
                    profiles?.isAdmin) && (
                    <>
                      <DropdownMenuSeparator className="bg-cyan-400/20" />

                      {/* Show Admin Dashboard option if they are admin and not currently on it */}
                      {profiles?.isAdmin && !isOnAdminDashboard && (
                        <DropdownMenuItem asChild>
                          <Link
                            href="/dashboard/admin"
                            className="flex cursor-pointer items-center text-cyan-100/70 hover:text-cyan-100 focus:text-cyan-100"
                          >
                            <ShieldCheck className="mr-2 h-4 w-4" />
                            Admin Dashboard
                          </Link>
                        </DropdownMenuItem>
                      )}

                      {/* Show Staff Dashboard option if they are staff/admin and not currently on it */}
                      {(profiles?.isStaff || profiles?.isAdmin) &&
                        !isOnStaffDashboard && (
                          <DropdownMenuItem asChild>
                            <Link
                              href="/dashboard/staff"
                              className="flex cursor-pointer items-center text-cyan-100/70 hover:text-cyan-100 focus:text-cyan-100"
                            >
                              <Briefcase className="mr-2 h-4 w-4" />
                              Staff Dashboard
                            </Link>
                          </DropdownMenuItem>
                        )}

                      {/* Show Owner Dashboard option if they have investor profile and not currently on it */}
                      {profiles?.hasInvestorProfile &&
                        !isOnInvestorDashboard && (
                          <DropdownMenuItem asChild>
                            <Link
                              href="/dashboard/investor"
                              className="flex cursor-pointer items-center text-cyan-100/70 hover:text-cyan-100 focus:text-cyan-100"
                            >
                              <Wallet className="mr-2 h-4 w-4" />
                              My Investments
                            </Link>
                          </DropdownMenuItem>
                        )}

                      {/* Show Affiliate Dashboard option if they have affiliate profile and not currently on it */}
                      {profiles?.hasAffiliateProfile &&
                        !isOnAffiliateDashboard && (
                          <DropdownMenuItem asChild>
                            <Link
                              href="/dashboard/affiliate"
                              className="flex cursor-pointer items-center text-cyan-100/70 hover:text-cyan-100 focus:text-cyan-100"
                            >
                              <BarChart3 className="mr-2 h-4 w-4" />
                              Affiliate Dashboard
                            </Link>
                          </DropdownMenuItem>
                        )}
                    </>
                  )}

                <DropdownMenuSeparator className="bg-cyan-400/20" />
                <DropdownMenuItem
                  onClick={() => setIsEditNameOpen(true)}
                  className="flex cursor-pointer items-center text-cyan-100/70 hover:text-cyan-100 focus:text-cyan-100"
                >
                  <UserPen className="mr-2 h-4 w-4" />
                  Edit Name
                </DropdownMenuItem>

                <DropdownMenuSeparator className="bg-cyan-400/20" />
                <DropdownMenuItem asChild>
                  <Link
                    href="/api/auth/signout"
                    className="flex cursor-pointer items-center text-red-400 hover:text-red-300 focus:text-red-300"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      {/* Edit Name Dialog */}
      <EditNameDialog open={isEditNameOpen} onOpenChange={setIsEditNameOpen} />
    </Sidebar>
  );
}
