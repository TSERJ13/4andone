import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "4and.one Admin",
  manifest: null, // Removes the root web manifest link
  appleWebApp: {
    capable: true,
    title: "4and.one Admin",
    statusBarStyle: "black-translucent",
  }
};

export default function SaLoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
