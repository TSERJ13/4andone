"use client";

import React from 'react';

export default function Logo({ size = 54, className = "" }: { size?: number, className?: string }) {
  return (
    <img 
      src="/logo-3d.png" 
      alt="4and.one Music" 
      style={{ height: `${size}px`, width: 'auto', objectFit: 'contain' }}
      className={`brand-logo-3d ${className}`}
    />
  );
}
