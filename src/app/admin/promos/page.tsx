"use client";

import React from 'react';
import { Tag } from 'lucide-react';
import PromoCodesManager from "@/components/admin/PromoCodesManager";
import AdminPageHeader from "@/components/admin/AdminPageHeader";

export default function AdminPromosPage() {
  return (
    <div className="promos-page animate-in">
      <AdminPageHeader
        icon={<Tag size={22} />}
        title="Promo Codes & Discounts"
        subtitle="შექმენით, მართეთ და წაშალეთ პრომო კოდები (აქტივაციის ლიმიტები, ხანგრძლივობა, სტატუსი)"
      />

      <div className="promos-content">
        <PromoCodesManager />
      </div>

      <style jsx>{`
        .promos-page { padding: 0; max-width: 1400px; margin: 0 auto; width: 100%; }
        .promos-content { display: flex; flex-direction: column; gap: 24px; }
      `}</style>
    </div>
  );
}
