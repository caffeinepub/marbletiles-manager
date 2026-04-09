import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Info, Lock, Shield, ShieldAlert, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useActor } from "../hooks/useActor";
import type { UserProfile } from "../types";

type PrincipalLike = { toText: () => string };
type UserEntry = [PrincipalLike, UserProfile];

const getRoleBadge = (role: string) => {
  if (role === "superadmin")
    return { bg: "bg-amber-100", text: "text-amber-800", label: "Super Admin" };
  if (role === "manager")
    return { bg: "bg-green-100", text: "text-green-800", label: "Manager" };
  return { bg: "bg-gray-100", text: "text-gray-600", label: "Staff" };
};

function UserRowSkeleton() {
  return (
    <div className="flex items-center gap-3 py-3 px-4">
      <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-6 w-20 rounded-full" />
    </div>
  );
}

export default function AdminPage() {
  const { actor, isFetching } = useActor();
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [updatingPrincipal, setUpdatingPrincipal] = useState<string | null>(
    null,
  );

  const fetchData = useCallback(async () => {
    if (!actor) return;
    setLoading(true);
    setAccessDenied(false);
    try {
      const profile = await actor.getCallerUserProfile();
      setMyProfile(profile);
      if (profile?.role === "superadmin") {
        try {
          const all = (await (
            actor as any
          ).getAllUserProfiles()) as UserEntry[];
          setUsers(all);
        } catch {
          setAccessDenied(true);
        }
      }
    } catch {
      setAccessDenied(true);
    } finally {
      setLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    if (isFetching) return;
    if (!actor) {
      setLoading(false);
      return;
    }
    fetchData();
  }, [actor, isFetching, fetchData]);

  const isSuperAdmin = myProfile?.role === "superadmin";

  const handleRoleChange = async (
    principal: PrincipalLike,
    profile: UserProfile,
    newRole: string,
  ) => {
    if (!actor) return;
    const principalText = principal.toText();
    setUpdatingPrincipal(principalText);
    try {
      await (actor as any).updateUserProfile(principal, {
        ...profile,
        role: newRole,
      });
      toast.success(`${profile.name}-এর role ${newRole}-এ পরিবর্তন হয়েছে`);
      await fetchData();
    } catch {
      toast.error("Role update করা যায়নি");
    } finally {
      setUpdatingPrincipal(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5" data-ocid="admin.loading_state">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Card className="bg-white rounded-xl shadow-card border-0">
          <CardContent className="pt-4 divide-y divide-border">
            {[1, 2, 3].map((i) => (
              <UserRowSkeleton key={i} />
            ))}
          </CardContent>
        </Card>
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div
        className="flex flex-col items-center justify-center py-20 space-y-4"
        data-ocid="admin.error_state"
      >
        <ShieldAlert className="w-16 h-16 text-destructive" />
        <h2 className="text-xl font-bold text-foreground">Access Denied</h2>
        <p className="text-muted-foreground text-center max-w-sm">
          You need Super Admin privileges to access the Admin Panel.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Shield className="w-5 h-5" style={{ color: "#B8924A" }} />
        <h2 className="text-lg font-bold text-foreground">Admin Panel</h2>
      </div>

      {/* Data Sharing Info Banner */}
      <div
        className="flex items-start gap-3 rounded-xl p-4 border"
        style={{ backgroundColor: "#FDF8F0", borderColor: "#E8D5B0" }}
        data-ocid="admin.panel"
      >
        <Info
          className="w-5 h-5 mt-0.5 flex-shrink-0"
          style={{ color: "#B8924A" }}
        />
        <div>
          <p className="text-sm font-semibold" style={{ color: "#7A5C2A" }}>
            📢 Shared Company Data
          </p>
          <p className="text-sm mt-0.5" style={{ color: "#8B6B3A" }}>
            Admin যে data upload করবে, Manager ও Staff সবাই সেই data দেখতে পাবে।
          </p>
          <p className="text-xs mt-1 text-muted-foreground">
            All team members share the same inventory, sales, and customer data.
          </p>
        </div>
      </div>

      {/* Team Members Card */}
      <Card className="bg-white rounded-xl shadow-card border-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Users className="w-4 h-4" style={{ color: "#B8924A" }} />
            Team Members
            {users.length > 0 && (
              <span
                className="ml-1 inline-flex items-center justify-center text-xs font-bold text-white rounded-full w-5 h-5"
                style={{ backgroundColor: "#B8924A" }}
              >
                {users.length}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 px-0 pb-2">
          {accessDenied ? (
            <div
              className="flex flex-col items-center py-8 space-y-2 text-center px-4"
              data-ocid="admin.error_state"
            >
              <ShieldAlert className="w-8 h-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Unable to load user list.
              </p>
            </div>
          ) : users.length === 0 ? (
            <div
              className="flex flex-col items-center py-8 space-y-2"
              data-ocid="admin.empty_state"
            >
              <Users className="w-8 h-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No users found</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {users.map(([principal, profile], idx) => {
                const principalText = principal.toText();
                const rb = getRoleBadge(profile.role);
                const isMe = profile.name === myProfile?.name;
                const isSA = profile.role === "superadmin";
                const isUpdating = updatingPrincipal === principalText;

                return (
                  <div
                    key={principalText}
                    className="flex items-center gap-3 py-3 px-4"
                    data-ocid={`admin.item.${idx + 1}`}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm flex-shrink-0"
                      style={{ backgroundColor: "#B8924A" }}
                    >
                      {profile.name?.charAt(0)?.toUpperCase() || "U"}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {profile.name}
                        </p>
                        {isMe && (
                          <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 flex-shrink-0">
                            You
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isSA ? (
                        <div className="flex items-center gap-1">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${rb.bg} ${rb.text}`}
                          >
                            {rb.label}
                          </span>
                          <Lock className="w-3.5 h-3.5 text-amber-500" />
                        </div>
                      ) : isMe ? (
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${rb.bg} ${rb.text}`}
                        >
                          {rb.label}
                        </span>
                      ) : (
                        <Select
                          value={profile.role}
                          onValueChange={(val) =>
                            handleRoleChange(principal, profile, val)
                          }
                          disabled={isUpdating}
                        >
                          <SelectTrigger
                            className="h-8 text-xs border rounded-full px-3 py-1 w-auto min-w-[90px]"
                            data-ocid="admin.select"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="staff">Staff</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Roles Explanation */}
      <Card className="bg-white rounded-xl shadow-card border-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            Role Permissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              {
                label: "Super Admin",
                color: "#B8924A",
                badgeBg: "bg-amber-100",
                badgeText: "text-amber-800",
                desc: "সব কিছুতে access আছে। শুধুমাত্র একজন (company owner)।",
                lock: true,
              },
              {
                label: "Manager",
                color: "#22c55e",
                badgeBg: "bg-green-100",
                badgeText: "text-green-800",
                desc: "Inventory, sales এবং reports manage করতে পারবে।",
                lock: false,
              },
              {
                label: "Staff",
                color: "#6b7280",
                badgeBg: "bg-gray-100",
                badgeText: "text-gray-600",
                desc: "Billing করতে এবং stock দেখতে পারবে।",
                lock: false,
              },
            ].map((r) => (
              <div
                key={r.label}
                className="flex items-start gap-3 rounded-lg p-3 border border-border"
              >
                <div
                  className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0"
                  style={{ backgroundColor: r.color }}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${r.badgeBg} ${r.badgeText}`}
                    >
                      {r.label}
                    </span>
                    {r.lock && <Lock className="w-3 h-3 text-amber-500" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{r.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
