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
  const [infoModal, setInfoModal] = useState<{ isOpen: boolean, title: string, message: string, variant: 'primary' | 'danger' }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'primary'
  });

  const handleProgramShuffle = (programName: 'Latin' | 'Standard') => {
    // Official Orders
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
        message: `No tracks found for ${programName} program! Please upload tracks for these dances first.`,
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
    await addTrackToFinalFolder(trackId, folderId);
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
                <form className="inline-folder-form-popup animate-in-popup" onSubmit={(e) => {
                  e.preventDefault();
                  if (!newFolderName.trim()) return;
                  addFinalFolder(newFolderName, '#1db954');
                  setNewFolderName('');
                  setShowFolderForm(false);
                }}>
                  <input 
                    type="text" 
                    placeholder="New Folder Name..." 
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="inline-t-input"
                    autoFocus
                  />
                  <button type="submit" className="inline-add-btn">Create</button>
                </form>
              )}
            </div>
          </header>

          <div className="folders-grid">
            {finalFolders.map(folder => {
              const folderTracks = getTracksForFinalFolder(folder.id);
              return (
                <div 
                  key={folder.id} 
                  className="final-folder-block glass scrollable-folder"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDropToFolder(e, folder.id)}
                >
                  <button className="del-btn-top-right glass" onClick={() => removeFinalFolder(folder.id)}>
                    <Trash2 size={14} />
                  </button>

                  <div className="folder-header">
                    <h3>{folder.name}</h3>
                  </div>
                  
                  <div className="folder-tracks-list">
                    {folderTracks.length > 0 ? folderTracks.map((track: Track, i: number) => (
                      <div key={track.id} className="mini-track-row glass" onClick={() => loadTrack(track, false, true)}>
                        <span className="idx">{i+1}</span>
                        <GripVertical size={14} className="drag-handle-icon" />
                        <span className="track-name truncate">{track.title}</span>
                        <span className="track-artist truncate">
                          {track.artist}
                          {track.bpm && (
                            <span className="text-primary font-bold ml-1">({getMPMFromBPM(Number(track.bpm), track.style)})</span>
                          )}
                        </span>
                      </div>
                    )) : (
                      <div className="drop-placeholder">Drop tracks here</div>
                    )}
                  </div>
                </div>
              )
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
                        <span className="text-primary font-bold ml-1">• {getMPMFromBPM(Number(track.bpm), track.style)} Bars/Min</span>
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
        onConfirm={() => setInfoModal({ ...infoModal, isOpen: false })}
        title={infoModal.title}
        message={infoModal.message}
        confirmText="Got it"
        variant={infoModal.variant}
        showCancel={false}
      />

      <style jsx>{`
        .finals-hero {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 40px;
        }

        .badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 30px;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--primary, #1db954);
          margin-bottom: 8px;
        }

        .hero-content h1 {
          font-size: 2.5rem;
          font-weight: 900;
          margin-bottom: 8px;
          line-height: 1.1;
        }

        .description {
          max-width: 600px;
          font-size: 1rem;
          color: #71717a;
        }

        .finals-sectors-unified {
          display: flex;
          flex-direction: column;
          gap: 40px;
        }

        .folders-section { display: flex; flex-direction: column; gap: 24px; }
        .header-left { display: flex; align-items: center; gap: 16px; }
        .section-header { display: flex; justify-content: space-between; align-items: center; }
        .section-header h2 { font-size: 1.5rem; font-weight: 800; }

        .btn-create-folder {
          padding: 12px 24px;
          border-radius: 14px;
          font-weight: 800;
          color: var(--primary);
          border: 1px solid rgba(29, 185, 84, 0.2);
          cursor: pointer;
          transition: all 0.3s;
          font-size: 14px;
        }
        .btn-create-folder:hover {
          background: rgba(29, 185, 84, 0.1);
          transform: translateY(-2px);
        }

        .folders-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
        }

        .simulation-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-start;
          flex-wrap: wrap;
        }

        .add-folder-icon-btn {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary);
          border: 1px solid rgba(29, 185, 84, 0.2);
          cursor: pointer;
          transition: all 0.2s;
        }
        .add-folder-icon-btn:hover { background: rgba(29, 185, 84, 0.1); transform: scale(1.05); }

        .sim-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 8px 16px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255,255,255,0.08);
          font-weight: 800;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .sim-btn.latin { 
          color: #ff4b2b;
          border-color: rgba(255, 75, 43, 0.2);
        }
        .sim-btn.latin:hover {
          background: rgba(255, 75, 43, 0.1);
        }
        .sim-btn.standard { 
          color: #00d2ff;
          border-color: rgba(0, 210, 255, 0.2);
        }
        .sim-btn.standard:hover {
          background: rgba(0, 210, 255, 0.1);
        }
        .sim-btn:hover { 
          transform: translateY(-2px);
        }
        .sim-btn:active { transform: scale(0.98); }

        @media (max-width: 768px) {
          .section-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }
          .simulation-actions {
            width: 100%;
            display: flex;
            flex-wrap: nowrap;
            gap: 8px;
            overflow-x: auto;
            padding-bottom: 4px;
            scrollbar-width: none;
          }
          .simulation-actions::-webkit-scrollbar { display: none; }
          
          .sim-btn {
            padding: 10px 12px;
            font-size: 11px;
            white-space: nowrap;
            flex-shrink: 0;
          }
          .add-folder-icon-btn {
            width: 40px;
            height: 40px;
            flex-shrink: 0;
          }
        }

        /* TRACK QUEUE SECTION */
        .track-queue-section {
          padding: 32px;
          border-radius: 32px;
          background: rgba(255,255,255,0.01);
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        
        .queue-header h3 { font-size: 1.5rem; font-weight: 800; }

        .queue-list {
          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;
        }

        .final-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 24px;
          border-radius: 16px;
          cursor: grab;
          transition: all 0.2s;
        }
        .final-row:active { cursor: grabbing; }
        .final-row:hover { background: rgba(255,255,255,0.05); }

        .track-info { display: flex; align-items: center; gap: 20px; }
        .track-meta { display: flex; align-items: center; gap: 16px; flex: 1; }
        .style-mini { 
          font-size: 10px; 
          font-weight: 800; 
          text-transform: uppercase; 
          background: rgba(29, 185, 84, 0.1); 
          color: var(--primary); 
          padding: 2px 8px; 
          border-radius: 4px;
        }

        .finals-sectors {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 32px;
        }

        .final-folder-block {
          padding: 32px;
          border-radius: 32px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .folder-header h3 { font-size: 1.5rem; font-weight: 900; }
        .folder-actions { display: flex; gap: 12px; align-items: center; }
        
        .shuffle-btn { 
          font-size: 12px; 
          padding: 6px 16px; 
          border-radius: 30px; 
          font-weight: 800; 
          color: var(--primary, #1db954);
          background: rgba(255,255,255,0.05);
          border: none;
          cursor: pointer;
        }

        .mini-track-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .mini-track-row:hover {
          background: rgba(255,255,255,0.08);
          transform: translateX(4px);
        }

        .track-name { font-weight: 700; flex: 1; }
        .track-artist { font-size: 11px; opacity: 0.5; }

        .btn-create-folder {
          padding: 12px 24px;
          border-radius: 30px;
          font-weight: 800;
          background: var(--primary, #1db954);
          color: black;
          border: none;
          cursor: pointer;
          transition: all 0.3s;
        }

        .btn-create-folder:hover {
          transform: scale(1.05);
          box-shadow: 0 8px 24px rgba(29, 185, 84, 0.4);
        }

        .unassigned-block {
          border: 2px dashed rgba(255,255,255,0.1);
        }

        .final-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-radius: 12px;
          margin-bottom: 8px;
          cursor: pointer;
        }

        .is-playing {
          background: rgba(29, 185, 84, 0.1);
          border: 1px solid rgba(29, 185, 84, 0.3);
        }

        .empty-msg { color: #71717a; padding: 20px; text-align: center; font-size: 14px; }
        
        .inline-folder-form-popup {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          z-index: 100;
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(20, 20, 20, 0.95);
          backdrop-filter: blur(20px);
          padding: 12px 16px;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
          width: 280px;
        }
        .inline-t-input {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          color: white;
          font-size: 13px;
          padding: 8px 12px;
          border-radius: 8px;
          outline: none;
          flex: 1;
        }
        .inline-add-btn {
          background: var(--primary, #1db954);
          color: black;
          font-weight: 800;
          font-size: 12px;
          padding: 8px 16px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
        }
        
        .final-folder-block {
          padding: 32px;
          border-radius: 32px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          position: relative;
        }

        .del-btn-top-right {
          position: absolute;
          top: 20px;
          right: 20px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #71717a;
          border: 1px solid rgba(255,255,255,0.05);
          cursor: pointer;
          transition: all 0.2s;
          z-index: 10;
        }
        .del-btn-top-right:hover { color: #ff4b2b; background: rgba(255, 75, 43, 0.1); }

        .animate-in-popup { animation: popupFade 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        @keyframes popupFade { from { opacity: 0; transform: translateY(-10px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }

        @media (max-width: 768px) {
          .final-folder-block {
            padding: 20px;
            border-radius: 24px;
            gap: 16px;
          }
          .folder-header h3 { font-size: 1.2rem; }
          .inline-folder-form-popup {
            width: calc(100vw - 40px);
            right: -10px; /* Adjust for mobile padding */
          }
        }

        @media (max-width: 1024px) {
          .finals-hero { flex-direction: column; align-items: flex-start; gap: 24px; }
          .hero-content h1 { font-size: 2.5rem; }
          .simulation-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};

export default FinalsPage;
