// controllers/store.controller.js
import prisma from '../config/prisma.config.js';
import cloudinary from '../config/cloudinary.config.js';
import fs from 'fs/promises';
import { normalizeSocialLinks } from '../utils/social-links.util.js';
import { toSlug } from '../utils/slug.util.js';

/* ----------------------------- helpers ----------------------------- */
function toIntOrNull(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function toBoolOrNull(v) {
  if (v === undefined || v === null || v === '') return null;
  const s = String(v).trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(s)) return true;
  if (['false', '0', 'no', 'off'].includes(s)) return false;
  return null;
}
// ✅ สำหรับ field ที่เป็นทศนิยม (เช่น price)
function toNumOrNull(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function nextOrderInCategory(categoryId) {
  const max = await prisma.store.aggregate({
    where: { category_id: categoryId },
    _max: { order_number: true },
  });
  return (max._max.order_number || 0) + 1;
}

function safeNewDate(input) {
  if (!input) return null;
  const d = new Date(input);
  return Number.isNaN(+d) ? null : d;
}

// สร้าง/คืนค่า id ของหมวด default (uncategorized) เมื่อไม่ได้ส่ง category_id มา
async function ensureDefaultCategoryId() {
  let cat = await prisma.category.findUnique({ where: { slug: 'uncategorized' } });
  if (!cat) {
    const max = await prisma.category.aggregate({ _max: { order_number: true } });
    const nextOrder = (max._max.order_number || 0) + 1;
    cat = await prisma.category.create({
      data: { name: 'ไม่ระบุหมวด', slug: 'uncategorized', order_number: nextOrder },
    });
  }
  return cat.id;
}

/* ============================= CREATE ============================== */
export const createStore = async (req, res, next) => {
  try {
    const {
      name,
      description = '',
      address = '',
      phone = null,
      slug,
      meta_title = null,
      meta_description = null,
      category_id,
      social_links = null,
      order_number,
      expired_at,
    } = req.body;

    // ใช้หมวดที่ส่งมา หรือ fallback ไปยัง uncategorized
    const catId = category_id || (await ensureDefaultCategoryId());

    // slug ที่มาจาก body หรือสร้างจาก name
    let safeSlug = toSlug(slug || name);
    if (!safeSlug) safeSlug = `store-${Date.now()}`;

    if (!name || !catId) {
      return res.status(400).json({ message: 'กรุณาระบุชื่อร้าน' });
    }

    // ❶ คำนวณลำดับ
    let desiredOrder = Number(order_number);
    if (!Number.isInteger(desiredOrder) || desiredOrder <= 0) {
      const max = await prisma.store.aggregate({
        where: { category_id: catId },
        _max: { order_number: true },
      });
      desiredOrder = (max._max.order_number || 0) + 1;
    } else {
      const existing = await prisma.store.findFirst({
        where: { category_id: catId, order_number: desiredOrder },
      });
      if (existing) {
        return res
          .status(400)
          .json({ message: `ลำดับที่ ${desiredOrder} มีอยู่แล้วในหมวดหมู่นี้ กรุณาเลือกลำดับใหม่` });
      }
    }

    // ❷ อัปโหลด cover
    let coverImageUrl = null;
    if (req.files?.cover?.length > 0) {
      const coverResult = await cloudinary.uploader.upload(req.files.cover[0].path, {
        folder: 'store-covers',
      });
      coverImageUrl = coverResult.secure_url;
      await fs.unlink(req.files.cover[0].path);
    }

    // ❸ สร้างร้าน
    const store = await prisma.store.create({
      data: {
        name,
        slug: safeSlug, // ← ใช้ safeSlug ที่คำนวณไว้
        description,
        address,
        phone,
        meta_title,
        meta_description,
        social_links: normalizeSocialLinks(social_links),
        category_id: catId,
        order_number: desiredOrder,
        cover_image: coverImageUrl,
        expired_at: expired_at ? new Date(expired_at) : null,
        is_active: true,
        image_fit: (req.body.image_fit === 'contain') ? 'contain' : 'cover',
      },
      select: { id: true },
    });

    // ❹ อัปโหลดรูปเพิ่ม (images[] + orders[])
    let orders = [];
    if (req.body.orders) {
      if (Array.isArray(req.body.orders)) {
        orders = req.body.orders.map((o) => Number(o));
      } else {
        const single = Number(req.body.orders);
        if (!isNaN(single)) orders = [single];
      }
    }

    const uploadedImages = await Promise.all(
      (req.files?.images || []).map(async (file, index) => {
        const result = await cloudinary.uploader.upload(file.path, { folder: 'store-images' });
        await fs.unlink(file.path);
        const order = orders[index] || index + 1;
        return {
          image_url: result.secure_url,
          order_number: order,
          alt_text: `รูปที่ ${order}`,
        };
      })
    );

    if (uploadedImages.length > 0) {
      await prisma.store.update({
        where: { id: store.id },
        data: { images: { create: uploadedImages } },
      });
    }

    // ❺ คืนค่า
    const storeWithImages = await prisma.store.findUnique({
       where: { id: store.id },
      include: { images: true, category: true },
    });

    res.status(201).json({ message: 'สร้างร้านค้าสำเร็จ', store: storeWithImages });
  } catch (err) {
    console.error('🔥 CREATE STORE ERROR:', err);
    next(err);
  }
};

/* ============================ READ (ALL) =========================== */
export const getAllStores = async (_req, res, next) => {
  try {
    const stores = await prisma.store.findMany({
      orderBy: [{ category_id: 'asc' }, { order_number: 'asc' }, { created_at: 'desc' }],
      select: {
        id: true,
        name: true,
        address: true,
        description: true,
        social_links: true,
        category_id: true,
        is_active: true,
        order_number: true,
        created_at: true,
        updated_at: true,
        expired_at: true,
        cover_image: true,
        image_fit: true,
        category: true,
        images: true,
        reviews: true,
        visitorCounter: true,
        renewal_count: true,
      },
    });

    const mapped = stores.map((s) => ({ ...s, renew_count: s.renewal_count }));
    res.json({ stores: mapped });
  } catch (err) {
    next(err);
  }
};

/* ============================ READ (ONE) =========================== */
export const getStoreById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const store = await prisma.store.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        address: true,
        description: true,
        phone: true,
        meta_title: true,
        meta_description: true,
        social_links: true,
        category_id: true,
        order_number: true,
        cover_image: true,
        image_fit: true,
        created_at: true,
        updated_at: true,
        expired_at: true,
        is_active: true,
        category: { select: { id: true, name: true, slug: true } },
        images: {
          orderBy: { order_number: 'asc' },
          select: {
            id: true,
            image_url: true,
            order_number: true,
            alt_text: true,
            is_featured_home: true,
            featured_order: true,
            allow_review: true,
            menu_name: true,
            price: true,
            rating: true,          // ← ใช้ rating
            rating_count: true,
          },
        },
        renewal_count: true,
        visitorCounter: true,
      },
    });

    if (!store) return res.status(404).json({ message: 'ไม่พบร้านค้านี้' });

    const imagesOut = store.images.map(img => ({ ...img, avg_rating: img.rating }));

    res.json({ ...store, images: imagesOut, renew_count: store.renewal_count });
  } catch (err) {
    next(err);
  }
};

