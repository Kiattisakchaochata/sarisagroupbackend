// routes/admin/tracking.admin.routes.js
import express from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorizeRole } from '../../middlewares/role.middleware.js';
import {
  deleteTrackingScript,
  listTrackingScripts,
  upsertTrackingScript,
} from '../../controllers/tracking.controller.js';

const router = express.Router();
router.use(authenticate);
router.use(authorizeRole('admin'));

router.get('/', listTrackingScripts);
router.post('/', upsertTrackingScript);      // create/update (upsert by id)
router.delete('/:id', deleteTrackingScript);

export default router;