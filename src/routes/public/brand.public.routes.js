// routes/public/brand.public.routes.js
import express from 'express';
import { getPublicBrand } from '../../controllers/brand.controller.js';

const router = express.Router();

// GET /api/brand  → ดึงค่า SiteBrand (public)
router.get('/brand', getPublicBrand);

export default router;