import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/* ---------------- helpers ---------------- */
function isValidYoutubeUrl(url) {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be');
  } catch { return false; }
}
function isValidTiktokUrl(url) {
  if (!url) return false;
  try {
    const u = new URL(url);
    const h = u.hostname.toLowerCase();
    return h === 'tiktok.com' || h.endsWith('.tiktok.com');
  } catch { return false; }
}
function isValidVideoUrl(url) {
  return isValidYoutubeUrl(url) || isValidTiktokUrl(url);
}

// ดึง thumbnail จาก TikTok oEmbed (ถ้าทำได้)
async function fetchTiktokThumb(videoUrl) {
  try {
    const resp = await fetch(
      'https://www.tiktok.com/oembed?url=' + encodeURIComponent(videoUrl),
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    if (!resp.ok) return null;
    const json = await resp.json();
    // ปกติ key ชื่อ thumbnail_url
    return typeof json?.thumbnail_url === 'string' ? json.thumbnail_url : null;
  } catch {
    return null;
  }
}

// รับได้ทั้ง store_id / storeId
function parseStoreId(body = {}) {
  const raw = body.store_id ?? body.storeId;
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  const s = String(raw).trim();
  return s === '' ? null : s;
}

/* --------------- ADMIN --------------- */
export const adminListVideos = async (req, res, next) => {
  try {
    const q = (req.query.q || '').toString().trim();
    const rows = await prisma.video.findMany({
      where: q
        ? { OR: [{ title: { contains: q } }, { youtube_url: { contains: q } }] }
        : undefined,
      orderBy: [{ order_number: 'asc' }, { created_at: 'desc' }],
    });
    res.json({ videos: rows });
  } catch (err) { next(err); }
};

export const adminCreateVideo = async (req, res, next) => {
  try {
    const {
      title = '',
      youtube_url = '',
      order_number = 0,
      is_active = true,
      start_date,
      end_date,
      thumbnail_url,
    } = req.body || {};

    const storeId = parseStoreId(req.body);

    if (!title.trim()) return res.status(400).json({ message: 'กรุณาใส่ชื่อเรื่อง' });
    if (!isValidVideoUrl(youtube_url))
      return res.status(400).json({ message: 'ลิงก์วิดีโอไม่ถูกต้อง (รองรับ YouTube/TikTok)' });

    // ถ้าเป็น TikTok และไม่ได้ใส่ thumbnail_url ให้ลองดึงจาก oEmbed
    let thumb = thumbnail_url ?? null;
    if (!thumb && isValidTiktokUrl(youtube_url)) {
      thumb = await fetchTiktokThumb(youtube_url);
    }

    const row = await prisma.video.create({
      data: {
        title: title.trim(),
        youtube_url: youtube_url.trim(),
        thumbnail_url: thumb ?? null,
        order_number: Number(order_number) || 0,
        is_active: !!is_active,
        start_date: start_date ? new Date(start_date) : null,
        end_date: end_date ? new Date(end_date) : null,
        store_id: storeId ?? null,
      },
    });

    res.status(201).json({ video: row });
  } catch (err) { next(err); }
};

export const adminUpdateVideo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      title,
      youtube_url,
      order_number,
      is_active,
      start_date,
      end_date,
      thumbnail_url,
    } = req.body || {};

    const payload = {};

    if (title !== undefined) {
      if (!String(title).trim()) return res.status(400).json({ message: 'ชื่อเรื่องห้ามว่าง' });
      payload.title = String(title).trim();
    }

    if (youtube_url !== undefined) {
      if (!isValidVideoUrl(youtube_url))
        return res.status(400).json({ message: 'ลิงก์วิดีโอไม่ถูกต้อง (รองรับ YouTube/TikTok)' });
      payload.youtube_url = String(youtube_url).trim();
    }

    // ถ้าผู้ใช้ส่ง thumbnail_url มากำหนดตามนั้น (อาจตั้งใจล้างเป็น null)
    if (thumbnail_url !== undefined) {
      payload.thumbnail_url = thumbnail_url ?? null;
    } else {
      // ไม่ได้ส่งมา และเป็น TikTok → ลองเดาอัตโนมัติถ้า thumbnail เดิมว่าง
      const newUrl = (youtube_url ?? payload.youtube_url) as string | undefined;
      if (newUrl && isValidTiktokUrl(newUrl)) {
        // เช็คค่าปัจจุบันก่อน
        const current = await prisma.video.findUnique({ where: { id }, select: { thumbnail_url: true } });
        if (!current?.thumbnail_url) {
          const guessed = await fetchTiktokThumb(newUrl);
          if (guessed) payload.thumbnail_url = guessed;
        }
      }
    }

    if (order_number !== undefined) payload.order_number = Number(order_number) || 0;
    if (is_active !== undefined) payload.is_active = !!is_active;
    if (start_date !== undefined) payload.start_date = start_date ? new Date(start_date) : null;
    if (end_date !== undefined) payload.end_date = end_date ? new Date(end_date) : null;

    const storeId = parseStoreId(req.body);
    if (storeId !== undefined) payload.store_id = storeId;

    const row = await prisma.video.update({ where: { id }, data: payload });
    res.json({ video: row });
  } catch (err) { next(err); }
};

/* --------------- PUBLIC --------------- */
export const publicListVideos = async (req, res, next) => {
  try {
    const now = new Date();
    const activeParam = String(req.query.active ?? '1').toLowerCase();
    const filterActive = activeParam === '1' || activeParam === 'true';
    const storeId = (req.query.store_id || req.query.store)
      ? String(req.query.store_id || req.query.store)
      : undefined;

    const where = {
      ...(filterActive
        ? {
            is_active: true,
            OR: [{ start_date: null }, { start_date: { lte: now } }],
            AND: [{ end_date: null }, { end_date: { gte: now } }],
          }
        : {}),
      ...(storeId ? { store_id: storeId } : {}),
    };

    const rows = await prisma.video.findMany({
      where,
      orderBy: [{ order_number: 'asc' }, { created_at: 'desc' }],
    });

    res.json({ videos: rows });
  } catch (err) { next(err); }
};