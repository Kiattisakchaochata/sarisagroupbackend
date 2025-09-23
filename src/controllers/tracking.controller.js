// controllers/tracking.controller.js
import prisma from '../config/prisma.config.js';

export async function listTrackingScripts(req, res, next) {
  try {
    const items = await prisma.trackingScript.findMany({
      orderBy: [{ provider: 'asc' }, { createdAt: 'desc' }],
    });
    res.json({ items });
  } catch (err) { next(err); }
}

export async function upsertTrackingScript(req, res, next) {
  try {
    const {
      id, provider, trackingId, script,
      placement = 'HEAD', strategy = 'afterInteractive',
      enabled = true,
    } = req.body;

    const data = {
      provider, trackingId: trackingId ?? null, script: script ?? null,
      placement, strategy, enabled: !!enabled,
    };

    const saved = id
      ? await prisma.trackingScript.update({ where: { id }, data })
      : await prisma.trackingScript.create({ data });

    res.status(id ? 200 : 201).json({ item: saved });
  } catch (err) { next(err); }
}

export async function deleteTrackingScript(req, res, next) {
  try {
    const { id } = req.params;
    await prisma.trackingScript.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) { next(err); }
}

/** public: คืนเฉพาะ enabled */
export async function listEnabledTrackingScripts(_req, res, next) {
  try {
    const items = await prisma.trackingScript.findMany({
      where: { enabled: true },
      orderBy: [{ provider: 'asc' }, { createdAt: 'desc' }],
    });
    res.json({ items });
  } catch (err) { next(err); }
}