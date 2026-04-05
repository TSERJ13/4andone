"use client";

import React, { useState, useRef } from 'react';
import { X, Music, User, Globe, Activity, Upload, CheckCircle2 } from 'lucide-react';
import { saveAudioFile } from '@/utils/storage';

interface AddTrackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (track: any) => void;
  initialData?: any;
}

const AddTrackModal = ({ isOpen, onClose, onAdd, initialData }: AddTrackModalProps) => {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    artist: initialData?.artist || '',
    style: initialData?.style || 'Samba',
    bpm: initialData?.bpm || '',
    album: initialData?.album || ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state if initialData changes (e.g. switching between Add and Repair)
  React.useEffect(() => {
    if (isOpen && initialData) {
      setFormData({
        title: initialData.title,
        artist: initialData.artist,
        style: initialData.style,
        bpm: initialData.bpm,
        album: initialData.album
      });
    } else if (isOpen && !initialData) {
      setFormData({ title: '', artist: '', style: 'Samba', bpm: '', album: '' });
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!formData.title) {
        setFormData(prev => ({ ...prev, title: file.name.replace(/\.[^/.]+$/, "") }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      alert("Please select an audio file first.");
      return;
    }
    setIsSubmitting(true);

    try {
      // Use existing ID if repairing, otherwise generate a robust timestamp-based ID
      const trackId = initialData?.id || `track_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Save binary to IndexedDB for persistence
      await saveAudioFile(trackId, selectedFile);

      // Generate temporary session URL for immediate playback
      const audioUrl = URL.createObjectURL(selectedFile);

      // Simulate a bit of processing for UX
      setTimeout(() => {
        setIsSubmitting(false);
        setIsSuccess(true);
        setTimeout(() => {
          onAdd({ 
            ...formData, 
            audioUrl,
            id: trackId, 
            date: initialData?.date || new Date().toISOString().split('T')[0] 
          });
          setIsSuccess(false);
          if (!initialData) {
            setFormData({ title: '', artist: '', style: 'Samba', bpm: '', album: '' });
          }
          setSelectedFile(null);
          onClose();
        }, 1200);
      }, 800);
    } catch (err) {
      console.error("Failed to save track:", err);
      alert("Failed to save track to local storage. Please try again.");
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

              <div className="form-group">
                <label>Dance Style</label>
                <select
                  className="glass-select"
                  value={formData.style}
                  onChange={e => setFormData({ ...formData, style: e.target.value })}
                >
                  <option>Samba</option>
                  <option>Cha-cha-cha</option>
                  <option>Rumba</option>
                  <option>Paso Doble</option>
                  <option>Jive</option>
                  <option>Slow Waltz</option>
                  <option>Tango</option>
                </select>
              </div>

              <div className="form-group">
                <label>BPM</label>
                <div className="input-wrapper">
                  <Activity size={16} />
                  <input
                    type="number"
                    placeholder="e.g. 52"
                    value={formData.bpm}
                    onChange={e => setFormData({ ...formData, bpm: e.target.value })}
                  />
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
              onClick={() => fileInputRef.current?.click()}
            >
              {selectedFile ? (
                <>
                  <CheckCircle2 size={24} className="text-primary" />
                  <div className="file-preview">
                    <p className="f-name">{selectedFile.name}</p>
                    <p className="f-size">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                  </div>
                </>
              ) : (
                <>
                  <Upload size={24} />
                  <p>Click to select audio file (MP3, WAV)</p>
                </>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={isSubmitting || !selectedFile}>
                {isSubmitting ? 'Processing...' : 'Add to Library'}
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
