// RFC 4180 CSV parser: quoted fields, commas/newlines/quotes inside quotes, BOM, \r\n or \n.
// Returns an array of rows (arrays of strings). No trailing empty row for a final newline.
function parseCsv(text) {
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    var rows = [], row = [], field = "", i = 0, n = text.length, inQuotes = false;
    while (i < n) {
        var c = text[i];
        if (inQuotes) {
            if (c === '"') {
                if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
                inQuotes = false; i++; continue;
            }
            field += c; i++; continue;
        }
        if (c === '"') { inQuotes = true; i++; continue; }
        if (c === ",") { row.push(field); field = ""; i++; continue; }
        if (c === "\r" || c === "\n") {
            row.push(field); rows.push(row); row = []; field = "";
            i += (c === "\r" && text[i + 1] === "\n") ? 2 : 1;
            continue;
        }
        field += c; i++;
    }
    if (field !== "" || row.length) { row.push(field); rows.push(row); }
    return rows;
}

// Drops columns that are blank in every row (header included) and blank rows at the end.
// Blank rows in the middle stay, so row numbers keep matching the sheet's.
function cleanRows(rows) {
    if (!rows.length) return rows;
    var blank = function (s) { return !(s || "").trim(); };
    var keep = rows[0].map(function (h, c) { return !blank(h) || rows.some(function (r) { return !blank(r[c]); }); });
    var out = rows.map(function (r) { return rows[0].map(function (_, c) { return r[c] || ""; }).filter(function (_, c) { return keep[c]; }); });
    while (out.length > 1 && out[out.length - 1].every(blank)) out.pop();
    return out;
}

function isBlankRow(r) { return r.every(function (s) { return !(s || "").trim(); }); }

// Header row -> unique, non-empty variable names ("Columna 3", "Nombre 2").
function headersToVariables(header) {
    var seen = {};
    return header.map(function (h, idx) {
        var base = h.trim() || ("Columna " + (idx + 1)), name = base, k = 2;
        while (seen[name]) name = base + " " + k++;
        seen[name] = true;
        return { name: name, column: idx };
    });
}

if (typeof module !== "undefined") module.exports = { parseCsv: parseCsv, cleanRows: cleanRows, isBlankRow: isBlankRow, headersToVariables: headersToVariables };
