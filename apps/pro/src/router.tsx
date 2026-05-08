import { createBrowserRouter, Navigate } from 'react-router-dom'
import App from './App'
import { ProHomePage } from './pages/HomePage'
import { ProLoginPage } from './pages/auth/LoginPage'
import { ProCallbackPage } from './pages/auth/CallbackPage'
import { AdminLayout } from './layouts/AdminLayout'
import { ScanLayout } from './layouts/ScanLayout'
import { AdminHomePage } from './pages/admin/HomePage'
import { AdminUsersPage } from './pages/admin/UsersPage'
import { AdminEventsListPage } from './pages/admin/EventsListPage'
import { AdminEventEditPage } from './pages/admin/EventEditPage'
import { AdminMenuPage } from './pages/admin/MenuPage'
import { AdminBookingsPage } from './pages/admin/BookingsPage'
import { AdminTablesEditorPage } from './pages/admin/TablesEditorPage'
import { AdminStatsPage } from './pages/admin/StatsPage'
import { DashboardPage } from './pages/staff/DashboardPage'
import { ScanPage } from './pages/staff/ScanPage'
import { RoleGuard } from '@sev7/shared'

const SCAN_ROLES = ['scanner', 'staff', 'admin'] as const
const STAFF_ROLES = ['staff', 'admin'] as const

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <ProHomePage /> },
      { path: 'auth/login', element: <ProLoginPage /> },
      { path: 'auth/callback', element: <ProCallbackPage /> },
      { path: 'staff/scan', element: <Navigate to="/scan" replace /> },
    ],
  },
  {
    path: '/scan',
    element: (
      <RoleGuard role={[...SCAN_ROLES]}>
        <ScanLayout />
      </RoleGuard>
    ),
    children: [{ index: true, element: <ScanPage /> }],
  },
  {
    path: '/staff/dashboard',
    element: (
      <RoleGuard role={[...STAFF_ROLES]}>
        <DashboardPage />
      </RoleGuard>
    ),
  },
  {
    path: '/admin',
    element: (
      <RoleGuard role="admin">
        <AdminLayout />
      </RoleGuard>
    ),
    children: [
      { index: true, element: <AdminHomePage /> },
      { path: 'users', element: <AdminUsersPage /> },
      { path: 'events', element: <AdminEventsListPage /> },
      { path: 'events/new', element: <AdminEventEditPage /> },
      { path: 'events/:id', element: <AdminEventEditPage /> },
      { path: 'menu', element: <AdminMenuPage /> },
      { path: 'bookings', element: <AdminBookingsPage /> },
      { path: 'tables', element: <AdminTablesEditorPage /> },
      { path: 'stats', element: <AdminStatsPage /> },
    ],
  },
])
