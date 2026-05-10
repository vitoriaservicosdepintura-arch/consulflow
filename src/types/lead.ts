export type FunnelStage =
  | "Novo Lead"
  | "Em atendimento IA"
  | "Atendimento Humano"
  | "Reunião Agendada"
  | "Proposta Enviada"
  | "Ganho"
  | "Perdido"
  | "Sem interesse";

export const FUNNEL_STAGES: FunnelStage[] = [
  "Novo Lead",
  "Em atendimento IA",
  "Atendimento Humano",
  "Reunião Agendada",
  "Proposta Enviada",
  "Ganho",
  "Perdido",
  "Sem interesse",
];

export const STAGE_COLORS: Record<FunnelStage, string> = {
  "Novo Lead": "bg-blue-500",
  "Em atendimento IA": "bg-cyan-500",
  "Atendimento Humano": "bg-indigo-500",
  "Reunião Agendada": "bg-amber-500",
  "Proposta Enviada": "bg-orange-500",
  "Ganho": "bg-emerald-500",
  "Perdido": "bg-red-500",
  "Sem interesse": "bg-gray-400",
};

export const BRAZIL_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

export const PORTUGAL_DISTRICTS = [
  "Aveiro", "Beja", "Braga", "Bragança", "Castelo Branco", "Coimbra", "Évora",
  "Faro", "Guarda", "Leiria", "Lisboa", "Portalegre", "Porto", "Santarém",
  "Setúbal", "Viana do Castelo", "Vila Real", "Viseu", "Açores", "Madeira"
];

export interface Lead {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  company: string;
  notes: string;
  monthlyRevenue: number;
  city: string;
  country: "Brasil" | "Portugal";
  state: string;
  funnelStage: FunnelStage;
  tags?: string[];
  lastActive?: string;
  followUpStatus?: 'active' | 'completed' | 'paused' | 'none';
  followUpStep?: number;
}
