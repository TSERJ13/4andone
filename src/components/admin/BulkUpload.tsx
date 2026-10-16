"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
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
  Layers,
  Disc,
  ChevronDown,
  Image as ImageIcon
} from 'lucide-react';
import { useStudio, Album } from './StudioProvider';
import { albumOriginalSlot, slotForIndex } from '@/utils/albumSlot';
import { smallImage } from '@/utils/trackCover';
import { 
  detectBPM, 
  getStyleFromBPM, 
  getMPMFromBPM,
  getBPMFromMPM,
  getStyleFromFilenamePart,
  getDefaultTempoForStyle
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
  destinations?: Record<string, boolean>;
  gocDiscipline?: 'Latin' | 'Standard';
  tags: string[]; // Tag names
}

export const computeDestinationTagsAndAlbum = (
  destinations: Record<string, boolean>,
  gocDiscipline: 'Latin' | 'Standard',
  baseTags: string[],
  fallbackAlbum?: string,
  albumsList: Album[] = []
): { album: string; tags: string[] } => {
  let finalTags = [...baseTags].filter(t => {
    if (t.startsWith('paso-')) return false;
    if (t === 'GOC 2026' || t === 'GOC Latin' || t === 'GOC Standard' || t === 'Standard Library') return false;
    for (const alb of albumsList) {
      if (t.toLowerCase() === alb.title.toLowerCase()) return false;
      if (alb.tags?.some((at: string) => at.toLowerCase() === t.toLowerCase())) return false;
    }
    return true;
  });

  if (destinations.standard) {
    finalTags.push('Standard Library');
  }

  let finalAlbum = fallbackAlbum && fallbackAlbum !== 'Bulk Upload' && fallbackAlbum !== 'Standard Library' ? fallbackAlbum : '';

  for (const alb of albumsList) {
    if (destinations[alb.slug]) {
      if (!finalAlbum) finalAlbum = alb.title;
      if (!finalTags.includes(alb.title)) {
        finalTags.push(alb.title);
      }
      if (alb.tags) {
        alb.tags.forEach((t: string) => {
          if (!finalTags.includes(t)) finalTags.push(t);
        });
      }
      if (alb.slug === 'goc-2026' || alb.slug === 'goc') {
        finalTags.push(gocDiscipline === 'Standard' ? 'GOC Standard' : 'GOC Latin');
      }
    }
  }

  return {
    album: finalAlbum || (destinations.standard ? 'Standard Library' : ''),
    tags: finalTags
  };
};

