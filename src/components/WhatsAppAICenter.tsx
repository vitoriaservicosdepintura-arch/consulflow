import { useState, useEffect } from "react";
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
    Ghost
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

interface Conversation {
    id: string;
    leadName: string;
    lastMessage: string;
    time: string;
    status: 'ai_processing' | 'human_needed' | 'closed';
    sentiment: 'positive' | 'neutral' | 'negative';
    objectionDetected?: string;
}

const MOCK_CONVERSATIONS: Conversation[] = [
    { id: '1', leadName: 'Marcos Vinícius', lastMessage: 'Achei o valor um pouco alto para o meu orçamento.', time: 'agora', status: 'ai_processing', sentiment: 'neutral', objectionDetected: 'Preço/Orçamento' },
    { id: '2', leadName: 'Cláudia Souza', lastMessage: 'Podemos agendar para amanhã às 14h?', time: '2m atrás', status: 'closed', sentiment: 'positive' },
    { id: '3', leadName: 'Ricardo Alves', lastMessage: 'Gostaria de saber mais sobre as garantias.', time: '15m atrás', status: 'ai_processing', sentiment: 'neutral', objectionDetected: 'Segurança/Garantia' },
    { id: '4', leadName: 'Juliana Lima', lastMessage: 'Vou falar com meu sócio e te retorno.', time: '1h atrás', status: 'human_needed', sentiment: 'neutral', objectionDetected: 'Decisor Terceiro' },
    { id: '5', leadName: 'António Ferreira', lastMessage: 'Quais são as condições de financiamento?', time: '3h atrás', status: 'ai_processing', sentiment: 'positive', objectionDetected: 'Financiamento' },
    { id: '6', leadName: 'Maria Silva', lastMessage: 'Obrigada pela explicação, ficou muito claro.', time: 'ontem', status: 'closed', sentiment: 'positive' },
];

const WhatsAppAICenter = () => {
    const [isConnected, setIsConnected] = useState(true);
    const [isScanning, setIsScanning] = useState(false);
    const [showQRModal, setShowQRModal] = useState(false);
    const [qrStatus, setQrStatus] = useState<'loading' | 'ready' | 'connecting' | 'success'>('loading');
    const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);
    const [realMessages, setRealMessages] = useState<any[]>([]);
    const [apiUrl, setApiUrl] = useState("http://localhost:3001");
    const [isApiSyncing, setIsApiSyncing] = useState(false);
    const [backendQr, setBackendQr] = useState<string | null>(null);

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

                {/* Live Conversation Monitor */}
                <div className="lg:col-span-2 bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-border flex items-center justify-between bg-secondary/10">
                        <h3 className="font-bold flex items-center gap-2 italic">
                            <Zap className="w-4 h-4 text-amber-500" /> Monitoramento em Tempo Real (IA)
                        </h3>
                        <span className="text-[10px] font-bold text-muted-foreground bg-secondary px-2 py-1 rounded-md">8 CONVERSAS ATIVAS</span>
                    </div>
                    <div className="divide-y divide-border">
                        {/* Mensagens Reais do WhatsApp */}
                        {realMessages.map((msg) => (
                            <div key={msg.id} className="p-4 bg-emerald-50/30 hover:bg-emerald-50/50 transition-all group flex items-start gap-4 animate-in slide-in-from-right-4 duration-300">
                                <div className="relative">
                                    <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 font-bold text-lg">
                                        {msg.de.charAt(0)}
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-card bg-emerald-500 flex items-center justify-center">
                                        <Sparkles className="w-2 h-2 text-white" />
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <h4 className="font-bold text-sm truncate">+{msg.de}</h4>
                                        <span className="text-[10px] text-muted-foreground font-medium">{msg.horario}</span>
                                    </div>
                                    <p className="text-xs text-slate-700 truncate font-medium">"{msg.texto}"</p>
                                    <div className="mt-2 flex items-center gap-2">
                                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600 border border-emerald-200 uppercase">
                                            IA Analisando...
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Fim Mensagens Reais */}

                        {conversations.map((conv) => (
                            <div key={conv.id} className="p-4 hover:bg-secondary/20 transition-all group flex items-start gap-4">
                                <div className="relative">
                                    <div className="w-12 h-12 bg-secondary rounded-2xl flex items-center justify-center text-teal-600 font-bold text-lg">
                                        {conv.leadName.charAt(0)}
                                    </div>
                                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-card flex items-center justify-center ${conv.sentiment === 'positive' ? 'bg-green-500' : conv.sentiment === 'neutral' ? 'bg-blue-500' : 'bg-red-500'
                                        }`}>
                                        <TrendsUp className="w-2 h-2 text-white" />
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <h4 className="font-bold text-sm truncate">{conv.leadName}</h4>
                                        <span className="text-[10px] text-muted-foreground font-medium">{conv.time}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate italic">"{conv.lastMessage}"</p>

                                    {conv.objectionDetected && (
                                        <div className="mt-2 flex items-center gap-2">
                                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 border border-orange-200 uppercase">
                                                Objeção: {conv.objectionDetected}
                                            </span>
                                            <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-1">
                                                <Sparkles className="w-3 h-3" /> IA Resolvendo...
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center self-center opacity-0 group-hover:opacity-100 transition-all">
                                    <button className="p-2 text-primary hover:bg-primary/10 rounded-xl">
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button className="w-full py-3 bg-secondary/30 text-xs font-bold text-muted-foreground hover:bg-secondary transition-all">
                        Ver Todas as Conversas
                    </button>
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
        </div>
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
