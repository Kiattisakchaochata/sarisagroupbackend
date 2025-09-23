// src/routes/admin/seo.routes.js
import { Router } from 'express';
import {
  getSiteSeo,
  upsertSiteSeo,
  listPageSeo,
  getPageSeoByPath,
  upsertPageSeo,
  deletePageSeo,
} from '../../controllers/seo.controller.js';

const router = Router();

/* ---------- Global (SiteSeo) ---------- */
router.get('/site', getSiteSeo);
router.put('/site', upsertSiteSeo);
router.post('/site', upsertSiteSeo);
// ✅ เพิ่ม PATCH ให้รองรับ FE ที่ยิง PATCH
router.patch('/site', upsertSiteSeo);

/* ---------- Pages (PageSeo) ---------- */
router.get('/pages', listPageSeo);
router.get('/page', getPageSeoByPath);   // ?path=/about
router.put('/page', upsertPageSeo);
router.post('/page', upsertPageSeo);
// ✅ เพิ่ม PATCH เช่นกัน
router.patch('/page', upsertPageSeo);

router.delete('/pages/:id', deletePageSeo);

export default router;