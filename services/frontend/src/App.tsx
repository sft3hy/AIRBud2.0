import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from './components/Dashboard';
import { SystemOverview } from './pages/SystemOverview';
import { Help } from './pages/Help';
import { LoginPage } from './pages/LoginPage';
import { InviteHandler } from './components/GroupManager';
import { fetchSystemStatus } from './lib/api';
import { Loader2 } from 'lucide-react';
import { Toaster } from "@/components/ui/toaster";

const queryClient = new QueryClient();

const AppContent = () => {
  const { data: status, isLoading, isError } = useQuery({
    queryKey: ['session'],
    queryFn: fetchSystemStatus,
    retry: false,
    staleTime: 0,
    refetchInterval: 5000,
  });

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Establishing Secure Connection...</p>
      </div>
    );
  }

  const isOnline = status?.online && !isError;
  const isAuthenticated = isOnline && status?.user && status.user.id > 0;

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Route */}
        <Route path="/login" element={
          isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />
        } />

        {/* Protected Routes */}
        <Route path="/system-overview" element={
          isAuthenticated ? <SystemOverview /> : <Navigate to="/login" replace />
        } />

        <Route path="/help" element={
          isAuthenticated ? <Help /> : <Navigate to="/help" replace />
        } />
        
        <Route path="/groups/join/:token" element={
          isAuthenticated ? <InviteHandler /> : <Navigate to="/login" replace />
        } />

        {/* --- NEW ROUTING STRUCTURE --- */}
        
        {/* Default Redirect */}
        <Route path="/" element={
          isAuthenticated ? <Navigate to="/collections" replace /> : <Navigate to="/login" replace />
        } />

        {/* Collections (List & Detail) */}
        <Route path="/collections" element={
          isAuthenticated ? <Dashboard /> : <Navigate to="/login" replace />
        } />
        <Route path="/collections/:id" element={
          isAuthenticated ? <Dashboard /> : <Navigate to="/login" replace />
        } />

        {/* Groups */}
        <Route path="/groups" element={
          isAuthenticated ? <Dashboard /> : <Navigate to="/login" replace />
        } />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;