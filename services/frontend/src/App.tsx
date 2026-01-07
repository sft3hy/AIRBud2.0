import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Dashboard } from './components/Dashboard';
import { HowItWorks } from './pages/HowItWorks';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;