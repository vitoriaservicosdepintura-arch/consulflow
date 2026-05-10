import { useState } from "react";
import {
    Calendar as CalendarIcon,
    MessageSquare,
    Clock,
    User,
    CheckCircle2,
    AlertCircle,
    Sparkles,
    Search,
    Plus,
    ArrowRight,
    Settings,
    Bell,
    Zap,
    Bot
} from "lucide-react";
import { toast } from "sonner";

interface Appointment {
    id: string;
    clientName: string;
    time: string;
    date: string;
    status: 'confirmed' | 'pending' | 'reminder_sent';
    source: 'whatsapp' | 'manual';
}

const MOCK_APPOINTMENTS: Appointment[] = [
    { id: '1', clientName: 'Roberto Silva', time: '14:30', date: 'Hoje', status: 'confirmed', source: 'whatsapp' },
    { id: '2', clientName: 'Ana Oliveira', time: '16:00', date: 'Hoje', status: 'reminder_sent', source: 'whatsapp' },
    { id: '3', clientName: 'Carlos Santos', time: '09:00', date: 'Amanhã', status: 'pending', source: 'manual' },
    { id: '4', clientName: 'Mariana Costa', time: '11:15', date: 'Amanhã', status: 'confirmed', source: 'whatsapp' },
];

const SmartScheduling = () => {
    const [isAiActive, setIsAiActive] = useState(true);
    const [appointments, setAppointments] = useState<Appointment[]>(MOCK_APPOINTMENTS);

    const toggleAi = () => {
        setIsAiActive(!isAiActive);
        toast.success(isAiActive ? "IA de Agendamento desativada" : "IA de Agendamento ativada!");
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            {/* Header / Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-card p-6 rounded-2xl border border-border flex items-center gap-4 shadow-sm">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <CalendarIcon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Agendamentos Hoje</p>
                        <h3 className="text-2xl font-bold">12</h3>
                    </div>
                </div>

                <div className="bg-card p-6 rounded-2xl border border-border flex items-center gap-4 shadow-sm">
                    <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                        <MessageSquare className="w-6 h-6 text-green-500" />
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Via WhatsApp (IA)</p>
                        <h3 className="text-2xl font-bold">8</h3>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 rounded-2xl border border-white/10 flex items-center justify-between shadow-xl">
                    <div className="flex items-center gap-4 text-white">
                        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                            <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-sm text-white/80 font-medium">Auto-Pilot IA</p>
                            <h3 className="text-2xl font-bold">{isAiActive ? 'Ativado' : 'Desativado'}</h3>
                        </div>
                    </div>
                    <button
                        onClick={toggleAi}
                        className={`w-14 h-7 rounded-full transition-all relative ${isAiActive ? 'bg-green-400' : 'bg-white/20'}`}
                    >
                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${isAiActive ? 'left-8' : 'left-1'}`} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Appointments List */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                        <div className="p-4 border-b border-border flex items-center justify-between bg-secondary/20">
                            <h3 className="font-bold flex items-center gap-2">
                                <Clock className="w-4 h-4 text-primary" /> Próximos Compromissos
                            </h3>
                            <div className="flex gap-2">
                                <button className="p-2 hover:bg-secondary rounded-lg transition-colors">
                                    <Search className="w-4 h-4 text-muted-foreground" />
                                </button>
                                <button className="p-2 hover:bg-secondary rounded-lg transition-colors text-primary font-bold">
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="divide-y divide-border">
                            {appointments.map((apt) => (
                                <div key={apt.id} className="p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-primary font-bold">
                                            {apt.clientName.charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-sm">{apt.clientName}</h4>
                                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                <CalendarIcon className="w-3 h-3" /> {apt.date} às {apt.time}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="flex flex-col items-end">
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${apt.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                                    apt.status === 'reminder_sent' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-amber-100 text-amber-700'
                                                }`}>
                                                {apt.status.replace('_', ' ')}
                                            </span>
                                            {apt.source === 'whatsapp' && (
                                                <span className="text-[9px] text-green-600 flex items-center gap-0.5 mt-1">
                                                    <MessageSquare className="w-2.5 h-2.5" /> IA WhatsApp
                                                </span>
                                            )}
                                        </div>
                                        <button className="p-2 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-all">
                                            <ArrowRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button className="w-full py-3 text-sm text-primary font-medium hover:bg-primary/5 transition-colors border-t border-border">
                            Ver Agenda Completa
                        </button>
                    </div>

                    <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                        <h3 className="font-bold mb-4 flex items-center gap-2">
                            <Bot className="w-5 h-5 text-primary" /> Atividade da IA
                        </h3>
                        <div className="space-y-4">
                            <div className="flex gap-3 items-start">
                                <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center mt-1 shrink-0">
                                    <Bell className="w-4 h-4 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">Lembrete automático enviado para Maria J.</p>
                                    <p className="text-xs text-muted-foreground">Há 15 minutos via WhatsApp</p>
                                </div>
                            </div>
                            <div className="flex gap-3 items-start">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mt-1 shrink-0">
                                    <CheckCircle2 className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">Novo agendamento confirmado: Pedro Henrique</p>
                                    <p className="text-xs text-muted-foreground">Hoje às 10:20 - Negociado pela IA</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Settings / AI Sidebar */}
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-card to-secondary/30 p-6 rounded-2xl border border-border shadow-sm">
                        <h3 className="font-bold mb-4 flex items-center gap-2">
                            <Settings className="w-4 h-4 text-muted-foreground" /> Configurações IA
                        </h3>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border">
                                <div className="flex items-center gap-3">
                                    <Zap className="w-4 h-4 text-amber-500" />
                                    <span className="text-sm font-medium">Confirmação Instantânea</span>
                                </div>
                                <div className="w-10 h-5 rounded-full bg-green-500 relative">
                                    <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border">
                                <div className="flex items-center gap-3">
                                    <Bell className="w-4 h-4 text-primary" />
                                    <span className="text-sm font-medium">Lembrete (2h antes)</span>
                                </div>
                                <div className="w-10 h-5 rounded-full bg-green-500 relative">
                                    <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border">
                                <div className="flex items-center gap-3">
                                    <MessageSquare className="w-4 h-4 text-green-500" />
                                    <span className="text-sm font-medium">Sugestão de Reagendamento</span>
                                </div>
                                <div className="w-10 h-5 rounded-full bg-background border border-border relative">
                                    <div className="absolute left-1 top-1 w-3 h-3 bg-muted rounded-full" />
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/20">
                            <h4 className="text-xs font-bold text-primary uppercase mb-2">Resumo da IA</h4>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Nesta semana, a IA economizou <strong>4.2 horas</strong> de trabalho manual, agendando 18 reuniões sem intervenção humana.
                            </p>
                        </div>
                    </div>

                    <div className="bg-card p-6 rounded-2xl border border-border shadow-sm text-center">
                        <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Bot className="w-8 h-8 text-green-600" />
                        </div>
                        <h4 className="font-bold mb-1">Status do WhatsApp</h4>
                        <p className="text-xs text-muted-foreground mb-4">Conectado ao número +55 (11) 9****-**88</p>
                        <button className="text-xs font-bold text-primary hover:underline">
                            Gerenciar Conexão
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SmartScheduling;