/* ============================== UPDATE ============================ */
export const updateStore = async (req, res, next) => {
  try {
    const { id } = req.params;

    const {
      name,
      description,
      address,
      phone,
      slug,
      meta_title,
      meta_description,
      social_links,
      category_id,
      existing_image_orders = [],
      order_number,
      expired_at,
      is_active,
    } = req.body;

    if (category_id) {
      const categoryExists = await prisma.category.findUnique({ where: { id: category_id } });
      if (!categoryExists) return res.status(400).json({ message: 'ไม่พบ category ที่ระบุ' });
    }

    // re-order images (optional)
    const parsedOrders = Array.isArray(existing_image_orders)
      ? existing_image_orders.map((o) => (typeof o === 'string' ? JSON.parse(o) : o))
      : [typeof existing_image_orders === 'string' ? JSON.parse(existing_image_orders) : existing_image_orders];

    if (parsedOrders.filter(Boolean).length > 0) {
      const uniqueOrderNumbers = new Set(parsedOrders.map((o) => `${o.order_number}`));
      if (uniqueOrderNumbers.size !== parsedOrders.length) {
        return res.status(400).json({ message: 'ลำดับรูปภาพซ้ำกัน กรุณาตรวจสอบอีกครั้ง' });
      }
    }

    // cover ใหม่ (ถ้ามี)
    let coverImageUrl = null;
    if (req.files?.cover?.length > 0) {
      const result = await cloudinary.uploader.upload(req.files.cover[0].path, {
        folder: 'store-covers',
      });
      coverImageUrl = result.secure_url;
      await fs.unlink(req.files.cover[0].path);
    }

    // ตรวจ order_number ถ้าส่งมา
    const newOrder = toIntOrNull(order_number);
    if (newOrder !== null) {
      const current = await prisma.store.findUnique({
        where: { id },
        select: { category_id: true, order_number: true },
      });
      const catId = category_id || current?.category_id;
      if (!catId) return res.status(400).json({ message: 'ไม่ทราบหมวดหมู่ของร้าน' });

      const conflict = await prisma.store.findFirst({
        where: { category_id: catId, order_number: newOrder, id: { not: id } },
        select: { id: true },
      });
      if (conflict) {
        return res.status(400).json({ message: `มีร้านในหมวดนี้ใช้ลำดับ ${newOrder} อยู่แล้ว` });
      }
    }

    /* ---------------- keep current order if only category changed ---------------- */
    let __effectiveOrderToApply = null;
    try {
      const currentStore = await prisma.store.findUnique({
        where: { id },
        select: { category_id: true, order_number: true },
      });

      const targetCatId = category_id || currentStore?.category_id;

      if (category_id && newOrder === null) {
        __effectiveOrderToApply = currentStore?.order_number ?? null;
      }

      if (targetCatId && __effectiveOrderToApply !== null) {
        const conflict2 = await prisma.store.findFirst({
          where: {
            category_id: targetCatId,
            order_number: __effectiveOrderToApply,
            id: { not: id },
          },
          select: { id: true },
        });
        if (conflict2) {
          return res
            .status(400)
            .json({ message: `มีร้านในหมวดนี้ใช้ลำดับ ${__effectiveOrderToApply} อยู่แล้ว` });
        }
      }
    } catch {}

    await prisma.$transaction(async (tx) => {
      // 1) shuffle image orders to avoid unique conflicts (best effort)
      if (parsedOrders.filter(Boolean).length > 0) {
        for (const { id: imageId } of parsedOrders) {
          try {
            await tx.image.update({
              where: { id: imageId },
              data: { order_number: -(Math.floor(Math.random() * 10000 + 1)) },
            });
          } catch {}
        }
        for (const { id: imageId, order_number: ord } of parsedOrders) {
          try {
            await tx.image.update({
              where: { id: imageId },
              data: { order_number: Number(ord) },
            });
          } catch {}
        }
      }

      // 2) payload เฉพาะฟิลด์ที่ถูกส่งมาเท่านั้น
      const data = {};
      if (name !== undefined && name !== '') data.name = name;
      if (description !== undefined) data.description = description;
      if (address !== undefined) data.address = address;
      if (phone !== undefined) data.phone = phone;
      if (slug !== undefined && slug !== '') data.slug = toSlug(slug);
      if (meta_title !== undefined) data.meta_title = meta_title;
      if (meta_description !== undefined) data.meta_description = meta_description;
      if (social_links !== undefined) data.social_links = normalizeSocialLinks(social_links);
      if (category_id) data.category_id = category_id;
      if (coverImageUrl) data.cover_image = coverImageUrl;
      if (newOrder !== null) data.order_number = newOrder;
      if (expired_at !== undefined) data.expired_at = expired_at ? new Date(expired_at) : null;
      if (req.body?.image_fit === 'contain' || req.body?.image_fit === 'cover') {
      data.image_fit = req.body.image_fit;
     }
      if (newOrder === null && __effectiveOrderToApply !== null) {
        data.order_number = __effectiveOrderToApply;
      }

      const activeParsed = toBoolOrNull(is_active);
      if (activeParsed !== null) data.is_active = activeParsed;

      if (Object.keys(data).length > 0) {
        await tx.store.update({ where: { id }, data });
      }
    });

    // 3) อัปโหลดรูปใหม่ (ต่อท้าย)
    if (req.files?.images?.length > 0) {
      const maxOrder = await prisma.image.aggregate({
        where: { store_id: id },
        _max: { order_number: true },
      });

      let nextOrder = (maxOrder._max.order_number || 0) + 1;

      const newImages = await Promise.all(
        req.files.images.map(async (file) => {
          const result = await cloudinary.uploader.upload(file.path, { folder: 'store-images' });
          await fs.unlink(file.path);
          return {
            image_url: result.secure_url,
            cloudinary_public_id: result.public_id || null,
            order_number: nextOrder++,
            alt_text: 'ภาพใหม่',
          };
        })
      );

      await prisma.store.update({ where: { id }, data: { images: { create: newImages } } });
    }

    const updatedStore = await prisma.store.findUnique({
      where: { id },
      include: { images: true },
    });

    res.json({ message: 'อัปเดตร้านค้าสำเร็จ', store: updatedStore });
  } catch (err) {
    next(err);
  }
};

