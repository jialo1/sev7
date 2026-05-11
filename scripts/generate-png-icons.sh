#!/usr/bin/env bash
# Génère les variantes PNG des icônes SEV7 (favicon, apple-touch, PWA install)
# pour les deux apps (client + pro) à partir des fichiers SVG sources.
#
# Détecte automatiquement le convertisseur disponible :
#   1. rsvg-convert    (brew install librsvg)            ← le plus rapide
#   2. magick / convert (brew install imagemagick)        ← répandu
#   3. npx @resvg/resvg-js-cli (zéro install système)    ← fallback portable
#
# Usage :   ./scripts/generate-png-icons.sh
#
# Tailles générées :
#   - favicon-32.png, favicon-48.png  (onglets navigateur)
#   - apple-touch-icon-180.png        (iOS install homescreen)
#   - icon-192.png, icon-512.png      (PWA install Android / Chrome)

set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APPS=("client" "pro")

# --- détection du convertisseur ----------------------------------------------
CONVERTER=""
if command -v rsvg-convert >/dev/null 2>&1; then
  CONVERTER="rsvg"
  echo "→ Utilise rsvg-convert"
elif command -v magick >/dev/null 2>&1; then
  CONVERTER="magick"
  echo "→ Utilise ImageMagick (magick)"
elif command -v convert >/dev/null 2>&1; then
  CONVERTER="convert"
  echo "→ Utilise ImageMagick (convert)"
else
  CONVERTER="resvg"
  echo "→ Aucun outil système trouvé, utilise npx @resvg/resvg-js-cli"
  echo "  (la 1ère exécution va télécharger ~5 MB)"
fi

# --- helper conversion -------------------------------------------------------
convert_svg() {
  local src="$1"
  local size="$2"
  local out="$3"
  case "$CONVERTER" in
    rsvg)
      rsvg-convert -w "$size" -h "$size" "$src" -o "$out"
      ;;
    magick)
      magick -background none -density 384 "$src" -resize "${size}x${size}" "$out"
      ;;
    convert)
      convert -background none -density 384 "$src" -resize "${size}x${size}" "$out"
      ;;
    resvg)
      npx --yes @resvg/resvg-js-cli "$src" --output "$out" --width "$size" >/dev/null
      ;;
  esac
}

# --- génération pour chaque app ----------------------------------------------
for app in "${APPS[@]}"; do
  pub="$REPO/apps/$app/public"
  fav="$pub/favicon.svg"
  ati="$pub/apple-touch-icon.svg"

  if [[ ! -f "$fav" ]]; then
    echo "⚠️  $fav introuvable, on saute $app"
    continue
  fi

  echo ""
  echo "▶ $app"

  # Favicon classique
  for size in 32 48; do
    out="$pub/favicon-$size.png"
    convert_svg "$fav" "$size" "$out"
    echo "  ✓ $(basename "$out") (${size}×${size})"
  done

  # PWA / Android install (manifest)
  for size in 192 512; do
    out="$pub/icon-$size.png"
    convert_svg "$fav" "$size" "$out"
    echo "  ✓ $(basename "$out") (${size}×${size})"
  done

  # Apple touch icon (iOS install homescreen)
  if [[ -f "$ati" ]]; then
    out="$pub/apple-touch-icon.png"
    convert_svg "$ati" 180 "$out"
    echo "  ✓ apple-touch-icon.png (180×180)"
  fi
done

echo ""
echo "✅ Fait. PNGs générés dans apps/*/public/."
echo ""
echo "Pour les activer côté browser :"
echo "  • apps/{client,pro}/index.html : déjà liés en SVG, ajouter une 2e <link>"
echo "    rel='apple-touch-icon' href='/apple-touch-icon.png' avant le SVG"
echo "  • apps/client/vite.config.ts : ajouter icon-192.png et icon-512.png"
echo "    dans manifest.icons (purpose any maskable)"
echo ""
echo "Pense à les commit + push pour qu'ils soient servis par Vercel."
