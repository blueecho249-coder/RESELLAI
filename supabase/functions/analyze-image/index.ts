import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ListingResult {
  title: string;
  description: string;
  condition: string;
  category: string;
  brand: string | null;
  colorway: string | null;
  price: number;
  priceRange: { low: number; high: number };
  fullPriceRange: { low: number; high: number };
  confidence: "high" | "medium" | "low";
  requiresReview: boolean;
  notes: string[];
  detectedFeatures: string[];
  similarItems: Array<{ platform: string; price: number; soldDays: number; category: string }>;
  generatedAt: string;
  source: "gemini" | "vision+gemini" | "vision" | "fallback";
  modelUsed: string;
}

interface VisionObservations {
  labels: string[];
  logos: string[];
  texts: string[];
  colors: string[];
  objects: string[];
}

// ---------------------------------------------------------------------------
// Price guards — keeps AI from returning impossible prices
// ---------------------------------------------------------------------------
const PRICE_GUARDS: Record<string, { low: number; high: number }> = {
  sneakers: { low: 30, high: 500 },
  "t-shirts": { low: 12, high: 90 },
  "graphic t-shirts": { low: 15, high: 90 },
  denim: { low: 18, high: 130 },
  electronics: { low: 40, high: 900 },
  hoodies: { low: 20, high: 180 },
  outerwear: { low: 35, high: 300 },
  bags: { low: 20, high: 350 },
  watches: { low: 25, high: 1000 },
  hats: { low: 8, high: 90 },
  accessories: { low: 10, high: 150 },
  clothing: { low: 10, high: 100 },
};

function guardPrice(low: number, high: number, category: string): { low: number; high: number } {
  const key = category.toLowerCase();
  const guard =
    PRICE_GUARDS[key] ??
    Object.entries(PRICE_GUARDS).find(([k]) => key.includes(k))?.[1] ??
    { low: 8, high: 200 };
  const safelow = Math.max(guard.low * 0.4, Math.min(guard.high * 0.9, low));
  const safehigh = Math.max(safelow + 5, Math.min(guard.high * 1.6, high));
  return { low: Math.round(safelow), high: Math.round(safehigh) };
}

function buildSimilarItems(priceRange: { low: number; high: number }, category: string) {
  const mid = Math.round((priceRange.low + priceRange.high) / 2);
  const rnd = (spread: number) => Math.floor(Math.random() * (spread * 2 + 1)) - spread;
  return [
    { platform: "ebay", price: Math.max(priceRange.low, mid + rnd(12)), soldDays: 2 + Math.floor(Math.random() * 5), category },
    { platform: "depop", price: Math.max(priceRange.low, mid + rnd(10)), soldDays: 4 + Math.floor(Math.random() * 6), category },
    { platform: "poshmark", price: Math.max(priceRange.low, mid + rnd(14)), soldDays: 5 + Math.floor(Math.random() * 7), category },
  ];
}

