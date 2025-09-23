// src/routes/admin/video.routes.js
import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = Router();

/** helpers: YouTube */
function getYouTubeId(url = "") {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1);
    if (u.searchParams.get("v")) return u.searchParams.get("v");
    const m = u.pathname.match(/\/(embed|shorts)\/([^/?#]+)/);
    if (m?.[2]) return m[2];
  } catch {}
  return null;
}
function guessThumbFromId(id) {
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}

/** ✅ helpers: TikTok + รวมเป็นตัวตรวจหลัก */
function isValidTiktokUrl(url = "") {
  try {
    const u = new URL(url);
    return u.hostname.includes("tiktok.com") || u.hostname.endsWith(".tiktok.com");
  } catch {
    return false;
  }
}
function isValidYoutubeUrl(url = "") {
  try {
    const u = new URL(url);
    return u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be");
  } catch {
    return false;
  }
}
function isValidVideoUrl(url = "") {
  return isValidYoutubeUrl(url) || isValidTiktokUrl(url);
}

/** แปลงค่า store จาก body ให้ชัดเจน (รองรับ store_id และ storeId, ค่าว่าง = null) */
function parseStoreId(body = {}) {
  const raw = body.store_id ?? body.storeId;
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  const s = String(raw).trim();
  return s === "" ? null : s;
}

/**
 * GET /api/admin/videos
 */
router.get("/", async (req, res) => {
  try {
    const take = Math.min(Number(req.query.take ?? 100), 500);
    const skip = Number(req.query.skip ?? 0);
    const activeOnly = String(req.query.activeOnly ?? "").toLowerCase() === "true";
    const q = String(req.query.q ?? "").trim();

    const where = {
      ...(activeOnly ? { is_active: true } : {}),
      ...(q ? { title: { contains: q } } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.video.findMany({
        where,
        orderBy: [{ order_number: "asc" }, { created_at: "desc" }],
        take: Number.isNaN(take) ? 100 : take,
        skip: Number.isNaN(skip) ? 0 : skip,
        select: {
          id: true,
          title: true,
          youtube_url: true,        // เก็บทั้ง YouTube/TikTok ไว้ที่ฟิลด์นี้เหมือนเดิม
          thumbnail_url: true,
          order_number: true,
          is_active: true,
          start_date: true,
          end_date: true,
          created_at: true,
          updated_at: true,
          store_id: true,
        },
      }),
      prisma.video.count({ where }),
    ]);

    res.json({ videos: items, total, take, skip });
  } catch (e) {
    console.error("GET /admin/videos error:", e);
    res.status(500).json({ message: "internal error" });
  }
});

/**
 * POST /api/admin/videos
 * body: { title, youtube_url (YouTube/TikTok), thumbnail_url?, order_number?, is_active?, start_date?, end_date?, store_id? }
 */
router.post("/", async (req, res) => {
  try {
    const {
      title,
      youtube_url,
      thumbnail_url,
      order_number = 0,
      is_active = true,
      start_date,
      end_date,
    } = req.body ?? {};

    const storeId = parseStoreId(req.body);

    if (!title || !youtube_url) {
      return res.status(400).json({ message: "กรุณาระบุ title และลิงก์วิดีโอ" });
    }

    // ✅ ตรวจทั้ง YouTube และ TikTok
    if (!isValidVideoUrl(String(youtube_url))) {
      return res.status(400).json({ message: "ลิงก์วิดีโอไม่ถูกต้อง (รองรับ YouTube/TikTok)" });
    }

    // เดา thumbnail อัตโนมัติ “เฉพาะ YouTube” ถ้าไม่ได้ส่งมา
    let thumb = thumbnail_url ?? null;
    if (!thumb && isValidYoutubeUrl(String(youtube_url))) {
      const vid = getYouTubeId(String(youtube_url));
      thumb = guessThumbFromId(vid);
    }

    const created = await prisma.video.create({
      data: {
        title: String(title),
        youtube_url: String(youtube_url),          // เก็บ TikTok URL ได้
        thumbnail_url: thumb ?? null,              // TikTok ให้ส่งมาเอง (หรือปล่อยว่าง)
        order_number: Number(order_number) || 0,
        is_active: Boolean(is_active),
        start_date: start_date ? new Date(start_date) : null,
        end_date: end_date ? new Date(end_date) : null,
        store_id: storeId ?? null,
      },
    });

    res.json(created);
  } catch (e) {
    console.error("POST /admin/videos error:", e);
    res.status(500).json({ message: "internal error" });
  }
});

/**
 * PATCH /api/admin/videos/:id
 */
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: "missing id" });

    const data = {};
    const allow = [
      "title",
      "youtube_url",
      "thumbnail_url",
      "order_number",
      "is_active",
      "start_date",
      "end_date",
    ];
    for (const k of allow) {
      if (k in req.body) data[k] = req.body[k];
    }

    // ✅ รองรับ store_id/storeId
    const storeId = parseStoreId(req.body);
    if (storeId !== undefined) data.store_id = storeId;

    // ✅ ถ้าแก้ไข url ใหม่ ให้ validate ทั้งสองค่าย
    if ("youtube_url" in data) {
      const url = String(data.youtube_url || "");
      if (!isValidVideoUrl(url)) {
        return res.status(400).json({ message: "ลิงก์วิดีโอไม่ถูกต้อง (รองรับ YouTube/TikTok)" });
      }
      // ถ้าไม่ส่ง thumbnail ใหม่มา และเป็น YouTube ⇒ เดาให้
      if (!("thumbnail_url" in data) || !data.thumbnail_url) {
        if (isValidYoutubeUrl(url)) {
          const vid = getYouTubeId(url);
          data.thumbnail_url = guessThumbFromId(vid);
        }
      }
    }

    if ("order_number" in data) data.order_number = Number(data.order_number) || 0;
    if ("is_active" in data) data.is_active = Boolean(data.is_active);
    if ("start_date" in data) data.start_date = data.start_date ? new Date(data.start_date) : null;
    if ("end_date" in data) data.end_date = data.end_date ? new Date(data.end_date) : null;

    const updated = await prisma.video.update({
      where: { id },
      data,
    });

    res.json(updated);
  } catch (e) {
    console.error("PATCH /admin/videos/:id error:", e);
    if (e?.code === "P2025") return res.status(404).json({ message: "not found" });
    res.status(500).json({ message: "internal error" });
  }
});

/**
 * ✅ map ร้านแบบเฉพาะทาง (เหมือนเดิม)
 */
router.patch("/:id/store", async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: "missing id" });

    const storeId = parseStoreId(req.body);
    if (storeId === undefined) {
      return res.status(400).json({ message: "missing store_id / storeId in body" });
    }

    const updated = await prisma.video.update({
      where: { id },
      data: { store_id: storeId },
    });

    res.json(updated);
  } catch (e) {
    console.error("PATCH /admin/videos/:id/store error:", e);
    if (e?.code === "P2025") return res.status(404).json({ message: "not found" });
    res.status(500).json({ message: "internal error" });
  }
});

/**
 * DELETE /api/admin/videos/:id
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: "missing id" });

    await prisma.video.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    console.error("DELETE /admin/videos/:id error:", e);
    if (e?.code === "P2025") return res.status(404).json({ message: "not found" });
    res.status(500).json({ message: "internal error" });
  }
});

export default router;