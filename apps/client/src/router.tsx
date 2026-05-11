/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import App from './App'
import { HomePage } from './pages/HomePage'
import { RoleGuard } from '@sev7/shared'

// Lazy : routes secondaires. La HomePage reste eager pour le 1er paint.
const EventsListPage = lazy(() =>
  import('./pages/EventsListPage').then((m) => ({ default: m.EventsListPage })),
)
const EventDetailPage = lazy(() =>
  import('./pages/EventDetailPage').then((m) => ({ default: m.EventDetailPage })),
)
const SeatSelectionPage = lazy(() =>
  import('./pages/SeatSelectionPage').then((m) => ({
    default: m.SeatSelectionPage,
  })),
)
const CheckoutPage = lazy(() =>
  import('./pages/CheckoutPage').then((m) => ({ default: m.CheckoutPage })),
)
const TicketsPage = lazy(() =>
  import('./pages/TicketsPage').then((m) => ({ default: m.TicketsPage })),
)
const TicketDetailPage = lazy(() =>
  import('./pages/TicketDetailPage').then((m) => ({
    default: m.TicketDetailPage,
  })),
)
const MenuPage = lazy(() =>
  import('./pages/MenuPage').then((m) => ({ default: m.MenuPage })),
)
const OrdersPage = lazy(() =>
  import('./pages/OrdersPage').then((m) => ({ default: m.OrdersPage })),
)
const RestaurantHome = lazy(() =>
  import('./pages/RestaurantHome').then((m) => ({ default: m.RestaurantHome })),
)
const RestaurantSeatPage = lazy(() =>
  import('./pages/RestaurantSeatPage').then((m) => ({
    default: m.RestaurantSeatPage,
  })),
)
const LoginPage = lazy(() =>
  import('./pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })),
)
const CallbackPage = lazy(() =>
  import('./pages/auth/CallbackPage').then((m) => ({ default: m.CallbackPage })),
)
const AccountHomePage = lazy(() =>
  import('./pages/account/HomePage').then((m) => ({ default: m.AccountHomePage })),
)
const AccountProfilePage = lazy(() =>
  import('./pages/account/ProfilePage').then((m) => ({
    default: m.AccountProfilePage,
  })),
)
const AccountHistoryPage = lazy(() =>
  import('./pages/account/HistoryPage').then((m) => ({
    default: m.AccountHistoryPage,
  })),
)

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
      { index: true, element: <HomePage /> },
      { path: 'events', element: <Lazy><EventsListPage /></Lazy> },
      { path: 'events/:id', element: <Lazy><EventDetailPage /></Lazy> },
      {
        path: 'events/:id/seats',
        element: (
          <RoleGuard>
            <Lazy><SeatSelectionPage /></Lazy>
          </RoleGuard>
        ),
      },
      {
        path: 'checkout/:bookingId',
        element: (
          <RoleGuard>
            <Lazy><CheckoutPage /></Lazy>
          </RoleGuard>
        ),
      },
      {
        path: 'tickets',
        element: (
          <RoleGuard>
            <Lazy><TicketsPage /></Lazy>
          </RoleGuard>
        ),
      },
      {
        path: 'tickets/:id',
        element: (
          <RoleGuard>
            <Lazy><TicketDetailPage /></Lazy>
          </RoleGuard>
        ),
      },
      { path: 'menu', element: <Lazy><MenuPage /></Lazy> },
      { path: 'restaurant/menu', element: <Lazy><MenuPage /></Lazy> },
      {
        path: 'orders',
        element: (
          <RoleGuard>
            <Lazy><OrdersPage /></Lazy>
          </RoleGuard>
        ),
      },
      { path: 'restaurant', element: <Lazy><RestaurantHome /></Lazy> },
      { path: 'restaurant/seats', element: <Lazy><RestaurantSeatPage /></Lazy> },
      { path: 'auth/login', element: <Lazy><LoginPage /></Lazy> },
      { path: 'auth/callback', element: <Lazy><CallbackPage /></Lazy> },
      {
        path: 'account',
        element: (
          <RoleGuard>
            <Lazy><AccountHomePage /></Lazy>
          </RoleGuard>
        ),
      },
      {
        path: 'account/profile',
        element: (
          <RoleGuard>
            <Lazy><AccountProfilePage /></Lazy>
          </RoleGuard>
        ),
      },
      {
        path: 'account/history',
        element: (
          <RoleGuard>
            <Lazy><AccountHistoryPage /></Lazy>
          </RoleGuard>
        ),
      },
    ],
  },
])
