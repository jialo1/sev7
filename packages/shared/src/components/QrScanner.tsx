import { Scanner } from '@yudiel/react-qr-scanner'

type Props = {
  onScan: (text: string) => void
  onError?: (err: unknown) => void
}

export function QrScanner({ onScan, onError }: Props) {
  return (
    <div className="qr-scanner">
      <Scanner
        onScan={(results) => {
          const first = results?.[0]?.rawValue
          if (first) onScan(first)
        }}
        onError={onError}
        constraints={{ facingMode: 'environment' }}
        sound={false}
        styles={{ container: { width: '100%', maxWidth: 480 } }}
      />
    </div>
  )
}
