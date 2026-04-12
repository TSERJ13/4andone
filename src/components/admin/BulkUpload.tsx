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
  Music,
  ArrowRight,
  Settings2,
  Activity,
  Tag as TagIcon,
  Trash2,
  Layers
} from 'lucide-react';
import { useStudio } from './StudioProvider';
import { createPresignedUrl } from '@/utils/r2-server';
import { 
  detectBPM, 
  getStyleFromBPM, 
  getMPMFromBPM 
} from '@/utils/audio';

interface Style { id: string; title: string; }
interface Tag { id: string; name: string; color: string; }
interface Folder { id: string; name: string; }

interface StagedFile {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  isAnalyzing?: boolean;
  errorMessage?: string;
  // Metadata fields per track
  title: string;
  bpm: string;
  duration: number;
  style: string;
  artist: string;
  album: string;
  tags: string[]; // Tag names
}

const BulkUpload = () => {
  const { addTrack, folders, styles, tags: availableTags } = useStudio();
  const [files, setFiles] = useState<StagedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  
  // Batch defaults (now optional)
  const [batchAlbum, setBatchAlbum] = useState('');
  const [batchArtist, setBatchArtist] = useState('');
  const [batchStyle, setBatchStyle] = useState('Samba');
  const [batchTags, setBatchTags] = useState<string[]>([]);
  const [targetFolderId, setTargetFolderId] = useState('');
  
  const [showValidation, setShowValidation] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = async (fileList: FileList | null) => {
    if (!fileList) return;
    
    const newFilesBase = Array.from(fileList)
      .filter(file => file.type.includes('audio') || file.name.endsWith('.mp3'))
      .map(file => {
        const id = Math.random().toString(36).substring(7);
        
        // Advanced Parsing (Artist - Title)
        let autoTitle = file.name.replace(/\.[^/.]+$/, "");
        let autoArtist = batchArtist || 'Unknown Artist';
        
        if (autoTitle.includes(' - ')) {
          const parts = autoTitle.split(' - ').map(s => s.trim());
          autoArtist = parts[0];
          autoTitle = parts[1];
        } else if (autoTitle.includes(' — ')) {
          const parts = autoTitle.split(' — ').map(s => s.trim());
          autoArtist = parts[0];
          autoTitle = parts[1];
        } else {
          autoTitle = autoTitle.replace(/[_\-]/g, ' ');
        }

        return {
          id,
          file,
          progress: 0,
          status: 'pending' as const,
          isAnalyzing: true,
          title: autoTitle,
          bpm: '0',
          duration: 0,
          style: batchStyle,
          artist: autoArtist,
          album: batchAlbum || 'Bulk Upload',
          tags: [...batchTags]
        };
      });

    setFiles(prev => [...prev, ...newFilesBase]);

    // Async Metadata Extraction
    for (const staged of newFilesBase) {
      try {
        // 1. Detect BPM
        const detectedBpm = await detectBPM(staged.file);
        
        // 2. Detect Duration
        const duration: number = await new Promise((resolve) => {
          const audio = new Audio();
          const objectUrl = URL.createObjectURL(staged.file);
          audio.src = objectUrl;
          audio.onloadedmetadata = () => {
            const d = Math.round(audio.duration);
            URL.revokeObjectURL(objectUrl);
            resolve(d);
          };
          audio.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(0);
          };
        });

        // 3. Match Style
        const bestStyle = getStyleFromBPM(detectedBpm, staged.file.name);

        setFiles(current => current.map(f => f.id === staged.id ? {
          ...f,
          bpm: detectedBpm > 0 ? detectedBpm.toString() : f.bpm,
          duration: duration || f.duration, // Prioritize non-zero duration
          style: (bestStyle && bestStyle !== 'Samba') ? bestStyle : f.style,
          isAnalyzing: false
        } : f));

      } catch (err) {
        console.error("[BULK-META-ERROR] Failed to analyze file:", staged.file.name, err);
        setFiles(current => current.map(f => f.id === staged.id ? { ...f, isAnalyzing: false } : f));
      }
    }
  };

  const updateFileMeta = (id: string, updates: Partial<StagedFile>) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const applyBatchMetadata = () => {
    setFiles(prev => prev.map(f => f.status === 'pending' ? {
      ...f,
      artist: batchArtist || f.artist,
      album: batchAlbum || f.album,
      style: batchStyle || f.style,
      tags: batchTags.length > 0 ? [...batchTags] : f.tags
    } : f));
  };

  const toggleTagInBatch = (tagName: string) => {
    setBatchTags(prev => 
      prev.includes(tagName) ? prev.filter(t => t !== tagName) : [...prev, tagName]
    );
  };

  const toggleTagInFile = (fileId: string, tagName: string) => {
    setFiles(prev => prev.map(f => {
      if (f.id !== fileId) return f;
      const newTags = f.tags.includes(tagName) 
        ? f.tags.filter(t => t !== tagName) 
        : [...f.tags, tagName];
      return { ...f, tags: newTags };
    }));
  };

  const startUpload = async () => {
    // Validation is now more relaxed
    setShowValidation(false);

    for (const f of files) {
      if (f.status !== 'pending') continue;

      try {
        setFiles(current => current.map(curr => curr.id === f.id ? { ...curr, status: 'uploading' } : curr));

        // 1. Get Presigned URL
        // SANITIZE: Remove special characters from filename for reliable R2 keys
        const safeName = f.file.name.replace(/[^\w.-]/g, '_');
        const storagePath = `tracks/${f.id}-${safeName}`;

        const { url, error } = await createPresignedUrl(
          storagePath,
          f.file.type || 'audio/mpeg'
        );

        if (error || !url) throw new Error(error || "Signed URL failed");

        // 2. Upload to R2
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', url, true);
        xhr.setRequestHeader('Content-Type', f.file.type || 'audio/mpeg');

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = (event.loaded / event.total) * 100;
            setFiles(current => current.map(curr => 
              curr.id === f.id ? { ...curr, progress } : curr
            ));
          }
        };

        const uploadPromise = new Promise((resolve, reject) => {
          xhr.onload = () => xhr.status === 200 ? resolve(true) : reject();
          xhr.onerror = () => reject();
        });

        xhr.send(f.file);
        await uploadPromise;

        // 3. Register in Supabase
        const baseUrl = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL || 'https://pub-c41b1121b311f676bdc114d143278d18.r2.dev').replace(/\/$/, '');
        // ENCODE: Ensure characters like # or ? are encoded for the public URL
        const publicUrl = `${baseUrl}/tracks/${f.id}-${encodeURIComponent(safeName)}`;
        
        await addTrack({
          title: f.title,
          artist: f.artist,
          album: f.album,
          style: f.style,
          bpm: f.bpm || '0',
          duration: f.duration || 0,
          audioUrl: publicUrl,
          folderId: targetFolderId || undefined,
          tags: f.tags
        });

        setFiles(current => current.map(curr => 
          curr.id === f.id ? { ...curr, status: 'complete', progress: 100 } : curr
        ));

      } catch (err: any) {
        console.error("[BULK-UPLOAD-ERROR] Failed for file:", f.file.name, err);
        setFiles(current => current.map(curr => 
          curr.id === f.id ? { ...curr, status: 'error', errorMessage: err.message || 'Upload failed' } : curr
        ));
      }
    }
  };

  const isAllComplete = files.length > 0 && files.every(f => f.status === 'complete');
  const isReadyToUpload = files.some(f => f.status === 'pending') && !files.some(f => f.isAnalyzing); 

  return (
    <div className="bulk-upload-wrapper">
      {isAllComplete ? (
        <div className="upload-success-hero glass animate-in">
          <div className="success-badge">
            <CheckCircle2 size={48} className="text-primary" />
          </div>
          <h2>Ingestion Successful!</h2>
          <p>{files.length} tracks have been professionally added to your studio collection.</p>
          <div className="success-actions">
            <button className="btn-primary" onClick={() => {
              setFiles([]);
              setBatchAlbum('');
              setBatchArtist('');
              setBatchTags([]);
            }}>Prepare Next Batch</button>
          </div>
        </div>
      ) : (
        <>
          <div className="batch-header-bar glass">
            <div className="batch-main-meta">
              <div className="inputs-row">
                <div className="meta-field">
                  <FolderPlus size={16} className="meta-icon" />
                  <input 
                    type="text" 
                    placeholder="Album / Collection (Optional)" 
                    value={batchAlbum}
                    onChange={(e) => setBatchAlbum(e.target.value)}
                  />
                </div>
                <div className="meta-field">
                  <User size={16} className="meta-icon" />
                  <input 
                    type="text" 
                    placeholder="Artist (Optional)" 
                    value={batchArtist}
                    onChange={(e) => setBatchArtist(e.target.value)}
                  />
                </div>
                <div className="meta-field">
                  <Layers size={16} className="meta-icon" />
                  <select 
                    className="meta-select"
                    value={batchStyle}
                    onChange={(e) => setBatchStyle(e.target.value)}
                  >
                    <option value="" disabled>Select Style</option>
                    {styles.map((s: Style) => <option key={s.id} value={s.title}>{s.title}</option>)}
                    {!styles.length && (
                      <>
                        <option value="Samba">Samba</option>
                        <option value="Cha Cha Cha">Cha Cha Cha</option>
                        <option value="Rumba">Rumba</option>
                        <option value="Paso Doble">Paso Doble</option>
                        <option value="Jive">Jive</option>
                        <option value="Waltz">Waltz</option>
                        <option value="Tango">Tango</option>
                        <option value="Viennese Waltz">Viennese Waltz</option>
                        <option value="Slow Foxtrot">Slow Foxtrot</option>
                        <option value="Quickstep">Quickstep</option>
                        <option value="Fitness">Fitness</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div className="batch-tags-row">
                 <div className="tags-label">
                   <TagIcon size={14} />
                   <span>Batch Tags:</span>
                 </div>
                 <div className="tags-scroller">
                    {availableTags.map((tag: Tag) => (
                      <button
                        key={tag.id}
                        className={`batch-tag-pill ${batchTags.includes(tag.name) ? 'active' : ''}`}
                        onClick={() => toggleTagInBatch(tag.name)}
                        style={{ 
                          '--tag-color': tag.color,
                          borderColor: batchTags.includes(tag.name) ? tag.color : 'rgba(255,255,255,0.05)'
                        } as any}
                      >
                        {tag.name}
                      </button>
                    ))}
                   {!availableTags.length && <span className="no-tags">No tags defined in taxonomy</span>}
                 </div>
              </div>
            </div>
            
            <div className="batch-actions-side">
               <div className="target-folder-box">
                  <span className="dest-label">Target Folder</span>
                  <select 
                    className="meta-select-sm"
                    value={targetFolderId}
                    onChange={(e) => setTargetFolderId(e.target.value)}
                  >
                    <option value="">Studio Inbox</option>
                    {folders.map((f: Folder) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
               </div>
            </div>
          </div>

          <div 
            className={`dropzone glass ${isDragging ? 'dragging' : ''} ${files.length > 0 ? 'has-files' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); processFiles(e.dataTransfer.files); }}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="dropzone-content">
              <div className="upload-icon-wrapper glass">
                <Upload size={28} className="text-primary" />
              </div>
              <div className="text-group">
                <h3>{files.length > 0 ? 'Batch Upload Active' : 'Ingest Quality Audio'}</h3>
                <p>Drag audio files or click to browse</p>
              </div>
              <input type="file" multiple accept="audio/*" onChange={(e) => processFiles(e.target.files)} className="hidden" ref={fileInputRef} />
            </div>
          </div>
        </>
      )}

      {files.length > 0 && !isAllComplete && (
        <div className="staging-area animate-in">
          <div className="staging-header">
            <div className="staging-title">
              <div className="queue-badge">QUEUE</div>
              <h4>{files.length} Tracks Staged</h4>
            </div>
            <div className="staging-actions">
              <button className="btn-discard" onClick={() => setFiles([])}>
                <Trash2 size={16} />
                <span>Discard Batch</span>
              </button>
              <button 
                className={`btn-burn ${isReadyToUpload ? 'active' : 'disabled'}`}
                onClick={startUpload}
              >
                <Plus size={18} />
                <span>{isReadyToUpload ? `Start Upload (${files.length} Tracks)` : 'Enter Collection & Artist'}</span>
              </button>
            </div>
          </div>

          <div className="staging-table">
            <div className="table-header">
              <div className="col-status">#</div>
              <div className="col-info">Track Info</div>
              <div className="col-style">Style</div>
              <div className="col-bpm">BPM</div>
              <div className="col-tags">Tags</div>
              <div className="col-actions"></div>
            </div>
            <div className="table-body">
              {files.map((f, idx) => (
                <div key={f.id} className={`table-row ${f.status}`}>
                  <div className="col-status">
                    {f.status === 'uploading' ? <Loader2 size={16} className="spin text-primary" /> : 
                     f.status === 'complete' ? <CheckCircle2 size={16} className="text-primary" /> : 
                     <span className="row-number">{idx + 1}</span>}
                  </div>
                  
                  <div className="col-info">
                    <input 
                      className="row-title-input"
                      value={f.title}
                      onChange={(e) => updateFileMeta(f.id, { title: e.target.value })}
                      placeholder="Title"
                    />
                  </div>

                  <div className="col-style">
                    <select 
                      className="row-select"
                      value={f.style}
                      onChange={(e) => updateFileMeta(f.id, { style: e.target.value })}
                    >
                      {styles.map((s: Style) => <option key={s.id} value={s.title}>{s.title}</option>)}
                      {!styles.length && <option value={f.style}>{f.style}</option>}
                    </select>
                  </div>

                  <div className="col-bpm">
                    {f.isAnalyzing ? <div className="analyzing-mini-spinner" /> : (
                      <input 
                        className="row-bpm-input"
                        value={f.bpm}
                        onChange={(e) => updateFileMeta(f.id, { bpm: e.target.value })}
                      />
                    )}
                  </div>

                  <div className="col-tags">
                    <div className="row-tags-list">
                      {availableTags.map((tag: Tag) => (
                        <button
                          key={tag.id}
                          className={`row-tag-btn ${f.tags.includes(tag.name) ? 'active' : ''}`}
                          onClick={() => toggleTagInFile(f.id, tag.name)}
                          style={{ '--tag-color': tag.color } as any}
                        >
                          {tag.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="col-actions">
                    <button className="row-remove" onClick={() => setFiles(prev => prev.filter(p => p.id !== f.id))}>
                      <X size={16} />
                    </button>
                  </div>

                  {f.status === 'uploading' && (
                    <div className="row-progress-overlay" style={{ width: `${f.progress}%` }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .bulk-upload-wrapper { display: flex; flex-direction: column; gap: 24px; width: 100%; }
        
        .batch-header-bar { 
          display: flex; gap: 32px; padding: 24px; border-radius: 24px;
          border: 1px solid rgba(255,255,255,0.05); background: rgba(255,255,255,0.02);
        }
        .batch-main-meta { flex: 1; display: flex; flex-direction: column; gap: 20px; }
        .inputs-row { display: flex; gap: 12px; }
        .meta-field { position: relative; flex: 1; display: flex; align-items: center; }
        .meta-icon { position: absolute; left: 14px; color: #71717a; }
        .meta-field input, .meta-select { 
          width: 100%; height: 44px; background: rgba(255,255,255,0.05); 
          border: 1px solid rgba(255,255,255,0.08); padding-left: 42px; 
          border-radius: 12px; color: white; font-size: 14px; font-weight: 600; outline: none; 
          transition: all 0.2s;
        }
        .meta-field input:focus, .meta-select:focus { border-color: #1db954; background: rgba(255,255,255,0.08); }
        .meta-select { cursor: pointer; }

        .batch-tags-row { display: flex; align-items: center; gap: 16px; }
        .tags-label { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 800; color: #71717a; text-transform: uppercase; }
        .tags-scroller { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; }
        .tags-scroller::-webkit-scrollbar { display: none; }
        
        .batch-tag-pill { 
          padding: 6px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; 
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05);
          color: #a1a1aa; cursor: pointer; transition: all 0.2s; white-space: nowrap;
        }
        .batch-tag-pill.active { background: var(--tag-color); color: black; border-color: transparent; }

        .batch-actions-side { display: flex; flex-direction: column; gap: 16px; justify-content: center; }
        .btn-apply { 
          height: 44px; padding: 0 24px; border-radius: 12px; font-size: 13px; 
          font-weight: 900; background: #1db954; color: black; border: none;
          white-space: nowrap; cursor: pointer; transition: transform 0.2s;
        }
        .btn-apply:hover { transform: translateY(-1px); background: #1ed760; }
        
        .target-folder-box { display: flex; flex-direction: column; gap: 6px; }
        .dest-label { font-size: 10px; font-weight: 900; color: #52525b; text-transform: uppercase; text-align: right; }
        .meta-select-sm { 
          background: rgba(255,255,255,0.05); color: #1db954; border: 1px solid rgba(29, 185, 84, 0.2); 
          height: 32px; padding: 0 12px; border-radius: 8px; font-size: 11px; font-weight: 800; cursor: pointer;
        }

        .dropzone { 
          border: 1px dashed rgba(255,255,255,0.1); border-radius: 24px; 
          padding: 32px; cursor: pointer; transition: all 0.2s; background: rgba(255,255,255,0.01);
        }
        .dropzone:hover { border-color: #1db954; background: rgba(29,185,84,0.03); }
        .dropzone-content { display: flex; align-items: center; gap: 24px; justify-content: center; }
        .upload-icon-wrapper { width: 56px; height: 56px; border-radius: 16px; display: flex; align-items: center; justify-content: center; background: rgba(29, 185, 84, 0.1); }
        .text-group h3 { font-size: 18px; font-weight: 900; margin-bottom: 2px; }
        .text-group p { font-size: 14px; color: #71717a; }

        .staging-area { display: flex; flex-direction: column; gap: 20px; }
        .staging-header { display: flex; justify-content: space-between; align-items: center; }
        .staging-title { display: flex; align-items: center; gap: 12px; }
        .queue-badge { font-size: 9px; font-weight: 950; background: rgba(29, 185, 84, 0.2); color: #1db954; padding: 3px 8px; border-radius: 4px; letter-spacing: 1px; }
        .staging-title h4 { font-size: 18px; font-weight: 900; }
        
        .staging-actions { display: flex; align-items: center; gap: 20px; }
        .btn-discard { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; color: #ef4444; background: none; border: none; cursor: pointer; opacity: 0.7; transition: opacity 0.2s; }
        .btn-discard:hover { opacity: 1; }
        .btn-burn { 
          display: flex; align-items: center; gap: 10px; padding: 12px 28px; 
          border-radius: 14px; font-size: 14px; font-weight: 950; background: #1db954; 
          color: black; border: none; cursor: pointer; transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .btn-burn.active:hover { transform: scale(1.05); box-shadow: 0 8px 24px rgba(29, 185, 84, 0.3); }
        .btn-burn.disabled { opacity: 0.2; filter: grayscale(1); cursor: not-allowed; }

        /* TABLE VIEW */
        .staging-table { 
          background: rgba(255,255,255,0.02); border-radius: 20px; overflow: hidden; 
          border: 1px solid rgba(255,255,255,0.05);
        }
        .table-header { 
          display: grid; grid-template-columns: 50px 1fr 180px 80px 240px 60px;
          padding: 16px 20px; background: rgba(255,255,255,0.03);
          font-size: 11px; font-weight: 900; color: #52525b; text-transform: uppercase; letter-spacing: 0.5px;
        }
        .table-body { max-height: 480px; overflow-y: auto; }
        .table-row { 
          display: grid; grid-template-columns: 50px 1fr 180px 80px 240px 60px;
          padding: 12px 20px; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.03);
          position: relative; transition: background 0.2s;
        }
        .table-row:hover { background: rgba(255,255,255,0.03); }
        
        .col-status { text-align: center; color: #52525b; }
        .row-number { font-size: 12px; font-weight: 800; }
        .row-title-input { background: transparent; border: none; color: white; font-size: 14px; font-weight: 700; width: 100%; outline: none; }
        .row-select { background: rgba(255,255,255,0.05); border: none; color: #a1a1aa; font-size: 12px; font-weight: 700; padding: 4px 8px; border-radius: 6px; width: 100%; cursor: pointer; outline: none; }
        .row-bpm-input { background: rgba(255,255,255,0.05); border: none; color: white; font-size: 12px; font-weight: 800; width: 50px; text-align: center; padding: 4px; border-radius: 6px; outline: none; }
        
        .row-tags-list { display: flex; flex-wrap: wrap; gap: 4px; }
        .row-tag-btn { 
          font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 4px;
          background: rgba(255,255,255,0.03); color: #52525b; border: 1px solid rgba(255,255,255,0.05);
          cursor: pointer; transition: all 0.2s;
        }
        .row-tag-btn.active { background: var(--tag-color); color: black; border-color: transparent; }

        .row-remove { color: #3f3f46; background: none; border: none; cursor: pointer; transition: color 0.2s; }
        .row-remove:hover { color: #ef4444; }

        .row-progress-overlay { 
          position: absolute; bottom: 0; left: 0; height: 100%; 
          background: rgba(29, 185, 84, 0.05); border-right: 2px solid #1db954;
          z-index: -1; transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .analyzing-mini-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-top: 2px solid #1db954;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .upload-success-hero { padding: 64px; border-radius: 32px; text-align: center; border: 1px solid rgba(29, 185, 84, 0.1); }
        .success-badge { width: 80px; height: 80px; background: rgba(29, 185, 84, 0.1); border-radius: 24px; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; }
        .btn-primary { background: #1db954; color: black; border: none; padding: 14px 32px; border-radius: 12px; font-size: 15px; font-weight: 900; cursor: pointer; transition: transform 0.2s; }
        .btn-primary:hover { transform: scale(1.02); background: #1ed760; }

        .text-primary { color: #1db954; }
        .spin { animation: spin 1s linear infinite; }
        .hidden { display: none; }
        .animate-in { animation: animIn 0.5s cubic-bezier(0.4, 0, 0.2, 1); }
        @keyframes animIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        
        @media (max-width: 1200px) {
          .table-header, .table-row { grid-template-columns: 50px 1fr 140px 60px 180px 50px; }
        }

        @media (max-width: 900px) {
          .batch-header-bar { flex-direction: column; gap: 20px; }
          .batch-actions-side { flex-direction: row; justify-content: space-between; align-items: center; }
          .table-header { display: none; }
          .table-row { grid-template-columns: 1fr 1fr; gap: 12px; padding: 20px; height: auto; }
          .col-status, .col-actions { display: none; }
          .col-info, .col-style, .col-bpm, .col-tags { grid-column: span 2; }
          .row-title-input { font-size: 16px; border-bottom: 1px solid rgba(255,255,255,0.1); }
        }
      `}</style>
    </div>
  );
};

export default BulkUpload;
