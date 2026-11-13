import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp, PendingAssistantAttachment } from '../../context/AppContext';
import {
  Bot,
  Send,
  Paperclip,
  Mic,
  MicOff,
  Square,
  Plus,
  Trash2,
  Lightbulb,
  CheckCircle2,
  Folder,
  ListOrdered,
  BarChart3,
  Sparkles,
  ChevronRight,
  Loader2,
  X,
  FileText,
  FileUp,
  Image as ImageIcon,
  AlertCircle,
  MessageSquareText,
  Volume2,
} from 'lucide-react';
import {
  AttachmentMeta,
  MAX_ATTACHMENT_COUNT,
  MAX_FILE_BASE64_BYTES,
  MAX_FILE_BYTES,
  MAX_TOTAL_ENCODED_BYTES,
  MAX_TOTAL_RAW_BYTES,
  detectAttachmentKind,
  estimateBase64Bytes,
  formatBytesFr,
} from '../../shared/attachmentLimits';

type AssistantMode = 'voice' | 'text';
type VoicePhase = 'idle' | 'listening' | 'thinking' | 'speaking';

const ACCEPTED_FILE_TYPES =
  'image/png,image/jpeg,image/webp,image/gif,.txt,.md,.markdown,.csv,.json,.log,.xml,.yaml,.yml,.html,.htm,.css,.js,.jsx,.ts,.tsx,.py,.sql,text/*';

const WAVEFORM_BARS_LEFT = [4, 8, 15, 24, 16, 30, 18, 10, 5];
const WAVEFORM_BARS_RIGHT = [5, 10, 18, 30, 16, 24, 15, 8, 4];

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Lecture impossible'));
      }
    };
    reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
    reader.readAsDataURL(file);
  });

const parseMessageAttachments = (
  attachmentsMeta?: AttachmentMeta[],
  rawAttachment?: string
): AttachmentMeta[] => {
  if (attachmentsMeta && attachmentsMeta.length > 0) {
    return attachmentsMeta;
  }
  if (!rawAttachment) return [];
  try {
    const parsed = JSON.parse(rawAttachment);
    if (Array.isArray(parsed)) {
      return parsed.filter((item) => item && typeof item.name === 'string');
    }
  } catch {
    return [
      {
        id: 'legacy-att',
        name: rawAttachment,
        mimeType: 'application/octet-stream',
        kind: 'text',
        rawSize: 0,
        encodedSize: 0,
      },
    ];
  }
  return [];
};

const cleanTextForSpeech = (rawText: string): string => {
  return rawText
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[•\-*]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const pickBestFrenchVoice = (): SpeechSynthesisVoice | null => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  const frenchVoices = voices.filter((v) => v.lang.toLowerCase().startsWith('fr'));
  if (frenchVoices.length === 0) return null;

  const preferred = frenchVoices.find((v) =>
    /natural|google|thomas|am[eé]lie|hortense|denise|henri|paul|julie/i.test(v.name)
  );
  return preferred || frenchVoices[0];
};

