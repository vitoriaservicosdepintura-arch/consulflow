import { useState } from "react";
import {
    Send,
    Clock,
    MessageSquare,
    Users,
    ChevronRight,
    Plus,
    Settings2,
    Zap,
    History,
    CheckCircle2,
    AlertCircle,
    MoreVertical,
    Bot
} from "lucide-react";
import { useLeads } from "@/contexts/LeadContext";
import { toast } from "sonner";

interface FollowUpMessage {
    id: number;
    label: string;
    delay: string;
    template: string;
    active: boolean;
}

const DEFAULT_SEQUENCE: FollowUpMessage[] = [
    { id: 1, label: "Mensagem 1: Retomada", delay: "1 dia", template: "Olá [Nome], tudo bem? Notei que não voltamos a conversar. Gostaria de saber se ainda tem interesse no imóvel que vimos.", active: true },
    { id: 2, label: "Mensagem 2: Conteúdo de Valor", delay: "3 dias", template: "Oi [Nome], me deparei com esse guia sobre valorização imobiliária em [Cidade] e lembrei de você!", active: true },
    { id: 3, label: "Mensagem 3: Prova Social", delay: "7 dias", template: "Olá! Acabamos de fechar uma venda similar à que você buscava. Gostaria de ver como ficou o fechamento?", active: true },
    { id: 4, label: "Mensagem 4: Cupom/Escassez", delay: "14 dias", template: "Última oportunidade: A unidade que estávamos vendo recebeu uma nova proposta. Consegue falar hoje?", active: false },
    { id: 5, label: "Mensagem 5: Despedida", delay: "30 dias", template: "Pelo visto este não é o melhor momento para sua compra. Vou arquivar aqui, mas qualquer coisa é só chamar!", active: false },
];

