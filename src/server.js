import dotenv from 'dotenv'
import app from './app.js'
import shutdown from './utils/shutdown.util.js'

dotenv.config()

// ✅ ตรวจสอบ ENV ที่จำเป็น
const requiredEnvs = [
  'DATABASE_URL',
  'JWT_SECRET',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'CORS_ORIGIN',
]

requiredEnvs.forEach((key) => {
  if (!process.env[key]) {
    console.warn(`⚠️ Missing env: ${key}`)
  }
})

const PORT = process.env.PORT || 8000

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
})

process.on('SIGINT', () => shutdown('SIGINT', server))
process.on('SIGTERM', () => shutdown('SIGTERM', server))
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err)
  shutdown('uncaughtException', server)
})
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason)
  shutdown('unhandledRejection', server)
})