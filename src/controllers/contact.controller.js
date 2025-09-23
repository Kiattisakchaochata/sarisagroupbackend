// src/controllers/contact.controller.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/** ปรับให้ค่าที่ส่งออกไม่มี null */
function serialize(row) {
  if (!row) return null;
  return {
    id: row.id,
    store_name: row.store_name || '',
    phone: row.phone || '',
    email: row.email || '',
    facebook: row.facebook || '',
    messenger: row.messenger || '',
    line: row.line || '',
    address: row.address || '',
    map_iframe: row.map_iframe || '',
    socials: row.socials || {},
    is_active: !!row.is_active,
    order_number: row.order_number ?? 0,
    updated_at: row.updated_at || null,
    created_at: row.created_at || null,
  };
}

/* ----------------- PUBLIC ----------------- */
// GET /api/contacts  → รายการทั้งหมด (ที่ is_active = true โดยปริยายถ้าต้องการฟิลเตอร์ฝั่งหน้าเว็บ)
// LIST (public multi)
export async function listPublicContacts(req, res, next) {
  try {
    const rows = await prisma.siteContact.findMany({
      where: { is_active: true },
      orderBy: [{ order_number: 'asc' }, { created_at: 'asc' }],
    });
    const contacts = (rows || []).map(serialize);
    res.json({ contacts });
  } catch (err) { next(err); }
}

// GET /api/contacts/:id
export async function getPublicContactById(req, res, next) {
  try {
    const row = await prisma.siteContact.findUnique({ where: { id: String(req.params.id) } });
    if (!row) return res.status(404).json({ message: 'Not found' });
    res.json({ contact: serialize(row) });
  } catch (err) { next(err); }
}

// (BACKWARD COMPAT) GET /api/contact → คืน “แถวแรกที่ใช้งานอยู่”
export async function getPublicContactFallback(req, res, next) {
  try {
    const row = await prisma.siteContact.findFirst({
      orderBy: [{ order_number: 'asc' }, { created_at: 'asc' }],
    });
    res.json({ contact: serialize(row) });
  } catch (err) { next(err); }
}

/* ----------------- ADMIN ----------------- */
// GET /api/admin/contacts
export async function listAdminContacts(req, res, next) {
  try {
    const rows = await prisma.siteContact.findMany({
      orderBy: [{ order_number: 'asc' }, { created_at: 'asc' }],
    });
    res.json({ contacts: rows.map(serialize) });
  } catch (err) { next(err); }
}

// POST /api/admin/contacts
export async function createAdminContact(req, res, next) {
  try {
    const data = req.body || {};
    const agg = await prisma.siteContact.aggregate({
      _max: { order_number: true },
    });
    const nextOrder = (agg._max.order_number ?? 0) + 1;

    const created = await prisma.siteContact.create({
      data: {
        store_name: data.store_name || 'ร้านใหม่',
        phone: data.phone || '',
        email: data.email || '',
        facebook: data.facebook || '',
        messenger: data.messenger || '',
        line: data.line || '',
        address: data.address || '',
        map_iframe: data.map_iframe || '',
        socials: data.socials || {},
        is_active: data.is_active ?? true,
        order_number: Number.isFinite(data.order_number) ? data.order_number : nextOrder,
      },
    });

    // ถ้าผู้ใช้ส่ง order_number มาเองแล้วชน เดี๋ยวเราไปสลับใน update ด้านล่างอยู่แล้ว
    res.json({ contact: serialize(created) });
  } catch (err) { next(err); }
}

