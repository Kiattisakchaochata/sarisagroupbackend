// src/controllers/image-rating.controller.js
import prisma from '../config/prisma.config.js';
import { createError } from '../utils/create-error.util.js';

/** ตรวจสอบว่า image นี้อนุญาตให้รีวิว/ให้ดาว */
async function assertImageAllowsReview(imageId) {
  const img = await prisma.image.findUnique({
    where: { id: imageId },
    select: { id: true, store_id: true, allow_review: true },
  });
  if (!img) throw createError(404, 'ไม่พบบันทึกรูปนี้');
  if (!img.allow_review) throw createError(403, 'เมนู/รูปนี้ไม่อนุญาตให้รีวิว');
  return img;
}

/** คืนค่า avg + count ปัจจุบันของ image และอัปเดตค่าทับในตาราง images ด้วย (denormalize) */
async function recomputeAndUpdateImageStats(imageId) {
  const agg = await prisma.imageRating.aggregate({
    where: { image_id: imageId },
    _avg: { rating: true },
    _count: { rating: true },
  });

  const count = Number(agg?._count?.rating ?? 0);
  const avgRaw = Number(agg?._avg?.rating ?? 0);
  const avg = count > 0 ? Number(avgRaw.toFixed(2)) : 0;

  // ✅ เขียนกลับลงคอลัมน์เดิมที่มีอยู่จริง
  await prisma.image.update({
    where: { id: imageId },
    data: {
      rating: avg,        // ← ใช้ rating (ไม่ใช่ avg_rating)
      rating_count: count,
    },
  });

  return { avg, count };
}

/** 🟢 GET /api/ratings/:imageId — สรุปคะแนนของรูปนี้ (ไม่ต้องล็อกอิน) */
export async function getImageRatingsForImage(req, res, next) {
  try {
    const imageId = req.params.imageId;
    const img = await prisma.image.findUnique({ where: { id: imageId }, select: { id: true } });
    if (!img) return next(createError(404, 'ไม่พบบันทึกรูปนี้'));

    const agg = await prisma.imageRating.aggregate({
      where: { image_id: imageId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    const count = Number(agg?._count?.rating ?? 0);
    const avgRaw = Number(agg?._avg?.rating ?? 0);
    const avg = count > 0 ? Number(avgRaw.toFixed(2)) : 0;

    res.json({ image_id: imageId, avg, count });
  } catch (err) {
    next(err);
  }
}

/** 🟢 GET /api/ratings/:imageId/me — คะแนนของผู้ใช้คนนี้ (ต้องล็อกอิน) */
export async function getMyImageRating(req, res, next) {
  try {
    const imageId = req.params.imageId;
    const userId = req.user?.id;
    if (!userId) return next(createError(401, 'กรุณาเข้าสู่ระบบ'));

    const rating = await prisma.imageRating.findUnique({
      where: {
        image_id_user_id: { image_id: imageId, user_id: userId },
      },
      select: { id: true, rating: true, created_at: true, updated_at: true },
    });

    res.json({ image_id: imageId, my_rating: rating?.rating ?? null });
  } catch (err) {
    next(err);
  }
}

/** 🔐 POST /api/ratings/:imageId หรือ POST /api/ratings (body.image_id) — ให้ดาว/แก้ไขดาว */
export async function createOrUpdateImageRating(req, res, next) {
  try {
    const paramId = req.params?.imageId;
    const bodyId = req.body?.image_id;
    const imageId = String(paramId || bodyId || '');

    const rating = Number(req.body?.rating);
    const userId = req.user?.id;

    if (!userId) return next(createError(401, 'กรุณาเข้าสู่ระบบ'));
    if (!imageId) return next(createError(400, 'กรุณาระบุ image_id'));
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return next(createError(400, 'คะแนนต้องเป็นจำนวนเต็ม 1–5'));
    }

    await assertImageAllowsReview(imageId);

    // upsert (หนึ่ง user ให้ 1 รูปได้ 1 record)
    const saved = await prisma.imageRating.upsert({
      where: { image_id_user_id: { image_id: imageId, user_id: userId } },
      update: { rating },
      create: { image_id: imageId, user_id: userId, rating },
      select: { id: true, rating: true },
    });

    const stats = await recomputeAndUpdateImageStats(imageId);

    res.status(201).json({
      message: 'บันทึกคะแนนเรียบร้อย',
      image_id: imageId,
      my_rating: saved.rating,
      ...stats, // { avg, count }
    });
  } catch (err) {
    next(err);
  }
}

/** 🔐 DELETE /api/ratings/:imageId — ลบดาวของตัวเองออก */
export async function deleteImageRating(req, res, next) {
  try {
    const imageId = req.params?.imageId;
    const userId = req.user?.id;

    if (!userId) return next(createError(401, 'กรุณาเข้าสู่ระบบ'));
    if (!imageId) return next(createError(400, 'กรุณาระบุ imageId'));

    // ถ้าไม่มี record ก็ถือว่าลบสำเร็จ (idempotent)
    await prisma.imageRating.deleteMany({
      where: { image_id: imageId, user_id: userId },
    });

    const stats = await recomputeAndUpdateImageStats(imageId);

    res.json({
      message: 'ลบคะแนนเรียบร้อย',
      image_id: imageId,
      my_rating: null,
      ...stats,
    });
  } catch (err) {
    next(err);
  }
}