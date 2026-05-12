/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthProvider, useAuth } from '@/src/components/AuthProvider';
import Login from '@/src/components/Login';
import AdminDashboard from '@/src/components/AdminDashboard';
import StudentDashboard from '@/src/components/StudentDashboard';
import { Toaster } from '@/components/ui/sonner';

function AppContent() {
  const { user, userData, loading, effectiveRole } = useAuth();

  if (!user || !userData) {
    return <Login />;
  }

  return effectiveRole === 'admin' ? <AdminDashboard /> : <StudentDashboard />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster dir="rtl" />
    </AuthProvider>
  );
}