/* ============================ STATUS SHORTCUTS ===================== */
export const setStoreStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const desired = toBoolOrNull(req.body?.is_active);
    if (desired === null) {
      return res.status(400).json({ message: 'กรุณาส่ง is_active เป็น true/false' });
    }
    const updated = await prisma.store.update({
      where: { id },
      data: { is_active: desired },
      include: { images: true, category: true },
    });
    return res.json({ message: 'อัปเดตร้านค้าสำเร็จ', store: updated });
  } catch (err) {
    next(err);
  }
};

export const enableStore = async (req, res, next) => {
  try {
    const { id } = req.params;
    const store = await prisma.store.update({
      where: { id },
      data: { is_active: true },
      include: { images: true, category: true },
    });
    return res.json({ message: 'เปิดใช้งานแล้ว', store });
  } catch (err) {
    next(err);
  }
};

export const disableStore = async (req, res, next) => {
  try {
    const { id } = req.params;
    const store = await prisma.store.update({
      where: { id },
      data: { is_active: false },
      include: { images: true, category: true },
    });
    return res.json({ message: 'ปิดใช้งานแล้ว', store });
  } catch (err) {
    next(err);
  }
};

/* ============================== DELETE ============================ */
export const deleteStore = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.store.delete({ where: { id } });
    res.json({ message: 'ลบร้านค้าสำเร็จ' });
  } catch (err) {
    next(err);
  }
};

