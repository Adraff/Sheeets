# Sheeets

**English** · [Español](README.es.md)

An Adobe Illustrator plugin that creates **native** text boxes whose content comes from a **Google Sheets** spreadsheet, with different formatting per column (typeface, weight, size, color). Boxes update only when you ask them to.

Example: with a sheet that has `Date` and `Name` columns and the template `{Date} {Name}`, the box shows one line per row, with the date in Bold and the name in Light:

> **March 24** Ana Perez
> **March 27** Luis Gomez

The result is ordinary Illustrator text: justification, tracking, leading, paragraph styles and effects all work as usual, and your adjustments survive updates.

---

## Requirements

- Adobe Illustrator 2019 or later. Tested on Illustrator 2026 (30.8).
- Windows 10/11 or macOS.
- Internet access to download data. Offline, a box uses the last data saved in the document.
- A Google Sheets file shared as **"Anyone with the link" → Viewer**, or published to the web.

No admin rights and no extra software are needed.

---

## Install (step by step)

### Step 1: download
1. Go to the **[Releases](https://github.com/Adraff/Sheeets/releases/latest)** page.
2. Under **Assets**, download **`Sheeets-<version>.zip`**. Don't use "Source code": that one is for developers.
3. Unzip it:
   - Windows: right-click the `.zip` → **Extract All…** → **Extract**.
   - macOS: double-click the `.zip`.

### Step 2: install on Windows
1. Close Illustrator.
2. In the unzipped folder, double-click **`Instalar.bat`** ("Instalar" means "Install").
3. If Windows shows "Windows protected your PC", click **More info → Run anyway**.
4. A black window shows the progress. When it says **"Listo. Sheeets … quedó instalada."** (done, installed), press Enter to close it.

### Step 2: install on macOS
1. Close Illustrator.
2. In the unzipped folder, **right-click → Open** on **`Instalar.command`** and confirm **Open**. A plain double-click may be blocked because the file isn't signed.
3. Terminal opens with the progress. When it says **"Listo. Sheeets … quedó instalada."**, press Enter.

If macOS still refuses: open **Terminal**, type `bash ` (with a space), drag `Instalar.command` into the window and press Enter.

### Step 3: open the panel
1. Open Illustrator.
2. Go to **Window → Extensions → Sheeets**.
3. Dock it next to your other panels if you like. Collapsed, it shows the Sheeets logo.

If the panel doesn't show up or is empty, see [Troubleshooting](#troubleshooting).

### What the installer does
- Copies the plugin to your user folder:
  - Windows: `%APPDATA%\Adobe\CEP\extensions\com.sheeets.linkedtext`
  - macOS: `~/Library/Application Support/Adobe/CEP/extensions/com.sheeets.linkedtext`
- Sets `PlayerDebugMode = 1` for CSXS 9–13 (Windows registry `HKCU\Software\Adobe\CSXS.<n>` / macOS `defaults` domain `com.adobe.CSXS.<n>`).
- Backs up a previously installed version before replacing it.
- Writes a log to `%TEMP%\Sheeets-instalacion.log` (Windows) or `$TMPDIR/Sheeets-instalacion.log` (macOS).

The installer's messages are in Spanish.

### Why "debug mode" is turned on
Adobe only loads unsigned extensions when `PlayerDebugMode` is on. Signing requires Adobe's tools (`ZXPSignCmd`), which this project doesn't use. With the mode on, Illustrator can load **any** unsigned extension in your account, not just this one. The uninstaller offers to turn it off.

---

## Use

The panel has two tabs at the bottom:
- **Parameters:** link, sheet, variables, line format and buttons.
- **Table:** document, sheet, limits (from/to which row) and a preview of the sheet.

The **⋯** menu at the top right has the **language** (English or Spanish; Illustrator's by default), credits, the installed version and **Check for updates**, which compares it with the latest release on GitHub and, if there is a newer one, takes you to download it.

### 1. Link a sheet
Every box has **its own link**: one box can use one sheet and another box a different one.

1. In Google Sheets: **Share → Anyone with the link → Viewer**, and copy the link.
2. In the panel, press **Link**. A window opens: paste the link with the paste icon or Ctrl+V (Cmd+V on Mac).
3. The link is checked automatically (or with **Check**). If it's right, **Verified** appears and the window closes; otherwise the reason appears and the window stays open.
4. The button now shows the file name: click it to change the link. Below it, **Sheet** shows the selected tab: click it to list every tab in the file and pick another.

Row 1 of the sheet holds the variable names. Blank columns and blank rows are ignored. The data is saved inside the `.ai` file and travels with it.

- **Nothing selected:** the panel prepares the next **New box** or **Convert selection**. After the box is created, the panel starts clean again.
- **A linked box selected:** the panel shows **that box's** link, sheet, formats and template. What you change there stays pending ("unapplied changes") until you press **Update box**.

### 2. Format variables (optional)
By default **no** formatting is applied: text uses Illustrator's settings, or the formatting of the text you converted. If you change the size or font of the whole box in Illustrator, it is kept on update.

Each variable shows its first value with its current format. To make a column look different, press that variable's **pencil**:
a window opens with a **preview** of how the text will look, and:
- **Typeface** (type to search) and, to its right, its style (Bold, Light…).
- **Size**, **Tracking** and **Color**. The color square starts as Illustrator's "none" swatch (white with a red slash); click it to choose a color with Illustrator's color picker, and press the **×** next to it to remove the color.
- **Baseline shift**.
- **Clear format**: back to the box's own formatting.

An empty field keeps the box's own value. Changes apply as you make them; close the window with the **×** or by clicking outside it.

### 3. Create a box
1. When you link a sheet, the **Line format** is filled with every variable separated by `|` (e.g. `{Date} | {Name}`); each variable shows in its color. Change it as you like, e.g. `{Date} {Name}`. The colored variable buttons insert a token at the cursor. You can put fixed text between variables: `{Date} – {Name}`.
2. In the **Table** tab, set the **Limits**: **From row** (2 = first data row) and **To row** (**All** = to the end). The arrows step the number up and down.
3. Press **New box** to create it in the center of the view. With plain text selected, **Convert selection** also appears and turns that text into a linked box.

### 4. Adjust it like any text
Justification, leading, tracking, paragraph styles, position, box size, appearance: everything works as with normal text and **is kept on update**.

- To change the fixed text (spaces, dashes), select the whole box and change its font or size. Variables get their own format back on update.
- All paragraphs take the first paragraph's attributes: to center, center the whole box.

### 5. Update
- **Update box** (with a box selected): downloads its sheet and regenerates it, applying any pending change (link, sheet, formats, line format, limits).
- **⟳ Update all**: downloads each box's own sheet and regenerates every box in the document. With nothing linked in the panel, it's the **Update all boxes** link under "Waiting for a link…".

Offline, the saved data is used and the panel tells you.

An update is a single **Ctrl/Cmd+Z**: undoing it also brings back the previous link and sheet.

### Duplicated boxes
Duplicating a box (Alt+drag, copy/paste) copies its link. When you select a copy, it gets its own identity, so changing its sheet only affects that copy.

### Text edited by hand
If you edit a box's text by hand, the panel marks it "edited by hand" and the next update asks before replacing those changes. Manual formatting on a variable (e.g. making one name italic) is replaced without asking.

---

## Updating the plugin
Unzip the new version and run `Instalar.bat` / `Instalar.command`. It backs up and replaces the previous version.

## Uninstall
Close Illustrator and run **`Desinstalar.bat`** (Windows) or **`Desinstalar.command`** (macOS). It asks whether to turn debug mode off too. Only the values the installer changed are restored.

Boxes already created stay normal Illustrator text: nothing breaks without the plugin.

---

## FAQ

**What if I open the file on a computer without the plugin?**
The boxes look and edit like any text; they just can't be updated.

**What if a font is missing on another computer?**
The panel says "The font … is missing" and never replaces it silently.

**Can I use a private sheet?**
Not yet: it has to be shared with a link or published to the web.

**Can dates and numbers be formatted?**
For now they appear exactly as in the sheet. Format them in Google Sheets.

**How many rows can it handle?**
About 4 seconds for 500 rows × 2 variables on Illustrator 2026; the panel warns when it will take a while.

---

## Troubleshooting

**The panel doesn't appear under Window → Extensions**
- Restart Illustrator after installing.
- Check the installer's log (path above).

**The panel appears but is empty**
Illustrator isn't loading unsigned extensions. Run the installer again with Illustrator closed. If it's still empty:
- Windows: in `%TEMP%`, the file `CEPHtmlEngine<n>-ILST-…-com.sheeets.linkedtext.panel.log` says `Signature verification failed`.
- Some modified or virtualized Illustrator installs read their own copy of the registry and don't see the installer's key. Fix:
  1. Save this as `enable.jsx`:
     ```js
     var f = new File(Folder.temp + "/lkt.bat");
     f.open("w");
     f.write("reg add HKCU\\Software\\Adobe\\CSXS.12 /v PlayerDebugMode /t REG_SZ /d 1 /f");
     f.close();
     f.execute();
     ```
  2. In Illustrator: **File → Scripts → Other Script…** and pick `enable.jsx`.
  3. Restart Illustrator.

  Replace `CSXS.12` with your Illustrator's CEP version, shown in `%TEMP%\CEP<n>-ILST.log`.

**"The sheet isn't public"**
Share it as **Anyone with the link → Viewer**.

**"The text doesn't fit in the box"**
It's an area text box and the text overflows. Make it bigger or the text smaller: the plugin never resizes boxes.

**macOS: "can't be opened because it is from an unidentified developer"**
Right-click → Open, or **System Settings → Privacy & Security → Open Anyway**.

---

## License
Sheeets is free and open-source software under the **[GNU GPL v3](LICENSE)**. © 2026 Adraff.

- You can use, copy, study, modify and share it for free, including for commercial work.
- If you distribute a modified version (or a product that includes it), it must stay open source under the same license, with its source code available and the copyright notice kept.
- It comes with no warranty.
- **Exception: the icons and the logo** (everything in `plugin/img/`) are **not** under the GPL. They are © Adraff, all rights reserved, and may only be used as part of Sheeets, not in any other project. See [LICENSE-ICONS.md](LICENSE-ICONS.md).

## More documentation (Spanish)
- [docs/PRUEBAS.md](docs/PRUEBAS.md): manual test guide.
- [docs/LIMITACIONES.md](docs/LIMITACIONES.md): known limitations and future improvements.

## For developers

- `plugin/`: the CEP extension.
  - `index.html` and `js/main.js`: the panel.
  - `js/i18n.js`: English/Spanish texts.
  - `js/csv.js`: CSV parser.
  - `js/sheets.js`: Google Sheets provider (CSV export, file title and tabs).
  - `js/template.js`: template and render spec.
  - `jsx/host.jsx`: ExtendScript.
- `installer/`: Windows installer scripts (PowerShell); `Instalar.command` / `Desinstalar.command` for macOS.
- `tests/csv.test.html`: tests for the parser, links, template and texts. To run them, serve the repo with `tests/serve.ps1` and open `http://localhost:8765/tests/csv.test.html`.
- **Distribution .zip:** `powershell -ExecutionPolicy Bypass -File tools\empaquetar.ps1` builds `dist\Sheeets-<version>.zip`, with the `.command` files executable on macOS.
- **Data:**
  - **Each box:** the `lkt_box` Tag of the text object holds its config (link, sheet, formats, template, range) as JSON with `schemaVersion`.
  - **Document:** the XMP (namespace `http://ns.sheeets.local/linkedtext/1.0/`, property `doc`) caches the downloaded rows.
- No third-party dependencies: no npm packages, no CDN, no external installer tools.
