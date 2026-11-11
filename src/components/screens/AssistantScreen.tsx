import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Bot, 
  Sparkles, 
  History, 
  Send, 
  Paperclip, 
  Mic, 
  Briefcase, 
  Plus, 
  Trash2, 
  Lightbulb, 
  CheckCircle2, 
  Folder, 
  ListOrdered, 
  BarChart3, 
  Smile, 
  ChevronRight,
  Loader2,
  StopCircle
} from 'lucide-react';

export const AssistantScreen: React.FC = () => {
  const { 
    chatMessages, 
    sendChatMessage, 
    clearChat, 
    isGeneratingAI,
    projects,
    tasks,
    currentBalance 
  } = useApp();

  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, isGeneratingAI]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || isGeneratingAI) return;
    setInputText('');
    await sendChatMessage(text);
  };

  const handleSuggestionClick = (promptText: string) => {
    handleSend(promptText);
  };

  // Web Speech API Voice Recognition (with fallback)
  const toggleSpeech = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      // Fallback simulation
      setInputText("Bonjour Ketrika, peux-tu faire un résumé de mes tâches en cours ?");
      return;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'fr-FR';
      recognition.continuous = false;

      if (!isRecording) {
        setIsRecording(true);
        recognition.start();

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInputText(transcript);
          setIsRecording(false);
        };

        recognition.onerror = () => {
          setIsRecording(false);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };
      } else {
        setIsRecording(false);
      }
    } catch {
      setIsRecording(false);
    }
  };

  const suggestions = [
    { text: 'Générer des idées', icon: Lightbulb },
    { text: 'Aider à organiser mes tâches', icon: CheckCircle2 },
    { text: 'Assistance dans mes projets', icon: Folder },
    { text: 'Créer une liste de tâches', icon: ListOrdered },
    { text: 'Résumé mes activités', icon: BarChart3 },
    { text: 'Conseils de productivité', icon: Sparkles },
  ];

  const conversationHistory = [
    { title: 'Conseils pour mieux organiser...', date: "Aujourd'hui 08:30" },
    { title: 'Résumé de mes projets', date: 'Hier 14:20' },
    { title: 'Idées de projets', date: '16/04/2025 10:15' },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 pb-28 md:pb-8 animate-in fade-in duration-200">
      
      {/* Responsive Split on PC/Tablet: Sidebar for Suggestions & History + Central Chat Room */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Mascot Greeting + Suggestions + History (Matching page 6 top) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Glowing 3D Robot Mascot Card (Matching page 6) */}
          <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-emerald-500/30 text-center relative overflow-hidden flex flex-col items-center">
            
            {/* Robot Mascot in Radiant Green Neon Circle */}
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full p-2 border-2 border-emerald-400/80 shadow-[0_0_30px_rgba(0,230,118,0.5)] mb-3 bg-gradient-to-b from-emerald-950/80 to-slate-950 flex items-center justify-center">
              
              {/* Cute futuristic SVG Robot */}
              <div className="relative w-full h-full rounded-full bg-emerald-900/40 flex items-center justify-center">
                <svg width="74" height="74" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Robot head */}
                  <rect x="25" y="28" width="50" height="38" rx="14" fill="#E2F7ED" stroke="#00E676" strokeWidth="3" />
                  {/* Visor face */}
                  <rect x="31" y="36" width="38" height="22" rx="8" fill="#042F24" />
                  {/* Glowing Cyan Eyes */}
                  <circle cx="42" cy="47" r="4.5" fill="#38BDF8" className="drop-shadow-[0_0_6px_#38BDF8]" />
                  <circle cx="58" cy="47" r="4.5" fill="#38BDF8" className="drop-shadow-[0_0_6px_#38BDF8]" />
                  {/* Antenna */}
                  <path d="M50 14V28M50 14C52.2091 14 54 12.2091 54 10C54 7.79086 52.2091 6 50 6C47.7909 6 46 7.79086 46 10C46 12.2091 47.7909 14 50 14Z" stroke="#00E676" strokeWidth="3" strokeLinecap="round" />
                  {/* Cheerful mouth curve */}
                  <path d="M47 53Q50 55 53 53" stroke="#34D399" strokeWidth="2" strokeLinecap="round" />
                  {/* Body collar */}
                  <path d="M35 70C35 67 65 67 65 70L70 88C70 91 30 91 30 88L35 70Z" fill="#E2F7ED" stroke="#00E676" strokeWidth="2.5" />
                  <circle cx="50" cy="78" r="3" fill="#00E676" className="drop-shadow-[0_0_5px_#00E676]" />
                </svg>
              </div>

              {/* Status indicator dot */}
              <div className="absolute bottom-1 right-2 w-4 h-4 rounded-full bg-emerald-400 border-2 border-slate-950 shadow-[0_0_8px_#34d399]" />
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Assistant IA
            </h2>
            <div className="flex items-center justify-center gap-1.5 mt-0.5">
              <span className="text-sm font-bold text-emerald-300">Bonjour !</span>
              <span>👋</span>
            </div>
            <p className="text-xs text-emerald-200/80 mt-1 max-w-xs leading-relaxed">
              Je suis votre assistant intelligent. Comment puis-je vous aider aujourd'hui ?
            </p>
          </div>

          {/* Suggestions de questions (Matching page 6) */}
          <div className="glass-panel rounded-3xl p-5 border border-emerald-500/30">
            <div className="flex items-center gap-2 mb-3 text-emerald-300">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-xs uppercase tracking-wider">
                Suggestions de questions
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {suggestions.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(item.text)}
                    className="p-2.5 rounded-2xl glass-panel-subtle border border-emerald-500/25 hover:border-emerald-400/60 hover:bg-emerald-900/40 text-left transition-all group flex flex-col justify-between"
                  >
                    <Icon className="w-4 h-4 text-emerald-400 mb-1.5 group-hover:scale-110 transition-transform" />
                    <span className="text-[11px] font-semibold text-white/90 leading-tight">
                      {item.text}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Historique des conversations (Matching page 6) */}
          <div className="glass-panel rounded-3xl p-5 border border-emerald-500/30">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-emerald-300">
                <History className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-xs uppercase tracking-wider">
                  Historique des conversations
                </h3>
              </div>
              <button 
                onClick={clearChat}
                className="text-emerald-400/60 hover:text-rose-400 p-1 rounded-lg transition-colors"
                title="Vider l'historique"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {conversationHistory.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSend(item.title)}
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/20 hover:border-emerald-400/50 hover:bg-emerald-900/40 cursor-pointer transition-all group"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-semibold text-white truncate group-hover:text-emerald-300 transition-colors">
                      {item.title}
                    </p>
                    <p className="text-[10px] text-emerald-400/60 mt-0.5">{item.date}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-emerald-400/60 group-hover:translate-x-1 transition-transform shrink-0" />
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Live Chat Interface */}
        <div className="lg:col-span-7">
          <div className="glass-panel rounded-3xl p-5 border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.2)] flex flex-col h-[650px] justify-between">
            
            {/* Chat Messages Stream */}
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pr-1 mb-4">
              {chatMessages.map((msg) => {
                const isAssistant = msg.role === 'assistant';
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3 ${isAssistant ? '' : 'flex-row-reverse'}`}
                  >
                    {/* Avatar */}
                    {isAssistant ? (
                      <div className="w-8 h-8 rounded-full bg-emerald-950 border border-emerald-400/60 flex items-center justify-center text-emerald-300 shrink-0 shadow-[0_0_8px_#34d399]">
                        <Bot className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-emerald-500 text-slate-950 font-bold flex items-center justify-center shrink-0">
                        J
                      </div>
                    )}

                    {/* Speech Bubble */}
                    <div
                      className={`max-w-[85%] rounded-3xl p-3.5 text-xs sm:text-sm leading-relaxed ${
                        isAssistant
                          ? 'glass-panel border-emerald-500/30 text-emerald-100 rounded-tl-sm'
                          : 'bg-emerald-500 text-slate-950 font-medium rounded-tr-sm shadow-[0_0_15px_rgba(0,230,118,0.3)]'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{msg.text}</div>
                      <span className={`block text-[10px] mt-1.5 ${isAssistant ? 'text-emerald-400/60' : 'text-slate-800/70'} text-right`}>
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                );
              })}

              {isGeneratingAI && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-950 border border-emerald-400/60 flex items-center justify-center text-emerald-300 shrink-0">
                    <Bot className="w-4 h-4 animate-spin" />
                  </div>
                  <div className="glass-panel rounded-2xl px-4 py-2.5 text-xs text-emerald-300 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Ketrika IA réfléchit...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Bottom Input Area & Controls (Matching page 6 bottom) */}
            <div className="space-y-3 pt-3 border-t border-emerald-500/20">
              
              {/* Main Input Row */}
              <div className="relative flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Tapez votre message ici..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  disabled={isGeneratingAI}
                  className="flex-1 px-4 py-3 rounded-2xl glass-input text-sm placeholder:text-emerald-300/40 focus:ring-1 focus:ring-emerald-400"
                />

                {/* Attachment icon */}
                <button
                  type="button"
                  onClick={() => alert('Sélection de fichier : Vous pouvez joindre des documents, images ou rapports.')}
                  className="p-2.5 rounded-2xl glass-panel-subtle text-emerald-300 hover:text-white transition-colors shrink-0"
                  title="Joindre un fichier"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                {/* Send Glowing Button */}
                <button
                  type="button"
                  onClick={() => handleSend()}
                  disabled={isGeneratingAI || !inputText.trim()}
                  className="p-3 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-bold shadow-[0_0_15px_rgba(0,230,118,0.5)] hover:shadow-[0_0_25px_rgba(0,230,118,0.8)] transition-all shrink-0 disabled:opacity-50"
                  title="Envoyer"
                >
                  <Send className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

              {/* Voice and File Action Pills (Matching page 6) */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={toggleSpeech}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    isRecording 
                      ? 'bg-rose-500/30 border-rose-400 text-rose-300 animate-pulse' 
                      : 'glass-panel-subtle border-emerald-500/25 text-emerald-200 hover:text-white hover:bg-emerald-900/40'
                  }`}
                >
                  <Mic className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isRecording ? 'Écoute en cours...' : 'Parler'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => alert('Gestionnaire de fichiers Ketrika connecté.')}
                  className="py-2 px-3 rounded-xl glass-panel-subtle border border-emerald-500/25 text-emerald-200 hover:text-white hover:bg-emerald-900/40 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                >
                  <Briefcase className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Joindre un fichier</span>
                </button>
              </div>

              {/* Action Buttons: Nouvelle conversation & Supprimer cette conversation (Matching page 6) */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    clearChat();
                    setInputText('');
                  }}
                  className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold text-xs shadow-[0_0_18px_rgba(0,230,118,0.4)] hover:shadow-[0_0_25px_rgba(0,230,118,0.7)] transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Nouvelle conversation</span>
                </button>

                <button
                  type="button"
                  onClick={clearChat}
                  className="w-full py-2.5 rounded-2xl glass-panel-subtle border border-emerald-500/25 hover:border-rose-500/40 hover:bg-rose-500/10 text-emerald-300/80 hover:text-rose-300 font-semibold text-xs transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Supprimer cette conversation</span>
                </button>
              </div>

            </div>

          </div>
        </div>

      </div>

    </div>
  );
};
