// src/routes/admin/banner.routes.ts
import express from 'express';
import { upload as uploadTmp } from '../../middlewares/upload.middleware.js';
import {
  createBanner,
  getBanners,
  updateBanner,
  deleteBanner,
} from '../../controllers/banner.controller.js';

const router = express.Router();

// แอดมินดูทั้งหมด
router.get('/', getBanners);

// สร้างใหม่
router.post('/', uploadTmp.single('image'), createBanner);

// แก้ไข (เลือกรูปใหม่ได้/ไม่ก็ได้)
router.patch('/:id', uploadTmp.single('image'), updateBanner);

// ลบ
router.delete('/:id', deleteBanner);

export default router;