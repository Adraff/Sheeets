// Sheeets panel UI.
// Each linked box carries its own config in its Tag "lkt_box" (see host.jsx):
//   { schemaVersion: 2, id, source: { url, id, gid, published, title, sheetName },
//     variables: { "<header>": format }, template, from, to, mode: "preview"|"template", probe, hash, renderedAt }
//   format = { alias, mode: "direct"|"style", font (PostScript name), family, style, size, color "#rrggbb",
//              tracking, baseline, charStyle }
//   Every format field is optional: absent/null keeps the text's own formatting. Nothing is applied by default.
// The document XMP only caches downloaded rows, shared by the boxes that use the same sheet:
//   { schemaVersion: 2, sheets: { "<sourceKey>": { fetchedAt, rows } } }
// Edits to a selected box stay pending in the panel and reach the document only with "Actualizar caja", in the same
// host call as the new text, so one Ctrl+Z restores both the text and the previous config.
var SCHEMA_VERSION = 2;
var cepUtil = window.cep && window.cep.util;  // read before "var cep" below replaces the global CEP object
var cep = window.__adobe_cep__;
var $ = function (id) { return document.getElementById(id); };
var PREVIEW_ROWS = 10;
var MAX_SAMPLE_PX = 22;  // keeps the sample inside its 34 px field
// One color per column, used by the variable's name, its field marker and its template chip.
var VAR_COLORS = ["#d4e05b", "#e86fd9", "#4fc3f7", "#ffb74d", "#81c784", "#b39ddb", "#ff8a65", "#4db6ac"];
function varColor(v) { return VAR_COLORS[v.column % VAR_COLORS.length]; }
var fonts = [], fontByName = {}, fontsByFamily = {}, familyList = [];
var charStyles = [];
var editing = null;      // name of the variable whose editor is open

var docData = emptyDoc();
var docTooNew = false;   // saved by a newer plugin: never overwrite it
var draft = newDraft();  // config behind "Nueva caja" / "Convertir selección" when no linked box is selected
var cur = draft;         // config shown in the panel: the selected box's, or the draft
var selection = { kind: "none" };  // last lktSelectionInfo(); for a box, .hash = hash of its current text
var pending = {};        // box id -> edited config not applied yet
var lastSeenRaw = {};    // box id -> tag JSON last seen in the document (notices Ctrl+Z / redo)

function emptyDoc() { return { schemaVersion: SCHEMA_VERSION, sheets: {} }; }
function newDraft() { return { schemaVersion: SCHEMA_VERSION, source: null, variables: {}, template: "", from: 2, to: null, mode: "preview" }; }
function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function isBox() { return cur !== draft; }
function copy(o) { return JSON.parse(JSON.stringify(o)); }
function sourceKey(s) { return (s.published ? "e/" : "") + s.id + "#" + s.gid; }
function sheetData(s) { return s ? docData.sheets[sourceKey(s)] || null : null; }
function fmtDate(iso) { return new Date(iso).toLocaleString(LANG === "en" ? "en-US" : "es-AR"); }
function fmtShort(iso) {  // "18/11/26 a las 01:24 hs"
    var d = new Date(iso), p = function (n) { return (n < 10 ? "0" : "") + n; };
    var day = LANG === "en" ? p(d.getMonth() + 1) + "/" + p(d.getDate()) : p(d.getDate()) + "/" + p(d.getMonth() + 1);
    return t("%1 a las %2 hs", day + "/" + p(d.getFullYear() % 100), p(d.getHours()) + ":" + p(d.getMinutes()));
}
function sourceLabel(s) { return "«" + (s.title || t("Hoja de Google")) + (s.sheetName ? " · " + s.sheetName : "") + "»"; }

function host(script, cb) {
    if (!cep) return cb && cb("NO_HOST");
    cep.evalScript(script, cb || function () {});
}
function hostOk(res) { return res && res !== "NO_HOST" && res !== "EvalScript error."; }

// JSON.stringify output is valid ES3 source except the line/paragraph separators (U+2028, U+2029).
function jsLiteral(s) {
    return JSON.stringify(s).replace(new RegExp("[" + String.fromCharCode(0x2028, 0x2029) + "]", "g"), function (c) { return "\\u" + c.charCodeAt(0).toString(16); });
}

function setStatus(msg, kind) {
    $("status").textContent = msg || "";
    $("status").className = kind || "";
}

function el(tag, props, children) {
    var e = document.createElement(tag);
    for (var k in props || {}) e[k] = props[k];
    (children || []).forEach(function (c) { e.appendChild(c); });
    return e;
}

// Full-panel "loading" overlay; nested calls stack.
var loadingCount = 0;
function loading(on, text) {
    loadingCount = Math.max(0, loadingCount + (on ? 1 : -1));
    if (on) $("loadingText").textContent = text || t("Cargando…");
    $("loading").hidden = !loadingCount;
}
// Shows the overlay, lets it paint, then runs fn.
function withLoading(text, fn) {
    loading(true, text);
    requestAnimationFrame(function () { setTimeout(function () { try { fn(); } finally { loading(false); } }, 0); });
}

// ---------- schema migration ----------

function migrateDoc(d) {
    if (!d || d.schemaVersion !== 1) return d;
    var out = emptyDoc();
    if (d.source) {
        out.sheets[sourceKey(d.source)] = { fetchedAt: d.source.fetchedAt, rows: d.source.rows };
        out.legacy = {  // v1 boxes had no source of their own: they used the document's
            source: { url: d.source.url, id: d.source.id, gid: d.source.gid, published: !!d.source.published, title: "", sheetName: "" },
            variables: d.variables || {}
        };
    }
    return out;
}

function migrateBox(c) {
    if (c.schemaVersion !== 1) return c;
    var lg = docData.legacy || { source: null, variables: {} };
    c.source = c.source || copy(lg.source);
    c.variables = c.variables || copy(lg.variables);
    c.schemaVersion = SCHEMA_VERSION;
    return c;
}

// ---------- fonts & character styles ----------

function loadFonts(cb) {
    host("lktListFonts()", function (res) {
        fonts = hostOk(res) ? res.split("\n").map(function (l) { var p = l.split("\t"); return { family: p[0], style: p[1], name: p[2] }; }) : [];
        fontByName = {}; fontsByFamily = {};
        fonts.forEach(function (f) { fontByName[f.name] = f; (fontsByFamily[f.family] = fontsByFamily[f.family] || []).push(f); });
        familyList = Object.keys(fontsByFamily).sort(function (a, b) { return a.localeCompare(b); });
        if (cb) cb();
    });
}

function loadCharStyles(cb) {
    host("lktListCharStyles()", function (res) {
        charStyles = hostOk(res) ? res.split("\n") : [];
        if (cb) cb();
    });
}

