"use client";

import React, { useState } from 'react';
import { useStudio } from '@/components/admin/StudioProvider';
import { Trash2, Edit2, Plus, Tag, Music2, Check, X } from 'lucide-react';
import ConfirmModal from '@/components/admin/ConfirmModal';

export default function TaxonomyPage() {
  const { styles, tags, addStyle, updateStyle, removeStyle, addTag, updateTag, removeTag } = useStudio();
  
  const [newStyleTitle, setNewStyleTitle] = useState('');
  const [newStyleColor, setNewStyleColor] = useState('#1db954');
  const [newStyleProgram, setNewStyleProgram] = useState('Latin');

  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#ffffff');

  const [editingStyleId, setEditingStyleId] = useState<string | null>(null);
  const [editStyleTitle, setEditStyleTitle] = useState('');
  const [editStyleColor, setEditStyleColor] = useState('');
  const [editStyleProgram, setEditStyleProgram] = useState('');

  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editTagName, setEditTagName] = useState('');
  const [editTagColor, setEditTagColor] = useState('');

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfig, setDeleteConfig] = useState<{ id: string, name: string, type: 'style' | 'tag' } | null>(null);

  const handleAddStyle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStyleTitle.trim()) return;
    addStyle({
      title: newStyleTitle,
      color: newStyleColor,
      program: newStyleProgram,
      order: styles.length + 1
    });
    setNewStyleTitle('');
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    addTag({
      name: newTagName,
      color: newTagColor
    });
    setNewTagName('');
  };

  const handleDeleteClick = (id: string, name: string, type: 'style' | 'tag') => {
    setDeleteConfig({ id, name, type });
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteAction = () => {
    if (!deleteConfig) return;
    if (deleteConfig.type === 'style') {
      removeStyle(deleteConfig.id);
    } else {
      removeTag(deleteConfig.id);
    }
    setDeleteConfig(null);
  };

  return (
    <div className="taxonomy-page animate-in">
      <div className="page-header">
        <h1>Categories & Tags</h1>
        <p className="text-secondary">Manage the dynamic categorization of your entire music library.</p>
      </div>

      <div className="taxonomy-grid">
        
        {/* STYLES MANAGEMENT */}
        <div className="admin-card glass">
          <div className="card-header">
            <Music2 size={24} className="text-primary" />
            <h2>Dance Styles</h2>
          </div>
          <p className="text-secondary mb-4">Create core categories (e.g. Samba, Rumba) that define the macro structure.</p>
          
          <form className="add-form glass" onSubmit={handleAddStyle}>
            <div className="form-group">
              <input 
                type="text" 
                placeholder="Style Name" 
                value={newStyleTitle} 
                onChange={(e) => setNewStyleTitle(e.target.value)}
                className="t-input"
              />
              <select 
                value={newStyleProgram} 
                onChange={(e) => setNewStyleProgram(e.target.value)}
                className="t-select"
              >
                <option value="Latin">Latin</option>
                <option value="Standard">Standard</option>
                <option value="Special">Special</option>
              </select>
              <input 
                type="color" 
                value={newStyleColor} 
                onChange={(e) => setNewStyleColor(e.target.value)}
                className="color-picker"
              />
              <button type="submit" className="add-btn"><Plus size={18} /> Add</button>
            </div>
          </form>

          <div className="items-list">
            {styles.map(style => (
              <div key={style.id} className="t-item glass">
                <div className="t-info">
                  {editingStyleId === style.id ? (
                    <div className="inline-edit">
                      <input 
                        type="text" 
                        value={editStyleTitle} 
                        onChange={(e) => setEditStyleTitle(e.target.value)}
                        className="t-input edit-input"
                      />
                      <select 
                        value={editStyleProgram} 
                        onChange={(e) => setEditStyleProgram(e.target.value)}
                        className="t-select edit-input"
                      >
                        <option value="Latin">Latin</option>
                        <option value="Standard">Standard</option>
                        <option value="Special">Special</option>
                      </select>
                      <input 
                        type="color" 
                        value={editStyleColor} 
                        onChange={(e) => setEditStyleColor(e.target.value)}
                        className="color-picker edit-color"
                      />
                      <button 
                        className="save-btn" 
                        onClick={() => {
                          updateStyle(style.id, { title: editStyleTitle, color: editStyleColor, program: editStyleProgram });
                          setEditingStyleId(null);
                        }}
                      ><Check size={16}/></button>
                      <button className="del-btn" onClick={() => setEditingStyleId(null)}><X size={16}/></button>
                    </div>
                  ) : (
                    <>
                      <div className="color-dot" style={{ background: style.color }}></div>
                      <span className="t-name">{style.title}</span>
                      <span className="t-badge">{style.program}</span>
                    </>
                  )}
                </div>
                <div className="t-actions">
                  {editingStyleId !== style.id && (
                    <button className="edit-action-btn" onClick={() => {
                      setEditingStyleId(style.id);
                      setEditStyleTitle(style.title);
                      setEditStyleColor(style.color);
                      setEditStyleProgram(style.program);
                    }}>
                      <Edit2 size={16} />
                    </button>
                  )}
                  <button className="del-btn" onClick={() => {
                    handleDeleteClick(style.id, style.title, 'style');
                  }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* TAGS MANAGEMENT */}
        <div className="admin-card glass">
          <div className="card-header">
            <Tag size={24} className="text-primary" />
            <h2>Track Tags</h2>
          </div>
          <p className="text-secondary mb-4">Create generic tags (e.g. Instrumental, Pop) applied across any style.</p>
          
          <form className="add-form glass" onSubmit={handleAddTag}>
            <div className="form-group">
              <input 
                type="text" 
                placeholder="Tag Name" 
                value={newTagName} 
                onChange={(e) => setNewTagName(e.target.value)}
                className="t-input"
              />
              <input 
                type="color" 
                value={newTagColor} 
                onChange={(e) => setNewTagColor(e.target.value)}
                className="color-picker"
              />
              <button type="submit" className="add-btn"><Plus size={18} /> Add</button>
            </div>
          </form>

          <div className="items-list">
            {tags.map(tag => (
              <div key={tag.id} className="t-item glass">
                <div className="t-info">
                  {editingTagId === tag.id ? (
                    <div className="inline-edit">
                      <input 
                        type="text" 
                        value={editTagName} 
                        onChange={(e) => setEditTagName(e.target.value)}
                        className="t-input edit-input"
                      />
                      <input 
                        type="color" 
                        value={editTagColor} 
                        onChange={(e) => setEditTagColor(e.target.value)}
                        className="color-picker edit-color"
                      />
                      <button 
                        className="save-btn" 
                        onClick={() => {
                          updateTag(tag.id, { name: editTagName, color: editTagColor });
                          setEditingTagId(null);
                        }}
                      ><Check size={16}/></button>
                      <button className="del-btn" onClick={() => setEditingTagId(null)}><X size={16}/></button>
                    </div>
                  ) : (
                    <>
                      <div className="color-dot" style={{ background: tag.color }}></div>
                      <span className="t-name">{tag.name}</span>
                    </>
                  )}
                </div>
                <div className="t-actions">
                  {editingTagId !== tag.id && (
                    <button className="edit-action-btn" onClick={() => {
                      setEditingTagId(tag.id);
                      setEditTagName(tag.name);
                      setEditTagColor(tag.color);
                    }}>
                      <Edit2 size={16} />
                    </button>
                  )}
                  <button className="del-btn" onClick={() => {
                    handleDeleteClick(tag.id, tag.name, 'tag');
                  }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            {tags.length === 0 && <p className="text-secondary text-center py-4">No tags created yet.</p>}
          </div>
        </div>

      </div>

      <ConfirmModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDeleteAction}
        title={`Delete ${deleteConfig?.type === 'style' ? 'Dance Style' : 'Track Tag'}?`}
        message={`Are you sure you want to permanently delete "${deleteConfig?.name}"? This will remove it from all tracks associated with it.`}
        confirmText={`Delete ${deleteConfig?.type === 'style' ? 'Style' : 'Tag'}`}
      />

      <style jsx>{`
        .taxonomy-page {
          display: flex;
          flex-direction: column;
          gap: 32px;
          padding-bottom: 80px;
        }

        .page-header h1 {
          font-size: 32px;
          font-weight: 900;
          margin-bottom: 8px;
        }

        .taxonomy-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }

        .admin-card {
          padding: 32px;
          border-radius: 20px;
          display: flex;
          flex-direction: column;
        }

        .card-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }

        .card-header h2 {
          font-size: 24px;
          font-weight: 800;
        }

        .text-primary { color: #1db954; }
        .text-secondary { color: #a1a1aa; }
        .mb-4 { margin-bottom: 24px; }
        .py-4 { padding: 16px 0; }
        .text-center { text-align: center; }

        .add-form {
          padding: 16px;
          border-radius: 12px;
          background: rgba(255,255,255,0.03);
          margin-bottom: 24px;
        }

        .form-group {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .t-input, .t-select {
          flex: 1;
          background: rgba(0,0,0,0.4);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          padding: 10px 16px;
          color: white;
          font-size: 14px;
        }

        .t-input:focus, .t-select:focus {
          outline: none;
          border-color: #1db954;
        }

        .color-picker {
          width: 40px;
          height: 40px;
          padding: 0;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          background: transparent;
          cursor: pointer;
        }

        .add-btn {
          background: #1db954;
          color: black;
          font-weight: 700;
          padding: 0 20px;
          height: 40px;
          border-radius: 8px;
          border: none;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .add-btn:hover {
          transform: scale(1.05);
        }

        .items-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .t-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          border-radius: 12px;
          background: rgba(255,255,255,0.02);
          transition: background 0.2s;
        }

        .t-item:hover {
          background: rgba(255,255,255,0.06);
        }

        .t-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .color-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }

        .t-name {
          font-weight: 600;
          font-size: 15px;
        }

        .t-badge {
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 10px;
          background: rgba(255,255,255,0.1);
          color: #a1a1aa;
          text-transform: uppercase;
        }

        .t-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .del-btn, .edit-action-btn {
          background: transparent;
          border: none;
          color: #71717a;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .edit-action-btn:hover {
          background: rgba(255,255,255,0.05);
          color: white;
        }

        .del-btn:hover {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }

        .inline-edit {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .edit-input {
          height: 32px;
          padding: 0 10px;
          font-size: 13px;
          min-width: 100px;
        }

        .edit-color {
          width: 32px;
          height: 32px;
        }

        .save-btn {
          background: #1db954;
          color: black;
          border: none;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .animate-in {
          animation: animateIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes animateIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 1024px) {
          .taxonomy-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
