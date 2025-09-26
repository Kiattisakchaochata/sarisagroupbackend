// routes/admin/brand.admin.routes.js
import express from 'express';
import multer from 'multer';
import os from 'os';
import path from 'path';

import { authenticate, requireAdmin } from '../../middlewares/auth.middleware.js';
import {
  getAdminBrand,
  upsertAdminBrand,
  uploadBrandAsset,
} from '../../controllers/brand.controller.js';

const upload = multer({
  dest: path.join(os.tmpdir(), 'uploads'),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

const router = express.Router();

router.use(authenticate, requireAdmin);

router.get('/', getAdminBrand);
router.post('/', upsertAdminBrand);
router.post('/upload', upload.single('file'), uploadBrandAsset);

export default router;