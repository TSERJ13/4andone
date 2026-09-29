"use client";

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useStudio } from '@/components/admin/StudioProvider';
import { Album } from '@/types/album';
import { 
  Disc, Plus, Edit3, Trash2, ArrowUp, ArrowDown, ExternalLink, 
  Upload, Check, X, Sparkles, Music2, Eye, Flame, Layers
} from 'lucide-react';
import ConfirmModal from '@/components/admin/ConfirmModal';

const ALL_LATIN_STYLES = ['Samba', 'Cha-Cha-Cha', 'Rumba', 'Paso Doble', 'Jive'];
const ALL_STANDARD_STYLES = ['Slow Waltz', 'Tango', 'Viennese Waltz', 'Slow Foxtrot', 'Quickstep'];

const PRESET_THEMES = [
  { name: 'Crimson Velvet', primary: '#e11d48', secondary: '#be123c' },
  { name: 'Amber Gold', primary: '#f59e0b', secondary: '#d97706' },
  { name: 'Emerald Live', primary: '#22c55e', secondary: '#10b981' },
  { name: 'Royal Magenta', primary: '#d946ef', secondary: '#8b5cf6' },
  { name: 'Ocean Electric', primary: '#0ea5e9', secondary: '#2563eb' },
  { name: 'Flame Sunset', primary: '#f97316', secondary: '#ea580c' },
];

