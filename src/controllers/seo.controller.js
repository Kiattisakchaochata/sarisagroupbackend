import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/* ---------- utils ---------- */
function safeParseJson(x) {
  if (!x) return null;
  if (typeof x === 'object') return x;
  try { return JSON.parse(String(x)); } catch { return null; }
}
function normPath(p) {
  if (!p) return '/';
  let s = String(p).trim();
  if (!s.startsWith('/')) s = '/' + s;
  if (s.length > 1) s = s.replace(/\/+$/, ''); // ตัด '/' ท้าย ยกเว้น root
  return s;
}

/* ====== เพิ่มคอนสแตนต์และ util สำหรับ keywords ====== */
const KEYWORDS_MAX = 512; // ✅ ตามที่ตกลงกัน
function normalizeKeywords(v) {
  if (!v) return '';
  return String(v)
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .join(', ');
}

/** (ยังคงไว้เผื่อ reuse อื่น ๆ ถ้าต้องการ) */
function clamp(str, max) {
  if (!str) return '';
  return String(str).slice(0, max);
}

// ----- Global (SiteSeo) -----
export async function getSiteSeo(req, res) {
  const site = await prisma.siteSeo.findUnique({ where: { id: 'global' } });
  res.json(site ?? {});
}

export async function upsertSiteSeo(req, res) {
  try {
    const { meta_title, meta_description, keywords, og_image, jsonld } = req.body ?? {};
    const jsonldParsed = safeParseJson(jsonld) || {};

    // ✅ ทำให้ keywords เป็นรูปแบบมาตรฐานก่อน
    const normalized = normalizeKeywords(keywords);

    // ✅ ป้องกันความยาวเกิน 512 ตัวอักษร — ตอบ 400 ทันที (ชัดเจนกว่าปล่อยให้ชน DB)
    if (normalized && normalized.length > KEYWORDS_MAX) {
      return res.status(400).json({
        error: 'KEYWORDS_TOO_LONG',
        message: `keywords ยาวเกินกำหนด (สูงสุด ${KEYWORDS_MAX} ตัวอักษร รวมจุลภาคและช่องว่าง)`,
      });
    }

    // ✅ sync ลง jsonld ด้วย (ถ้ามี)
    if (typeof jsonldParsed === 'object' && jsonldParsed) {
      if (normalized) jsonldParsed.keywords = normalized;
      // ไม่แก้ไขฟิลด์อื่น ๆ
    }

    const data = await prisma.siteSeo.upsert({
      where: { id: 'global' },
      create: { id: 'global', meta_title, meta_description, keywords: normalized, og_image, jsonld: jsonldParsed },
      update: {           meta_title, meta_description, keywords: normalized, og_image, jsonld: jsonldParsed },
    });
    res.json(data);
  } catch (err) {
    // ดัก Prisma P2000 เผื่อสคีมายังเป็นความยาวสั้นกว่า (กันเว็บล่ม)
    if (err?.code === 'P2000' && err?.meta?.column_name === 'keywords') {
      return res.status(400).json({
        error: 'KEYWORDS_TOO_LONG',
        message: `keywords ยาวเกินกำหนด (สูงสุด ${KEYWORDS_MAX} ตัวอักษร รวมจุลภาคและช่องว่าง)`,
      });
    }
    // อื่น ๆ ส่ง 500 กลับไป
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message || 'Unexpected error' });
  }
}

// ----- Per Page (PageSeo) -----
export async function listPageSeo(req, res) {
  const pages = await prisma.pageSeo.findMany({ orderBy: { updated_at: 'desc' }, take: 200 });
  res.json({ pages });
}

export async function getPageSeoByPath(req, res) {
  const path = normPath(req.query.path || '');
  if (!path) return res.status(400).json({ message: 'path is required' });
  const page = await prisma.pageSeo.findUnique({ where: { path } });
  if (!page) return res.status(404).json({ message: 'not found' });
  res.json(page);
}

export async function upsertPageSeo(req, res) {
  const { title, description, og_image, jsonld, noindex } = req.body ?? {};
  const path = normPath(req.body?.path);
  if (!path) return res.status(400).json({ message: 'path is required' });

  const jsonldParsed = safeParseJson(jsonld);
  const data = await prisma.pageSeo.upsert({
    where: { path },
    create: { path, title, description, og_image, jsonld: jsonldParsed, noindex: !!noindex },
    update: {       title, description, og_image, jsonld: jsonldParsed, noindex: !!noindex },
  });
  res.json(data);
}

export async function deletePageSeo(req, res) {
  const id = String(req.params.id || '');
  if (!id) return res.status(400).json({ message: 'id is required' });
  await prisma.pageSeo.delete({ where: { id } });
  res.json({ ok: true });
}

/* ---------- Public SEO API (read-only, no auth) ---------- */
export async function getSitePublic() {
  const site = await prisma.siteSeo.findUnique({ where: { id: 'global' } });
  if (!site) return {};
  return {
    title: site.meta_title,
    description: site.meta_description,
    keywords: site.keywords,
    ogImage: site.og_image,
    jsonld: site.jsonld,
  };
}

export async function getPagePublic(path) {
  const norm = normPath(path);
  const page = await prisma.pageSeo.findUnique({ where: { path: norm } });
  if (!page) return null;
  return {
    title: page.title,
    description: page.description,
    ogImage: page.og_image,
    jsonld: page.jsonld,
    noindex: page.noindex,
  };
}