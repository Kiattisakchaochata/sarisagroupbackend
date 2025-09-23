// src/routes/admin/contact.routes.js
import { Router } from 'express';
import {
  createAdminContact,
  listAdminContacts,
  updateAdminContact,
  deleteAdminContact,
  reindexAdminContacts,   // <-- ใหม่
} from '../../controllers/contact.controller.js';

// import { requireAuth, requireAdmin } from '../../middlewares/auth.js';

const router = Router();

router.get('/contacts', listAdminContacts);
router.post('/contacts', createAdminContact);
router.put('/contacts/:id', updateAdminContact);
router.delete('/contacts/:id', deleteAdminContact);
router.post('/contacts/reindex', reindexAdminContacts); // <-- ใหม่
export default router;