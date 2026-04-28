import type { Metadata } from "next";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import "./globals.css";
import Toast from "@/components/Toast";

export const metadata: Metadata = {
  title: "ReelTunes — Save songs from any short video",
  description:
    "Paste a link from Instagram, YouTube, Facebook, Reddit, Pinterest and more — instantly grab the audio or find the original song. No account, no clutter.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="background-grid" aria-hidden />
        <div className="background-orb background-orb-left" aria-hidden />
        <div className="background-orb background-orb-right" aria-hidden />
        <div className="background-orb background-orb-bottom" aria-hidden />
        <ServiceWorkerRegistration />
        <Toast />
        {children}
      </body>
    </html>
  );
}
