import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from './components/Dashboard';
import { HowItWorks } from './pages/HowItWorks';
import { LoginPage } from './pages/LoginPage';
import { InviteHandler } from './components/GroupManager';
import { fetchSystemStatus } from './lib/api';
import { Loader2 } from 'lucide-react';
import { Toaster } from "@/components/ui/toaster";

const queryClient = new QueryClient();

const AppContent = () => {
  // 1. Polling Query
  const { data: status, isLoading, isError } = useQuery({
    queryKey: ['session'], // Unified Key
    queryFn: fetchSystemStatus,
    retry: false,
    staleTime: 0,
    refetchInterval: 5000, // Poll every 5s to check if Card is still valid
  });

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Establishing Secure Connection...</p>
      </div>
    );
  }

  // 2. Strict Authentication Logic
  // If API errors (Card removed) OR returns Guest (ID 0) -> Logged Out
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
        <Route path="/" element={
          isAuthenticated ? <Dashboard /> : <Navigate to="/login" replace />
        } />

        <Route path="/how-it-works" element={
          isAuthenticated ? <HowItWorks /> : <Navigate to="/login" replace />
        } />
        
        <Route path="/groups/join/:token" element={
          isAuthenticated ? <InviteHandler /> : <Navigate to="/login" replace />
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