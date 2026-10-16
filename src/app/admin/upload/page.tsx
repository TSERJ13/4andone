"use client";

import React from 'react';
import { Upload } from 'lucide-react';
import BulkUpload from '@/components/admin/BulkUpload';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

/**
 * Music upload on its own full-width page. On a wide screen the settings (album, artist, style, tags, cover) stay on the
 * left while the drop area and the track queue use the rest, so nothing needs scrolling to reach. ?album=<slug> preselects an album.
 */
export default function AdminUploadPage() {
  return (
    <div className="animate-in" style={{ width: '100%', maxWidth: 1600, margin: '0 auto' }}>
      <AdminPageHeader
        icon={<Upload size={22} />}
        title="Upload Music"
        subtitle="Pick the album, drop the audio files, check the queue, upload. Many tracks at once."
      />
      <BulkUpload />
    </div>
  );
}
