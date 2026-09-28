# La Caserita — Web de pedidos

Esta carpeta tiene todo lo necesario para publicar tu app en tu propio dominio,
usando Google Sheets como panel de administración.

## Orden de los pasos (importante seguirlo así)

1. Crear la planilla de Google Sheets
2. Publicar el Google Apps Script (el "backend")
3. Completar la URL en el código de la web
4. Subir la web a Vercel o Netlify

---

## PASO 1 — Crear la planilla de Google Sheets

1. Andá a [sheets.google.com](https://sheets.google.com) y creá una planilla nueva.
2. Ponele de nombre, por ejemplo, **"La Caserita - Menú"**.
3. Abajo vas a ver una pestaña que dice "Hoja 1". Hacé click derecho → **Cambiar nombre** → escribí `Menu` (tal cual, sin tilde).
4. En la fila 1 de esa hoja, escribí estos encabezados, uno por columna:

   | A | B | C | D | E | F |
   |---|---|---|---|---|---|
   | Categoria | Producto | Descripcion | Precio | ImagenURL | ID |

5. Debajo, empezá a cargar tus productos, una fila por producto. Ejemplo:

   | Categoria | Producto | Descripcion | Precio | ImagenURL | ID |
   |---|---|---|---|---|---|
   | Almuerzos | Menú del día | Plato completo | 25000 | | alm1 |
   | Empanadas | Empanada de carne | | 6000 | | emp1 |

   - **ID**: cualquier texto corto sin espacios (ej: `alm1`, `emp1`). Tiene que ser único por fila.
   - **ImagenURL**: opcional. Si querés poner una foto, subila a Google Drive, hacela pública ("Cualquiera con el enlace puede ver") y pegá el link. O usá un servicio como [postimages.org](https://postimages.org) que te da un link directo de imagen.

6. Creá una **segunda hoja** (click en el `+` de abajo). Cambiale el nombre a `Config`.
7. En la fila 1, poné los encabezados:

   | A | B |
   |---|---|
   | PIN | NotaDelivery |

8. En la fila 2, poné tus valores reales:

   | A | B |
   |---|---|
   | Ricaji270985# | El costo de envío se coordina según la zona |

   Esa columna A es la clave que vas a usar para entrar al panel de administración.

---

## PASO 2 — Publicar el Google Apps Script

1. Con la planilla abierta, andá al menú **Extensiones → Apps Script**.
2. Se abre un editor de código. Borrá todo lo que haya adentro.
3. Abrí el archivo `Code.gs` que te dejé en esta carpeta, copiá **todo** el contenido, y pegalo ahí.
4. Guardá (ícono del disquete, o Ctrl+S).
5. Arriba a la derecha, tocá **Implementar → Nueva implementación**.
6. Donde dice "Selecciona el tipo", tocá el ícono del engranaje y elegí **Aplicación web**.
7. Configurá así:
   - Ejecutar como: **Yo (tu correo)**
   - Quién tiene acceso: **Cualquier usuario**
8. Tocá **Implementar**.
9. Te va a pedir autorizar permisos (es tu propia planilla, así que es seguro). Aceptá.
10. Te va a dar una **URL que termina en `/exec`**. Copiala — la necesitás en el próximo paso.

> Si en el futuro cambiás el código del Apps Script, tenés que hacer "Nueva implementación" de nuevo para que el cambio tome efecto.

---

## PASO 3 — Completar la URL en el código

1. Abrí el archivo `src/App.jsx` de esta carpeta.
2. Buscá esta línea, cerca del principio:

   ```js
   const SHEETS_API_URL = "PEGA_ACA_TU_URL_DE_GOOGLE_APPS_SCRIPT";
   ```

3. Reemplazá el texto entre comillas por la URL que copiaste en el paso anterior. Por ejemplo:

   ```js
   const SHEETS_API_URL = "https://script.google.com/macros/s/AKfycb.../exec";
   ```

4. Guardá el archivo.

---

## PASO 4 — Subir la web a Vercel (gratis)

1. Creá una cuenta gratis en [vercel.com](https://vercel.com) (podés entrar con tu cuenta de Google).
2. Necesitás subir esta carpeta a GitHub primero:
   - Creá una cuenta en [github.com](https://github.com) si no tenés.
   - Creá un repositorio nuevo (ej: `la-caserita-web`).
   - Subí todos los archivos de esta carpeta ahí (GitHub te deja arrastrar y soltar los archivos desde la web, no hace falta usar comandos).
3. En Vercel, tocá **Add New → Project**, elegí el repositorio que acabás de crear.
4. Vercel detecta automáticamente que es un proyecto Vite — dejá la configuración como está.
5. Tocá **Deploy**. En un minuto te da un link tipo `la-caserita-web.vercel.app`.

Con eso ya está publicada. Cada vez que quieras cambiar el código (no el menú, eso se
edita desde la web con el PIN) subís los cambios a GitHub y Vercel actualiza solo.

---

## Cómo editar el menú día a día

Una vez publicado, para cambiar productos o precios **no hace falta tocar código**:

1. Abrí tu web publicada.
2. Tocá el ícono de engranaje (⚙️) arriba a la derecha.
3. Ingresá el PIN que pusiste en la hoja `Config`.
4. Editás lo que necesites y tocás "Guardar cambios".

Eso escribe directo en tu Google Sheet — también podés editar la planilla
directamente desde la app de Google Sheets en tu celular, y los cambios
se reflejan la próxima vez que alguien abra la web (no hace falta recargar el código).

---

## Preguntas frecuentes

**¿Las fotos que subí en la versión de Claude se pasan solas a esta versión?**
No. En esta versión las fotos van como **link** en vez de subir el archivo directo,
así que tenés que volver a cargarlas (subiéndolas a Drive u otro servicio y pegando el link).

**¿Puedo cambiar el PIN?**
Sí, editando directamente la celda B2... digo, A2 de la hoja `Config`.

**¿Qué pasa si dos personas editan el menú al mismo tiempo?**
Gana el último que guarda — no hay control de conflictos. Para un negocio chico
esto no suele ser un problema real.
