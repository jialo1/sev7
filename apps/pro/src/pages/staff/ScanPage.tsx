import { useState } from 'react'
import { Link } from 'react-router-dom'
import { QrScanner } from '@sev7/shared'
import { supabase } from '../../lib/supabase'

type Result =
  | { ok: true; guest: string; tableLabel: string }
  | { ok: false; reason: string }

export function ScanPage() {
  const [last, setLast] = useState<Result | null>(null)
  const [scanning, setScanning] = useState(true)

  async function validate(token: string) {
    setScanning(false)
    const { data, error } = await supabase.functions.invoke<{
      ok: boolean
      guest?: string
      table_label?: string
      reason?: string
    }>('tickets-validate', { body: { token } })

    if (error || !data) {
      setLast({ ok: false, reason: error?.message ?? 'Erreur de validation' })
    } else if (data.ok) {
      setLast({ ok: true, guest: data.guest ?? '—', tableLabel: data.table_label ?? '—' })
    } else {
      setLast({ ok: false, reason: data.reason ?? 'Billet refusé' })
    }
    setTimeout(() => setScanning(true), 2500)
  }

  return (
    <main className="scan-page">
      <header className="page-head">
        <h1>Scan billets</h1>
        <Link to="/staff/dashboard" className="back-link">← Dashboard</Link>
      </header>
      {scanning ? (
        <QrScanner onScan={validate} />
      ) : (
        <div className={`scan-result ${last?.ok ? 'ok' : 'ko'}`}>
          {last?.ok ? (
            <>
              <h2>✓ Bienvenue</h2>
              <p>{last.guest}</p>
              <p>Table {last.tableLabel}</p>
            </>
          ) : (
            <>
              <h2>✗ Refusé</h2>
              <p>{last?.reason}</p>
            </>
          )}
        </div>
      )}
    </main>
  )
}
