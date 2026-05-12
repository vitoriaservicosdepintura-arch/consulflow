import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import {
    MessageSquare,
    Zap,
    ShieldCheck,
    BrainCircuit,
    Cpu,
    RefreshCw,
    Smartphone,
    Scan,
    CheckCircle2,
    XCircle,
    MessageCircle,
    Sparkles,
    Search,
    ChevronRight,
    TrendingUp,
    Ghost,
    Smile,
    Paperclip,
    Mic,
    Send,
    Phone,
    Video,
    MoreVertical,
    CheckCheck,
    ArrowLeft,
    File
} from "lucide-react";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import WhatsAppConnect from "./WhatsAppConnect";
import EmojiPicker from 'emoji-picker-react';

const AudioPlayer = ({ src, isMe }: { src: string, isMe: boolean }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) audioRef.current.pause();
            else audioRef.current.play();
            setIsPlaying(!isPlaying);
        }
    };

    const changeSpeed = () => {
        const speeds = [1, 1.5, 2];
        const next = speeds[(speeds.indexOf(playbackRate) + 1) % speeds.length];
        setPlaybackRate(next);
        if (audioRef.current) audioRef.current.playbackRate = next;
    };

    const formatTime = (time: number) => {
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    return (
        <div className={`flex items-center gap-2 p-3 rounded-2xl min-w-[260px] ${isMe ? 'bg-emerald-700/40' : 'bg-slate-100'}`}>
            <audio
                ref={audioRef}
                src={src}
                onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
                onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
            />

            <button onClick={changeSpeed} className="w-8 h-8 flex items-center justify-center bg-black/10 hover:bg-black/20 rounded-full text-[10px] font-black shrink-0 transition-colors">
                {playbackRate}x
            </button>

            <button onClick={togglePlay} className="w-10 h-10 flex items-center justify-center bg-transparent shrink-0">
                {isPlaying ? (
                    <div className="flex gap-1">
                        <div className="w-1 h-4 bg-current rounded-full" />
                        <div className="w-1 h-4 bg-current rounded-full" />
                    </div>
                ) : (
                    <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[12px] border-l-current border-b-[8px] border-b-transparent ml-1" />
                )}
            </button>

            <div className="flex-1 flex flex-col gap-1">
                <div className="h-4 flex items-center gap-[2px]">
                    {[...Array(24)].map((_, i) => {
                        const progress = (currentTime / duration) * 24;
                        const isActive = i <= progress;
                        const height = 4 + Math.random() * 12;
                        return (
                            <div
                                key={i}
                                className={`w-[2px] rounded-full transition-all duration-300 ${isActive ? 'bg-current opacity-100' : 'bg-current opacity-30'}`}
                                style={{ height: `${height}px` }}
                            />
                        );
                    })}
                </div>
                <div className="flex justify-between text-[10px] font-bold opacity-60">
                    <span>{formatTime(currentTime)}</span>
                </div>
            </div>

            <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center shrink-0">
                <Mic className="w-4 h-4 text-emerald-500" />
            </div>
        </div>
    );
};

