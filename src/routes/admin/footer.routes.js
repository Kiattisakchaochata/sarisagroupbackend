// src/routes/admin/footer.routes.js
import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorizeRole } from '../../middlewares/role.middleware.js';
import { getAdminFooter, updateAdminFooter } from '../../controllers/footer.controller.js';

const router = Router();
router.use(authenticate);
router.use(authorizeRole('admin'));

router.get('/', getAdminFooter);
router.patch('/', updateAdminFooter);

export default router;