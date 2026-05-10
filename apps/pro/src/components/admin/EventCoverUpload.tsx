import { useId, useState } from 'react'
import { supabase } from '../../lib/supabase'

type Props = {
  imageUrl: string
  onImageUrlChange: (url: string) => void
  ownerId: string
  disabled?: boolean
}

const ACCEPT = 'image/jpeg,image/png,image/webp'
const MAX_BYTES = 5 * 1024 * 1024 // 5 MiB

function extFromMime(mime: string): string {
  if (mime === 'image/jpeg') return 'jpg'
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  return 'bin'
}

export function EventCoverUpload({
  imageUrl,
  onImageUrlChange,
  ownerId,
  disabled = false,
}: Props) {
  const id = useId()
  const fileId = `${id}-file`
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File | undefined) {
    if (!file) return
    setError(null)
    if (file.size > MAX_BYTES) {
      setError('Fichier trop lourd (max 5 Mo).')
      return
    }
    setUploading(true)
    try {
      const ext = extFromMime(file.type)
      const path = `organizer/${ownerId}/${crypto.randomUUID()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('posters')
        .upload(path, file, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: false,
        })
      if (upErr) {
        setError(upErr.message)
        return
      }
      const { data } = supabase.storage.from('posters').getPublicUrl(path)
      onImageUrlChange(data.publicUrl)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="cover-upload">
      <div className="cover-upload-head">
        <label htmlFor={fileId}>Image de couverture</label>
        <span className="admin-card-meta">JPG, PNG ou WebP · max 5 Mo.</span>
      </div>
      <div className="cover-upload-row">
        <input
          id={fileId}
          type="file"
          accept={ACCEPT}
          disabled={disabled || uploading}
          onChange={(e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            void handleFile(f)
          }}
        />
        {uploading && <span className="admin-card-meta">Upload…</span>}
      </div>
      <label className="cover-upload-url">
        <span>Ou URL (image déjà hébergée)</span>
        <input
          type="url"
          value={imageUrl}
          onChange={(e) => onImageUrlChange(e.target.value)}
          placeholder="https://…"
          disabled={disabled || uploading}
          className="admin-input"
        />
      </label>
      {imageUrl && (
        <div className="cover-upload-preview">
          <img src={imageUrl} alt="" />
        </div>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  )
}