/* =========================== UPLOAD IMAGES ======================== */
export const uploadImages = async (req, res, next) => {
  try {
    const { id } = req.params;
    const files = req.files;
    if (!files?.length) {
      return res.status(400).json({ message: 'กรุณาอัปโหลดรูปภาพอย่างน้อย 1 รูป' });
    }

    const maxOrder = await prisma.image.aggregate({
      where: { store_id: id },
      _max: { order_number: true },
    });
    let nextOrder = (maxOrder._max.order_number || 0) + 1;

    const images = await Promise.all(
      files.map(async (file) => {
        const result = await cloudinary.uploader.upload(file.path, { folder: 'store-images' });
        await fs.unlink(file.path);
        return {
          image_url: result.secure_url,
          cloudinary_public_id: result.public_id || null,
          order_number: nextOrder++,
          alt_text: 'รูปภาพใหม่',
        };
      })
    );

    const updated = await prisma.store.update({
      where: { id },
      data: { images: { create: images } },
      include: { images: true },
    });

    res.json({ message: 'อัปโหลดรูปภาพสำเร็จ', images: updated.images, store: updated });
  } catch (err) {
    next(err);
  }
};

/* ============================== SEARCH =========================== */
export const searchStore = async (req, res, next) => {
  try {
    const raw = (req.query.q ?? '').toString().trim();
    if (raw.length < 2) return res.json({ stores: [] });

    // คำพ้องความหมายแบบง่าย ๆ
    const SYNO = {
      'ล้างรถ': ['คาร์แคร์', 'car wash', 'carwash', 'car care'],
      'คาร์แคร์': ['ล้างรถ', 'car wash', 'carwash', 'car care'],
      'ขนม': ['ของหวาน', 'เบเกอรี่', 'bakery', 'dessert', 'เค้ก', 'โดนัท', 'คุกกี้'],
      'ของหวาน': ['ขนม', 'เบเกอรี่', 'dessert', 'เค้ก', 'bakery'],
      'กาแฟ': ['คาเฟ่', 'coffee', 'ร้านกาแฟ', 'เบเกอรี่'],
      // เพิ่มได้ตามต้องการ
    };

    // แตกคำตามช่องว่าง + ใส่คำพ้อง
    const baseTerms = raw.split(/\s+/).filter(Boolean);
    const expanded = new Set(baseTerms);
    for (const term of baseTerms) {
      (SYNO[term] || []).forEach((s) => expanded.add(s));
    }
    // เผื่อคนพิมพ์คำเดี่ยว ๆ
    (SYNO[raw] || []).forEach((s) => expanded.add(s));

    const terms = Array.from(expanded);

    // สร้าง where.OR จากทุก term กับทุกฟิลด์ที่สนใจ
    const OR = [];
    for (const t of terms) {
      OR.push(
        { name:        { contains: t } },
        { description: { contains: t } },
        { category: { is: { name: { contains: t } } } },
        { images: { some: { menu_name: { contains: t } } } },
        { images: { some: { alt_text:  { contains: t } } } },
      );
    }

    const stores = await prisma.store.findMany({
      where: { is_active: true, OR },
      include: { category: true, images: true, reviews: true },
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    res.json({ stores });
  } catch (err) {
    console.error('searchStore error:', err);
    next(err);
  }
};

/* ============================ DELETE IMAGE ======================== */
export const deleteStoreImage = async (req, res, next) => {
  try {
    const { imageId } = req.params;
    const image = await prisma.image.findUnique({ where: { id: imageId } });
    if (!image) return res.status(404).json({ message: 'ไม่พบรูปภาพที่ต้องการลบ' });

    try {
      const urlParts = image.image_url.split('/');
      const publicId = urlParts.slice(-2).join('/').replace(/\.[^/.]+$/, '');
      await cloudinary.uploader.destroy(publicId);
    } catch {}

    await prisma.image.delete({ where: { id: imageId } });
    res.json({ message: 'ลบรูปภาพสำเร็จ' });
  } catch (err) {
    next(err);
  }
};

/* ======================== UPDATE IMAGE META (SAFE) ================ */
export const updateImageMeta = async (req, res, next) => {
  try {
    const { imageId } = req.params;
    const { menu_name, price, alt_text, is_featured_home, featured_order, allow_review } = req.body;

    // ตรวจว่ารูปมีอยู่จริงก่อน (กัน Prisma 500 เวลา id ไม่พบ)
    const exists = await prisma.image.findUnique({ where: { id: imageId }, select: { id: true } });
    if (!exists) return res.status(404).json({ message: 'ไม่พบบันทึกรูปภาพที่ต้องการอัปเดต' });

    const data = {};

    // string fields
    if (menu_name !== undefined) data.menu_name = menu_name === '' ? null : menu_name;
    if (alt_text !== undefined) data.alt_text = alt_text === '' ? null : alt_text;

    // number fields — ไม่ยัด null ถ้า parse ไม่ได้ (กัน schema ที่ไม่เป็น nullable)
    if (price !== undefined) {
  const n = Number(price);
  data.price = Number.isFinite(n) && n > 0 ? n : null;
}
    if (featured_order !== undefined) {
      const n = Number(featured_order);
      if (Number.isFinite(n)) data.featured_order = n;
    }

    // boolean flags
    if (is_featured_home !== undefined) {
      const s = String(is_featured_home).toLowerCase();
      data.is_featured_home = ['1', 'true', 'yes', 'on'].includes(s);
    }
    if (allow_review !== undefined) {
      const s = String(allow_review).toLowerCase();
      data.allow_review = ['1', 'true', 'yes', 'on'].includes(s);
    }

    if (Object.keys(data).length === 0) {
      return res.json({ message: 'ไม่มีฟิลด์ที่จะอัปเดต', image: exists });
    }

    const updated = await prisma.image.update({ where: { id: imageId }, data });
    return res.json({ message: 'อัปเดตข้อมูลรูปเรียบร้อย', image: updated });
  } catch (err) {
    console.error('🔥 updateImageMeta error:', err);
    next(err);
  }
};

/* ======================== BULK UPDATE IMAGE META ================== */
// PATCH /api/admin/stores/images/bulk
// body รองรับทั้ง { images: [...] } และ { items: [...] }
export const bulkUpdateStoreImages = async (req, res, next) => {
  try {
    const { images, items } = req.body || {};
    const payload = Array.isArray(images) ? images : Array.isArray(items) ? items : null;

    if (!payload) {
      return res.status(400).json({ message: 'กรุณาส่ง images[] หรือ items[]' });
    }

    const results = [];
    const errors = [];

    for (const img of payload) {
      try {
        if (!img?.id) {
          errors.push({ id: null, message: 'missing image id' });
          continue;
        }

        const data = {};

        if (img.menu_name !== undefined) data.menu_name = img.menu_name || null;
        if (img.alt_text !== undefined) data.alt_text = img.alt_text || null;

        // number fields
        if (img.price !== undefined) {
  const n = Number(img.price);
  data.price = Number.isFinite(n) && n > 0 ? n : null;
}
        if (img.featured_order !== undefined) {
          const n = Number(img.featured_order);
          data.featured_order = Number.isFinite(n) ? n : null;
        }

        // boolean flags
        if (img.is_featured_home !== undefined) {
          const s = String(img.is_featured_home).toLowerCase();
          data.is_featured_home = ['1', 'true', 'yes', 'on'].includes(s);
        }
        if (img.allow_review !== undefined) {
          const s = String(img.allow_review).toLowerCase();
          data.allow_review = ['1', 'true', 'yes', 'on'].includes(s);
        }

        const updated = await prisma.image.update({ where: { id: img.id }, data });
        results.push(updated);
      } catch (e) {
        // กันแตกทั้งก้อน แต่เก็บ error รายแถวไว้
        console.error('🔥 bulkUpdateStoreImages item error:', img?.id, e);
        errors.push({ id: img?.id, message: e?.message || 'update failed' });
      }
    }

    return res.json({
      message: 'อัปเดตข้อมูลรูป (bulk) เสร็จ',
      updated_count: results.length,
      errors,
      images: results,
    });
  } catch (err) {
    next(err);
  }
};

// controllers/store.controller.js

export const getHomeFeaturedStores = async (_req, res, next) => {
  try {
    const stores = await prisma.store.findMany({
      where: { images: { some: { is_featured_home: true } } },
      orderBy: { order_number: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        meta_description: true,
        order_number: true,
        images: {
          where: { is_featured_home: true },
          orderBy: { featured_order: 'asc' },
          take: 10,
          select: {
            id: true,
            image_url: true,
            alt_text: true,
            menu_name: true,
            price: true,
            rating: true,           // ← ใช้ rating
            rating_count: true,
            featured_order: true,
          },
        },
      },
    });

    const groups = stores.map((s) => ({
      store_id: s.id,
      store_slug: s.slug,
      store_name: s.name,
      store_order: s.order_number ?? 999999,
      items: s.images.map((img) => ({
        image_id: img.id,
        image_url: img.image_url,
        alt: img.alt_text ?? null,
        menu_name: img.menu_name ?? null,
        price: img.price ?? null,
        rating: img.rating ?? 0,           // คงชื่อ rating
        avg_rating: img.rating ?? 0,       // ใส่ให้ FE ที่เรียก avg_rating ใช้ได้
        rating_count: img.rating_count ?? 0,
        featured_order: img.featured_order ?? null,
      })),
    }));

    const items = groups.flatMap((g) =>
      g.items.map((it) => ({
        ...it,
        store_id: g.store_id,
        store_slug: g.store_slug,
        store_name: g.store_name,
        store_desc: stores.find((s) => s.id === g.store_id)?.meta_description ?? null,
      }))
    );

    return res.json({ groups, items });
  } catch (err) {
    next(err);
  }
};
/* ========================= UPDATE STORE ORDER ===================== */
export const updateStoreOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { category_id, order_number } = req.body;

    if (!category_id || order_number === undefined || order_number === null) {
      return res.status(400).json({ message: 'กรุณาระบุ category_id และ order_number' });
    }

    const store = await prisma.store.findUnique({ where: { id } });
    if (!store) return res.status(404).json({ message: 'ไม่พบร้านค้านี้' });

    const newOrder = Number(order_number);
    const targetStore = await prisma.store.findFirst({
      where: { category_id, order_number: newOrder, id: { not: id } },
    });

    await prisma.$transaction(async (tx) => {
      if (targetStore) {
        await tx.store.update({ where: { id: targetStore.id }, data: { order_number: -1 } });
      }

      await tx.store.update({ where: { id }, data: { order_number: newOrder } });

      if (targetStore) {
        await tx.store.update({
          where: { id: targetStore.id },
          data: { order_number: store.order_number },
        });
      }
    });

    res.json({ message: 'สลับลำดับร้านเรียบร้อยแล้ว' });
  } catch (err) {
    console.error('🔥 updateStoreOrder error:', err);
    if (err.code === 'P2002') {
      return res
        .status(400)
        .json({ message: 'มีร้านค้าในหมวดหมู่นี้ใช้ลำดับนี้อยู่แล้ว กรุณาเลือกลำดับใหม่' });
    }
    next(err);
  }
};

