// Simulated AI listing generator — shared by the Express backend and the
// browser so the app works in preview (no separate server process) while
// still shipping a real Node + Express API for the GitHub repo.

const CATALOG = [
  {
    keywords: ['sneaker', 'shoe', 'nike', 'jordan', 'yeezy', 'dunk', 'air'],
    titleTemplates: [
      '{name} Sneakers - Heat for Your Collection',
      'Rare {name} Kicks - Deadstock Vibes',
      '{name} Fire Sneakers - Cop Before They are Gone',
    ],
    categories: ['Sneakers', 'Footwear'],
    conditions: ['Like New', 'Gently Used', 'Excellent'],
    details: [
      'Original box included, laces still factory fresh.',
      'Worn twice, soles still icy, no creasing on toe box.',
      'Minor scuff on heel, otherwise pristine condition.',
    ],
    priceRange: [85, 280],
    confidence: '92%',
  },
  {
    keywords: ['tee', 'tshirt', 'shirt', 'vintage', 'graphic'],
    titleTemplates: [
      '{name} Graphic Tee - Vintage Gold',
      'Rare {name} T-Shirt - Streetwear Heat',
      '{name} Vintage Tee - Perfect Fade',
    ],
    categories: ['T-Shirts', 'Streetwear'],
    conditions: ['Gently Used', 'Like New', 'Good'],
    details: [
      'Soft cotton blend with that perfect vintage feel.',
      'No stains or holes, print still super crisp.',
      'Minimal fading, tag still readable.',
    ],
    priceRange: [18, 65],
    confidence: '87%',
  },
  {
    keywords: ['hoodie', 'sweat', 'pullover', 'crewneck'],
    titleTemplates: [
      '{name} Hoodie - Cozy Season Essential',
      'Streetwear {name} Hoodie - Heavyweight Fire',
      '{name} Pullover - Perfect Fit',
    ],
    categories: ['Hoodies', 'Streetwear'],
    conditions: ['Like New', 'Gently Used', 'Excellent'],
    details: [
      'Heavyweight fleece, drawstrings still crisp.',
      'No pilling or fuzz, zipper works smooth.',
      'Worn a handful of times, basically new.',
    ],
    priceRange: [35, 120],
    confidence: '89%',
  },
  {
    keywords: ['jacket', 'coat', 'bomber', 'denim', 'windbreaker'],
    titleTemplates: [
      '{name} Jacket - Statement Piece',
      'Vintage {name} Jacket - Rare Find',
      '{name} Outerwear - Season Ready',
    ],
    categories: ['Jackets', 'Outerwear'],
    conditions: ['Gently Used', 'Like New', 'Good'],
    details: [
      'All buttons and zippers fully functional.',
      'Minimal wear, lining intact, tag still attached.',
      'Cleaned and ready to wear, no tears or stains.',
    ],
    priceRange: [45, 180],
    confidence: '85%',
  },
  {
    keywords: ['jean', 'pant', 'denim', 'cargo', 'trouser'],
    titleTemplates: [
      '{name} Denim - Perfect Fit',
      'Vintage {name} Jeans - Classic Cut',
      '{name} Pants - Versatile Staple',
    ],
    categories: ['Pants', 'Denim'],
    conditions: ['Gently Used', 'Like New', 'Good'],
    details: [
      'No rips or repairs, hem still original.',
      'Minimal fading, button and zipper work perfectly.',
      'Cuffed once, otherwise unaltered.',
    ],
    priceRange: [25, 95],
    confidence: '84%',
  },
  {
    keywords: ['bag', 'purse', 'backpack', 'tote', 'handbag'],
    titleTemplates: [
      '{name} Bag - Elevate Your Fit',
      'Stylish {name} Bag - Barely Used',
      '{name} Handbag - Statement Accessory',
    ],
    categories: ['Bags', 'Accessories'],
    conditions: ['Like New', 'Gently Used', 'Excellent'],
    details: [
      'Hardware still shiny, zippers glide smooth.',
      'Minor corner wear, interior super clean.',
      'Comes with dust bag, straps intact.',
    ],
    priceRange: [30, 150],
    confidence: '88%',
  },
  {
    keywords: ['watch', 'rolex', 'casio', 'seiko', 'clock'],
    titleTemplates: [
      '{name} Watch - Timeless Flex',
      'Vintage {name} Timepiece - Collector Grade',
      '{name} Watch - Battery Fresh',
    ],
    categories: ['Watches', 'Accessories'],
    conditions: ['Excellent', 'Like New', 'Gently Used'],
    details: [
      'Crystal is clean, no deep scratches, keeps time accurately.',
      'New battery installed, strap in great shape.',
      'Comes with original box and papers.',
    ],
    priceRange: [60, 500],
    confidence: '90%',
  },
  {
    keywords: ['hat', 'cap', 'beanie', 'snapback', 'fitted'],
    titleTemplates: [
      '{name} Cap - Finish Your Fit',
      'Rare {name} Hat - Collector Drop',
      '{name} Snapback - Unworn Condition',
    ],
    categories: ['Hats', 'Accessories'],
    conditions: ['Like New', 'Excellent', 'Gently Used'],
    details: [
      'Crown still structured, sweatband clean.',
      'Stitching intact, no fading on the logo.',
      'Barely worn, fits true to size.',
    ],
    priceRange: [15, 55],
    confidence: '86%',
  },
  {
    keywords: ['phone', 'iphone', 'samsung', 'pixel', 'case'],
    titleTemplates: [
      '{name} Phone - Gently Used, Fully Functional',
      'Unlocked {name} Smartphone - Great Deal',
      '{name} Device - Battery Health Solid',
    ],
    categories: ['Electronics', 'Phones'],
    conditions: ['Gently Used', 'Like New', 'Good'],
    details: [
      'Screen has no cracks, battery holds charge well.',
      'Factory reset, icloud unlocked, ready to activate.',
      'Minor scuffs on frame, display is pristine.',
    ],
    priceRange: [120, 600],
    confidence: '91%',
  },
  {
    keywords: ['book', 'textbook', 'novel', 'comic', 'manga'],
    titleTemplates: [
      '{name} Book - Like New Condition',
      'Rare {name} Edition - Collector Copy',
      '{name} Read Once - Pristine Pages',
    ],
    categories: ['Books', 'Media'],
    conditions: ['Like New', 'Excellent', 'Good'],
    details: [
      'No highlighting, spine intact, pages crisp.',
      'Dust jacket included with minimal shelf wear.',
      'First edition, no torn or folded pages.',
    ],
    priceRange: [8, 45],
    confidence: '83%',
  },
]

