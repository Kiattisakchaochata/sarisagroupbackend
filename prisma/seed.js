// scripts/seed.ts (หรือไฟล์ seed เดิมของคุณ)
import 'dotenv/config'
import { PrismaClient, ReviewStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function upsertAdmin() {
  const passwordHash = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: { role: 'admin' },
    create: {
      name: 'Admin',
      email: 'admin@example.com',
      password_hash: passwordHash,
      role: 'admin',
    },
  })
  return admin
}

async function upsertCategories() {
  const categories = [
    { name: 'ร้านอาหาร', slug: 'restaurant', order_number: 1 },
    { name: 'ร้านซักผ้าหยอดเหรียญ & คาเฟ่', slug: 'laundromat-cafe', order_number: 2 },
    { name: 'ร้านเสริมสวย', slug: 'beauty-salon', order_number: 3 },
    { name: 'คาร์แคร์ & คาเฟ่', slug: 'carcare-cafe', order_number: 4 },
    { name: 'คาร์แคร์', slug: 'car-wash', order_number: 5 },
  ]

  for (const c of categories) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, order_number: c.order_number },
      create: { ...c, avg_review: 0 },
    })
  }

  const map: Record<string, any> = {}
  for (const c of categories) {
    map[c.slug] = await prisma.category.findUnique({ where: { slug: c.slug } })
  }
  return map
}

async function upsertStoreWithData({
  name,
  slug,
  categoryId,
  order,
  description,
  address,
  lat,
  lng,
  phone,
  coverImage,
  images = [],
  videos = [],
}) {
  const store = await prisma.store.upsert({
    where: { slug },
    update: {},
    create: {
      name,
      slug,
      description,
      address,
      latitude: lat,
      longitude: lng,
      phone,
      category_id: categoryId,
      order_number: order,
      cover_image: coverImage,
      social_links: {
        facebook: 'https://facebook.com/example',
        line: 'https://line.me/R/ti/p/@example',
      },
      is_active: true,
      avg_rating: 0,
      review_count: 0,
      openingHours: {
        create: [
          { day: 'MON', openTime: '08:00', closeTime: '19:30', isOpen: true },
          { day: 'TUE', openTime: '08:00', closeTime: '19:30', isOpen: true },
          { day: 'WED', openTime: '08:00', closeTime: '19:30', isOpen: true },
          { day: 'THU', openTime: '08:00', closeTime: '19:30', isOpen: true },
          { day: 'FRI', openTime: '08:00', closeTime: '19:30', isOpen: true },
          { day: 'SAT', openTime: '08:00', closeTime: '19:30', isOpen: true },
          { day: 'SUN', openTime: '08:00', closeTime: '19:30', isOpen: true },
        ],
      },
      images: {
        create: images.map((img, idx) => ({
          image_url: img,
          order_number: idx + 1,
          alt_text: `${name} - รูปที่ ${idx + 1}`,
        })),
      },
      videos: {
        create: videos.map((v, idx) => ({
          title: v.title,
          youtube_url: v.youtube,
          order_number: idx + 1,
          is_active: true,
        })),
      },
    },
  })

  await prisma.visitorCounter.upsert({
    where: { storeId: store.id },
    update: {},
    create: { storeId: store.id, total: 0 },
  })

  return store
}

async function seedStores(catMap: Record<string, any>) {
  const r1 = await upsertStoreWithData({
    name: 'ข้าวมันไก่เจ๊แดง',
    slug: 'khaomunkaije-dang',
    categoryId: catMap['restaurant'].id,
    order: 1,
    description: 'ข้าวมันไก่สูตรดั้งเดิม เปิดบริการมากว่า 30 ปี',
    address: '123/45 ถ.สุขุมวิทย์ ต.ในเมือง อ.เมือง จ.ขอนแก่น',
    lat: 16.441,
    lng: 102.835,
    phone: '081-234-5678',
    coverImage: 'https://cdn.example.com/store-r1-cover.jpg',
    images: Array.from({ length: 12 }).map((_, i) => `https://cdn.example.com/r1-${i + 1}.jpg`),
    videos: [{ title: 'รีวิวร้านข้าวมันไก่เจ๊แดง', youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }],
  })

  const r2 = await upsertStoreWithData({
    name: 'Laundry & Milk Cafe',
    slug: 'laundromat-plus-cafe',
    categoryId: catMap['laundromat-cafe'].id,
    order: 1,
    description: 'ซักผ้าเพลิน ๆ พร้อมเครื่องดื่มนมสดและกาแฟ',
    address: '99/8 ถ.มิตรภาพ อ.เมือง จ.ขอนแก่น',
    lat: 16.45,
    lng: 102.84,
    phone: '085-111-2222',
    coverImage: 'https://cdn.example.com/store-r2-cover.jpg',
    images: Array.from({ length: 8 }).map((_, i) => `https://cdn.example.com/r2-${i + 1}.jpg`),
    videos: [{ title: 'พาทัวร์ Laundry & Milk Cafe', youtube: 'https://www.youtube.com/watch?v=5NV6Rdv1a3I' }],
  })

  const r3 = await upsertStoreWithData({
    name: 'Beauty by Sara',
    slug: 'beauty-by-sara',
    categoryId: catMap['beauty-salon'].id,
    order: 1,
    description: 'ร้านเสริมสวย ทำสี บำรุง ทรีตเมนต์ครบวงจร',
    address: '45/10 ถ.หน้าเมือง อ.เมือง จ.มหาสารคาม',
    lat: 16.2,
    lng: 103.3,
    phone: '083-999-8888',
    coverImage: 'https://cdn.example.com/store-r3-cover.jpg',
    images: Array.from({ length: 10 }).map((_, i) => `https://cdn.example.com/r3-${i + 1}.jpg`),
    videos: [{ title: 'เปลี่ยนลุคกับ Beauty by Sara', youtube: 'https://www.youtube.com/watch?v=3JZ_D3ELwOQ' }],
  })

  const r4 = await upsertStoreWithData({
    name: 'Eco Car Care & Cafe',
    slug: 'eco-carcare-cafe',
    categoryId: catMap['carcare-cafe'].id,
    order: 1,
    description: 'ล้างรถพลังงานทดแทน + คาเฟ่สไตล์มินิมอล',
    address: '220/1 ถ.กาฬสินธุ์ อ.เมือง จ.กาฬสินธุ์',
    lat: 16.43,
    lng: 103.51,
    phone: '086-777-6666',
    coverImage: 'https://cdn.example.com/store-r4-cover.jpg',
    images: Array.from({ length: 6 }).map((_, i) => `https://cdn.example.com/r4-${i + 1}.jpg`),
    videos: [{ title: 'Eco Car Care & Cafe Vibes', youtube: 'https://www.youtube.com/watch?v=oHg5SJYRHA0' }],
  })

  return [r1, r2, r3, r4]
}

