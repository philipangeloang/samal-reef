"use client";

import { useState } from "react";
import Link from "next/link";
import { api, type RouterOutputs } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ShieldBan, ShieldCheck, Eye, Search } from "lucide-react";

type User = RouterOutputs["admin"]["getAllUsers"][number];

interface UsersManagementClientProps {
  initialUsers: User[];
}

export function UsersManagementClient({
  initialUsers,
}: UsersManagementClientProps) {
  const [roleFilter, setRoleFilter] = useState<User["role"] | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<User["status"] | "ALL">(
    "ALL",
  );
  const [searchTerm, setSearchTerm] = useState("");

  const { data: users = initialUsers } = api.admin.getAllUsers.useQuery(
    {
      role: roleFilter !== "ALL" ? roleFilter : undefined,
      status: statusFilter !== "ALL" ? statusFilter : undefined,
    },
    {
      initialData: initialUsers,
    },
  );

  // Filter users by name or email
  const filteredUsers = users.filter((user) => {
    const searchLower = searchTerm.toLowerCase();
    const name = user.name?.toLowerCase() ?? "";
    const email = user.email?.toLowerCase() ?? "";
    return name.includes(searchLower) || email.includes(searchLower);
  });

  const utils = api.useUtils();

  const suspendUser = api.admin.suspendUser.useMutation({
    onSuccess: async () => {
      toast.success("User suspended");
      await utils.admin.getAllUsers.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to suspend user");
    },
  });

  const reactivateUser = api.admin.reactivateUser.useMutation({
    onSuccess: async () => {
      toast.success("User reactivated");
      await utils.admin.getAllUsers.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to reactivate user");
    },
  });

  const updateUserRole = api.admin.updateUserRole.useMutation({
    onSuccess: async () => {
      toast.success("User role updated");
      await utils.admin.getAllUsers.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update role");
    },
  });

  const handleRoleChange = (userId: string, newRole: User["role"]) => {
    if (confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {
      updateUserRole.mutate({ userId, role: newRole });
    }
  };

  const handleSuspend = (userId: string) => {
    if (confirm("Are you sure you want to suspend this user?")) {
      suspendUser.mutate({ userId });
    }
  };

  const handleReactivate = (userId: string) => {
    if (confirm("Are you sure you want to reactivate this user?")) {
      reactivateUser.mutate({ userId });
    }
  };

  const getRoleBadge = (role: User["role"]) => {
    const roleStyles = {
      ADMIN: "bg-purple-400/20 text-purple-300 border-purple-400/30",
      STAFF: "bg-orange-400/20 text-orange-300 border-orange-400/30",
      AFFILIATE: "bg-blue-400/20 text-blue-300 border-blue-400/30",
      INVESTOR: "bg-green-400/20 text-green-300 border-green-400/30",
      VISITOR: "bg-gray-400/20 text-gray-300 border-gray-400/30",
    };

    const roleLabels: Record<User["role"], string> = {
      ADMIN: "ADMIN",
      STAFF: "STAFF",
      AFFILIATE: "AFFILIATE",
      INVESTOR: "OWNER",
      VISITOR: "VISITOR",
    };

    return (
      <Badge className={roleStyles[role]}>
        {roleLabels[role]}
      </Badge>
    );
  };

  const getStatusBadge = (status: User["status"]) => {
    return (
      <Badge
        className={
          status === "ACTIVE"
            ? "bg-green-400/20 text-green-300"
            : "bg-gray-400/20 text-gray-300"
        }
      >
        {status}
      </Badge>
    );
  };

  return (
    <Card className="border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white">Platform Users</CardTitle>
            <CardDescription className="text-cyan-100/60">
              {filteredUsers.length} of {users.length} users
            </CardDescription>
          </div>
          <div className="flex gap-4">
            <Select
              value={roleFilter}
              onValueChange={(
                value: "ADMIN" | "STAFF" | "AFFILIATE" | "INVESTOR" | "VISITOR" | "ALL",
              ) => setRoleFilter(value)}
            >
              <SelectTrigger className="w-[150px] border-cyan-400/30 bg-[#0a1929]/50 text-cyan-100">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Roles</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="STAFF">Staff</SelectItem>
                <SelectItem value="AFFILIATE">Affiliate</SelectItem>
                <SelectItem value="INVESTOR">Owner</SelectItem>
                <SelectItem value="VISITOR">Visitor</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={(value: "ACTIVE" | "SUSPENDED" | "ALL") =>
                setStatusFilter(value)
              }
            >
              <SelectTrigger className="w-[150px] border-cyan-400/30 bg-[#0a1929]/50 text-cyan-100">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Search Filter */}
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-400" />
          <Input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border-cyan-400/30 bg-[#0a1929]/50 pl-10 text-cyan-100 placeholder:text-cyan-100/40"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchTerm("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-cyan-300 hover:bg-cyan-400/20 hover:text-cyan-200"
            >
              Clear
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-lg border border-cyan-400/20">
          <Table>
            <TableHeader>
              <TableRow className="border-cyan-400/20 bg-[#0a1929]/50 hover:bg-[#0a1929]/70">
                <TableHead className="text-cyan-100">User</TableHead>
                <TableHead className="text-cyan-100">Role</TableHead>
                <TableHead className="text-cyan-100">Status</TableHead>
                <TableHead className="text-cyan-100">Joined</TableHead>
                <TableHead className="text-right text-cyan-100">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-cyan-100/60">
                    {users.length === 0
                      ? "No users found with current filters."
                      : "No users match your search."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow
                    key={user.id}
                    className="border-cyan-400/10 transition-colors hover:bg-cyan-400/5"
                  >
                    <TableCell>
                      <div>
                        <div className="font-medium text-white">
                          {user.name ?? "No name"}
                        </div>
                        <div className="text-sm text-cyan-100/60">{user.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.role}
                        onValueChange={(value: User["role"]) => handleRoleChange(user.id, value)}
                        disabled={updateUserRole.isPending}
                      >
                        <SelectTrigger className="w-[130px] border-cyan-400/30 bg-[#0a1929]/50 text-cyan-100">
                          <SelectValue>{getRoleBadge(user.role)}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                          <SelectItem value="STAFF">Staff</SelectItem>
                          <SelectItem value="AFFILIATE">Affiliate</SelectItem>
                          <SelectItem value="INVESTOR">Owner</SelectItem>
                          <SelectItem value="VISITOR">Visitor</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>{getStatusBadge(user.status)}</TableCell>
                    <TableCell className="text-cyan-100/70">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="text-cyan-400 hover:bg-cyan-400/20 hover:text-cyan-300"
                        >
                          <Link href={`/dashboard/admin/users/${user.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </Link>
                        </Button>
                        {user.status === "ACTIVE" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSuspend(user.id)}
                            disabled={suspendUser.isPending}
                            className="text-orange-300 hover:bg-orange-400/20 hover:text-orange-200"
                          >
                            <ShieldBan className="mr-2 h-4 w-4" />
                            Suspend
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReactivate(user.id)}
                            disabled={reactivateUser.isPending}
                            className="text-green-300 hover:bg-green-400/20 hover:text-green-200"
                          >
                            <ShieldCheck className="mr-2 h-4 w-4" />
                            Reactivate
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