const DEFAULT_ENTRY = {
  titleTemplates: [
    '{name} - Perfect Resell Opportunity',
    'Quality {name} Item - Ready to Ship',
    '{name} - Grab It Before It is Gone',
  ],
  categories: ['General', 'Miscellaneous'],
  conditions: ['Gently Used', 'Like New', 'Good'],
  details: [
    'Cleaned and inspected, ready for a new owner.',
    'No major flaws, functions as intended.',
    'Stored carefully, smoke-free environment.',
  ],
  priceRange: [20, 80],
  confidence: '80%',
}

const POSITIVE_WORDS = ['fire', 'heat', 'rare', 'vintage', 'exclusive', 'limited', 'premium', 'classic']

function cleanName(raw) {
  let name = (raw || '').replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').trim()
  name = name.replace(/\b\w/g, (c) => c.toUpperCase())
  return name || 'This Item'
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function findEntry(filename) {
  const lowered = (filename || '').toLowerCase()
  for (const entry of CATALOG) {
    if (entry.keywords.some((k) => lowered.includes(k))) {
      return entry
    }
  }
  return DEFAULT_ENTRY
}

function templateTitle(template, name) {
  return template.replace(/{name}/g, name)
}

function generateSimilarItems(range, category) {
  const [low, high] = range
  const mid = Math.round((low + high) / 2)
  const samples = [
    { platform: 'ebay', price: mid + Math.floor(Math.random() * 20) - 10, soldDays: 3 },
    { platform: 'depop', price: mid + Math.floor(Math.random() * 15) - 5, soldDays: 5 },
    { platform: 'poshmark', price: mid + Math.floor(Math.random() * 18) - 8, soldDays: 7 },
  ]
  return samples.map((s) => ({
    platform: s.platform,
    category,
    price: Math.max(low, Math.min(high, s.price)),
    soldDays: s.soldDays,
  }))
}

export function generateListing(filename) {
  const entry = findEntry(filename)
  const name = cleanName(filename)
  const title = templateTitle(pickRandom(entry.titleTemplates), name)
  const condition = pickRandom(entry.conditions)
  const detail = pickRandom(entry.details)
  const category = pickRandom(entry.categories)
  const [low, high] = entry.priceRange
  const suggestedPrice = Math.round((Math.random() * (high - low) + low) * 100) / 100
  const positiveWord = pickRandom(POSITIVE_WORDS)
  const description = `${name} for sale. ${detail} Listed as ${condition.toLowerCase()}. ${positiveWord.charAt(0).toUpperCase() + positiveWord.slice(1)} quality item that ships fast and packaged carefully. Message me with any questions or for more pics.`
  const similarItems = generateSimilarItems([low, high], category)

  return {
    title,
    description,
    condition,
    category,
    price: suggestedPrice,
    priceRange: { low, high },
    aiConfidence: entry.confidence,
    similarItems,
    generatedAt: new Date().toISOString(),
  }
}
