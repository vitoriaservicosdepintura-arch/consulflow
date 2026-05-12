// Dashboard Principal do Consuflow - Versão Otimizada
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLeads } from "@/contexts/LeadContext";
import { Lead, FUNNEL_STAGES } from "@/types/lead";
import KPICards from "./KPICards";
import LeadTable from "./LeadTable";
import KanbanBoard from "./KanbanBoard";
import LeadForm from "./LeadForm";
import PDFReports from "./PDFReports";
import MessagingSystem from "./MessagingSystem";
import TextEditor from "./TextEditor";
import Spreadsheet from "./Spreadsheet";
import GoogleMapsSearch from "./GoogleMapsSearch";
import DocumentationLinks from "./DocumentationLinks";
import SalesAnalytics from "./SalesAnalytics";
import UserProfile from "./UserProfile";
import PDFEditor from "./PDFEditor";
import SmartScheduling from "./SmartScheduling";
import FollowUpSystem from "./FollowUpSystem";
import WhatsAppAICenter from "./WhatsAppAICenter";
import WhatsAppLeadImporter from "./WhatsAppLeadImporter";
import EditorsHub from "./EditorsHub";
import { toast } from "sonner";



import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Building2, Search, Plus, Table2, Columns3, Download, LogOut, Filter,
  FileText, MessageSquare, MapPin, Globe, BarChart3, Sheet, User, Bell, Sparkles,
  FileSpreadsheet, Image as ImageIcon, FileCheck, FileSearch, Calendar as CalendarIcon,
  RotateCcw, MessageCircle, UserPlus
} from "lucide-react";

import { useEffect } from "react";

import { LucideIcon } from "lucide-react";

type Tab = "dashboard" | "leads" | "reports" | "messages" | "whatsapp-ia" | "editors" | "editor" | "spreadsheet" | "pdf-editor" | "scheduling" | "follow-up" | "maps" | "docs" | "profile";




const TAB_CONFIG: { key: Tab; label: string; icon: LucideIcon }[] = [
  { key: "dashboard", label: "Dashboard", icon: BarChart3 },
  { key: "leads", label: "Leads", icon: Table2 },
  { key: "reports", label: "Relatórios", icon: FileText },
  { key: "whatsapp-ia", label: "WhatsApp IA", icon: MessageCircle },
  { key: "messages", label: "Mensagens", icon: MessageSquare },
  { key: "editors", label: "Editores", icon: FileSearch },
  { key: "scheduling", label: "Agendamentos", icon: CalendarIcon },
  { key: "follow-up", label: "Follow-ups", icon: RotateCcw },
  { key: "maps", label: "Maps", icon: MapPin },
  { key: "docs", label: "Documentação", icon: Globe },
];

