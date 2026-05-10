import React from "react";
import {
    Scissors, Copy, Clipboard, Undo2, Redo2, Bold, Italic, Underline,
    Strikethrough, AlignLeft, AlignCenter, AlignRight, AlignJustify,
    Type, Palette, Grid3X3, WrapText, Combine,
    DollarSign, Percent, ChevronLast, ChevronFirst, FileText, Save
} from "lucide-react";
import { CellData, FONTS, FONT_SIZES } from "./types.ts";

interface ToolbarProps {
    cell: CellData;
    onUpdate: (updates: Partial<CellData>) => void;
    onUndo: () => void;
    onRedo: () => void;
    onCopy: () => void;
    onPaste: () => void;
    onCut: () => void;
    onEditPDF?: () => void;
    onSave: () => void;
    canUndo: boolean;
    canRedo: boolean;
}

const Btn = ({ title, onClick, active, disabled, children, className = "" }: { title?: string; onClick?: () => void; active?: boolean; disabled?: boolean; children: React.ReactNode; className?: string }) => (
    <button
        title={title}
        onClick={onClick}
        disabled={disabled}
        className={`flex items-center justify-center p-1 border rounded transition-colors select-none
      ${active ? "bg-[#c8d8f0] border-[#7090c0] shadow-sm" : "bg-transparent border-transparent hover:bg-[#d8d8d8] hover:border-[#b0b0b0]"}
      ${disabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}
      ${className}`}
    >
        {children}
    </button>
);

