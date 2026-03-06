import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { KanbanPage } from './pages/KanbanPage';
import { MeetingsPage } from './pages/MeetingsPage';
import { AdminPage } from './pages/AdminPage';
import { SettingsPage } from './pages/SettingsPage';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { AdminGuard } from './components/common/AdminGuard';

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected routes */}
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/kanban" element={<KanbanPage />} />
            <Route path="/meetings" element={<MeetingsPage />} />
            <Route path="/settings" element={<SettingsPage />} />

            {/* Admin — restricted to admin@ecom360.co */}
            <Route element={<AdminGuard />}>
              <Route path="/admin" element={<AdminPage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
