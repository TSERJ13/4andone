"use client";

import React from 'react';
import { Coins, ExternalLink } from 'lucide-react';
import AdSenseStatsCard from "@/components/admin/AdSenseStatsCard";
import AdminPageHeader from "@/components/admin/AdminPageHeader";

// Earnings from ads. Premium members and promo codes have their own pages (Money → Premium, Promo Codes).
export default function AdminEarnPage() {
  return (
    <div className="animate-in" style={{ width: '100%', maxWidth: 1400, margin: '0 auto' }}>
      <AdminPageHeader icon={<Coins size={22} />} title="Earn" subtitle="What the ads earn">
        <a href="https://www.google.com/adsense" target="_blank" rel="noopener noreferrer" className="ap-btn">
          AdSense console <ExternalLink size={14} />
        </a>
      </AdminPageHeader>
      <AdSenseStatsCard />
    </div>
  );
}
