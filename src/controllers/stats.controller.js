// backend/src/controllers/stats.controller.js
import prisma from '../config/prisma.config.js'

/**
 * GET /api/admin/stats
 * สถิติโดยสรุปสำหรับแดชบอร์ดแอดมิน
 */
export const getAdminStats = async (_req, res, next) => {
  try {
    // นับยอดรวมพื้นฐาน
    const [stores, images, reviews, videos] = await Promise.all([
      prisma.store.count(),
      prisma.image.count(),
      prisma.review.count(),
      prisma.video.count(),
    ])

    // นับร้านแยกสถานะ
    const [activeStores, inactiveStores] = await Promise.all([
      prisma.store.count({ where: { is_active: true } }),
      prisma.store.count({ where: { is_active: false } }),
    ])

    // 5 ร้านคะแนนรีวิวสูงสุด
    const topStores = await prisma.store.findMany({
      take: 5,
      orderBy: [
        { avg_rating: 'desc' },
        { review_count: 'desc' }, // tie-breaker
      ],
      select: {
        id: true,
        name: true,
        slug: true,
        avg_rating: true,
        review_count: true,
      },
    })

    // 5 รูปล่าสุด (เผื่ออยากแสดงในแดชบอร์ด)
    const latestImages = await prisma.image.findMany({
      take: 5,
      orderBy: { created_at: 'desc' },
      select: { id: true, store_id: true, image_url: true, created_at: true },
    })

    res.json({
      stores: { total: stores, active: activeStores, inactive: inactiveStores },
      images: { total: images, latest: latestImages },
      reviews: { total: reviews },
      videos: { total: videos },
      topStores,
      updatedAt: new Date().toISOString(),
    })
  } catch (err) {
    next(err)
  }
}