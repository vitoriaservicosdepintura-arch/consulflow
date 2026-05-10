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

const WhatsAppAICenter = () => {
    const [isConnected, setIsConnected] = useState(true);
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
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Agrupar mensagens por contato
    const groupedContacts = Object.values(realMessages.reduce((acc: any, msg: any) => {
        const key = msg.de_raw || msg.de;
        if (key === 'me') return acc;
        if (!acc[key]) {
            acc[key] = {
                id: key,
                number: msg.de || key.split('@')[0],
                rawId: key,
                name: msg.nome || key.split('@')[0],
                messages: []
            };
        }
        acc[key].messages.push(msg);
        return acc;
    }, {})) as any[];

    // Sincroniza o contato ativo caso novas mensagens cheguem
    useEffect(() => {
        if (activeContact) {
            const updated = groupedContacts.find(c => c.id === activeContact.id);
            if (updated) setActiveContact(updated);
        }
    }, [realMessages.length]);

    // Socket Connection
    useEffect(() => {
        const socket = io(apiUrl);
        socket.on("connect", () => console.log("✅ Socket Conectado"));
        socket.on("nova_mensagem", (msg) => {
            setRealMessages(prev => {
                if (prev.some(m => m.id === msg.id)) return prev;
                return [msg, ...prev];
            });
        });
        socket.on("init_messages", (msgs) => setRealMessages(msgs));
        socket.on("ia_sugestao", (data) => {
            if (activeContact && data.id_raw === activeContact.rawId) {
                setInputMessage(data.sugestao);
                setIsIASuggesting(false);
                toast.info("A IA preparou uma resposta!");
            }
        });
        socket.on("status_update", (data) => {
            if (data.status === 'conectado') setIsConnected(true);
            else if (data.status === 'aguardando_qr') {
                setIsConnected(false);
                setQrStatus('ready');
                if (data.qr_code_imagem) setBackendQr(data.qr_code_imagem);
            }
        });
        return () => { socket.disconnect(); };
    }, [apiUrl, activeContact?.id]);

    // Initial Data
    useEffect(() => {
        const init = async () => {
            try {
                const resStatus = await fetch(`${apiUrl}/api/status`);
                const data = await resStatus.json();
                if (data.status === 'conectado') setIsConnected(true);
                const resMsgs = await fetch(`${apiUrl}/api/mensagens`);
                if (resMsgs.ok) setRealMessages(await resMsgs.json());
                const resIA = await fetch(`${apiUrl}/api/ia/status`);
                if (resIA.ok) setIaStatus(await resIA.json());
            } catch { }
        };
        init();
    }, [apiUrl]);

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
                    ) : realMessages.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center opacity-40"><Ghost className="w-12 h-12 mb-4" /><p>Nenhuma mensagem capturada.</p></div>
                    ) : (
                        <div className="flex flex-1 overflow-hidden">
                            {/* Contact List */}
                            <div className={`w-1/3 border-r border-border flex flex-col bg-slate-50/50 overscroll-contain ${activeContact ? 'hidden md:flex' : ''}`}>
                                <div className="p-4 border-b bg-white italic font-bold text-xs flex items-center gap-2"><Zap className="w-4 h-4 text-amber-500" /> Monitores Ativos</div>
                                <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar">
                                    {groupedContacts.map((c: any) => (
                                        <div key={c.id} onClick={() => setActiveContact(c)} className={`p-4 cursor-pointer border-b transition-all flex gap-3 hover:bg-emerald-50 ${activeContact?.id === c.id ? 'bg-emerald-50 border-l-4 border-emerald-500' : 'border-l-4 border-transparent'}`}>
                                            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center font-bold text-emerald-700 relative">
                                                {c.name.charAt(0).toUpperCase()}
                                                <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${iaStatus[c.id] ? 'bg-amber-400 pulse' : 'bg-emerald-500'}`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-xs font-bold truncate">{c.name}</h4>
                                                <p className="text-[10px] text-slate-500 truncate">{c.messages[c.messages.length - 1]?.texto}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Chat Area */}
                            <div className="flex-1 flex flex-col bg-[url('https://i.ibb.co/L5hP3L4/wa-bg.png')] bg-opacity-5">
                                {activeContact ? (
                                    <>
                                        <div className="h-16 px-4 bg-white border-b flex items-center justify-between shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <button onClick={() => setActiveContact(null)} className="md:hidden"><ArrowLeft /></button>
                                                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center font-bold text-emerald-600">{activeContact.name.charAt(0)}</div>
                                                <div>
                                                    <h3 className="font-bold text-sm">{activeContact.name}</h3>
                                                    <p className="text-[10px] text-emerald-500 font-bold">{iaStatus[activeContact.id] ? 'IA Gerenciando' : 'Humano'}</p>
                                                </div>
                                            </div>
                                            <button onClick={handleToggleIA} className={`px-4 py-1.5 rounded-full text-[10px] font-bold ${iaStatus[activeContact.id] ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                                {iaStatus[activeContact.id] ? 'IA ATIVA' : 'ATIVAR IA'}
                                            </button>
                                        </div>

                                        <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4 custom-scrollbar">
                                            {activeContact.messages.map((m: any, idx: number) => (
                                                <div key={idx} className={`flex ${m.fromMe ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl shadow-sm ${m.fromMe ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none border'}`}>
                                                        {m.hasMedia && m.media && (
                                                            <div className="mb-2 rounded-lg overflow-hidden border border-black/5">
                                                                {m.type === 'image' && <img src={`data:${m.media.mimetype};base64,${m.media.data}`} className="max-w-full" onClick={() => window.open(`data:${m.media.mimetype};base64,${m.media.data}`)} />}
                                                                {m.type === 'video' && <video controls className="max-w-full"><source src={`data:${m.media.mimetype};base64,${m.media.data}`} type={m.media.mimetype} /></video>}
                                                                {(m.type === 'audio' || m.type === 'ptt') && <audio controls className="w-full h-8"><source src={`data:${m.media.mimetype};base64,${m.media.data}`} type={m.media.mimetype} /></audio>}
                                                                {m.type === 'document' && <div className="p-2 bg-black/5 flex items-center gap-2"><File className="w-4 h-4" /><a href={`data:${m.media.mimetype};base64,${m.media.data}`} download={m.media.filename} className="text-[10px] underline">{m.media.filename || 'Doc'}</a></div>}
                                                            </div>
                                                        )}
                                                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.texto}</p>
                                                        <div className="text-[9px] opacity-60 text-right mt-1 font-medium">{m.horario}</div>
                                                    </div>
                                                </div>
                                            ))}
                                            <div ref={messagesEndRef} />
                                        </div>

                                        <div className="h-16 px-4 bg-white border-t flex items-center gap-2">
                                            <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-2 text-slate-400"><Smile /></button>
                                            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                                            <button onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-400"><Paperclip /></button>
                                            <input
                                                className="flex-1 bg-slate-50 border-none rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20"
                                                placeholder="Digite sua mensagem..."
                                                value={inputMessage}
                                                onChange={e => setInputMessage(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                                            />
                                            <button onClick={handleSendMessage} className="p-2 bg-emerald-500 text-white rounded-full"><Send className="w-4 h-4" /></button>
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
