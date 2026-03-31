import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  ChevronRight,
  CreditCard,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Plus,
  Receipt,
  Settings2,
  Shield,
  ShoppingCart,
  Users,
  X,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import type { UserProfile } from "../backend";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/inventory", label: "Inventory", icon: Package },
  { path: "/sales", label: "Sales", icon: ShoppingCart },
  { path: "/payments", label: "Payments", icon: CreditCard },
  { path: "/customers", label: "Customers", icon: Users },
  { path: "/expenses", label: "Expenses", icon: Receipt, managerOnly: true },
  { path: "/reports", label: "Reports", icon: BarChart3, managerOnly: true },
  { path: "/finance", label: "Finance", icon: Landmark, managerOnly: true },
  { path: "/admin", label: "Admin Panel", icon: Shield, managerOnly: true },
  { path: "/settings", label: "Settings", icon: Settings2 },
];

interface LayoutProps {
  children: ReactNode;
  isAdmin: boolean;
  userProfile: UserProfile | null;
  onLogout: () => void;
}

const roleLabel = (role: string) => {
  if (role === "superadmin") return "Super Admin";
  if (role === "manager") return "Manager";
  return "Staff";
};

const roleBadgeStyle = (role: string) => {
  if (role === "superadmin")
    return { backgroundColor: "#B8924A20", color: "#B8924A" };
  if (role === "manager")
    return { backgroundColor: "#E8F5E9", color: "#2E7D32" };
  return { backgroundColor: "#EEE", color: "#555" };
};

function RealTimeClock() {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="hidden sm:inline-flex text-xs font-mono text-muted-foreground tabular-nums">
      {time.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })}
    </span>
  );
}

export default function Layout({
  children,
  isAdmin,
  userProfile,
  onLogout,
}: LayoutProps) {
  const router = useRouterState();
  const navigate = useNavigate();
  const currentPath = router.location.pathname;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const visibleNav = navItems.filter((item) => !item.managerOnly || isAdmin);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 py-6 border-b border-charcoal-light">
        <img
          src="/assets/file-019d4401-ef71-762a-a4e0-e28a94ec321e.jpg"
          className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
          alt="RR"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
        <div className="min-w-0">
          <p className="text-white font-semibold text-sm leading-tight">
            Radha Rani
          </p>
          <p className="text-white/50 text-xs">Marble House</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {visibleNav.map((item) => {
          const Icon = item.icon;
          const active =
            currentPath === item.path ||
            currentPath.startsWith(`${item.path}/`);
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active
                  ? "text-white"
                  : "text-white/60 hover:text-white/90 hover:bg-white/5"
              }`}
              style={active ? { backgroundColor: "#B8924A" } : {}}
              data-ocid={`nav.${item.label.toLowerCase().replace(" ", "-")}.link`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
              {active && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
            </Link>
          );
        })}
      </nav>

      {userProfile && (
        <div className="px-4 py-3 border-t border-charcoal-light">
          <p className="text-white/70 text-xs font-medium truncate">
            {userProfile.name}
          </p>
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1"
            style={roleBadgeStyle(userProfile.role)}
          >
            {roleLabel(userProfile.role)}
          </span>
        </div>
      )}

      <div className="p-3 border-t border-charcoal-light">
        <Button
          variant="ghost"
          className="w-full justify-start text-white/60 hover:text-white hover:bg-white/5 gap-3 text-sm"
          onClick={onLogout}
          data-ocid="nav.logout.button"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  const pageTitle =
    navItems.find((n) => n.path === currentPath)?.label ??
    "Radha Rani Marble House";

  return (
    <div className="flex h-screen overflow-hidden">
      <aside
        className="hidden lg:flex flex-col w-56 flex-shrink-0"
        style={{ backgroundColor: "#1C2123" }}
      >
        <SidebarContent />
      </aside>

      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: overlay backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setSidebarOpen(false)}
          />
          <aside
            className="relative flex flex-col w-64 flex-shrink-0"
            style={{ backgroundColor: "#1C2123" }}
          >
            <button
              type="button"
              className="absolute top-4 right-4 text-white/60 hover:text-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <header className="bg-white border-b border-border flex items-center gap-3 px-4 py-3 flex-shrink-0">
          <button
            type="button"
            className="lg:hidden text-foreground"
            onClick={() => setSidebarOpen(true)}
            data-ocid="nav.menu.button"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-base font-semibold text-foreground capitalize">
            {pageTitle}
          </h1>

          <div className="ml-auto flex items-center gap-3">
            <RealTimeClock />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className="text-white gap-1"
                  style={{ backgroundColor: "#B8924A" }}
                  data-ocid="nav.primary_button"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Quick Add</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" data-ocid="nav.dropdown_menu">
                <DropdownMenuItem
                  onClick={() => navigate({ to: "/sales" })}
                  data-ocid="nav.sale.link"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" /> New Sale
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate({ to: "/inventory" })}
                  data-ocid="nav.inventory.link"
                >
                  <Package className="w-4 h-4 mr-2" /> Add Product
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate({ to: "/expenses" })}
                  data-ocid="nav.expense.link"
                >
                  <Receipt className="w-4 h-4 mr-2" /> Record Expense
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {userProfile && (
              <span
                className="hidden md:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                style={roleBadgeStyle(userProfile.role)}
              >
                {roleLabel(userProfile.role)}
              </span>
            )}
          </div>
        </header>

        <main
          className="flex-1 overflow-y-auto"
          style={{ backgroundColor: "#F3F0EA" }}
        >
          <div className="p-4 md:p-6 max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
