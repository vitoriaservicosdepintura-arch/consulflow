import { createContext, useContext, useState, ReactNode } from "react";
import { Lead, FunnelStage } from "@/types/lead";

interface LeadContextType {
  leads: Lead[];
  addLead: (lead: Omit<Lead, "id" | "createdAt">) => void;
  updateLead: (id: string, data: Partial<Lead>) => void;
  deleteLead: (id: string) => void;
  moveLead: (id: string, stage: FunnelStage) => void;
  aiAssistantEnabled: boolean;
  setAiAssistantEnabled: (val: boolean) => void;
  autoOrganizeLeads: () => void;
}

const LeadContext = createContext<LeadContextType | null>(null);

export const useLeads = () => {
  const ctx = useContext(LeadContext);
  if (!ctx) throw new Error("useLeads must be inside LeadProvider");
  return ctx;
};

const STORAGE_KEY = "crm_leads";

const loadLeads = (): Lead[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const LeadProvider = ({ children }: { children: ReactNode }) => {
  const [leads, setLeads] = useState<Lead[]>(loadLeads);
  const [aiAssistantEnabled, setAiAssistantEnabled] = useState(() => {
    return localStorage.getItem("crm_ai_assistant") === "true";
  });

  const save = (updated: Lead[]) => {
    setLeads(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const addLead = (data: Omit<Lead, "id" | "createdAt">) => {
    const newLead: Lead = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    save([newLead, ...leads]);
  };

  const updateLead = (id: string, data: Partial<Lead>) => {
    save(leads.map((l) => (l.id === id ? { ...l, ...data } : l)));
  };

  const deleteLead = (id: string) => {
    save(leads.filter((l) => l.id !== id));
  };

  const moveLead = (id: string, stage: FunnelStage) => {
    save(leads.map((l) => (l.id === id ? { ...l, funnelStage: stage } : l)));
  };

  const toggleAi = (val: boolean) => {
    setAiAssistantEnabled(val);
    localStorage.setItem("crm_ai_assistant", String(val));
    if (val) autoOrganizeLeads();
  };

  const autoOrganizeLeads = () => {
    const updated = leads.map(lead => {
      let newStage = lead.funnelStage;
      let newTags = lead.tags ? [...lead.tags] : [];

      // Logic: If "Novo Lead" and has high revenue, move to "Em atendimento IA" and tag as "High Value"
      if (lead.funnelStage === "Novo Lead" && lead.monthlyRevenue > 50000) {
        newStage = "Em atendimento IA";
        if (!newTags.includes("🐋 High Value")) newTags.push("🐋 High Value");
      }

      // Logic: If notes contain "reunion" or "meeting", move to "Reunião Agendada"
      if (lead.notes.toLowerCase().includes("reunião") || lead.notes.toLowerCase().includes("agendar")) {
        newStage = "Reunião Agendada";
        if (!newTags.includes("📅 Hot Lead")) newTags.push("📅 Hot Lead");
      }

      // Add smart labels based on revenue
      if (lead.monthlyRevenue > 100000 && !newTags.includes("💎 VIP")) {
        newTags.push("💎 VIP");
      }

      return { ...lead, funnelStage: newStage, tags: newTags };
    });

    save(updated);
  };

  return (
    <LeadContext.Provider value={{
      leads, addLead, updateLead, deleteLead, moveLead,
      aiAssistantEnabled, setAiAssistantEnabled: toggleAi,
      autoOrganizeLeads
    }}>
      {children}
    </LeadContext.Provider>
  );
};
