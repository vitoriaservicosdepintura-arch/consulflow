import { useLeads } from "@/contexts/LeadContext";
import { Users, Trophy, XCircle, TrendingUp } from "lucide-react";

const KPICards = () => {
  const { leads } = useLeads();
  const total = leads.length;
  const ganhos = leads.filter((l) => l.funnelStage === "Ganho").length;
  const perdidos = leads.filter((l) => l.funnelStage === "Perdido").length;
  const emAndamento = leads.filter((l) =>
    !["Ganho", "Perdido", "Sem interesse"].includes(l.funnelStage)
  ).length;

  const cards = [
    { label: "Total de Leads", value: total, icon: Users, gradient: "var(--gradient-primary)" },
    { label: "Em Andamento", value: emAndamento, icon: TrendingUp, gradient: "linear-gradient(135deg, hsl(200 85% 50%), hsl(200 85% 35%))" },
    { label: "Ganhos", value: ganhos, icon: Trophy, gradient: "linear-gradient(135deg, hsl(145 65% 42%), hsl(145 65% 30%))" },
    { label: "Perdidos", value: perdidos, icon: XCircle, gradient: "var(--gradient-accent)" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c, i) => (
        <div key={c.label} className="bg-card rounded-xl p-5 border border-border shadow-sm hover:shadow-md transition-all duration-300 animate-slide-up group"
          style={{ animationDelay: `${i * 100}ms` }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{c.label}</span>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform"
              style={{ background: c.gradient }}>
              <c.icon className="w-4 h-4 text-primary-foreground" />
            </div>
          </div>
          <p className="text-3xl font-bold text-foreground">{c.value}</p>
        </div>
      ))}
    </div>
  );
};

export default KPICards;
