import React, { createContext, useContext } from 'react';

/**
 * Admin dashboard context: current staff user and whether they are system admin.
 * - System admin (admin): see all users and full settings.
 * - Trainer: see only users they invited (coach_email === their email).
 * - refreshUser: optional callback to reload current user (e.g. after profile update).
 */
export const AdminDashboardContext = createContext({
  user: null,
  isSystemAdmin: false,
  refreshUser: null,
});

export function useAdminDashboard() {
  const ctx = useContext(AdminDashboardContext);
  if (!ctx) {
    throw new Error('useAdminDashboard must be used within AdminDashboardContext.Provider');
  }
  return ctx;
}

export default AdminDashboardContext;