const FollowUpSystem = () => {
    const { leads, updateLead } = useLeads();
    const [sequence, setSequence] = useState<FollowUpMessage[]>(DEFAULT_SEQUENCE);
    const [activeTab, setActiveTab] = useState<'sequences' | 'leads'>('sequences');

    const activeLeads = leads.filter(l => l.followUpStatus === 'active');
    const coldLeads = leads.filter(l => !l.followUpStatus || l.followUpStatus === 'none');

    const startFollowUp = (id: string) => {
        updateLead(id, { followUpStatus: 'active', followUpStep: 1 });
        toast.success("Sequência de follow-up iniciada!");
    };

    const toggleMessage = (id: number) => {
        setSequence(sequence.map(m => m.id === id ? { ...m, active: !m.active } : m));
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            {/* Header Info */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-card p-4 rounded-2xl border border-border shadow-sm">
                    <p className="text-xs text-muted-foreground font-medium uppercase mb-1">Em Follow-up</p>
                    <div className="flex items-end justify-between">
                        <h3 className="text-2xl font-bold">{activeLeads.length}</h3>
                        <div className="p-2 bg-primary/10 rounded-lg"><Users className="w-4 h-4 text-primary" /></div>
                    </div>
                </div>
                <div className="bg-card p-4 rounded-2xl border border-border shadow-sm">
                    <p className="text-xs text-muted-foreground font-medium uppercase mb-1">Leads Frios</p>
                    <div className="flex items-end justify-between">
                        <h3 className="text-2xl font-bold">{coldLeads.length}</h3>
                        <div className="p-2 bg-amber-500/10 rounded-lg"><Clock className="w-4 h-4 text-amber-500" /></div>
                    </div>
                </div>
                <div className="bg-card p-4 rounded-2xl border border-border shadow-sm">
                    <p className="text-xs text-muted-foreground font-medium uppercase mb-1">Taxa de Resposta</p>
                    <div className="flex items-end justify-between">
                        <h3 className="text-2xl font-bold">24%</h3>
                        <div className="p-2 bg-green-500/10 rounded-lg"><MessageSquare className="w-4 h-4 text-green-500" /></div>
                    </div>
                </div>
                <div className="bg-card p-4 rounded-2xl border border-border shadow-sm">
                    <p className="text-xs text-muted-foreground font-medium uppercase mb-1">Automático</p>
                    <div className="flex items-end justify-between">
                        <h3 className="text-2xl font-bold">Ativo</h3>
                        <div className="p-2 bg-blue-500/10 rounded-lg"><Bot className="w-4 h-4 text-blue-500" /></div>
                    </div>
                </div>
            </div>

            <div className="flex gap-1 p-1 bg-secondary/30 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('sequences')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'sequences' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    Sequência Master
                </button>
                <button
                    onClick={() => setActiveTab('leads')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'leads' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    Gestão de Fila
                </button>
            </div>

            {activeTab === 'sequences' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Sequence Timeline */}
                    <div className="lg:col-span-2 space-y-4">
                        {sequence.map((msg, index) => (
                            <div key={msg.id} className={`relative bg-card rounded-2xl border transition-all ${msg.active ? 'border-border' : 'border-dashed border-muted opacity-60'}`}>
                                <div className="p-5">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${msg.active ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-muted text-muted-foreground'}`}>
                                                {msg.id}
                                            </div>
                                            <h4 className="font-bold">{msg.label}</h4>
                                            <span className="text-xs px-2 py-1 rounded-md bg-secondary border border-border flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> {msg.delay}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => toggleMessage(msg.id)}
                                                className={`w-10 h-5 rounded-full relative transition-all ${msg.active ? 'bg-green-500' : 'bg-muted'}`}
                                            >
                                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${msg.active ? 'left-6' : 'left-1'}`} />
                                            </button>
                                            <button className="p-2 hover:bg-secondary rounded-lg transition-colors"><Settings2 className="w-4 h-4 text-muted-foreground" /></button>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-secondary/50 rounded-xl border border-border/50">
                                        <p className="text-sm text-muted-foreground leading-relaxed italic">
                                            "{msg.template}"
                                        </p>
                                    </div>
                                </div>
                                {index < sequence.length - 1 && (
                                    <div className="absolute -bottom-4 left-9 w-0.5 h-4 bg-border" />
                                )}
                            </div>
                        ))}
                        <button className="w-full py-4 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center justify-center gap-2 text-muted-foreground hover:text-primary font-bold">
                            <Plus className="w-5 h-5" /> Adicionar Passo à Sequência
                        </button>
                    </div>

                    {/* Quick Stats Sidebar */}
                    <div className="space-y-6">
                        <div className="bg-gradient-to-br from-indigo-900 to-violet-950 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
                            <Zap className="absolute -right-4 -top-4 w-24 h-24 text-white/5 rotate-12" />
                            <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                                <Bot className="w-5 h-5" /> Inteligência de Retomada
                            </h3>
                            <p className="text-sm text-indigo-100/80 mb-6 font-medium">
                                A IA detectou que mensagens enviadas às <span className="text-white font-bold">terças-feiras às 11:30</span> têm 40% mais cliques.
                            </p>
                            <button className="w-full py-3 bg-white text-indigo-900 rounded-xl font-bold text-sm shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all">
                                Otimizar Horários Agora
                            </button>
                        </div>

                        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
                            <h4 className="font-bold flex items-center gap-2 mb-4">
                                <History className="w-4 h-4 text-primary" /> Histórico Recente
                            </h4>
                            <div className="space-y-4">
                                <div className="flex gap-3 items-start p-2 rounded-lg hover:bg-secondary/30">
                                    <div className="w-2 h-2 rounded-full bg-green-500 mt-2 shrink-0" />
                                    <div>
                                        <p className="text-xs font-bold leading-none">Vitor M. respondeu ao Passo 2</p>
                                        <p className="text-[10px] text-muted-foreground mt-1">Acabou de converter para reunião</p>
                                    </div>
                                </div>
                                <div className="flex gap-3 items-start p-2 rounded-lg hover:bg-secondary/30">
                                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0" />
                                    <div>
                                        <p className="text-xs font-bold leading-none">Passo 1 enviado para 12 leads</p>
                                        <p className="text-[10px] text-muted-foreground mt-1">Há 2 horas via Automático</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                    <div className="p-4 bg-secondary/20 border-b border-border">
                        <h3 className="font-bold flex items-center gap-2">
                            <Users className="w-4 h-4 text-primary" /> Fila de Recuperação
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-card">
                                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Lead</th>
                                    <th className="text-left px-4 py-3 font-medium text-muted-foreground uppercase text-[10px]">Status Follow-up</th>
                                    <th className="text-left px-4 py-3 font-medium text-muted-foreground uppercase text-[10px]">Última Interação</th>
                                    <th className="text-right px-4 py-3 font-medium text-muted-foreground uppercase text-[10px]">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {activeLeads.length === 0 && coldLeads.length === 0 ? (
                                    <tr><td colSpan={4} className="text-center py-12 text-muted-foreground">Nenhum lead esfriado detectado</td></tr>
                                ) : (
                                    <>
                                        {activeLeads.map(l => (
                                            <tr key={l.id} className="hover:bg-secondary/10 transition-colors">
                                                <td className="px-4 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold">{l.name}</span>
                                                        <span className="text-[10px] text-muted-foreground">{l.company}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold border border-blue-200 uppercase">
                                                        Ativo: Passo {l.followUpStep}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-xs text-muted-foreground">
                                                    {new Date(l.createdAt).toLocaleDateString()}
                                                </td>
                                                <td className="px-4 py-4 text-right">
                                                    <button className="p-2 hover:bg-secondary rounded-lg transition-colors"><MoreVertical className="w-4 h-4 text-muted-foreground" /></button>
                                                </td>
                                            </tr>
                                        ))}
                                        {coldLeads.map(l => (
                                            <tr key={l.id} className="hover:bg-secondary/10 transition-colors group">
                                                <td className="px-4 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold">{l.name}</span>
                                                        <span className="text-[10px] text-muted-foreground">{l.company}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold border border-amber-200 uppercase flex items-center gap-1 w-fit">
                                                        <AlertCircle className="w-3 h-3" /> Frio (Sem contato há 15d)
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-xs text-muted-foreground">
                                                    {new Date(l.createdAt).toLocaleDateString()}
                                                </td>
                                                <td className="px-4 py-4 text-right">
                                                    <button
                                                        onClick={() => startFollowUp(l.id)}
                                                        className="opacity-0 group-hover:opacity-100 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-bold shadow-lg shadow-primary/20 transition-all flex items-center gap-2 ml-auto"
                                                    >
                                                        <Zap className="w-3 h-3" /> Iniciar Sequência
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FollowUpSystem;
