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
    ArrowLeft
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
const WhatsAppAICenter = () => {
    const [isConnected, setIsConnected] = useState(true);
    const [isScanning, setIsScanning] = useState(false);
    const [showQRModal, setShowQRModal] = useState(false);
    const [qrStatus, setQrStatus] = useState<'loading' | 'ready' | 'connecting' | 'success'>('loading');
    const [realMessages, setRealMessages] = useState<any[]>([]);
    const [apiUrl, setApiUrl] = useState("http://localhost:3001");
    const [isApiSyncing, setIsApiSyncing] = useState(false);
    const [backendQr, setBackendQr] = useState<string | null>(null);
    const [activeContact, setActiveContact] = useState<any | null>(null);
    const [inputMessage, setInputMessage] = useState("");
    const [profilePics, setProfilePics] = useState<Record<string, string>>({});
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [iaStatus, setIaStatus] = useState<Record<string, boolean>>({});
    const [isIASuggesting, setIsIASuggesting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Agrupar mensagens por contato (numero) – ignora mensagens temp enviadas ("me")
    const groupedContacts = Object.values(realMessages.reduce((acc: any, msg: any) => {
        if (msg.fromMe && !msg.de_raw) return acc; // skip orphan sent msgs
        const key = msg.de_raw || msg.de;
        if (key === 'me') return acc;
        if (!acc[key]) {
            acc[key] = {
                id: key,
                number: msg.de,
                rawId: msg.de_raw || msg.de,
                name: msg.nome || `+${msg.de}`,
                photo: null,
                messages: []
            };
        }
        acc[key].messages.push(msg);
        return acc;
    }, {})) as any[];

    // Conexão Socket.io para TEMPO REAL
    useEffect(() => {
        const socket = io(apiUrl);

        socket.on("connect", () => console.log("✅ Socket Conectado"));

        // 1. Receber novas mensagens instantâneas
        socket.on("nova_mensagem", (msg) => {
            setRealMessages(prev => {
                // Evita duplicatas
                if (prev.some(m => m.id === msg.id)) return prev;
                return [msg, ...prev];
            });
        });

        // 2. Receber mensagens iniciais
        socket.on("init_messages", (msgs) => {
            setRealMessages(msgs);
        });

        // 3. Receber sugestões da IA instantâneas
        socket.on("ia_sugestao", (data) => {
            if (activeContact && data.id_raw === activeContact.rawId) {
                setInputMessage(data.sugestao);
                setIsIASuggesting(false);
                toast.info("A IA preparou uma resposta para você revisar!");
            }
        });

        // 4. Status de Conexão
        socket.on("status_update", (data) => {
            if (data.status === 'conectado') {
                setIsConnected(true);
                setQrStatus('success');
            } else if (data.status === 'aguardando_qr') {
                setIsConnected(false);
                setQrStatus('ready');
                if (data.qr_code_imagem) setBackendQr(data.qr_code_imagem);
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [apiUrl, activeContact?.id]);

    // Polling inicial fallback + inicialização de dados
    useEffect(() => {
        const initData = async () => {
            try {
                // Status e Mensagens (Fallback)
                const statusRes = await fetch(`${apiUrl}/api/status`);
                const statusData = await statusRes.json();
                if (statusData.status === 'conectado') {
                    setIsConnected(true);
                    setQrStatus('success');
                }

                const msgRes = await fetch(`${apiUrl}/api/mensagens`);
                if (msgRes.ok) setRealMessages(await msgRes.json());

                // Status IA
                const iaRes = await fetch(`${apiUrl}/api/ia/status`);
                if (iaRes.ok) setIaStatus(await iaRes.json());
            } catch (error) {
                console.error("Erro na inicialização:", error);
            }
        };
        initData();
    }, [apiUrl]);

    // Buscar fotos de perfil
    useEffect(() => {
        const fetchPhotos = async () => {
            if (!isConnected) return;
            for (const contact of groupedContacts) {
                if (profilePics[contact.id] === undefined) {
                    try {
                        const res = await fetch(`${apiUrl}/api/foto?id=${encodeURIComponent(contact.rawId)}`);
                        if (res.ok) {
                            const data = await res.json();
                            setProfilePics(prev => ({ ...prev, [contact.id]: data.url || 'none' }));
                        }
                    } catch { }
                }
            }
        };
        fetchPhotos();
    }, [groupedContacts.length, isConnected, apiUrl]);

    // Auto-scroll para a última mensagem
    const messagesEndRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

        // Lógica de Sugestão Automática da IA se estiver ativa para este contato
        const getIASuggestion = async () => {
            if (!activeContact || !iaStatus[activeContact.rawId]) return;
            const lastMsg = activeContact.messages[activeContact.messages.length - 1];
            if (!lastMsg || lastMsg.fromMe || inputMessage) return; // Só sugere se não tiver nada no input e a última for do cliente

            setIsIASuggesting(true);
            try {
                const res = await fetch(`${apiUrl}/api/ia/sugerir?id_raw=${encodeURIComponent(activeContact.rawId)}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.sugestao) {
                        setInputMessage(data.sugestao);
                        toast.info("A IA preparou uma resposta para você revisar!");
                    }
                }
            } catch { } finally {
                setIsIASuggesting(false);
            }
        };

        // Lógica de Sugestão Automática da IA removida daqui e movida para o Socket.io no backend
        // Mas mantemos o indicador de rascunho se o cliente estiver escrevendo
        if (activeContact && iaStatus[activeContact.rawId]) {
            const lastMsg = activeContact.messages[activeContact.messages.length - 1];
            if (lastMsg && !lastMsg.fromMe && !inputMessage) {
                setIsIASuggesting(true);
            }
        }
    }, [activeContact?.messages?.length, activeContact?.id]);

    const handleDisconnect = async () => {
        try {
            const res = await fetch(`${apiUrl}/api/desconectar`, { method: 'POST' });
            if (res.ok) {
                toast.success("A gerar novo QR Code...");
                setIsConnected(false);
                setQrStatus('loading');
            }
        } catch (error) {
            toast.error("Erro ao tentar desconectar.");
        }
    };

    const handleToggleIA = async () => {
        if (!activeContact) return;
        const currentStatus = !!iaStatus[activeContact.rawId];
        try {
            const res = await fetch(`${apiUrl}/api/ia/toggle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_raw: activeContact.rawId, enable: !currentStatus })
            });
            if (res.ok) {
                const data = await res.json();
                setIaStatus(prev => ({ ...prev, [activeContact.rawId]: data.ativa }));
                toast.success(data.ativa ? "IA Ativada para este contato!" : "IA Desativada.");
            }
        } catch (err) {
            toast.error("Erro ao alternar IA.");
        }
    };

    const handleSendMessage = async () => {
        if (!inputMessage.trim() || !activeContact) return;

        const text = inputMessage;
        setInputMessage("");

        // Optimistic UI - adiciona localmente na thread do contato ativo
        const tempMsg = {
            id: Date.now().toString(),
            de: activeContact.number,
            de_raw: activeContact.rawId,
            fromMe: true,
            nome: activeContact.name,
            texto: text,
            horario: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            timestamp: Date.now() / 1000
        };
        setRealMessages(prev => [...prev, tempMsg]);
        // Força re-sincronização do activeContact com o novo estado
        setActiveContact((prev: any) => prev ? { ...prev } : prev);

        try {
            const res = await fetch(`${apiUrl}/api/enviar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    numero: activeContact.number,
                    de_raw: activeContact.rawId, // ID completo para envio seguro
                    mensagem: text
                })
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                toast.error(`Erro: ${errData.erro} - Detalhe: ${errData.detalhe || 'Nenhum'}`);
                // Aqui poderia-mos remover o tempMsg em caso de erro
            }
        } catch (error: any) {
            toast.error(`Falha de rede ao enviar: ${error.message}`);
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!activeContact) return;

        const reader = new FileReader();
        reader.onload = async () => {
            const base64data = reader.result as string;

            const tempMsg = {
                id: `temp-${Date.now()}`,
                de_raw: activeContact.rawId,
                de: activeContact.number,
                nome: "Eu",
                texto: `📷 Arquivo de mídia: ${file.name}`,
                fromMe: true,
                horario: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                timestamp: Date.now() / 1000
            };
            setRealMessages(prev => [...prev, tempMsg]);

            try {
                const res = await fetch(`${apiUrl}/api/enviar-midia`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        numero: activeContact.number,
                        de_raw: activeContact.rawId,
                        base64data,
                        mimetype: file.type,
                        filename: file.name,
                        legend: ''
                    })
                });
                if (!res.ok) throw new Error();
                toast.success("Mídia enviada!");
            } catch (err) {
                toast.error("Erro ao enviar mídia.");
            }
        };
        reader.readAsDataURL(file);
    };

    const handleSyncApi = () => {
        setIsApiSyncing(true);
        // Tenta uma conexão manual imediata
        fetch(`${apiUrl}/api/status`)
            .then(res => res.json())
            .then(data => {
                setIsApiSyncing(false);
                toast.success(`API conectada! Status: ${data.status}`);
            })
            .catch(() => {
                setIsApiSyncing(false);
                toast.error("Não foi possível alcançar a API no link informado.");
            });
    };

    const handleOpenQR = () => {
        setShowQRModal(true);
    };

    const simulateConnect = () => {
        // Agora o backend cuida da conexão real
        toast.info("A aguardar leitura do QR Code pelo telemóvel...");
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Top Banner / Hero */}
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-8 rounded-[2rem] text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <BrainCircuit className="w-64 h-64 -mr-12 -mt-12" />
                </div>
                <div className="relative z-10 max-w-2xl">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/30">
                            SVG Multimídia Logic v4.0
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-400/20 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-widest border border-emerald-400/30">
                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /> IA Online
                        </div>
                    </div>
                    <h2 className="text-4xl font-extrabold mb-4 leading-tight">
                        Automação Humana & <br /> Inteligência Convencional
                    </h2>
                    <p className="text-emerald-50 text-lg mb-6 leading-relaxed opacity-90">
                        A IA da SVG Multimídia gerencia suas conversas no WhatsApp, entende o contexto emocional e quebra objeções em tempo real.
                    </p>
                    <div className="flex flex-wrap gap-4">
                        <button className="px-6 py-3 bg-white text-teal-700 rounded-xl font-bold shadow-xl hover:scale-105 transition-all text-sm">
                            Configurar Respostas IA
                        </button>
                        <button className="px-6 py-3 bg-teal-800/40 backdrop-blur-md border border-white/20 text-white rounded-xl font-bold hover:bg-teal-800/60 transition-all text-sm">
                            Ver Histórico de Treinamento
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* WhatsApp Connection Sidebar */}
                <div className="lg:col-span-1">
                    <WhatsAppConnect />

                    <div className="bg-card p-6 rounded-3xl border border-border shadow-sm mt-6">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase mb-4 flex items-center gap-2">
                            <Cpu className="w-3 h-3" /> Configurações de API
                        </h4>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Webhook URL</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 text-[11px] bg-secondary/30 border border-border rounded-xl focus:outline-none font-medium text-muted-foreground"
                                    value={apiUrl}
                                    readOnly
                                />
                            </div>
                            <p className="text-[9px] text-muted-foreground italic leading-tight">
                                Este link é usado para receber notificações da API local no seu painel.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Live Conversation Monitor (Chat UI) */}
                <div className="lg:col-span-2 bg-card rounded-3xl border border-border shadow-sm overflow-hidden flex flex-col h-[700px]">

                    {!isConnected ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center opacity-70 gap-4 animate-in fade-in zoom-in duration-500 p-12">
                            <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center relative shadow-inner">
                                <MessageCircle className="w-10 h-10 text-emerald-600/50" />
                                <div className="absolute top-0 right-0 w-6 h-6 bg-amber-400 rounded-full border-4 border-card flex items-center justify-center shadow-sm">
                                    <Zap className="w-3 h-3 text-white" />
                                </div>
                            </div>
                            <div>
                                <h4 className="font-bold text-lg text-slate-700">Aguardando Conexão IA</h4>
                                <p className="text-xs text-slate-500 mt-1 max-w-[250px] mx-auto leading-relaxed">
                                    Conecte o seu WhatsApp ou verifique o painel lateral para começar a capturar leads em tempo real.
                                </p>
                            </div>
                        </div>
                    ) : realMessages.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-muted-foreground">
                            <Ghost className="w-12 h-12 opacity-50" />
                            <span className="text-sm font-medium">Nenhuma mensagem recente capturada.</span>
                        </div>
                    ) : (
                        <div className="flex flex-1 h-full overflow-hidden">

                            {/* Left Pane: Contacts List */}
                            <div className={`w-full md:w-1/3 border-r border-border flex flex-col bg-slate-50/30 ${activeContact ? 'hidden md:flex' : 'flex'}`}>
                                <div className="p-4 border-b border-border bg-secondary/10 shrink-0">
                                    <h3 className="font-bold flex items-center gap-2 text-sm italic">
                                        <Zap className="w-4 h-4 text-amber-500" /> Monitores IA ({groupedContacts.length})
                                    </h3>
                                </div>
                                <div className="flex-1 overflow-y-auto divide-y divide-border">
                                    {groupedContacts.map((contact: any) => {
                                        const lastMsg = contact.messages[contact.messages.length - 1];
                                        return (
                                            <div
                                                key={contact.id}
                                                onClick={() => setActiveContact(contact)}
                                                className={`p-3 cursor-pointer transition-all flex items-start gap-3 hover:bg-emerald-50 ${activeContact?.id === contact.id ? 'bg-emerald-50 border-l-4 border-emerald-500' : 'border-l-4 border-transparent'}`}
                                            >
                                                <div className="w-10 h-10 bg-emerald-100 rounded-full shrink-0 flex items-center justify-center text-emerald-600 font-bold text-sm shadow-sm relative overflow-hidden">
                                                    {profilePics[contact.id] && profilePics[contact.id] !== 'none' ? (
                                                        <img src={profilePics[contact.id]} alt={contact.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        contact.name.charAt(0).toUpperCase()
                                                    )}
                                                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${iaStatus[contact.rawId] ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'} rounded-full border-2 border-white z-10`} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-center mb-0.5">
                                                        <h4 className="font-bold text-xs truncate text-slate-800">{contact.name}</h4>
                                                        <span className="text-[9px] font-medium text-slate-400 shrink-0">{lastMsg?.horario}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 opacity-80">
                                                        {lastMsg?.fromMe && <CheckCheck className="w-3 h-3 text-emerald-500 shrink-0" />}
                                                        <p className="text-[11px] text-slate-600 truncate">{lastMsg?.texto}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Right Pane: Active Chat */}
                            <div className={`w-full md:w-2/3 flex flex-col bg-slate-50 bg-[url('https://i.ibb.co/L5hP3L4/wa-bg.png')] bg-cover bg-center bg-opacity-10 ${!activeContact ? 'hidden md:flex items-center justify-center' : 'flex'}`}>
                                {!activeContact ? (
                                    <div className="flex flex-col items-center gap-4 opacity-50 p-6 text-center">
                                        <MessageSquare className="w-16 h-16 text-emerald-600" />
                                        <div>
                                            <h3 className="font-bold text-xl text-slate-700">Selecione uma Conversa</h3>
                                            <p className="text-xs text-slate-500 mt-1">O painel de monitoramento e interação do WhatsApp IA abrirá aqui.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {/* Chat Header */}
                                        <div className="h-16 px-4 bg-white border-b border-border flex items-center justify-between shrink-0 shadow-sm z-10">
                                            <div className="flex items-center gap-3">
                                                <button onClick={() => setActiveContact(null)} className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-full">
                                                    <ArrowLeft className="w-5 h-5" />
                                                </button>
                                                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-bold overflow-hidden shadow-sm">
                                                    {profilePics[activeContact.id] && profilePics[activeContact.id] !== 'none' ? (
                                                        <img src={profilePics[activeContact.id]} alt="Profile" className="w-full h-full object-cover" />
                                                    ) : (
                                                        activeContact.name.charAt(0).toUpperCase()
                                                    )}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-sm text-slate-800 leading-tight">{activeContact.name}</h3>
                                                    <p className={`text-[10px] ${iaStatus[activeContact.rawId] ? 'text-amber-500 font-black' : 'text-slate-400'} flex items-center gap-1 transition-all`}>
                                                        {iaStatus[activeContact.rawId] ? (
                                                            <><Sparkles className="w-3 h-3 animate-spin-slow" /> IA Gerenciando Chat</>
                                                        ) : (
                                                            <>Aguardando Interação Humana</>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 text-slate-500">
                                                <button
                                                    onClick={handleToggleIA}
                                                    className={`mr-2 px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1.5 transition-all ${iaStatus[activeContact.rawId]
                                                        ? 'bg-amber-500 text-white shadow-lg shadow-amber-200'
                                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                                >
                                                    <Sparkles className={`w-3.5 h-3.5 ${iaStatus[activeContact.rawId] ? 'animate-pulse' : ''}`} />
                                                    {iaStatus[activeContact.rawId] ? 'IA ATIVA' : 'ATIVAR IA'}
                                                </button>
                                                <button onClick={() => toast.info('Função de Vídeo via IA WhatsApp não disponível.')} className="p-2 hover:bg-slate-100 rounded-full ml-1"><Video className="w-5 h-5" /></button>
                                                <button onClick={() => toast.info('Função de Ligação via IA WhatsApp não disponível.')} className="p-2 hover:bg-slate-100 rounded-full ml-1"><Phone className="w-5 h-5" /></button>
                                                <span className="w-px h-6 bg-slate-200 mx-1"></span>
                                                <button onClick={() => toast.info('O motor de busca em chats será ativado na próxima build.')} className="p-2 hover:bg-slate-100 rounded-full"><Search className="w-5 h-5" /></button>
                                                <button onClick={() => toast.info('Configurações extras de contato sob desenvolvimento.')} className="p-2 hover:bg-slate-100 rounded-full"><MoreVertical className="w-5 h-5" /></button>
                                            </div>
                                        </div>

                                        {/* Messages Area */}
                                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                            {activeContact.messages.map((msg: any, idx: number) => {
                                                const isMe = msg.fromMe === true;
                                                return (
                                                    <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                        <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm relative ${isMe
                                                            ? 'bg-emerald-600 text-white rounded-tr-none'
                                                            : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
                                                            }`}>

                                                            {/* Mídia Render */}
                                                            {msg.hasMedia && msg.media && (
                                                                <div className="mb-2 overflow-hidden rounded-lg">
                                                                    {msg.type === 'image' && (
                                                                        <img src={`data:${msg.media.mimetype};base64,${msg.media.data}`} alt="Img" className="max-w-full cursor-pointer" onClick={() => window.open(`data:${msg.media.mimetype};base64,${msg.media.data}`, '_blank')} />
                                                                    )}
                                                                    {msg.type === 'video' && (
                                                                        <video controls className="max-w-full"><source src={`data:${msg.media.mimetype};base64,${msg.media.data}`} type={msg.media.mimetype} /></video>
                                                                    )}
                                                                    {(msg.type === 'ptt' || msg.type === 'audio') && (
                                                                        <audio controls className="w-full h-8"><source src={`data:${msg.media.mimetype};base64,${msg.media.data}`} type={msg.media.mimetype} /></audio>
                                                                    )}
                                                                    {msg.type === 'document' && (
                                                                        <div className="flex items-center gap-2 p-2 bg-black/5 rounded">
                                                                            <File className="w-5 h-5 text-emerald-500" />
                                                                            <a href={`data:${msg.media.mimetype};base64,${msg.media.data}`} download={msg.media.filename} className="text-[10px] underline truncate">{msg.media.filename || 'Doc'}</a>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}

                                                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.texto}</p>
                                                            <div className="flex items-center justify-end gap-1 mt-1 opacity-60">
                                                                <span className="text-[9px] font-medium">{msg.horario}</span>
                                                                {isMe && <CheckCheck className="w-3 h-3" />}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            <div ref={messagesEndRef} />
                                        </div>

                                        {/* Input Box - Standard WhatsApp */}
                                        <div className="h-16 px-4 bg-slate-50 border-t border-border flex items-center gap-3 shrink-0 relative">
                                            {showEmojiPicker && (
                                                <div className="absolute bottom-20 left-4 z-50 shadow-2xl rounded-2xl overflow-hidden border border-border">
                                                    <EmojiPicker onEmojiClick={(emojiData) => setInputMessage(prev => prev + emojiData.emoji)} />
                                                </div>
                                            )}

                                            <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={`p-2 hover:bg-slate-200 rounded-full transition-colors ${showEmojiPicker ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}>
                                                <Smile className="w-6 h-6" />
                                            </button>

                                            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                                            <button onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors mr-1">
                                                <Paperclip className="w-5 h-5" />
                                            </button>

                                            <div className="flex-1 relative">
                                                <input
                                                    type="text"
                                                    value={inputMessage}
                                                    onChange={e => setInputMessage(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                                                    placeholder={isIASuggesting ? "🤖 IA gerando sugestão..." : "Digite uma mensagem ou IA assumirá..."}
                                                    disabled={isIASuggesting}
                                                    className={`w-full pl-4 pr-10 py-2.5 ${isIASuggesting ? 'bg-amber-50 animate-pulse' : 'bg-white'} border border-slate-200 shadow-sm rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20`}
                                                />
                                                {isIASuggesting && (
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                        <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                                                    </div>
                                                )}
                                            </div>

                                            {inputMessage.trim() ? (
                                                <button onClick={handleSendMessage} className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full transition-colors w-10 h-10 flex flex-col items-center justify-center shadow-md">
                                                    <Send className="w-4 h-4 ml-0.5" />
                                                </button>
                                            ) : (
                                                <button onClick={() => toast.info("Áudios de voz pela Web ainda estão em testes.")} className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors w-10 h-10 flex flex-col items-center justify-center">
                                                    <Mic className="w-6 h-6" />
                                                </button>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* AI Strategy Bench */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-3xl text-white shadow-xl">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-emerald-400" /> Gatilhos e Objeções
                    </h3>
                    <div className="space-y-3">
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all cursor-pointer">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-emerald-400 uppercase tracking-tighter">Objeção: Preço</span>
                                <span className="text-[10px] font-medium text-white/50">Eficácia: 92%</span>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed font-medium">
                                "Entendo perfeitamente. No entanto, o retorno sobre o investimento costuma ser percebido já no primeiro mês devido a [Vantagem Principal]..."
                            </p>
                        </div>
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all cursor-pointer">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-emerald-400 uppercase tracking-tighter">Objeção: Falta de Tempo</span>
                                <span className="text-[10px] font-medium text-white/50">Eficácia: 87%</span>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed font-medium">
                                "Por isso mesmo nossa solução é ideal: ela economiza seu tempo automatizando tarefas que hoje você faz manualmente..."
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-card p-6 rounded-3xl border border-border shadow-sm">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-primary" /> Performance do Fechamento
                    </h3>
                    <div className="grid grid-cols-2 gap-4 h-[200px]">
                        <div className="flex flex-col justify-end items-center gap-2">
                            <div className="w-full bg-primary/20 rounded-t-xl relative group" style={{ height: '70%' }}>
                                <div className="absolute inset-x-0 bottom-0 bg-primary rounded-t-xl transition-all h-[60%] group-hover:h-[80%]" />
                            </div>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Manual</span>
                        </div>
                        <div className="flex flex-col justify-end items-center gap-2">
                            <div className="w-full bg-emerald-500/20 rounded-t-xl relative group" style={{ height: '100%' }}>
                                <div className="absolute inset-x-0 bottom-0 bg-emerald-500 rounded-t-xl transition-all h-[85%] group-hover:h-[95%]" />
                            </div>
                            <span className="text-[10px] font-bold text-emerald-600 uppercase">SVG IA</span>
                        </div>
                    </div>
                    <div className="mt-6 flex items-center gap-4 p-3 bg-emerald-50 rounded-2xl border border-emerald-100 italic">
                        <Zap className="w-5 h-5 text-emerald-600 shrink-0" />
                        <p className="text-[11px] text-emerald-700 leading-tight">
                            A IA converte <strong>2.4x mais</strong> leads em reuniões agendadas que o atendimento humano padrão fora do horário comercial.
                        </p>
                    </div>
                </div>
            </div>

            {/* QR CODE SYNC MODAL */}
            <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
                <DialogContent className="sm:max-w-[450px] rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden bg-white">
                    <div className="bg-emerald-600 p-8 text-white relative">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <MessageCircle className="w-32 h-32 -mr-8 -mt-8" />
                        </div>
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-extrabold text-white">Sincronizar WhatsApp</DialogTitle>
                            <DialogDescription className="text-emerald-100 font-medium">
                                Abra o WhatsApp no seu telemóvel e aponte a câmara para este ecrã.
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="p-10 flex flex-col items-center justify-center space-y-8 bg-slate-50/50">
                        <div className="relative group">
                            {/* QR Frame */}
                            <div className="w-[280px] h-[280px] bg-white rounded-3xl shadow-xl border-4 border-white flex items-center justify-center relative overflow-hidden">
                                {qrStatus === 'loading' ? (
                                    <div className="flex flex-col items-center gap-3">
                                        <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">A Gerar Código...</span>
                                    </div>
                                ) : qrStatus === 'success' ? (
                                    <div className="flex flex-col items-center gap-3 animate-in zoom-in-50 duration-500">
                                        <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-200">
                                            <CheckCircle2 className="w-10 h-10 text-white" />
                                        </div>
                                        <span className="text-sm font-bold text-emerald-600">Conectado com Sucesso!</span>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <div className="bg-white p-4 rounded-xl">
                                            <img
                                                src={backendQr || `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=Aguardando_Backend&color=000000&margin=1`}
                                                alt="WhatsApp QR Code"
                                                className={`w-[240px] h-[240px] transition-all duration-500 ${qrStatus === 'connecting' ? 'scale-90 blur-sm opacity-50' : 'hover:scale-105'}`}
                                            />
                                        </div>

                                        {/* Scanning Animation */}
                                        {qrStatus === 'ready' && (
                                            <div className="absolute inset-0 pointer-events-none">
                                                <div className="w-full h-1 bg-emerald-500/50 absolute top-0 animate-[scan_3s_linear_infinite] shadow-[0_0_15px_rgba(16,185,129,0.8)]" />
                                            </div>
                                        )}

                                        {qrStatus === 'connecting' && (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="flex flex-col items-center gap-2">
                                                    <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
                                                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-tighter">A Sincronizar Mensagens...</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Corner Accents */}
                            <div className="absolute -top-2 -left-2 w-8 h-8 border-t-4 border-l-4 border-emerald-500 rounded-tl-xl" />
                            <div className="absolute -top-2 -right-2 w-8 h-8 border-t-4 border-r-4 border-emerald-500 rounded-tr-xl" />
                            <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-4 border-l-4 border-emerald-500 rounded-bl-xl" />
                            <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-4 border-r-4 border-emerald-500 rounded-br-xl" />
                        </div>

                        <div className="w-full space-y-4">
                            <div className="flex items-start gap-4 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                                    <span className="text-emerald-700 font-bold text-xs">1</span>
                                </div>
                                <p className="text-xs text-slate-600 leading-relaxed font-medium">Toque em <strong>Definições</strong> ou <strong>Menu</strong> no telemóvel.</p>
                            </div>
                            <div className="flex items-start gap-4 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                                    <span className="text-emerald-700 font-bold text-xs">2</span>
                                </div>
                                <p className="text-xs text-slate-600 leading-relaxed font-medium">Selecione <strong>Dispositivos Associados</strong> e toque em <strong>Associar um dispositivo</strong>.</p>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowQRModal(false)}
                            className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest"
                        >
                            Fechar Tutorial
                        </button>
                    </div>
                </DialogContent>
            </Dialog>

            <style>{`
                @keyframes scan {
                    0% { top: 0; }
                    50% { top: 100%; }
                    100% { top: 0; }
                }
            `}</style>
        </div >
    );
};

// Help sub-component
const TrendsUp = ({ className }: { className?: string }) => (
    <svg
        className={className}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
);

export default WhatsAppAICenter;
