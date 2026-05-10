export interface CellData {
    value: string;
    formula: string;
    bold: boolean;
    italic: boolean;
    underline: boolean;
    strike: boolean;
    fontSize: number;
    fontFamily: string;
    color: string;
    bgColor: string;
    align: "left" | "center" | "right";
    valign: "top" | "middle" | "bottom";
    numberFormat: string;
    wrapText: boolean;
    merged?: boolean;
    mergeRef?: string;
    borders?: {
        top?: boolean;
        bottom?: boolean;
        left?: boolean;
        right?: boolean;
    };
    decimals?: number;
}

export interface SheetData {
    id: string;
    name: string;
    cells: Record<string, CellData>;
    colWidths: Record<number, number>;
    rowHeights: Record<number, number>;
    frozenRows: number;
    frozenCols: number;
}

export interface SelectionRange {
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
}

export const defaultCell = (): CellData => ({
    value: "",
    formula: "",
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    fontSize: 10,
    fontFamily: "Carlito",
    color: "#000000",
    bgColor: "",
    align: "left",
    valign: "bottom",
    numberFormat: "General",
    wrapText: false,
});

export const colLabel = (i: number): string => {
    let result = "";
    let n = i;
    do {
        result = String.fromCharCode(65 + (n % 26)) + result;
        n = Math.floor(n / 26) - 1;
    } while (n >= 0);
    return result;
};

export const cellKey = (row: number, col: number) => `${colLabel(col)}${row + 1}`;

export const FONTS = ["Carlito", "Arial", "Times New Roman", "Courier New", "Georgia", "Verdana", "Tahoma", "Calibri", "Helvetica"];
export const FONT_SIZES = [6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72];
export const NUM_ROWS = 100;
export const NUM_COLS = 26;
export const DEFAULT_COL_WIDTH = 80;
export const DEFAULT_ROW_HEIGHT = 22;
