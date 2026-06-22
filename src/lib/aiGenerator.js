// Simulated AI listing generator.
//
// Design principles:
// - Never invent a brand, model, or size not visible in the filename/context.
// - Use hedged language ("appears to be", "likely") when confidence is medium/low.
// - Confidence is high only when the filename contains a clear, specific keyword.
// - Always return a notes array of things the seller should verify manually.
// - Price is returned as a range (low–high), not a single invented number.
// - A requiresReview flag is set whenever confidence is medium or low.

// ---------------------------------------------------------------------------
// Catalog — each entry covers one item category.
// confidence: 'high' means the filename clearly identifies the category.
// Fields: titleFn, descriptionFn, category, conditions, priceRange, notes
// ---------------------------------------------------------------------------

const CATALOG = [
  // ---------- Sneakers / Jordan / Nike ----------
  {
    match: (s) => /jordan|aj1|aj\d|dunk|air\s?force|yeezy|af1|nike|adidas|new\s?balance|nb\d|asics|puma\s?suede/i.test(s),
    confidence: 'high',
    category: 'Sneakers',
    itemType: 'sneaker',
    buildTitle({ brand, colorway }) {
      if (brand && colorway) return `${brand} – ${colorway}`
      if (brand) return `${brand} Sneakers`
      return 'Sneakers'
    },
    buildDescription({ brand, colorway, condition, confidence }) {
      const brandStr = brand ? brand : 'a sneaker'
      const colorStr = colorway ? ` in ${colorway}` : ''
      const hedge = confidence === 'high' ? `${brandStr}${colorStr}` : `what appears to be ${brandStr}${colorStr}`
      return `${capitalize(hedge)}. ${conditionSentence(condition)} Please verify the exact model, size, and colorway before listing. Sold as-is — photos are part of the description.`
    },
    conditions: ['Used – Good', 'Used – Excellent', 'Like New', 'New / Deadstock'],
    priceRange: { low: 80, high: 300 },
    notes: [
      'Verify exact model name and colorway.',
      'Confirm size — not visible from photo alone.',
      'Check for authentication if brand-name — fakes are common.',
      'Original box significantly increases value.',
    ],
  },

  // ---------- Streetwear / Graphic Tees ----------
  {
    match: (s) => /tee|t.shirt|graphic|band.tee|vintage.shirt|rap.tee/i.test(s),
    confidence: 'medium',
    category: 'T-Shirts',
    itemType: 't-shirt',
    buildTitle({ colorway, condition }) {
      const cond = condition === 'New / Unworn' ? 'Unworn' : 'Used'
      return colorway ? `Graphic T-Shirt – ${colorway} (${cond})` : 'Graphic T-Shirt'
    },
    buildDescription({ colorway, condition, confidence }) {
      const colorStr = colorway ? `, ${colorway} colorway` : ''
      const hedge = confidence === 'high' ? `Graphic t-shirt${colorStr}` : `Appears to be a graphic t-shirt${colorStr}`
      return `${hedge}. ${conditionSentence(condition)} Check for any fading or print cracking — pictured condition reflects the listed grade. Please verify brand and sizing before posting.`
    },
    conditions: ['Used – Fair', 'Used – Good', 'Used – Excellent', 'Like New', 'New / Unworn'],
    priceRange: { low: 15, high: 70 },
    notes: [
      'Confirm brand name — tag or label must be visible.',
      'Single-stitch hem indicates pre-2000s vintage and adds value.',
      'Check for stains, holes, or cracking print under good light.',
    ],
  },

  // ---------- Hoodies / Sweatshirts ----------
  {
    match: (s) => /hoodie|sweatshirt|pullover|crewneck|zip.up/i.test(s),
    confidence: 'medium',
    category: 'Hoodies',
    itemType: 'hoodie',
    buildTitle({ colorway }) {
      return colorway ? `Hoodie / Sweatshirt – ${colorway}` : 'Hoodie / Sweatshirt'
    },
    buildDescription({ colorway, condition, confidence }) {
      const colorStr = colorway ? `, ${colorway}` : ''
      const hedge = confidence === 'high' ? `Hoodie${colorStr}` : `Appears to be a hoodie${colorStr}`
      return `${hedge}. ${conditionSentence(condition)} No obvious pilling or print cracks visible in photo. Confirm brand, size, and fabric weight before listing.`
    },
    conditions: ['Used – Good', 'Used – Excellent', 'Like New', 'New / Unworn'],
    priceRange: { low: 25, high: 130 },
    notes: [
      'Confirm brand from tag — increases value on Poshmark/Depop.',
      'Check drawstrings, cuffs, and hem for wear.',
      'Size label should be included in listing photos.',
    ],
  },

  // ---------- Jackets / Outerwear ----------
  {
    match: (s) => /jacket|coat|bomber|windbreaker|puffer|varsity|leather.jacket/i.test(s),
    confidence: 'medium',
    category: 'Outerwear',
    itemType: 'jacket',
    buildTitle({ colorway }) {
      return colorway ? `Jacket – ${colorway}` : 'Jacket / Outerwear'
    },
    buildDescription({ colorway, condition, confidence }) {
      const colorStr = colorway ? `, ${colorway}` : ''
      const hedge = confidence === 'high' ? `Jacket${colorStr}` : `Likely a jacket${colorStr}`
      return `${hedge}. ${conditionSentence(condition)} All visible zippers and hardware appear intact. Verify brand, lining condition, and size before listing.`
    },
    conditions: ['Used – Fair', 'Used – Good', 'Used – Excellent', 'Like New'],
    priceRange: { low: 40, high: 200 },
    notes: [
      'Check all zippers, buttons, and pockets.',
      'Lining condition is hard to assess from exterior photo.',
      'Brand tag location varies — check collar and inner seam.',
    ],
  },

  // ---------- Denim / Pants ----------
  {
    match: (s) => /jean|denim|cargo|trouser|chino|pant/i.test(s),
    confidence: 'medium',
    category: 'Bottoms',
    itemType: 'pants',
    buildTitle({ colorway }) {
      return colorway ? `Jeans / Pants – ${colorway}` : 'Jeans / Pants'
    },
    buildDescription({ colorway, condition, confidence }) {
      const colorStr = colorway ? `, ${colorway}` : ''
      const hedge = confidence === 'high' ? `Denim${colorStr}` : `Likely denim or pants${colorStr}`
      return `${hedge}. ${conditionSentence(condition)} Visible seams and hardware appear intact. Confirm waist/inseam measurements and brand before listing — buyers need exact sizing.`
    },
    conditions: ['Used – Fair', 'Used – Good', 'Used – Excellent', 'Like New'],
    priceRange: { low: 20, high: 100 },
    notes: [
      'Always include waist and inseam measurements.',
      'Check for any repairs or uneven fading.',
      'Selvedge denim commands a premium — check inner seam.',
    ],
  },

  // ---------- Bags ----------
  {
    match: (s) => /bag|purse|backpack|tote|handbag|crossbody|clutch|duffel/i.test(s),
    confidence: 'medium',
    category: 'Bags',
    itemType: 'bag',
    buildTitle({ colorway }) {
      return colorway ? `Bag – ${colorway}` : 'Bag / Accessory'
    },
    buildDescription({ colorway, condition, confidence }) {
      const colorStr = colorway ? `, ${colorway}` : ''
      const hedge = confidence === 'high' ? `Bag${colorStr}` : `Appears to be a bag${colorStr}`
      return `${hedge}. ${conditionSentence(condition)} Hardware and visible stitching appear intact. For designer items, authentication is strongly recommended before listing.`
    },
    conditions: ['Used – Fair', 'Used – Good', 'Used – Excellent', 'Like New'],
    priceRange: { low: 25, high: 160 },
    notes: [
      'Photograph all interior compartments — buyers will ask.',
      'For luxury brands, get a professional authentication.',
      'Hardware scratches and strap condition affect value.',
      'Include measurements (L × H × D).',
    ],
  },

  // ---------- Watches ----------
  {
    match: (s) => /watch|rolex|casio|seiko|omega|tudor|ap |audemars|timepiece|wristwatch/i.test(s),
    confidence: 'medium',
    category: 'Watches',
    itemType: 'watch',
    buildTitle({ brand, colorway }) {
      if (brand && colorway) return `${brand} Watch – ${colorway} Dial`
      if (brand) return `${brand} Watch`
      return 'Wristwatch'
    },
    buildDescription({ brand, colorway, condition, confidence }) {
      const brandStr = brand || 'a watch'
      const dialStr = colorway ? ` with ${colorway} dial` : ''
      const hedge = confidence === 'high' ? `${capitalize(brandStr)}${dialStr}` : `Appears to be ${brandStr}${dialStr}`
      return `${hedge}. ${conditionSentence(condition)} Crystal and dial appear clear in photo. Confirm movement, reference number, and bracelet condition before listing — luxury watches require authentication.`
    },
    conditions: ['Used – Fair', 'Used – Good', 'Used – Excellent', 'Like New', 'New / Unworn'],
    priceRange: { low: 50, high: 600 },
    notes: [
      'Confirm reference/model number from the caseback or documentation.',
      'Luxury watches should be authenticated professionally.',
      'Service history and original box significantly affect price.',
      'Check for crystal scratches under a light source.',
    ],
  },

  // ---------- Hats ----------
  {
    match: (s) => /\bhat\b|snapback|fitted|beanie|cap\b|bucket.hat|dad.hat/i.test(s),
    confidence: 'medium',
    category: 'Hats',
    itemType: 'hat',
    buildTitle({ colorway }) {
      return colorway ? `Hat / Cap – ${colorway}` : 'Hat / Cap'
    },
    buildDescription({ colorway, condition, confidence }) {
      const colorStr = colorway ? `, ${colorway}` : ''
      const hedge = confidence === 'high' ? `Hat${colorStr}` : `Appears to be a hat${colorStr}`
      return `${hedge}. ${conditionSentence(condition)} Crown structure and visible stitching appear intact. Confirm brand, size, and sweatband condition before listing.`
    },
    conditions: ['Used – Good', 'Used – Excellent', 'Like New', 'New / Unworn'],
    priceRange: { low: 12, high: 60 },
    notes: [
      'Photograph the sweatband — staining reduces value.',
      'Confirm adjustable size or fitted size from the label.',
      'Limited edition or collab hats need authentication.',
    ],
  },

  // ---------- Electronics / Phones ----------
  {
    match: (s) => /iphone|samsung|pixel|oneplus|phone|macbook|laptop|ipad|tablet|console|playstation|xbox|nintendo/i.test(s),
    confidence: 'high',
    category: 'Electronics',
    itemType: 'electronic',
    buildTitle({ brand, colorway }) {
      if (brand && colorway) return `${brand} – ${colorway}`
      if (brand) return brand
      return 'Electronic Device'
    },
    buildDescription({ brand, colorway, condition, confidence }) {
      const brandStr = brand || 'an electronic device'
      const colorStr = colorway ? `, ${colorway}` : ''
      const hedge = confidence === 'high' ? `${capitalize(brandStr)}${colorStr}` : `Appears to be ${brandStr}${colorStr}`
      return `${hedge}. ${conditionSentence(condition)} Screen and visible body pictured as-is. Factory reset before shipping. Confirm storage capacity, carrier lock status, and battery health before listing.`
    },
    conditions: ['Used – Fair', 'Used – Good', 'Used – Excellent', 'Like New', 'New / Open Box'],
    priceRange: { low: 100, high: 700 },
    notes: [
      'Run a full factory reset — do not ship with personal data.',
      'Check and disclose battery health percentage.',
      'Confirm carrier lock or unlocked status.',
      'iCloud / Google account must be signed out before sale.',
      'Include IMEI if applicable for buyer verification.',
    ],
  },

  // ---------- Vintage / Streetwear (generic) ----------
  {
    match: (s) => /vintage|y2k|90s|80s|streetwear|supreme|bape|off.white|palace|stussy/i.test(s),
    confidence: 'medium',
    category: 'Streetwear / Vintage',
    itemType: 'clothing',
    buildTitle({ colorway }) {
      return colorway ? `Vintage / Streetwear Item – ${colorway}` : 'Vintage / Streetwear Item'
    },
    buildDescription({ colorway, condition, confidence }) {
      const colorStr = colorway ? `, ${colorway}` : ''
      const hedge = confidence === 'high' ? `Streetwear item${colorStr}` : `Likely a vintage or streetwear piece${colorStr}`
      return `${hedge}. ${conditionSentence(condition)} Age-related wear is expected and part of the charm. Confirm brand, tag date, and any visible graphics before listing.`
    },
    conditions: ['Used – Fair', 'Used – Good', 'Used – Excellent', 'Like New'],
    priceRange: { low: 20, high: 150 },
    notes: [
      'Photograph all tags — brand, size, and care label.',
      'Confirm authenticity before listing as a collab or limited piece.',
      'Measurements help sell — chest, length, sleeve.',
    ],
  },
]

