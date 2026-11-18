# Sheeets

[English](README.md) · **Español**

Plugin para Adobe Illustrator que crea cajas de texto **nativas** cuyo contenido sale de una hoja de **Google Sheets**, con formato distinto por columna (tipografía, peso, tamaño, color). Las cajas se actualizan solo cuando vos lo pedís.

Ejemplo: con una hoja de columnas `Fecha` y `Nombre`, y la plantilla `{Fecha} {Nombre}`, la caja muestra una línea por fila, con la fecha en Bold y el nombre en Light:

> **24 de Marzo** Ana Perez
> **27 de Marzo** Luis Gomez

El resultado es texto común de Illustrator: justificación, interletra, interlineado, estilos de párrafo y efectos funcionan como siempre, y tus ajustes se mantienen al actualizar.

---

## Requisitos

- Adobe Illustrator 2019 o posterior. Probado en Illustrator 2026 (30.8).
- Windows 10/11 o macOS.
- Internet para descargar los datos. Sin conexión, la caja usa los últimos datos guardados en el documento.
- Una hoja de Google Sheets compartida como **"Cualquier persona con el enlace" → Lector**, o publicada en la web.

No hace falta instalar nada más ni tener permisos de administrador.

---

## Instalar (paso a paso)

### Paso 1: descargar
1. Entrá a la página de **[Releases](https://github.com/Adraff/Sheeets/releases/latest)**.
2. En **Assets**, descargá **`Sheeets-<versión>.zip`**. No uses "Source code": ese archivo es para desarrolladores.
3. Descomprimilo:
   - Windows: clic derecho sobre el `.zip` → **Extraer todo…** → **Extraer**.
   - macOS: doble clic sobre el `.zip`.

### Paso 2: instalar en Windows
1. Cerrá Illustrator.
2. En la carpeta que descomprimiste, hacé doble clic en **`Instalar.bat`**.
3. Si aparece "Windows protegió su PC": **Más información → Ejecutar de todas formas**.
4. Se abre una ventana negra con el avance. Cuando dice **"Listo. Sheeets … quedó instalada."**, apretá Enter para cerrarla.

### Paso 2: instalar en macOS
1. Cerrá Illustrator.
2. En la carpeta que descomprimiste, hacé **clic derecho → Abrir** sobre **`Instalar.command`** y confirmá **Abrir**. Con doble clic, macOS puede bloquearlo porque el archivo no está firmado.
3. Se abre la Terminal con el avance. Cuando dice **"Listo. Sheeets … quedó instalada."**, apretá Enter.

Si macOS sigue sin dejarlo abrir: abrí **Terminal**, escribí `bash ` (con espacio), arrastrá `Instalar.command` a la ventana y apretá Enter.

### Paso 3: abrir el panel
1. Abrí Illustrator.
2. Andá a **Ventana → Extensiones → Sheeets**.
3. Podés acoplar el panel junto a los demás. Colapsado, se ve con el logo de Sheeets.

Si el panel no aparece o aparece vacío, mirá [Solución de problemas](#solución-de-problemas).

### Qué hace el instalador
- Copia el plugin a tu carpeta de usuario:
  - Windows: `%APPDATA%\Adobe\CEP\extensions\com.sheeets.linkedtext`
  - macOS: `~/Library/Application Support/Adobe/CEP/extensions/com.sheeets.linkedtext`
- Activa `PlayerDebugMode = 1` para CSXS 9 a 13 (registro de Windows `HKCU\Software\Adobe\CSXS.<n>` / `defaults` de macOS `com.adobe.CSXS.<n>`).
- Si ya había una versión instalada, la respalda antes de reemplazarla.
- Deja un registro de actividad en `%TEMP%\Sheeets-instalacion.log` (Windows) o `$TMPDIR/Sheeets-instalacion.log` (macOS).

### Por qué se activa el "modo de depuración"
Adobe solo carga extensiones sin firma si `PlayerDebugMode` está activo. Firmar un plugin requiere herramientas de Adobe (`ZXPSignCmd`) que este proyecto no usa. Con el modo activo, Illustrator puede cargar **cualquier** extensión sin firmar que esté en tu cuenta, no solo esta. El desinstalador te ofrece desactivarlo.

---

## Usar

El panel tiene dos pestañas abajo:
- **Parámetros:** enlace, hoja, variables, formato de línea y botones.
- **Tabla:** documento, hoja, límites (desde/hasta qué fila) y vista previa de la hoja.

El menú **⋯** de arriba a la derecha tiene el **idioma** (español o inglés; por defecto, el de Illustrator), los créditos, la versión instalada y **Buscar actualizaciones**, que compara con la última versión publicada en GitHub y, si hay una nueva, te lleva a descargarla.

### 1. Enlazar una hoja
Cada caja tiene **su propio enlace**: una caja puede usar una hoja y otra caja otra distinta.

1. En Google Sheets: **Compartir → Cualquier persona con el enlace → Lector**, y copiá el enlace.
2. En el panel, apretá **Enlazar**. Se abre una ventana: pegá el enlace con el ícono de pegar o con Ctrl+V (Cmd+V en Mac).
3. El enlace se verifica solo (o con **Verificar**). Si es correcto, aparece **Verificado** y la ventana se cierra. Si no, aparece el motivo y la ventana queda abierta.
4. El botón pasa a mostrar el nombre del archivo: tocalo para cambiar el enlace. Debajo, **Hoja** muestra la pestaña elegida: tocala para ver todas las pestañas del archivo y elegir otra.

La **fila 1** de la hoja son los nombres de las variables. Las columnas y filas vacías se ignoran. Los datos se guardan dentro del `.ai` y viajan con el archivo.

- **Sin caja seleccionada:** el panel prepara la próxima **Nueva caja** o **Convertir selección**. Después de crear la caja, el panel vuelve a quedar limpio.
- **Con una caja enlazable seleccionada:** el panel muestra **su** enlace, hoja, formatos y plantilla. Lo que cambies queda pendiente ("cambios sin aplicar") hasta que apretás **Actualizar caja**.

### 2. Dar formato a las variables (opcional)
Por defecto no se aplica **ningún** formato: el texto sale con la configuración de Illustrator, o con la del texto que convertiste. Si cambiás el tamaño o la fuente de toda la caja en Illustrator, se mantiene al actualizar.

Cada variable muestra su primer valor con el formato que tiene. Si querés que una columna se vea distinta, apretá el **lápiz** de esa variable:
se abre una ventana con una **vista previa** de cómo va a verse el texto y:
- **Tipografía** (escribí para buscar) y, a la derecha, su variante (Bold, Light…).
- **Tamaño**, **Interletra** y **Color**. El cuadrado de color arranca como la muestra "ninguno" de Illustrator (blanco tachado en rojo); hacé clic para elegir un color con el selector de Illustrator, y con la **×** de al lado lo quitás.
- **Desplazamiento de línea base**.
- **Eliminar formato**: vuelve a dejar la variable como el resto de la caja.

Un campo vacío deja ese atributo como el de la caja. Los cambios se aplican al momento; la ventana se cierra con la **×** o haciendo clic afuera.

### 3. Crear una caja
1. Al enlazar una hoja, el **Formato de línea** se completa con todas las variables separadas por `|` (por ejemplo `{Fecha} | {Nombre}`); cada variable se ve con su color. Cambialo como quieras, por ejemplo `{Fecha} {Nombre}`. Los botones de colores con los nombres de las variables las insertan en el cursor. Entre variables podés poner texto fijo: `{Fecha} – {Nombre}`.
2. En la pestaña **Tabla**, elegí los **Límites**: **Desde la fila** (2 = primera fila de datos) y **Hasta la fila** (**Todas** = hasta el final). Las flechas suben y bajan el número.
3. Apretá **Nueva caja** para crearla en el centro de la vista. Si tenés seleccionado un texto común, aparece también **Convertir selección**, que lo transforma en caja enlazable.

### 4. Ajustar como cualquier texto
Justificación, interlineado, interletra, estilos de párrafo, posición, tamaño de la caja, apariencia: todo funciona igual que en un texto normal **y se mantiene al actualizar**.

- Para cambiar el formato del texto fijo (el espacio, los guiones), seleccioná toda la caja y cambiá la fuente o el tamaño. Las variables vuelven a su formato al actualizar.
- Los párrafos toman el formato del primero: para centrar, centrá toda la caja.

### 5. Actualizar
- **Actualizar caja** (con una caja seleccionada): descarga su hoja y la regenera, aplicando los cambios pendientes (enlace, hoja, formatos, formato de línea, límites).
- **⟳ Actualizar todas**: descarga la hoja de cada caja (cada una la suya) y regenera todas las cajas del documento. Sin nada enlazado en el panel, está como **Actualizar todas las cajas** debajo de "Esperando enlace…".

Sin internet, se usan los datos guardados y el panel te avisa.

Un Actualizar se deshace con **un solo Ctrl/Cmd+Z**, que también vuelve al enlace y la hoja anteriores.

### Cajas duplicadas
Al duplicar una caja (Alt+arrastrar, copiar y pegar) se copia también su enlace. Cuando seleccionás una copia, recibe su propia identidad: si le cambiás la hoja, solo cambia esa copia.

### Ediciones a mano
Si cambiás a mano el texto de una caja, el panel lo marca como "editada a mano" y el próximo Actualizar te avisa antes de reemplazar esos cambios. Los cambios de formato hechos a mano sobre una variable (por ejemplo, poner un nombre en itálica) se reemplazan sin aviso.

---

## Actualizar el plugin
Descomprimí la versión nueva y ejecutá `Instalar.bat` / `Instalar.command`. El instalador respalda la versión anterior y la reemplaza.

## Desinstalar
Cerrá Illustrator y ejecutá **`Desinstalar.bat`** (Windows) o **`Desinstalar.command`** (macOS). Te pregunta si querés desactivar también el modo de depuración. Solo se revierten los valores que cambió el instalador.

Las cajas ya creadas siguen siendo texto normal de Illustrator: no se rompen sin el plugin.

---

## Preguntas frecuentes

**¿Qué pasa si abro el archivo en una compu sin el plugin?**
Las cajas se ven y se editan como cualquier texto. Solo no se pueden actualizar.

**¿Qué pasa si falta una fuente en otra compu?**
El panel avisa "Falta la fuente …" y no la reemplaza por otra en silencio.

**¿Puedo usar una hoja privada?**
Todavía no. La hoja tiene que estar compartida con enlace o publicada en la web.

**¿Las fechas y números se pueden formatear?**
Por ahora se muestran tal como vienen de la hoja. Dales formato en Google Sheets.

**¿Cuántas filas aguanta?**
Unos 4 segundos con 500 filas × 2 variables en Illustrator 2026. El panel avisa cuando va a tardar.

---

## Solución de problemas

**El panel no aparece en Ventana → Extensiones**
- Reiniciá Illustrator después de instalar.
- Revisá el registro de actividad del instalador (ruta arriba).

**El panel aparece pero está vacío**
Illustrator no está cargando extensiones sin firmar. Volvé a ejecutar el instalador con Illustrator cerrado. Si sigue vacío:
- Windows: en `%TEMP%`, el archivo `CEPHtmlEngine<n>-ILST-…-com.sheeets.linkedtext.panel.log` dice `Signature verification failed`.
- Algunas instalaciones de Illustrator modificadas o virtualizadas leen una copia propia del registro y no ven la clave del instalador. Solución:
  1. Guardá este texto en un archivo `activar.jsx`:
     ```js
     var f = new File(Folder.temp + "/lkt.bat");
     f.open("w");
     f.write("reg add HKCU\\Software\\Adobe\\CSXS.12 /v PlayerDebugMode /t REG_SZ /d 1 /f");
     f.close();
     f.execute();
     ```
  2. En Illustrator: **Archivo → Secuencias de comandos → Otra secuencia de comandos…** y elegí `activar.jsx`.
  3. Reiniciá Illustrator.

  Cambiá `CSXS.12` por la versión de CEP de tu Illustrator. Figura en `%TEMP%\CEP<n>-ILST.log`.

**"La hoja no es pública"**
Compartila como **Cualquier persona con el enlace → Lector**.

**"El texto no entra en la caja"**
Es una caja de área y el texto desborda. Agrandala o achicá el texto: el plugin nunca cambia el tamaño de la caja.

**macOS: "no se puede abrir porque es de un desarrollador no identificado"**
Clic derecho → Abrir, o **Ajustes del Sistema → Privacidad y seguridad → Abrir igualmente**.

---

## Licencia
Sheeets es software libre y gratuito, bajo la licencia **[GNU GPL v3](LICENSE)**. © 2026 Adraff.

- Podés usarlo, copiarlo, estudiarlo, modificarlo y compartirlo gratis, también en trabajos comerciales.
- Si distribuís una versión modificada (o un producto que lo incluya), tiene que seguir siendo de código abierto bajo la misma licencia, con su código fuente disponible y manteniendo el aviso de autoría.
- Se ofrece sin garantía.
- **Excepción: los íconos y el logo** (todo lo que está en `plugin/img/`) **no** están bajo la GPL. Son © Adraff, todos los derechos reservados, y solo se pueden usar como parte de Sheeets, no en otros proyectos. Ver [LICENSE-ICONS.md](LICENSE-ICONS.md).

## Más documentación
- [docs/PRUEBAS.md](docs/PRUEBAS.md): guía de pruebas manuales.
- [docs/LIMITACIONES.md](docs/LIMITACIONES.md): limitaciones conocidas y mejoras futuras.

## Para desarrolladores

- `plugin/`: la extensión CEP.
  - `index.html` y `js/main.js`: el panel.
  - `js/i18n.js`: textos en inglés y español.
  - `js/csv.js`: parser CSV.
  - `js/sheets.js`: proveedor de Google Sheets (exportación CSV, título y pestañas).
  - `js/template.js`: plantilla y render.
  - `jsx/host.jsx`: ExtendScript.
- `installer/`: scripts de instalación de Windows (PowerShell); `Instalar.command` / `Desinstalar.command` para macOS.
- `tests/csv.test.html`: pruebas del parser, enlaces, plantilla y textos. Para correrlas, servilas con `tests/serve.ps1` y abrí `http://localhost:8765/tests/csv.test.html`.
- **Crear el .zip de distribución:** `powershell -ExecutionPolicy Bypass -File tools\empaquetar.ps1` genera `dist\Sheeets-<versión>.zip`, con los `.command` ejecutables en macOS.
- **Datos:**
  - **Cada caja:** el Tag `lkt_box` del objeto de texto guarda su configuración (enlace, hoja, formatos, plantilla, rango) en JSON con `schemaVersion`.
  - **Documento:** el XMP (espacio `http://ns.sheeets.local/linkedtext/1.0/`, propiedad `doc`) guarda los datos descargados.
- Sin dependencias de terceros: ni paquetes npm, ni CDN, ni instaladores externos.
