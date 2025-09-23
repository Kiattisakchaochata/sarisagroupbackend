// src/utils/social-links.util.js
export function normalizeSocialLinks(input) {
  if (input === null || input === undefined || input === '') return null;
  if (typeof input === 'object') return input;
  if (typeof input === 'string') {
    try { const obj = JSON.parse(input); return typeof obj === 'object' ? obj : null; } catch {}
    // ถ้าเป็นสตริงธรรมดา (ไม่ใช่ JSON) เก็บเป็น object เดียว เช่น { raw: "..." }
    return { raw: input };
  }
  return null;
}