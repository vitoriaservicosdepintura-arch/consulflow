import { useState } from "react";
import { MapPin, Search, ExternalLink } from "lucide-react";

const GoogleMapsSearch = () => {
  const [query, setQuery] = useState("");
  const [searchUrl, setSearchUrl] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      const encoded = encodeURIComponent(query.trim() + " imóveis");
      setSearchUrl(`https://www.google.com/maps/embed/v1/search?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encoded}`);
    }
  };

  const quickSearches = [
    "Imobiliárias Lisboa Portugal",
    "Imobiliárias Porto Portugal",
    "Imobiliárias São Paulo Brasil",
    "Imobiliárias Rio de Janeiro Brasil",
    "Cartórios de Registro de Imóveis",
    "Agências Imobiliárias Braga Portugal",
    "Construtoras Curitiba Brasil",
    "Loteamentos Faro Portugal",
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
          <MapPin className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Pesquisa Google Maps</h2>
          <p className="text-sm text-muted-foreground">Encontre imobiliárias, cartórios e pontos de interesse</p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Ex: Imobiliárias em Lisboa, Cartórios São Paulo..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm text-foreground" />
        </div>
        <button type="submit" className="px-5 py-2.5 rounded-xl text-sm font-semibold text-primary-foreground hover:scale-[1.02] active:scale-[0.98] transition-all"
          style={{ background: "var(--gradient-primary)" }}>
          Pesquisar
        </button>
      </form>

      {/* Quick searches */}
      <div className="flex flex-wrap gap-2">
        {quickSearches.map((qs) => (
          <button key={qs} onClick={() => { setQuery(qs); const encoded = encodeURIComponent(qs + " imóveis"); setSearchUrl(`https://www.google.com/maps/embed/v1/search?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encoded}`); }}
            className="px-3 py-1.5 rounded-lg bg-secondary text-xs text-foreground hover:bg-primary/10 hover:text-primary transition-colors">
            {qs}
          </button>
        ))}
      </div>

      {/* Map */}
      {searchUrl ? (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <iframe src={searchUrl} className="w-full h-[500px]" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          <div className="p-3 border-t border-border flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Resultados para: {query}</span>
            <a href={`https://www.google.com/maps/search/${encodeURIComponent(query)}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline">
              Abrir no Google Maps <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border p-16 text-center">
          <MapPin className="w-16 h-16 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-muted-foreground">Faça uma pesquisa para ver o mapa</p>
        </div>
      )}
    </div>
  );
};

export default GoogleMapsSearch;
