import { useEffect } from 'react'

const PRO_URL = import.meta.env.VITE_PRO_URL ?? 'http://localhost:5174'

type Props = { to: string }

export function ProRedirectPage({ to }: Props) {
  useEffect(() => {
    window.location.replace(`${PRO_URL}${to}`)
  }, [to])

  return (
    <main className="page-loading">
      <p>Redirection vers SEV7 Pro…</p>
      <p style={{ marginTop: '1rem' }}>
        <a href={`${PRO_URL}${to}`}>Cliquez ici si rien ne se passe.</a>
      </p>
    </main>
  )
}
