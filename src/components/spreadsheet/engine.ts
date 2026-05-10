import { CellData, SheetData, defaultCell, cellKey, colLabel } from "./types";

export const evaluateFormula = (formula: string, cells: Record<string, CellData>): string => {
    if (!formula.startsWith("=")) return formula;
    try {
        const expr = formula.slice(1).toUpperCase();

        // SUM(A1:B5)
        const rangeFunc = (name: string, fn: (vals: number[]) => number) => {
            const re = new RegExp(`^${name}\\(([A-Z]+)(\\d+):([A-Z]+)(\\d+)\\)$`);
            const m = expr.match(re);
            if (m) {
                const c1 = m[1].charCodeAt(0) - 65;
                const r1 = parseInt(m[2]) - 1;
                const c2 = m[3].charCodeAt(0) - 65;
                const r2 = parseInt(m[4]) - 1;
                const vals: number[] = [];
                for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++)
                    for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++) {
                        const v = parseFloat(cells[cellKey(r, c)]?.value || "0");
                        if (!isNaN(v)) vals.push(v);
                    }
                return String(fn(vals));
            }
            return null;
        };

        const sum = rangeFunc("SUM", v => v.reduce((a, b) => a + b, 0));
        if (sum !== null) return sum;

        const avg = rangeFunc("AVERAGE", v => v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0);
        if (avg !== null) return avg;

        const cnt = rangeFunc("COUNT", v => v.length);
        if (cnt !== null) return cnt;

        const mx = rangeFunc("MAX", v => v.length ? Math.max(...v) : 0);
        if (mx !== null) return mx;

        const mn = rangeFunc("MIN", v => v.length ? Math.min(...v) : 0);
        if (mn !== null) return mn;

        // Cell ref substitution
        const substituted = expr.replace(/([A-Z]+)(\d+)/g, (_, col, row) => {
            const colIdx = col.split('').reduce((acc: number, char: string) => acc * 26 + char.charCodeAt(0) - 64, 0) - 1;
            const r = parseInt(row) - 1;
            const val = cells[cellKey(r, colIdx)]?.value || "0";
            return isNaN(Number(val)) ? "0" : val;
        });

        // eslint-disable-next-line no-new-func
        return String(new Function(`return ${substituted}`)());
    } catch {
        return "#ERR";
    }
};

export const formatValue = (value: string, cell: CellData): string => {
    const format = cell.numberFormat || "General";
    const decimals = cell.decimals ?? 2;
    if (!value || format === "General" || format === "Text") return value;
    const num = parseFloat(value);
    if (isNaN(num)) return value;

    const options = { minimumFractionDigits: decimals, maximumFractionDigits: decimals };

    if (format === "Number") return num.toLocaleString("pt-BR", options);
    if (format === "Currency") return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL", ...options });
    if (format === "Percent") return (num / 100).toLocaleString("pt-BR", { style: "percent", ...options });
    if (format === "Integer") return Math.round(num).toLocaleString("pt-BR");
    if (format === "Date") {
        try { return new Date(num * 86400000).toLocaleDateString("pt-BR"); } catch { return value; }
    }
    return value;
};

export const createNewSheet = (name: string): SheetData => ({
    id: Math.random().toString(36).slice(2),
    name,
    cells: {},
    colWidths: {},
    rowHeights: {},
    frozenRows: 0,
    frozenCols: 0,
});

export const getSelectionStats = (cells: Record<string, CellData>, startRow: number, startCol: number, endRow: number, endCol: number) => {
    const vals: number[] = [];
    for (let r = Math.min(startRow, endRow); r <= Math.max(startRow, endRow); r++)
        for (let c = Math.min(startCol, endCol); c <= Math.max(startCol, endCol); c++) {
            const v = parseFloat(cells[cellKey(r, c)]?.value || "");
            if (!isNaN(v)) vals.push(v);
        }
    const sum = vals.reduce((a, b) => a + b, 0);
    const avg = vals.length ? sum / vals.length : 0;
    return { sum, avg, count: vals.length };
};
