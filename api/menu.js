// api/menu.js
// Conexión persistente multi-comercio con base de datos en disco (data/caserita_db.json)
// y fallback a base de datos Neon (si DATABASE_URL está configurada).

import { neon } from "@neondatabase/serverless";
import { loadDb, saveDb, findStore, getActiveStore } from "./db.js";

// Configuración y memoria de seguridad anti-fuerza bruta por IP
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutos de bloqueo
const ipAttempts = new Map();

function getClientIp(req) {
  const forwarded = req.headers && (req.headers["x-forwarded-for"] || req.headers["x-real-ip"]);
  if (forwarded) {
    return String(forwarded).split(",")[0].trim();
  }
  return (
    req.ip ||
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress ||
    "127.0.0.1"
  );
}

function getIpSecurityStatus(ip) {
  const data = ipAttempts.get(ip);
  if (!data) return { locked: false, attemptsLeft: MAX_FAILED_ATTEMPTS, remainingSeconds: 0 };
  if (data.lockedUntil && Date.now() < data.lockedUntil) {
    const remainingSeconds = Math.ceil((data.lockedUntil - Date.now()) / 1000);
    return { locked: true, attemptsLeft: 0, remainingSeconds };
  }
  if (data.lockedUntil && Date.now() >= data.lockedUntil) {
    ipAttempts.delete(ip);
    return { locked: false, attemptsLeft: MAX_FAILED_ATTEMPTS, remainingSeconds: 0 };
  }
  const attemptsLeft = Math.max(0, MAX_FAILED_ATTEMPTS - (data.count || 0));
  return { locked: false, attemptsLeft, remainingSeconds: 0 };
}

function registerFailedAttempt(ip) {
  let data = ipAttempts.get(ip) || { count: 0, lockedUntil: null, lastAttempt: 0 };
  data.count = (data.count || 0) + 1;
  data.lastAttempt = Date.now();
  if (data.count >= MAX_FAILED_ATTEMPTS) {
    data.lockedUntil = Date.now() + LOCKOUT_MS;
    ipAttempts.set(ip, data);
    return {
      locked: true,
      attemptsLeft: 0,
      remainingSeconds: Math.ceil(LOCKOUT_MS / 1000),
      error: `Seguridad: Has superado los ${MAX_FAILED_ATTEMPTS} intentos fallidos permitidos. Tu dirección IP (${ip}) ha sido bloqueada temporalmente durante 15 minutos.`
    };
  }
  ipAttempts.set(ip, data);
  const attemptsLeft = MAX_FAILED_ATTEMPTS - data.count;
  return {
    locked: false,
    attemptsLeft,
    remainingSeconds: 0,
    error: `Credenciales incorrectas. Te quedan ${attemptsLeft} intento(s) antes del bloqueo de IP.`
  };
}

function resetIpAttempts(ip) {
  ipAttempts.delete(ip);
}

function sendJson(res, statusCode, data) {
  if (typeof res.status === "function" && typeof res.json === "function") {
    return res.status(statusCode).json(data);
  }
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

async function parseBody(req) {
  if (req.body !== undefined && req.body !== null) {
    return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  }
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        console.warn("[API] Error parseando body JSON:", e.message);
        resolve({});
      }
    });
    req.on("error", () => resolve({}));
  });
}

function isValidPostgresUrl(str) {
  if (!str || typeof str !== "string") return false;
  const trimmed = str.trim();
  return trimmed.startsWith("postgresql://") || trimmed.startsWith("postgres://");
}

let cachedSqlClient = undefined;

function getSqlClient() {
  if (cachedSqlClient !== undefined) return cachedSqlClient;
  const rawUrl = (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.caseritas_POSTGRES_URL ||
    process.env.caseritas_URL_DE_LA_BASE_DE_DATOS ||
    ""
  ).trim();
  if (!isValidPostgresUrl(rawUrl)) {
    cachedSqlClient = null;
    return null;
  }
  try {
    cachedSqlClient = neon(rawUrl);
    return cachedSqlClient;
  } catch {
    cachedSqlClient = null;
    return null;
  }
}