/* ======================= RENEW ===================== */
export const renewStore = async (req, res, next) => {
  try {
    const { id } = req.params;

    const monthsRaw = req.body?.months;
    const months = Number(monthsRaw);
    if (!id) return res.status(400).json({ message: 'Missing store id' });
    if (!Number.isFinite(months) || months <= 0) {
      return res.status(400).json({ message: 'months must be a positive number' });
    }

    const store = await prisma.store.findUnique({ where: { id } });
    if (!store) return res.status(404).json({ message: 'ไม่พบร้านค้านี้' });

    const now = new Date();
    const exp = safeNewDate(store.expired_at);
    const base = exp && exp > now ? exp : now;

    let nextExpire = new Date(base);
    if (months >= 600) {
      nextExpire.setFullYear(nextExpire.getFullYear() + 100); // lifetime
    } else {
      nextExpire.setMonth(nextExpire.getMonth() + months);
    }

    const updated = await prisma.store.update({
      where: { id },
      data: {
        expired_at: nextExpire,
        is_active: true,
        renewal_count: { increment: 1 },
      },
      select: {
        id: true,
        name: true,
        expired_at: true,
        is_active: true,
        renewal_count: true,
      },
    });

    return res.json({
      message: 'ต่ออายุสำเร็จ',
      store: { ...updated, renew_count: updated.renewal_count },
    });
  } catch (err) {
    console.error('🔥 RENEW STORE ERROR:', err);
    next(err);
  }
};

