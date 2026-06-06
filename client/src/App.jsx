import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { useAuth } from './context/AuthContext';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import GameDetailPage from './pages/GameDetailPage';
import GameRatingPage from './pages/GameRatingPage';
import ManagerPage from './pages/ManagerPage';
import AdminPage from './pages/AdminPage';
import FriendsPage from './pages/FriendsPage';
import WalletTopupPage from './pages/WalletTopupPage';
import GameCheckoutPage from './pages/GameCheckoutPage';
import GameCancelPage from './pages/GameCancelPage';
import GameSummaryPage from './pages/GameSummaryPage';
import GuidePage from './pages/GuidePage';
import SubscriptionPage from './pages/SubscriptionPage';
import LeaderboardPage from './pages/LeaderboardPage';
import NotFoundPage from './pages/NotFoundPage';
import ServerDownPage from './pages/ServerDownPage';
import WIPBanner from './components/WIPBanner';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? children : <Navigate to="/login" />;
}

function AdminRoute({ children }) {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (!isAdmin) return <Navigate to="/home" />;
  return children;
}

function SuperAdminRoute({ children }) {
  const { user, isSuperAdmin, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (!isSuperAdmin) return <Navigate to="/home" />;
  return children;
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <div key={location.pathname} className="page-enter">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/wallet/topup" element={<PrivateRoute><WalletTopupPage /></PrivateRoute>} />
        <Route path="/game/:id/checkout" element={<PrivateRoute><GameCheckoutPage /></PrivateRoute>} />
        <Route path="/game/:id/cancel" element={<PrivateRoute><GameCancelPage /></PrivateRoute>} />
        <Route path="/game/:id/summary" element={<PrivateRoute><GameSummaryPage /></PrivateRoute>} />
        <Route path="/game/:id" element={<PrivateRoute><GameDetailPage /></PrivateRoute>} />
        <Route path="/home" element={<PrivateRoute><HomePage /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
        <Route path="/game/:id/rate" element={<AdminRoute><GameRatingPage /></AdminRoute>} />
        <Route path="/manager" element={<AdminRoute><ManagerPage /></AdminRoute>} />
        <Route path="/admin" element={<SuperAdminRoute><AdminPage /></SuperAdminRoute>} />
        <Route path="/friends" element={<PrivateRoute><FriendsPage /></PrivateRoute>} />
        <Route path="/leaderboard" element={<PrivateRoute><LeaderboardPage /></PrivateRoute>} />
        <Route path="/guide" element={<PrivateRoute><GuidePage /></PrivateRoute>} />
        <Route path="/subscription" element={<PrivateRoute><SubscriptionPage /></PrivateRoute>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  );
}

function App() {
  const { serverDown } = useAuth();
  if (serverDown) return <ServerDownPage />;

  return (
    <BrowserRouter>
      <AnimatedRoutes />
      <WIPBanner />
      <Analytics />
    </BrowserRouter>
  );
}

export default App;