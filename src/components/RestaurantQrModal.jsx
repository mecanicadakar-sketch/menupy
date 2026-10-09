import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import {
  QrCode,
  X,
  Download,
  Printer,
  Copy,
  Check,
  Share2,
  ExternalLink,
  Sparkles,
  UtensilsCrossed,
  Layers,
  Store,
  Maximize2,
  Globe,
  Tag,
  Info
} from "lucide-react";

// Limpia y formatea el nombre visible de un comercio para listas desplegables evitando exponer correos electrónicos
export const formatStoreOptionLabel = (s) => {
  if (!s) return "Comercio";
  let name = String(s.name || s.businessName || "").trim();

  // Eliminar cualquier dirección de email completa que aparezca en el texto
  name = name.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi, "").trim();
  name = name.replace(/_gmail_com/gi, "").replace(/_hotmail_com/gi, "").replace(/_yahoo_com/gi, "").trim();
  name = name.replace(/@.+$/g, "").trim();

  // Si el nombre contiene un @ que quedó cortado
  if (name.includes("@")) {
    name = name.split("@")[0];
  }

  // Limpiar guiones bajos, puntos, o paréntesis vacíos
  name = name.replace(/[._-]+/g, " ").replace(/\(\s*\)/g, "").trim();

  // Si el nombre quedó vacío o genérico o indefinido
  const lower = name.toLowerCase();
  if (!name || lower === "undefined" || lower === "null" || lower === "none" || lower === "comercio") {
    let raw = String(s.businessName || s.name || s.id || s.requestedUser || "Comercio");
    if (raw.includes("@")) {
      raw = raw.split("@")[0];
    }
    raw = raw
      .replace(/_gmail_com/gi, "")
      .replace(/_hotmail_com/gi, "")
      .replace(/store_/gi, "")
      .replace(/[._-]+/g, " ")
      .trim();

    name = raw || "Comercio";
  }

  // Capitalizar cada palabra para que quede un nombre limpio y profesional
  name = name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");

  // Asegurar que no quede ningún correo ni terminación de dominio
  name = name.replace(/\.com(\.py)?/gi, "").trim();

  return name || "Comercio";
};

