// ExtendScript side. Document-level data (source + cached rows) lives as one JSON string in the document XMP.
// JSON is parsed in the panel only; ExtendScript just stores the string.
var LKT_NS = "http://ns.sheeets.local/linkedtext/1.0/";

function lktXmp() {
    if (!ExternalObject.AdobeXMPScript) ExternalObject.AdobeXMPScript = new ExternalObject("lib:AdobeXMPScript");
    XMPMeta.registerNamespace(LKT_NS, "lkt");
}

function lktLoadDocData() {
    if (!app.documents.length) return "";
    lktXmp();
    var p = new XMPMeta(app.activeDocument.XMPString).getProperty(LKT_NS, "doc");
    return p ? p.toString() : "";
}

// One font per line: family \t style \t PostScript name.
function lktListFonts() {
    var f = app.textFonts, n = f.length, out = [];
    for (var i = 0; i < n; i++) { var t = f[i]; out.push(t.family + "\t" + t.style + "\t" + t.name); }
    return out.join("\n");
}

// One character style name per line (active document).
function lktListCharStyles() {
    if (!app.documents.length) return "";
    var s = app.activeDocument.characterStyles, out = [];
    for (var i = 0; i < s.length; i++) out.push(s[i].name);
    return out.join("\n");
}

// ---------- linked boxes ----------
// Each box is a native TextFrame carrying a Tag "lkt_box" whose value is the box config JSON (written by the panel).
// The tag is never eval'd here: a shared .ai file could carry a crafted tag. The panel parses it with JSON.parse.
var LKT_TAG = "lkt_box";

function lktTag(tf) {
    var t = tf.tags;
    for (var i = 0; i < t.length; i++) if (t[i].name === LKT_TAG) return t[i];
    return null;
}

function lktFindBox(doc, id) {
    var f = doc.textFrames, needle = '"id":"' + id + '"';
    for (var i = 0; i < f.length; i++) { var t = lktTag(f[i]); if (t !== null && t.value.indexOf(needle) !== -1) return f[i]; }
    return null;
}

function lktSelectedFrame(doc) {
    var s = doc.selection;
    if (s == null) return null;
    if (s.typename === "TextRange") return s.story.textFrames[0];  // caret / text selected with the Type tool
    return s.length === 1 && s[0].typename === "TextFrame" ? s[0] : null;
}

// dup = how many boxes carry exactly the same tag: Alt+drag / copy-paste duplicates the tag, id included.
function lktSelectionInfo() {
    if (!app.documents.length) return '{"kind":"nodoc"}';
    var tf = lktSelectedFrame(app.activeDocument);
    if (tf == null) return '{"kind":"none"}';
    var t = lktTag(tf);
    if (t === null) return '{"kind":"text"}';
    var f = app.activeDocument.textFrames, dup = 0;
    for (var i = 0; i < f.length; i++) { var o = lktTag(f[i]); if (o !== null && o.value === t.value) dup++; }
    return '{"kind":"linked","dup":' + dup + ',"hash":' + lktHash(tf.contents) + ',"config":' + t.value + '}';
}

// Gives the selected copy of a duplicated box its own config (new id).
function lktSetSelectedConfig(json) {
    if (!app.documents.length) return "NO_DOC";
    var tf = lktSelectedFrame(app.activeDocument), t = tf == null ? null : lktTag(tf);
    if (t === null) return "NOT_FOUND";
    t.value = json;
    return "OK";
}

// [{ index: <position in doc.textFrames>, hash: <hash of current contents>, config: {...} }]
function lktListBoxes() {
    if (!app.documents.length) return "[]";
    var f = app.activeDocument.textFrames, out = [];
    for (var i = 0; i < f.length; i++) {
        var t = lktTag(f[i]);
        if (t !== null) out.push('{"index":' + i + ',"hash":' + lktHash(f[i].contents) + ',"config":' + t.value + "}");
    }
    return "[" + out.join(",") + "]";
}

// djb2 over UTF-16 units; must match hashText() in main.js. Detects manual edits of rendered text.
function lktHash(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return h >>> 0;
}

function lktReadBase(c) {
    var a = c.characterAttributes;
    return { font: a.textFont, size: a.size, fill: a.fillColor, tracking: a.tracking, baseline: a.baselineShift };
}

// Area text whose last visible line ends before the last character = overflow.
function lktOverflow(tf) {
    if (tf.kind !== TextType.AREATEXT || !tf.characters.length) return false;
    var L = tf.lines;
    if (!L.length) return true;
    var last = L[L.length - 1];
    return last.characterOffset + last.length - 1 < tf.characters.length;  // characterOffset is 1-based
}

