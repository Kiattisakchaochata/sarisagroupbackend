import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/* helpers */
const asBool = (v, def=false) => {
  if (v === undefined || v === null) return def;
  const s = String(v).trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes';
};
const asInt = (v, def=0) => Number.isFinite(Number(v)) ? Number(v) : def;
const parseStoreId = (body={}) => {
  const raw = body.store_id ?? body.storeId;
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  const s = String(raw).trim();
  return s === '' ? null : s;
};
const toDateOrNull = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

/* ---------- PUBLIC: GET /api/events ---------- */
export async function publicListEvents(req, res) {
  try {
    const take = Math.min(asInt(req.query.take, 12), 100);
    const skip = asInt(req.query.skip, 0);
    const activeOnly = asBool(req.query.active, true);
    const storeId = req.query.store_id ? String(req.query.store_id) : undefined;
    const now = new Date();

    const where = {
      ...(storeId ? { store_id: storeId } : {}),
      ...(activeOnly ? { is_active: true, OR: [{ end_at: null }, { end_at: { gte: now } }] } : {}),
    };

    const rows = await prisma.event.findMany({
      where,
      orderBy: [{ start_at: 'asc' }, { created_at: 'desc' }],
      take, skip,
      select: {
        id: true, title: true, description: true, start_at: true, end_at: true, cover_image: true,
        store: { select: { name: true, slug: true } },
      },
    });

    res.json({
      events: rows.map(e => ({
        id: e.id,
        title: e.title,
        cover_image: e.cover_image || '',
        date: e.start_at ? e.start_at.toISOString() : null,
        location: e.store?.name ?? null,
        store_slug: e.store?.slug ?? null,
      })),
      take, skip,
    });
  } catch (err) {
    console.error('publicListEvents error:', err);
    res.status(500).json({ message: 'internal error' });
  }
}

/* ---------- ADMIN CRUD ---------- */
export async function adminListEvents(req, res) {
  try {
    const take = Math.min(asInt(req.query.take, 50), 500);
    const skip = asInt(req.query.skip, 0);
    const q = (req.query.q ?? '').toString().trim();
    const activeOnly = asBool(req.query.activeOnly, false);

    const where = {
      ...(q ? { OR: [{ title: { contains: q } }, { description: { contains: q } }] } : {}),
      ...(activeOnly ? { is_active: true } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.event.findMany({ where, orderBy: [{ start_at: 'asc' }, { created_at: 'desc' }], take, skip }),
      prisma.event.count({ where }),
    ]);

    res.json({ events: items, total, take, skip });
  } catch (err) {
    console.error('adminListEvents error:', err);
    res.status(500).json({ message: 'internal error' });
  }
}

export async function adminCreateEvent(req, res) {
  try {
    const { title, description = '', cover_image = null, start_at, end_at, is_active = true } = req.body ?? {};
    if (!String(title || '').trim()) return res.status(400).json({ message: 'กรุณาระบุชื่อกิจกรรม (title)' });
    const start = toDateOrNull(start_at);
    if (!start) return res.status(400).json({ message: 'start_at ไม่ถูกต้อง' });
    const end = toDateOrNull(end_at);
    const storeId = parseStoreId(req.body);

    const created = await prisma.event.create({
      data: {
        title: String(title).trim(),
        description: String(description || ''),
        cover_image: cover_image || null,
        start_at: start,
        end_at: end,
        is_active: !!is_active,
        store_id: storeId ?? String(req.body.store_id || ''),
      },
    });
    res.status(201).json({ event: created });
  } catch (err) {
    console.error('adminCreateEvent error:', err);
    res.status(500).json({ message: 'internal error' });
  }
}

export async function adminUpdateEvent(req, res) {
  try {
    const { id } = req.params;
    const data = {};
    for (const k of ['title','description','cover_image','is_active','start_at','end_at']) {
      if (k in req.body) data[k] = req.body[k];
    }
    if ('title' in data && !String(data.title || '').trim()) {
      return res.status(400).json({ message: 'title ห้ามว่าง' });
    }
    if ('start_at' in data) data.start_at = toDateOrNull(data.start_at);
    if ('end_at' in data) data.end_at = toDateOrNull(data.end_at);
    if ('is_active' in data) data.is_active = !!data.is_active;

    const storeId = parseStoreId(req.body);
    if (storeId !== undefined) data.store_id = storeId;

    const updated = await prisma.event.update({ where: { id }, data });
    res.json({ event: updated });
  } catch (err) {
    console.error('adminUpdateEvent error:', err);
    if (err?.code === 'P2025') return res.status(404).json({ message: 'not found' });
    res.status(500).json({ message: 'internal error' });
  }
}

export async function adminDeleteEvent(req, res) {
  try {
    const { id } = req.params;
    await prisma.event.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    console.error('adminDeleteEvent error:', err);
    if (err?.code === 'P2025') return res.status(404).json({ message: 'not found' });
    res.status(500).json({ message: 'internal error' });
  }
}