import { createBrowserRouter } from 'react-router-dom'
import App from './App'
import { HomePage } from './pages/HomePage'
import { EventsListPage } from './pages/EventsListPage'
import { EventDetailPage } from './pages/EventDetailPage'
import { SeatSelectionPage } from './pages/SeatSelectionPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { TicketsPage } from './pages/TicketsPage'
import { TicketDetailPage } from './pages/TicketDetailPage'
import { MenuPage } from './pages/MenuPage'
import { OrdersPage } from './pages/OrdersPage'
import { RestaurantHome } from './pages/RestaurantHome'
import { RestaurantSeatPage } from './pages/RestaurantSeatPage'
import { LoginPage } from './pages/auth/LoginPage'
import { CallbackPage } from './pages/auth/CallbackPage'
import { AccountHomePage } from './pages/account/HomePage'
import { AccountProfilePage } from './pages/account/ProfilePage'
import { AccountHistoryPage } from './pages/account/HistoryPage'
import { RoleGuard } from '@sev7/shared'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'events', element: <EventsListPage /> },
      { path: 'events/:id', element: <EventDetailPage /> },
      {
        path: 'events/:id/seats',
        element: (
          <RoleGuard>
            <SeatSelectionPage />
          </RoleGuard>
        ),
      },
      {
        path: 'checkout/:bookingId',
        element: (
          <RoleGuard>
            <CheckoutPage />
          </RoleGuard>
        ),
      },
      {
        path: 'tickets',
        element: (
          <RoleGuard>
            <TicketsPage />
          </RoleGuard>
        ),
      },
      {
        path: 'tickets/:id',
        element: (
          <RoleGuard>
            <TicketDetailPage />
          </RoleGuard>
        ),
      },
      { path: 'menu', element: <MenuPage /> },
      { path: 'restaurant/menu', element: <MenuPage /> },
      {
        path: 'orders',
        element: (
          <RoleGuard>
            <OrdersPage />
          </RoleGuard>
        ),
      },
      { path: 'restaurant', element: <RestaurantHome /> },
      { path: 'restaurant/seats', element: <RestaurantSeatPage /> },
      { path: 'auth/login', element: <LoginPage /> },
      { path: 'auth/callback', element: <CallbackPage /> },
      {
        path: 'account',
        element: (
          <RoleGuard>
            <AccountHomePage />
          </RoleGuard>
        ),
      },
      {
        path: 'account/profile',
        element: (
          <RoleGuard>
            <AccountProfilePage />
          </RoleGuard>
        ),
      },
      {
        path: 'account/history',
        element: (
          <RoleGuard>
            <AccountHistoryPage />
          </RoleGuard>
        ),
      },
    ],
  },
])
