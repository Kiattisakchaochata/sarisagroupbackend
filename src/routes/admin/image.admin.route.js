// routes/admin/image.admin.route.js
import express from 'express';
import multer from 'multer';
import { deleteImage, reorderImages, uploadImage } from '../../controllers/image.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorizeRole } from '../../middlewares/role.middleware.js';
import prisma from '../../config/prisma.config.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticate);
router.use(authorizeRole('admin'));

/* NEW: upload image (รองรับ field: file/image/photo) */
router.post(
  '/',
  (req, _res, next) => {
    // รองรับชื่อ field หลายแบบ
    const m = upload.single('file');
    m(req, _res, (err) => {
      if (req.file || err) return next(err);
      // ถ้าไม่มี file ลองชื่ออื่น
      const tryImage = upload.single('image');
      tryImage(req, _res, (err2) => {
        if (req.file || err2) return next(err2);
        const tryPhoto = upload.single('photo');
        tryPhoto(req, _res, next);
      });
    });
  },
  uploadImage
);

/* ----------------- ของเดิมคงไว้ ----------------- */
router.get('/', async (req, res, next) => {
  try {
    const { filter } = req.query;
    const where = filter === 'featured' ? { is_featured_home: true } : {};
    const images = await prisma.image.findMany({
      where,
      orderBy: [{ featured_order: 'asc' }, { created_at: 'desc' }],
      select: {
        id: true,
        image_url: true,
        menu_name: true,
        price: true,
        is_featured_home: true,
        featured_order: true,
        store: { select: { id: true, name: true, slug: true } },
      },
    });
    res.json({ images });
  } catch (err) { next(err); }
});

router.delete('/:id', deleteImage);
router.patch('/reorder/:store_id', reorderImages);

export default router;