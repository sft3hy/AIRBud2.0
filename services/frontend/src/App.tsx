import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Dashboard } from "./components/Dashboard";
import { SystemOverview } from "./pages/SystemOverview";
import { Help } from "./pages/Help";
import { Team } from "./pages/Team";
import { LoginPage } from "./pages/LoginPage";
import { SystemOutage } from "./pages/SystemOutage";
import { InviteHandler } from "./components/GroupManager";
import { fetchSystemStatus } from "./lib/api";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";

const queryClient = new QueryClient();
const AppLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    // <div className="flex flex-col h-screen w-screen bg-background/80">
    // {/* Top Banner */}
    // <ClassificationBanner />

    // {/* Main Content Area - Grows to fill space, handles its own scrolling */}
    <div className="flex-1 min-h-0 relative flex flex-col">{children}</div>

    // {/* Bottom Banner */}
    // <ClassificationBanner />
    // </div>
  );
};

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
    <BrowserRouter>
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
      {/* --- UNIFIED COSMIC BACKGROUND START --- */}
      {/* This sits at z-0. All content is z-10 or higher. */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 h-96 w-96 rounded-full bg-blue-500/10 blur-[100px]" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-96 w-96 rounded-full bg-purple-500/10 blur-[100px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px]" />
      </div>
      {/* --- UNIFIED COSMIC BACKGROUND END --- */}

      {/* Main Content Wrapper - Ensures content sits ABOVE the background */}
      <div className="relative z-10 w-full h-full">
        <AppContent />
      </div>

      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
