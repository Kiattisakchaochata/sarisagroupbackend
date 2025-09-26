// src/routes/admin/admin.routes.js
import { Router } from 'express';
import {
  getSiteSeo,
  upsertSiteSeo,
  listPageSeo,
  getPageSeoByPath,
  upsertPageSeo,
  deletePageSeo,
} from '../../controllers/seo.controller.js';
import { authSeoAdmin } from '../../middlewares/authSeoAdmin.js';

const adminRouter = Router();

// ✅ ปกป้องทั้งกลุ่ม /admin/seo/* ด้วย token-based (หรือ JWT admin)
adminRouter.use('/admin/seo', authSeoAdmin);

// Global (SiteSeo)
adminRouter.get('/admin/seo/site', getSiteSeo);
adminRouter.patch('/admin/seo/site', upsertSiteSeo);

// Per Page (PageSeo)
adminRouter.get('/admin/seo/pages', listPageSeo);
adminRouter.get('/admin/seo/page', getPageSeoByPath);
adminRouter.post('/admin/seo/page', upsertPageSeo);
adminRouter.delete('/admin/seo/page/:id', deletePageSeo);

export default adminRouter;