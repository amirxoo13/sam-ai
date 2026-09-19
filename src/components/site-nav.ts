export type NavKey = "home" | "ask" | "forms" | "residency" | "sources" | "about" | "contact";

export const SITE_NAV: { to: "/" | "/ask" | "/forms" | "/residency" | "/sources" | "/about" | "/contact"; label: string; key: NavKey }[] = [
  { to: "/", label: "خانه", key: "home" },
  { to: "/ask", label: "پرسش حقوقی", key: "ask" },
  { to: "/residency", label: "پرسش اقامتی", key: "residency" },
  { to: "/forms", label: "برگه‌ها", key: "forms" },
  { to: "/sources", label: "منابع", key: "sources" },
  { to: "/about", label: "درباره", key: "about" },
  { to: "/contact", label: "تماس", key: "contact" },
];