/* ======================= REPORTS / STATS ===================== */
export const getPopularStores = async (_req, res, next) => {
  try {
    const stores = await prisma.store.findMany({
      include: { category: true, images: true, reviews: true },
    });

    const withAvgRating = stores
      .map((store) => {
        const total = store.reviews.length;
        const avg = total > 0 ? store.reviews.reduce((s, r) => s + r.rating, 0) / total : 0;
        return { ...store, avg_rating: avg };
      })
      .filter((s) => s.avg_rating >= 4.0)
      .sort((a, b) => b.avg_rating - a.avg_rating);

    res.json({ stores: withAvgRating });
  } catch (err) {
    next(err);
  }
};

export const updateStoreCover = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: 'กรุณาอัปโหลดรูปภาพหน้าปกใหม่' });
    }

    const result = await cloudinary.uploader.upload(req.file.path, { folder: 'store-covers' });
    await fs.unlink(req.file.path);

    const updated = await prisma.store.update({
      where: { id },
      data: { cover_image: result.secure_url },
    });

    res.json({ message: 'อัปเดตรูปภาพหน้าปกเรียบร้อย', store: updated });
  } catch (err) {
    console.error('🔥 updateStoreCover error:', err);
    next(err);
  }
};

export const getExpiringSoonStores = async (_req, res, next) => {
  try {
    const now = new Date();
    const next30Days = new Date();
    next30Days.setDate(now.getDate() + 30);

    const expiringStores = await prisma.store.findMany({
      where: { expired_at: { gte: now, lte: next30Days }, is_active: true },
      select: {
        id: true,
        name: true,
        expired_at: true,
        category: { select: { name: true } },
      },
    });

    res.json({ stores: expiringStores });
  } catch (err) {
    next(err);
  }
};

