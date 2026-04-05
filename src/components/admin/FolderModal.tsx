"use client";

import React, { useState, useEffect } from 'react';
import { X, Folder, Plus, Check } from 'lucide-react';

interface FolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (name: string, color: string) => void;
  initialData?: { name: string; color: string };
}

const COLORS = [
  '#1db954', // Spotify Green
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#06b6d4', // Cyan
  '#84cc16', // Lime
];

const FolderModal = ({ isOpen, onClose, onConfirm, initialData }: FolderModalProps) => {
  const [name, setName] = useState(initialData?.name || '');
  const [selectedColor, setSelectedColor] = useState(initialData?.color || COLORS[0]);

  useEffect(() => {
    if (isOpen) {
      setName(initialData?.name || '');
      setSelectedColor(initialData?.color || COLORS[0]);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onConfirm(name.trim(), selectedColor);
      onClose();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass animate-in">
        <header className="modal-header">
          <div className="header-title">
            <div className="icon-box glass" style={{ color: selectedColor }}>
              <Folder size={20} fill="currentColor" fillOpacity={0.1} />
            </div>
            <div>
              <h3>{initialData ? 'Edit Collection' : 'New Collection'}</h3>
              <p>Organize your studio library into logical groups.</p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </header>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Collection Name</label>
            <input 
              type="text" 
              autoFocus
              placeholder="e.g. Standard Latin 2024" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Selection Color</label>
            <div className="color-grid">
              {COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  className={`color-btn ${selectedColor === color ? 'active' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setSelectedColor(color)}
                >
                  {selectedColor === color && <Check size={14} color="black" strokeWidth={3} />}
                </button>
              ))}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={!name.trim()}>
              {initialData ? 'Save Changes' : 'Create Collection'}
            </button>
          </div>
        </form>
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
          z-index: 3000;
        }

        .modal-content {
          width: 100%;
          max-width: 440px;
          border-radius: 28px;
          padding: 32px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.5);
        }

        .modal-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
        .header-title { display: flex; gap: 16px; align-items: center; }
        .header-title h3 { font-size: 20px; font-weight: 800; }
        .header-title p { font-size: 13px; color: #71717a; }

        .icon-box { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
        .close-btn { color: #71717a; transition: color 0.2s; }
        .close-btn:hover { color: white; }

        .modal-form { display: flex; flex-direction: column; gap: 24px; }
        .form-group label { display: block; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #71717a; margin-bottom: 8px; letter-spacing: 0.5px; }
        
        input {
          width: 100%;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          padding: 12px 16px;
          border-radius: 12px;
          color: white;
          outline: none;
          font-size: 15px;
          transition: border-color 0.2s;
        }
        input:focus { border-color: #1db954; }

        .color-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        .color-btn {
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s;
          cursor: pointer;
        }
        .color-btn:hover { transform: scale(1.05); }
        .color-btn.active { transform: scale(1.1); box-shadow: 0 0 15px rgba(255,255,255,0.1); border: 2px solid white; }

        .modal-footer { display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px; }
        
        .animate-in { animation: animateIn 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
        @keyframes animateIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
      `}</style>
    </div>
  );
};

export default FolderModal;
