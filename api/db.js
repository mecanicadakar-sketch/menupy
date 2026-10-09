// api/db.js
// Gestor de base de datos multi-comercio persistente en disco (data/caserita_db.json)
// Soporta aislamiento de datos por usuario/comercio: cada comercio tiene su propio
// banner, teléfono, menú, pedidos y credenciales.

import fs from "fs";
import path from "path";

const DB_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DB_DIR, "caserita_db.json");

const DEFAULT_MENU_LOSAMIGOS = [
  {
    category: "Platos Principales",
    icon: "almuerzo",
    items: [
      {
        id: "alm1",
        name: "Menú del día",
        desc: "Plato completo nutritivo, incluye guarnición del día",
        price: 25000,
        image: "",
      },
      {
        id: "alm2",
        name: "Milanesa de Carne con Guarnición",
        desc: "Acompañada de papas fritas crocantes o ensalada mixta",
        price: 30000,
        image: "",
      },
      {
        id: "alm3",
        name: "Tallarines Caseros con Estofado",
        desc: "Pasta fresca artesanal con salsa de estofado de carne",
        price: 28000,
        image: "",
      },
    ],
  },
  {
    category: "Bebidas",
    icon: "bebida",
    items: [
      {
        id: "beb1",
        name: "Gaseosa 500ml",
        desc: "Coca-Cola, Sprite o Fanta (bien fría)",
        price: 8000,
        image: "",
      },
      {
        id: "beb2",
        name: "Jugo Natural Exprimido 500ml",
        desc: "Naranja exprimida fresca o frutas de estación",
        price: 12000,
        image: "",
      },
      {
        id: "beb3",
        name: "Agua Mineral 500ml",
        desc: "Con o sin gas, purificada",
        price: 5000,
        image: "",
      },
    ],
  },
  {
    category: "Postres",
    icon: "postre",
    items: [
      {
        id: "pos1",
        name: "Flan Casero con Dulce de Leche",
        desc: "Receta tradicional casera con caramelo dorado",
        price: 12000,
        image: "",
      },
      {
        id: "pos2",
        name: "Tarta Dulce Artesanal",
        desc: "Porción de tarta de frutilla o pasta frola",
        price: 15000,
        image: "",
      },
      {
        id: "pos3",
        name: "Ensalada de Frutas Frescas",
        desc: "Frutas de estación picadas en jugo natural",
        price: 10000,
        image: "",
      },
    ],
  },
];

const DEFAULT_MENU_BURGERHOUSE = [
  {
    category: "Hamburguesas Artesanales",
    icon: "hamburguesa",
    items: [
      {
        id: "bh1",
        name: "Hamburguesa Clásica Doble Carne",
        desc: "Doble medallón 150g, queso cheddar, lechuga, tomate y salsa especial",
        price: 32000,
        image: "",
      },
      {
        id: "bh2",
        name: "Burger Bacon & Cheddar",
        desc: "Doble carne, panceta crocante ahumada, extra cheddar fundido y cebolla caramelizada",
        price: 36000,
        image: "",
      },
      {
        id: "bh3",
        name: "Mega Burger Cuádruple",
        desc: "4 medallones de pura carne, cuádruple cheddar, bacon crocante y salsa barbacoa",
        price: 45000,
        image: "",
      },
    ],
  },
  {
    category: "Minutas y Papas",
    icon: "almuerzo",
    items: [
      {
        id: "bh4",
        name: "Papas Fritas Rústicas con Cheddar y Panceta",
        desc: "Porción abundante con lluvia de panceta crocante y ciboulette",
        price: 20000,
        image: "",
      },
      {
        id: "bh5",
        name: "Nuggets de Pollo Crocantes (10 un)",
        desc: "Acompañados con salsa golf y mayonesa al ajo",
        price: 22000,
        image: "",
      },
    ],
  },
  {
    category: "Bebidas",
    icon: "bebida",
    items: [
      {
        id: "bh6",
        name: "Gaseosa 500ml",
        desc: "Coca-Cola, Sprite o Fanta (bien fría)",
        price: 8000,
        image: "",
      },
      {
        id: "bh7",
        name: "Cerveza Artesanal 500ml",
        desc: "Rubia o Roja helada de barril",
        price: 18000,
        image: "",
      },
    ],
  },
];