export const reactivateStore = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { new_expired_at } = req.body;

    if (!new_expired_at) {
      return res.status(400).json({ message: 'กรุณาระบุวันหมดอายุใหม่' });
    }

    const store = await prisma.store.findUnique({ where: { id } });
    if (!store) return res.status(404).json({ message: 'ไม่พบร้านค้านี้' });

    const updated = await prisma.store.update({
      where: { id },
      data: {
        is_active: true,
        expired_at: new Date(new_expired_at),
        renewal_count: { increment: 1 },
      },
      select: {
        id: true,
        name: true,
        expired_at: true,
        is_active: true,
        renewal_count: true,
      },
    });

    res.json({
      message: 'เปิดใช้งานร้านอีกครั้งเรียบร้อย',
      store: { ...updated, renew_count: updated.renewal_count },
    });
  } catch (err) {
    next(err);
  }
};

export const getExpiredStores = async (req, res, next) => {
  try {
    const now = new Date();
    const onlyInactive = String(req.query.onlyInactive || '').toLowerCase() === 'true';

    const where = onlyInactive
      ? { expired_at: { lte: now }, is_active: false }
      : { expired_at: { lte: now } };

    const expiredStores = await prisma.store.findMany({
      where,
      select: {
        id: true,
        name: true,
        expired_at: true,
        category: { select: { name: true } },
        renewal_count: true,
      },
    });

    res.json({
      stores: expiredStores.map((s) => ({ ...s, renew_count: s.renewal_count })),
    });
  } catch (err) {
    next(err);
  }
};

