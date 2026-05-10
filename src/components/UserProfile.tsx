import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLeads } from "@/contexts/LeadContext";
import {
    User, Mail, Phone, Camera, Save, Sparkles, Bell,
    CheckCircle2, AlertCircle, Clock, Users, ArrowRight,
    ShieldCheck, Bot, Zap, X
} from "lucide-react";
import { toast } from "sonner";

const UserProfile = () => {
    const { user, updateUser } = useAuth();
    const { aiAssistantEnabled, setAiAssistantEnabled, leads } = useLeads();
    const [formData, setFormData] = useState(user);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSave = () => {
        updateUser(formData);
        toast.success("Perfil atualizado com sucesso!");
    };

    const handlePhotoClick = () => fileInputRef.current?.click();

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setFormData({ ...formData, photo: ev.target?.result as string });
                toast.info("Foto carregada. Clique em salvar para confirmar.");
            };
            reader.readAsDataURL(file);
        }
    };

    // AI Insights Generation
    const aiInsights = [
        { type: "high", text: "3 Leads em 'Negociação' não recebem contato há 48h. A IA sugere envio de proposta revisada.", icon: Zap, color: "text-amber-500", bg: "bg-amber-50" },
        { type: "info", text: "Taxa de conversão subiu 12% após implementação do atendimento IA noturno.", icon: Sparkles, color: "text-blue-500", bg: "bg-blue-50" },
        { type: "success", text: "O Lead 'Roberto Silva' atingiu score 95/100. Agende uma reunião humana imediatamente.", icon: CheckCircle2, color: "text-green-500", bg: "bg-green-50" },
    ];

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column: Basic Info & Photo */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                        <div className="h-24 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
                        <div className="px-6 pb-6 relative">
                            <div className="flex flex-col items-center -mt-12">
                                <div className="relative group">
                                    <img
                                        src={formData.photo || "https://github.com/shadcn.png"}
                                        alt="Profile"
                                        className="w-24 h-24 rounded-2xl border-4 border-card shadow-lg object-cover ring-1 ring-black/5"
                                    />
                                    <button
                                        onClick={handlePhotoClick}
                                        className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity text-white"
                                    >
                                        <Camera className="w-6 h-6" />
                                    </button>
                                </div>
                                <h3 className="mt-4 text-xl font-bold text-foreground">{user.name}</h3>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>

                            <div className="mt-8 space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Nome Completo</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <input
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2 bg-secondary/50 border border-border rounded-xl text-sm focus:border-primary outline-none"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">E-mail Corporativo</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <input
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2 bg-secondary/50 border border-border rounded-xl text-sm focus:border-primary outline-none"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Telefone / Telemóvel</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <input
                                            value={formData.phone}
                                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2 bg-secondary/50 border border-border rounded-xl text-sm focus:border-primary outline-none"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={handleSave}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-[0.98]"
                                >
                                    <Save className="w-4 h-4" /> Salvar Alterações
                                </button>
                            </div>
                        </div>
                    </div>

                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoChange} />

                    {/* AI Control Card */}
                    <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                                <Bot className="w-5 h-5" />
                            </div>
                            <h4 className="font-bold text-foreground">Inteligência Artificial</h4>
                        </div>
                        <p className="text-sm text-muted-foreground mb-6">Ative o assistente para receber orientações passo a passo no seu Kanban e automações de atendimento.</p>

                        <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl border border-border">
                            <span className="text-sm font-medium">Assistente de Vendas IA</span>
                            <button
                                onClick={() => setAiAssistantEnabled(!aiAssistantEnabled)}
                                className={`relative w-11 h-6 transition-colors rounded-full ${aiAssistantEnabled ? "bg-primary" : "bg-gray-300"}`}
                            >
                                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${aiAssistantEnabled ? "translate-x-5" : ""}`} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Columns: AI Notifications & Lead Status */}
                <div className="lg:col-span-2 space-y-6">

                    {/* AI Smart Notifications Panel */}
                    <div className="bg-card rounded-2xl border border-border p-6 shadow-sm ring-1 ring-primary/5">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
                                    <Bell className="w-5 h-5" />
                                </div>
                                <h4 className="font-bold text-foreground">Notificações da Inteligência Artificial</h4>
                            </div>
                            <span className="text-[10px] font-bold text-primary uppercase bg-primary/10 px-2 py-1 rounded">Beta Pro</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                            {[
                                { label: "Novo Lead", color: "bg-blue-500" },
                                { label: "Em atendimento IA", color: "bg-indigo-500" },
                                { label: "Atendimento Humano", color: "bg-purple-500" },
                                { label: "Reunião Agendada", color: "bg-amber-500" },
                                { label: "Proposta Enviada", color: "bg-cyan-500" },
                                { label: "Ganho", color: "bg-green-500" },
                                { label: "Perdido", color: "bg-rose-500" },
                                { label: "Sem interesse", color: "bg-gray-500" },
                            ].map(status => (
                                <div key={status.label} className="flex items-center gap-2 p-3 bg-secondary/50 rounded-xl border border-border">
                                    <div className={`w-2 h-2 rounded-full ${status.color}`} />
                                    <span className="text-[11px] font-medium text-foreground">{status.label}</span>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-3">
                            {aiInsights.map((insight, i) => (
                                <div key={i} className={`flex gap-4 p-4 rounded-2xl border border-border relative overflow-hidden group hover:shadow-md transition-all ${insight.bg}`}>
                                    <div className={`mt-1 ${insight.color}`}>
                                        <insight.icon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-gray-800 leading-relaxed pr-6">{insight.text}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <button className="text-[11px] font-bold text-primary flex items-center gap-1 hover:underline">
                                                Aplicar sugestão <ArrowRight className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                    <button className="absolute top-4 right-4 text-gray-300 hover:text-gray-500 transition-colors">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick Lead Status Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm text-center border-t-4 border-t-green-500">
                            <Trophy className="w-8 h-8 text-green-500 mx-auto mb-2" />
                            <h5 className="text-xs font-bold text-muted-foreground uppercase">Leads Ganhos</h5>
                            <p className="text-2xl font-black text-foreground">{leads.filter(l => l.funnelStage === 'Ganho').length}</p>
                        </div>
                        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm text-center border-t-4 border-t-blue-500">
                            <ShieldCheck className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                            <h5 className="text-xs font-bold text-muted-foreground uppercase">IA Ativos</h5>
                            <p className="text-2xl font-black text-foreground">{Math.floor(leads.length * 0.7)}</p>
                        </div>
                        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm text-center border-t-4 border-t-amber-500">
                            <Clock className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                            <h5 className="text-xs font-bold text-muted-foreground uppercase">Em Atendimento</h5>
                            <p className="text-2xl font-black text-foreground">{leads.filter(l => !['Ganho', 'Perdido'].includes(l.funnelStage)).length}</p>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

const Trophy = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></svg>
);

export default UserProfile;
