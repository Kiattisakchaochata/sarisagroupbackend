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

const adminRouter = Router();

/**
 * ========================
 * SEO Admin Routes
 * Base prefix: /admin/seo
 * ========================
 */

// Global (SiteSeo)
adminRouter.get('/admin/seo/site', getSiteSeo);
adminRouter.patch('/admin/seo/site', upsertSiteSeo);

// Per Page (PageSeo)
adminRouter.get('/admin/seo/pages', listPageSeo);
adminRouter.get('/admin/seo/page', getPageSeoByPath);      // /admin/seo/page?path=/about
adminRouter.post('/admin/seo/page', upsertPageSeo);        // upsert (create/update)
adminRouter.delete('/admin/seo/page/:id', deletePageSeo);  // delete by id

export default adminRouter;