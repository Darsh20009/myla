import { useEffect } from "react";

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: string;
  noIndex?: boolean;
  productSchema?: {
    name: string;
    nameEn?: string;
    description?: string;
    image?: string;
    price?: string | number;
    sku?: string;
    brand?: string;
    availability?: "InStock" | "OutOfStock" | "PreOrder";
    reviewCount?: number;
    ratingValue?: number;
  };
  breadcrumbs?: { name: string; url: string }[];
}

const BASE_URL = "https://myla.sa";
const BRAND = "Myla — Abayas by HMBL";
const BRAND_AR = "Myla — عبايات HMBL";
const DEFAULT_IMG = `${BASE_URL}/rf-logo.png`;
const PHONE = "+966507378047";
const ADDRESS = "الرياض، المملكة العربية السعودية";
const INSTAGRAM = "https://www.instagram.com/myla.abayas";
const TWITTER = "https://twitter.com/myla_abayas";

function setMeta(name: string, content: string, attr: "name" | "property" = "name") {
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.content = content;
}

function setLink(rel: string, href: string) {
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

function setJsonLd(id: string, data: object) {
  let el = document.getElementById(id) as HTMLScriptElement;
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

export function SEO({
  title,
  description,
  keywords,
  canonical,
  ogImage,
  ogType = "website",
  noIndex = false,
  productSchema,
  breadcrumbs,
}: SEOProps) {
  const fullTitle = title ? `${title} | ${BRAND_AR}` : `${BRAND_AR} — عبايات فاخرة من الرياض`;
  const fullDescription = description ||
    "Myla — متجر عبايات فاخرة من الرياض. تشكيلات راقية من العبايات والقفاطين والأطقم النسائية بتصاميم حصرية. شحن سريع داخل المملكة.";
  const img = ogImage || DEFAULT_IMG;
  const url = canonical ? `${BASE_URL}${canonical}` : BASE_URL;

  useEffect(() => {
    document.title = fullTitle;

    setMeta("description", fullDescription);
    setMeta("keywords", keywords ||
      "Myla, Myla, عبايات, عبايات فاخرة, عبايات سعودية, عبايات رياض, قفاطين, أطقم نسائية, عباية, HMBL, abayas, luxury abayas, Saudi Arabia, Riyadh, myla abayas");
    setLink("canonical", url);
    setMeta("robots", noIndex ? "noindex, nofollow" : "index, follow, max-image-preview:large, max-snippet:-1", "name");
    setMeta("theme-color", "#2C1810", "name");
    setMeta("author", BRAND_AR, "name");
    setMeta("language", "ar", "name");

    // Open Graph
    setMeta("og:title", fullTitle, "property");
    setMeta("og:description", fullDescription, "property");
    setMeta("og:image", img, "property");
    setMeta("og:image:width", "1200", "property");
    setMeta("og:image:height", "630", "property");
    setMeta("og:url", url, "property");
    setMeta("og:type", ogType, "property");
    setMeta("og:site_name", BRAND_AR, "property");
    setMeta("og:locale", "ar_SA", "property");

    // Twitter
    setMeta("twitter:card", "summary_large_image", "name");
    setMeta("twitter:title", fullTitle, "name");
    setMeta("twitter:description", fullDescription, "name");
    setMeta("twitter:image", img, "name");
    setMeta("twitter:site", "@myla.abayas", "name");
    setMeta("twitter:creator", "@myla.abayas", "name");

    // ── Organization schema ──────────────────────────────────────────────────────
    setJsonLd("ld-org", {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${BASE_URL}/#organization`,
      "name": "Myla — Abayas by HMBL",
      "alternateName": ["Myla", "Myla Abayas", "Myla HMBL", "Myla عبايات"],
      "url": BASE_URL,
      "logo": {
        "@type": "ImageObject",
        "url": `${BASE_URL}/rf-logo.png`,
        "width": 200,
        "height": 200,
      },
      "image": `${BASE_URL}/rf-logo.png`,
      "email": "info@myla.sa",
      "telephone": PHONE,
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "الرياض",
        "addressRegion": "منطقة الرياض",
        "addressCountry": "SA",
      },
      "areaServed": "SA",
      "description": "Myla — متجر عبايات فاخرة من الرياض. تصاميم حصرية من HMBL للمرأة السعودية.",
      "foundingLocation": "الرياض، المملكة العربية السعودية",
      "sameAs": [INSTAGRAM, TWITTER, `https://www.tiktok.com/@myla.abayas`, `https://www.snapchat.com/add/myla.abayas`],
      "contactPoint": {
        "@type": "ContactPoint",
        "telephone": PHONE,
        "contactType": "customer service",
        "availableLanguage": ["Arabic", "English"],
        "contactOption": "TollFree",
      },
    });

    // ── WebSite schema (enables Sitelinks Search Box in Google) ──────────────
    setJsonLd("ld-website", {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${BASE_URL}/#website`,
      "url": BASE_URL,
      "name": "Myla — Abayas by HMBL",
      "description": fullDescription,
      "inLanguage": "ar",
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": `${BASE_URL}/products?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
      "publisher": { "@id": `${BASE_URL}/#organization` },
    });

    // ── LocalBusiness (helps appear in Google Maps / local search) ────────────
    setJsonLd("ld-local", {
      "@context": "https://schema.org",
      "@type": ["ClothingStore", "OnlineStore"],
      "@id": `${BASE_URL}/#localbusiness`,
      "name": "Myla — Abayas by HMBL",
      "image": `${BASE_URL}/rf-logo.png`,
      "url": BASE_URL,
      "telephone": PHONE,
      "email": "info@myla.sa",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "الرياض",
        "addressRegion": "منطقة الرياض",
        "addressCountry": "SA",
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": 24.7136,
        "longitude": 46.6753,
      },
      "openingHoursSpecification": {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],
        "opens": "09:00",
        "closes": "23:00",
      },
      "priceRange": "$$$$",
      "servesCuisine": undefined,
      "hasMap": `https://maps.google.com/?q=Riyadh+Saudi+Arabia`,
      "paymentAccepted": "Credit Card, Apple Pay, STC Pay, Tabby, Tamara",
      "currenciesAccepted": "SAR",
      "sameAs": [INSTAGRAM, TWITTER],
      "description": "متجر عبايات فاخرة في الرياض — تصاميم حصرية من HMBL",
    });

    // ── Breadcrumbs ───────────────────────────────────────────────────────────
    if (breadcrumbs && breadcrumbs.length > 0) {
      setJsonLd("ld-breadcrumb", {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": breadcrumbs.map((b, i) => ({
          "@type": "ListItem",
          "position": i + 1,
          "name": b.name,
          "item": b.url.startsWith("http") ? b.url : `${BASE_URL}${b.url}`,
        })),
      });
    }

    // ── Product schema ────────────────────────────────────────────────────────
    if (productSchema) {
      setJsonLd("ld-product", {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": productSchema.name,
        "alternateName": productSchema.nameEn,
        "description": productSchema.description,
        "image": productSchema.image || img,
        "brand": {
          "@type": "Brand",
          "name": productSchema.brand || "Myla",
          "logo": `${BASE_URL}/rf-logo.png`,
        },
        "sku": productSchema.sku,
        "offers": {
          "@type": "Offer",
          "url": url,
          "priceCurrency": "SAR",
          "price": productSchema.price?.toString() || "0",
          "availability": `https://schema.org/${productSchema.availability || "InStock"}`,
          "seller": {
            "@type": "Organization",
            "name": "Myla",
            "@id": `${BASE_URL}/#organization`,
          },
          "priceValidUntil": new Date(new Date().getFullYear() + 1, 11, 31).toISOString().split("T")[0],
          "shippingDetails": {
            "@type": "OfferShippingDetails",
            "shippingRate": {
              "@type": "MonetaryAmount",
              "value": "30",
              "currency": "SAR",
            },
            "shippingDestination": {
              "@type": "DefinedRegion",
              "addressCountry": "SA",
            },
          },
        },
        ...(productSchema.reviewCount && productSchema.ratingValue ? {
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": productSchema.ratingValue,
            "reviewCount": productSchema.reviewCount,
            "bestRating": 5,
            "worstRating": 1,
          },
        } : {}),
      });
    } else {
      const existing = document.getElementById("ld-product");
      if (existing) existing.remove();
    }

    return () => {
      document.title = `${BRAND_AR} — عبايات فاخرة`;
    };
  }, [fullTitle, fullDescription, keywords, url, img, ogType, noIndex, productSchema, breadcrumbs]);

  return null;
}
