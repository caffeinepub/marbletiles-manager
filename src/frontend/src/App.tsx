import { Toaster } from "@/components/ui/sonner";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { UserProfile } from "./backend";
import Layout from "./components/Layout";
import { useActor } from "./hooks/useActor";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import CustomersPage from "./pages/CustomersPage";
import DashboardPage from "./pages/DashboardPage";
import ExpensesPage from "./pages/ExpensesPage";
import InventoryPage from "./pages/InventoryPage";
import LoginPage from "./pages/LoginPage";
import PaymentsPage from "./pages/PaymentsPage";
import ReportsPage from "./pages/ReportsPage";
import SalesPage from "./pages/SalesPage";
import SetupProfilePage from "./pages/SetupProfilePage";

type ProfileState = "loading" | "missing" | "ready";

function RootLayout() {
  const { identity, isInitializing } = useInternetIdentity();
  const { actor, isFetching } = useActor();
  const [profileState, setProfileState] = useState<ProfileState>("loading");
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const loadProfile = () => {
    if (!actor || !identity || isFetching) return;
    actor
      .getCallerUserProfile()
      .then((profile) => {
        if (profile === null) {
          setProfileState("missing");
          setUserProfile(null);
        } else {
          setUserProfile(profile);
          setProfileState("ready");
        }
      })
      .catch(() => {
        // If call fails (e.g. guest not permitted), profile is missing
        setProfileState("missing");
        setUserProfile(null);
      });
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: loadProfile is stable per render
  useEffect(() => {
    if (!identity || !actor || isFetching) {
      if (!identity) setProfileState("loading");
      return;
    }
    setProfileState("loading");
    loadProfile();
  }, [actor, identity, isFetching]);

  if (isInitializing || (identity && profileState === "loading")) {
    return (
      <div
        className="flex items-center justify-center h-screen"
        style={{ backgroundColor: "#F3F0EA" }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xl text-white"
            style={{ backgroundColor: "#B8924A" }}
          >
            M
          </div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!identity) {
    return <LoginPage />;
  }

  if (profileState === "missing") {
    return (
      <SetupProfilePage
        onComplete={() => {
          setProfileState("loading");
          loadProfile();
        }}
      />
    );
  }

  const isAdmin =
    userProfile?.role === "superadmin" || userProfile?.role === "manager";

  return (
    <Layout isAdmin={isAdmin} userProfile={userProfile}>
      <Outlet />
    </Layout>
  );
}

const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  component: DashboardPage,
});

const inventoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/inventory",
  component: InventoryPage,
});

const salesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sales",
  component: SalesPage,
});

const paymentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/payments",
  component: PaymentsPage,
});

const customersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/customers",
  component: CustomersPage,
});

const expensesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/expenses",
  component: ExpensesPage,
});

const reportsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/reports",
  component: ReportsPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  dashboardRoute,
  inventoryRoute,
  salesRoute,
  paymentsRoute,
  customersRoute,
  expensesRoute,
  reportsRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster richColors position="top-right" />
    </>
  );
}