// Default when no keyword matches — low confidence, fully hedged
const DEFAULT_ENTRY = {
  confidence: 'low',
  category: 'General',
  itemType: 'item',
  buildTitle() {
    return 'Item for Sale'
  },
  buildDescription({ condition }) {
    return `Item of unknown type. ${conditionSentence(condition)} Unable to identify category from the filename alone. Please review and update the title and description before listing.`
  },
  conditions: ['Used – Fair', 'Used – Good', 'Used – Excellent', 'Like New'],
  priceRange: { low: 10, high: 60 },
  notes: [
    'AI could not identify this item from the filename.',
    'Add a clear, descriptive title manually.',
    'Research recent sold listings on eBay for an accurate price.',
    'Include measurements and any visible brand markings.',
  ],
}

// ---------------------------------------------------------------------------
// Keyword → brand/colorway extraction (filename hints only)
// ---------------------------------------------------------------------------

const BRAND_SIGNALS = [
  { re: /jordan|aj1|aj\d/i, brand: 'Air Jordan' },
  { re: /dunk/i, brand: 'Nike Dunk' },
  { re: /air.force|af1/i, brand: 'Nike Air Force 1' },
  { re: /yeezy/i, brand: 'Adidas Yeezy' },
  { re: /new.balance|nb\d{3}/i, brand: 'New Balance' },
  { re: /asics/i, brand: 'ASICS' },
  { re: /nike/i, brand: 'Nike' },
  { re: /adidas/i, brand: 'Adidas' },
  { re: /puma/i, brand: 'Puma' },
  { re: /supreme/i, brand: 'Supreme' },
  { re: /bape/i, brand: 'BAPE' },
  { re: /off.white/i, brand: 'Off-White' },
  { re: /palace/i, brand: 'Palace' },
  { re: /stussy/i, brand: 'Stüssy' },
  { re: /iphone\s*(\d+)\s*(pro|plus|max|mini)?/i, brand: (m) => `iPhone ${m[1]}${m[2] ? ' ' + capitalize(m[2]) : ''}` },
  { re: /samsung\s*galaxy\s*([a-z0-9]+)/i, brand: (m) => `Samsung Galaxy ${m[1].toUpperCase()}` },
  { re: /macbook\s*(pro|air|mini)?/i, brand: (m) => `MacBook${m[1] ? ' ' + capitalize(m[1]) : ''}` },
  { re: /rolex/i, brand: 'Rolex' },
  { re: /casio/i, brand: 'Casio' },
  { re: /seiko/i, brand: 'Seiko' },
]