// Installed fonts are shown in the sample through @font-face local(<PostScript name>).
var faceIds = {}, faceCount = 0, faceSheet = document.head.appendChild(document.createElement("style"));
function cssFamily(psName) {
    if (!faceIds[psName]) {
        faceIds[psName] = "lktf" + faceCount++;
        faceSheet.appendChild(document.createTextNode('@font-face{font-family:"' + faceIds[psName] + '";src:local("' + psName.replace(/["\\]/g, "") + '");}'));
    }
    return '"' + faceIds[psName] + '", sans-serif';
}

// ---------- document data (row cache) ----------

function loadFromDoc() {
    loading(true);
    host("lktLoadDocData()", function (res) {
        var d = null;
        if (hostOk(res) && res) {
            try { d = JSON.parse(res); } catch (e) { setStatus(t("Los datos guardados en este documento están dañados: se vuelven a descargar al actualizar."), "warn"); }
        }
        docTooNew = !!(d && d.schemaVersion > SCHEMA_VERSION);
        if (docTooNew) setStatus(t("Este documento se guardó con una versión más nueva de Sheeets. Actualizá el plugin."), "warn");
        docData = migrateDoc(d) || emptyDoc();
        docData.sheets = docData.sheets || {};
        Object.keys(docData.sheets).forEach(function (k) { docData.sheets[k].rows = cleanRows(docData.sheets[k].rows); });
        draft = newDraft(); cur = draft; closeVarEditor(); lastSelRes = null; pending = {}; lastSeenRaw = {};
        loadCharStyles(function () { renderAll(); readSelection(); loading(false); });
    });
}

function saveDoc() {
    if (docTooNew) return;
    host("lktSaveDocData(" + jsLiteral(JSON.stringify(docData)) + ")", function (res) {
        if (res === "NO_DOC") setStatus(t("Abrí o creá un documento para guardar los datos en el archivo."), "error");
        else if (res !== "OK" && res !== "NO_HOST") setStatus(t("No se pudieron guardar los datos en el documento."), "error");
    });
}

// Downloads a sheet and caches its rows in the document. done(errorMessage | null, rows)
// shortcut: rows of sheets no box uses anymore stay cached in the .ai; prune them if documents grow too large.
function download(src, done) {
    fetchRows(src, function (err, rows) {
        if (err) return done(err);
        docData.sheets[sourceKey(src)] = { fetchedAt: new Date().toISOString(), rows: rows };
        saveDoc();
        done(null, rows);
    });
}

// Re-downloads every distinct sheet; offline, the cached rows are used. cb(warnings)
function withFreshData(sources, cb) {
    var uniq = {}, keys = [], warnings = [];
    sources.forEach(function (s) { if (s && !uniq[sourceKey(s)]) { uniq[sourceKey(s)] = s; keys.push(sourceKey(s)); } });
    var left = keys.length;
    if (!left) return cb(warnings);
    loading(true, t("Descargando datos…"));
    keys.forEach(function (k) {
        var s = uniq[k];
        download(s, function (err) {
            if (err) {
                var d = docData.sheets[k];
                warnings.push(sourceLabel(s) + ": " + err + (d ? " " + t("Se usaron los datos guardados del %1.", fmtDate(d.fetchedAt)) : ""));
            }
            if (--left === 0) { loading(false); renderAll(); cb(warnings); }
        });
    });
}

// Marks the selected box as edited; nothing reaches the document until "Actualizar caja".
function changed() {
    if (!isBox()) return;
    pending[cur.id] = cur;
    renderButtons();
}

// ---------- link dialog ----------

function setLinkMsg(text, kind) {
    $("linkMsg").textContent = text;
    $("linkMsg").className = kind || "";
    $("linkInput").className = kind === "bad" || kind === "good" ? kind : "";
}

function openLinkDialog() {
    $("linkInput").value = cur.source ? cur.source.url : "";
    setLinkMsg("", "");
    $("linkDlg").hidden = false;
    $("linkInput").focus();
    $("linkInput").select();
}

function closeLinkDialog() {
    verifySeq++;  // drop any verification still running
    $("linkDlg").hidden = true;
}

var verifySeq = 0, verifyTimer = null;
function verifyLink() {
    clearTimeout(verifyTimer);
    var text = $("linkInput").value.trim(), seq = ++verifySeq, src = parseSheetUrl(text);
    if (!text) return setLinkMsg("", "");
    if (!src) return setLinkMsg("✗ " + t("El enlace no parece de Google Sheets. Copialo desde la barra de direcciones de la hoja."), "bad");
    setLinkMsg(t("Verificando…"), "busy");
    fetchSheetMeta(src, function (err, meta) {
        if (seq !== verifySeq) return;  // another link was typed meanwhile
        if (err) return setLinkMsg("✗ " + err, "bad");
        var asked = /[#?&]gid=/.test(text) && meta.sheets.filter(function (s) { return s.gid === src.gid; })[0];
        var tab = asked || meta.sheets[0];
        src.url = text; src.gid = tab.gid; src.title = meta.title || t("Hoja de Google"); src.sheetName = tab.name;
        download(src, function (err2) {
            if (seq !== verifySeq) return;
            if (err2) return setLinkMsg("✗ " + err2, "bad");
            setLinkMsg(t("Verificado") + " · " + src.title, "good");
            setTimeout(function () { if (seq === verifySeq) { closeLinkDialog(); setSource(src); } }, 900);
        });
    });
}

// Clipboard: the browser API first; CEP may deny it, then Node (enabled in the manifest) runs the OS command.
function readClipboard(cb) {
    function viaNode() {
        var req = typeof require === "function" ? require : window.cep_node && window.cep_node.require;
        if (!req) return cb(null);
        try {
            var win = navigator.platform.indexOf("Win") === 0;
            cb(String(req("child_process").execSync(win ? 'powershell -NoProfile -Command "Get-Clipboard -Raw"' : "pbpaste",
                { encoding: "utf8", windowsHide: true, timeout: 5000 })));
        } catch (e) { cb(null); }
    }
    if (navigator.clipboard && navigator.clipboard.readText) navigator.clipboard.readText().then(cb, viaNode);
    else viaNode();
}

// New link or sheet for the current config. A selected box only changes when "Actualizar caja" is pressed.
function setSource(src) {
    cur.source = src;
    // A new box starts with every variable in its line format: "{A} | {B} | {C}".
    var data = sheetData(src);
    if (!isBox() && !cur.template.trim() && data) {
        cur.template = varsOf(cur, data.rows).map(function (v) { return "{" + (v.alias || v.name) + "}"; }).join(" | ");
    }
    changed();
    renderAll();
    if (isBox()) setStatus(t("Hoja cambiada: apretá «Actualizar caja» para aplicarla a la caja."), "warn");
}

// ---------- sheet (tab) picker ----------

function toggleSheetList() {
    var list = $("sheetList"), src = cur.source;
    if (!list.hidden) { list.hidden = true; return; }
    list.innerHTML = "";
    loading(true, t("Cargando hojas…"));
    fetchSheetMeta(src, function (err, meta) {
        loading(false);
        if (cur.source !== src) return;
        list.hidden = false;
        if (err) return list.appendChild(el("div", { className: "bad", textContent: err }));
        meta.sheets.forEach(function (s) {
            var isCur = s.gid === src.gid;
            var b = el("button", { className: "sheet-item" + (isCur ? " current" : ""), textContent: (isCur ? "✓ " : "") + s.name });
            b.onclick = function () { list.hidden = true; if (!isCur) chooseSheet(s); };
            list.appendChild(b);
        });
    });
}

function chooseSheet(s) {
    var src = copy(cur.source), target = cur;
    src.gid = s.gid;
    src.sheetName = s.name;
    src.url = /[#?&]gid=-?\d+/.test(src.url) ? src.url.replace(/([#?&]gid=)-?\d+/, "$1" + s.gid) : src.url + "#gid=" + s.gid;
    loading(true, t("Descargando la hoja «%1»…", s.name));
    download(src, function (err) {
        loading(false);
        if (err) return setStatus(err, "error");
        if (cur !== target) return;  // the selection changed meanwhile
        setStatus("", "");
        setSource(src);
    });
}

// ---------- variables ----------

function varFormat(name) {
    cur.variables = cur.variables || {};
    return cur.variables[name] || (cur.variables[name] = { mode: "direct" });
}

// Drops variables with no formatting at all (created just by viewing them), so they don't travel between sheets.
function pruneFormats(config) {
    var v = config.variables || {};
    Object.keys(v).forEach(function (k) {
        var f = v[k], used = Object.keys(f).some(function (p) { return p !== "mode" && f[p] != null && f[p] !== ""; });
        if (!used && f.mode !== "style") delete v[k];
    });
}

function varsOf(config, rows) {
    var formats = config.variables || {};
    return headersToVariables(rows[0]).map(function (v) {
        return { name: v.name, column: v.column, alias: (formats[v.name] || {}).alias };
    });
}

function fontWarning(fmt) {
    if (fmt.mode === "style") {
        return fmt.charStyle && charStyles.length && charStyles.indexOf(fmt.charStyle) < 0
            ? t("El estilo de carácter «%1» no existe en este documento.", fmt.charStyle) : "";
    }
    return fmt.font && fonts.length && !fontByName[fmt.font]
        ? t("Falta la fuente %1 en esta computadora. Instalala o elegí otra.", fmt.family ? fmt.family + " " + fmt.style : fmt.font) : "";
}

function applySample(node, fmt, text) {
    var s = node.style, direct = fmt.mode !== "style";
    node.textContent = direct ? text : text + "   (" + t("estilo: %1", fmt.charStyle || t("ninguno")) + ")";
    s.fontFamily = direct && fmt.font ? cssFamily(fmt.font) : "";
    s.fontSize = direct && fmt.size ? Math.min(fmt.size, MAX_SAMPLE_PX) + "px" : "";
    s.color = direct && fmt.color ? fmt.color : "";
    s.letterSpacing = direct && fmt.tracking ? fmt.tracking / 1000 + "em" : "";
    s.position = "relative";
    s.top = direct && fmt.baseline ? -Math.max(-10, Math.min(10, fmt.baseline)) + "px" : "";
    node.classList.remove("approx");
    node.dataset.approx = t("vista aproximada");
    if (!s.fontFamily) return;
    // Fonts bundled privately with Illustrator (e.g. Acumin) aren't visible to the panel's browser engine.
    var family = s.fontFamily, markApprox = function () { if (s.fontFamily === family) node.classList.add("approx"); };
    document.fonts.load("12px " + family.split(",")[0]).then(function (faces) { if (!faces.length) markApprox(); }, markApprox);
}

function firstValue(rows, column) {
    for (var r = 1; r < rows.length; r++) if ((rows[r][column] || "").trim()) return rows[r][column];
    return "";
}

function renderVars() {
    var box = $("vars"), data = sheetData(cur.source);
    box.innerHTML = "";
    if (!cur.source) return box.appendChild(el("div", { className: "muted", textContent: t("Enlazá una hoja para ver sus columnas.") }));
    if (!data) return box.appendChild(el("div", { className: "muted", textContent: t("No hay datos guardados de esta hoja: apretá «Actualizar caja».") }));
    varsOf(cur, data.rows).forEach(function (v) {
        var fmt = varFormat(v.name), color = varColor(v);
        var label = el("div", { className: "var-name" });
        var sample = el("div", { className: "sample" });
        var bar = el("div", { className: "var-bar" });
        var warn = el("div", { className: "warn" });
        var text = firstValue(data.rows, v.column) || v.name;
        label.style.color = bar.style.background = color;
        var update = function () {
            label.textContent = v.name + (fmt.alias ? "  →  {" + fmt.alias + "}" : "");
            applySample(sample, fmt, text);
            warn.textContent = fontWarning(fmt);
        };
        var btn = el("button", { className: "var-edit", title: t("Editar") }, [el("i", { className: "ico i-edit" })]);
        btn.onclick = function () { openVarEditor(v); };
        var item = el("div", { className: "var" }, [label, el("div", { className: "var-field" }, [sample, bar, btn]), warn]);
        update();
        box.appendChild(item);
    });
}

function num(input) {
    var v = parseFloat(String(input.value).replace(",", "."));
    return isNaN(v) ? null : v;
}

// Drop-down of installed families filtered by what's typed (CEP doesn't show <datalist> popups).
// Arrows move, Enter picks, Escape closes. onPick() runs after the input gets the chosen family.
var COMBO_MAX = 200;
function fontCombo(input, onPick) {
    var list = el("div", { className: "combo-list", hidden: true }), items = [], active = -1;
    function show() {
        var q = input.value.trim().toLowerCase();
        var starts = [], contains = [];
        familyList.forEach(function (f) {
            var i = f.toLowerCase().indexOf(q);
            if (i === 0) starts.push(f); else if (i > 0) contains.push(f);
        });
        items = starts.concat(contains).slice(0, COMBO_MAX);
        list.innerHTML = "";
        items.forEach(function (f, i) {
            var it = el("div", { className: "combo-item", textContent: f });
            it.addEventListener("mousedown", function (e) { e.preventDefault(); pick(i); });  // before the input's blur
            list.appendChild(it);
        });
        active = -1;
        list.hidden = !items.length;
    }
    function highlight(i) {
        active = Math.max(0, Math.min(items.length - 1, i));
        [].forEach.call(list.children, function (c, j) { c.classList.toggle("active", j === active); });
        if (list.children[active]) list.children[active].scrollIntoView({ block: "nearest" });
    }
    function pick(i) {
        input.value = items[i];
        list.hidden = true;
        onPick();
    }
    input.addEventListener("focus", show);
    input.addEventListener("input", show);
    input.addEventListener("blur", function () { list.hidden = true; });
    input.addEventListener("keydown", function (e) {
        if (list.hidden && e.key === "ArrowDown") return show();
        if (list.hidden) return;
        if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); highlight(active + (e.key === "ArrowDown" ? 1 : -1)); }
        else if (e.key === "Enter" && active >= 0) { e.preventDefault(); pick(active); }
        else if (e.key === "Escape") { e.stopPropagation(); list.hidden = true; }
    });
    return el("div", { className: "combo" }, [input, list]);
}

// ---------- variable editor (popup) ----------
// Every change applies at once to the panel (pending for a selected box, as any other edit); the popup only closes.

var editingVar = null;   // the variable shown in the popup ({ name, column })
function openVarEditor(v) {
    editing = v.name;
    editingVar = v;
    $("varTitle").textContent = v.name;
    $("varTitle").style.color = varColor(v);
    renderVarEditor();
    $("varDlg").hidden = false;
}

function renderVarEditor() {
    var body = $("varBody");
    body.innerHTML = "";
    var data = sheetData(cur.source), text = (data && firstValue(data.rows, editingVar.column)) || editingVar.name;
    body.appendChild(buildEditor(varFormat(editing), text, function () { renderVars(); renderChips(); renderTpl(); }));
}

function closeVarEditor() {
    editing = null;
    $("varDlg").hidden = true;
}

// Asks Illustrator's own color picker. cb("#rrggbb"), or cb(null) if it couldn't open.
function pickColor(hex, cb) {
    host("lktPickColor(" + jsLiteral(hex || "") + ")", function (res) { cb(/^#[0-9a-f]{6}$/i.test(res) ? res.toLowerCase() : null); });
}

function buildEditor(fmt, sampleText, onChange) {
    var field = function (text, input, cls) { return el("label", { className: cls || "", textContent: text }, [input]); };
    var option = function (value, text) { return el("option", { value: value, textContent: text }); };

    // Every empty field keeps the text's own formatting.
    // The family is a searchable text field with its own drop-down list of the installed families.
    var missing = fmt.font && !fontByName[fmt.font];
    var family = el("input", { placeholder: t("(como la caja) · escribí para buscar"), autocomplete: "off",
        value: fmt.font ? (missing ? fmt.family || fmt.font : fontByName[fmt.font].family) : "" });
    var familyBox = fontCombo(family, function () { commit({ target: family }); });
    var style = el("select");
    function familyMatch() {
        var v = family.value.trim().toLowerCase();
        return familyList.filter(function (f) { return f.toLowerCase() === v; })[0] || null;
    }
    function fillStyles() {
        style.innerHTML = "";
        var fam = familyMatch();
        if (!fam && missing && family.value.trim() === (fmt.family || fmt.font)) style.appendChild(option(fmt.font, fmt.style || fmt.font));
        (fam ? fontsByFamily[fam] : []).forEach(function (f) { style.appendChild(option(f.name, f.style)); });
        style.disabled = !style.options.length;
    }
    fillStyles();
    if (fmt.font) style.value = fmt.font;

    var size = el("input", { value: fmt.size == null ? "" : fmt.size, placeholder: t("auto"), inputMode: "decimal" });
    var tracking = el("input", { value: fmt.tracking == null ? "" : fmt.tracking, placeholder: t("auto"), inputMode: "decimal" });
    var baseline = el("input", { value: fmt.baseline == null ? "" : fmt.baseline, placeholder: t("(como la caja)"), inputMode: "decimal" });

    // Color: a swatch only. No color = Illustrator's "none" swatch (white, red slash); a click opens Illustrator's picker.
    var swatch = el("button", { className: "swatch" });
    var noColor = el("button", { className: "icon-btn swatch-clear", title: t("Quitar color") }, [el("i", { className: "ico i-cross" })]);
    function showColor() {
        swatch.classList.toggle("none", !fmt.color);
        swatch.style.backgroundColor = fmt.color || "";
        swatch.title = fmt.color ? fmt.color.toUpperCase() + " · " + t("Cambiar color") : t("Sin color · elegir uno");
        noColor.style.visibility = fmt.color ? "visible" : "hidden";  // keeps its space: the row never jumps
    }
    swatch.onclick = function () {
        pickColor(fmt.color, function (hex) {
            if (!hex) return problemsBox.textContent = t("No se pudo abrir el selector de color de Illustrator.");
            if (hex === fmt.color) return;
            fmt.color = hex; showColor(); commit();
        });
    };
    noColor.onclick = function () { fmt.color = null; showColor(); commit(); };
    var colorBox = el("div", { className: "swatch-row" }, [swatch, noColor]);

    // Preview of the variable's first value with the format being edited.
    var preview = el("div", { className: "sample" });
    var previewBox = el("div", { className: "var-field preview" }, [preview]);
    function showPreview() { applySample(preview, fmt, sampleText); }

    var problemsBox = el("div", { className: "warn" });
    var reset = el("button", { className: "link reset-link", textContent: t("Eliminar formato") });
    reset.onclick = function () {
        ["mode", "font", "family", "style", "size", "color", "tracking", "baseline", "charStyle"].forEach(function (k) { delete fmt[k]; });
        fmt.mode = "direct";
        changed();
        onChange();
        renderVarEditor();
    };

    function commit(e) {
        if (e && e.target === family) {
            fillStyles();
            var list = fontsByFamily[familyMatch()] || [];
            var regular = list.filter(function (f) { return /^(regular|roman|book|normal)$/i.test(f.style); })[0];
            if (list.length) style.value = (regular || list[0]).name;
            else if (family.value.trim()) return;  // still typing a family name: wait for a match
        }
        var problems = [];
        var sz = num(size), tr = num(tracking), bl = num(baseline);
        if (size.value.trim() && (sz === null || sz <= 0 || sz > 1296)) { problems.push(t("El tamaño tiene que ser un número entre 0,1 y 1296.")); sz = fmt.size; }
        if (tracking.value.trim() && (tr === null || tr < -1000 || tr > 10000)) { problems.push(t("La interletra tiene que estar entre -1000 y 10000.")); tr = fmt.tracking; }
        if (baseline.value.trim() && bl === null) { problems.push(t("El desplazamiento de línea base tiene que ser un número.")); bl = fmt.baseline; }

        fmt.mode = "direct";  // the popup only edits direct attributes (a stored character style is left unused)
        var f = familyMatch() ? fontByName[style.value] : null;
        if (!family.value.trim()) { fmt.font = fmt.family = fmt.style = null; }
        else if (f) { fmt.font = f.name; fmt.family = f.family; fmt.style = f.style; }
        // else: a font missing on this machine stays as stored
        fmt.size = sz; fmt.tracking = tr; fmt.baseline = bl;
        problemsBox.textContent = problems.join(" ");
        showPreview();
        onChange();
        changed();
    }
    [family, style, size, tracking, baseline].forEach(function (i) {
        i.addEventListener(i.tagName === "SELECT" ? "change" : "input", commit);
    });
    showColor();
    showPreview();

    return el("div", { className: "editor" }, [
        field(t("Vista previa"), previewBox),
        el("div", { className: "row2" }, [field(t("Tipografía"), familyBox, "grow"), field(t("Variante"), style, "variant")]),
        el("div", { className: "row2" }, [field(t("Tamaño"), size), field(t("Interletra"), tracking), field(t("Color"), colorBox, "color-field")]),
        field(t("Desplazamiento de línea base (pt)"), baseline),
        problemsBox, reset
    ]);
}

// ---------- boxes ----------
// A box's hash = hashText(rendered contents); a different hash in the document means the text was edited by hand.

// djb2 over UTF-16 units; must match lktHash() in host.jsx.
function hashText(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return h >>> 0;
}

function editedByHand(box) { return box.config.hash != null && box.hash !== box.config.hash; }

// Inline confirmation (CEP panels can't rely on window.confirm).
function askConfirm(msg, onYes) {
    $("confirmMsg").textContent = msg;
    $("confirm").hidden = false;
    $("confirmYes").onclick = function () { $("confirm").hidden = true; onYes(); };
    $("confirmNo").onclick = function () { $("confirm").hidden = true; setStatus(t("No se cambió nada."), ""); };
}

// Warns once before overwriting text edited by hand; after the overwrite the stored hash matches again.
function guardEdits(boxes, proceed) {
    var edited = boxes.filter(editedByHand).length;
    if (!edited) return proceed();
    askConfirm((edited === 1 ? t("El texto de la caja fue editado a mano.") : t("%1 cajas tienen texto editado a mano.", edited))
        + " " + t("Si seguís, esos cambios se reemplazan por el contenido de la hoja."), proceed);
}

var lastSelRes = null;
function readSelection() {
    host("lktSelectionInfo()", function (res) {
        if (res === lastSelRes) return;
        lastSelRes = res;
        var s;
        try { s = hostOk(res) ? JSON.parse(res) : { kind: "none" }; } catch (e) { s = { kind: "none" }; }
        if (s.kind === "linked") {
            // Alt+drag / copy-paste copies the tag, id included: give the selected copy its own id first.
            if (s.dup > 1) {
                var c = migrateBox(s.config);
                c.id = newId();
                return host("lktSetSelectedConfig(" + jsLiteral(JSON.stringify(c)) + ")", function () { lastSelRes = null; readSelection(); });
            }
            var id = s.config.id, raw = JSON.stringify(s.config), prevRaw = lastSeenRaw[id];
            // The tag changed under us (Ctrl+Z, redo, our own update): the document wins over pending edits.
            if (prevRaw !== undefined && prevRaw !== raw) delete pending[id];
            lastSeenRaw[id] = raw;
            s.config = migrateBox(s.config);
            // Same box and same config (only its text hash changed, or edits are in progress): keep the panel as is.
            if (isBox() && cur.id === id && (pending[id] === cur || prevRaw === raw)) { selection = s; return renderButtons(); }
        }
        var prevKind = selection.kind;
        selection = s;
        var nextCur = s.kind === "linked" ? pending[s.config.id] || s.config : draft;
        if (!isBox() && nextCur === draft) {  // still no linked box
            if (prevKind !== s.kind) renderButtons();
            return;
        }
        cur = nextCur;
        closeVarEditor();
        $("sheetList").hidden = true;
        withLoading(t("Cargando…"), renderAll);
    });
}

function readRange() {
    var f = $("from").value.trim(), to = $("to").value.trim();
    if (f && !/^\d+$/.test(f) || to && !/^\d+$/.test(to)) return { error: t("Las filas tienen que ser números enteros.") };
    var from = f ? +f : 2, end = to ? +to : null;
    if (from < 2) return { error: t("La fila 1 son los encabezados: el rango empieza como mínimo en la fila 2.") };
    if (end !== null && end < from) return { error: t("«Hasta fila» tiene que ser mayor o igual que «Desde fila».") };
    return { from: from, to: end };
}

// config + target -> { job, warnings, rows } or { error }. Updates config.probe/hash/renderedAt.
function makeJob(target, config, probe) {
    // Never rewrite a config we don't fully understand (made by a newer plugin version).
    if (config.schemaVersion > SCHEMA_VERSION) return { error: t("Esta caja se creó con una versión más nueva de Sheeets. Actualizá el plugin para modificarla.") };
    if (!config.source) return { error: t("Esta caja no tiene una hoja enlazada: apretá «Enlazar».") };
    var data = sheetData(config.source);
    if (!data) return { error: t("No hay datos guardados de %1: actualizá con conexión a internet.", sourceLabel(config.source)) };
    var parsed = parseTemplate(config.template, varsOf(config, data.rows));
    if (parsed.error) return { error: parsed.error };
    var rows = data.rows, from = config.from, to = config.to, formats = config.variables || {};
    if (config.mode === "template") {  // one line showing the tokens, each with its variable's format
        var tokens = rows[0].map(function () { return ""; });
        parsed.segments.forEach(function (s) { if (s.variable) tokens[s.variable.column] = "{" + (s.variable.alias || s.variable.name) + "}"; });
        rows = [rows[0], tokens]; from = to = 2;
    }
    var spec = buildSpec(rows, parsed.segments, function (v) { return hostFormat(formats[v.name]); }, from, to);
    config.schemaVersion = SCHEMA_VERSION;
    pruneFormats(config);
    config.probe = spec.probe;
    config.hash = hashText(spec.contents);
    config.renderedAt = new Date().toISOString();
    return {
        job: { target: target, probe: probe, spec: { contents: spec.contents, runs: spec.runs, formats: spec.formats }, configJson: JSON.stringify(config) },
        warnings: spec.warnings, rows: spec.rows
    };
}

var HOST_ERRORS = {
    NOT_FOUND: "No se encontró la caja en el documento.",
    LOCKED: "La caja está bloqueada u oculta: desbloqueala y mostrala para actualizarla.",
    NO_DOC: "Abrí o creá un documento."
};

// Runs jobs in one host call (one undo step) and reports the outcome.
// labels[i]: prefix naming the box in multi-box messages. onOk(): runs if every job succeeded.
function applyJobs(jobs, warnings, okMsg, labels, onOk) {
    var runs = jobs.reduce(function (n, j) { return n + j.spec.runs.length; }, 0);
    // Illustrator is busy while it formats (~4 ms per variable value); say so when it will take a while.
    loading(true, runs > 300 ? t("Actualizando… con muchas filas puede tardar unos segundos.") : t("Actualizando…"));
    host("lktApply(" + jsLiteral(jobs) + ")", function (res) {
        loading(false);
        var results, problems = [], msgs = warnings.slice(), ok = 0;
        try { results = JSON.parse(res); } catch (e) { return setStatus(t("Illustrator no pudo actualizar la caja."), "error"); }
        results.forEach(function (r, i) {
            var who = labels ? labels[i] : "";
            if (r.error) { problems.push(who + (HOST_ERRORS[r.error] ? t(HOST_ERRORS[r.error]) : t("Error de Illustrator: %1", r.error))); return; }
            ok++;
            if (r.overflow) msgs.push(who + t("El texto no entra en la caja: agrandala o achicá el texto."));
            if (r.missing && r.missing.length) msgs.push(who + t("No se pudo aplicar %1: no está en esta computadora o documento.", r.missing.join(", ")));
        });
        if (!problems.length) { setStatus([okMsg].concat(msgs).join("\n"), msgs.length ? "warn" : "ok"); if (onOk) onOk(); }
        else setStatus((ok && labels ? [ok === 1 ? t("1 caja actualizada.") : t("%1 cajas actualizadas.", ok)] : []).concat(problems, msgs).join("\n"), "error");
        readSelection();
    });
}

function linesMsg(word, n) { return n === 1 ? t("%1 (1 línea).", word) : t("%1 (%2 líneas).", word, n); }

function runSingle(target, config, probe, okWord, warnings, onOk) {
    var m = makeJob(target, config, probe);
    if (m.error) return setStatus(m.error, "error");
    applyJobs([m.job], (warnings || []).concat(m.warnings), linesMsg(okWord, m.rows), null, onOk);
}

// A new box gets the draft (its own link, formats, template and range); the panel then starts clean again.
function configForNewBox() {
    var range = readRange();
    if (range.error) return range;
    var c = copy(draft);
    c.id = newId();
    c.template = getTpl(); c.from = range.from; c.to = range.to; c.mode = "preview";
    return c;
}
function resetDraft() { draft = newDraft(); }

function boxLabel(c) {
    return t("Caja «%1» (%2): ", c.template, c.to ? t("filas %1–%2", c.from, c.to) : t("desde la fila %1", c.from));
}

// Each box keeps its own sheet and mode. Boxes are targeted by position, so duplicated ids can't mix them up.
function updateBoxes(boxes, w) {
    var jobs = [], labels = [], warnings = w.slice(), seen = {};
    boxes.forEach(function (b) {
        var c = pending[b.config.id] || b.config;
        if (seen[c.id]) { c = copy(c); c.id = newId(); }  // a duplicated box gets its own id now
        seen[c.id] = true;
        var m = makeJob("#" + b.index, c, c.probe), label = boxLabel(c);
        if (m.error) warnings.push(label + m.error);
        else { jobs.push(m.job); labels.push(label); m.warnings.forEach(function (x) { warnings.push(label + x); }); }
    });
    if (!jobs.length) return setStatus(warnings.join("\n"), "error");
    applyJobs(jobs, warnings, jobs.length === 1 ? t("1 caja actualizada.") : t("%1 cajas actualizadas.", jobs.length), labels,
        function () { boxes.forEach(function (b) { delete pending[b.config.id]; }); });
}

// ---------- rendering ----------

function renderAll() {
    renderSource();
    renderVars();
    renderFields();
    renderChips();
    renderButtons();
    renderPreview();
}

function renderSource() {
    var s = cur.source, data = sheetData(s), link = $("linkBtn"), title = s ? s.title || t("Hoja de Google") : "";
    link.querySelector(".label").textContent = s ? title : t("Enlazar");
    link.title = s ? t("Cambiar el enlace: %1", s.url) : t("Enlazar una hoja de Google Sheets");
    link.className = "btn " + (s ? "linked" : "primary");
    $("waiting").hidden = !!s;
    $("linked").hidden = $("tableBody").hidden = !s;
    $("tableEmpty").hidden = !!s;
    if (!s) return;
    $("sheetBtn").textContent = $("sheetName").textContent = s.sheetName || "gid " + s.gid;
    $("docName").textContent = title;
    $("docName").title = t("Cambiar el enlace: %1", s.url);
    $("fetched").textContent = data ? t("Última descarga: %1", fmtShort(data.fetchedAt)) : "";
}

function renderFields() {
    renderTpl();
    $("from").value = cur.from || "";
    $("to").value = cur.to || "";
}

// ---------- line template (contenteditable, one line) ----------
// The text is the model; the field is rebuilt on every change so each {token} shows its variable's typeface.

function getTpl() { return $("tpl").textContent.replace(/ /g, " "); }

function caretOffset(box) {
    var s = window.getSelection();
    if (!s.rangeCount || !box.contains(s.focusNode)) return null;
    var r = document.createRange();
    r.selectNodeContents(box);
    r.setEnd(s.focusNode, s.focusOffset);
    return r.toString().length;
}

function setCaret(box, pos) {
    var w = document.createTreeWalker(box, NodeFilter.SHOW_TEXT), n, r = document.createRange();
    while ((n = w.nextNode())) {
        if (pos <= n.length) { r.setStart(n, pos); break; }
        pos -= n.length;
    }
    if (!n) { r.selectNodeContents(box); r.collapse(false); }
    r.collapse(true);
    var s = window.getSelection();
    s.removeAllRanges();
    s.addRange(r);
}

function renderTpl(text) {
    var box = $("tpl"), pos = caretOffset(box), data = sheetData(cur.source), byToken = {};
    text = text == null ? cur.template || "" : text;
    if (data) varsOf(cur, data.rows).forEach(function (v) { byToken[v.name] = byToken[v.alias || v.name] = v; });
    box.innerHTML = "";
    var re = /\{([^{}]*)\}/g, last = 0, m;
    while ((m = re.exec(text))) {
        if (m.index > last) box.appendChild(document.createTextNode(text.slice(last, m.index)));
        var span = el("span", { className: "tok", textContent: m[0] }), v = byToken[m[1]], fmt = v && (cur.variables || {})[v.name];
        if (fmt && fmt.mode !== "style" && fmt.font) span.style.fontFamily = cssFamily(fmt.font);
        if (v) span.style.color = varColor(v);  // same color as the variable's name and chip
        box.appendChild(span);
        last = re.lastIndex;
    }
    if (last < text.length) box.appendChild(document.createTextNode(text.slice(last)));
    if (pos != null) setCaret(box, pos);
}

function insertToken(token) {
    var box = $("tpl"), pos = caretOffset(box);  // read before focus(), which moves the caret to the start
    box.focus();
    setCaret(box, pos == null ? getTpl().length : pos);
    document.execCommand("insertText", false, token);  // fires "input"; keeps the field's own undo
}

function renderChips() {
    var chips = $("chips"), data = sheetData(cur.source), vars = data ? varsOf(cur, data.rows) : [];
    chips.innerHTML = "";
    vars.forEach(function (v) {
        var token = "{" + (v.alias || v.name) + "}";
        var b = el("button", { textContent: v.alias || v.name, title: t("Insertar %1", token) });
        b.style.borderColor = varColor(v);
        b.onclick = function () { insertToken(token); };
        chips.appendChild(b);
    });
}

function setBtn(id, text, primary) {
    $(id).firstChild.textContent = text;
    $(id).title = text;
    $(id).classList.toggle("primary", primary);
}

function renderButtons() {
    var k = selection.kind, linked = isBox();
    $("sel").textContent = k === "nodoc" ? t("Abrí o creá un documento.")
        : linked ? t("Caja enlazable seleccionada") + (cur.mode === "template" ? " · " + t("mostrando la plantilla") : "")
            + (cur.renderedAt ? " · " + t("actualizada %1", fmtDate(cur.renderedAt)) : "")
            + (editedByHand({ hash: selection.hash, config: cur }) ? " · " + t("editada a mano") : "")
            + (pending[cur.id] ? " · " + t("cambios sin aplicar") : "")
        : k === "text" ? t("Texto común seleccionado: enlazá una hoja y convertilo.")
        : t("Sin selección: enlazá una hoja y creá una caja nueva.");
    $("sel").title = $("sel").textContent;
    $("sel").className = linked && pending[cur.id] ? "warn" : "";
    $("linkBtn").disabled = k === "nodoc";
    // Main button: Actualizar caja (linked box selected) or Nueva caja. "Convertir selección" only exists while
    // plain text is selected; otherwise it's hidden and the main button takes the whole row.
    setBtn("mainBtn", linked ? t("Actualizar caja") : t("Nueva caja"), true);
    $("mainBtn").disabled = !linked && (!cur.source || k === "nodoc");
    setBtn("secondBtn", t("Convertir selección"), false);
    $("secondBtn").hidden = linked || k !== "text" || !cur.source;
    $("updAll").disabled = $("updAllEmpty").disabled = k === "nodoc";
}

function renderPreview() {
    var table = $("preview"), data = sheetData(cur.source);
    table.innerHTML = "";
    $("count").textContent = "";
    if (!data) return;
    var header = data.rows[0], rows = data.rows.slice(1).filter(function (r) { return !isBlankRow(r); }), n = rows.length;
    $("count").textContent = !n ? t("La hoja solo tiene encabezados.")
        : (n === 1 ? t("1 fila de datos") : t("%1 filas de datos", n)) + (n > PREVIEW_ROWS ? " " + t("(se muestran las primeras %1)", PREVIEW_ROWS) : "");
    [header].concat(rows.slice(0, PREVIEW_ROWS)).forEach(function (r, i) {
        var tr = document.createElement("tr");
        for (var c = 0; c < header.length; c++) tr.appendChild(el(i ? "td" : "th", { textContent: r[c] || "", title: r[c] || "" }));
        table.appendChild(tr);
    });
}

// ---------- events ----------

$("linkBtn").addEventListener("click", openLinkDialog);
$("sheetBtn").addEventListener("click", toggleSheetList);
$("linkCancel").addEventListener("click", closeLinkDialog);
$("linkVerify").addEventListener("click", verifyLink);
$("linkInput").addEventListener("keydown", function (e) {
    if (e.key === "Enter") verifyLink();
    if (e.key === "Escape") closeLinkDialog();
});
$("linkInput").addEventListener("input", function () {  // pasting with Ctrl+V verifies on its own
    clearTimeout(verifyTimer);
    setLinkMsg("", "");
    verifyTimer = setTimeout(verifyLink, 600);
});
$("pasteBtn").addEventListener("click", function () {
    readClipboard(function (text) {
        if (text == null) {
            $("linkInput").focus();
            return setLinkMsg(t("No se pudo leer el portapapeles: pegá con Ctrl+V (Cmd+V en Mac)."), "busy");
        }
        $("linkInput").value = text.trim();
        verifyLink();
    });
});

$("tpl").addEventListener("input", function () {
    cur.template = getTpl();
    renderTpl(cur.template);
    changed();
});
$("tpl").addEventListener("keydown", function (e) { if (e.key === "Enter") e.preventDefault(); });  // one line only
$("tpl").addEventListener("paste", function (e) {  // plain text, no formatting or line breaks
    e.preventDefault();
    document.execCommand("insertText", false, (e.clipboardData.getData("text/plain") || "").replace(/[\r\n]+/g, " "));
});
["from", "to"].forEach(function (id) {
    $(id).addEventListener("input", function () {
        var r = readRange();
        if (r.error) return setStatus(r.error, "error");
        setStatus("", "");
        cur.from = r.from; cur.to = r.to;
        changed();
    });
});

// Limit arrows: "Desde" never goes below 2; "Hasta" goes back to empty ("Todas") past the last data row.
document.querySelectorAll("[data-step]").forEach(function (b) {
    b.addEventListener("click", function () {
        var p = b.dataset.step.split(":"), input = $(p[0]), d = +p[1], data = sheetData(cur.source);
        var last = data ? data.rows.length : null, from = parseInt($("from").value, 10) || 2, v = parseInt(input.value, 10);
        if (p[0] === "from") v = Math.max(2, (isNaN(v) ? 2 : v) + d);
        else if (isNaN(v)) v = d < 0 && last ? last : NaN;
        else { v += d; if (v < from) v = from; if (last && v > last) v = NaN; }
        input.value = isNaN(v) ? "" : v;
        input.dispatchEvent(new Event("input"));
    });
});

function newBox() {
    var c = configForNewBox();
    if (c.error) return setStatus(c.error, "error");
    runSingle("new", c, null, t("Caja creada"), null, resetDraft);
}

function convertSelection() {
    var c = configForNewBox();
    if (c.error) return setStatus(c.error, "error");
    runSingle("selection", c, 0, t("Texto convertido en caja enlazable"), null, resetDraft);
}

// Applies the selected box's pending edits (link, sheet, formats, template, range) with fresh data.
function updateBox() {
    var range = readRange();
    if (range.error) return setStatus(range.error, "error");
    var box = cur;
    box.template = getTpl(); box.from = range.from; box.to = range.to;
    box.mode = "preview";  // the panel no longer offers "Ver plantilla": a box left showing its template gets its data back
    guardEdits([{ hash: selection.hash, config: box }], function () {
        withFreshData([box.source], function (w) {
            runSingle("selection", box, box.probe, t("Caja actualizada"), w, function () { delete pending[box.id]; });
        });
    });
}

$("mainBtn").addEventListener("click", function () { if (isBox()) updateBox(); else newBox(); });
$("secondBtn").addEventListener("click", convertSelection);

function updateAll() {
    host("lktListBoxes()", function (res) {
        var boxes = [];
        try { boxes = JSON.parse(res); } catch (e) { return setStatus(t("No se pudieron leer las cajas del documento."), "error"); }
        if (!boxes.length) return setStatus(t("Este documento no tiene cajas enlazables."), "warn");
        boxes.forEach(function (b) { b.config = migrateBox(b.config); });
        guardEdits(boxes, function () {
            withFreshData(boxes.map(function (b) { return (pending[b.config.id] || b.config).source; }), function (w) { updateBoxes(boxes, w); });
        });
    });
}
$("updAll").addEventListener("click", updateAll);
$("updAllEmpty").addEventListener("click", updateAll);

// ---------- tabs, menu, links ----------

document.querySelectorAll("[data-view]").forEach(function (b) {
    b.addEventListener("click", function () {
        document.querySelectorAll("[data-view]").forEach(function (o) { o.classList.toggle("active", o === b); $(o.dataset.view).hidden = o !== b; });
    });
});
$("docName").addEventListener("click", openLinkDialog);

$("moreBtn").addEventListener("click", function () { $("menu").hidden = false; });
$("menuClose").addEventListener("click", function () { $("menu").hidden = true; });
$("varClose").addEventListener("click", closeVarEditor);
var overlayClose = { menu: function () { $("menu").hidden = true; }, linkDlg: closeLinkDialog, varDlg: closeVarEditor };
Object.keys(overlayClose).forEach(function (id) {  // a click on the dimmed area closes the overlay
    $(id).addEventListener("click", function (e) { if (e.target === $(id)) overlayClose[id](); });
});
document.addEventListener("keydown", function (e) { if (e.key === "Escape") { $("menu").hidden = true; closeVarEditor(); } });

document.querySelectorAll("[data-lang]").forEach(function (b) {
    b.addEventListener("click", function () { setLang(b.dataset.lang); applyStaticText(); renderAll(); });
});

function openUrl(url) {
    if (cepUtil && cepUtil.openURLInDefaultBrowser) cepUtil.openURLInDefaultBrowser(url);
    else window.open(url);
}
$("creditLink").addEventListener("click", function () { openUrl(REPO_URL); });

// The version shown in the menu comes from the manifest, the same source the installer and the .zip use,
// so every release only has to bump CSXS/manifest.xml.
var REPO_URL = "https://github.com/Adraff/Sheeets", VERSION = "";
function loadVersion() {
    var x = new XMLHttpRequest();
    x.open("GET", "CSXS/manifest.xml");
    x.onload = function () { var m = /ExtensionBundleVersion="([^"]+)"/.exec(x.responseText || ""); VERSION = m ? m[1] : ""; $("version").textContent = VERSION; };
    x.send();
}

function newerThan(a, b) {  // "0.10.0" > "0.9.1"
    var x = a.split("."), y = b.split(".");
    for (var i = 0; i < Math.max(x.length, y.length); i++) { var d = (+x[i] || 0) - (+y[i] || 0); if (d) return d > 0; }
    return false;
}

// Compares with the latest GitHub release; a newer one opens its page to download.
var latestUrl = null;
$("checkUpd").addEventListener("click", function () {
    if (latestUrl) return openUrl(latestUrl);
    var msg = $("updMsg"), x = new XMLHttpRequest();
    msg.className = "busy"; msg.textContent = t("Buscando…");
    x.open("GET", "https://api.github.com/repos/Adraff/Sheeets/releases/latest");
    x.timeout = 15000;
    x.onload = function () {
        var r = null;
        try { r = JSON.parse(x.responseText); } catch (e) { /* handled below */ }
        if (x.status !== 200 || !r || !r.tag_name) { msg.className = "bad"; msg.textContent = t("No se pudo consultar GitHub. Probá más tarde."); return; }
        var latest = r.tag_name.replace(/^v/, "");
        if (newerThan(latest, VERSION)) {
            latestUrl = r.html_url;
            msg.className = "good"; msg.textContent = t("Hay una versión nueva: %1.", latest);
            $("checkUpd").textContent = t("Descargar %1", latest);
        } else { msg.className = "good"; msg.textContent = t("Tenés la última versión."); }
    };
    x.onerror = x.ontimeout = function () { msg.className = "bad"; msg.textContent = t("No se pudo consultar GitHub. Probá más tarde."); };
    x.send();
});

// Adobe Clean, Illustrator's UI typeface, is loaded from Illustrator's own install (never shipped with the plugin).
// Windows: <app>\Support Files\Contents\Windows\Illustrator.exe -> <app>\Support Files\Required\UxpResources\AdobeCleanUX.
// shortcut: the macOS location is a guess (inside the .app); if it's wrong the panel falls back to the system font.
function loadUiFont() {
    var app = null;
    try { app = cep && cep.getSystemPath("hostApplication"); } catch (e) { /* not available */ }
    if (!app) return;
    if (!/^file:/.test(app)) app = "file:///" + app.replace(/\\/g, "/").replace(/^\/+/, "");
    app = app.replace(/\/?$/, "/");
    var dirs = ["../../../Required/UxpResources/AdobeCleanUX/", "Contents/Required/UxpResources/AdobeCleanUX/"];
    var faces = [["Regular", 400, "normal"], ["Bold", 700, "normal"], ["It", 400, "italic"], ["BoldIt", 700, "italic"]];
    var css = faces.map(function (f) {
        var src = ['local("AdobeClean-' + f[0] + '")'].concat(dirs.map(function (d) {
            return 'url("' + new URL(d + "AdobeClean-" + f[0] + ".otf", app).href + '") format("opentype")';
        }));
        return '@font-face{font-family:"Adobe Clean";font-weight:' + f[1] + ";font-style:" + f[2] + ";src:" + src.join(",") + ";}";
    }).join("\n");
    document.head.appendChild(el("style", { textContent: css }));
}

function applyTheme() {
    if (!cep) return;
    try {
        var c = JSON.parse(cep.getHostEnvironment()).appSkinInfo.panelBackgroundColor.color;
        document.documentElement.style.setProperty("--bg", "rgb(" + Math.round(c.red) + "," + Math.round(c.green) + "," + Math.round(c.blue) + ")");
        document.documentElement.classList.toggle("light", (c.red * 0.299 + c.green * 0.587 + c.blue * 0.114) > 128);
    } catch (e) { /* keep default dark theme */ }
}

loadUiFont();
loadVersion();
applyTheme();
applyStaticText();
if (cep) {
    cep.addEventListener("com.adobe.csxs.events.ThemeColorChanged", applyTheme);
    cep.addEventListener("documentAfterActivate", loadFromDoc);
    // Illustrator 2026 fires no selection event to CEP (checked), so poll; unchanged results are ignored.
    setInterval(readSelection, 500);
}
loadFonts(loadFromDoc);
