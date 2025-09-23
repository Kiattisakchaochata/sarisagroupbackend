import express from 'express'
import {
  getAllStores,
  getStoreById,
  searchStore,
  getPopularStores,
  getFeaturedByStore,
  getHomeFeaturedStores,
  getStoreBySlug,
} from '../../controllers/store.controller.js'

const router = express.Router()

// ต้องวาง route เฉพาะ (home/search/popular/by-slug/:slug/:id/featured) ไว้เหนือ /:id เสมอ
router.get('/home/featured', getHomeFeaturedStores)        // GET /api/stores/home/featured
router.get('/search', searchStore)                         // GET /api/stores/search?q=...
router.get('/popular', getPopularStores)                   // GET /api/stores/popular
router.get('/by-slug/:slug', getStoreBySlug)               // GET /api/stores/by-slug/<slug>

// ✅ รูปเด่นทั้งหมดของร้าน ต้องมาก่อน /:id
router.get('/:id/featured', getFeaturedByStore)            // GET /api/stores/<id>/featured?limit=all

// ทั่วไป
router.get('/', getAllStores)                              // GET /api/stores
router.get('/:id', getStoreById)                           // GET /api/stores/<id>

export default router