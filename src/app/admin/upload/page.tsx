"use client";

import React from 'react';
import { Upload } from 'lucide-react';
import BulkUpload from '@/components/admin/BulkUpload';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

/** Bulk music upload. Lives on its own page now (it used to fill the whole Overview). ?album=<slug> preselects an album. */
export default function AdminUploadPage() {
  return (
    <div className="animate-in">
      <AdminPageHeader
        icon={<Upload size={22} />}
        title="Upload Music"
        subtitle="Add many tracks at once: pick the album, artist and dance style, then drop the audio files."
      />
      <section className="glass" style={{ padding: 'clamp(14px, 3vw, 28px)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.06)' }}>
        <BulkUpload />
      </section>
    </div>
  );
}
