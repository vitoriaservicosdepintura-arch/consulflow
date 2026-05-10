import React, { useState } from "react";
import {
    ChevronDown, ChevronRight, Bold, Italic, Underline, Strikethrough,
    AlignLeft, AlignCenter, AlignRight, Type, Palette, Grid3X3,
    AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd
} from "lucide-react";
import { CellData, FONTS, FONT_SIZES } from "./types";

interface SidebarProps {
    cell: CellData;
    onUpdate: (updates: Partial<CellData>) => void;
}

const Section = ({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border-b border-[#c0c0c0]">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-2 py-1 bg-[#e8e8f8] hover:bg-[#d8d8f0] text-xs font-semibold text-[#303060] select-none"
            >
                <span>{title}</span>
                {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
            {open && <div className="p-3 bg-white space-y-3">{children}</div>}
        </div>
    );
};

const Label = ({ children }: { children: React.ReactNode }) => (
    <div className="text-[10px] uppercase text-gray-500 font-bold tracking-wider mb-1">{children}</div>
);

const SBBtn = ({ onClick, active, title, children }: { onClick?: () => void; active?: boolean; title?: string; children: React.ReactNode }) => (
    <button
        title={title}
        onClick={onClick}
        className={`w-8 h-8 flex items-center justify-center border text-xs rounded transition-colors
      ${active ? "bg-[#c8d8f4] border-[#7090c0] shadow-sm" : "bg-white border-[#c0c0c0] hover:bg-[#e8e8e8]"}`}
    >
        {children}
    </button>
);

export const SpreadsheetSidebar = ({ cell, onUpdate }: SidebarProps) => {
    return (
        <div
            className="flex flex-col bg-[#f4f4f4] border-l border-[#c0c0c0] overflow-y-auto shrink-0 select-none pb-10"
            style={{ width: 220, fontSize: 11 }}
        >
            {/* Estilo */}
            <Section title="Estilo">
                <div>
                    <Label>Estilo de célula</Label>
                    <select className="w-full h-7 border border-[#c0c0c0] text-xs px-1 bg-white outline-none focus:border-blue-500">
                        {["Padrão", "Título 1", "Título 2", "Ênfase", "Bom", "Ruim", "Neutro"].map(s => (
                            <option key={s}>{s}</option>
                        ))}
                    </select>
                </div>
            </Section>

            {/* Caractere */}
            <Section title="Caractere">
                <div>
                    <Label>Fonte</Label>
                    <select
                        value={cell.fontFamily}
                        onChange={e => onUpdate({ fontFamily: e.target.value })}
                        className="w-full h-7 border border-[#c0c0c0] text-xs px-1 bg-white outline-none focus:border-blue-500"
                    >
                        {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                </div>

                <div>
                    <Label>Tamanho e Estilo</Label>
                    <div className="flex gap-1 mb-2">
                        <select
                            value={cell.fontSize}
                            onChange={e => onUpdate({ fontSize: Number(e.target.value) })}
                            className="flex-1 h-7 border border-[#c0c0c0] text-xs px-1 bg-white outline-none focus:border-blue-500"
                        >
                            {FONT_SIZES.map(s => <option key={s} value={s}>{s} pt</option>)}
                        </select>
                        <div className="flex gap-1">
                            <SBBtn onClick={() => onUpdate({ bold: !cell.bold })} active={cell.bold} title="Negrito"><Bold className="w-3.5 h-3.5" /></SBBtn>
                            <SBBtn onClick={() => onUpdate({ italic: !cell.italic })} active={cell.italic} title="Itálico"><Italic className="w-3.5 h-3.5" /></SBBtn>
                        </div>
                    </div>
                    <div className="flex gap-1">
                        <SBBtn onClick={() => onUpdate({ underline: !cell.underline })} active={cell.underline} title="Sublinhado"><Underline className="w-3.5 h-3.5" /></SBBtn>
                        <SBBtn onClick={() => onUpdate({ strike: !cell.strike })} active={cell.strike} title="Tachado"><Strikethrough className="w-3.5 h-3.5" /></SBBtn>
                        <div className="flex-1 h-8 border border-[#c0c0c0] bg-white rounded flex items-center px-1.5 gap-2 relative cursor-pointer hover:bg-gray-50">
                            <Palette className="w-3.5 h-3.5 text-gray-500" />
                            <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: cell.color }} />
                            <input type="color" value={cell.color} onChange={e => onUpdate({ color: e.target.value })} className="absolute inset-0 opacity-0 cursor-pointer" />
                        </div>
                    </div>
                </div>
            </Section>

            {/* Alinhamento */}
            <Section title="Alinhamento">
                <Label>Horizontal</Label>
                <div className="flex gap-1 mb-3">
                    <SBBtn onClick={() => onUpdate({ align: "left" })} active={cell.align === "left"}><AlignLeft className="w-3.5 h-3.5" /></SBBtn>
                    <SBBtn onClick={() => onUpdate({ align: "center" })} active={cell.align === "center"}><AlignCenter className="w-3.5 h-3.5" /></SBBtn>
                    <SBBtn onClick={() => onUpdate({ align: "right" })} active={cell.align === "right"}><AlignRight className="w-3.5 h-3.5" /></SBBtn>
                </div>

                <Label>Vertical</Label>
                <div className="flex gap-1 mb-3">
                    <SBBtn onClick={() => onUpdate({ valign: "top" })} active={cell.valign === "top"}><AlignVerticalJustifyStart className="w-3.5 h-3.5" /></SBBtn>
                    <SBBtn onClick={() => onUpdate({ valign: "middle" })} active={cell.valign === "middle"}><AlignVerticalJustifyCenter className="w-3.5 h-3.5" /></SBBtn>
                    <SBBtn onClick={() => onUpdate({ valign: "bottom" })} active={cell.valign === "bottom"}><AlignVerticalJustifyEnd className="w-3.5 h-3.5" /></SBBtn>
                </div>

                <div className="flex items-center gap-2 py-1 cursor-pointer">
                    <input
                        type="checkbox"
                        id="wrapTextSide"
                        checked={cell.wrapText}
                        onChange={e => onUpdate({ wrapText: e.target.checked })}
                        className="w-3.5 h-3.5 accent-blue-600"
                    />
                    <label htmlFor="wrapTextSide" className="text-[10px] cursor-pointer">Quebra automática</label>
                </div>
            </Section>

            {/* Formato numérico */}
            <Section title="Formato numérico">
                <div>
                    <Label>Categoria</Label>
                    <select
                        value={cell.numberFormat}
                        onChange={e => onUpdate({ numberFormat: e.target.value })}
                        className="w-full h-7 border border-[#c0c0c0] text-xs px-1 bg-white outline-none focus:border-blue-500"
                    >
                        {["General", "Number", "Currency", "Percent", "Integer", "Text", "Date"].map(f => (
                            <option key={f}>{f}</option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <Label>Decimais</Label>
                        <input
                            type="number" min={0} max={10}
                            value={cell.decimals ?? 2}
                            onChange={e => onUpdate({ decimals: parseInt(e.target.value) || 0 })}
                            className="w-full h-7 border border-[#c0c0c0] text-xs px-2 bg-white outline-none focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <Label>Zeros Esq.</Label>
                        <input
                            type="number" min={0} max={20} defaultValue={1}
                            className="w-full h-7 border border-[#c0c0c0] text-xs px-2 bg-white outline-none focus:border-blue-500"
                        />
                    </div>
                </div>

                <div className="space-y-1.5 pt-1">
                    <div className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" id="neg-red" className="w-3 h-3 accent-red-600" />
                        <label htmlFor="neg-red" className="text-[9px] text-red-600 font-semibold cursor-pointer">Negativos Vermelhos</label>
                    </div>
                    <div className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" id="thou-sep" className="w-3 h-3 accent-blue-600" />
                        <label htmlFor="thou-sep" className="text-[9px] cursor-pointer">Milhares (.)</label>
                    </div>
                </div>

                <div className="mt-2 text-center p-1.5 bg-gray-50 border border-dashed border-gray-300 rounded text-gray-500 text-[10px]">
                    Exemplo: 1.234,00
                </div>
            </Section>
        </div>
    );
};
