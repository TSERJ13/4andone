"use client";

import React, { useState } from 'react';
import {
  Flag,
  Play,
  Trash2,
  GripVertical,
  Music2,
  Disc,
  FolderPlus
} from 'lucide-react';
import { useAudio } from '@/components/audio/AudioProvider';
import { useStudio, Track } from '@/components/admin/StudioProvider';
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
  
  const [newFolderName, setNewFolderName] = useState('');
  const [showFolderForm, setShowFolderForm] = useState(false);
  const [infoModal, setInfoModal] = useState<{ isOpen: boolean, title: string, message: string, variant: 'primary' | 'danger', onConfirm?: () => void }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'primary'
  });
  const [duplicateCheck, setDuplicateCheck] = useState<{ trackId: string, folderId: string, style: string } | null>(null);

  const handleProgramShuffle = (programName: 'Latin' | 'Standard') => {
    const latinOrder = ["Samba", "Cha-cha-cha", "Rumba", "Paso Doble", "Jive"];
    const standardOrder = ["Slow Waltz", "Tango", "Viennese Waltz", "Slow Foxtrot", "Quickstep"];
    
    const order = programName === 'Latin' ? latinOrder : standardOrder;
    const selectedTracks: Track[] = [];

    order.forEach((styleName: string) => {
      const styleTracks = tracks.filter((t: Track) => t.style.toLowerCase() === styleName.toLowerCase());
      if (styleTracks.length > 0) {
        const randomTrack = styleTracks[Math.floor(Math.random() * styleTracks.length)];
        selectedTracks.push(randomTrack);
      }
    });

    if (selectedTracks.length > 0) {
      setFinalTracks(selectedTracks);
      loadTrack(selectedTracks[0], false, true);
      setInfoModal({
        isOpen: true,
        title: 'Simulation Started!',
        message: `${programName} Program Sequence: ${selectedTracks.map((t: Track) => t.title).join(' → ')}`,
        variant: 'primary'
      });
    } else {
      setInfoModal({
        isOpen: true,
        title: 'Empty Program',
        message: `No tracks found for ${programName} program!`,
        variant: 'danger'
      });
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
      <div className="finals-sectors-unified animate-in" style={{ marginTop: '40px' }}>

        <section className="folders-section">
          <header className="section-header">
            <div className="simulation-actions" style={{ position: 'relative' }}>
              <button className="sim-btn latin glass" onClick={() => handleProgramShuffle('Latin')}>
                <Play size={16} fill="currentColor" />
                <span>Shuffle Latin</span>
              </button>
              <button className="sim-btn standard glass" onClick={() => handleProgramShuffle('Standard')}>
                <Play size={16} fill="currentColor" />
                <span>Shuffle Standard</span>
              </button>
              
              <button 
                className="add-folder-icon-btn glass"
                onClick={() => setShowFolderForm(!showFolderForm)}
                title="Create New Folder"
              >
                {showFolderForm ? <span style={{fontSize: '18px'}}>✕</span> : <FolderPlus size={18} />}
              </button>

              {showFolderForm && (
                <div className="folder-modal-overlay animate-in-fade" onClick={() => setShowFolderForm(false)}>
                  <form className="folder-modal-content animate-in-popup" onClick={(e) => e.stopPropagation()} onSubmit={(e) => {
                    e.preventDefault();
                    if (!newFolderName.trim()) return;
                    addFinalFolder(newFolderName, '#1db954');
                    setNewFolderName('');
                    setShowFolderForm(false);
                  }}>
                    <h3>Create New Folder</h3>
                    <input 
                      type="text" 
                      placeholder="Folder Name (e.g. WDSF Latin Final)" 
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      className="modal-t-input"
                      autoFocus
                    />
                    <div className="modal-actions">
                      <button type="button" className="btn-cancel" onClick={() => setShowFolderForm(false)}>Cancel</button>
                      <button type="submit" className="btn-confirm">Create Folder</button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </header>

          <div className="folders-grid">
            {finalFolders.map(folder => {
              const folderTracks = getTracksForFinalFolder(folder.id);
              return (
                <div 
                  key={folder.id} 
                  className="final-folder-block glass"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDropToFolder(e, folder.id)}
                >
                  <div className="folder-header">
                    <div className="header-info">
                      <h3 className="folder-name">{folder.name}</h3>
                      <span className="track-count">{folderTracks.length} tracks</span>
                    </div>
                    <div className="folder-actions">
                      <button 
                        className="folder-play-btn glass" 
                        onClick={() => folderTracks.length > 0 && loadTrack(folderTracks[0], false, true)}
                        title="Play All"
                      >
                        <Play size={16} fill="currentColor" />
                      </button>
                      <button className="folder-del-btn glass" onClick={() => removeFinalFolder(folder.id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="folder-tracks-list-compact">
                    {folderTracks.length > 0 ? (
                      <>
                        {folderTracks.slice(0, 3).map((track: Track, i: number) => (
                          <div key={track.id} className="mini-track-row glass" onClick={() => loadTrack(track, false, true)}>
                            <span className="idx">{i+1}</span>
                            <span className="track-name truncate">{track.title}</span>
                            <span className="track-style-badge">{track.style}</span>
                          </div>
                        ))}
                        {folderTracks.length > 3 && (
                          <div className="more-indicator">+ {folderTracks.length - 3} more tracks</div>
                        )}
                      </>
                    ) : (
                      <div className="drop-placeholder">Drop tracks here to sort</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="track-queue-section glass">
          <div className="queue-header">
             <div className="title-area">
                <h3>Program Queue (All Final Tracks)</h3>
                <p className="text-secondary text-xs">Drag and reorder to plan your competition sequence</p>
             </div>
          </div>

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
                    <span className="artist truncate">
                      {track.artist}
                      {track.bpm && (
                        <span className="text-primary font-bold ml-1 info-mobile-hide">• {getMPMFromBPM(Number(track.bpm), track.style)} Bars/Min</span>
                      )}
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
            )) : <p className="empty-msg">No tracks in queue. Flag tracks from the library to add them here.</p>}
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
        message={`This folder already contains a ${duplicateCheck?.style}. Do you still want to add another one?`}
        confirmText="Add Anyway"
        variant="primary"
      />

      <style jsx>{`
        .finals-container {
          display: flex;
          flex-direction: column;
          gap: 32px;
          padding: 32px;
          padding-bottom: 140px;
        }

        .folders-section { display: flex; flex-direction: column; gap: 24px; }
        .section-header { display: flex; justify-content: space-between; align-items: center; }

        .folders-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
        }

        .final-folder-block {
          padding: 24px;
          border-radius: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          transition: all 0.3s ease;
        }
        .final-folder-block:hover { transform: translateY(-4px); border-color: rgba(29, 185, 84, 0.2); }

        .folder-header { display: flex; justify-content: space-between; align-items: center; }
        .header-info { display: flex; flex-direction: column; gap: 2px; }
        .folder-name { font-size: 1.1rem !important; font-weight: 800; color: white; }
        .track-count { font-size: 11px; opacity: 0.5; font-weight: 600; }
        
        .folder-actions { display: flex; gap: 8px; }
        .folder-play-btn, .folder-del-btn {
          width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.2s; border: 1px solid rgba(255,255,255,0.05);
        }
        .folder-play-btn { color: var(--primary); }
        .folder-play-btn:hover { background: rgba(29, 185, 84, 0.1); transform: scale(1.05); }
        .folder-del-btn:hover { color: #ef4444; background: rgba(239, 68, 68, 0.1); }

        .folder-tracks-list-compact { display: flex; flex-direction: column; gap: 8px; }
        .mini-track-row { 
          padding: 10px 14px; border-radius: 12px; display: flex; align-items: center; gap: 10px; font-size: 13px;
          background: rgba(255,255,255,0.02); cursor: pointer;
        }
        .mini-track-row:hover { background: rgba(255,255,255,0.06); }
        .track-name { font-weight: 600; flex: 1; color: #eee; }
        .track-style-badge { 
          font-size: 9px; font-weight: 800; text-transform: uppercase; padding: 2px 6px; 
          border-radius: 4px; background: rgba(29, 185, 84, 0.1); color: var(--primary);
        }
        .more-indicator { font-size: 11px; opacity: 0.4; text-align: center; margin-top: 4px; font-weight: 600; }

        .simulation-actions { display: flex; gap: 12px; align-items: center; }
        .sim-btn {
          display: flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 12px;
          font-weight: 800; font-size: 12px; cursor: pointer; transition: all 0.2s;
        }
        .sim-btn.latin { color: #ff4b2b; border: 1px solid rgba(255, 75, 43, 0.2); }
        .sim-btn.standard { color: #00d2ff; border: 1px solid rgba(0, 210, 255, 0.2); }
        .sim-btn:hover { transform: translateY(-2px); background: rgba(255,255,255,0.05); }

        .add-folder-icon-btn {
          width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center;
          color: var(--primary); border: 1px solid rgba(29, 185, 84, 0.2); cursor: pointer;
        }

        .track-queue-section { padding: 24px; border-radius: 24px; background: rgba(255,255,255,0.01); }
        .queue-header h3 { font-size: 1.2rem; font-weight: 800; margin-bottom: 4px; }
        .queue-list { display: flex; flex-direction: column; gap: 8px; margin-top: 20px; }
        
        .final-row {
          display: flex; align-items: center; justify-content: space-between; padding: 12px 20px;
          border-radius: 16px; background: rgba(255,255,255,0.02); cursor: grab; transition: all 0.2s;
        }
        .final-row:active { cursor: grabbing; }
        .final-row:hover { background: rgba(255,255,255,0.05); }
        .final-row.is-playing { border: 1px solid var(--primary); background: rgba(29, 185, 84, 0.05); }

        .track-info { display: flex; align-items: center; gap: 16px; flex: 1; }
        .track-meta { display: flex; align-items: center; gap: 12px; flex: 1; }
        .track-meta .title { font-weight: 700; color: white; }
        .track-meta .artist { font-size: 11px; opacity: 0.5; display: flex; align-items: center; gap: 8px; }
        .style-mini { font-size: 10px; font-weight: 800; text-transform: uppercase; color: var(--primary); }

        .drop-placeholder { padding: 30px; text-align: center; border: 2px dashed rgba(255,255,255,0.05); border-radius: 16px; font-size: 13px; opacity: 0.3; }

        @media (max-width: 768px) {
          .finals-container { padding: 16px; padding-bottom: 120px; }
          .folders-grid { grid-template-columns: 1fr; }
          .track-meta .artist { display: none; }
          .track-meta .info-mobile-hide { display: none !important; }
          .final-row { padding: 12px 16px; }
          .sim-btn span { display: none; }
          .sim-btn { padding: 10px; }
        }

        .folder-modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(10px);
          display: flex; align-items: center; justify-content: center; z-index: 1000;
        }
        .folder-modal-content {
          background: #111; padding: 32px; border-radius: 24px; border: 1px solid #222;
          width: 90%; max-width: 400px; display: flex; flex-direction: column; gap: 20px;
        }
        .modal-t-input {
          background: #1a1a1a; border: 1px solid #333; border-radius: 12px; padding: 14px; color: white; outline: none;
        }
        .modal-actions { display: flex; gap: 12px; justify-content: flex-end; }
        .btn-confirm { background: var(--primary); color: black; font-weight: 800; padding: 10px 20px; border-radius: 10px; border: none; cursor: pointer; }
        .btn-cancel { background: transparent; color: #555; border: none; font-weight: 700; cursor: pointer; }
      `}</style>
    </div>
  );
};

export default FinalsPage;