export const SpreadsheetToolbar = ({
    cell, onUpdate, onUndo, onRedo, onCopy, onPaste, onCut, onEditPDF, onSave, canUndo, canRedo
}: ToolbarProps) => {
    const adjustDecimals = (delta: number) => {
        const current = cell.decimals ?? 2;
        onUpdate({ decimals: Math.max(0, current + delta) });
    };

    const setBorder = () => {
        const hasBorders = cell.borders?.top && cell.borders?.bottom;
        onUpdate({
            borders: hasBorders ? {} : { top: true, bottom: true, left: true, right: true }
        });
    };

    return (
        <div className="flex flex-col bg-[#f0f0f0] border-b border-[#c0c0c0] shrink-0">
            <div className="flex items-center gap-0.5 px-2 py-1 flex-wrap border-b border-[#d8d8d8]">
                {/* Save & Clipboard */}
                <Btn title="Salvar (Excel)" onClick={onSave} className="bg-green-50 hover:bg-green-100 border-green-200"><Save className="w-4 h-4 text-green-700" /></Btn>
                <div className="w-px h-5 bg-[#c0c0c0] mx-1" />
                <Btn title="Colar (Ctrl+V)" onClick={onPaste}><Clipboard className="w-4 h-4 text-gray-700" /></Btn>
                <Btn title="Recortar (Ctrl+X)" onClick={onCut}><Scissors className="w-4 h-4 text-gray-700" /></Btn>
                <Btn title="Copiar (Ctrl+C)" onClick={onCopy}><Copy className="w-4 h-4 text-gray-700" /></Btn>
                <div className="w-px h-5 bg-[#c0c0c0] mx-1" />

                {/* Undo/Redo */}
                <Btn title="Desfazer (Ctrl+Z)" onClick={onUndo} disabled={!canUndo}><Undo2 className="w-4 h-4" /></Btn>
                <Btn title="Refazer (Ctrl+Y)" onClick={onRedo} disabled={!canRedo}><Redo2 className="w-4 h-4" /></Btn>
                <div className="w-px h-5 bg-[#c0c0c0] mx-1" />

                {/* Font Family */}
                <select
                    value={cell.fontFamily}
                    onChange={e => onUpdate({ fontFamily: e.target.value })}
                    className="h-6 border border-[#c0c0c0] text-xs px-1 bg-white outline-none focus:border-blue-500"
                    style={{ width: 130 }}>
                    {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>

                {/* Font Size */}
                <select
                    value={cell.fontSize}
                    onChange={e => onUpdate({ fontSize: Number(e.target.value) })}
                    className="h-6 border border-[#c0c0c0] text-xs px-1 bg-white ml-0.5 outline-none focus:border-blue-500"
                    style={{ width: 55 }}>
                    {FONT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>

                <div className="w-px h-5 bg-[#c0c0c0] mx-1" />

                {/* Bold, Italic, Underline, Strike */}
                <Btn title="Negrito (Ctrl+B)" onClick={() => onUpdate({ bold: !cell.bold })} active={cell.bold}><Bold className="w-4 h-4" /></Btn>
                <Btn title="Itálico (Ctrl+I)" onClick={() => onUpdate({ italic: !cell.italic })} active={cell.italic}><Italic className="w-4 h-4" /></Btn>
                <Btn title="Sublinhado (Ctrl+U)" onClick={() => onUpdate({ underline: !cell.underline })} active={cell.underline}><Underline className="w-4 h-4" /></Btn>
                <Btn title="Tachado" onClick={() => onUpdate({ strike: !cell.strike })} active={cell.strike}><Strikethrough className="w-4 h-4" /></Btn>

                <div className="w-px h-5 bg-[#c0c0c0] mx-1" />

                {/* Font color */}
                <div className="flex flex-col items-center h-6 justify-center cursor-pointer relative group px-1 rounded hover:bg-[#d8d8d8]" title="Cor da fonte">
                    <Type className="w-4 h-4" />
                    <div className="h-0.5 w-full mt-0" style={{ backgroundColor: cell.color }} />
                    <input type="color" value={cell.color} onChange={e => onUpdate({ color: e.target.value })} className="absolute opacity-0 inset-0 cursor-pointer" />
                </div>

                {/* BG color */}
                <div className="flex flex-col items-center h-6 justify-center cursor-pointer relative group px-1 rounded hover:bg-[#d8d8d8] ml-0.5" title="Cor do fundo">
                    <Palette className="w-4 h-4" />
                    <div className="h-0.5 w-full mt-0" style={{ backgroundColor: cell.bgColor || "#ffffff" }} />
                    <input type="color" value={cell.bgColor || "#ffffff"} onChange={e => onUpdate({ bgColor: e.target.value })} className="absolute opacity-0 inset-0 cursor-pointer" />
                </div>

                <div className="w-px h-5 bg-[#c0c0c0] mx-1" />

                {/* Alignment */}
                <Btn title="Alinhar à esquerda" onClick={() => onUpdate({ align: "left" })} active={cell.align === "left"}><AlignLeft className="w-4 h-4" /></Btn>
                <Btn title="Centralizar" onClick={() => onUpdate({ align: "center" })} active={cell.align === "center"}><AlignCenter className="w-4 h-4" /></Btn>
                <Btn title="Alinhar à direita" onClick={() => onUpdate({ align: "right" })} active={cell.align === "right"}><AlignRight className="w-4 h-4" /></Btn>
                <Btn title="Justificar" onClick={() => alert("Justify alignment not supported in grid yet.")}><AlignJustify className="w-4 h-4" /></Btn>

                <div className="w-px h-5 bg-[#c0c0c0] mx-1" />

                {/* Number Formats */}
                <Btn title="Formato moeda" onClick={() => onUpdate({ numberFormat: "Currency" })}><DollarSign className="w-4 h-4" /></Btn>
                <Btn title="Formato porcentagem" onClick={() => onUpdate({ numberFormat: "Percent" })}><Percent className="w-4 h-4" /></Btn>
                <Btn title="Aumentar casas decimais" onClick={() => adjustDecimals(1)}><ChevronLast className="w-4 h-4" /></Btn>
                <Btn title="Diminuir casas decimais" onClick={() => adjustDecimals(-1)}><ChevronFirst className="w-4 h-4" /></Btn>

                <div className="w-px h-5 bg-[#c0c0c0] mx-1" />

                {/* Structural Tools */}
                <Btn title="Bordas" onClick={setBorder} active={!!cell.borders?.top}><Grid3X3 className="w-4 h-4" /></Btn>
                <Btn title="Mesclar células" onClick={() => alert("Merging cells requires multiple selection logic updates.")}><Combine className="w-4 h-4" /></Btn>
                <Btn title="Quebrar texto" onClick={() => onUpdate({ wrapText: !cell.wrapText })} active={cell.wrapText}><WrapText className="w-4 h-4" /></Btn>

                <div className="w-px h-5 bg-[#c0c0c0] mx-1" />

                {/* PDF Tool */}
                <Btn title="Editar PDF (Importar conteúdo de PDF)" onClick={onEditPDF} className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100">
                    <FileText className="w-4 h-4 mr-1" />
                    <span className="text-[10px] font-bold uppercase">Editar PDF</span>
                </Btn>
            </div>
        </div>
    );
};
