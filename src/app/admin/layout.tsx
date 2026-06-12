import { Metadata } from 'next';
import AdminLayoutClient from './AdminLayoutClient';

export const metadata: Metadata = {
  title: "4and.one Admin",
  manifest: null, // Overrides and removes the root manifest!
  appleWebApp: {
    capable: true,
    title: "4and.one Admin",
    statusBarStyle: "black-translucent",
  }
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
