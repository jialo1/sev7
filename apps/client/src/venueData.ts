import type { ClubTable, NightEvent } from '@sev7/shared'

export const event: NightEvent = {
  venueName: 'SEV7',
  city: 'Dakar',
  title: 'Afro House — Invité DJ',
  dateLabel: 'Samedi 14 juin · 23h00',
  roomLabel: 'Espace principal',
}

/** Plan fictif : scène en bas, piste au centre, tables autour. Prix en F CFA. */
export const initialTables: ClubTable[] = [
  { id: 't1', label: 'T1', capacity: 4, zone: 'Mezzanine', priceXof: 80000, x: 72, y: 48, w: 72, h: 52, rx: 8, status: 'available' },
  { id: 't2', label: 'T2', capacity: 4, zone: 'Mezzanine', priceXof: 80000, x: 168, y: 48, w: 72, h: 52, rx: 8, status: 'booked' },
  { id: 't3', label: 'T3', capacity: 6, zone: 'Mezzanine', priceXof: 120000, x: 264, y: 40, w: 88, h: 60, rx: 10, status: 'available', variant: 'vip' },
  { id: 't4', label: 'T4', capacity: 2, zone: 'Mezzanine', priceXof: 45000, x: 380, y: 52, w: 56, h: 48, rx: 8, status: 'available' },
  { id: 't5', label: 'T5', capacity: 4, zone: 'Côté bar', priceXof: 65000, x: 460, y: 40, w: 72, h: 52, rx: 8, status: 'available' },
  { id: 't6', label: 'T6', capacity: 4, zone: 'Côté bar', priceXof: 65000, x: 556, y: 48, w: 72, h: 52, rx: 8, status: 'booked' },
  { id: 't7', label: 'T7', capacity: 8, zone: 'VIP', priceXof: 210000, x: 660, y: 36, w: 112, h: 68, rx: 12, status: 'available', variant: 'vip' },
  { id: 't8', label: 'T8', capacity: 4, zone: 'Piste', priceXof: 90000, x: 100, y: 168, w: 72, h: 52, rx: 8, status: 'available' },
  { id: 't9', label: 'T9', capacity: 4, zone: 'Piste', priceXof: 90000, x: 200, y: 176, w: 72, h: 52, rx: 8, status: 'available' },
  { id: 't10', label: 'T10', capacity: 2, zone: 'Piste', priceXof: 50000, x: 308, y: 180, w: 56, h: 48, rx: 8, status: 'booked' },
  { id: 't11', label: 'T11', capacity: 6, zone: 'Piste', priceXof: 130000, x: 396, y: 164, w: 88, h: 60, rx: 10, status: 'available', variant: 'vip' },
  { id: 't12', label: 'T12', capacity: 4, zone: 'Piste', priceXof: 90000, x: 512, y: 172, w: 72, h: 52, rx: 8, status: 'available' },
  { id: 't13', label: 'T13', capacity: 4, zone: 'Piste', priceXof: 90000, x: 612, y: 168, w: 72, h: 52, rx: 8, status: 'available' },
  { id: 't14', label: 'T14', capacity: 2, zone: 'Foyer', priceXof: 40000, x: 120, y: 288, w: 56, h: 48, rx: 8, status: 'available' },
  { id: 't15', label: 'T15', capacity: 4, zone: 'Foyer', priceXof: 60000, x: 204, y: 280, w: 72, h: 52, rx: 8, status: 'booked' },
  { id: 't16', label: 'T16', capacity: 4, zone: 'Foyer', priceXof: 60000, x: 304, y: 284, w: 72, h: 52, rx: 8, status: 'available' },
  { id: 't17', label: 'T17', capacity: 6, zone: 'Foyer', priceXof: 100000, x: 420, y: 272, w: 88, h: 60, rx: 10, status: 'available', variant: 'vip' },
  { id: 't18', label: 'T18', capacity: 4, zone: 'Foyer', priceXof: 60000, x: 536, y: 280, w: 72, h: 52, rx: 8, status: 'available' },
  { id: 't19', label: 'T19', capacity: 2, zone: 'Foyer', priceXof: 40000, x: 636, y: 288, w: 56, h: 48, rx: 8, status: 'available' },
]

export function countFreeSeats(tables: ClubTable[]): number {
  return tables
    .filter((t) => t.status === 'available')
    .reduce((sum, t) => sum + t.capacity, 0)
}