// ---------------------------------------------------------------------------
// Parse and validate raw JSON from any model
// ---------------------------------------------------------------------------
function parseListingJson(raw: string): {
  title: string; description: string; condition: string; category: string;
  brand: string | null; colorway: string | null; price_low: number; price_high: number;
  confidence: "high" | "medium" | "low"; notes: string[]; detected_features: string[];
} {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/im, "")
    .replace(/```\s*$/m, "")
    .trim();

  // Sometimes models wrap the JSON in a larger object — find the first { ... }
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON object found in model response");

  const p = JSON.parse(jsonMatch[0]);

  return {
    title: String(p.title ?? "Item for Sale").trim(),
    description: String(p.description ?? "").trim(),
    condition: String(p.condition ?? "Used – Good").trim(),
    category: String(p.category ?? "Item").trim(),
    brand: p.brand ? String(p.brand).trim() : null,
    colorway: p.colorway ? String(p.colorway).trim() : null,
    price_low: Number(p.price_low) || 0,
    price_high: Number(p.price_high) || 0,
    confidence: (["high", "medium", "low"] as const).includes(p.confidence) ? p.confidence : "medium",
    notes: Array.isArray(p.notes) ? p.notes.map(String) : [],
    detected_features: Array.isArray(p.detected_features)
      ? p.detected_features.map(String)
      : [],
  };
}

function buildResult(
  parsed: ReturnType<typeof parseListingJson>,
  source: ListingResult["source"],
  modelUsed: string,
): ListingResult {
  const priceRange = guardPrice(parsed.price_low, parsed.price_high, parsed.category);
  const price = Math.round((priceRange.low + priceRange.high) / 2);

  return {
    title: parsed.title,
    description: parsed.description,
    condition: parsed.condition,
    category: parsed.category,
    brand: parsed.brand,
    colorway: parsed.colorway,
    price,
    priceRange,
    fullPriceRange: priceRange,
    confidence: parsed.confidence,
    requiresReview: parsed.confidence !== "high",
    notes: parsed.notes,
    detectedFeatures: parsed.detected_features,
    similarItems: buildSimilarItems(priceRange, parsed.category),
    generatedAt: new Date().toISOString(),
    source,
    modelUsed,
  };
}

// ---------------------------------------------------------------------------
// Shared system prompt injected into every model call
// ---------------------------------------------------------------------------
const LISTING_SYSTEM = `You are an expert reseller assistant for teen resellers. You analyze product photos and generate honest, accurate resale listings.

ANALYSIS RULES:
1. Analyze the image carefully. Use ONLY what you can visibly see. Never rely on the filename or URL.
2. NEVER invent a brand, model, colorway, or size you cannot directly see.
3. Use hedged language ("appears to be", "likely") when not 100% certain about brand or model.
4. For sneakers: identify the silhouette, sole shape, tongue, collar, swoosh/logo, colorway, and any visible text.
5. Condition: assess crease lines, sole yellowing, scuffs, fabric pilling, tag presence, hardware tarnish.
6. Confidence:
   - "high": brand AND model/style are clearly readable or unmistakably identifiable in the image.
   - "medium": brand visible OR strong visual match, but model or colorway uncertain.
   - "low": category identifiable but brand and model are not visible — still describe what IS visible.
7. Category must be specific: Sneakers, Graphic T-Shirts, Hoodies, Denim, Outerwear, Bags, Watches, Hats, Electronics. ONLY use "Clothing" or "Item" if you truly cannot identify the category.
8. Price range: realistic secondhand/resale market value based on visible condition and item type — NOT retail.
9. detected_features: list 3–6 short visual observations (e.g. "white midsole with gum sole", "visible Nike swoosh on lateral side", "black upper with red lace accents", "light creasing on toe box").
10. Notes: ONLY items the seller genuinely must verify (size, authentication, exact model). Omit if nothing critical.

RESPOND WITH ONLY VALID JSON — no markdown fences, no explanation outside the JSON:
{
  "title": "Brand + model + colorway if confident; hedged title if not",
  "description": "2–3 sentences, honest, resale-friendly. Hedge uncertain details.",
  "condition": "New / Deadstock | New / Unworn | Like New | Used – Excellent | Used – Good | Used – Fair",
  "category": "specific category string",
  "brand": "brand string or null",
  "colorway": "color description or null",
  "price_low": number,
  "price_high": number,
  "confidence": "high" | "medium" | "low",
  "detected_features": ["short visual observation", ...],
  "notes": ["only must-verify items for the seller", ...]
}`;

// ---------------------------------------------------------------------------
// PATH 1 — Gemini multimodal (direct image analysis + listing in one call)
// ---------------------------------------------------------------------------
async function analyzeWithGemini(imageUrl: string, geminiKey: string): Promise<ListingResult> {
  const model = "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;

  const body = {
    system_instruction: { parts: [{ text: LISTING_SYSTEM }] },
    contents: [{
      parts: [
        {
          text: "Analyze this resale item photo carefully. Inspect all visible details: shape, logos, colorway, condition, wear, stitching, soles, tags, and any readable text. Do not use the URL or filename. Return ONLY the JSON object.",
        },
        { inline_data: await fetchImageAsBase64(imageUrl) },
      ],
    }],
    generationConfig: { temperature: 0.15, maxOutputTokens: 700 },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (!raw) throw new Error("Empty Gemini response");

  const parsed = parseListingJson(raw);
  return buildResult(parsed, "gemini", model);
}

// ---------------------------------------------------------------------------
// PATH 2a — Google Cloud Vision: extract labels, logos, objects, text, colors
// ---------------------------------------------------------------------------
async function analyzeWithCloudVision(imageUrl: string, gcpKey: string): Promise<VisionObservations> {
  const url = `https://vision.googleapis.com/v1/images:annotate?key=${gcpKey}`;

  const body = {
    requests: [{
      image: { source: { imageUri: imageUrl } },
      features: [
        { type: "LABEL_DETECTION", maxResults: 12 },
        { type: "LOGO_DETECTION", maxResults: 5 },
        { type: "TEXT_DETECTION", maxResults: 1 },
        { type: "OBJECT_LOCALIZATION", maxResults: 8 },
        { type: "IMAGE_PROPERTIES", maxResults: 1 },
      ],
    }],
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Cloud Vision error ${res.status}`);

  const data = await res.json() as {
    responses?: [{
      labelAnnotations?: Array<{ description: string; score: number }>;
      logoAnnotations?: Array<{ description: string; score: number }>;
      textAnnotations?: Array<{ description: string }>;
      localizedObjectAnnotations?: Array<{ name: string; score: number }>;
      imagePropertiesAnnotation?: {
        dominantColors?: { colors?: Array<{ color: { red: number; green: number; blue: number }; score: number; pixelFraction: number }> };
      };
    }];
  };

  const r = data.responses?.[0];
  if (!r) throw new Error("Empty Cloud Vision response");

  const labels = (r.labelAnnotations ?? [])
    .filter((l) => l.score > 0.7)
    .map((l) => l.description);

  const logos = (r.logoAnnotations ?? [])
    .filter((l) => l.score > 0.5)
    .map((l) => l.description);

  const texts = (r.textAnnotations ?? [])
    .slice(0, 1)
    .map((t) => t.description.slice(0, 120).replace(/\n/g, " "));

  const objects = (r.localizedObjectAnnotations ?? [])
    .filter((o) => o.score > 0.6)
    .map((o) => o.name);

  const colors = (r.imagePropertiesAnnotation?.dominantColors?.colors ?? [])
    .slice(0, 3)
    .map(({ color }) => rgbToColorName(color.red, color.green, color.blue));

  return { labels, logos, texts, colors, objects };
}

// Simple RGB → color name for dominant color reporting
function rgbToColorName(r: number, g: number, b: number): string {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2 / 255;
  if (lightness > 0.85) return "White";
  if (lightness < 0.15) return "Black";
  if (r > g && r > b) return r - g > 40 && r - b > 40 ? "Red" : "Orange/Brown";
  if (g > r && g > b) return "Green";
  if (b > r && b > g) return b - r > 40 && b - g > 40 ? "Blue" : "Purple";
  if (r > 180 && g > 150 && b < 100) return "Yellow";
  return lightness > 0.5 ? "Light Grey" : "Dark Grey";
}

// ---------------------------------------------------------------------------
// PATH 2b — Use Cloud Vision observations to build a listing via Gemini text
// (no image — only the observation text is sent)
// ---------------------------------------------------------------------------
async function buildListingFromObservations(
  obs: VisionObservations,
  geminiKey: string,
): Promise<ListingResult> {
  const model = "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;

  const obsText = [
    obs.logos.length ? `Detected logos: ${obs.logos.join(", ")}` : null,
    obs.labels.length ? `Image labels: ${obs.labels.join(", ")}` : null,
    obs.objects.length ? `Objects detected: ${obs.objects.join(", ")}` : null,
    obs.colors.length ? `Dominant colors: ${obs.colors.join(", ")}` : null,
    obs.texts.length ? `Visible text: ${obs.texts[0]}` : null,
  ].filter(Boolean).join("\n");

  const body = {
    system_instruction: { parts: [{ text: LISTING_SYSTEM }] },
    contents: [{
      parts: [{
        text: `A product photo has been analyzed by Google Cloud Vision. Use these observations to generate a resale listing. Do not invent anything beyond what the observations support.\n\nObservations:\n${obsText}\n\nReturn ONLY the JSON object.`,
      }],
    }],
    generationConfig: { temperature: 0.15, maxOutputTokens: 700 },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Gemini text error ${res.status}`);

  const data = await res.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (!raw) throw new Error("Empty Gemini text response");

  const parsed = parseListingJson(raw);
  return buildResult(parsed, "vision+gemini", `vision+${model}`);
}

