import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'

type Props = {
  token: string
  size?: number
}

export function QrTicket({ token, size = 280 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current || !token) return
    QRCode.toCanvas(canvasRef.current, token, {
      width: size,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#1a1814', light: '#faf9f6' },
    }).catch(() => {
      /* swallow */
    })
  }, [token, size])

  return <canvas ref={canvasRef} aria-label="QR du billet" />
}