export default async function handler(req, res) {
  const method = req.method ? req.method.toUpperCase() : "GET";
  const db = loadDb();
  const sql = getSqlClient();
  const clientIp = getClientIp(req);

  // =========================================================================
  // METODO GET: Cargar datos públicos de tienda, menú o estado de IP
  // =========================================================================
  if (method === "GET") {
    const url = req.url || "";

    // 1. Limpiar bloqueos de IP
    if (url.includes("action=resetIpStatus")) {
      ipAttempts.clear();
      return sendJson(res, 200, { ok: true, clientIp, locked: false, attemptsLeft: MAX_FAILED_ATTEMPTS, remainingSeconds: 0 });
    }

    // 2. Consultar estado de seguridad de IP
    if (url.includes("action=checkIpStatus")) {
      const secStatus = getIpSecurityStatus(clientIp);
      return sendJson(res, 200, { ok: true, clientIp, ...secStatus });
    }

    // 3. Obtener lista de todos los comercios activos
    if (url.includes("action=getAllStores")) {
      const activeStores = Object.values(db.stores)
        .filter((s) => s.status === "activo")
        .map((s) => ({
          id: s.id,
          name: s.business.name,
          username: s.username,
          bannerImage: s.business.bannerImage,
          phoneDisplay: s.business.phoneDisplay,
          rubro: s.business.rubro || s.rubro,
          city: s.business.city || s.city,
        }));
      return sendJson(res, 200, { ok: true, stores: activeStores, activeStoreId: db.activeStoreId });
    }

    // 4. Cargar datos del comercio público activo o solicitado por query (?comercio=xxx o ?store=xxx)
    let requestedStoreId = null;
    try {
      const parsedUrl = new URL(url, "http://localhost");
      requestedStoreId = parsedUrl.searchParams.get("comercio") || parsedUrl.searchParams.get("store") || parsedUrl.searchParams.get("c");
    } catch {}

    const isExplicitDemo = url.includes("action=getDemoStore") || (!requestedStoreId);
    const store = isExplicitDemo ? getActiveStore(db) : (findStore(db, requestedStoreId) || getActiveStore(db));
    if (!store) {
      return sendJson(res, 404, { error: "No hay comercios configurados" });
    }

    const allActiveStores = Object.values(db.stores)
      .filter((s) => s.status === "activo")
      .map((s) => ({
        id: s.id,
        name: s.business.name,
        username: s.username,
        bannerImage: s.business.bannerImage,
        phoneDisplay: s.business.phoneDisplay,
        rubro: s.business.rubro || s.rubro,
        city: s.business.city || s.city,
      }));

    // Si es la tienda demo, devolver los datos y portada actualizados del comercio demo
    const businessToReturn = { ...store.business };
    if (store.id === "losamigos" || store.id === "menupy" || isExplicitDemo) {
      businessToReturn.bannerImage = store.business?.bannerImage || db.stores["menupy"]?.business?.bannerImage || db.stores["losamigos"]?.business?.bannerImage || "/menupy_mockup_qr.jpg";
    }

    return sendJson(res, 200, {
      isDemo: Boolean(isExplicitDemo),
      storeId: store.id,
      menu: store.menu || [],
      deliveryNote: store.business.deliveryNote || "El costo de envío se coordina según la zona",
      business: businessToReturn,
      allStores: allActiveStores,
    });
  }

  // =========================================================================
  // METODO POST: Acciones de autenticación, guardado, registro y pedidos
  // =========================================================================
  if (method === "POST") {
    try {
      const body = await parseBody(req);

      // -------------------------------------------------------------
      // 1. Consulta pública de estado de IP
      // -------------------------------------------------------------
      if (body.action === "checkIpStatus") {
        const secStatus = getIpSecurityStatus(clientIp);
        return sendJson(res, 200, { ok: true, clientIp, ...secStatus });
      }

      // -------------------------------------------------------------
      // 2. Registro público de comercios que adquieren la App
      // -------------------------------------------------------------
      if (body.action === "registerCommercialClient") {
        const {
          businessName,
          rubro,
          ownerName,
          whatsapp,
          email,
          city,
          requestedUser,
          requestedPassword,
          plan,
          planTitle,
          amountGs,
          paymentMethod,
          paymentRef,
        } = body;

        if (!businessName || !ownerName || !whatsapp || !requestedUser || !requestedPassword) {
          return sendJson(res, 400, {
            ok: false,
            error: "Por favor completá los datos del comercio, responsable, email de usuario y contraseña.",
          });
        }

        const cleanUser = String(requestedUser).trim().toLowerCase();
        const cleanPass = String(requestedPassword).trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isEmail = emailRegex.test(cleanUser);
        const isAlphanumericUser = /^[a-zA-Z0-9._-]{3,60}$/.test(cleanUser);

        if (!isEmail && !isAlphanumericUser) {
          return sendJson(res, 400, {
            ok: false,
            error: "En 'Usuario Deseado' ingresá un correo electrónico válido o un nombre de usuario de al menos 3 caracteres (ej: mi-comercio@gmail.com o micomercio).",
          });
        }

        // Verificar si el usuario ya existe
        if (db.stores[cleanUser]) {
          return sendJson(res, 400, {
            ok: false,
            error: `El usuario o email "${cleanUser}" ya se encuentra registrado. Por favor utilizá otro o ingresá con tu cuenta si ya fue activada.`,
          });
        }

        const regId = `REG-${Date.now().toString().slice(-4)}${Math.floor(10 + Math.random() * 90)}`;
        const userEmail = String(email || cleanUser).trim().toLowerCase();
        const newClient = {
          id: regId,
          businessName: String(businessName).trim(),
          rubro: String(rubro || "Gastronomía").trim(),
          ownerName: String(ownerName).trim(),
          whatsapp: String(whatsapp).replace(/[^\d]/g, ""),
          email: userEmail,
          city: String(city || "").trim(),
          requestedUser: cleanUser,
          requestedPassword: cleanPass, // Contraseña real guardada en la base persistente
          plan: String(plan || "anual"),
          planTitle: String(planTitle || "Plan Anual PRO (1.000.000 Gs.)"),
          amountGs: Number(amountGs) || 1000000,
          paymentMethod: String(paymentMethod || "transferencia"),
          paymentRef: String(paymentRef || "").trim(),
          status: "pendiente",
          createdAt: new Date().toISOString(),
        };

        // Crear perfil de tienda aislado para este nuevo comercio
        const starterMenu = [
          {
            category: "Especialidades de la Casa",
            icon: "almuerzo",
            items: [
              {
                id: `item-${Date.now().toString().slice(-4)}-1`,
                name: "Plato Especial",
                desc: "Especialidad artesanal de la casa, porción abundante",
                price: 30000,
                image: "",
              },
            ],
          },
          {
            category: "Bebidas",
            icon: "bebida",
            items: [
              {
                id: `item-${Date.now().toString().slice(-4)}-2`,
                name: "Gaseosa 500ml",
                desc: "Línea completa bien fría",
                price: 8000,
                image: "",
              },
            ],
          },
        ];

        const durationMonths = String(plan).toLowerCase().includes("semestral") ? 6 : String(plan).toLowerCase().includes("anual") ? 12 : 1;
        const licCode = `CAS-${Math.floor(1000 + Math.random() * 9000)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        db.stores[cleanUser] = {
          id: cleanUser,
          username: cleanUser,
          email: cleanUser,
          ownerEmail: cleanUser,
          pin: cleanPass,
          status: "pendiente", // Inicia pendiente hasta que el Administrador presione "✓ Activar"
          business: {
            name: newClient.businessName,
            slogan: newClient.rubro || "Pedí online - Calidad y sabor",
            phoneIntl: newClient.whatsapp,
            phoneDisplay: newClient.whatsapp.length >= 9 ? newClient.whatsapp.replace(/(\d{4})(\d{3})(\d+)/, "$1 $2 $3") : newClient.whatsapp,
            address: newClient.city ? `${newClient.city}, Paraguay` : "Encarnación, Paraguay",
            bannerImage: "/banner.jpg",
            deliveryNote: "El costo de envío se coordina según la zona",
            adminUser: cleanUser,
            ownerEmail: cleanUser,
            ownerName: newClient.ownerName,
            rubro: newClient.rubro,
            city: newClient.city,
            licenseCode: licCode,
            licensePlan: newClient.planTitle,
            licenseCost: `${Number(newClient.amountGs).toLocaleString("es-PY")} Gs.`,
            licenseCostGs: newClient.amountGs,
            licenseDuration: `${durationMonths} meses`,
            licenseStatus: "pendiente",
            licenseActivatedAt: null,
            licenseExpiresAt: null,
            licenseNotes: `Suscripción ${newClient.planTitle} solicitada por ${newClient.ownerName} (${cleanUser})`,
          },
          menu: starterMenu,
          orders: [],
        };

        db.commercialRegistrations.unshift(newClient);
        saveDb(db);

        return sendJson(res, 200, {
          ok: true,
          registration: newClient,
          message: "Comercio registrado con éxito. Pendiente de activación por el Administrador.",
        });
      }

      // -------------------------------------------------------------
      // 3. Crear Pedido (Mesa, Delivery, Retiro)
      // -------------------------------------------------------------
      if (body.action === "createOrder") {
        const {
          storeId,
          mode,
          tableNumber,
          customerName,
          customerPhone,
          address,
          notes,
          items,
          totalItems,
          totalPrice,
        } = body;

        const targetStore = getActiveStore(db, storeId);
        if (!targetStore) {
          return sendJson(res, 404, { ok: false, error: "Comercio no encontrado" });
        }

        const clientOrderId = body.id || body.orderId;
        const orderId = (clientOrderId && String(clientOrderId).trim().startsWith("PED-"))
          ? String(clientOrderId).trim()
          : (clientOrderId ? String(clientOrderId).trim() : `PED-${Date.now().toString().slice(-4)}${Math.floor(10 + Math.random() * 90)}`);

        const nowIso = new Date().toISOString();
        const newOrder = {
          id: orderId,
          storeId: targetStore.id,
          mode: mode || "mesa",
          tableNumber: String(tableNumber || "").trim(),
          customerName: String(customerName || (mode === "mesa" ? `Mesa ${tableNumber || "en salón"}` : "Cliente")).trim(),
          customerPhone: String(customerPhone || "").trim(),
          address: String(address || "").trim(),
          notes: String(notes || "").trim(),
          items: Array.isArray(items) ? items : [],
          totalItems: Number(totalItems) || (Array.isArray(items) ? items.reduce((s, i) => s + (i.qty || 1), 0) : 0),
          totalPrice: Number(totalPrice) || 0,
          orderStatus: "recibido",
          deliveryStatus: mode === "delivery" ? "pendiente" : "local",
          paymentStatus: "pendiente",
          paymentMethod: "",
          paidAt: null,
          createdAt: nowIso,
          updatedAt: nowIso,
        };

        if (!Array.isArray(targetStore.orders)) targetStore.orders = [];
        const existingIdx = targetStore.orders.findIndex((o) => o.id === orderId);
        if (existingIdx >= 0) {
          targetStore.orders[existingIdx] = {
            ...targetStore.orders[existingIdx],
            ...newOrder,
          };
        } else {
          targetStore.orders.unshift(newOrder);
        }

        saveDb(db);

        return sendJson(res, 200, {
          ok: true,
          order: newOrder,
          message: "Pedido registrado con éxito en el sistema de caja",
        });
      }

      // -------------------------------------------------------------
      // 4. Consulta de estado de pedidos para clientes
      // -------------------------------------------------------------
      if (body.action === "checkOrdersStatus" || body.action === "getCustomerOrders") {
        const rawIds = Array.isArray(body.orderIds)
          ? body.orderIds.map((id) => String(id).trim())
          : body.orderId
          ? [String(body.orderId).trim()]
          : [];

        const requestedIds = rawIds.filter(Boolean);
        const allOrders = Object.values(db.stores).flatMap((s) => s.orders || []);

        const foundOrders = allOrders.filter((o) => requestedIds.includes(o.id));
        return sendJson(res, 200, { ok: true, orders: foundOrders });
      }

      // Desbloquear IPs si se solicita explícitamente
      if (body.action === "resetIpStatus" || body.action === "resetAllBlockedIps") {
        ipAttempts.clear();
        return sendJson(res, 200, { ok: true, message: "Bloqueos de IP reseteados con éxito." });
      }

      // -------------------------------------------------------------
      // 5. Validación y Activación de Códigos de Licencia (Público / Activación Directa)
      // -------------------------------------------------------------
      if (body.action === "validateAndActivateCode") {
        const rawCode = String(body.code || "").trim().toUpperCase().replace(/[\s-]+/g, "");
        if (!rawCode) {
          return sendJson(res, 400, { ok: false, error: "Por favor ingresá un código de activación." });
        }

        // 1. Buscar en db.activationCodes
        let targetCode = (db.activationCodes || []).find(
          (c) => (c.code || "").replace(/[\s-]+/g, "").toUpperCase() === rawCode
        );

        // 2. Si no se encontró en lista de códigos, buscar si coincide con la licencia de alguna tienda
        if (!targetCode) {
          for (const s of Object.values(db.stores)) {
            if (s.business?.licenseCode && s.business.licenseCode.replace(/[\s-]+/g, "").toUpperCase() === rawCode) {
              targetCode = {
                id: `ACT-${s.id}`,
                code: s.business.licenseCode,
                businessName: s.business.name,
                ownerName: s.business.adminUser || "Comercio",
                plan: s.business.licensePlan || "Plan Activo",
                costFormatted: s.business.licenseCost || "1.000.000 Gs.",
                durationMonths: s.business.licenseDuration || 12,
                status: s.business.licenseStatus || "activado",
                expiresAt: s.business.licenseExpiresAt || new Date(Date.now() + 365 * 24 * 3600000).toISOString(),
                activatedAt: s.business.licenseActivatedAt || new Date().toISOString(),
                notes: "Licencia de comercio",
              };
              break;
            }
          }
        }

        if (!targetCode) {
          return sendJson(res, 404, {
            ok: false,
            error: `El código "${body.code}" no existe o no se encuentra registrado en el sistema.`,
          });
        }

        if (targetCode.status === "revocado" || targetCode.status === "anulado") {
          return sendJson(res, 403, {
            ok: false,
            error: "Este código de licencia ha sido revocado o anulado por el Administrador.",
          });
        }

        const isExpired = targetCode.expiresAt ? (Date.now() > new Date(targetCode.expiresAt).getTime()) : false;
        if (isExpired || targetCode.status === "vencido") {
          return sendJson(res, 403, {
            ok: false,
            error: "Este código de licencia ha vencido. Contactá con el Administrador para renovarlo.",
          });
        }

        // Habilitar y marcar código como activado
        const nowIso = new Date().toISOString();
        targetCode.status = "activado";
        if (!targetCode.activatedAt) targetCode.activatedAt = nowIso;
        const assignedName = (body.businessName && String(body.businessName).trim()) || targetCode.businessName;
        if (assignedName && (!targetCode.businessName || targetCode.businessName.includes("Licencia Libre") || targetCode.businessName.includes("Venta Directa"))) {
          targetCode.businessName = assignedName;
        }
        if (!targetCode.activatedBy) {
          targetCode.activatedBy = assignedName || targetCode.ownerName || "Comercio Habilitado";
        }

        // Si hay un registro comercial asociado a este código o email, habilitarlo de inmediato
        const matchedReg = (db.commercialRegistrations || []).find(
          (r) =>
            (targetCode.email && ((r.email && r.email.toLowerCase() === targetCode.email.toLowerCase()) || (r.requestedUser && r.requestedUser.toLowerCase() === targetCode.email.toLowerCase()))) ||
            (r.assignedCode && r.assignedCode.replace(/[\s-]+/g, "").toUpperCase() === rawCode) ||
            (r.requestedUser && r.requestedUser.toLowerCase() === (targetCode.ownerName || "").toLowerCase())
        );
        if (matchedReg) {
          matchedReg.status = "activo";
        }

        // Asegurar que exista una tienda asociada en db.stores para este código y habilitar
        const storeKey = targetCode.email || `store_${targetCode.code.replace(/[^a-z0-9]/gi, "").toLowerCase()}`;
        if (!db.stores[storeKey]) {
          db.stores[storeKey] = {
            id: storeKey,
            username: (targetCode.email || targetCode.code.replace(/[^a-z0-9]/gi, "").toLowerCase()),
            pin: (matchedReg && matchedReg.requestedPassword) || "1234",
            status: "activo",
            business: {
              name: targetCode.businessName || "Mi Comercio",
              slogan: "Pedí online - Calidad y sabor",
              phoneIntl: targetCode.whatsapp || "595975635770",
              phoneDisplay: targetCode.whatsapp || "0975 635 770",
              address: "Encarnación, Paraguay",
              bannerImage: "/menupy_mockup_qr.jpg",
              deliveryNote: "El costo de envío se coordina según la zona",
              adminUser: (targetCode.email || targetCode.code.toLowerCase()),
              licenseCode: targetCode.code,
              licensePlan: targetCode.plan || "Plan Anual PRO",
              licenseCost: targetCode.costFormatted || "1.000.000 Gs.",
              licenseStatus: "activado",
              licenseExpiresAt: targetCode.expiresAt,
            },
            menu: DEFAULT_MENU_LOSAMIGOS,
            orders: [],
          };
        } else {
          const s = db.stores[storeKey];
          s.status = "activo";
          if (matchedReg && matchedReg.requestedPassword) {
            s.pin = matchedReg.requestedPassword;
          }
          if (s.business) {
            s.business.licenseCode = targetCode.code;
            s.business.licenseStatus = "activado";
            s.business.licenseExpiresAt = targetCode.expiresAt;
            s.business.licensePlan = targetCode.plan;
            if (targetCode.businessName) s.business.name = targetCode.businessName;
          }
        }

        saveDb(db);
        resetIpAttempts(clientIp);

        return sendJson(res, 200, {
          ok: true,
          license: {
            code: targetCode.code,
            businessName: targetCode.businessName,
            ownerName: targetCode.ownerName,
            plan: targetCode.plan,
            costFormatted: targetCode.costFormatted,
            cost: targetCode.cost,
            durationMonths: targetCode.durationMonths,
            status: targetCode.status,
            activatedAt: targetCode.activatedAt,
            expiresAt: targetCode.expiresAt,
            notes: targetCode.notes,
          },
          storeId: storeKey,
          message: "¡Comercio habilitado exitosamente!",
        });
      }

      // -------------------------------------------------------------
      // 6. Autenticación con Google (Google Sign-In)
      // -------------------------------------------------------------
      if (body.action === "googleLogin") {
        const email = String(body.email || "").trim().toLowerCase();
        const name = String(body.name || "").trim();
        const uid = String(body.uid || "").trim();
        const photoURL = String(body.photoURL || "").trim();

        if (!email) {
          return sendJson(res, 400, { ok: false, error: "Email de Google no proporcionado." });
        }

        resetIpAttempts(clientIp);

        // 1. Verificar si es Administrador Principal (Superadmin)
        const isMasterGoogle = email === "mecanicadakar@gmail.com";

        if (isMasterGoogle) {
          const demoStore = findStore(db, "losamigos") || Object.values(db.stores)[0];
          return sendJson(res, 200, {
            ok: true,
            role: "superadmin",
            clientIp,
            email,
            displayName: name || "Administrador Maestro",
            photoURL,
            uid,
            storeId: "losamigos",
            user: "usuario",
            business: {
              ...(demoStore?.business || {}),
              bannerImage: demoStore?.business?.bannerImage || "/banner.jpg",
              adminUser: "usuario",
              isPortalAdmin: true,
            },
            menu: demoStore?.menu && demoStore.menu.length > 0 ? demoStore.menu : DEFAULT_MENU_LOSAMIGOS,
            orders: Object.values(db.stores).flatMap((s) => s.orders || []),
            license: {
              code: "CAS-ADMIN-MASTER",
              plan: "Plan Administrador Maestro",
              status: "activado",
            },
          });
        }

        // 2. Buscar si este email pertenece a algún comercio existente con licencia
        let associatedStore = null;
        for (const s of Object.values(db.stores)) {
          if (
            (s.email && s.email.toLowerCase() === email) ||
            (s.ownerEmail && s.ownerEmail.toLowerCase() === email) ||
            (s.business?.email && s.business.email.toLowerCase() === email) ||
            (s.business?.ownerEmail && s.business.ownerEmail.toLowerCase() === email)
          ) {
            if (s.business?.licenseCode && s.business?.licenseStatus !== "revocado" && s.business?.licenseStatus !== "anulado") {
              associatedStore = s;
              break;
            }
          }
        }

        // Si no se encontró por email en la tienda, buscar en registros comerciales activos
        if (!associatedStore) {
          // Verificar si este email se encuentra registrado pero aún en estado PENDIENTE de habilitación
          const pendingReg = (db.commercialRegistrations || []).find(
            (r) =>
              ((r.requestedUser && r.requestedUser.toLowerCase() === email) ||
               (r.email && r.email.toLowerCase() === email)) &&
              (r.status === "pendiente" || r.status === "pending")
          );
          if (pendingReg) {
            return sendJson(res, 403, {
              ok: false,
              isPendingApproval: true,
              error: `Acceso denegado: Tu comercio (${pendingReg.businessName}) está registrado con el usuario ${email}, pero aún se encuentra PENDIENTE de habilitación por el Administrador. Una vez que el Administrador otorgue la licencia a este email, podrás ingresar a tu panel de Gerente.`,
            });
          }

          const reg = db.commercialRegistrations.find(
            (r) =>
              ((r.email && r.email.toLowerCase() === email) ||
               (r.requestedUser && r.requestedUser.toLowerCase() === email)) &&
              (r.status === "activo" || r.status === "activado")
          );
          if (reg && reg.requestedUser) {
            const candidate = db.stores[reg.requestedUser.toLowerCase()];
            if (candidate && candidate.business?.licenseCode) {
              associatedStore = candidate;
            }
          }
        }

        // Buscar si el Administrador ya otorgó una licencia activa a este email en Códigos de Activación
        if (!associatedStore) {
          const grantedCode = (db.activationCodes || []).find(
            (c) => c.email && c.email.toLowerCase() === email && c.status === "activado"
          );
          if (grantedCode) {
            const userSlug = (email.split("@")[0] || "user").replace(/[^a-z0-9_-]/gi, "").toLowerCase();
            const uniqueStoreId = `store_${userSlug}`;
            associatedStore = db.stores[uniqueStoreId] || db.stores[email] || {
              id: uniqueStoreId,
              username: email,
              email: email,
              ownerEmail: email,
              pin: "1234",
              status: "activo",
              business: {
                name: grantedCode.businessName || (name ? `Comercio de ${name}` : `Comercio ${userSlug}`),
                slogan: "Pedí online - Calidad y sabor",
                phoneIntl: grantedCode.whatsapp || "595981456789",
                phoneDisplay: "0981 123 456",
                address: "Encarnación, Paraguay",
                bannerImage: "/banner.jpg",
                deliveryNote: "El costo de envío se coordina según la zona",
                adminUser: email,
                ownerEmail: email,
                licenseCode: grantedCode.code,
                licensePlan: grantedCode.plan || "Plan Anual PRO",
                licenseCost: grantedCode.costFormatted || "1.000.000 Gs. / año",
                licenseStatus: "activado",
                licenseExpiresAt: grantedCode.expiresAt,
              },
              menu: DEFAULT_MENU_LOSAMIGOS,
              orders: [],
            };
            db.stores[uniqueStoreId] = associatedStore;
            saveDb(db);
          }
        }

        // 3. Si el usuario envió un código de licencia para vincular con su cuenta de Google
        if (!associatedStore && body.licenseCode) {
          const cleanCode = String(body.licenseCode).trim().toUpperCase();
          const foundCode = (db.activationCodes || []).find(
            (c) => c.code && c.code.toUpperCase() === cleanCode
          );

          if (foundCode) {
            if (foundCode.email && foundCode.email.toLowerCase() !== email.toLowerCase()) {
              return sendJson(res, 400, {
                ok: false,
                licenseError: true,
                error: `Este código de licencia (${cleanCode}) fue otorgado exclusivamente al correo ${foundCode.email}. Solo ese usuario puede ingresar.`,
              });
            }

            if (foundCode.status === "revocado" || foundCode.status === "bloqueado" || foundCode.status === "anulado") {
              return sendJson(res, 400, {
                ok: false,
                licenseError: true,
                error: `El código de licencia (${cleanCode}) ha sido suspendido o revocado por la administración.`,
              });
            }

            const userSlug = (email.split("@")[0] || "user").replace(/[^a-z0-9_-]/gi, "").toLowerCase();
            const uniqueStoreId = `store_${userSlug}`;

            foundCode.status = "activado";
            foundCode.activatedAt = new Date().toISOString();
            foundCode.activatedBy = `${name || email} (${email})`;
            foundCode.email = email;

            associatedStore = {
              id: uniqueStoreId,
              username: userSlug,
              email: email,
              ownerEmail: email,
              pin: "1234",
              status: "activo",
              business: {
                name: foundCode.businessName || (name ? `Comercio de ${name}` : `Comercio ${userSlug}`),
                slogan: "Pedí online - Calidad y sabor",
                phoneIntl: foundCode.whatsapp || "595981456789",
                phoneDisplay: "0981 123 456",
                address: "Encarnación, Paraguay",
                bannerImage: "/banner.jpg",
                deliveryNote: "El costo de envío se coordina según la zona",
                adminUser: userSlug,
                ownerEmail: email,
                licenseCode: foundCode.code,
                licensePlan: foundCode.plan || "Plan Anual PRO",
                licenseCost: foundCode.costFormatted || "1.000.000 Gs. / año",
                licenseStatus: "activado",
                licenseExpiresAt: foundCode.expiresAt,
              },
              menu: [
                {
                  category: "Especialidades de la Casa",
                  icon: "almuerzo",
                  items: [
                    {
                      id: `item-${Date.now()}-1`,
                      name: "Plato Especial",
                      desc: "Especialidad artesanal de la casa, porción abundante",
                      price: 25000,
                      image: "",
                    },
                  ],
                },
              ],
              orders: [],
            };
            db.stores[uniqueStoreId] = associatedStore;
            saveDb(db);
          } else {
            return sendJson(res, 400, {
              ok: false,
              licenseError: true,
              error: `El código de licencia "${cleanCode}" no existe en el sistema de activación.`,
            });
          }
        }

        // 4. Si el email NO está asociado a ninguna licencia autorizada: RECHAZAR ACCESO
        if (!associatedStore) {
          return sendJson(res, 403, {
            ok: false,
            requiresLicense: true,
            email: email,
            displayName: name,
            error: `Acceso restringido: El correo de Google (${email}) no tiene una licencia activa vinculada a la aplicación. Para ingresar, vinculá tu código de licencia o adquirí tu plan.`,
          });
        }

        // 5. Verificar estado de la licencia de la tienda
        const lic = associatedStore.business?.licenseStatus || "activado";
        if (lic === "revocado" || lic === "bloqueado" || lic === "anulado") {
          return sendJson(res, 403, {
            ok: false,
            licenseBlocked: true,
            error: "La licencia de este comercio se encuentra suspendida o revocada por administración.",
          });
        }

        const role = "owner";

        return sendJson(res, 200, {
          ok: true,
          role,
          clientIp,
          email,
          displayName: name,
          photoURL,
          uid,
          storeId: associatedStore.id,
          user: associatedStore.username,
          business: associatedStore.business,
          menu: associatedStore.menu || [],
          orders: associatedStore.orders || [],
          license: associatedStore?.business?.licenseCode ? {
            code: associatedStore.business.licenseCode,
            plan: associatedStore.business.licensePlan,
            status: associatedStore.business.licenseStatus || "activado",
            expiresAt: associatedStore.business.licenseExpiresAt,
          } : null,
        });
      }

      // =============================================================
      // AUTENTICACIÓN Y VALIDACIÓN DE ACCESO TRADICIONAL (PIN / USUARIO)
      // =============================================================
      const givenUser = String(body.user || "").trim().toLowerCase();
      const givenPin = String(body.pin || "").trim();

      // 1. Superadmin (Desarrollador / Administrador Maestro de la Plataforma)
      const isSuperadmin = Boolean(
        body.role === "superadmin" ||
        body.action === "updateDemoStore" ||
        givenPin === "Ricaji270985#" ||
        givenPin.toLowerCase() === "ricaji270985#" ||
        givenUser === "mecanicadakar@gmail.com" ||
        (body.user && String(body.user).toLowerCase() === "mecanicadakar@gmail.com") ||
        (body.email && String(body.email).toLowerCase() === "mecanicadakar@gmail.com") ||
        givenUser === "usuario" ||
        givenUser === "camuchi" ||
        givenUser === "admin" ||
        ((givenUser === "gerente" || givenUser === "comercio") && (givenPin === "Ricaji270985#" || givenPin.toLowerCase() === "ricaji270985#"))
      );

      // 2. Búsqueda de comercio / registro comercial / código de activación
      let matchedStore = null;
      let matchedRegistration = null;
      let matchedCode = null;

      const givenUserNoDash = givenUser.toUpperCase().replace(/[\s-]+/g, "");
      const givenPinNoDash = givenPin.toUpperCase().replace(/[\s-]+/g, "");

      if (!isSuperadmin) {
        // A) Buscar en commercialRegistrations por usuario, email o prefijo antes del @
        matchedRegistration = (db.commercialRegistrations || []).find((r) => {
          const rUser = (r.requestedUser || "").toLowerCase();
          const rEmail = (r.email || "").toLowerCase();
          const rSlug = rUser.includes("@") ? rUser.split("@")[0] : rUser;
          return (
            rUser === givenUser ||
            rEmail === givenUser ||
            rSlug === givenUser
          );
        });

        // B) Buscar en activationCodes por código, email o prefijo
        matchedCode = (db.activationCodes || []).find((ac) => {
          const acCodeNoDash = (ac.code || "").toUpperCase().replace(/[\s-]+/g, "");
          const acEmail = (ac.email || "").toLowerCase();
          const acSlug = acEmail.includes("@") ? acEmail.split("@")[0] : acEmail;
          return (
            acCodeNoDash === givenUserNoDash ||
            acCodeNoDash === givenPinNoDash ||
            (acEmail && acEmail === givenUser) ||
            (acSlug && acSlug === givenUser)
          );
        });

        // C) Buscar en tiendas existentes
        if (matchedRegistration) {
          const storeKey = (matchedRegistration.requestedUser || "").toLowerCase();
          matchedStore = db.stores[storeKey] || findStore(db, givenUser);
        } else if (matchedCode) {
          const storeKey = matchedCode.email || `store_${matchedCode.code.replace(/[^a-z0-9]/gi, "").toLowerCase()}`;
          matchedStore = db.stores[storeKey] || findStore(db, matchedCode.code) || findStore(db, givenUser);
        } else {
          matchedStore = findStore(db, givenUser);
        }

        // Si el registro comercial está activo o el código está activado pero la tienda aún no existe, instanciarla inmediatamente
        if (!matchedStore && matchedRegistration && (matchedRegistration.status === "activo" || matchedRegistration.status === "activado")) {
          const storeKey = (matchedRegistration.requestedUser || matchedRegistration.email || "").toLowerCase();
          const licCode = matchedCode?.code || matchedRegistration.licenseCode || `CAS-${Math.floor(1000 + Math.random() * 9000)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
          matchedStore = {
            id: storeKey,
            username: storeKey,
            pin: matchedRegistration.requestedPassword || "1234",
            status: "activo",
            business: {
              name: matchedRegistration.businessName || "Mi Comercio",
              slogan: matchedRegistration.rubro || "Gastronomía",
              phoneIntl: matchedRegistration.whatsapp || "595975635770",
              phoneDisplay: matchedRegistration.whatsapp || "0975 635 770",
              address: matchedRegistration.city ? `${matchedRegistration.city}, Paraguay` : "Encarnación, Paraguay",
              bannerImage: "/banner.jpg",
              deliveryNote: "El costo de envío se coordina según la zona",
              adminUser: storeKey,
              ownerEmail: (matchedRegistration.email || storeKey).toLowerCase(),
              ownerName: matchedRegistration.ownerName || "Propietario",
              licenseCode: licCode,
              licensePlan: matchedRegistration.planTitle || "Plan Anual PRO",
              licenseCost: `${Number(matchedRegistration.amountGs || 1000000).toLocaleString("es-PY")} Gs.`,
              licenseStatus: "activado",
              licenseExpiresAt: new Date(Date.now() + 365 * 24 * 3600000).toISOString(),
            },
            menu: DEFAULT_MENU_LOSAMIGOS,
            orders: [],
          };
          db.stores[storeKey] = matchedStore;
          if (storeKey.includes("@")) {
            const aliasKey = `store_${storeKey.split("@")[0]}`;
            if (!db.stores[aliasKey]) db.stores[aliasKey] = matchedStore;
          }
          saveDb(db);
        } else if (!matchedStore && matchedCode && matchedCode.status === "activado") {
          const storeKey = matchedCode.email || `store_${matchedCode.code.replace(/[^a-z0-9]/gi, "").toLowerCase()}`;
          matchedStore = {
            id: storeKey,
            username: matchedCode.email || matchedCode.code.toLowerCase(),
            pin: "1234",
            status: "activo",
            business: {
              name: matchedCode.businessName || "Mi Comercio",
              slogan: "Pedí online - Calidad y sabor",
              phoneIntl: matchedCode.whatsapp || "595975635770",
              phoneDisplay: matchedCode.whatsapp || "0975 635 770",
              address: "Encarnación, Paraguay",
              bannerImage: "/menupy_mockup_qr.jpg",
              deliveryNote: "El costo de envío se coordina según la zona",
              adminUser: (matchedCode.email || matchedCode.code.toLowerCase()),
              ownerName: matchedCode.ownerName || "Propietario",
              licenseCode: matchedCode.code,
              licensePlan: matchedCode.plan || "Plan Anual PRO",
              licenseCost: matchedCode.costFormatted || "1.000.000 Gs.",
              licenseStatus: "activado",
              licenseExpiresAt: matchedCode.expiresAt || new Date(Date.now() + 365 * 24 * 3600000).toISOString(),
            },
            menu: DEFAULT_MENU_LOSAMIGOS,
            orders: [],
          };
          db.stores[storeKey] = matchedStore;
          saveDb(db);
        }
      }

      // Si el usuario ingresa como demo general (gerente, comercio, menupy, losamigos, demo)
      const isDemoUser =
        givenUser === "gerente" ||
        givenUser === "comercio" ||
        givenUser === "menupy" ||
        givenUser === "losamigos" ||
        givenUser === "demo";

      if (!isSuperadmin && !matchedStore && isDemoUser) {
        matchedStore = findStore(db, "losamigos") || getActiveStore(db);
      }

      // 3. Validación estricta de credenciales
      let credentialsValid = false;

      if (isSuperadmin || body.isGoogleAuth || givenPin === "google-auth") {
        credentialsValid = true;
      } else if (matchedRegistration) {
        if (
          givenPin === matchedRegistration.requestedPassword ||
          (matchedCode && givenPinNoDash === (matchedCode.code || "").toUpperCase().replace(/[\s-]+/g, "")) ||
          (matchedStore && (givenPin === matchedStore.pin || givenPin === matchedStore.business?.pin || givenPin === matchedStore.business?.adminPin))
        ) {
          credentialsValid = true;
        }
      } else if (matchedCode) {
        if (
          givenPin === "1234" ||
          givenPin === "comercio123" ||
          givenPinNoDash === (matchedCode.code || "").toUpperCase().replace(/[\s-]+/g, "") ||
          (matchedStore && (givenPin === matchedStore.pin || givenPin === matchedStore.business?.pin || givenPin === matchedStore.business?.adminPin))
        ) {
          credentialsValid = true;
        }
      } else if (matchedStore) {
        if (
          givenPin === matchedStore.pin ||
          givenPin === matchedStore.business?.pin ||
          givenPin === matchedStore.business?.adminPin ||
          (matchedStore.business?.licenseCode && givenPinNoDash === String(matchedStore.business.licenseCode).toUpperCase().replace(/[\s-]+/g, "")) ||
          (isDemoUser && (givenPin === "comercio123" || givenPin === "1234"))
        ) {
          credentialsValid = true;
        }
      }

      // Gestión de intentos fallidos
      if (credentialsValid) {
        resetIpAttempts(clientIp);
      } else {
        const ipStatus = getIpSecurityStatus(clientIp);
        if (ipStatus.locked) {
          return sendJson(res, 429, {
            ok: false,
            locked: true,
            attemptsLeft: 0,
            remainingSeconds: ipStatus.remainingSeconds,
            clientIp,
            error: `Acceso bloqueado: Tu dirección IP (${clientIp}) superó los intentos permitidos. Esperá ${Math.ceil(ipStatus.remainingSeconds / 60)} minuto(s).`,
          });
        }
        const failData = registerFailedAttempt(clientIp);
        const httpStatus = failData.locked ? 429 : 401;
        return sendJson(res, httpStatus, {
          ok: false,
          clientIp,
          error: "Usuario o PIN incorrecto",
          ...failData,
        });
      }

      // 4. Verificación obligatoria de HABILITACIÓN para Gerente / Comercio
      if (!isSuperadmin) {
        // A) Si coincide con un registro comercial
        if (matchedRegistration) {
          if (matchedRegistration.status === "pendiente" || matchedRegistration.status === "pending") {
            return sendJson(res, 403, {
              ok: false,
              isPendingApproval: true,
              error: `Acceso denegado: El usuario "${givenUser}" está registrado pero aún se encuentra PENDIENTE de habilitación por el Administrador. Solo el correo autorizado podrá ingresar una vez que el Administrador otorgue la licencia.`,
            });
          }

          if (matchedRegistration.status === "rechazado" || matchedRegistration.status === "rejected") {
            return sendJson(res, 403, {
              ok: false,
              error: `Acceso denegado: El registro comercial del usuario "${givenUser}" fue rechazado. Consultá con el Administrador.`,
            });
          }
        }

        // B) Si coincide con un código de activación revocado
        if (matchedCode) {
          if (matchedCode.status === "revocado" || matchedCode.status === "anulado") {
            return sendJson(res, 403, {
              ok: false,
              licenseBlocked: true,
              licenseStatus: "revocado",
              error: "La licencia de este comercio ha sido suspendida o revocada por el Administrador.",
            });
          }
        }

        // C) Si la tienda está pendiente o rechazada
        if (matchedStore && matchedStore.id !== "losamigos" && matchedStore.id !== "admin") {
          if (matchedStore.status === "pendiente") {
            return sendJson(res, 403, {
              ok: false,
              isPendingApproval: true,
              error: `Acceso denegado: El comercio "${givenUser}" se encuentra PENDIENTE de habilitación por el Administrador. Solo el correo autorizado podrá ingresar una vez habilitado.`,
            });
          }

          if (matchedStore.status === "rechazado") {
            return sendJson(res, 403, {
              ok: false,
              error: `Acceso denegado: El comercio "${givenUser}" fue rechazado. Consultá con el Administrador.`,
            });
          }

          // Verificar estado de la licencia de la tienda
          const lic = matchedStore.business?.licenseStatus || matchedStore.licenseStatus || "activado";
          const expiresAt = matchedStore.business?.licenseExpiresAt;
          const isExpired = expiresAt ? (Date.now() > new Date(expiresAt).getTime()) : false;

          if (lic === "revocado" || lic === "anulado" || lic === "vencido" || isExpired) {
            return sendJson(res, 403, {
              ok: false,
              licenseBlocked: true,
              licenseStatus: isExpired ? "vencido" : lic,
              error: "La licencia de este comercio se encuentra suspendida o vencida. Comunicate con el Administrador para renovarla.",
            });
          }
        }
      }

      // -------------------------------------------------------------
      // Acción: Verificación simple de PIN para entrar al panel
      // -------------------------------------------------------------
      if (body.action === "verifyPin") {
        if (isSuperadmin) {
          const demoStore = findStore(db, "losamigos") || Object.values(db.stores)[0];
          return sendJson(res, 200, {
            ok: true,
            role: "superadmin",
            clientIp,
            user: "Usuario",
            storeId: "losamigos",
            business: {
              ...(demoStore?.business || {}),
              bannerImage: demoStore?.business?.bannerImage || "/banner.jpg",
              adminUser: "usuario",
              isPortalAdmin: true,
            },
            menu: demoStore?.menu && demoStore.menu.length > 0 ? demoStore.menu : DEFAULT_MENU_LOSAMIGOS,
            orders: Object.values(db.stores).flatMap((s) => s.orders || []),
          });
        }

        if (matchedStore) {
          const licCode = matchedStore.business?.licenseCode || matchedCode?.code || (matchedRegistration ? `CAS-${matchedStore.id.toUpperCase()}` : "CAS-7K9B-X2M4");
          const licPlan = matchedStore.business?.licensePlan || matchedCode?.plan || (matchedRegistration?.planTitle) || "Plan Anual PRO";
          const licStatus = matchedStore.business?.licenseStatus || matchedCode?.status || "activado";
          const licExpires = matchedStore.business?.licenseExpiresAt || matchedCode?.expiresAt || new Date(Date.now() + 365 * 24 * 3600000).toISOString();

          return sendJson(res, 200, {
            ok: true,
            role: "owner",
            clientIp,
            storeId: matchedStore.id,
            user: matchedStore.username || matchedStore.id,
            business: {
              ...(matchedStore.business || {}),
              licenseCode: licCode,
              licensePlan: licPlan,
              licenseStatus: licStatus,
              licenseExpiresAt: licExpires,
            },
            menu: (matchedStore.menu && matchedStore.menu.length > 0) ? matchedStore.menu : DEFAULT_MENU_LOSAMIGOS,
            orders: matchedStore.orders || [],
            license: {
              code: licCode,
              plan: licPlan,
              status: licStatus,
              expiresAt: licExpires,
            },
          });
        }

        return sendJson(res, 404, {
          ok: false,
          error: "Comercio no encontrado en el sistema.",
        });
      }

      // -------------------------------------------------------------
      // Acción: Obtener clientes registrados (para Superadmin)
      // -------------------------------------------------------------
      if (body.action === "getRegisteredClients") {
        return sendJson(res, 200, { ok: true, clients: db.commercialRegistrations });
      }

      // -------------------------------------------------------------
      // Acción: Actualizar estado de comercio (Activar / Rechazar / Pendiente)
      // ESTO HABILITA AL COMERCIO PARA PODER INGRESAR INMEDIATAMENTE
      // -------------------------------------------------------------
      if (body.action === "updateClientStatus") {
        const { clientId, status } = body;
        const normalized =
          status === "active" || status === "activo"
            ? "activo"
            : status === "rejected" || status === "rechazado"
            ? "rechazado"
            : "pendiente";

        const reg = db.commercialRegistrations.find((c) => c.id === clientId);
        if (reg) {
          reg.status = normalized;

          // Buscar o crear tienda asociada
          const storeUser = (reg.requestedUser || "").toLowerCase();
          let store = db.stores[storeUser];

          if (!store && storeUser) {
            store = {
              id: storeUser,
              username: storeUser,
              pin: reg.requestedPassword || "1234",
              status: normalized,
              business: {
                name: reg.businessName,
                slogan: reg.rubro || "Gastronomía",
                phoneIntl: reg.whatsapp,
                phoneDisplay: reg.whatsapp,
                address: reg.city ? `${reg.city}, Paraguay` : "Encarnación, Paraguay",
                bannerImage: "/banner.jpg",
                deliveryNote: "El costo de envío se coordina según la zona",
                adminUser: storeUser,
                licenseCode: `CAS-${Math.floor(1000 + Math.random() * 9000)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
                licensePlan: reg.planTitle || "Plan Anual PRO",
                licenseCost: `${Number(reg.amountGs || 1000000).toLocaleString("es-PY")} Gs.`,
                licenseCostGs: reg.amountGs || 1000000,
                licenseDuration: "12 meses",
                licenseStatus: normalized === "activo" ? "activado" : "pendiente",
              },
              menu: [],
              orders: [],
            };
            db.stores[storeUser] = store;
          }

          if (store) {
            store.status = normalized;
            if (normalized === "activo") {
              const nowIso = new Date().toISOString();
              const durMonths = String(reg.plan).toLowerCase().includes("semestral") ? 6 : String(reg.plan).toLowerCase().includes("anual") ? 12 : 1;
              const expDate = new Date(Date.now() + durMonths * 30 * 24 * 3600000).toISOString();
              const licCode = store.business.licenseCode || `CAS-${Math.floor(1000 + Math.random() * 9000)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

              store.business.licenseStatus = "activado";
              store.business.licenseCode = licCode;
              store.business.licenseActivatedAt = nowIso;
              store.business.licenseExpiresAt = expDate;

              // Agregar o actualizar código en lista de activationCodes
              const assignedEmail = (reg.requestedUser || reg.email || "").toLowerCase();
              store.email = assignedEmail;
              store.ownerEmail = assignedEmail;
              if (store.business) {
                store.business.ownerEmail = assignedEmail;
                store.business.adminUser = assignedEmail;
              }

              const existingCode = db.activationCodes.find((c) => c.code === licCode);
              if (existingCode) {
                existingCode.status = "activado";
                existingCode.email = assignedEmail;
                existingCode.expiresAt = expDate;
                existingCode.activatedAt = nowIso;
                existingCode.activatedBy = `${reg.ownerName} (${assignedEmail})`;
              } else {
                const newCodeObj = {
                  id: `ACT-${Date.now().toString().slice(-4)}`,
                  code: licCode,
                  businessName: reg.businessName,
                  ownerName: reg.ownerName,
                  email: assignedEmail,
                  whatsapp: reg.whatsapp,
                  plan: reg.planTitle || "Plan Anual PRO",
                  costFormatted: `${Number(reg.amountGs || 1000000).toLocaleString("es-PY")} Gs.`,
                  costGs: reg.amountGs || 1000000,
                  durationMonths: durMonths,
                  status: "activado",
                  createdAt: nowIso,
                  activatedAt: nowIso,
                  expiresAt: expDate,
                  activatedBy: `${reg.ownerName} (${assignedEmail})`,
                  notes: `Habilitado oficialmente por Administrador para ${reg.businessName} (${assignedEmail})`,
                };
                db.activationCodes.unshift(newCodeObj);
              }
            } else if (normalized === "rechazado") {
              store.business.licenseStatus = "anulado";
            }
          }
          saveDb(db);
        }

        return sendJson(res, 200, { ok: true, status: normalized, clients: db.commercialRegistrations, codes: db.activationCodes });
      }

      // -------------------------------------------------------------
      // Acción: Eliminar registro de comercio
      // -------------------------------------------------------------
      if (body.action === "deleteRegisteredClient") {
        const { clientId } = body;
        const target = db.commercialRegistrations.find((c) => c.id === clientId);
        if (target && target.requestedUser) {
          delete db.stores[target.requestedUser.toLowerCase()];
        }
        db.commercialRegistrations = db.commercialRegistrations.filter((c) => c.id !== clientId);
        saveDb(db);
        return sendJson(res, 200, { ok: true });
      }

      if (body.action === "getActivationCodes") {
        return sendJson(res, 200, { ok: true, codes: db.activationCodes });
      }

      if (body.action === "createActivationCode") {
        const { code, businessName, ownerName, email, whatsapp, plan, notes, cost, costFormatted, durationMonths, expiresAt } = body;
        const normalizedCode = (
          code && String(code).trim()
            ? String(code).trim().toUpperCase()
            : `CAS-${Math.floor(1000 + Math.random() * 9000)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
        ).replace(/\s+/g, "");

        const durMonths = Number(durationMonths) || (String(plan).toLowerCase().includes("semestral") ? 6 : String(plan).toLowerCase().includes("anual") ? 12 : 1);
        const expDate = expiresAt || new Date(Date.now() + durMonths * 30 * 24 * 60 * 60 * 1000).toISOString();
        const costStr = costFormatted || (cost ? `${Number(cost).toLocaleString("es-PY")} Gs.` : "");
        const cleanEmail = (email && String(email).trim().toLowerCase()) || "";

        const newCodeObj = {
          id: "ACT-" + Date.now().toString().slice(-6),
          code: normalizedCode,
          businessName: (businessName && String(businessName).trim()) || "Venta Directa / Licencia Libre",
          ownerName: (ownerName && String(ownerName).trim()) || "Responsable de Comercio",
          email: cleanEmail,
          whatsapp: (whatsapp && String(whatsapp).trim()) || "",
          plan: (plan && String(plan).trim()) || "Plan Mensual",
          cost: cost || 0,
          costFormatted: costStr,
          durationMonths: durMonths,
          expiresAt: expDate,
          status: cleanEmail ? "activado" : "disponible",
          createdAt: new Date().toISOString(),
          activatedAt: cleanEmail ? new Date().toISOString() : null,
          activatedBy: cleanEmail ? `${ownerName || "Comercio"} (${cleanEmail})` : null,
          notes: (notes && String(notes).trim()) || (cleanEmail ? `Licencia otorgada al email ${cleanEmail}` : ""),
        };

        // Si se especificó un email autorizado, habilitar la tienda y la solicitud comercial inmediatamente
        if (cleanEmail) {
          const reg = (db.commercialRegistrations || []).find(
            (c) =>
              (c.requestedUser && c.requestedUser.toLowerCase() === cleanEmail) ||
              (c.email && c.email.toLowerCase() === cleanEmail)
          );
          if (reg) {
            reg.status = "activo";
          }

          const userSlug = cleanEmail.split("@")[0].replace(/[^a-z0-9_-]/gi, "").toLowerCase();
          const uniqueStoreId = `store_${userSlug}`;
          const existingStore = db.stores[cleanEmail] || db.stores[uniqueStoreId];

          if (existingStore) {
            existingStore.status = "activo";
            existingStore.email = cleanEmail;
            existingStore.ownerEmail = cleanEmail;
            if (existingStore.business) {
              existingStore.business.licenseCode = normalizedCode;
              existingStore.business.licenseStatus = "activado";
              existingStore.business.licensePlan = newCodeObj.plan;
              existingStore.business.licenseCost = costStr;
              existingStore.business.licenseExpiresAt = expDate;
              existingStore.business.ownerEmail = cleanEmail;
              existingStore.business.adminUser = cleanEmail;
            }
          } else {
            db.stores[cleanEmail] = {
              id: uniqueStoreId,
              username: cleanEmail,
              email: cleanEmail,
              ownerEmail: cleanEmail,
              pin: "1234",
              status: "activo",
              business: {
                name: newCodeObj.businessName,
                slogan: "Pedí online - Calidad y sabor",
                phoneIntl: newCodeObj.whatsapp,
                phoneDisplay: newCodeObj.whatsapp,
                address: "Encarnación, Paraguay",
                bannerImage: "/banner.jpg",
                deliveryNote: "El costo de envío se coordina según la zona",
                adminUser: cleanEmail,
                ownerEmail: cleanEmail,
                licenseCode: normalizedCode,
                licensePlan: newCodeObj.plan,
                licenseCost: costStr,
                licenseStatus: "activado",
                licenseExpiresAt: expDate,
              },
              menu: DEFAULT_MENU_LOSAMIGOS,
              orders: [],
            };
          }
        }

        db.activationCodes.unshift(newCodeObj);
        saveDb(db);
        return sendJson(res, 200, { ok: true, code: newCodeObj, message: cleanEmail ? `Código creado y otorgado con éxito al correo ${cleanEmail}.` : "Código de activación creado exitosamente." });
      }

      if (body.action === "updateActivationCodeStatus") {
        const { codeId, status } = body;
        const normalized =
          status === "activado" || status === "active"
            ? "activado"
            : status === "revocado" || status === "rejected" || status === "anulado"
            ? "revocado"
            : "disponible";

        const normCodeId = String(codeId || "").toUpperCase().replace(/[\s-]+/g, "");
        const target = (db.activationCodes || []).find((c) =>
          c.id === codeId ||
          c.code === codeId ||
          (c.code && c.code.toUpperCase().replace(/[\s-]+/g, "") === normCodeId)
        );
        if (target) {
          target.status = normalized;
          if (normalized === "activado" && !target.activatedAt) {
            target.activatedAt = new Date().toISOString();
          }
          // Actualizar tiendas que tengan este código o este email
          for (const s of Object.values(db.stores)) {
            const storeLic = (s.business?.licenseCode || "").toUpperCase().replace(/[\s-]+/g, "");
            const storeEmail = (s.ownerEmail || s.email || "").toLowerCase();
            const targetEmail = (target.email || "").toLowerCase();
            if (storeLic === normCodeId || (targetEmail && storeEmail === targetEmail)) {
              if (s.business) {
                s.business.licenseStatus = normalized;
                if (normalized === "activado") {
                  s.business.licenseCode = target.code;
                  s.business.licensePlan = target.plan;
                  s.business.licenseExpiresAt = target.expiresAt;
                }
              }
            }
          }
          // También actualizar registros comerciales coincidentes
          for (const reg of (db.commercialRegistrations || [])) {
            const regEmail = (reg.email || reg.requestedUser || "").toLowerCase();
            const targetEmail = (target.email || "").toLowerCase();
            if (targetEmail && regEmail === targetEmail) {
              reg.status = normalized === "activado" ? "activo" : normalized === "revocado" ? "rechazado" : "pendiente";
            }
          }
          saveDb(db);
        }
        return sendJson(res, 200, { ok: true, status: normalized, target, codes: db.activationCodes });
      }

      if (body.action === "renewActivationCode") {
        const { codeId, extendMonths, newExpiresAt, newPlan, newCost } = body;
        const target = db.activationCodes.find((c) => c.id === codeId || c.code === codeId);
        if (target) {
          target.status = "activado";
          if (newExpiresAt) {
            target.expiresAt = newExpiresAt;
          } else if (extendMonths) {
            const base = (target.expiresAt && new Date(target.expiresAt).getTime() > Date.now())
              ? new Date(target.expiresAt).getTime()
              : Date.now();
            target.expiresAt = new Date(base + Number(extendMonths) * 30 * 24 * 3600000).toISOString();
          }
          if (newPlan) target.plan = newPlan;
          if (newCost) target.costFormatted = newCost;

          for (const s of Object.values(db.stores)) {
            if (s.business?.licenseCode === target.code) {
              s.business.licenseStatus = "activado";
              s.business.licenseExpiresAt = target.expiresAt;
            }
          }
          saveDb(db);
        }
        return sendJson(res, 200, { ok: true, target });
      }

      if (body.action === "deleteActivationCode") {
        const { codeId } = body;
        db.activationCodes = db.activationCodes.filter((c) => c.id !== codeId && c.code !== codeId);
        saveDb(db);
        return sendJson(res, 200, { ok: true });
      }

      // -------------------------------------------------------------
      // Acción: Módulo de Pedidos y Caja
      // -------------------------------------------------------------
      if (body.action === "getOrders") {
        let targetStore = matchedStore || getActiveStore(db, body.storeId);
        if (isSuperadmin && body.storeId) {
          targetStore = findStore(db, body.storeId) || targetStore;
        }

        // Si es superadmin y no especificó storeId, devuelve todos los pedidos
        if (isSuperadmin && !body.storeId) {
          const allOrders = Object.values(db.stores).flatMap((s) => s.orders || []);
          return sendJson(res, 200, { ok: true, orders: allOrders });
        }

        return sendJson(res, 200, { ok: true, orders: targetStore?.orders || [] });
      }

      if (body.action === "updateOrderStatus") {
        const { orderId, newStatus, paymentStatus, paymentMethod, storeId } = body;
        const targetStore = findStore(db, storeId) || matchedStore || getActiveStore(db);
        const order = (targetStore?.orders || []).find((o) => o.id === orderId);
        if (order) {
          if (newStatus) order.orderStatus = newStatus;
          if (paymentStatus) order.paymentStatus = paymentStatus;
          if (paymentMethod) order.paymentMethod = paymentMethod;
          if (paymentStatus === "pagado" && !order.paidAt) order.paidAt = new Date().toISOString();
          order.updatedAt = new Date().toISOString();
          saveDb(db);
        }
        return sendJson(res, 200, { ok: true, orderId });
      }

      if (body.action === "payOrder") {
        const { orderId, paymentMethod, storeId } = body;
        const targetStore = findStore(db, storeId) || matchedStore || getActiveStore(db);
        const order = (targetStore?.orders || []).find((o) => o.id === orderId);
        if (order) {
          order.paymentStatus = "pagado";
          order.paymentMethod = paymentMethod || "efectivo";
          order.paidAt = new Date().toISOString();
          saveDb(db);
        }
        return sendJson(res, 200, { ok: true, orderId });
      }

      if (body.action === "deleteOrder") {
        const { orderId, storeId } = body;
        const targetStore = findStore(db, storeId) || matchedStore || getActiveStore(db);
        if (targetStore && targetStore.orders) {
          targetStore.orders = targetStore.orders.filter((o) => o.id !== orderId);
          saveDb(db);
        }
        return sendJson(res, 200, { ok: true, orderId });
      }

      // =============================================================
      // GUARDAR CAMBIOS: Portada, Datos del Comercio, Precios y Menú
      // CADA USUARIO GUARDA SU PROPIO BANNER, TELÉFONOS Y MENÚ
      // EL ADMINISTRADOR PUEDE MODIFICAR TANTO EL DEMO COMO COMERCIOS
      // =============================================================
      const isExplicitDemoUpdate =
        body.action === "updateDemoStore" ||
        body.storeId === "losamigos" ||
        body.targetStoreId === "losamigos" ||
        body.storeId === "menupy" ||
        body.targetStoreId === "menupy";

      const isSuperAdminSaving = Boolean(
        isExplicitDemoUpdate ||
        body.role === "superadmin" ||
        body.user === "usuario" ||
        body.user === "admin" ||
        body.storeId === "admin" ||
        body.storeId === "losamigos" ||
        body.storeId === "menupy" ||
        (body.user && String(body.user).toLowerCase() === "mecanicadakar@gmail.com")
      );

      let targetStore = null;

      // 1. Determinar cuál comercio se está modificando
      if (body.targetStoreId) {
        targetStore = findStore(db, body.targetStoreId);
      } else if (body.storeId && body.storeId !== "admin") {
        targetStore = findStore(db, body.storeId);
      }
      if (!targetStore && (isSuperAdminSaving || isExplicitDemoUpdate)) {
        targetStore = findStore(db, "menupy") || findStore(db, "losamigos") || findStore(db, "admin") || db.stores["menupy"] || db.stores["losamigos"];
      }
      if (!targetStore && matchedStore) {
        targetStore = matchedStore;
      }
      if (!targetStore && body.business?.adminUser) {
        targetStore = findStore(db, body.business.adminUser);
      }
      if (!targetStore) {
        targetStore = getActiveStore(db);
      }

      if (!targetStore) {
        return sendJson(res, 404, { ok: false, error: "Comercio no encontrado para guardar los datos." });
      }

      if (!targetStore.business) {
        targetStore.business = {};
      }

      // Actualizar datos del negocio en la tienda correspondiente
      if (body.business && typeof body.business === "object") {
        const b = body.business;
        if (b.name !== undefined) targetStore.business.name = b.name;
        if (b.slogan !== undefined) targetStore.business.slogan = b.slogan;

        // Sincronizar número de teléfono (internacional y visible)
        let resolvedIntl = b.phoneIntl;
        let resolvedDisplay = b.phoneDisplay;

        const dispDigits = String(resolvedDisplay || "").replace(/\D/g, "");
        if (dispDigits.length >= 9 && (!resolvedIntl || resolvedIntl === "595981456789")) {
          let d = dispDigits;
          if (d.startsWith("0")) d = "595" + d.slice(1);
          else if (!d.startsWith("595") && d.length === 9) d = "595" + d;
          resolvedIntl = d;
        }

        if (resolvedIntl) {
          const clean = String(resolvedIntl).replace(/\D/g, "");
          targetStore.business.phoneIntl = clean;
          if (!resolvedDisplay || resolvedDisplay === "0981 123 456") {
            if (clean.startsWith("595") && clean.length === 12) {
              const local = "0" + clean.slice(3);
              resolvedDisplay = `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
            } else {
              resolvedDisplay = `+${clean}`;
            }
          }
        }
        if (resolvedDisplay !== undefined) {
          targetStore.business.phoneDisplay = resolvedDisplay;
        }

        if (b.address !== undefined) targetStore.business.address = b.address;
        if (b.deliveryNote !== undefined) targetStore.business.deliveryNote = b.deliveryNote;
        if (b.rubro !== undefined) targetStore.business.rubro = b.rubro;
        if (b.city !== undefined) targetStore.business.city = b.city;
        if (b.schedule !== undefined) targetStore.business.schedule = b.schedule;
        if (b.welcomeMessage !== undefined) targetStore.business.welcomeMessage = b.welcomeMessage;
        
        if (b.bannerImage !== undefined) {
          targetStore.business.bannerImage = b.bannerImage;
          // Si el usuario Administrador guarda la portada o es actualización del demo,
          // fijar esta imagen en todas las variantes de demo pública
          if (isSuperAdminSaving || isExplicitDemoUpdate) {
            if (db.stores["menupy"]) db.stores["menupy"].business.bannerImage = b.bannerImage;
            if (db.stores["admin"]) db.stores["admin"].business.bannerImage = b.bannerImage;
            if (db.stores["losamigos"]) db.stores["losamigos"].business.bannerImage = b.bannerImage;
            if (db.stores["demo"]) db.stores["demo"].business.bannerImage = b.bannerImage;
          }
        }
        
        // Cambio de credenciales de este comercio
        if (b.adminUser && String(b.adminUser).trim()) {
          const newUsername = String(b.adminUser).trim().toLowerCase();
          targetStore.business.adminUser = newUsername;
          targetStore.username = newUsername;
        }
        if (b.newPin && String(b.newPin).trim()) {
          targetStore.pin = String(b.newPin).trim();
          targetStore.business.adminPin = String(b.newPin).trim();
        }

        // Si el superadmin guarda la demo, sincronizar también en menupy, losamigos, admin y demo
        const isDemoTarget = targetStore.id === "losamigos" || targetStore.id === "menupy" || targetStore.id === "admin" || targetStore.id === "demo";
        if ((isSuperAdminSaving || isExplicitDemoUpdate) && isDemoTarget) {
          const syncStores = [db.stores["menupy"], db.stores["losamigos"], db.stores["admin"], db.stores["demo"]].filter(Boolean);
          for (const s of syncStores) {
            if (b.name !== undefined) s.business.name = b.name;
            if (b.slogan !== undefined) s.business.slogan = b.slogan;
            if (targetStore.business.phoneIntl !== undefined) s.business.phoneIntl = targetStore.business.phoneIntl;
            if (targetStore.business.phoneDisplay !== undefined) s.business.phoneDisplay = targetStore.business.phoneDisplay;
            if (b.address !== undefined) s.business.address = b.address;
            if (b.deliveryNote !== undefined) s.business.deliveryNote = b.deliveryNote;
            if (b.bannerImage !== undefined) s.business.bannerImage = b.bannerImage;
            if (b.rubro !== undefined) s.business.rubro = b.rubro;
            if (b.city !== undefined) s.business.city = b.city;
            if (b.schedule !== undefined) s.business.schedule = b.schedule;
            if (b.welcomeMessage !== undefined) s.business.welcomeMessage = b.welcomeMessage;
          }
        }
      }

      if (body.deliveryNote !== undefined) {
        targetStore.business.deliveryNote = body.deliveryNote;
      }

      // Guardar el menú específico de este comercio
      if (Array.isArray(body.menu)) {
        targetStore.menu = body.menu;
        // Si el superadmin modifica el menú de la demo o de admin, sincronizarlo para que se vea reflejado en la demo
        const isDemoTarget = targetStore.id === "losamigos" || targetStore.id === "menupy" || targetStore.id === "admin" || targetStore.id === "demo";
        if ((isSuperAdminSaving || isExplicitDemoUpdate) && isDemoTarget) {
          if (db.stores["menupy"]) db.stores["menupy"].menu = body.menu;
          if (db.stores["losamigos"]) db.stores["losamigos"].menu = body.menu;
          if (db.stores["admin"]) db.stores["admin"].menu = body.menu;
          if (db.stores["demo"]) db.stores["demo"].menu = body.menu;
        }
      }

      // Guardar en la base de datos persistente (manteniendo la tienda demo "losamigos" limpia para visitantes)
      saveDb(db);

      return sendJson(res, 200, {
        ok: true,
        storeId: targetStore.id,
        business: targetStore.business,
        menu: targetStore.menu,
        message: `¡Cambios guardados con éxito para ${targetStore.business.name}!`,
      });
    } catch (err) {
      console.error("[API Menu Error]:", err);
      return sendJson(res, 500, { ok: false, error: String(err.message || err) });
    }
  }

  return sendJson(res, 405, { error: "Método no permitido" });
}
