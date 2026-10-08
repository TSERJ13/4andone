"use client";

import React from 'react';

interface YtFilterChipsProps {
  categories: { id: string; name: string }[];
  activeCategory: string;
  onSelectCategory: (id: string) => void;
}

export default function YtFilterChips({
  categories,
  activeCategory,
  onSelectCategory,
}: YtFilterChipsProps) {
  return (
    <div className="yt-filter-chips-container">
      <div className="yt-filter-chips-scroll">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              className={`yt-chip-btn ${isActive ? 'active' : ''}`}
              onClick={() => onSelectCategory(cat.id)}
            >
              {cat.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
