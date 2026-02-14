import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Terra30 — Carbon Credit Platform for Farmers",
  description:
    "Verify your identity, onboard your farm, and unlock carbon credit revenue with AI-powered analysis.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen map-shell text-body text-white">
        {children}
      </body>
    </html>
  );
}
