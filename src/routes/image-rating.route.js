 import express from 'express';
 import {
   createOrUpdateImageRating,
   deleteImageRating,
   getImageRatingsForImage,
   getMyImageRating
 } from '../controllers/image-rating.controller.js';
 import { authenticate } from '../middlewares/auth.middleware.js';

 const router = express.Router();

+// 🔐 Authenticated: ให้ดาว/อัปเดต โดยส่ง image_id ใน body (รองรับ StarRater เดิม)
+router.post('/', authenticate, createOrUpdateImageRating);

 // 🟢 Guest: ดูสถิติของรูป
 router.get('/:imageId', getImageRatingsForImage);

 // 🟢 Authenticated: ดูของตัวเองว่าเคยโหวตรึยัง
 router.get('/:imageId/me', authenticate, getMyImageRating);

 // 🔐 Authenticated: ให้ดาว หรืออัปเดตดาว แบบพาธมี :imageId
 router.post('/:imageId', authenticate, createOrUpdateImageRating);

 // 🔐 Authenticated: ลบดาวของตัวเองออก
 router.delete('/:imageId', authenticate, deleteImageRating);

 export default router;