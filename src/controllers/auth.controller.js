// src/controllers/auth.controller.js
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '../config/prisma.config.js'
import { createError } from '../utils/create-error.util.js'

const AUTH_COOKIE = process.env.AUTH_COOKIE_NAME || 'token'
const JWT_SECRET  = process.env.JWT_SECRET || 'TopAwards'
const IS_PROD     = process.env.NODE_ENV === 'production'

// helper สร้าง JWT
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

// POST /api/auth/register
export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return next(createError(400, 'อีเมลนี้ถูกใช้งานแล้ว'))

    const hashed = await bcrypt.hash(password, 10)
    const created = await prisma.user.create({
      data: { name, email, password_hash: hashed, role: 'user' },
      select: { id: true, name: true, email: true, role: true }
    })

    // ✅ ออปชัน: ออก token ให้ทันทีหลังสมัคร (สะดวกทดสอบ)
    const token = signToken({ id: created.id, role: created.role })
    res.cookie(AUTH_COOKIE, token, {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: IS_PROD ? 'none' : 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    return res.status(201).json({
      message: 'สมัครสมาชิกสำเร็จ',
      token, // 👈 ส่ง token กลับมาด้วย
      user: created
    })
  } catch (err) {
    next(err)
  }
}

// POST /api/auth/login
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, password_hash: true, role: true }
    })
    if (!user) return next(createError(400, 'อีเมลไม่ถูกต้อง'))

    const isMatch = await bcrypt.compare(password, user.password_hash)
    if (!isMatch) return next(createError(400, 'รหัสผ่านไม่ถูกต้อง'))

    const token = signToken({ id: user.id, role: user.role })

    // ✅ เซ็ต cookie (เว็บใช้ได้)
    res.cookie(AUTH_COOKIE, token, {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: IS_PROD ? 'none' : 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    // ✅ และส่ง token ใน body (Postman/มือถือใช้ Bearer ได้)
    return res.json({
      message: 'เข้าสู่ระบบสำเร็จ',
      token, // 👈 เพิ่มตรงนี้
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    })
  } catch (err) {
    next(err)
  }
}

// GET /api/auth/me (ต้องผ่าน authenticate middleware ก่อน)
export const getMe = async (req, res, next) => {
  try {
    res.json(req.user)
  } catch (err) {
    next(err)
  }
}

// POST /api/auth/logout
export const logout = async (_req, res, _next) => {
  res.clearCookie(AUTH_COOKIE, {
    path: '/',
    secure: IS_PROD,
    sameSite: IS_PROD ? 'none' : 'lax'
  })
  return res.json({ message: 'ออกจากระบบแล้ว' })
}

/* ========================== CHANGE PASSWORD ========================== */
export const changePassword = async (req, res, next) => {
  try {
    const raw = req.body || {}

    const old_password =
      raw.old_password ?? raw.current_password ?? raw.oldPassword ??
      raw.currentPassword ?? raw.password_old ?? raw.passwordCurrent ?? raw.current ?? null

    const new_password =
      raw.new_password ?? raw.password ?? raw.newPassword ??
      raw.password_new ?? raw.passwordNew ?? raw.next ?? null

    if (!old_password || !new_password) {
      return next(createError(400, 'กรุณาระบุรหัสผ่านเดิมและรหัสผ่านใหม่'))
    }

    if (String(new_password).length < 8) {
      return next(createError(400, 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร'))
    }

    if (String(new_password) === String(old_password)) {
      return next(createError(400, 'รหัสผ่านใหม่ต้องแตกต่างจากรหัสผ่านเดิม'))
    }

    const userId = req.user?.id
    if (!userId) return next(createError(401, 'กรุณาเข้าสู่ระบบ'))

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password_hash: true }
    })
    if (!user) return next(createError(404, 'ไม่พบบัญชีผู้ใช้'))

    const isMatch = await bcrypt.compare(String(old_password), String(user.password_hash))
    if (!isMatch) return next(createError(400, 'รหัสผ่านเดิมไม่ถูกต้อง'))

    const hashed = await bcrypt.hash(String(new_password), 10)
    await prisma.user.update({
      where: { id: userId },
      data: { password_hash: hashed }
    })

    return res.json({ message: 'เปลี่ยนรหัสผ่านสำเร็จ' })
  } catch (err) {
    next(err)
  }
}