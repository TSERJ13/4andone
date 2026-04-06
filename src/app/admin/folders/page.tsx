"use client";

import React, { useState } from 'react';
import { 
  FolderPlus, 
  Folder, 
  Plus, 
  MoreVertical, 
  FolderTree,
  ChevronLeft,
  Music,
  Disc,
  Play,
  Trash2,
  Edit2
} from 'lucide-react';
import { useStudio } from '@/components/admin/StudioProvider';
import { getMPMFromBPM } from '@/utils/audio';
import FolderModal from '@/components/admin/FolderModal';
import ConfirmModal from '@/components/admin/ConfirmModal';

export default function AdminFolders() {
  const { folders, tracks, addFolder, removeFolder, updateFolder } = useStudio();
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<{ id: string, name: string, color: string } | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<any>(null);

  const currentFolder = folders.find(f => f.id === selectedFolderId);
  const folderTracks = tracks.filter(t => t.folderId === selectedFolderId);

  const handleCreateFolder = () => {
    setEditingFolder(null);
    setIsFolderModalOpen(true);
  };

  const handleEditFolder = (folder: any) => {
    setEditingFolder(folder);
    setIsFolderModalOpen(true);
  };

  const handleFolderConfirm = (name: string, color: string) => {
    if (editingFolder) {
      updateFolder(editingFolder.id, { name, color });
    } else {
      addFolder(name, color);
    }
  };

  const handleDeleteClick = (folder: any) => {
    setFolderToDelete(folder);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteFolder = () => {
    if (folderToDelete) {
      removeFolder(folderToDelete.id);
      setFolderToDelete(null);
    }
  };

  return (
    <div className="admin-folders animate-in">
      {selectedFolderId ? (
        <div className="folder-detail-view animate-in">
          <header className="detail-header">
            <button className="back-btn glass" onClick={() => setSelectedFolderId(null)}>
              <ChevronLeft size={20} />
              Back to Collections
            </button>
            <div className="folder-title-info">
              <div className="detail-icon" style={{ color: currentFolder?.color }}>
                <Folder size={32} fill="currentColor" fillOpacity={0.1} />
              </div>
              <div>
                <h2>{currentFolder?.name}</h2>
                <p className="text-secondary">{folderTracks.length} Tracks • Management View</p>
              </div>
            </div>
          </header>

          <div className="folder-contents glass">
            <div className="contents-header">
              <Music size={18} />
              <h3>Tracks in {currentFolder?.name}</h3>
            </div>
            <div className="tracks-list">
              {folderTracks.length > 0 ? folderTracks.map((track) => (
                <div key={track.id} className="track-item">
                  <div className="track-play glass">
                    <Play size={14} fill="currentColor" />
                  </div>
                  <div className="track-info">
                    <p className="t-name">{track.title}</p>
                    <p className="t-artist">{track.artist}</p>
                  </div>
                  <span className="t-duration">{track.bpm ? `${getMPMFromBPM(Number(track.bpm), track.style)} Bars/Min` : 'No Bars/Min'}</span>
                  <button className="t-more"><MoreVertical size={16} /></button>
                </div>
              )) : (
                <div className="empty-state glass">
                   <p>No tracks in this collection yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="main-folders-view animate-in">
          <div className="folders-grid">
            <div className="add-folder-card glass" onClick={handleCreateFolder}>
              <Plus size={32} className="text-secondary" />
              <span>Create New Collection</span>
            </div>
            
            {folders.map((folder) => (
              <div key={folder.id} className="folder-card glass" onClick={() => setSelectedFolderId(folder.id)}>
                <div className="folder-icon" style={{ color: folder.color }}>
                  <Folder size={48} fill="currentColor" fillOpacity={0.1} />
                </div>
                <div className="folder-info">
                  <h3>{folder.name}</h3>
                  <p className="text-secondary">{tracks.filter(t => t.folderId === folder.id).length} Tracks</p>
                </div>
                <div className="folder-actions">
                  <button 
                    className="action-btn" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditFolder(folder);
                    }}
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    className="action-btn delete" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(folder);
                    }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="tree-preview glass">
            <div className="section-header">
              <FolderTree size={24} className="text-primary" />
              <div className="header-text">
                <h3>Hierarchy Preview</h3>
                <p className="text-secondary">Visual representation of your music directory structure.</p>
              </div>
            </div>
            <div className="tree-content">
              <div className="tree-placeholder glass">
                <span>Folder Visualization System Inactive</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <FolderModal 
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        onConfirm={handleFolderConfirm}
        initialData={editingFolder ? { name: editingFolder.name, color: editingFolder.color } : undefined}
      />

      <ConfirmModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDeleteFolder}
        title="Delete Collection?"
        message={`Are you sure you want to permanently delete "${folderToDelete?.name}"? All tracks will be removed from this collection, but will remain in your General Library.`}
        confirmText="Delete Collection"
      />

      <style jsx>{`
        .admin-folders { display: flex; flex-direction: column; gap: 40px; padding-bottom: 120px; }
        
        .folder-actions {
          position: absolute; top: 20px; right: 20px; display: flex; gap: 8px;
        }
        
        .action-btn { 
          width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; 
          color: #71717a; transition: all 0.2s; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05);
        }
        .action-btn:hover { background: rgba(255,255,255,0.08); color: white; }
        .action-btn.delete:hover { border-color: #ef4444; color: #ef4444; }

        /* Main Grid */
        .folders-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px;
        }

        .folder-card, .add-folder-card {
          padding: 40px; border-radius: 24px; display: flex; align-items: center; gap: 24px;
          position: relative; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); cursor: pointer;
        }

        .folder-card:hover, .add-folder-card:hover { transform: translateY(-4px); background: rgba(255,255,255,0.05); }

        .add-folder-card {
          flex-direction: column; justify-content: center; border: 2px dashed rgba(255,255,255,0.1); color: #71717a; font-weight: 700;
        }

        .folder-icon { display: flex; align-items: center; justify-content: center; }

        .folder-info h3 { font-size: 20px; font-weight: 800; margin-bottom: 6px; }
        .more-btn { position: absolute; top: 24px; right: 24px; color: #71717a; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 12px; }
        .more-btn:hover { background: rgba(255,255,255,0.05); color: white; }

        /* Detail View */
        .detail-header { display: flex; flex-direction: column; gap: 24px; margin-bottom: 32px; }
        .back-btn { align-self: flex-start; display: flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 12px; font-size: 13px; font-weight: 700; color: #a1a1aa; transition: all 0.2s; }
        .back-btn:hover { color: white; background: rgba(255,255,255,0.08); }
        
        .folder-title-info { display: flex; align-items: center; gap: 20px; }
        .folder-title-info h2 { font-size: 32px; font-weight: 900; letter-spacing: -1px; }

        .folder-contents { padding: 40px; border-radius: 28px; }
        .contents-header { display: flex; align-items: center; gap: 12px; margin-bottom: 32px; color: #1db954; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; font-size: 13px; }

        .tracks-list { display: flex; flex-direction: column; gap: 8px; }
        .track-item { padding: 16px 20px; border-radius: 16px; display: grid; grid-template-columns: 40px 1fr 60px 40px; align-items: center; gap: 20px; transition: background 0.2s; }
        .track-item:hover { background: rgba(255,255,255,0.03); }

        .track-play { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #1db954; }
        .t-name { font-weight: 700; font-size: 15px; }
        .t-artist { font-size: 12px; color: #71717a; }
        .t-duration { font-size: 13px; color: #a1a1aa; font-weight: 600; text-align: right; }
        .t-more { color: #71717a; text-align: right; }

        .tree-preview { padding: 40px; border-radius: 28px; }
        .section-header { display: flex; align-items: center; gap: 16px; margin-bottom: 32px; }
        .header-text h3 { font-size: 20px; font-weight: 800; }
        .header-text p { font-size: 14px; }
        
        .tree-placeholder {
          height: 160px; display: flex; align-items: center; justify-content: center; 
          border: 1px solid rgba(255,255,255,0.05); border-radius: 20px; font-weight: 700; color: #3f3f46;
          text-transform: uppercase; letter-spacing: 1px; font-size: 12px;
        }

        .text-primary { color: #1db954; }
        .text-secondary { color: #a1a1aa; }

        .animate-in { animation: animateIn 0.5s cubic-bezier(0.4, 0, 0.2, 1); }
        @keyframes animateIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
