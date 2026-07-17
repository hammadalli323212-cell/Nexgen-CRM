import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import { AuthProvider } from './lib/AuthContext';
import Login from './pages/Login';
import SetPassword from './pages/SetPassword';
import Dashboard from './pages/Dashboard';
import Reports from './pages/Reports';
import UserManagement from './pages/UserManagement';
import Leads from './pages/Leads';
import Archive from './pages/Archive';
import LeadForm from './pages/LeadForm';
import LeadDetails from './pages/LeadDetails';
import BookingPortalLayout from './pages/booking/BookingPortalLayout';
import BookingAuth from './pages/booking/BookingAuth';
import BookingWizard from './pages/booking/BookingWizard';
import Orders from './pages/Orders';
import Dispatch from './pages/Dispatch';
import Customers from './pages/Customers';
import CustomerDetails from './pages/CustomerDetails';
import Carriers from './pages/Carriers';
import CarrierDetails from './pages/CarrierDetails';
import MyTasks from './pages/MyTasks';

import './index.css';

import { Toaster } from 'react-hot-toast';

// Placeholder components for other routes
const Placeholder = ({ title }) => (
  <div style={{ color: 'var(--text-primary)' }}>
    <h1 style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>{title}</h1>
    <p style={{ color: 'var(--text-secondary)' }}>This module is currently under development in Phase 2.</p>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Toaster position="top-center" />
      <BrowserRouter>
        <Routes>
          {/* Public Booking Portal Routes */}
          <Route path="/booking/:id" element={<BookingPortalLayout />}>
            <Route index element={<BookingAuth />} />
            <Route path="wizard" element={<BookingWizard />} />
          </Route>

          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/set-password" element={<SetPassword />} />

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
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
