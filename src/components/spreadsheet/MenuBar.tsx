import React, { useState } from "react";
import { Maximize2, Check } from "lucide-react";

interface MenuBarProps {
    onUndo: () => void;
    onRedo: () => void;
    onSaveExcel: () => void;
    onSavePDF: () => void;
    onImport: () => void;
    onNew: () => void;
    onCopy: () => void;
    onPaste: () => void;
    onCut: () => void;
    onInsertRow: (offset: number) => void;
    onInsertCol: (offset: number) => void;
    onDeleteRow: () => void;
    onDeleteSelection: () => void;
    canUndo: boolean;
    canRedo: boolean;
    isExpanded?: boolean;
    onToggleExpand?: () => void;
}

interface MenuDef {
    label: string;
    items: Array<{ label: string; shortcut?: string; onClick?: () => void; separator?: boolean; disabled?: boolean }>;
}

export const SpreadsheetMenuBar = ({
    onUndo, onRedo, onSaveExcel, onSavePDF, onImport, onNew, onCopy, onPaste, onCut,
    onInsertRow, onInsertCol, onDeleteRow, onDeleteSelection,
    canUndo, canRedo, isExpanded, onToggleExpand
}: MenuBarProps) => {
    const [openMenu, setOpenMenu] = useState<string | null>(null);

    const menus: MenuDef[] = [
        {
            label: "Arquivo",
            items: [
                { label: "Nova planilha", shortcut: "Ctrl+N", onClick: onNew },
                { label: "Abrir...", shortcut: "Ctrl+O", onClick: onImport },
                { separator: true, label: "" },
                { label: "Salvar como Excel", shortcut: "Ctrl+S", onClick: onSaveExcel },
                { label: "Exportar como PDF", onClick: onSavePDF },
                { separator: true, label: "" },
                { label: "Propriedades..." },
                { separator: true, label: "" },
                { label: "Fechar", onClick: () => window.close() },
            ],
        },
        {
            label: "Início",
            items: [
                { label: "Desfazer", shortcut: "Ctrl+Z", onClick: onUndo, disabled: !canUndo },
                { label: "Refazer", shortcut: "Ctrl+Y", onClick: onRedo, disabled: !canRedo },
                { separator: true, label: "" },
                { label: "Recortar", shortcut: "Ctrl+X", onClick: onCut },
                { label: "Copiar", shortcut: "Ctrl+C", onClick: onCopy },
                { label: "Colar", shortcut: "Ctrl+V", onClick: onPaste },
                { label: "Colar especial...", shortcut: "Ctrl+Shift+V" },
                { separator: true, label: "" },
                { label: "Excluir conteúdo", onClick: onDeleteSelection },
            ],
        },
        {
            label: "Inserir",
            items: [
                { label: "Linhas acima", onClick: () => onInsertRow(0) },
                { label: "Linhas abaixo", onClick: () => onInsertRow(1) },
                { label: "Colunas à esquerda", onClick: () => onInsertCol(0) },
                { label: "Colunas à direita", onClick: () => onInsertCol(1) },
                { separator: true, label: "" },
                { label: "Imagem...", onClick: () => alert("Image insertion coming soon!") },
                { label: "Gráfico...", onClick: () => alert("Charts coming soon!") },
                { label: "Função...", shortcut: "Ctrl+F2" },
            ],
        },
        {
            label: "Dados",
            items: [
                { label: "Classificar ascendente" },
                { label: "Classificar descendente" },
                { label: "Classificar..." },
                { separator: true, label: "" },
                { label: "Validação..." },
            ],
        },
        {
            label: "Formatar",
            items: [
                { label: "Negrito", shortcut: "Ctrl+B" },
                { label: "Itálico", shortcut: "Ctrl+I" },
                { label: "Sublinhado", shortcut: "Ctrl+U" },
                { separator: true, label: "" },
                { label: "Células de mesclagem" },
            ],
        },
        {
            label: "Ajuda",
            items: [
                { label: "Sobre o Consuflow Excel", onClick: () => alert("Consuflow Spreadsheet Editor v1.0") },
            ],
        },
    ];

    return (
        <div className="flex items-center bg-[#f0f0f0] border-b border-[#c0c0c0] shrink-0 select-none px-1" style={{ height: 26 }}>
            {menus.map(menu => (
                <div key={menu.label} className="relative">
                    <button
                        className={`px-3 h-full text-xs hover:bg-[#c8d8f0] py-1 rounded transition-colors ${openMenu === menu.label ? "bg-[#c8d8f0]" : ""}`}
                        onClick={() => setOpenMenu(prev => prev === menu.label ? null : menu.label)}
                        onMouseEnter={() => openMenu && setOpenMenu(menu.label)}
                    >
                        {menu.label}
                    </button>
                    {openMenu === menu.label && (
                        <div
                            className="absolute left-0 top-full bg-white border border-[#a0a0a0] shadow-[0_4px_12px_rgba(0,0,0,0.15)] z-[100] min-w-[220px] py-1 rounded-sm mt-0.5"
                        >
                            {menu.items.map((item, i) =>
                                item.separator ? (
                                    <div key={i} className="h-px bg-[#e0e0e0] my-1 mx-2" />
                                ) : (
                                    <button
                                        key={i}
                                        onClick={() => { item.onClick?.(); setOpenMenu(null); }}
                                        disabled={item.disabled}
                                        className="w-full text-left px-4 py-1.5 text-xs hover:bg-blue-600 hover:text-white flex justify-between items-center disabled:opacity-30 group transition-colors"
                                    >
                                        <span>{item.label}</span>
                                        {item.shortcut && <span className="text-gray-400 group-hover:text-blue-100 ml-8 text-[10px] font-mono">{item.shortcut}</span>}
                                    </button>
                                )
                            )}
                        </div>
                    )}
                </div>
            ))}
            <div className="flex-1" />

            <div className="flex items-center gap-2 px-2">
                <button
                    className="bg-[#248AF6] text-white px-3 py-0.5 rounded text-[10px] font-bold hover:bg-[#1C6DD0] transition-colors flex items-center gap-1 uppercase"
                    onClick={onSaveExcel}
                >
                    <Check className="w-3 h-3" /> Concluir
                </button>

                <button
                    onClick={onToggleExpand}
                    className={`p-2 rounded-lg transition-all border ${isExpanded ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-inner' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300'}`}
                    title={isExpanded ? "Contrair Editor" : "Expandir Editor"}
                >
                    <Maximize2 className={`w-4 h-4 transition-transform duration-500 ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
            </div>

            {openMenu && (
                <div className="fixed inset-0 z-40" onClick={() => setOpenMenu(null)} />
            )}
        </div>
    );
};
