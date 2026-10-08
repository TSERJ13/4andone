"use client";

import React, { useRef } from 'react';
import Link from 'next/link';
import { Play, Pause, ChevronLeft, ChevronRight } from 'lucide-react';

export interface YtShelfItem {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  href?: string;
  type?: 'album' | 'video' | 'playlist' | 'style';
  onPlay?: () => void;
  isPlaying?: boolean;
}

interface YtShelfProps {
  title: string;
  subtitle?: string;
  items: YtShelfItem[];
  aspectRatio?: 'square' | 'wide';
}

export default function YtShelf({
  title,
  subtitle,
  items,
  aspectRatio = 'square',
}: YtShelfProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = direction === 'left' ? -600 : 600;
    scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
  };

  return (
    <section className="yt-shelf-section">
      <div className="yt-section-header">
        <div className="yt-section-header-left">
          <h2 className="yt-section-title">{title}</h2>
          {subtitle && <p className="yt-section-subtitle">{subtitle}</p>}
        </div>
        <div className="yt-section-header-right">
          <div className="yt-nav-arrows">
            <button
              type="button"
              className="yt-arrow-btn"
              onClick={() => handleScroll('left')}
              aria-label="Scroll left"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              className="yt-arrow-btn"
              onClick={() => handleScroll('right')}
              aria-label="Scroll right"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="yt-shelf-scroll-container" ref={scrollRef}>
        <div className="yt-shelf-row">
          {items.map((item) => {
            const content = (
              <div
                className={`yt-shelf-card ${aspectRatio === 'wide' ? 'wide' : 'square'}`}
                onClick={item.onPlay}
              >
                <div className="yt-shelf-img-box">
                  <img
                    src={item.imageUrl || '/logo-square.jpg'}
                    alt={item.title}
                    className="yt-shelf-img"
                  />
                  <div className="yt-shelf-play-overlay">
                    <button type="button" className="yt-shelf-play-btn">
                      {item.isPlaying ? (
                        <Pause size={22} fill="#ffffff" color="#ffffff" />
                      ) : (
                        <Play size={22} fill="#ffffff" color="#ffffff" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="yt-shelf-meta">
                  <h3 className="yt-shelf-card-title">{item.title}</h3>
                  {item.subtitle && <p className="yt-shelf-card-sub">{item.subtitle}</p>}
                </div>
              </div>
            );

            if (item.href) {
              return (
                <Link key={item.id} href={item.href} className="yt-shelf-card-link">
                  {content}
                </Link>
              );
            }

            return <React.Fragment key={item.id}>{content}</React.Fragment>;
          })}
        </div>
      </div>
    </section>
  );
}
