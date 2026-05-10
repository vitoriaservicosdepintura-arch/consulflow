import { useLeads } from "@/contexts/LeadContext";
import {
    ResponsiveContainer, FunnelChart, Funnel, LabelList, Tooltip,
    Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
    PieChart, Pie
} from "recharts";
import { FUNNEL_STAGES } from "@/types/lead";

const SalesAnalytics = () => {
    const { leads } = useLeads();

    // 1. Prepare Funnel Data
    const funnelData = FUNNEL_STAGES.map((stage, index) => ({
        value: leads.filter(l => l.funnelStage === stage).length,
        name: stage,
        fill: [
            "#3b82f6", // Novo Lead (Blue)
            "#6366f1", // Primeiro Contato
            "#8b5cf6", // Qualificado
            "#a855f7", // Negociação
            "#10b981", // Ganho (Green)
            "#ef4444"  // Perdido (Red)
        ][index % 6]
    })).reverse(); // Funnel usually goes from top (broad) to bottom (narrower)

    // 2. Prepare Status Data (Pie)
    const ganhosCount = leads.filter(l => l.funnelStage === "Ganho").length;
    const perdidosCount = leads.filter(l => l.funnelStage === "Perdido").length;
    const emAndamentoCount = leads.length - ganhosCount - perdidosCount;

    const statusData = [
        { name: "Ganhos", value: ganhosCount, color: "#10b981" },
        { name: "Perdidos", value: perdidosCount, color: "#ef4444" },
        { name: "Em Andamento", value: emAndamentoCount, color: "#3b82f6" },
    ];

    // 3. Prepare Bar Data (Distribution by Stage)
    const barData = FUNNEL_STAGES.map(stage => ({
        name: stage,
        leads: leads.filter(l => l.funnelStage === stage).length
    }));

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Funnel Chart Card */}
            <div className="bg-card rounded-2xl p-6 border border-border shadow-sm flex flex-col">
                <h3 className="text-sm font-semibold text-foreground mb-6 flex items-center gap-2">
                    <div className="w-1.5 h-4 bg-primary rounded-full"></div>
                    Funil de Vendas de Leads
                </h3>
                <div className="h-[400px] w-full mt-auto">
                    <ResponsiveContainer width="100%" height="100%">
                        <FunnelChart>
                            <Tooltip
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            />
                            <Funnel
                                data={funnelData}
                                dataKey="value"
                            >
                                <LabelList position="right" fill="#888" stroke="none" dataKey="name" />
                                {funnelData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Funnel>
                        </FunnelChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Pie Chart Card (Performance) */}
            <div className="bg-card rounded-2xl p-6 border border-border shadow-sm flex flex-col">
                <h3 className="text-sm font-semibold text-foreground mb-6 flex items-center gap-2">
                    <div className="w-1.5 h-4 bg-green-500 rounded-full"></div>
                    Performance do Funil
                </h3>
                <div className="h-[400px] w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={statusData}
                                cx="50%"
                                cy="50%"
                                innerRadius={80}
                                outerRadius={120}
                                paddingAngle={8}
                                dataKey="value"
                            >
                                {statusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                    </ResponsiveContainer>
                    {/* Middle text for donut */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                        <span className="text-3xl font-bold text-foreground">{leads.length}</span>
                        <span className="text-[11px] text-muted-foreground uppercase font-medium">Total Leads</span>
                    </div>
                </div>
            </div>

            {/* Bar Chart Card (Detailed Distribution) */}
            <div className="lg:col-span-2 bg-card rounded-2xl p-6 border border-border shadow-sm">
                <h3 className="text-sm font-semibold text-foreground mb-6 flex items-center gap-2">
                    <div className="w-1.5 h-4 bg-purple-500 rounded-full"></div>
                    Distribuição por Etapa
                </h3>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 11, fill: '#94a3b8' }}
                                interval={0}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 11, fill: '#94a3b8' }}
                            />
                            <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                            <Bar
                                dataKey="leads"
                                fill="url(#barGradient)"
                                radius={[6, 6, 0, 0]}
                                barSize={40}
                            />
                            <defs>
                                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8} />
                                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.5} />
                                </linearGradient>
                            </defs>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

        </div>
    );
};

export default SalesAnalytics;
