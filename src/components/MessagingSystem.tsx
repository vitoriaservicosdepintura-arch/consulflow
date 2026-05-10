import { useState, useEffect } from "react";
import { useLeads } from "@/contexts/LeadContext";
import { useAuth } from "@/contexts/AuthContext";
import { Lead } from "@/types/lead";
import { MessageSquare, Send, User, Copy, Check, Sparkles, MessageCircle, Bot, Zap, BrainCircuit } from "lucide-react";
import { toast } from "sonner";

// Use standard, highly compatible emojis
const MESSAGE_TEMPLATES = {
  prospeccao: [
    {
      title: "Consultoria VIP & Boas-vindas",
      text: (lead: Lead, consultantName: string) =>
        `⭐ *Prezado(a) ${lead.name}*,\n_Espero que o seu dia esteja sendo excepcional._\n\nMe chamo *${consultantName}* e atuo na *Consultoria Imobiliária de Alto Padrão*. Tive o cuidado de selecionar um portfólio exclusivo em *${lead.city || "sua região"}* que se alinha perfeitamente à sua busca por sofisticação e bem-estar.\n\n--- *[ CONSULTORIA VIP ]* ---\n\n✨ *Destaques da Nossa Consultoria:*\n✅ *Localizações de Prestígio:* Os endereços mais cobiçados do mercado.\n✅ *Arquitetura de Grife:* Projetos assinados e acabamento impecável.\n✅ *Privacidade Absoluta:* Ambientes pensados para sua total segurança.\n\nPosso lhe enviar nossa *Apresentação Digital VIP* para que você conheça esses ativos?\n\n*Atenciosamente,* \n⭐ *${consultantName}/Consuflow*`,
    },
    {
      title: "Inteligência Estratégica & Follow-up",
      text: (lead: Lead, consultantName: string) =>
        `📊 *Olá, ${lead.name}*!\n\nEstou acompanhando as últimas movimentações de mercado em *${lead.city || "sua região"}* e detectei uma oportunidade singular que gostaria de compartilhar com você em primeira mão.\n\n--- *[ ESTRATÉGIA ]* ---\n\n📍 *Análise Técnica do Consultor:*\n✅ *Unidade Exclusiva:* Vista definitiva e andar privativo.\n✅ *Gatilho de Valorização:* Região com infraestrutura em expansão.\n✅ *Liquidez Elevada:* Um ativo ideal para compor seu patrimônio.\n\nEstaríamos abertos para uma breve chamada de 5 minutos ainda hoje? \n\n*Atenciosamente,* \n🤝 *${consultantName}*`,
    },
  ],
  vendas: [
    {
      title: "Visita VIP & Experiência Imobiliária",
      text: (lead: Lead, consultantName: string) =>
        `🏠 *${lead.name}*, localizamos a joia rara que você aguardava!\n\nEste imóvel redefine o conceito de morar bem. É a união exata entre luxo, conforto e uma localização que fala por si só.\n\n--- *[ EXPERIÊNCIA VIP ]* ---\n\n✨ *Ficha de Excelência Técnica:*\n📍 *Espacialidade:* Ambientes amplos com iluminação natural.\n📍 *Acabamento:* Materiais nobres e tecnologia integrada.\n📍 *Lazer Privativo:* Um verdadeiro oásis dentro da cidade.\n\nEstou com o acesso liberado. Qual o melhor momento para sua *Visita VIP* personalizada?\n\n*Um forte abraço,* \n🔑 *${consultantName}*`,
    },
    {
      title: "Negociação Elite & Estruturação",
      text: (lead: Lead, consultantName: string) =>
        `📉 *Excelente notícia, ${lead.name}*!\n\nApós uma rodada de negociações estratégicas, conseguimos estruturar uma condição de aquisição extremamente vantajosa para o seu novo imóvel.\n\n--- *[ NEGOCIAÇÃO ]* ---\n\n🔒 *Pilares da Proposta:* \n✅ *Fluxo Personalizado:* Adaptado à sua estratégia de capital.\n✅ *Eficiência Financeira:* Condições exclusivas via nossa rede de parceiros.\n✅ *Segurança Jurídica:* Dossiê completo já validado.\n\nVamos formalizar este próximo passo? Estou à sua disposição.\n\n*Cordialmente,* \n💼 *${consultantName}*`,
    },
  ],
  fechamento: [
    {
      title: "Protocolo de Sucesso & Concretização",
      text: (lead: Lead, consultantName: string) =>
        `✨ *Prezado(a) ${lead.name}*,\n_Hoje é o dia de celebramos a concretização dos seus planos._\n\nSua proposta foi *aprovada com distinção*. Nossa equipe já preparou toda a jornada de fechamento para que sua experiência seja impecável e segura.\n\n--- *[ SUCESSO ]* ---\n\n✅ *Roteiro de Fechamento:*\n📍 *Assinatura Digital:* Conveniência e agilidade via protocolo seguro.\n📍 *Validação Notarial:* Todo o suporte jurídico para a lavratura.\n📍 *Entrega das Chaves:* O início de um novo capítulo em sua vida.\n\nParabéns pela decisão brilhante. Seu patrimônio acaba de subir de patamar.\n\n*Com profunda admiração,* \n⭐ *${consultantName}/Consuflow*`,
    },
    {
      title: "Concierge & Pós-Venda Exclusivo",
      text: (lead: Lead, consultantName: string) =>
        `🥂 *Parabéns pela conquista, ${lead.name}*!\n\nSua nova residência em *${lead.city}* é o símbolo do seu sucesso. Saiba que nossa parceria continua firme através do nosso *Suporte Concierge*.\n\n--- *[ CONCIERGE ]* ---\n\n✨ *Serviços à sua Disposição:*\n✅ Redes de arquitetos e paisagistas de alto padrão.\n✅ Gestão de transferências e suporte burocrático.\n✅ Acompanhamento contínuo de novas oportunidades.\n\nDesejo momentos inesquecíveis em seu novo lar!\n\n*Um grande abraço,* \n🤝 *${consultantName}*`,
    },
  ],
};