const WhatsAppAICenter = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [showQRModal, setShowQRModal] = useState(false);
    const [qrStatus, setQrStatus] = useState<'loading' | 'ready' | 'connecting' | 'success'>('loading');
    const [realMessages, setRealMessages] = useState<any[]>([]);
    const [apiUrl, setApiUrl] = useState(import.meta.env.VITE_API_URL || 'http://localhost:3001');
    const [isApiSyncing, setIsApiSyncing] = useState(false);
    const [backendQr, setBackendQr] = useState<string | null>(null);
    const [activeContact, setActiveContact] = useState<any | null>(null);
    const [inputMessage, setInputMessage] = useState("");
    const [profilePics, setProfilePics] = useState<Record<string, string>>({});
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [iaStatus, setIaStatus] = useState<Record<string, boolean>>({});
    const [isIASuggesting, setIsIASuggesting] = useState(false);
    const [presencas, setPresencas] = useState<Record<string, { isOnline: boolean, lastSeen: string | null }>>({});
    const [allContacts, setAllContacts] = useState<any[]>([]);
    const [contactSearch, setContactSearch] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);


    // Agrupar mensagens por contato e mesclar com a agenda completa
    const groupedContacts = (() => {
        const acc = realMessages.reduce((acc: any, msg: any) => {
            const key = msg.de_raw || msg.de;
            if (key === 'me') return acc;
            if (!acc[key]) {
                acc[key] = {
                    id: key,
                    number: msg.de || key.split('@')[0],
                    rawId: key,
                    name: msg.nome || key.split('@')[0],
                    photo: msg.foto,
                    messages: []
                };
            }
            acc[key].messages.push(msg);
            return acc;
        }, {});

        // Adicionar contatos da agenda que não estão nas mensagens
        allContacts.forEach(c => {
            if (!acc[c.id]) {
                acc[c.id] = {
                    id: c.id,
                    number: c.number,
                    rawId: c.id,
                    name: c.name,
                    photo: c.foto,
                    messages: []
                };
            }
        });

        return Object.values(acc)
            .filter((c: any) => {
                const q = contactSearch.toLowerCase();
                return !q || c.name.toLowerCase().includes(q) || c.number.includes(q);
            })
            .sort((a: any, b: any) => {
                // Ordenação estritamente por mensagem mais recente (estilo WhatsApp Web)
                const lastA = a.messages[0]?.timestamp || 0;
                const lastB = b.messages[0]?.timestamp || 0;

                if (lastA !== lastB) {
                    return lastB - lastA;
                }

                // Se nenhum tem mensagem, ordem alfabética
                return a.name.localeCompare(b.name);
            }) as any[];
    })();

    // Sincroniza o contato ativo caso novas mensagens cheguem
    useEffect(() => {
        if (activeContact) {
            const updated = groupedContacts.find(c => c.id === activeContact.id);
            if (updated) setActiveContact(updated);
        }
    }, [realMessages.length]);

    // Socket Connection
    useEffect(() => {
        const socket = io(apiUrl, {
            transports: ['polling'],
            reconnectionAttempts: 10,
            reconnectionDelay: 2000
        });
        socket.on("connect", () => console.log("✅ Socket Conectado"));
        socket.on("nova_mensagem", (msg) => {
            setRealMessages(prev => {
                if (prev.some(m => m.id === msg.id)) return prev;
                return [msg, ...prev];
            });
        });
        socket.on("init_messages", (msgs) => setRealMessages(msgs));
        socket.on("init_contacts", (contacts) => setAllContacts(contacts));
        socket.on("ia_sugestao", (data) => {
            if (activeContact && data.id_raw === activeContact.rawId) {
                setInputMessage(data.sugestao);
                setIsIASuggesting(false);
                toast.info("A IA preparou uma resposta!");
            }
        });
        socket.on("status_update", (data) => {
            if (data.status === 'conectado') {
                setIsConnected(true);
            } else {
                setIsConnected(false);
                setRealMessages([]); // Limpa a lista da direita instantaneamente
                if (data.status === 'aguardando_qr' && data.qr_code_imagem) {
                    setQrStatus('ready');
                    setBackendQr(data.qr_code_imagem);
                }
            }
        });

        socket.on("presenca_update", (data) => {
            setPresencas(prev => ({
                ...prev,
                [data.id_raw]: {
                    isOnline: data.isOnline,
                    lastSeen: typeof data.lastSeen === 'number'
                        ? `hoje às ${new Date(data.lastSeen * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                        : (data.lastSeen || prev[data.id_raw]?.lastSeen)
                }
            }));
        });

        return () => { socket.disconnect(); };
    }, [apiUrl, activeContact?.id]);

    // Initial Data & Fallback Polling
    useEffect(() => {
        const loadData = async () => {
            try {
                const resStatus = await fetch(`${apiUrl}/api/status`);
                const data = await resStatus.json();
                if (data.status === 'conectado') setIsConnected(true);

                const resMsgs = await fetch(`${apiUrl}/api/mensagens`);
                if (resMsgs.ok) setRealMessages(await resMsgs.json());

                const resContacts = await fetch(`${apiUrl}/api/contatos`);
                if (resContacts.ok) {
                    const contacts = await resContacts.json();
                    if (contacts.length > 0) setAllContacts(contacts);
                }
            } catch (err) { console.error("Erro no fetch inicial:", err); }
        };

        loadData();
        const interval = setInterval(loadData, 5000); // Tenta atualizar a cada 5s se estiver vazio
        return () => clearInterval(interval);
    }, [apiUrl]);

    // RESTAURADO: Buscar fotos de perfil e presença inicial
    useEffect(() => {
        const fetchData = async () => {
            if (!isConnected) return;
            for (const contact of groupedContacts) {
                // Fotos
                if (profilePics[contact.id] === undefined) {
                    try {
                        const res = await fetch(`${apiUrl}/api/foto?id=${encodeURIComponent(contact.rawId)}`);
                        if (res.ok) {
                            const data = await res.json();
                            setProfilePics(prev => ({ ...prev, [contact.id]: data.url || 'none' }));
                        }
                    } catch { }
                }
                // Presença (apenas se for o ativo ou a cada ciclo longo)
                if (activeContact?.id === contact.id || presencas[contact.id] === undefined) {
                    try {
                        const res = await fetch(`${apiUrl}/api/presenca?id=${encodeURIComponent(contact.rawId)}`);
                        if (res.ok) {
                            const data = await res.json();
                            setPresencas(prev => ({ ...prev, [contact.id]: data }));
                        }
                    } catch { }
                }
            }
        };
        if (groupedContacts.length > 0) fetchData();
    }, [groupedContacts.length, isConnected, apiUrl, activeContact?.id]);

    // Polling de presença para o contato ativo (a cada 5s para ser real-time)
    useEffect(() => {
        if (!activeContact || !isConnected) return;
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`${apiUrl}/api/presenca?id=${encodeURIComponent(activeContact.rawId)}`);
                if (res.ok) {
                    const data = await res.json();
                    setPresencas(prev => ({ ...prev, [activeContact.id]: data }));
                }
            } catch { }
        }, 5000);
        return () => clearInterval(interval);
    }, [activeContact?.id, isConnected, apiUrl]);

    // Auto-scroll
    const scrollToBottom = (behavior: "smooth" | "auto" = "smooth") => {
        messagesEndRef.current?.scrollIntoView({ behavior });
    };

    useEffect(() => {
        if (activeContact) {
            scrollToBottom("auto");
            setTimeout(() => scrollToBottom("smooth"), 100);
        }
    }, [activeContact?.id, activeContact?.messages?.length]);

    const handleToggleIA = async () => {
        if (!activeContact) return;
        const current = !!iaStatus[activeContact.rawId];
        const res = await fetch(`${apiUrl}/api/ia/toggle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_raw: activeContact.rawId, enable: !current })
        });
        if (res.ok) {
            const data = await res.json();
            setIaStatus(prev => ({ ...prev, [activeContact.rawId]: data.ativa }));
            toast.success(data.ativa ? "IA Ativada" : "IA Desativada");
        }
    };

    const handleSendMessage = async () => {
        if (!inputMessage.trim() || !activeContact) return;
        const text = inputMessage;
        setInputMessage("");
        try {
            await fetch(`${apiUrl}/api/enviar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ de_raw: activeContact.rawId, mensagem: text })
            });
        } catch { toast.error("Falha ao enviar"); }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !activeContact) return;
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                await fetch(`${apiUrl}/api/enviar-midia`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        de_raw: activeContact.rawId,
                        base64data: reader.result as string,
                        mimetype: file.type,
                        filename: file.name
                    })
                });
                toast.success("Mídia enviada");
            } catch { toast.error("Erro no envio"); }
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Banner Section */}
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-8 rounded-[2rem] text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10"><BrainCircuit className="w-64 h-64 -mr-12 -mt-12" /></div>
                <div className="relative z-10 max-w-2xl">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/30">SVG Multimídia Logic</div>
                        <div className="px-3 py-1 bg-emerald-400/20 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-widest border border-emerald-400/30 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /> IA Online
                        </div>
                    </div>
                    <h2 className="text-4xl font-black mb-4 leading-tight">Gestão Inteligente &<br />Sincronia Total</h2>
                    <p className="text-emerald-50 text-lg opacity-90 mb-6">Sincronização em tempo real de mensagens, mídia e inteligência conversacional.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1"><WhatsAppConnect /></div>

                <div className="lg:col-span-2 bg-card rounded-[2rem] border border-border shadow-sm overflow-hidden flex flex-col h-[700px]">
                    {!isConnected ? (
                        <div className="flex-1 flex flex-col items-center justify-center opacity-50"><Loader2 className="w-12 h-12 animate-spin mb-4" /><p className="font-bold">Aguardando Conexão...</p></div>
                    ) : (
                        <div className="flex flex-1 overflow-hidden">
                            {/* Contact List */}
                            <div className={`w-1/3 border-r border-border flex flex-col bg-slate-50/50 overscroll-contain ${activeContact ? 'hidden md:flex' : ''}`}>
                                <div className="p-4 border-b bg-white flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <div className="italic font-bold text-xs flex items-center gap-2">
                                            <Zap className="w-4 h-4 text-amber-500" /> Monitores Ativos
                                        </div>
                                        <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full font-bold text-slate-500">
                                            {groupedContacts.length}
                                        </span>
                                    </div>
                                    <div className="relative">
                                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                                        <input
                                            className="w-full pl-7 pr-3 py-1.5 bg-slate-100 border-none rounded-lg text-[11px] focus:ring-1 focus:ring-emerald-500/30 outline-none"
                                            placeholder="Buscar contato..."
                                            value={contactSearch}
                                            onChange={(e) => setContactSearch(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar">
                                    {groupedContacts.length === 0 && isConnected && (
                                        <div className="p-8 text-center">
                                            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                            <p className="text-[11px] text-slate-400">Sincronizando contatos do celular...</p>
                                        </div>
                                    )}
                                    {groupedContacts.map((c: any) => (
                                        <div key={c.id} onClick={() => setActiveContact(c)} className={`p-4 cursor-pointer border-b transition-all flex gap-3 hover:bg-emerald-50 ${activeContact?.id === c.id ? 'bg-emerald-50 border-l-4 border-emerald-500' : 'border-l-4 border-transparent'}`}>
                                            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center font-bold text-emerald-700 relative overflow-hidden shrink-0">
                                                {c.photo ? (
                                                    <img src={c.photo} alt="PI" className="w-full h-full object-cover" />
                                                ) : profilePics[c.id] && profilePics[c.id] !== 'none' ? (
                                                    <img src={profilePics[c.id]} alt="PI" className="w-full h-full object-cover" />
                                                ) : (
                                                    c.name.charAt(0).toUpperCase()
                                                )}
                                                {/* Bolinha Verde Online */}
                                                {presencas[c.id]?.isOnline && (
                                                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-1">
                                                    <h4 className="text-[13px] font-semibold text-slate-900 truncate flex-1">{c.name}</h4>
                                                    {c.messages.length > 0 && (
                                                        <span className="text-[10px] text-slate-400 font-medium shrink-0">
                                                            {c.messages[0].horario}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    {c.messages.length > 0 && c.messages[0].fromMe && (
                                                        <CheckCheck className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                                                    )}
                                                    <p className="text-[12px] text-slate-500 truncate leading-snug">
                                                        {c.messages.length > 0 ? c.messages[0].texto : "Sem conversas recentes"}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Chat Area */}
                            <div className="flex-1 flex flex-col bg-[#efeae2] relative">
                                <div className="absolute inset-0 opacity-[0.4] pointer-events-none bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat" />
                                {activeContact ? (
                                    <>
                                        <div className="h-16 px-4 bg-[#f0f2f5] border-b flex items-center justify-between shadow-[0_1px_3px_rgba(0,0,0,0.08)] z-10">
                                            <div className="flex items-center gap-3">
                                                <button onClick={() => setActiveContact(null)} className="md:hidden"><ArrowLeft /></button>
                                                <div className="w-10 h-10 bg-slate-300 rounded-full flex items-center justify-center font-bold text-white overflow-hidden shadow-sm">
                                                    {profilePics[activeContact.id] && profilePics[activeContact.id] !== 'none' ? (
                                                        <img src={profilePics[activeContact.id]} alt="Profile" className="w-full h-full object-cover" />
                                                    ) : (
                                                        activeContact.name.charAt(0).toUpperCase()
                                                    )}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-sm">{activeContact.name}</h3>
                                                    <div className="flex items-center gap-1.5">
                                                        {presencas[activeContact.id]?.isOnline ? (
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-[11px] text-emerald-500 font-medium">online</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-500 font-medium">
                                                                {presencas[activeContact.id]?.lastSeen ? `visto por último ${presencas[activeContact.id].lastSeen}` : 'offline'}
                                                            </span>
                                                        )}
                                                        <span className="text-slate-300 text-[10px]">|</span>
                                                        <span className={`text-[10px] font-bold uppercase tracking-wider ${iaStatus[activeContact.rawId] ? 'text-amber-500' : 'text-emerald-500'}`}>
                                                            {iaStatus[activeContact.rawId] ? 'IA Ativa' : 'Humano'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button onClick={handleToggleIA} className={`px-4 py-1.5 rounded-full text-[10px] font-bold transition-all ${iaStatus[activeContact.rawId] ? 'bg-amber-500 text-white shadow-lg' : 'bg-slate-100 text-slate-600'}`}>
                                                {iaStatus[activeContact.rawId] ? 'IA ATIVA' : 'ATIVAR IA'}
                                            </button>
                                        </div>

                                        <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4 custom-scrollbar relative z-10">
                                            {activeContact.messages.map((m: any, idx: number) => {
                                                const isMe = m.fromMe === true;
                                                const hasText = m.texto && m.texto.trim().length > 0 && !m.texto.startsWith('[Mídia:');

                                                return (
                                                    <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                        <div className={`max-w-[85%] rounded-2xl shadow-sm overflow-hidden flex flex-col ${isMe
                                                            ? 'bg-[#dcf8c6] text-[#303030] rounded-tr-none'
                                                            : 'bg-white text-[#303030] rounded-tl-none border border-slate-100'
                                                            }`}>

                                                            {/* Renderização de Mídia Avançada */}
                                                            {m.hasMedia && m.media && (
                                                                <div className="relative group overflow-hidden">
                                                                    {m.type === 'image' && (
                                                                        <div className="relative">
                                                                            <img
                                                                                src={`data:${m.media.mimetype};base64,${m.media.data}`}
                                                                                className="max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                                                                                onClick={() => window.open(`data:${m.media.mimetype};base64,${m.media.data}`, '_blank')}
                                                                            />
                                                                            <a href={`data:${m.media.mimetype};base64,${m.media.data}`} download={`imagem-${m.id}.png`} className="absolute top-2 right-2 p-1.5 bg-black/40 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                <Send className="w-3 h-3 rotate-90" />
                                                                            </a>
                                                                        </div>
                                                                    )}

                                                                    {m.type === 'video' && (
                                                                        <video controls className="max-w-full">
                                                                            <source src={`data:${m.media.mimetype};base64,${m.media.data}`} type={m.media.mimetype} />
                                                                        </video>
                                                                    )}

                                                                    {(m.type === 'audio' || m.type === 'ptt') && (
                                                                        <AudioPlayer
                                                                            src={`data:${m.media.mimetype};base64,${m.media.data}`}
                                                                            isMe={isMe}
                                                                        />
                                                                    )}

                                                                    {m.type === 'sticker' && (
                                                                        <div className="p-2 flex justify-center">
                                                                            <img src={`data:${m.media.mimetype};base64,${m.media.data}`} className="w-32 h-32 object-contain" />
                                                                        </div>
                                                                    )}

                                                                    {m.type === 'document' && (
                                                                        <div className={`p-4 flex items-center gap-4 ${isMe ? 'bg-white/10' : 'bg-slate-50'} border-b border-black/5`}>
                                                                            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-sm">
                                                                                <File className="w-5 h-5" />
                                                                            </div>
                                                                            <div className="flex-1 min-w-0">
                                                                                <p className="text-xs font-bold truncate">{m.media.filename || 'Documento'}</p>
                                                                                <p className="text-[10px] opacity-60 uppercase font-black">{m.media.mimetype.split('/')[1]}</p>
                                                                            </div>
                                                                            <a
                                                                                href={`data:${m.media.mimetype};base64,${m.media.data}`}
                                                                                download={m.media.filename || 'arquivo'}
                                                                                className={`p-2 rounded-lg ${isMe ? 'hover:bg-white/20' : 'hover:bg-slate-200'} transition-colors`}
                                                                            >
                                                                                <Send className="w-4 h-4 rotate-90" />
                                                                            </a>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {hasText && (
                                                                <div className="px-4 py-2.5">
                                                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.texto}</p>
                                                                </div>
                                                            )}

                                                            <div className={`px-4 pb-2 flex items-center justify-end gap-1 ${!hasText && m.hasMedia ? 'pt-1' : ''}`}>
                                                                <span className="text-[9px] opacity-60 font-medium">{m.horario}</span>
                                                                {isMe && <CheckCheck className="w-3 h-3" />}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            <div ref={messagesEndRef} />
                                        </div>

                                        <div className="h-16 px-4 bg-[#f0f2f5] border-t flex items-center gap-2 z-10">
                                            <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-2 text-slate-500 hover:bg-black/5 rounded-full transition-colors"><Smile /></button>
                                            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                                            <button onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-500 hover:bg-black/5 rounded-full transition-colors"><Paperclip /></button>
                                            <input
                                                className="flex-1 bg-white border-none rounded-full px-4 py-2 text-sm shadow-sm focus:ring-0"
                                                placeholder="Digite sua mensagem..."
                                                value={inputMessage}
                                                onChange={e => setInputMessage(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                                            />
                                            <button onClick={handleSendMessage} className="p-2 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 transition-colors shadow-md active:scale-95"><Send className="w-4 h-4" /></button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-30 gap-4">
                                        <MessageSquare className="w-16 h-16" />
                                        <p className="font-bold">Selecione uma conversa para monitorar em tempo real.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
                .overscroll-contain { overscroll-behavior: contain; }
                .pulse { animation: pulse-animation 2s infinite; }
                @keyframes pulse-animation {
                    0% { box-shadow: 0 0 0 0px rgba(251, 191, 36, 0.7); }
                    100% { box-shadow: 0 0 0 10px rgba(251, 191, 36, 0); }
                }
            `}</style>
        </div>
    );
};

export default WhatsAppAICenter;
