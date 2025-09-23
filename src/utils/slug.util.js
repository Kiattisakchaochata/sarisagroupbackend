// src/utils/slug.util.js
export const toSlug = (s='') =>
  s.toString().toLowerCase()
   .normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
   .replace(/[^a-z0-9ก-๙]+/gi,'-')
   .replace(/(^-|-$)/g,'');