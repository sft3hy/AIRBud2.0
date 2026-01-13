import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from './components/Dashboard';
import { HowItWorks } from './pages/HowItWorks';
import { LoginPage } from './pages/LoginPage';
import { fetchSystemStatus } from './lib/api';
import { Loader2 } from 'lucide-react';

const queryClient = new QueryClient();

const AppContent = () => {
  // Check Auth Status on Load
  // staleTime: 0 ensures we always fetch fresh data on mount
  const { data: status, isLoading } = useQuery({
    queryKey: ['auth_status'],
    queryFn: fetchSystemStatus,
    retry: false,
    staleTime: 0
  });

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Establishing Secure Connection...</p>
      </div>
    );
  }

  // Determine if authenticated
  const isAuthenticated = status?.online && status?.user && status.user.id > 0;

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
    </QueryClientProvider>
  );
}

export default App;