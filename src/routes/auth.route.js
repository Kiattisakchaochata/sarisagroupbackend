import express from 'express'
import { register, login, getMe, logout, changePassword } from '../controllers/auth.controller.js'
import { validate } from '../middlewares/validator.middleware.js'
import { registerSchema, loginSchema } from '../validations/auth.validation.js'
import { authenticate, authenticateOptional } from '../middlewares/auth.middleware.js' // ⬅️ เพิ่ม authenticateOptional

const router = express.Router()

router.post('/register', validate(registerSchema), register)
router.post('/login', validate(loginSchema), login)

// ⬅️ เปลี่ยนให้ /me ไม่บังคับต้องมี token (ถ้ามีก็จะได้ user, ถ้าไม่มีก็คืน null ด้วย 200)
router.get('/me', authenticateOptional, getMe)

router.post('/logout', authenticate, logout)

// ✅ เปลี่ยนรหัสผ่าน (ต้องล็อกอินก่อน)
router.post('/change-password', authenticate, changePassword)
// (ทางเลือก) เผื่อไคลเอนต์บางตัวเรียก PATCH
router.patch('/password', authenticate, changePassword)

export default router