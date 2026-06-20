/**
 * Centralized site configuration — single source of truth for the public URL,
 * brand identity, and asset paths used across emails, OG metadata, and APIs.
 *
 * Override per-environment via `PUBLIC_SITE_URL` env var (e.g. for staging).
 */

const RAW_URL = process.env.PUBLIC_SITE_URL || "https://myla.sa";

export const SITE = {
  /** Primary canonical URL — no trailing slash */
  URL: RAW_URL.replace(/\/+$/, ""),
  /** Bare domain, e.g. "myla.sa" — used for display in footers and copy */
  DOMAIN: RAW_URL.replace(/^https?:\/\//, "").replace(/\/.*$/, ""),
  /** Brand name (Arabic) */
  BRAND_AR: "Myla",
  /** Brand name (English) */
  BRAND_EN: "Myla",
  /** Support email shown to customers */
  SUPPORT_EMAIL: process.env.SUPPORT_EMAIL || "info@myla.sa",
  /** No-reply sender used by SMTP2GO */
  NOREPLY_EMAIL: process.env.EMAIL_SENDER || "noreply@myla.sa",
  /** Internal-only emails (auto-generated for phone-only signups) */
  PHONE_EMAIL_DOMAIN: "myla.sa",
} as const;

export const ASSETS = {
  LOGO_SQUARE:  `${SITE.URL}/rf-logo.png`,
  LOGO_LIGHT:   `${SITE.URL}/rf-logo.png`,
  LOGO_DARK:    `${SITE.URL}/rf-logo.png`,
  BRAND_LOGO:   `${SITE.URL}/rf-logo.png`,
  EMAIL_BANNER: `${SITE.URL}/rf-logo.png`,
  OG_COVER:     `${SITE.URL}/rf-logo.png`,
} as const;

export const ROUTES = {
  HOME:     `${SITE.URL}/`,
  PRODUCTS: `${SITE.URL}/products`,
  ORDERS:   `${SITE.URL}/orders`,
  ADMIN:    `${SITE.URL}/admin`,
  LOGIN:    `${SITE.URL}/login`,
} as const;
