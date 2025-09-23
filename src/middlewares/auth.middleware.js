// src/middlewares/auth.middleware.js
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.config.js';

const JWT_SECRET  = process.env.JWT_SECRET || 'TopAwards';
const AUTH_COOKIE = process.env.AUTH_COOKIE_NAME || 'token';

// ---- helper: อ่าน token แบบไม่บังคับ (ใช้ใน maintenanceGate) ----
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

/* ===================== AUTH ===================== */
export const authenticate = async (req, res, next) => {
  try {
    const token = readTokenFromReq(req);
    if (!token) {
      return res.status(401).json({ message: 'ไม่ได้รับอนุญาต (ไม่มีโทเค็น)' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded?.id) {
      return res.status(401).json({ message: 'โทเค็นไม่ถูกต้อง' });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
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

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึง' });
  }
  next();
};

// ✅ สะดวกเรียกใช้สั้น ๆ (ให้แน่ใจว่า “export” จริง)
export const requireAdmin = requireRole('admin');

/* ============== Maintenance Gate (ปิดปรับปรุง) ============== */
export const maintenanceGate = (opts = {}) => {
  const allowList = opts.allowList || [];
  return async (req, res, next) => {
    const cfg = await getSiteConfig();
    if (!cfg.maintenance_mode) return next();

    // อนุญาตเส้นทางใน allowList (prefix match)
    const p = req.path || req.url || '';
    if (allowList.some((prefix) => p.startsWith(prefix))) {
      return next();
    }

    // พยายามอ่าน token ถ้ามีเพื่อเช็ค role (ไม่บังคับ)
    try {
      const token = readTokenFromReq(req);
      if (token) {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded?.id) {
          const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: { id: true, role: true },
          });
          if (user?.role === 'admin') {
            req.user = req.user ?? user;
            return next();
          }
        }
      }
    } catch {
      // ignore แล้วไปตอบ 503
    }

    return res
      .status(503)
      .json({ message: 'ระบบอยู่ระหว่างปรับปรุง กรุณาลองใหม่ภายหลัง' });
  };
};

// ✅ เผื่อที่อื่น import แบบ default
export default { authenticate, requireRole, requireAdmin, maintenanceGate };