export type TableStatus = 'available' | 'pending' | 'booked'

export type VenueKind = 'club' | 'restaurant'

export type BookingStatus =
  | 'pending'
  | 'reserved'
  | 'paid'
  | 'cancelled'
  | 'attended'
  | 'expired'

export type PaymentMethod =
  | 'cinetpay_wave'
  | 'cinetpay_om'
  | 'cinetpay_cb'
  | 'on_site'

export type ProfileRole = 'customer' | 'scanner' | 'staff' | 'admin'

export interface Profile {
  id: string
  fullName: string | null
  phone: string | null
  role: ProfileRole
  emailNotifications: boolean
  smsNotifications: boolean
  locale: string
  createdAt: string
}

export interface Favorite {
  userId: string
  eventId: string
  createdAt: string
}

export interface ClubTable {
  id: string
  label: string
  capacity: number
  zone: string
  priceXof: number
  /** SVG placement (default viewBox 0 0 900 520) */
  x: number
  y: number
  w: number
  h: number
  rx: number
  status: TableStatus
  /** wider booth */
  variant?: 'standard' | 'vip'
}

export interface NightEvent {
  id?: string
  venueName: string
  city: string
  title: string
  dateLabel: string
  roomLabel: string
  startsAt?: string
  posterUrl?: string | null
}

export interface Venue {
  id: string
  slug: string
  kind: VenueKind
  name: string
  city: string
  svgViewBox: string
}

export interface Booking {
  id: string
  userId: string
  eventId: string | null
  venueId: string
  tableId: string
  partySize: number
  startsAt: string
  status: BookingStatus
  paymentMethod: PaymentMethod | null
  qrTokenHash: string | null
  holdExpiresAt: string | null
  totalXof: number
  createdAt: string
}

export interface MenuCategory {
  id: string
  venueId: string
  name: string
  sort: number
}

export interface MenuItem {
  id: string
  categoryId: string
  name: string
  description: string | null
  priceXof: number
  imageUrl: string | null
  available: boolean
}

export type OrderStatus =
  | 'placed'
  | 'preparing'
  | 'served'
  | 'billed'
  | 'cancelled'

export interface Order {
  id: string
  bookingId: string
  tableId: string
  status: OrderStatus
  totalXof: number
  paidAt: string | null
  createdAt: string
}

export interface OrderItem {
  id: string
  orderId: string
  menuItemId: string
  qty: number
  unitPriceXof: number
  note: string | null
}
