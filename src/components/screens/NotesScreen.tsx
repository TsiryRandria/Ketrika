import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Note } from '../../types';
import { 
  FileText, 
  Plus, 
  Search, 
  Star, 
  Pin, 
  MoreVertical, 
  Calendar, 
  Edit3, 
  Trash2, 
  Archive, 
  Check, 
  X, 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered, 
  Image as ImageIcon, 
  CheckSquare, 
  Paperclip,
  Sparkles,
  ArrowLeft
} from 'lucide-react';

export const NotesScreen: React.FC = () => {
  const { 
    notes, 
    addNote, 
    updateNote, 
    deleteNote, 
    togglePinNote, 
    toggleFavoriteNote,
    setIsEditingNote
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  
  // Active editing or creating state
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Synchronize note detail/edit open state with app context
  useEffect(() => {
    setIsEditingNote(Boolean(editingNote || isCreating));
    return () => {
      setIsEditingNote(false);
    };
  }, [editingNote, isCreating, setIsEditingNote]);

  // Form fields
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Projet');
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [isPinned, setIsPinned] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  const startEdit = (note: Note) => {
    setEditingNote(note);
    setIsCreating(false);
    setTitle(note.title);
    setContent(note.content);
    setCategory(note.category);
    setImageUrl(note.image);
    setIsPinned(note.isPinned);
    setIsFavorite(note.isFavorite);
  };

  const startCreate = () => {
    setEditingNote(null);
    setIsCreating(true);
    setTitle('');
    setContent('');
    setCategory('Idées');
    setImageUrl(undefined);
    setIsPinned(false);
    setIsFavorite(false);
  };

  const cancelEditor = () => {
    setEditingNote(null);
    setIsCreating(false);
  };

  const handleSave = () => {
    if (!title.trim()) return;

    if (editingNote) {
      updateNote(editingNote.id, {
        title,
        content,
        category,
        image: imageUrl,
        isPinned,
        isFavorite,
      });
    } else {
      addNote({
        title,
        content,
        category,
        image: imageUrl,
        isPinned,
        isFavorite,
        isArchived: false,
      });
    }
    cancelEditor();
  };

  const handleDelete = (id: string) => {
    deleteNote(id);
    if (editingNote?.id === id) {
      cancelEditor();
    }
  };

  // Filter notes
  const filteredNotes = notes.filter(n => {
    if (!searchQuery.trim()) return true;
    return (
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      n.content.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Sample quick images to attach
  const sampleImages = [
    'https://images.unsplash.com/photo-1539020140153-e479b8c22e70?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80',
  ];

  // Textarea reference for inserting formatting at cursor
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const insertFormatting = (prefix: string, suffix: string, defaultText: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setContent(prev => prev + `${prefix}${defaultText}${suffix}`);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end) || defaultText;
    const next = content.substring(0, start) + prefix + selected + suffix + content.substring(end);
    setContent(next);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 0);
  };

  const insertLinePrefix = (prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setContent(prev => prev + `\n${prefix}`);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = content.substring(0, start);
    const after = content.substring(end);
    const needsBreak = before.length > 0 && !before.endsWith('\n');
    const inserted = `${needsBreak ? '\n' : ''}${prefix}`;
    setContent(before + inserted + after);
    setTimeout(() => {
      textarea.focus();
      const pos = start + inserted.length;
      textarea.setSelectionRange(pos, pos);
    }, 0);
  };

  // If editing or creating, display the dedicated minimalist borderless screen
  if (editingNote || isCreating) {
    return (
      <div className="flex flex-col min-h-[calc(100vh-120px)] max-w-4xl mx-auto w-full pb-24 md:pb-8 animate-in fade-in duration-150">
        
        {/* Sleek Action Header: Return on left, actions on right */}
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-emerald-500/15">
          <button
            type="button"
            onClick={cancelEditor}
            className="inline-flex items-center gap-2 text-emerald-300 hover:text-white transition-colors py-1.5 group select-none"
            title="Retour à la liste des notes"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform text-emerald-400" />
            <span className="text-sm font-semibold tracking-wide">Retour</span>
          </button>

          <div className="flex items-center gap-2">
            {/* Quick Pin Toggle */}
            <button
              type="button"
              onClick={() => setIsPinned(!isPinned)}
              className={`p-2 rounded-xl transition-all ${
                isPinned 
                  ? 'text-emerald-300 bg-emerald-500/20 border border-emerald-400/40 shadow-sm' 
                  : 'text-emerald-400/60 hover:text-emerald-200 hover:bg-emerald-950/50'
              }`}
              title={isPinned ? 'Détacher' : 'Épingler la note'}
            >
              <Pin className={`w-4 h-4 ${isPinned ? 'fill-current' : ''}`} />
            </button>

            {/* Quick Favorite Toggle */}
            <button
              type="button"
              onClick={() => setIsFavorite(!isFavorite)}
              className={`p-2 rounded-xl transition-all ${
                isFavorite 
                  ? 'text-amber-300 bg-amber-400/15 border border-amber-400/40' 
                  : 'text-emerald-400/60 hover:text-amber-300 hover:bg-emerald-950/50'
              }`}
              title={isFavorite ? 'Retirer des favoris' : 'Marquer comme favori'}
            >
              <Star className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            </button>

            {/* Delete button (if modifying an existing note) */}
            {editingNote && (
              <button
                type="button"
                onClick={() => handleDelete(editingNote.id)}
                className="p-2 rounded-xl text-rose-400/70 hover:text-rose-200 hover:bg-rose-500/15 transition-colors"
                title="Supprimer la note"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            {/* Primary Save Button */}
            <button
              type="button"
              onClick={handleSave}
              disabled={!title.trim()}
              className="ml-1.5 px-4 sm:px-5 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-xs sm:text-sm shadow-[0_0_20px_rgba(52,211,153,0.4)] hover:shadow-[0_0_28px_rgba(52,211,153,0.65)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1.5"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Enregistrer</span>
            </button>
          </div>
        </div>

        {/* Minimalist Formatting Toolbar */}
        <div className="flex items-center gap-1 py-1.5 mb-2 text-emerald-300/70 overflow-x-auto no-scrollbar">
          <button 
            type="button" 
            onClick={() => insertFormatting('**', '**', 'texte en gras')}
            className="p-1.5 rounded-lg hover:text-white hover:bg-emerald-500/15 transition-colors"
            title="Gras"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button 
            type="button" 
            onClick={() => insertFormatting('*', '*', 'texte en italique')}
            className="p-1.5 rounded-lg hover:text-white hover:bg-emerald-500/15 transition-colors"
            title="Italique"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button 
            type="button" 
            onClick={() => insertFormatting('<u>', '</u>', 'texte souligné')}
            className="p-1.5 rounded-lg hover:text-white hover:bg-emerald-500/15 transition-colors"
            title="Souligné"
          >
            <Underline className="w-4 h-4" />
          </button>

          <span className="w-[1px] h-4 bg-emerald-500/20 mx-1 shrink-0" aria-hidden="true" />

          <button 
            type="button" 
            onClick={() => insertLinePrefix('• ')}
            className="p-1.5 rounded-lg hover:text-white hover:bg-emerald-500/15 transition-colors"
            title="Liste à puces"
          >
            <List className="w-4 h-4" />
          </button>
          <button 
            type="button" 
            onClick={() => insertLinePrefix('1. ')}
            className="p-1.5 rounded-lg hover:text-white hover:bg-emerald-500/15 transition-colors"
            title="Liste numérotée"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
          <button 
            type="button" 
            onClick={() => insertLinePrefix('[ ] ')}
            className="p-1.5 rounded-lg hover:text-white hover:bg-emerald-500/15 transition-colors"
            title="Case à cocher"
          >
            <CheckSquare className="w-4 h-4" />
          </button>

          <span className="w-[1px] h-4 bg-emerald-500/20 mx-1 shrink-0" aria-hidden="true" />

          <button 
            type="button" 
            onClick={() => setImageUrl(imageUrl ? undefined : sampleImages[0])}
            className={`p-1.5 rounded-lg transition-colors ${imageUrl ? 'text-emerald-300 bg-emerald-500/20' : 'hover:text-white hover:bg-emerald-500/15'}`}
            title={imageUrl ? "Supprimer la photo" : "Ajouter une image"}
          >
            <ImageIcon className="w-4 h-4" />
          </button>
          <button 
            type="button" 
            onClick={() => insertFormatting('[', '](https://...)', 'titre du lien')}
            className="p-1.5 rounded-lg hover:text-white hover:bg-emerald-500/15 transition-colors"
            title="Ajouter un lien"
          >
            <Paperclip className="w-4 h-4" />
          </button>
        </div>

        {/* Frameless Note Title Input */}
        <input
          type="text"
          placeholder="Titre de la note"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-transparent border-0 outline-none text-2xl sm:text-3xl md:text-4xl font-extrabold text-white placeholder:text-emerald-300/30 py-2 tracking-tight focus:ring-0"
          autoFocus
        />

        {/* Quiet unboxed metadata if editing */}
        {editingNote && (
          <div className="flex items-center gap-2 text-xs text-emerald-400/50 py-1 select-none">
            <span>Créée le {editingNote.createdAt}</span>
            <span aria-hidden="true">·</span>
            <span>Modifiée le {editingNote.updatedAt}</span>
          </div>
        )}

        {/* Full-width, Frameless Writing Area */}
        <div className="flex-1 flex flex-col mt-3">
          <textarea
            ref={textareaRef}
            rows={14}
            placeholder="Écrivez librement vos pensées, idées ou projets..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full flex-1 min-h-[50vh] bg-transparent border-0 outline-none text-base sm:text-lg text-emerald-100 placeholder:text-emerald-300/30 resize-none leading-relaxed focus:ring-0 py-2 font-sans"
          />

          {/* Attached Image preview directly beneath content without constraining editor */}
          {imageUrl && (
            <div className="mt-4 mb-2 relative group max-w-sm rounded-2xl overflow-hidden border border-emerald-500/25 shadow-lg">
              <img src={imageUrl} alt="Pièce jointe" className="w-full max-h-60 object-cover" />
              <button
                type="button"
                onClick={() => setImageUrl(undefined)}
                className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-slate-950/80 text-white/90 hover:text-white hover:bg-rose-500 transition-colors backdrop-blur-sm shadow"
                title="Supprimer la photo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-28 md:pb-8 animate-in fade-in duration-200 max-w-4xl mx-auto">
      
      {/* Search Bar with Add Note Button on the left */}
      <div className="flex items-center gap-3">
        {/* Add note icon button on the left (icon only) */}
        <button
          onClick={startCreate}
          className="p-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold hover:shadow-[0_0_18px_rgba(0,230,118,0.5)] transition-all hover:scale-105 flex items-center justify-center shrink-0"
          title="Ajouter une note"
          aria-label="Ajouter une note"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
        </button>

        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400/70" />
          <input
            type="text"
            placeholder="Rechercher une note..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl glass-input text-sm focus:ring-1 focus:ring-emerald-400 transition-all placeholder:text-emerald-300/40"
          />
        </div>
      </div>

      {/* Notes List Column */}
      <div className="space-y-3.5">
        {filteredNotes.length === 0 ? (
          <div className="glass-panel rounded-3xl p-8 text-center border border-emerald-500/20">
            <p className="text-sm text-emerald-300/70">Aucune note ne correspond à votre recherche.</p>
            <button
              onClick={startCreate}
              className="mt-3 px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-500/30"
            >
              Créer une nouvelle note
            </button>
          </div>
        ) : (
          filteredNotes.map((note) => (
              <div
                key={note.id}
                onClick={() => startEdit(note)}
                className="glass-panel rounded-3xl p-4 sm:p-5 border border-emerald-500/30 hover:border-emerald-400/60 transition-all cursor-pointer relative group hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]"
              >
                  <div className="flex items-start gap-3.5">
                    
                    {/* Thumbnail or Icon Box */}
                    {note.image ? (
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shrink-0 border border-emerald-500/30">
                        <img 
                          src={note.image} 
                          alt={note.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-emerald-950/70 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-400">
                        {note.category === 'Idées' ? (
                          <Sparkles className="w-6 h-6 text-emerald-300 drop-shadow-[0_0_8px_#34d399]" />
                        ) : (
                          <FileText className="w-6 h-6 text-emerald-300" />
                        )}
                      </div>
                    )}

                    {/* Note Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-white text-base truncate group-hover:text-emerald-300 transition-colors">
                            {note.title}
                          </h3>
                          {note.isFavorite && (
                            <Star className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
                          )}
                        </div>

                        {/* Pin and Options */}
                        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => togglePinNote(note.id)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              note.isPinned ? 'text-emerald-300' : 'text-emerald-500/50 hover:text-emerald-300'
                            }`}
                            title={note.isPinned ? 'Détacher' : 'Épingler'}
                          >
                            <Pin className={`w-4 h-4 ${note.isPinned ? 'fill-current' : ''}`} />
                          </button>
                          <button
                            onClick={() => toggleFavoriteNote(note.id)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              note.isFavorite ? 'text-amber-400' : 'text-emerald-500/50 hover:text-amber-400'
                            }`}
                            title={note.isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                          >
                            <Star className={`w-4 h-4 ${note.isFavorite ? 'fill-current' : ''}`} />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-emerald-200/70 mt-1 line-clamp-2">
                        {note.content}
                      </p>

                      {/* Dates metadata line (Matching page 3) */}
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-emerald-400/60 mt-3 pt-2 border-t border-emerald-500/15">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Créée le : {note.createdAt}
                        </span>
                        <span>|</span>
                        <span className="flex items-center gap-1">
                          <Edit3 className="w-3 h-3" /> Modifiée le : {note.updatedAt}
                        </span>
                      </div>
                    </div>

                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    );
  };