const BulkUpload = () => {
  const { addTrack, styles, tags: availableTags, albums, tracks } = useStudio();
  const [files, setFiles] = useState<StagedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  
  // Destination selection (Standard Library + Dynamic Albums via Dropdown)
  const [batchDestKey, setBatchDestKey] = useState<string>('standard');
  const [batchDestinations, setBatchDestinations] = useState<Record<string, boolean>>({ standard: true });
  const [batchGocDiscipline, setBatchGocDiscipline] = useState<'Latin' | 'Standard'>('Latin');

  // Batch defaults (now optional)
  const [batchAlbum, setBatchAlbum] = useState('Standard Library');
  const [batchArtist, setBatchArtist] = useState('');
  const [batchStyle, setBatchStyle] = useState('Samba');
  const [batchTags, setBatchTags] = useState<string[]>([]);
  const [recentArtists, setRecentArtists] = useState<string[]>([]);
  const [isCustomArtist, setIsCustomArtist] = useState(false);
  const [batchCoverFile, setBatchCoverFile] = useState<File | null>(null);
  const [batchCoverPreview, setBatchCoverPreview] = useState<string | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  
  const [showValidation, setShowValidation] = useState(false);
  // Add to an album that already has music AS IF it had been uploaded back then (not shown as new music)
  const [keepOriginalDate, setKeepOriginalDate] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Computed unique list of available artists for dropdown
  const allArtists = React.useMemo(() => {
    const list = new Set<string>();
    albums.forEach(a => {
      if (a.artist && a.artist.trim()) list.add(a.artist.trim());
    });
    recentArtists.forEach(a => {
      if (a && a.trim()) list.add(a.trim());
    });
    return Array.from(list);
  }, [albums, recentArtists]);

  const selectedAlbum = albums.find(a => a.slug === batchDestKey) || null;
  const selectedSlot = selectedAlbum ? albumOriginalSlot(tracks, selectedAlbum, batchStyle) : null;
  const libraryKeys = React.useMemo(
    () => new Set(tracks.map(t => `${(t.title || '').trim().toLowerCase()}|${(t.artist || '').trim().toLowerCase()}`)),
    [tracks]
  );
  const isInLibrary = (f: StagedFile) => libraryKeys.has(`${f.title.trim().toLowerCase()}|${(f.artist || batchArtist || '').trim().toLowerCase()}`);

  const handleArtistSelectChange = (val: string) => {
    if (val === '__custom__') {
      setIsCustomArtist(true);
      if (allArtists.includes(batchArtist)) {
        setBatchArtist('');
      }
    } else {
      setIsCustomArtist(false);
      setBatchArtist(val);
    }
  };
  
  const preselectedRef = useRef(false);
  useEffect(() => {
    const saved = localStorage.getItem('recentArtists');
    if (saved) setRecentArtists(JSON.parse(saved));

    // ?album=<slug> preselects the destination ONCE. This effect re-runs whenever the album list
    // refreshes, and used to put the destination (and artist) back after the admin had changed it.
    if (typeof window !== 'undefined' && albums.length > 0 && !preselectedRef.current) {
      const params = new URLSearchParams(window.location.search);
      const preselectedSlug = params.get('album');
      if (!preselectedSlug) {
        preselectedRef.current = true;
      } else {
        const target = albums.find(a => a.slug === preselectedSlug);
        if (target) {
          preselectedRef.current = true;
          setBatchDestKey(target.slug);
          setBatchDestinations({ standard: true, [target.slug]: true });
          setBatchAlbum(target.title);
          if (target.artist) setBatchArtist(target.artist);
        } // else: the album list is still the built-in one — try again when the real list arrives
      }
    }
  }, [albums]);

  const handleDestinationChange = (key: string) => {
    setBatchDestKey(key);

    if (key === 'standard') {
      setBatchDestinations({ standard: true });
      setBatchAlbum('Standard Library');
    } else if (key === '__custom__') {
      setBatchDestinations({ standard: true });
      setBatchAlbum('');
    } else {
      const targetAlbum = albums.find(a => a.slug === key);
      setBatchDestinations({ [key]: true, standard: true });
      if (targetAlbum) {
        setBatchAlbum(targetAlbum.title);
        if (targetAlbum.artist && (!batchArtist || batchArtist === 'Unknown Artist')) {
          setBatchArtist(targetAlbum.artist);
        }
      } else {
        setBatchAlbum(key);
      }
    }
  };

  const processFiles = async (fileList: FileList | null) => {
    if (!fileList) return;
    
    const newFilesBase = Array.from(fileList)
      .filter(file => file.type.includes('audio') || file.name.endsWith('.mp3'))
      .map(file => {
        const id = Math.random().toString(36).substring(7);
        
        let rawName = file.name.replace(/\.[^/.]+$/, "");
        let detectedStyle = batchStyle;

        // FLEXIBLE PARSING (handles various hyphen spacings and em-dashes)
        const parts = rawName.split(/\s*[-—]\s*/).map(p => p.trim()).filter(Boolean);
        
        let styleToAppend = '';
        // 1. Check if the LAST part is a dance style
        if (parts.length > 1) {
          const lastPart = parts[parts.length - 1];
          const matched = getStyleFromFilenamePart(lastPart);
          if (matched) {
            detectedStyle = matched;
            styleToAppend = lastPart; // Store the original string to append to Title
            parts.pop(); // Remove from metadata parts
          }
        }

        let autoArtist = '';
        let titleParts: string[] = [];

        // 2. Logic: If at least 2 parts remain, parts[0] is Artist, others are Title.
        if (parts.length >= 2) {
          titleParts = [parts[0]];
          autoArtist = parts.slice(1).join(' - ');
        } else {
          // If only 1 part remains, it's the Title. Artist comes from the Batch setting.
          autoArtist = batchArtist || 'Unknown Artist';
          titleParts = [parts[0] || rawName];
        }

        // 3. Compose Final Title: Music Name + Style (if detected)
        let finalTitle = titleParts.join(' - ');
        if (styleToAppend) {
          finalTitle = `${finalTitle} - ${styleToAppend}`;
        } else if (!rawName.includes('-') && !rawName.includes('—')) {
          // Fallback cleaning for files without hyphens
          finalTitle = finalTitle.replace(/[_\-]/g, ' ');
        }

        const destMeta = computeDestinationTagsAndAlbum(
          batchDestinations,
          batchGocDiscipline,
          [...batchTags],
          batchAlbum,
          albums
        );

        const defaultTempo = detectedStyle ? getDefaultTempoForStyle(detectedStyle) : null;
        return {
          id,
          file,
          progress: 0,
          status: 'pending' as const,
          isAnalyzing: true,
          title: finalTitle,
          artist: autoArtist,
          bpm: defaultTempo ? defaultTempo.bpm.toString() : '0',
          duration: 0,
          style: detectedStyle,
          album: destMeta.album || batchAlbum || 'Standard Library',
          destinations: { ...batchDestinations },
          gocDiscipline: batchGocDiscipline,
          tags: destMeta.tags
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

        const bestStyle = getStyleFromBPM(detectedBpm, staged.file.name);
        const resolvedStyle = (bestStyle && bestStyle !== '') ? bestStyle : staged.style;
        const defaultTempo = getDefaultTempoForStyle(resolvedStyle);

        setFiles(current => current.map(f => f.id === staged.id ? {
          ...f,
          bpm: defaultTempo ? defaultTempo.bpm.toString() : (detectedBpm > 0 ? detectedBpm.toString() : f.bpm),
          duration: duration || f.duration, 
          style: resolvedStyle,
          isAnalyzing: false
        } : f));

      } catch (err) {
        console.error("[BULK-META-ERROR] Failed to analyze file:", staged.file.name, err);
        setFiles(current => current.map(f => f.id === staged.id ? { ...f, isAnalyzing: false } : f));
      }
    }
  };

  const updateFileMeta = (id: string, updates: Partial<StagedFile>) => {
    setFiles(prev => prev.map(f => {
      if (f.id !== id) return f;
      const next = { ...f, ...updates };
      
      // Auto-Sync BPM/MPM logic
      if ('bpm' in updates && updates.bpm) {
        // No explicit MPM storage, we calculate it on the fly for display
      }
      
      return next;
    }));
  };

  const applyBatchMetadata = () => {
    const batchTempo = batchStyle ? getDefaultTempoForStyle(batchStyle) : null;
    setFiles(prev => prev.map(f => {
      if (f.status !== 'pending') return f;
      const destMeta = computeDestinationTagsAndAlbum(
        batchDestinations,
        batchGocDiscipline,
        batchTags.length > 0 ? [...batchTags] : f.tags,
        batchAlbum,
        albums
      );
      return {
        ...f,
        artist: batchArtist || f.artist,
        album: destMeta.album || batchAlbum || f.album,
        style: batchStyle || f.style,
        destinations: { ...batchDestinations },
        gocDiscipline: batchGocDiscipline,
        ...(batchTempo ? { bpm: batchTempo.bpm.toString() } : {}),
        tags: destMeta.tags
      };
    }));
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
    setShowValidation(false);
    let commonArtworkUrl = '';

    // 1. Upload Batch Cover if exists
    if (batchCoverFile) {
      setIsUploadingCover(true);
      try {
        const signRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: `covers/bulk_${Date.now()}_${batchCoverFile.name}`,
            fileType: batchCoverFile.type || 'image/jpeg'
          })
        });
        
        if (signRes.ok) {
          const { uploadUrl, publicUrl, mediaUrl } = await signRes.json();
          await fetch(uploadUrl, { 
            method: 'PUT', 
            body: batchCoverFile, 
            headers: { 'Content-Type': batchCoverFile.type } 
          });
          commonArtworkUrl = mediaUrl || publicUrl;
        }
      } catch (err) {
        console.error("[BULK-COVER-ERROR] Failed to upload batch cover:", err);
      } finally {
        setIsUploadingCover(false);
      }
    }

    let slotIndex = 0; // position of this track within the batch (keeps the batch in order)
    for (const f of files) {
      if (f.status !== 'pending') continue;

      try {
        setFiles(current => current.map(curr => curr.id === f.id ? { ...curr, status: 'uploading' } : curr));

        // 1. Get Presigned URL via the same API AddTrackModal uses
        const signRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: f.file.name,
            fileType: f.file.type || 'audio/mpeg'
          })
        });

        if (!signRes.ok) {
          const err = await signRes.json();
          throw new Error(err.error || "Signed URL failed");
        }

        const { uploadUrl, publicUrl } = await signRes.json();

        // 2. Upload to R2
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl, true);
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
          xhr.onload = () => xhr.status === 200 || xhr.status === 201 ? resolve(true) : reject();
          xhr.onerror = () => reject();
        });

        xhr.send(f.file);
        await uploadPromise;

        const destMeta = computeDestinationTagsAndAlbum(
          f.destinations || batchDestinations,
          f.gocDiscipline || batchGocDiscipline,
          f.tags,
          f.album || batchAlbum,
          albums
        );

        // Optional: take the album's earlier upload time and place, instead of appearing as new music
        let slot: { createdAt: string; date: string; globalOrder: number } | null = null;
        if (keepOriginalDate) {
          const dests = f.destinations || batchDestinations;
          const alb = albums.find(a => dests[a.slug]);
          const base = alb ? albumOriginalSlot(tracks, alb, f.style) : null;
          if (base) slot = slotForIndex(base, slotIndex++);
        }

        // 3. Register in Supabase
        await addTrack({
          ...(slot ? { createdAt: slot.createdAt, date: slot.date, globalOrder: slot.globalOrder } : {}),
          title: f.title,
          artist: f.artist || batchArtist || 'Unknown Artist',
          album: destMeta.album || undefined,
          style: f.style,
          bpm: f.bpm || '0',
          duration: f.duration || 0,
          audioUrl: publicUrl,
          artworkUrl: commonArtworkUrl || undefined,
          folderId: undefined,
          tags: destMeta.tags
        });

        setFiles(current => current.map(curr => 
          curr.id === f.id ? { ...curr, status: 'complete', progress: 100 } : curr
        ));

        // Update Persistent Memory
        if (f.artist && !recentArtists.includes(f.artist)) {
          const updated = [f.artist, ...recentArtists].slice(0, 15);
          setRecentArtists(updated);
          localStorage.setItem('recentArtists', JSON.stringify(updated));
        }

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
              {/* Destination Album (Dropdown) */}
              <div className="meta-block">
                <label className="field-micro-label">Destination Album</label>
                <div className="album-tiles" role="listbox" aria-label="Destination album">
                  <button type="button" role="option" aria-selected={batchDestKey === 'standard'} className={`album-tile ${batchDestKey === 'standard' ? 'on' : ''}`} onClick={() => handleDestinationChange('standard')}>
                    <span className="tile-img std"><Music size={20} /></span>
                    <span className="tile-name">Standard Library</span>
                  </button>
                  {albums.map(alb => (
                    <button key={alb.id || alb.slug} type="button" role="option" aria-selected={batchDestKey === alb.slug} title={alb.title}
                      className={`album-tile ${batchDestKey === alb.slug ? 'on' : ''}`}
                      style={{ '--tile-color': alb.themeColor || '#ff416c' } as React.CSSProperties}
                      onClick={() => handleDestinationChange(alb.slug)}>
                      <span className="tile-img">{alb.coverUrl ? <img src={smallImage(alb.coverUrl)} alt="" loading="lazy" /> : <Disc size={20} />}</span>
                      <span className="tile-name">{alb.title}</span>
                    </button>
                  ))}
                  <button type="button" role="option" aria-selected={batchDestKey === '__custom__'} className={`album-tile ${batchDestKey === '__custom__' ? 'on' : ''}`} onClick={() => handleDestinationChange('__custom__')}>
                    <span className="tile-img std"><Plus size={20} /></span>
                    <span className="tile-name">New album name…</span>
                  </button>
                </div>

                {selectedAlbum && (
                  <label className={`orig-date-toggle ${selectedSlot ? '' : 'disabled'}`} title="The new tracks take the time and place of this album's earlier upload, so they do not appear in the New music lists">
                    <input type="checkbox" checked={keepOriginalDate && !!selectedSlot} disabled={!selectedSlot} onChange={e => setKeepOriginalDate(e.target.checked)} />
                    <span>
                      <b>Add as part of the earlier upload</b>
                      <small>{selectedSlot
                        ? `Dated ${new Date(selectedSlot.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}, next to its ${selectedSlot.trackCount} ${selectedSlot.sameStyle ? `${batchStyle} ` : ''}tracks. Each track joins the list of its own dance style. Not shown as new music.`
                        : 'This album has no tracks yet, so it will be a normal new upload.'}</small>
                    </span>
                  </label>
                )}

                {batchDestKey === "__custom__" && (
                  <div className="meta-field custom-album-subfield animate-in">
                    <FolderPlus size={15} className="meta-icon" />
                    <input 
                      type="text" 
                      placeholder="Type Album or Collection Title..." 
                      value={batchAlbum === "Standard Library" ? "" : batchAlbum}
                      onChange={(e) => setBatchAlbum(e.target.value)}
                      autoFocus
                    />
                  </div>
                )}

                {(batchDestKey === "goc-2026" || batchDestKey === "goc") && (
                  <div className="batch-goc-discipline-box animate-in">
                    <span className="goc-discipline-label">Discipline:</span>
                    <div className="goc-discipline-btns">
                      <button
                        type="button"
                        className={`goc-discipline-btn latin ${batchGocDiscipline === "Latin" ? "active" : ""}`}
                        onClick={() => setBatchGocDiscipline("Latin")}
                      >
                        Latin
                      </button>
                      <button
                        type="button"
                        className={`goc-discipline-btn standard ${batchGocDiscipline === "Standard" ? "active" : ""}`}
                        onClick={() => setBatchGocDiscipline("Standard")}
                      >
                        Standard
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Artist / Composer (Dropdown) */}
              <div className="meta-block">
                <label className="field-micro-label">Artist / Composer</label>
                <div className="meta-field">
                  <User size={16} className="meta-icon" />
                  <select 
                    className="meta-select"
                    value={isCustomArtist ? '__custom__' : (allArtists.includes(batchArtist) ? batchArtist : (batchArtist ? '__custom__' : ''))}
                    onChange={(e) => handleArtistSelectChange(e.target.value)}
                  >
                    <option value="">Auto Detect from Filename</option>
                    {allArtists.length > 0 && (
                      <optgroup label="── Artists & Bands ──">
                        {allArtists.map(art => (
                          <option key={art} value={art}>{art}</option>
                        ))}
                      </optgroup>
                    )}
                    <option value="__custom__">+ Type Custom Artist...</option>
                  </select>
                  <ChevronDown size={14} className="meta-chevron" />
                </div>

                {(isCustomArtist || (batchArtist && !allArtists.includes(batchArtist))) && (
                  <div className="meta-field custom-album-subfield animate-in">
                    <User size={15} className="meta-icon" />
                    <input 
                      type="text" 
                      placeholder="Type Artist / Composer Name..." 
                      value={batchArtist}
                      onChange={(e) => setBatchArtist(e.target.value)}
                      autoFocus
                    />
                  </div>
                )}
              </div>

              {/* Dance Style (Dropdown) */}
              <div className="meta-block">
                <label className="field-micro-label">Dance Style</label>
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
                        <option value="Cha-Cha-Cha">Cha-Cha-Cha</option>
                        <option value="Samba">Samba</option>
                        <option value="Rumba">Rumba</option>
                        <option value="Paso Doble">Paso Doble</option>
                        <option value="Jive">Jive</option>
                        <option value="Slow Waltz">Slow Waltz</option>
                        <option value="Tango">Tango</option>
                        <option value="Viennese Waltz">Viennese Waltz</option>
                        <option value="Slow Foxtrot">Slow Foxtrot</option>
                        <option value="Quickstep">Quickstep</option>
                        <option value="Fitness">Fitness</option>
                      </>
                    )}
                  </select>
                  <ChevronDown size={14} className="meta-chevron" />
                </div>
              </div>

              {/* Cover Art & Tags Compact Row */}
              <div className="meta-compact-row">
                <div className="cover-compact-wrap">
                  <label className="cover-compact-chip">
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="cover-native-input" 
                      title="Upload batch cover art"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setBatchCoverFile(e.target.files[0]);
                          setBatchCoverPreview(URL.createObjectURL(e.target.files[0]));
                        }
                      }} 
                    />
                    {batchCoverPreview ? (
                      <div className="cover-chip-active">
                        <img src={batchCoverPreview} alt="Cover Preview" className="cover-chip-thumb" />
                        <span className="cover-chip-text">{batchCoverFile?.name || 'Cover Added'}</span>
                        <button 
                          type="button" 
                          className="cover-chip-clear"
                          title="Remove cover"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setBatchCoverFile(null);
                            setBatchCoverPreview(null);
                          }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="cover-chip-empty">
                        <ImageIcon size={14} />
                        <span>+ Cover Art</span>
                      </div>
                    )}
                  </label>
                </div>

                <div className="tags-horizontal-strip">
                  <div className="tags-strip-scroller">
                    {availableTags.map((tag: Tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        className={`batch-tag-pill ${batchTags.includes(tag.name) ? 'active' : ''}`}
                        onClick={() => toggleTagInBatch(tag.name)}
                        style={{ 
                          '--tag-color': tag.color,
                          borderColor: batchTags.includes(tag.name) ? tag.color : 'rgba(255,255,255,0.06)'
                        } as any}
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Apply to Queue Button (When tracks exist) */}
              {files.length > 0 && (
                <div className="apply-to-queue-wrap animate-in">
                  <button 
                    type="button" 
                    className="btn-apply-batch-v2" 
                    onClick={applyBatchMetadata}
                  >
                    <CheckCircle2 size={16} />
                    <span>Apply Batch Settings to All {files.length} Tracks</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div 
            className={`dropzone glass ${isDragging ? 'dragging' : ''} ${files.length > 0 ? 'has-files' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); processFiles(e.dataTransfer.files); }}
          >
            <input 
              type="file" 
              multiple 
              accept="audio/*,.mp3,.wav,.m4a,.aac,.flac,.ogg" 
              onChange={(e) => {
                processFiles(e.target.files);
                e.target.value = '';
              }} 
              className="dropzone-native-input" 
              id="bulk-audio-file-input"
            />
            <div className="dropzone-content">
              <div className="upload-icon-wrapper glass">
                <Upload size={28} className="text-primary" />
              </div>
              <div className="text-group">
                <h3>{files.length > 0 ? `+ Add More Audio Files` : 'Tap to Choose Audio Files'}</h3>
                <p>MP3, WAV, FLAC, M4A — Drag or tap anywhere to browse</p>
              </div>
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
                <span>
                  {files.some(f => f.isAnalyzing) 
                    ? 'Analyzing Audio...' 
                    : files.some(f => f.status === 'uploading')
                      ? 'Uploading...'
                      : `Start Upload (${files.filter(f => f.status === 'pending').length} Tracks)`}
                </span>
              </button>
            </div>
          </div>

          <div className="staging-table">
            <div className="table-header">
              <div className="col-status">#</div>
              <div className="col-info">Track / Artist</div>
              <div className="col-album">Destination</div>
              <div className="col-style">Style</div>
              <div className="col-bpm">Beats/Min</div>
              <div className="col-mpm">Bars/Min</div>
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
                    {isInLibrary(f) && <div className="dup-badge" title="A track with this title and artist is already in the library">⚠ Already in library</div>}
                    <div className="row-artist-wrapper">
                      <span className="row-artist-label">by</span>
                      <input 
                        className="row-artist-input"
                        value={f.artist}
                        onChange={(e) => updateFileMeta(f.id, { artist: e.target.value })}
                        placeholder="Artist"
                      />
                    </div>
                  </div>

                  <div className="col-album">
                    <select 
                      className="row-select row-album-select"
                      value={f.album || 'Standard Library'}
                      onChange={(e) => {
                        const chosenTitle = e.target.value;
                        const targetAlbum = albums.find(a => a.title === chosenTitle);
                        const newDests: Record<string, boolean> = { standard: chosenTitle === 'Standard Library' };
                        if (targetAlbum) {
                          newDests[targetAlbum.slug] = true;
                        }
                        const destMeta = computeDestinationTagsAndAlbum(
                          newDests,
                          f.gocDiscipline || batchGocDiscipline,
                          f.tags,
                          chosenTitle,
                          albums
                        );
                        updateFileMeta(f.id, { 
                          album: chosenTitle,
                          destinations: newDests,
                          tags: destMeta.tags,
                          ...(targetAlbum?.artist && (!f.artist || f.artist === 'Unknown Artist') ? { artist: targetAlbum.artist } : {})
                        });
                      }}
                    >
                      <option value="Standard Library">📁 Standard Library</option>
                      {albums.map(alb => (
                        <option key={alb.id || alb.slug} value={alb.title}>
                          💿 {alb.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-style">
                    <select 
                      className="row-select"
                      value={f.style}
                      onChange={(e) => {
                        const newStyle = e.target.value;
                        const tempo = getDefaultTempoForStyle(newStyle);
                        updateFileMeta(f.id, { 
                          style: newStyle,
                          ...(tempo ? { bpm: tempo.bpm.toString() } : {})
                        });
                      }}
                    >
                      {styles.map((s: Style) => <option key={s.id} value={s.title}>{s.title}</option>)}
                      {!styles.length && <option value={f.style}>{f.style}</option>}
                    </select>
                  </div>

                  <div className="track-tempo-grid">
                    <div className="col-bpm">
                      <span className="row-tempo-mobile-label">BPM</span>
                      {f.isAnalyzing ? <div className="analyzing-mini-spinner" /> : (
                        <input 
                          className="row-bpm-input"
                          type="number"
                          value={f.bpm}
                          onChange={(e) => updateFileMeta(f.id, { bpm: e.target.value })}
                          placeholder="BPM"
                        />
                      )}
                    </div>

                    <div className="col-mpm">
                      <span className="row-tempo-mobile-label">MPM</span>
                      {f.isAnalyzing ? <div className="analyzing-mini-spinner" /> : (
                        <input 
                          className="row-bpm-input"
                          type="number"
                          step="0.1"
                          value={getMPMFromBPM(Number(f.bpm), f.style)}
                          onChange={(e) => {
                            const newMpm = Number(e.target.value);
                            const newBpm = getBPMFromMPM(newMpm, f.style);
                            updateFileMeta(f.id, { bpm: newBpm.toString() });
                          }}
                          placeholder="MPM"
                        />
                      )}
                    </div>
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
        .bulk-upload-wrapper { display: flex; flex-direction: column; gap: 20px; width: 100%; }

        /* Album picker with covers */
        .album-tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .album-tile { display: flex; flex-direction: column; align-items: center; gap: 5px; padding: 6px 4px 7px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03); color: #a1a1aa; cursor: pointer; min-width: 0; }
        .album-tile:hover { background: rgba(255,255,255,0.07); color: #fff; }
        .album-tile.on { border-color: var(--tile-color, #38bdf8); background: rgba(255,255,255,0.08); color: #fff; box-shadow: 0 0 14px -4px var(--tile-color, #38bdf8); }
        .tile-img { width: 100%; aspect-ratio: 1; border-radius: 9px; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #111; }
        .tile-img.std { background: rgba(255,255,255,0.05); color: #71717a; }
        .tile-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .tile-name { font-size: 10px; font-weight: 700; line-height: 1.2; text-align: center; max-width: 100%; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        @media (max-width: 640px) { .album-tiles { grid-template-columns: repeat(4, 1fr); gap: 6px; } .tile-name { font-size: 9px; } }
        .orig-date-toggle { display: flex; gap: 10px; align-items: flex-start; margin-top: 8px; padding: 10px 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.03); cursor: pointer; }
        .orig-date-toggle.disabled { opacity: 0.55; cursor: default; }
        .orig-date-toggle input { margin-top: 3px; accent-color: #1db954; width: 16px; height: 16px; flex-shrink: 0; }
        .orig-date-toggle span { display: flex; flex-direction: column; gap: 2px; }
        .orig-date-toggle b { font-size: 13px; color: #fff; }
        .orig-date-toggle small { font-size: 11.5px; color: #8b8b94; line-height: 1.4; }
        .dup-badge { display: inline-block; margin: 2px 0 4px; font-size: 11px; font-weight: 800; color: #fbbf24; background: rgba(251,191,36,0.12); border: 1px solid rgba(251,191,36,0.3); border-radius: 8px; padding: 2px 8px; }

        /* Wide screens: settings stay in a left column, the audio drop area and the queue use the rest. No page scrolling to reach them. */
        @media (min-width: 1100px) {
          .bulk-upload-wrapper { display: grid; grid-template-columns: 430px minmax(0, 1fr); column-gap: 24px; row-gap: 20px; align-items: start; }
          .bulk-upload-wrapper > .batch-header-bar { grid-column: 1; grid-row: 1 / span 3; position: sticky; top: 12px; max-height: calc(100vh - 24px); overflow-y: auto; }
          .bulk-upload-wrapper > .dropzone { grid-column: 2; grid-row: 1; }
          .bulk-upload-wrapper > .staging-area { grid-column: 2; grid-row: 2; }
          .bulk-upload-wrapper > .upload-success-hero { grid-column: 1 / -1; }
          .album-tiles { grid-template-columns: repeat(5, 1fr); gap: 6px; }
          .tile-name { font-size: 9.5px; }

        }
        
        .batch-header-bar { 
          display: flex; flex-direction: column; gap: 16px; padding: 20px; border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.02);
          width: 100%; box-sizing: border-box;
        }
        .batch-main-meta { display: flex; flex-direction: column; gap: 16px; width: 100%; }

        .meta-block {
          display: flex;
          flex-direction: column;
          gap: 6px;
          width: 100%;
        }
        .field-micro-label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .field-micro-label {
          font-size: 11px;
          font-weight: 800;
          color: #a1a1aa;
          text-transform: uppercase;
          letter-spacing: 0.6px;
        }
        .clear-tags-link {
          background: none;
          border: none;
          color: #ef4444;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        /* Destination Dropdown Section */
        .dest-field { position: relative; }
        .dest-meta-select { 
          font-weight: 800; cursor: pointer; 
        }
        .dest-meta-select option, .dest-meta-select optgroup {
          background: #18181b;
          color: white;
          font-weight: 600;
          padding: 8px 12px;
        }
        .custom-album-subfield { margin-top: 6px; }

        .batch-goc-discipline-box { 
          display: flex; align-items: center; gap: 10px; margin-top: 6px; 
          padding: 6px 12px; border-radius: 10px; 
          background: rgba(239, 68, 68, 0.06); border: 1px solid rgba(239, 68, 68, 0.2); 
          width: fit-content; 
        }
        .goc-discipline-label { font-size: 11px; font-weight: 800; color: #f87171; text-transform: uppercase; }
        .goc-discipline-btns { display: flex; gap: 6px; }
        .goc-discipline-btn { 
          padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: 800; 
          border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); 
          color: #71717a; cursor: pointer; transition: all 0.2s; 
        }
        .goc-discipline-btn.latin.active { background: #ef4444; color: white; border-color: #ef4444; box-shadow: 0 0 10px rgba(239, 68, 68, 0.4); }
        .goc-discipline-btn.standard.active { background: #3b82f6; color: white; border-color: #3b82f6; box-shadow: 0 0 10px rgba(59, 130, 246, 0.4); }

        .meta-chevron { position: absolute; right: 14px; color: #71717a; pointer-events: none; }

        .meta-field { position: relative; width: 100%; display: flex; align-items: center; }
        .meta-icon { position: absolute; left: 14px; color: #71717a; pointer-events: none; z-index: 1; }
        .meta-field input, .meta-select { 
          width: 100%; height: 46px; background: rgba(255,255,255,0.04); 
          border: 1px solid rgba(255,255,255,0.08); padding-left: 42px; padding-right: 36px;
          border-radius: 12px; color: white; font-size: 14px; font-weight: 600; outline: none; 
          transition: all 0.2s;
        }
        .meta-field input:focus, .meta-select:focus { border-color: #1db954; background: rgba(255,255,255,0.08); box-shadow: 0 0 0 1px #1db954; }
        .meta-select { cursor: pointer; appearance: none; }

        /* Compact Cover Art Chip & Horizontal Tags Row */
        .meta-compact-row {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          min-width: 0;
          padding-top: 4px;
        }

        .cover-compact-wrap {
          flex-shrink: 0;
        }

        .cover-compact-chip {
          position: relative;
          display: inline-flex;
          align-items: center;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }

        .cover-native-input {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          cursor: pointer;
          z-index: 2;
        }

        .cover-chip-empty {
          display: flex;
          align-items: center;
          gap: 6px;
          height: 36px;
          padding: 0 12px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px dashed rgba(255, 255, 255, 0.16);
          color: #a1a1aa;
          font-size: 11.5px;
          font-weight: 700;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .cover-compact-chip:hover .cover-chip-empty {
          border-color: #1db954;
          color: white;
          background: rgba(29, 185, 84, 0.08);
        }

        .cover-chip-active {
          display: flex;
          align-items: center;
          gap: 8px;
          height: 36px;
          padding: 2px 8px 2px 4px;
          border-radius: 10px;
          background: rgba(29, 185, 84, 0.1);
          border: 1px solid #1db954;
          max-width: 160px;
        }
        .cover-chip-thumb {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          object-fit: cover;
          flex-shrink: 0;
        }
        .cover-chip-text {
          font-size: 11px;
          font-weight: 700;
          color: white;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
        }
        .cover-chip-clear {
          position: relative;
          z-index: 3;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          padding: 0;
          transition: all 0.2s;
        }
        .cover-chip-clear:hover {
          background: #ef4444;
          color: white;
        }

        .tags-horizontal-strip {
          flex: 1;
          min-width: 0;
          overflow: hidden;
        }
        .tags-strip-scroller {
          display: flex;
          align-items: center;
          gap: 6px;
          overflow-x: auto;
          white-space: nowrap;
          padding: 2px 0;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .tags-strip-scroller::-webkit-scrollbar {
          display: none;
        }

        .batch-tag-pill { 
          padding: 6px 12px; border-radius: 18px; font-size: 11px; font-weight: 700; 
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
          color: #a1a1aa; cursor: pointer; transition: all 0.2s; white-space: nowrap; flex-shrink: 0;
        }
        .batch-tag-pill:hover { border-color: rgba(255,255,255,0.2); color: white; }
        .batch-tag-pill.active { background: var(--tag-color); color: black; border-color: transparent; }

        .apply-to-queue-wrap {
          width: 100%;
          padding-top: 4px;
        }
        .btn-apply-batch-v2 { 
          display: flex; align-items: center; justify-content: center; gap: 8px;
          width: 100%; height: 46px; border-radius: 12px; font-size: 13.5px; 
          font-weight: 900; background: #1db954; color: black; border: none;
          cursor: pointer; transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          box-shadow: 0 4px 14px rgba(29, 185, 84, 0.2);
        }
        .btn-apply-batch-v2:hover { 
          transform: translateY(-2px); 
          background: #1ed760; 
          box-shadow: 0 8px 24px rgba(29, 185, 84, 0.35); 
        }

        /* DROPZONE (Native touch surface) */
        .dropzone { 
          position: relative;
          border: 1px dashed rgba(255,255,255,0.14); border-radius: 20px; 
          padding: 36px 20px; cursor: pointer; transition: all 0.2s; background: rgba(255,255,255,0.02);
          overflow: hidden;
        }
        .dropzone:hover, .dropzone.dragging { border-color: #1db954; background: rgba(29,185,84,0.04); }
        .dropzone.has-files { border-color: rgba(29,185,84,0.3); }
        .dropzone-native-input {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          cursor: pointer;
          z-index: 10;
          -webkit-tap-highlight-color: transparent;
        }
        .dropzone-content { display: flex; align-items: center; gap: 20px; justify-content: center; }
        .upload-icon-wrapper { width: 56px; height: 56px; border-radius: 16px; display: flex; align-items: center; justify-content: center; background: rgba(29, 185, 84, 0.1); flex-shrink: 0; }
        .text-group h3 { font-size: 17px; font-weight: 900; margin-bottom: 3px; color: white; }
        .text-group p { font-size: 13px; color: #71717a; }

        /* STAGING AREA */
        .staging-area { display: flex; flex-direction: column; gap: 16px; width: 100%; }
        .staging-header { display: flex; justify-content: space-between; align-items: center; }
        .staging-title { display: flex; align-items: center; gap: 10px; }
        .queue-badge { font-size: 9px; font-weight: 950; background: rgba(29, 185, 84, 0.2); color: #1db954; padding: 4px 8px; border-radius: 6px; letter-spacing: 1px; }
        .staging-title h4 { font-size: 17px; font-weight: 900; color: white; }
        
        .staging-actions { display: flex; align-items: center; gap: 14px; }
        .btn-discard { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700; color: #ef4444; background: none; border: none; cursor: pointer; opacity: 0.7; transition: opacity 0.2s; padding: 8px; }
        .btn-discard:hover { opacity: 1; }
        .btn-burn { 
          display: flex; align-items: center; gap: 8px; padding: 12px 24px; 
          border-radius: 12px; font-size: 13.5px; font-weight: 950; background: #1db954; 
          color: black; border: none; cursor: pointer; transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .btn-burn.active:hover { transform: scale(1.03); box-shadow: 0 8px 24px rgba(29, 185, 84, 0.3); }
        .btn-burn.disabled { opacity: 0.3; filter: grayscale(1); cursor: not-allowed; }

        /* DESKTOP TABLE VIEW */
        .staging-table { 
          background: rgba(255,255,255,0.02); border-radius: 18px; overflow: hidden; 
          border: 1px solid rgba(255,255,255,0.05);
        }
        .table-header { 
          display: grid; grid-template-columns: 44px 1.8fr 1.3fr 130px 75px 75px 180px 44px;
          padding: 12px 18px; background: rgba(255,255,255,0.03);
          font-size: 11px; font-weight: 900; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;
        }
        .table-body { max-height: 480px; overflow-y: auto; }
        .table-row { 
          display: grid; grid-template-columns: 44px 1.8fr 1.3fr 130px 75px 75px 180px 44px;
          padding: 10px 18px; border-bottom: 1px solid rgba(255,255,255,0.03);
          align-items: center; transition: background 0.2s; position: relative;
        }
        .table-row:hover { background: rgba(255,255,255,0.03); }
        
        .col-status { text-align: center; color: #52525b; }
        .row-number { font-size: 12px; font-weight: 800; }
        .row-title-input { background: transparent; border: none; color: white; font-size: 14px; font-weight: 700; width: 100%; outline: none; margin-bottom: 2px; }
        .row-title-input:focus { color: #1db954; }
        .row-artist-wrapper { display: flex; align-items: center; gap: 6px; }
        .row-artist-label { font-size: 11px; color: #71717a; font-weight: 600; }
        .row-artist-input { background: transparent; border: none; color: #a1a1aa; font-size: 12px; font-weight: 600; width: 100%; outline: none; }
        .row-artist-input:focus { color: white; }

        .col-album { padding-right: 8px; }
        .row-album-select { 
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); 
          color: #ff416c; font-size: 12px; font-weight: 700; padding: 6px 10px; 
          border-radius: 8px; width: 100%; cursor: pointer; outline: none; 
          transition: all 0.2s;
        }
        .row-album-select:focus { border-color: #ff416c; background: rgba(255,65,108,0.1); }

        .row-select { background: rgba(255,255,255,0.04); border: none; color: #a1a1aa; font-size: 12px; font-weight: 700; padding: 6px 8px; border-radius: 6px; width: 100%; cursor: pointer; outline: none; }
        .track-tempo-grid { display: contents; }
        .row-tempo-mobile-label { display: none; }
        .row-bpm-input { background: rgba(255,255,255,0.04); border: none; color: white; font-size: 12px; font-weight: 800; width: 55px; text-align: center; padding: 6px 4px; border-radius: 6px; outline: none; }
        
        .row-tags-list { display: flex; flex-wrap: wrap; gap: 4px; }
        .row-tag-btn { 
          font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 4px;
          background: rgba(255,255,255,0.03); color: #71717a; border: 1px solid rgba(255,255,255,0.05);
          cursor: pointer; transition: all 0.2s;
        }
        .row-tag-btn.active { background: var(--tag-color); color: black; border-color: transparent; }

        .row-remove { color: #52525b; background: none; border: none; cursor: pointer; transition: color 0.2s; padding: 6px; }
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

        .upload-success-hero { padding: 48px 24px; border-radius: 24px; text-align: center; border: 1px solid rgba(29, 185, 84, 0.15); }
        .success-badge { width: 72px; height: 72px; background: rgba(29, 185, 84, 0.1); border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
        .btn-primary { background: #1db954; color: black; border: none; padding: 14px 28px; border-radius: 12px; font-size: 15px; font-weight: 900; cursor: pointer; transition: transform 0.2s; }
        .btn-primary:hover { transform: scale(1.02); background: #1ed760; }

        .text-primary { color: #1db954; }
        .spin { animation: spin 1s linear infinite; }
        .hidden { display: none; }
        .animate-in { animation: animIn 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes animIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        
        @media (max-width: 1200px) {
          .table-header, .table-row { grid-template-columns: 44px 1.5fr 1fr 110px 65px 65px 140px 40px; }
        }

        /* MOBILE & TABLET LAYOUT (< 900px) */
        @media (max-width: 900px) {
          .batch-header-bar {
            padding: 16px;
            border-radius: 18px;
            gap: 14px;
          }
          .table-header { display: none; }
          .staging-table {
            background: transparent;
            border: none;
            border-radius: 0;
            overflow: visible;
          }
          .table-body {
            max-height: none;
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .table-row {
            display: flex;
            flex-direction: column;
            gap: 12px;
            padding: 16px;
            border-radius: 16px;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.07);
            position: relative;
          }
          .col-status {
            text-align: left;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
            font-weight: 800;
            color: #1db954;
          }
          .col-actions {
            position: absolute;
            top: 14px;
            right: 14px;
            display: block !important;
          }
          .row-remove {
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 10px;
            background: rgba(239, 68, 68, 0.12);
            color: #ef4444;
            border: 1px solid rgba(239, 68, 68, 0.2);
            cursor: pointer;
            transition: all 0.2s;
          }
          .row-title-input {
            font-size: 16px;
            font-weight: 800;
            padding: 4px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            padding-right: 44px; /* avoid overlapping with remove button */
          }
          .row-artist-wrapper {
            margin-top: 4px;
          }
          .col-album, .col-style {
            width: 100%;
            padding-right: 0;
          }
          .row-album-select, .row-select {
            width: 100%;
            height: 42px;
            border-radius: 10px;
            font-size: 13.5px;
            padding: 0 12px;
            background: rgba(255, 255, 255, 0.05);
          }
          .track-tempo-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            width: 100%;
          }
          .row-tempo-mobile-label {
            display: block;
            font-size: 10px;
            font-weight: 800;
            color: #71717a;
            text-transform: uppercase;
            margin-bottom: 3px;
          }
          .col-bpm, .col-mpm {
            display: flex;
            flex-direction: column;
            width: 100%;
          }
          .row-bpm-input {
            width: 100%;
            height: 40px;
            border-radius: 10px;
            font-size: 13px;
            background: rgba(255, 255, 255, 0.05);
            text-align: left;
            padding: 0 12px;
          }
          .staging-header {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }
          .staging-actions {
            display: grid;
            grid-template-columns: 1fr 2fr;
            gap: 10px;
            width: 100%;
          }
          .btn-discard {
            justify-content: center;
            height: 44px;
            border-radius: 12px;
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.2);
          }
          .btn-burn {
            justify-content: center;
            height: 44px;
            border-radius: 12px;
            padding: 0 16px;
            font-size: 13.5px;
          }
        }

        @media (max-width: 640px) {
          .bulk-upload-wrapper {
            gap: 16px;
          }
          .batch-header-bar {
            padding: 14px;
            border-radius: 18px;
            gap: 14px;
          }
          .meta-block {
            gap: 5px;
          }
          .field-micro-label {
            font-size: 10px;
            letter-spacing: 0.5px;
          }
          .meta-field input, .meta-select {
            height: 44px;
            font-size: 13.5px;
            border-radius: 12px;
          }
          .meta-select {
            text-overflow: ellipsis;
            white-space: nowrap;
            overflow: hidden;
            padding-right: 36px;
          }
          .dropzone {
            padding: 24px 16px;
            border-radius: 18px;
          }
          .dropzone-content {
            gap: 14px;
          }
          .upload-icon-wrapper {
            width: 46px;
            height: 46px;
            border-radius: 14px;
          }
          .text-group h3 {
            font-size: 15px;
          }
          .text-group p {
            font-size: 12px;
          }
        }
      
        @media (min-width: 1100px) {
          /* The queue sits in the right-hand column: each track gets two tidy lines instead of 8 cramped columns */
          .table-header { display: none; }
          .table-body { max-height: max(380px, calc(100vh - 360px)); }
          .table-row {
            grid-template-columns: 36px minmax(0, 1.4fr) minmax(0, 1fr) 84px 84px 36px;
            grid-template-areas: "st info info info info act" "st alb sty bpm mpm act" "st tags tags tags tags act";
            column-gap: 10px; row-gap: 8px; padding: 12px 14px;
          }
          .col-status { grid-area: st; }
          .col-info { grid-area: info; min-width: 0; }
          .col-album { grid-area: alb; min-width: 0; }
          .col-style { grid-area: sty; min-width: 0; }
          .col-bpm { grid-area: bpm; display: flex; flex-direction: column; }
          .col-mpm { grid-area: mpm; display: flex; flex-direction: column; }
          .col-tags { grid-area: tags; }
          .col-actions { grid-area: act; align-self: start; }
          .row-tempo-mobile-label { display: block; font-size: 9.5px; font-weight: 800; color: #71717a; text-transform: uppercase; margin-bottom: 2px; }
          .row-bpm-input { width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default BulkUpload;