const COLORWAY_SIGNALS = [
  { re: /\bblack.white\b/i, colorway: 'Black/White' },
  { re: /\bred.white\b/i, colorway: 'Red/White' },
  { re: /\bblack.red\b/i, colorway: 'Black/Red' },
  { re: /\bblue.white\b/i, colorway: 'Blue/White' },
  { re: /\bwhite.grey\b/i, colorway: 'White/Grey' },
  { re: /\bblack\b/i, colorway: 'Black' },
  { re: /\bwhite\b/i, colorway: 'White' },
  { re: /\bblue\b/i, colorway: 'Blue' },
  { re: /\bred\b/i, colorway: 'Red' },
  { re: /\bgreen\b/i, colorway: 'Green' },
  { re: /\bgrey\b|\bgray\b/i, colorway: 'Grey' },
  { re: /\bbrown\b|\btan\b|\bbeige\b/i, colorway: 'Brown/Tan' },
  { re: /\bpink\b/i, colorway: 'Pink' },
  { re: /\byellow\b|\bcanary\b/i, colorway: 'Yellow' },
  { re: /\bpurple\b|\bviolet\b/i, colorway: 'Purple' },
  { re: /\borange\b/i, colorway: 'Orange' },
  { re: /\bsand\b|\bdune\b/i, colorway: 'Sand/Dune' },
  { re: /\bnavy\b/i, colorway: 'Navy' },
  { re: /\bold\s*gold\b/i, colorway: 'Old Gold' },
  { re: /\bbred\b/i, colorway: 'Bred (Black/Red)' },
  { re: /\bchicago\b/i, colorway: 'Chicago (White/Black/Red)' },
  { re: /\bpanda\b/i, colorway: 'Panda (Black/White)' },
  { re: /\bmocha\b/i, colorway: 'Mocha' },
]