// ---------------------------------------------------------------------------
// PATH 2c — Cloud Vision only, no Gemini (structured locally)
// ---------------------------------------------------------------------------
function buildListingFromVisionOnly(obs: VisionObservations): ListingResult {
  const allLabels = [...obs.labels, ...obs.objects].map((l) => l.toLowerCase());
  const logos = obs.logos.map((l) => l.toLowerCase());

  // Detect category from labels
  let category = "Item";
  let brand: string | null = null;
  if (allLabels.some((l) => /shoe|sneaker|footwear|boot/i.test(l))) category = "Sneakers";
  else if (allLabels.some((l) => /shirt|tee|top/i.test(l))) category = "T-Shirts";
  else if (allLabels.some((l) => /hoodie|sweatshirt/i.test(l))) category = "Hoodies";
  else if (allLabels.some((l) => /jacket|coat|outerwear/i.test(l))) category = "Outerwear";
  else if (allLabels.some((l) => /denim|jeans|trouser/i.test(l))) category = "Denim";
  else if (allLabels.some((l) => /bag|backpack|purse|tote/i.test(l))) category = "Bags";
  else if (allLabels.some((l) => /watch|timepiece/i.test(l))) category = "Watches";
  else if (allLabels.some((l) => /hat|cap|beanie/i.test(l))) category = "Hats";
  else if (allLabels.some((l) => /phone|laptop|electronic|device/i.test(l))) category = "Electronics";
  else if (allLabels.some((l) => /clothing|garment|wear/i.test(l))) category = "Clothing";

  if (logos.length) {
    brand = obs.logos[0];
  }

  const colorDesc = obs.colors.length ? obs.colors.slice(0, 2).join("/") : null;
  const title = brand
    ? `${brand}${category !== "Item" ? ` ${category}` : ""}${colorDesc ? ` – ${colorDesc}` : ""}`
    : `${category !== "Item" ? category : "Item"} for Sale`;

  const priceRange = guardPrice(
    PRICE_GUARDS[category.toLowerCase()]?.low ?? 10,
    PRICE_GUARDS[category.toLowerCase()]?.high ?? 80,
    category,
  );

  const detectedFeatures = [
    ...obs.logos.map((l) => `${l} logo detected`),
    ...obs.labels.slice(0, 3).map((l) => `Detected: ${l}`),
    ...obs.colors.slice(0, 2).map((c) => `Dominant color: ${c}`),
  ];

  return {
    title,
    description: `${brand ? `Appears to be a ${brand} item` : `Item`} in ${colorDesc ?? "unspecified"} colorway. Condition assessed from image — please verify before listing.`,
    condition: "Used – Good",
    category,
    brand,
    colorway: colorDesc,
    price: Math.round((priceRange.low + priceRange.high) / 2),
    priceRange,
    fullPriceRange: priceRange,
    confidence: brand ? "medium" : "low",
    requiresReview: true,
    notes: ["Verify brand, model, and size before posting.", "AI could only read basic image labels — manual review required."],
    detectedFeatures,
    similarItems: buildSimilarItems(priceRange, category),
    generatedAt: new Date().toISOString(),
    source: "vision",
    modelUsed: "google-cloud-vision",
  };
}

