import express from 'express'
import cors from 'cors'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import { generateListing } from './aiGenerator.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'uploads')),
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`)
  },
})

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    cb(allowed.includes(file.mimetype) ? null : new Error('Only image files allowed'), allowed.includes(file.mimetype))
  },
  limits: { fileSize: 10 * 1024 * 1024 },
})

app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image uploaded' })
  }
  const imageUrl = `/uploads/${req.file.filename}`
  res.json({ imageUrl, filename: req.file.filename })
})

app.post('/api/generate-listing', (req, res) => {
  const { filename, imageUrl } = req.body
  if (!filename && !imageUrl) {
    return res.status(400).json({ error: 'Image reference required' })
  }
  const listing = generateListing(filename || imageUrl)
  res.json(listing)
})

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'RESELLAI API' })
})

app.listen(PORT, () => {
  console.log(`RESELLAI API running on port ${PORT}`)
})
