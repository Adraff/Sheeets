# Guía de pruebas manuales

Cada prueba dice qué hacer y qué tiene que pasar. Marcá ✔ o ✘.

## Preparación
1. Instalá el plugin con `Install.bat` (Windows) o `Install.command` (macOS).
2. Creá una hoja de Google Sheets con este contenido y compartila como **Cualquier persona con el enlace → Lector**:

| Fecha | Nombre |
|---|---|
| 24 de Marzo | Ana Pérez |
| 27 de Marzo | Luis Gómez |
| 13 de Abril | Juan Díaz |
| 16 de Mayo | Sofía Ruiz |

3. Abrí Illustrator, creá un documento nuevo y abrí **Ventana → Extensiones → Sheeets**.

## A. Instalación
| # | Acción | Resultado esperado |
|---|---|---|
| A1 | Ejecutar el instalador con Illustrator abierto | Pide cerrar Illustrator antes de seguir |
| A2 | Ejecutar el instalador con Illustrator cerrado | "Listo. Sheeets X quedó instalada." y el aviso del modo de depuración |
| A3 | Ejecutar el instalador otra vez | Muestra "Versión instalada: X -> versión nueva: Y" y crea un respaldo |
| A4 | Abrir Ventana → Extensiones → Sheeets | El panel se ve con las secciones Hoja de datos, Variables, Caja y Vista previa de la hoja |
| A5 | Ejecutar el desinstalador y responder S | Se borra el plugin. Las claves `PlayerDebugMode` vuelven a como estaban |

## B. Datos
| # | Acción | Resultado esperado |
|---|---|---|
| B1 | **Enlazar** → copiar el enlace → **Pegar** | ✓ con el nombre del archivo, la ventana se cierra. El botón muestra el nombre del archivo. Aparecen las variables **Fecha** y **Nombre** y "4 filas de datos" |
| B2 | Enlazar → pegar `https://example.com` | ✗ "El enlace no parece de Google Sheets…". La ventana queda abierta |
| B3 | Enlazar → hoja sin compartir | ✗ "La hoja no es pública…" |
| B4 | Tocar **Hoja: …** en un archivo con varias pestañas | Lista todas las pestañas. Al elegir otra, cambian las variables y la vista previa |
| B5 | Desconectar internet → seleccionar una caja → Actualizar caja | Avisa que no pudo descargar y usa los datos guardados |
| B6 | Guardar, cerrar y reabrir el `.ai` | Al seleccionar la caja, el panel muestra su hoja, sus datos y la fecha de la última descarga |
| B7 | En la hoja, poner en una celda una coma, comillas, ñ, tildes y un emoji → Actualizar caja | La caja muestra todo igual que en la hoja |
| B8 | Caja 1 enlazada a la hoja A; deseleccionar; Enlazar la hoja B → Nueva caja (caja 2) | Seleccionando cada caja, el panel muestra su propio enlace. Actualizar todas actualiza cada una con su hoja |
| B9 | Crear una caja sin tocar el formato de las variables | El texto sale con la fuente y el tamaño por defecto de Illustrator, sin ningún estilo agregado |

## C. Variables y formato
| # | Acción | Resultado esperado |
|---|---|---|
| C1 | Fecha → Editar → una tipografía con Bold → Bold, 24 | La muestra se ve en Bold 24 |
| C2 | Nombre → Editar → la misma tipografía → Light, 24 | La muestra se ve en Light 24 |
| C3 | Tamaño `abc` | "El tamaño tiene que ser un número entre 0,1 y 1296." |
| C4 | Lápiz → clic en el cuadrado de color tachado | Se abre el selector de color de Illustrator. Al aceptar, el cuadrado toma ese color |
| C5 | Clic en la × al lado del color | El cuadrado vuelve a blanco tachado en rojo y la variable usa el color de la caja |
| C6 | Abrir el `.ai` en una computadora sin esa fuente | Aviso "Falta la fuente … en esta computadora" |