function createDefaultDb() {
  return {
    version: 1,
    activeStoreId: "losamigos",
    stores: {
      "losamigos": {
        id: "losamigos",
        username: "menupy",
        pin: "comercio123",
        status: "activo",
        business: {
          name: "Menu Py",
          slogan: "Pedí online - Tu Carta Digital y Pedidos por WhatsApp",
          phoneIntl: "595975635770",
          phoneDisplay: "0975 635 770",
          address: "Encarnación, Paraguay",
          bannerImage: "/menupy_mockup_qr.jpg",
          deliveryNote: "El costo de envío se coordina según la zona",
          rubro: "Carta Digital & Gastronomía",
          city: "Encarnación",
          schedule: "Lun a Dom: 11:00 a 15:00 y 19:30 a 23:30",
          adminUser: "menupy",
          isDemoStore: true,
          licenseCode: "CAS-7K9B-X2M4",
          licensePlan: "Plan Anual PRO (1 Año)",
          licenseCost: "1.000.000 Gs. / año",
          licenseCostGs: 1000000,
          licenseDuration: "12 meses",
          licenseStatus: "activado",
          licenseActivatedAt: "2026-03-01T12:00:00.000Z",
          licenseExpiresAt: "2027-03-01T12:00:00.000Z",
          licenseNotes: "Licencia Anual con soporte y actualización oficial",
        },
        menu: DEFAULT_MENU_LOSAMIGOS,
        orders: [
          {
            id: "PED-1577",
            mode: "mesa",
            tableNumber: "3",
            customerName: "Juan",
            customerPhone: "0981778899",
            address: "Mesa 3 (Salón Principal)",
            notes: "Pedido pasado a cocina",
            items: [
              { id: "alm2", name: "Milanesa de Carne con Guarnición", price: 30000, qty: 1 },
              { id: "beb1", name: "Gaseosa 500ml", price: 7000, qty: 1 },
              { id: "pos1", name: "Flan Casero con Dulce de Leche", price: 12000, qty: 1 }
            ],
            totalItems: 3,
            totalPrice: 49000,
            orderStatus: "en_preparacion",
            deliveryStatus: "local",
            paymentStatus: "pendiente",
            paymentMethod: "",
            paidAt: null,
            createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          },
          {
            id: "PED-1001",
            mode: "mesa",
            tableNumber: "4",
            customerName: "Cliente en Salón",
            customerPhone: "",
            address: "",
            notes: "Sin hielo en la bebida",
            items: [
              { id: "alm1", name: "Menú del día", price: 25000, qty: 2 },
              { id: "beb1", name: "Gaseosa 500ml", price: 7000, qty: 2 }
            ],
            totalItems: 4,
            totalPrice: 64000,
            paymentStatus: "pendiente",
            paymentMethod: "",
            paidAt: null,
            createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
          },
        ],
      },
      "burgerhouse": {
        id: "burgerhouse",
        username: "burgerhouse",
        pin: "burger123",
        status: "activo",
        business: {
          name: "Burger House Enc",
          slogan: "Las mejores hamburguesas artesanales de Encarnación",
          phoneIntl: "595975123456",
          phoneDisplay: "0975 123 456",
          address: "Av. Costanera esq. Curupayty, Encarnación",
          bannerImage: "/banner.jpg",
          deliveryNote: "Delivery rápido a todo el centro y barrios aledaños",
          adminUser: "burgerhouse",
          licenseCode: "CAS-4821-M8KP",
          licensePlan: "Plan Mensual",
          licenseCost: "150.000 Gs. / mes",
          licenseCostGs: 150000,
          licenseDuration: "1 mes",
          licenseStatus: "activado",
          licenseActivatedAt: new Date().toISOString(),
          licenseExpiresAt: new Date(Date.now() + 30 * 24 * 3600000).toISOString(),
          licenseNotes: "Habilitación mensual para hamburguesería",
        },
        menu: DEFAULT_MENU_BURGERHOUSE,
        orders: [
          {
            id: "PED-2001",
            mode: "delivery",
            tableNumber: "",
            customerName: "Lucas Benítez",
            customerPhone: "0975112233",
            address: "Barrio Buena Vista, calle 3 c/ Curupayty",
            notes: "Llamar al llegar",
            items: [
              { id: "bh2", name: "Burger Bacon & Cheddar", price: 36000, qty: 2 },
              { id: "bh4", name: "Papas Fritas Rústicas con Cheddar y Panceta", price: 20000, qty: 1 }
            ],
            totalItems: 3,
            totalPrice: 92000,
            orderStatus: "en_camino",
            deliveryStatus: "en_camino",
            paymentStatus: "pendiente",
            paymentMethod: "efectivo",
            paidAt: null,
            createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
          }
        ],
      },
    },
    commercialRegistrations: [
      {
        id: "REG-2026-101",
        businessName: "Menu Py (Demo Oficial)",
        rubro: "Carta Digital & Gastronomía",
        ownerName: "Carlos González",
        whatsapp: "595981456789",
        email: "menupy@gmail.com",
        city: "Encarnación",
        requestedUser: "menupy",
        requestedPassword: "comercio123",
        plan: "anual",
        planTitle: "Plan Anual PRO (Ahorrá 2 meses)",
        amountGs: 1000000,
        paymentMethod: "transferencia",
        paymentRef: "SIPAP #49821 Banco Continental",
        status: "activo",
        createdAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
      },
      {
        id: "REG-2026-102",
        businessName: "Burger House Enc",
        rubro: "Hamburguesería",
        ownerName: "Marcos Giménez",
        whatsapp: "595975123456",
        email: "marcos@burgerhouse.py",
        city: "Encarnación",
        requestedUser: "burgerhouse",
        requestedPassword: "burger123",
        plan: "mensual",
        planTitle: "Plan Mensual",
        amountGs: 150000,
        paymentMethod: "tigo_money",
        paymentRef: "Giro Tigo al 0985 913 400",
        status: "activo",
        createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
      },
    ],
    activationCodes: [
      {
        id: "ACT-101",
        code: "CAS-7K9B-X2M4",
        businessName: "Menu Py (Demo Oficial)",
        ownerName: "Carlos González",
        email: "menupy@gmail.com",
        whatsapp: "595981456789",
        plan: "Plan Anual PRO (1 Año)",
        costFormatted: "1.000.000 Gs. / año",
        costGs: 1000000,
        durationMonths: 12,
        status: "activado",
        createdAt: new Date(Date.now() - 3600000 * 24 * 30).toISOString(),
        activatedAt: new Date(Date.now() - 3600000 * 24 * 20).toISOString(),
        expiresAt: new Date(Date.now() + 3600000 * 24 * 345).toISOString(),
        activatedBy: "Carlos González (Menu Py)",
        notes: "Licencia Anual con soporte y actualización oficial",
      },
      {
        id: "ACT-102",
        code: "CAS-4821-M8KP",
        businessName: "Burger House Enc",
        ownerName: "Marcos Giménez",
        email: "marcos@burgerhouse.py",
        whatsapp: "595975123456",
        plan: "Plan Mensual",
        costFormatted: "150.000 Gs. / mes",
        costGs: 150000,
        durationMonths: 1,
        status: "activado",
        createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
        activatedAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
        expiresAt: new Date(Date.now() + 3600000 * 24 * 28).toISOString(),
        activatedBy: "Marcos Giménez (Burger House Enc)",
        notes: "Habilitación mensual para hamburguesería",
      },
      {
        id: "ACT-103",
        code: "CAS-9900-DEMO",
        businessName: "Licencia Libre / Venta Directa",
        ownerName: "Demostración Oficial",
        whatsapp: "",
        plan: "Plan Semestral",
        costFormatted: "750.000 Gs. / 6 meses",
        costGs: 750000,
        durationMonths: 6,
        status: "disponible",
        createdAt: new Date().toISOString(),
        activatedAt: null,
        expiresAt: null,
        activatedBy: null,
        notes: "Código libre para pruebas y activación inmediata de cualquier comercio",
      },
    ],
  };
}

