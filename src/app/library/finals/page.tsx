"use client";

import React, { useState } from 'react';
import {
  Flag,
  Play,
  Trash2,
  GripVertical,
  Music2,
  Disc,
  FolderPlus,
  ChevronLeft,
  Settings,
  Plus
} from 'lucide-react';
import { useAudio } from '@/components/audio/AudioProvider';
import { useStudio, Track } from '@/components/admin/StudioProvider';
import { useAuth } from '@/context/AuthContext';
import { getMPMFromBPM } from '@/utils/audio';
import ConfirmModal from '@/components/admin/ConfirmModal';

const FinalsPage = () => {
  const { 
    tracks, 
    styles,
    finalTracks, 
    finalFolders, 
    addFinalFolder, 
    removeFinalFolder, 
    addTrackToFinalFolder, 
    getTracksForFinalFolder,
    removeFromFinal, 
    reorderFinalTracks,
    setFinalTracks
  } = useStudio();
  const { loadTrack, isPlaying, title: playingTitle } = useAudio();
  const { isAuthenticated, setIsAuthModalOpen } = useAuth();
  
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [showFolderForm, setShowFolderForm] = useState(false);
  const [infoModal, setInfoModal] = useState<{ isOpen: boolean, title: string, message: string, variant: 'primary' | 'danger', onConfirm?: () => void }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'primary'
  });
  const [duplicateCheck, setDuplicateCheck] = useState<{ trackId: string, folderId: string, style: string } | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [longPressTimeout, setLongPressTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  const selectedFolder = finalFolders.find(f => f.id === selectedFolderId);
  const selectedFolderTracks = selectedFolderId ? getTracksForFinalFolder(selectedFolderId) : [];

  const handleProgramShuffle = (programName: 'Latin' | 'Standard') => {
    const latinOrder = ["Samba", "Cha-cha-cha", "Rumba", "Paso Doble", "Jive"];
    const standardOrder = ["Slow Waltz", "Tango", "Viennese Waltz", "Slow Foxtrot", "Quickstep"];
    
    const order = programName === 'Latin' ? latinOrder : standardOrder;
    const selectedTracks: Track[] = [];

    order.forEach((styleName: string) => {
      // Find tracks of this style in the general library
      const styleTracks = tracks.filter((t: Track) => t.style.toLowerCase() === styleName.toLowerCase());
      if (styleTracks.length > 0) {
        // Pick one random track for this style to build the "Final"
        const randomTrack = styleTracks[Math.floor(Math.random() * styleTracks.length)];
        selectedTracks.push(randomTrack);
      }
    });

    if (selectedTracks.length > 0) {
      setFinalTracks(selectedTracks);
      loadTrack(selectedTracks[0], false, true);
    }
  };

  const handleDragStart = (e: React.DragEvent, trackId: string) => {
    e.dataTransfer.setData('trackId', trackId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropToFolder = async (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    const trackId = e.dataTransfer.getData('trackId');
    if (!trackId) return;
    
    const result = await addTrackToFinalFolder(trackId, folderId);
    
    if (!result.success && result.duplicate) {
      setDuplicateCheck({ trackId, folderId, style: result.duplicate });
    }
  };

  const confirmDuplicateAdd = async () => {
    if (!duplicateCheck) return;
    await addTrackToFinalFolder(duplicateCheck.trackId, duplicateCheck.folderId, true);
    setDuplicateCheck(null);
  };

  return (
    <div className="finals-container animate-in">
      <div className="finals-sectors-unified animate-in" style={{ marginTop: '20px' }}>

        <section className="folders-section">
          <header className="section-header">
            <div className="simulation-actions">
              <div className="shuffle-stack">
                <button className="sim-btn latin glass" onClick={() => handleProgramShuffle('Latin')}>
                  <Play size={14} fill="currentColor" />
                  <span>Shuffle Latin</span>
                </button>
                <button className="sim-btn standard glass" onClick={() => handleProgramShuffle('Standard')}>
                  <Play size={14} fill="currentColor" />
                  <span>Shuffle Standard</span>
                </button>
              </div>
              
              <button 
                className="sim-btn add-folder-btn glass big-btn" 
                onClick={() => setShowFolderForm(!showFolderForm)}
                title="Add Folder"
              >
                <FolderPlus size={36} strokeWidth={1.5} />
              </button>
              
              {isEditMode && (
                <button className="exit-edit-btn glass" onClick={() => setIsEditMode(false)}>
                  Done
                </button>
              )}

              {showFolderForm && (
                <div className="folder-modal-overlay animate-in-fade" onClick={() => !isCreatingFolder && setShowFolderForm(false)}>
                  <form className="folder-modal-content animate-in-popup" onClick={(e) => e.stopPropagation()} onSubmit={async (e) => {
                      e.preventDefault();
                      if (!newFolderName.trim() || isCreatingFolder) return;

                      if (!isAuthenticated) {
                        setInfoModal({
                          isOpen: true,
                          title: 'Authentication Required',
                          message: 'Please log in with Telegram to create competition folders and sync your data.',
                          variant: 'primary',
                          onConfirm: () => {
                            setInfoModal(prev => ({ ...prev, isOpen: false }));
                            setIsAuthModalOpen(true);
                          }
                        });
                        return;
                      }
                      
                      setIsCreatingFolder(true);
                      try {
                        await addFinalFolder(newFolderName.trim(), '#1db954');
                        setNewFolderName('');
                        setShowFolderForm(false);
                      } catch (err) {
                        console.error("Folder creation error:", err);
                      } finally {
                        setIsCreatingFolder(false);
                      }
                    }}>
                    <h3>New Folder</h3>
                    <input 
                      type="text" 
                      placeholder="e.g. WDSF Final" 
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      className="modal-t-input"
                      autoFocus
                      disabled={isCreatingFolder}
                    />
                    <div className="modal-actions">
                      <button type="button" className="btn-cancel" onClick={() => setShowFolderForm(false)} disabled={isCreatingFolder}>Cancel</button>
                      <button type="submit" className="btn-confirm" disabled={isCreatingFolder}>
                        {isCreatingFolder ? 'Creating...' : 'Create'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </header>

          <div className="folders-grid">
            {finalFolders.map(folder => {
              const folderTracks = getTracksForFinalFolder(folder.id);
              const count = folderTracks.length;
              
              const startLongPress = () => {
                const timer = setTimeout(() => {
                  setIsEditMode(true);
                }, 600);
                setLongPressTimeout(timer);
              };

              const endLongPress = () => {
                if (longPressTimeout) {
                  clearTimeout(longPressTimeout);
                  setLongPressTimeout(null);
                }
              };

              return (
                <div 
                  key={folder.id} 
                  className={`compact-folder-card glass ${selectedFolderId === folder.id ? 'is-active' : ''} ${isEditMode ? 'jiggle' : ''}`}
                  onClick={() => !isEditMode && setSelectedFolderId(folder.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDropToFolder(e, folder.id)}
                  onMouseDown={startLongPress}
                  onMouseUp={endLongPress}
                  onMouseLeave={endLongPress}
                  onTouchStart={startLongPress}
                  onTouchEnd={endLongPress}
                >
                  {isEditMode && (
                    <button className="delete-badge" onClick={(e) => {
                      e.stopPropagation();
                      removeFinalFolder(folder.id);
                    }}>✕</button>
                  )}
                  <div className="folder-info">
                    <span className="folder-name truncate">{folder.name}</span>
                    <div className="folder-mini-list">
                      {folderTracks.slice(0, 3).map(t => (
                        <span key={t.id} className="mini-track-pill">{t.style}</span>
                      ))}
                      {count > 3 && <span className="mini-track-pill">+{count - 3}</span>}
                    </div>
                  </div>
                  {!isEditMode && (
                    <button 
                      className="quick-play-btn glass"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (folderTracks.length > 0) loadTrack(folderTracks[0], false, true);
                      }}
                    >
                      <Play size={16} fill="currentColor" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {selectedFolder && (
          <section className="folder-detail-view glass animate-in-up">
            <header className="detail-header">
              <button className="back-btn glass" onClick={() => setSelectedFolderId(null)}>
                <ChevronLeft size={20} />
              </button>
              <div className="title-area">
                <h2>{selectedFolder.name}</h2>
                <p>{selectedFolderTracks.length} tracks prioritized</p>
              </div>
              <div className="detail-actions">
                <button className="play-all-btn" onClick={() => selectedFolderTracks.length > 0 && loadTrack(selectedFolderTracks[0], false, true)}>
                  <Play size={18} fill="currentColor" />
                  <span>Play Program</span>
                </button>
                <button className="del-folder-btn glass" onClick={() => { removeFinalFolder(selectedFolder.id); setSelectedFolderId(null); }}>
                   <Trash2 size={18} />
                </button>
              </div>
            </header>

            <div className="detail-tracks-list">
               {selectedFolderTracks.length > 0 ? selectedFolderTracks.map((track, i) => (
                 <div 
                   key={track.id} 
                   className="detail-track-row glass" 
                   draggable
                   onDragStart={(e) => handleDragStart(e, track.id)}
                   onDragOver={handleDragOver}
                   onDrop={(e) => {
                     e.preventDefault();
                     const dragId = e.dataTransfer.getData('trackId');
                     if (dragId && dragId !== track.id) {
                       reorderFinalTracks(
                         selectedFolderTracks.findIndex(t => t.id === dragId),
                         i,
                         selectedFolderId // Pass folderId to scope the reorder
                       );
                     }
                   }}
                   onClick={() => loadTrack(track, false, true)}
                 >
                   <GripVertical size={14} className="drag-handle text-secondary" />
                   <span className="idx">{i+1}</span>
                   <div className="meta">
                      <span className="name truncate">{track.title}</span>
                      <span className="style-badge">{track.style}</span>
                   </div>
                   <div className="actions">
                     <span className="duration text-secondary">{getMPMFromBPM(Number(track.bpm), track.style)} MPM</span>
                   </div>
                 </div>
               )) : <p className="empty-msg">Drag tracks from the queue below to add to this folder.</p>}
            </div>
          </section>
        )}

        <section className="track-queue-section glass">
          <header className="queue-header">
             <div className="title-area">
                <h3>Finals Queue</h3>
                <p className="description">Tracks flagged for finals. Drag to folders to organize.</p>
             </div>
          </header>

          <div className="tracks-list queue-list">
            {finalTracks.length > 0 ? finalTracks.map((track: Track, i: number) => (
              <div
                key={track.id}
                className={`final-row glass ${playingTitle === track.title ? 'is-playing' : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(e, track.id)}
                onClick={() => loadTrack(track, false, true)}
                onDragOver={handleDragOver}
                onDrop={(e) => {
                  e.preventDefault();
                  const dragId = e.dataTransfer.getData('trackId');
                  if (dragId) {
                    const dragIdx = finalTracks.findIndex((t: Track) => t.id === dragId);
                    if (dragIdx !== -1) reorderFinalTracks(dragIdx, i);
                  }
                }}
              >
                <div className="track-info">
                  <span className="idx">{i + 1}</span>
                  <GripVertical size={16} className="drag-handle-icon" />
                  <div className="track-meta">
                    <span className="title truncate">{track.title}</span>
                    <span className="artist truncate info-mobile-hide">
                      {track.artist}
                    </span>
                    <span className="style-mini">{track.style}</span>
                  </div>
                </div>
                <div className="track-actions">
                  <button className="remove-btn" onClick={(e) => { e.stopPropagation(); removeFromFinal(track.id); }}>
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            )) : <p className="empty-msg">Add tracks from the library to see them here.</p>}
          </div>
        </section>
      </div>

      <ConfirmModal 
        isOpen={infoModal.isOpen}
        onClose={() => setInfoModal({ ...infoModal, isOpen: false })}
        onConfirm={infoModal.onConfirm || (() => setInfoModal({ ...infoModal, isOpen: false }))}
        title={infoModal.title}
        message={infoModal.message}
        confirmText="Got it"
        variant={infoModal.variant}
        showCancel={false}
      />

      <ConfirmModal 
        isOpen={!!duplicateCheck}
        onClose={() => setDuplicateCheck(null)}
        onConfirm={confirmDuplicateAdd}
        title="Duplicate Style"
        message={`This folder already contains a ${duplicateCheck?.style}. Add anyway?`}
        confirmText="Yes, Add"
        variant="primary"
      />

      <style jsx>{`
        .finals-container {
          padding: 32px;
          padding-bottom: 140px;
          display: flex;
          flex-direction: column;
          gap: 40px;
        }

        .folders-section { 
          display: flex; 
          flex-direction: column; 
          gap: 20px; 
          min-height: 120px; 
          margin-bottom: 30px;
        }
        .section-header { display: flex; justify-content: space-between; align-items: center; }
        .section-header h3 { font-size: 1rem; font-weight: 800; opacity: 0.6; text-transform: uppercase; letter-spacing: 0.5px; }

        .folders-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 12px;
        }

        .compact-folder-card {
          padding: 16px 20px;
          min-height: 90px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: relative;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.03);
        }

        .jiggle {
          animation: jiggle 0.3s infinite ease-in-out;
        }

        @keyframes jiggle {
          0% { transform: rotate(-1deg); }
          50% { transform: rotate(1deg); }
          100% { transform: rotate(-1deg); }
        }

        .delete-badge {
          position: absolute;
          top: -8px;
          left: -8px;
          width: 24px;
          height: 24px;
          background: #ff4b2b;
          color: white;
          border-radius: 50%;
          border: 2px solid #121212;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
          z-index: 10;
        }

        .compact-folder-card:hover { transform: translateY(-2px); border-color: rgba(29, 185, 84, 0.3); }
        .compact-folder-card.is-active { border-color: var(--primary); background: rgba(29, 185, 84, 0.05); }

        .folder-mini-list { 
          display: flex; 
          .collection-card {
            padding: 12px;
            min-width: 100%;
            gap: 12px;
          }
          .card-icon {
            width: 36px;
            height: 36px;
            border-radius: 10px;
          }
          .card-info h3 { font-size: 0.9rem; }
          .card-info .meta { font-size: 10px; }
        }
        .mini-track-pill { 
          font-size: 8px; 
          padding: 1px 5px; 
          border-radius: 6px; 
          background: rgba(29, 185, 84, 0.15); 
          color: var(--primary);
          white-space: nowrap;
          border: 1px solid rgba(29, 185, 84, 0.1);
        }

        .quick-play-btn {
          width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
          color: var(--primary); transition: all 0.2s;
        }
        .quick-play-btn:hover { transform: scale(1.1); background: var(--primary); color: black; }

        /* Detail View */
        .folder-detail-view {
          padding: 32px;
          border-radius: 32px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          border: 1px solid var(--primary);
          background: rgba(0,0,0,0.4);
          box-shadow: 0 20px 80px rgba(0,0,0,0.8);
        }
        .detail-header { display: flex; align-items: center; gap: 24px; }
        .detail-header h2 { font-size: 1.8rem; font-weight: 900; margin: 0; }
        .detail-header p { font-size: 12px; opacity: 0.5; margin-top: 4px; }
        .back-btn { width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        .detail-actions { display: flex; gap: 12px; margin-left: auto; }
        
        .play-all-btn {
          display: flex; align-items: center; gap: 10px; padding: 12px 24px; border-radius: 16px;
          background: var(--primary); color: black; font-weight: 900; border: none; cursor: pointer;
          transition: all 0.2s;
        }
        .del-folder-btn {
          width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center;
          color: #ff4b2b;
        }

        .detail-tracks-list { display: flex; flex-direction: column; gap: 8px; }
        .detail-track-row {
          padding: 12px 20px; border-radius: 16px; display: flex; align-items: center; gap: 16px;
          cursor: pointer; transition: all 0.2s;
        }
        .detail-track-row:hover { background: rgba(255,255,255,0.05); }
        .detail-track-row .meta { flex: 1; display: flex; align-items: center; gap: 12px; }
        .detail-track-row .name { font-weight: 700; font-size: 14px; }
        .style-badge { font-size: 9px; font-weight: 800; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; background: rgba(255,255,255,0.05); }

        /* Queue Section */
        .track-queue-section { padding: 24px; border-radius: 24px; }
        .queue-header { margin-bottom: 20px; }
        .queue-header h3 { font-size: 1.2rem; font-weight: 800; margin-bottom: 4px; }
        .queue-header .description { font-size: 12px; opacity: 0.5; }

        .tracks-list { display: flex; flex-direction: column; gap: 8px; }
        .final-row {
          display: flex; align-items: center; justify-content: space-between; padding: 12px 20px;
          border-radius: 16px; background: rgba(255,255,255,0.02); cursor: grab; transition: all 0.2s;
          font-size: 11px !important;
        }
        .final-row .title { font-weight: 700; font-size: 11px; }
        .final-row .style-mini { font-size: 9px; padding: 2px 6px; font-weight: 800; text-transform: uppercase; color: var(--primary); }
        .track-info { display: flex; align-items: center; gap: 16px; flex: 1; }
        .track-meta { display: flex; align-items: center; gap: 12px; flex: 1; }

        .simulation-actions { display: flex; gap: 12px; align-items: center; width: 100%; transition: all 0.3s; }
        .shuffle-stack { display: flex; gap: 12px; align-items: center; }
        .sim-btn {
          display: flex; align-items: center; gap: 8px; padding: 12px 20px; border-radius: 14px;
          font-weight: 800; font-size: 13px; cursor: pointer; transition: all 0.2s;
          white-space: nowrap;
        }
        .sim-btn.latin { color: #f7971e; border-color: rgba(247, 151, 30, 0.3); }
        .sim-btn.standard { color: #00d2ff; border-color: rgba(0, 210, 255, 0.3); }
        .sim-btn.add-folder-btn { color: white; background: rgba(255,255,255,0.05); }
        .sim-btn:hover { transform: translateY(-2px); background: rgba(255,255,255,0.1); }

        @media (max-width: 768px) {
          .finals-container { padding: 16px; padding-bottom: 120px; gap: 24px; }
          .page-header { flex-direction: column; align-items: center; text-align: center; gap: 16px; }
          .detail-header h2 { font-size: 1.4rem; }
          .play-all-btn { padding: 12px; width: 44px; height: 44px; justify-content: center; }
          .play-all-btn span { display: none; }
          .sim-btn span { display: inline !important; }
          .info-mobile-hide { display: none !important; }

          .folders-section { margin-bottom: 20px; }
          .track-queue-section { padding: 16px; border-radius: 20px; }
          .queue-header h3 { font-size: 1.1rem; }
          .queue-header .description { display: none; }
          .final-row { padding: 10px 14px; border-radius: 12px; }
          
          .folder-detail-view {
            position: fixed;
            inset: 0;
            z-index: 4000;
            border-radius: 0;
            padding: 20px;
            background: #0d0d0d;
          }

          .simulation-actions { 
            display: flex;
            justify-content: space-between;
            align-items: stretch;
            gap: 16px;
          }
          .shuffle-stack {
            display: flex;
            flex-direction: column;
            gap: 8px;
            flex: 1;
          }
          .sim-btn {
            width: 100%;
            padding: 10px 12px;
            font-size: 11px;
            justify-content: center;
          }
          .sim-btn.big-btn {
            height: auto;
            flex: 0.8;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
          }
        }

        .folder-modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(10px);
          display: flex; align-items: center; justify-content: center; z-index: 1000;
        }
        .folder-modal-content {
          background: #111; padding: 32px; border-radius: 24px; border: 1px solid #222;
          width: 90%; max-width: 320px; display: flex; flex-direction: column; gap: 20px;
        }
        .modal-t-input {
          background: #1a1a1a; border: 1px solid #333; border-radius: 12px; padding: 14px; color: white; outline: none;
        }
        .modal-actions { display: flex; gap: 12px; justify-content: flex-end; }
        .btn-confirm { background: var(--primary); color: black; font-weight: 800; padding: 10px 20px; border-radius: 10px; border: none; cursor: pointer; }
        .btn-cancel { background: transparent; color: #555; border: none; font-weight: 700; cursor: pointer; }

        .idx { font-size: 12px; font-weight: 800; opacity: 0.3; width: 20px; text-align: center; }
        .animate-in-up { animation: fadeInUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default FinalsPage;
