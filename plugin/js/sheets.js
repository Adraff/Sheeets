// Google Sheets data provider: link -> {id, gid, published} -> CSV rows.
// Any future provider (OAuth, local CSV) only needs the same fetchRows(source, done) shape.

function parseSheetUrl(input) {
    var s = (input || "").trim(), m, gid = (s.match(/[#?&]gid=(\d+)/) || [])[1] || "0";
    if ((m = s.match(/\/spreadsheets\/d\/e\/([\w-]+)/))) return { id: m[1], gid: gid, published: true };
    if ((m = s.match(/\/spreadsheets\/d\/([\w-]+)/))) return { id: m[1], gid: gid, published: false };
    if (/^[\w-]{20,}$/.test(s)) return { id: s, gid: gid, published: false };
    return null;
}

function csvUrl(src) {
    // /export is used over /gviz: gviz guesses column types and blanks cells that don't match.
    return src.published
        ? "https://docs.google.com/spreadsheets/d/e/" + src.id + "/pub?output=csv&gid=" + src.gid
        : "https://docs.google.com/spreadsheets/d/" + src.id + "/export?format=csv&gid=" + src.gid;
}

// done(userMessage | null, rows)
function fetchRows(src, done) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", csvUrl(src));
    xhr.timeout = 20000;
    xhr.ontimeout = function () { done(t("Se agotó el tiempo de espera. Probá de nuevo en un rato.")); };
    xhr.onerror = function () { done(t("No se pudo conectar con Google. Revisá tu conexión a internet.")); };
    xhr.onload = function () {
        var type = xhr.getResponseHeader("Content-Type") || "", body = xhr.responseText || "";
        if (xhr.status === 404) return done(t("No se encontró la hoja. Revisá el enlace."));
        if (xhr.status === 400) return done(t("No se encontró la pestaña (gid). Revisá el número de pestaña."));
        if (xhr.status === 401 || xhr.status === 403 || /text\/html/.test(type) || /^\s*</.test(body))
            return done(t("La hoja no es pública. En Google Sheets: Compartir → \"Cualquier persona con el enlace\" → Lector."));
        if (xhr.status !== 200) return done(t("Google respondió con un error (%1). Probá de nuevo.", xhr.status));
        var rows = cleanRows(parseCsv(body));
        if (!rows.length) return done(t("La hoja está vacía."));
        done(null, rows);
    };
    xhr.send();
}

// ---------- spreadsheet title + tabs ----------
// No API key/OAuth: the public viewer page lists the tabs as `items.push({name: "...", ..., gid: "..."` (htmlview)
// or `id="sheet-button-<gid>"` (published pubhtml). shortcut: scrapes Google's HTML, may break if Google changes it.

function metaUrl(src) {
    return src.published
        ? "https://docs.google.com/spreadsheets/d/e/" + src.id + "/pubhtml"
        : "https://docs.google.com/spreadsheets/d/" + src.id + "/htmlview";
}

function decodeHtml(s) {
    var t = document.createElement("textarea");  // RCDATA: decodes entities, never runs markup
    t.innerHTML = s;
    return t.value;
}

function unescapeJs(s) {
    try { return JSON.parse('"' + s.replace(/\\x([0-9a-fA-F]{2})/g, "\\u00$1").replace(/\\'/g, "'") + '"'); }
    catch (e) { return s; }
}

// -> { title, sheets: [{ gid, name }] }
function parseSheetMeta(html) {
    var title = decodeHtml((html.match(/<title>([^<]*)<\/title>/) || [])[1] || "")
        .replace(/\s+-\s+(Google (Drive|Sheets|Docs)|Hojas de cálculo de Google)\s*$/i, "").trim();
    var sheets = [], seen = {}, m;
    var re = /items\.push\(\{name:\s*"((?:[^"\\]|\\.)*)"[^}]*?gid:\s*"(-?\d+)"/g;
    while ((m = re.exec(html))) if (!seen[m[2]]) { seen[m[2]] = 1; sheets.push({ gid: m[2], name: unescapeJs(m[1]) }); }
    var re2 = /id="sheet-button-(-?\d+)"[^>]*>(?:\s*<[^>]*>)*\s*([^<]+)/g;
    while ((m = re2.exec(html))) if (!seen[m[1]]) { seen[m[1]] = 1; sheets.push({ gid: m[1], name: decodeHtml(m[2]).trim() }); }
    return { title: title, sheets: sheets };
}

// done(userMessage | null, { title, sheets })
function fetchSheetMeta(src, done) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", metaUrl(src));
    xhr.timeout = 20000;
    xhr.ontimeout = function () { done(t("Se agotó el tiempo de espera. Probá de nuevo en un rato.")); };
    xhr.onerror = function () { done(t("No se pudo conectar con Google. Revisá tu conexión a internet.")); };
    xhr.onload = function () {
        if (xhr.status === 404) return done(t("No se encontró la hoja. Revisá el enlace."));
        if (xhr.status !== 200) return done(t("Google respondió con un error (%1). Probá de nuevo.", xhr.status));
        var meta = parseSheetMeta(xhr.responseText || "");
        if (!meta.sheets.length) return done(t("La hoja no es pública. En Google Sheets: Compartir → \"Cualquier persona con el enlace\" → Lector."));
        done(null, meta);
    };
    xhr.send();
}

if (typeof module !== "undefined") module.exports = { parseSheetUrl: parseSheetUrl, csvUrl: csvUrl, fetchRows: fetchRows, parseSheetMeta: parseSheetMeta, fetchSheetMeta: fetchSheetMeta };