export const getStoreLoyaltyStats = async (_req, res, next) => {
  try {
    const stores = await prisma.store.findMany({
      select: { id: true, name: true, created_at: true, renewal_count: true },
    });

    const now = new Date();
    const data = stores.map((store) => {
      const diffYears = (now - store.created_at) / (1000 * 60 * 60 * 24 * 365.25);
      return {
        id: store.id,
        name: store.name,
        created_at: store.created_at,
        renew_count: store.renewal_count,
        years_with_us: parseFloat(diffYears.toFixed(1)),
      };
    });

    res.json({ stores: data });
  } catch (err) {
    next(err);
  }
};
// controllers/store.controller.js
export const getFeaturedByStore = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { limit } = req.query;
    const take = limit === 'all' ? undefined : Number(limit) || undefined;

    const store = await prisma.store.findUnique({
      where: { id },
      select: { id: true, name: true, slug: true },
    });
    if (!store) return res.status(404).json({ message: 'ไม่พบร้านค้านี้' });

    const images = await prisma.image.findMany({
      where: { store_id: id, is_featured_home: true },
      orderBy: [{ featured_order: 'asc' }, { created_at: 'desc' }],
      ...(take ? { take } : {}),
      select: {
        id: true,
        image_url: true,
        alt_text: true,
        menu_name: true,
        price: true,
        allow_review: true,
        rating: true,          // ← ใช้ rating
        rating_count: true,
        featured_order: true,
      },
    });

    // ✅ ใส่ avg_rating ให้ FE ใช้ต่อได้
    const imagesOut = images.map(img => ({ ...img, avg_rating: img.rating }));

    res.json({ store, images: imagesOut });
  } catch (err) {
    next(err);
  }
};
export const getStoreBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const store = await prisma.store.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        address: true,
        description: true,
        phone: true,
        meta_title: true,
        meta_description: true,
        image_fit: true,
        category: { select: { id: true, name: true, slug: true } },
        images: {
          orderBy: { order_number: 'asc' },
          select: {
            id: true,
            image_url: true,
            order_number: true,
            alt_text: true,
            is_featured_home: true,
            featured_order: true,
            allow_review: true,
            menu_name: true,
            price: true,
            rating: true,         // ← ใช้ rating
            rating_count: true,
          },
        },
      },
    });
    if (!store) return res.status(404).json({ message: 'ไม่พบร้านค้านี้' });

    const imagesOut = store.images.map(img => ({ ...img, avg_rating: img.rating }));

    res.json({ ...store, images: imagesOut });
  } catch (err) {
    next(err);
  }
};