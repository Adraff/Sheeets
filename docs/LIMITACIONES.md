# Limitaciones conocidas y mejoras futuras

## Limitaciones
- **Solo hojas públicas.** La hoja tiene que estar compartida con enlace o publicada en la web. No hay inicio de sesión de Google.
- **Sin firma de Adobe.** El plugin carga gracias a `PlayerDebugMode`, que habilita cualquier extensión sin firmar en esa cuenta de usuario.
- **Párrafos uniformes.** Al actualizar, todos los párrafos toman los atributos del primero (justificación, sangrías, etc.). Si se ajusta un párrafo suelto, ese ajuste se pierde.
- **Formato manual sobre variables.** Si se cambia a mano el formato de un valor (por ejemplo, un nombre en itálica), Actualizar lo reemplaza sin avisar. Solo se detectan los cambios de texto.
- **Rendimiento.** Unos 4 ms por valor de variable: 500 filas × 2 variables ≈ 4 s, durante los que Illustrator queda ocupado. Va en una sola llamada para que se deshaga con un solo paso.
- **Muestra en el panel.** Las fuentes internas de Illustrator (por ejemplo Acumin) no se pueden mostrar y se ven como "vista aproximada". La muestra tampoco refleja cómo se ve un estilo de carácter.
- **Nombre del archivo y pestañas.** Se leen de la página pública de la hoja (`htmlview` / `pubhtml`), no de una API de Google. Si Google cambia esa página, puede dejar de funcionar.
- **Caché de hojas.** Los datos de hojas que ya no usa ninguna caja siguen guardados en el `.ai`.
- **Pegar.** Si Illustrator no deja leer el portapapeles, el panel lo lee con Node (PowerShell `Get-Clipboard` / `pbpaste`). Si eso también falla, pide pegar con Ctrl/Cmd+V.
- **Filas de más.** Si la hoja tiene más filas que el rango de la caja, no hay aviso. Con varias cajas en rangos seguidos, la primera avisaría siempre.
- **Emoji.** Si la fuente de la variable no tiene el glifo, Illustrator lo dibuja con otra fuente.
- **Detección de selección.** Illustrator 2026 no avisa a los paneles CEP cuando cambia la selección, así que el panel la consulta cada 0,5 s.
- **Cambios pendientes.** Los cambios hechos en el panel sobre una caja seleccionada viven en el panel hasta "Actualizar caja". Si cerrás el documento o Illustrator antes, se pierden.
- **Copias de cajas.** Una copia recibe su propia identidad al seleccionarla o al usar "Actualizar todas". Eso escribe en la caja y puede sumar un paso al historial de deshacer.
- **Idioma.** El panel está en inglés y español. Los instaladores muestran sus mensajes solo en español.
- **Illustrator modificado o virtualizado.** Algunas instalaciones leen una copia propia del registro y necesitan el arreglo del README.
- **macOS.** El instalador `.command` no se probó en una Mac real. La tipografía del panel (Adobe Clean) se carga desde la instalación de Illustrator; en Mac la ruta es una suposición y, si falla, el panel usa la fuente del sistema.
- **Ver plantilla.** Desde 0.3.0 el panel ya no tiene el botón "Ver plantilla". Una caja que quedó mostrando la plantilla vuelve a los datos con "Actualizar caja".
- **Cajas enlazadas (threaded).** No se probó texto que fluye entre varias cajas enlazadas de Illustrator.

## Mejoras futuras
1. Formato de fecha y número por variable (por ejemplo `24/03` → `24 de Marzo`).
2. Hojas privadas con inicio de sesión de Google (OAuth). Se suma como otro proveedor con la misma forma que `fetchRows(source, done)`.
3. Actualizar al abrir el documento, como opción.
4. CSV local como fuente de datos.
5. Conservar ajustes de párrafos sueltos, mapeando cada párrafo a su fila.
6. Instalador `.pkg` para macOS con `pkgbuild`/`productbuild`.
