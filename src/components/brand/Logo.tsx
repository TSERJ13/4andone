"use client";

import React from 'react';

const Logo = ({ size = 32, className = "" }: { size?: number, className?: string }) => {
  const green = "#1db954";
  const white = "#ffffff";

  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 120 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ overflow: 'visible' }}
    >
      <defs>
        <filter id="logoGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Reconstructing the core '4and.one' brand mark in a stable, sharp SVG format. */}
      {/* 4-Note Graphical Element */}
      <g filter="url(#logoGlow)">
        {/* Note Stem & Flag */}
        <path d="M48 20 V75" stroke={green} strokeWidth="8" strokeLinecap="round" />
        <path d="M48 22 C65 22 70 35 65 45" stroke={green} strokeWidth="8" strokeLinecap="round" />
        
        {/* '4' Crossbar and Triangle */}
        <path d="M48 55 L22 55 L48 25" stroke={green} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        
        {/* Note Head */}
        <ellipse cx="40" cy="78" rx="14" ry="10" fill={green} transform="rotate(-15 40 78)" />
      </g>

      {/* Brand Typography (Abstracted for stability) */}
      <text x="64" y="52" fill={white} fontSize="24" fontWeight="900" fontFamily="Inter, system-ui, sans-serif" letterSpacing="-1">and.one</text>
      <text x="64" y="78" fill={green} fontSize="20" fontWeight="900" fontFamily="Inter, system-ui, sans-serif" letterSpacing="-1" filter="url(#logoGlow)">Music</text>
    </svg>
  );
};

export default Logo;
