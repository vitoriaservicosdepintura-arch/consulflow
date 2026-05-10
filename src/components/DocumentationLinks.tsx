import { useState } from "react";
import { ExternalLink, Building, FileText, Scale, Globe, Plus, Link2, X, Save, Pencil, Trash2 } from "lucide-react";

type LinkItem = { name: string; url: string };
type CategoryMap = { [key: string]: LinkItem[] };
type CountryMap = { Brasil: CategoryMap; Portugal: CategoryMap };

const INITIAL_LINKS: CountryMap = {
  Brasil: {
    "Registro de Imóveis": [
      { name: "Cartório de Registro de Imóveis (CNJ)", url: "https://www.cnj.jus.br/corregedoria/registros_publicos/" },
      { name: "Central de Registradores de Imóveis", url: "https://www.registrodeimoveis.org.br/" },
      { name: "e-Cartório (Registro Online)", url: "https://www.registradores.org.br/" },
    ],
    "Documentação Imobiliária": [
      { name: "Receita Federal (CPF/CNPJ)", url: "https://www.gov.br/receitafederal/" },
      { name: "Portal Gov.br (Documentos)", url: "https://www.gov.br/pt-br" },
      { name: "INSS (Certidão Negativa)", url: "https://meu.inss.gov.br/" },
    ],
    "Regulação e Licenciamento": [
      { name: "CRECI (Conselho de Corretores)", url: "https://www.cofeci.gov.br/" },
      { name: "Código Civil (Legislação)", url: "https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm" },
    ],
    "Impostos e Taxas": [
      { name: "ITBI (Imposto de Transmissão)", url: "https://www.gov.br/pt-br" },
      { name: "Prefeitura (IPTU)", url: "https://www.gov.br/pt-br" },
    ],
  },
  Portugal: {
    "Registro de Imóveis": [
      { name: "Instituto dos Registos e Notariado (IRN)", url: "https://www.irn.mj.pt/" },
      { name: "Predial Online", url: "https://www.predialonline.pt/" },
    ],
    "Documentação Imobiliária": [
      { name: "Portal das Finanças", url: "https://www.portaldasfinancas.gov.pt/" },
      { name: "Certidão Permanente (Online)", url: "https://www.predialonline.pt/" },
    ],
    "Regulação e Licenciamento": [
      { name: "IMPIC (Regulador Imobiliário)", url: "https://www.impic.pt/" },
      { name: "Licença de Habitação (Câmaras)", url: "https://eportugal.gov.pt/" },
    ],
    "Impostos e Taxas": [
      { name: "IMT (Imposto Municipal)", url: "https://www.portaldasfinancas.gov.pt/" },
      { name: "IMI (Imposto Municipal sobre Imóveis)", url: "https://www.portaldasfinancas.gov.pt/" },
    ],
  },
};

