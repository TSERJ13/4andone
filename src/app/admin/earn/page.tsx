"use client";

import React from 'react';
import { Coins, ExternalLink } from 'lucide-react';
import AdSenseStatsCard from "@/components/admin/AdSenseStatsCard";
import SubscriptionManager from "@/components/admin/SubscriptionManager";
import PromoCodesManager from "@/components/admin/PromoCodesManager";
import AdminPageHeader from "@/components/admin/AdminPageHeader";

// Money in one place: Premium members first (what the studio sells), then promo codes (free Premium), then ad earnings.
// Invites ("who invited whom") live under Affiliates.
export default function AdminEarnPage() {
  return (
    <div className="earn-page animate-in">
      <AdminPageHeader icon={<Coins size={22} />} title="Earn & Premium" subtitle="Premium members, promo codes and ad earnings">
        <a href="https://www.google.com/adsense" target="_blank" rel="noopener noreferrer" className="ap-btn">
          AdSense console <ExternalLink size={14} />
        </a>
      </AdminPageHeader>

      <div className="earn-content">
        <SubscriptionManager />
        <PromoCodesManager />
        <AdSenseStatsCard />
      </div>

      <style jsx>{`
        .earn-page { padding: 0; max-width: 1400px; margin: 0 auto; width: 100%; }
        .earn-content { display: flex; flex-direction: column; gap: 24px; }
      `}</style>
    </div>
  );
}
