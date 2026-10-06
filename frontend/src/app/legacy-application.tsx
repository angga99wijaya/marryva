"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { AppProvider } from "@/lib/store";

const HomePage = dynamic(() => import("@/legacy-pages/HomePage"));
const VendorDirectoryPage = dynamic(() => import("@/legacy-pages/VendorDirectoryPage"));
const VendorProfilePage = dynamic<{
  initialVendor?: Record<string, unknown> | null;
}>(() => import("@/legacy-pages/VendorProfilePage"));
const RealWeddingsPage = dynamic(() =>
  import("@/legacy-pages/RealWeddingsPage").then((module) => module.RealWeddingsPage),
);
const RealWeddingDetail = dynamic(() =>
  import("@/legacy-pages/RealWeddingsPage").then((module) => module.RealWeddingDetail),
);
const ChecklistPage = dynamic(() =>
  import("@/legacy-pages/ToolsPages").then((module) => module.ChecklistPage),
);
const BudgetPage = dynamic(() =>
  import("@/legacy-pages/ToolsPages").then((module) => module.BudgetPage),
);
const GuestListPage = dynamic(() =>
  import("@/legacy-pages/ToolsPages").then((module) => module.GuestListPage),
);
const SigninPage = dynamic(() =>
  import("@/legacy-pages/AuthPages").then((module) => module.SigninPage),
);
const SignupPage = dynamic(() =>
  import("@/legacy-pages/AuthPages").then((module) => module.SignupPage),
);
const FavoritesPage = dynamic(() =>
  import("@/legacy-pages/AccountPages").then((module) => module.FavoritesPage),
);
const VendorDashboardPage = dynamic(() =>
  import("@/legacy-pages/AccountPages").then((module) => module.VendorDashboardPage),
);
const AdminPage = dynamic(() =>
  import("@/legacy-pages/AccountPages").then((module) => module.AdminPage),
);
const RegistryPage = dynamic(() => import("@/legacy-pages/RegistryPage"));
const WebsiteBuilderPage = dynamic(() =>
  import("@/legacy-pages/WebsiteBuilderPage").then((module) => module.WebsiteBuilderPage),
);
const PublicWeddingSite = dynamic(() =>
  import("@/legacy-pages/WebsiteBuilderPage").then((module) => module.PublicWeddingSite),
);
const VendorBoostPage = dynamic(() => import("@/legacy-pages/VendorBoostPage"));
const BlastPage = dynamic(() => import("@/legacy-pages/BlastPage"));
const MyPlannerDashboard = dynamic(() => import("@/legacy-pages/MyPlannerDashboard"));
const DestinationsPage = dynamic(() => import("@/legacy-pages/DestinationsPage"));
const AIAssistant = dynamic(() => import("@/components/AIAssistant"), { ssr: false });

const routeTable: Record<string, ComponentType> = {
  "/": HomePage,
  "/vendors": VendorDirectoryPage,
  "/venues": () => <VendorDirectoryPage venuesOnly />,
  "/real-weddings": RealWeddingsPage,
  "/tools/checklist": ChecklistPage,
  "/tools/budget": BudgetPage,
  "/tools/guests": GuestListPage,
  "/tools/registry": RegistryPage,
  "/tools/website": WebsiteBuilderPage,
  "/tools/blast": BlastPage,
  "/tools/dashboard": MyPlannerDashboard,
  "/destinations": DestinationsPage,
  "/favorites": FavoritesPage,
  "/vendor/dashboard": VendorDashboardPage,
  "/vendor/boost": VendorBoostPage,
  "/admin": AdminPage,
  "/signin": SigninPage,
  "/signup": SignupPage,
};

function RouteContent({ initialVendor }: { initialVendor: Record<string, unknown> | null }) {
  const pathname = usePathname() ?? "/";
  const segments = pathname.split("/").filter(Boolean);
  let Page = routeTable[pathname];

  if (!Page && segments.length === 2 && segments[0] === "vendors") {
    return <VendorProfilePage key={pathname} initialVendor={initialVendor} />;
  }

  if (!Page && segments.length === 2 && segments[0] === "real-weddings") {
    Page = RealWeddingDetail;
  } else if (!Page && segments.length === 2 && segments[0] === "u") {
    Page = PublicWeddingSite;
  }

  if (!Page) {
    return (
      <main className="nk-container nk-section">
        <h1 className="nk-h1">Halaman tidak ditemukan</h1>
        <p className="nk-lead mt-4">Halaman yang Anda cari tidak tersedia.</p>
      </main>
    );
  }

  return <Page key={pathname} />;
}

export default function LegacyApplication({
  initialVendor = null,
}: {
  initialVendor?: Record<string, unknown> | null;
}) {
  return (
    <AppProvider>
      <RouteContent initialVendor={initialVendor} />
      <AIAssistant />
    </AppProvider>
  );
}
