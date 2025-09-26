// scripts/seo_migrate_normalize.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

function normPath(p) {
  if (!p) return '/';
  let s = String(p).trim();
  if (!s.startsWith('/')) s = '/' + s;
  if (s.length > 1) s = s.replace(/\/+$/, '');
  return s;
}

(async () => {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

  const pages = await prisma.pageSeo.findMany();
  for (const pg of pages) {
    const newPath = normPath(pg.path);
    const jsonld = typeof pg.jsonld === 'object' && pg.jsonld ? { ...pg.jsonld } : {};
    jsonld.url = `${siteUrl}${newPath}`; // sync url ให้ตรง path

    if (newPath !== pg.path) {
      // ถ้า path เดิมไม่ตรง → ย้าย record
      await prisma.pageSeo.upsert({
        where: { path: newPath },
        create: {
          path: newPath,
          title: pg.title ?? '',
          description: pg.description ?? '',
          og_image: pg.og_image ?? '',
          jsonld,
          noindex: !!pg.noindex,
        },
        update: {
          title: pg.title ?? '',
          description: pg.description ?? '',
          og_image: pg.og_image ?? '',
          jsonld,
          noindex: !!pg.noindex,
        },
      });
      await prisma.pageSeo.delete({ where: { id: pg.id } });
      console.log(`moved ${pg.path} -> ${newPath}`);
    } else {
      await prisma.pageSeo.update({
        where: { id: pg.id },
        data: { jsonld },
      });
      console.log(`updated url for ${pg.path}`);
    }
  }

  await prisma.$disconnect();
  console.log('done');
})();