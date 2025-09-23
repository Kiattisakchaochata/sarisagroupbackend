import express from 'express'
import { authenticate } from '../../middlewares/auth.middleware.js'
import { authorizeRole } from '../../middlewares/role.middleware.js'
import { getAdminStats } from '../../controllers/stats.controller.js'

const router = express.Router()
router.use(authenticate, authorizeRole('admin'))

router.get('/', getAdminStats)

export default router