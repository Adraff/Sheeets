// Stage 0 probe: checks Illustrator scripting assumptions the plugin depends on.
// Run: Illustrator > File > Scripts > Other Script... > pick this file.
// Output: alert + "sheets-probe-result.txt" on the Desktop.
#target illustrator
(function () {
    var out = [];
    function log(k, v) { out.push(k + ": " + v); }
    function tryLog(k, fn) { try { log(k, fn()); } catch (e) { log(k, "ERROR " + e); } }
    function big(n) { var s = "x"; while (s.length < n) s += s; return s.substr(0, n); }

    log("app.version", app.version);
    var doc = app.documents.add();
    var tf = doc.textFrames.add();

    // 1. Paragraph separator (expect \r -> 2, \u0003 -> 1 paragraph with forced break)
    tryLog("paragraphs '\\r'", function () { tf.contents = "a\rb"; return tf.paragraphs.length; });
    tryLog("paragraphs '\\n'", function () { tf.contents = "a\nb"; return tf.paragraphs.length; });
    tryLog("paragraphs '\\u0003'", function () { tf.contents = "a\u0003b"; return tf.paragraphs.length; });

    // 2. Character sub-range via writable length (expect [Mundo])
    tryLog("subrange length", function () {
        tf.contents = "Hola Mundo";
        var r = tf.textRange.characters[5];
        r.length = 5;
        return "[" + r.contents + "]";
    });

    // 3. Font list cost
    var fonts = [];
    tryLog("textFonts", function () {
        var t = new Date(), n = app.textFonts.length;
        for (var i = 0; i < n; i++) fonts.push(app.textFonts[i]);
        return n + " fonts, " + (new Date() - t) + " ms, e.g. " + fonts[0].family + " / " + fonts[0].style;
    });

    // 4. Apply a different font to a sub-range only (expect "different")
    tryLog("font on subrange", function () {
        var other = fonts[0].name === tf.textRange.characters[0].textFont.name ? fonts[1] : fonts[0];
        var r = tf.textRange.characters[5];
        r.length = 5;
        r.characterAttributes.textFont = other;
        return tf.textRange.characters[0].textFont.name !== tf.textRange.characters[6].textFont.name ? "different" : "SAME";
    });

    // 5. Tag sizes + unicode
    var sizes = [1000, 100000, 1000000];
    for (var i = 0; i < sizes.length; i++) {
        (function (n) {
            tryLog("tag write " + n, function () { var t = tf.tags.add(); t.name = "probe" + n; t.value = big(n); return t.value.length; });
        })(sizes[i]);
    }
    var uni = "ñáé \"q\" , 😀";
    tryLog("tag unicode", function () { var t = tf.tags.add(); t.name = "probeuni"; t.value = uni; return t.value === uni ? "ok" : "MISMATCH"; });

    // 6. Document XMP with custom namespace
    var ns = "http://ns.sheeets.local/probe/1.0/";
    tryLog("xmp write 1MB", function () {
        if (!ExternalObject.AdobeXMPScript) ExternalObject.AdobeXMPScript = new ExternalObject("lib:AdobeXMPScript");
        XMPMeta.registerNamespace(ns, "shp");
        var x = new XMPMeta(doc.XMPString);
        x.setProperty(ns, "data", big(1000000));
        doc.XMPString = x.serialize();
        return "ok";
    });

    // 7. Persistence after save / reopen
    var f = new File(Folder.temp + "/sheets-probe.ai");
    tryLog("save+reopen", function () { doc.saveAs(f); doc.close(SaveOptions.DONOTSAVECHANGES); doc = app.open(f); return "ok"; });
    var tf2 = doc.textFrames[0];
    for (var j = 0; j < sizes.length; j++) {
        (function (n) {
            tryLog("tag after reopen " + n, function () { return tf2.tags.getByName("probe" + n).value.length; });
        })(sizes[j]);
    }
    tryLog("tag unicode after reopen", function () { return tf2.tags.getByName("probeuni").value === uni ? "ok" : "MISMATCH"; });
    tryLog("xmp after reopen", function () { return new XMPMeta(doc.XMPString).getProperty(ns, "data").toString().length; });

    // 8. Undo grouping: several edits in one run. Manual check afterwards (see README of stage0).
    tryLog("undo setup", function () {
        tf2.contents = "UNDO TEST linea 1\rUNDO TEST linea 2";
        var r = tf2.textRange.characters[0];
        r.length = 4;
        r.characterAttributes.size = 40;
        return "done";
    });

    var rf = new File(Folder.desktop + "/sheets-probe-result.txt");
    rf.encoding = "UTF-8";
    rf.open("w");
    rf.write(out.join("\n"));
    rf.close();
    // No alert: a modal would block COM automation (DoJavaScriptFile). Result is the script's return value.
    return out.join("\n");
})();
