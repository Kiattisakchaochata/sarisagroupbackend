// controllers/brand.controller.js
import prisma from '../config/prisma.config.js';
import cloudinary from '../config/cloudinary.config.js';

/** map ออกเป็นรูปแบบ response ที่ FE ใช้ง่าย */
function toResponse(row) {
  return {
    id: row?.id || 'singleton',
    brandName: row?.brandName || 'ครัวคุณจี๊ด',
    themeColor: row?.themeColor || null,
    manifestUrl: row?.manifestUrl || null,

    // favicon & apple icons
    icon16: row?.icon16 || null,
    icon32: row?.icon32 || null,
    apple57: row?.apple57 || null,
    apple60: row?.apple60 || null,
    apple72: row?.apple72 || null,
    apple76: row?.apple76 || null,
    apple114: row?.apple114 || null,
    apple120: row?.apple120 || null,
    apple144: row?.apple144 || null,
    apple152: row?.apple152 || null,
    apple180: row?.apple180 || null,

    // OG default
    ogDefault: row?.ogDefault || null,

    createdAt: row?.createdAt || null,
    updatedAt: row?.updatedAt || null,
  };
}

/** GET /api/admin/brand  (singleton) */
export async function getAdminBrand(_req, res, next) {
  try {
    const row = await prisma.siteBrand.findUnique({ where: { id: 'singleton' } });
    return res.json({ item: toResponse(row) });
  } catch (err) {
    next(err);
  }
}

/** POST /api/admin/brand  (upsert singleton)
 * body: ฟิลด์ตาม SiteBrand ของคุณ (brandName, themeColor, icon16.., ogDefault ฯลฯ)
 */
export async function upsertAdminBrand(req, res, next) {
  try {
    // รับมาเท่าที่สคีมารองรับ
    const data = {
      brandName:  req.body.brandName  ?? undefined,
      themeColor: req.body.themeColor ?? undefined,
      manifestUrl:req.body.manifestUrl?? undefined,

      icon16:  req.body.icon16  ?? undefined,
      icon32:  req.body.icon32  ?? undefined,
      apple57: req.body.apple57 ?? undefined,
      apple60: req.body.apple60 ?? undefined,
      apple72: req.body.apple72 ?? undefined,
      apple76: req.body.apple76 ?? undefined,
      apple114:req.body.apple114?? undefined,
      apple120:req.body.apple120?? undefined,
      apple144:req.body.apple144?? undefined,
      apple152:req.body.apple152?? undefined,
      apple180:req.body.apple180?? undefined,

      ogDefault: req.body.ogDefault ?? undefined,
    };

    // ลบ undefined ทิ้ง เพื่อไม่ทับค่าด้วย undefined
    const clean = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));

    const saved = await prisma.siteBrand.upsert({
      where: { id: 'singleton' },
      update: clean,
      create: { id: 'singleton', ...clean },
    });

    return res.json({ item: toResponse(saved) });
  } catch (err) {
    next(err);
  }
}

/** POST /api/admin/brand/upload
 * form-data: file=<binary>, optional: folder, public_id
 * อัปโหลดรูปขึ้น Cloudinary แล้วคืน URL ให้ไปกรอกในฟอร์ม
 */
export async function uploadBrandAsset(req, res, next) {
  try {
    const f = req.file;
    if (!f) return res.status(400).json({ message: 'กรุณาแนบไฟล์ (file)' });

    const folder = String(req.body.folder || req.query.folder || 'branding');
    const publicId = (req.body.public_id || req.query.public_id || '') + '';

    const opts = {
      folder,
      resource_type: 'image',
      overwrite: !!publicId,
      public_id: publicId || undefined,
    };

    const uploaded = await cloudinary.uploader.upload(f.path, opts);

    return res.json({
      ok: true,
      url: uploaded.secure_url,
      public_id: uploaded.public_id,
      width: uploaded.width,
      height: uploaded.height,
      format: uploaded.format,
      bytes: uploaded.bytes,
      folder,
    });
  } catch (e) {
    next(e);
  }
}
export async function getPublicBrand(_req, res, next) {
  try {
    const row = await prisma.siteBrand.findUnique({ where: { id: 'singleton' } });
    // ส่งเฉพาะฟิลด์ที่ใช้โชว์ฝั่งหน้าเว็บ
    return res.json({
      item: {
        brandName:  row?.brandName  || 'ครัวคุณจี๊ด',
        themeColor: row?.themeColor || null,
        manifestUrl:row?.manifestUrl|| null,

        icon16:  row?.icon16  || null,
        icon32:  row?.icon32  || null,
        apple57: row?.apple57 || null,
        apple60: row?.apple60 || null,
        apple72: row?.apple72 || null,
        apple76: row?.apple76 || null,
        apple114:row?.apple114|| null,
        apple120:row?.apple120|| null,
        apple144:row?.apple144|| null,
        apple152:row?.apple152|| null,
        apple180:row?.apple180|| null,

        ogDefault: row?.ogDefault || null,
        updatedAt: row?.updatedAt || null,
      }
    });
  } catch (err) {
    next(err);
  }
}