// src/app.js
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import reviewRoutes from './routes/review.route.js';
import authRoute from './routes/auth.route.js';
import storeAdminRoute from './routes/admin/store.admin.route.js';
import categoryAdminRoute from './routes/admin/category.admin.route.js';
import userAdminRoute from './routes/admin/user.admin.route.js';
import publicStoreRoutes from './routes/public/store.public.route.js';
import publicCategoryRoutes from './routes/public/category.public.route.js';
import imageAdminRoute from './routes/admin/image.admin.route.js';
import visitorRoutes from './routes/visitor.routes.js';
import { startCronJobs } from './cron.js';

import seoAdminRoutes from './routes/admin/seo.routes.js';
import adminBrandRoutes from './routes/admin/brand.admin.routes.js';
import publicBrandRoutes from './routes/public/brand.public.routes.js';

import bannerRoute from './routes/admin/banner.routes.js';
import publicBannerRoute from './routes/public/banner.public.routes.js';
import videoAdminRoute from './routes/admin/video.routes.js';
import searchPublicRoute from './routes/public/search.public.routes.js';

// ⬇⬇⬇ public videos route
import publicVideoRoutes from './routes/public/video.public.route.js';
import homepagePublicRouter from './routes/public/homepage.route.js';
import adminHomepageRouter from './routes/admin/homepage.admin.route.js';
import homepageNetworkPublicRouter from './routes/public/homepage.network.route.js';
import adminHomepageNetworkRouter from './routes/admin/homepage.network.route.js';
import adminStatsRoute from './routes/admin/stats.route.js';
import adminEventRoute from './routes/admin/event.routes.js';
import publicEventRoute from './routes/public/event.public.routes.js';
import adminFooterRoute from './routes/admin/footer.routes.js';
import publicFooterRoute from './routes/public/footer.public.routes.js';
import adminRouter from './routes/admin/admin.routes.js';
import adminTrackingRoutes from './routes/admin/tracking.admin.routes.js';
import publicTrackingRoutes from './routes/public/tracking.public.routes.js';
import publicContactRoutes from './routes/public/contact.routes.js';
import adminContactRoutes from './routes/admin/contact.routes.js';
import publicSeoRoutes from './routes/public/seo.public.route.js';

// ✅ NEW: เส้นทางให้ดาวรูป (image ratings)
import imageRatingRoutes from './routes/image-rating.route.js';

// ✅ NEW: นำ middleware เข้ามาใช้งาน (ต้อง import requireAdmin ด้วย)
import { authenticate, requireAdmin } from './middlewares/auth.middleware.js';

// ✅ NEW: middleware สำหรับ SEO ที่ยอมรับ Service Token
import { authSeoAdmin } from './middlewares/authSeoAdmin.js';

const app = express();

/** -------------- CORS (ปรับเฉพาะส่วนนี้) -------------- */
const ENV_ORIGINS = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const STATIC_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
];

const ALLOWED_ORIGINS = [...STATIC_ORIGINS, ...ENV_ORIGINS];

app.set('trust proxy', 1);

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);

    const alt =
      origin === 'https://sarisagroup.com'
        ? 'https://www.sarisagroup.com'
        : origin === 'https://www.sarisagroup.com'
        ? 'https://sarisagroup.com'
        : null;

    if (alt && ALLOWED_ORIGINS.includes(alt)) return callback(null, true);
    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
/** -------------- จบส่วนที่ปรับ -------------- */

app.use(cookieParser());

// ✅ เพิ่ม limit body text/json 128kb
app.use(express.json({ limit: '128kb' }));
app.use(express.urlencoded({ extended: true, limit: '128kb' }));

// ✅ Health
app.get('/api/health', (_req, res) => res.json({ ok: true }));

/* ---------------- SEO admin routes (ALLOW: Service Token or JWT admin) ---------------- */
// ❗ เมานต์ “ก่อน” guard รวม /api/admin
app.use('/api/admin/seo', authSeoAdmin, seoAdminRoutes);

/* ---------------- Admin guard (ต้องมาก่อนเมานต์ /api/admin/* อื่น ๆ) ---------------- */
app.use('/api/admin', authenticate, requireAdmin);

/* ---------------- Admin routes (ถูกป้องกันทั้งหมดด้วย guard ด้านบน) ---------------- */
app.use('/api/admin/banners', bannerRoute);
app.use('/api/admin/stores', storeAdminRoute);
app.use('/api/admin/categories', categoryAdminRoute);
app.use('/api/admin/users', userAdminRoute);
app.use('/api/admin/images', imageAdminRoute);
app.use('/api/admin/homepage', adminHomepageRouter);
app.use('/api/admin/homepage', adminHomepageNetworkRouter);
app.use('/api/admin/stats', adminStatsRoute);
app.use('/api/admin/events', adminEventRoute);
app.use('/api/admin/footer', adminFooterRoute);
app.use('/api/admin/tracking', adminTrackingRoutes);
app.use('/api/admin/videos', videoAdminRoute);
app.use('/api/admin/brand', adminBrandRoutes);

// อื่นๆ ภายใต้ /api/admin (ตรวจให้แน่ใจว่าไม่มี route /seo ซ้ำในไฟล์นี้)
app.use('/api/admin', adminContactRoutes);
app.use('/api/admin', adminRouter);

/* ---------------- Public routes ---------------- */
app.use('/api/auth', authRoute);
app.use('/api/reviews', reviewRoutes);
app.use('/api/banners', publicBannerRoute);
app.use('/api/stores', publicStoreRoutes);
app.use('/api/categories', publicCategoryRoutes);
app.use('/api/visitor', visitorRoutes);
app.use('/api/videos', publicVideoRoutes);
app.use('/api/search', searchPublicRoute);
app.use('/api', homepagePublicRouter);
app.use('/api', homepageNetworkPublicRouter);
app.use('/api/events', publicEventRoute);
app.use('/api/footer', publicFooterRoute);
app.use('/api', publicTrackingRoutes);
app.use('/api', publicContactRoutes);
app.use('/api', publicBrandRoutes);
app.use('/api/public/seo', publicSeoRoutes);

// Ratings
app.use('/api/ratings', imageRatingRoutes);

// Cron
startCronJobs();

export default app;