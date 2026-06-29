import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Sistem Absensi Mahasiswa RFID",
    template: "%s | Sistem Absensi Mahasiswa RFID",
  },
  description:
    "Dashboard administrasi untuk sistem absensi mahasiswa berbasis RFID dengan Next.js dan Neon PostgreSQL.",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full font-sans text-foreground">{children}</body>
    </html>
  );
}
