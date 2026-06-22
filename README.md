# RESELLAI

AI-powered reselling assistant for teens. Snap a photo of an item, get an AI-generated listing (title, description, suggested price), pick a platform (eBay / Depop / Poshmark), copy your listing, and track everything in a dashboard.

## Features

- **Photo upload** - snap or upload a picture of any item
- **AI listing generation** - catchy title, condition-aware description, and a suggested price based on similar sold items
- **Listing checklist** - photo, title, description, price, platform, listed
- **Platform picker** - eBay, Depop, or Poshmark with a mock "copy to platform" export
- **Item dashboard** - track status (not listed / listed / sold) and total revenue
- **Mobile-first** - big buttons, simple text, teen-friendly design

## Tech

- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Node + Express (`server/`) with image upload (`/api/upload`) and AI generation (`/api/generate-listing`) endpoints
- **Storage:** Supabase (items table + image storage bucket)
- **AI:** Simulated with a curated catalog and filename keyword matching in `src/lib/aiGenerator.js` (shared with the Express server)

## Getting started

```bash
npm install
npm run dev        # Vite dev server (browser preview)
npm run dev:all    # Vite + Express backend concurrently
npm run build      # production build
```

Environment variables (already configured):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

No login required. No real marketplace APIs - the "copy to platform" action shows a mock export popup.

## Project structure

```
src/
  pages/          UploadPage, ResultsPage, DashboardPage
  components/     ListingChecklist, ExportModal
  services/      Supabase item CRUD + image upload
  lib/           supabase client, AI generator, platform config
  store/         in-memory listing store (upload → results handoff)
server/
  index.js       Express app: /api/upload, /api/generate-listing
  aiGenerator.js re-exports shared generator from src/lib
```
