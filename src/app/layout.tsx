export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Root layout just passes through children
  // Locale validation is handled in [locale]/layout.tsx
  return children;
}