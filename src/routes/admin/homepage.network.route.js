import express from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorizeRole } from '../../middlewares/role.middleware.js';
import {
  getNetworkLogosAdmin,
  updateNetworkLogosAdmin,
} from '../../controllers/homepage.network.controller.js';

const router = express.Router();
router.use(authenticate, authorizeRole('admin'));

router.get('/network', getNetworkLogosAdmin);
router.patch('/network', updateNetworkLogosAdmin);

export default router;