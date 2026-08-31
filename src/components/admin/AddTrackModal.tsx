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
    album: initialData?.album || '',
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
      title: '', artist: '', album: '',
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
        album: initialData.album || '',
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
        const audioFileType = selectedFile.type || 'audio/mpeg';
        const signRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: selectedFile.name, fileType: audioFileType })
        });

        if (!signRes.ok) {
          const errData = await signRes.json().catch(() => ({}));
          throw new Error(errData.error || `Upload URL signing failed (${signRes.status})`);
        }

        const { uploadUrl, publicUrl } = await signRes.json();

        const putRes = await fetch(uploadUrl, {
          method: 'PUT',
          body: selectedFile,
          headers: { 'Content-Type': audioFileType }
        });

        if (!putRes.ok) {
          throw new Error(`File upload to storage failed (${putRes.status})`);
        }

        audioUrl = publicUrl;

        duration = await new Promise<number>((resolve) => {
          try {
            const audio = new Audio();
            const objectUrl = URL.createObjectURL(selectedFile);
            audio.src = objectUrl;
            audio.onloadedmetadata = () => {
              const dur = Math.round(audio.duration || 0);
              URL.revokeObjectURL(objectUrl);
              resolve(dur);
            };
            audio.onerror = () => {
              URL.revokeObjectURL(objectUrl);
              resolve(0);
            };
            setTimeout(() => {
              URL.revokeObjectURL(objectUrl);
              resolve(0);
            }, 2500);
          } catch (e) {
            resolve(0);
          }
        });
      }

      if (coverFile) {
        const coverFileType = coverFile.type || 'image/jpeg';
        const signRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: `covers/${Date.now()}_${coverFile.name}`, fileType: coverFileType })
        });

        if (!signRes.ok) {
          const errData = await signRes.json().catch(() => ({}));
          throw new Error(errData.error || "Cover image upload URL signing failed");
        }

        const { uploadUrl, publicUrl } = await signRes.json();
        const putRes = await fetch(uploadUrl, {
          method: 'PUT',
          body: coverFile,
          headers: { 'Content-Type': coverFileType }
        });

        if (!putRes.ok) {
          throw new Error("Cover image upload to storage failed");
        }

        artworkUrl = publicUrl;
      }

      let finalTags = [...formData.tags].filter(t => !t.startsWith('paso-'));
      if (formData.style === 'Paso Doble') {
        if (pasoTheme) finalTags.push(`paso-${pasoTheme}`);
        if (pasoVersion) finalTags.push(`paso-${pasoVersion}`);
      }
      if (formData.album === 'GOC 2026' && !finalTags.includes('GOC 2026')) {
        finalTags.push('GOC 2026');
      }
      if (formData.album === 'Dance Star Band' && !finalTags.includes('Dance Star Band')) {
        finalTags.push('Dance Star Band');
      }

      await onAdd({
        ...formData,
        tags: finalTags,
        album: formData.album || undefined,
        audioUrl,
        artworkUrl,
        duration,
        id: initialData?.id || `track_${Date.now()}`
      });

      if (formData.artist && !recentArtists.includes(formData.artist)) {
        const updated = [formData.artist, ...recentArtists.slice(0, 11)];
        setRecentArtists(updated);
        localStorage.setItem('recentArtists', JSON.stringify(updated));
      }

      await refreshData();
      setIsSuccess(true);
      setTimeout(() => {
        setIsSubmitting(false);
        setIsSuccess(false);
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error("[ADD-TRACK-ERROR]", err);
      setValidationError(err.message || "Failed to upload track.");
      setIsSubmitting(false);
    }
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
            {validationError && (
              <div className="validation-error-banner glass animate-in" style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                padding: '12px 16px',
                borderRadius: '14px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '13px',
                fontWeight: 700
              }}>
                <AlertTriangle size={18} />
                <span>{validationError}</span>
              </div>
            )}
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
              <div className="form-group full" style={{ marginBottom: '16px' }}>
                <label style={{ color: '#ff416c', fontWeight: 900 }}>Collection Destination</label>
                <div className="goc-mode-selector">
                  <button
                    type="button"
                    className={`goc-mode-chip ${!formData.album ? 'active' : ''}`}
                    onClick={() => setFormData(p => ({
                      ...p,
                      album: '',
                      tags: p.tags.filter((t: string) => t !== 'GOC 2026' && t !== 'GOC Latin' && t !== 'GOC Standard')
                    }))}
                  >
                    <span>Standard Library</span>
                  </button>

                  <button
                    type="button"
                    className={`goc-mode-chip goc-main ${formData.album === 'GOC 2026' ? 'active' : ''}`}
                    onClick={() => {
                      setFormData(p => {
                        const newTags = [...p.tags];
                        if (!newTags.includes('GOC 2026')) newTags.push('GOC 2026');
                        if (!newTags.includes('GOC Latin') && !newTags.includes('GOC Standard')) {
                          newTags.push('GOC Latin');
                        }
                        return { ...p, album: 'GOC 2026', tags: newTags };
                      });
                    }}
                  >
                    <span>🏆 GOC 2026</span>
                  </button>

                  <button
                    type="button"
                    className={`goc-mode-chip dancestar-main ${formData.album === 'Dance Star Band' ? 'active-dancestar' : ''}`}
                    style={{
                      borderColor: formData.album === 'Dance Star Band' ? '#d946ef' : undefined,
                      color: formData.album === 'Dance Star Band' ? '#d946ef' : undefined,
                      backgroundColor: formData.album === 'Dance Star Band' ? 'rgba(217, 70, 239, 0.15)' : undefined,
                    }}
                    onClick={() => {
                      setFormData(p => {
                        const newTags = [...p.tags];
                        if (!newTags.includes('Dance Star Band')) newTags.push('Dance Star Band');
                        return { ...p, album: 'Dance Star Band', tags: newTags };
                      });
                    }}
                  >
                    <span>🎷 Dance Star Band</span>
                  </button>
                </div>

                {formData.album === 'GOC 2026' && (
                  <div className="goc-sub-selector animate-in" style={{ marginTop: '10px' }}>
                    <span className="sub-label">Select Discipline:</span>
                    <div className="sub-chips-row">
                      <button
                        type="button"
                        className={`goc-sub-chip latin ${formData.tags.includes('GOC Latin') ? 'active' : ''}`}
                        onClick={() => {
                          setFormData(p => {
                            const newTags = p.tags.filter((t: string) => t !== 'GOC Standard');
                            if (!newTags.includes('GOC 2026')) newTags.push('GOC 2026');
                            if (!newTags.includes('GOC Latin')) newTags.push('GOC Latin');
                            return { ...p, tags: newTags };
                          });
                        }}
                      >
                        🔥 International Latin
                      </button>

                      <button
                        type="button"
                        className={`goc-sub-chip standard ${formData.tags.includes('GOC Standard') ? 'active' : ''}`}
                        onClick={() => {
                          setFormData(p => {
                            const newTags = p.tags.filter((t: string) => t !== 'GOC Latin');
                            if (!newTags.includes('GOC 2026')) newTags.push('GOC 2026');
                            if (!newTags.includes('GOC Standard')) newTags.push('GOC Standard');
                            return { ...p, tags: newTags };
                          });
                        }}
                      >
                        ⚡ International Standard
                      </button>
                    </div>
                  </div>
                )}
              </div>

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
              <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={isSubmitting || isAnalyzing}>
                {isSubmitting ? 'Uploading...' : 'Save Track'}
              </button>
            </footer>
          </form>
        )}
      </div>

      <style jsx>{`
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(16px); display: flex; align-items: center; justify-content: center; z-index: 10000; padding: 20px; }
        .modal-content { width: 100%; max-width: 850px; padding: 30px 36px; border-radius: 32px; background: #0a0a0a; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); max-height: 90vh; overflow-y: auto; box-sizing: border-box; }
        .header-title.centered { width: 100%; text-align: center; margin-bottom: 20px; }
        .header-title h3 { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }

        .form-redistribution-row { display: flex; gap: 24px; margin-bottom: 20px; align-items: flex-start; width: 100%; min-width: 0; }
        .artwork-column { width: 120px; flex-shrink: 0; text-align: center; }
        .artwork-compact-dropzone.large { width: 120px; height: 120px; border-radius: 20px; border: 2px dashed rgba(255,255,255,0.1); cursor: pointer; position: relative; overflow: hidden; background: rgba(255,255,255,0.02); transition: all 0.3s; display: flex; align-items: center; justify-content: center; }
        .artwork-compact-dropzone.large:hover { border-color: #1db954; transform: translateY(-4px); background: rgba(29, 185, 84, 0.05); }
        .artwork-compact-dropzone img { width: 100%; height: 100%; object-fit: cover; }
        .placeholder { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; color: #71717a; }

        .primary-info-column { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 16px; width: 100%; }
        .secondary-fields-box { display: flex; flex-direction: column; gap: 16px; margin-bottom: 20px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.05); width: 100%; min-width: 0; }
        
        .form-grid-split { display: grid; grid-template-columns: 1.2fr 1fr; gap: 24px; width: 100%; min-width: 0; }
        .form-group { width: 100%; min-width: 0; box-sizing: border-box; }
        label { font-size: 11px; font-weight: 900; color: #71717a; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; display: block; }
        
        .input-wrapper.large { background: rgba(255,255,255,0.03); border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; padding: 0 16px; width: 100%; min-width: 0; box-sizing: border-box; }
        .input-wrapper.large input { background: transparent; border: none; outline: none; height: 52px; color: white; width: 100%; min-width: 0; padding: 0 12px; font-size: 15px; font-weight: 500; }
        .focus-glow:focus-within { border-color: #1db954; box-shadow: 0 0 15px -5px rgba(29, 185, 84, 0.5); }

        .recent-artists { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
        .artist-suggestion { padding: 5px 12px; border-radius: 10px; background: rgba(255,255,255,0.05); color: #71717a; font-size: 11px; font-weight: 700; border: none; cursor: pointer; transition: all 0.2s; }
        .artist-suggestion:hover { background: #1db954; color: black; }

        .styles-list { display: flex; flex-wrap: wrap; gap: 8px; }
        .style-chip { padding: 8px 14px; border-radius: 14px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); color: #a1a1aa; font-size: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s; }
        .style-chip .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--chip-color); }
        .style-chip.active { background: rgba(255,255,255,0.08); color: white; border-color: var(--chip-color); box-shadow: 0 0 20px -5px var(--chip-color); }

        .speed-split { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; width: 100%; }
        .speed-input-box { background: rgba(255,255,255,0.03); border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; padding: 0 12px; width: 100%; min-width: 0; box-sizing: border-box; }
        .speed-input-box input { background: transparent; border: none; outline: none; height: 48px; color: white; width: 100%; min-width: 0; text-align: center; font-size: 14px; font-weight: 700; }

        .goc-mode-selector { display: flex; gap: 10px; width: 100%; }
        .goc-mode-chip { 
          flex: 1; padding: 12px 18px; border-radius: 14px; background: rgba(255,255,255,0.03); 
          border: 1px solid rgba(255,255,255,0.08); color: #71717a; font-size: 13px; font-weight: 800; 
          cursor: pointer; transition: all 0.2s ease; text-align: center;
        }
        .goc-mode-chip:hover { background: rgba(255,255,255,0.08); color: white; }
        .goc-mode-chip.active { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.25); color: white; }
        .goc-mode-chip.goc-main.active { background: rgba(255, 65, 108, 0.15); border-color: #ff416c; color: #ff416c; box-shadow: 0 0 15px rgba(255, 65, 108, 0.25); }

        .goc-sub-selector { background: rgba(255,255,255,0.02); border-radius: 14px; padding: 12px 16px; border: 1px solid rgba(255,255,255,0.05); }
        .sub-label { font-size: 10px; font-weight: 900; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; display: block; }
        .sub-chips-row { display: flex; gap: 10px; }
        .goc-sub-chip {
          flex: 1; padding: 10px 14px; border-radius: 12px; background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08); color: #71717a; font-size: 12px; font-weight: 800;
          cursor: pointer; transition: all 0.2s ease; text-align: center;
        }
        .goc-sub-chip:hover { background: rgba(255,255,255,0.08); color: white; }
        .goc-sub-chip.latin.active { background: rgba(247, 151, 30, 0.15); border-color: #f7971e; color: #f7971e; box-shadow: 0 0 12px rgba(247, 151, 30, 0.2); }
        .goc-sub-chip.standard.active { background: rgba(33, 147, 176, 0.15); border-color: #2193b0; color: #2193b0; box-shadow: 0 0 12px rgba(33, 147, 176, 0.2); }

        .visibility-pill-expanded { height: 48px; border-radius: 16px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; gap: 12px; padding: 0 16px; cursor: pointer; transition: all 0.3s; width: 100%; box-sizing: border-box; }
        .visibility-pill-expanded.public .dot { background: #1db954; box-shadow: 0 0 10px #1db954; }
        .visibility-pill-expanded.closed .dot { background: #ffbc11; box-shadow: 0 0 10px #ffbc11; }
        .visibility-pill-expanded span { font-size: 12px; font-weight: 800; color: white; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        .tags-list { display: flex; flex-wrap: wrap; gap: 8px; }
        .tag-item { padding: 8px 16px; border-radius: 30px; background: rgba(255,255,255,0.03); color: #71717a; font-size: 12px; font-weight: 800; border: 1px solid transparent; cursor: pointer; transition: all 0.2s; }
        .tag-item.active { border-color: var(--tag-color); background: rgba(255,255,255,0.08); color: white; box-shadow: 0 0 15px -5px var(--tag-color); }

        .audio-zone.large { margin-top: 10px; height: 64px; border-radius: 18px; border: 2px dashed rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; gap: 12px; font-size: 14px; font-weight: 700; color: #71717a; cursor: pointer; transition: all 0.2s; width: 100%; box-sizing: border-box; }
        .audio-zone.large:hover { border-color: #1db954; background: rgba(29, 185, 84, 0.05); color: white; }
        .spinner { width: 20px; height: 20px; border: 3px solid rgba(255,255,255,0.1); border-top-color: #1db954; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .modal-footer { display: flex; justify-content: flex-end; gap: 15px; margin-top: 30px; }
        .btn-primary { height: 52px; padding: 0 36px; border-radius: 16px; background: #1db954; color: black; font-weight: 900; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; cursor: pointer; border: none; transition: transform 0.2s; }
        .btn-primary:active { transform: scale(0.96); }
        .btn-secondary { height: 52px; padding: 0 24px; border-radius: 16px; background: rgba(255,255,255,0.05); color: #71717a; font-weight: 700; border: none; cursor: pointer; }
        .btn-secondary:hover { color: white; background: rgba(255,255,255,0.1); }

        @media (max-width: 640px) {
          .modal-overlay { padding: 8px; }
          .modal-content { padding: 20px 16px; border-radius: 24px; max-height: 94vh; }
          .header-title.centered { margin-bottom: 14px; }
          .header-title.centered h3 { font-size: 18px; }

          .form-redistribution-row { flex-direction: row; gap: 14px; margin-bottom: 16px; align-items: flex-start; }
          .artwork-column { width: 90px; flex-shrink: 0; }
          .artwork-compact-dropzone.large { width: 90px; height: 90px; border-radius: 16px; }

          .primary-info-column { gap: 12px; }
          .input-wrapper.large { padding: 0 10px; }
          .input-wrapper.large input { height: 46px; font-size: 13px; padding: 0 6px; }

          .form-grid-split { grid-template-columns: 1fr; gap: 14px; }
          .goc-mode-selector { flex-direction: column; gap: 8px; }
          .sub-chips-row { flex-direction: column; gap: 8px; }
          .speed-split { gap: 10px; }

          .styles-list { gap: 6px; }
          .style-chip { padding: 8px 12px; font-size: 12px; }
          .tags-list { gap: 6px; }
          .tag-item { padding: 6px 12px; font-size: 11px; }

          .audio-zone.large { height: 56px; font-size: 13px; gap: 10px; border-radius: 16px; }
          .modal-footer { margin-top: 20px; flex-direction: column-reverse; gap: 10px; }
          .btn-primary, .btn-secondary { width: 100%; height: 48px; font-size: 14px; border-radius: 14px; }
        }
      `}</style>
    </div>
  );
};

export default AddTrackModal;
