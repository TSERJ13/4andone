"use client";

import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Disc, 
  Activity,
  Filter,
  CheckCircle2,
  FolderPlus,
  Play,
  Pause,
  LayoutGrid,
  List as ListIcon,
  Folder as FolderIcon,
  ChevronRight,
  GripVertical,
  Tag as TagIcon,
  X as XIcon,
  CheckSquare,
  Square
} from 'lucide-react';
import AddTrackModal from '@/components/admin/AddTrackModal';
import ConfirmModal from '@/components/admin/ConfirmModal';
import { useAudio } from '@/components/audio/AudioProvider';
import { useStudio, Track } from '@/components/admin/StudioProvider';
import { formatDuration } from '@/utils/format';
import { getMPMFromBPM } from '@/utils/audio';

const AdminLibrary = () => {
  const { togglePlay, isPlaying, title: playingTitle, loadTrack } = useAudio();
  const { tracks, folders, styles, tags, removeTrack, updateTrack, addTrack, assignToFolder, finalTracks, addToFinal, removeFromFinal, reorderGlobalTracks } = useStudio();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [activeFolderId, setActiveFolderId] = useState('All');
  const [activeTag, setActiveTag] = useState('All');
  const [viewMode, setViewMode] = useState<'list' | 'album'>('list');
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [trackToDelete, setTrackToDelete] = useState<Track | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // BULK TAGGING: track which rows are selected so tags can be applied to many
  // tracks at once (instead of editing each track individually).
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const handleAddTrack = (newTrack: any) => {
    addTrack(newTrack);
    showToast(`Successfully added "${newTrack.title}"`);
  };

  const handleDelete = (track: Track) => {
    setTrackToDelete(track);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (trackToDelete) {
      removeTrack(trackToDelete.id);
      showToast(`Deleted: ${trackToDelete.title}`);
      setTrackToDelete(null);
    }
  };

  const handleEdit = (track: Track) => {
    setSelectedTrack(track);
    setIsAddModalOpen(true);
  };

  // ---- BULK TAGGING ----
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  // Apply or remove a tag across every selected track in one pass.
  const bulkApplyTag = async (tagName: string, mode: 'add' | 'remove') => {
    if (selectedIds.size === 0) return;
    setBulkBusy(true);
    try {
      const targets = tracks.filter(t => selectedIds.has(t.id));
      for (const t of targets) {
        const current = t.tags || [];
        let nextTags: string[];
        if (mode === 'add') {
          if (current.some(tg => tg.toLowerCase() === tagName.toLowerCase())) continue; // already has it
          nextTags = [...current, tagName];
        } else {
          nextTags = current.filter(tg => tg.toLowerCase() !== tagName.toLowerCase());
        }
        await updateTrack(t.id, { tags: nextTags });
      }
      showToast(
        mode === 'add'
          ? `Added "${tagName}" to ${targets.length} track(s)`
          : `Removed "${tagName}" from ${targets.length} track(s)`
      );
      clearSelection();
    } catch (e: any) {
      showToast(`Bulk tag failed: ${e?.message || 'error'}`);
    } finally {
      setBulkBusy(false);
    }
  };

  const handlePlayToggle = (track: any) => {
    if (isPlaying && playingTitle === track.title) {
      togglePlay();
    } else {
      loadTrack(track);
      showToast(`Now Playing: ${track.title}`);
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('draggedIndex', index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    const dragIndex = parseInt(e.dataTransfer.getData('draggedIndex'));
    if (dragIndex !== dropIndex) {
      // We find the actual tracks from the filtered list to reorder in the global state
      // This is a simplified version; in a production app we'd use IDs.
      reorderGlobalTracks(dragIndex, dropIndex);
    }
  };

  const filteredTracks = tracks.filter(track => {
    const title = track.title || '';
    const artist = track.artist || '';
    const album = track.album || '';
    
    const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          album.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === 'All' || track.style === activeFilter;
    const matchesFolder = activeFolderId === 'All' || track.folderId === activeFolderId;
    const matchesTag = activeTag === 'All' || (track.tags && track.tags.includes(activeTag));
    return matchesSearch && matchesFilter && matchesFolder && matchesTag;
  });

  const albums = Array.from(new Set(filteredTracks.map(t => t.album || 'Unknown Album')))
    .map(name => ({
      name,
      artist: filteredTracks.find(t => t.album === name)?.artist || 'Various Artists',
      trackCount: filteredTracks.filter(t => t.album === name).length
    }));

  const filterStyles = Array.from(new Set(['All', 'Fitness', ...styles.map(s => s.title)]));

  return (
    <div className="admin-library animate-in">
      {toast && (
        <div className="toast-notification animate-in">
          <CheckCircle2 size={18} />
          <span>{toast}</span>
        </div>
      )}

        <div className="library-header-row">
          <div className="search-bar glass">
            <Search size={18} />
            <input 
              type="text" 
              placeholder="Search tracks..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="btn-primary" onClick={() => {
            setSelectedTrack(null);
            setIsAddModalOpen(true);
          }}>
            <Plus size={18} />
            Add Track
          </button>
        </div>
        <div className="breadcrumb-nav glass">
          <button 
            className={`breadcrumb-item ${activeFolderId === 'All' ? 'active' : ''}`}
            onClick={() => setActiveFolderId('All')}
          >
            All Tracks
          </button>
          {activeFolderId !== 'All' && (
            <>
              <ChevronRight size={16} className="text-secondary" />
              <button className="breadcrumb-item active">
                {folders.find(f => f.id === activeFolderId)?.name}
              </button>
            </>
          )}
        </div>

      <div className="library-filters-bar">
        <div className="filter-group">
          <label>Style</label>
          <div className="filter-scroll">
            {filterStyles.map(style => (
              <button 
                key={style}
                className={`filter-btn glass ${activeFilter === style ? 'active' : ''}`}
                onClick={() => setActiveFilter(style)}
              >
                {style}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <label>Tags</label>
          <div className="filter-scroll">
            <button 
              className={`filter-btn glass ${activeTag === 'All' ? 'active' : ''}`}
              onClick={() => setActiveTag('All')}
            >
              All
            </button>
            {tags.map(t => (
              <button 
                key={t.id}
                className={`filter-btn glass ${activeTag === t.name ? 'active' : ''}`}
                onClick={() => setActiveTag(t.name)}
              >
                <span className="folder-dot" style={{ backgroundColor: t.color }}></span>
                {t.name}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <label>Collection</label>
          <div className="filter-scroll">
            <button 
              className={`filter-btn glass ${activeFolderId === 'All' ? 'active' : ''}`}
              onClick={() => setActiveFolderId('All')}
            >
              All
            </button>
            {folders.map(f => (
              <button 
                key={f.id}
                className={`filter-btn glass ${activeFolderId === f.id ? 'active' : ''}`}
                onClick={() => setActiveFolderId(f.id)}
              >
                <span className="folder-dot" style={{ backgroundColor: f.color }}></span>
                {f.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* BULK TAGGING BAR — appears when one or more tracks are selected */}
      {selectedIds.size > 0 && (
        <div className="bulk-bar glass">
          <div className="bulk-info">
            <CheckSquare size={16} />
            <span>{selectedIds.size} selected</span>
            <button className="bulk-clear" onClick={clearSelection} title="Clear selection">
              <XIcon size={14} />
            </button>
          </div>
          <div className="bulk-actions">
            <span className="bulk-label"><TagIcon size={13} /> Apply tag:</span>
            {tags.length === 0 && <span className="bulk-empty">No tags yet — create one in Taxonomy</span>}
            {tags.map(t => (
              <span key={t.id} className="bulk-tag-group">
                <button
                  className="bulk-tag-add"
                  disabled={bulkBusy}
                  style={{ '--tag-color': t.color || '#1db954' } as React.CSSProperties}
                  onClick={() => bulkApplyTag(t.name, 'add')}
                >
                  + {t.name}
                </button>
                <button
                  className="bulk-tag-remove"
                  disabled={bulkBusy}
                  title={`Remove "${t.name}" from selected`}
                  onClick={() => bulkApplyTag(t.name, 'remove')}
                >
                  −
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {viewMode === 'list' ? (
        <div className="tracks-container glass">
          <table className="admin-table">
            <thead>
              <tr>
                <th className="col-play"></th>
                <th className="col-track">Track / Artist</th>
                <th className="col-album">Album</th>
                <th className="col-style">Style</th>
                <th className="col-tempo">Bars/Min</th>
                <th className="col-duration">Duration</th>
                <th className="col-date">Added</th>
                <th className="col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTracks.map((track, i) => {
                const isThisPlaying = isPlaying && playingTitle === track.title;
                return (
                  <tr 
                    key={track.id} 
                    className={`admin-track-row ${isThisPlaying ? 'is-playing-row' : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, i)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, i)}
                  >
                    <td className="col-play">
                      <div className="play-cell">
                        <button
                          className="row-select-btn"
                          title={selectedIds.has(track.id) ? 'Deselect' : 'Select'}
                          onClick={() => toggleSelect(track.id)}
                        >
                          {selectedIds.has(track.id)
                            ? <CheckSquare size={16} className="sel-on" />
                            : <Square size={16} className="sel-off" />}
                        </button>
                        <span className="row-idx">{i + 1}</span>
                        <GripVertical size={16} className="drag-handle-icon" />
                        <button className="row-play-btn" onClick={() => handlePlayToggle(track)}>
                          {isThisPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                        </button>
                      </div>
                    </td>
                    <td className="col-track">
                      <div className="track-cell">
                        <div className="track-icon-wrapper glass">
                          <Disc size={16} />
                        </div>
                        <div className="track-meta">
                          <span className="track-title">{track.title}</span>
                          <span className="track-artist text-secondary">{track.artist}</span>
                        </div>
                      </div>
                    </td>
                    <td className="col-album">
                      <div className="album-cell">
                        <span>{track.album}</span>
                      </div>
                    </td>
                    <td className="col-style">
                      <div className="style-actions">
                        <span className={`style-badge ${track.style?.toLowerCase() === 'fitness' ? 'fitness-special' : ''}`}>
                          {track.style?.toLowerCase() === 'fitness' && <Activity size={10} style={{ marginRight: '4px' }} />}
                          {track.style}
                        </span>
                        {track.tags && track.tags.length > 0 && (
                           <div className="track-tags-mini">
                             {track.tags.map((t: string) => (
                               <span key={t} className="mini-tag">{t}</span>
                             ))}
                           </div>
                        )}
                      </div>
                    </td>
                    <td className="col-tempo">
                      <span className="tempo-badge">
                        {track.bpm ? `${getMPMFromBPM(Number(track.bpm), track.style)}` : '-'}
                      </span>
                    </td>
                    <td className="col-duration text-secondary">{formatDuration(track.duration)}</td>
                    <td className="col-date text-secondary">{track.date}</td>
                    <td className="col-actions">
                      <div className="action-buttons">
                        <button 
                          className="action-btn edit-btn" 
                          title="Edit Metadata"
                          onClick={() => handleEdit(track)}
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          className="action-btn delete-btn" 
                          title="Delete"
                          onClick={() => handleDelete(track)}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="albums-grid animate-in">
          {albums.map((album, i) => (
            <div key={i} className="album-card glass">
              <div className="album-art-stack">
                <div className="art-layer glass"></div>
                <div className="art-layer glass"></div>
                <div className="art-main glass">
                  <Disc size={48} className="text-secondary" />
                </div>
              </div>
              <div className="album-info">
                <h3>{album.name}</h3>
                <p>{album.artist}</p>
                <span className="track-count">{album.trackCount} Tracks</span>
              </div>
              <button className="album-play-btn" onClick={() => {
                const tracks = filteredTracks.filter(t => t.album === album.name);
                if (tracks[0]) loadTrack(tracks[0]);
              }}>
                <Play size={20} fill="currentColor" />
              </button>
            </div>
          ))}
        </div>
      )}



      <AddTrackModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={async (newTrack) => {
          if (selectedTrack) {
            // Updating existing (Repair)
            await updateTrack(selectedTrack.id, newTrack);
          } else {
            // Adding new
            await addTrack(newTrack);
          }
          showToast(selectedTrack ? `Repaired "${newTrack.title}"` : `Added "${newTrack.title}"`);
        }}
        initialData={selectedTrack}
      />

      <ConfirmModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Track?"
        message={`Are you sure you want to permanently delete "${trackToDelete?.title}"? This action cannot be undone.`}
        confirmText="Delete Track"
        variant="danger"
      />

      <style jsx>{`
        .admin-library {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .toast-notification {
          position: fixed;
          top: 24px;
          right: 24px;
          background: #1db954;
          color: black;
          padding: 12px 24px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 700;
          z-index: 3000;
          box-shadow: 0 8px 24px rgba(29, 185, 84, 0.4);
        }

        .library-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 8px;
        }

        .btn-primary {
          background: #1db954;
          color: black;
          font-weight: 700;
          padding: 10px 24px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: all 0.2s;
          border: none;
          cursor: pointer;
        }

        .btn-primary:hover {
          background: #1ed760;
          transform: scale(1.02);
        }

        .header-buttons { display: flex; gap: 20px; align-items: center; }

        .view-toggle { display: flex; padding: 4px; border-radius: 12px; }
        .view-toggle button { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #71717a; transition: all 0.2s; }
        .view-toggle button.active { background: rgba(255,255,255,0.1); color: white; }

        .search-bar { display: flex; align-items: center; gap: 12px; padding: 10px 16px; border-radius: 12px; width: 340px; }
        .search-bar input { background: transparent; border: none; color: white; outline: none; font-size: 14px; width: 100%; }

        .breadcrumb-nav {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 16px;
          border-radius: 12px;
        }
        .breadcrumb-item {
          font-size: 13px;
          font-weight: 700;
          color: #71717a;
          transition: color 0.2s;
        }
        .breadcrumb-item:hover { color: white; }
        .breadcrumb-item.active { color: white; }

        .style-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .row-flag-btn {
          color: #3f3f46;
          transition: all 0.2s;
        }
        .row-flag-btn:hover { color: #52525b; }
        .row-flag-btn.active { color: #1db954; }

        .library-filters-bar { display: flex; flex-direction: column; gap: 16px; margin-bottom: 8px; }
        .filter-group { display: flex; align-items: center; gap: 16px; }
        .filter-group label { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #71717a; min-width: 80px; letter-spacing: 0.5px; }
        .filter-scroll { display: flex; align-items: center; gap: 8px; overflow-x: auto; padding-bottom: 4px; }
        .filter-scroll::-webkit-scrollbar { display: none; }

        .filter-btn { padding: 6px 16px; border-radius: 10px; font-size: 12px; font-weight: 700; color: #a1a1aa; transition: all 0.2s; white-space: nowrap; display: flex; align-items: center; gap: 8px; }
        .filter-btn.active { background: rgba(29, 185, 84, 0.1); color: #1db954; border-color: rgba(29, 185, 84, 0.3); }

        .folder-dot { width: 8px; height: 8px; border-radius: 50%; }

        .tracks-container { width: 100%; border-radius: 20px; overflow: hidden; border: 1px solid rgba(255,255,255,0.05); }
        
        .albums-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 24px; }
        .album-card { padding: 24px; border-radius: 24px; display: flex; flex-direction: column; gap: 16px; position: relative; transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .album-card:hover { transform: translateY(-8px); background: rgba(255,255,255,0.05); }

        .album-art-stack { position: relative; width: 100%; aspect-ratio: 1; margin-bottom: 8px; }
        .art-layer { position: absolute; inset: 0; bottom: 8px; right: 8px; border-radius: 16px; background: linear-gradient(135deg, rgba(255,255,255,0.05), transparent); border: 1px solid rgba(255,255,255,0.03); }
        .art-layer:nth-child(2) { bottom: 4px; right: 4px; background: linear-gradient(135deg, rgba(255,255,255,0.03), transparent); }
        .art-main { position: absolute; inset: 0; border-radius: 20px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, rgba(29, 185, 84, 0.1), rgba(59, 130, 246, 0.1)); border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
        
        .album-info h3 { font-size: 16px; font-weight: 800; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .album-info p { font-size: 13px; color: #71717a; margin-bottom: 12px; }
        .track-count { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #1db954; background: rgba(29, 185, 84, 0.1); padding: 4px 8px; border-radius: 6px; }

        .album-play-btn { position: absolute; bottom: 24px; right: 24px; width: 44px; height: 44px; border-radius: 14px; background: #1db954; color: black; display: flex; align-items: center; justify-content: center; opacity: 0; transform: translateY(10px); transition: all 0.3s; }
        .album-card:hover .album-play-btn { opacity: 1; transform: translateY(0); }

        .admin-table { width: 100%; border-collapse: collapse; text-align: left; }
        .admin-table th { background: rgba(255,255,255,0.02); padding: 12px 24px; font-size: 11px; text-transform: uppercase; color: #71717a; border-bottom: 1px solid rgba(255,255,255,0.05); letter-spacing: 0.5px; }
        .admin-table td { padding: 10px 24px; border-bottom: 1px solid rgba(255,255,255,0.02); }
        
        .col-play { width: 90px; }
        .play-cell { display: flex; align-items: center; gap: 10px; }
        .row-idx { font-size: 11px; font-weight: 800; color: #555; min-width: 20px; }
        .drag-handle-icon { color: #555; opacity: 0.3; cursor: grab; transition: opacity 0.2s; }
        .drag-handle-icon:hover { opacity: 0.8; }
        .drag-handle-icon:active { cursor: grabbing; }

        .row-play-btn { color: #1db954; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 10px; transition: all 0.2s; }
        .row-play-btn:hover { background: rgba(29, 185, 84, 0.1); transform: scale(1.05); }

        .admin-track-row { transition: background 0.2s; }
        .admin-track-row:hover { background: rgba(255, 255, 255, 0.03); }
        .is-playing-row { background: rgba(29, 185, 84, 0.05); }

        .track-cell { display: flex; align-items: center; gap: 14px; }
        .track-icon-wrapper { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #71717a; border: 1px solid rgba(255,255,255,0.05); }
        .track-meta { display: flex; flex-direction: column; }
        .track-title { font-weight: 700; font-size: 14px; margin-bottom: 2px; color: white; }
        .track-artist { font-size: 12px; }

        .album-cell { color: #a1a1aa; font-size: 13px; }
        .style-badge { background: rgba(255,255,255,0.05); padding: 4px 10px; border-radius: 6px; font-size: 10px; font-weight: 800; text-transform: uppercase; color: #a1a1aa; display: flex; align-items: center; }
        .fitness-special { background: rgba(29, 185, 84, 0.1) !important; color: #1db954 !important; border: 1px solid rgba(29, 185, 84, 0.2); }

        .action-buttons { display: flex; align-items: center; gap: 8px; justify-content: flex-end; }
        .action-btn { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #71717a; transition: all 0.2s; background: transparent; border: none; cursor: pointer; }
        .action-btn:hover { background: rgba(255,255,255,0.05); color: white; }

        .track-tags-mini { display: flex; gap: 4px; align-items: center; margin-left: 8px; flex-wrap: wrap; max-width: 150px; }
        .mini-tag { font-size: 9px; padding: 2px 6px; border-radius: 4px; background: rgba(255,255,255,0.05); color: #a1a1aa; white-space: nowrap; }

        /* Row selection checkbox */
        .row-select-btn { background: none; border: none; cursor: pointer; padding: 2px; display: flex; align-items: center; }
        .row-select-btn .sel-on { color: #1db954; }
        .row-select-btn .sel-off { color: #52525b; }
        .row-select-btn:hover .sel-off { color: #a1a1aa; }

        /* Bulk tagging bar */
        .bulk-bar {
          display: flex; align-items: center; gap: 18px; flex-wrap: wrap;
          padding: 12px 18px; margin-bottom: 14px; border-radius: 12px;
          border: 1px solid rgba(29,185,84,0.25);
          background: linear-gradient(135deg, rgba(29,185,84,0.1), rgba(29,185,84,0.02));
        }
        .bulk-info { display: flex; align-items: center; gap: 8px; color: #1db954; font-weight: 800; font-size: 13px; }
        .bulk-clear {
          display: flex; align-items: center; justify-content: center;
          width: 20px; height: 20px; border-radius: 50%; border: none; cursor: pointer;
          background: rgba(255,255,255,0.08); color: #a1a1aa;
        }
        .bulk-clear:hover { background: rgba(255,255,255,0.15); color: #fff; }
        .bulk-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .bulk-label { display: flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 700; color: #a1a1aa; }
        .bulk-empty { font-size: 12px; color: #71717a; font-style: italic; }
        .bulk-tag-group { display: inline-flex; align-items: stretch; border-radius: 8px; overflow: hidden; }
        .bulk-tag-add {
          padding: 6px 12px; border: none; cursor: pointer; font-size: 12px; font-weight: 800;
          background: rgba(255,255,255,0.06); color: var(--tag-color, #1db954);
          border-left: 3px solid var(--tag-color, #1db954);
        }
        .bulk-tag-add:hover:not(:disabled) { background: rgba(255,255,255,0.12); }
        .bulk-tag-remove {
          padding: 6px 10px; border: none; cursor: pointer; font-size: 14px; font-weight: 900;
          background: rgba(255,255,255,0.03); color: #ef5350;
        }
        .bulk-tag-remove:hover:not(:disabled) { background: rgba(239,83,80,0.15); }
        .bulk-tag-add:disabled, .bulk-tag-remove:disabled { opacity: 0.5; cursor: not-allowed; }

        @media (max-width: 1024px) {
          .library-header-actions { flex-direction: column; align-items: flex-start; }
          .search-bar { width: 100%; }
        }

        .animate-in { animation: animate-in 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
        @keyframes animate-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default AdminLibrary;
