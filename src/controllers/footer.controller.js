import prisma from '../config/prisma.config.js';

/* ---------- helpers ---------- */
function sanitizeLinks(arr) {
  return Array.isArray(arr)
    ? arr
        .filter((l) => l && (l.label || l.href))
        .map((l) => ({ label: String(l.label ?? ''), href: String(l.href ?? '') }))
    : [];
}
function sanitizeLocations(arr) {
  return Array.isArray(arr)
    ? arr
        .filter((l) => l && (l.label || l.href))
        .map((l) => ({ label: String(l.label ?? ''), href: String(l.href ?? '') }))
    : [];
}
function sanitizeHours(arr) {
  return Array.isArray(arr)
    ? arr
        .filter((h) => h && (h.label || h.time))
        .map((h) => ({ label: String(h.label ?? ''), time: String(h.time ?? '') }))
    : [];
}

/* ---------- Public: GET /api/footer ---------- */
export async function getPublicFooter(req, res) {
  try {
    const row = await prisma.siteFooter.findUnique({ where: { id: 'singleton' } });

    const data = row ?? {
      id: 'singleton',
      about_text: '',
      address: '',
      phone: '',
      email: '',
      socials: { facebook: '', instagram: '', tiktok: '', line: '', youtube: '' },
      links: [],
      locations: [],
      hours: [],
      updated_at: new Date(),
    };

    const socials   = typeof data.socials === 'object' && data.socials !== null ? data.socials : {};
    const links     = sanitizeLinks(data.links);
    const locations = sanitizeLocations(data.locations);
    const hours     = sanitizeHours(data.hours);

    res.json({ footer: { ...data, socials, links, locations, hours } });
  } catch (err) {
    console.error('getPublicFooter error:', err);
    res.status(500).json({ message: 'internal error' });
  }
}

/* ---------- Admin: GET /api/admin/footer ---------- */
export async function getAdminFooter(req, res) {
  try {
    const row = await prisma.siteFooter.findUnique({ where: { id: 'singleton' } });
    res.json({
      footer: row ?? {
        id: 'singleton',
        about_text: '',
        address: '',
        phone: '',
        email: '',
        socials: { facebook: '', instagram: '', tiktok: '', line: '', youtube: '' },
        links: [],
        locations: [],
        hours: [],
      },
    });
  } catch (err) {
    console.error('getAdminFooter error:', err);
    res.status(500).json({ message: 'internal error' });
  }
}

/* ---------- Admin: PATCH /api/admin/footer ---------- */
export async function updateAdminFooter(req, res) {
  try {
    const {
      about_text = '',
      address = '',
      phone = '',
      email = '',
      socials = {},
      links = [],
      locations = [],
      hours = [],
    } = req.body ?? {};

    const socialsObj = {
      facebook: socials.facebook ?? '',
      instagram: socials.instagram ?? '',
      tiktok: socials.tiktok ?? '',
      line: socials.line ?? '',
      youtube: socials.youtube ?? '',
    };
    const linksArr     = sanitizeLinks(links);
    const locationsArr = sanitizeLocations(locations);
    const hoursArr     = sanitizeHours(hours);

    const saved = await prisma.siteFooter.upsert({
      where: { id: 'singleton' },
      update: {
        about_text: String(about_text ?? ''),
        address: String(address ?? ''),
        phone: String(phone ?? ''),
        email: String(email ?? ''),
        socials: socialsObj,
        links: linksArr,
        locations: locationsArr,
        hours: hoursArr,
      },
      create: {
        id: 'singleton',
        about_text: String(about_text ?? ''),
        address: String(address ?? ''),
        phone: String(phone ?? ''),
        email: String(email ?? ''),
        socials: socialsObj,
        links: linksArr,
        locations: locationsArr,
        hours: hoursArr,
      },
    });

    res.json({ footer: saved });
  } catch (err) {
    console.error('updateAdminFooter error:', err);
    res.status(500).json({ message: 'internal error' });
  }
}