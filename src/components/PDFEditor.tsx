import React, { useState, useRef, useEffect } from "react";
import * as pdfjs from "pdfjs-dist";
import {
    FileText, Download, Upload, Save, Scissors, Layers,
    Type, PenTool, Highlighter, MousePointer2, ZoomIn,
    ZoomOut, RotateCw, Trash2, CheckCircle2, FilePlus,
    FileStack, ShieldCheck, Printer, Copy, Share2, Plus,
    Eraser, Stamp, Undo2, Ban, Redo2, Image as ImageIcon,
    ArrowUpRight, X, Check, MoreVertical, Search, StickyNote,
    Lock, Bookmark, History, FileDown, ArrowLeftRight, Maximize, Maximize2,
    ChevronDown, ChevronUp, Cloud, Bold, Italic, Underline,
    Type as TypeIcon, AlignLeft, AlignCenter, AlignRight, Strikethrough,
    Link2, AlignJustify, ChevronLeft, ChevronRight, Palette, Pipette,
    Menu, BringToFront, SendToBack, PlusCircle, ShieldAlert, Info, Signature, Blend,
    Square, Circle, Minus, ArrowRight, CornerUpRight, Pentagon, Star, Shapes
} from "lucide-react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import { toast } from "sonner";

// Configure PDF.js worker precisely to match local version 5.6.205
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@5.6.205/build/pdf.worker.min.mjs`;

interface PDFPageItem {
    str: string;
    transform: number[];
    width: number;
    original: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strikethrough?: boolean;
    color?: string;
    fontSize?: number;
    align?: 'left' | 'center' | 'right';
    fontType?: string;
    bgColor?: string;
}

interface PDFPage {
    canvas: HTMLCanvasElement;
    text: string;
    items: PDFPageItem[];
    originalImage?: string; // Backup for discarding edits
    isCleansed?: boolean;   // Tracker for the background erasing logic
}

const PDFEditor = () => {
    const [pages, setPages] = useState<PDFPage[]>([]);
    const [currentPage, setCurrentPage] = useState(0);
    const [zoom, setZoom] = useState(1.19);
    const [isLoading, setIsLoading] = useState(false);
    const [tool, setTool] = useState<string>("select");
    const [docName, setDocName] = useState("relatorio-leads-2026");
    const [overlays, setOverlays] = useState<Array<any>>([]);
    const [activeColor, setActiveColor] = useState("#000000");
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [showMoreTools, setShowMoreTools] = useState(false);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; visible: boolean; id?: string; type?: string } | null>(null);
    const [showMaisDropdown, setShowMaisDropdown] = useState(false);
    const [maisActiveTab, setMaisActiveTab] = useState<"formas" | "carimbos">("formas");
    const [showFinishModal, setShowFinishModal] = useState(false);
    const [showCustomToolModal, setShowCustomToolModal] = useState(false);
    const [exportFormat, setExportFormat] = useState("pdf");
    const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
    const [selection, setSelection] = useState<{ x: number; y: number; w: number; h: number; x2?: number; y2?: number } | null>(null);
    const [activeRedactionId, setActiveRedactionId] = useState<string | null>(null);
    const [focusedItem, setFocusedItem] = useState<{ pageIdx: number; itemIdx: number } | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeSidebarTab, setActiveSidebarTab] = useState("pages");
    const [isResizing, setIsResizing] = useState<string | null>(null);
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [showPostItDropdown, setShowPostItDropdown] = useState(false);
    const [postItSettings, setPostItSettings] = useState({
        color: "#FEF9C3",
        width: 150,
        height: 150
    });

    const [fontSettings, setFontSettings] = useState({
        size: 14,
        color: "#1e293b",
        bold: false,
        italic: false,
        underline: false,
        strike: false,
        bgColor: "transparent",
        family: "Arial",
        align: "left" as "left" | "center" | "right"
    });
    const [arrowSettings, setArrowSettings] = useState({
        color: "#e11d48",
        opacity: 100,
        thickness: 2,
        link: ""
    });
    const [highlightSettings, setHighlightSettings] = useState({
        color: "#fde047", // yellow by default
        opacity: 50,
        link: ""
    });
    const [drawSettings, setDrawSettings] = useState({
        color: "#1a1a1a",
        thickness: 3
    });

    const [showLinkModal, setShowLinkModal] = useState<string | null>(null);

    const bringToFront = (id: string) => {
        setOverlays(ovs => {
            const item = ovs.find(o => o.id === id);
            if (!item) return ovs;
            return [...ovs.filter(o => o.id !== id), item];
        });
    };

    const sendToBack = (id: string) => {
        setOverlays(ovs => {
            const item = ovs.find(o => o.id === id);
            if (!item) return ovs;
            return [item, ...ovs.filter(o => o.id !== id)];
        });
    };
    const [draggingHandle, setDraggingHandle] = useState<{ id: string; handle: 'start' | 'end' } | null>(null);
    const [redactionSidebarOpen, setRedactionSidebarOpen] = useState(false);
    const [showRedactionApplyModal, setShowRedactionApplyModal] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const [croppingId, setCroppingId] = useState<string | null>(null);
    const [cropSettings, setCropSettings] = useState({ x: 0, y: 0, width: 100, height: 100 });
    const editorRef = useRef<HTMLDivElement>(null);

    // Core PDF Handling Logic
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            const dataUrl = ev.target?.result as string;
            const img = new Image();
            img.onload = () => {
                const id = Math.random().toString(36).substring(7);
                // Calculate size to fit better (max 300px width/height)
                let w = img.width;
                let h = img.height;
                const maxDim = 300;
                if (w > maxDim || h > maxDim) {
                    if (w > h) {
                        h = (h / w) * maxDim;
                        w = maxDim;
                    } else {
                        w = (w / h) * maxDim;
                        h = maxDim;
                    }
                }

                setOverlays([...overlays, {
                    id,
                    type: "image",
                    content: dataUrl,
                    x: 50,
                    y: 50,
                    width: w,
                    height: h,
                    page: currentPage,
                    rotation: 0,
                    opacity: 1,
                    link: ""
                }]);
                setActiveRedactionId(id);
                setTool("select");
            };
            img.src = dataUrl;
        };
        reader.readAsDataURL(file);
        // Reset input value to allow uploading same file again
        e.target.value = '';
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        setDocName(file.name.replace(".pdf", ""));

        try {
            const reader = new FileReader();
            reader.onload = async (ev) => {
                try {
                    const typedarray = new Uint8Array(ev.target?.result as ArrayBuffer);
                    const pdf = await pdfjs.getDocument({ data: typedarray }).promise;
                    const loadedPages: PDFPage[] = [];

                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const viewport = page.getViewport({ scale: 1.5 });
                        const canvas = document.createElement("canvas");
                        const context = canvas.getContext("2d");

                        if (context) {
                            canvas.height = viewport.height;
                            canvas.width = viewport.width;
                            const renderContext = { canvasContext: context, viewport, canvas };
                            await page.render(renderContext).promise;
                            const textContent = await page.getTextContent();
                            const text = textContent.items.map((item: any) => item.str).join(" ");
                            loadedPages.push({
                                canvas,
                                text,
                                items: textContent.items.map((item: any) => ({
                                    str: item.str,
                                    transform: item.transform,
                                    width: item.width,
                                    height: item.height,
                                    fontSize: Math.abs(item.transform[3]),
                                    original: item.str
                                })),
                                originalImage: canvas.toDataURL(),
                                isCleansed: false
                            });
                        }
                    }

                    setPages(loadedPages);
                    setCurrentPage(0);
                    toast.success(`PDF "${file.name}" carregado!`);
                } catch (err: any) {
                    toast.error(`Erro ao carregar PDF: ${err.message}`);
                } finally {
                    setIsLoading(false);
                }
            };
            reader.readAsArrayBuffer(file);
        } catch (error) {
            setIsLoading(false);
        }
    };

    const handleSave = async (format: string = "pdf") => {
        if (pages.length === 0) return;
        setIsLoading(true);
        setShowFinishModal(false);
        toast.info(`Convertendo para ${format.toUpperCase()}...`);

        try {
            const pdf = new jsPDF("p", "mm", "a4");
            const workbook = XLSX.utils.book_new();

            for (let i = 0; i < pages.length; i++) {
                const pageElement = document.getElementById(`pdf-page-${i}`);
                if (!pageElement) continue;
                if (i > 0 && format === "pdf") pdf.addPage();

                const canvas = await html2canvas(pageElement, {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    backgroundColor: "#ffffff"
                });

                const imgData = canvas.toDataURL("image/jpeg", 0.95);

                if (format === "pdf") {
                    const pdfWidth = pdf.internal.pageSize.getWidth();
                    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                    pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
                } else if (format === "png" || format === "jpg") {
                    const link = document.createElement("a");
                    link.download = `${docName}_p${i + 1}.${format}`;
                    link.href = canvas.toDataURL(format === "png" ? "image/png" : "image/jpeg", 0.95);
                    link.click();
                }
            }

            if (format === "pdf") pdf.save(`${docName}_editado.pdf`);
            toast.success("Download concluído!");
        } catch (error) {
            toast.error("Erro ao salvar arquivo.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectOverlay = (id: string) => {
        setActiveRedactionId(id);
        setShowMoreTools(false);
        setRedactionSidebarOpen(false);
    };


    const addOverlay = (e: React.MouseEvent) => {
        if (tool === "select" || tool === "edit" || tool === "redact" || tool === "seta" || tool === "text") return;
        const rect = editorRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x = (e.clientX - rect.left) / zoom;
        const y = (e.clientY - rect.top) / zoom;

        let type = tool;
        let content = "";
        let color = activeColor;

        if (type === "text") {
            content = "Insert text here";
            color = fontSettings.color;
        } else if (type === "sign") {
            content = "ASSINADO";
            color = "#ff0000";
        }

        const id = Math.random().toString(36).substring(7);
        setOverlays([...overlays, {
            id,
            page: currentPage,
            x,
            y,
            type,
            content,
            color,
            width: type === "text" ? 200 : 100,
            height: type === "text" ? 40 : 50,
            rotation: 0,
            fontFamily: fontSettings.family,
            fontSize: fontSettings.size,
            fontWeight: fontSettings.bold ? "bold" : "normal",
            fontStyle: fontSettings.italic ? "italic" : "normal",
            textDecoration: fontSettings.underline ? "underline" : (fontSettings.strike ? "line-through" : "none"),
            backgroundColor: fontSettings.bgColor,
            textAlign: fontSettings.align
        }]);

        if (type === "text" || type === "seta") {
            setTool("select");
            setActiveRedactionId(id);
        }
    };

    const handleMouseMoveGlobal = (e: React.MouseEvent) => {
        if (!editorRef.current) return;
        const rect = editorRef.current.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left) / zoom;
        const mouseY = (e.clientY - rect.top) / zoom;

        if (dragIndex !== null) {
            const newOverlays = [...overlays];
            const current = newOverlays[dragIndex];

            if (current.type === "seta") {
                // Para setas, usar coordenadas relativas à página para maior precisão
                const pageEl = document.getElementById(`pdf-page-${current.page}`);
                if (pageEl) {
                    const pageRect = pageEl.getBoundingClientRect();
                    const px = (e.clientX - pageRect.left) / zoom;
                    const py = (e.clientY - pageRect.top) / zoom;
                    const dx = px - (dragStart?.x || px);
                    const dy = py - (dragStart?.y || py);

                    current.x1 = (current.x1 || 0) + dx;
                    current.y1 = (current.y1 || 0) + dy;
                    current.x2 = (current.x2 || 0) + dx;
                    current.y2 = (current.y2 || 0) + dy;
                    current.x = Math.min(current.x1, current.x2);
                    current.y = Math.min(current.y1, current.y2);
                    current.width = Math.abs(current.x2 - current.x1);
                    current.height = Math.abs(current.y2 - current.y1);

                    setDragStart({ x: px, y: py });
                    setOverlays(newOverlays);
                }
            } else {
                const dx = mouseX - (dragStart?.x || mouseX);
                const dy = mouseY - (dragStart?.y || mouseY);
                current.x = (current.x || 0) + dx;
                current.y = (current.y || 0) + dy;
                setDragStart({ x: mouseX, y: mouseY });
                setOverlays(newOverlays);
            }
        } else if (isResizing && dragStart) {
            const idx = overlays.findIndex(o => o.id === activeRedactionId);
            if (idx === -1) return;
            const newOverlays = [...overlays];
            const current = newOverlays[idx];

            if (isResizing === "rotate") {
                const pageEl = document.getElementById(`pdf-page-${current.page}`);
                if (pageEl) {
                    const pageRect = pageEl.getBoundingClientRect();
                    const pmx = (e.clientX - pageRect.left) / zoom;
                    const pmy = (e.clientY - pageRect.top) / zoom;
                    const centerX = (current.x || 0) + (current.width || 0) / 2;
                    const centerY = (current.y || 0) + (current.height || 0) / 2;
                    const angle = Math.atan2(pmy - centerY, pmx - centerX) * (180 / Math.PI);
                    current.rotation = angle + 90;
                }
            } else {
                const dx = mouseX - (dragStart?.x || mouseX);
                const dy = mouseY - (dragStart?.y || mouseY);
                const ratio = (current.width || 1) / (current.height || 1);

                if (current.type === "image") {
                    // Constant aspect ratio resizing for images
                    if (isResizing === "rb") {
                        const newW = Math.max(20, (current.width || 0) + dx);
                        current.width = newW;
                        current.height = newW / ratio;
                    } else if (isResizing === "lt") {
                        const newW = Math.max(20, (current.width || 0) - dx);
                        current.x = (current.x || 0) + ((current.width || 0) - newW);
                        current.y = (current.y || 0) + ((current.height || 0) - newW / ratio);
                        current.width = newW;
                        current.height = newW / ratio;
                    } else if (isResizing === "rt") {
                        const newW = Math.max(20, (current.width || 0) + dx);
                        current.y = (current.y || 0) - (newW / ratio - (current.height || 0));
                        current.width = newW;
                        current.height = newW / ratio;
                    } else if (isResizing === "lb") {
                        const newW = Math.max(20, (current.width || 0) - dx);
                        current.x = (current.x || 0) + ((current.width || 0) - newW);
                        current.width = newW;
                        current.height = newW / ratio;
                    }
                } else {
                    // Free resizing for other types
                    if (isResizing.includes('l')) {
                        const newW = (current.width || 0) - dx;
                        if (newW > 10) {
                            current.x = (current.x || 0) + dx;
                            current.width = newW;
                        }
                    }
                    if (isResizing.includes('r')) {
                        current.width = Math.max(10, (current.width || 0) + dx);
                    }

                    if (isResizing.includes('t')) {
                        const newH = (current.height || 0) - dy;
                        if (newH > 10) {
                            current.y = (current.y || 0) + dy;
                            current.height = newH;
                        }
                    }
                    if (isResizing.includes('b')) {
                        current.height = Math.max(10, (current.height || 0) + dy);
                    }
                }

                setDragStart({ x: mouseX, y: mouseY });
            }

            setOverlays([...newOverlays]);
        } else if (draggingHandle) {
            const idx = overlays.findIndex(o => o.id === draggingHandle.id);
            if (idx === -1) return;
            const newOverlays = [...overlays];
            const current = newOverlays[idx];

            // Usar coordenadas relativas à página para precisão máxima
            const pageEl = document.getElementById(`pdf-page-${current.page}`);
            if (pageEl) {
                const pageRect = pageEl.getBoundingClientRect();
                const px = (e.clientX - pageRect.left) / zoom;
                const py = (e.clientY - pageRect.top) / zoom;

                if (draggingHandle.handle === 'start') {
                    current.x1 = px;
                    current.y1 = py;
                } else {
                    current.x2 = px;
                    current.y2 = py;
                }

                // Recalcular bounding box
                current.x = Math.min(current.x1, current.x2);
                current.y = Math.min(current.y1, current.y2);
                current.width = Math.abs(current.x2 - current.x1);
                current.height = Math.abs(current.y2 - current.y1);

                if (current.type === "redact" || current.type === "redigir") {
                    current.isRedaction = true;
                    current.color = "transparent";
                    current.applied = false;
                }

                setOverlays(newOverlays);
                setSelection(null);
                setDragStart(null);
            }
        }
    };

    const handleMouseUpGlobal = () => {
        setDragIndex(null);
        setIsResizing(null);
        setDraggingHandle(null);
    };

    const cleanseCanvas = (idx: number) => {
        const page = pages[idx];
        const ctx = page.canvas.getContext("2d");
        if (!ctx) return;

        page.items.forEach(item => {
            const x = item.transform[4] * 1.5;
            const y = (page.canvas.height) - (item.transform[5] * 1.5);
            const fontSize = Math.abs(item.transform[3]) * 1.5;

            const sampleX = Math.max(0, (item.transform[4] - 5) * 1.5);
            const pixel = ctx.getImageData(sampleX, y - (fontSize / 2), 1, 1).data;
            ctx.fillStyle = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
            ctx.fillRect(x, y - fontSize, (item.width || 100) * 1.5, fontSize + 5);
        });

        page.isCleansed = true;
        setPages([...pages]);
    };

    useEffect(() => {
        if (tool === "edit" && pages.length > 0) {
            pages.forEach((_, i) => cleanseCanvas(i));
        }
    }, [tool]);

    const getRedactionText = (o: any) => {
        const page = pages[o.page];
        if (!page) return "Assinalado para redação";

        const extracted = page.items
            .filter(item => {
                const x = item.transform[4];
                const y = (page.canvas.height / 1.5) - item.transform[5];
                return x >= o.x && x <= o.x + o.width && y >= o.y - 10 && y <= o.y + o.height;
            })
            .map(item => item.str)
            .join(" ");

        return extracted.trim() || "Área selecionada";
    };

    const INTERACTIVE_TOOLS = ["redact", "redigir", "seta", "text", "erase", "highlight", "draw", "check", "cross", "rect", "circle", "line", "arrow", "curve", "pentagon", "cloud", "star", "stamp", "postit"];

    const handleRedactMouseDown = (e: React.MouseEvent, pageIdx: number) => {
        // Only allow left click (button 0) for creating/selecting items
        if (e.button !== 0) return;

        if (!INTERACTIVE_TOOLS.includes(tool)) {
            if (tool === "select") setActiveRedactionId(null);
            return;
        }

        // Deselect current item when starting a new redaction or arrow
        setActiveRedactionId(null);

        const rect = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - rect.left) / zoom;
        const y = (e.clientY - rect.top) / zoom;
        setDragStart({ x, y });
        setSelection({ x, y, w: 0, h: 0, x2: x, y2: y });
        setCurrentPage(pageIdx);

        if (tool === "draw") {
            const id = Math.random().toString(36).substring(7);
            setOverlays([...overlays, {
                id, type: "draw", points: [{ x, y }],
                x, y, width: 1, height: 1, page: pageIdx,
                color: drawSettings.color, thickness: drawSettings.thickness, link: "",
                isDrawingActive: true, rotation: 0
            }]);
        }
    };

    const handleRedactMouseMove = (e: React.MouseEvent) => {
        if (!dragStart || !INTERACTIVE_TOOLS.includes(tool)) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - rect.left) / zoom;
        const y = (e.clientY - rect.top) / zoom;

        setSelection({
            x: Math.min(x, dragStart.x),
            y: Math.min(y, dragStart.y),
            w: Math.abs(x - dragStart.x),
            h: Math.abs(y - dragStart.y),
            x2: x,
            y2: y
        });

        if (tool === "draw") {
            setOverlays(prev => {
                const newOverlays = [...prev];
                const activeDraw = newOverlays.find(o => o.isDrawingActive);
                if (activeDraw) {
                    activeDraw.points.push({ x, y });
                    const xs = activeDraw.points.map((p: any) => p.x);
                    const ys = activeDraw.points.map((p: any) => p.y);
                    activeDraw.x = Math.min(...xs);
                    activeDraw.y = Math.min(...ys);
                    activeDraw.width = Math.max(Math.max(...xs) - activeDraw.x, 10);
                    activeDraw.height = Math.max(Math.max(...ys) - activeDraw.y, 10);
                }
                return newOverlays;
            });
        }
    };

    const handlePageContextMenu = (e: React.MouseEvent, pageIdx: number) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleRedactMouseUp = (e: React.MouseEvent) => {
        if (tool === "draw") {
            setOverlays(prev => {
                const newOverlays = [...prev];
                const activeDraw = newOverlays.find(o => o.isDrawingActive);
                if (activeDraw) {
                    activeDraw.isDrawingActive = false;
                    activeDraw.points = activeDraw.points.map((p: any) => ({ x: p.x - activeDraw.x, y: p.y - activeDraw.y }));
                    activeDraw.originalWidth = activeDraw.width;
                    activeDraw.originalHeight = activeDraw.height;
                    setTimeout(() => setActiveRedactionId(activeDraw.id), 50);
                }
                return newOverlays;
            });
            setTool("select");
            setDragStart(null);
            setSelection(null);
            return;
        }

        if (!selection || !dragStart) {
            setDragStart(null);
            setSelection(null);
            return;
        }

        if (tool === "seta") {
            const id = Math.random().toString(36).substring(7);
            const rect = e.currentTarget.getBoundingClientRect();
            const x = (e.clientX - rect.left) / zoom;
            const y = (e.clientY - rect.top) / zoom;

            // Incrementamos o tamanho da seta de 30 para 60 para melhor visibilidade
            const x1 = x + 60; // Base x
            const y1 = y + 60; // Base y
            const x2 = x;      // Head x (onde o usuário clicou)
            const y2 = y;      // Head y (onde o usuário clicou)

            setOverlays([...overlays, {
                id,
                type: "seta",
                x1, y1, x2, y2,
                x: Math.min(x1, x2),
                y: Math.min(y1, y2),
                width: Math.abs(x2 - x1),
                height: Math.abs(y2 - y1),
                page: currentPage,
                color: arrowSettings.color,
                opacity: arrowSettings.opacity,
                thickness: arrowSettings.thickness,
                link: arrowSettings.link,
                isNew: true
            }]);

            setTimeout(() => {
                setOverlays(prev => prev.map(o => o.id === id ? { ...o, isNew: false } : o));
            }, 500);

            // Abre o menu de contexto com um pequeno offset para não cobrir a seta
            setContextMenu({
                x: rect.left + (x1 * zoom),
                y: rect.top + (y1 * zoom),
                visible: true,
                id: id,
                type: "seta"
            });
            setActiveRedactionId(id);
            // Após criar a seta, voltar para o modo de seleção
            // para que cliques seguintes não criem novas setas
            setTool("select");
        } else if (INTERACTIVE_TOOLS.includes(tool) && selection && selection.w > 5 && selection.h > 5) {
            const id = Math.random().toString(36).substring(7);
            if (tool === "redact" || tool === "redigir") {
                setOverlays([...overlays, {
                    id,
                    type: "redigir",
                    isRedaction: true,
                    applied: false,
                    x: selection.x,
                    y: selection.y,
                    width: selection.w,
                    height: selection.h,
                    page: currentPage,
                    color: "transparent"
                }]);
            } else if (tool === "erase") {
                setOverlays([...overlays, { id, type: "erase", x: selection.x, y: selection.y, width: selection.w, height: selection.h, page: currentPage, color: "#ffffff" }]);
                setTool("select");
                setActiveRedactionId(id);
            } else if (tool === "highlight") {
                setOverlays([...overlays, { id, type: "highlight", x: selection.x, y: selection.y, width: selection.w, height: selection.h, page: currentPage, color: highlightSettings.color, opacity: highlightSettings.opacity / 100, link: highlightSettings.link }]);
                setTool("select");
                setActiveRedactionId(id);
            } else if (tool === "text") {
                setOverlays([...overlays, {
                    id,
                    type: "text",
                    x: selection.x,
                    y: selection.y,
                    width: selection.w,
                    height: selection.h,
                    page: currentPage,
                    content: "Insert text here",
                    color: fontSettings.color,
                    fontFamily: fontSettings.family,
                    fontSize: fontSettings.size,
                    fontWeight: fontSettings.bold ? "bold" : "normal",
                    fontStyle: fontSettings.italic ? "italic" : "normal",
                    textDecoration: fontSettings.underline ? "underline" : (fontSettings.strike ? "line-through" : "none"),
                    backgroundColor: fontSettings.bgColor,
                    textAlign: fontSettings.align
                }]);
                setTool("select");
                setActiveRedactionId(id);
            } else if (["check", "cross", "rect", "circle", "line", "arrow", "curve", "pentagon", "cloud", "star", "stamp", "postit"].includes(tool)) {
                setOverlays([...overlays, {
                    id, type: tool, x: selection.x, y: selection.y,
                    width: tool === 'postit' ? postItSettings.width : Math.max(selection.w, 40),
                    height: tool === 'postit' ? postItSettings.height : Math.max(selection.h, 40),
                    page: currentPage,
                    color: tool === "check" ? "#1a1a1a" : (tool === "cross" ? "#248AF6" : (activeColor || "#1a1a1a")),
                    bgColor: tool === 'postit' ? postItSettings.color : undefined,
                    content: tool === 'postit' ? "Adicionar texto" : undefined
                }]);
                setTool("select");
                setActiveRedactionId(id);
            }
        } else if (tool === "text" && selection) {
            // Se foi apenas um clique sem arrastar, cria uma caixa de texto padrão
            const id = Math.random().toString(36).substring(7);
            setOverlays([...overlays, {
                id,
                type: "text",
                x: selection.x,
                y: selection.y,
                width: 200,
                height: 40,
                page: currentPage,
                content: "Insert text here",
                color: fontSettings.color,
                fontFamily: fontSettings.family,
                fontSize: fontSettings.size,
                fontWeight: fontSettings.bold ? "bold" : "normal",
                fontStyle: fontSettings.italic ? "italic" : "normal",
                textDecoration: fontSettings.underline ? "underline" : (fontSettings.strike ? "line-through" : "none"),
                backgroundColor: fontSettings.bgColor,
                textAlign: fontSettings.align
            }]);
            setTool("select");
            setActiveRedactionId(id);
        } else if (["check", "cross", "rect", "circle", "line", "arrow", "curve", "pentagon", "cloud", "star", "stamp", "postit"].includes(tool) && selection) {
            const id = Math.random().toString(36).substring(7);
            setOverlays([...overlays, {
                id, type: tool, x: selection.x, y: selection.y,
                width: tool === 'postit' ? postItSettings.width : 60,
                height: tool === 'postit' ? postItSettings.height : 60,
                page: currentPage,
                color: tool === "check" ? "#1a1a1a" : (tool === "cross" ? "#248AF6" : (activeColor || "#1a1a1a")),
                bgColor: tool === 'postit' ? postItSettings.color : undefined,
                content: tool === 'postit' ? "Adicionar texto" : undefined
            }]);
            setTool("select");
            setActiveRedactionId(id);
        }
        setDragStart(null);
        setSelection(null);
    };

    // SVGs Assets
    const FilesEditorLogo = () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="144" height="24" fill="none" viewBox="0 0 199 30">
            <path fill="#000" d="M45.574 18.634v9.092q0 .274-.24.274H41.63q-.206 0-.206-.274V5.596q0-.24.24-.24h12.592q.275 0 .309.24l.343 2.676q.034.309-.275.309h-9.058v6.827h8.132q.274 0 .274.275v2.676q0 .275-.274.275zm12.055 9.058V11.566q0-.275.275-.275h3.637q.274 0 .274.275v16.16q0 .274-.274.274h-3.603q-.309 0-.309-.308m2.093-19.18q-.994 0-1.612-.583-.618-.618-.618-1.647t.618-1.647q.651-.618 1.647-.618 1.029 0 1.612.618.618.617.618 1.647 0 1.029-.618 1.647-.617.583-1.647.583m6.284 15.646V3.778q0-.241.274-.241h3.603q.309 0 .309.24v20.415q0 1.166.926 1.166.309 0 .72-.068.172 0 .172.206v2.127q0 .31-.206.377-.824.344-2.127.343-1.75 0-2.71-.926-.96-.927-.961-3.26m18.59-3.775h-6.278q.034 2.197 1.235 3.466 1.2 1.27 3.603 1.27 2.195 0 3.911-.756.206-.137.206.138v2.504a.52.52 0 0 1-.206.412q-1.956.892-4.803.892-4.221 0-6.21-2.402-1.957-2.436-1.956-6.073 0-3.774 2.058-6.313 2.059-2.539 5.627-2.539 3.397 0 5.044 2.093 1.68 2.093 1.681 4.907 0 1.406-.137 1.99-.035.24-.275.274-.891.137-3.5.137m-6.278-2.642h4.529q1.475 0 1.681-.068.034-.138.034-.48 0-1.304-.686-2.334-.685-1.029-2.23-1.029-1.51 0-2.333 1.098t-.995 2.813m22.876-2.607a6.66 6.66 0 0 0-3.74-1.132q-1.166 0-1.715.446t-.55 1.063q0 .652.447 1.133.48.48 2.024 1.166 2.676 1.132 3.74 2.368 1.064 1.2 1.064 3.053 0 2.333-1.75 3.706-1.716 1.372-4.564 1.372-2.881 0-4.666-.995a.43.43 0 0 1-.206-.377v-3.088q0-.138.069-.172.103-.069.172 0 2.127 1.578 4.528 1.579 1.133 0 1.75-.447.618-.445.618-1.132 0-.72-.515-1.2-.48-.516-1.99-1.201-2.538-1.098-3.568-2.3-1.03-1.234-1.03-3.053 0-2.127 1.579-3.534t4.392-1.407q2.64 0 4.048.755.172.069.172.412v2.745q0 .411-.309.24m26.1 9.916-.515 2.676q-.033.274-.308.274h-12.97q-.309 0-.308-.274V5.63q0-.275.274-.275h12.592q.274 0 .309.24l.377 2.677q0 .309-.24.309h-9.127v6.279h8.235q.24 0 .24.24v2.71q0 .275-.274.275h-8.201v6.69h9.676q.275 0 .24.275m10.496 3.26q-3.843 0-6.142-2.162-2.298-2.162-2.298-6.382 0-3.843 2.47-6.313t6.587-2.47q1.03 0 1.785.17v-7.41q0-.206.205-.206h3.775q.171 0 .171.206v20.552q0 1.304.103 2.264.035.206-.171.31-2.985 1.44-6.485 1.44m2.402-3.398V14.311q-.686-.378-1.853-.378-2.093 0-3.397 1.475-1.304 1.477-1.304 4.186 0 2.883 1.27 4.255 1.304 1.372 3.294 1.372 1.234 0 1.99-.309m8.374 2.78V11.566q0-.275.274-.275h3.637q.274 0 .274.275v16.16q0 .274-.274.274h-3.603q-.309 0-.308-.308m2.092-19.18q-.994 0-1.612-.583-.618-.618-.618-1.647t.618-1.647q.651-.618 1.647-.618 1.03 0 1.612.618.618.617.618 1.647 0 1.029-.618 1.647-.617.583-1.647.583m14.545 16.812v2.059q0 .274-.206.412-1.167.514-2.985.514-4.392 0-4.392-4.735v-9.23h-2.024q-.24-.033-.24-.308v-2.47q0-.275.274-.275h2.025q.068-2.848.343-4.083.068-.274.274-.309l3.466-.446q.274-.068.274.172-.172 1.785-.172 4.666h3.157q.24 0 .24.24v2.574q0 .24-.24.24h-3.191v8.783q0 1.167.412 1.716.411.514 1.407.514.549 0 1.372-.205.206-.069.206.171m10.072-14.342q3.67 0 5.729 2.402 2.093 2.401 2.093 6.21 0 4.05-2.161 6.382-2.162 2.334-5.764 2.333-3.946 0-5.97-2.47-1.99-2.505-1.99-6.176 0-3.843 2.196-6.245 2.23-2.436 5.867-2.436m-.172 2.951q-1.682 0-2.676 1.475-.995 1.441-.995 4.186 0 2.676.995 4.255 1.03 1.545 2.813 1.544 1.578 0 2.608-1.441 1.029-1.44 1.029-4.29 0-2.64-.926-4.185-.927-1.544-2.848-1.544m11.392-2.642h3.226q.274 0 .377.275.274.685.343 1.99 1.99-2.574 5.25-2.574.24 0 .24.24v3.466q0 .274-.275.24-2.985-.171-4.7 1.544-.309.309-.309.823V27.76q0 .24-.274.24h-3.603q-.309 0-.309-.274V16.129q0-2.779-.171-4.598-.035-.24.205-.24"></path>
            <rect width="26.305" height="30" x="4.575" y="0.001" fill="#DA2D26" rx="2.507"></rect>
            <path fill="#E6514B" d="M0 10.345h30.88a2.287 2.287 0 0 1 2.287 2.288v5.77a2.287 2.287 0 0 1-2.288 2.287H0z"></path>
            <path fill="#87140F" d="m4.59 20.69-.013 3.103L.002 20.69z"></path>
            <path fill="#fff" d="M23.004 11.691h5.769v1.384h-3.961v1.762h2.914v1.265h-2.914v3.146h-1.808zM13.987 11.69h2.89q1.356 0 2.367.454t1.558 1.297.548 1.99q0 1.88-1.214 2.853-1.2.963-3.354.963h-2.795zm2.89 6.184q1.274 0 1.95-.65.68-.647.679-1.794 0-.68-.297-1.221a2.07 2.07 0 0 0-.869-.843q-.57-.303-1.344-.303h-1.201v4.81zM5.72 11.691h3.496q1.416 0 2.26.681.845.67.845 1.87 0 1.233-.845 1.892-.832.66-2.26.66H7.527v2.454H5.72zm3.235 3.73q1.534 0 1.534-1.178 0-.66-.416-.92-.405-.258-1.118-.259H7.527v2.357z"></path>
        </svg>
    );

    return (
        <div
            className={`flex flex-col bg-[#F3F3F3] text-[#212B36] font-sans selection:bg-blue-100 overflow-hidden transition-all duration-500 ${isExpanded ? 'fixed inset-0 z-[9999] h-screen w-screen' : 'h-screen relative'}`}
            onMouseMove={handleMouseMoveGlobal}
            onMouseUp={handleMouseUpGlobal}
            onClick={(e) => {
                // Fecha o menu de contexto ao clicar fora dele
                const target = e.target as HTMLElement;
                if (!target.closest('.context-menu-panel')) {
                    setContextMenu(null);
                }
            }}
        >
            {/* DOCUMENT HEADER */}
            <header className="bg-white border-b border-[#E5E7EB] shrink-0 z-50">
                <div className="flex items-center justify-between px-6 py-2 h-14">
                    <div className="flex items-center gap-8">
                        <button className="hover:opacity-80 transition-opacity">
                            <FilesEditorLogo />
                        </button>

                        <div className="flex items-center gap-2">
                            <div className="text-[#A6A6A6]">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 16 16">
                                    <path fill="currentColor" d="M10.884 13.647H4.116a3.46 3.46 0 0 1-2.39-.965 3.72 3.72 0 0 1-1.131-2.39 3.77 3.77 0 0 1 .725-2.556 3.5 3.5 0 0 1 2.198-1.371 5.5 5.5 0 0 1 1.92-2.686 5.16 5.16 0 0 1 3.064-1.032 5.16 5.16 0 0 1 3.073 1.002c.9.657 1.58 1.589 1.946 2.666a3.8 3.8 0 0 0-1.348.193 4.1 4.1 0 0 0-1.53-1.855 3.86 3.86 0 0 0-2.272-.63c-.8.033-1.573.316-2.216.814A4.12 4.12 0 0 0 4.769 6.81l-.169.515a.46.46 0 0 1-.132.2.43.43 0 0 1-.212.103l-.516.092a2.2 2.2 0 0 0-1.37.86 2.36 2.36 0 0 0-.45 1.595c.047.571.298 1.104.705 1.492s.939.604 1.49.604h5.707c.256.535.62 1.003 1.062 1.375" />
                                    <path fill="#41AE07" d="M15.581 10.897c0-1.265-.987-2.292-2.205-2.292s-2.206 1.027-2.206 2.292c0 1.266.988 2.292 2.206 2.292s2.205-1.026 2.205-2.292" />
                                </svg>
                            </div>
                            <h5 className="text-[15px] font-semibold text-[#212B36] truncate max-w-[200px]">{docName}</h5>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-white border border-[#E5E7EB] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#F9FAFB] transition-colors flex items-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 16 16" className="text-gray-500">
                                <path fill="currentColor" d="M2.61 0a.55.55 0 0 0-.477.533v14.934c0 .279.254.533.533.533h10.667c.28 0 .533-.254.533-.533V4.089a.54.54 0 0 0-.155-.378L10.155.156A.54.54 0 0 0 9.777 0zm.59 1.067h6.044v3.022c0 .28.254.533.533.533H12.8v10.311H3.2zm7.11.75 1.74 1.739h-1.74zM8 6.933a.53.53 0 0 0-.4.178L5.843 8.867a.536.536 0 0 0 0 .755.535.535 0 0 0 .755 0l.867-.866v3.688a.533.533 0 1 0 1.067 0V8.756l.866.866a.535.535 0 0 0 .756-.755L8.399 7.11a.53.53 0 0 0-.4-.178" />
                            </svg>
                            Carregar novo
                        </button>

                        <div className="w-[1px] h-6 bg-[#E5E7EB]" />

                        <div className="flex items-center gap-1">
                            <button className="p-2 text-gray-500 hover:bg-[#F9FAFB] rounded-lg transition-colors">
                                <Printer className="w-5 h-5" />
                            </button>
                            <button onClick={() => handleSave("pdf")} className="p-2 text-gray-500 hover:bg-[#F9FAFB] rounded-lg transition-colors">
                                <Download className="w-5 h-5" />
                            </button>
                        </div>

                        <button className="border border-[#E5E7EB] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#F9FAFB] transition-colors flex items-center gap-2">
                            <ArrowLeftRight className="w-4 h-4 text-emerald-500" />
                            Converter
                        </button>

                        <button
                            onClick={() => setShowFinishModal(true)}
                            className="bg-[#248AF6] text-white px-6 py-2 rounded-lg text-sm font-bold shadow-lg shadow-blue-500/20 hover:bg-[#1C6DD0] transition-colors uppercase tracking-wider"
                        >
                            CONCLUÍDO
                        </button>

                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className={`p-2 rounded-lg transition-all border ${isExpanded ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-inner' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300'}`}
                            title={isExpanded ? "Contrair Editor" : "Expandir Editor"}
                        >
                            <Maximize2 className={`w-5 h-5 transition-transform duration-500 ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>


                        <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={handleFileUpload} />
                        <input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </div>
                </div>
            </header>

            {/* TOOL RIBBON */}
            <div className="bg-white border-b border-[#E5E7EB] h-16 flex items-center px-4 gap-2 shadow-sm shrink-0 z-[100] relative">
                <div className="flex items-center gap-1 px-3 border-r border-[#E5E7EB]">
                    <button className="p-2 text-gray-300 hover:text-gray-600 disabled:opacity-30" disabled>
                        <Undo2 className="w-5 h-5" />
                    </button>
                    <button className="p-2 text-gray-300 hover:text-gray-600 disabled:opacity-30" disabled>
                        <Redo2 className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex items-center gap-1.5 p-1 bg-[#F9FAFB] rounded-xl border border-[#F3F4F6]">
                    <button
                        onClick={() => setTool("select")}
                        className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-lg transition-all ${tool === "select" ? "bg-white text-[#248AF6] shadow-sm border border-[#E5E7EB]" : "text-gray-500 hover:bg-gray-100"}`}
                    >
                        <MousePointer2 className="w-5 h-5" />
                        <span className="text-[10px] font-bold">Seleção</span>
                    </button>
                    <button
                        onClick={() => setTool("edit")}
                        className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-lg transition-all ${tool === "edit" ? "bg-white text-[#248AF6] shadow-sm border border-[#E5E7EB]" : "text-gray-500 hover:bg-gray-100"}`}
                    >
                        <FilePlus className="w-5 h-5" />
                        <span className="text-[10px] font-bold">Editar PDF</span>
                    </button>
                    <button
                        onClick={() => setTool("sign")}
                        className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-lg transition-all ${tool === "sign" ? "bg-white text-[#248AF6] shadow-sm border border-[#E5E7EB]" : "text-gray-500 hover:bg-gray-100"}`}
                    >
                        <PenTool className="w-5 h-5" />
                        <span className="text-[10px] font-bold">Assinar</span>
                    </button>
                </div>

                <div className="flex items-center gap-1 px-3 border-r border-[#E5E7EB]">
                    {[
                        { id: 'text', icon: Type, label: 'Texto' },
                        { id: 'erase', icon: Eraser, label: 'Apagar' },
                        { id: 'highlight', icon: Highlighter, label: 'Destacar' },
                        { id: 'redigir', icon: ShieldAlert, label: 'Redigir' }
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => {
                                setTool(t.id);
                                if (t.id === 'redigir') {
                                    setRedactionSidebarOpen(true);
                                }
                            }}
                            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-all ${tool === t.id ? "text-[#248AF6]" : "text-gray-500 hover:text-gray-800"}`}
                        >
                            <t.icon className="w-5 h-5" />
                            <span className="text-[10px] font-medium">{t.label}</span>
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-1 px-3 border-r border-[#E5E7EB]">
                    {[
                        { id: 'image', icon: ImageIcon, label: 'Imagem' },
                        { id: 'seta', icon: ArrowUpRight, label: 'Seta' },
                        { id: 'draw', icon: Signature, label: 'Desenhar' },
                        { id: 'cross', icon: X, label: 'Cruz' },
                        { id: 'check', icon: Check, label: 'Visto' }
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => {
                                if (t.id === 'image') {
                                    setRedactionSidebarOpen(false);
                                    setTool('image');
                                    if (overlays.filter(ov => ov.type === 'image').length === 0) {
                                        imageInputRef.current?.click();
                                    }
                                } else {
                                    setTool(t.id);
                                }
                            }}
                            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-all ${tool === t.id ? "text-[#248AF6]" : "text-gray-500 hover:text-gray-800"}`}
                        >
                            <t.icon className="w-5 h-5" />
                            <span className="text-[10px] font-medium">{t.label}</span>
                        </button>
                    ))}
                    <div className="relative">
                        <button
                            onClick={() => setShowMaisDropdown(!showMaisDropdown)}
                            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-all ${showMaisDropdown || ["rect", "circle", "line", "pentagon", "cloud", "star", "stamp"].includes(tool) ? "text-[#248AF6]" : "text-gray-500 hover:text-gray-800"}`}
                        >
                            <Shapes className="w-5 h-5" />
                            <div className="flex items-center">
                                <span className="text-[10px] font-medium">Mais</span>
                                <ChevronDown className="w-3 h-3 ml-0.5" />
                            </div>
                        </button>

                        {showMaisDropdown && (
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[420px] bg-white rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-gray-100 z-[200] overflow-hidden animate-in fade-in zoom-in-95">
                                <div className="flex w-full border-b border-gray-100">
                                    <button
                                        onClick={() => setMaisActiveTab("formas")}
                                        className={`flex-1 py-3 text-[13px] font-bold ${maisActiveTab === "formas" ? "text-red-500 border-b-2 border-red-500" : "text-gray-500 hover:text-gray-700"}`}
                                    >
                                        Formas
                                    </button>
                                    <button
                                        onClick={() => setMaisActiveTab("carimbos")}
                                        className={`flex-1 py-3 text-[13px] font-bold ${maisActiveTab === "carimbos" ? "text-red-500 border-b-2 border-red-500" : "text-gray-500 hover:text-gray-700"}`}
                                    >
                                        Carimbos
                                    </button>
                                </div>
                                <div className="p-6">
                                    {maisActiveTab === "formas" ? (
                                        <div className="grid grid-cols-5 gap-6 gap-y-8 place-items-center">
                                            {[
                                                { id: 'shape_rect', icon: Square, tool: 'rect' },
                                                { id: 'shape_circle', icon: Circle, tool: 'circle' },
                                                { id: 'shape_line', icon: Minus, tool: 'line' },
                                                { id: 'shape_arrow', icon: ArrowUpRight, tool: 'arrow' },
                                                { id: 'shape_curve', icon: CornerUpRight, tool: 'curve' },
                                                { id: 'shape_pentagon', icon: Pentagon, tool: 'pentagon' },
                                                { id: 'shape_cloud', icon: Cloud, tool: 'cloud' },
                                                { id: 'shape_star', icon: Star, tool: 'star' },
                                                { id: 'shape_cross', icon: X, tool: 'cross' },
                                                { id: 'shape_check', icon: Check, tool: 'check' },
                                            ].map(item => (
                                                <button
                                                    key={item.id}
                                                    onClick={() => {
                                                        setTool(item.tool);
                                                        setShowMaisDropdown(false);
                                                    }}
                                                    className="p-1 hover:scale-125 transition-all text-gray-800 hover:text-blue-500"
                                                >
                                                    <item.icon strokeWidth={2} className="w-7 h-7" />
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                            {[
                                                { title: "ASSINE AQUI", content: "ASSINE AQUI", color: "text-amber-600 border-amber-600" },
                                                { title: "INICIAIS", content: "INICIAIS", color: "text-emerald-600 border-emerald-600" },
                                                { title: "TESTEMUNHA", content: "TESTEMUNHA", color: "text-blue-600 border-blue-600" },
                                                { title: "PAGO", content: "PAGO", color: "text-red-700 border-red-700" },
                                                { title: "CÓPIA", content: "CÓPIA", color: "text-blue-800 border-blue-800" },
                                                { title: "APROVADO", content: "APROVADO", color: "text-emerald-700 border-emerald-700" },
                                                { title: "NÃO APROVADO", content: "NÃO APROVADO", color: "text-red-700 border-red-700" },
                                                { title: "RASCUNHO", content: "RASCUNHO", color: "text-amber-600 border-amber-600" },
                                                { title: "VERSÃO FINAL", content: "VERSÃO FINAL", color: "text-emerald-700 border-emerald-700" },
                                                { title: "CONCLUÍDO", content: "CONCLUÍDO", color: "text-emerald-700 border-emerald-700" },
                                                { title: "CONFIDENCIAL", content: "CONFIDENCIAL", color: "text-blue-800 border-blue-800" },
                                                { title: "COMENTÁRIOS", content: "PARA COMENTÁRIOS", color: "text-blue-800 border-blue-800" },
                                                { title: "ANULADO", content: "ANULADO", color: "text-red-700 border-red-700" },
                                                { title: "INFORMAÇÃO", content: "APENAS PARA INFORMAÇÃO", color: "text-blue-800 border-blue-800" },
                                                { title: "DIVULGAÇÃO", content: "PARA DIVULGAÇÃO PÚBLICA", color: "text-blue-800 border-blue-800" },
                                                { title: "NÃO DIVULGAÇÃO", content: "NÃO PARA DIVULGAÇÃO PÚBLICA", color: "text-blue-800 border-blue-800" },
                                                { title: "RESULTADOS", content: "RESULTADOS PRELIMINARES", color: "text-blue-800 border-blue-800" },
                                                { title: "ESTRELA", content: "ESTRELA", color: "text-amber-600 border-amber-600" },
                                                { title: "VISTO", content: "VISTO", color: "text-emerald-600 border-emerald-600" },
                                                { title: "CRUZ", content: "CRUZ", color: "text-red-600 border-red-600" }
                                            ].map(stamp => (
                                                <button
                                                    key={stamp.title}
                                                    onClick={() => {
                                                        const id = Math.random().toString(36).substring(7);
                                                        setOverlays([...overlays, {
                                                            id, type: "stamp", content: stamp.content, templateStr: stamp.color,
                                                            x: 100, y: 100, width: 180, height: 60, page: currentPage, color: "#1a1a1a"
                                                        }]);
                                                        setTool("select");
                                                        setActiveRedactionId(id);
                                                        setShowMaisDropdown(false);
                                                    }}
                                                    className={`border-2 rounded-xl py-3 px-2 flex items-center justify-center font-bold text-[9px] text-center hover:scale-[1.02] transition-transform shadow-sm cursor-pointer ${stamp.color}`}
                                                >
                                                    {stamp.title}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-6 px-4">
                    <div className="relative">
                        <button
                            onClick={() => setShowPostItDropdown(!showPostItDropdown)}
                            className={`flex flex-col items-center gap-0.5 transition-all ${showPostItDropdown || tool === 'postit' ? 'text-[#248AF6]' : 'text-gray-500 hover:text-gray-800'}`}
                        >
                            <StickyNote className="w-5 h-5" />
                            <span className="text-[10px] font-medium">Post-it</span>
                        </button>

                        {showPostItDropdown && (
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-[300px] bg-white rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-gray-100 z-[200] p-6 animate-in fade-in slide-in-from-top-2">
                                <div className="space-y-6">
                                    <div>
                                        <h4 className="text-[13px] font-bold text-gray-800 mb-4 px-1">Quadrado (1:1)</h4>
                                        <div className="grid grid-cols-4 gap-3">
                                            {[
                                                '#FEF9C3', '#DCFCE7', '#E0F2FE', '#FCE7F3',
                                                '#FDE047', '#6EE7B7', '#7DD3FC', '#E879F9'
                                            ].map(c => (
                                                <button
                                                    key={c}
                                                    onClick={() => {
                                                        setPostItSettings({ color: c, width: 200, height: 200 });
                                                        setTool('postit');
                                                        setShowPostItDropdown(false);
                                                    }}
                                                    className="w-full aspect-square rounded-lg shadow-sm border border-black/5 hover:scale-110 transition-transform cursor-pointer"
                                                    style={{ backgroundColor: c }}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-[13px] font-bold text-gray-800 mb-4 px-1">Retângulo (2:1)</h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            {[
                                                '#FEF9C3', '#DCFCE7', '#E0F2FE', '#FCE7F3',
                                                '#FDE047', '#6EE7B7', '#7DD3FC', '#E879F9'
                                            ].map(c => (
                                                <button
                                                    key={c}
                                                    onClick={() => {
                                                        setPostItSettings({ color: c, width: 300, height: 150 });
                                                        setTool('postit');
                                                        setShowPostItDropdown(false);
                                                    }}
                                                    className="w-full h-14 rounded-lg shadow-sm border border-black/5 hover:scale-105 transition-transform cursor-pointer"
                                                    style={{ backgroundColor: c }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <button className="flex flex-col items-center gap-0.5 text-gray-500 hover:text-gray-800 transition-colors">
                        <Search className="w-5 h-5" />
                        <span className="text-[10px] font-medium">Procurar</span>
                    </button>
                    <button
                        onClick={() => setShowMoreTools(true)}
                        className="bg-white border border-[#E5E7EB] hover:border-gray-300 px-4 py-1 rounded-xl text-[10px] font-bold uppercase tracking-tight shadow-sm transition-all"
                    >
                        Mais ferramentas
                    </button>
                </div>
            </div>

            {/* ARROW PROPERTIES RIBBON */}
            {tool === "seta" && (
                <div className="bg-white border-b border-[#E5E7EB] h-12 flex items-center px-6 gap-6 shadow-sm shrink-0 animate-in slide-in-from-top duration-300">
                    <div className="flex items-center gap-4">
                        <span className="text-[13px] font-medium text-gray-900">Cor da seta</span>
                        <div className="flex items-center gap-1.5">
                            {["#1a1a1a", "#da2d26", "#f59e0b", "#fde047", "#41ae07", "#2dd4bf", "#248af6", "#93c5fd", "#818cf8"].map(c => (
                                <button
                                    key={c}
                                    onClick={() => {
                                        setArrowSettings({ ...arrowSettings, color: c });
                                        if (activeRedactionId) {
                                            const newOverlays = [...overlays];
                                            const idx = newOverlays.findIndex(o => o.id === activeRedactionId);
                                            if (idx !== -1) newOverlays[idx].color = c;
                                            setOverlays(newOverlays);
                                        }
                                    }}
                                    className={`w-7 h-7 rounded-lg transition-all ${arrowSettings.color === c ? "ring-2 ring-offset-2 ring-blue-500 scale-110 shadow-sm" : "hover:scale-105"}`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                            <button className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 bg-white">
                                <Plus className="w-4 h-4 text-gray-600" />
                            </button>
                            <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-50">
                                <Pipette className="w-4 h-4 text-gray-800" />
                            </button>
                        </div>
                    </div>

                    <div className="w-[1px] h-6 bg-gray-200" />

                    <div className="flex items-center gap-3">
                        <div
                            className="flex items-center gap-2 bg-[#F3F4F6] px-3 py-2 rounded-xl border border-transparent hover:border-gray-200 transition-all cursor-pointer relative"
                            onClick={() => setActiveDropdown(activeDropdown === "opacity" ? null : "opacity")}
                        >
                            <span className="text-[13px] font-medium text-gray-700">Opacidade</span>
                            <div className="w-5 h-5 rounded-md border border-gray-300 bg-white relative overflow-hidden">
                                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)', backgroundSize: '4px 4px', backgroundPosition: '0 0, 0 2px, 2px -2px, -2px 0px' }} />
                                <div className="absolute inset-0" style={{ backgroundColor: arrowSettings.color, opacity: arrowSettings.opacity / 100 }} />
                            </div>
                            <ChevronDown className="w-4 h-4 text-gray-400" />

                            {activeDropdown === "opacity" && (
                                <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 p-3 z-[200] w-48 animate-in fade-in slide-in-from-top-2">
                                    <div className="flex flex-col gap-2">
                                        {[25, 50, 75, 100].map(v => (
                                            <button
                                                key={v}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setArrowSettings({ ...arrowSettings, opacity: v });
                                                    if (activeRedactionId) {
                                                        const newOverlays = [...overlays];
                                                        const idx = newOverlays.findIndex(o => o.id === activeRedactionId);
                                                        if (idx !== -1) newOverlays[idx].opacity = v;
                                                        setOverlays(newOverlays);
                                                    }
                                                    setActiveDropdown(null);
                                                }}
                                                className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${arrowSettings.opacity === v ? 'bg-blue-50 text-blue-600 font-bold' : 'hover:bg-gray-50'}`}
                                            >
                                                {v}%
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div
                            className="flex items-center gap-2 bg-[#F3F4F6] px-3 py-2 rounded-xl border border-transparent hover:border-gray-200 transition-all cursor-pointer relative"
                            onClick={() => setActiveDropdown(activeDropdown === "thickness" ? null : "thickness")}
                        >
                            <span className="text-[13px] font-medium text-gray-700">Espessura</span>
                            <div className="flex flex-col gap-[2px] items-center justify-center w-5">
                                <div className="w-full bg-gray-400" style={{ height: activeRedactionId ? (overlays.find(o => o.id === activeRedactionId)?.thickness || 2) : arrowSettings.thickness }} />
                            </div>
                            <ChevronDown className="w-4 h-4 text-gray-400" />

                            {activeDropdown === "thickness" && (
                                <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 p-3 z-[200] w-40 animate-in fade-in slide-in-from-top-2">
                                    <div className="flex flex-col gap-1">
                                        {[1, 2, 4, 6, 8].map(w => (
                                            <button
                                                key={w}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setArrowSettings({ ...arrowSettings, thickness: w });
                                                    if (activeRedactionId) {
                                                        const newOverlays = [...overlays];
                                                        const idx = newOverlays.findIndex(o => o.id === activeRedactionId);
                                                        if (idx !== -1) newOverlays[idx].thickness = w;
                                                        setOverlays(newOverlays);
                                                    }
                                                    setActiveDropdown(null);
                                                }}
                                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${arrowSettings.thickness === w ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                                            >
                                                <div className="bg-gray-800" style={{ height: w, width: 24 }} />
                                                <span className="text-xs font-bold text-gray-500">{w}px</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="w-[1px] h-6 bg-gray-200" />

                    <button
                        className="p-2 text-gray-600 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                        onClick={() => {
                            const link = prompt("Inserir link para a seta:", arrowSettings.link || "https://");
                            if (link !== null) {
                                setArrowSettings({ ...arrowSettings, link });
                                if (activeRedactionId) {
                                    const newOverlays = [...overlays];
                                    const idx = newOverlays.findIndex(o => o.id === activeRedactionId);
                                    if (idx !== -1) newOverlays[idx].link = link;
                                    setOverlays(newOverlays);
                                }
                            }
                        }}
                    >
                        <Link2 className="w-5 h-5" />
                    </button>
                </div>
            )}

            {/* HIGHLIGHT PROPERTIES RIBBON */}
            {tool === "highlight" && (
                <div className="bg-white border-b border-[#E5E7EB] h-12 flex items-center px-6 gap-6 shadow-sm shrink-0 animate-in slide-in-from-top duration-300">
                    <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1 bg-gray-50 text-sm font-medium text-gray-700 cursor-pointer">
                        <Highlighter className="w-4 h-4 text-pink-500" /> Destaque de te... <ChevronDown className="w-4 h-4 ml-1 text-gray-400" />
                    </div>

                    <div className="w-[1px] h-6 bg-gray-200" />

                    <div className="flex items-center gap-1.5">
                        {['#fca5a5', '#fb923c', '#fde047', '#4ade80', '#2dd4bf', '#38bdf8', '#3b82f6', '#4f46e5'].map(c => (
                            <button
                                key={c}
                                onClick={() => {
                                    setHighlightSettings({ ...highlightSettings, color: c });
                                    if (activeRedactionId) {
                                        const newOverlays = [...overlays];
                                        const idx = newOverlays.findIndex(o => o.id === activeRedactionId);
                                        if (idx !== -1) newOverlays[idx].color = c;
                                        setOverlays(newOverlays);
                                    }
                                }}
                                className={`w-6 h-6 rounded-md hover:scale-110 flex items-center justify-center transition-transform ${highlightSettings.color === c ? 'ring-2 ring-offset-1 ring-blue-500' : ''}`}
                                style={{ backgroundColor: c }}
                            >
                                {highlightSettings.color === c && <Check className="w-4 h-4 text-white" />}
                            </button>
                        ))}
                        <button className="w-6 h-6 rounded-md border border-gray-300 flex items-center justify-center hover:bg-gray-50 bg-white">
                            <Plus className="w-4 h-4 text-gray-600" />
                        </button>
                    </div>

                    <div className="w-[1px] h-6 bg-gray-200" />

                    <div className="flex items-center gap-3">
                        <div
                            className="flex items-center gap-2 bg-[#F3F4F6] px-3 py-1.5 rounded-xl border border-transparent hover:border-gray-200 transition-all cursor-pointer relative"
                            onClick={() => setActiveDropdown(activeDropdown === "high-opacity" ? null : "high-opacity")}
                        >
                            <span className="text-[13px] font-medium text-gray-700">Opacidade</span>
                            <div className="w-4 h-4 rounded-[2px] border border-gray-300 bg-white relative overflow-hidden">
                                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)', backgroundSize: '4px 4px', backgroundPosition: '0 0, 0 2px, 2px -2px, -2px 0px' }} />
                                <div className="absolute inset-0" style={{ backgroundColor: highlightSettings.color, opacity: highlightSettings.opacity / 100 }} />
                            </div>
                            <ChevronDown className="w-4 h-4 text-gray-400" />

                            {activeDropdown === "high-opacity" && (
                                <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 p-3 z-[200] w-48 animate-in fade-in slide-in-from-top-2">
                                    <div className="flex flex-col gap-2">
                                        {[25, 50, 75, 100].map(v => (
                                            <button
                                                key={v}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setHighlightSettings({ ...highlightSettings, opacity: v });
                                                    if (activeRedactionId) {
                                                        const newOverlays = [...overlays];
                                                        const idx = newOverlays.findIndex(o => o.id === activeRedactionId);
                                                        if (idx !== -1) newOverlays[idx].opacity = v / 100;
                                                        setOverlays(newOverlays);
                                                    }
                                                    setActiveDropdown(null);
                                                }}
                                                className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${highlightSettings.opacity === v ? 'bg-blue-50 text-blue-600 font-bold' : 'hover:bg-gray-50'}`}
                                            >
                                                {v}%
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex-1" />

                    <button onClick={() => setTool("select")} className="border border-gray-200 bg-white font-semibold text-gray-700 text-[13px] px-3 py-1.5 rounded-lg hover:bg-gray-50 flex items-center gap-1.5 shadow-sm">
                        Fechar ferramenta <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* TEXT & POST-IT PROPERTIES RIBBON (IMAGE 3) */}
            {(tool === "text" || (activeRedactionId && ["text", "postit"].includes(overlays.find(o => o.id === activeRedactionId)?.type || ""))) && (
                <div className="bg-[#F8F9FA] border-b border-[#E5E7EB] h-14 flex items-center px-6 gap-2 shadow-sm shrink-0 animate-in slide-in-from-top duration-300 overflow-x-auto no-scrollbar">
                    <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-3 py-1.5 hover:bg-gray-50 transition-colors cursor-pointer group">
                        <select
                            className="bg-transparent text-[13px] font-semibold text-gray-700 focus:outline-none cursor-pointer pr-1"
                            value={fontSettings.family}
                            onChange={(e) => {
                                const val = e.target.value;
                                setFontSettings(f => ({ ...f, family: val }));
                                if (activeRedactionId) {
                                    setOverlays(ovs => ovs.map(o => o.id === activeRedactionId ? { ...o, fontFamily: val } : o));
                                }
                            }}
                        >
                            <option value="Arial">Arial</option>
                            <option value="Times New Roman">Times New Roman</option>
                            <option value="Courier New">Courier New</option>
                            <option value="Georgia">Georgia</option>
                            <option value="Verdana">Verdana</option>
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600" />
                    </div>

                    <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-3 py-1.5 hover:bg-gray-50 transition-colors cursor-pointer group">
                        <span className="text-[13px] font-semibold text-gray-700">Texto normal</span>
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600" />
                    </div>

                    <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-3 py-1.5 hover:bg-gray-50 transition-colors cursor-pointer group">
                        <select
                            className="bg-transparent text-[13px] font-semibold text-gray-700 focus:outline-none cursor-pointer pr-1"
                            value={fontSettings.size}
                            onChange={(e) => {
                                const val = parseInt(e.target.value);
                                setFontSettings(f => ({ ...f, size: val }));
                                if (activeRedactionId) {
                                    setOverlays(ovs => ovs.map(o => o.id === activeRedactionId ? { ...o, fontSize: val } : o));
                                }
                            }}
                        >
                            {[8, 9, 10, 11, 12, 14, 16, 18, 24, 30, 36, 48, 60, 72].map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600" />
                    </div>

                    <div className="w-[1px] h-6 bg-gray-200 mx-2" />

                    <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 gap-0.5 shadow-sm">
                        <button
                            onClick={() => {
                                const val = !fontSettings.bold;
                                setFontSettings(f => ({ ...f, bold: val }));
                                if (activeRedactionId) setOverlays(ovs => ovs.map(o => o.id === activeRedactionId ? { ...o, fontWeight: val ? "bold" : "normal" } : o));
                            }}
                            className={`px-2.5 py-1.5 rounded-lg transition-all ${fontSettings.bold ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"}`}
                        >
                            <span className="text-sm font-bold">B</span>
                        </button>
                        <button
                            onClick={() => {
                                const val = !fontSettings.italic;
                                setFontSettings(f => ({ ...f, italic: val }));
                                if (activeRedactionId) setOverlays(ovs => ovs.map(o => o.id === activeRedactionId ? { ...o, fontStyle: val ? "italic" : "normal" } : o));
                            }}
                            className={`px-2.5 py-1.5 rounded-lg transition-all ${fontSettings.italic ? "bg-blue-50 text-blue-600 font-serif italic" : "text-gray-600 hover:bg-gray-50 font-serif italic"}`}
                        >
                            <span className="text-sm">I</span>
                        </button>
                        <button
                            onClick={() => {
                                const val = !fontSettings.underline;
                                setFontSettings(f => ({ ...f, underline: val, strike: false }));
                                if (activeRedactionId) setOverlays(ovs => ovs.map(o => o.id === activeRedactionId ? { ...o, textDecoration: val ? "underline" : "none" } : o));
                            }}
                            className={`px-1.5 py-1.5 rounded-lg transition-all ${fontSettings.underline ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"}`}
                        >
                            <span className="text-sm border-b border-current px-0.5">U</span>
                        </button>
                        <button
                            onClick={() => {
                                const val = !fontSettings.strike;
                                setFontSettings(f => ({ ...f, strike: val, underline: false }));
                                if (activeRedactionId) setOverlays(ovs => ovs.map(o => o.id === activeRedactionId ? { ...o, textDecoration: val ? "line-through" : "none" } : o));
                            }}
                            className={`px-2.5 py-1.5 rounded-lg transition-all ${fontSettings.strike ? "bg-blue-50 text-blue-600 line-through" : "text-gray-600 hover:bg-gray-50 line-through"}`}
                        >
                            <span className="text-sm">ab</span>
                        </button>
                    </div>

                    <div className="w-[1px] h-6 bg-gray-200 mx-2" />

                    <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-3 py-1.5 hover:bg-gray-50 transition-colors cursor-pointer group relative">
                        <span className="text-[13px] font-semibold text-gray-700 mr-2">Cor do texto</span>
                        <div className="w-5 h-5 rounded shadow-sm border border-black/10" style={{ backgroundColor: fontSettings.color }} />
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 ml-1" />
                        <input
                            type="color"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            value={fontSettings.color}
                            onChange={(e) => {
                                const val = e.target.value;
                                setFontSettings(f => ({ ...f, color: val }));
                                if (activeRedactionId) setOverlays(ovs => ovs.map(o => o.id === activeRedactionId ? { ...o, textColor: val, color: val } : o));
                            }}
                        />
                    </div>

                    <div className="w-[1px] h-6 bg-gray-200 mx-2" />

                    <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-2 py-1.5 hover:bg-gray-50 transition-colors cursor-pointer group relative" onClick={() => setActiveDropdown(activeDropdown === 'align' ? null : 'align')}>
                        <AlignLeft className="w-4 h-4 text-gray-600" />
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600" />

                        {activeDropdown === 'align' && (
                            <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 p-2 z-[210] flex gap-1 animate-in zoom-in-95">
                                {['left', 'center', 'right', 'justify'].map(a => (
                                    <button
                                        key={a}
                                        onClick={() => {
                                            setFontSettings(f => ({ ...f, align: a as any }));
                                            if (activeRedactionId) setOverlays(ovs => ovs.map(o => o.id === activeRedactionId ? { ...o, textAlign: a } : o));
                                            setActiveDropdown(null);
                                        }}
                                        className={`p-2 rounded-lg ${fontSettings.align === a ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:bg-gray-50'}`}
                                    >
                                        {a === 'left' && <AlignLeft className="w-4 h-4" />}
                                        {a === 'center' && <AlignCenter className="w-4 h-4" />}
                                        {a === 'right' && <AlignRight className="w-4 h-4" />}
                                        {a === 'justify' && <AlignJustify className="w-4 h-4" />}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="w-[1px] h-6 bg-gray-200 mx-2" />

                    <button
                        className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-all relative shadow-sm group"
                        onClick={() => {
                            const link = prompt("Inserir link:");
                            if (link) {
                                if (activeRedactionId) setOverlays(ovs => ovs.map(o => o.id === activeRedactionId ? { ...o, link } : o));
                            }
                        }}
                    >
                        <div className="relative">
                            <Link2 className="w-4.5 h-4.5" />
                            <Plus className="w-2.5 h-2.5 absolute -bottom-1 -right-1 text-gray-800" strokeWidth={3} />
                        </div>
                    </button>
                </div>
            )}


            {/* MAIN WORKSPACE */}
            <main className="flex flex-1 overflow-hidden relative">
                {/* SIDE NAVIGATION */}
                <aside className="w-[72px] bg-white border-r border-[#E5E7EB] flex flex-col items-center py-6 gap-8 shrink-0">
                    <button
                        onClick={() => { setSidebarOpen(!sidebarOpen); setActiveSidebarTab("pages") }}
                        className={`p-2 rounded-xl transition-all ${sidebarOpen && activeSidebarTab === "pages" ? "bg-blue-50 text-blue-600" : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"}`}
                    >
                        <Layers className="w-5 h-5" />
                        <span className="sr-only">Páginas</span>
                    </button>
                    <button
                        onClick={() => { setSidebarOpen(!sidebarOpen); setActiveSidebarTab("bookmarks") }}
                        className={`p-2 rounded-xl transition-all ${sidebarOpen && activeSidebarTab === "bookmarks" ? "bg-blue-50 text-blue-600" : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"}`}
                    >
                        <Bookmark className="w-5 h-5" />
                        <span className="sr-only">Marcadores</span>
                    </button>
                    <button
                        onClick={() => { setSidebarOpen(!sidebarOpen); setActiveSidebarTab("info") }}
                        className={`p-2 rounded-xl transition-all ${sidebarOpen && activeSidebarTab === "info" ? "bg-blue-50 text-blue-600" : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"}`}
                    >
                        <History className="w-5 h-5" />
                        <span className="sr-only">Histórico</span>
                    </button>
                </aside>

                {/* SIDE DRAWER */}
                {sidebarOpen && (
                    <div className="w-[280px] bg-white border-r border-[#E5E7EB] flex flex-col animate-in slide-in-from-left duration-200">
                        <div className="p-4 border-b border-[#E5E7EB] flex items-center justify-between">
                            <span className="text-sm font-bold uppercase tracking-widest text-gray-500">
                                {activeSidebarTab === "pages" ? "Páginas" : activeSidebarTab === "bookmarks" ? "Marcadores" : "Informação"}
                            </span>
                            <button onClick={() => setSidebarOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                                <X className="w-4 h-4 text-gray-400" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                            {pages.map((p, i) => (
                                <div
                                    key={i}
                                    onClick={() => setCurrentPage(i)}
                                    className={`relative aspect-[1/1.4] bg-white border-2 rounded-lg overflow-hidden cursor-pointer transition-all ${currentPage === i ? "border-blue-500 ring-4 ring-blue-50" : "border-gray-100 hover:border-gray-200"}`}
                                >
                                    <img src={p.canvas.toDataURL()} className="w-full h-full object-cover" />
                                    <div className="absolute bottom-1 right-2 text-[10px] font-bold bg-black/50 text-white px-1.5 rounded">#{i + 1}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* CANVAS AREA */}
                <div
                    className="flex-1 bg-[#525659] overflow-auto p-8 relative custom-scrollbar flex flex-col items-center"
                    ref={editorRef}
                    onContextMenu={(e) => e.preventDefault()}
                >
                    <div className="relative inline-block">
                        {pages.length > 0 ? (
                            pages.map((p, idx) => (
                                <div
                                    key={idx}
                                    id={`pdf-page-${idx}`}
                                    className={`relative bg-white shadow-2xl mb-12`}
                                    style={{
                                        width: (p.canvas.width / 1.5) * zoom,
                                        height: (p.canvas.height / 1.5) * zoom,
                                        transformOrigin: 'top center'
                                    }}
                                    onMouseDown={(e) => handleRedactMouseDown(e, idx)}
                                    onMouseMove={handleRedactMouseMove}
                                    onMouseUp={handleRedactMouseUp}
                                    onContextMenu={(e) => handlePageContextMenu(e, idx)}

                                >
                                    <canvas
                                        id={`canvas-${idx}`}
                                        width={p.canvas.width}
                                        height={p.canvas.height}
                                        style={{ width: '100%', height: '100%' }}
                                        ref={el => {
                                            if (el) {
                                                const ctx = el.getContext('2d');
                                                if (ctx) ctx.drawImage(p.canvas, 0, 0);
                                            }
                                        }}
                                    />

                                    {/* Page Number Label */}
                                    <div className="absolute -left-16 top-0 text-white opacity-40 font-black text-xl">#{idx + 1}</div>

                                    {/* Overlays Rendering */}
                                    {overlays.filter(o => o.page === idx).map(o => {
                                        if (o.type === "seta") {
                                            // Box em torno da seta com padding para não cortar a seta
                                            const PAD = 24;
                                            const bbX = Math.min(o.x1, o.x2);
                                            const bbY = Math.min(o.y1, o.y2);
                                            const bbW = Math.max(Math.abs(o.x2 - o.x1), 10);
                                            const bbH = Math.max(Math.abs(o.y2 - o.y1), 10);
                                            // Coordenadas locais do SVG (relativas ao canto da bounding box + padding)
                                            const svgX1 = (o.x1 - bbX) * zoom + PAD;
                                            const svgY1 = (o.y1 - bbY) * zoom + PAD;
                                            const svgX2 = (o.x2 - bbX) * zoom + PAD;
                                            const svgY2 = (o.y2 - bbY) * zoom + PAD;

                                            return (
                                                <div
                                                    key={o.id}
                                                    style={{
                                                        position: 'absolute',
                                                        left: bbX * zoom - PAD,
                                                        top: bbY * zoom - PAD,
                                                        width: bbW * zoom + PAD * 2,
                                                        height: bbH * zoom + PAD * 2,
                                                        zIndex: 40,
                                                        pointerEvents: 'none',
                                                    }}
                                                    onContextMenu={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                    }}
                                                >
                                                    <div className="w-full h-full relative" style={{ transform: `rotate(${o.rotation || 0}deg)`, transformOrigin: 'center center' }}>
                                                        <svg
                                                            style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}
                                                        >
                                                            <defs>
                                                                <marker
                                                                    id={`arrowhead-${o.id}`}
                                                                    markerWidth="12" markerHeight="8"
                                                                    refX="11" refY="4" orient="auto"
                                                                >
                                                                    <polygon points="0 0, 12 4, 0 8" fill={o.color} />
                                                                </marker>
                                                            </defs>
                                                            {/* Área de clique invisível e larga */}
                                                            <line
                                                                x1={svgX1} y1={svgY1} x2={svgX2} y2={svgY2}
                                                                stroke="transparent"
                                                                strokeWidth={Math.max(20, (o.thickness || 2) + 16)}
                                                                style={{ pointerEvents: 'stroke', cursor: 'move' }}
                                                                onMouseDown={(e) => {
                                                                    e.stopPropagation();
                                                                    const pageEl = document.getElementById(`pdf-page-${o.page}`);
                                                                    if (pageEl) {
                                                                        const pr = pageEl.getBoundingClientRect();
                                                                        setDragStart({ x: (e.clientX - pr.left) / zoom, y: (e.clientY - pr.top) / zoom });
                                                                    }
                                                                    setDragIndex(overlays.findIndex(ov => ov.id === o.id));
                                                                    handleSelectOverlay(o.id);
                                                                }}
                                                            />
                                                            {/* Linha visível */}
                                                            <line
                                                                x1={svgX1} y1={svgY1} x2={svgX2} y2={svgY2}
                                                                stroke={o.color}
                                                                strokeWidth={o.thickness || 2}
                                                                strokeOpacity={(o.opacity ?? 100) / 100}
                                                                markerEnd={`url(#arrowhead-${o.id})`}
                                                                style={{ pointerEvents: 'none' }}
                                                            />
                                                        </svg>
                                                    </div>

                                                    {/* Side Action Menu for Seta */}
                                                    {activeRedactionId === o.id && (
                                                        <div
                                                            className="absolute z-[500] pointer-events-auto flex items-center"
                                                            style={{
                                                                left: (bbW * zoom + PAD * 2) > 400 ? 'auto' : 'calc(100% + 24px)',
                                                                right: (bbW * zoom + PAD * 2) > 400 ? 'calc(100% + 24px)' : 'auto',
                                                                top: '50%',
                                                                transform: 'translateY(-50%)',
                                                            }}
                                                            onMouseDown={(e) => e.stopPropagation()}
                                                        >
                                                            <div className="bg-white rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-gray-100 py-4 w-[240px] flex flex-col animate-in fade-in zoom-in-95 duration-300">
                                                                {/* ESTILO OPTION */}
                                                                <div className="relative">
                                                                    <button
                                                                        className={`w-full flex items-center justify-between px-6 py-3.5 transition-all text-gray-700 font-semibold text-[15px] ${activeDropdown === 'seta-style' ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
                                                                        onClick={() => setActiveDropdown(activeDropdown === 'seta-style' ? null : 'seta-style')}
                                                                    >
                                                                        <div className="flex items-center gap-4">
                                                                            <Palette className="w-5 h-5 text-gray-400" strokeWidth={2} />
                                                                            Estilo
                                                                        </div>
                                                                        <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${activeDropdown === 'seta-style' ? 'rotate-90' : ''}`} />
                                                                    </button>
                                                                    {activeDropdown === 'seta-style' && (
                                                                        <div className={`absolute top-0 bg-white rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.15)] border border-gray-100 p-6 w-[280px] z-[600] animate-in fade-in slide-in-from-top-2 ${(bbW * zoom + PAD * 2) > 400 ? 'right-[calc(100%+15px)]' : 'left-[calc(100%+15px)]'}`}>
                                                                            <div className="flex flex-col gap-5">
                                                                                <div className="space-y-3">
                                                                                    <span className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">Cor</span>
                                                                                    <div className="flex flex-wrap gap-2">
                                                                                        {['#000000', '#9ca3af', '#fca5a5', '#fb923c', '#fde047', '#4ade80', '#2dd4bf', '#3b82f6', '#818cf8'].map(c => (
                                                                                            <button
                                                                                                key={c}
                                                                                                onClick={() => setOverlays(overlays.map(ov => ov.id === o.id ? { ...ov, color: c } : ov))}
                                                                                                className={`w-7 h-7 rounded-lg border border-gray-100 flex items-center justify-center transition-all ${o.color === c ? 'ring-2 ring-blue-500 ring-offset-1' : 'hover:scale-110'}`}
                                                                                                style={{ backgroundColor: c }}
                                                                                            >
                                                                                                {o.color === c && <Check className="w-4 h-4 text-white" />}
                                                                                            </button>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                                <div className="space-y-3">
                                                                                    <div className="flex justify-between items-center">
                                                                                        <span className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">Espessura</span>
                                                                                        <span className="text-[12px] font-bold text-blue-500">{o.thickness ?? 2}px</span>
                                                                                    </div>
                                                                                    <input
                                                                                        type="range" min="1" max="20"
                                                                                        value={o.thickness ?? 2}
                                                                                        onChange={(e) => {
                                                                                            const val = parseInt(e.target.value);
                                                                                            setOverlays(overlays.map(ov => ov.id === o.id ? { ...ov, thickness: val } : ov));
                                                                                        }}
                                                                                        className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <button
                                                                    className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-all text-gray-700 font-semibold text-[15px]"
                                                                    onClick={() => {
                                                                        const id = Math.random().toString(36).substring(7);
                                                                        setOverlays([...overlays, { ...o, id, x1: o.x1 + 20, y1: o.y1 + 20, x2: o.x2 + 20, y2: o.y2 + 20 }]);
                                                                        setActiveRedactionId(id);
                                                                    }}
                                                                >
                                                                    <Copy className="w-5 h-5 text-gray-400" strokeWidth={2} />
                                                                    Duplicar
                                                                </button>

                                                                <button
                                                                    className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-all text-gray-700 font-semibold text-[15px]"
                                                                    onClick={() => bringToFront(o.id)}
                                                                >
                                                                    <BringToFront className="w-5 h-5 text-gray-400" strokeWidth={2} />
                                                                    Trazer para a frente
                                                                </button>

                                                                <button
                                                                    className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-all text-gray-700 font-semibold text-[15px]"
                                                                    onClick={() => sendToBack(o.id)}
                                                                >
                                                                    <SendToBack className="w-5 h-5 text-gray-400" strokeWidth={2} />
                                                                    Enviar para trás
                                                                </button>

                                                                <button
                                                                    className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-all text-gray-700 font-semibold text-[15px]"
                                                                    onClick={() => {
                                                                        setOverlays(overlays.map(ov => ov.id === o.id ? { ...ov, rotation: ((ov.rotation || 0) + 90) % 360 } : ov));
                                                                    }}
                                                                >
                                                                    <RotateCw className="w-5 h-5 text-gray-400" strokeWidth={2} />
                                                                    Rodar
                                                                </button>

                                                                <div className="h-[1px] bg-gray-50 my-2 mx-6" />

                                                                <button
                                                                    className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-red-50 transition-all text-red-500 font-bold text-[16px]"
                                                                    onClick={() => { setOverlays(overlays.filter(ov => ov.id !== o.id)); setActiveRedactionId(null); }}
                                                                >
                                                                    <Trash2 className="w-5 h-5 text-red-500" strokeWidth={2} />
                                                                    Eliminar
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        }

                                        if (o.type === "draw") {
                                            return (
                                                <div key={o.id} className={`absolute cursor-move ${activeRedactionId === o.id ? 'ring-[1.5px] ring-[#248AF6] bg-[#248AF6]/10 rounded-sm' : ''} ${o.isNew ? 'animate-in fade-in zoom-in-90 duration-300' : ''}`}
                                                    style={{
                                                        left: o.x * zoom, top: o.y * zoom,
                                                        width: (o.width || 10) * zoom, height: (o.height || 10) * zoom,
                                                        zIndex: 40
                                                    }}
                                                    onMouseDown={(e) => {
                                                        e.stopPropagation();
                                                        if (tool !== "select" && tool !== "draw") setTool("select");
                                                        setDragIndex(overlays.findIndex(ov => ov.id === o.id));
                                                        handleSelectOverlay(o.id);
                                                        const rect = editorRef.current?.getBoundingClientRect();
                                                        if (rect) setDragStart({ x: (e.clientX - rect.left) / zoom, y: (e.clientY - rect.top) / zoom });
                                                    }}
                                                    onContextMenu={(e) => {
                                                        e.preventDefault(); e.stopPropagation();
                                                    }}
                                                >
                                                    <div className="w-full h-full relative" style={{ transform: `rotate(${o.rotation || 0}deg)`, transformOrigin: 'center center' }}>
                                                        <svg
                                                            style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}
                                                            viewBox={o.isDrawingActive ? undefined : `0 0 ${o.originalWidth ?? o.width ?? 1} ${o.originalHeight ?? o.height ?? 1}`}
                                                            preserveAspectRatio="none"
                                                        >
                                                            <path
                                                                d={`M ${o.points?.map((p: any) => {
                                                                    if (o.isDrawingActive) return `${(p.x - o.x) * zoom},${(p.y - o.y) * zoom}`;
                                                                    return `${p.x},${p.y}`;
                                                                }).join(' L ')}`}
                                                                fill="none" stroke={o.color || "#000"} strokeWidth={o.thickness || 3}
                                                                strokeLinecap="round" strokeLinejoin="round" style={{ pointerEvents: 'stroke', cursor: 'grab', vectorEffect: 'non-scaling-stroke' }}
                                                            />
                                                        </svg>
                                                    </div>
                                                    {/* Action Menu for Draw */}
                                                    {activeRedactionId === o.id && (
                                                        <div
                                                            className="absolute z-[500] pointer-events-auto flex items-center"
                                                            style={{
                                                                left: (o.width * zoom) > 400 ? 'auto' : 'calc(100% + 24px)',
                                                                right: (o.width * zoom) > 400 ? 'calc(100% + 24px)' : 'auto',
                                                                top: '50%',
                                                                transform: 'translateY(-50%)',
                                                            }}
                                                            onMouseDown={(e) => e.stopPropagation()}
                                                        >
                                                            <div className="bg-white rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-gray-100 py-4 w-[240px] flex flex-col animate-in fade-in zoom-in-95 duration-300">
                                                                {/* ESTILO OPTION */}
                                                                <div className="relative">
                                                                    <button
                                                                        className={`w-full flex items-center justify-between px-6 py-3.5 transition-all text-gray-700 font-semibold text-[15px] ${activeDropdown === 'draw-style' ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
                                                                        onClick={() => setActiveDropdown(activeDropdown === 'draw-style' ? null : 'draw-style')}
                                                                    >
                                                                        <div className="flex items-center gap-4">
                                                                            <Palette className="w-5 h-5 text-gray-400" strokeWidth={2} />
                                                                            Estilo
                                                                        </div>
                                                                        <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${activeDropdown === 'draw-style' ? 'rotate-90' : ''}`} />
                                                                    </button>
                                                                    {activeDropdown === 'draw-style' && (
                                                                        <div className={`absolute top-0 bg-white rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.15)] border border-gray-100 p-6 w-[280px] z-[600] animate-in fade-in slide-in-from-top-2 ${(o.width * zoom) > 400 ? 'right-[calc(100%+15px)]' : 'left-[calc(100%+15px)]'}`}>
                                                                            <div className="flex flex-col gap-5">
                                                                                <div className="space-y-3">
                                                                                    <span className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">Cor</span>
                                                                                    <div className="flex flex-wrap gap-2">
                                                                                        {['#000000', '#9ca3af', '#fca5a5', '#fb923c', '#fde047', '#4ade80', '#2dd4bf', '#3b82f6', '#818cf8'].map(c => (
                                                                                            <button
                                                                                                key={c}
                                                                                                onClick={() => setOverlays(overlays.map(ov => ov.id === o.id ? { ...ov, color: c } : ov))}
                                                                                                className={`w-7 h-7 rounded-lg border border-gray-100 flex items-center justify-center transition-all ${o.color === c ? 'ring-2 ring-blue-500 ring-offset-1' : 'hover:scale-110'}`}
                                                                                                style={{ backgroundColor: c }}
                                                                                            >
                                                                                                {o.color === c && <Check className="w-4 h-4 text-white" />}
                                                                                            </button>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                                <div className="space-y-3">
                                                                                    <div className="flex justify-between items-center">
                                                                                        <span className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">Espessura</span>
                                                                                        <span className="text-[12px] font-bold text-blue-500">{o.thickness ?? 3}px</span>
                                                                                    </div>
                                                                                    <input
                                                                                        type="range" min="1" max="20"
                                                                                        value={o.thickness ?? 3}
                                                                                        onChange={(e) => {
                                                                                            const val = parseInt(e.target.value);
                                                                                            setOverlays(overlays.map(ov => ov.id === o.id ? { ...ov, thickness: val } : ov));
                                                                                        }}
                                                                                        className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <button
                                                                    className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-all text-gray-700 font-semibold text-[15px]"
                                                                    onClick={() => {
                                                                        const id = Math.random().toString(36).substring(7);
                                                                        setOverlays([...overlays, { ...o, id, x: o.x + 20, y: o.y + 20 }]);
                                                                        setActiveRedactionId(id);
                                                                    }}
                                                                >
                                                                    <Copy className="w-5 h-5 text-gray-400" strokeWidth={2} />
                                                                    Duplicar
                                                                </button>

                                                                <button
                                                                    className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-all text-gray-700 font-semibold text-[15px]"
                                                                    onClick={() => bringToFront(o.id)}
                                                                >
                                                                    <BringToFront className="w-5 h-5 text-gray-400" strokeWidth={2} />
                                                                    Trazer para a frente
                                                                </button>

                                                                <button
                                                                    className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-all text-gray-700 font-semibold text-[15px]"
                                                                    onClick={() => sendToBack(o.id)}
                                                                >
                                                                    <SendToBack className="w-5 h-5 text-gray-400" strokeWidth={2} />
                                                                    Enviar para trás
                                                                </button>

                                                                <button
                                                                    className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-all text-gray-700 font-semibold text-[15px]"
                                                                    onClick={() => {
                                                                        setOverlays(overlays.map(ov => ov.id === o.id ? { ...ov, rotation: ((ov.rotation || 0) + 90) % 360 } : ov));
                                                                    }}
                                                                >
                                                                    <RotateCw className="w-5 h-5 text-gray-400" strokeWidth={2} />
                                                                    Rodar
                                                                </button>

                                                                <div className="h-[1px] bg-gray-50 my-2 mx-6" />

                                                                <button
                                                                    className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-red-50 transition-all text-red-500 font-bold text-[16px]"
                                                                    onClick={() => { setOverlays(overlays.filter(ov => ov.id !== o.id)); setActiveRedactionId(null); }}
                                                                >
                                                                    <Trash2 className="w-5 h-5 text-red-500" strokeWidth={2} />
                                                                    Eliminar
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {activeRedactionId === o.id && (
                                                        <>
                                                            <div className="absolute -left-1.5 -top-1.5 w-[11px] h-[11px] bg-[#248AF6] rounded-full cursor-nwse-resize z-50 shadow-sm hover:scale-125 transition-transform" onMouseDown={(e) => { e.stopPropagation(); setIsResizing("lt"); const r_drag = editorRef.current?.getBoundingClientRect(); if (r_drag) setDragStart({ x: (e.clientX - r_drag.left) / zoom, y: (e.clientY - r_drag.top) / zoom }); }} />
                                                            <div className="absolute left-1/2 -top-1.5 -translate-x-1/2 w-[11px] h-[11px] bg-[#248AF6] rounded-full cursor-ns-resize z-50 shadow-sm hover:scale-125 transition-transform" onMouseDown={(e) => { e.stopPropagation(); setIsResizing("t"); const r_drag = editorRef.current?.getBoundingClientRect(); if (r_drag) setDragStart({ x: (e.clientX - r_drag.left) / zoom, y: (e.clientY - r_drag.top) / zoom }); }} />
                                                            <div className="absolute -right-1.5 -top-1.5 w-[11px] h-[11px] bg-[#248AF6] rounded-full cursor-nesw-resize z-50 shadow-sm hover:scale-125 transition-transform" onMouseDown={(e) => { e.stopPropagation(); setIsResizing("rt"); const r_drag = editorRef.current?.getBoundingClientRect(); if (r_drag) setDragStart({ x: (e.clientX - r_drag.left) / zoom, y: (e.clientY - r_drag.top) / zoom }); }} />
                                                            <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-[11px] h-[11px] bg-[#248AF6] rounded-full cursor-ew-resize z-50 shadow-sm hover:scale-125 transition-transform" onMouseDown={(e) => { e.stopPropagation(); setIsResizing("l"); const r_drag = editorRef.current?.getBoundingClientRect(); if (r_drag) setDragStart({ x: (e.clientX - r_drag.left) / zoom, y: (e.clientY - r_drag.top) / zoom }); }} />
                                                            <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-[11px] h-[11px] bg-[#248AF6] rounded-full cursor-ew-resize z-50 shadow-sm hover:scale-125 transition-transform" onMouseDown={(e) => { e.stopPropagation(); setIsResizing("r"); const r_drag = editorRef.current?.getBoundingClientRect(); if (r_drag) setDragStart({ x: (e.clientX - r_drag.left) / zoom, y: (e.clientY - r_drag.top) / zoom }); }} />
                                                            <div className="absolute -left-1.5 -bottom-1.5 w-[11px] h-[11px] bg-[#248AF6] rounded-full cursor-nesw-resize z-50 shadow-sm hover:scale-125 transition-transform" onMouseDown={(e) => { e.stopPropagation(); setIsResizing("lb"); const r_drag = editorRef.current?.getBoundingClientRect(); if (r_drag) setDragStart({ x: (e.clientX - r_drag.left) / zoom, y: (e.clientY - r_drag.top) / zoom }); }} />
                                                            <div className="absolute left-1/2 -bottom-1.5 -translate-x-1/2 w-[11px] h-[11px] bg-[#248AF6] rounded-full cursor-ns-resize z-50 shadow-sm hover:scale-125 transition-transform" onMouseDown={(e) => { e.stopPropagation(); setIsResizing("b"); const r_drag = editorRef.current?.getBoundingClientRect(); if (r_drag) setDragStart({ x: (e.clientX - r_drag.left) / zoom, y: (e.clientY - r_drag.top) / zoom }); }} />
                                                            <div className="absolute -right-1.5 -bottom-1.5 w-[11px] h-[11px] bg-[#248AF6] rounded-full cursor-nwse-resize z-50 shadow-sm hover:scale-125 transition-transform" onMouseDown={(e) => { e.stopPropagation(); setIsResizing("rb"); const r_drag = editorRef.current?.getBoundingClientRect(); if (r_drag) setDragStart({ x: (e.clientX - r_drag.left) / zoom, y: (e.clientY - r_drag.top) / zoom }); }} />

                                                            {/* Rotation Handle */}
                                                            <div
                                                                className="absolute left-1/2 -top-10 -translate-x-1/2 w-[34px] h-[34px] bg-white rounded-full z-50 shadow-[0_4px_12px_rgba(36,138,246,0.3)] border-[2px] border-[#248AF6] flex items-center justify-center cursor-pointer hover:bg-blue-50 transition-colors"
                                                                onMouseDown={(e) => {
                                                                    e.stopPropagation();
                                                                    e.preventDefault();
                                                                    const rect = editorRef.current?.getBoundingClientRect();
                                                                    if (rect) setDragStart({ x: (e.clientX - rect.left) / zoom, y: (e.clientY - rect.top) / zoom });
                                                                    setIsResizing("rotate");
                                                                }}
                                                            >
                                                                <RotateCw className="w-4 h-4 text-[#248AF6]" strokeWidth={2.5} />
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            );
                                        }

                                        // Outros overlays (redact, text, sign...)
                                        return (
                                            <div
                                                key={o.id}
                                                className={`absolute cursor-move ${activeRedactionId === o.id ? 'ring-2 ring-blue-500' : ''} ${o.isNew ? 'animate-in fade-in zoom-in-90 duration-300' : ''}`}
                                                style={{
                                                    left: o.x * zoom, top: o.y * zoom,
                                                    width: (o.width || 100) * zoom,
                                                    height: (o.height || 30) * zoom,
                                                    zIndex: activeRedactionId === o.id ? 1000 : 40,
                                                    opacity: o.opacity !== undefined ? o.opacity : 1
                                                }}
                                                onMouseDown={(e) => {
                                                    if (tool === "select" || ["text", "erase", "highlight", "image", "check", "cross", "rect", "circle", "line", "arrow", "curve", "pentagon", "cloud", "star", "stamp", "postit"].includes(o.type)) {
                                                        e.stopPropagation();
                                                        if (["text", "erase", "highlight", "image", "check", "cross", "rect", "circle", "line", "arrow", "curve", "pentagon", "cloud", "star", "stamp", "postit"].includes(o.type) && tool !== "select") {
                                                            setTool("select");
                                                        }
                                                        setDragIndex(overlays.findIndex(ov => ov.id === o.id));
                                                        handleSelectOverlay(o.id);
                                                        const rect = editorRef.current?.getBoundingClientRect();
                                                        if (rect) setDragStart({ x: (e.clientX - rect.left) / zoom, y: (e.clientY - rect.top) / zoom });
                                                    }
                                                }}
                                                onContextMenu={(e) => {
                                                    e.preventDefault(); e.stopPropagation();
                                                }}
                                            >
                                                {/* ROTATED CONTENT WRAPPER */}
                                                <div className="w-full h-full relative pointer-events-none" style={{ transform: `rotate(${o.rotation || 0}deg)` }}>
                                                    <div className="w-full h-full pointer-events-auto">

                                                        {o.type === "redact" && <div className="bg-black w-full h-full shadow-lg" />}
                                                        {(o.type === "redigir" || o.isRedaction) && (
                                                            <div
                                                                className="w-full h-full"
                                                                style={{
                                                                    backgroundColor: o.applied ? 'black' : 'transparent',
                                                                    border: o.applied ? 'none' : '2px solid #ef4444'
                                                                }}
                                                            />
                                                        )}
                                                        {/* IMAGE OVERLAY CONTENT */}
                                                        {o.type === "image" && (
                                                            <div className={`w-full h-full relative group ${croppingId === o.id ? 'cursor-crosshair' : ''}`}>
                                                                <img
                                                                    src={o.content}
                                                                    className="w-full h-full object-contain pointer-events-none"
                                                                    style={{
                                                                        opacity: o.opacity ?? 1,
                                                                        clipPath: croppingId === o.id ? 'none' : (o.clipPath || 'none')
                                                                    }}
                                                                />
                                                                {croppingId === o.id && (
                                                                    <>
                                                                        {/* Grid Lines */}
                                                                        <div className="absolute inset-0 pointer-events-none ring-2 ring-white ring-inset shadow-[0_0_0_1000px_rgba(0,0,0,0.5)] z-10 transition-all">
                                                                            <div className="absolute top-[33.3%] left-0 w-full h-[1px] border-t border-dashed border-white/60" />
                                                                            <div className="absolute top-[66.6%] left-0 w-full h-[1px] border-t border-dashed border-white/60" />
                                                                            <div className="absolute left-[33.3%] top-0 h-full w-[1px] border-l border-dashed border-white/60" />
                                                                            <div className="absolute left-[66.6%] top-0 h-full w-[1px] border-l border-dashed border-white/60" />
                                                                        </div>
                                                                        {/* Crop Handles (Black Squares) */}
                                                                        <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-black z-20" />
                                                                        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-black z-20" />
                                                                        <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-black z-20" />
                                                                        <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-black z-20" />
                                                                        <div className="absolute top-1/2 -translate-y-1/2 -left-1 w-2.5 h-2.5 bg-black z-20" />
                                                                        <div className="absolute top-1/2 -translate-y-1/2 -right-1 w-2.5 h-2.5 bg-black z-20" />
                                                                        <div className="absolute left-1/2 -translate-x-1/2 -top-1 w-2.5 h-2.5 bg-black z-20" />
                                                                        <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2.5 h-2.5 bg-black z-20" />
                                                                    </>
                                                                )}

                                                                {/* ROTATION BUTTON REMOVED IN FAVOR OF MENU AS PER NEW PHOTO */}
                                                            </div>
                                                        )}
                                                        {o.type === "erase" && <div className="w-full h-full border border-gray-200 shadow-sm" style={{ backgroundColor: o.color || "#ffffff" }} />}
                                                        {o.type === "highlight" && <div className="w-full h-full rounded-[2px] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.02)]" style={{ backgroundColor: o.color || "#fde047", opacity: o.opacity || 0.5, mixBlendMode: 'multiply' }} />}
                                                        {o.type === "check" && (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <Check strokeWidth={2.5} className="w-full h-full" style={{ color: o.color || "#1a1a1a" }} />
                                                            </div>
                                                        )}
                                                        {o.type === "cross" && (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <X strokeWidth={2.5} className="w-full h-full" style={{ color: o.color || "#248AF6" }} />
                                                            </div>
                                                        )}
                                                        {o.type === "rect" && (
                                                            <div
                                                                className="w-full h-full"
                                                                style={{
                                                                    borderColor: o.color || "#1a1a1a",
                                                                    borderWidth: `${o.borderWidth ?? 3}px`,
                                                                    borderStyle: 'solid',
                                                                    backgroundColor: o.fillColor || 'transparent',
                                                                    opacity: o.fillOpacity ?? 1
                                                                }}
                                                            />
                                                        )}
                                                        {o.type === "circle" && (
                                                            <div
                                                                className="w-full h-full rounded-full"
                                                                style={{
                                                                    borderColor: o.color || "#1a1a1a",
                                                                    borderWidth: `${o.borderWidth ?? 3}px`,
                                                                    borderStyle: 'solid',
                                                                    backgroundColor: o.fillColor || 'transparent',
                                                                    opacity: o.fillOpacity ?? 1
                                                                }}
                                                            />
                                                        )}
                                                        {o.type === "line" && <div className="w-full h-full flex flex-col justify-center"><div className="w-full border-t-[3px]" style={{ borderColor: o.color || "#1a1a1a" }} /></div>}
                                                        {o.type === "arrow" && (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <ArrowUpRight strokeWidth={o.borderWidth ?? 2.5} className="w-full h-full" style={{ color: o.color || "#1a1a1a" }} />
                                                            </div>
                                                        )}
                                                        {o.type === "curve" && (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <CornerUpRight strokeWidth={o.borderWidth ?? 2.5} className="w-full h-full" style={{ color: o.color || "#1a1a1a" }} />
                                                            </div>
                                                        )}
                                                        {o.type === "pentagon" && (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <Pentagon strokeWidth={o.borderWidth ?? 2.5} className="w-full h-full" style={{ color: o.color || "#1a1a1a", fill: o.fillColor || 'none', fillOpacity: o.fillOpacity ?? 1 }} />
                                                            </div>
                                                        )}
                                                        {o.type === "cloud" && (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <Cloud strokeWidth={o.borderWidth ?? 2.5} className="w-full h-full" style={{ color: o.color || "#1a1a1a", fill: o.fillColor || 'none', fillOpacity: o.fillOpacity ?? 1 }} />
                                                            </div>
                                                        )}
                                                        {o.type === "star" && (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <Star strokeWidth={o.borderWidth ?? 2.5} className="w-full h-full" style={{ color: o.color || "#1a1a1a", fill: o.fillColor || 'none', fillOpacity: o.fillOpacity ?? 1 }} />
                                                            </div>
                                                        )}
                                                        {o.type === "postit" && (
                                                            <div className="w-full h-full p-4 shadow-xl flex flex-col group/postit relative" style={{ backgroundColor: o.bgColor || (o.color === "transparent" ? "#FEF9C3" : o.color) }}>
                                                                <div
                                                                    className={`w-full h-full text-gray-800 outline-none p-1 font-medium ${activeRedactionId === o.id ? 'cursor-text' : 'cursor-move'}`}
                                                                    style={{
                                                                        fontFamily: o.fontFamily || fontSettings.family,
                                                                        fontSize: (o.fontSize || fontSettings.size) * zoom,
                                                                        fontWeight: o.fontWeight || (fontSettings.bold ? "bold" : "normal"),
                                                                        fontStyle: o.fontStyle || (fontSettings.italic ? "italic" : "normal"),
                                                                        textDecoration: o.textDecoration || (fontSettings.underline ? "underline" : fontSettings.strike ? "line-through" : "none"),
                                                                        textAlign: (o.textAlign as any) || fontSettings.align,
                                                                        color: o.textColor || fontSettings.color
                                                                    }}
                                                                    contentEditable={activeRedactionId === o.id}
                                                                    suppressContentEditableWarning
                                                                    onMouseDown={(e) => { if (activeRedactionId === o.id) e.stopPropagation(); }}
                                                                    onBlur={(e) => {
                                                                        const newOverlays = [...overlays];
                                                                        const idx = newOverlays.findIndex(ov => ov.id === o.id);
                                                                        if (idx !== -1) newOverlays[idx].content = e.currentTarget.innerText || "";
                                                                        setOverlays(newOverlays);
                                                                    }}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
                                                                            // Allow select all
                                                                        }
                                                                    }}
                                                                >
                                                                    {o.content || "Adicionar texto"}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {o.type === "stamp" && (
                                                            <div className={`w-full h-full flex items-center justify-center font-black text-center relative`}>
                                                                {/* Shape Background */}
                                                                <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 40">
                                                                    {["INI", "ASSINE", "TESTEMUNHA"].some(key => o.content.includes(key)) ? (
                                                                        /* Chevron Pointy Shape */
                                                                        <path
                                                                            d="M 5,0 L 95,0 L 100,20 L 95,40 L 5,40 L 0,20 Z"
                                                                            fill={o.templateStr.includes('amber') ? '#FFF9EB' : (o.templateStr.includes('emerald') ? '#ECFDF5' : '#F0F9FF')}
                                                                            stroke={o.templateStr.includes('amber') ? '#D97706' : (o.templateStr.includes('emerald') ? '#059669' : '#0284C7')}
                                                                            strokeWidth="2.5"
                                                                        />
                                                                    ) : (
                                                                        /* Rounded Rect Box Shape */
                                                                        <rect
                                                                            x="2" y="2" width="96" height="36" rx="8"
                                                                            fill={o.templateStr.includes('red') ? '#FEF2F2' : (o.templateStr.includes('emerald') ? '#ECFDF5' : (o.templateStr.includes('amber') ? '#FFF9EB' : '#F0F9FF'))}
                                                                            stroke={o.templateStr.includes('red') ? '#DC2626' : (o.templateStr.includes('emerald') ? '#059669' : (o.templateStr.includes('amber') ? '#D97706' : '#0284C7'))}
                                                                            strokeWidth="2.5"
                                                                        />
                                                                    )}
                                                                </svg>
                                                                <span
                                                                    className={`leading-tight px-6 pt-0.5 z-10 uppercase align-middle ${o.templateStr.split(' ')[0]}`}
                                                                    style={{ fontSize: `${((o.width || 180) / 10.5) * zoom}px` }}
                                                                >
                                                                    {o.content}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {o.type === "text" && (
                                                            <div className="relative w-full h-full min-h-[30px]"
                                                                onMouseDown={(e) => {
                                                                    if (activeRedactionId === o.id) e.stopPropagation();
                                                                }}>
                                                                <div
                                                                    contentEditable={activeRedactionId === o.id}
                                                                    suppressContentEditableWarning
                                                                    onBlur={(e) => {
                                                                        const newOverlays = [...overlays];
                                                                        const idx = newOverlays.findIndex(ov => ov.id === o.id);
                                                                        if (idx !== -1) newOverlays[idx].content = e.currentTarget.innerText || "";
                                                                        setOverlays(newOverlays);
                                                                    }}
                                                                    style={{
                                                                        color: o.color, fontFamily: o.fontFamily || "Arial", fontSize: `${(o.fontSize || 14) * zoom}px`,
                                                                        fontWeight: o.fontWeight || "normal", fontStyle: o.fontStyle || "normal",
                                                                        textDecoration: o.textDecoration || "none", backgroundColor: o.backgroundColor === "transparent" ? "transparent" : o.backgroundColor,
                                                                        textAlign: o.textAlign || "left", width: "100%", height: "100%", outline: "none", wordBreak: "break-word",
                                                                        lineHeight: "1.2", minHeight: "100%", display: "flex", alignItems: "center"
                                                                    }}
                                                                    className={`p-1 ${activeRedactionId === o.id ? 'cursor-text ring-1 ring-blue-500 border border-blue-200' : ''}`}
                                                                    onClick={(e) => { if (activeRedactionId === o.id) e.currentTarget.focus(); }}
                                                                >
                                                                    {o.content}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {o.type === "sign" && (
                                                            <div className="border-4 border-red-500 text-red-500 px-4 py-1 font-black text-2xl uppercase rounded-sm -rotate-6 bg-white/10 backdrop-blur-sm">
                                                                {o.content}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* UNROTATED UI WRAPPER (MENUS & HANDLES) */}
                                                {activeRedactionId === o.id && (
                                                    <div className="absolute inset-0 pointer-events-none">
                                                        {/* RESIZE HANDLES (Axis-aligned for better UX) */}
                                                        {o.type === "redact" && (
                                                            <div
                                                                className="absolute -right-1 -bottom-1 w-3 h-3 bg-blue-500 rounded-full border border-white cursor-nwse-resize pointer-events-auto"
                                                                onMouseDown={(e) => { e.stopPropagation(); setIsResizing("rb"); const r_drag = editorRef.current?.getBoundingClientRect(); if (r_drag) setDragStart({ x: (e.clientX - r_drag.left) / zoom, y: (e.clientY - r_drag.top) / zoom }); }}
                                                            />
                                                        )}

                                                        {(["text", "erase", "highlight", "check", "cross", "rect", "circle", "line", "arrow", "curve", "pentagon", "cloud", "star", "stamp", "postit"].includes(o.type)) && (
                                                            <>
                                                                <div className="absolute -left-2 -top-2 w-4 h-4 bg-blue-500 rounded-full cursor-nwse-resize z-50 shadow-md border-2 border-white hover:scale-125 transition-transform pointer-events-auto" onMouseDown={(e) => { e.stopPropagation(); setIsResizing("lt"); const r_drag = editorRef.current?.getBoundingClientRect(); if (r_drag) setDragStart({ x: (e.clientX - r_drag.left) / zoom, y: (e.clientY - r_drag.top) / zoom }); }} />
                                                                <div className="absolute left-1/2 -top-2 -translate-x-1/2 w-4 h-4 bg-blue-500 rounded-full cursor-ns-resize z-50 shadow-md border-2 border-white hover:scale-125 transition-transform pointer-events-auto" onMouseDown={(e) => { e.stopPropagation(); setIsResizing("t"); const r_drag = editorRef.current?.getBoundingClientRect(); if (r_drag) setDragStart({ x: (e.clientX - r_drag.left) / zoom, y: (e.clientY - r_drag.top) / zoom }); }} />
                                                                <div className="absolute -right-2 -top-2 w-4 h-4 bg-blue-500 rounded-full cursor-nesw-resize z-50 shadow-md border-2 border-white hover:scale-125 transition-transform pointer-events-auto" onMouseDown={(e) => { e.stopPropagation(); setIsResizing("rt"); const r_drag = editorRef.current?.getBoundingClientRect(); if (r_drag) setDragStart({ x: (e.clientX - r_drag.left) / zoom, y: (e.clientY - r_drag.top) / zoom }); }} />
                                                                <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-blue-500 rounded-full cursor-ew-resize z-50 shadow-md border-2 border-white hover:scale-125 transition-transform pointer-events-auto" onMouseDown={(e) => { e.stopPropagation(); setIsResizing("l"); const r_drag = editorRef.current?.getBoundingClientRect(); if (r_drag) setDragStart({ x: (e.clientX - r_drag.left) / zoom, y: (e.clientY - r_drag.top) / zoom }); }} />
                                                                <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-blue-500 rounded-full cursor-ew-resize z-50 shadow-md border-2 border-white hover:scale-125 transition-transform pointer-events-auto" onMouseDown={(e) => { e.stopPropagation(); setIsResizing("r"); const r_drag = editorRef.current?.getBoundingClientRect(); if (r_drag) setDragStart({ x: (e.clientX - r_drag.left) / zoom, y: (e.clientY - r_drag.top) / zoom }); }} />
                                                                <div className="absolute -left-2 -bottom-2 w-4 h-4 bg-blue-500 rounded-full cursor-nesw-resize z-50 shadow-md border-2 border-white hover:scale-125 transition-transform pointer-events-auto" onMouseDown={(e) => { e.stopPropagation(); setIsResizing("lb"); const r_drag = editorRef.current?.getBoundingClientRect(); if (r_drag) setDragStart({ x: (e.clientX - r_drag.left) / zoom, y: (e.clientY - r_drag.top) / zoom }); }} />
                                                                <div className="absolute left-1/2 -bottom-2 -translate-x-1/2 w-4 h-4 bg-blue-500 rounded-full cursor-ns-resize z-50 shadow-md border-2 border-white hover:scale-125 transition-transform pointer-events-auto" onMouseDown={(e) => { e.stopPropagation(); setIsResizing("b"); const r_drag = editorRef.current?.getBoundingClientRect(); if (r_drag) setDragStart({ x: (e.clientX - r_drag.left) / zoom, y: (e.clientY - r_drag.top) / zoom }); }} />
                                                                <div className="absolute -right-2 -bottom-2 w-4 h-4 bg-blue-500 rounded-full cursor-nwse-resize z-50 shadow-md border-2 border-white hover:scale-125 transition-transform pointer-events-auto" onMouseDown={(e) => { e.stopPropagation(); setIsResizing("rb"); const r_drag = editorRef.current?.getBoundingClientRect(); if (r_drag) setDragStart({ x: (e.clientX - r_drag.left) / zoom, y: (e.clientY - r_drag.top) / zoom }); }} />

                                                                <div
                                                                    className="absolute left-1/2 -top-10 -translate-x-1/2 w-[34px] h-[34px] bg-white rounded-full z-50 shadow-[0_4px_12px_rgba(36,138,246,0.3)] border-[2px] border-[#248AF6] flex items-center justify-center cursor-pointer hover:bg-blue-50 transition-colors pointer-events-auto"
                                                                    onMouseDown={(e) => {
                                                                        e.stopPropagation();
                                                                        e.preventDefault();
                                                                        const rect = editorRef.current?.getBoundingClientRect();
                                                                        if (rect) setDragStart({ x: (e.clientX - rect.left) / zoom, y: (e.clientY - rect.top) / zoom });
                                                                        setIsResizing("rotate");
                                                                    }}
                                                                >
                                                                    <RotateCw className="w-4 h-4 text-[#248AF6]" strokeWidth={2.5} />
                                                                </div>
                                                            </>
                                                        )}

                                                        {/* STANDARD ACTION MENU (FOR ALL COMPONENTS EXCEPT IMAGE/SHAPE/POSTIT/HIGHLIGHT WHICH HAVE CUSTOM ONES) */}
                                                        {["text", "check", "cross", "stamp", "line", "arrow", "curve"].includes(o.type) && activeRedactionId === o.id && (
                                                            <div
                                                                className={`absolute z-[500] pointer-events-auto flex items-center`}
                                                                style={{
                                                                    left: o.x * zoom > 400 ? 'auto' : 'calc(100% + 24px)',
                                                                    right: o.x * zoom > 400 ? 'calc(100% + 24px)' : 'auto',
                                                                    top: '50%',
                                                                    transform: 'translateY(-50%)',
                                                                }}
                                                                onMouseDown={(e) => e.stopPropagation()}
                                                            >
                                                                <div
                                                                    className="bg-white rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-gray-100 py-4 w-[240px] flex flex-col animate-in fade-in zoom-in-95 duration-300"
                                                                >
                                                                    <button
                                                                        className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-all text-gray-700 font-semibold text-[15px]"
                                                                        onClick={() => {
                                                                            const id = Math.random().toString(36).substring(7);
                                                                            setOverlays([...overlays, { ...o, id, x: o.x + 10, y: o.y + 10 }]);
                                                                            setActiveRedactionId(id);
                                                                        }}
                                                                    >
                                                                        <Copy className="w-5 h-5 text-gray-400" strokeWidth={2} />
                                                                        Duplicar
                                                                    </button>

                                                                    <button
                                                                        className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-all text-gray-700 font-semibold text-[15px]"
                                                                        onClick={() => bringToFront(o.id)}
                                                                    >
                                                                        <BringToFront className="w-5 h-5 text-gray-400" strokeWidth={2} />
                                                                        Trazer para a frente
                                                                    </button>

                                                                    <button
                                                                        className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-all text-gray-700 font-semibold text-[15px]"
                                                                        onClick={() => sendToBack(o.id)}
                                                                    >
                                                                        <SendToBack className="w-5 h-5 text-gray-400" strokeWidth={2} />
                                                                        Enviar para trás
                                                                    </button>

                                                                    <button
                                                                        className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-all text-gray-700 font-semibold text-[15px]"
                                                                        onClick={() => {
                                                                            setOverlays(overlays.map(ov => ov.id === o.id ? { ...ov, rotation: ((ov.rotation || 0) + 90) % 360 } : ov));
                                                                        }}
                                                                    >
                                                                        <RotateCw className="w-5 h-5 text-gray-400" strokeWidth={2} />
                                                                        Rodar
                                                                    </button>

                                                                    <div className="h-[1px] bg-gray-50 my-2 mx-6" />

                                                                    <button
                                                                        className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-red-50 transition-all text-red-500 font-bold text-[16px]"
                                                                        onClick={() => { setOverlays(overlays.filter(ov => ov.id !== o.id)); setActiveRedactionId(null); }}
                                                                    >
                                                                        <Trash2 className="w-5 h-5 text-red-500" strokeWidth={2} />
                                                                        Eliminar
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {o.type === "image" && (
                                                            <>
                                                                <div className="absolute -left-2 -top-2 w-5 h-5 bg-[#248AF6] rounded-full cursor-nwse-resize z-[100] shadow-lg border-2 border-white hover:scale-125 transition-transform pointer-events-auto" onMouseDown={(e) => { e.stopPropagation(); setIsResizing("lt"); const r_drag = editorRef.current?.getBoundingClientRect(); if (r_drag) setDragStart({ x: (e.clientX - r_drag.left) / zoom, y: (e.clientY - r_drag.top) / zoom }); }} />
                                                                <div className="absolute -right-2 -top-2 w-5 h-5 bg-[#248AF6] rounded-full cursor-nesw-resize z-[100] shadow-lg border-2 border-white hover:scale-125 transition-transform pointer-events-auto" onMouseDown={(e) => { e.stopPropagation(); setIsResizing("rt"); const r_drag = editorRef.current?.getBoundingClientRect(); if (r_drag) setDragStart({ x: (e.clientX - r_drag.left) / zoom, y: (e.clientY - r_drag.top) / zoom }); }} />
                                                                <div className="absolute -left-2 -bottom-2 w-5 h-5 bg-[#248AF6] rounded-full cursor-nesw-resize z-[100] shadow-lg border-2 border-white hover:scale-125 transition-transform pointer-events-auto" onMouseDown={(e) => { e.stopPropagation(); setIsResizing("lb"); const r_drag = editorRef.current?.getBoundingClientRect(); if (r_drag) setDragStart({ x: (e.clientX - r_drag.left) / zoom, y: (e.clientY - r_drag.top) / zoom }); }} />
                                                                <div className="absolute -right-2 -bottom-2 w-5 h-5 bg-[#248AF6] rounded-full cursor-nwse-resize z-[100] shadow-lg border-2 border-white hover:scale-125 transition-transform pointer-events-auto" onMouseDown={(e) => { e.stopPropagation(); setIsResizing("rb"); const r_drag = editorRef.current?.getBoundingClientRect(); if (r_drag) setDragStart({ x: (e.clientX - r_drag.left) / zoom, y: (e.clientY - r_drag.top) / zoom }); }} />
                                                            </>
                                                        )}


                                                        {/* IMAGE FLOATING MENU / SIDEBAR (REBUILT AS PER PHOTO 3) */}
                                                        {o.type === "image" && activeRedactionId === o.id && (
                                                            <div
                                                                className={`absolute z-[500] pointer-events-auto flex items-center`}
                                                                style={{
                                                                    left: o.x * zoom > 400 ? 'auto' : 'calc(100% + 24px)',
                                                                    right: o.x * zoom > 400 ? 'calc(100% + 24px)' : 'auto',
                                                                    top: '50%',
                                                                    transform: 'translateY(-50%)',
                                                                    minHeight: Math.min(o.height * zoom * 0.9, 450) // Adjust height to be "smaller than image"
                                                                }}
                                                                onMouseDown={(e) => e.stopPropagation()}
                                                            >
                                                                {croppingId === o.id ? (
                                                                    /* CROP CONTROLS PANEL */
                                                                    <div
                                                                        className="bg-white rounded-[24px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-gray-100 p-3 w-[240px] flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-300"
                                                                    >
                                                                        <button
                                                                            onClick={() => {
                                                                                setCroppingId(null);
                                                                                toast.success("Corte aplicado!");
                                                                            }}
                                                                            className="w-full bg-[#F0F7FF] border-[2px] border-[#D1E9FF] hover:bg-[#E1EFFF] text-[#248AF6] px-4 py-3.5 rounded-[16px] font-bold flex items-center justify-center gap-3 transition-all"
                                                                        >
                                                                            <Check className="w-5 h-5" strokeWidth={3} /> Aplicar
                                                                        </button>
                                                                        <button
                                                                            onClick={() => setCroppingId(null)}
                                                                            className="w-full bg-white hover:bg-gray-50 text-gray-400 px-4 py-3.5 rounded-[16px] font-bold flex items-center justify-center gap-3 transition-all"
                                                                        >
                                                                            <X className="w-5 h-5" strokeWidth={2.5} /> Cancelar
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    /* MAIN IMAGE MENU (MATCHING PHOTO 3) */
                                                                    <div
                                                                        className="bg-white rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-gray-100 py-4 w-[240px] flex flex-col animate-in fade-in zoom-in-95 duration-300"
                                                                    >
                                                                        <button
                                                                            className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-all text-gray-700 font-semibold text-[15px]"
                                                                            onClick={() => setCroppingId(o.id)}
                                                                        >
                                                                            <div className="w-5 h-5 flex items-center justify-center">
                                                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2v14a2 2 0 0 0 2 2h14" /><path d="M18 22V8a2 2 0 0 0-2-2H2" /></svg>
                                                                            </div>
                                                                            Cortar
                                                                        </button>

                                                                        <div className="relative">
                                                                            <button
                                                                                className={`w-full flex items-center justify-between px-6 py-3.5 transition-all text-gray-700 font-semibold text-[15px] ${activeDropdown === 'img-opacity' ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
                                                                                onClick={() => setActiveDropdown(activeDropdown === 'img-opacity' ? null : 'img-opacity')}
                                                                            >
                                                                                <div className="flex items-center gap-4">
                                                                                    <Layers className="w-5 h-5 text-gray-400" strokeWidth={2} />
                                                                                    Opacidade
                                                                                </div>
                                                                                <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${activeDropdown === 'img-opacity' ? 'rotate-90' : ''}`} />
                                                                            </button>
                                                                            {activeDropdown === 'img-opacity' && (
                                                                                <div className={`absolute top-0 bg-white rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.15)] border border-gray-100 p-6 w-[250px] z-[600] animate-in fade-in slide-in-from-top-2 ${o.x * zoom > 400 ? 'right-[calc(100%+15px)]' : 'left-[calc(100%+15px)]'}`}>
                                                                                    <div className="flex flex-col gap-4">
                                                                                        <span className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">Ajustar opacidade</span>
                                                                                        <input
                                                                                            type="range" min="10" max="100"
                                                                                            value={(o.opacity || 1) * 100}
                                                                                            onChange={(e) => {
                                                                                                const val = parseInt(e.target.value) / 100;
                                                                                                setOverlays(overlays.map(ov => ov.id === o.id ? { ...ov, opacity: val } : ov));
                                                                                            }}
                                                                                            className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                                                                        />
                                                                                        <div className="flex justify-between text-[11px] font-bold text-gray-400">
                                                                                            <span>10%</span>
                                                                                            <span>100%</span>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        <button
                                                                            className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-all text-gray-700 font-semibold text-[15px]"
                                                                            onClick={() => imageInputRef.current?.click()}
                                                                        >
                                                                            <div className="w-5 h-5 flex items-center justify-center">
                                                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 16h5v5" /></svg>
                                                                            </div>
                                                                            Substituir imagem
                                                                        </button>

                                                                        <button
                                                                            className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-all text-gray-700 font-semibold text-[15px]"
                                                                            onClick={() => {
                                                                                const id = Math.random().toString(36).substring(7);
                                                                                setOverlays([...overlays, { ...o, id, x: o.x + 10, y: o.y + 10 }]);
                                                                                setActiveRedactionId(id);
                                                                            }}
                                                                        >
                                                                            <Copy className="w-5 h-5 text-gray-400" strokeWidth={2} />
                                                                            Duplicar
                                                                        </button>

                                                                        <button
                                                                            className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-all text-gray-700 font-semibold text-[15px]"
                                                                            onClick={() => setShowLinkModal(o.id)}
                                                                        >
                                                                            <div className="w-5 h-5 flex items-center justify-center text-gray-400">
                                                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /><line x1="15" y1="9" x2="15" y2="9" /></svg>
                                                                            </div>
                                                                            Adicionar o link
                                                                        </button>

                                                                        <div className="h-[1px] bg-gray-50 my-2 mx-6" />

                                                                        <button
                                                                            className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-all text-gray-700 font-semibold text-[15px]"
                                                                            onClick={() => bringToFront(o.id)}
                                                                        >
                                                                            <BringToFront className="w-5 h-5 text-gray-400" strokeWidth={2} />
                                                                            Trazer para a frente
                                                                        </button>

                                                                        <button
                                                                            className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-all text-gray-700 font-semibold text-[15px]"
                                                                            onClick={() => sendToBack(o.id)}
                                                                        >
                                                                            <SendToBack className="w-5 h-5 text-gray-400" strokeWidth={2} />
                                                                            Enviar para trás
                                                                        </button>

                                                                        <button
                                                                            className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-all text-gray-700 font-semibold text-[15px]"
                                                                            onClick={() => setOverlays(overlays.map(ov => ov.id === o.id ? { ...ov, rotation: ((ov.rotation || 0) + 90) % 360 } : ov))}
                                                                        >
                                                                            <RotateCw className="w-5 h-5 text-gray-400" strokeWidth={2} />
                                                                            Rodar
                                                                        </button>

                                                                        <div className="h-[1px] bg-gray-50 my-2 mx-6" />

                                                                        <button
                                                                            className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-red-50 transition-all text-red-500 font-bold text-[16px]"
                                                                            onClick={() => { setOverlays(overlays.filter(ov => ov.id !== o.id)); setActiveRedactionId(null); }}
                                                                        >
                                                                            <Trash2 className="w-5 h-5 text-red-500" strokeWidth={2} />
                                                                            Eliminar
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* SHAPE FLOATING MENU (MATCHING PHOTO 3) */}
                                                        {["rect", "circle", "pentagon", "cloud", "star"].includes(o.type) && activeRedactionId === o.id && (
                                                            <div
                                                                className={`absolute z-[500] pointer-events-auto flex items-center`}
                                                                style={{
                                                                    left: o.x * zoom > 400 ? 'auto' : 'calc(100% + 24px)',
                                                                    right: o.x * zoom > 400 ? 'calc(100% + 24px)' : 'auto',
                                                                    top: '50%',
                                                                    transform: 'translateY(-50%)',
                                                                }}
                                                                onMouseDown={(e) => e.stopPropagation()}
                                                            >
                                                                <div
                                                                    className="bg-white rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-gray-100 py-4 w-[240px] flex flex-col animate-in fade-in zoom-in-95 duration-300"
                                                                >
                                                                    {/* ESTILO OPTION */}
                                                                    <div className="relative">
                                                                        <button
                                                                            className={`w-full flex items-center justify-between px-6 py-3.5 transition-all text-gray-700 font-semibold text-[15px] ${activeDropdown === 'shape-style' ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
                                                                            onClick={() => setActiveDropdown(activeDropdown === 'shape-style' ? null : 'shape-style')}
                                                                        >
                                                                            <div className="flex items-center gap-4">
                                                                                <Palette className="w-5 h-5 text-gray-400" strokeWidth={2} />
                                                                                Estilo
                                                                            </div>
                                                                            <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${activeDropdown === 'shape-style' ? 'rotate-90' : ''}`} />
                                                                        </button>
                                                                        {activeDropdown === 'shape-style' && (
                                                                            <div className={`absolute top-0 bg-white rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.15)] border border-gray-100 p-6 w-[280px] z-[600] animate-in fade-in slide-in-from-top-2 ${o.x * zoom > 400 ? 'right-[calc(100%+15px)]' : 'left-[calc(100%+15px)]'}`}>
                                                                                <div className="flex flex-col gap-5">
                                                                                    {/* Preenchimento */}
                                                                                    <div className="space-y-3">
                                                                                        <span className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">Preenchimento</span>
                                                                                        <div className="flex flex-wrap gap-2">
                                                                                            {['transparent', '#ffffff', '#000000', '#9ca3af', '#fca5a5', '#fb923c', '#fde047', '#4ade80', '#2dd4bf', '#3b82f6', '#818cf8'].map(c => (
                                                                                                <button
                                                                                                    key={c}
                                                                                                    onClick={() => setOverlays(overlays.map(ov => ov.id === o.id ? { ...ov, fillColor: c } : ov))}
                                                                                                    className={`w-7 h-7 rounded-lg border border-gray-100 flex items-center justify-center transition-all ${o.fillColor === c || (c === 'transparent' && !o.fillColor) ? 'ring-2 ring-blue-500 ring-offset-1' : 'hover:scale-110'}`}
                                                                                                    style={{ backgroundColor: c === 'transparent' ? 'white' : c }}
                                                                                                >
                                                                                                    {c === 'transparent' && <Ban className="w-4 h-4 text-red-500" />}
                                                                                                    {(o.fillColor === c || (c === 'transparent' && !o.fillColor)) && c !== 'transparent' && <Check className={`w-4 h-4 ${c === '#ffffff' ? 'text-black' : 'text-white'}`} />}
                                                                                                </button>
                                                                                            ))}
                                                                                        </div>
                                                                                    </div>

                                                                                    {/* Opacidade do Preenchimento */}
                                                                                    <div className="space-y-3">
                                                                                        <div className="flex justify-between items-center">
                                                                                            <span className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">Opacidade</span>
                                                                                            <span className="text-[12px] font-bold text-blue-500">{Math.round((o.fillOpacity ?? 1) * 100)}%</span>
                                                                                        </div>
                                                                                        <input
                                                                                            type="range" min="0" max="100"
                                                                                            value={(o.fillOpacity ?? 1) * 100}
                                                                                            onChange={(e) => {
                                                                                                const val = parseInt(e.target.value) / 100;
                                                                                                setOverlays(overlays.map(ov => ov.id === o.id ? { ...ov, fillOpacity: val } : ov));
                                                                                            }}
                                                                                            className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                                                                        />
                                                                                    </div>

                                                                                    {/* Bordas */}
                                                                                    <div className="space-y-3">
                                                                                        <span className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">Cor da Borda</span>
                                                                                        <div className="flex flex-wrap gap-2">
                                                                                            {['#000000', '#9ca3af', '#fca5a5', '#fb923c', '#fde047', '#4ade80', '#2dd4bf', '#3b82f6', '#818cf8'].map(c => (
                                                                                                <button
                                                                                                    key={c}
                                                                                                    onClick={() => setOverlays(overlays.map(ov => ov.id === o.id ? { ...ov, color: c } : ov))}
                                                                                                    className={`w-7 h-7 rounded-lg border border-gray-100 flex items-center justify-center transition-all ${o.color === c ? 'ring-2 ring-blue-500 ring-offset-1' : 'hover:scale-110'}`}
                                                                                                    style={{ backgroundColor: c }}
                                                                                                >
                                                                                                    {o.color === c && <Check className={`w-4 h-4 ${c === '#ffffff' ? 'text-black' : 'text-white'}`} />}
                                                                                                </button>
                                                                                            ))}
                                                                                        </div>
                                                                                    </div>

                                                                                    {/* Espessura */}
                                                                                    <div className="space-y-3">
                                                                                        <div className="flex justify-between items-center">
                                                                                            <span className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">Espessura</span>
                                                                                            <span className="text-[12px] font-bold text-blue-500">{o.borderWidth ?? 3}px</span>
                                                                                        </div>
                                                                                        <div className="flex items-center gap-2">
                                                                                            <input
                                                                                                type="range" min="1" max="20"
                                                                                                value={o.borderWidth ?? 3}
                                                                                                onChange={(e) => {
                                                                                                    const val = parseInt(e.target.value);
                                                                                                    setOverlays(overlays.map(ov => ov.id === o.id ? { ...ov, borderWidth: val } : ov));
                                                                                                }}
                                                                                                className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                                                                            />
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    <button
                                                                        className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-all text-gray-700 font-semibold text-[15px]"
                                                                        onClick={() => {
                                                                            const id = Math.random().toString(36).substring(7);
                                                                            setOverlays([...overlays, { ...o, id, x: o.x + 10, y: o.y + 10 }]);
                                                                            setActiveRedactionId(id);
                                                                        }}
                                                                    >
                                                                        <Copy className="w-5 h-5 text-gray-400" strokeWidth={2} />
                                                                        Duplicar
                                                                    </button>

                                                                    <button
                                                                        className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-all text-gray-700 font-semibold text-[15px]"
                                                                        onClick={() => bringToFront(o.id)}
                                                                    >
                                                                        <BringToFront className="w-5 h-5 text-gray-400" strokeWidth={2} />
                                                                        Trazer para a frente
                                                                    </button>

                                                                    <button
                                                                        className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-all text-gray-700 font-semibold text-[15px]"
                                                                        onClick={() => sendToBack(o.id)}
                                                                    >
                                                                        <SendToBack className="w-5 h-5 text-gray-400" strokeWidth={2} />
                                                                        Enviar para trás
                                                                    </button>

                                                                    <button
                                                                        className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-all text-gray-700 font-semibold text-[15px]"
                                                                        onClick={() => {
                                                                            setOverlays(overlays.map(ov => ov.id === o.id ? { ...ov, rotation: ((ov.rotation || 0) + 90) % 360 } : ov));
                                                                        }}
                                                                    >
                                                                        <RotateCw className="w-5 h-5 text-gray-400" strokeWidth={2} />
                                                                        Rodar
                                                                    </button>

                                                                    <div className="h-[1px] bg-gray-50 my-2 mx-6" />

                                                                    <button
                                                                        className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-red-50 transition-all text-red-500 font-bold text-[16px]"
                                                                        onClick={() => { setOverlays(overlays.filter(ov => ov.id !== o.id)); setActiveRedactionId(null); }}
                                                                    >
                                                                        <Trash2 className="w-5 h-5 text-red-500" strokeWidth={2} />
                                                                        Eliminar
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* POPUPS FOR HIGHLIGHT */}
                                                        {activeRedactionId === o.id && o.type === "highlight" && (
                                                            <div
                                                                className={`absolute top-4 flex items-start gap-4 z-[300] ${o.x > 300 ? 'right-[calc(100%+16px)] flex-row-reverse' : 'left-[calc(100%-40px)]'}`}
                                                                onMouseDown={(e) => e.stopPropagation()}
                                                            >
                                                                {/* Main Menu */}
                                                                <div
                                                                    className="bg-white rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-gray-100 py-4 w-[240px] flex flex-col animate-in fade-in zoom-in-95 duration-300"
                                                                >
                                                                    <button
                                                                        className={`w-full flex items-center gap-4 px-6 py-3.5 transition-all font-semibold text-[15px] ${activeDropdown === `high-color-${o.id}` ? 'bg-gray-50 text-gray-900' : 'text-gray-700 hover:bg-gray-50'}`}
                                                                        onClick={() => setActiveDropdown(activeDropdown === `high-color-${o.id}` ? null : `high-color-${o.id}`)}
                                                                    >
                                                                        <Palette className={`w-5 h-5 ${activeDropdown === `high-color-${o.id}` ? 'text-gray-900' : 'text-gray-400'}`} strokeWidth={2} />
                                                                        Cor
                                                                    </button>

                                                                    <button
                                                                        className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-all text-gray-700 font-semibold text-[15px]"
                                                                        onClick={() => setShowLinkModal(o.id)}
                                                                    >
                                                                        <Link2 className="w-5 h-5 text-gray-400" strokeWidth={2} />
                                                                        Adicionar o link
                                                                    </button>

                                                                    <div className="h-[1px] bg-gray-50 my-2 mx-6" />

                                                                    <button
                                                                        className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-all text-gray-700 font-semibold text-[15px]"
                                                                        onClick={() => {
                                                                            const id = Math.random().toString(36).substring(7);
                                                                            setOverlays([...overlays, { ...o, id, x: o.x + 10, y: o.y + 10 }]);
                                                                            setActiveRedactionId(id);
                                                                        }}
                                                                    >
                                                                        <Copy className="w-5 h-5 text-gray-400" strokeWidth={2} />
                                                                        Duplicar
                                                                    </button>

                                                                    <button
                                                                        className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-all text-gray-700 font-semibold text-[15px]"
                                                                        onClick={() => bringToFront(o.id)}
                                                                    >
                                                                        <BringToFront className="w-5 h-5 text-gray-400" strokeWidth={2} />
                                                                        Trazer para a frente
                                                                    </button>

                                                                    <button
                                                                        className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-all text-gray-700 font-semibold text-[15px]"
                                                                        onClick={() => sendToBack(o.id)}
                                                                    >
                                                                        <SendToBack className="w-5 h-5 text-gray-400" strokeWidth={2} />
                                                                        Enviar para trás
                                                                    </button>

                                                                    <button
                                                                        className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-all text-gray-700 font-semibold text-[15px]"
                                                                        onClick={() => {
                                                                            setOverlays(overlays.map(ov => ov.id === o.id ? { ...ov, rotation: ((ov.rotation || 0) + 90) % 360 } : ov));
                                                                        }}
                                                                    >
                                                                        <RotateCw className="w-5 h-5 text-gray-400" strokeWidth={2} />
                                                                        Rodar
                                                                    </button>

                                                                    <div className="h-[1px] bg-gray-50 my-2 mx-6" />

                                                                    <button
                                                                        className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-red-50 transition-all text-red-500 font-bold text-[16px]"
                                                                        onClick={() => { setOverlays(overlays.filter(ov => ov.id !== o.id)); setActiveRedactionId(null); }}
                                                                    >
                                                                        <Trash2 className="w-5 h-5 text-red-500" strokeWidth={2} />
                                                                        Eliminar
                                                                    </button>
                                                                </div>

                                                                {/* Color & Opacity Panel (Appears to the right or left) */}
                                                                {activeDropdown === `high-color-${o.id}` && (
                                                                    <div
                                                                        className={`bg-white rounded-[24px] shadow-[0_20px_60px_rgba(0,0,0,0.18)] border border-gray-100 p-5 w-[300px] animate-in fade-in duration-300 relative flex flex-col gap-4 ${o.x > 300 ? 'slide-in-from-right-4' : 'slide-in-from-left-4'}`}
                                                                    >
                                                                        <div className="space-y-3">
                                                                            <h3 className="text-[16px] font-bold text-gray-900">Cores</h3>
                                                                            <div className="flex items-center gap-1 overflow-visible">
                                                                                {['#fca5a5', '#fb923c', '#fde047', '#4ade80', '#2dd4bf', '#38bdf8', '#3b82f6', '#4f46e5'].map(c => (
                                                                                    <button
                                                                                        key={c}
                                                                                        onClick={() => { setOverlays(overlays.map(ov => ov.id === o.id ? { ...ov, color: c } : ov)); }}
                                                                                        className={`w-7 h-7 rounded-lg hover:scale-110 flex items-center justify-center transition-all shadow-sm ${o.color === c ? 'ring-[2px] ring-blue-500/40' : ''}`}
                                                                                        style={{ backgroundColor: c }}
                                                                                    >
                                                                                        {o.color === c && <Check className="w-4 h-4 text-white drop-shadow-sm" strokeWidth={3} />}
                                                                                    </button>
                                                                                ))}
                                                                                <div className="relative">
                                                                                    <button
                                                                                        className="w-7 h-7 rounded-lg border-2 border-gray-100 flex items-center justify-center hover:bg-gray-50 text-gray-900 transition-all ml-0.5 shrink-0"
                                                                                        onClick={() => {
                                                                                            const input = document.getElementById(`custom-color-${o.id}`) as HTMLInputElement;
                                                                                            if (input) input.click();
                                                                                        }}
                                                                                    >
                                                                                        <PlusCircle className="w-5 h-5" />
                                                                                    </button>
                                                                                    <input
                                                                                        id={`custom-color-${o.id}`}
                                                                                        type="color"
                                                                                        className="absolute inset-0 opacity-0 w-0 h-0 pointer-events-none"
                                                                                        onChange={(e) => {
                                                                                            const newColor = e.target.value;
                                                                                            setOverlays(overlays.map(ov => ov.id === o.id ? { ...ov, color: newColor } : ov));
                                                                                        }}
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        <div className="space-y-3">
                                                                            <h3 className="text-[16px] font-bold text-gray-900">Opacidade</h3>
                                                                            <div className="flex items-center gap-3">
                                                                                <div className="flex-1 relative flex items-center h-8">
                                                                                    <div className="absolute inset-x-0 h-1.5 my-auto bg-gray-100 rounded-full overflow-hidden">
                                                                                        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(45deg, #000 25%, transparent 25%, transparent 50%, #000 50%, #000 75%, transparent 75%, transparent)', backgroundSize: '4px 4px' }} />
                                                                                    </div>
                                                                                    <div className="absolute inset-y-0 left-0 h-1.5 my-auto bg-blue-500 rounded-full" style={{ width: `${Math.round((o.opacity || 0.5) * 100)}%` }} />
                                                                                    <input
                                                                                        type="range"
                                                                                        min="10" max="100"
                                                                                        value={(o.opacity || 0.5) * 100}
                                                                                        onChange={(e) => {
                                                                                            const val = parseInt(e.target.value) / 100;
                                                                                            setOverlays(overlays.map(ov => ov.id === o.id ? { ...ov, opacity: val } : ov));
                                                                                        }}
                                                                                        className="absolute inset-0 w-full h-8 opacity-0 cursor-pointer z-10"
                                                                                    />
                                                                                    <div className="absolute w-5 h-5 bg-blue-500 rounded-full border-2 border-white shadow-md pointer-events-none transition-all duration-75" style={{ left: `calc(${Math.round((o.opacity || 0.5) * 100)}% - 10px)` }} />
                                                                                </div>
                                                                                <div className="bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-[13px] font-bold text-gray-800 min-w-[55px] text-center shadow-sm">
                                                                                    {Math.round((o.opacity || 0.5) * 100)}%
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* POST-IT STANDARD MENU */}
                                                        {o.type === "postit" && activeRedactionId === o.id && (
                                                            <div
                                                                className={`absolute z-[500] pointer-events-auto flex items-center`}
                                                                style={{
                                                                    left: o.x * zoom > 400 ? 'auto' : 'calc(100% + 24px)',
                                                                    right: o.x * zoom > 400 ? 'calc(100% + 24px)' : 'auto',
                                                                    top: '50%',
                                                                    transform: 'translateY(-50%)',
                                                                }}
                                                                onMouseDown={(e) => e.stopPropagation()}
                                                            >
                                                                <div
                                                                    className="bg-white rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-gray-100 py-4 w-[240px] flex flex-col animate-in fade-in zoom-in-95 duration-300"
                                                                >
                                                                    <button
                                                                        className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-all text-gray-700 font-semibold text-[15px]"
                                                                        onClick={() => {
                                                                            const id = Math.random().toString(36).substring(7);
                                                                            setOverlays([...overlays, { ...o, id, x: o.x + 10, y: o.y + 10 }]);
                                                                            setActiveRedactionId(id);
                                                                        }}
                                                                    >
                                                                        <Copy className="w-5 h-5 text-gray-400" strokeWidth={2} />
                                                                        Duplicar
                                                                    </button>

                                                                    <button
                                                                        className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-all text-gray-700 font-semibold text-[15px]"
                                                                        onClick={() => bringToFront(o.id)}
                                                                    >
                                                                        <BringToFront className="w-5 h-5 text-gray-400" strokeWidth={2} />
                                                                        Trazer para a frente
                                                                    </button>

                                                                    <button
                                                                        className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-all text-gray-700 font-semibold text-[15px]"
                                                                        onClick={() => sendToBack(o.id)}
                                                                    >
                                                                        <SendToBack className="w-5 h-5 text-gray-400" strokeWidth={2} />
                                                                        Enviar para trás
                                                                    </button>

                                                                    <button
                                                                        className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-all text-gray-700 font-semibold text-[15px]"
                                                                        onClick={() => {
                                                                            setOverlays(overlays.map(ov => ov.id === o.id ? { ...ov, rotation: ((ov.rotation || 0) + 90) % 360 } : ov));
                                                                        }}
                                                                    >
                                                                        <RotateCw className="w-5 h-5 text-gray-400" strokeWidth={2} />
                                                                        Rodar
                                                                    </button>

                                                                    <div className="h-[1px] bg-gray-50 my-2 mx-6" />

                                                                    <button
                                                                        className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-red-50 transition-all text-red-500 font-bold text-[16px]"
                                                                        onClick={() => { setOverlays(overlays.filter(ov => ov.id !== o.id)); setActiveRedactionId(null); }}
                                                                    >
                                                                        <Trash2 className="w-5 h-5 text-red-500" strokeWidth={2} />
                                                                        Eliminar
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* ERASE STANDARD MENU */}
                                                        {activeRedactionId === o.id && o.type === "erase" && (
                                                            <div
                                                                className={`absolute z-[500] pointer-events-auto flex items-center`}
                                                                style={{
                                                                    left: o.x * zoom > 400 ? 'auto' : 'calc(100% + 24px)',
                                                                    right: o.x * zoom > 400 ? 'calc(100% + 24px)' : 'auto',
                                                                    top: '50%',
                                                                    transform: 'translateY(-50%)',
                                                                }}
                                                                onMouseDown={(e) => e.stopPropagation()}
                                                            >
                                                                <div
                                                                    className="bg-white rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-gray-100 py-4 w-[240px] flex flex-col animate-in fade-in zoom-in-95 duration-300"
                                                                >
                                                                    <button
                                                                        className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-all text-gray-700 font-semibold text-[15px]"
                                                                        onClick={() => {
                                                                            const id = Math.random().toString(36).substring(7);
                                                                            setOverlays([...overlays, { ...o, id, x: o.x + 10, y: o.y + 10 }]);
                                                                            setActiveRedactionId(id);
                                                                        }}
                                                                    >
                                                                        <Copy className="w-5 h-5 text-gray-400" strokeWidth={2} />
                                                                        Duplicar
                                                                    </button>

                                                                    <button
                                                                        className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-all text-gray-700 font-semibold text-[15px]"
                                                                        onClick={() => bringToFront(o.id)}
                                                                    >
                                                                        <BringToFront className="w-5 h-5 text-gray-400" strokeWidth={2} />
                                                                        Trazer para a frente
                                                                    </button>

                                                                    <button
                                                                        className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-all text-gray-700 font-semibold text-[15px]"
                                                                        onClick={() => sendToBack(o.id)}
                                                                    >
                                                                        <SendToBack className="w-5 h-5 text-gray-400" strokeWidth={2} />
                                                                        Enviar para trás
                                                                    </button>

                                                                    <button
                                                                        className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-all text-gray-700 font-semibold text-[15px]"
                                                                        onClick={() => {
                                                                            setOverlays(overlays.map(ov => ov.id === o.id ? { ...ov, rotation: ((ov.rotation || 0) + 90) % 360 } : ov));
                                                                        }}
                                                                    >
                                                                        <RotateCw className="w-5 h-5 text-gray-400" strokeWidth={2} />
                                                                        Rodar
                                                                    </button>

                                                                    <div className="h-[1px] bg-gray-50 my-2 mx-6" />

                                                                    <button
                                                                        className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-red-50 transition-all text-red-500 font-bold text-[16px]"
                                                                        onClick={() => { setOverlays(overlays.filter(ov => ov.id !== o.id)); setActiveRedactionId(null); }}
                                                                    >
                                                                        <Trash2 className="w-5 h-5 text-red-500" strokeWidth={2} />
                                                                        Eliminar
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}

                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {/* EXECUTABLE TEXT ITEMS (When in Edit mode) */}
                                    {p.isCleansed && p.items.map((item, i) => {
                                        const isEditing = tool === "edit";
                                        const x = item.transform[4] * zoom;
                                        const y = ((p.canvas.height / 1.5) - item.transform[5]) * zoom;
                                        const fontSize = Math.abs(item.transform[3]) * zoom;
                                        return (
                                            <div
                                                key={`text-${idx}-${i}`}
                                                className={`absolute z-30 transition-all ${isEditing ? 'hover:bg-blue-100/20' : 'pointer-events-none'}`}
                                                style={{ left: x, top: y, transform: 'translateY(-100%)', minWidth: (item.width || 20) * zoom, height: fontSize }}
                                            >
                                                <div
                                                    contentEditable={isEditing}
                                                    suppressContentEditableWarning
                                                    onBlur={(e) => {
                                                        const newPages = [...pages];
                                                        newPages[idx].items[i].str = e.currentTarget.textContent || "";
                                                        setPages(newPages);
                                                    }}
                                                    style={{ fontSize, fontFamily: 'Arial, sans-serif', lineHeight: '1.2', color: item.color || '#1e293b', fontWeight: item.bold ? 'bold' : 'normal', outline: isEditing ? '1px dashed #60a5fa' : 'none' }}
                                                    className="px-0.5 whitespace-nowrap"
                                                >
                                                    {item.str}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Selection Preview */}
                                    {selection && currentPage === idx && (
                                        tool === "seta" ? (
                                            <svg className="absolute inset-0 w-full h-full pointer-events-none z-[110] overflow-visible">
                                                <defs>
                                                    <marker id="selection-arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                                        <polygon points="0 0, 10 3.5, 0 7" fill={arrowSettings.color} />
                                                    </marker>
                                                </defs>
                                                <line
                                                    x1={dragStart!.x * zoom} y1={dragStart!.y * zoom}
                                                    x2={selection.x2! * zoom} y2={selection.y2! * zoom}
                                                    stroke={arrowSettings.color}
                                                    strokeWidth={arrowSettings.thickness}
                                                    strokeDasharray="5,5"
                                                    markerEnd="url(#selection-arrow)"
                                                />
                                            </svg>
                                        ) : (
                                            <div
                                                className="absolute border-2 border-blue-500 bg-blue-500/10 pointer-events-none z-[110]"
                                                style={{ left: selection.x * zoom, top: selection.y * zoom, width: selection.w * zoom, height: selection.h * zoom }}
                                            />
                                        )
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="mt-[20vh] flex flex-col items-center gap-6 opacity-30 text-white">
                                <FileText className="w-32 h-32" />
                                <h2 className="text-2xl font-bold">Nenhum documento carregado</h2>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-8 py-3 bg-white/10 hover:bg-white/20 rounded-full border border-white/20 transition-all font-bold"
                                >
                                    Selecionar PDF
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* FLOATING TOOLS FOOTER */}
                {
                    pages.length > 0 && (
                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-2xl border border-[#E5E7EB] p-2 flex items-center gap-6 z-[100]">
                            <div className="flex items-center gap-3 px-3 border-r border-[#E5E7EB]">
                                <button onClick={() => setCurrentPage(Math.max(0, currentPage - 1))} className="p-1 hover:bg-gray-100 rounded-lg">
                                    <ChevronUp className="w-5 h-5 text-gray-500" />
                                </button>
                                <span className="text-sm font-bold min-w-[40px] text-center">{currentPage + 1} / {pages.length}</span>
                                <button onClick={() => setCurrentPage(Math.min(pages.length - 1, currentPage + 1))} className="p-1 hover:bg-gray-100 rounded-lg">
                                    <ChevronDown className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>

                            <div className="flex items-center gap-4 px-3 border-r border-[#E5E7EB]">
                                <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="p-1 hover:bg-gray-100 rounded-lg">
                                    <ZoomOut className="w-5 h-5 text-gray-500" />
                                </button>
                                <div className="relative group">
                                    <input
                                        type="text"
                                        value={`${Math.round(zoom * 100)}%`}
                                        onChange={(e) => setZoom(parseFloat(e.target.value.replace('%', '')) / 100)}
                                        className="w-16 text-center text-sm font-bold bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg py-1 focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="p-1 hover:bg-gray-100 rounded-lg">
                                    <ZoomIn className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>

                            <button
                                onClick={() => setZoom(1.19)}
                                className="bg-white border border-[#E5E7EB] hover:bg-[#F9FAFB] px-4 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-sm"
                            >
                                <Maximize className="w-4 h-4 text-blue-500" />
                                Fit
                            </button>
                        </div>
                    )
                }



                {/* RIGHT SIDEBAR (REDIGIR) */}
                {
                    redactionSidebarOpen && (
                        <div className="w-[300px] bg-white border-l border-[#E5E7EB] h-full flex flex-col animate-in slide-in-from-right duration-300 z-[200]">
                            <div className="p-5 border-b border-[#E5E7EB] flex items-center justify-between bg-gray-50/30">
                                <div className="flex items-center gap-3">
                                    <button onClick={() => { setRedactionSidebarOpen(false); setTool("select"); }} className="p-1 hover:bg-gray-100 rounded-lg">
                                        <ChevronLeft className="w-5 h-5 text-gray-500" />
                                    </button>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-lg font-bold text-gray-900">Redigir</h3>
                                        <Info className="w-4 h-4 text-gray-400 cursor-help" />
                                    </div>
                                </div>
                                <button onClick={() => { setRedactionSidebarOpen(false); setTool("select"); }} className="p-1 hover:bg-gray-100 rounded-lg">
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto">
                                <div className="p-4 bg-white sticky top-0 z-10 border-b border-gray-50">
                                    <span className="text-sm font-bold text-gray-900">
                                        Assinalado para redação ({overlays.filter(o => (o.type === 'redigir' || o.isRedaction) && !o.applied).length})
                                    </span>
                                </div>

                                {overlays.filter(o => (o.type === 'redigir' || o.isRedaction) && !o.applied).length === 0 ? (
                                    <div className="flex flex-col items-center justify-center p-12 text-center h-[60%]">
                                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                                            <ShieldAlert className="w-10 h-10 text-gray-300" />
                                        </div>
                                        <p className="text-sm text-gray-400 font-medium leading-relaxed max-w-[200px]">
                                            Assinale o texto e as áreas que quer remover permanentemente do seu PDF.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="p-4 space-y-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Página {currentPage + 1}</span>
                                            <ChevronUp className="w-4 h-4 text-gray-400" />
                                        </div>
                                        {overlays.filter(o => (o.type === 'redigir' || o.isRedaction) && !o.applied).map((o, idx) => {
                                            const extractedText = getRedactionText(o);
                                            return (
                                                <div key={idx} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:border-red-200 transition-all group relative">
                                                    <div className="flex items-center gap-4">
                                                        <div className="p-2 bg-gray-50 rounded-lg text-gray-400 group-hover:bg-red-50 group-hover:text-red-500 transition-colors">
                                                            <Menu className="w-5 h-5" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-bold text-gray-900 truncate uppercase tracking-tight">{extractedText}</p>
                                                            <p className="text-[11px] text-gray-400 font-medium">
                                                                {new Date().toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' })}, {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                            </p>
                                                        </div>
                                                        <button
                                                            onClick={() => setOverlays(overlays.filter(ov => ov.id !== o.id))}
                                                            className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                                                        >
                                                            <X className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className="p-6 bg-white border-t border-gray-100 mt-auto grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setOverlays(overlays.filter(o => (!o.isRedaction && o.type !== 'redigir') || o.applied))}
                                    className="px-4 py-3 text-sm font-black text-gray-500 hover:text-gray-900 transition-colors"
                                >
                                    Limpar tudo
                                </button>
                                <button
                                    onClick={() => setShowRedactionApplyModal(true)}
                                    disabled={overlays.filter(o => (o.type === 'redigir' || o.isRedaction) && !o.applied).length === 0}
                                    className="bg-[#248AF6] disabled:bg-gray-200 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-black text-sm shadow-xl shadow-blue-500/10 hover:bg-[#1C6DD0] transition-all flex items-center justify-center"
                                >
                                    Aplicar redação
                                </button>
                            </div>
                        </div>
                    )
                }
                {/* RIGHT SIDEBAR (MAIS FERRAMENTAS) */}
                {
                    showMoreTools && (
                        <div className="w-[300px] bg-white border-l border-[#E5E7EB] h-full flex flex-col animate-in slide-in-from-right duration-300 z-[200]">
                            <div className="p-6 border-b border-[#E5E7EB] flex items-center justify-between">
                                <h3 className="text-[16px] font-black uppercase text-gray-400 tracking-widest">Mais ferramentas</h3>
                                <button onClick={() => setShowMoreTools(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-4 grid gap-3 overflow-y-auto">
                                {[
                                    { label: 'Proteger PDF', icon: Lock, desc: 'Adicionar senha' },
                                    { label: 'Marca de Água', icon: ShieldCheck, desc: 'Texto ou imagem' },
                                    { label: 'Paginação', icon: FileStack, desc: 'Números de página' },
                                    { label: 'Mesa de Luz', icon: Layers, desc: 'Reordenar slides' }
                                ].map((item, i) => (
                                    <div key={i} className="p-4 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all cursor-pointer group">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-bold text-sm text-gray-800">{item.label}</span>
                                            <item.icon className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-colors" />
                                        </div>
                                        <span className="text-[11px] text-gray-400 italic font-medium">{item.desc}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                }
            </main>


            {/* APPLY REDACTION MODAL */}
            {
                showRedactionApplyModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center animate-in fade-in duration-300">
                        <div className="bg-white rounded-[32px] w-[500px] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-300">
                            <div className="p-8">
                                <div className="flex items-center justify-between mb-8">
                                    <h2 className="text-2xl font-black text-gray-900">Aplicar redação</h2>
                                    <button onClick={() => setShowRedactionApplyModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                        <X className="w-6 h-6 text-gray-400" />
                                    </button>
                                </div>

                                <p className="text-lg text-gray-600 font-medium leading-relaxed mb-10">
                                    Esta ação removerá permanentemente todos os itens selecionados para redação. Não pode ser revertida.
                                </p>

                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setShowRedactionApplyModal(false)}
                                        className="flex-1 px-8 py-4 rounded-2xl bg-gray-100 text-gray-700 font-bold text-lg hover:bg-gray-200 transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={() => {
                                            setOverlays(overlays.map(o => (o.isRedaction || o.type === 'redigir') ? { ...o, applied: true } : o));
                                            setShowRedactionApplyModal(false);
                                            toast.success("Redação aplicada com sucesso!");
                                        }}
                                        className="flex-1 px-8 py-4 rounded-2xl bg-[#248AF6] text-white font-bold text-lg shadow-xl shadow-blue-500/20 hover:bg-[#1C6DD0] transition-all"
                                    >
                                        Aplicar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* CONTEXT MENU */}
            {
                contextMenu?.visible && (
                    <div
                        className="context-menu-panel fixed z-[1000] bg-white rounded-2xl shadow-[0_15px_50px_rgba(0,0,0,0.15)] border border-gray-100 p-1.5 w-64 animate-in fade-in zoom-in-95 duration-200 overflow-y-auto max-h-[80vh] custom-scrollbar"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            left: Math.min(contextMenu.x + 20, window.innerWidth - 280),
                            top: Math.min(contextMenu.y + 10, window.innerHeight - 320)
                        }}
                    >
                        {["check", "cross", "rect", "circle", "line", "arrow", "curve", "pentagon", "cloud", "star", "stamp"].includes(overlays.find(o => o.id === contextMenu.id)?.type || "") ? (
                            <div className="flex flex-col gap-0.5">
                                <button
                                    onClick={() => {
                                        setOverlays(overlays.map(o => o.id === contextMenu.id ? { ...o, opacity: ((o.opacity || 1) - 0.25 <= 0 ? 1 : (o.opacity || 1) - 0.25) } : o));
                                    }}
                                    className="w-full text-left px-3.5 py-2.5 text-[14px] text-gray-900 hover:bg-gray-50 flex items-center gap-3 rounded-xl transition-colors font-medium group"
                                >
                                    <Blend className="w-[18px] h-[18px] text-gray-800" strokeWidth={2} />
                                    Opacidade
                                </button>

                                <button
                                    onClick={() => {
                                        if (contextMenu.id) {
                                            setShowLinkModal(contextMenu.id);
                                            setContextMenu(null);
                                        }
                                    }}
                                    className="w-full text-left px-3.5 py-2.5 text-[14px] text-gray-900 hover:bg-gray-50 flex items-center gap-3 rounded-xl transition-colors font-medium group"
                                >
                                    <div className="relative flex items-center justify-center">
                                        <Link2 className="w-[18px] h-[18px] text-gray-800" strokeWidth={2} />
                                        <Plus className="w-2.5 h-2.5 absolute -bottom-1 -right-1 text-gray-800" strokeWidth={3} />
                                    </div>
                                    Adicionar o link
                                </button>

                                <button
                                    onClick={() => { bringToFront(contextMenu.id!); setContextMenu(null); }}
                                    className="w-full text-left px-3.5 py-2.5 text-[14px] text-gray-900 hover:bg-gray-50 flex items-center gap-3 rounded-xl transition-colors font-medium group"
                                >
                                    <BringToFront className="w-[18px] h-[18px] text-gray-800" strokeWidth={2.5} />
                                    Trazer para a frente
                                </button>

                                <button
                                    onClick={() => { sendToBack(contextMenu.id!); setContextMenu(null); }}
                                    className="w-full text-left px-3.5 py-2.5 text-[14px] text-gray-900 hover:bg-gray-50 flex items-center gap-3 rounded-xl transition-colors font-medium group"
                                >
                                    <SendToBack className="w-[18px] h-[18px] text-gray-800" strokeWidth={2.5} />
                                    Enviar para trás
                                </button>

                                <button
                                    onClick={() => {
                                        setOverlays(overlays.map(o => o.id === contextMenu.id ? { ...o, rotation: ((o.rotation || 0) + 90) % 360 } : o));
                                    }}
                                    className="w-full text-left px-3.5 py-2.5 text-[14px] text-gray-900 hover:bg-gray-50 flex items-center gap-3 rounded-xl transition-colors font-medium group"
                                >
                                    <RotateCw className="w-[18px] h-[18px] text-gray-800" strokeWidth={2} />
                                    Rodar
                                </button>

                                <div className="h-[1px] bg-gray-100 my-1 mx-2" />

                                <button
                                    onClick={() => {
                                        setOverlays(overlays.filter(o => o.id !== contextMenu.id));
                                        setContextMenu(null);
                                    }}
                                    className="w-full text-left px-3.5 py-2.5 text-[14px] text-[#ef4444] hover:bg-red-50 flex items-center gap-3 rounded-xl transition-colors font-medium group"
                                >
                                    <Trash2 className="w-[18px] h-[18px] text-[#ef4444]" strokeWidth={2} />
                                    Eliminar
                                </button>
                            </div>
                        ) : ["seta", "draw", "postit"].includes(overlays.find(o => o.id === contextMenu.id)?.type || "") ? (
                            <div className="flex flex-col gap-0.5">
                                <div className="px-3 py-2.5 border-b border-gray-50 mb-0.5 flex flex-col gap-2">
                                    <div className="flex items-center gap-2 text-gray-400">
                                        <Palette className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">Cor</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                                        {["#1a1a1a", "#da2d26", "#f59e0b", "#41ae07", "#248af6", "#818cf8", "#ff00ff", "#2dd4bf"].map(c => (
                                            <button
                                                key={c}
                                                onClick={() => {
                                                    const newOverlays = [...overlays];
                                                    const idx = newOverlays.findIndex(o => o.id === contextMenu.id);
                                                    if (idx !== -1) {
                                                        newOverlays[idx].color = c;
                                                        if (newOverlays[idx].type === 'postit') newOverlays[idx].bgColor = c;
                                                    }
                                                    setOverlays(newOverlays);
                                                    setContextMenu(null);
                                                }}
                                                className="w-6 h-6 rounded-full border border-gray-100 hover:scale-110 transition-transform active:scale-95"
                                                style={{ backgroundColor: c }}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        if (contextMenu.id) {
                                            setShowLinkModal(contextMenu.id);
                                            setContextMenu(null);
                                        }
                                    }}
                                    className="w-full text-left px-3.5 py-2.5 text-[13px] text-gray-700 hover:bg-gray-50 flex items-center gap-3 rounded-xl transition-colors font-medium group"
                                >
                                    <Link2 className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                                    Adicionar o link
                                </button>

                                <button
                                    onClick={() => { bringToFront(contextMenu.id!); setContextMenu(null); }}
                                    className="w-full text-left px-3.5 py-2.5 text-[13px] text-gray-700 hover:bg-gray-50 flex items-center gap-3 rounded-xl transition-colors font-medium group"
                                >
                                    <BringToFront className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                                    Trazer para a frente
                                </button>

                                <button
                                    onClick={() => { sendToBack(contextMenu.id!); setContextMenu(null); }}
                                    className="w-full text-left px-3.5 py-2.5 text-[13px] text-gray-700 hover:bg-gray-50 flex items-center gap-3 rounded-xl transition-colors font-medium group"
                                >
                                    <SendToBack className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                                    Enviar para trás
                                </button>

                                <button
                                    onClick={() => {
                                        setOverlays(overlays.map(o => o.id === contextMenu.id ? { ...o, rotation: ((o.rotation || 0) + 90) % 360 } : o));
                                    }}
                                    className="w-full text-left px-3.5 py-2.5 text-[13px] text-gray-700 hover:bg-gray-50 flex items-center gap-3 rounded-xl transition-colors font-medium group"
                                >
                                    <RotateCw className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                                    Rodar
                                </button>

                                <div className="h-[1px] bg-gray-50 my-1 mx-2" />

                                <button
                                    onClick={() => {
                                        setOverlays(overlays.filter(o => o.id !== contextMenu.id));
                                        setContextMenu(null);
                                    }}
                                    className="w-full text-left px-3.5 py-2.5 text-[13px] text-red-500 hover:bg-red-50 flex items-center gap-3 rounded-xl transition-colors font-bold group"
                                >
                                    <Trash2 className="w-4 h-4 text-red-400 group-hover:text-red-600" />
                                    Eliminar
                                </button>
                            </div>
                        ) : contextMenu.id === "page" && tool === "seta" ? (
                            <div className="flex flex-col gap-0.5">
                                <div className="px-3 py-2 border-b border-gray-50 mb-0.5">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Configuração da Seta</span>
                                </div>

                                <div className="p-3 flex flex-col gap-4">
                                    <div className="space-y-2">
                                        <span className="text-[11px] font-bold text-gray-500">COR ATIVA</span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {["#1a1a1a", "#da2d26", "#f59e0b", "#41ae07", "#248af6", "#818cf8"].map(c => (
                                                <button
                                                    key={c}
                                                    onClick={() => { setArrowSettings({ ...arrowSettings, color: c }); setContextMenu(null); }}
                                                    className={`w-6 h-6 rounded-full border ${arrowSettings.color === c ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`}
                                                    style={{ backgroundColor: c }}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <span className="text-[11px] font-bold text-gray-500">ESPESSURA ({arrowSettings.thickness}px)</span>
                                        <input
                                            type="range" min="1" max="15"
                                            value={arrowSettings.thickness}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value);
                                                setArrowSettings({ ...arrowSettings, thickness: val });
                                                if (activeRedactionId) {
                                                    const newOverlays = [...overlays];
                                                    const idx = newOverlays.findIndex(o => o.id === activeRedactionId);
                                                    if (idx !== -1) newOverlays[idx].thickness = val;
                                                    setOverlays(newOverlays);
                                                }
                                            }}
                                            className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                        />
                                    </div>
                                </div>

                                <div className="h-[1px] bg-gray-50 my-1" />

                                <button
                                    onClick={() => { setOverlays(overlays.filter(o => o.page !== currentPage)); setContextMenu(null); }}
                                    className="w-full text-left px-3.5 py-2.5 text-[13px] text-red-500 hover:bg-red-50 flex items-center gap-3 rounded-xl transition-colors font-bold group"
                                >
                                    <Trash2 className="w-4 h-4 text-red-400 group-hover:text-red-600" />
                                    Limpar Página
                                </button>
                            </div>
                        ) : contextMenu.id !== "page" ? (
                            <div className="flex flex-col gap-0.5">
                                <div className="px-3 py-2.5 border-b border-gray-50 mb-0.5 flex flex-col gap-2">
                                    <div className="flex items-center gap-2 text-gray-400">
                                        <Palette className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">Cor</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                                        {["#1a1a1a", "#da2d26", "#f59e0b", "#41ae07", "#248af6", "#818cf8", "#ffffff", "#000000"].map(c => (
                                            <button
                                                key={c}
                                                onClick={() => {
                                                    const newOverlays = [...overlays];
                                                    const idx = newOverlays.findIndex(o => o.id === contextMenu.id);
                                                    if (idx !== -1) newOverlays[idx].color = c;
                                                    setOverlays(newOverlays);
                                                    setContextMenu(null);
                                                }}
                                                className="w-6 h-6 rounded-full border border-gray-100 hover:scale-110 transition-transform active:scale-95 shadow-sm"
                                                style={{ backgroundColor: c }}
                                                title={c}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        setOverlays(overlays.map(o => o.id === contextMenu.id ? { ...o, rotation: ((o.rotation || 0) + 90) % 360 } : o));
                                    }}
                                    className="w-full text-left px-3.5 py-2.5 text-[13px] text-gray-700 hover:bg-gray-50 flex items-center gap-3 rounded-xl transition-colors font-medium group"
                                >
                                    <RotateCw className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                                    Rodar
                                </button>
                                <div className="h-[1px] bg-gray-50 my-1 mx-2" />
                                <button
                                    onClick={() => {
                                        setOverlays(overlays.filter(o => o.id !== contextMenu.id));
                                        setContextMenu(null);
                                    }}
                                    className="w-full text-left px-3.5 py-2.5 text-[13px] text-red-500 hover:bg-red-50 flex items-center gap-3 rounded-xl transition-colors font-bold group"
                                >
                                    <Trash2 className="w-4 h-4 text-red-400 group-hover:text-red-600" />
                                    Eliminar
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => {
                                    setOverlays(overlays.filter(o => o.page !== currentPage));
                                    setContextMenu(null);
                                }}
                                className="w-full text-left px-4 py-3 text-[14px] text-red-500 hover:bg-red-50 flex items-center gap-4 rounded-xl transition-all font-semibold"
                            >
                                <Trash2 className="w-5 h-5 text-red-400" />
                                Limpar Página
                            </button>
                        )}
                    </div>
                )
            }

            {/* EXIT MODAL */}
            {
                showFinishModal && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="bg-white rounded-[24px] w-[540px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="p-8 border-b border-[#F3F4F6] flex items-center justify-between">
                                <div>
                                    <h4 className="text-2xl font-black text-[#212B36]">Ótimo trabalho!</h4>
                                    <p className="text-sm font-medium text-gray-400 mt-1">Seu arquivo está pronto para exportação.</p>
                                </div>
                                <button onClick={() => setShowFinishModal(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200 text-gray-400">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="p-8">
                                <p className="text-sm font-bold text-gray-500 mb-6 uppercase tracking-wider">Formato de saída</p>
                                <div className="grid grid-cols-2 gap-4">
                                    {[
                                        { id: 'pdf', label: 'Documento PDF', ext: '.pdf', color: 'bg-red-500' },
                                        { id: 'png', label: 'Imagem PNG', ext: '.png', color: 'bg-gray-700' },
                                        { id: 'docx', label: 'Microsoft Word', ext: '.docx', color: 'bg-blue-500' },
                                        { id: 'xlsx', label: 'Microsoft Excel', ext: '.xlsx', color: 'bg-emerald-600' }
                                    ].map(format => (
                                        <button
                                            key={format.id}
                                            onClick={() => setExportFormat(format.id)}
                                            className={`flex items-center justify-between p-5 border-2 rounded-2xl transition-all ${exportFormat === format.id ? 'border-blue-500 bg-blue-50/50' : 'border-gray-50 hover:bg-gray-50 hover:border-gray-200'}`}
                                        >
                                            <div className="flex flex-col items-start gap-1">
                                                <span className="font-black text-[13px] text-gray-800">{format.label}</span>
                                                <span className="text-[11px] text-gray-400 font-bold">{format.ext}</span>
                                            </div>
                                            <div className={`w-10 h-10 ${format.color} rounded-xl shadow-lg flex items-center justify-center text-white font-black text-[11px]`}>
                                                {format.id.toUpperCase().substring(0, 3)}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="p-8 bg-[#F9FAFB] flex items-center justify-between">
                                <button onClick={() => setShowFinishModal(false)} className="px-6 py-3 font-bold text-gray-500 hover:text-gray-800">Voltar ao editor</button>
                                <button
                                    onClick={() => handleSave(exportFormat)}
                                    className="bg-[#248AF6] text-white px-10 py-4 rounded-2xl font-black text-sm shadow-xl shadow-blue-500/30 hover:bg-[#1C6DD0] hover:scale-[1.02] transition-all flex items-center gap-3"
                                >
                                    <Download className="w-5 h-5" />
                                    DESCARREGAR AGORA
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* LOADING OVERLAY */}
            {
                isLoading && (
                    <div className="fixed inset-0 z-[2000] bg-white/80 backdrop-blur-xl flex flex-col items-center justify-center gap-6 animate-in fade-in">
                        <div className="relative">
                            <div className="w-20 h-20 border-4 border-gray-100 rounded-full" />
                            <div className="w-20 h-20 border-4 border-blue-500 border-t-transparent rounded-full animate-spin absolute inset-0" />
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <span className="text-lg font-black text-[#212B36] uppercase tracking-tighter">Processando...</span>
                            <span className="text-sm font-medium text-gray-400">Preparando seus arquivos com perfeição.</span>
                        </div>
                    </div>
                )
            }

            {/* LINK MODAL */}
            {
                showLinkModal && (
                    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onMouseDown={e => e.stopPropagation()}>
                        <div className="bg-white rounded-2xl w-[400px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative pointer-events-auto">
                            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                                <h4 className="text-lg font-bold text-gray-900">Hiperlink</h4>
                                <button onClick={() => setShowLinkModal(null)} className="p-1 hover:bg-gray-200 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6">
                                <div className="flex border-b border-gray-200 relative mb-6">
                                    <button className="flex-1 pb-3 text-sm font-bold text-red-500 border-b-2 border-red-500 text-center relative z-10 transition-colors">URL</button>
                                    <button className="flex-1 pb-3 text-sm font-bold text-gray-400 hover:text-gray-600 border-b-2 border-transparent hover:border-gray-300 text-center relative z-10 transition-colors cursor-not-allowed">Página</button>
                                </div>

                                <div className="space-y-2 mb-8">
                                    <label className="text-xs font-bold text-gray-900 block" htmlFor="link-url">Adicione o URL do website aqui</label>
                                    <input
                                        id="link-url"
                                        type="text"
                                        placeholder="Adicione o seu URL aqui"
                                        className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder-gray-400"
                                        defaultValue={overlays.find(o => o.id === showLinkModal)?.link || "https://"}
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                const val = e.currentTarget.value;
                                                setOverlays(overlays.map(ov => ov.id === showLinkModal ? { ...ov, link: val } : ov));
                                                setShowLinkModal(null);
                                            }
                                        }}
                                    />
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-2">
                                    <button onClick={() => setShowLinkModal(null)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors bg-gray-50">Cancelar</button>
                                    <button
                                        onClick={() => {
                                            const input = document.getElementById("link-url") as HTMLInputElement;
                                            if (input) {
                                                setOverlays(overlays.map(ov => ov.id === showLinkModal ? { ...ov, link: input.value } : ov));
                                            }
                                            setShowLinkModal(null);
                                        }}
                                        className="bg-[#248AF6] hover:bg-[#1C6DD0] text-white px-8 py-2.5 rounded-xl text-sm font-bold transition-transform hover:scale-[1.02]"
                                    >Aplicar</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    );
};

export default PDFEditor;