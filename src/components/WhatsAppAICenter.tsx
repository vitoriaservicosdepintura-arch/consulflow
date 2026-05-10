import { useState, useEffect, useRef } from "react";
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

    // Polling para o status da API e MENSAGENS REAIS
    useEffect(() => {
        const checkStatus = async () => {
            try {
                // 1. Checar Status / QR
                const statusRes = await fetch(`${apiUrl}/api/status`);
                const statusData = await statusRes.json();

                if (statusData.status === 'conectado') {
                    setIsConnected(true);
                    setQrStatus('success');
                } else if (statusData.status === 'aguardando_qr') {
                    setIsConnected(false);
                    setQrStatus('ready');
                    if (statusData.qr_code_imagem) {
                        setBackendQr(statusData.qr_code_imagem);
                    }
                } else {
                    setIsConnected(false);
                }

                // 2. Buscar Mensagens Reais
                const msgRes = await fetch(`${apiUrl}/api/mensagens`);
                if (msgRes.ok) {
                    const messages = await msgRes.json();
                    setRealMessages(messages);
                }
            } catch (error) {
                console.error("Falha ao conectar à API:", error);
            }
        };

        const interval = setInterval(checkStatus, 3000);
        return () => clearInterval(interval);
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
    }, [activeContact?.messages]);

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
                                                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white z-10" />
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
                                                    <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                                                        <Sparkles className="w-3 h-3" /> IA Monitorando...
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 text-slate-500">
                                                <button onClick={() => toast.info('Função de Vídeo via IA WhatsApp não disponível.')} className="p-2 hover:bg-slate-100 rounded-full ml-1"><Video className="w-5 h-5" /></button>
                                                <button onClick={() => toast.info('Função de Ligação via IA WhatsApp não disponível.')} className="p-2 hover:bg-slate-100 rounded-full ml-1"><Phone className="w-5 h-5" /></button>
                                                <span className="w-px h-6 bg-slate-200 mx-1"></span>
                                                <button onClick={() => toast.info('O motor de busca em chats será ativado na próxima build.')} className="p-2 hover:bg-slate-100 rounded-full"><Search className="w-5 h-5" /></button>
                                                <button onClick={() => toast.info('Configurações extras de contato sob desenvolvimento.')} className="p-2 hover:bg-slate-100 rounded-full"><MoreVertical className="w-5 h-5" /></button>
                                            </div>
                                        </div>

                                        {/* Messages Area */}
                                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                            {activeContact.messages.map((msg: any) => {
                                                const isMe = msg.fromMe === true;
                                                return (
                                                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                        <div className={`max-w-[75%] rounded-2xl px-4 py-2 shadow-sm relative ${isMe
                                                            ? 'bg-emerald-100 text-emerald-950 rounded-tr-none'
                                                            : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
                                                            }`}>
                                                            <p className="text-sm pb-2 whitespace-pre-wrap">{msg.texto}</p>
                                                            <div className="flex items-center justify-end gap-1 absolute bottom-1 right-2">
                                                                {isMe && <CheckCheck className="w-3 h-3 text-emerald-500" />}
                                                                <span className="text-[9px] opacity-60 font-medium">{msg.horario}</span>
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
                                                    placeholder="Digite uma mensagem ou IA assumirá..."
                                                    className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-200 shadow-sm rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                                />
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
