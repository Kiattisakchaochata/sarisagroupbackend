// src/routes/admin/store.admin.route.js
import express from 'express';
import {
  // CRUD & info
  createStore,
  getAllStores,
  getStoreById,
  updateStore,
  deleteStore,
  updateStoreOrder,
  updateStoreCover,

  // loyalty / stats
  getStoreLoyaltyStats,

  // images
  deleteStoreImage,
  uploadImages,
  updateImageMeta,
  getHomeFeaturedStores,
  bulkUpdateStoreImages, // ✅ เพิ่มให้นำเข้าฟังก์ชัน bulk

  // lifecycle
  getExpiringSoonStores,
  getExpiredStores,
  reactivateStore,
  renewStore,
  setStoreStatus,
  enableStore,
  disableStore,
} from '../../controllers/store.controller.js';

import {
  storeUpload,               // multer สำหรับ create/patch store (ฟิลด์: cover, etc.)
  storeUploadSingleCover,    // multer สำหรับอัปเดต cover เดี่ยว
  upload,                    // multer generic: ใช้กับ /:id/images
} from '../../middlewares/upload.middleware.js';

import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorizeRole } from '../../middlewares/role.middleware.js';

const router = express.Router();

// เฉพาะแอดมินเท่านั้น
router.use(authenticate);
router.use(authorizeRole('admin'));

/* ------------------------------------
 * Extra endpoints (อายุร้าน/ต่ออายุ/ปลดแบน)
 * ------------------------------------ */
router.get('/expired', getExpiredStores);          // ?onlyInactive=true ดูเฉพาะที่ is_active=false
router.get('/expiring-soon', getExpiringSoonStores);
router.patch('/:id/reactivate', reactivateStore);  // ปลดแบน/ทำให้ active
router.patch('/:id/renew', renewStore);            // ต่ออายุร้าน (ปรับ expired_at, renewal_count)

/* ------------------------------------
 * สถิติ/loyalty
 * ------------------------------------ */
router.get('/loyalty', getStoreLoyaltyStats);

/* ------------------------------------
 * รูปภาพ (เฉพาะ path รูปภาพที่ไม่ผูกกับ id ร้าน)
 * ------------------------------------ */
// ✅ Bulk update เมทาดาต้าของรูป (ตรงกับ FE: PATCH /api/admin/stores/images/bulk)
router.patch('/images/bulk', bulkUpdateStoreImages);

// แก้ข้อมูลเมทาดาต้ารูป (เดี่ยว)
router.patch('/images/:imageId', updateImageMeta);

// ลบรูปเดี่ยว
router.delete('/images/:imageId', deleteStoreImage);

/* ------------------------------------
 * CRUD หลักของ Store
 * ------------------------------------ */

router.get('/home/featured', getHomeFeaturedStores);
router.get('/', getAllStores);
router.get('/:id', getStoreById);

router.post('/', storeUpload, createStore);
router.patch('/:id', storeUpload, updateStore);
router.patch('/cover/:id', storeUploadSingleCover, updateStoreCover);

router.delete('/:id', deleteStore);
router.patch('/:id/order', updateStoreOrder);

/* ------------------------------------
 * รูปภาพที่ผูกกับร้าน (upload ทีหลัง)
 * ------------------------------------ */
// เพิ่มรูปทีหลัง (ฟิลด์ FormData: images[]), จำกัดครั้งละ 5 รูป
router.post('/:id/images', upload.array('images', 5), uploadImages);

/* ------------------------------------
 * สถานะร้าน (รองรับ FE เก่า/ใหม่)
 * ------------------------------------ */
router.patch('/:id/status', setStoreStatus);  // body: { is_active: boolean }
router.patch('/:id/enable', enableStore);     // force true
router.patch('/:id/disable', disableStore);   // force false

export default router;