const CONDITION_SIGNALS = [
  { re: /deadstock|ds\b|new.in.box|nib|nds/i, condition: 'New / Deadstock' },
  { re: /unworn|brand.new|new.with.tags|nwt/i, condition: 'New / Unworn' },
  { re: /vnds|near.dead/i, condition: 'Like New' },
  { re: /\blike.new\b|\bmint\b/i, condition: 'Like New' },
  { re: /\bexcellent\b|\b9\/10\b|\b9.5\/10\b/i, condition: 'Used – Excellent' },
  { re: /\bgood\b|\b8\/10\b/i, condition: 'Used – Good' },
  { re: /fair|worn|beater|\b6\/10\b|\b7\/10\b/i, condition: 'Used – Fair' },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function capitalize(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function conditionSentence(condition) {
  const map = {
    'New / Deadstock': 'Appears to be in new/deadstock condition based on visible photo.',
    'New / Unworn': 'Appears unworn — no visible signs of use.',
    'New / Open Box': 'Listed as new / open box. Confirm contents before shipping.',
    'Like New': 'Minimal signs of use — in like-new condition.',
    'Used – Excellent': 'Shows light use. No major flaws visible in photo.',
    'Used – Good': 'Moderate use with minor visible wear.',
    'Used – Fair': 'Visible wear consistent with regular use. Described honestly.',
  }
  return map[condition] || 'Condition as shown in photos.'
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function extractBrand(filename) {
  for (const { re, brand } of BRAND_SIGNALS) {
    const m = filename.match(re)
    if (m) return typeof brand === 'function' ? brand(m) : brand
  }
  return null
}

function extractColorway(filename) {
  for (const { re, colorway } of COLORWAY_SIGNALS) {
    if (re.test(filename)) return colorway
  }
  return null
}

function extractCondition(filename) {
  for (const { re, condition } of CONDITION_SIGNALS) {
    if (re.test(filename)) return condition
  }
  return null
}

function findEntry(filename) {
  const cleaned = (filename || '').toLowerCase()
  for (const entry of CATALOG) {
    if (entry.match(cleaned)) return entry
  }
  return DEFAULT_ENTRY
}

function generateSimilarItems(priceRange, category) {
  const { low, high } = priceRange
  const mid = Math.round((low + high) / 2)
  return [
    { platform: 'ebay', price: clamp(mid + rndOffset(15), low, high), soldDays: 3 },
    { platform: 'depop', price: clamp(mid + rndOffset(12), low, high), soldDays: 5 },
    { platform: 'poshmark', price: clamp(mid + rndOffset(14), low, high), soldDays: 7 },
  ].map((s) => ({ ...s, category }))
}

function rndOffset(range) {
  return Math.floor(Math.random() * (range * 2 + 1)) - range
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v))
}

// ---------------------------------------------------------------------------
// Public export
// ---------------------------------------------------------------------------

export function generateListing(filename) {
  const entry = findEntry(filename)
  const brand = extractBrand(filename)
  const colorway = extractColorway(filename)
  const conditionFromName = extractCondition(filename)
  const condition = conditionFromName || pickRandom(entry.conditions)

  // Confidence: bump down if no brand/colorway was extractable for categories
  // where those things normally appear (sneakers, electronics, watches).
  let confidence = entry.confidence || 'low'
  if (confidence === 'high' && !brand) confidence = 'medium'

  const title = entry.buildTitle({ brand, colorway, condition, confidence })
  const description = entry.buildDescription({ brand, colorway, condition, confidence })

  // requiresReview is true for anything below high confidence
  const requiresReview = confidence !== 'high'

  // Price range — widen slightly for used items, tighten for new
  const { low, high } = entry.priceRange
  const suggestedPriceLow = conditionFromName?.includes('New') ? Math.round(high * 0.8) : Math.round(low)
  const suggestedPriceHigh = conditionFromName?.includes('New') ? high : Math.round(high * 0.75)
  const suggestedPrice = Math.round((suggestedPriceLow + suggestedPriceHigh) / 2)

  return {
    title,
    description,
    condition,
    category: entry.category,
    brand: brand || null,
    colorway: colorway || null,
    price: suggestedPrice,
    priceRange: { low: suggestedPriceLow, high: suggestedPriceHigh },
    fullPriceRange: { low, high },
    confidence,
    requiresReview,
    notes: entry.notes || [],
    similarItems: generateSimilarItems({ low: suggestedPriceLow, high: suggestedPriceHigh }, entry.category),
    generatedAt: new Date().toISOString(),
  }
}
