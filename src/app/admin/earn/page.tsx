"use client";

import React, { useState } from 'react';
import { Coins, ExternalLink, Crown, Tag, BarChart3, Layers } from 'lucide-react';
import Link from 'next/link';
import AdSenseStatsCard from "@/components/admin/AdSenseStatsCard";
import SubscriptionManager from "@/components/admin/SubscriptionManager";
import PromoCodesManager from "@/components/admin/PromoCodesManager";
import AdminPageHeader from "@/components/admin/AdminPageHeader";

export default function AdminEarnPage() {
  const [activeTab, setActiveTab] = useState<'members' | 'promos' | 'adsense' | 'all'>('members');

  return (
    <div className="earn-page animate-in">
      <AdminPageHeader icon={<Coins size={22} />} title="Earn & Premium" subtitle="Premium members, promo codes and ad earnings">
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Link href="/admin/promos" className="ap-btn" style={{ borderColor: 'rgba(56, 189, 248, 0.4)', color: '#38bdf8' }}>
            <Tag size={14} /> <span>Promo Codes გვერდი</span>
          </Link>
          <a href="https://www.google.com/adsense" target="_blank" rel="noopener noreferrer" className="ap-btn">
            AdSense console <ExternalLink size={14} />
          </a>
        </div>
      </AdminPageHeader>

      {/* View Tabs */}
      <div className="earn-tabs glass">
        <button
          type="button"
          className={`earn-tab ${activeTab === 'members' ? 'active' : ''}`}
          onClick={() => setActiveTab('members')}
        >
          <Crown size={15} />
          <span>Subscriptions & Members</span>
        </button>

        <button
          type="button"
          className={`earn-tab ${activeTab === 'promos' ? 'active' : ''}`}
          onClick={() => setActiveTab('promos')}
        >
          <Tag size={15} />
          <span>Promo Codes Manager</span>
        </button>

        <button
          type="button"
          className={`earn-tab ${activeTab === 'adsense' ? 'active' : ''}`}
          onClick={() => setActiveTab('adsense')}
        >
          <BarChart3 size={15} />
          <span>Google AdSense</span>
        </button>

        <button
          type="button"
          className={`earn-tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          <Layers size={15} />
          <span>All Combined</span>
        </button>
      </div>

      <div className="earn-content">
        {(activeTab === 'members' || activeTab === 'all') && <SubscriptionManager />}
        {(activeTab === 'promos' || activeTab === 'all') && <PromoCodesManager />}
        {(activeTab === 'adsense' || activeTab === 'all') && <AdSenseStatsCard />}
      </div>

      <style jsx>{`
        .earn-page { padding: 0; max-width: 1400px; margin: 0 auto; width: 100%; }
        .earn-tabs {
          display: flex;
          gap: 6px;
          padding: 6px;
          border-radius: 14px;
          margin-bottom: 20px;
          overflow-x: auto;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .earn-tab {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 8px 16px;
          border-radius: 10px;
          background: transparent;
          border: none;
          color: #a1a1aa;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s;
        }
        .earn-tab:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.06);
        }
        .earn-tab.active {
          background: rgba(56, 189, 248, 0.15);
          color: #38bdf8;
          border: 1px solid rgba(56, 189, 248, 0.35);
        }
        .earn-content { display: flex; flex-direction: column; gap: 24px; }
      `}</style>
    </div>
  );
}
