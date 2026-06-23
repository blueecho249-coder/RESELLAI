# RESELLAI - AI Vision Reselling Assistant

AI-powered reselling assistant for teens with **real-time image vision detection**.

## ✨ Features

- **📸 Photo upload** - snap or upload a picture of any item
- **🤖 AI vision detection** - identifies items in images using TensorFlow COCO-SSD
- **🎯 Real-time item detection** - shows detected item type, brand hints, and confidence score
- **📝 AI listing generation** - catchy title, condition-aware description, and suggested price
- **✓ Listing checklist** - photo, title, description, price, platform, listed
- **📱 Platform picker** - eBay, Depop, or Poshmark with mock export
- **📊 Item dashboard** - track status and total revenue
- **📱 Mobile-first** - big buttons, simple text, teen-friendly design

## 🔧 Tech Stack

- **Frontend:** React + Vite + Tailwind CSS
- **Vision AI:** TensorFlow.js + COCO-SSD (runs in browser)
- **Backend:** Node + Express with `/api/upload` and `/api/generate-listing`
- **Storage:** Supabase (items table + image storage)
- **AI Generation:** Local vision service + keyword fallback

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run frontend only (Vite dev server)
npm run dev

# Run backend only
npm run dev:server

# Run both concurrently
npm run dev:all

# Build for production
npm run build
```

## 🌐 Environment Variables

Create a `.env.local` file:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

No login required. No real marketplace APIs needed.

## 📁 Project Structure

```
src/
  pages/          UploadPage, ResultsPage, DashboardPage
  components/     ListingChecklist, ExportModal
  services/       Supabase item CRUD + image upload
  lib/
    visionService.js    ← NEW: TensorFlow object detection
    aiGenerator.js      AI fallback with keyword matching
    supabase.js
    platformConfig.js
  store/          In-memory listing store
server/
  index.js        Express API server
  aiGenerator.js  Re-export from src/lib
```

## 🎯 How Vision Detection Works

1. **Upload Image** → Sent to browser and Supabase
2. **Local Vision Analysis** → TensorFlow COCO-SSD detects objects
3. **Categorization** → Objects mapped to resale categories (Sneakers, Electronics, etc.)
4. **Fallback** → If vision unavailable, uses filename-based generation
5. **Listing Generation** → AI combines detection + keyword hints
6. **User Review** → Edit and customize before posting

## 📊 Detected Categories

- ✓ Sneakers / Shoes
- ✓ Clothing (shirts, jackets, hoodies)
- ✓ Electronics (phones, laptops, tablets)
- ✓ Watches & Accessories
- ✓ Bags & Luggage
- ✓ Sports Equipment
- ✓ Furniture
- ✓ Books & Media

## 🐛 Bug Fixes & Improvements

- ✅ Fixed vision API fallback logic
- ✅ Added local TensorFlow object detection
- ✅ Real-time detection feedback UI
- ✅ Better error handling with graceful degradation
- ✅ Confidence scoring for quality assurance
- ✅ Mobile-optimized image processing

## 🔐 Privacy

- TensorFlow runs **entirely in your browser**
- No image data sent to external ML APIs by default
- Optional Supabase integration for cloud features
- All detections happen locally first

## 📝 Notes

- Vision detection works best with clear, well-lit photos
- Condition estimation is simplified; ML models can be enhanced
- Brand detection uses object hints; optical character recognition coming soon
- No real marketplace connections yet

## 📄 License

MIT
