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

// ----- Global (SiteSeo) -----
export async function getSiteSeo(req, res) {
  const site = await prisma.siteSeo.findUnique({ where: { id: 'global' } });
  res.json(site ?? {});
}

export async function upsertSiteSeo(req, res) {
  const { meta_title, meta_description, keywords, og_image, jsonld } = req.body ?? {};
  const jsonldParsed = safeParseJson(jsonld);

  const data = await prisma.siteSeo.upsert({
    where: { id: 'global' },
    create: { id: 'global', meta_title, meta_description, keywords, og_image, jsonld: jsonldParsed },
    update: {           meta_title, meta_description, keywords, og_image, jsonld: jsonldParsed },
  });
  res.json(data);
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