// PUT /api/admin/contacts/:id
export async function updateAdminContact(req, res, next) {
  try {
    const id = String(req.params.id);
    const data = req.body || {};

    const current = await prisma.siteContact.findUnique({ where: { id } });
    if (!current) return res.status(404).json({ message: 'Not found' });

    let newOrder = data.order_number;
    const touchOrder = Number.isFinite(newOrder);

    if (!touchOrder) {
      // ไม่ยุ่งกับลำดับ แก้ field อื่น ๆ ตามปกติ
      const updated = await prisma.siteContact.update({
        where: { id },
        data: {
          store_name: data.store_name ?? undefined,
          phone: data.phone ?? undefined,
          email: data.email ?? undefined,
          facebook: data.facebook ?? undefined,
          messenger: data.messenger ?? undefined,
          line: data.line ?? undefined,
          address: data.address ?? undefined,
          map_iframe: data.map_iframe ?? undefined,
          socials: data.socials ?? undefined,
          is_active: typeof data.is_active === 'boolean' ? data.is_active : undefined,
        },
      });
      return res.json({ contact: serialize(updated) });
    }

    // มีการแก้ order_number
    newOrder = Math.max(1, Math.floor(newOrder)); // กันค่าประหลาด
    const oldOrder = current.order_number ?? 0;
    if (newOrder === oldOrder) {
      // ไม่ได้เปลี่ยนจริง แก้ field อื่น ๆ
      const updated = await prisma.siteContact.update({
        where: { id },
        data: {
          store_name: data.store_name ?? undefined,
          phone: data.phone ?? undefined,
          email: data.email ?? undefined,
          facebook: data.facebook ?? undefined,
          messenger: data.messenger ?? undefined,
          line: data.line ?? undefined,
          address: data.address ?? undefined,
          map_iframe: data.map_iframe ?? undefined,
          socials: data.socials ?? undefined,
          is_active: typeof data.is_active === 'boolean' ? data.is_active : undefined,
        },
      });
      return res.json({ contact: serialize(updated) });
    }

    const victim = await prisma.siteContact.findFirst({
      where: { order_number: newOrder },
      select: { id: true },
    });

    const [updated, _swap] = await prisma.$transaction([
      // 1) อัปเดตรายการปัจจุบันไปเป็นเลขใหม่
      prisma.siteContact.update({
        where: { id },
        data: {
          store_name: data.store_name ?? undefined,
          phone: data.phone ?? undefined,
          email: data.email ?? undefined,
          facebook: data.facebook ?? undefined,
          messenger: data.messenger ?? undefined,
          line: data.line ?? undefined,
          address: data.address ?? undefined,
          map_iframe: data.map_iframe ?? undefined,
          socials: data.socials ?? undefined,
          is_active: typeof data.is_active === 'boolean' ? data.is_active : undefined,
          order_number: newOrder,
        },
      }),

      // 2) ถ้ามี “เหยื่อ” ที่ถือเลขนั้นอยู่ → สลับให้เป็นเลขเก่าของเรา
      victim
        ? prisma.siteContact.update({
            where: { id: victim.id },
            data: { order_number: oldOrder },
          })
        : prisma.siteContact.findFirst(), // noop เพื่อให้ trx รับอาร์เรย์ครบ
    ]);

    res.json({ contact: serialize(updated) });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/admin/contacts/:id
export async function deleteAdminContact(req, res, next) {
  try {
    const id = String(req.params.id);
    await prisma.siteContact.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) { next(err); }
}

/* ---------- ENDPOINT เดิม (ยังคงไว้เพื่อเข้ากันได้) ---------- */
// PUT /api/admin/contact  → อัปเดต “แถวแรก” (เพื่อเข้ากันกับหน้าเดิม)
export async function upsertSingleContact(req, res, next) {
  try {
    const first = await prisma.siteContact.findFirst({
      orderBy: [{ order_number: 'asc' }, { created_at: 'asc' }],
    });
    if (!first) {
      // ถ้ายังไม่มีเลย ให้สร้างใหม่
      const created = await prisma.siteContact.create({ data: req.body || {} });
      return res.json({ contact: serialize(created) });
    }
    const updated = await prisma.siteContact.update({
      where: { id: first.id },
      data: req.body || {},
    });
    res.json({ contact: serialize(updated) });
  } catch (err) { next(err); }
}
export async function reindexAdminContacts(req, res, next) {
  try {
    const rows = await prisma.siteContact.findMany({
      orderBy: [{ order_number: 'asc' }, { created_at: 'asc' }],
      select: { id: true },
    });
    await prisma.$transaction(
      rows.map((r, i) =>
        prisma.siteContact.update({
          where: { id: r.id },
          data: { order_number: i + 1 },
        })
      )
    );
    res.json({ ok: true, count: rows.length });
  } catch (err) {
    next(err);
  }
}