const DocumentationLinks = () => {
  const [selectedCountry, setSelectedCountry] = useState<"Brasil" | "Portugal">("Brasil");
  const [linksByCountry, setLinksByCountry] = useState<CountryMap>(INITIAL_LINKS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<{ category: string; index: number } | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    url: "",
    category: "Registro de Imóveis"
  });

  const categories = [
    "Registro de Imóveis",
    "Documentação Imobiliária",
    "Regulação e Licenciamento",
    "Impostos e Taxas"
  ];

  const handleOpenNew = () => {
    setEditingIndex(null);
    setFormData({ name: "", url: "", category: "Registro de Imóveis" });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (category: string, index: number, link: LinkItem) => {
    setEditingIndex({ category, index });
    setFormData({ name: link.name, url: link.url, category });
    setIsModalOpen(true);
  };

  const handleDelete = (category: string, index: number) => {
    if (!confirm("Deseja realmente excluir este link?")) return;

    setLinksByCountry(prev => ({
      ...prev,
      [selectedCountry]: {
        ...prev[selectedCountry],
        [category]: prev[selectedCountry][category].filter((_, i) => i !== index)
      }
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const formattedUrl = formData.url.startsWith("http") ? formData.url : `https://${formData.url}`;
    const newItem = { name: formData.name, url: formattedUrl };

    setLinksByCountry(prev => {
      const next = { ...prev };
      const currentCountryLinks = { ...next[selectedCountry] };

      // If editing
      if (editingIndex) {
        // If category changed, remove from old, add to new
        if (editingIndex.category !== formData.category) {
          currentCountryLinks[editingIndex.category] = currentCountryLinks[editingIndex.category].filter((_, i) => i !== editingIndex.index);
          currentCountryLinks[formData.category] = [...(currentCountryLinks[formData.category] || []), newItem];
        } else {
          // Just update in same category
          currentCountryLinks[formData.category] = currentCountryLinks[formData.category].map((item, i) => i === editingIndex.index ? newItem : item);
        }
      } else {
        // Adding new
        currentCountryLinks[formData.category] = [...(currentCountryLinks[formData.category] || []), newItem];
      }

      next[selectedCountry] = currentCountryLinks;
      return next;
    });

    setIsModalOpen(false);
  };

  const countryLinks = linksByCountry[selectedCountry];

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
            <Globe className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Links de Documentação</h2>
            <p className="text-sm text-muted-foreground">Órgãos competentes para registro e documentação imobiliária</p>
          </div>
        </div>

        <button
          onClick={handleOpenNew}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md shadow-primary/20"
        >
          <Plus className="w-4 h-4" /> Adicionar link manualmente
        </button>
      </div>

      {/* Country toggle */}
      <div className="flex bg-secondary rounded-xl p-0.5 w-fit">
        {(["Brasil", "Portugal"] as const).map((c) => (
          <button key={c} onClick={() => setSelectedCountry(c)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${selectedCountry === c ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            <span>{c === "Brasil" ? "🇧🇷" : "🇵🇹"}</span> {c}
          </button>
        ))}
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {categories.map((category) => {
          const links = countryLinks[category] || [];
          const icons: Record<string, any> = {
            "Registro de Imóveis": Building,
            "Documentação Imobiliária": FileText,
            "Regulação e Licenciamento": Scale,
            "Impostos e Taxas": Link2,
          };
          const Icon = icons[category] || Globe;

          return (
            <div key={category} className="bg-card rounded-xl border border-border p-5 flex flex-col h-full hover:border-primary/30 transition-all duration-300">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">{category}</h3>
              </div>
              <div className="space-y-1.5 mt-auto">
                {links.length > 0 ? links.map((link, idx) => (
                  <div key={`${link.name}-${idx}`} className="group relative flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors border border-transparent hover:border-border">
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-between min-w-0 pr-20">
                      <span className="text-sm text-foreground group-hover:text-primary transition-colors truncate">{link.name}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0 ml-2" />
                    </a>

                    {/* Actions Overlay */}
                    <div className="absolute right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity translate-x-1 group-hover:translate-x-0">
                      <button
                        onClick={() => handleOpenEdit(category, idx, link)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-blue-600 hover:bg-blue-50 transition-all"
                        title="Editar"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(category, idx)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-all"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )) : (
                  <p className="text-[11px] text-muted-foreground italic px-3 py-4 text-center">Nenhum link adicionado.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-secondary/30">
              <h3 className="font-bold text-foreground">{editingIndex ? "Editar Link" : "Novo Link Externo"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-full hover:bg-secondary text-muted-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1.5 block tracking-wider">Nome da Instituição/Site</label>
                <input
                  autoFocus
                  required
                  placeholder="Ex: Cartório Digital de São Paulo"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-secondary/50 border border-border focus:border-primary outline-none transition-all text-sm"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1.5 block tracking-wider">Endereço Web (URL)</label>
                <div className="relative">
                  <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    required
                    placeholder="www.exemplo.com.br"
                    value={formData.url}
                    onChange={e => setFormData({ ...formData, url: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary/50 border border-border focus:border-primary outline-none transition-all text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1.5 block tracking-wider">Setor / Categoria</label>
                <select
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-secondary/50 border border-border focus:border-primary outline-none transition-all text-sm cursor-pointer appearance-none bg-no-repeat bg-[right_12px_center]"
                >
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-secondary transition-colors"
                >
                  Descartar
                </button>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 hover:shadow-primary/30 transition-all shadow-lg"
                >
                  <Save className="w-4 h-4" /> {editingIndex ? "Salvar Alterações" : "Criar Link"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentationLinks;
