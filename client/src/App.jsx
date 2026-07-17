import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import BottomNav from './components/BottomNav.jsx';
import TopNav from './components/TopNav.jsx';
import LoginPage from './pages/LoginPage.jsx';
import BakerPage from './pages/BakerPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import { ConfirmProvider } from './components/ConfirmDialog.jsx';
import { ToastProvider, useToast } from './components/Toast.jsx';
import ThemeToggle from './components/ThemeToggle.jsx';
import TopLoadingBar from './components/TopLoadingBar.jsx';
import CloudStatus from './components/CloudStatus.jsx';
import { SyncGate, DatenstandBanner } from './components/SyncGate.jsx';
import { DataProvider } from './context/DataContext.jsx';
import { auth } from './services/api.js';

// Hoert auf das CustomEvent 'sw-update' aus main.jsx und zeigt einen
// persistenten Toast mit "Neu laden"-Button.
function SwUpdateNotifier() {
  const toast = useToast();
  useEffect(() => {
    const onUpdate = () => {
      toast.info('Neue Version verfügbar', {
        duration: 0,
        action: { label: 'Neu laden', onClick: () => window.location.reload() },
      });
    };
    window.addEventListener('sw-update', onUpdate);
    return () => window.removeEventListener('sw-update', onUpdate);
  }, [toast]);
  return null;
}

function RequireAuth({ children }) {
  if (!auth.isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

// Verwaltung ist Admin-only — Baecker-Rollen landen auf /backen.
function RequireAdmin({ children }) {
  if (auth.getRole() !== 'admin') {
    return <Navigate to="/backen" replace />;
  }
  return children;
}

export default function App() {
  const [online, setOnline] = useState(navigator.onLine);
  const location = useLocation();
  const isLogin = location.pathname === '/login';

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  // Login-Seite: kein Header, keine Nav
  if (isLogin) {
    return (
      <ToastProvider>
        <SwUpdateNotifier />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <SwUpdateNotifier />
      <ConfirmProvider>
        <RequireAuth>
          <DataProvider>
          <div className="app">
            <TopLoadingBar />
            <DatenstandBanner />

            <header className="app-header">
              <div className="app-header-inner">
                <img src="/logo.jpg" alt="Landbäckerei Oetzmann" className="brand-logo" />
                <span className="brand-sub">Rezeptrechner</span>
                <TopNav />
                <CloudStatus />
                <ThemeToggle />
                <button
                  className="btn btn-ghost"
                  onClick={() => auth.logout()}
                  title={`Abmelden (${auth.getEmail()})`}
                  aria-label="Abmelden"
                  style={{ padding: 8 }}
                >
                  <LogOut size={18} />
                </button>
              </div>
            </header>

            <main className="app-main">
              <ErrorBoundary>
                <SyncGate>
                <Routes>
                  <Route path="/" element={<Navigate to="/backen" replace />} />
                  <Route path="/backen" element={<BakerPage />} />
                  <Route path="/verwaltung" element={<RequireAdmin><AdminPage /></RequireAdmin>} />
                  <Route path="*" element={<Navigate to="/backen" replace />} />
                </Routes>
                </SyncGate>
              </ErrorBoundary>
            </main>

            <BottomNav />
          </div>
          </DataProvider>
        </RequireAuth>
      </ConfirmProvider>
    </ToastProvider>
  );
}
