import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { BRAND } from "@/lib/brand";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: BRAND.title },
      { name: "description", content: BRAND.description },
      { name: "theme-color", content: "#fafaf9" },
      { property: "og:title", content: BRAND.title },
      { property: "og:description", content: BRAND.description },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "fa_IR" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        // فقط سه وزنی که مقیاس تایپوگرافی واقعاً استفاده می‌کند. پیش‌تر
        // ۷۰۰ و ۸۰۰ هم بار می‌شدند، در حالی که پس از حذف font-extrabold
        // هیچ عنصری آن‌ها را نمی‌خواهد — دو فایل فونت فارسی اضافه روی
        // هر بازدید.
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600&display=swap",
      },
    ],
  }),
  component: () => (
    <html lang="fa" dir="rtl" className="antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="bg-bg text-fg">
        {/*
          پرش به محتوا (WCAG 2.4.1). هر صفحه ۷ لینک ناوبری قبل از محتوا
          دارد؛ کاربر کیبورد باید بتواند ردشان کند. فقط هنگام فوکوس
          دیده می‌شود.
        */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:right-3 focus:z-50 focus:rounded-sm focus:bg-fg focus:px-4 focus:py-2.5 focus:text-sm focus:font-medium focus:text-bg"
        >
          پرش به محتوای اصلی
        </a>
        <PreviewHostBridge />
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
