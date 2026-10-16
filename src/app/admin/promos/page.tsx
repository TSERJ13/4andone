"use client";

import React from 'react';
import { Tag } from 'lucide-react';
import PromoCodesManager from '@/components/admin/PromoCodesManager';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

/** Promo codes: create, switch off, switch on and delete the codes people type on the Earn Premium page. */
export default function AdminPromosPage() {
  return (
    <div className="animate-in" style={{ width: '100%', maxWidth: 1400, margin: '0 auto' }}>
      <AdminPageHeader icon={<Tag size={22} />} title="Promo Codes" subtitle="Free Premium codes: create, turn on or off, and delete" />
      <PromoCodesManager />
    </div>
  );
}
