import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TrueBook — Appointment Booking for SMBs",
  description: "Simple, reliable appointment booking for small businesses. Part of TrueSuite by Neptune Angels.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
