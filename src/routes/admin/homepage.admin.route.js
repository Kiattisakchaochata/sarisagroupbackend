// src/routes/admin/homepage.admin.route.js
import express from 'express'
import { authenticate } from '../../middlewares/auth.middleware.js'
import { authorizeRole } from '../../middlewares/role.middleware.js'
import {
  getHomepageAdmin,
  updateHomepageAdmin,
} from '../../controllers/homepage.controller.js'
import { getNetworkLogosAdmin, updateNetworkLogosAdmin } from '../../controllers/homepage.network.controller.js'

const router = express.Router()
router.use(authenticate, authorizeRole('admin'))

router.get('/', getHomepageAdmin)      // GET /api/admin/homepage
router.patch('/', updateHomepageAdmin) // PATCH /api/admin/homepage

// ↓↓↓ NEW endpoints for network logos
router.get('/network', getNetworkLogosAdmin)
router.patch('/network', updateNetworkLogosAdmin)

export default router