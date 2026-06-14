import React from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

import Signup from '../pages/Signup';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import CreateLab from '../pages/CreateLab';
import LabPage from '../pages/LabPage';
import AddExperiment from '../pages/AddExperiment';
import ExperimentPage from '../pages/ExperimentPage';
import NonCodeExperimentPage from '../pages/NonCodeExperimentPage';
import ExperimentInsightsPage from '../pages/ExperimentInsightsPage';

/* Dynamically route to code vs non-code experiment page */
function ExperimentRouter() {
  const { labId, expId } = useParams();
  const { labs } = useAuth();
  const lab = labs.find(l => l.id === labId);

  if (!lab) return <Navigate to="/dashboard" replace />;

  return lab.type === 'code'
    ? <ExperimentPage />
    : <NonCodeExperimentPage />;
}

/* Protect routes that require auth */
function ProtectedRoute({ children }) {
  const { currentUser, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#03001e]">
        <div className="w-8 h-8 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }
  if (!currentUser) return <Navigate to="/login" replace />;
  return children;
}

/* Redirect logged-in users away from auth pages */
function AuthRoute({ children }) {
  const { currentUser, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#03001e]">
        <div className="w-8 h-8 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }
  if (currentUser) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public auth routes */}
      <Route path="/signup" element={<AuthRoute><Signup /></AuthRoute>} />
      <Route path="/login"  element={<AuthRoute><Login /></AuthRoute>} />

      {/* Protected app routes */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/create-lab" element={<ProtectedRoute><CreateLab /></ProtectedRoute>} />
      <Route path="/lab/:labId" element={<ProtectedRoute><LabPage /></ProtectedRoute>} />
      <Route path="/lab/:labId/add-experiment" element={<ProtectedRoute><AddExperiment /></ProtectedRoute>} />
      <Route path="/lab/:labId/:expId/insights" element={<ProtectedRoute><ExperimentInsightsPage /></ProtectedRoute>} />
      <Route path="/lab/:labId/:expId" element={<ProtectedRoute><ExperimentRouter /></ProtectedRoute>} />

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