// spec: { contents, runs: [[start, length, formatIndex]], formats: [{font,size,color,tracking,baseline} | {style}] }
// probe: offset of a fixed-text char from the previous render (its attributes = the box's base format, which the
// user may have changed), or null. Returns the names of fonts/styles that could not be applied.
function lktRender(tf, spec, probe) {
    var doc = app.activeDocument, missing = [], base = null, i;
    if (probe !== null && probe >= 0 && probe < tf.characters.length) base = lktReadBase(tf.textRange.characters[probe]);
    tf.contents = spec.contents;  // one write; every char inherits the first char's attributes
    if (!spec.contents.length) return missing;

    var all = tf.textRange;
    if (base) {  // reset what a variable may have changed, so fixed text keeps the base format
        var a = all.characterAttributes;
        a.textFont = base.font; a.size = base.size; a.fillColor = base.fill; a.tracking = base.tracking; a.baselineShift = base.baseline;
    }

    var fmts = [];
    for (i = 0; i < spec.formats.length; i++) {
        var f = spec.formats[i], r = { f: f };
        if (f.style) { try { r.style = doc.characterStyles.getByName(f.style); } catch (e) { missing.push("estilo " + f.style); } }
        if (f.font) { try { r.font = app.textFonts.getByName(f.font); } catch (e) { missing.push(f.font); } }
        if (f.color) { r.color = new RGBColor(); r.color.red = f.color[0]; r.color.green = f.color[1]; r.color.blue = f.color[2]; }
        fmts.push(r);
    }

    // ~4 s for 1000 runs (500 rows x 2 variables) in Illustrator 2026; per-paragraph access measured no faster.
    for (i = 0; i < spec.runs.length; i++) {
        var run = spec.runs[i], x = fmts[run[2]], rng = all.characters[run[0]];
        rng.length = run[1];
        if (x.f.style !== undefined) { if (x.style) x.style.applyTo(rng, true); continue; }
        var ca = rng.characterAttributes;
        if (x.font) ca.textFont = x.font;
        if (x.f.size !== null) ca.size = x.f.size;
        if (x.color) ca.fillColor = x.color;
        if (x.f.tracking !== null) ca.tracking = x.f.tracking;
        if (x.f.baseline !== null) ca.baselineShift = x.f.baseline;
    }
    return missing;
}

// jobs: [{ target: "new" | "selection" | "#<textFrames index>" | "<box id>", probe, spec, configJson }].
// All in one call = one undo step; text and tag are undone together (verified), so Ctrl+Z also restores the old config.
function lktApply(jobs) {
    if (!app.documents.length) return '[{"error":"NO_DOC"}]';
    var doc = app.activeDocument, out = [];
    for (var j = 0; j < jobs.length; j++) {
        var job = jobs[j], res = '"target":' + lktStr(job.target);
        try {
            // if/else on purpose: a nested ?: returning a DOM object yields null in ExtendScript (verified).
            var tf;
            if (job.target === "new") tf = doc.textFrames.pointText(doc.views[0].centerPoint);
            else if (job.target === "selection") tf = lktSelectedFrame(doc);
            else if (job.target.charAt(0) === "#") tf = doc.textFrames[+job.target.slice(1)];  // index from lktListBoxes
            else tf = lktFindBox(doc, job.target);
            if (tf == null) throw "NOT_FOUND";  // DOM objects can be falsy (an empty TextFrame converts to "")
            if (tf.locked || tf.hidden || (tf.layer != null && (tf.layer.locked || !tf.layer.visible))) throw "LOCKED";
            var missing = lktRender(tf, job.spec, job.probe);
            var tag = lktTag(tf);
            if (tag === null) { tag = tf.tags.add(); tag.name = LKT_TAG; }
            tag.value = job.configJson;
            if (job.target === "new") { doc.selection = null; tf.selected = true; }
            var m = [];
            for (var k = 0; k < missing.length; k++) m.push(lktStr(missing[k]));
            res += ',"overflow":' + lktOverflow(tf) + ',"missing":[' + m.join(",") + "]";
        } catch (e) {
            res += ',"error":' + lktStr(String(e));
        }
        out.push("{" + res + "}");
    }
    return "[" + out.join(",") + "]";
}

function lktStr(s) {
    return '"' + String(s).replace(/[\\"]/g, "\\$&").replace(/[\x00-\x1f]/g, function (c) { return "\\u" + ("000" + c.charCodeAt(0).toString(16)).slice(-4); }) + '"';
}

// Opens Illustrator's color picker on "#rrggbb" (black when empty) and returns the chosen color as "#rrggbb".
// Cancel returns the starting color. CMYK/gray results (CMYK documents) are converted to RGB for storage.
function lktPickColor(hex) {
    var c = new RGBColor();
    c.red = hex ? parseInt(hex.substr(1, 2), 16) : 0;
    c.green = hex ? parseInt(hex.substr(3, 2), 16) : 0;
    c.blue = hex ? parseInt(hex.substr(5, 2), 16) : 0;
    var r = app.showColorPicker(c), rgb;
    if (r.typename === "RGBColor") rgb = [r.red, r.green, r.blue];
    else if (r.typename === "CMYKColor") rgb = app.convertSampleColor(ImageColorSpace.CMYK, [r.cyan, r.magenta, r.yellow, r.black], ImageColorSpace.RGB, ColorConvertPurpose.defaultpurpose);
    else if (r.typename === "GrayColor") { var g = 255 * (1 - r.gray / 100); rgb = [g, g, g]; }
    else return "UNSUPPORTED";
    var out = "#";
    for (var i = 0; i < 3; i++) out += ("0" + Math.max(0, Math.min(255, Math.round(rgb[i]))).toString(16)).slice(-2);
    return out;
}

function lktSaveDocData(json) {
    if (!app.documents.length) return "NO_DOC";
    lktXmp();
    var d = app.activeDocument, x = new XMPMeta(d.XMPString);
    x.setProperty(LKT_NS, "doc", json);
    d.XMPString = x.serialize();
    return "OK";
}