export default function RestaurantQrModal({
  isOpen = false,
  onClose,
  restaurant = {},
  currentStoreId = "menupy",
  allStores = [],
  isSuperAdmin = false,
  inline = false,
  onOpenModal = null,
}) {
  const [selectedStoreId, setSelectedStoreId] = useState(currentStoreId || "menupy");
  const [qrType, setQrType] = useState("general"); // "general", "table", "takeaway", "delivery"
  const [selectedTable, setSelectedTable] = useState("1");
  const [batchMaxTables, setBatchMaxTables] = useState("10");
  const [qrColor, setQrColor] = useState("#000000");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedFriendly, setCopiedFriendly] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [printStatus, setPrintStatus] = useState("");

  // Opciones de Dominio Base: Producción Oficial (menu-py.vercel.app) vs Personalizado
  const [domainMode, setDomainMode] = useState("production"); // "production" | "custom"
  const [customDomain, setCustomDomain] = useState("https://menu-py.vercel.app");

  // Modo de Identificador / Slug en la URL
  const [slugMode, setSlugMode] = useState("clean"); // "clean" (ej: lacaserita) | "exact"

  // Sincronizar tienda seleccionada
  useEffect(() => {
    if (currentStoreId) {
      setSelectedStoreId(currentStoreId);
    }
  }, [currentStoreId]);

  // Obtener datos del comercio seleccionado de forma ultra-segura
  const safeAllStores = Array.isArray(allStores) ? allStores : [];
  const foundStore = safeAllStores.find((s) => s && (s.id === selectedStoreId || s.requestedUser === selectedStoreId));
  const activeStore = foundStore || {
    id: selectedStoreId || "losamigos",
    name: restaurant?.name || "Menu Py",
    phoneDisplay: restaurant?.phoneDisplay,
    phoneIntl: restaurant?.phoneIntl,
    ...restaurant,
  };

  const rawStoreName = activeStore?.name || activeStore?.businessName || restaurant?.name || "Menu Py";
  const storeName = String(rawStoreName || "Menu Py");

  const rawPhone = activeStore?.phoneDisplay || activeStore?.phoneIntl || restaurant?.phoneDisplay || restaurant?.phoneIntl || "595975635770";
  const storePhone = String(rawPhone || "595975635770");
  const cleanPhoneDigits = storePhone.replace(/[^\d]/g, "") || "595975635770";

  // Calcular slug limpio para evitar exponer correos o nombres largos en el código QR físico
  const cleanStoreSlug = (() => {
    const rawName = activeStore?.name || activeStore?.businessName || "";
    const bizSlug = String(rawName).toLowerCase().replace(/[^a-z0-9]/g, "");
    
    // Si tiene un nombre de fantasía no genérico, usarlo
    if (bizSlug && bizSlug !== "menupy" && bizSlug !== "losamigos" && bizSlug !== "demo") {
      return bizSlug;
    }

    const rawUser = String(selectedStoreId || currentStoreId || "losamigos");
    if (rawUser.includes("@")) {
      return rawUser.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
    }
    return rawUser.toLowerCase().replace(/[^a-z0-9]/g, "") || "losamigos";
  })();

  const rawExact = String(selectedStoreId || currentStoreId || "losamigos");
  const sanitizedExact = rawExact.includes("@")
    ? rawExact.split("@")[0].toLowerCase().replace(/[^a-z0-9_-]/g, "")
    : rawExact.replace(/_gmail_com/gi, "").replace(/_hotmail_com/gi, "");

  const effectiveTargetId = slugMode === "clean" ? cleanStoreSlug : (sanitizedExact || "losamigos");

  // Dominio base efectivo
  const getActiveDomain = () => {
    if (domainMode === "custom") {
      let d = (customDomain || "").trim();
      if (!d) return "https://menu-py.vercel.app";
      if (!d.startsWith("http://") && !d.startsWith("https://")) d = `https://${d}`;
      return d.replace(/\/+$/, "");
    }
    return "https://menu-py.vercel.app";
  };

  // Calcular la URL completa del menú para este local específico
  const getMenuUrl = (tableNum = null) => {
    try {
      const origin = getActiveDomain();
      const params = new URLSearchParams();

      // Siempre vincular el identificador exacto de este comercio
      params.set("comercio", effectiveTargetId);

      if (qrType === "table") {
        params.set("mesa", String(tableNum || selectedTable || "1"));
        params.set("modo", "mesa");
      } else if (qrType === "takeaway") {
        params.set("modo", "retiro");
      } else if (qrType === "delivery") {
        params.set("modo", "delivery");
      }

      const queryString = params.toString();
      return `${origin}/?${queryString}`;
    } catch {
      return `https://menu-py.vercel.app/?comercio=${effectiveTargetId}`;
    }
  };

  const getFriendlyMenuUrl = (tableNum = null) => {
    try {
      const origin = getActiveDomain();
      const params = new URLSearchParams();

      if (qrType === "table") {
        params.set("mesa", String(tableNum || selectedTable || "1"));
        params.set("modo", "mesa");
      } else if (qrType === "takeaway") {
        params.set("modo", "retiro");
      } else if (qrType === "delivery") {
        params.set("modo", "delivery");
      }

      const queryString = params.toString();
      return queryString ? `${origin}/${effectiveTargetId}?${queryString}` : `${origin}/${effectiveTargetId}`;
    } catch {
      return `https://menu-py.vercel.app/${effectiveTargetId}`;
    }
  };

  const currentMenuUrl = getMenuUrl();
  const currentFriendlyUrl = getFriendlyMenuUrl();

  // Generar código QR reactivamente con respaldo local + servicio fallback
  useEffect(() => {
    if (!inline && !isOpen) return;
    let isMounted = true;
    setGenerating(true);

    const generateQR = async () => {
      const urlToEncode = currentMenuUrl;
      let resultUrl = "";

      try {
        resultUrl = await QRCode.toDataURL(urlToEncode, {
          width: 600,
          margin: 2,
          color: {
            dark: qrColor || "#000000",
            light: "#FFFFFF",
          },
          errorCorrectionLevel: "H",
        });
      } catch (err) {
        console.warn("Fallo local QRCode, utilizando generador alternativo:", err);
        const cleanColor = String(qrColor || "#000000").replace("#", "");
        resultUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(
          urlToEncode
        )}&color=${cleanColor}`;
      }

      if (isMounted) {
        setQrDataUrl(resultUrl);
        setGenerating(false);
      }
    };

    generateQR();

    return () => {
      isMounted = false;
    };
  }, [inline, isOpen, currentMenuUrl, qrColor, selectedStoreId, qrType, selectedTable, domainMode, slugMode, customDomain]);

  // Copiar link al portapapeles
  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(currentMenuUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // Compartir enlace
  const handleShare = () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator
        .share({
          title: `Menú Digital de ${storeName}`,
          text: `¡Hacé tu pedido online en ${storeName}! Escaneá el QR o ingresá a nuestro menú interactivo:`,
          url: currentMenuUrl,
        })
        .catch(() => {});
    } else {
      const waUrl = `https://wa.me/?text=${encodeURIComponent(
        `¡Hacé tu pedido online en ${storeName}! Escaneá el QR o abrí nuestro menú aquí: ${currentMenuUrl}`
      )}`;
      try {
        window.open(waUrl, "_blank");
      } catch {}
    }
  };

  // Helper para dibujar rectángulos redondeados con compatibilidad cross-browser
  const drawRoundedRect = (ctx, x, y, width, height, radius) => {
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(x, y, width, height, radius);
    } else {
      ctx.rect(x, y, width, height);
    }
  };

  // Descargar imagen compuesta de alta resolución (1000x1250)
  const handleDownloadHiRes = () => {
    if (!qrDataUrl) return;

    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1000;
      canvas.height = 1250;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Fondo degradado elegante
      const grad = ctx.createLinearGradient(0, 0, 0, 1250);
      grad.addColorStop(0, "#FFFDF9");
      grad.addColorStop(1, "#FBF7EE");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1000, 1250);

      // Borde exterior
      ctx.strokeStyle = "#E5D9C3";
      ctx.lineWidth = 14;
      ctx.strokeRect(30, 30, 940, 1190);

      // Marco interior dorado fino
      ctx.strokeStyle = "#F59E0B";
      ctx.lineWidth = 3;
      ctx.strokeRect(44, 44, 912, 1162);

      // Encabezado: Nombre del Restaurante
      ctx.fillStyle = "#1C1917";
      ctx.font = "bold 44px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(storeName.toUpperCase(), 500, 130);

      // Subtítulo
      ctx.fillStyle = "#B45309";
      ctx.font = "bold 24px sans-serif";
      ctx.fillText("CARTA DIGITAL • PEDIDOS POR WHATSAPP", 500, 175);

      // Badge según tipo
      if (qrType === "table") {
        ctx.fillStyle = "#F59E0B";
        ctx.beginPath();
        drawRoundedRect(ctx, 350, 210, 300, 56, 28);
        ctx.fill();

        ctx.fillStyle = "#1C1917";
        ctx.font = "900 28px sans-serif";
        ctx.fillText(`MESA N° ${selectedTable}`, 500, 248);
      } else if (qrType === "takeaway") {
        ctx.fillStyle = "#3B82F6";
        ctx.beginPath();
        drawRoundedRect(ctx, 320, 210, 360, 56, 28);
        ctx.fill();

        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 26px sans-serif";
        ctx.fillText("MOSTRADOR / RETIRO", 500, 248);
      } else if (qrType === "delivery") {
        ctx.fillStyle = "#10B981";
        ctx.beginPath();
        drawRoundedRect(ctx, 340, 210, 320, 56, 28);
        ctx.fill();

        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 26px sans-serif";
        ctx.fillText("DELIVERY A DOMICILIO", 500, 248);
      }

      // Dibujar Código QR
      const qrImg = new Image();
      qrImg.crossOrigin = "anonymous";
      qrImg.onload = () => {
        ctx.fillStyle = "#FFFFFF";
        ctx.shadowColor = "rgba(0, 0, 0, 0.12)";
        ctx.shadowBlur = 24;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 10;
        ctx.beginPath();
        drawRoundedRect(ctx, 175, 295, 650, 650, 32);
        ctx.fill();
        ctx.shadowColor = "transparent";

        ctx.drawImage(qrImg, 210, 330, 580, 580);

        // Frase llamativa
        ctx.fillStyle = "#1C1917";
        ctx.font = "900 36px sans-serif";
        ctx.fillText("¡Escaneá el código QR y hacé tu pedido!", 500, 1020);

        ctx.fillStyle = "#57534E";
        ctx.font = "500 22px sans-serif";
        ctx.fillText("Abrí la cámara de tu celular, apuntá al QR y elegí tus platos favoritos.", 500, 1065);

        // Pie de marca
        ctx.fillStyle = "#92400E";
        ctx.font = "bold 20px sans-serif";
        ctx.fillText("Tecnología de Menú Digital • MenuPY", 500, 1140);

        // Descarga
        const link = document.createElement("a");
        const cleanFileName = `QR_${storeName.replace(/[^a-z0-9]/gi, "_")}${
          qrType === "table" ? `_Mesa_${selectedTable}` : ""
        }.png`;
        link.download = cleanFileName;
        link.href = canvas.toDataURL("image/png");
        link.click();
      };
      qrImg.src = qrDataUrl;
    } catch (e) {
      console.error("Error al exportar imagen QR:", e);
    }
  };

  // Helper para impresión tolerante a bloqueos de ventanas emergentes (usa iframe oculto si window.open falla)
  const safePrintHtml = (htmlContent) => {
    setPrintStatus("Preparando impresión...");
    try {
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        setPrintStatus("");
        return;
      }
    } catch {}

    // Fallback con iframe invisible
    try {
      const existingIframe = document.getElementById("qr-print-frame");
      if (existingIframe) existingIframe.remove();

      const iframe = document.createElement("iframe");
      iframe.id = "qr-print-frame";
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (doc) {
        doc.open();
        doc.write(htmlContent);
        doc.close();
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch {}
          setPrintStatus("");
        }, 700);
      }
    } catch (e) {
      console.error("Error al imprimir:", e);
      setPrintStatus("No se pudo abrir el cuadro de impresión");
      setTimeout(() => setPrintStatus(""), 3000);
    }
  };

  // Imprimir cartel de mesa individual en formato Porta-Menú
  const handlePrintSingle = () => {
    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Imprimir QR - ${storeName} ${qrType === "table" ? `Mesa ${selectedTable}` : ""}</title>
        <style>
          @page { size: A5 portrait; margin: 0; }
          body {
            margin: 0;
            padding: 30px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background: #ffffff;
            color: #1c1917;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            box-sizing: border-box;
          }
          .card {
            width: 100%;
            max-width: 480px;
            border: 4px solid #1c1917;
            border-radius: 28px;
            padding: 36px 24px;
            text-align: center;
            background: #fffdfa;
            box-sizing: border-box;
          }
          .brand {
            font-size: 28px;
            font-weight: 900;
            letter-spacing: -0.5px;
            text-transform: uppercase;
            margin-bottom: 6px;
          }
          .subtitle {
            font-size: 13px;
            font-weight: 700;
            color: #b45309;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 20px;
          }
          .badge {
            display: inline-block;
            background: #f59e0b;
            color: #1c1917;
            font-weight: 900;
            font-size: 18px;
            padding: 6px 24px;
            border-radius: 999px;
            margin-bottom: 20px;
          }
          .qr-box {
            background: #ffffff;
            padding: 16px;
            border-radius: 20px;
            border: 2px solid #e7e5e4;
            display: inline-block;
            margin-bottom: 20px;
          }
          .qr-box img {
            width: 260px;
            height: 260px;
            display: block;
          }
          .cta {
            font-size: 22px;
            font-weight: 900;
            margin-bottom: 8px;
          }
          .desc {
            font-size: 13px;
            color: #57534e;
            margin-bottom: 20px;
            line-height: 1.4;
          }
          .footer {
            font-size: 11px;
            font-weight: 700;
            color: #a8a29e;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-top: 1px dashed #e7e5e4;
            padding-top: 14px;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="brand">${storeName}</div>
          <div class="subtitle">Carta Digital Interactiva</div>
          ${qrType === "table" ? `<div class="badge">MESA N° ${selectedTable}</div>` : ""}
          <div class="qr-box">
            <img src="${qrDataUrl}" alt="Código QR" />
          </div>
          <div class="cta">¡Escaneá el QR y hacé tu pedido!</div>
          <div class="desc">Apuntá la cámara de tu celular para ver el menú completo con fotos, precios y pedir directo por WhatsApp.</div>
          <div style="margin-top: 10px; font-weight: 800; font-size: 13px; color: #15803d;">📲 Pedidos por WhatsApp: +${cleanPhoneDigits}</div>
          <div class="footer">Menú Py • Pedidos gastronómicos inteligentes</div>
        </div>
        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `;
    safePrintHtml(html);
  };

  // Imprimir lote completo de carteles para todas las mesas (1 a N)
  const handlePrintBatchTables = async () => {
    const max = Math.min(Math.max(parseInt(batchMaxTables, 10) || 1, 1), 50);
    setPrintStatus(`Generando ${max} carteles de mesa...`);
    const tableCards = [];

    for (let i = 1; i <= max; i++) {
      const url = getMenuUrl(i);
      let dataUrl = "";
      try {
        dataUrl = await QRCode.toDataURL(url, {
          width: 320,
          margin: 2,
          color: { dark: qrColor || "#000000", light: "#FFFFFF" },
          errorCorrectionLevel: "H",
        });
      } catch {
        const cleanColor = String(qrColor || "#000000").replace("#", "");
        dataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(
          url
        )}&color=${cleanColor}`;
      }
      tableCards.push({ tableNum: i, dataUrl });
    }

    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Lote de Carteles de Mesa - ${storeName}</title>
        <style>
          @page { size: A4 portrait; margin: 12mm; }
          body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #ffffff;
            color: #1c1917;
          }
          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            grid-gap: 16mm;
          }
          .card {
            border: 3px solid #1c1917;
            border-radius: 20px;
            padding: 16px;
            text-align: center;
            background: #fffdfa;
            page-break-inside: avoid;
            box-sizing: border-box;
          }
          .brand {
            font-size: 18px;
            font-weight: 900;
            text-transform: uppercase;
            margin-bottom: 2px;
          }
          .badge {
            display: inline-block;
            background: #f59e0b;
            color: #1c1917;
            font-weight: 900;
            font-size: 14px;
            padding: 3px 14px;
            border-radius: 999px;
            margin: 6px 0 10px 0;
          }
          .qr-img {
            width: 170px;
            height: 170px;
            margin: 0 auto 8px auto;
            display: block;
            border: 1px solid #e7e5e4;
            border-radius: 12px;
            padding: 6px;
            background: white;
          }
          .cta {
            font-size: 14px;
            font-weight: 800;
            margin-bottom: 4px;
          }
          .desc {
            font-size: 10px;
            color: #57534e;
            line-height: 1.3;
          }
        </style>
      </head>
      <body>
        <div class="grid">
          ${tableCards
            .map(
              (c) => `
            <div class="card">
              <div class="brand">${storeName}</div>
              <div class="badge">MESA N° ${c.tableNum}</div>
              <img src="${c.dataUrl}" class="qr-img" />
              <div class="cta">Escaneá el QR y hacé tu pedido</div>
              <div class="desc">Menú digital interactivo en tu mesa • WhatsApp: +${cleanPhoneDigits}</div>
            </div>
          `
            )
            .join("")}
        </div>
        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `;
    safePrintHtml(html);
  };

  const currentOrigin = "https://menu-py.vercel.app";

  const modalBody = (
    <div className={`w-full bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col ${inline ? "max-h-none shadow-md" : "max-h-[92vh]"}`}>
      {/* Encabezado Principal */}
      <div className="relative bg-gradient-to-r from-stone-900 via-amber-950 to-stone-900 p-5 sm:p-6 text-white text-center">
        {!inline && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
            title="Cerrar ventana"
          >
            <X size={20} />
          </button>
        )}

        {inline && onOpenModal && (
          <button
            type="button"
            onClick={onOpenModal}
            className="absolute right-4 top-4 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-amber-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            title="Abrir en ventana emergente"
          >
            <Maximize2 size={14} />
            <span className="hidden sm:inline">Ventana Emergente</span>
          </button>
        )}

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 font-bold text-[11px] mb-2 uppercase tracking-wider">
          <QrCode size={13} />
          <span>Generador de Códigos QR Menú y Mesas</span>
        </div>

        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
          <span>{storeName}</span>
        </h2>

        <p className="text-xs text-amber-100/90 font-medium mt-1 max-w-md mx-auto">
          Generá códigos QR interactivos únicos para que tus clientes escaneen desde la mesa o el mostrador y hagan sus pedidos en el acto.
        </p>
      </div>

      {/* Contenido */}
      <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
        
        {/* SELECCIÓN DE DOMINIO BASE: PRODUCCIÓN (VERCEL) VS PERSONALIZADO */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-400/60 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Globe size={18} className="text-amber-700 shrink-0" />
              <div>
                <span className="text-xs font-black text-stone-900 block uppercase tracking-wide">
                  Dominio Destino del Código QR:
                </span>
                <span className="text-[11px] text-stone-600">
                  Elegí si el QR debe apuntar a la web oficial de Menu Py o a tu dominio web personalizado.
                </span>
              </div>
            </div>
            {domainMode === "production" && (
              <span className="self-start sm:self-auto px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-600 text-white shadow-xs shrink-0 flex items-center gap-1">
                <Check size={12} /> Cartelería Definitiva
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setDomainMode("production")}
              className={`p-3 rounded-xl border-2 text-left transition cursor-pointer flex flex-col justify-between ${
                domainMode === "production"
                  ? "border-emerald-600 bg-white text-emerald-950 font-bold shadow-sm ring-2 ring-emerald-400/40"
                  : "border-stone-200 bg-stone-50 hover:bg-white text-stone-700"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black flex items-center gap-1.5 text-emerald-800">
                  <Globe size={14} /> menu-py.vercel.app
                </span>
                {domainMode === "production" && <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
              </div>
              <span className="text-[11px] text-stone-600 leading-tight">
                <b>Oficial en Producción</b>. Recomendado para imprimir carteles físicos y mesas para que los códigos nunca caduquen.
              </span>
            </button>

            <button
              type="button"
              onClick={() => setDomainMode("custom")}
              className={`p-3 rounded-xl border-2 text-left transition cursor-pointer flex flex-col justify-between ${
                domainMode === "custom"
                  ? "border-amber-500 bg-white text-amber-950 font-bold shadow-sm ring-2 ring-amber-400/40"
                  : "border-stone-200 bg-stone-50 hover:bg-white text-stone-700"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black text-stone-800">Personalizado</span>
                {domainMode === "custom" && <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />}
              </div>
              <span className="text-[11px] text-stone-600 leading-tight">
                Ingresá tu propio dominio o subdominio web registrado para tu restaurante.
              </span>
            </button>
          </div>

          {domainMode === "custom" && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs font-bold text-stone-700 shrink-0">URL Dominio:</span>
              <input
                type="text"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                placeholder="https://tudominio.com"
                className="flex-1 p-2 rounded-xl border border-stone-300 text-xs font-mono bg-white text-stone-900"
              />
            </div>
          )}

          <div className="flex items-start gap-1.5 text-[11px] text-stone-600 bg-white/80 p-2.5 rounded-xl border border-amber-200/80">
            <Info size={14} className="text-amber-700 shrink-0 mt-0.5" />
            <span>
              <b>Recomendación para impresión:</b> Dejá seleccionado <b>menu-py.vercel.app</b> o tu dominio personalizado para imprimir carteles físicos y mesas para que los códigos nunca caduquen.
            </span>
          </div>
        </div>

        {/* IDENTIFICADOR DEL COMERCIO EN EL QR (SLUG LIMPIO VS IDENTIFICADOR DIRECTO) */}
        <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Tag size={16} className="text-amber-600 shrink-0" />
              <div>
                <span className="text-xs font-bold text-stone-900 block">
                  Identificador del Local en el Enlace:
                </span>
                <span className="text-[11px] text-stone-500">
                  Elegí si querés el enlace amigable (ej: <code>/{cleanStoreSlug}</code>) o el usuario completo.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setSlugMode("clean")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  slugMode === "clean"
                    ? "bg-amber-500 text-stone-950 shadow-xs"
                    : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-300"
                }`}
                title="Enlace limpio y profesional del local"
              >
                Limpio: /{cleanStoreSlug}
              </button>
              <button
                type="button"
                onClick={() => setSlugMode("exact")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  slugMode === "exact"
                    ? "bg-amber-500 text-stone-950 shadow-xs"
                    : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-300"
                }`}
                title="Identificador exacto con el que fue registrado el comercio"
              >
                ID Completo
              </button>
            </div>
          </div>
        </div>

        {/* Selector de Restaurante si hay varios comercios o es Superadmin */}
        {(isSuperAdmin || safeAllStores.length > 1) && (
          <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
            <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1.5">
              <Store size={14} className="text-amber-600" />
              <span>Restaurante / Comercio:</span>
            </label>
            <select
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-stone-300 bg-white text-xs sm:text-sm font-bold text-stone-900 focus:border-amber-500 focus:outline-none"
            >
              {safeAllStores.length > 0 ? (
                safeAllStores
                  .filter((s, idx, arr) => {
                    const id = s?.id || s?.requestedUser;
                    return id && arr.findIndex((x) => (x?.id || x?.requestedUser) === id) === idx;
                  })
                  .map((s) => (
                    <option key={s.id || s.requestedUser} value={s.id || s.requestedUser}>
                      {formatStoreOptionLabel(s)}
                    </option>
                  ))
              ) : (
                <option value={selectedStoreId}>{formatStoreOptionLabel(activeStore)}</option>
              )}
            </select>
          </div>
        )}

        {/* Badge informativo de WhatsApp asociado al local */}
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
            <div>
              <span className="font-bold block text-emerald-900">WhatsApp Oficial de este Local:</span>
              <span className="text-[11px] text-emerald-700">
                Los clientes que escaneen este QR enviarán sus pedidos directamente a este número.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <span className="font-mono font-black text-xs text-emerald-950 bg-white px-2.5 py-1 rounded-xl border border-emerald-300 shadow-xs">
              +{cleanPhoneDigits}
            </span>
          </div>
        </div>

        {/* Selector de Tipo de Enlace */}
        <div>
          <label className="block text-xs font-bold text-stone-700 mb-2 uppercase tracking-wider">
            1. Seleccioná el Destino del Código QR:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setQrType("general")}
              className={`p-3 rounded-2xl text-left border-2 transition flex flex-col justify-between cursor-pointer ${
                qrType === "general"
                  ? "border-amber-500 bg-amber-50/80 text-amber-950 font-bold shadow-sm"
                  : "border-stone-200 hover:border-stone-300 bg-white text-stone-700"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <UtensilsCrossed size={16} className={qrType === "general" ? "text-amber-600" : "text-stone-400"} />
                {qrType === "general" && <span className="w-2 h-2 rounded-full bg-amber-500" />}
              </div>
              <span className="text-xs font-black block">Carta General</span>
              <span className="text-[10px] text-stone-500 leading-tight">Menú completo libre</span>
            </button>

            <button
              type="button"
              onClick={() => setQrType("table")}
              className={`p-3 rounded-2xl text-left border-2 transition flex flex-col justify-between cursor-pointer ${
                qrType === "table"
                  ? "border-amber-500 bg-amber-50/80 text-amber-950 font-bold shadow-sm"
                  : "border-stone-200 hover:border-stone-300 bg-white text-stone-700"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <Layers size={16} className={qrType === "table" ? "text-amber-600" : "text-stone-400"} />
                {qrType === "table" && <span className="w-2 h-2 rounded-full bg-amber-500" />}
              </div>
              <span className="text-xs font-black block">Mesa Específica</span>
              <span className="text-[10px] text-stone-500 leading-tight">Preselecciona la mesa</span>
            </button>

            <button
              type="button"
              onClick={() => setQrType("takeaway")}
              className={`p-3 rounded-2xl text-left border-2 transition flex flex-col justify-between cursor-pointer ${
                qrType === "takeaway"
                  ? "border-amber-500 bg-amber-50/80 text-amber-950 font-bold shadow-sm"
                  : "border-stone-200 hover:border-stone-300 bg-white text-stone-700"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <Store size={16} className={qrType === "takeaway" ? "text-amber-600" : "text-stone-400"} />
                {qrType === "takeaway" && <span className="w-2 h-2 rounded-full bg-amber-500" />}
              </div>
              <span className="text-xs font-black block">Mostrador</span>
              <span className="text-[10px] text-stone-500 leading-tight">Para retiro en local</span>
            </button>

            <button
              type="button"
              onClick={() => setQrType("delivery")}
              className={`p-3 rounded-2xl text-left border-2 transition flex flex-col justify-between cursor-pointer ${
                qrType === "delivery"
                  ? "border-amber-500 bg-amber-50/80 text-amber-950 font-bold shadow-sm"
                  : "border-stone-200 hover:border-stone-300 bg-white text-stone-700"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <Sparkles size={16} className={qrType === "delivery" ? "text-amber-600" : "text-stone-400"} />
                {qrType === "delivery" && <span className="w-2 h-2 rounded-full bg-amber-500" />}
              </div>
              <span className="text-xs font-black block">Delivery</span>
              <span className="text-[10px] text-stone-500 leading-tight">Envío a domicilio</span>
            </button>
          </div>
        </div>

        {/* Opciones adicionales si es mesa específica */}
        {qrType === "table" && (
          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
            <div>
              <span className="text-xs font-bold text-amber-950 block">Número de Mesa para este QR:</span>
              <span className="text-[11px] text-amber-800">
                Al escanear, la app abrirá el menú con la <b>Mesa {selectedTable}</b> seleccionada automáticamente.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-stone-600">Mesa N°:</span>
              <input
                type="number"
                min="1"
                max="999"
                value={selectedTable}
                onChange={(e) => setSelectedTable(e.target.value)}
                className="w-20 p-2 text-center rounded-xl font-black text-sm border-2 border-amber-400 bg-white focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Visualización del Código QR y Personalización */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center bg-stone-50 p-5 rounded-2xl border border-stone-200">
          {/* Visualizador del QR */}
          <div className="md:col-span-5 flex flex-col items-center justify-center">
            <div className="relative p-3.5 bg-white rounded-2xl shadow-md border border-stone-200 group">
              {generating ? (
                <div className="w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center">
                  <span className="text-xs text-stone-400 animate-pulse">Generando QR...</span>
                </div>
              ) : qrDataUrl ? (
                <div className="relative">
                  <img
                    src={qrDataUrl}
                    alt={`Código QR ${storeName}`}
                    className="w-48 h-48 sm:w-56 sm:h-56 block rounded-lg select-none"
                  />
                  {/* Badge decorativo en la esquina */}
                  <div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full bg-amber-500 text-stone-950 text-[10px] font-black shadow">
                    {qrType === "table" ? `Mesa ${selectedTable}` : "MenuPY"}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Botón rápido de vista previa */}
            <a
              href={currentMenuUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 text-[11px] font-bold text-amber-900 hover:text-amber-700 hover:underline flex items-center gap-1"
            >
              <span>Probar enlace en nueva pestaña</span>
              <ExternalLink size={12} />
            </a>
          </div>

          {/* Opciones de Estilo y Enlace */}
          <div className="md:col-span-7 space-y-4">
            {/* Selector de Color */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">
                Color del Código QR:
              </label>
              <div className="flex items-center gap-2">
                {[
                  { id: "#000000", label: "Negro", bg: "bg-black" },
                  { id: "#D97706", label: "Ámbar", bg: "bg-amber-600" },
                  { id: "#059669", label: "Verde", bg: "bg-emerald-600" },
                  { id: "#DC2626", label: "Rojo", bg: "bg-red-600" },
                  { id: "#1E3A8A", label: "Azul", bg: "bg-blue-900" },
                ].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setQrColor(c.id)}
                    className={`w-8 h-8 rounded-full ${c.bg} flex items-center justify-center transition cursor-pointer ${
                      qrColor === c.id ? "ring-4 ring-amber-300 scale-110 shadow" : "opacity-80 hover:opacity-100"
                    }`}
                    title={c.label}
                  >
                    {qrColor === c.id && <Check size={14} className="text-white drop-shadow" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Input con enlace para copiar */}
            <div className="space-y-2">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-stone-700">
                    Enlace Universal del QR:
                  </label>
                  <span className="text-[10px] text-stone-500 font-medium">Recomendado para mesas y carteles</span>
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={currentMenuUrl}
                    className="flex-1 p-2 rounded-xl text-xs font-mono bg-white border border-stone-300 text-stone-700 select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer ${
                      copiedLink
                        ? "bg-emerald-600 text-white"
                        : "bg-stone-800 hover:bg-stone-900 text-white"
                    }`}
                  >
                    {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedLink ? "¡Copiado!" : "Copiar"}</span>
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-stone-700">
                    Enlace Corto y Amigable:
                  </label>
                  <span className="text-[10px] text-stone-500 font-medium">Ideal para redes sociales y WhatsApp</span>
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={currentFriendlyUrl}
                    className="flex-1 p-2 rounded-xl text-xs font-mono bg-white border border-stone-300 text-stone-700 select-all"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        navigator.clipboard.writeText(currentFriendlyUrl);
                        setCopiedFriendly(true);
                        setTimeout(() => setCopiedFriendly(false), 2500);
                      } catch {}
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer ${
                      copiedFriendly
                        ? "bg-emerald-600 text-white"
                        : "bg-amber-600 hover:bg-amber-700 text-white"
                    }`}
                  >
                    {copiedFriendly ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedFriendly ? "¡Copiado!" : "Copiar"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Botones de acción principales */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleDownloadHiRes}
                className="w-full py-2.5 px-3 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-600 text-stone-950 flex items-center justify-center gap-1.5 shadow transition active:scale-[0.98] cursor-pointer"
              >
                <Download size={15} />
                <span>Descargar PNG HD</span>
              </button>

              <button
                type="button"
                onClick={handlePrintSingle}
                className="w-full py-2.5 px-3 rounded-xl font-bold text-xs bg-stone-900 hover:bg-stone-800 text-white flex items-center justify-center gap-1.5 shadow transition active:scale-[0.98] cursor-pointer"
              >
                <Printer size={15} />
                <span>Imprimir Cartel</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleShare}
              className="w-full py-2 px-3 rounded-xl font-bold text-xs border border-stone-300 hover:bg-white text-stone-700 flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Share2 size={14} />
              <span>Compartir enlace por WhatsApp / Redes</span>
            </button>
          </div>
        </div>

        {/* Herramienta Pro: Generador e Impresor en Lote para Salón Completo */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 via-stone-50 to-amber-50 border border-amber-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-black text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                <Printer size={15} className="text-amber-600" />
                <span>Impresión Masiva de Carteles para Todo el Salón</span>
              </h4>
              <p className="text-[11px] text-stone-600 mt-0.5">
                Generá e imprimí automáticamente los carteles de mesa desde la Mesa 1 hasta la cantidad que tengas.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold text-stone-700">Cantidad de Mesas:</span>
              <input
                type="number"
                min="1"
                max="50"
                value={batchMaxTables}
                onChange={(e) => setBatchMaxTables(e.target.value)}
                className="w-16 p-1.5 text-center rounded-xl font-bold text-xs border border-stone-300 bg-white"
              />
              <button
                type="button"
                onClick={handlePrintBatchTables}
                className="py-1.5 px-3.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-stone-950 shadow flex items-center gap-1.5 transition cursor-pointer"
              >
                <Printer size={14} />
                <span>Imprimir {batchMaxTables} Mesas</span>
              </button>
            </div>
          </div>
        </div>

        {printStatus && (
          <div className="text-center text-xs font-bold text-amber-700 animate-pulse">
            {printStatus}
          </div>
        )}
      </div>

      {/* Footer del Diálogo */}
      {!inline && onClose && (
        <div className="p-3 bg-stone-100 border-t border-stone-200 flex items-center justify-end text-xs">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl font-bold bg-stone-200 hover:bg-stone-300 text-stone-800 transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      )}
    </div>
  );

  if (!inline && !isOpen) {
    return null;
  }

  if (inline) {
    return (
      <div className="w-full max-w-5xl mx-auto my-4 animate-fadeIn">
        {modalBody}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-stone-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl">
        {modalBody}
      </div>
    </div>
  );
}
