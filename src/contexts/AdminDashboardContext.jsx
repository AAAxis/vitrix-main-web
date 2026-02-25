import React, { createContext, useContext } from 'react';

/**
 * Admin dashboard context: current staff user and whether they are system admin.
 * - System admin (admin/coach): see all users and full settings.
 * - Trainer: see only users they invited (coach_email === their email).
 */
export const AdminDashboardContext = createContext({
  user: null,
  isSystemAdmin: false,
});

export function useAdminDashboard() {
  const ctx = useContext(AdminDashboardContext);
  if (!ctx) {
    throw new Error('useAdminDashboard must be used within AdminDashboardContext.Provider');
  }
  return ctx;
}

export default AdminDashboardContext;
