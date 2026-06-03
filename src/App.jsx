import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

const Login = lazy(() => import('./pages/Login'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const StockView = lazy(() => import('./pages/StockView'));
const CommercialView = lazy(() => import('./pages/CommercialView'));
const MouvementsPage = lazy(() => import('./pages/MouvementsPage'));
const DirecteurDashboard = lazy(() => import('./pages/DirecteurDashboard'));
const UserProfile = lazy(() => import('./pages/UserProfile'));

import Layout from './components/layout/Layout';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Chargement...</div>}>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<Layout />}>
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
            <Route path="/stock" element={<Navigate to="/stock-view" replace />} />
            <Route path="/stock-view" element={<StockView />} />
            <Route path="/stock/mouvements" element={<MouvementsPage />} />
            <Route path="/commercial" element={<Navigate to="/commercial-view" replace />} />
            <Route path="/commercial-view" element={<CommercialView />} />
            <Route path="/directeur" element={<DirecteurDashboard />} />
            <Route path="/directeur/reports" element={<DirecteurDashboard initialTab="exports" />} />
            <Route path="/dashboard" element={<AdminDashboard />} />
            <Route path="/user/:userId" element={<UserProfile />} />
          </Route>

          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;