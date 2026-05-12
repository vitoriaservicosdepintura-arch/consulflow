import { useState, useEffect } from "react";
import { useLeads } from "@/contexts/LeadContext";
import {
    X, Search, MessageCircle, UserPlus, CheckSquare, Square,
    RefreshCw, Wifi, WifiOff, Loader2, Check, PhoneCall, Users
} from "lucide-react";
import { toast } from "sonner";

interface WhatsAppContact {
    id: string;
    name: string;
    number: string;
    foto?: string;
    isGroup?: boolean;
}

interface Props {
    onClose: () => void;
}

const WhatsAppLeadImporter = ({ onClose }: Props) => {
    const { addLead, leads } = useLeads();
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";

    const [contacts, setContacts] = useState<WhatsAppContact[]>([]);
    const [loading, setLoading] = useState(true);
    const [connected, setConnected] = useState(false);
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [importing, setImporting] = useState(false);

    // IDs de contatos já salvos como lead (para evitar duplicatas)
    const existingPhones = new Set(leads.map((l) => l.phone.replace(/\D/g, "")));

    useEffect(() => {
        loadContacts();
    }, []);

    const loadContacts = async () => {
        setLoading(true);
        try {
            // Verifica conexão
            const statusRes = await fetch(`${apiUrl}/api/status`);
            if (!statusRes.ok) throw new Error("Backend offline");
            const statusData = await statusRes.json();
            if (statusData.status !== "conectado") {
                setConnected(false);
                setLoading(false);
                return;
            }
            setConnected(true);

            // Carrega contatos
            const res = await fetch(`${apiUrl}/api/contatos`);
            if (!res.ok) throw new Error("Falha ao buscar contatos");
            const data: WhatsAppContact[] = await res.json();

            // Filtra grupos e ordena por nome
            const individuals = data
                .filter((c) => !c.isGroup && c.number)
                .sort((a, b) => a.name.localeCompare(b.name));

            setContacts(individuals);
        } catch {
            setConnected(false);
            toast.error("Não foi possível conectar ao WhatsApp. Verifique a conexão na aba WhatsApp IA.");
        } finally {
            setLoading(false);
        }
    };

    const filtered = contacts.filter((c) => {
        const q = search.toLowerCase();
        return !q || c.name.toLowerCase().includes(q) || c.number.includes(q);
    });

    const isAlreadyLead = (c: WhatsAppContact) =>
        existingPhones.has(c.number.replace(/\D/g, ""));

    const toggleSelect = (id: string, contact: WhatsAppContact) => {
        if (isAlreadyLead(contact)) return;
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const selectAll = () => {
        const eligible = filtered.filter((c) => !isAlreadyLead(c)).map((c) => c.id);
        setSelected(new Set(eligible));
    };

    const deselectAll = () => setSelected(new Set());

    const handleImport = async () => {
        if (selected.size === 0) return;
        setImporting(true);

        const toImport = contacts.filter((c) => selected.has(c.id));

        for (const contact of toImport) {
            const cleanNumber = contact.number.replace(/\D/g, "");
            const formattedPhone = cleanNumber.startsWith("55")
                ? `+${cleanNumber}`
                : `+55${cleanNumber}`;

            addLead({
                name: contact.name,
                phone: formattedPhone,
                email: "",
                position: "",
                company: "",
                notes: `Importado do WhatsApp em ${new Date().toLocaleString("pt-BR")}`,
                monthlyRevenue: 0,
                city: "",
                state: "",
                country: "Brasil",
                funnelStage: "Novo Lead",
                tags: ["📱 WhatsApp"],
            });

            // Pequena pausa para evitar collision nas UUIDs do crypto
            await new Promise((r) => setTimeout(r, 10));
        }

        toast.success(
            `${toImport.length} contato${toImport.length > 1 ? "s" : ""} importado${toImport.length > 1 ? "s" : ""} com sucesso!`,
            { icon: <UserPlus className="w-4 h-4 text-emerald-500" /> }
        );
        setImporting(false);
        onClose();
    };

    const avatarInitial = (name: string) =>
        name?.charAt(0)?.toUpperCase() || "?";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-card rounded-3xl shadow-2xl w-full max-w-xl mx-4 max-h-[90vh] flex flex-col overflow-hidden border border-border animate-slide-up">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-gradient-to-r from-emerald-600 to-teal-600 rounded-t-3xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                            <MessageCircle className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Importar do WhatsApp</h2>
                            <p className="text-[11px] text-emerald-100">
                                Selecione contatos para prospecção
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Status bar */}
                <div className={`flex items-center gap-2 px-6 py-2.5 text-xs font-medium ${connected ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                    {connected
                        ? <><Wifi className="w-3.5 h-3.5" /> WhatsApp conectado — {contacts.length} contatos encontrados</>
                        : <><WifiOff className="w-3.5 h-3.5" /> WhatsApp desconectado. Conecte na aba "WhatsApp IA" primeiro.</>
                    }
                    <button onClick={loadContacts} className="ml-auto p-1 rounded-lg hover:bg-black/5 transition-colors" title="Recarregar">
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                    </button>
                </div>

                {/* Search + Select All */}
                {connected && !loading && (
                    <div className="px-6 py-3 flex gap-2 border-b border-border">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                className="w-full pl-10 pr-4 py-2 rounded-xl bg-secondary/50 border border-border focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-sm transition-all"
                                placeholder="Buscar por nome ou número..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={selected.size > 0 ? deselectAll : selectAll}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-secondary/40 hover:bg-secondary text-xs font-medium text-foreground transition-colors whitespace-nowrap"
                        >
                            {selected.size > 0 ? <Square className="w-3.5 h-3.5" /> : <CheckSquare className="w-3.5 h-3.5" />}
                            {selected.size > 0 ? "Limpar" : "Todos"}
                        </button>
                    </div>
                )}

                {/* Contact List */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                            <p className="text-sm font-medium">Carregando contatos do WhatsApp...</p>
                        </div>
                    ) : !connected ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-4 px-8 text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-3xl flex items-center justify-center">
                                <WifiOff className="w-8 h-8 text-red-400" />
                            </div>
                            <div>
                                <p className="font-semibold text-foreground mb-1">WhatsApp não conectado</p>
                                <p className="text-sm text-muted-foreground">
                                    Vá até a aba <strong>WhatsApp IA</strong>, escaneie o QR Code e volte aqui para importar os contatos.
                                </p>
                            </div>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                            <Users className="w-10 h-10 opacity-30" />
                            <p className="text-sm">Nenhum contato encontrado</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-border/50">
                            {filtered.map((contact) => {
                                const alreadyLead = isAlreadyLead(contact);
                                const isChecked = selected.has(contact.id);
                                return (
                                    <li
                                        key={contact.id}
                                        onClick={() => toggleSelect(contact.id, contact)}
                                        className={`flex items-center gap-3 px-6 py-3 transition-colors ${alreadyLead
                                                ? "opacity-50 cursor-not-allowed bg-secondary/20"
                                                : isChecked
                                                    ? "bg-emerald-50 cursor-pointer"
                                                    : "hover:bg-secondary/30 cursor-pointer"
                                            }`}
                                    >
                                        {/* Avatar */}
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm shrink-0 overflow-hidden">
                                            {contact.foto ? (
                                                <img src={contact.foto} alt={contact.name} className="w-full h-full object-cover" />
                                            ) : (
                                                avatarInitial(contact.name)
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-foreground truncate">{contact.name}</p>
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <PhoneCall className="w-3 h-3 text-muted-foreground" />
                                                <p className="text-[11px] text-muted-foreground">{contact.number}</p>
                                            </div>
                                        </div>

                                        {/* Status */}
                                        <div className="shrink-0">
                                            {alreadyLead ? (
                                                <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-bold">
                                                    Já é Lead
                                                </span>
                                            ) : isChecked ? (
                                                <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                                                    <Check className="w-3 h-3 text-white" />
                                                </div>
                                            ) : (
                                                <div className="w-5 h-5 rounded-full border-2 border-border" />
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                {/* Footer */}
                {connected && !loading && (
                    <div className="px-6 py-4 border-t border-border bg-secondary/20 flex items-center justify-between gap-3">
                        <p className="text-xs text-muted-foreground">
                            {selected.size > 0
                                ? `${selected.size} contato${selected.size > 1 ? "s" : ""} selecionado${selected.size > 1 ? "s" : ""}`
                                : "Nenhum selecionado"}
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleImport}
                                disabled={selected.size === 0 || importing}
                                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
                                style={{ background: "var(--gradient-primary)" }}
                            >
                                {importing ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <UserPlus className="w-4 h-4" />
                                )}
                                {importing ? "Importando..." : `Importar ${selected.size > 0 ? selected.size : ""} Lead${selected.size !== 1 ? "s" : ""}`}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WhatsAppLeadImporter;