## D. Caja (criterio de aceptación principal)
| # | Acción | Resultado esperado |
|---|---|---|
| D1 | Plantilla `{Fecha} {Nombre}`, desde 2 hasta 5 → **Nueva caja** | Una caja con 4 líneas: fecha en Bold y nombre en Light, en la misma línea |
| D2 | Centrar la caja, cambiar interletra e interlineado, moverla | El texto cambia como cualquier texto |
| D3 | En la hoja, cambiar "Juan Díaz" por "Juan Torres" → seleccionar la caja → **Actualizar caja** | Cambia solo ese nombre. Centrado, interletra, interlineado, posición y formato por columna se mantienen |
| D4 | Ctrl/Cmd+Z una vez | Vuelve a "Juan Díaz", con un solo deshacer |
| D5 | Cambiar Nombre a 30 pt en el panel → Actualizar caja | Todos los nombres pasan a 30 pt |
| D6 | Rango 2 a 50 | Muestra 4 líneas y avisa "La hoja tiene datos hasta la fila 5…" |
| D7 | Plantilla `{Fecha} {Edad}` | "La variable {Edad} no existe en la hoja." |
| D8 | Plantilla `{Fecha {Nombre}` | "Falta cerrar una llave { en la plantilla." |
| D9 | Escribir un texto común, seleccionarlo → **Convertir selección** | El texto pasa a ser una caja enlazable y conserva su formato base |
| D10 | Dibujar un texto de área chico → Convertir con todas las filas | Aviso "El texto no entra en la caja…". La caja no cambia de tamaño |
| D11 | Dos cajas (filas 2–3 y 4–5) → **Actualizar todas** | "2 cajas actualizadas." Cada una con sus filas |
| D12 | Bloquear una caja → Actualizar todas | Las demás se actualizan. La bloqueada aparece en el aviso |
| D13 | Una celda con salto de línea dentro | La fila sigue siendo un solo párrafo, con salto de línea forzado |

## E. Plantilla / vista previa y ediciones a mano
| # | Acción | Resultado esperado |
|---|---|---|
| E3 | Editar a mano un nombre en la caja | El panel dice "· editada a mano" |
| E4 | Actualizar caja → Cancelar | "No se cambió nada." El texto sigue editado |
| E5 | Actualizar caja → Reemplazar | Vuelve el texto de la hoja. El próximo Actualizar no pregunta |

## F. Robustez
| # | Acción | Resultado esperado |
|---|---|---|
| F1 | Hoja con 500 filas → caja con todas | Se genera en unos 4 segundos (Illustrator 2026, 2 variables). El panel avisa que puede tardar |
| F2 | Hoja con solo la fila de encabezados | "La hoja solo tiene encabezados." La caja queda vacía, con aviso |
| F3 | Encabezados repetidos o vacíos | Variables "Fecha 2", "Columna 3" |
| F4 | Abrir el `.ai` en una computadora sin el plugin | Las cajas se ven como texto normal |
| F5 | Varias mesas de trabajo con cajas en cada una | Actualizar todas actualiza todas las cajas |

## G. Cambios de esta versión (0.2.0)
| # | Acción | Resultado esperado |
|---|---|---|
| G1 | Seleccionar una caja → Enlazar otra hoja (o elegir otra pestaña) | La caja **no** cambia. El panel dice "· cambios sin aplicar" |
| G2 | **Actualizar caja** | La caja pasa a la hoja nueva |
| G3 | Ctrl/Cmd+Z | La caja vuelve a la hoja anterior y el panel también muestra la hoja anterior |
| G4 | Crear una caja, duplicarla con Alt+arrastrar 5 veces, seleccionar la 2.ª copia → otra hoja → Actualizar caja | Cambia solo la 2.ª copia |
| G5 | Actualizar todas con copias duplicadas | Se actualizan todas. Cada copia queda con su propia identidad |
| G6 | Borrar la caja seleccionada | El panel vuelve a "Enlazar" y queda vacío |
| G7 | Crear una caja | Después de crearla y deseleccionarla, el panel queda limpio para la próxima |
| G8 | Hoja con columnas vacías y filas vacías | No aparecen como variables ni en la vista previa, y no hay aviso amarillo por ellas |
| G9 | Editar una variable → escribir "Ari" en Tipografía | La lista sugiere familias. Al elegir "Arial" aparecen sus estilos |
| G10 | Seleccionar una caja y después otra / Actualizar | Aparece un overlay "Cargando…" / "Actualizando…" mientras tanto |
| G11 | Menú **⋯** → Español / Inglés | Toda la interfaz cambia de idioma. Con Illustrator en inglés, el panel arranca en inglés |

## H. Diseño nuevo (0.3.0)
| # | Acción | Resultado esperado |
|---|---|---|
| H1 | Colapsar el panel a ícono | Se ve el logo de Sheeets (gris en tema oscuro, más oscuro en tema claro) |
| H2 | Sin hoja enlazada | Botón azul **Enlazar** con el logo y "Esperando enlace…" en el centro |
| H3 | Enlazar una hoja | El botón muestra el nombre del archivo centrado; aparecen Hoja, Variables y Formato de línea |
| H4 | Lápiz de una variable → escribir "ari" en Tipografía | Se despliega la lista de familias; con flechas y Enter (o clic) se elige una |
| H5 | Sin texto seleccionado / con texto común seleccionado | "Convertir selección" no aparece / aparece al lado de "Nueva caja" |
| H6 | Pestaña **Tabla** → flechas de Límites | "Desde" no baja de 2; "Hasta" pasa a **Todas** después de la última fila |
| H7 | Menú **⋯** | Idioma, créditos, versión 0.3.0 y Buscar actualizaciones (abre la página de Releases) |
| H8 | Panel corto con mucho contenido | Barra de scroll fina y redondeada, como las de Illustrator |