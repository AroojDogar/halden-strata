import type { Metadata, Viewport } from "next";
import "./globals.css";
import Effects from "@/components/Effects";

export const metadata: Metadata = {
  title: "Halden Strata GT",
  description:
    "An immersive scroll-driven 3D showroom for the Halden Strata GT, a concept electric grand tourer.",
};

export const viewport: Viewport = {
  themeColor: "#06080b",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@500;600&family=Big+Shoulders+Display:wght@700;800;900&display=swap"
        />
      </head>
      <body className="font-body antialiased">
        {children}
        {/* Custom cursor elements, driven by lib/fx/cursor.ts */}
        <div data-cursor-dot aria-hidden="true" />
        <div data-cursor-ring aria-hidden="true">
          <span data-cursor-label>DRAG</span>
        </div>
        <Effects />
      </body>
    </html>
  );
}
