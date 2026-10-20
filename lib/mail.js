'use strict';
/*
 * Envío de correo por SMTP (Microsoft 365, Google Workspace, Exchange interno, relay…).
 * Se configura en .env: SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM y PUBLIC_URL.
 */
const nodemailer = require('nodemailer');
let transport = null;
let accent = '#C8102E';
const setAccent = c => { accent = /^#[0-9a-fA-F]{6}$/.test(c || '') ? c : '#C8102E'; };

function publicUrl() { return String(process.env.PUBLIC_URL || '').trim().replace(/\/+$/, ''); }
function enabled() { return !!(process.env.SMTP_HOST && process.env.SMTP_FROM && publicUrl()); }
function missing() {
  return ['SMTP_HOST', 'SMTP_FROM', 'PUBLIC_URL'].filter(k => !String(process.env[k] || '').trim());
}
function get() {
  if (transport) return transport;
  const port = +(process.env.SMTP_PORT || 587);
  transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: ['1', 'true'].includes(String(process.env.SMTP_SECURE || (port === 465 ? '1' : '0')).toLowerCase()),
    requireTLS: ['1', 'true'].includes(String(process.env.SMTP_REQUIRE_TLS || '0').toLowerCase()),
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || '' } : undefined,
    tls: { rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== '0' },
    connectionTimeout: 15000, greetingTimeout: 10000, socketTimeout: 20000
  });
  return transport;
}
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function layout(company, title, paragraphs, button, footer, extraHtml, extraText) {
  const html = `<!doctype html><html lang="es"><body style="margin:0;background:#F4F4F5;font-family:Arial,Helvetica,sans-serif;color:#18181B">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F4F5;padding:28px 12px"><tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;background:#ffffff;border:1px solid #E4E4E7;border-radius:10px;overflow:hidden">
    <tr><td style="background:${accent};color:#ffffff;padding:18px 26px;font-size:20px;font-weight:bold">${esc(company)} <span style="font-weight:normal;font-size:14px;opacity:.9">Control de almacén</span></td></tr>
    <tr><td style="padding:26px">
      <h1 style="margin:0 0 14px;font-size:20px">${esc(title)}</h1>
      ${paragraphs.map(p => `<p style="margin:0 0 14px;font-size:15px;line-height:1.5">${p}</p>`).join('')}
      ${button ? `<p style="margin:22px 0"><a href="${esc(button.url)}" style="background:${accent};color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold;display:inline-block">${esc(button.label)}</a></p>
      <p style="margin:0 0 14px;font-size:12.5px;color:#6B6B74;word-break:break-all">Si el botón no funciona, copia este enlace en el navegador:<br>${esc(button.url)}</p>` : ''}
      ${extraHtml || ''}
      ${footer ? `<p style="margin:18px 0 0;font-size:12.5px;color:#6B6B74">${footer}</p>` : ''}
    </td></tr>
  </table></td></tr></table></body></html>`;
  const text = [title, '', ...paragraphs.map(p => p.replace(/<[^>]+>/g, '')), extraText || '', button ? `\n${button.label}: ${button.url}` : '', footer ? '\n' + footer.replace(/<[^>]+>/g, '') : ''].join('\n');
  return { html, text };
}
async function send(to, subject, body, attachments, extra = {}) {
  if (!enabled()) throw new Error('El envío de correo no está configurado.');
  return get().sendMail({ from: process.env.SMTP_FROM, to, subject, html: body.html, text: body.text, attachments, ...extra });
}
module.exports = { enabled, missing, publicUrl, layout, send, esc, setAccent, accent: () => accent };