async function seedReviewsAndUpdateAverages(storeIds: string[], admin: any) {
  const samples = [
    { store_id: storeIds[0], rating: 5, comment: 'อร่อยมาก บริการดี', status: ReviewStatus.APPROVED },
    { store_id: storeIds[0], rating: 4, comment: 'น้ำจิ้มเด็ด ข้าวมันหอม', status: ReviewStatus.APPROVED },
    { store_id: storeIds[1], rating: 5, comment: 'ซักผ้าไป จิบกาแฟไป ฟิน', status: ReviewStatus.PENDING },
    { store_id: storeIds[2], rating: 4, comment: 'ทำสีสวย ช่างมือเบา', status: ReviewStatus.APPROVED },
    { store_id: storeIds[3], rating: 5, comment: 'ล้างดี รถเงา คาเฟ่อร่อย', status: ReviewStatus.APPROVED },
  ]

  for (const s of samples) {
    await prisma.review.create({
      data: {
        user_id: admin.id,
        store_id: s.store_id,
        rating: s.rating,
        comment: s.comment,
        status: s.status,
      },
    })
  }

  for (const sid of storeIds) {
    const approved = await prisma.review.findMany({
      where: { store_id: sid, status: ReviewStatus.APPROVED },
      select: { rating: true },
    })
    const count = approved.length
    const avg = count ? approved.reduce((acc, r) => acc + r.rating, 0) / count : 0
    await prisma.store.update({
      where: { id: sid },
      data: { review_count: count, avg_rating: Number(avg.toFixed(2)) },
    })
  }
}

async function seedBanners() {
  const banners = [
    {
      image_url: 'https://cdn.example.com/banner-1.jpg',
      title: 'โปรเปิดสาขาใหม่',
      alt_text: 'Banner 1',
      href: '/promotions/opening',
      order: 1,
      is_active: true,
    },
    {
      image_url: 'https://cdn.example.com/banner-2.jpg',
      title: 'เทศกาลอาหารชุมชน',
      alt_text: 'Banner 2',
      href: '/events/food-fest',
      order: 2,
      is_active: true,
    },
    {
      image_url: 'https://cdn.example.com/banner-3.jpg',
      title: 'สิทธิพิเศษสมาชิก',
      alt_text: 'Banner 3',
      href: '/membership',
      order: 3,
      is_active: true,
    },
  ]

  for (const b of banners) {
    await prisma.banner.upsert({
      where: { id: `${b.order}-seed-banner` },
      update: {
        image_url: b.image_url,
        title: b.title,
        alt_text: b.alt_text,
        href: b.href,
        order: b.order,
        is_active: b.is_active,
      },
      create: { id: `${b.order}-seed-banner`, ...b },
    })
  }
}

async function ensureWebsiteVisitor() {
  await prisma.websiteVisitorCounter.upsert({
    where: { id: 'singleton' },
    update: {},
    create: { id: 'singleton', total: 0 },
  })
}

/** ✅ seed หน้าแรก (Homepage) เริ่มต้น */
async function seedHomepage() {
  await prisma.homepage.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      hero_title: 'ธุรกิจเพื่อชุมชน – ขาดทุนไม่ว่า เสียชื่อไม่ได้',
      hero_subtitle:
        'ร้านอาหาร • คาเฟ่ • เสริมสวย • คาร์แคร์ ฯลฯ — เน้นคุณภาพ รสชาติอร่อย ใช้พลังงานทดแทน และช่วยสร้างงานในท้องถิ่น',
      missions: [
        { id: 'm1', title: 'สร้างงานในชุมชนจริงจัง' },
        { id: 'm2', title: 'ตั้งใจเปิดโอกาสการจ้างงานท้องถิ่น' },
        { id: 'm3', title: 'พลังงานทดแทน ลดคาร์บอน' },
        { id: 'm4', title: 'เลือกเทคโนโลยีที่เป็นมิตรต่อสิ่งแวดล้อม' },
        { id: 'm5', title: 'คุณภาพมาก่อน' },
        { id: 'm6', title: '“ขาดทุนไม่ว่า เสียชื่อไม่ได้”' },
      ],
      rows: [],
    },
  })
}

async function main() {
  const admin = await upsertAdmin()
  const catMap = await upsertCategories()
  const stores = await seedStores(catMap)

  await seedReviewsAndUpdateAverages(stores.map(s => s.id), admin)
  await seedBanners()
  await ensureWebsiteVisitor()
  await seedHomepage() // ✅ สำคัญ

  console.log('✅ Seed completed.')
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })