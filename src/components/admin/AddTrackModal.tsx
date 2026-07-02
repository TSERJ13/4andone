"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Music, User, Globe, Activity, Upload, CheckCircle2, AlertTriangle } from 'lucide-react';
import { detectBPM, getStyleFromBPM, getMPMFromBPM, getBPMFromMPM } from '@/utils/audio';
import { useStudio } from './StudioProvider';

interface AddTrackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (track: any) => Promise<void> | void;
  initialData?: any;
}

const AddTrackModal = ({ isOpen, onClose, onAdd, initialData }: AddTrackModalProps) => {
  const { styles, tags, refreshData } = useStudio();
  
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    artist: initialData?.artist || '',
    style: initialData?.style || (styles.length > 0 ? styles[0].title : 'Samba'),
    tags: initialData?.tags || ([] as string[]),
    bpm: initialData?.bpm || '',
    artworkUrl: initialData?.artworkUrl || '',
    isClosed: initialData?.tags?.some((t: string) => t.toLowerCase() === 'closed' || t === 'დახურული') || false
  });

  const [pasoTheme, setPasoTheme] = useState<string>(() => {
    if (initialData?.tags?.includes('paso-2-theme')) return '2-theme';
    if (initialData?.tags?.includes('paso-3-theme')) return '3-theme';
    return '';
  });
  
  const [pasoVersion, setPasoVersion] = useState<string>(() => {
    if (initialData?.tags?.includes('paso-wdsf')) return 'wdsf';
    if (initialData?.tags?.includes('paso-other')) return 'other';
    return '';
  });

  const [recentArtists, setRecentArtists] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(initialData?.artworkUrl || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [mpm, setMpmState] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setFormData({
      title: '', artist: '', 
      style: styles.length > 0 ? styles[0].title : 'Samba',
      tags: [], bpm: '', artworkUrl: '', isClosed: false
    });
    setSelectedFile(null); setCoverFile(null); setCoverPreview(null); setMpmState('');
    setPasoTheme(''); setPasoVersion('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (coverInputRef.current) coverInputRef.current.value = '';
  };

  useEffect(() => {
    const saved = localStorage.getItem('recentArtists');
    if (saved) setRecentArtists(JSON.parse(saved));

    if (isOpen && initialData) {
      setFormData({
        title: initialData.title,
        artist: initialData.artist,
        style: initialData.style,
        tags: initialData.tags || [],
        bpm: initialData.bpm,
        artworkUrl: initialData.artworkUrl || '',
        isClosed: initialData.tags?.some((t: string) => t.toLowerCase() === 'closed' || t === 'დახურული') || false
      });
      setCoverPreview(initialData.artworkUrl || null);
      if (initialData.bpm) setMpmState(getMPMFromBPM(Number(initialData.bpm), initialData.style).toString());
      setPasoTheme(initialData.tags?.includes('paso-2-theme') ? '2-theme' : initialData.tags?.includes('paso-3-theme') ? '3-theme' : '');
      setPasoVersion(initialData.tags?.includes('paso-wdsf') ? 'wdsf' : initialData.tags?.includes('paso-other') ? 'other' : '');
    } else if (isOpen && !initialData) {
      resetForm();
    }
  }, [isOpen, initialData, styles]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setIsAnalyzing(true);

      let autoTitle = file.name.replace(/\.[^/.]+$/, "");
      let autoArtist = '';
      if (autoTitle.includes('-')) {
        const parts = autoTitle.split('-').map(s => s.trim());
        autoTitle = parts[0]; autoArtist = parts[1] || '';
      }

      const normalizedName = file.name.toLowerCase();
      const detectedStyle = styles.find(s => normalizedName.includes(s.title.toLowerCase()));

      setFormData(prev => ({ 
        ...prev, 
        title: autoTitle, 
        artist: autoArtist,
        style: detectedStyle ? detectedStyle.title : prev.style 
      }));

      try {
        const detectedBpm = await detectBPM(file);
        if (detectedBpm > 0) {
          const finalStyle = detectedStyle ? detectedStyle.title : getStyleFromBPM(detectedBpm, file.name);
          setFormData(prev => ({ ...prev, bpm: detectedBpm.toString(), style: finalStyle }));
          setMpmState(getMPMFromBPM(detectedBpm, finalStyle).toString());
        }
      } catch (err) { console.error(err); } finally { setIsAnalyzing(false); }
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    if (!selectedFile && !initialData) return setValidationError("Please select an audio file.");
    setIsSubmitting(true);

    try {
      let audioUrl = initialData?.audioUrl || '';
      let artworkUrl = formData.artworkUrl;
      let duration = initialData?.duration || 0;

      if (selectedFile) {
        const signRes = await fetch('/api/upload', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: selectedFile.name, fileType: selectedFile.type || 'audio/mpeg' })
        });
        const { uploadUrl, publicUrl } = await signRes.json();
        await fetch(uploadUrl, { method: 'PUT', body: selectedFile, headers: { 'Content-Type': selectedFile.type } });
        audioUrl = publicUrl;
        
        duration = await new Promise((resolve) => {
          const audio = new Audio(); audio.src = URL.createObjectURL(selectedFile);
          audio.onloadedmetadata = () => { resolve(Math.round(audio.duration)); URL.revokeObjectURL(audio.src); };
        });
      }

      if (coverFile) {
        const signRes = await fetch('/api/upload', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: `covers/${Date.now()}_${coverFile.name}`, fileType: coverFile.type || 'image/jpeg' })
        });
        const { uploadUrl, publicUrl } = await signRes.json();
        await fetch(uploadUrl, { method: 'PUT', body: coverFile, headers: { 'Content-Type': coverFile.type } });
        artworkUrl = publicUrl;
      }

      let finalTags = [...formData.tags].filter(t => !t.startsWith('paso-'));
      if (formData.style === 'Paso Doble') {
        if (pasoTheme) finalTags.push(`paso-${pasoTheme}`);
        if (pasoVersion) finalTags.push(`paso-${pasoVersion}`);
      }

      await onAdd({ ...formData, tags: finalTags, audioUrl, artworkUrl, duration, id: initialData?.id || `track_${Date.now()}` });
      if (formData.artist && !recentArtists.includes(formData.artist)) {
        const updated = [formData.artist, ...recentArtists.slice(0, 11)];
        setRecentArtists(updated);
        localStorage.setItem('recentArtists', JSON.stringify(updated));
      }
      await refreshData();
      setIsSuccess(true);
      setTimeout(() => { setIsSubmitting(false); setIsSuccess(false); onClose(); }, 1500);
    } catch (err: any) { setValidationError(err.message || "Failed to upload."); setIsSubmitting(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass animate-in">
        <header className="modal-header">
          <div className="header-title centered"><h3>Add New Track</h3></div>
        </header>

        {isSuccess ? (
          <div className="success-state"><CheckCircle2 size={64} className="text-primary animate-bounce" /><h3>Success!</h3></div>
        ) : (
          <form className="modal-form" onSubmit={handleSubmit}>
            <div className="form-redistribution-row">
              {/* Left Column: Artwork */}
              <div className="artwork-column">
                <div className="artwork-compact-dropzone large" onClick={() => coverInputRef.current?.click()}>
                  {coverPreview ? <img src={coverPreview} alt="Artwork" /> : <div className="placeholder"><Upload size={40} /></div>}
                  <input type="file" ref={coverInputRef} hidden accept="image/*" onChange={handleCoverChange} />
                </div>
              </div>

              {/* Right Column: Primary Metadata */}
              <div className="primary-info-column">
                <div className="form-group full">
                  <label>Track Title</label>
                  <div className="input-wrapper large focus-glow"><Music size={20} />
                    <input type="text" required placeholder="Midnight Samba..." value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                  </div>
                </div>

                <div className="form-group full">
                  <label>Artists / Composers</label>
                  <div className="input-wrapper large focus-glow"><User size={20} />
                    <input type="text" placeholder="Artists..." value={formData.artist} onChange={e => setFormData({ ...formData, artist: e.target.value })} />
                  </div>
                  {recentArtists.length > 0 && (
                    <div className="recent-artists">
                      {recentArtists.map(a => (
                        <button type="button" key={a} className="artist-suggestion" onClick={() => setFormData({ ...formData, artist: a })}>{a}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="secondary-fields-box">
              <div className="form-group full">
                <label>Dance Style (Automatic Detection)</label>
                <div className="styles-list">
                  {styles.map(s => {
                    const isSelected = formData.style === s.title;
                    const styleColors: Record<string, string> = {
                      'Samba': '#1db954', 'Cha-Cha-Cha': '#f87171', 'Rumba': '#fbbf24', 'Paso Doble': '#ef4444', 'Jive': '#60a5fa',
                      'Slow Waltz': '#a78bfa', 'Tango': '#c084fc', 'Viennese Waltz': '#f472b6', 'Slow Foxtrot': '#34d399', 'Quickstep': '#fb923c'
                    };
                    const color = s.color || styleColors[s.title] || '#1db954';
                    return (
                      <button type="button" key={s.id} className={`style-chip ${isSelected ? 'active' : ''}`} style={{ '--chip-color': color } as React.CSSProperties} onClick={() => {
                        setFormData({ ...formData, style: s.title });
                        if (formData.bpm) setMpmState(getMPMFromBPM(Number(formData.bpm), s.title).toString());
                      }}>
                        <div className="dot"></div>{s.title}
                      </button>
                    );
                  })}
                </div>
              </div>

              {formData.style === 'Paso Doble' && (
                <div className="form-grid-split" style={{ marginBottom: '24px', background: 'rgba(239, 68, 68, 0.05)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  <div className="form-group">
                    <label style={{ color: '#ef4444' }}>Paso Doble Theme Duration</label>
                    <select 
                      className="input-wrapper large focus-glow" 
                      style={{ width: '100%', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', padding: '12px 16px', borderRadius: '12px', fontSize: '15px' }}
                      value={pasoTheme} 
                      onChange={e => setPasoTheme(e.target.value)}
                    >
                      <option value="">Any / Unknown</option>
                      <option value="2-theme">2 Themes (approx 1:15 - 1:25)</option>
                      <option value="3-theme">3 Themes (approx 2:05)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label style={{ color: '#ef4444' }}>Music Version (Organiser Type)</label>
                    <select 
                      className="input-wrapper large focus-glow" 
                      style={{ width: '100%', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', padding: '12px 16px', borderRadius: '12px', fontSize: '15px' }}
                      value={pasoVersion} 
                      onChange={e => setPasoVersion(e.target.value)}
                    >
                      <option value="">All Versions</option>
                      <option value="wdsf">España Cañí / WDSF Versions</option>
                      <option value="other">Other Versions</option>
                    </select>
                  </div>
                </div>
              )}


              <div className="form-grid-split">
                <div className="form-group">
                  <label>BPM / Bars (Auto-calculated)</label>
                  <div className="speed-split">
                    <div className="speed-input-box focus-glow"><Activity size={16} />
                      <input type="number" placeholder="BPM" value={formData.bpm} onChange={e => {
                        const val = e.target.value; setFormData({ ...formData, bpm: val });
                        if (val) setMpmState(getMPMFromBPM(Number(val), formData.style).toString());
                      }} />
                    </div>
                    <div className="speed-input-box focus-glow"><Activity size={16} />
                      <input type="number" step="0.1" placeholder="Bars" value={mpm} onChange={e => {
                        const val = e.target.value; setMpmState(val);
                        if (val) setFormData({ ...formData, bpm: getBPMFromMPM(Number(val), formData.style).toString() });
                      }} />
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label>Visibility Status</label>
                  <div className={`visibility-pill-expanded ${formData.isClosed ? 'closed' : 'public'}`} onClick={() => setFormData(p => ({ ...p, isClosed: !p.isClosed }))}>
                    <div className="dot"></div><span>{formData.isClosed ? 'Fitness Training Only' : 'Public Music Library'}</span>
                  </div>
                </div>
              </div>

              <div className="form-group full">
                <label>Classification Tags</label>
                <div className="tags-list">
                  {tags.map(tag => (
                    <button type="button" key={tag.id} className={`tag-item ${formData.tags.includes(tag.name) ? 'active' : ''}`} style={{ '--tag-color': tag.color || '#1db954' } as React.CSSProperties} onClick={() => {
                      const isS = formData.tags.includes(tag.name);
                      setFormData(p => ({ ...p, tags: isS ? p.tags.filter((t: string) => t !== tag.name) : [...p.tags, tag.name] }));
                    }}>{tag.name}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className={`audio-zone glass large ${selectedFile ? 'has-file' : ''}`} onClick={() => !isAnalyzing && fileInputRef.current?.click()}>
              {isAnalyzing ? <div className="analyzing-state"><div className="spinner"></div>Analyzing...</div> : selectedFile ? <><CheckCircle2 size={24} className="text-primary" /><span>{selectedFile.name} Ready</span></> : <><Upload size={24} /><span>Upload Audio File</span></>}
              <input type="file" ref={fileInputRef} hidden accept="audio/*" onChange={handleFileChange} />
            </div>

            <footer className="modal-footer">
              <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={isSubmitting || isAnalyzing}>Save Track</button>
            </footer>
          </form>
        )}
      </div>

      <style jsx>{`
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(16px); display: flex; align-items: center; justify-content: center; z-index: 10000; padding: 20px; }
        .modal-content { width: 100%; max-width: 850px; padding: 40px; border-radius: 32px; background: #0a0a0a; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
        .header-title.centered { width: 100%; text-align: center; margin-bottom: 30px; }
        .header-title h3 { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }

        .form-redistribution-row { display: flex; gap: 40px; margin-bottom: 30px; align-items: flex-start; }
        .artwork-column { width: 200px; flex-shrink: 0; text-align: center; }
        .artwork-compact-dropzone.large { width: 200px; height: 200px; border-radius: 24px; border: 2px dashed rgba(255,255,255,0.1); cursor: pointer; position: relative; overflow: hidden; background: rgba(255,255,255,0.02); transition: all 0.3s; }
        .artwork-compact-dropzone.large:hover { border-color: #1db954; transform: translateY(-4px); background: rgba(29, 185, 84, 0.05); }
        .artwork-compact-dropzone img { width: 100%; height: 100%; object-fit: cover; }

        .primary-info-column { flex-grow: 1; display: flex; flex-direction: column; gap: 20px; }
        .secondary-fields-box { display: flex; flex-direction: column; gap: 24px; margin-bottom: 30px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.05); }
        
        .form-grid-split { display: grid; grid-template-columns: 1.2fr 1fr; gap: 30px; }
        label { font-size: 11px; font-weight: 900; color: #71717a; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; display: block; }
        
        .input-wrapper.large { background: rgba(255,255,255,0.03); border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; padding: 0 18px; }
        .input-wrapper.large input { background: transparent; border: none; outline: none; height: 56px; color: white; width: 100%; padding: 0 15px; font-size: 16px; font-weight: 500; }
        .focus-glow:focus-within { border-color: #1db954; box-shadow: 0 0 15px -5px rgba(29, 185, 84, 0.5); }

        .recent-artists { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
        .artist-suggestion { padding: 6px 14px; border-radius: 10px; background: rgba(255,255,255,0.05); color: #71717a; font-size: 12px; font-weight: 700; border: none; cursor: pointer; transition: all 0.2s; }
        .artist-suggestion:hover { background: #1db954; color: black; }

        .styles-list { display: flex; flex-wrap: wrap; gap: 10px; }
        .style-chip { padding: 10px 18px; border-radius: 14px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); color: #a1a1aa; font-size: 13px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: all 0.2s; }
        .style-chip .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--chip-color); }
        .style-chip.active { background: rgba(255,255,255,0.08); color: white; border-color: var(--chip-color); box-shadow: 0 0 20px -5px var(--chip-color); }

        .speed-split { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .speed-input-box { background: rgba(255,255,255,0.03); border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; padding: 0 15px; }
        .speed-input-box input { background: transparent; border: none; outline: none; height: 50px; color: white; width: 100%; text-align: center; font-size: 15px; font-weight: 700; }

        .visibility-pill-expanded { height: 50px; border-radius: 16px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; gap: 15px; padding: 0 20px; cursor: pointer; transition: all 0.3s; }
        .visibility-pill-expanded.public .dot { background: #1db954; box-shadow: 0 0 10px #1db954; }
        .visibility-pill-expanded.closed .dot { background: #ffbc11; box-shadow: 0 0 10px #ffbc11; }
        .visibility-pill-expanded span { font-size: 13px; font-weight: 800; color: white; }

        .tags-list { display: flex; flex-wrap: wrap; gap: 8px; }
        .tag-item { padding: 8px 16px; border-radius: 30px; background: rgba(255,255,255,0.03); color: #71717a; font-size: 12px; font-weight: 800; border: 1px solid transparent; cursor: pointer; transition: all 0.2s; }
        .tag-item.active { border-color: var(--tag-color); background: rgba(255,255,255,0.08); color: white; box-shadow: 0 0 15px -5px var(--tag-color); }

        .audio-zone.large { margin-top: 10px; height: 75px; border-radius: 20px; border: 2px dashed rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; gap: 15px; font-size: 15px; font-weight: 700; color: #71717a; cursor: pointer; transition: all 0.2s; }
        .audio-zone.large:hover { border-color: #1db954; background: rgba(29, 185, 84, 0.05); color: white; }
        .spinner { width: 20px; height: 20px; border: 3px solid rgba(255,255,255,0.1); border-top-color: #1db954; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .modal-footer { display: flex; justify-content: flex-end; gap: 15px; margin-top: 40px; }
        .btn-primary { height: 56px; padding: 0 40px; border-radius: 18px; background: #1db954; color: black; font-weight: 900; font-size: 15px; text-transform: uppercase; letter-spacing: 1px; cursor: pointer; border: none; transition: transform 0.2s; }
        .btn-primary:active { transform: scale(0.96); }
        .btn-secondary { height: 56px; padding: 0 30px; border-radius: 18px; background: rgba(255,255,255,0.05); color: #71717a; font-weight: 700; border: none; cursor: pointer; }
        .btn-secondary:hover { color: white; background: rgba(255,255,255,0.1); }
      `}</style>
    </div>
  );
};

export default AddTrackModal;
