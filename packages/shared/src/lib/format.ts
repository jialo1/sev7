const xofFormatter = new Intl.NumberFormat('fr-SN', {
  maximumFractionDigits: 0,
})

export function formatXof(amount: number): string {
  return `${xofFormatter.format(amount)} F CFA`
}

export function formatDateTimeFr(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}
