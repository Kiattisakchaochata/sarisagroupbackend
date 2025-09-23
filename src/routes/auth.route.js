import express from 'express'
import { register, login, getMe, logout, changePassword } from '../controllers/auth.controller.js'
import { validate } from '../middlewares/validator.middleware.js'
import { registerSchema, loginSchema } from '../validations/auth.validation.js'
import { authenticate } from '../middlewares/auth.middleware.js'

const router = express.Router()

router.post('/register', validate(registerSchema), register)
router.post('/login', validate(loginSchema), login)
router.get('/me', authenticate, getMe)
router.post('/logout', authenticate, logout)

// ✅ เปลี่ยนรหัสผ่าน (ต้องล็อกอินก่อน)
router.post('/change-password', authenticate, changePassword)
// (ทางเลือก) เผื่อไคลเอนต์บางตัวเรียก PATCH
router.patch('/password', authenticate, changePassword)

export default router