let inMemoryDb = null;
const TMP_FILE = path.join("/tmp", "caserita_db.json");

export function loadDb() {
  if (inMemoryDb) return inMemoryDb;
  try {
    // 1. Intentar leer desde /tmp si existe en la instancia Serverless de Vercel
    if (fs.existsSync(TMP_FILE)) {
      const rawTmp = fs.readFileSync(TMP_FILE, "utf-8");
      if (rawTmp && rawTmp.trim()) {
        const parsed = JSON.parse(rawTmp);
        if (parsed && parsed.stores) {
          inMemoryDb = parsed;
          return inMemoryDb;
        }
      }
    }

    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, "utf-8");
      if (raw && raw.trim()) {
        const parsed = JSON.parse(raw);
        if (!parsed.stores) parsed.stores = {};
        if (!parsed.commercialRegistrations) parsed.commercialRegistrations = [];
        if (!parsed.activationCodes) parsed.activationCodes = [];
        if (!parsed.activeStoreId) parsed.activeStoreId = "losamigos";
        inMemoryDb = parsed;
        return inMemoryDb;
      }
    }
  } catch (err) {
    console.warn("[Database] Error leyendo caserita_db.json, inicializando:", err);
  }

  inMemoryDb = createDefaultDb();
  saveDb(inMemoryDb);
  return inMemoryDb;
}

