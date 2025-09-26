// src/middlewares/auth.middleware.js
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.config.js';

const JWT_SECRET   = process.env.JWT_SECRET || 'TopAwards';
const AUTH_COOKIE  = process.env.AUTH_COOKIE_NAME || 'token';
const ADMIN_TOKEN  = process.env.SEO_ADMIN_TOKEN || ''; // ✅ service token สำหรับ SEO/admin fetchers

// ---- helper: อ่าน token จาก header/cookie ----
function readTokenFromReq(req) {
  const h = req.headers.authorization;
  if (h?.startsWith('Bearer ')) return h.split(' ')[1];
  if (req.cookies?.[AUTH_COOKIE]) return req.cookies[AUTH_COOKIE];
  return null;
}

// ---- helper: ดึง SiteConfig (singleton) ----
async function getSiteConfig() {
  try {
    const cfg = await prisma.siteConfig.findUnique({ where: { id: 'singleton' } });
    return cfg ?? { allow_user_login: false, maintenance_mode: false };
  } catch {
    return { allow_user_login: false, maintenance_mode: false };
  }
}

/* ===================== AUTH (บังคับล็อกอินปกติ) ===================== */
export const authenticate = async (req, res, next) => {
  try {
    // ✅ bypass ถ้าเป็น service token ที่ตรงกับ SEO_ADMIN_TOKEN
    const h = req.headers.authorization || '';
    if (ADMIN_TOKEN && h.startsWith('Bearer ') && h.slice(7) === ADMIN_TOKEN) {
      return next();
    }

    const token = readTokenFromReq(req);
    if (!token) {
      return res.status(401).json({ message: 'ไม่ได้รับอนุญาต (ไม่มีโทเค็น)' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded?.id) {
      return res.status(401).json({ message: 'โทเค็นไม่ถูกต้อง' });
    }

    const user = await prisma.user.findUnique({
      where:  { id: decoded.id },
      select: { id: true, name: true, email: true, role: true },
    });
    if (!user) {
      return res.status(401).json({ message: 'ไม่พบผู้ใช้งาน' });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: 'Token ไม่ถูกต้องหรือหมดอายุ' });
  }
};

/* ============== AUTH (ไม่บังคับล็อกอิน) ============== */
export const authenticateOptional = async (req, _res, next) => {
  try {
    // ✅ bypass ถ้าเป็น service token
    const h = req.headers.authorization || '';
    if (ADMIN_TOKEN && h.startsWith('Bearer ') && h.slice(7) === ADMIN_TOKEN) {
      return next();
    }

    const token = readTokenFromReq(req);
    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded?.id) {
      req.user = null;
      return next();
    }

    const user = await prisma.user.findUnique({
      where:  { id: decoded.id },
      select: { id: true, name: true, email: true, role: true },
    });

    req.user = user || null;
    return next();
  } catch {
    req.user = null;
    return next();
  }
};

/* ============== Role Guard ============== */
export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึง' });
  }
  next();
};

export const requireAdmin = requireRole('admin');

/* ============== Maintenance Gate (ปิดปรับปรุง) ============== */
export const maintenanceGate = (opts = {}) => {
  const allowList = opts.allowList || [];
  return async (req, res, next) => {
    const cfg = await getSiteConfig();
    if (!cfg.maintenance_mode) return next();

    // อนุญาต path ที่ allowList (prefix)
    const p = req.path || req.url || '';
    if (allowList.some((prefix) => p.startsWith(prefix))) {
      return next();
    }

    // ถ้าเป็น service token ให้ผ่านช่วงปิดปรับปรุงด้วย
    const h = req.headers.authorization || '';
    if (ADMIN_TOKEN && h.startsWith('Bearer ') && h.slice(7) === ADMIN_TOKEN) {
      return next();
    }

    // เช็ค JWT admin เพื่อเข้าได้ช่วง maintenance
    try {
      const token = readTokenFromReq(req);
      if (token) {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded?.id) {
          const user = await prisma.user.findUnique({
            where:  { id: decoded.id },
            select: { id: true, role: true },
          });
          if (user?.role === 'admin') {
            req.user = req.user ?? user;
            return next();
          }
        }
      }
    } catch {
      // ignore -> ตอบ 503 ด้านล่าง
    }

    return res.status(503).json({ message: 'ระบบอยู่ระหว่างปรับปรุง กรุณาลองใหม่ภายหลัง' });
  };
};

export default { authenticate, authenticateOptional, requireRole, requireAdmin, maintenanceGate };