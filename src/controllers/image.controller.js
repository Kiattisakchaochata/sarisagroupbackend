// src/controllers/image.controller.js
import prisma from '../config/prisma.config.js'
import cloudinary from '../config/cloudinary.config.js'
import streamifier from 'streamifier'

/* -------------------------------------------------------------------------- */
/*  อัปโหลดไป Cloudinary และ "ตอบ URL แบบแบน" + header เผื่อ FE อ่านง่าย      */
/*  - รองรับ field: file / image / photo (กำหนดใน route แล้ว)                  */
/*  - req.body.collection (optional) -> โฟลเดอร์ย่อยใน Cloudinary               */
/* -------------------------------------------------------------------------- */
export const uploadImage = async (req, res, next) => {
  try {
    const file = req.file || (Array.isArray(req.files) && req.files[0]) || null
    if (!file) return res.status(400).json({ message: 'file is required' })

    const mime = String(file.mimetype || '').toLowerCase()
    if (!mime.startsWith('image/')) {
      return res.status(400).json({ message: 'invalid file type (image only)' })
    }

    const collection = (req.body?.collection || 'misc').toString()
    const folder = `sarisagroup/${collection}`

    const uploaded = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'image' },
        (err, result) => (err ? reject(err) : resolve(result))
      )
      streamifier.createReadStream(file.buffer).pipe(stream)
    })

    // ✅ เคสที่ FE อ่าน header
    if (uploaded.secure_url) {
      res.setHeader('Location', uploaded.secure_url)
      res.setHeader('X-File-URL', uploaded.secure_url)
    }

    // ✅ ตอบ "แบบแบน" ให้ FE ส่วนใหญ่ใช้งานได้ทันที
    return res.status(201).json({
      url: uploaded.secure_url,
      image_url: uploaded.secure_url,
      secure_url: uploaded.secure_url,
      public_id: uploaded.public_id,
      width: uploaded.width,
      height: uploaded.height,

      // ✅ และเผื่อโครงสร้างเดิมของคุณด้วย (เข้ากันได้ย้อนหลัง)
      image: {
        image_url: uploaded.secure_url,
        cloudinary_public_id: uploaded.public_id,
        width: uploaded.width,
        height: uploaded.height,
      },
    })
  } catch (err) {
    console.error('uploadImage error:', err)
    next(err)
  }
}

/* --------------------------- DELETE --------------------------- */
export const deleteImage = async (req, res, next) => {
  try {
    const { id } = req.params
    const image = await prisma.image.findUnique({ where: { id } })
    if (!image) return res.status(404).json({ message: 'ไม่พบรูปภาพนี้' })

    if (image.cloudinary_public_id) {
      await cloudinary.uploader.destroy(image.cloudinary_public_id)
    }
    await prisma.image.delete({ where: { id } })
    res.json({ message: 'ลบรูปภาพสำเร็จ' })
  } catch (err) { next(err) }
}

/* --------------------------- REORDER -------------------------- */
export const reorderImages = async (req, res, next) => {
  try {
    const { store_id } = req.params
    const { order } = req.body // [{ id, order_number }, ...]
    if (!Array.isArray(order)) {
      return res.status(400).json({ message: 'กรุณาส่งข้อมูล order เป็น array' })
    }
    const updates = await Promise.all(
      order.map(({ id, order_number }) =>
        prisma.image.update({ where: { id }, data: { order_number } })
      )
    )
    res.json({ message: 'จัดลำดับรูปสำเร็จ', images: updates })
  } catch (err) { next(err) }
}