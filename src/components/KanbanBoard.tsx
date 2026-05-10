import { useState } from "react";
import { useLeads } from "@/contexts/LeadContext";
import { FUNNEL_STAGES, STAGE_COLORS, FunnelStage, Lead } from "@/types/lead";
import { GripVertical, Edit, Sparkles } from "lucide-react";

interface Props {
  search: string;
  onEdit: (lead: Lead) => void;
}

const KanbanBoard = ({ search, onEdit }: Props) => {
  const { leads, moveLead, aiAssistantEnabled } = useLeads();
  const [dragging, setDragging] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<FunnelStage | null>(null);

  const filtered = leads.filter((l) => {
    const q = search.toLowerCase();
    return !q || l.name.toLowerCase().includes(q) || l.company.toLowerCase().includes(q);
  });

  const handleDragStart = (id: string) => setDragging(id);
  const handleDragEnd = () => { setDragging(null); setOverStage(null); };
  const handleDrop = (stage: FunnelStage) => {
    setOverStage(null);
  };

  const getAiAdvice = (stage: FunnelStage) => {
    switch (stage) {
      case "Novo Lead": return "Contate em 5 min para máxima conversão.";
      case "Em atendimento IA": return "A IA está qualificando o interesse do lead.";
      case "Atendimento Humano": return "O lead solicitou falar com o corretor. Ligue agora!";
      case "Reunião Agendada": return "Prepare a apresentação do imóvel escolhido.";
      case "Proposta Enviada": return "Acompanhe a decisão e ofereça opções de parcelamento.";
      case "Ganho": return "Peça indicações e inicie o pós-venda.";
      default: return null;
    }
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: 400 }}>
      {FUNNEL_STAGES.map((stage) => {
        const stageLeads = filtered.filter((l) => l.funnelStage === stage);
        const isOver = overStage === stage;
        return (
          <div key={stage}
            className={`flex-shrink-0 w-64 rounded-xl border transition-all duration-200 ${isOver ? "border-primary bg-primary/5" : "border-border bg-secondary/20"}`}
            onDragOver={(e) => { e.preventDefault(); setOverStage(stage); }}
            onDragLeave={() => setOverStage(null)}
            onDrop={() => handleDrop(stage)}>
            <div className="p-3 border-b border-border flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${STAGE_COLORS[stage]}`} />
              <span className="text-xs font-semibold text-foreground truncate">{stage}</span>
              <span className="ml-auto text-xs text-muted-foreground bg-secondary rounded-full px-2 py-0.5">{stageLeads.length}</span>
            </div>
            <div className="p-2 space-y-2 min-h-[60px]">
              {stageLeads.map((l) => (
                <div key={l.id}
                  draggable
                  onDragStart={() => handleDragStart(l.id)}
                  onDragEnd={handleDragEnd}
                  className={`bg-card rounded-lg p-3 border border-border shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-all group ${dragging === l.id ? "opacity-50" : ""}`}>
                  <div className="flex items-start gap-2">
                    <GripVertical className="w-4 h-4 text-muted-foreground/50 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{l.name}</p>
                      {l.company && <p className="text-xs text-muted-foreground truncate">{l.company}</p>}

                      {l.tags && l.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {l.tags.map(tag => (
                            <span key={tag} className="text-[8px] px-1 py-0.5 rounded-md bg-secondary text-foreground border border-border font-bold">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {l.monthlyRevenue > 0 && (
                        <p className="text-xs text-primary font-medium mt-1">R$ {l.monthlyRevenue.toLocaleString("pt-BR")}</p>
                      )}

                      {aiAssistantEnabled && getAiAdvice(l.funnelStage) && (
                        <div className="mt-2 p-1.5 bg-amber-50 rounded border border-amber-100 flex items-start gap-1.5 animate-in fade-in zoom-in duration-300">
                          <Sparkles className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                          <p className="text-[10px] text-amber-700 leading-tight font-medium italic">IA: {getAiAdvice(l.funnelStage)}</p>
                        </div>
                      )}
                    </div>
                    <button onClick={() => onEdit(l)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-primary/10 text-primary transition-all">
                      <Edit className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default KanbanBoard;
