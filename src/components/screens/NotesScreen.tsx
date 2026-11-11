import React, { useState } from 'react';
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
  Sparkles
} from 'lucide-react';

export const NotesScreen: React.FC = () => {
  const { 
    notes, 
    addNote, 
    updateNote, 
    deleteNote, 
    togglePinNote, 
    toggleFavoriteNote 
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  
  // Active editing or creating state
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isCreating, setIsCreating] = useState(false);

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

  // If editing or creating, display the dedicated "Modifier la note" / "Ajouter une note" screen
  if (editingNote || isCreating) {
    return (
      <div className="space-y-4 sm:space-y-6 pb-28 md:pb-8 animate-in fade-in duration-200 max-w-4xl mx-auto">
        <div className="glass-panel rounded-3xl p-5 sm:p-7 border border-emerald-400/50 shadow-[0_0_35px_rgba(16,185,129,0.3)]">
          
          {/* Header with Title & Close (Matching page 3: Modifier la note) */}
          <div className="flex items-center justify-between pb-4 border-b border-emerald-500/20">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <Edit3 className="w-5 h-5 text-emerald-400" />
              </div>
              <h2 className="font-extrabold text-white text-lg sm:text-xl tracking-tight">
                {isCreating ? 'Ajouter une note' : 'Modifier la note'}
              </h2>
            </div>
            
            <button
              onClick={cancelEditor}
              className="p-2 rounded-full bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 hover:text-white hover:bg-emerald-900/60 transition-all"
              title="Retour à la liste des notes"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Title Input */}
          <div className="mt-5">
            <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300/80 mb-1.5">
              Titre de la note
            </label>
            <input
              type="text"
              placeholder="ex: Voyage au Maroc"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl glass-input text-base sm:text-lg font-bold placeholder:text-emerald-300/40 focus:ring-1 focus:ring-emerald-400"
            />
          </div>

          {/* Rich Text Toolbar (Matching B, I, U, Lists, Image, Checklist, Link from page 3) */}
          <div className="mt-4 flex items-center gap-1.5 p-1.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/25 overflow-x-auto no-scrollbar">
            <button 
              type="button" 
              onClick={() => setContent(prev => prev + ' **gras**')}
              className="p-2 rounded-xl text-emerald-300 hover:text-white hover:bg-emerald-800/40 transition-colors"
              title="Gras"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button 
              type="button" 
              onClick={() => setContent(prev => prev + ' *italique*')}
              className="p-2 rounded-xl text-emerald-300 hover:text-white hover:bg-emerald-800/40 transition-colors"
              title="Italique"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button 
              type="button" 
              onClick={() => setContent(prev => prev + ' <u>souligné</u>')}
              className="p-2 rounded-xl text-emerald-300 hover:text-white hover:bg-emerald-800/40 transition-colors"
              title="Souligné"
            >
              <Underline className="w-4 h-4" />
            </button>

            <div className="w-[1px] h-5 bg-emerald-500/30 mx-1" />

            <button 
              type="button" 
              onClick={() => setContent(prev => prev + '\n• ')}
              className="p-2 rounded-xl text-emerald-300 hover:text-white hover:bg-emerald-800/40 transition-colors"
              title="Liste à puces"
            >
              <List className="w-4 h-4" />
            </button>
            <button 
              type="button" 
              onClick={() => setContent(prev => prev + '\n1. ')}
              className="p-2 rounded-xl text-emerald-300 hover:text-white hover:bg-emerald-800/40 transition-colors"
              title="Liste numérotée"
            >
              <ListOrdered className="w-4 h-4" />
            </button>

            <div className="w-[1px] h-5 bg-emerald-500/30 mx-1" />

            <button 
              type="button" 
              onClick={() => setImageUrl(sampleImages[0])}
              className="p-2 rounded-xl text-emerald-300 hover:text-white hover:bg-emerald-800/40 transition-colors"
              title="Insérer une image"
            >
              <ImageIcon className="w-4 h-4" />
            </button>
            <button 
              type="button" 
              onClick={() => setContent(prev => prev + '\n[ ] ')}
              className="p-2 rounded-xl text-emerald-300 hover:text-white hover:bg-emerald-800/40 transition-colors"
              title="Ajouter une case à cocher"
            >
              <CheckSquare className="w-4 h-4" />
            </button>
            <button 
              type="button" 
              onClick={() => setContent(prev => prev + ' [Lien](https://ketrika.mg)')}
              className="p-2 rounded-xl text-emerald-300 hover:text-white hover:bg-emerald-800/40 transition-colors"
              title="Pièce jointe"
            >
              <Paperclip className="w-4 h-4" />
            </button>
          </div>

          {/* Textarea Content & Image preview side-by-side if image present */}
          <div className="mt-4 flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300/80 mb-1.5">
                Contenu de la note
              </label>
              <textarea
                rows={8}
                placeholder="Liste des lieux à visiter :&#10;• Marrakech&#10;• Fès&#10;• Chefchaouen"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full px-4 py-3.5 rounded-2xl glass-input text-sm focus:ring-1 focus:ring-emerald-400 placeholder:text-emerald-300/40 leading-relaxed font-sans"
              />
            </div>

            {/* Attached Photo Preview (Matching page 3 right thumbnail) */}
            {imageUrl && (
              <div className="md:w-56 shrink-0 flex flex-col">
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300/80 mb-1.5">
                  Photo jointe
                </label>
                <div className="relative rounded-2xl overflow-hidden border border-emerald-400/40 shadow-lg h-44 w-full">
                  <img src={imageUrl} alt="Pièce jointe" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setImageUrl(undefined)}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-950/80 text-white hover:bg-rose-500 transition-colors shadow-md"
                    title="Supprimer la photo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons Row (Matching page 3: Épingler, Archiver, Supprimer, Enregistrer) */}
          <div className="mt-6 pt-4 border-t border-emerald-500/20 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPinned(!isPinned)}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  isPinned 
                    ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400' 
                    : 'glass-panel-subtle text-emerald-300/70 hover:text-white'
                }`}
              >
                <Pin className={`w-4 h-4 ${isPinned ? 'fill-current' : ''}`} />
                <span>Épingler</span>
              </button>
              
              <button
                type="button"
                onClick={cancelEditor}
                className="px-3.5 py-2.5 rounded-xl glass-panel-subtle text-emerald-300/70 hover:text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <Archive className="w-4 h-4" />
                <span>Archiver</span>
              </button>
            </div>

            <div className="flex items-center gap-2.5">
              {editingNote && (
                <button
                  type="button"
                  onClick={() => handleDelete(editingNote.id)}
                  className="px-4 py-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:bg-rose-500 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Supprimer</span>
                </button>
              )}
              
              <button
                type="button"
                onClick={handleSave}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-[0_0_18px_rgba(0,230,118,0.6)] hover:shadow-[0_0_28px_rgba(0,230,118,0.9)] transition-all flex items-center gap-2"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Enregistrer</span>
              </button>
            </div>
          </div>

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
