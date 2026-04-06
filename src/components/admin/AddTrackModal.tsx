"use client";

import React, { useState, useRef } from 'react';
import { X, Music, User, Globe, Activity, Upload, CheckCircle2, ChevronDown, AlertTriangle } from 'lucide-react';
import { saveAudioFile } from '@/utils/storage';
import { detectBPM, getStyleFromBPM, getMPMFromBPM, getBPMFromMPM } from '@/utils/audio';
import { useStudio } from './StudioProvider';

interface AddTrackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (track: any) => void;
  initialData?: any;
}

const AddTrackModal = ({ isOpen, onClose, onAdd, initialData }: AddTrackModalProps) => {
  const { styles, tags } = useStudio();
  
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    artist: initialData?.artist || '',
    style: initialData?.style || (styles.length > 0 ? styles[0].title : 'Samba'),
    tags: initialData?.tags || ([] as string[]),
    bpm: initialData?.bpm || '',
    album: initialData?.album || ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isStyleDropdownOpen, setIsStyleDropdownOpen] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [mpm, setMpmState] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (isOpen && initialData) {
      setValidationError(null);
      setFormData({
        title: initialData.title,
        artist: initialData.artist,
        style: initialData.style,
        tags: initialData.tags || [],
        bpm: initialData.bpm,
        album: initialData.album
      });
      setMpmState(getMPMFromBPM(Number(initialData.bpm), initialData.style).toString());
    } else if (isOpen && !initialData) {
      setValidationError(null);
      const defaultStyle = styles.length > 0 ? styles[0].title : 'Samba';
      setFormData({ 
        title: '', 
        artist: '', 
        style: defaultStyle, 
        tags: [],
        bpm: '', 
        album: '' 
      });
      setMpmState('');
    }
  }, [isOpen, initialData, styles]);

  // Click outside to close dropdown
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsStyleDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setIsAnalyzing(true);

      // 1. Auto-parse filename (Artist - Title)
      let autoTitle = file.name.replace(/\.[^/.]+$/, "");
      let autoArtist = formData.artist;
      
      if (autoTitle.includes('-')) {
        const parts = autoTitle.split('-').map(s => s.trim());
        autoArtist = parts[0];
        autoTitle = parts[1];
      } else if (autoTitle.includes('—')) { // Long dash
        const parts = autoTitle.split('—').map(s => s.trim());
        autoArtist = parts[0];
        autoTitle = parts[1];
      }

      setFormData(prev => ({ 
        ...prev, 
        title: autoTitle, 
        artist: autoArtist 
      }));

      // 2. Detect BPM and Auto-Select Style
      try {
        console.log(`[BPM-CHECK] Analysis started for ${file.name}`);
        const detectedBpm = await detectBPM(file);
        const bestStyle = getStyleFromBPM(detectedBpm, file.name);
        
        console.log(`[BPM-CHECK] Result: ${detectedBpm} BPM, Style: ${bestStyle}`);

        // Immediate state update
        if (detectedBpm > 0) {
          setFormData(prev => ({ 
            ...prev, 
            bpm: detectedBpm.toString(),
            style: bestStyle 
          }));
          const calMpm = getMPMFromBPM(detectedBpm, bestStyle);
          setMpmState(calMpm.toString());
          console.log(`[BPM-CHECK] State updated with BPM: ${detectedBpm}, Bars/Min: ${calMpm}`);
        } else {
          console.warn(`[BPM-CHECK] Analysis yielded 0 BPM. Manual entry required.`);
          setFormData(prev => ({ ...prev, style: bestStyle }));
        }
      } catch (err) {
        console.error("[BPM-CHECK] Critical error:", err);
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    if (!selectedFile && !initialData) {
      setValidationError("Please select an audio file first.");
      return;
    }
    setIsSubmitting(true);

    try {
      const trackId = initialData?.id || `track_${Date.now()}`;
      let audioUrl = initialData?.audioUrl || '';
      let duration = initialData?.duration || 0;

      if (selectedFile) {
        setIsSubmitting(true);
        console.log(`[UPLOAD-START] Preparing signs for: ${selectedFile.name}`);

        // 1. Get Presigned URL
        const signRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: selectedFile.name,
            fileType: selectedFile.type || 'audio/mpeg'
          })
        });

        if (!signRes.ok) {
          const err = await signRes.json();
          throw new Error(err.error || 'Failed to request upload signature');
        }

        const { uploadUrl, publicUrl } = await signRes.json();
        console.log(`[UPLOAD-SIGN] Signature received. Origin: Browser -> R2`);

        // 2. Direct Binary Upload to Cloudflare R2
        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          body: selectedFile,
          headers: {
            'Content-Type': selectedFile.type || 'audio/mpeg'
          }
        });

        if (!uploadRes.ok) {
          console.error(`[R2-UPLOAD] Error Status: ${uploadRes.status}`);
          const errorText = await uploadRes.text();
          console.error(`[R2-UPLOAD] Error Body: ${errorText}`);
          throw new Error(`Direct R2 upload failed (Status: ${uploadRes.status}). Check browser console for details.`);
        }

        console.log(`[UPLOAD-DONE] Storage success. Public URL: ${publicUrl}`);
        audioUrl = publicUrl;

        // 3. Calculate Duration (only if new file)
        duration = await new Promise((resolve) => {
          const audio = new Audio();
          audio.src = URL.createObjectURL(selectedFile!);
          audio.onloadedmetadata = () => {
            resolve(Math.round(audio.duration));
            URL.revokeObjectURL(audio.src);
          };
        });
      }

      // 3. Save Metadata to Supabase
      onAdd({ 
        ...formData, 
        audioUrl,
        id: trackId, 
        duration,
        date: initialData?.date || new Date().toISOString().split('T')[0] 
      });

      setIsSuccess(true);
      setTimeout(() => {
        setIsSubmitting(false);
        setIsSuccess(false);
        onClose();
      }, 1500);

    } catch (err: any) {
      console.error("Cloud Upload Failed:", err);
      setValidationError(err.message || "Failed to upload to Cloudflare R2.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass animate-in">
        <header className="modal-header">
          <div className="header-title">
            <div className="icon-box glass">
              <Plus size={20} className="text-primary" />
            </div>
            <div>
              <h3>Add New Track</h3>
              <p>Enter professional metadata for the library.</p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </header>

        {isSuccess ? (
          <div className="success-state">
            <div className="success-icon animate-bounce">
              <CheckCircle2 size={64} className="text-primary" />
            </div>
            <h3>Track Added Successfully!</h3>
            <p>"{formData.title}" is now part of the 4and.one library.</p>
          </div>
        ) : (
          <form className="modal-form" onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group full">
                <label>Track Title</label>
                <div className="input-wrapper">
                  <Music size={16} />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Midnight Samba"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Artist / Composer</label>
                <div className="input-wrapper">
                  <User size={16} />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rio Ensemble"
                    value={formData.artist}
                    onChange={e => setFormData({ ...formData, artist: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Album (Optional)</label>
                <div className="input-wrapper">
                  <Globe size={16} />
                  <input
                    type="text"
                    placeholder="e.g. Latin Gold"
                    value={formData.album}
                    onChange={e => setFormData({ ...formData, album: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group custom-style-selector" ref={dropdownRef}>
                <label>Dance Style</label>
                <div 
                  className={`style-picker-trigger glass ${isStyleDropdownOpen ? 'is-open' : ''}`}
                  onClick={() => setIsStyleDropdownOpen(!isStyleDropdownOpen)}
                >
                  <span className="current-style-badge">
                     <span className="dot" style={{ backgroundColor: '#1db954' }}></span>
                     {formData.style}
                  </span>
                  <ChevronDown size={14} className={`chevron ${isStyleDropdownOpen ? 'rotated' : ''}`} />
                </div>
                
                {isStyleDropdownOpen && (
                  <div className="style-dropdown-menu glass animate-in-slide">
                    {styles.map(s => (
                      <div 
                        key={s.id} 
                        className={`style-option ${formData.style === s.title ? 'selected' : ''}`}
                        onClick={() => {
                          setFormData({ ...formData, style: s.title });
                          if (formData.bpm) {
                            setMpmState(getMPMFromBPM(Number(formData.bpm), s.title).toString());
                          }
                          setIsStyleDropdownOpen(false);
                        }}
                      >
                        <span className="dot" style={{ backgroundColor: '#1db954' }}></span>
                        {s.title}
                      </div>
                    ))}
                    {styles.length === 0 && (
                      ['Samba', 'Cha-Cha-Cha', 'Rumba', 'Paso Doble', 'Jive'].map(s => (
                        <div 
                          key={s} 
                          className={`style-option ${formData.style === s ? 'selected' : ''}`}
                          onClick={() => {
                            setFormData({ ...formData, style: s });
                            setIsStyleDropdownOpen(false);
                          }}
                        >
                          <span className="dot" style={{ backgroundColor: '#1db954' }}></span>
                          {s}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>BPM (Beats/Min)</label>
                <div className="input-wrapper">
                  <Activity size={16} />
                  <input
                    type="number"
                    placeholder="e.g. 120"
                    value={formData.bpm}
                    onChange={e => {
                      const val = e.target.value;
                      setFormData({ ...formData, bpm: val });
                      if (val) {
                         setMpmState(getMPMFromBPM(Number(val), formData.style).toString());
                      }
                    }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Bars/Min</label>
                <div className="input-wrapper">
                  <Activity size={16} />
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 30"
                    value={mpm}
                    onChange={e => {
                      const val = e.target.value;
                      setMpmState(val);
                      if (val) {
                         const calculatedBpm = getBPMFromMPM(Number(val), formData.style);
                         setFormData({ ...formData, bpm: calculatedBpm.toString() });
                      }
                    }}
                  />
                </div>
              </div>

              <div className="form-group full">
                <label>Track Tags</label>
                <div className="tags-selection">
                  {tags.map(tag => {
                    const isSelected = formData.tags.includes(tag.name);
                    return (
                      <button 
                        type="button"
                        key={tag.id}
                        className={`tag-toggle-btn ${isSelected ? 'active' : ''}`}
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev, 
                            tags: isSelected 
                              ? prev.tags.filter((t: string) => t !== tag.name)
                              : [...prev.tags, tag.name]
                          }))
                        }}
                      >
                        <span className="tag-dot" style={{ backgroundColor: tag.color }}></span>
                        {tag.name}
                      </button>
                    )
                  })}
                  {tags.length === 0 && <span style={{ fontSize: '12px', color: '#71717a' }}>No tags created yet. Manage them in Categories & Tags.</span>}
                </div>
              </div>
            </div>

            <input 
              type="file" 
              className="hidden-file-input" 
              accept="audio/*" 
              ref={fileInputRef} 
              onChange={handleFileChange}
            />

            <div 
              className={`file-upload-zone glass ${selectedFile ? 'has-file' : ''}`}
              onClick={() => !isAnalyzing && fileInputRef.current?.click()}
            >
              {isAnalyzing ? (
                <>
                  <div className="analyzing-spinner"></div>
                  <div className="file-preview">
                     <p className="f-name">Analysing Audio...</p>
                     <p className="f-size">Smart Onset Detection Active</p>
                  </div>
                </>
              ) : selectedFile ? (
                <>
                  <CheckCircle2 size={24} className="text-primary" />
                  <div className="file-preview">
                    <p className="f-name">{selectedFile.name}</p>
                    <p className="f-size">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Analysis Complete</p>
                  </div>
                </>
              ) : (
                <>
                  <Upload size={24} />
                  <p>Click to select audio file (MP3, WAV)</p>
                </>
              )}
            </div>

            {validationError && (
              <div className="error-message animate-shake">
                <AlertTriangle size={16} />
                <span>{validationError}</span>
              </div>
            )}

            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={onClose} disabled={isAnalyzing || isSubmitting}>Cancel</button>
              <button 
                type="submit" 
                className="btn-primary" 
                disabled={isSubmitting || isAnalyzing || (!selectedFile && !initialData)}
              >
                {isAnalyzing ? (
                  <div className="flex items-center gap-2">
                    <div className="analyzing-spinner-small"></div>
                     Analysing...
                  </div>
                ) : isSubmitting ? 'Processing...' : 'Add to Library'}
              </button>
            </div>
          </form>
        )}
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.8);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          padding: 20px;
        }

        .modal-content {
          width: 100%;
          max-width: 600px;
          border-radius: 32px;
          padding: 40px;
          position: relative;
        }

        .modal-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
        .header-title { display: flex; gap: 16px; align-items: center; }
        .header-title h3 { font-size: 24px; font-weight: 800; letter-spacing: -1px; }
        .header-title p { font-size: 14px; color: #71717a; }

        .icon-box { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
        .close-btn { color: #71717a; transition: color 0.2s; }
        .close-btn:hover { color: white; }

        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
        .form-group.full { grid-column: span 2; }
        .form-group label { display: block; font-size: 12px; font-weight: 800; text-transform: uppercase; margin-bottom: 8px; color: #71717a; letter-spacing: 0.5px; }

        .input-wrapper { position: relative; display: flex; align-items: center; }
        .input-wrapper :global(svg) { position: absolute; left: 14px; color: #71717a; }
        .input-wrapper input { width: 100%; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 12px 12px 12px 42px; border-radius: 12px; color: white; outline: none; transition: border-color 0.2s; }
        .input-wrapper input:focus { border-color: #1db954; }

        .glass-select { width: 100%; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 12px; border-radius: 12px; color: white; outline: none; appearance: none; }

        .hidden-file-input { display: none; }
        .file-upload-zone { border: 2px dashed rgba(255,255,255,0.1); border-radius: 20px; padding: 24px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 8px; font-size: 13px; color: #71717a; cursor: pointer; transition: all 0.2s; margin-bottom: 32px; }
        .file-upload-zone:hover { border-color: #1db954; background: rgba(29, 185, 84, 0.05); color: white; }
        .file-upload-zone.has-file { border-color: #1db954; background: rgba(29, 185, 84, 0.05); color: white; flex-direction: row; gap: 16px; padding: 16px 24px; text-align: left; }
        .file-preview { flex: 1; min-width: 0; }
        .f-name { font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .f-size { font-size: 11px; color: #1db954; font-weight: 800; }

        .modal-footer { display: flex; justify-content: flex-end; gap: 12px; }

        .success-state { text-align: center; padding: 40px 0; }
        .success-icon { margin-bottom: 24px; display: flex; justify-content: center; }
        .success-state h3 { font-size: 24px; font-weight: 800; margin-bottom: 8px; }
        .success-state p { color: #71717a; }

        .text-primary { color: #1db954; }
        .animate-in { animation: animateIn 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
        @keyframes animateIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        .animate-bounce { animation: bounce 1s infinite; }

        .analyzing-spinner {
          width: 24px;
          height: 24px;
          border: 3px solid rgba(29, 185, 84, 0.1);
          border-top: 3px solid #1db954;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .analyzing-spinner-small {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .error-message {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 24px;
          border: 1px solid rgba(239, 68, 68, 0.1);
        }

        .animate-shake {
          animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
        }

        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }

        .tags-selection {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 4px;
        }

        .tag-toggle-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
          color: #a1a1aa;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .tag-toggle-btn:hover {
          background: rgba(255,255,255,0.08);
          color: white;
        }

        .tag-toggle-btn.active {
          background: rgba(255,255,255,0.1);
          border-color: rgba(255,255,255,0.3);
          color: white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }

        .tag-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        /* CUSTOM STYLE PICKER */
        .custom-style-selector { position: relative; }
        .style-picker-trigger {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 16px;
          border-radius: 12px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          cursor: pointer;
          transition: all 0.2s;
          height: 48px;
        }
        .style-picker-trigger:hover { background: rgba(255,255,255,0.06); }
        .current-style-badge { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 14px; }
        .current-style-badge .dot { width: 8px; height: 8px; border-radius: 50%; }
        .chevron { transition: transform 0.2s; color: #71717a; }
        .chevron.rotated { transform: rotate(180deg); }

        .style-dropdown-menu {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          z-index: 100;
          margin-top: 8px;
          border-radius: 16px;
          overflow: hidden;
          background: rgba(0,0,0,0.4);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
          max-height: 300px;
          overflow-y: auto;
        }

        .style-option {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 20px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .style-option:hover { background: rgba(255,255,255,0.05); }
        .style-option.selected { color: var(--primary); background: rgba(29, 185, 84, 0.1); }
        .style-option .dot { width: 8px; height: 8px; border-radius: 50%; }

        @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-in-slide { animation: slideDown 0.2s ease-out; }
      `}</style>
    </div>
  );
};


const Plus = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

export default AddTrackModal;
