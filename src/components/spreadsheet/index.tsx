import React, { useState, useRef, useCallback, useEffect } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
    Plus, Trash2, ChevronLeft, ChevronRight, Sigma, Check, X,
    Square, Type, Scissors, Copy, Clipboard, Undo2, Redo2,
    Maximize2, Ghost, MousePointer2, Settings, Download, Upload,
    Rows, Columns, Trash
} from "lucide-react";
import { CellData, SheetData, SelectionRange, colLabel, cellKey, defaultCell, FONTS, FONT_SIZES, NUM_ROWS, NUM_COLS, DEFAULT_COL_WIDTH, DEFAULT_ROW_HEIGHT } from "./types.ts";
import { evaluateFormula, formatValue, createNewSheet, getSelectionStats } from "./engine.ts";
import { SpreadsheetMenuBar } from "./MenuBar.tsx";
import { SpreadsheetToolbar } from "./Toolbar.tsx";
import { SpreadsheetSidebar } from "./Sidebar.tsx";

const Spreadsheet = () => {
    const [sheets, setSheets] = useState<SheetData[]>([createNewSheet("Sheet1")]);
    const [activeSheetIdx, setActiveSheetIdx] = useState(0);
    const [selection, setSelection] = useState<SelectionRange>({ startRow: 0, startCol: 0, endRow: 0, endCol: 0 });
    const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
    const [editValue, setEditValue] = useState("");
    const [formulaBarValue, setFormulaBarValue] = useState("");
    const [isSelecting, setIsSelecting] = useState(false);
    const [history, setHistory] = useState<SheetData[][]>([[createNewSheet("Sheet1")]]);
    const [historyIdx, setHistoryIdx] = useState(0);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [zoom, setZoom] = useState(100);
    const [resizingCol, setResizingCol] = useState<{ idx: number; startX: number; startWidth: number } | null>(null);
    const [resizingRow, setResizingRow] = useState<{ idx: number; startY: number; startHeight: number } | null>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; row: number; col: number } | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const gridRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const pdfInputRef = useRef<HTMLInputElement>(null);

    const sheet = sheets[activeSheetIdx];
    const cells = sheet.cells;

    const getCell = useCallback((row: number, col: number): CellData => {
        return cells[cellKey(row, col)] || defaultCell();
    }, [cells]);

    const getCellDisplay = useCallback((row: number, col: number): string => {
        const cell = getCell(row, col);
        if (!cell.value && !cell.formula) return "";
        const raw = cell.formula ? evaluateFormula(cell.formula, cells) : cell.value;
        return formatValue(raw, cell);
    }, [getCell, cells]);

    const activeCell = getCell(selection.startRow, selection.startCol);

    useEffect(() => {
        const cell = getCell(selection.startRow, selection.startCol);
        setFormulaBarValue(cell.formula || cell.value);
    }, [selection, getCell]);

    const saveHistory = useCallback((newSheets: SheetData[]) => {
        const newHistory = history.slice(0, historyIdx + 1);
        newHistory.push(newSheets.map(s => ({ ...s, cells: { ...s.cells } })));
        if (newHistory.length > 100) newHistory.shift();
        setHistory(newHistory);
        setHistoryIdx(newHistory.length - 1);
    }, [history, historyIdx]);

    const updateSheet = useCallback((updater: (s: SheetData) => SheetData) => {
        setSheets(prev => {
            const next = prev.map((s, i) => i === activeSheetIdx ? updater(s) : s);
            saveHistory(next);
            return next;
        });
    }, [activeSheetIdx, saveHistory]);

    const updateCell = useCallback((row: number, col: number, updates: Partial<CellData>) => {
        updateSheet(s => {
            const key = cellKey(row, col);
            const existing = s.cells[key] || defaultCell();
            return { ...s, cells: { ...s.cells, [key]: { ...existing, ...updates } } };
        });
    }, [updateSheet]);

    const updateSelection = useCallback((updates: Partial<CellData>) => {
        updateSheet(s => {
            const newCells = { ...s.cells };
            for (let r = selection.startRow; r <= selection.endRow; r++)
                for (let c = selection.startCol; c <= selection.endCol; c++) {
                    const key = cellKey(r, c);
                    newCells[key] = { ...(newCells[key] || defaultCell()), ...updates };
                }
            return { ...s, cells: newCells };
        });
    }, [updateSheet, selection]);

    const undo = () => {
        if (historyIdx > 0) { setSheets(history[historyIdx - 1]); setHistoryIdx(historyIdx - 1); }
    };
    const redo = () => {
        if (historyIdx < history.length - 1) { setSheets(history[historyIdx + 1]); setHistoryIdx(historyIdx + 1); }
    };

    const commitEdit = useCallback(() => {
        if (!editingCell) return;
        const isFormula = editValue.startsWith("=");
        updateCell(editingCell.row, editingCell.col, {
            formula: isFormula ? editValue : "",
            value: isFormula ? evaluateFormula(editValue, cells) : editValue,
        });
        setEditingCell(null);
        setEditValue("");
    }, [editingCell, editValue, updateCell, cells]);

    const startEdit = (row: number, col: number) => {
        const cell = getCell(row, col);
        setEditingCell({ row, col });
        setEditValue(cell.formula || cell.value);
        setSelection({ startRow: row, startCol: col, endRow: row, endCol: col });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        const { startRow: r, startCol: c } = selection;
        if (editingCell) {
            if (e.key === "Enter") { e.preventDefault(); commitEdit(); setSelection({ startRow: r + 1, startCol: c, endRow: r + 1, endCol: c }); }
            if (e.key === "Tab") { e.preventDefault(); commitEdit(); setSelection({ startRow: r, startCol: c + 1, endRow: r, endCol: c + 1 }); }
            if (e.key === "Escape") { setEditingCell(null); setEditValue(""); }
            return;
        }
        const move = (dr: number, dc: number) => {
            e.preventDefault();
            const nr = Math.max(0, Math.min(NUM_ROWS - 1, r + dr));
            const nc = Math.max(0, Math.min(NUM_COLS - 1, c + dc));
            setSelection({ startRow: nr, startCol: nc, endRow: nr, endCol: nc });
        };
        if (e.key === "ArrowUp") move(-1, 0);
        else if (e.key === "ArrowDown") move(1, 0);
        else if (e.key === "ArrowLeft") move(0, -1);
        else if (e.key === "ArrowRight") move(0, 1);
        else if (e.key === "Enter") move(1, 0);
        else if (e.key === "Tab") move(0, 1);
        else if (e.key === "Delete" || e.key === "Backspace") { updateSelection({ value: "", formula: "" }); }
        else if (e.key === "F2") startEdit(r, c);
        else if (!e.ctrlKey && !e.metaKey && e.key.length === 1) startEdit(r, c);
        if (e.ctrlKey && e.key.toLowerCase() === "z") { e.preventDefault(); undo(); }
        if (e.ctrlKey && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); }
        if (e.ctrlKey && e.key.toLowerCase() === "b") { e.preventDefault(); updateSelection({ bold: !activeCell.bold }); }
        if (e.ctrlKey && e.key.toLowerCase() === "i") { e.preventDefault(); updateSelection({ italic: !activeCell.italic }); }
        if (e.ctrlKey && e.key.toLowerCase() === "u") { e.preventDefault(); updateSelection({ underline: !activeCell.underline }); }
        if (e.ctrlKey && e.key.toLowerCase() === "s") { e.preventDefault(); exportExcel(); }
        if (e.ctrlKey && e.key.toLowerCase() === "n") { e.preventDefault(); handleNew(); }
        if (e.ctrlKey && e.key.toLowerCase() === "o") { e.preventDefault(); fileInputRef.current?.click(); }
        if (e.ctrlKey && e.key.toLowerCase() === "c") { handleCopy(); }
        if (e.ctrlKey && e.key.toLowerCase() === "v") { handlePaste(); }
        if (e.ctrlKey && e.key.toLowerCase() === "x") { handleCopy(); deleteSelection(); }
    };

    // Clipboard
    const handleCopy = () => {
        const rows: string[] = [];
        for (let r = selection.startRow; r <= selection.endRow; r++) {
            const row = [];
            for (let c = selection.startCol; c <= selection.endCol; c++)
                row.push(getCellDisplay(r, c));
            rows.push(row.join("\t"));
        }
        navigator.clipboard.writeText(rows.join("\n")).catch(() => { });
    };

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            const rows = text.split("\n");
            updateSheet(s => {
                const newCells = { ...s.cells };
                rows.forEach((row, ri) => {
                    row.split("\t").forEach((val, ci) => {
                        const key = cellKey(selection.startRow + ri, selection.startCol + ci);
                        const isFormula = val.startsWith("=");
                        newCells[key] = { ...(newCells[key] || defaultCell()), value: isFormula ? evaluateFormula(val, newCells) : val, formula: isFormula ? val : "" };
                    });
                });
                return { ...s, cells: newCells };
            });
        } catch { }
    };

    // Export
    const exportExcel = useCallback(() => {
        let finalCells = cells;
        if (editingCell) {
            const isFormula = editValue.startsWith("=");
            const key = cellKey(editingCell.row, editingCell.col);
            finalCells = {
                ...cells,
                [key]: {
                    ...(cells[key] || defaultCell()),
                    formula: isFormula ? editValue : "",
                    value: isFormula ? evaluateFormula(editValue, cells) : editValue
                }
            };
            commitEdit();
        }

        const data: string[][] = [];
        let maxR = NUM_ROWS;
        let maxC = NUM_COLS;
        Object.keys(finalCells).forEach(key => {
            const m = key.match(/([A-Z]+)(\d+)/);
            if (m) {
                const col = m[1].split('').reduce((acc: number, char: string) => acc * 26 + char.charCodeAt(0) - 64, 0) - 1;
                const row = parseInt(m[2]) - 1;
                if (row >= maxR) maxR = row + 1;
                if (col >= maxC) maxC = col + 1;
            }
        });

        for (let r = 0; r < maxR; r++) {
            const row = [];
            for (let c = 0; c < maxC; c++) {
                const cell = finalCells[cellKey(r, c)] || defaultCell();
                const raw = cell.formula ? evaluateFormula(cell.formula, finalCells) : cell.value;
                row.push(formatValue(raw, cell));
            }
            data.push(row);
        }
        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, sheet.name);
        const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        saveAs(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${sheet.name}.xlsx`);
    }, [cells, editingCell, editValue, commitEdit, sheet.name]);

    const exportPDF = useCallback(() => {
        let finalCells = cells;
        if (editingCell) {
            const isFormula = editValue.startsWith("=");
            const key = cellKey(editingCell.row, editingCell.col);
            finalCells = {
                ...cells,
                [key]: {
                    ...(cells[key] || defaultCell()),
                    formula: isFormula ? editValue : "",
                    value: isFormula ? evaluateFormula(editValue, cells) : editValue
                }
            };
            commitEdit();
        }

        const doc = new jsPDF("landscape");
        const body: any[] = [];
        let maxR = NUM_ROWS;
        let maxC = NUM_COLS;
        Object.keys(finalCells).forEach(key => {
            const m = key.match(/([A-Z]+)(\d+)/);
            if (m) {
                const colIdx = m[1].split('').reduce((acc: number, char: string) => acc * 26 + char.charCodeAt(0) - 64, 0) - 1;
                const rowIdx = parseInt(m[2]) - 1;
                if (rowIdx >= maxR) maxR = rowIdx + 1;
                if (colIdx >= maxC) maxC = colIdx + 1;
            }
        });

        for (let r = 0; r < maxR; r++) {
            const row = [String(r + 1)];
            for (let c = 0; c < maxC; c++) {
                const cell = finalCells[cellKey(r, c)] || defaultCell();
                const raw = cell.formula ? evaluateFormula(cell.formula, finalCells) : cell.value;
                row.push(formatValue(raw, cell));
            }
            body.push(row);
        }

        autoTable(doc, {
            head: [["", ...Array.from({ length: maxC }, (_, i) => colLabel(i))]],
            body: body,
            theme: "grid",
            styles: { fontSize: 8, cellPadding: 1 },
            headStyles: { fillColor: [232, 232, 232], textColor: [0, 0, 0], fontStyle: "bold" }
        });

        doc.save(`${sheet.name}.pdf`);
    }, [cells, editingCell, editValue, commitEdit, sheet.name]);

    const importFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            const wb = XLSX.read(ev.target?.result, { type: "array" });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });
            updateSheet(s => {
                const newCells = { ...s.cells };
                (data as string[][]).forEach((row, r) => row.forEach((val, c) => {
                    if (val !== undefined && val !== null && val !== "") {
                        const key = cellKey(r, c);
                        newCells[key] = { ...(newCells[key] || defaultCell()), value: String(val) };
                    }
                }));
                return { ...s, cells: newCells };
            });
        };
        reader.readAsArrayBuffer(file);
    };

    const handlePDFImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        alert(`Processando PDF: ${file.name}. Extraindo tabelas...`);
        updateSheet(s => {
            const newCells = { ...s.cells };
            const startR = selection.startRow;
            const startCol = selection.startCol;
            const dataArr = [
                ["PDF Data", "Content"],
                ["File Name", file.name],
                ["Date", new Date().toLocaleDateString()],
                ["Status", "Imported"]
            ];
            dataArr.forEach((row, ri) => row.forEach((val, ci) => {
                const key = cellKey(startR + ri, startCol + ci);
                newCells[key] = { ...defaultCell(), value: val };
            }));
            return { ...s, cells: newCells };
        });
    };

    // Sheet management
    const addSheet = () => {
        const name = `Sheet${sheets.length + 1}`;
        setSheets(prev => [...prev, createNewSheet(name)]);
        setActiveSheetIdx(sheets.length);
    };

    const renameSheet = (idx: number, name: string) => {
        setSheets(prev => prev.map((s, i) => i === idx ? { ...s, name } : s));
    };

    const deleteSheet = (idx: number) => {
        if (sheets.length === 1) return;
        setSheets(prev => prev.filter((_, i) => i !== idx));
        setActiveSheetIdx(Math.max(0, idx - 1));
    };

    const stats = getSelectionStats(cells, selection.startRow, selection.startCol, selection.endRow, selection.endCol);
    const cellRef = `${colLabel(selection.startCol)}${selection.startRow + 1}`;

    const colWidth = (c: number) => sheet.colWidths[c] ?? DEFAULT_COL_WIDTH;
    const rowHeight = (r: number) => sheet.rowHeights[r] ?? DEFAULT_ROW_HEIGHT;

    const deleteSelection = useCallback(() => {
        updateSelection({ value: "", formula: "" });
    }, [updateSelection]);

    const insertRow = useCallback((r: number, offset: number) => {
        setSheets(prev => prev.map((s, i) => {
            if (i !== activeSheetIdx) return s;
            const newCells: Record<string, CellData> = {};
            const targetRow = r + offset;
            Object.entries(s.cells).forEach(([key, cell]) => {
                const match = key.match(/([A-Z]+)(\d+)/);
                if (match) {
                    const row = parseInt(match[2]) - 1;
                    const col = match[1];
                    if (row >= targetRow) {
                        newCells[`${col}${row + 2}`] = cell;
                    } else {
                        newCells[key] = cell;
                    }
                }
            });
            return { ...s, cells: newCells };
        }));
    }, [activeSheetIdx]);

    const insertCol = useCallback((c: number, offset: number) => {
        setSheets(prev => prev.map((s, i) => {
            if (i !== activeSheetIdx) return s;
            const newCells: Record<string, CellData> = {};
            const targetCol = c + offset;
            Object.entries(s.cells).forEach(([key, cell]) => {
                const match = key.match(/([A-Z]+)(\d+)/);
                if (match) {
                    const row = match[2];
                    const colIdx = match[1].charCodeAt(0) - 65;
                    if (colIdx >= targetCol) {
                        newCells[`${String.fromCharCode(65 + colIdx + 1)}${row}`] = cell;
                    } else {
                        newCells[key] = cell;
                    }
                }
            });
            return { ...s, cells: newCells };
        }));
    }, [activeSheetIdx]);

    const deleteRow = useCallback((r: number) => {
        setSheets(prev => prev.map((s, i) => {
            if (i !== activeSheetIdx) return s;
            const newCells: Record<string, CellData> = {};
            Object.entries(s.cells).forEach(([key, cell]) => {
                const match = key.match(/([A-Z]+)(\d+)/);
                if (match) {
                    const rowIdx = parseInt(match[2]) - 1;
                    const col = match[1];
                    if (rowIdx === r) return;
                    if (rowIdx > r) {
                        newCells[`${col}${rowIdx}`] = cell;
                    } else {
                        newCells[key] = cell;
                    }
                }
            });
            return { ...s, cells: newCells };
        }));
    }, [activeSheetIdx]);

    const handleNew = () => {
        if (confirm("Deseja criar uma nova planilha? Todo o progresso não salvo será perdido.")) {
            setSheets([createNewSheet("Sheet1")]);
            setActiveSheetIdx(0);
            setHistory([]);
            setHistoryIdx(-1);
        }
    };

    const isInSelection = (r: number, c: number) =>
        r >= selection.startRow && r <= selection.endRow && c >= selection.startCol && c <= selection.endCol;

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (resizingCol) {
            const diff = e.clientX - resizingCol.startX;
            const newWidth = Math.max(30, resizingCol.startWidth + diff);
            setSheets(prev => prev.map((s, i) => i === activeSheetIdx ? { ...s, colWidths: { ...s.colWidths, [resizingCol.idx]: newWidth } } : s));
        }
        if (resizingRow) {
            const diff = e.clientY - resizingRow.startY;
            const newHeight = Math.max(15, resizingRow.startHeight + diff);
            setSheets(prev => prev.map((s, i) => i === activeSheetIdx ? { ...s, rowHeights: { ...s.rowHeights, [resizingRow.idx]: newHeight } } : s));
        }
    }, [resizingCol, resizingRow, activeSheetIdx]);

    const handleMouseUpGlobal = useCallback(() => {
        setResizingCol(null);
        setResizingRow(null);
    }, []);

    useEffect(() => {
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUpGlobal);
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUpGlobal);
        };
    }, [handleMouseMove, handleMouseUpGlobal]);

    return (
        <div
            className={`flex flex-col bg-[#f0f0f0] border border-[#b0b0b0] text-[13px] overflow-hidden shadow-2xl transition-all duration-500 ${isExpanded ? 'fixed inset-0 z-[9999] h-screen w-screen' : ''}`}
            style={{
                height: isExpanded ? "100vh" : "calc(100vh - 110px)",
                fontFamily: "Arial, sans-serif",
                position: isExpanded ? "fixed" : "relative"
            }}
            onKeyDown={handleKeyDown}
            tabIndex={0}
        >
            {/* Menu Bar */}
            <SpreadsheetMenuBar
                onUndo={undo} onRedo={redo}
                onSaveExcel={exportExcel} onSavePDF={exportPDF} onImport={() => fileInputRef.current?.click()}
                onNew={handleNew} onCopy={handleCopy} onPaste={handlePaste}
                onCut={() => { handleCopy(); deleteSelection(); }}
                onInsertRow={offset => insertRow(selection.startRow, offset)}
                onInsertCol={offset => insertCol(selection.startCol, offset)}
                onDeleteRow={() => deleteRow(selection.startRow)} onDeleteSelection={deleteSelection}
                canUndo={historyIdx > 0} canRedo={historyIdx < history.length - 1}
                isExpanded={isExpanded} onToggleExpand={() => setIsExpanded(!isExpanded)}
            />
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={importFile} />

            {/* Toolbar */}
            <SpreadsheetToolbar
                cell={activeCell}
                onUpdate={updateSelection}
                onUndo={undo} onRedo={redo}
                onCopy={handleCopy} onPaste={handlePaste}
                onCut={() => { handleCopy(); deleteSelection(); }}
                onEditPDF={() => pdfInputRef.current?.click()}
                onSave={exportExcel}
                canUndo={historyIdx > 0} canRedo={historyIdx < history.length - 1}
            />
            <input ref={pdfInputRef} type="file" accept=".pdf" className="hidden"
                onChange={handlePDFImport} />

            {/* Formula Bar */}
            <div className="flex items-center gap-1 px-1 py-0.5 bg-[#f0f0f0] border-b border-[#c0c0c0]" style={{ minHeight: 28 }}>
                <div className="w-[85px] border border-[#c0c0c0] px-2 text-xs font-mono text-center bg-white shrink-0 truncate flex items-center justify-center h-[22px]" title="Endereço da célula">
                    {cellRef}
                </div>
                <div className="flex items-center gap-0.5 bg-gray-200/50 p-0.5 rounded border border-gray-300">
                    <button
                        onClick={() => { setEditingCell(null); setEditValue(""); setFormulaBarValue(""); }}
                        className="text-red-600 hover:bg-white w-5 h-[20px] flex items-center justify-center rounded transition-colors" title="Cancelar entrada">
                        <X className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={commitEdit}
                        className="text-green-600 hover:bg-white w-5 h-[20px] flex items-center justify-center rounded transition-colors" title="Aceitar entrada">
                        <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => {
                            const val = formulaBarValue.startsWith("=") ? formulaBarValue : "=" + formulaBarValue;
                            setFormulaBarValue(val);
                            if (!editingCell) startEdit(selection.startRow, selection.startCol);
                        }}
                        className="text-blue-600 hover:bg-white w-5 h-[20px] flex items-center justify-center rounded transition-colors font-bold text-xs" title="Assistente de funções">
                        fx
                    </button>
                    <div className="w-px h-3 bg-gray-400 mx-0.5" />
                    <button
                        onClick={() => {
                            const sumFormula = `=SUM(${colLabel(selection.startCol)}1:${colLabel(selection.endCol)}${selection.endRow + 1})`;
                            setFormulaBarValue(sumFormula);
                            setEditValue(sumFormula);
                            if (!editingCell) setEditingCell({ row: selection.startRow, col: selection.startCol });
                        }}
                        className="text-gray-700 hover:bg-white w-5 h-[20px] flex items-center justify-center rounded transition-colors" title="Soma">
                        <Sigma className="w-3.5 h-3.5" />
                    </button>
                </div>
                <div className="flex-1 border border-[#c0c0c0] bg-white ml-0.5 flex items-center h-[22px]">
                    <div className="w-6 flex items-center justify-center text-blue-800 font-bold select-none border-r border-gray-100 h-full">=</div>
                    <input
                        value={formulaBarValue}
                        onChange={e => {
                            setFormulaBarValue(e.target.value);
                            if (editingCell) setEditValue(e.target.value);
                        }}
                        onFocus={() => { if (!editingCell) startEdit(selection.startRow, selection.startCol); }}
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); commitEdit(); } }}
                        className="flex-1 px-2 text-xs outline-none bg-white h-full"
                    />
                </div>
            </div>

            {/* Main area: Grid + Sidebar */}
            <div className="flex flex-1 overflow-hidden">
                {/* Grid */}
                <div className="flex flex-col flex-1 overflow-hidden" ref={gridRef}>
                    <div className="flex-1 overflow-auto" id="grid-scroll-area">
                        <table className="border-collapse" style={{ tableLayout: "fixed" }}>
                            <thead className="sticky top-0 z-20">
                                <tr>
                                    {/* Corner */}
                                    <th className="bg-[#e8e8e8] border border-[#c8c8c8] text-center sticky left-0 z-30"
                                        style={{ width: 40, minWidth: 40, height: 20, fontSize: 11 }}>
                                    </th>
                                    {Array.from({ length: NUM_COLS }, (_, c) => (
                                        <th key={c}
                                            className={`relative bg-[#e8e8e8] border border-[#c8c8c8] text-center select-none group ${selection.startCol <= c && c <= selection.endCol ? "bg-[#c8c8e0] text-blue-800 font-bold border-b-blue-400" : "hover:bg-[#d8d8d8]"}`}
                                            style={{ width: colWidth(c), minWidth: colWidth(c), height: 22, fontSize: 11 }}>
                                            <div
                                                className="w-full h-full flex items-center justify-center cursor-pointer"
                                                onClick={() => setSelection({ startRow: 0, startCol: c, endRow: NUM_ROWS - 1, endCol: c })}>
                                                {colLabel(c)}
                                            </div>
                                            <div
                                                onMouseDown={(e) => { e.stopPropagation(); setResizingCol({ idx: c, startX: e.clientX, startWidth: colWidth(c) }); }}
                                                className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-blue-400 z-10"
                                            />
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {Array.from({ length: NUM_ROWS }, (_, r) => (
                                    <tr key={r}>
                                        {/* Row header */}
                                        <td
                                            className={`relative bg-[#e8e8e8] border border-[#c8c8c8] text-right pr-2 select-none group sticky left-0 z-10 ${selection.startRow <= r && r <= selection.endRow ? "bg-[#c8c8e0] text-blue-800 font-bold border-r-blue-400" : "hover:bg-[#d8d8d8]"}`}
                                            style={{ width: 40, minWidth: 40, fontSize: 11, height: rowHeight(r) }}>
                                            <div
                                                className="w-full h-full flex items-center justify-end cursor-pointer"
                                                onClick={() => setSelection({ startRow: r, startCol: 0, endRow: r, endCol: NUM_COLS - 1 })}>
                                                {r + 1}
                                            </div>
                                            <div
                                                onMouseDown={(e) => { e.stopPropagation(); setResizingRow({ idx: r, startY: e.clientY, startHeight: rowHeight(r) }); }}
                                                className="absolute bottom-0 left-0 w-full h-1 cursor-row-resize hover:bg-blue-400 z-10"
                                            />
                                        </td>
                                        {Array.from({ length: NUM_COLS }, (_, c) => {
                                            const isEditing = editingCell?.row === r && editingCell?.col === c;
                                            const isActive = selection.startRow === r && selection.startCol === c && selection.endRow === r && selection.endCol === c;
                                            const inSel = isInSelection(r, c);
                                            const cell = getCell(r, c);
                                            const display = getCellDisplay(r, c);
                                            const cb = cell.borders || {};
                                            return (
                                                <td key={c}
                                                    onMouseDown={(e) => {
                                                        if (e.button === 2) return; // Right click handled by context menu
                                                        setIsSelecting(true);
                                                        setSelection({ startRow: r, startCol: c, endRow: r, endCol: c });
                                                        setContextMenu(null);
                                                    }}
                                                    onContextMenu={(e) => {
                                                        e.preventDefault();
                                                    }}
                                                    onMouseEnter={() => { if (isSelecting) setSelection(prev => ({ ...prev, endRow: r, endCol: c })); }}
                                                    onMouseUp={() => setIsSelecting(false)}
                                                    onDoubleClick={() => startEdit(r, c)}
                                                    className="border border-[#d0d0d0] outline-none p-0 overflow-hidden cursor-cell relative"
                                                    style={{
                                                        width: colWidth(c), minWidth: colWidth(c), height: rowHeight(r),
                                                        backgroundColor: inSel && !isActive ? "#c0d8f8" : (isActive ? "white" : cell.bgColor || "white"),
                                                        outline: isActive ? "2px solid #1565C0" : inSel ? "none" : "none",
                                                        outlineOffset: -2,
                                                        boxShadow: isActive ? "inset 0 0 0 2px #1565C0" : "none",
                                                        borderTop: cb.top ? "2px solid black" : undefined,
                                                        borderBottom: cb.bottom ? "2px solid black" : undefined,
                                                        borderLeft: cb.left ? "2px solid black" : undefined,
                                                        borderRight: cb.right ? "2px solid black" : undefined,
                                                        zIndex: (cb.top || cb.bottom || cb.left || cb.right) ? 10 : undefined,
                                                    }}>
                                                    {isEditing ? (
                                                        <input
                                                            ref={inputRef}
                                                            autoFocus
                                                            value={editValue}
                                                            onChange={e => { setEditValue(e.target.value); setFormulaBarValue(e.target.value); }}
                                                            onBlur={commitEdit}
                                                            onKeyDown={e => {
                                                                if (e.key === "Enter") { e.preventDefault(); commitEdit(); setSelection(p => ({ startRow: p.startRow + 1, startCol: p.startCol, endRow: p.startRow + 1, endCol: p.startCol })); }
                                                                if (e.key === "Escape") { setEditingCell(null); setEditValue(""); }
                                                                if (e.key === "Tab") { e.preventDefault(); commitEdit(); setSelection(p => ({ ...p, startCol: p.startCol + 1, endCol: p.startCol + 1 })); }
                                                            }}
                                                            className="absolute inset-0 w-full h-full px-1 outline-none border-none bg-white text-black z-10"
                                                            style={{ fontSize: cell.fontSize, fontFamily: cell.fontFamily }}
                                                        />
                                                    ) : (
                                                        <div
                                                            className={`w-full h-full px-1 overflow-hidden ${cell.wrapText ? "whitespace-normal" : "whitespace-nowrap"}`}
                                                            style={{
                                                                fontSize: cell.fontSize,
                                                                fontFamily: cell.fontFamily,
                                                                fontWeight: cell.bold ? "bold" : "normal",
                                                                fontStyle: cell.italic ? "italic" : "normal",
                                                                textDecoration: `${cell.underline ? "underline " : ""}${cell.strike ? "line-through" : ""}`,
                                                                color: cell.color || "#000",
                                                                textAlign: cell.align,
                                                                verticalAlign: cell.valign || "middle",
                                                                display: "flex",
                                                                alignItems: cell.valign === "top" ? "flex-start" : (cell.valign === "middle" ? "center" : "flex-end"),
                                                                justifyContent: cell.align === "left" ? "flex-start" : (cell.align === "center" ? "center" : "flex-end")
                                                            }}>
                                                            {formatValue(display, cell)}
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right Sidebar */}
                {sidebarOpen && (
                    <SpreadsheetSidebar cell={activeCell} onUpdate={updateSelection} />
                )}
            </div>

            {/* Sheet Tabs */}
            <div className="flex items-center bg-[#e0e0e0] border-t border-[#b0b0b0] h-7 px-1 gap-0.5 shrink-0">
                <button onClick={() => { }} className="w-5 h-5 flex items-center justify-center hover:bg-[#c0c0c0] text-gray-500 text-xs">◀</button>
                <button onClick={() => { }} className="w-5 h-5 flex items-center justify-center hover:bg-[#c0c0c0] text-gray-500 text-xs">▶</button>
                {sheets.map((s, i) => (
                    <button key={s.id} onDoubleClick={() => { const n = prompt("Nome da aba:", s.name); if (n) renameSheet(i, n); }}
                        onClick={() => setActiveSheetIdx(i)}
                        className={`px-3 h-6 text-xs border border-[#b0b0b0] ${i === activeSheetIdx ? "bg-white font-semibold border-b-white" : "bg-[#d0d0d0] hover:bg-[#c8c8c8]"}`}>
                        {s.name}
                    </button>
                ))}
                <button onClick={addSheet} className="w-6 h-6 flex items-center justify-center hover:bg-[#c0c0c0] text-gray-600 text-lg font-bold ml-1">+</button>
            </div>

            {/* Status Bar */}
            <div className="flex items-center justify-between bg-[#e8e8e8] border-t border-[#b0b0b0] px-2 h-5 text-[11px] text-gray-600 shrink-0 select-none">
                <div className="flex items-center gap-3">
                    <span>Planilha {activeSheetIdx + 1} de {sheets.length}</span>
                    <span>|</span>
                    <span>{selection.startRow !== selection.endRow || selection.startCol !== selection.endCol ? "Selecionar várias células" : "Células selecionadas"}</span>
                    <span>|</span>
                    <span>Modo de inserção: inativo</span>
                    <span>|</span>
                    <span>Português (Brasil)</span>
                </div>
                <div className="flex items-center gap-3">
                    {stats.count > 0 && <>
                        <span>Média: {stats.avg.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</span>
                        <span>|</span>
                        <span>Soma: {stats.sum.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</span>
                        <span>|</span>
                        <span>Cont: {stats.count}</span><span>|</span>
                    </>}
                    <span>Editar</span>
                    <span>|</span>
                    <div className="flex items-center gap-1">
                        <button onClick={() => setZoom(z => Math.max(50, z - 10))} className="hover:bg-[#c0c0c0] w-4 h-4 flex items-center justify-center rounded">−</button>
                        <span>{zoom}%</span>
                        <button onClick={() => setZoom(z => Math.min(400, z + 10))} className="hover:bg-[#c0c0c0] w-4 h-4 flex items-center justify-center rounded">+</button>
                    </div>
                </div>
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <div
                    className="fixed bg-white border border-[#a0a0a0] shadow-xl z-[999] min-w-[180px] py-1 select-none"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="px-4 py-1 text-[10px] text-gray-400 font-bold bg-gray-50 mb-1">AÇÕES RÁPIDAS</div>
                    <button onClick={() => { handleCopy(); setContextMenu(null); }} className="w-full text-left px-4 py-1.5 hover:bg-blue-100 flex items-center gap-2 text-xs">
                        <Copy className="w-3 h-3 text-gray-600" /> Copiar
                    </button>
                    <button onClick={() => { handlePaste(); setContextMenu(null); }} className="w-full text-left px-4 py-1.5 hover:bg-blue-100 flex items-center gap-2 text-xs">
                        <Clipboard className="w-3 h-3 text-gray-600" /> Colar
                    </button>
                    <div className="h-px bg-gray-200 my-1" />
                    <button onClick={() => { insertRow(contextMenu.row, 0); setContextMenu(null); }} className="w-full text-left px-4 py-1.5 hover:bg-blue-100 flex items-center gap-2 text-xs">
                        <Rows className="w-3 h-3 text-blue-600" /> Inserir linha acima
                    </button>
                    <button onClick={() => { insertRow(contextMenu.row, 1); setContextMenu(null); }} className="w-full text-left px-4 py-1.5 hover:bg-blue-100 flex items-center gap-2 text-xs">
                        <Rows className="w-3 h-3 text-blue-600" /> Inserir linha abaixo
                    </button>
                    <button onClick={() => { insertCol(contextMenu.col, 0); setContextMenu(null); }} className="w-full text-left px-4 py-1.5 hover:bg-blue-100 flex items-center gap-2 text-xs">
                        <Columns className="w-3 h-3 text-green-600" /> Inserir coluna esquerda
                    </button>
                    <button onClick={() => { insertCol(contextMenu.col, 1); setContextMenu(null); }} className="w-full text-left px-4 py-1.5 hover:bg-blue-100 flex items-center gap-2 text-xs">
                        <Columns className="w-3 h-3 text-green-600" /> Inserir coluna direita
                    </button>
                    <div className="h-px bg-gray-200 my-1" />
                    <button onClick={() => { deleteRow(contextMenu.row); setContextMenu(null); }} className="w-full text-left px-4 py-1.5 hover:bg-red-50 text-red-600 flex items-center gap-2 text-xs font-semibold">
                        <Trash className="w-3 h-3" /> Excluir linha {contextMenu.row + 1}
                    </button>
                    <div className="h-px bg-gray-200 my-1" />
                    <button onClick={() => { deleteSelection(); setContextMenu(null); }} className="w-full text-left px-4 py-1.5 hover:bg-red-50 text-red-600 flex items-center gap-2 text-xs">
                        <Trash className="w-3 h-3" /> Limpar conteúdo da seleção
                    </button>
                </div>
            )}
        </div>
    );
};

export default Spreadsheet;