const MessagingSystem = () => {
  const { leads, aiAssistantEnabled } = useLeads();
  const { user } = useAuth();
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [category, setCategory] = useState<"prospeccao" | "vendas" | "fechamento">("prospeccao");
  const [customMessage, setCustomMessage] = useState("");
  const [copiedIdx, setCopiedIdx] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);

  useEffect(() => {
    if (aiAssistantEnabled && selectedLead) {
      simulateAiGeneration();
    } else {
      setAiSuggestion(null);
    }
  }, [selectedLead, category, aiAssistantEnabled]);

  const simulateAiGeneration = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const suggestions = {
        prospeccao: `A IA sugere: Abordagem consultiva focada no histórico do lead em ${selectedLead?.city}. Use o gatilho de 'escassez' para novos lançamentos.`,
        vendas: `A IA sugere: Personalize a mensagem citando o faturamento mensal de R$ ${selectedLead?.monthlyRevenue.toLocaleString()} para oferecer imóveis compatíveis com o perfil de investidor.`,
        fechamento: `A IA sugere: Foque em 'tranquilidade jurídica'. Mencione que toda a documentação está verificada em ${selectedLead?.country}.`
      };
      setAiSuggestion(suggestions[category]);
      setIsGenerating(false);
    }, 1500);
  };

  const filteredLeads = leads.filter((l) =>
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.company.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const copyMessage = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(id);
    toast.success("Mensagem copiada!");
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const sendWhatsApp = (text: string) => {
    if (!selectedLead?.phone) {
      toast.error("Lead não possui telefone cadastrado!");
      return;
    }
    const cleanPhone = selectedLead.phone.replace(/\D/g, "");
    // Use the official API format which is more robust for some browsers
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const categories = [
    { key: "prospeccao" as const, label: "Prospecção", emoji: "🎯", color: "from-blue-500 to-indigo-600" },
    { key: "vendas" as const, label: "Vendas", emoji: "💼", color: "from-purple-500 to-fuchsia-600" },
    { key: "fechamento" as const, label: "Fechamento", emoji: "🏠", color: "from-emerald-500 to-teal-600" },
  ];

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20" style={{ background: "var(--gradient-primary)" }}>
            <MessageSquare className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Comunicação Inteligente</h2>
            <p className="text-sm text-muted-foreground">Assistente de mensagens via WhatsApp</p>
          </div>
        </div>

        {aiAssistantEnabled && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-full border border-amber-200">
            <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">IA Conectada</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Lead Selector Panel */}
        <div className="lg:col-span-1 bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col h-[600px]">
          <div className="p-4 border-b border-border bg-secondary/20">
            <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-primary" /> Selecionar Lead
            </h3>
            <div className="relative">
              <input
                placeholder="Pesquisar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-card border border-border text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
              <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredLeads.map((l) => (
              <button
                key={l.id}
                onClick={() => setSelectedLead(l)}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all group flex items-start gap-3 ${selectedLead?.id === l.id ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-secondary text-foreground"}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${selectedLead?.id === l.id ? "bg-white/20" : "bg-primary/10 text-primary"}`}>
                  {l.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold truncate leading-tight">{l.name}</p>
                  <p className={`text-[11px] truncate mt-0.5 ${selectedLead?.id === l.id ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {l.phone || "Sem telefone"}
                  </p>
                </div>
              </button>
            ))}
            {filteredLeads.length === 0 && (
              <div className="py-12 text-center text-muted-foreground">
                <Bot className="w-8 h-8 opacity-20 mx-auto mb-2" />
                <p className="text-xs">Nenhum resultado</p>
              </div>
            )}
          </div>
        </div>

        {/* Messaging Panel */}
        <div className="lg:col-span-3 space-y-4">

          {/* Categories Navigation */}
          <div className="flex gap-2 p-1 bg-secondary/30 rounded-2xl w-fit">
            {categories.map((c) => (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${category === c.key ? `bg-gradient-to-r ${c.color} text-white shadow-lg` : "text-muted-foreground hover:text-foreground"}`}
              >
                <span>{c.emoji}</span> {c.label}
              </button>
            ))}
          </div>

          {selectedLead ? (
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">

              {/* AI Insight Bar */}
              {aiAssistantEnabled && (
                <div className="bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-200/50 rounded-2xl p-4 flex gap-4 items-start ring-1 ring-amber-500/20">
                  <div className="p-2 bg-amber-500 rounded-xl text-white shadow-inner">
                    <BrainCircuit className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h5 className="text-[11px] font-black text-amber-700 uppercase tracking-widest mb-1">Dica Estratégica da IA</h5>
                    {isGenerating ? (
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" />
                        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                        <p className="text-sm text-amber-600 font-medium">Analisando histórico do lead...</p>
                      </div>
                    ) : (
                      <p className="text-sm text-amber-800 font-medium leading-relaxed">{aiSuggestion}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Template Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {MESSAGE_TEMPLATES[category].map((tpl, idx) => {
                  const messageText = tpl.text(selectedLead, user.name);
                  const cardId = `${category}-${idx}`;
                  return (
                    <div key={cardId} className="bg-card rounded-2xl border border-border overflow-hidden flex flex-col group hover:shadow-xl hover:border-primary/30 transition-all duration-300">
                      <div className="p-4 border-b border-border bg-secondary/10 flex items-center justify-between">
                        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">{tpl.title}</h4>
                        <div className="flex gap-1">
                          <button
                            onClick={() => copyMessage(messageText, cardId)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            title="Copiar"
                          >
                            {copiedIdx === cardId ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="p-5 flex-1 bg-secondary/5">
                        <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed font-medium">
                          {messageText}
                        </p>
                      </div>
                      <div className="p-4 border-t border-border bg-card flex gap-2">
                        <button
                          onClick={() => sendWhatsApp(messageText)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#25D366] text-white rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-md shadow-green-500/20"
                        >
                          <MessageCircle className="w-4 h-4" /> Enviar WhatsApp
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Manual/Custom Message */}
              <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Mensagem Personalizada</h4>
                  {aiAssistantEnabled && (
                    <button onClick={simulateAiGeneration} className="text-[10px] font-bold text-primary flex items-center gap-1 hover:underline">
                      <Zap className="w-3 h-3" /> Solicitar Revisão IA
                    </button>
                  )}
                </div>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder={`Redija uma mensagem única para ${selectedLead.name}...`}
                  className="w-full p-4 rounded-xl bg-secondary/30 border border-border text-sm text-foreground min-h-[140px] focus:border-primary outline-none transition-all placeholder:text-muted-foreground/50"
                />
                <div className="flex justify-end gap-3 mt-4">
                  <button
                    onClick={() => sendWhatsApp(customMessage)}
                    disabled={!customMessage}
                    className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/20"
                  >
                    <Send className="w-4 h-4" /> Enviar Personalizada
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-card rounded-3xl border-2 border-dashed border-border p-24 text-center">
              <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mx-auto mb-6">
                <Bot className="w-10 h-10 text-muted-foreground" />
              </div>
              <h4 className="text-xl font-bold text-foreground mb-2">Configure sua comunicação</h4>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Selecione um dos seus leads na lista ao lado para desbloquear o assistente inteligente e os templates de WhatsApp.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessagingSystem;
