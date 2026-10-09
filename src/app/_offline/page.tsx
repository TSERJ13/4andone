"use client";

import React from 'react';
import OfflineHub from '@/components/offline/OfflineHub';

export default function OfflineFallbackPage() {
  return <OfflineHub standalone={true} />;
}
