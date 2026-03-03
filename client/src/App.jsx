import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import GameDetailPage from './pages/GameDetailPage';

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
}

function AdminRoute({ children }) {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (!isAdmin) return <Navigate to="/home" />;
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/game/:id" element={
  <PrivateRoute>
    <GameDetailPage />
  </PrivateRoute>
} />
        <Route path="/home" element={
          <PrivateRoute>
            <HomePage />
          </PrivateRoute>
        } />
        <Route path="/profile" element={
          <PrivateRoute>
            <ProfilePage />
          </PrivateRoute>
        } />
        <Route path="/admin" element={
          <AdminRoute>
            <AdminPage />
          </AdminRoute>
        } />
        
      </Routes>
    </BrowserRouter>
  );
}

export default App;