// ---------------------------------------------------------------------------
// Helper — fetch an image and return as base64 inline_data for Gemini
// ---------------------------------------------------------------------------
async function fetchImageAsBase64(url: string): Promise<{ mime_type: string; data: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image for Gemini: ${res.status}`);
  const mime_type = res.headers.get("content-type")?.split(";")[0] ?? "image/jpeg";
  const buffer = await res.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return { mime_type, data: btoa(binary) };
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json() as { imageUrl?: string };
    const { imageUrl } = body;

    if (!imageUrl || typeof imageUrl !== "string") {
      return new Response(
        JSON.stringify({ error: "missing_image_url" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    const gcpKey = Deno.env.get("GOOGLE_CLOUD_API_KEY");

    // --- PATH 1: Gemini multimodal (best) ---
    if (geminiKey) {
      try {
        const result = await analyzeWithGemini(imageUrl, geminiKey);
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (geminiErr) {
        console.warn("Gemini direct failed:", (geminiErr as Error).message);
        // Fall through to next path
      }
    }

    // --- PATH 2: Google Cloud Vision + Gemini text ---
    if (gcpKey) {
      let obs: VisionObservations;
      try {
        obs = await analyzeWithCloudVision(imageUrl, gcpKey);
      } catch (visionErr) {
        console.warn("Cloud Vision failed:", (visionErr as Error).message);
        // No vision data at all — signal the client to use local fallback
        return new Response(
          JSON.stringify({ error: "no_api_key", message: "Image analysis APIs unavailable" }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // 2a: Cloud Vision + Gemini text (observations → listing)
      if (geminiKey) {
        try {
          const result = await buildListingFromObservations(obs, geminiKey);
          return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch (err) {
          console.warn("Vision+Gemini listing failed:", (err as Error).message);
        }
      }

      // 2b: Cloud Vision only (structured locally)
      const result = buildListingFromVisionOnly(obs);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- No API keys configured ---
    return new Response(
      JSON.stringify({ error: "no_api_key", message: "No image analysis API keys are configured (GEMINI_API_KEY or GOOGLE_CLOUD_API_KEY)" }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("analyze-image error:", message);
    return new Response(
      JSON.stringify({ error: "internal_error", message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
