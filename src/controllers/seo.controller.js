import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

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
    create: {
      id: 'global',
      meta_title,
      meta_description,
      keywords,
      og_image,
      jsonld: jsonldParsed,
    },
    update: {
      meta_title,
      meta_description,
      keywords,
      og_image,
      jsonld: jsonldParsed,
    },
  });
  res.json(data);
}

// ----- Per Page (PageSeo) -----
export async function listPageSeo(req, res) {
  const pages = await prisma.pageSeo.findMany({
    orderBy: { updated_at: 'desc' },
    take: 200,
  });
  res.json({ pages });
}

export async function getPageSeoByPath(req, res) {
  const path = String(req.query.path || '');
  if (!path) return res.status(400).json({ message: 'path is required' });
  const page = await prisma.pageSeo.findUnique({ where: { path } });
  if (!page) return res.status(404).json({ message: 'not found' });
  res.json(page);
}

export async function upsertPageSeo(req, res) {
  const { path, title, description, og_image, jsonld, noindex } = req.body ?? {};
  if (!path) return res.status(400).json({ message: 'path is required' });
  const jsonldParsed = safeParseJson(jsonld);

  const data = await prisma.pageSeo.upsert({
    where: { path },
    create: { path, title, description, og_image, jsonld: jsonldParsed, noindex: !!noindex },
    update: { title, description, og_image, jsonld: jsonldParsed, noindex: !!noindex },
  });
  res.json(data);
}

export async function deletePageSeo(req, res) {
  const id = String(req.params.id || '');
  if (!id) return res.status(400).json({ message: 'id is required' });
  await prisma.pageSeo.delete({ where: { id } });
  res.json({ ok: true });
}

function safeParseJson(x) {
  if (!x) return null;
  if (typeof x === 'object') return x;
  try {
    return JSON.parse(String(x));
  } catch {
    return null;
  }
}