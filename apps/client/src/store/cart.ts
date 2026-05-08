import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MenuItem } from '@sev7/shared'

export type CartLine = {
  item: MenuItem
  qty: number
  note?: string
}

type CartState = {
  lines: CartLine[]
  add: (item: MenuItem) => void
  remove: (itemId: string) => void
  setQty: (itemId: string, qty: number) => void
  clear: () => void
  totalXof: () => number
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      add: (item) =>
        set((state) => {
          const existing = state.lines.find((l) => l.item.id === item.id)
          if (existing) {
            return {
              lines: state.lines.map((l) =>
                l.item.id === item.id ? { ...l, qty: l.qty + 1 } : l,
              ),
            }
          }
          return { lines: [...state.lines, { item, qty: 1 }] }
        }),
      remove: (itemId) =>
        set((state) => ({ lines: state.lines.filter((l) => l.item.id !== itemId) })),
      setQty: (itemId, qty) =>
        set((state) => ({
          lines: state.lines
            .map((l) => (l.item.id === itemId ? { ...l, qty } : l))
            .filter((l) => l.qty > 0),
        })),
      clear: () => set({ lines: [] }),
      totalXof: () =>
        get().lines.reduce((sum, l) => sum + l.item.priceXof * l.qty, 0),
    }),
    { name: 'sev7.cart' },
  ),
)
