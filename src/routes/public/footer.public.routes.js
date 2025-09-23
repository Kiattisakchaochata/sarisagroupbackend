// src/routes/public/footer.public.routes.js
import { Router } from 'express';
import { getPublicFooter } from '../../controllers/footer.controller.js';

const router = Router();
router.get('/', getPublicFooter);
export default router;