export function saveDb(db) {
  inMemoryDb = db;
  // Guardar en /tmp primero (siempre disponible y escribible en Vercel Serverless)
  try {
    fs.writeFileSync(TMP_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (e) {}

  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (err) {
    // En entornos Serverless como Vercel el filesystem raíz es de solo lectura,
    // por lo que se mantiene en memoria y en /tmp
  }
}

// Búsqueda inteligente de un comercio por ID o Username
export function findStore(db, identifier) {
  if (!db || !db.stores) return null;
  if (!identifier) return getActiveStore(db);
  const clean = String(identifier).trim().toLowerCase();
  
  // 1. Superadmin / Usuario Administrador Maestro
  if (clean === "usuario" || clean === "admin" || clean === "superadmin") {
    if (!db.stores["admin"]) {
      db.stores["admin"] = {
        id: "admin",
        username: "usuario",
        pin: "Ricaji270985#",
        status: "activo",
        business: {
          name: "MenuPY - Portal Administrador",
          slogan: "Llevá tu negocio al siguiente nivel - Menús digitales",
          phoneIntl: "595981456789",
          phoneDisplay: "0981 123 456",
          address: "Encarnación, Paraguay",
          bannerImage: "/Flyers-MenuPY.png",
          deliveryNote: "Plataforma oficial de menús digitales",
          adminUser: "usuario",
          isPortalAdmin: true,
        },
        menu: [],
        orders: [],
      };
    }
    return db.stores["admin"];
  }

  // 2. Coincidencia por key exacta o id
  if (db.stores[clean]) return db.stores[clean];
  const cleanNoDash = clean.replace(/[\s-]+/g, "");
  for (const s of Object.values(db.stores)) {
    if (String(s.id).toLowerCase() === clean) return s;
    if (String(s.username || "").toLowerCase() === clean) return s;
    if (String(s.business?.adminUser || "").toLowerCase() === clean) return s;
    if (String(s.ownerEmail || "").toLowerCase() === clean) return s;
    if (String(s.email || "").toLowerCase() === clean) return s;
    if (s.ownerEmail && s.ownerEmail.split("@")[0].toLowerCase() === clean) return s;
    if (s.email && s.email.split("@")[0].toLowerCase() === clean) return s;
    if (s.username && s.username.includes("@") && s.username.split("@")[0].toLowerCase() === clean) return s;
    // Coincidencia por nombre de fantasía / slug limpio del local (ej: "La Caserita" -> "lacaserita")
    if (s.business?.name) {
      const bizSlug = String(s.business.name).toLowerCase().replace(/[^a-z0-9]/g, "");
      if (bizSlug && (bizSlug === clean || bizSlug === cleanNoDash)) return s;
    }
    // Coincidencia por código de licencia (con o sin guiones)
    if (s.business?.licenseCode) {
      const licClean = String(s.business.licenseCode).toLowerCase().replace(/[\s-]+/g, "");
      if (licClean === cleanNoDash) return s;
    }
  }

  // 3. Coincidencia con códigos de activación
  if (db.activationCodes && Array.isArray(db.activationCodes)) {
    const matchedCode = db.activationCodes.find((ac) => {
      const acClean = String(ac.code || "").toLowerCase().replace(/[\s-]+/g, "");
      const acEmail = String(ac.email || "").toLowerCase();
      const acSlug = acEmail.split("@")[0];
      return acClean === cleanNoDash || acEmail === clean || acSlug === clean;
    });
    if (matchedCode) {
      const storeKey = matchedCode.email || `store_${matchedCode.code.replace(/[^a-z0-9]/gi, "").toLowerCase()}`;
      if (db.stores[storeKey]) return db.stores[storeKey];
      for (const s of Object.values(db.stores)) {
        if (s.business?.licenseCode && String(s.business.licenseCode).toLowerCase().replace(/[\s-]+/g, "") === cleanNoDash) {
          return s;
        }
      }
    }
  }

  // 4. Coincidencia con registros comerciales
  if (db.commercialRegistrations && Array.isArray(db.commercialRegistrations)) {
    const reg = db.commercialRegistrations.find((r) => {
      const rUser = String(r.requestedUser || "").toLowerCase();
      const rEmail = String(r.email || "").toLowerCase();
      const rSlug = rUser.split("@")[0];
      const rBizSlug = String(r.businessName || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      return rUser === clean || rEmail === clean || rSlug === clean || (rBizSlug && (rBizSlug === clean || rBizSlug === cleanNoDash));
    });
    if (reg) {
      const storeKey = (reg.requestedUser || "").toLowerCase();
      if (db.stores[storeKey]) return db.stores[storeKey];
      const storeSlug = `store_${storeKey.split("@")[0]}`;
      if (db.stores[storeSlug]) return db.stores[storeSlug];
    }
  }

  // 5. Coincidencias para tiendas de demostración / iniciales
  if (clean === "menupy" || clean === "menu_py" || clean === "menu-py" || clean === "losamigos" || clean === "gerente" || clean === "comercio" || clean === "demo" || clean === "caserita") {
    return db.stores["menupy"] || db.stores["losamigos"] || Object.values(db.stores)[0] || null;
  }

  return null;
}

// Obtener la tienda activa para visualización pública (Modo Demo limpio por defecto si no hay comercio específico en la URL)
export function getActiveStore(db, requestedId) {
  if (requestedId) {
    const requested = findStore(db, requestedId);
    if (requested) return requested;
  }

  // Devolver siempre la tienda oficial de demostración limpia ("menupy" / "losamigos")
  // con la imagen fija del portal, evitando fugas de comercios registrados
  return db.stores["menupy"] || db.stores["losamigos"] || db.stores["demo"] || Object.values(db.stores)[0] || null;
}
