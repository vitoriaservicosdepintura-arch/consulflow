import React, { useState, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, AlignLeft, AlignCenter,
  AlignRight, AlignJustify, List, ListOrdered, Highlighter, Undo, Redo,
  Type, FileText, Palette, Save, Download, Upload, Trash2, Printer,
  ChevronDown, Maximize2, Minimize2, Search, Settings, FileSpreadsheet,
  Plus, Scissors, Copy, Clipboard, Check
} from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import * as pdfjs from "pdfjs-dist";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js`;

const TextEditor = () => {
  const [docName, setDocName] = useState("Documento sem título");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
    ],
    content: `
      <h1 style="text-align: center">Relatório de Atividades Consuflow</h1>
      <p>Data: ${new Date().toLocaleDateString()}</p>
      <hr>
      <p><strong>Introdução:</strong></p>
      <p>Este documento serve como exemplo da potência do novo <u>Editor Profissional</u> integrado ao ecossistema <strong>Consuflow</strong>. Agora você pode importar arquivos <strong>PDF</strong> para editar diretamente aqui.</p>
      <h2>Funcionalidades Principais</h2>
      <ul>
        <li>Importação de arquivos PDF (Extração de texto inteligente)</li>
        <li>Exportação direta para PDF e Excel</li>
        <li>Formatação avançada de parágrafos</li>
        <li>Interface profissional Word-style</li>
      </ul>
      <blockquote>"A melhor forma de prever o futuro é lendo o que já foi escrito e melhorando."</blockquote>
    `,
  });

  if (!editor) return null;

  const handleExportPDF = async () => {
    if (!editorRef.current) return;
    setIsLoading(true);
    try {
      const canvas = await html2canvas(editorRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${docName}.pdf`);
    } catch (err) {
      console.error("Erro no PDF:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportExcel = () => {
    const text = editor.getText();
    const rows = text.split("\n").filter(r => r.trim()).map(r => [r]);
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Documento Consuflow");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${docName}.xlsx`);
  };

  const handleSave = () => {
    const html = editor.getHTML();
    localStorage.setItem(`doc_${docName}`, html);
    alert("Documento salvo com sucesso localmente!");
  };

  const handleOpen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith(".pdf")) {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const typedarray = new Uint8Array(ev.target?.result as ArrayBuffer);
          const pdf = await pdfjs.getDocument({ data: typedarray }).promise;
          let fullHtml = "";

          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            let lastY = -1;
            let pageText = "";

            content.items.forEach((item: any) => {
              if (lastY !== -1 && Math.abs(item.transform[5] - lastY) > 5) {
                pageText += "<br>";
              }
              pageText += item.str + " ";
              lastY = item.transform[5];
            });

            fullHtml += `<div class="pdf-page"><h3>Página ${i}</h3><p>${pageText}</p></div><hr>`;
          }

          editor.commands.setContent(fullHtml);
          setDocName(file.name.replace(/\.[^/.]+$/, ""));
          alert("PDF importado com sucesso!");
        } catch (err) {
          console.error("Erro PDF:", err);
          alert("Não foi possível processar este PDF.");
        } finally {
          setIsLoading(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } else if (fileName.endsWith(".docx")) {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          // Dynamic load mammoth for docx conversion if not present
          if (!(window as any).mammoth) {
            const script = document.createElement("script");
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.4.2/mammoth.browser.min.js";
            document.head.appendChild(script);
            await new Promise((resolve) => (script.onload = resolve));
          }

          const arrayBuffer = ev.target?.result as ArrayBuffer;
          const result = await (window as any).mammoth.convertToHtml({ arrayBuffer });
          editor.commands.setContent(result.value);
          setDocName(file.name.replace(/\.[^/.]+$/, ""));
          alert("Arquivo Word (.docx) importado!");
        } catch (err) {
          console.error("Erro Word:", err);
          alert("Erro ao abrir arquivo Word.");
        } finally {
          setIsLoading(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const content = ev.target?.result as string;
        editor.commands.setContent(content);
        setDocName(file.name.replace(/\.[^/.]+$/, ""));
        alert("Documento aberto!");
        setIsLoading(false);
      };
      reader.readAsText(file);
    }
  };

  const ToolBtn = ({ onClick, active, children, title, disabled }: { onClick: () => void; active?: boolean; children: React.ReactNode; title: string; disabled?: boolean }) => (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`p-1.5 rounded transition-all flex items-center justify-center
        ${active ? "bg-blue-100 text-blue-700 shadow-sm" : "text-gray-600 hover:bg-gray-200 hover:text-gray-900"}
        ${disabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
    >
      {children}
    </button>
  );

  const colors = ["#000000", "#1e40af", "#dc2626", "#059669", "#d97706", "#7c3aed", "#ec4899", "#ffffff"];

  const MenuButton = ({ label, items }: { label: string; items: Array<{ label: string; onClick?: () => void; icon?: React.ReactNode }> }) => (
    <div className="relative">
      <button
        className={`px-2 py-0.5 rounded text-[12px] transition-colors ${openMenu === label ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100 text-gray-700"}`}
        onClick={() => setOpenMenu(openMenu === label ? null : label)}
        onMouseEnter={() => openMenu && setOpenMenu(label)}
      >
        {label}
      </button>
      {openMenu === label && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 shadow-xl rounded-md py-1 z-[100] min-w-[200px]" onMouseLeave={() => setOpenMenu(null)}>
          {items.map((item, i) => (
            <button key={i} onClick={() => { item.onClick?.(); setOpenMenu(null); }} className="w-full text-left px-4 py-1.5 text-xs hover:bg-blue-600 hover:text-white flex items-center gap-3 transition-colors">
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className={`flex flex-col bg-[#f3f4f6] transition-all duration-300 ${isFullscreen ? "fixed inset-0 z-[9999] h-screen" : "rounded-xl border border-gray-300 overflow-hidden shadow-sm"}`}>

      {/* Top Header Section (Word Style) */}
      <div className="bg-white border-b border-gray-300 px-4 py-2 flex items-center justify-between relative">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-1.5 rounded">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div className="relative">
            <input
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              className="font-semibold bg-transparent border-none outline-none focus:ring-1 focus:ring-blue-500 px-1 rounded hover:bg-gray-100 transition-colors"
            />
            {isLoading && <span className="absolute -right-6 top-1 animate-spin">⏳</span>}
            <div className="flex gap-1 mt-0.5">
              <MenuButton label="Arquivo" items={[
                { label: "Novo", icon: <Plus className="w-3 h-3" />, onClick: () => editor.commands.setContent("") },
                { label: "Abrir (Word, PDF, HTML)...", icon: <Upload className="w-3 h-3" />, onClick: () => fileInputRef.current?.click() },
                { label: "Salvar", icon: <Save className="w-3 h-3" />, onClick: handleSave },
                { label: "Exportar como PDF", icon: <Download className="w-3 h-3 text-red-500" />, onClick: handleExportPDF },
                { label: "Exportar como Excel", icon: <FileSpreadsheet className="w-3 h-3 text-green-600" />, onClick: handleExportExcel },
              ]} />
              <MenuButton label="Editar" items={[
                { label: "Desfazer", icon: <Undo className="w-3 h-3" />, onClick: () => editor.chain().focus().undo().run() },
                { label: "Refazer", icon: <Redo className="w-3 h-3" />, onClick: () => editor.chain().focus().redo().run() },
                { label: "Limpar formatação", icon: <Trash2 className="w-3 h-3 text-red-500" />, onClick: () => editor.commands.unsetAllMarks() },
              ]} />
              <MenuButton label="Ver" items={[
                { label: isFullscreen ? "Sair da Tela Cheia" : "Tela Cheia", icon: <Maximize2 className="w-3 h-3" />, onClick: () => setIsFullscreen(!isFullscreen) },
                { label: "Layout de Impressão" },
              ]} />
              <MenuButton label="Ferramentas" items={[
                { label: "Contagem de palavras", icon: <Check className="w-3 h-3" />, onClick: () => alert(`Total: ${editor.storage.characterCount.words()} palavras`) },
              ]} />
              <MenuButton label="Ajuda" items={[
                { label: "Sobre o Consuflow Word", icon: <FileText className="w-3 h-3" />, onClick: () => alert("Consuflow professional Editor v3.0") },
              ]} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ToolBtn onClick={handleSave} title="Salvar rápido"><Save className="w-4 h-4 text-blue-600" /></ToolBtn>
          <ToolBtn onClick={handleExportPDF} title="PDF Rápido"><Download className="w-4 h-4 text-red-500" /></ToolBtn>
          <div className="w-px h-6 bg-gray-300 mx-1" />
          <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-2 text-gray-500 hover:text-gray-800">
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <input type="file" ref={fileInputRef} className="hidden" accept=".html,.txt,.pdf,.docx" onChange={handleOpen} />

      {/* Main Toolbar */}
      <div className="bg-[#f9fafb] border-b border-gray-300 px-4 py-1.5 flex flex-wrap items-center gap-1 shrink-0">
        <ToolBtn onClick={() => editor.chain().focus().undo().run()} title="Desfazer" disabled={!editor.can().undo()}>
          <Undo className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().redo().run()} title="Refazer" disabled={!editor.can().redo()}>
          <Redo className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={() => window.print()} title="Imprimir">
          <Printer className="w-4 h-4" />
        </ToolBtn>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <select className="bg-white border border-gray-300 text-[11px] rounded px-1.5 py-1 outline-none focus:ring-1 focus:ring-blue-500 w-32 font-medium text-gray-600 hover:border-gray-400 transition-colors">
          <option>Calibri</option>
          <option>Arial</option>
          <option>Times New Roman</option>
          <option>Inter</option>
        </select>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Negrito">
          <Bold className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Itálico">
          <Italic className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Sublinhado">
          <UnderlineIcon className="w-4 h-4" />
        </ToolBtn>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <ToolBtn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Alinhar à esquerda">
          <AlignLeft className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Centralizar">
          <AlignCenter className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Alinhar à direita">
          <AlignRight className="w-4 h-4" />
        </ToolBtn>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Lista de marcadores">
          <List className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Lista numerada">
          <ListOrdered className="w-4 h-4" />
        </ToolBtn>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <div className="flex items-center gap-1 group relative">
          <Palette className="w-4 h-4 text-gray-500 mx-1" />
          <div className="flex gap-0.5">
            {colors.slice(0, 4).map((c) => (
              <button key={c} onClick={() => editor.chain().focus().setColor(c).run()}
                className="w-4 h-4 rounded-full border border-gray-300 hover:scale-110 transition-transform"
                style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>

        <ToolBtn onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive("highlight")} title="Realce">
          <Highlighter className="w-4 h-4" />
        </ToolBtn>
      </div>

      {/* Editor Content Area (Page Style) */}
      <div className="flex-1 overflow-auto p-4 md:p-8 flex justify-center bg-[#f3f4f6]" onClick={() => setOpenMenu(null)}>
        <div
          className={`bg-white w-full max-w-[816px] min-h-[1056px] shadow-[0_0_15px_rgba(0,0,0,0.1)] p-[96px] relative flex flex-col transition-all ${isLoading ? "opacity-50 pointer-events-none" : ""}`}
          ref={editorRef}
        >
          <div className="prose prose-sm max-w-none flex-1
            [&_.tiptap]:outline-none [&_.tiptap]:h-full
            [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-gray-900 [&_h1]:mb-6
            [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-gray-800 [&_h2]:mb-4 [&_h2]:mt-6
            [&_h3]:text-xl [&_h3]:font-medium [&_h3]:text-gray-800 [&_h3]:mb-3
            [&_p]:text-gray-700 [&_p]:mb-4 [&_p]:leading-[1.6] [&_p]:text-base
            [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4
            [&_li]:text-gray-700 [&_li]:mb-1 [&_li]:text-base
            [&_blockquote]:border-l-4 [&_blockquote]:border-blue-500 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-600 [&_blockquote]:my-6
            [&_hr]:my-8 [&_hr]:border-gray-200
            [&_mark]:bg-yellow-100 [&_mark]:px-0.5 [&_mark]:rounded">
            <EditorContent editor={editor} />
          </div>
          <div className="mt-12 pt-4 border-t border-gray-100 text-[10px] text-gray-400 flex justify-between uppercase tracking-widest pointer-events-none">
            <span>© 2026 Consuflow Docs</span>
            <span>Página 1</span>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-white border-t border-gray-300 px-3 py-1 text-[11px] text-gray-500 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <span>Palavras: {editor.storage.characterCount?.words?.() || 0}</span>
          <span>Caracteres: {editor.storage.characterCount?.characters?.() || 0}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-sm" />
            <span>Sincronizado na Nuvem</span>
          </div>
          <span>Zoom: 100%</span>
        </div>
      </div>
    </div>
  );
};

export default TextEditor;
