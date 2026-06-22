export const PLATFORMS = [
  {
    id: 'ebay',
    name: 'eBay',
    color: '#e53238',
    bgColor: 'bg-red-50',
    textColor: 'text-red-600',
    borderColor: 'border-red-200',
    hint: 'Best for electronics, sneakers, collectibles',
    icon: 'EB',
  },
  {
    id: 'depop',
    name: 'Depop',
    color: '#ff2300',
    bgColor: 'bg-pink-50',
    textColor: 'text-pink-600',
    borderColor: 'border-pink-200',
    hint: 'Best for streetwear, vintage, Y2K',
    icon: 'DP',
  },
  {
    id: 'poshmark',
    name: 'Poshmark',
    color: '#820f7e',
    bgColor: 'bg-fuchsia-50',
    textColor: 'text-fuchsia-700',
    borderColor: 'border-fuchsia-200',
    hint: 'Best for brands, designer, clothes',
    icon: 'PM',
  },
]

export function getPlatform(id) {
  return PLATFORMS.find((p) => p.id === id)
}

export function buildExportText(listing, platform) {
  const p = getPlatform(platform)
  const lines = [
    `[${p?.name || platform}] Listing Export`,
    '',
    `Title: ${listing.title}`,
    `Price: $${Number(listing.price).toFixed(2)}`,
    `Condition: ${listing.condition}`,
    `Category: ${listing.category}`,
    '',
    'Description:',
    listing.description,
    '',
    `AI Confidence: ${listing.aiConfidence}`,
  ]
  return lines.join('\n')
}

export async function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text)
    return true
  }
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  const ok = document.execCommand('copy')
  document.body.removeChild(ta)
  return ok
}
