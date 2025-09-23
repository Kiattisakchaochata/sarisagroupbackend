// src/controllers/homepage.network.controller.js
import prisma from '../config/prisma.config.js';

const NETWORK_KIND = 'network';

/** ADMIN: อ่านค่าคอนฟิกโลโก้ */
export const getNetworkLogosAdmin = async (_req, res, next) => {
  try {
    const row = await prisma.homeRow.findFirst({
      where: { kind: NETWORK_KIND },
      orderBy: { order_number: 'asc' },
    });

    const cfg = {
      title: row?.title ?? 'ร้านในเครือของเรา',
      store_ids: Array.isArray(row?.store_ids) ? row.store_ids : [],
      contain_ids:
        row?.images && typeof row.images === 'object' && Array.isArray(row.images.containIds)
          ? row.images.containIds
          : [],
    };

    res.json(cfg);
  } catch (err) { next(err); }
};

/** ADMIN: บันทึกคอนฟิกโลโก้ */
export const updateNetworkLogosAdmin = async (req, res, next) => {
  try {
    const { title, store_ids, contain_ids } = req.body;

    const existing = await prisma.homeRow.findFirst({ where: { kind: NETWORK_KIND } });

    const payload = {
      kind: NETWORK_KIND,
      title: title ?? 'ร้านในเครือของเรา',
      visible: true,
      order_number: 0,
      store_ids: Array.isArray(store_ids) ? store_ids : [],
      images: { containIds: Array.isArray(contain_ids) ? contain_ids : [] },
    };

    const row = existing
      ? await prisma.homeRow.update({ where: { id: existing.id }, data: payload })
      : await prisma.homeRow.create({ data: payload });

    res.json({ message: 'saved', row });
  } catch (err) { next(err); }
};

/** PUBLIC: ส่งข้อมูลไปหน้า Homepage (พร้อมโลโก้) */
export const getNetworkLogosPublic = async (_req, res, next) => {
  try {
    const row = await prisma.homeRow.findFirst({
      where: { kind: NETWORK_KIND, visible: true },
      orderBy: { order_number: 'asc' },
    });

    if (!row) {
      return res.json({ title: 'ร้านในเครือของเรา', stores: [] });
    }

    const containIds = row?.images?.containIds ?? [];
    const ids = Array.isArray(row.store_ids) ? row.store_ids : [];

    const stores = ids.length
      ? await prisma.store.findMany({
          where: { id: { in: ids } },
          select: { id: true, name: true, slug: true, logo_url: true, cover_image: true },
        })
      : [];

    const data = stores.map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      // รองรับทั้ง logo_url และ fallback เป็น cover_image
      logo_url: s.logo_url || s.cover_image || null,
      contain: containIds.includes(s.id),
    }));

    res.json({ title: row.title ?? 'ร้านในเครือของเรา', stores: data });
  } catch (err) { next(err); }
};