"use client";

import React from 'react';
import { Crown } from 'lucide-react';
import SubscriptionManager from '@/components/admin/SubscriptionManager';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

/** Premium members: who has Premium, how they got it (PayPal, gift, promo, invite) and giving or removing it. */
export default function AdminPremiumPage() {
  return (
    <div className="animate-in" style={{ width: '100%', maxWidth: 1400, margin: '0 auto' }}>
      <AdminPageHeader icon={<Crown size={22} />} title="Premium" subtitle="Premium members: paying, gifted and free. Give, extend or remove Premium." />
      <SubscriptionManager />
    </div>
  );
}
