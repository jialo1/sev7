/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import App from './App'
import { ProHomePage } from './pages/HomePage'
import { ProLoginPage } from './pages/auth/LoginPage'
import { ProCallbackPage } from './pages/auth/CallbackPage'
import { RoleGuard } from '@sev7/shared'

// Layouts + pages lourdes en lazy.
const AdminLayout = lazy(() =>
  import('./layouts/AdminLayout').then((m) => ({ default: m.AdminLayout })),
)
const ScanLayout = lazy(() =>
  import('./layouts/ScanLayout').then((m) => ({ default: m.ScanLayout })),
)
const AdminHomePage = lazy(() =>
  import('./pages/admin/HomePage').then((m) => ({ default: m.AdminHomePage })),
)
const AdminUsersPage = lazy(() =>
  import('./pages/admin/UsersPage').then((m) => ({ default: m.AdminUsersPage })),
)
const AdminEventsListPage = lazy(() =>
  import('./pages/admin/EventsListPage').then((m) => ({
    default: m.AdminEventsListPage,
  })),
)
const AdminEventEditPage = lazy(() =>
  import('./pages/admin/EventEditPage').then((m) => ({
    default: m.AdminEventEditPage,
  })),
)
const AdminMenuPage = lazy(() =>
  import('./pages/admin/MenuPage').then((m) => ({ default: m.AdminMenuPage })),
)
const AdminBookingsPage = lazy(() =>
  import('./pages/admin/BookingsPage').then((m) => ({
    default: m.AdminBookingsPage,
  })),
)
const AdminTablesEditorPage = lazy(() =>
  import('./pages/admin/TablesEditorPage').then((m) => ({
    default: m.AdminTablesEditorPage,
  })),
)
const AdminStatsPage = lazy(() =>
  import('./pages/admin/StatsPage').then((m) => ({ default: m.AdminStatsPage })),
)
const AdminAuditPage = lazy(() =>
  import('./pages/admin/AuditPage').then((m) => ({ default: m.AdminAuditPage })),
)
const OrganizerScannersPage = lazy(() =>
  import('./pages/admin/ScannersPage').then((m) => ({
    default: m.OrganizerScannersPage,
  })),
)
const DashboardPage = lazy(() =>
  import('./pages/staff/DashboardPage').then((m) => ({ default: m.DashboardPage })),
)
const ScanPage = lazy(() =>
  import('./pages/staff/ScanPage').then((m) => ({ default: m.ScanPage })),
)

const SCAN_ROLES = ['scanner', 'staff', 'admin'] as const
const STAFF_ROLES = ['staff', 'admin'] as const
const PRO_ROLES = ['admin', 'organizer'] as const
const ADMIN_ONLY = ['admin'] as const

function Lazy({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<p className="page-loading">Chargement…</p>}>
      {children}
    </Suspense>
  )
}

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
        <Lazy><ScanLayout /></Lazy>
      </RoleGuard>
    ),
    children: [{ index: true, element: <Lazy><ScanPage /></Lazy> }],
  },
  {
    path: '/staff/dashboard',
    element: (
      <RoleGuard role={[...STAFF_ROLES]}>
        <Lazy><DashboardPage /></Lazy>
      </RoleGuard>
    ),
  },
  {
    path: '/admin',
    element: (
      <RoleGuard role={[...PRO_ROLES]}>
        <Lazy><AdminLayout /></Lazy>
      </RoleGuard>
    ),
    children: [
      { index: true, element: <Lazy><AdminHomePage /></Lazy> },
      { path: 'events', element: <Lazy><AdminEventsListPage /></Lazy> },
      { path: 'events/new', element: <Lazy><AdminEventEditPage /></Lazy> },
      { path: 'events/:id', element: <Lazy><AdminEventEditPage /></Lazy> },
      { path: 'bookings', element: <Lazy><AdminBookingsPage /></Lazy> },
      { path: 'scanners', element: <Lazy><OrganizerScannersPage /></Lazy> },
      {
        path: 'users',
        element: (
          <RoleGuard role={[...ADMIN_ONLY]}>
            <Lazy><AdminUsersPage /></Lazy>
          </RoleGuard>
        ),
      },
      {
        path: 'menu',
        element: (
          <RoleGuard role={[...ADMIN_ONLY]}>
            <Lazy><AdminMenuPage /></Lazy>
          </RoleGuard>
        ),
      },
      {
        path: 'tables',
        element: (
          <RoleGuard role={[...ADMIN_ONLY]}>
            <Lazy><AdminTablesEditorPage /></Lazy>
          </RoleGuard>
        ),
      },
      {
        path: 'stats',
        element: (
          <RoleGuard role={[...ADMIN_ONLY]}>
            <Lazy><AdminStatsPage /></Lazy>
          </RoleGuard>
        ),
      },
      {
        path: 'audit',
        element: (
          <RoleGuard role={[...ADMIN_ONLY]}>
            <Lazy><AdminAuditPage /></Lazy>
          </RoleGuard>
        ),
      },
    ],
  },
])
