// Line template ("{Fecha} {Nombre}") -> render spec for host.jsx.
// Offsets are UTF-16 indexes; Illustrator's characters[] uses the same units (checked with emoji).

var LINE_BREAK = String.fromCharCode(3);  // Illustrator forced line break: keeps a multi-line cell inside its row's paragraph

// vars: [{ name, column, alias }]. Returns { segments } or { error } (user-facing, translated by t()).
function parseTemplate(tpl, vars) {
    var lookup = {}, segs = [], i = 0;
    vars.forEach(function (v) {
        lookup[v.name.toLowerCase()] = v;
        if (v.alias) lookup[v.alias.toLowerCase()] = v;
    });
    if (!tpl || !tpl.trim()) return { error: t("Escribí una plantilla, por ejemplo {%1}.", vars[0] ? vars[0].alias || vars[0].name : "Columna") };
    while (i < tpl.length) {
        var open = tpl.indexOf("{", i), close = tpl.indexOf("}", i);
        if (close !== -1 && (open === -1 || close < open)) return { error: t("Hay una llave } sin abrir en la plantilla.") };
        if (open === -1) { segs.push({ text: tpl.slice(i) }); break; }
        if (open > i) segs.push({ text: tpl.slice(i, open) });
        var nextOpen = tpl.indexOf("{", open + 1);
        if (close === -1 || (nextOpen !== -1 && nextOpen < close)) return { error: t("Falta cerrar una llave { en la plantilla.") };
        var name = tpl.slice(open + 1, close).trim(), v = lookup[name.toLowerCase()];
        if (!name) return { error: t("Hay unas llaves vacías {} en la plantilla.") };
        if (!v) return { error: t("La variable {%1} no existe en la hoja.", name) };
        segs.push({ variable: v });
        i = close + 1;
    }
    if (!segs.some(function (s) { return s.variable; })) return { error: t("La plantilla no usa ninguna variable. Agregá una, por ejemplo {%1}.", vars[0] ? vars[0].alias || vars[0].name : "Columna") };
    return { segments: segs };
}

// rows: CSV rows (rows[0] = header). from/to: sheet row numbers (2 = first data row); to null = all.
// formatOf(variable) -> host format object. Returns { contents, runs: [[start, length, formatIndex]], formats, probe, rows, warnings }.
// probe = offset of the first fixed-text character (incl. paragraph separators), used next time to read the box's base format.
function buildSpec(rows, segs, formatOf, from, to) {
    var last = rows.length, warnings = [];
    from = Math.max(2, from || 2);
    var end = to ? Math.min(to, last) : last;
    if (last < 2) warnings.push(t("La hoja no tiene filas de datos: la caja queda vacía."));
    else if (from > last) warnings.push(t("El rango empieza en la fila %1, pero la hoja tiene datos solo hasta la fila %2.", from, last));
    else if (to && to > last) warnings.push(t("La hoja tiene datos hasta la fila %1: se muestran las filas %2 a %3.", last, from, last));

    var lines = [], runs = [], formats = [], fmtIndex = {}, offset = 0, probe = -1;
    for (var r = from; r <= end; r++) {
        var row = rows[r - 1];
        if (isBlankRow(row)) continue;  // blank rows are skipped silently
        if (lines.length) { if (probe < 0) probe = offset; offset += 1; }  // "\r" between rows
        var line = "";
        segs.forEach(function (s) {
            if (s.text !== undefined) {
                if (probe < 0 && s.text) probe = offset + line.length;
                line += s.text;
                return;
            }
            var val = (row[s.variable.column] || "").replace(/\r\n|\r|\n/g, LINE_BREAK);
            if (val) {
                var k = s.variable.name;
                if (!(k in fmtIndex)) { fmtIndex[k] = formats.length; formats.push(formatOf(s.variable)); }
                runs.push([offset + line.length, val.length, fmtIndex[k]]);
            }
            line += val;
        });
        lines.push(line);
        offset += line.length;
    }
    return { contents: lines.join("\r"), runs: runs, formats: formats, probe: probe, rows: lines.length, warnings: warnings };
}

// Panel variable format -> what host.jsx applies. null = leave as the box's base format.
function hostFormat(fmt) {
    fmt = fmt || {};
    if (fmt.mode === "style") return { style: fmt.charStyle || null };
    var c = fmt.color ? parseInt(fmt.color.slice(1), 16) : null;
    return {
        font: fmt.font || null,
        size: fmt.size == null ? null : fmt.size,
        color: c === null ? null : [(c >> 16) & 255, (c >> 8) & 255, c & 255],
        tracking: fmt.tracking == null ? null : fmt.tracking,
        baseline: fmt.baseline == null ? null : fmt.baseline
    };
}

if (typeof module !== "undefined") module.exports = { parseTemplate: parseTemplate, buildSpec: buildSpec, hostFormat: hostFormat, LINE_BREAK: LINE_BREAK };