export const AssistantScreen: React.FC = () => {
  const {
    chatMessages,
    sendChatMessage,
    startNewTextConversation,
    deleteActiveTextConversation,
    requestedAssistantMode,
    clearRequestedAssistantMode,
    isGeneratingAI,
    chatError,
    clearChatError,
  } = useApp();

  // Page 1 ('voice') par défaut à l'ouverture, Page 2 ('text') sur demande explicite
  const [activeMode, setActiveMode] = useState<AssistantMode>(
    () => requestedAssistantMode || 'voice'
  );

  // État du Mode Vocal (Page 1)
  const [isVoiceSessionActive, setIsVoiceSessionActive] = useState(false);
  const [voicePhase, setVoicePhase] = useState<VoicePhase>('idle');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [spokenReply, setSpokenReply] = useState('');
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // État du Mode Texte (Page 2) & pièces jointes
  const [inputText, setInputText] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<PendingAssistantAttachment[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Refs synchrones pour piloter la boucle vocale sans closures obsolètes
  const voiceSessionRef = useRef(false);
  const voiceConversationSessionIdRef = useRef<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef('');
  const pendingAttachmentsRef = useRef<PendingAssistantAttachment[]>([]);
  const restartTimerRef = useRef<number | null>(null);
  const ttsKeepAliveRef = useRef<number | null>(null);
  const networkErrorCountRef = useRef(0);

  useEffect(() => {
    pendingAttachmentsRef.current = pendingAttachments;
  }, [pendingAttachments]);

  const clearVoiceTimers = useCallback(() => {
    if (restartTimerRef.current !== null) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (ttsKeepAliveRef.current !== null) {
      window.clearInterval(ttsKeepAliveRef.current);
      ttsKeepAliveRef.current = null;
    }
  }, []);

  const stopVoiceSession = useCallback(() => {
    voiceSessionRef.current = false;
    voiceConversationSessionIdRef.current = null;
    finalTranscriptRef.current = '';
    networkErrorCountRef.current = 0;
    clearVoiceTimers();

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch {
        // Ignorer si déjà arrêté
      }
      recognitionRef.current = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignorer erreur éventuelle de synthèse vocale
      }
    }

    setIsVoiceSessionActive(false);
    setVoicePhase('idle');
    setLiveTranscript('');
  }, [clearVoiceTimers]);

  // Nettoyage complet à la fermeture du composant
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
    }
    return () => {
      stopVoiceSession();
    };
  }, [stopVoiceSession]);

  useEffect(() => {
    if (!requestedAssistantMode) return;
    if (requestedAssistantMode === 'text' && voiceSessionRef.current) {
      stopVoiceSession();
    }
    setActiveMode(requestedAssistantMode);
    clearRequestedAssistantMode();
  }, [requestedAssistantMode, clearRequestedAssistantMode, stopVoiceSession]);

  useEffect(() => {
    if (activeMode === 'text') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [chatMessages, isGeneratingAI, activeMode]);

  const startListeningRef = useRef<() => void>(() => {});

  const speakResponse = useCallback(
    (rawReply: string) => {
      if (!voiceSessionRef.current) return;

      const spokenText = cleanTextForSpeech(rawReply);
      if (!spokenText) {
        if (voiceSessionRef.current) {
          restartTimerRef.current = window.setTimeout(() => startListeningRef.current(), 250);
        }
        return;
      }

      setSpokenReply(spokenText);
      setVoicePhase('speaking');

      if (typeof window === 'undefined' || typeof window.speechSynthesis === 'undefined') {
        // Navigateur sans SpeechSynthesis : pause de lecture puis reprise de l'écoute
        restartTimerRef.current = window.setTimeout(() => {
          if (voiceSessionRef.current) {
            startListeningRef.current();
          }
        }, 2000);
        return;
      }

      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(spokenText);
        utterance.lang = 'fr-FR';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        const frenchVoice = pickBestFrenchVoice();
        if (frenchVoice) {
          utterance.voice = frenchVoice;
        }

        let finished = false;
        const handleSpeechComplete = () => {
          if (finished) return;
          finished = true;
          clearVoiceTimers();
          if (voiceSessionRef.current) {
            restartTimerRef.current = window.setTimeout(() => {
              if (voiceSessionRef.current) {
                startListeningRef.current();
              }
            }, 300);
          } else {
            setVoicePhase('idle');
          }
        };

        utterance.onend = handleSpeechComplete;
        utterance.onerror = () => {
          handleSpeechComplete();
        };

        // Garde-fou pour éviter les coupures silencieuses sous Chromium sur les longues phrases
        ttsKeepAliveRef.current = window.setInterval(() => {
          if (!voiceSessionRef.current) {
            clearVoiceTimers();
            return;
          }
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
        }, 5000);

        window.speechSynthesis.speak(utterance);
      } catch {
        clearVoiceTimers();
        if (voiceSessionRef.current) {
          restartTimerRef.current = window.setTimeout(() => startListeningRef.current(), 400);
        } else {
          setVoicePhase('idle');
        }
      }
    },
    [clearVoiceTimers]
  );

  const handleVoiceTurn = useCallback(
    async (userSpeech: string) => {
      if (!voiceSessionRef.current) return;

      setVoicePhase('thinking');
      setLiveTranscript(userSpeech);

      const attachmentsToSend =
        pendingAttachmentsRef.current.length > 0 ? [...pendingAttachmentsRef.current] : undefined;

      let assistantReply = '';
      const sent = await sendChatMessage(userSpeech, attachmentsToSend, {
        voiceMode: true,
        voiceSessionId: voiceConversationSessionIdRef.current || undefined,
        onReply: (replyText) => {
          assistantReply = replyText;
        },
      });

      if (sent && attachmentsToSend) {
        setPendingAttachments([]);
      }

      if (!voiceSessionRef.current) return;

      if (assistantReply) {
        speakResponse(assistantReply);
      } else {
        speakResponse("Je n'ai pas pu obtenir de réponse pour le moment. Pouvez-vous répéter ?");
      }
    },
    [sendChatMessage, speakResponse]
  );

  const startListeningCycle = useCallback(() => {
    if (!voiceSessionRef.current) return;
    clearVoiceTimers();

    const SpeechRecognition =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (!SpeechRecognition) {
      setVoiceError(
        "La reconnaissance vocale n'est pas prise en charge par ce navigateur. Utilisez Chrome ou Edge, ou passez en Mode texte."
      );
      stopVoiceSession();
      return;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignorer
      }
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch {
        // Ignorer
      }
      recognitionRef.current = null;
    }

    finalTranscriptRef.current = '';
    setLiveTranscript('');
    setVoicePhase('listening');

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'fr-FR';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognitionRef.current = recognition;

      let fatalErrorOccurred = false;

      recognition.onresult = (event: any) => {
        if (!voiceSessionRef.current) return;
        let interim = '';
        let finalText = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const chunk = event.results[i][0]?.transcript || '';
          if (event.results[i].isFinal) {
            finalText += chunk;
          } else {
            interim += chunk;
          }
        }

        if (finalText.trim()) {
          finalTranscriptRef.current = `${finalTranscriptRef.current} ${finalText}`.trim();
          setLiveTranscript(finalTranscriptRef.current);
          networkErrorCountRef.current = 0;
        } else if (interim.trim()) {
          setLiveTranscript(interim.trim());
        }
      };

      recognition.onerror = (event: any) => {
        const errCode = event?.error;
        if (!voiceSessionRef.current || errCode === 'aborted') return;

        if (
          errCode === 'not-allowed' ||
          errCode === 'service-not-allowed' ||
          errCode === 'audio-capture'
        ) {
          fatalErrorOccurred = true;
          setVoiceError(
            "Impossible d'accéder au microphone. Vérifiez les permissions de votre navigateur."
          );
          stopVoiceSession();
          return;
        }

        if (errCode === 'network') {
          networkErrorCountRef.current += 1;
          if (networkErrorCountRef.current >= 3) {
            fatalErrorOccurred = true;
            setVoiceError(
              'Le service de reconnaissance vocale du navigateur est temporairement inaccessible.'
            );
            stopVoiceSession();
          }
        }
      };

      recognition.onend = () => {
        if (recognitionRef.current === recognition) {
          recognitionRef.current = null;
        }
        if (fatalErrorOccurred || !voiceSessionRef.current) {
          return;
        }

        const spoken = finalTranscriptRef.current.trim();
        if (spoken) {
          finalTranscriptRef.current = '';
          void handleVoiceTurn(spoken);
        } else {
          // Aucune parole détectée : réactiver l'écoute en continu
          restartTimerRef.current = window.setTimeout(() => {
            if (voiceSessionRef.current) {
              startListeningRef.current();
            }
          }, 350);
        }
      };

      recognition.start();
    } catch {
      setVoiceError("Impossible de démarrer l'écoute vocale.");
      stopVoiceSession();
    }
  }, [clearVoiceTimers, handleVoiceTurn, stopVoiceSession]);

  useEffect(() => {
    startListeningRef.current = startListeningCycle;
  }, [startListeningCycle]);

  const handleVoiceMicToggle = () => {
    if (isVoiceSessionActive) {
      stopVoiceSession();
      return;
    }

    setVoiceError(null);
    setAttachmentError(null);
    clearChatError();
    setSpokenReply('');
    setLiveTranscript('');

    const SpeechRecognition =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (!SpeechRecognition) {
      setVoiceError(
        "La reconnaissance vocale n'est pas prise en charge par ce navigateur. Utilisez Chrome ou Edge, ou passez en Mode texte."
      );
      return;
    }

    voiceSessionRef.current = true;
    voiceConversationSessionIdRef.current = `jarvis-voice-${Date.now()}`;
    setIsVoiceSessionActive(true);
    startListeningCycle();
  };

  const switchToTextMode = () => {
    if (isVoiceSessionActive) {
      stopVoiceSession();
    }
    setVoiceError(null);
    setActiveMode('text');
    setTimeout(() => chatInputRef.current?.focus(), 80);
  };

  const switchToVoiceMode = () => {
    setVoiceError(null);
    setActiveMode('voice');
  };

  // Envoi écrit (Mode Texte uniquement)
  const handleSendText = async (textToSend?: string) => {
    const text = textToSend !== undefined ? textToSend : inputText;
    const attachmentsToSend = textToSend !== undefined ? [] : pendingAttachments;
    if ((!text.trim() && attachmentsToSend.length === 0) || isGeneratingAI) return;

    setAttachmentError(null);
    clearChatError();

    const sent = await sendChatMessage(
      text,
      attachmentsToSend.length > 0 ? attachmentsToSend : undefined
    );
    if (sent && textToSend === undefined) {
      setInputText('');
      setPendingAttachments([]);
    }
  };

  const handleOpenFilePicker = () => {
    if (isGeneratingAI) return;
    fileInputRef.current?.click();
  };

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;

    setAttachmentError(null);
    clearChatError();

    let currentCount = pendingAttachments.length;
    let currentRawTotal = pendingAttachments.reduce((acc, item) => acc + item.rawSize, 0);
    let currentEncodedTotal = pendingAttachments.reduce((acc, item) => acc + item.encodedSize, 0);

    const added: PendingAssistantAttachment[] = [];
    const errors: string[] = [];

    for (const file of files) {
      if (currentCount >= MAX_ATTACHMENT_COUNT) {
        errors.push(
          `Limite atteinte (${MAX_ATTACHMENT_COUNT} fichiers max par message) : "${file.name}" n'a pas été ajouté.`
        );
        continue;
      }

      const detected = detectAttachmentKind(file.name, file.type);
      if (!detected) {
        errors.push(
          `Format non pris en charge pour "${file.name}". Utilisez une image (PNG, JPG, WEBP, GIF) ou un fichier texte.`
        );
        continue;
      }

      const estimatedEncoded =
        detected.kind === 'image' ? estimateBase64Bytes(file.size) : file.size;

      if (file.size > MAX_FILE_BYTES || estimatedEncoded > MAX_FILE_BASE64_BYTES) {
        errors.push(
          `"${file.name}" (${formatBytesFr(file.size)} brut, ~${formatBytesFr(estimatedEncoded)} en Base64) dépasse la limite de ${formatBytesFr(MAX_FILE_BYTES)} par fichier (~${formatBytesFr(MAX_FILE_BASE64_BYTES)} en Base64).`
        );
        continue;
      }

      if (
        currentRawTotal + file.size > MAX_TOTAL_RAW_BYTES ||
        currentEncodedTotal + estimatedEncoded > MAX_TOTAL_ENCODED_BYTES
      ) {
        errors.push(
          `Impossible d'ajouter "${file.name}" : la taille totale dépasserait la limite du serveur (${formatBytesFr(MAX_TOTAL_RAW_BYTES)} brut / ~${formatBytesFr(MAX_TOTAL_ENCODED_BYTES)} encodé en Base64).`
        );
        continue;
      }

      try {
        if (detected.kind === 'image') {
          const dataUrl = await readFileAsDataUrl(file);
          const commaIndex = dataUrl.indexOf(',');
          const base64Data = commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;
          const actualEncodedBytes = new TextEncoder().encode(base64Data).length;

          if (actualEncodedBytes > MAX_FILE_BASE64_BYTES) {
            errors.push(
              `"${file.name}" (${formatBytesFr(actualEncodedBytes)} en Base64) dépasse la limite par fichier.`
            );
            continue;
          }

          if (
            currentRawTotal + file.size > MAX_TOTAL_RAW_BYTES ||
            currentEncodedTotal + actualEncodedBytes > MAX_TOTAL_ENCODED_BYTES
          ) {
            errors.push(
              `Impossible d'ajouter "${file.name}" : le total Base64 dépasserait ${formatBytesFr(MAX_TOTAL_ENCODED_BYTES)}.`
            );
            continue;
          }

          currentCount += 1;
          currentRawTotal += file.size;
          currentEncodedTotal += actualEncodedBytes;

          added.push({
            id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name: file.name,
            mimeType: detected.normalizedMime,
            kind: 'image',
            rawSize: file.size,
            encodedSize: actualEncodedBytes,
            base64Data,
            previewUrl: dataUrl,
          });
        } else {
          const textContent = await file.text();
          const rawTextBytes = new TextEncoder().encode(textContent).length;
          const encodedTextBytes = new TextEncoder().encode(JSON.stringify(textContent)).length;

          if (rawTextBytes > MAX_FILE_BYTES || encodedTextBytes > MAX_FILE_BASE64_BYTES) {
            errors.push(
              `"${file.name}" (${formatBytesFr(rawTextBytes)}) dépasse la limite par fichier de ${formatBytesFr(MAX_FILE_BYTES)}.`
            );
            continue;
          }

          if (
            currentRawTotal + rawTextBytes > MAX_TOTAL_RAW_BYTES ||
            currentEncodedTotal + encodedTextBytes > MAX_TOTAL_ENCODED_BYTES
          ) {
            errors.push(
              `Impossible d'ajouter "${file.name}" : le total dépasserait la limite de ${formatBytesFr(MAX_TOTAL_RAW_BYTES)} brut / ~${formatBytesFr(MAX_TOTAL_ENCODED_BYTES)} encodé.`
            );
            continue;
          }

          currentCount += 1;
          currentRawTotal += rawTextBytes;
          currentEncodedTotal += encodedTextBytes;

          added.push({
            id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name: file.name,
            mimeType: detected.normalizedMime,
            kind: 'text',
            rawSize: rawTextBytes,
            encodedSize: encodedTextBytes,
            textContent,
          });
        }
      } catch {
        errors.push(`Impossible de lire le fichier "${file.name}".`);
      }
    }

    if (added.length > 0) {
      setPendingAttachments((prev) => [...prev, ...added]);
    }
    if (errors.length > 0) {
      setAttachmentError(errors[0]);
    }
  };

  const removePendingAttachment = (id: string) => {
    setPendingAttachments((prev) => prev.filter((item) => item.id !== id));
    setAttachmentError(null);
    clearChatError();
  };

  const suggestions = [
    { text: 'Générer des idées', icon: Lightbulb },
    { text: 'Organiser mes tâches', icon: CheckCircle2 },
    { text: 'Assistance projets', icon: Folder },
    { text: 'Créer un projet', icon: ListOrdered },
    { text: 'Résumé activités', icon: BarChart3 },
    { text: 'Conseils productivité', icon: Sparkles },
  ];

  const getVoiceStatusLabel = (): string => {
    switch (voicePhase) {
      case 'listening':
        return 'JARVIS vous écoute... parlez naturellement';
      case 'thinking':
        return 'JARVIS réfléchit à votre demande...';
      case 'speaking':
        return 'JARVIS vous répond...';
      default:
        return 'Appuyez sur le microphone pour démarrer la conversation vocale';
    }
  };

  const isWaveAnimating =
    voicePhase === 'listening' || voicePhase === 'speaking' || voicePhase === 'thinking';

  return (
    <div className="relative flex-1 w-full h-full min-h-0 flex flex-col overflow-hidden">
      {/* Input fichier partagé */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED_FILE_TYPES}
        onChange={handleFilesSelected}
        className="hidden"
      />

      {/* Tracés de circuit en pleine page sans cadre englobant */}
      <svg
        aria-hidden="true"
        viewBox="0 0 800 900"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full pointer-events-none opacity-25"
      >
        <path
          d="M 0 120 H 110 L 155 165 H 240 M 800 120 H 690 L 645 165 H 560 M 0 340 H 75 L 125 390 V 500 M 800 340 H 725 L 675 390 V 500 M 0 610 H 130 L 175 655 H 265 M 800 610 H 670 L 625 655 H 535 M 110 0 V 85 L 155 130 M 690 0 V 85 L 645 130"
          fill="none"
          stroke="#00e676"
          strokeOpacity="0.45"
          strokeWidth="1.2"
        />
        <circle cx="240" cy="165" r="3" fill="#00e676" fillOpacity="0.65" />
        <circle cx="560" cy="165" r="3" fill="#00e676" fillOpacity="0.65" />
        <circle cx="125" cy="500" r="3" fill="#2dd4bf" fillOpacity="0.65" />
        <circle cx="675" cy="500" r="3" fill="#2dd4bf" fillOpacity="0.65" />
      </svg>

      {activeMode === 'voice' ? (
        /* =========================================================
           PAGE 1 : MODE VOCAL UNIQUEMENT (CONVERSATION VOCALE CONTINUE)
           ========================================================= */
        <div className="relative z-10 flex-1 w-full flex flex-col justify-between px-4 sm:px-8 pt-2 pb-24 md:pb-8 animate-in fade-in duration-200">
          {/* Barre supérieure du Mode Vocal : bouton Arrêter (si actif) + bascule vers Mode Texte */}
          <div className="w-full flex items-center justify-between gap-3">
            <div className="text-xs font-semibold text-emerald-300/85 flex items-center gap-2">
              {voicePhase === 'speaking' && <Volume2 className="w-4 h-4 text-[#00ff88]" />}
              <span>
                {isVoiceSessionActive ? 'Conversation vocale active' : 'Mode vocal JARVIS'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {isVoiceSessionActive && (
                <button
                  type="button"
                  onClick={stopVoiceSession}
                  className="min-h-[44px] px-3.5 py-2 rounded-2xl bg-rose-500/20 border border-rose-400/60 hover:bg-rose-500/30 text-rose-200 hover:text-white transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer whitespace-nowrap shrink-0"
                  aria-label="Arrêter la conversation vocale"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Arrêter</span>
                </button>
              )}

              <button
                type="button"
                onClick={switchToTextMode}
                className="min-h-[44px] px-3.5 py-2 rounded-2xl bg-emerald-950/65 border border-[#00e676]/40 hover:border-[#00ff88] text-emerald-100 hover:text-white shadow-[0_0_18px_rgba(0,230,118,0.2)] transition-all flex items-center gap-2 text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
                aria-label="Passer au mode texte"
                title="Passer à la conversation écrite (Mode texte)"
              >
                <MessageSquareText className="w-4 h-4 text-[#00e676]" />
                <span>Mode texte</span>
              </button>
            </div>
          </div>

          {/* Cœur central J.A.R.V.I.S. + Animations réactives (écoute / réflexion / parole) */}
          <div className="flex-1 flex flex-col items-center justify-center py-2">
            {/* Halo ambiant réactif selon la phase */}
            <div
              aria-hidden="true"
              className={`absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 sm:w-96 sm:h-96 rounded-full blur-3xl pointer-events-none transition-opacity duration-300 ${
                voicePhase === 'speaking'
                  ? 'bg-[#00ff88]/25 opacity-100'
                  : voicePhase === 'listening'
                    ? 'bg-emerald-400/25 opacity-100'
                    : voicePhase === 'thinking'
                      ? 'bg-cyan-400/20 opacity-100'
                      : 'bg-emerald-400/15 opacity-75'
              }`}
            />

            {/* Anneaux holographiques J.A.R.V.I.S. */}
            <div
              className={`relative w-56 h-56 sm:w-64 sm:h-64 lg:w-72 lg:h-72 flex items-center justify-center transition-transform duration-300 ${
                voicePhase === 'speaking' || voicePhase === 'listening'
                  ? 'animate-core-pulse'
                  : voicePhase === 'thinking'
                    ? 'scale-[1.03]'
                    : ''
              }`}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 260 260"
                className={`absolute inset-0 w-full h-full drop-shadow-[0_0_14px_rgba(0,230,118,0.5)] ${
                  voicePhase === 'thinking' ? 'animate-hud-fast' : 'animate-hud-slow'
                }`}
              >
                <circle
                  cx="130"
                  cy="130"
                  r="120"
                  fill="none"
                  stroke={voicePhase === 'speaking' ? '#00ff88' : '#00e676'}
                  strokeWidth={voicePhase === 'idle' ? '2.5' : '3.2'}
                  strokeDasharray="90 14 36 12 68 18"
                  strokeLinecap="round"
                />
                <circle
                  cx="130"
                  cy="130"
                  r="109"
                  fill="none"
                  stroke="#34d399"
                  strokeOpacity="0.6"
                  strokeWidth="1.2"
                  strokeDasharray="3 8"
                />
                {Array.from({ length: 36 }).map((_, idx) => {
                  const angle = (idx * 10 * Math.PI) / 180;
                  const x1 = 130 + Math.cos(angle) * 98;
                  const y1 = 130 + Math.sin(angle) * 98;
                  const x2 = 130 + Math.cos(angle) * (idx % 3 === 0 ? 105 : 102);
                  const y2 = 130 + Math.sin(angle) * (idx % 3 === 0 ? 105 : 102);
                  return (
                    <line
                      key={idx}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="#2dd4bf"
                      strokeOpacity={idx % 3 === 0 ? '0.9' : '0.42'}
                      strokeWidth={idx % 3 === 0 ? '2' : '1'}
                    />
                  );
                })}
              </svg>

              <svg
                aria-hidden="true"
                viewBox="0 0 260 260"
                className="absolute inset-0 w-full h-full animate-hud-reverse"
              >
                <circle
                  cx="130"
                  cy="130"
                  r="88"
                  fill="none"
                  stroke={voicePhase === 'thinking' ? '#38bdf8' : '#2dd4bf'}
                  strokeOpacity={voicePhase === 'idle' ? '0.7' : '0.95'}
                  strokeWidth="6"
                  strokeDasharray="120 35 75 40"
                />
                <path
                  d="M 60 154 A 74 74 0 0 1 135 56"
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth={voicePhase === 'thinking' ? '4' : '3'}
                  strokeLinecap="round"
                  opacity="0.92"
                />
                <circle cx="95" cy="64" r="2.5" fill="#fbbf24" />
                <circle cx="115" cy="58" r="2.5" fill="#fbbf24" />
                <circle cx="136" cy="56" r="2.5" fill="#fbbf24" />
              </svg>

              <div
                className={`relative w-36 h-36 sm:w-40 sm:h-40 rounded-full bg-[#011b13]/90 border-2 flex items-center justify-center transition-all duration-300 ${
                  voicePhase === 'speaking'
                    ? 'border-[#00ff88] shadow-[0_0_38px_rgba(0,255,136,0.75),inset_0_0_26px_rgba(0,230,118,0.35)]'
                    : voicePhase === 'thinking'
                      ? 'border-cyan-300 shadow-[0_0_34px_rgba(56,189,248,0.65),inset_0_0_24px_rgba(56,189,248,0.28)]'
                      : voicePhase === 'listening'
                        ? 'border-[#00ff88] shadow-[0_0_34px_rgba(0,230,118,0.75),inset_0_0_24px_rgba(0,230,118,0.3)]'
                        : 'border-[#00e676] shadow-[0_0_26px_rgba(0,230,118,0.55),inset_0_0_22px_rgba(0,230,118,0.22)]'
                }`}
              >
                <div className="w-[86%] h-[86%] rounded-full border border-emerald-300/35 flex flex-col items-center justify-center bg-[radial-gradient(circle_at_center,rgba(0,230,118,0.18)_0%,rgba(1,27,19,0.95)_75%)]">
                  <span className="font-mono font-extrabold text-base sm:text-lg tracking-[0.26em] text-white drop-shadow-[0_0_10px_rgba(0,230,118,0.85)] select-none pl-[0.26em]">
                    J.A.R.V.I.S.
                  </span>
                  {voicePhase !== 'idle' && (
                    <span className="text-[11px] font-semibold text-emerald-200/90 mt-1">
                      {voicePhase === 'listening'
                        ? 'Écoute'
                        : voicePhase === 'thinking'
                          ? 'Réflexion'
                          : 'Réponse'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Bouton Microphone central + Barres d'onde vocale */}
            <div className="relative z-20 -mt-9 flex items-center justify-center gap-3 sm:gap-4">
              <div className="flex items-center gap-1" aria-hidden="true">
                {WAVEFORM_BARS_LEFT.map((height, idx) => (
                  <span
                    key={`wl-${idx}`}
                    style={{
                      height: `${height}px`,
                      animationDelay: `${idx * 70}ms`,
                    }}
                    className={`w-1 rounded-full bg-gradient-to-t from-emerald-500 to-teal-300 shadow-[0_0_8px_rgba(0,230,118,0.65)] transition-transform duration-200 ${
                      isWaveAnimating ? 'animate-voice-wave' : 'opacity-85'
                    }`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={handleVoiceMicToggle}
                aria-label={
                  isVoiceSessionActive
                    ? 'Arrêter la conversation vocale'
                    : 'Démarrer une conversation vocale avec JARVIS'
                }
                title={
                  isVoiceSessionActive
                    ? 'Arrêter la conversation vocale'
                    : 'Parler à JARVIS (conversation vocale continue)'
                }
                className={`w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full flex items-center justify-center border-2 transition-all cursor-pointer shrink-0 ${
                  isVoiceSessionActive
                    ? voicePhase === 'thinking'
                      ? 'bg-cyan-950 border-cyan-300 text-cyan-200 shadow-[0_0_32px_rgba(56,189,248,0.75)]'
                      : 'bg-gradient-to-b from-[#00e676] to-teal-400 border-white text-slate-950 shadow-[0_0_36px_rgba(0,230,118,0.9)] scale-105'
                    : 'bg-gradient-to-b from-[#064e36] to-[#022a1d] border-emerald-200 text-[#00ff88] shadow-[0_0_28px_rgba(0,230,118,0.65),inset_0_0_12px_rgba(0,230,118,0.35)] hover:scale-105 hover:shadow-[0_0_36px_rgba(0,230,118,0.85)]'
                }`}
              >
                {voicePhase === 'thinking' ? (
                  <Loader2 className="w-7 h-7 sm:w-8 sm:h-8 animate-spin" />
                ) : isVoiceSessionActive ? (
                  <MicOff className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.2]" />
                ) : (
                  <Mic className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.2]" />
                )}
              </button>

              <div className="flex items-center gap-1" aria-hidden="true">
                {WAVEFORM_BARS_RIGHT.map((height, idx) => (
                  <span
                    key={`wr-${idx}`}
                    style={{
                      height: `${height}px`,
                      animationDelay: `${idx * 70}ms`,
                    }}
                    className={`w-1 rounded-full bg-gradient-to-t from-emerald-500 to-teal-300 shadow-[0_0_8px_rgba(0,230,118,0.65)] transition-transform duration-200 ${
                      isWaveAnimating ? 'animate-voice-wave' : 'opacity-85'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Accueil / État de la conversation vocale en direct */}
            <div className="text-center mt-4 sm:mt-5 space-y-2 px-2 max-w-md mx-auto">
              {!isVoiceSessionActive ? (
                <>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center justify-center gap-2">
                    <span>Bonjour !</span>
                    <span aria-hidden="true">👋</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed text-balance">
                    Je suis <strong className="text-white font-bold">JARVIS</strong>, votre assistant intelligent.
                    <br />
                    Comment puis-je vous aider aujourd&apos;hui ?
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-base sm:text-lg font-bold text-[#00ff88] tracking-tight">
                    {getVoiceStatusLabel()}
                  </h2>

                  {liveTranscript && (
                    <p className="text-xs sm:text-sm text-white/95 bg-emerald-950/65 border border-emerald-500/30 rounded-2xl px-4 py-2.5">
                      <span className="text-emerald-300/80 font-semibold">Vous : </span>
                      {liveTranscript}
                    </p>
                  )}

                  {voicePhase === 'speaking' && spokenReply && (
                    <p className="text-xs sm:text-sm text-emerald-100 bg-[#01291b]/80 border border-[#00e676]/35 rounded-2xl px-4 py-2.5 max-h-28 overflow-y-auto no-scrollbar">
                      <span className="text-[#00ff88] font-semibold">JARVIS : </span>
                      {spokenReply}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Pièces jointes en attente utilisables à la voix */}
            {pendingAttachments.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 max-w-md">
                {pendingAttachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-950/80 border border-[#00e676]/40 text-xs text-emerald-100"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#00e676] shrink-0" />
                    <span className="truncate max-w-[140px]">{att.name}</span>
                    <button
                      type="button"
                      onClick={() => removePendingAttachment(att.id)}
                      className="text-emerald-300/80 hover:text-rose-300 p-0.5 cursor-pointer"
                      aria-label={`Retirer ${att.name}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Erreurs vocales, pièces jointes ou dates projet */}
            {(voiceError || attachmentError || chatError) && (
              <div
                role="alert"
                className="mt-4 w-full max-w-lg flex items-start justify-between gap-2 px-3.5 py-2.5 rounded-2xl bg-rose-500/15 border border-rose-400/55 text-rose-200 text-xs"
              >
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{voiceError || attachmentError || chatError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setVoiceError(null);
                    setAttachmentError(null);
                    clearChatError();
                  }}
                  className="text-rose-300 hover:text-white shrink-0 p-1 cursor-pointer"
                  aria-label="Fermer l'erreur"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Zone d'actions en bas du Mode Vocal */}
          {isVoiceSessionActive ? (
            <div className="w-full max-w-md mx-auto pt-2">
              <button
                type="button"
                onClick={stopVoiceSession}
                className="w-full min-h-[52px] px-5 py-3 rounded-2xl bg-rose-500/20 border border-rose-400/60 hover:bg-rose-500/30 text-white font-bold text-sm shadow-[0_0_24px_rgba(244,63,94,0.28)] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Square className="w-4 h-4 fill-current text-rose-300" />
                <span>Arrêter la conversation vocale</span>
              </button>
            </div>
          ) : (
            <div className="w-full max-w-lg mx-auto grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={handleOpenFilePicker}
                disabled={isGeneratingAI}
                className="group min-h-[108px] sm:min-h-[116px] p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-emerald-900/55 via-emerald-950/75 to-[#011b13]/90 border border-[#00e676]/45 hover:border-[#00ff88] shadow-[0_8px_24px_rgba(0,15,10,0.55),inset_0_1px_1px_rgba(255,255,255,0.12)] hover:shadow-[0_0_24px_rgba(0,230,118,0.3)] transition-all flex flex-col items-center justify-center text-center relative cursor-pointer disabled:opacity-50"
              >
                <FileUp className="w-7 h-7 text-[#00e676] mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs sm:text-sm font-bold text-white leading-tight pr-3">
                  Joindre un fichier
                </span>
                <span className="text-[11px] text-emerald-200/75 mt-1 pr-3">
                  (Images, TXT, etc.)
                </span>
                <ChevronRight className="w-4 h-4 text-emerald-300/80 absolute right-2.5 top-1/2 -translate-y-1/2 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                type="button"
                onClick={switchToTextMode}
                className="group min-h-[108px] sm:min-h-[116px] p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-emerald-900/55 via-emerald-950/75 to-[#011b13]/90 border border-[#00e676]/45 hover:border-[#00ff88] shadow-[0_8px_24px_rgba(0,15,10,0.55),inset_0_1px_1px_rgba(255,255,255,0.12)] hover:shadow-[0_0_24px_rgba(0,230,118,0.3)] transition-all flex flex-col items-center justify-center text-center relative cursor-pointer"
              >
                <MessageSquareText className="w-7 h-7 text-[#00e676] mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs sm:text-sm font-bold text-white leading-tight pr-3">
                  Mode texte
                </span>
                <span className="text-[11px] text-emerald-200/75 mt-1 pr-3">
                  Conversation écrite
                </span>
                <ChevronRight className="w-4 h-4 text-emerald-300/80 absolute right-2.5 top-1/2 -translate-y-1/2 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          )}
        </div>
      ) : (
        /* =========================================================
           PAGE 2 : MODE TEXTE UNIQUEMENT (ÉCRIRE ET LIRE)
           ========================================================= */
        <div className="relative z-10 flex-1 w-full flex flex-col justify-between min-h-0 px-3 sm:px-6 lg:px-10 pt-2 pb-24 md:pb-5 animate-in fade-in duration-200 max-w-5xl mx-auto">
          {/* En-tête du Mode Texte avec bascule directe vers Mode Vocal */}
          <div className="flex items-center justify-between gap-3 py-2.5 border-b border-emerald-500/20 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={switchToVoiceMode}
                className="min-w-[44px] min-h-[44px] px-3.5 py-2 rounded-2xl bg-emerald-950/70 border border-[#00e676]/45 hover:border-[#00ff88] text-emerald-100 hover:text-white transition-all flex items-center gap-1.5 text-xs font-bold shrink-0 cursor-pointer whitespace-nowrap"
                aria-label="Passer au mode vocal"
                title="Revenir au Mode vocal JARVIS"
              >
                <Mic className="w-4 h-4 text-[#00e676]" />
                <span>Mode vocal</span>
              </button>

              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-bold text-white truncate">
                  Conversation écrite
                </h2>
                <p className="text-xs text-emerald-300/75 truncate tabular-nums">
                  {chatMessages.length} message{chatMessages.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  startNewTextConversation();
                  setInputText('');
                  setPendingAttachments([]);
                  setAttachmentError(null);
                }}
                className="min-h-[44px] px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#00e676] to-teal-400 text-slate-950 font-bold text-xs shadow-[0_0_15px_rgba(0,230,118,0.35)] hover:shadow-[0_0_22px_rgba(0,230,118,0.55)] transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                title="Nouvelle conversation"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span className="hidden sm:inline">Nouvelle conversation</span>
                <span className="sm:hidden">Nouveau</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  deleteActiveTextConversation();
                  setPendingAttachments([]);
                  setAttachmentError(null);
                }}
                className="min-w-[44px] min-h-[44px] p-2.5 rounded-xl bg-emerald-950/70 border border-emerald-500/25 hover:border-rose-500/50 hover:bg-rose-500/15 text-emerald-300/80 hover:text-rose-300 transition-all flex items-center justify-center shrink-0 cursor-pointer"
                title="Supprimer cette conversation"
                aria-label="Supprimer cette conversation"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Raccourcis de questions */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2.5 border-b border-emerald-500/15 shrink-0">
            {suggestions.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendText(item.text)}
                  disabled={isGeneratingAI}
                  className="min-h-[38px] px-3 py-1.5 rounded-xl bg-emerald-950/75 border border-emerald-500/25 hover:border-[#00e676]/60 hover:bg-emerald-900/50 text-xs font-medium text-emerald-100 flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Icon className="w-3.5 h-3.5 text-[#00e676] shrink-0" />
                  <span>{item.text}</span>
                </button>
              );
            })}
          </div>

          {/* Flux des messages */}
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pr-1 py-4 min-h-0">
            {chatMessages.map((msg) => {
              const isAssistant = msg.role === 'assistant';
              const msgAttachments = parseMessageAttachments(msg.attachmentsMeta, msg.attachment);
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${isAssistant ? '' : 'flex-row-reverse'}`}
                >
                  {isAssistant ? (
                    <div className="w-8 h-8 rounded-full bg-[#022d1f] border border-[#00e676]/70 flex items-center justify-center text-[#00ff88] shrink-0 shadow-[0_0_10px_rgba(0,230,118,0.4)]">
                      <Bot className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#00e676] text-slate-950 font-bold flex items-center justify-center shrink-0">
                      U
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed ${
                      isAssistant
                        ? 'bg-emerald-950/75 border border-[#00e676]/30 text-emerald-50 rounded-tl-sm'
                        : 'bg-[#00e676] text-slate-950 font-medium rounded-tr-sm shadow-[0_0_15px_rgba(0,230,118,0.28)]'
                    }`}
                  >
                    {msgAttachments.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {msgAttachments.map((att, idx) => (
                          <div
                            key={att.id || idx}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-xl text-[11px] font-semibold ${
                              isAssistant
                                ? 'bg-emerald-900/60 text-emerald-200 border border-emerald-500/30'
                                : 'bg-slate-950/15 text-slate-950 border border-slate-950/20'
                            }`}
                          >
                            {att.previewUrl ? (
                              <img
                                src={att.previewUrl}
                                alt={att.name}
                                referrerPolicy="no-referrer"
                                className="w-5 h-5 rounded object-cover"
                              />
                            ) : att.kind === 'image' ? (
                              <ImageIcon className="w-3.5 h-3.5 shrink-0" />
                            ) : (
                              <FileText className="w-3.5 h-3.5 shrink-0" />
                            )}
                            <span className="truncate max-w-[140px]">{att.name}</span>
                            {att.rawSize > 0 && (
                              <span className="opacity-75 tabular-nums">
                                ({formatBytesFr(att.rawSize)})
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                    <span
                      className={`block text-[10px] mt-1.5 tabular-nums ${
                        isAssistant ? 'text-emerald-300/65' : 'text-slate-900/75'
                      } text-right`}
                    >
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              );
            })}

            {isGeneratingAI && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#022d1f] border border-[#00e676]/70 flex items-center justify-center text-[#00ff88] shrink-0">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
                <div className="bg-emerald-950/80 border border-[#00e676]/30 rounded-2xl px-4 py-2.5 text-xs text-emerald-200 flex items-center gap-2">
                  <span>JARVIS analyse votre demande…</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Zone de saisie clavier en bas (Mode Texte uniquement) */}
          <div className="space-y-3 pt-3 border-t border-emerald-500/20 shrink-0">
            {(attachmentError || chatError) && (
              <div
                role="alert"
                className="flex items-start justify-between gap-2 px-3.5 py-2.5 rounded-2xl bg-rose-500/15 border border-rose-400/55 text-rose-200 text-xs"
              >
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{attachmentError || chatError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAttachmentError(null);
                    clearChatError();
                  }}
                  className="text-rose-300 hover:text-white shrink-0 p-1 cursor-pointer"
                  aria-label="Fermer l'erreur"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {pendingAttachments.length > 0 && (
              <div className="p-2.5 rounded-2xl bg-emerald-950/80 border border-[#00e676]/35 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-emerald-300/85 px-1 tabular-nums">
                  <span>
                    {pendingAttachments.length}/{MAX_ATTACHMENT_COUNT} pièce(s) jointe(s)
                  </span>
                  <span>
                    {formatBytesFr(pendingAttachments.reduce((s, a) => s + a.rawSize, 0))} /{' '}
                    {formatBytesFr(MAX_TOTAL_RAW_BYTES)} brut ·{' '}
                    {formatBytesFr(pendingAttachments.reduce((s, a) => s + a.encodedSize, 0))} /{' '}
                    {formatBytesFr(MAX_TOTAL_ENCODED_BYTES)} encodé
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {pendingAttachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-emerald-900/55 border border-emerald-500/30 text-xs text-emerald-100"
                    >
                      {att.previewUrl ? (
                        <img
                          src={att.previewUrl}
                          alt={att.name}
                          referrerPolicy="no-referrer"
                          className="w-6 h-6 rounded object-cover shrink-0"
                        />
                      ) : (
                        <FileText className="w-4 h-4 text-[#00e676] shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold truncate max-w-[140px]">{att.name}</p>
                        <p className="text-[10px] text-emerald-300/75 tabular-nums">
                          {formatBytesFr(att.rawSize)} ({formatBytesFr(att.encodedSize)} encodé)
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removePendingAttachment(att.id)}
                        className="text-emerald-300/70 hover:text-rose-300 p-1 cursor-pointer"
                        title="Retirer cette pièce jointe"
                        aria-label={`Retirer ${att.name}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenFilePicker}
                disabled={isGeneratingAI}
                className="min-w-[44px] min-h-[44px] p-2.5 rounded-2xl bg-emerald-950/75 border border-emerald-500/30 hover:border-[#00e676]/60 text-emerald-300 hover:text-white transition-colors shrink-0 flex items-center justify-center disabled:opacity-50 cursor-pointer"
                title={`Joindre des images ou fichiers texte (max ${formatBytesFr(MAX_FILE_BYTES)}/fichier, ${formatBytesFr(MAX_TOTAL_RAW_BYTES)} total)`}
                aria-label="Joindre un fichier"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              <input
                ref={chatInputRef}
                type="text"
                placeholder="Écrivez votre message à JARVIS..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
                disabled={isGeneratingAI}
                className="flex-1 min-h-[44px] px-4 py-2.5 rounded-2xl glass-input text-sm placeholder:text-emerald-300/45 focus:ring-1 focus:ring-[#00e676]"
              />

              <button
                type="button"
                onClick={() => handleSendText()}
                disabled={isGeneratingAI || (!inputText.trim() && pendingAttachments.length === 0)}
                className="min-w-[44px] min-h-[44px] p-3 rounded-2xl bg-gradient-to-tr from-[#00e676] to-teal-400 text-slate-950 font-bold shadow-[0_0_16px_rgba(0,230,118,0.45)] hover:shadow-[0_0_24px_rgba(0,230,118,0.75)] transition-all shrink-0 flex items-center justify-center disabled:opacity-45 cursor-pointer"
                title="Envoyer"
                aria-label="Envoyer le message"
              >
                <Send className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
