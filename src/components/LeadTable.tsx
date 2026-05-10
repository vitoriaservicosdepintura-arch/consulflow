import { useState } from "react";
import { useLeads } from "@/contexts/LeadContext";
import { Lead } from "@/types/lead";
import { STAGE_COLORS } from "@/types/lead";
import { Edit, Trash2, ChevronUp, ChevronDown } from "lucide-react";

interface Props {
  search: string;
  filterStage: string;
  onEdit: (lead: Lead) => void;
}

type SortKey = "createdAt" | "monthlyRevenue";

const LeadTable = ({ search, filterStage, onEdit }: Props) => {
  const { leads, deleteLead } = useLeads();
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filtered = leads
    .filter((l) => {
      const q = search.toLowerCase();
      const matchSearch = !q || l.name.toLowerCase().includes(q) || l.company.toLowerCase().includes(q) || l.city.toLowerCase().includes(q) || l.state.toLowerCase().includes(q);
      const matchStage = !filterStage || l.funnelStage === filterStage;
      return matchSearch && matchStage;
    })
    .sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1;
      if (sortKey === "createdAt") return mul * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      return mul * (a.monthlyRevenue - b.monthlyRevenue);
    });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : null;

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground cursor-pointer" onClick={() => toggleSort("createdAt")}>
                <span className="inline-flex items-center gap-1">Data <SortIcon k="createdAt" /></span>
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nome</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Empresa</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Telefone</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Cidade</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground cursor-pointer" onClick={() => toggleSort("monthlyRevenue")}>
                <span className="inline-flex items-center gap-1">Faturamento <SortIcon k="monthlyRevenue" /></span>
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Etapa</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">Nenhum lead encontrado</td></tr>
            ) : filtered.map((l) => (
              <tr key={l.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                <td className="px-4 py-3 text-muted-foreground">{new Date(l.createdAt).toLocaleDateString("pt-BR")}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-foreground">{l.name}</span>
                    {l.tags && l.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {l.tags.map(tag => (
                          <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold whitespace-nowrap">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{l.company}</td>
                <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{l.phone}</td>
                <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{l.city}</td>
                <td className="px-4 py-3 text-foreground">
                  {l.monthlyRevenue > 0 ? `R$ ${l.monthlyRevenue.toLocaleString("pt-BR")}` : "—"}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium text-primary-foreground ${STAGE_COLORS[l.funnelStage]}`}>
                    {l.funnelStage}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex gap-1">
                    <button onClick={() => onEdit(l)} className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => { if (confirm("Excluir este lead?")) deleteLead(l.id); }} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LeadTable;
