import { useState, useEffect } from "react";
import { Lead, FunnelStage, FUNNEL_STAGES, BRAZIL_STATES, PORTUGAL_DISTRICTS } from "@/types/lead";
import { useLeads } from "@/contexts/LeadContext";
import { X } from "lucide-react";

interface Props {
  lead?: Lead | Partial<Lead> | null;
  onClose: () => void;
}

const emptyForm = {
  name: "", email: "", phone: "", position: "", company: "",
  notes: "", monthlyRevenue: 0, city: "", country: "Brasil" as const,
  state: "", funnelStage: "Novo Lead" as FunnelStage,
};

const LeadForm = ({ lead, onClose }: Props) => {
  const { addLead, updateLead } = useLeads();
  const [form, setForm] = useState(lead ? { ...lead } : { ...emptyForm });

  useEffect(() => {
    if (lead) setForm({ ...lead });
    else setForm({ ...emptyForm });
  }, [lead]);

  const set = (key: string, val: string | number) =>
    setForm((p) => ({ ...p, [key]: val }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (lead && 'id' in lead) {
      updateLead(lead.id, form);
    } else {
      addLead(form as any);
    }
    onClose();
  };

  const regionOptions = form.country === "Brasil" ? BRAZIL_STATES : PORTUGAL_DISTRICTS;
  const regionLabel = form.country === "Brasil" ? "UF" : "Distrito";

  const inputClass = "w-full px-3 py-2.5 rounded-lg bg-secondary/50 border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-foreground text-sm";
  const labelClass = "block text-xs font-medium text-muted-foreground mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {lead ? "Editar Lead" : "Novo Lead"}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Nome *</label>
              <input className={inputClass} value={form.name} onChange={(e) => set("name", e.target.value)} required />
            </div>
            <div>
              <label className={labelClass}>E-mail</label>
              <input type="email" className={inputClass} value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Telefone</label>
              <input className={inputClass} value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Cargo</label>
              <input className={inputClass} value={form.position} onChange={(e) => set("position", e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Empresa</label>
              <input className={inputClass} value={form.company} onChange={(e) => set("company", e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Faturamento Mensal (R$)</label>
              <input type="number" className={inputClass} value={form.monthlyRevenue} onChange={(e) => set("monthlyRevenue", Number(e.target.value))} />
            </div>
            <div>
              <label className={labelClass}>País</label>
              <select className={inputClass} value={form.country} onChange={(e) => { set("country", e.target.value); set("state", ""); }}>
                <option>Brasil</option>
                <option>Portugal</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>{regionLabel}</label>
              <select className={inputClass} value={form.state} onChange={(e) => set("state", e.target.value)}>
                <option value="">Selecione...</option>
                {regionOptions.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Cidade</label>
              <input className={inputClass} value={form.city} onChange={(e) => set("city", e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Etapa do Funil</label>
              <select className={inputClass} value={form.funnelStage} onChange={(e) => set("funnelStage", e.target.value)}>
                {FUNNEL_STAGES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Observações</label>
            <textarea className={inputClass + " min-h-[80px] resize-y"} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-foreground hover:bg-secondary transition-colors text-sm font-medium">
              Cancelar
            </button>
            <button type="submit" className="flex-1 py-2.5 rounded-xl text-primary-foreground font-medium text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: "var(--gradient-primary)" }}>
              {lead ? "Salvar" : "Criar Lead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LeadForm;
