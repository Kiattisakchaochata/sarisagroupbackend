// backend/src/controllers/homepage.controller.js
import prisma from '../config/prisma.config.js'

/** Public: ใช้หน้าเว็บเรียก */
// ---------- Public: หน้าเว็บเรียก ----------
export const getHomepagePublic = async (_req, res, next) => {
  try {
    const h = await prisma.homepage.findUnique({ where: { id: 'default' } })

    // --- network logos -> storesMini ---
    const row = await prisma.homeRow.findFirst({
      where: { kind: 'network', visible: true },
      orderBy: { order_number: 'asc' },
    })

    let storesMini = []
    if (row && Array.isArray(row.store_ids) && row.store_ids.length) {
      const containIds = row.images?.containIds ?? []
      const stores = await prisma.store.findMany({
        where: { id: { in: row.store_ids } },
        select: { id: true, name: true, slug: true, logo_url: true, cover_image: true },
      })
      storesMini = stores.map((s) => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        logo: s.logo_url || s.cover_image || null,
        contain: containIds.includes(s.id),
      }))
    }

    // 👇 อ่าน subtitle จาก missions JSON เท่านั้น (ไม่ใช้ missions_subtitle แล้ว)
    const missionSub =
      (h?.missions && typeof h.missions === 'object' && !Array.isArray(h.missions) && h.missions.subtitle) || null

    const items = Array.isArray(h?.missions) ? h.missions : (h?.missions?.items ?? [])

    const payload = {
      hero: {
        title: h?.hero_title ?? null,
        subtitle: h?.hero_subtitle ?? null,
        showSearch: false,
      },
      missions: items,                    // array พร้อมใช้งาน
      missionsSubtitle: missionSub,       // ส่งออกให้หน้าเว็บ
      rows: Array.isArray(h?.rows) ? h.rows : [],
      storesMini,
      updatedAt: h?.updated_at?.toISOString?.() ?? new Date().toISOString(),
    }

    res.json(payload)
  } catch (err) {
    next(err)
  }
}

// ---------- Admin: อ่านค่าเดิม ----------
export const getHomepageAdmin = async (_req, res, next) => {
  try {
    const h = await prisma.homepage.findUnique({ where: { id: 'default' } })
    res.json(h ?? {})
  } catch (err) { next(err) }
}

// ---------- Admin: บันทึก ----------
export const updateHomepageAdmin = async (req, res, next) => {
  try {
    const { hero_title, hero_subtitle, missions, missions_subtitle, rows } = req.body

    // รองรับทั้งแบบส่งมาเป็น array หรือ object {subtitle, items}
    let subtitle = typeof missions_subtitle === 'string' ? missions_subtitle : ''
    let items = []

    if (Array.isArray(missions)) {
      items = missions
    } else if (missions && typeof missions === 'object') {
      if (Array.isArray(missions.items)) items = missions.items
      if (!subtitle && typeof missions.subtitle === 'string') subtitle = missions.subtitle
    }

    // ✅ เก็บเป็น JSON เดียวในคอลัมน์ missions
    const missionsJson = { subtitle: subtitle || null, items }

    const updated = await prisma.homepage.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        hero_title: hero_title ?? null,
        hero_subtitle: hero_subtitle ?? null,
        missions: missionsJson,
        rows: rows ?? [],
      },
      update: {
        hero_title: hero_title ?? null,
        hero_subtitle: hero_subtitle ?? null,
        missions: missionsJson,
        rows: rows ?? [],
      },
    })

    res.json({ message: 'บันทึกแล้ว', homepage: updated })
  } catch (err) { next(err) }
}