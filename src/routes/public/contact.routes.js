// src/routes/public/contact.routes.js
import { Router } from 'express';
import {
  listPublicContacts,
  getPublicContactById,
  getPublicContactFallback,
} from '../../controllers/contact.controller.js';

const router = Router();

// ใหม่ (หลายร้าน)
router.get('/contacts', listPublicContacts);
router.get('/contacts/:id', getPublicContactById);

// เดิม (สำรองเพื่อเข้ากันได้)
router.get('/contact', getPublicContactFallback);

export default router;