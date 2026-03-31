import { Button } from "@/components/ui/button";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  ChevronRight,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Receipt,
  ShoppingCart,
  Users,
  X,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/inventory", label: "Inventory", icon: Package },
  { path: "/sales", label: "Sales", icon: ShoppingCart },
  { path: "/payments", label: "Payments", icon: CreditCard },
  { path: "/customers", label: "Customers", icon: Users },
  { path: "/expenses", label: "Expenses", icon: Receipt, adminOnly: true },
  { path: "/reports", label: "Reports", icon: BarChart3, adminOnly: true },
];

interface LayoutProps {
  children: ReactNode;
  isAdmin: boolean;
}

export default function Layout({ children, isAdmin }: LayoutProps) {
  const { clear } = useInternetIdentity();
  const router = useRouterState();
  const currentPath = router.location.pathname;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const visibleNav = navItems.filter((item) => !item.adminOnly || isAdmin);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 py-6 border-b border-charcoal-light">
        <img
          src="/assets/file-019d443c-2e5b-744a-80bb-f49f214ea06a.jpg"
          className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
          alt="RR"
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
              data-ocid={`nav.${item.label.toLowerCase()}.link`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
              {active && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-charcoal-light">
        <Button
          variant="ghost"
          className="w-full justify-start text-white/60 hover:text-white hover:bg-white/5 gap-3 text-sm"
          onClick={clear}
          data-ocid="nav.logout.button"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );

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
            {navItems.find((n) => n.path === currentPath)?.label ??
              "Radha Rani Marble House"}
          </h1>
          <div className="ml-auto flex items-center gap-2">
            {isAdmin && (
              <span
                className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                style={{ backgroundColor: "#B8924A20", color: "#B8924A" }}
              >
                Admin
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
