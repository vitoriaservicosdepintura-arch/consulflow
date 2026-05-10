import { useLeads } from "@/contexts/LeadContext";
import { FUNNEL_STAGES } from "@/types/lead";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FileDown, BarChart3, PieChart, Users } from "lucide-react";

const PDFReports = () => {
  const { leads } = useLeads();

  const generateFullReport = () => {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(30, 64, 175);
    doc.rect(0, 0, pageW, 40, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("Controle de Leads 2026", pageW / 2, 18, { align: "center" });
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Relatório Completo — ${new Date().toLocaleDateString("pt-BR")}`, pageW / 2, 30, { align: "center" });

    // KPIs
    doc.setTextColor(30, 30, 30);
    let y = 55;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Resumo Geral", 14, y);
    y += 10;

    const total = leads.length;
    const ganhos = leads.filter((l) => l.funnelStage === "Ganho").length;
    const perdidos = leads.filter((l) => l.funnelStage === "Perdido").length;
    const emAndamento = leads.filter((l) => !["Ganho", "Perdido", "Sem interesse"].includes(l.funnelStage)).length;
    const totalRevenue = leads.reduce((s, l) => s + l.monthlyRevenue, 0);
    const avgRevenue = total > 0 ? totalRevenue / total : 0;

    const kpis = [
      ["Total de Leads", String(total)],
      ["Em Andamento", String(emAndamento)],
      ["Ganhos", String(ganhos)],
      ["Perdidos", String(perdidos)],
      ["Taxa de Conversão", total > 0 ? `${((ganhos / total) * 100).toFixed(1)}%` : "0%"],
      ["Faturamento Total", `R$ ${totalRevenue.toLocaleString("pt-BR")}`],
      ["Faturamento Médio", `R$ ${avgRevenue.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`],
    ];

    autoTable(doc, {
      startY: y,
      head: [["Indicador", "Valor"]],
      body: kpis,
      theme: "grid",
      headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: "bold" },
      styles: { fontSize: 10, cellPadding: 4 },
      columnStyles: { 0: { fontStyle: "bold" } },
    });

    y = (doc as any).lastAutoTable.finalY + 15;

    // Leads by funnel stage
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Leads por Etapa do Funil", 14, y);
    y += 8;

    const stageData = FUNNEL_STAGES.map((s) => [s, String(leads.filter((l) => l.funnelStage === s).length)]);

    autoTable(doc, {
      startY: y,
      head: [["Etapa", "Quantidade"]],
      body: stageData,
      theme: "striped",
      headStyles: { fillColor: [30, 64, 175], textColor: 255 },
      styles: { fontSize: 10, cellPadding: 3 },
    });

    y = (doc as any).lastAutoTable.finalY + 15;

    // Leads by country
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Leads por País", 14, y);
    y += 8;

    const brasil = leads.filter((l) => l.country === "Brasil").length;
    const portugal = leads.filter((l) => l.country === "Portugal").length;

    autoTable(doc, {
      startY: y,
      head: [["País", "Quantidade"]],
      body: [["Brasil", String(brasil)], ["Portugal", String(portugal)]],
      theme: "striped",
      headStyles: { fillColor: [30, 64, 175], textColor: 255 },
      styles: { fontSize: 10, cellPadding: 3 },
    });

    y = (doc as any).lastAutoTable.finalY + 15;

    // Top leads by revenue
    if (y > 200) { doc.addPage(); y = 20; }
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Top 10 Leads por Faturamento", 14, y);
    y += 8;

    const topLeads = [...leads].sort((a, b) => b.monthlyRevenue - a.monthlyRevenue).slice(0, 10);

    autoTable(doc, {
      startY: y,
      head: [["Nome", "Empresa", "Cidade", "Faturamento", "Etapa"]],
      body: topLeads.map((l) => [
        l.name, l.company, l.city,
        `R$ ${l.monthlyRevenue.toLocaleString("pt-BR")}`,
        l.funnelStage,
      ]),
      theme: "striped",
      headStyles: { fillColor: [30, 64, 175], textColor: 255 },
      styles: { fontSize: 9, cellPadding: 3 },
    });

    // Full lead list on new page
    doc.addPage();
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Lista Completa de Leads", 14, 20);

    autoTable(doc, {
      startY: 28,
      head: [["Data", "Nome", "E-mail", "Telefone", "Empresa", "Cidade", "Etapa"]],
      body: leads.map((l) => [
        new Date(l.createdAt).toLocaleDateString("pt-BR"),
        l.name, l.email, l.phone, l.company, l.city, l.funnelStage,
      ]),
      theme: "striped",
      headStyles: { fillColor: [30, 64, 175], textColor: 255 },
      styles: { fontSize: 8, cellPadding: 2 },
    });

    // Footer on all pages
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(`Controle de Leads 2026 — Página ${i} de ${pages}`, pageW / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });
    }

    doc.save("relatorio-leads-2026.pdf");
  };

  const generateStagePDF = (stageName: string) => {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const stageLeads = leads.filter((l) => l.funnelStage === stageName);

    doc.setFillColor(30, 64, 175);
    doc.rect(0, 0, pageW, 35, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(`Leads — ${stageName}`, pageW / 2, 15, { align: "center" });
    doc.setFontSize(10);
    doc.text(`${stageLeads.length} leads | ${new Date().toLocaleDateString("pt-BR")}`, pageW / 2, 27, { align: "center" });

    autoTable(doc, {
      startY: 45,
      head: [["Nome", "E-mail", "Telefone", "Empresa", "Cidade", "Faturamento"]],
      body: stageLeads.map((l) => [
        l.name, l.email, l.phone, l.company, l.city,
        `R$ ${l.monthlyRevenue.toLocaleString("pt-BR")}`,
      ]),
      theme: "striped",
      headStyles: { fillColor: [30, 64, 175], textColor: 255 },
      styles: { fontSize: 9, cellPadding: 3 },
    });

    doc.save(`leads-${stageName.toLowerCase().replace(/\s+/g, "-")}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
          <BarChart3 className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Relatórios PDF</h2>
          <p className="text-sm text-muted-foreground">Gere relatórios detalhados para download</p>
        </div>
      </div>

      {/* Full report card */}
      <button onClick={generateFullReport}
        className="w-full bg-card rounded-xl border border-border p-6 text-left hover:shadow-lg hover:border-primary/30 transition-all group">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-primary/10 group-hover:bg-primary/20 transition-colors">
            <FileDown className="w-7 h-7 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">Relatório Completo</h3>
            <p className="text-sm text-muted-foreground mt-1">KPIs, funil de vendas, top leads, lista completa — tudo em um PDF profissional</p>
          </div>
          <span className="px-4 py-2 rounded-xl text-sm font-medium text-primary-foreground transition-all group-hover:scale-105"
            style={{ background: "var(--gradient-primary)" }}>Baixar PDF</span>
        </div>
      </button>

      {/* Per-stage reports */}
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Relatórios por Etapa</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {FUNNEL_STAGES.map((stage) => {
          const count = leads.filter((l) => l.funnelStage === stage).length;
          return (
            <button key={stage} onClick={() => generateStagePDF(stage)}
              className="bg-card rounded-xl border border-border p-4 text-left hover:shadow-md hover:border-primary/30 transition-all">
              <div className="flex items-center justify-between mb-2">
                <PieChart className="w-4 h-4 text-primary" />
                <span className="text-xs bg-secondary rounded-full px-2 py-0.5 text-muted-foreground">{count}</span>
              </div>
              <p className="text-sm font-medium text-foreground">{stage}</p>
              <p className="text-xs text-muted-foreground mt-1">Baixar relatório</p>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PDFReports;
