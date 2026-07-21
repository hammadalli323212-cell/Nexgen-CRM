import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import { AuthProvider } from './lib/AuthContext';

const Login = lazy(() => import('./pages/Login'));
const SetPassword = lazy(() => import('./pages/SetPassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Reports = lazy(() => import('./pages/Reports'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const Leads = lazy(() => import('./pages/Leads'));
const Archive = lazy(() => import('./pages/Archive'));
const LeadForm = lazy(() => import('./pages/LeadForm'));
const LeadDetails = lazy(() => import('./pages/LeadDetails'));
const BookingPortalLayout = lazy(() => import('./pages/booking/BookingPortalLayout'));
const BookingAuth = lazy(() => import('./pages/booking/BookingAuth'));
const BookingWizard = lazy(() => import('./pages/booking/BookingWizard'));
const Orders = lazy(() => import('./pages/Orders'));
const Dispatch = lazy(() => import('./pages/Dispatch'));
const Customers = lazy(() => import('./pages/Customers'));
const CustomerDetails = lazy(() => import('./pages/CustomerDetails'));
const Carriers = lazy(() => import('./pages/Carriers'));
const CarrierDetails = lazy(() => import('./pages/CarrierDetails'));
const MyTasks = lazy(() => import('./pages/MyTasks'));

import './index.css';

import Tracking from './pages/Tracking';
import FormPreview from './pages/FormPreview';

import { Toaster } from 'react-hot-toast';

// Placeholder components for other routes
const Placeholder = ({ title }) => (
  <div style={{ color: 'var(--text-primary)' }}>
    <h1 style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>{title}</h1>
    <p style={{ color: 'var(--text-secondary)' }}>This module is currently under development in Phase 2.</p>
  </div>
);

const LoadingFallback = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-app)' }}>
    <div style={{ width: '40px', height: '40px', border: '3px solid rgba(59, 130, 246, 0.2)', borderTopColor: 'var(--brand-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Toaster position="top-center" />
      <BrowserRouter>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
          {/* Public Booking Portal Routes */}
          <Route path="/booking/:id" element={<BookingPortalLayout />}>
            <Route index element={<BookingAuth />} />
            <Route path="wizard" element={<BookingWizard />} />
          </Route>

          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/set-password" element={<SetPassword />} />
          <Route path="/booking/:tenantId" element={<BookingPortalLayout />} />
          <Route path="/tracking/:tenantId/:leadNumber" element={<Tracking />} />
          <Route path="/form-preview" element={<FormPreview />} />

          {/* Internal CRM Routes (Protected) */}
          <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="tasks" element={<MyTasks />} />
            <Route path="leads" element={<Leads />} />
            <Route path="archive" element={<Archive />} />
            <Route path="leads/new" element={<LeadForm />} />
            <Route path="leads/:id" element={<LeadDetails />} />
            <Route path="leads/:id/edit" element={<LeadForm />} />
            <Route path="orders" element={<Orders />} />
            <Route path="orders/canceled" element={<Orders />} />
            <Route path="orders/new" element={<LeadForm isOrder={true} />} />
            <Route path="orders/:id" element={<LeadDetails />} />
            <Route path="dispatch" element={<Dispatch />} />
            <Route path="customers" element={<Customers />} />
            <Route path="customers/:id" element={<CustomerDetails />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="carriers" element={<Carriers />} />
            <Route path="carriers/:id" element={<CarrierDetails />} />
            <Route path="reports" element={<Reports />} />
            
            {/* Admin Only Route */}
            <Route path="admin/users" element={<ProtectedRoute requireAdmin={true}><UserManagement /></ProtectedRoute>} />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
