import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Dashboard } from "./components/dashboard/Dashboard";
import { SystemOverview } from "./pages/SystemOverview";
import { Help } from "./pages/Help";
import { Team } from "./pages/Team";
import { LoginPage } from "./pages/LoginPage";
import { SystemOutage } from "./pages/SystemOutage";
import { InviteHandler } from "./components/group-manager/GroupManager";
import { fetchSystemStatus } from "./lib/api";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { QueueProvider } from "./context/QueueContext";
import { SecurityBanner } from "./components/banners/SecurityBanner";
import { ClassificationBanner } from "./components/banners/ClassificationBanner";

const queryClient = new QueryClient();

const AppContent = () => {
  const {
    data: status,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["session"],
    queryFn: fetchSystemStatus,
    retry: false,
    staleTime: 0,
    refetchInterval: 10000, // Poll every 10s
  });

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">
          Establishing Secure Connection...
        </p>
      </div>
    );
  }

  // --- LOGIC UPDATE ---

  // 1. OUTAGE CHECK
  // If online is false, it means either RAG Core is down OR a dependency is down
  if (status && !status.online && status.dependencies) {
    return (
      <SystemOutage services={status.dependencies} onRetry={() => refetch()} />
    );
  }

  // 2. AUTH CHECK
  // If we are here, systems are nominal. Check if user is logged in.
  // Note: status.user will be present even in "Guest" mode (id=0)
  const isAuthenticated = status?.user && status.user.id > 0;

  return (
    <BrowserRouter basename="/airbud">
      <Routes>
        <Route
          path="/login"
          element={
            isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />
          }
        />

        <Route
          path="/system-overview"
          element={
            isAuthenticated ? (
              <SystemOverview />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="/help"
          element={
            isAuthenticated ? <Help /> : <Navigate to="/login" replace />
          }
        />

        <Route
          path="/groups/join/:token"
          element={
            isAuthenticated ? (
              <InviteHandler />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Routes */}
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Navigate to="/collections" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/our-team"
          element={
            isAuthenticated ? <Team /> : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/collections"
          element={
            isAuthenticated ? <Dashboard /> : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/collections/:id"
          element={
            isAuthenticated ? <Dashboard /> : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/groups"
          element={
            isAuthenticated ? <Dashboard /> : <Navigate to="/login" replace />
          }
        />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <QueueProvider>

        {/* Main Application Container */}
        <div className="fixed inset-0 bg-background flex flex-col overflow-hidden">
          {/* --- TOP BANNER --- */}
          <div className="relative z-[10001] shrink-0">
            <ClassificationBanner position="top" />
          </div>
          {/* --- LIQUID BACKGROUND --- */}
          <div className="absolute inset-0 z-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-br from-background via-muted/5 to-background" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--foreground)_/_0.04)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--foreground)_/_0.04)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:linear-gradient(to_bottom,transparent,black)]" />
          </div>

          {/* Content Wrapper */}
          <div className="relative z-10 flex-1 h-full w-full text-foreground/90 overflow-hidden">
            <SecurityBanner />
            <AppContent />
          </div>

          {/* --- BOTTOM BANNER --- */}
          <div className="relative z-[10001] shrink-0">
            <ClassificationBanner position="bottom" />
          </div>
        </div>

        <Toaster />
      </QueueProvider>
    </QueryClientProvider>
  );
}

export default App;