const Dashboard = () => {
  const { logout, user, showWelcome, setShowWelcome } = useAuth();
  const { leads, aiAssistantEnabled, autoOrganizeLeads } = useLeads();

  useEffect(() => {
    if (showWelcome) {
      setTimeout(() => {
        toast(`Bem-vindo de volta, ${user.name}!`, {
          description: "Pronto para fechar novos negócios hoje?",
          icon: <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />,
        });
      }, 1000);
      setShowWelcome(false);
    }
  }, [showWelcome, user.name, setShowWelcome]);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [view, setView] = useState<"table" | "kanban">("table");
  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const openEdit = (lead: Lead) => { setEditLead(lead); setFormOpen(true); };
  const openNew = () => { setEditLead(null); setFormOpen(true); };
  const closeForm = () => { setFormOpen(false); setEditLead(null); };

  const getExportData = () => {
    const data = leads.map(l => ({
      "Data": new Date(l.createdAt).toLocaleDateString("pt-BR"),
      "Nome": l.name,
      "Email": l.email,
      "Telefone": l.phone,
      "Cargo": l.position,
      "Empresa": l.company,
      "Faturamento": l.monthlyRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      "Cidade": l.city,
      "Estado": l.state,
      "País": l.country,
      "Etapa": l.funnelStage,
      "Notas": l.notes
    }));
    return data;
  };

  const exportExcel = () => {
    const data = getExportData();
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads");

    // Add Admin Info Info (optional, as a separate sheet or below data)
    const adminInfo = [
      ["RELATÓRIO DE LEADS - CONSUFLOW"],
      ["Gerado por:", user.name],
      ["Email Admin:", user.email],
      ["Data:", new Date().toLocaleString("pt-BR")],
      []
    ];
    const adminWs = XLSX.utils.aoa_to_sheet(adminInfo);
    XLSX.utils.book_append_sheet(wb, adminWs, "Metadados");

    XLSX.writeFile(wb, `Leads_Consuflow_${new Date().getTime()}.xlsx`);
    toast.success("Excel gerado com sucesso!");
  };

  const exportPDF = () => {
    try {
      const doc = new jsPDF('l', 'mm', 'a4');
      const data = getExportData();

      doc.setFontSize(20);
      doc.text("Relatório de Leads - Consuflow", 14, 15);

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Gerado por: ${user.name} (${user.email})`, 14, 22);
      doc.text(`Data: ${new Date().toLocaleString("pt-BR")}`, 14, 27);

      const headers = [["Data", "Nome", "Empresa", "Etapa", "Faturamento", "Cidade"]];
      const body = data.map(l => [l.Data, l.Nome, l.Empresa, l.Etapa, l.Faturamento, l.Cidade]);

      autoTable(doc, {
        startY: 35,
        head: headers,
        body: body,
        theme: 'striped',
        headStyles: { fillColor: [99, 102, 241] } // Using RGB for #6366f1
      });

      doc.save(`Leads_Consuflow_${new Date().getTime()}.pdf`);
      toast.success("PDF gerado com sucesso!");
    } catch (error) {
      console.error("Erro PDF:", error);
      toast.error("Falha ao gerar o documento PDF");
    }
  };

  const exportWord = () => {
    const data = getExportData();
    const content = `
      <div style="font-family: Arial, sans-serif;">
        <h1 style="color: #6366f1;">Relatório de Leads - Consuflow</h1>
        <p><strong>Gerado por:</strong> ${user.name} (${user.email})</p>
        <p><strong>Data:</strong> ${new Date().toLocaleString("pt-BR")}</p>
        <hr/>
        <table border="1" style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <tr style="background-color: #f3f4f6;">
            <th style="padding: 8px;">Data</th>
            <th style="padding: 8px;">Nome</th>
            <th style="padding: 8px;">Empresa</th>
            <th style="padding: 8px;">Etapa</th>
            <th style="padding: 8px;">Faturamento</th>
          </tr>
          ${data.map(l => `
            <tr>
              <td style="padding: 8px;">${l.Data}</td>
              <td style="padding: 8px;">${l.Nome}</td>
              <td style="padding: 8px;">${l.Empresa}</td>
              <td style="padding: 8px;">${l.Etapa}</td>
              <td style="padding: 8px;">${l.Faturamento}</td>
            </tr>
          `).join('')}
        </table>
      </div>
    `;

    const blob = new Blob(['\ufeff', content], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Leads_Consuflow_${new Date().getTime()}.doc`;
    a.click();
    toast.success("Arquivo Word gerado!");
  };

  const exportPNG = async () => {
    const tableElement = document.getElementById('leads-table-container');
    if (!tableElement) {
      toast.error("Erro ao localizar tabela para exportação");
      return;
    }

    toast.info("Processando imagem...");
    try {
      const canvas = await html2canvas(tableElement, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false
      });

      const link = document.createElement('a');
      link.download = `Leads_Consuflow_${new Date().getTime()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success("Imagem PNG gerada!");
    } catch (error) {
      toast.error("Erro ao gerar imagem");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between px-4 md:px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
              <Building2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground leading-tight">CRM SVG Multimídia</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Logado como: <span className="text-primary font-medium">{user.name}</span></p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-secondary/50 rounded-full border border-border">
              <div className={`w-2 h-2 rounded-full ${aiAssistantEnabled ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-gray-400'}`}></div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sistema {aiAssistantEnabled ? 'Auto-Organizável' : 'Manual'}</span>
            </div>

            <button className="relative p-2 text-muted-foreground hover:text-primary transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-card"></span>
            </button>

            <button
              onClick={() => setTab("profile")}
              className={`flex items-center gap-2 pl-2 pr-1 py-1 rounded-full border transition-all group ${tab === 'profile' ? 'border-primary bg-primary/10' : 'border-border bg-secondary/30 hover:bg-secondary'}`}
            >
              <span className="text-xs font-semibold text-foreground hidden sm:block pl-1">{user.name.split(' ')[0]}</span>
              <img src={user.photo} className="w-8 h-8 rounded-full border border-border group-hover:scale-105 transition-transform object-cover" />
            </button>

            <button onClick={logout} title="Sair do sistema" className="p-2 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation tabs */}
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 overflow-x-auto custom-scrollbar">
          <div className="flex gap-1 pb-1">
            {TAB_CONFIG.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-4 py-3 rounded-t-xl text-[11px] font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-300 border-b-2 relative group ${tab === t.key
                  ? "border-blue-600 text-blue-600 bg-blue-50/80 shadow-[0_-4px_15px_-5px_rgba(37,99,235,0.15)]"
                  : "border-transparent text-slate-500 hover:text-blue-600 hover:bg-blue-50/40 hover:-translate-y-0.5"
                  }`}
              >
                <t.icon className={`w-4.5 h-4.5 transition-all duration-300 group-hover:scale-125 ${tab === t.key ? 'text-blue-600 scale-110' : 'text-slate-400 group-hover:text-blue-500'}`} />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 md:px-6 py-6 space-y-6">
        {tab === "dashboard" && (
          <div className="space-y-6">
            <KPICards />
            <SalesAnalytics />
          </div>
        )}
        {tab === "leads" && (
          <>
            <KPICards />
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input placeholder="Buscar leads..." value={search} onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm text-foreground" />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <select value={filterStage} onChange={(e) => setFilterStage(e.target.value)}
                  className="pl-10 pr-8 py-2.5 rounded-xl bg-card border border-border focus:border-primary outline-none text-sm text-foreground appearance-none cursor-pointer">
                  <option value="">Todas etapas</option>
                  {FUNNEL_STAGES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex bg-secondary rounded-xl p-0.5">
                <button onClick={() => setView("table")}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${view === "table" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  <Table2 className="w-3.5 h-3.5" /> Tabela
                </button>
                <button onClick={() => setView("kanban")}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${view === "kanban" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  <Columns3 className="w-3.5 h-3.5" /> Kanban
                </button>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground hover:bg-secondary transition-colors">
                    <Download className="w-4 h-4" /> Exportar
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 border-border shadow-2xl">
                  <DropdownMenuLabel className="px-2 py-1.5 text-xs font-bold text-muted-foreground uppercase">Formato de Arquivo</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={exportExcel} className="rounded-xl flex items-center gap-3 px-3 py-2.5 cursor-pointer">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">Microsoft Excel</span>
                      <span className="text-[10px] text-muted-foreground">Planilha de dados (.xlsx)</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportWord} className="rounded-xl flex items-center gap-3 px-3 py-2.5 cursor-pointer">
                    <FileText className="w-4 h-4 text-blue-500" />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">Microsoft Word</span>
                      <span className="text-[10px] text-muted-foreground">Relatório editável (.doc)</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportPDF} className="rounded-xl flex items-center gap-3 px-3 py-2.5 cursor-pointer">
                    <FileCheck className="w-4 h-4 text-red-500" />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">Documento PDF</span>
                      <span className="text-[10px] text-muted-foreground">Pronto para impressão (.pdf)</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportPNG} className="rounded-xl flex items-center gap-3 px-3 py-2.5 cursor-pointer">
                    <ImageIcon className="w-4 h-4 text-purple-500" />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">Imagem PNG</span>
                      <span className="text-[10px] text-muted-foreground">Captura de tela (.png)</span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <button
                onClick={() => setImportOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold border border-emerald-500/60 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <MessageCircle className="w-4 h-4" /> Importar WhatsApp
              </button>
              <button onClick={openNew}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-primary-foreground hover:scale-[1.02] active:scale-[0.98] transition-all"
                style={{ background: "var(--gradient-primary)" }}>
                <Plus className="w-4 h-4" /> Novo Lead
              </button>
              {aiAssistantEnabled && (
                <button onClick={() => { autoOrganizeLeads(); toast.success("CRM Organizado com sucesso!", { icon: <Sparkles className="w-4 h-4" /> }); }}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-all">
                  <Sparkles className="w-4 h-4" /> Auto-Organizar
                </button>
              )}
            </div>
            <div id="leads-table-container" className="bg-card rounded-2xl overflow-hidden border border-border p-1">
              {/* Export Header (Visible only in PNG export via logic or keep it clean) */}
              <div className="hidden export-only p-6 border-b border-border bg-secondary/10">
                <h1 className="text-2xl font-bold text-primary">Relatório Consuflow</h1>
                <p className="text-sm text-muted-foreground">Admin: {user.name} | Data: {new Date().toLocaleString()}</p>
              </div>

              {view === "table" ? (
                <LeadTable search={search} filterStage={filterStage} onEdit={openEdit} />
              ) : (
                <KanbanBoard search={search} onEdit={openEdit} />
              )}
            </div>
          </>
        )}
        {tab === "reports" && <PDFReports />}
        {tab === "whatsapp-ia" && <WhatsAppAICenter />}
        {tab === "messages" && <MessagingSystem />}
        {tab === "editors" && <EditorsHub onSelect={setTab} />}
        {tab === "editor" && <TextEditor />}
        {tab === "spreadsheet" && <Spreadsheet />}
        {tab === "pdf-editor" && <PDFEditor />}
        {tab === "scheduling" && <SmartScheduling />}
        {tab === "follow-up" && <FollowUpSystem />}
        {tab === "maps" && <GoogleMapsSearch />}


        {tab === "docs" && <DocumentationLinks />}
        {tab === "profile" && <UserProfile />}
      </main>

      {formOpen && <LeadForm lead={editLead} onClose={closeForm} />}
      {importOpen && <WhatsAppLeadImporter onClose={() => setImportOpen(false)} />}
    </div>
  );
};

export default Dashboard;
