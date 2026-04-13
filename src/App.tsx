// src/App.tsx
import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Loader2 } from 'lucide-react';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';

// Importaciones perezosas
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Leads = lazy(() => import('./pages/Leads'));
const LeadDetail = lazy(() => import('./pages/LeadDetail'));
const Pipeline = lazy(() => import('./pages/Pipeline'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Agenda = lazy(() => import('./pages/Agenda'));
const Settings = lazy(() => import('./pages/Settings'));
const Newsletters = lazy(() => import('./pages/Newsletters'));
const NewsletterEditor = lazy(() => import('./pages/NewsletterEditor'));
const Stats = lazy(() => import('./pages/Stats'));
const Inbox = lazy(() => import('./pages/Inbox'));
const Discovery = lazy(() => import('./pages/Discovery'));
const FeedbackResponse = lazy(() => import('./pages/FeedbackResponse'));

const PageLoader = () => (
  <div className="w-full h-[60vh] flex flex-col items-center justify-center">
    <Loader2 className="h-10 w-10 text-altavik-600 animate-spin mb-4" />
    <p className="text-slate-400 text-sm font-medium animate-pulse">Cargando módulo...</p>
  </div>
);

const ProtectedRoute = () => {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (!session) return <Navigate to="/login" replace />;
  return <Outlet />;
};

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/feedback" element={<Suspense fallback={<PageLoader />}><FeedbackResponse /></Suspense>} />
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
          <Route path="/leads" element={<Suspense fallback={<PageLoader />}><Leads /></Suspense>} />
          <Route path="/leads/:id" element={<Suspense fallback={<PageLoader />}><LeadDetail /></Suspense>} />
          <Route path="/pipeline" element={<Suspense fallback={<PageLoader />}><Pipeline /></Suspense>} />
          <Route path="/inventory" element={<Suspense fallback={<PageLoader />}><Inventory /></Suspense>} />
          <Route path="/agenda" element={<Suspense fallback={<PageLoader />}><Agenda /></Suspense>} />
          <Route path="/settings" element={<Suspense fallback={<PageLoader />}><Settings /></Suspense>} />
          <Route path="/newsletters" element={<Suspense fallback={<PageLoader />}><Newsletters /></Suspense>} />
          <Route path="/newsletters/:id" element={<Suspense fallback={<PageLoader />}><NewsletterEditor /></Suspense>} />
          <Route path="/stats" element={<Suspense fallback={<PageLoader />}><Stats /></Suspense>} />
          <Route path="/inbox" element={<Suspense fallback={<PageLoader />}><Inbox /></Suspense>} />
          <Route path="/discovery" element={<Suspense fallback={<PageLoader />}><Discovery /></Suspense>} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;