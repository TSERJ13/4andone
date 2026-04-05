"use client";

import React, { useState, useCallback, useRef } from 'react';
import { 
  Upload, 
  X, 
  FileMusic, 
  CheckCircle2, 
  Loader2, 
  FolderPlus, 
  User, 
  Plus, 
  Music
} from 'lucide-react';

interface UploadingFile {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  errorMessage?: string;
}

import { useStudio } from './StudioProvider';

const BulkUpload = () => {
  const { addTrack, folders } = useStudio();
  const [files, setFiles] = useState<UploadingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [albumName, setAlbumName] = useState('');
  const [artistName, setArtistName] = useState('');
  const [targetFolderId, setTargetFolderId] = useState('');
  const [showValidation, setShowValidation] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync complete files with StudioProvider
  React.useEffect(() => {
    files.forEach(f => {
      if (f.status === 'complete' && !(f as any).ingested) {
        addTrack({
          title: f.file.name.replace(/\.[^/.]+$/, ""),
          artist: artistName || 'Unknown Artist',
          album: albumName || 'Bulk Upload',
          style: 'Samba', // Defaulting to Samba for bulk
          bpm: '0',
          folderId: targetFolderId || undefined
        });
        (f as any).ingested = true; // Simple flag to prevent double ingestion
      }
    });
  }, [files, addTrack, artistName, albumName]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const newFiles = Array.from(fileList)
      .filter(file => file.type.includes('audio') || file.name.endsWith('.mp3'))
      .map(file => ({
        id: Math.random().toString(36).substring(7),
        file,
        progress: 0,
        status: 'pending' as const
      }));

    setFiles(prev => [...prev, ...newFiles]);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const startUpload = () => {
    if (!albumName || !artistName) {
      setShowValidation(true);
      return;
    }
    setShowValidation(false);

    setFiles(prev => prev.map(f => {
      if (f.status === 'pending') {
        const mockUpload = setInterval(() => {
          setFiles(current => current.map(currFile => {
            if (currFile.id === f.id) {
              const nextProgress = Math.min(currFile.progress + (Math.random() * 25), 100);
              if (nextProgress === 100) {
                clearInterval(mockUpload);
              }
              return { 
                ...currFile, 
                progress: nextProgress, 
                status: nextProgress === 100 ? 'complete' : 'uploading' 
              };
            }
            return currFile;
          }));
        }, 400);
        return { ...f, status: 'uploading' };
      }
      return f;
    }));
  };

  const isAllComplete = files.length > 0 && files.every(f => f.status === 'complete');
  const isReadyToUpload = albumName && artistName && files.some(f => f.status === 'pending');

  return (
    <div className="bulk-upload-wrapper">
      {isAllComplete ? (
        <div className="upload-success-hero glass animate-in">
          <div className="success-badge">
            <CheckCircle2 size={48} className="text-primary" />
          </div>
          <h2>Ingestion Complete!</h2>
          <p>{files.length} tracks have been synced to "{albumName}" collection.</p>
          <div className="success-actions">
            <button className="btn-primary" onClick={() => {
              setFiles([]);
              setAlbumName('');
              setArtistName('');
            }}>Start New Batch</button>
            <button className="btn-secondary glass">View in Library</button>
          </div>
        </div>
      ) : (
        <>
          <div className="batch-metadata glass">
            <div className={`meta-field ${showValidation && !albumName ? 'invalid' : ''}`}>
              <FolderPlus size={18} className="meta-icon" />
              <input 
                type="text" 
                placeholder="Batch Album Name (Required)" 
                value={albumName}
                onChange={(e) => setAlbumName(e.target.value)}
              />
              {showValidation && !albumName && <span className="error-hint">REQUIRED</span>}
            </div>
            <div className={`meta-field ${showValidation && !artistName ? 'invalid' : ''}`}>
              <User size={18} className="meta-icon" />
              <input 
                type="text" 
                placeholder="Artist / Composer (Required)" 
                value={artistName}
                onChange={(e) => setArtistName(e.target.value)}
              />
              {showValidation && !artistName && <span className="error-hint">REQUIRED</span>}
            </div>

            <div className="meta-field">
              <FolderPlus size={18} className="meta-icon" />
              <select 
                className="meta-select"
                value={targetFolderId}
                onChange={(e) => setTargetFolderId(e.target.value)}
              >
                <option value="">No Collection (Inbox)</option>
                {folders.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div 
            className={`dropzone glass ${isDragging ? 'dragging' : ''} ${files.length > 0 ? 'has-files' : ''}`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="dropzone-content">
              <div className="upload-icon-wrapper glass">
                <Upload size={32} className="text-primary" />
              </div>
              <div className="text-group">
                <h3>Select Professional Audio Tracks</h3>
                <p>Drag & drop or click to browse (MP3, WAV, AIFF)</p>
              </div>
              <input 
                type="file" 
                multiple 
                accept="audio/*" 
                onChange={handleFileSelect} 
                className="file-input" 
                ref={fileInputRef}
              />
            </div>
          </div>
        </>
      )}

      {files.length > 0 && (
        <div className="files-list-section animate-in">
          <div className="list-controls">
            <div className="list-title">
              <Music size={18} />
              <h4>Staging Queue ({files.filter(f => f.status === 'pending').length} pending)</h4>
            </div>
            <div className="list-actions">
              <button className="btn-text" onClick={() => setFiles([])}>Discard All</button>
              <button 
                className={`btn-upload ${isReadyToUpload ? 'pulsing' : 'disabled'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  startUpload();
                }}
              >
                <Plus size={18} />
                {isReadyToUpload ? `Burn ${files.length} Tracks to Library` : 'Missing Metadata'}
              </button>
            </div>
          </div>

          <div className="files-scroll-area">
            {files.map((f) => (
              <div key={f.id} className={`file-row glass ${f.status}`}>
                <div className="file-id-icon">
                  {f.status === 'complete' ? <CheckCircle2 size={20} className="text-primary" /> : <FileMusic size={20} />}
                </div>
                <div className="file-main">
                  <div className="file-header">
                    <span className="file-name">{f.file.name}</span>
                    <span className="file-status-text">{f.status}</span>
                  </div>
                  <div className="progress-container">
                    <div className="progress-track">
                      <div className={`progress-fill ${f.status}`} style={{ width: `${f.progress}%` }}></div>
                    </div>
                    <span className="progress-pct">{Math.round(f.progress)}%</span>
                  </div>
                </div>
                <div className="file-action">
                  {f.status === 'uploading' ? (
                    <Loader2 size={18} className="spin text-primary" />
                  ) : (
                    <button className="remove-btn" onClick={(e) => { e.stopPropagation(); removeFile(f.id); }}>
                      <X size={18} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .bulk-upload-wrapper { display: flex; flex-direction: column; gap: 24px; width: 100%; }
        
        .batch-metadata { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding: 24px; border-radius: 20px; }
        .meta-field { position: relative; display: flex; align-items: center; }
        .meta-icon { position: absolute; left: 16px; color: #71717a; }
        .meta-field input, .meta-select { width: 100%; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 14px 14px 14px 48px; border-radius: 12px; color: white; font-size: 15px; font-weight: 600; outline: none; transition: all 0.2s; appearance: none; }
        .meta-field input:focus, .meta-select:focus { border-color: #1db954; background: rgba(29, 185, 84, 0.05); }
        .meta-select { cursor: pointer; }
        .meta-select option { background: #09090b; color: white; }
        .meta-field.invalid input { border-color: #ef4444; }
        .error-hint { position: absolute; right: 12px; font-size: 10px; font-weight: 800; color: #ef4444; text-transform: uppercase; }

        .dropzone { border: 2px dashed rgba(255, 255, 255, 0.1); border-radius: 24px; padding: 48px; text-align: center; position: relative; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .dropzone:hover { border-color: rgba(255,255,255,0.2); background: rgba(255,255,255,0.02); }
        .dropzone.dragging { border-color: #1db954; background: rgba(29, 185, 84, 0.05); transform: scale(1.02); }
        .dropzone.has-files { padding: 32px; border-style: solid; border-color: rgba(255,255,255,0.05); }

        .upload-icon-wrapper { width: 64px; height: 64px; border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; transition: transform 0.3s; }
        .dropzone:hover .upload-icon-wrapper { transform: translateY(-4px) scale(1.1); }
        
        .text-group h3 { font-size: 18px; font-weight: 900; margin-bottom: 4px; }
        .text-group p { font-size: 14px; color: #71717a; }

        .file-input { position: absolute; inset: 0; opacity: 0; cursor: pointer; display: none; }

        .files-list-section { display: flex; flex-direction: column; gap: 20px; }
        .list-controls { display: flex; justify-content: space-between; align-items: center; }
        .list-title { display: flex; align-items: center; gap: 10px; font-weight: 800; }
        .list-actions { display: flex; align-items: center; gap: 16px; }

        .btn-upload { display: flex; align-items: center; gap: 10px; background: #1db954; color: black; padding: 12px 24px; border-radius: 12px; font-size: 14px; font-weight: 800; transition: all 0.3s; }
        .btn-upload.disabled { opacity: 0.3; filter: grayscale(1); cursor: not-allowed; }
        .btn-upload.pulsing { animation: uploadPulse 2s infinite; }
        @keyframes uploadPulse { 0% { box-shadow: 0 0 0 0 rgba(29, 185, 84, 0.4); } 70% { box-shadow: 0 0 0 10px rgba(29, 185, 84, 0); } 100% { box-shadow: 0 0 0 0 rgba(29, 185, 84, 0); } }

        .files-scroll-area { display: flex; flex-direction: column; gap: 8px; max-height: 400px; overflow-y: auto; padding-right: 4px; }
        .file-row { padding: 16px; border-radius: 16px; display: grid; grid-template-columns: 48px 1fr 40px; align-items: center; gap: 16px; border: 1px solid rgba(255,255,255,0.03); }
        .file-main { display: flex; flex-direction: column; gap: 8px; }
        .file-header { display: flex; justify-content: space-between; align-items: center; }
        .file-name { font-size: 14px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .file-status-text { font-size: 10px; font-weight: 900; text-transform: uppercase; color: #71717a; letter-spacing: 0.5px; }

        .progress-container { display: flex; align-items: center; gap: 12px; }
        .progress-track { flex: 1; height: 4px; background: rgba(255,255,255,0.05); border-radius: 2px; overflow: hidden; }
        .progress-fill { height: 100%; background: #1db954; transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .progress-pct { font-size: 11px; font-weight: 800; color: #a1a1aa; width: 32px; text-align: right; }

        .remove-btn { color: #71717a; transition: color 0.2s; }
        .remove-btn:hover { color: #ef4444; }

        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .text-primary { color: #1db954; }
        .btn-text { color: #ef4444; font-size: 13px; font-weight: 700; }

        .upload-success-hero {
          padding: 60px;
          border-radius: 32px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
          background: rgba(29, 185, 84, 0.05);
          border: 1px solid rgba(29, 185, 84, 0.1);
        }

        .success-badge {
          width: 80px;
          height: 80px;
          background: rgba(29, 185, 84, 0.1);
          border-radius: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 8px;
        }

        .upload-success-hero h2 { font-size: 32px; font-weight: 900; letter-spacing: -1.5px; }
        .upload-success-hero p { font-size: 16px; color: #a1a1aa; max-width: 400px; line-height: 1.6; }
        .success-actions { display: flex; gap: 16px; margin-top: 12px; }

        .animate-in { animation: animateIn 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
        @keyframes animateIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default BulkUpload;
