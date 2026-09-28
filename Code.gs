/**
 * CÓDIGO PARA GOOGLE APPS SCRIPT
 * -------------------------------
 * Este código conecta tu Google Sheet con la página web.
 * Instrucciones completas en el archivo README.md
 */

const MENU_SHEET_NAME = "Menu";
const CONFIG_SHEET_NAME = "Config";

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const menuSheet = ss.getSheetByName(MENU_SHEET_NAME);
  const configSheet = ss.getSheetByName(CONFIG_SHEET_NAME);

  const rows = menuSheet.getDataRange().getValues();
  rows.shift(); // saca la fila de encabezados

  const categoriesMap = {};
  rows.forEach((row) => {
    const [category, name, desc, price, image, id] = row;
    if (!category || !name) return;
    if (!categoriesMap[category]) categoriesMap[category] = [];
    categoriesMap[category].push({
      id: id || Utilities.getUuid().slice(0, 8),
      name: name,
      desc: desc || "",
      price: Number(price) || 0,
      image: image || "",
    });
  });

  const menu = Object.keys(categoriesMap).map((category) => ({
    category,
    items: categoriesMap[category],
  }));

  const configRow = configSheet.getRange(2, 1, 1, 2).getValues()[0];
  const deliveryNote = configRow[1] || "El costo de envío se coordina según la zona";

  return jsonResponse({ menu, deliveryNote });
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const configSheet = ss.getSheetByName(CONFIG_SHEET_NAME);
    const menuSheet = ss.getSheetByName(MENU_SHEET_NAME);

    const savedPin = configSheet.getRange(2, 1).getValue();
    if (String(body.pin) !== String(savedPin)) {
      return jsonResponse({ ok: false, error: "PIN incorrecto" });
    }

    // Reescribe toda la hoja de menú
    menuSheet.clearContents();
    menuSheet.getRange(1, 1, 1, 6).setValues([
      ["Categoria", "Producto", "Descripcion", "Precio", "ImagenURL", "ID"],
    ]);

    const rows = [];
    (body.menu || []).forEach((cat) => {
      cat.items.forEach((item) => {
        rows.push([cat.category, item.name, item.desc || "", item.price || 0, item.image || "", item.id]);
      });
    });
    if (rows.length > 0) {
      menuSheet.getRange(2, 1, rows.length, 6).setValues(rows);
    }

    // Actualiza la nota de delivery
    configSheet.getRange(2, 2).setValue(body.deliveryNote || "");

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) });
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