export default function AdminAlbumsPage() {
  const { albums, addAlbum, updateAlbum, deleteAlbum, reorderAlbums, tracks } = useStudio();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [slug, setSlug] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [badge, setBadge] = useState('LIVE SOUNDS COLLECTION');
  const [coverUrl, setCoverUrl] = useState('');
  const [themeColor, setThemeColor] = useState('#e11d48');
  const [secondaryColor, setSecondaryColor] = useState('#be123c');
  const [program, setProgram] = useState<'Latin' | 'Standard' | 'Both'>('Latin');
  const [allowedStyles, setAllowedStyles] = useState<string[]>(ALL_LATIN_STYLES);
  const [tagsInput, setTagsInput] = useState('');

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; album: Album | null }>({
    isOpen: false,
    album: null,
  });

  const resetForm = () => {
    setTitle('');
    setArtist('');
    setSlug('');
    setSubtitle('');
    setBadge('LIVE SOUNDS COLLECTION');
    setCoverUrl('');
    setThemeColor('#e11d48');
    setSecondaryColor('#be123c');
    setProgram('Latin');
    setAllowedStyles(ALL_LATIN_STYLES);
    setTagsInput('');
    setEditingAlbum(null);
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (album: Album) => {
    setEditingAlbum(album);
    setTitle(album.title);
    setArtist(album.artist || album.title);
    setSlug(album.slug);
    setSubtitle(album.subtitle || album.description || '');
    setBadge(album.badge || 'LIVE SOUNDS COLLECTION');
    setCoverUrl(album.coverUrl || '');
    setThemeColor(album.themeColor || '#e11d48');
    setSecondaryColor(album.secondaryColor || '#be123c');
    setProgram(album.program || 'Both');
    setAllowedStyles(album.allowedStyles || (album.program === 'Latin' ? ALL_LATIN_STYLES : ALL_STANDARD_STYLES));
    setTagsInput((album.tags || []).join(', '));
    setIsModalOpen(true);
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!editingAlbum) {
      // Auto-generate slug
      const generated = val
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      setSlug(generated);
      if (!artist) setArtist(val);
    }
  };

  const handleProgramChange = (prog: 'Latin' | 'Standard' | 'Both') => {
    setProgram(prog);
    if (prog === 'Latin') {
      setAllowedStyles(ALL_LATIN_STYLES);
    } else if (prog === 'Standard') {
      setAllowedStyles(ALL_STANDARD_STYLES);
    } else {
      setAllowedStyles([...ALL_LATIN_STYLES, ...ALL_STANDARD_STYLES]);
    }
  };

  const toggleStyle = (styleName: string) => {
    setAllowedStyles(prev => 
      prev.includes(styleName) ? prev.filter(s => s !== styleName) : [...prev, styleName]
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setIsUploading(true);
    try {
      const signRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, fileType: file.type || 'image/jpeg' }),
      });
      if (!signRes.ok) throw new Error('Failed to get signed upload URL');
      const { uploadUrl, publicUrl } = await signRes.json();

      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'image/jpeg' },
        body: file,
      });
      if (!uploadRes.ok) throw new Error('Direct R2 upload failed');

      setCoverUrl(publicUrl);
    } catch (err: any) {
      alert(`Cover upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return alert('Album Title is required');
    if (!slug.trim()) return alert('URL Slug is required');

    const parsedTags = tagsInput
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(Boolean);

    if (!parsedTags.includes(slug.toLowerCase())) {
      parsedTags.push(slug.toLowerCase());
    }

    const payload: Partial<Album> = {
      title: title.trim(),
      artist: (artist || title).trim(),
      slug: slug.trim(),
      subtitle: subtitle.trim(),
      description: subtitle.trim(),
      badge: (badge || 'LIVE SOUNDS COLLECTION').trim(),
      coverUrl: coverUrl.trim() || '/georgie-musheev.jpg',
      themeColor,
      secondaryColor,
      gradient: `linear-gradient(90deg, ${themeColor}, ${secondaryColor})`,
      program,
      allowedStyles,
      tags: parsedTags,
    };

    if (editingAlbum) {
      await updateAlbum(editingAlbum.id, payload);
    } else {
      await addAlbum({ ...payload, orderIndex: 0 });
    }

    setIsModalOpen(false);
    resetForm();
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= albums.length) return;

    const newOrder = [...albums];
    const [moved] = newOrder.splice(index, 1);
    newOrder.splice(targetIdx, 0, moved);

    await reorderAlbums(newOrder.map(a => a.id));
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.album) return;
    await deleteAlbum(deleteModal.album.id);
    setDeleteModal({ isOpen: false, album: null });
  };

  // Helper to count tracks belonging to an album
  const getAlbumTrackCount = (album: Album) => {
    const albumSlug = album.slug.toLowerCase();
    const albumTitle = album.title.toLowerCase();
    const albumTags = (album.tags || []).map(t => t.toLowerCase());

    return tracks.filter(t => {
      const tAlbum = (t.album || '').toLowerCase();
      const tArtist = (t.artist || '').toLowerCase();
      const hasTag = t.tags?.some(tag => {
        const l = tag.toLowerCase();
        return albumTags.includes(l) || l.includes(albumSlug) || albumTitle.includes(l);
      });
      return tAlbum.includes(albumSlug) || tAlbum.includes(albumTitle) || tArtist.includes(albumTitle) || hasTag;
    }).length;
  };

  return (
    <div className="admin-albums-page animate-in">
      {/* Top Header */}
      <div className="page-header">
        <div className="title-group">
          <h1>Album Builder &amp; Collections</h1>
          <p className="subtitle">
            Create, customize, and reorder dynamic albums without touching any code. Albums update automatically on the homepage carousel and dedicate pages.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Link href="/admin/dashboard" className="btn-bulk-link">
            <Upload size={16} />
            <span>Bulk Upload Tracks</span>
          </Link>
          <button className="btn-primary-create" onClick={openCreateModal}>
            <Plus size={18} />
            <span>Create New Album</span>
          </button>
        </div>
      </div>

      {/* Overview Stats Bar */}
      <div className="stats-row glass">
        <div className="stat-item">
          <span className="stat-label">Total Albums</span>
          <span className="stat-value">{albums.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Homepage Carousel</span>
          <span className="stat-value text-accent">{albums.length} Slides</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Primary Slide (#1)</span>
          <span className="stat-value text-highlight">{albums[0]?.title || 'None'}</span>
        </div>
      </div>

      {/* Albums Management List */}
      <div className="albums-list">
        {albums.map((album, index) => {
          const trackCount = getAlbumTrackCount(album);
          const isFirst = index === 0;
          const isLast = index === albums.length - 1;

          return (
            <div 
              key={album.id} 
              className="album-card glass"
              style={{
                borderLeftColor: album.themeColor || '#e11d48',
                borderLeftWidth: '5px'
              }}
            >
              {/* Order Controls */}
              <div className="order-controls">
                <button 
                  className="order-btn" 
                  disabled={isFirst} 
                  onClick={() => handleMove(index, 'up')}
                  title="Move Up (Appear earlier in Carousel)"
                >
                  <ArrowUp size={16} />
                </button>
                <span className="order-badge" title="Position in Carousel">#{index + 1}</span>
                <button 
                  className="order-btn" 
                  disabled={isLast} 
                  onClick={() => handleMove(index, 'down')}
                  title="Move Down (Appear later in Carousel)"
                >
                  <ArrowDown size={16} />
                </button>
              </div>

              {/* Cover Image */}
              <div className="album-cover-thumbnail">
                <img 
                  src={album.coverUrl || '/georgie-musheev.jpg'} 
                  alt={album.title} 
                  onError={(e) => { (e.target as HTMLImageElement).src = '/georgie-musheev.jpg'; }}
                />
              </div>

              {/* Album Info */}
              <div className="album-main-info">
                <div className="badge-row">
                  <span 
                    className="pill-badge" 
                    style={{ background: album.gradient || album.themeColor }}
                  >
                    {album.badge || 'LIVE SOUNDS COLLECTION'}
                  </span>
                  <span className={`program-badge ${album.program.toLowerCase()}`}>
                    {album.program}
                  </span>
                </div>
                <h3 className="album-title">{album.title}</h3>
                <p className="album-subtitle">{album.subtitle || album.description}</p>
                <div className="album-meta-row">
                  <span className="meta-pill">
                    <Music2 size={13} />
                    <span>{trackCount} Tracks in Library</span>
                  </span>
                  <span className="meta-pill">
                    <Layers size={13} />
                    <span>{(album.allowedStyles || []).length} Dance Styles</span>
                  </span>
                  <span className="meta-pill slug-pill">
                    <code>/album/{album.slug}</code>
                  </span>
                </div>
              </div>

              {/* Color Swatch */}
              <div className="album-swatch-box" title="Accent Theme Gradient">
                <div 
                  className="swatch-circle" 
                  style={{ background: album.gradient || `linear-gradient(90deg, ${album.themeColor}, ${album.secondaryColor || album.themeColor})` }} 
                />
              </div>

              {/* Action Buttons */}
              <div className="album-actions">
                <Link
                  href={`/admin/dashboard?album=${album.slug}`}
                  className="action-icon-btn upload-tracks-btn"
                  title="Bulk Upload Tracks to this Album"
                >
                  <Upload size={18} />
                </Link>
                <a 
                  href={`/album/${album.slug}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="action-icon-btn preview-btn" 
                  title="Open Public Album Page"
                >
                  <ExternalLink size={18} />
                </a>
                <button 
                  className="action-icon-btn edit-btn" 
                  onClick={() => openEditModal(album)}
                  title="Edit Album Settings"
                >
                  <Edit3 size={18} />
                </button>
                <button 
                  className="action-icon-btn delete-btn" 
                  onClick={() => setDeleteModal({ isOpen: true, album })}
                  title="Delete Album"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content glass animate-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <Disc size={26} style={{ color: themeColor }} />
                <h2>{editingAlbum ? 'Edit Album' : 'Create New Album'}</h2>
              </div>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="modal-form">
              {/* Top Row: Cover Photo & Primary Info */}
              <div className="form-split-grid">
                {/* Left: Cover Photo Upload */}
                <div className="cover-upload-section">
                  <label className="field-label">Album Cover Photo</label>
                  <div 
                    className="cover-dropzone" 
                    onClick={() => fileInputRef.current?.click()}
                    style={{ borderColor: themeColor }}
                  >
                    {coverUrl ? (
                      <img src={coverUrl} alt="Cover Preview" className="cover-img-preview" />
                    ) : (
                      <div className="upload-placeholder">
                        <Upload size={32} />
                        <span>Click or Drag photo here</span>
                        <small>JPG, PNG, WebP (R2 Cloud)</small>
                      </div>
                    )}
                    {isUploading && <div className="uploading-overlay">Uploading...</div>}
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    hidden 
                    accept="image/*" 
                    onChange={handleFileUpload} 
                  />
                  <div className="url-input-fallback">
                    <input 
                      type="text" 
                      placeholder="Or enter image URL (e.g. /georgie-musheev.jpg)" 
                      value={coverUrl} 
                      onChange={e => setCoverUrl(e.target.value)} 
                      className="input-field small"
                    />
                  </div>
                </div>

                {/* Right: Title, Artist, Slug, Badge */}
                <div className="info-fields-section">
                  <div className="field-group">
                    <label className="field-label">Album Title *</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="e.g. Georgie Musheev & 7 Winds" 
                      value={title} 
                      onChange={e => handleTitleChange(e.target.value)}
                      className="input-field"
                    />
                  </div>

                  <div className="field-group">
                    <label className="field-label">Artist / Band Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Georgie Musheev" 
                      value={artist} 
                      onChange={e => setArtist(e.target.value)}
                      className="input-field"
                    />
                  </div>

                  <div className="field-group">
                    <label className="field-label">
                      URL Slug * (გვერდის მისამართი: <code>/album/{slug || '...'}</code>)
                    </label>
                    <input 
                      type="text" 
                      required 
                      placeholder="georgie-musheev" 
                      value={slug} 
                      onChange={e => setSlug(e.target.value)}
                      className="input-field font-mono"
                    />
                  </div>

                  <div className="field-group">
                    <label className="field-label">Badge Label</label>
                    <input 
                      type="text" 
                      placeholder="LIVE SOUNDS COLLECTION" 
                      value={badge} 
                      onChange={e => setBadge(e.target.value)}
                      className="input-field"
                    />
                  </div>
                </div>
              </div>

              {/* Subtitle / Description */}
              <div className="field-group full-width">
                <label className="field-label">Subtitle / Description</label>
                <textarea 
                  rows={2} 
                  placeholder="Short description shown on the carousel card and album header..." 
                  value={subtitle} 
                  onChange={e => setSubtitle(e.target.value)}
                  className="input-field textarea"
                />
              </div>

              {/* Program Discipline Selector */}
              <div className="field-group full-width">
                <label className="field-label">Discipline / Program</label>
                <div className="program-radio-grid">
                  <button 
                    type="button" 
                    className={`program-opt-btn ${program === 'Latin' ? 'active' : ''}`}
                    onClick={() => handleProgramChange('Latin')}
                  >
                    🔥 Latin Only (მხოლოდ ლათინური)
                  </button>
                  <button 
                    type="button" 
                    className={`program-opt-btn ${program === 'Standard' ? 'active' : ''}`}
                    onClick={() => handleProgramChange('Standard')}
                  >
                    🎩 Standard Only (მხოლოდ ევროპული)
                  </button>
                  <button 
                    type="button" 
                    className={`program-opt-btn ${program === 'Both' ? 'active' : ''}`}
                    onClick={() => handleProgramChange('Both')}
                  >
                    ✨ Both Latin &amp; Standard (ორივე)
                  </button>
                </div>
              </div>

              {/* Allowed Dance Styles Selector */}
              <div className="field-group full-width">
                <div className="styles-label-row">
                  <label className="field-label">Selected Dance Styles ({allowedStyles.length} active)</label>
                  <div className="quick-select-links">
                    <button type="button" onClick={() => setAllowedStyles(ALL_LATIN_STYLES)}>All Latin</button>
                    <span>•</span>
                    <button type="button" onClick={() => setAllowedStyles(ALL_STANDARD_STYLES)}>All Standard</button>
                    <span>•</span>
                    <button type="button" onClick={() => setAllowedStyles([...ALL_LATIN_STYLES, ...ALL_STANDARD_STYLES])}>All 10</button>
                  </div>
                </div>
                <div className="styles-chip-selector">
                  {[...ALL_LATIN_STYLES, ...ALL_STANDARD_STYLES].map(styleName => {
                    const isSelected = allowedStyles.includes(styleName);
                    return (
                      <button
                        type="button"
                        key={styleName}
                        className={`style-chip-toggle ${isSelected ? 'selected' : ''}`}
                        onClick={() => toggleStyle(styleName)}
                        style={{
                          borderColor: isSelected ? themeColor : undefined,
                          backgroundColor: isSelected ? `${themeColor}25` : undefined,
                        }}
                      >
                        {isSelected && <Check size={14} />}
                        <span>{styleName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Theme Colors & Presets */}
              <div className="field-group full-width">
                <label className="field-label">Theme Colors &amp; Gradient (ფერის პალიტრა)</label>
                <div className="color-presets-row">
                  {PRESET_THEMES.map(preset => (
                    <button
                      type="button"
                      key={preset.name}
                      className="preset-btn"
                      onClick={() => {
                        setThemeColor(preset.primary);
                        setSecondaryColor(preset.secondary);
                      }}
                      title={preset.name}
                    >
                      <span 
                        className="preset-color-dot" 
                        style={{ background: `linear-gradient(135deg, ${preset.primary}, ${preset.secondary})` }}
                      />
                      <span>{preset.name}</span>
                    </button>
                  ))}
                </div>

                <div className="custom-colors-grid">
                  <div className="color-input-box">
                    <span>Primary Color:</span>
                    <input 
                      type="color" 
                      value={themeColor} 
                      onChange={e => setThemeColor(e.target.value)} 
                    />
                    <code>{themeColor}</code>
                  </div>
                  <div className="color-input-box">
                    <span>Secondary Color:</span>
                    <input 
                      type="color" 
                      value={secondaryColor} 
                      onChange={e => setSecondaryColor(e.target.value)} 
                    />
                    <code>{secondaryColor}</code>
                  </div>
                </div>
              </div>

              {/* Tags / Track Matching Keywords */}
              <div className="field-group full-width">
                <label className="field-label">
                  Tags &amp; Matching Keywords (მძიმით გამოყოფილი თეგები, რომლითაც მუსიკები ავტომატურად ჩაჯდება ამ ალბომში)
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. musheev, 7 winds, georgie musheev" 
                  value={tagsInput} 
                  onChange={e => setTagsInput(e.target.value)} 
                  className="input-field"
                />
              </div>

              {/* Live Preview Box */}
              <div className="live-preview-box glass" style={{ borderColor: themeColor }}>
                <span className="preview-label">LIVE CAROUSEL BANNER PREVIEW</span>
                <div 
                  className="preview-banner"
                  style={{
                    background: `linear-gradient(135deg, ${themeColor}35 0%, rgba(20, 20, 20, 0.85) 100%)`,
                    borderColor: `${themeColor}50`
                  }}
                >
                  <div className="preview-text">
                    <span className="preview-badge" style={{ background: `linear-gradient(90deg, ${themeColor}, ${secondaryColor})` }}>
                      {badge || 'LIVE SOUNDS COLLECTION'}
                    </span>
                    <h4 style={{ background: `linear-gradient(90deg, #ffffff, ${themeColor})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                      {title || 'Album Title'}
                    </h4>
                    <p>{subtitle || 'Album description preview...'}</p>
                    <div className="preview-btn-row">
                      <span className="mini-btn primary" style={{ background: `linear-gradient(90deg, ${themeColor}, ${secondaryColor})` }}>Open Live Album</span>
                      <span className="mini-btn outline">Final Mode</span>
                    </div>
                  </div>
                  <div className="preview-img-box">
                    <img src={coverUrl || '/georgie-musheev.jpg'} alt="Preview" onError={(e) => { (e.target as HTMLImageElement).src = '/georgie-musheev.jpg'; }} />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit" style={{ background: `linear-gradient(90deg, ${themeColor}, ${secondaryColor})` }}>
                  <Check size={18} />
                  <span>{editingAlbum ? 'Save Album Changes' : 'Create Album'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Delete Album"
        message={`Are you sure you want to delete "${deleteModal.album?.title}"? This will remove the album from the homepage carousel and its dedicated page.`}
        confirmText="Yes, Delete Album"
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteModal({ isOpen: false, album: null })}
        variant="danger"
      />

      <style jsx>{`
        .admin-albums-page {
          padding: 24px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
          gap: 20px;
        }

        .title-group h1 {
          font-size: 2rem;
          font-weight: 900;
          letter-spacing: -0.5px;
          margin-bottom: 6px;
        }

        .subtitle {
          color: var(--text-secondary);
          font-size: 0.95rem;
          max-width: 700px;
          line-height: 1.5;
        }

        .btn-primary-create {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 24px;
          border-radius: 14px;
          background: linear-gradient(90deg, #e11d48, #be123c);
          color: white;
          border: none;
          font-weight: 700;
          font-size: 0.95rem;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(225, 29, 72, 0.4);
          transition: transform 0.2s ease;
          flex-shrink: 0;
        }

        .btn-primary-create:hover {
          transform: translateY(-2px);
        }

        .btn-bulk-link {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.05);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.1);
          font-weight: 700;
          font-size: 0.95rem;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .btn-bulk-link:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: #1db954;
          color: #1db954;
          transform: translateY(-2px);
        }

        .stats-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          padding: 20px;
          border-radius: 16px;
          margin-bottom: 30px;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .stat-label {
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-secondary);
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 900;
        }

        .text-accent { color: #f59e0b; }
        .text-highlight { color: #e11d48; }

        .albums-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .album-card {
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 16px 20px;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.03);
          transition: transform 0.2s ease, border-color 0.2s ease;
        }

        .album-card:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .order-controls {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .order-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
          width: 28px;
          height: 28px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .order-btn:disabled {
          opacity: 0.2;
          cursor: not-allowed;
        }

        .order-btn:not(:disabled):hover {
          background: rgba(255, 255, 255, 0.15);
        }

        .order-badge {
          font-size: 0.75rem;
          font-weight: 900;
          color: var(--text-secondary);
        }

        .album-cover-thumbnail {
          width: 90px;
          height: 60px;
          border-radius: 10px;
          overflow: hidden;
          flex-shrink: 0;
          border: 1px solid rgba(255, 255, 255, 0.15);
        }

        .album-cover-thumbnail img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .album-main-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .badge-row {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .pill-badge {
          color: white;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.5px;
        }

        .program-badge {
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
        }

        .program-badge.latin { background: rgba(225, 29, 72, 0.15); color: #fb7185; border: 1px solid rgba(225, 29, 72, 0.3); }
        .program-badge.standard { background: rgba(33, 147, 176, 0.15); color: #38bdf8; border: 1px solid rgba(33, 147, 176, 0.3); }
        .program-badge.both { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }

        .album-title {
          font-size: 1.15rem;
          font-weight: 800;
          margin: 0;
        }

        .album-subtitle {
          font-size: 0.82rem;
          color: var(--text-secondary);
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 500px;
        }

        .album-meta-row {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .meta-pill {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 0.75rem;
          color: var(--text-secondary);
          background: rgba(255, 255, 255, 0.04);
          padding: 3px 8px;
          border-radius: 6px;
        }

        .slug-pill code {
          color: #a1a1aa;
        }

        .album-swatch-box {
          padding: 0 10px;
        }

        .swatch-circle {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 2px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 4px 10px rgba(0,0,0,0.4);
        }

        .album-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .action-icon-btn {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
        }

        .action-icon-btn:hover {
          background: rgba(255, 255, 255, 0.15);
          transform: translateY(-2px);
        }

        .upload-tracks-btn:hover { color: #1db954; border-color: #1db954; }
        .preview-btn:hover { color: #38bdf8; border-color: #38bdf8; }
        .edit-btn:hover { color: #f59e0b; border-color: #f59e0b; }
        .delete-btn:hover { color: #ef4444; border-color: #ef4444; }

        /* MODAL STYLES */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 20px;
        }

        .modal-content {
          width: 100%;
          max-width: 820px;
          max-height: 90vh;
          overflow-y: auto;
          background: #121212;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 24px;
          padding: 30px;
          box-shadow: 0 25px 70px rgba(0, 0, 0, 0.8);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .modal-title-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .modal-title-group h2 {
          font-size: 1.5rem;
          font-weight: 900;
          margin: 0;
        }

        .close-btn {
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
        }

        .close-btn:hover { color: white; }

        .form-split-grid {
          display: grid;
          grid-template-columns: 260px 1fr;
          gap: 24px;
          margin-bottom: 20px;
        }

        .cover-dropzone {
          height: 180px;
          border: 2px dashed rgba(255, 255, 255, 0.2);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          overflow: hidden;
          position: relative;
          background: rgba(255, 255, 255, 0.02);
          transition: all 0.2s ease;
        }

        .cover-dropzone:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .cover-img-preview {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .upload-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 6px;
          color: var(--text-secondary);
          font-size: 0.85rem;
          padding: 10px;
        }

        .upload-placeholder small {
          font-size: 0.7rem;
          opacity: 0.6;
        }

        .uploading-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          color: white;
        }

        .url-input-fallback {
          margin-top: 10px;
        }

        .field-group {
          margin-bottom: 16px;
        }

        .field-group.full-width {
          width: 100%;
        }

        .field-label {
          display: block;
          font-size: 0.78rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 8px;
        }

        .input-field {
          width: 100%;
          padding: 12px 14px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
          font-size: 0.95rem;
          outline: none;
          transition: border-color 0.2s ease;
        }

        .input-field:focus {
          border-color: #e11d48;
          background: rgba(255, 255, 255, 0.08);
        }

        .input-field.small {
          padding: 8px 10px;
          font-size: 0.8rem;
        }

        .input-field.font-mono {
          font-family: monospace;
          color: #fb7185;
        }

        .input-field.textarea {
          resize: vertical;
        }

        .program-radio-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .program-opt-btn {
          padding: 12px 8px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
          font-weight: 700;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: center;
        }

        .program-opt-btn.active {
          background: rgba(225, 29, 72, 0.2);
          border-color: #e11d48;
          color: #fb7185;
          box-shadow: 0 4px 15px rgba(225, 29, 72, 0.3);
        }

        .styles-label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .quick-select-links {
          display: flex;
          gap: 8px;
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .quick-select-links button {
          background: none;
          border: none;
          color: #38bdf8;
          cursor: pointer;
          font-size: 0.75rem;
          padding: 0;
        }

        .styles-chip-selector {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .style-chip-toggle {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .style-chip-toggle.selected {
          font-weight: 800;
        }

        .color-presets-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 12px;
        }

        .preset-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: white;
          font-size: 0.78rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .preset-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .preset-color-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }

        .custom-colors-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        .color-input-box {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          font-size: 0.85rem;
        }

        .color-input-box input[type="color"] {
          border: none;
          background: none;
          width: 32px;
          height: 32px;
          cursor: pointer;
        }

        /* LIVE PREVIEW BOX */
        .live-preview-box {
          padding: 16px;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          margin-bottom: 24px;
        }

        .preview-label {
          display: block;
          font-size: 0.7rem;
          font-weight: 900;
          letter-spacing: 1px;
          color: var(--text-secondary);
          margin-bottom: 10px;
        }

        .preview-banner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          gap: 20px;
        }

        .preview-text {
          flex: 1;
        }

        .preview-badge {
          display: inline-block;
          color: white;
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 8px;
          font-weight: 900;
          margin-bottom: 6px;
        }

        .preview-text h4 {
          font-size: 1.3rem;
          font-weight: 900;
          margin: 0 0 4px 0;
        }

        .preview-text p {
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.7);
          margin: 0 0 12px 0;
        }

        .preview-btn-row {
          display: flex;
          gap: 8px;
        }

        .mini-btn {
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 700;
          color: white;
        }

        .mini-btn.outline {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .preview-img-box {
          width: 140px;
          height: 90px;
          border-radius: 10px;
          overflow: hidden;
          flex-shrink: 0;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .preview-img-box img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding-top: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .btn-cancel {
          padding: 12px 20px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
          font-weight: 700;
          cursor: pointer;
        }

        .btn-submit {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 28px;
          border-radius: 12px;
          color: white;
          border: none;
          font-weight: 800;
          font-size: 0.95rem;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(0,0,0,0.4);
        }

        @media (max-width: 768px) {
          .page-header {
            flex-direction: column;
            align-items: stretch;
          }
          .stats-row {
            grid-template-columns: 1fr;
          }
          .album-card {
            flex-direction: column;
            align-items: stretch;
          }
          .album-cover-thumbnail {
            width: 100%;
            height: 140px;
          }
          .form-split-grid {
            grid-template-columns: 1fr;
          }
          .program-radio-grid {
            grid-template-columns: 1fr;
          }
          .preview-banner {
            flex-direction: column;
            text-align: center;
          }
          .preview-img-box {
            width: 100%;
            height: 120px;
          }
          .preview-btn-row {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
