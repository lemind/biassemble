import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Biassemble API",
  description: "Biassemble reflection flow backend",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}