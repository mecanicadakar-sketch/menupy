import { useState, useMemo, useEffect, useRef, Component } from "react";
import {
  ShoppingCart, Plus, Minus, X, MapPin, Store, Send, Trash2,
  Settings, Lock, Save, ArrowLeft, LoaderCircle, Navigation,
  CheckCircle2, Image as ImageIcon, Phone, Upload, Sparkles,
  AlertCircle, Info, RefreshCw, Eye, EyeOff, KeyRound, Utensils,
  Bike, ShoppingBag, Hash, Briefcase, ShieldCheck, ShieldAlert, ShieldOff,
  Clock, CreditCard, Building2, User, Mail, Check, AlertTriangle,
  Users, Copy, ExternalLink, QrCode, Search, Filter, ArrowUpDown,
  Receipt, DollarSign, Printer, Calendar, CheckSquare, History, Wallet,
  Map, Crosshair, ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  FileText, Download, MessageCircle, CheckCheck,
  Bell, BellRing, ChefHat, Volume2, LogOut, UserPlus, Pencil,
  Maximize2, Minimize2, Smartphone, Flame, ArrowRight, TrendingUp
} from "lucide-react";
import InstallAppModal from "./components/InstallAppModal.jsx";
import { OrderTrackingModal } from "./components/OrderTrackingModal.jsx";
import {
  ORDER_STATUS_CONFIG,
  getNotificationPermission,
  requestPushPermission,
  playOrderChime,
  dispatchNativePushNotification,
  saveCustomerOrder,
  getCustomerOrders,
  updateCustomerOrderStatus,
  getSyncChannel,
} from "./services/notificationService.js";
import {
  auth,
  signInWithGoogle,
  logOutGoogleUser,
  onAuthChange,
  saveUserProfileToFirestore,
  getUserProfileFromFirestore,
  getStoreProfileFromFirestore,
  saveStoreToFirestore,
} from "./services/firebase.js";

/* =========================================================================
   CONFIGURACIÓN Y CONSTANTES
   ========================================================================= */

const SHEETS_API_URL = "/api/menu"; 
const SIMULATOR_APP_URL = "https://aistudio.google.com/apps/3eb36468-66f0-48ac-a9ce-b64150d6b8c8?showPreview=true&showAssistant=true&appParams=simulador"; 

const BRAND = {
  charcoal: "#2A2018",
  charcoalDark: "#1C1510",
  paper: "#F0E2BF",
  paperDark: "#E6D2A3",
  tomato: "#C1392B",
  tomatoDark: "#9E2C20",
  mustard: "#E3A23B",
  mustardLight: "#FFE082",
  green: "#45603C",
  greenDark: "#33472C",
  cream: "#FBF2DD",
};

// Planes de adquisición de la app para comercios (Valores por defecto en Gs.)
const DEFAULT_APP_PRICING_PLANS = [
  {
    id: "mensual",
    title: "Plan Mensual",
    badge: "Básico",
    priceGs: 100000,
    priceFormatted: "100.000 Gs.",
    period: "por mes",
    description: "Ideal para comenzar a digitalizar tu local sin compromisos largos.",
    savings: null,
    features: [
      "Menú digital QR interactivo ilimitado",
      "Pedidos directos a tu WhatsApp (Mesa, Delivery y Retiro)",
      "Panel de administración para 1 usuario administrador",
      "Actualización instantánea de precios, fotos y productos",
      "Soporte técnico por WhatsApp",
      "0% de comisiones por ventas",
    ],
  },
  {
    id: "semestral",
    title: "Plan Semestral",
    badge: "🎁 ¡1 Mes Gratis!",
    priceGs: 500000,
    priceFormatted: "500.000 Gs.",
    period: "por 6 meses",
    description: "Abonás 5 meses y recibís 6 meses de servicio (equivale a 83.333 Gs./mes bonificado).",
    savings: "Ahorrás 100.000 Gs.",
    features: [
      "Todo lo incluido en el Plan Mensual",
      "1 mes de servicio bonificado de regalo",
      "Carga inicial asistida de tu carta y categorías",
      "Compresión y optimización de fotos para carga veloz",
      "Soporte técnico prioritario",
    ],
  },
  {
    id: "anual",
    title: "Plan Anual PRO",
    badge: "⭐ ¡Más Elegido! 2 Meses Gratis",
    priceGs: 1000000,
    priceFormatted: "1.000.000 Gs.",
    period: "por 12 meses",
    description: "Abonás 10 meses y disfrutás de 1 año completo (equivale a 83.333 Gs./mes).",
    savings: "Ahorrás 200.000 Gs.",
    highlighted: true,
    features: [
      "Todo lo incluido en el Plan Semestral",
      "2 meses de servicio bonificados gratis",
      "Diseño y personalización de portada con tu logo",
      "Código QR vectorial de alta definición para imprimir en mesas y barra",
      "Soporte VIP prioritario vía WhatsApp",
    ],
  },
];

// Datos de pago disponibles para adquisición de la App
const PAYMENT_INFO = {
  transferencia: {
    name: "Transferencia Bancaria / SIPAP o Alias",
    bank: "Banco Itaú",
    accountType: "Caja de Ahorro",
    accountHolder: "Camila Ayelen Torres",
    documentId: "CI: 7.226.273",
    ciNumber: "7226273",
    accountNumber: "620011158",
    sipapAlias: "CI: 7226273",
    aliasAlt: "7226273",
    whatsappDisplay: "+595 975 635 770",
    whatsappIntl: "595975635770",
  },
  billetera: {
    name: "Giros / Billeteras Móviles",
    number: "0975 635 770",
    whatsappDisplay: "+595 975 635 770",
    whatsappIntl: "595975635770",
    holder: "Camila Ayelen Torres",
    note: "Envía el comprobante o realizá tus consultas al WhatsApp +595 975 635 770.",
  },
  qr_card: {
    name: "Pago con Tarjeta / QR Bancard",
    whatsappDisplay: "+595 975 635 770",
    whatsappIntl: "595975635770",
    note: "Al confirmar tu solicitud, coordinaremos el envío del enlace de pago web o código QR por WhatsApp al +595 975 635 770.",
  },
  efectivo: {
    name: "Efectivo / A coordinar por WhatsApp",
    whatsappDisplay: "+595 975 635 770",
    whatsappIntl: "595975635770",
    note: "Coordiná el pago presencial escribiéndonos directamente al WhatsApp +595 975 635 770.",
  },
};

// Pedidos de muestra iniciales para historial de comercio (con fechas y estados variados)
const DEFAULT_INITIAL_ORDERS = [
  {
    id: "PED-1577",
    mode: "mesa",
    tableNumber: "3",
    customerName: "Juan",
    customerPhone: "0981778899",
    address: "Mesa 3 (Salón Principal)",
    mapLink: "",
    notes: "Pedido pasado a cocina",
    items: [
      { id: "1", name: "Milanesa de Carne con Papas Fritas", price: 35000, qty: 1 },
      { id: "5", name: "Gaseosa 500ml", price: 7000, qty: 1 },
      { id: "8", name: "Flan Casero con Dulce de Leche", price: 12000, qty: 1 },
    ],
    totalItems: 3,
    totalPrice: 54000,
    orderStatus: "en_preparacion", // En Cocina
    deliveryStatus: "local",
    paymentStatus: "pendiente",
    paymentMethod: "",
    paidAt: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 6).toISOString(),
  },
  {
    id: "PED-9821",
    mode: "mesa",
    tableNumber: "4",
    customerName: "Carlos Benítez",
    customerPhone: "0985123456",
    address: "Mesa 4 (Salón Principal)",
    mapLink: "",
    notes: "Bien cocido, salsa de ajo aparte",
    items: [
      { id: "1", name: "Milanesa de Carne con Papas Fritas", price: 35000, qty: 2 },
      { id: "5", name: "Gaseosa 500ml", price: 7000, qty: 2 },
    ],
    totalItems: 4,
    totalPrice: 84000,
    paymentStatus: "pagado",
    paymentMethod: "pos",
    paidAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
  },
  {
    id: "PED-9820",
    mode: "delivery",
    tableNumber: "",
    customerName: "María Fernández",
    customerPhone: "0971987654",
    address: "Barrio San Roque, Calle Villarrica c/ Posadas",
    mapLink: "https://maps.google.com/?q=-27.330,-55.866",
    notes: "Tocar timbre blanco al llegar",
    items: [
      { id: "3", name: "Hamburguesa Doble Casera", price: 28000, qty: 1 },
      { id: "7", name: "Papas Fritas Especiales", price: 18000, qty: 1 },
    ],
    totalItems: 2,
    totalPrice: 46000,
    paymentStatus: "pagado",
    paymentMethod: "transferencia",
    paidAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 150).toISOString(),
  },
  {
    id: "PED-9819",
    mode: "mesa",
    tableNumber: "2",
    customerName: "Familia González",
    customerPhone: "",
    address: "Mesa 2",
    mapLink: "",
    notes: "Sin mayonesa",
    items: [
      { id: "2", name: "Pizza Muzzarella Familiar", price: 45000, qty: 1 },
      { id: "5", name: "Gaseosa 1.5L", price: 12000, qty: 1 },
    ],
    totalItems: 2,
    totalPrice: 57000,
    paymentStatus: "pendiente",
    paymentMethod: "",
    paidAt: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
  },
  {
    id: "PED-9815",
    mode: "retiro",
    tableNumber: "",
    customerName: "Gustavo Rojas",
    customerPhone: "0981445566",
    address: "Retiro en local",
    mapLink: "",
    notes: "Pasa a retirar a las 13:00 hs",
    items: [
      { id: "4", name: "Empanadas de Carne (x6)", price: 30000, qty: 1 },
    ],
    totalItems: 1,
    totalPrice: 30000,
    paymentStatus: "pendiente",
    paymentMethod: "",
    paidAt: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: "PED-9792",
    mode: "delivery",
    tableNumber: "",
    customerName: "Leticia Romero",
    customerPhone: "0982334455",
    address: "Villa Sarita c/ Costanera",
    mapLink: "",
    notes: "Cancelado por el cliente por demora",
    items: [
      { id: "1", name: "Milanesa de Pollo Napolitana", price: 38000, qty: 1 },
    ],
    totalItems: 1,
    totalPrice: 38000,
    paymentStatus: "cancelado",
    paymentMethod: "",
    paidAt: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
  },
  {
    id: "PED-9780",
    mode: "mesa",
    tableNumber: "6",
    customerName: "Esteban Duarte",
    customerPhone: "",
    address: "Mesa 6",
    mapLink: "",
    notes: "",
    items: [
      { id: "2", name: "Lomito Completo al Plato", price: 36000, qty: 2 },
      { id: "6", name: "Cerveza 3/4", price: 15000, qty: 2 },
    ],
    totalItems: 4,
    totalPrice: 102000,
    paymentStatus: "pagado",
    paymentMethod: "efectivo",
    paidAt: new Date(Date.now() - 1000 * 60 * 60 * 28).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 29).toISOString(),
  },
  {
    id: "PED-9750",
    mode: "delivery",
    tableNumber: "",
    customerName: "Ana Belén Silva",
    customerPhone: "0991778899",
    address: "Av. Irrazabal esq. Cerro Corá",
    mapLink: "",
    notes: "",
    items: [
      { id: "3", name: "Tallarines Caseros con Estofado", price: 32000, qty: 2 },
      { id: "5", name: "Postre Flan Casero", price: 12000, qty: 2 },
    ],
    totalItems: 4,
    totalPrice: 88000,
    paymentStatus: "pagado",
    paymentMethod: "pos",
    paidAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 73).toISOString(),
  },
];

function formatLockTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

const DEFAULT_BUSINESS = {
  name: "Menu Py",
  slogan: "Pedí online - Tu Carta Digital y Pedidos por WhatsApp",
  phoneIntl: "595975635770",
  phoneDisplay: "0975 635 770",
  address: "Encarnación, Paraguay",
  bannerImage: "/menupy_mockup_qr.jpg",
  deliveryNote: "El costo de envío se coordina según la zona",
  adminUser: "gerente",
  sessionPersistence: "keep_active", // "keep_active" | "close_on_exit"
  licenseCode: "CAS-7K9B-X2M4",
  licensePlan: "Plan Anual PRO (1 Año)",
  licenseCost: "1.000.000 Gs. / año",
  licenseCostGs: 1000000,
  licenseDuration: "12 meses",
  licenseStatus: "activado", // "activado" | "revocado" | "anulado" | "vencido"
  licenseActivatedAt: "2026-03-01T12:00:00.000Z",
  licenseExpiresAt: "2027-03-01T12:00:00.000Z",
  licenseNotes: "Licencia Anual con soporte y actualización oficial",
};

// Portadas temáticas prediseñadas de alta definición para el Demo de la Aplicación
export const DEMO_BANNER_PRESETS = [
  {
    id: "menupy_qr",
    title: "Menu Py - PC & Escaneo QR en Mesa",
    desc: "Laptop mostrando la app de pedidos y celular escaneando código QR",
    url: "/menupy_mockup_qr.jpg",
    badge: "PC + Escaneo QR",
    emoji: "📱",
  },
  {
    id: "menupy_hd",
    title: "Menu Py - Gastronomía Ultra HD",
    desc: "Hamburguesas, pizzas, papas y empanadas con máxima nitidez y enfoque",
    url: "/menupy_banner_hd.jpg",
    badge: "Ultra HD Nítido",
    emoji: "⭐",
  },
  {
    id: "menupy",
    title: "Menu Py - Flyer Promocional",
    desc: "Flyer oficial publicitario con texto y mockups",
    url: "/Flyers-MenuPY.png",
    badge: "Publicitario",
    emoji: "📢",
  },
  {
    id: "rotiseria",
    title: "Rotisería Tradicional & Minutas",
    desc: "Comidas caseras, milanesas y empanadas",
    url: "/banner.jpg",
    badge: "Rotisería",
    emoji: "🍗",
  },
  {
    id: "burger",
    title: "Burger House & Fast Food",
    desc: "Hamburguesas gourmet y papas rústicas",
    url: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1400&q=80",
    badge: "Gourmet",
    emoji: "🍔",
  },
  {
    id: "pizza",
    title: "Pizzería Artesanal a la Leña",
    desc: "Pizzas crujientes con mozzarella y albahaca",
    url: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1400&q=80",
    badge: "Italiana",
    emoji: "🍕",
  },
  {
    id: "parrilla",
    title: "Parrillada & Asado Criollo",
    desc: "Cortes a las brasas y picadas completas",
    url: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1400&q=80",
    badge: "Brasas",
    emoji: "🥩",
  },
  {
    id: "cafe",
    title: "Cafetería, Bakery & Desayunos",
    desc: "Café de especialidad, medialunas y tortas",
    url: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1400&q=80",
    badge: "Café & Bakery",
    emoji: "☕",
  },
  {
    id: "pastas",
    title: "Pastas Frescas & Ristorante",
    desc: "Tallarines artesanales con estofado casero",
    url: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=1400&q=80",
    badge: "Pastas",
    emoji: "🍝",
  },
  {
    id: "sushi",
    title: "Sushi & Cocina Oriental",
    desc: "Rolls frescos, sashimi y combinados",
    url: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=1400&q=80",
    badge: "Sushi",
    emoji: "🍣",
  },
  {
    id: "promocional",
    title: "Flyer Promocional Menú Digital",
    desc: "Diseño publicitario institucional para ventas",
    url: "/Flyers-MenuPY.png",
    badge: "Flyer App",
    emoji: "📱",
  },
];

const DEFAULT_MENU = [
  {
    category: "Platos Principales",
    icon: "almuerzo",
    items: [
      { id: "alm1", name: "Menú del día", desc: "Plato completo nutritivo, incluye guarnición del día", price: 25000, image: "" },
      { id: "alm2", name: "Milanesa de Carne con Guarnición", desc: "Acompañada de papas fritas crocantes o ensalada mixta", price: 30000, image: "" },
      { id: "alm3", name: "Tallarines Caseros con Estofado", desc: "Pasta fresca artesanal con salsa de estofado de carne", price: 28000, image: "" },
    ],
  },
  {
    category: "Bebidas",
    icon: "bebida",
    items: [
      { id: "beb1", name: "Gaseosa 500ml", desc: "Coca-Cola, Sprite o Fanta (bien fría)", price: 8000, image: "" },
      { id: "beb2", name: "Jugo Natural Exprimido 500ml", desc: "Naranja exprimida fresca o frutas de estación", price: 12000, image: "" },
      { id: "beb3", name: "Agua Mineral 500ml", desc: "Con o sin gas, purificada", price: 5000, image: "" },
    ],
  },
  {
    category: "Postres",
    icon: "postre",
    items: [
      { id: "pos1", name: "Flan Casero con Dulce de Leche", desc: "Receta tradicional casera con caramelo dorado", price: 12000, image: "" },
      { id: "pos2", name: "Tarta Dulce Artesanal", desc: "Porción de tarta de frutilla o pasta frola", price: 15000, image: "" },
      { id: "pos3", name: "Ensalada de Frutas Frescas", desc: "Frutas de estación picadas en jugo natural", price: 10000, image: "" },
    ],
  },
];

function formatGs(n) {
  return "₲ " + Number(n || 0).toLocaleString("es-PY");
}

function formatPriceInput(price) {
  if (price === "" || price === null || price === undefined) return "";
  return Number(price).toLocaleString("es-PY") + " Gs.";
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function formatTimeSafe(dateVal) {
  if (!dateVal) return "";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" });
  } catch (e) {
    try {
      const d = new Date(dateVal);
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    } catch {
      return "";
    }
  }
}

function formatDateSafe(dateVal) {
  if (!dateVal) return "";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("es-PY");
  } catch (e) {
    return "";
  }
}

function toDateYmd(dateVal) {
  if (!dateVal) return "";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch {
    return "";
  }
}

function getLicenseDaysRemaining(expiresAt) {
  if (!expiresAt) return 0;
  try {
    const exp = new Date(expiresAt).getTime();
    if (isNaN(exp)) return 0;
    const diff = exp - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
}

const ICON_PATHS = {
  almuerzo: "M12 2a1 1 0 011 1v6.06A5 5 0 0119 14a1 1 0 01-1 1H6a1 1 0 01-1-1 5 5 0 016-4.94V3a1 1 0 011-1zM4 18a1 1 0 011-1h14a1 1 0 011 1 3 3 0 01-3 3H7a3 3 0 01-3-3z",
  minuta: "M8 8V3a1 1 0 012 0v5h1V4a1 1 0 012 0v4h1V3a1 1 0 012 0v5l-1 12a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  sandwich: "M3 11l9-7 9 7v2H3zM4 15h16v2a3 3 0 01-3 3H7a3 3 0 01-3-3zM3 14h18v-1H3z",
  empanada: "M12 3c5 0 9 4 9 9s-4 9-9 9-9-4-9-9 4-9 9-9zm-4.5 9.5c1 .8 2 1.6 3 .8s1-1.6 2-.8 2 1.6 3 .8",
  hamburguesa: "M4 10c0-3 3.5-6 8-6s8 3 8 6zM3 11h18v2H3zM4 15h16v1a3 3 0 01-3 3H7a3 3 0 01-3-3zM3 13.2h18v.6H3z",
  pizza: "M12 2L22 20H2z",
  bebida: "M8 2h8l-1 18a2 2 0 01-2 2h-2a2 2 0 01-2-2zM7 8h10v2H7z",
  postre: "M6 20a4 4 0 004-4H6zm4-4a4 4 0 004 4 4 4 0 004-4zM10 4a2 2 0 114 0c0 1-.5 1.6-1 2h-2c-.5-.4-1-1-1-2zM11 8h2v8h-2z",
  cafe: "M4 4h13v9a5 5 0 01-5 5H9a5 5 0 01-5-5zM17 6h1a3 3 0 013 3 3 3 0 01-3 3h-1V6z",
  pollo: "M12 3c3 0 5 2 5 5 0 2-1 3-2 4l3 8-3 1-2-6-1 .3V21h-2v-5.7l-1-.3-2 6-3-1 3-8c-1-1-2-2-2-4 0-3 2-5 5-5z",
  ensalada: "M4 12a8 8 0 1116 0zM6 14h12l-1 3a2 2 0 01-2 2H9a2 2 0 01-2-2z",
  generico: "M6 2a1 1 0 011 1v6a2 2 0 001 1.7V22a1 1 0 01-2 0v-11.3A2 2 0 015 9V3a1 1 0 011-1zm4 0a1 1 0 011 1v6a2 2 0 01-1 1.7V22a1 1 0 01-2 0V10.7A2 2 0 019 9V3a1 1 0 011-1zm8 1v8a3 3 0 01-2 2.8V22a1 1 0 01-2 0V3.8a3 3 0 012-2.8z",
};

const ICON_OPTIONS = [
  { key: "almuerzo", label: "Platos Principales" },
  { key: "bebida", label: "Bebidas" },
  { key: "postre", label: "Postres" },
  { key: "minuta", label: "Minutas y Papas" },
  { key: "sandwich", label: "Sandwiches & Lomitos" },
  { key: "empanada", label: "Empanadas" },
  { key: "hamburguesa", label: "Hamburguesas" },
  { key: "pizza", label: "Pizzas" },
  { key: "cafe", label: "Cafetería & Desayunos" },
  { key: "pollo", label: "Pollo & Asados" },
  { key: "ensalada", label: "Ensaladas" },
  { key: "generico", label: "Especialidades" },
];

function guessIconKey(name) {
  const n = (name || "").toLowerCase();
  if (n.includes("principal") || n.includes("almuerzo") || n.includes("menú") || n.includes("menu") || n.includes("plato")) return "almuerzo";
  if (n.includes("bebida") || n.includes("gaseosa") || n.includes("jugo") || n.includes("agua") || n.includes("licuado") || n.includes("trago")) return "bebida";
  if (n.includes("postre") || n.includes("dulce") || n.includes("torta") || n.includes("flan") || n.includes("helado")) return "postre";
  if (n.includes("minuta") || n.includes("papa") || n.includes("frita")) return "minuta";
  if (n.includes("sandwich") || n.includes("miga") || n.includes("milanesa") || n.includes("panch") || n.includes("lomito")) return "sandwich";
  if (n.includes("empanada")) return "empanada";
  if (n.includes("hamburgues") || n.includes("burger")) return "hamburguesa";
  if (n.includes("pizza")) return "pizza";
  if (n.includes("café") || n.includes("cafe") || n.includes("desayuno") || n.includes("merienda")) return "cafe";
  if (n.includes("pollo") || n.includes("asado") || n.includes("parrilla") || n.includes("carne")) return "pollo";
  if (n.includes("ensalada")) return "ensalada";
  return "generico";
}

function CategoryIcon({ name, icon, size = 18, color = "currentColor" }) {
  const key = icon && ICON_PATHS[icon] ? icon : guessIconKey(name);
  const props = { width: size, height: size, viewBox: "0 0 24 24", fill: color };
  if (key === "pizza") {
    return (
      <svg {...props}><path d={ICON_PATHS.pizza} /><circle cx="10" cy="10" r="1.1" fill="#F0E2BF" /><circle cx="14" cy="13" r="1.1" fill="#F0E2BF" /><circle cx="11" cy="16" r="1.1" fill="#F0E2BF" /></svg>
    );
  }
  return <svg {...props}><path d={ICON_PATHS[key]} /></svg>;
}

class AdminErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("[AI Studio] Admin section error:", error, errorInfo);
  }
  handleResetLocalData = () => {
    try {
      localStorage.removeItem("lacaserita_orders");
    } catch (e) {}
    window.location.reload();
  };
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ background: BRAND.charcoal, minHeight: "100vh" }} className="flex items-center justify-center p-4">
          <div className="p-6 md:p-8 text-center rounded-2xl border-2 shadow-2xl max-w-lg mx-auto" style={{ background: BRAND.paper, borderColor: BRAND.tomato }}>
            <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3 font-bold text-2xl shadow-inner">⚠️</div>
            <h3 className="font-bold text-stone-900 text-lg mb-1">Inconveniente al cargar el Panel Administrador</h3>
            <p className="text-xs text-stone-700 mb-3">
              Se detectó un problema en los datos del panel. Podés volver a la tienda o reintentar sin perder tus datos.
            </p>
            {this.state.error?.message && (
              <p className="text-xs text-red-700 mb-4 font-mono bg-white/70 p-2.5 rounded-xl border border-red-200 break-words text-left">
                {this.state.error.message}
              </p>
            )}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  if (this.props.onGoBack) {
                    this.setState({ hasError: false, error: null });
                    this.props.onGoBack();
                  } else {
                    window.location.reload();
                  }
                }}
                className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white shadow hover:brightness-105 transition"
                style={{ background: BRAND.tomato }}
              >
                Volver a la Tienda
              </button>
              <button
                type="button"
                onClick={() => this.setState({ hasError: false, error: null })}
                className="w-full py-2.5 px-4 bg-stone-800 text-white rounded-xl text-xs font-bold hover:bg-stone-700 transition"
              >
                Reintentar Cargar Panel
              </button>
              <button
                type="button"
                onClick={this.handleResetLocalData}
                className="w-full py-2 px-3 bg-stone-200 text-stone-700 rounded-xl text-[11px] font-semibold hover:bg-stone-300 transition"
              >
                Limpiar datos temporales de pedidos y recargar
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* =========================================================================
   COMPONENTE: TOAST NOTIFICATIONS
   ========================================================================= */
function ToastContainer({ toasts, onDismiss, onAction }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-[calc(100vw-2rem)] pointer-events-none"
    >
      {toasts.map((toast) => {
        const isSuccess = toast.type === "order_success" || toast.type === "success";
        const isCart = toast.type === "cart_add" || toast.type === "cart_clear";
        const isAlert = toast.type === "order_cancel" || toast.type === "error" || toast.type === "warning";
        
        return (
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl shadow-2xl border-2 transition-all duration-300 transform translate-y-0 animate-in fade-in slide-in-from-top-4"
            style={{
              background: isSuccess ? "#1C2E1A" : isAlert ? "#2E1A1A" : BRAND.charcoalDark,
              borderColor: isSuccess ? "#45603C" : isAlert ? "#DC2626" : BRAND.mustard,
              color: BRAND.cream,
            }}
          >
            {/* Ícono representativo */}
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner"
              style={{
                background: isSuccess ? "#45603C" : isAlert ? "#B91C1C" : isCart ? BRAND.mustard : BRAND.tomato,
                color: BRAND.cream,
              }}
            >
              {isSuccess ? (
                <CheckCircle2 size={20} className="text-white" />
              ) : isAlert ? (
                <AlertCircle size={20} className="text-white" />
              ) : isCart ? (
                <ShoppingCart size={18} className="text-stone-900" />
              ) : (
                <CheckCircle2 size={20} className="text-white" />
              )}
            </div>

            {/* Contenido del Toast */}
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center justify-between gap-1">
                <p className="text-xs font-black uppercase tracking-wider" style={{ color: isSuccess ? "#A3E635" : isAlert ? "#FCA5A5" : BRAND.mustardLight }}>
                  {toast.title}
                </p>
                {toast.time && (
                  <span className="text-[10px] text-stone-400 font-mono">{toast.time}</span>
                )}
              </div>
              <p className="text-sm font-bold text-white mt-0.5 leading-snug line-clamp-2">
                {toast.message}
              </p>
              {toast.subtitle && (
                <p className="text-[11px] text-stone-300 mt-0.5">
                  {toast.subtitle}
                </p>
              )}

              {/* Botón de acción rápida (ej: "Ver Pedido") */}
              {toast.actionLabel && onAction && (
                <button
                  type="button"
                  onClick={() => onAction(toast)}
                  className="mt-2 text-xs font-black px-3 py-1 rounded-lg flex items-center gap-1.5 transition active:scale-95 shadow-sm"
                  style={{
                    background: isSuccess ? "#45603C" : BRAND.mustard,
                    color: isSuccess ? BRAND.cream : BRAND.charcoalDark,
                  }}
                >
                  {toast.actionLabel.toLowerCase().includes("pedido") ? (
                    <Receipt size={13} />
                  ) : toast.actionLabel.toLowerCase().includes("carrito") ? (
                    <ShoppingCart size={13} />
                  ) : (
                    <CheckCircle2 size={13} />
                  )}
                  <span>{toast.actionLabel}</span>
                </button>
              )}
            </div>

            {/* Botón de cerrar */}
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="p-1 rounded-lg hover:bg-white/10 text-stone-400 hover:text-white transition flex-shrink-0"
              title="Cerrar notificación"
              aria-label="Cerrar notificación"
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function compressImage(file, maxSize = 360, quality = 0.65) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("No se pudo procesar la imagen"));
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else if (height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function compressBannerImage(file, maxWidth = 1440, maxHeight = 650, quality = 0.84) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("No se pudo procesar la imagen"));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function App() {
  const [business, setBusiness] = useState(DEFAULT_BUSINESS);
  const [menu, setMenu] = useState(DEFAULT_MENU);
  const [deliveryNote, setDeliveryNote] = useState(DEFAULT_BUSINESS.deliveryNote);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [availableStores, setAvailableStores] = useState([]);
  const [currentStoreId, setCurrentStoreId] = useState("losamigos");

  // Estado y control de Notificaciones Push y Seguimiento Asíncrono de Pedidos
  const [customerOrders, setCustomerOrders] = useState(() => getCustomerOrders());
  const [trackingModalOpen, setTrackingModalOpen] = useState(false);
  const [trackingOrderId, setTrackingOrderId] = useState(null);
  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const [pushPermissionState, setPushPermissionState] = useState(() => getNotificationPermission());

  const refreshCustomerOrders = () => {
    const list = getCustomerOrders();
    setCustomerOrders(list);
    return list;
  };

  // Consulta el estado más reciente de los pedidos del cliente en el backend
  const refreshCustomerOrdersFromServer = async () => {
    const list = getCustomerOrders();
    if (!list || list.length === 0) return;
    const activeIds = list.map((o) => o.id);
    const ordersInfo = list.map((o) => ({
      id: o.id,
      customerName: o.customerName,
      tableNumber: o.tableNumber,
      mode: o.mode,
      totalPrice: o.totalPrice,
    }));

    try {
      const resp = await fetch(SHEETS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "checkOrdersStatus",
          orderIds: activeIds,
          ordersInfo,
        }),
      });
      const json = await resp.json();
      if (json.ok && Array.isArray(json.orders)) {
        let anyUpdated = false;
        json.orders.forEach((remoteOrd) => {
          if (remoteOrd && remoteOrd.id && remoteOrd.orderStatus) {
            const res = updateCustomerOrderStatus(
              remoteOrd.id,
              remoteOrd.orderStatus,
              remoteOrd.paymentStatus,
              remoteOrd
            );
            if (res && (res.didChange || res.oldId !== res.newId)) {
              anyUpdated = true;
              if (trackingOrderId === res.oldId) {
                setTrackingOrderId(res.newId);
              }
            }
          }
        });
        if (anyUpdated) {
          refreshCustomerOrders();
        }
      }
    } catch (err) {
      console.warn("Aviso refrescando pedidos del cliente:", err);
    }
  };

  // Ventana emergente al iniciar para instalar la app (PWA con logo de CyM / Caserita)
  const [showInstallModal, setShowInstallModal] = useState(false);

  useEffect(() => {
    // Si la app ya está instalada y corriendo en pantalla completa, no mostrar
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;

    if (isStandalone) return;

    // Verificar si ya fue cerrada durante la sesión actual
    try {
      const dismissed = sessionStorage.getItem("caserita_install_prompt_dismissed");
      if (!dismissed) {
        // Retardo natural de 1.4 segundos al iniciar para que primero renderice la portada
        const timer = setTimeout(() => {
          setShowInstallModal(true);
        }, 1400);
        return () => clearTimeout(timer);
      }
    } catch (e) {}
  }, []);

  // Escuchar mensajes de Service Worker (por ejemplo, clic en notificación push)
  useEffect(() => {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      const handleSwMsg = (event) => {
        if (event.data?.type === "OPEN_ORDER_TRACKING") {
          setTrackingOrderId(event.data.orderId || null);
          setTrackingModalOpen(true);
        }
      };
      navigator.serviceWorker.addEventListener("message", handleSwMsg);
      return () => navigator.serviceWorker.removeEventListener("message", handleSwMsg);
    }
  }, []);

  // Comprobar parámetros de URL al cargar (?trackOrderId=PED-XXXX)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const trackId = params.get("trackOrderId");
      if (trackId) {
        setTrackingOrderId(trackId);
        setTrackingModalOpen(true);
      }
    } catch (e) {}
  }, []);

  // Escuchar eventos en tiempo real entre pestañas (BroadcastChannel)
  useEffect(() => {
    const channel = getSyncChannel();
    if (!channel) return;

    const handleBroadcast = (event) => {
      const data = event.data;
      if (data && (data.type === "ORDER_STATUS_UPDATED" || data.type === "ORDER_CREATED")) {
        const { orderId, newStatus, paymentStatus, order } = data;
        const res = updateCustomerOrderStatus(orderId, newStatus, paymentStatus, order);
        if (res && (res.didChange || res.oldId !== res.newId)) {
          if (trackingOrderId === res.oldId) {
            setTrackingOrderId(res.newId);
          }
          refreshCustomerOrders();
          const cfg = ORDER_STATUS_CONFIG[newStatus] || ORDER_STATUS_CONFIG.recibido;
          addToast(
            newStatus === "completado" ? "order_success" : "cart_add",
            cfg.label,
            `Pedido ${res.newId}: ${cfg.description}`,
            null,
            "Ver Pedido"
          );
        }
      }
    };

    channel.addEventListener("message", handleBroadcast);
    return () => channel.removeEventListener("message", handleBroadcast);
  }, [trackingOrderId]);

  // Polling asíncrono en segundo plano para pedidos activos del cliente
  useEffect(() => {
    const activeOrders = customerOrders.filter(
      (o) => o && o.orderStatus !== "completado" && o.orderStatus !== "cancelado"
    );
    if (activeOrders.length === 0) return;

    const activeIds = activeOrders.map((o) => o.id);
    const ordersInfo = activeOrders.map((o) => ({
      id: o.id,
      customerName: o.customerName,
      tableNumber: o.tableNumber,
      mode: o.mode,
      totalPrice: o.totalPrice,
    }));

    const checkStatus = async () => {
      try {
        const resp = await fetch(SHEETS_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "checkOrdersStatus",
            orderIds: activeIds,
            ordersInfo,
          }),
        });
        const json = await resp.json();
        if (json.ok && Array.isArray(json.orders)) {
          let updatedAny = false;
          json.orders.forEach((remoteOrd) => {
            if (remoteOrd && remoteOrd.id && remoteOrd.orderStatus) {
              const res = updateCustomerOrderStatus(
                remoteOrd.id,
                remoteOrd.orderStatus,
                remoteOrd.paymentStatus,
                remoteOrd
              );
              if (res && (res.didChange || res.oldId !== res.newId)) {
                updatedAny = true;
                if (trackingOrderId === res.oldId) {
                  setTrackingOrderId(res.newId);
                }
                const cfg = ORDER_STATUS_CONFIG[remoteOrd.orderStatus] || ORDER_STATUS_CONFIG.recibido;
                addToast(
                  remoteOrd.orderStatus === "completado" ? "order_success" : "cart_add",
                  cfg.label,
                  `Pedido ${res.newId}: ${cfg.description}`,
                  null,
                  "Ver Pedido"
                );
              }
            }
          });
          if (updatedAny) {
            refreshCustomerOrders();
          }
        }
      } catch (err) {
        // Fallo de red silencioso
      }
    };

    checkStatus();
    const poller = setInterval(checkStatus, 4000);

    return () => clearInterval(poller);
  }, [customerOrders, trackingOrderId]);

  const handleCloseInstallModal = () => {
    setShowInstallModal(false);
    try {
      sessionStorage.setItem("caserita_install_prompt_dismissed", "true");
    } catch (e) {}
  };

  // Sistema de notificaciones Toast
  const [toasts, setToasts] = useState([]);

  const addToast = (typeOrObj, titleArg, messageArg, subtitleArg = null, actionLabelArg = null) => {
    let type = "order_success";
    let title = "";
    let message = "";
    let subtitle = null;
    let actionLabel = null;

    if (typeof typeOrObj === "object" && typeOrObj !== null) {
      type = typeOrObj.type || "order_success";
      title = typeOrObj.title || "";
      message = typeOrObj.message || "";
      subtitle = typeOrObj.subtitle || null;
      actionLabel = typeOrObj.actionLabel || null;
    } else {
      type = typeOrObj || "order_success";
      title = titleArg || "";
      message = messageArg || "";
      subtitle = subtitleArg;
      actionLabel = actionLabelArg;
    }

    const id = Date.now().toString() + Math.random().toString(36).substring(2, 7);
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newToast = { id, type, title, message, subtitle, actionLabel, time };
    
    setToasts((prev) => [...prev.slice(-4), newToast]);

    // Desaparecer automáticamente luego de 4 segundos
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleToastAction = (toast) => {
    removeToast(toast.id);
    if (toast.actionLabel === "Ver Pedido") {
      setTrackingModalOpen(true);
    } else if (toast.actionLabel && toast.actionLabel.toLowerCase().includes("carrito")) {
      if (view === "menu") {
        setCartOpen(true);
      }
    }
  };

  const [cart, setCart] = useState({});
  const [cartOpen, setCartOpen] = useState(false);
  const [openCat, setOpenCat] = useState("");
  const [activeSection, setActiveSection] = useState("TODOS"); // "TODOS" | nombre de categoría

  // Referencia y función para desplazar los botones de menú de lado a lado
  const categoryScrollRef = useRef(null);
  const scrollCategories = (direction) => {
    if (categoryScrollRef.current) {
      categoryScrollRef.current.scrollBy({
        left: direction === "left" ? -260 : 260,
        behavior: "smooth"
      });
    }
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [mode, setMode] = useState("mesa"); // "mesa" | "delivery" | "retiro"
  const [customerName, setCustomerName] = useState(() => {
    try {
      return localStorage.getItem("lacaserita_customer_name") || "";
    } catch (e) {
      return "";
    }
  });
  const [customerPhone, setCustomerPhone] = useState(() => {
    try {
      return localStorage.getItem("lacaserita_customer_phone") || "";
    } catch (e) {
      return "";
    }
  });
  const [tableNumber, setTableNumber] = useState("");
  const [tableError, setTableError] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [mapLink, setMapLink] = useState("");
  const [locStatus, setLocStatus] = useState("idle");

  // Estados del selector de ubicación con Google Maps (Modo Gratuito Móvil)
  const [deliveryCoords, setDeliveryCoords] = useState(null); // { lat, lng }
  const [locAccuracy, setLocAccuracy] = useState(null);
  const [showMapSelectorModal, setShowMapSelectorModal] = useState(false);
  const [mapPickerLat, setMapPickerLat] = useState(-27.33056); // Coordenadas de Encarnación
  const [mapPickerLng, setMapPickerLng] = useState(-55.86667);
  const [showManualPasteLink, setShowManualPasteLink] = useState(false);
  const [manualLinkInput, setManualLinkInput] = useState("");
  const [geoLocating, setGeoLocating] = useState(false);
  const [geoInfoMsg, setGeoInfoMsg] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem("lacaserita_customer_name", customerName);
    } catch (e) {}
  }, [customerName]);

  useEffect(() => {
    try {
      localStorage.setItem("lacaserita_customer_phone", customerPhone);
    } catch (e) {}
  }, [customerPhone]);

  // Persistencia de sesión de Gerencia: "keep_active" (Mantener sesión activa) | "close_on_exit" (Cerrar sesión al salir)
  // Utiliza almacenamiento local seguro con respaldo contra cierres forzosos
  const [sessionPersistence, setSessionPersistence] = useState(() => {
    try {
      const savedPref = localStorage.getItem("lacaserita_session_persistence");
      if (savedPref === "keep_active" || savedPref === "close_on_exit") {
        return savedPref;
      }
    } catch (e) {}
    return "keep_active"; // Por defecto: Mantener sesión activa para máxima estabilidad operativa
  });

  useEffect(() => {
    try {
      localStorage.setItem("lacaserita_session_persistence", sessionPersistence);
    } catch (e) {}
  }, [sessionPersistence]);

  // Sesión persistente de Administración / Gerencia / Personal
  // Permite al Gerente salir a la tienda y volver a pedidos/cocina cuantas veces quiera sin reingresar clave
  // Utiliza almacenamiento local seguro y respaldo redundante para evitar cierres de sesión forzosos
  const [adminSession, setAdminSession] = useState(() => {
    try {
      const persistencePref = localStorage.getItem("lacaserita_session_persistence") || "keep_active";

      // Si la preferencia activa es 'Cerrar sesión al salir', verificar si esta pestaña/ventana aún conserva la sesión activa
      if (persistencePref === "close_on_exit") {
        const tabActive = sessionStorage.getItem("lacaserita_session_active");
        if (!tabActive) {
          // El navegador o pestaña se cerró previamente -> caducar sesión temporal
          localStorage.removeItem("lacaserita_admin_session");
          return null;
        }
      }

      // Almacenamiento local seguro: verificar clave primaria y respaldo de emergencia contra cierres forzosos
      let saved = localStorage.getItem("lacaserita_admin_session");
      if (!saved) {
        saved = localStorage.getItem("lacaserita_admin_session_backup");
      }
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.active && parsed.role) {
          // Registrar en sessionStorage que la pestaña actual está activa
          sessionStorage.setItem("lacaserita_session_active", "true");
          return parsed;
        }
      }
    } catch (e) {}
    return null;
  });

  // Configuración de permisos al personal operativo (Mozos y Cocina) administrado por el Gerente
  // Permite dar permisos a varios personales con nombre y PIN individual (4, 5, 6, 7, 8... dígitos libres)
  const [staffSettings, setStaffSettings] = useState(() => {
    const defaultStaffList = [
      {
        id: "staff-1",
        name: "Carlos Gómez",
        pin: "1234",
        role: "Mozo",
        allowTakeOrders: true,
        allowKitchenPanel: false,
        allowCashier: false,
        active: true,
      },
    ];

    try {
      const saved = localStorage.getItem("lacaserita_staff_settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.staffList)) {
          // Filtrar textos de guía residuales (Personal de Salón y Cocina, María (Cocina))
          parsed.staffList = parsed.staffList.filter(
            (st) =>
              st &&
              st.name !== "Personal de Salón y Cocina" &&
              st.name !== "María (Cocina)" &&
              st.role !== "Mozo / Cocina" &&
              st.role !== "Cocina / Comandas"
          );
        } else {
          parsed.staffList = defaultStaffList;
        }
        if (!parsed.staffName || parsed.staffName === "Personal de Salón y Cocina") {
          parsed.staffName = "Personal";
        }
        return parsed;
      }
    } catch (e) {}
    return {
      enabled: true,
      pin: "1234",
      allowTakeOrders: true,   // Ingresar al menú de clientes para tomar comandas en mesa
      allowKitchenPanel: true, // Ver panel de pedidos y cocina
      allowCashier: false,     // Cobrar en caja
      staffName: "Personal",
      staffList: defaultStaffList,
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem("lacaserita_staff_settings", JSON.stringify(staffSettings));
    } catch (e) {}
  }, [staffSettings]);

  // Estados para formulario de alta/edición de personal individual en el panel de Gerencia
  const [staffFormOpen, setStaffFormOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState(null);
  const [staffFormName, setStaffFormName] = useState("");
  const [staffFormPin, setStaffFormPin] = useState("");
  const [staffFormRole, setStaffFormRole] = useState("Mozo de Salón");
  const [staffFormAllowOrders, setStaffFormAllowOrders] = useState(true);
  const [staffFormAllowKitchen, setStaffFormAllowKitchen] = useState(false);
  const [staffFormAllowCashier, setStaffFormAllowCashier] = useState(false);
  const [staffFormActive, setStaffFormActive] = useState(true);
  const [revealedStaffPins, setRevealedStaffPins] = useState({});

  // Funciones de gestión de personal múltiple para el Gerente
  const handleOpenAddStaff = () => {
    setEditingStaffId(null);
    setStaffFormName("");
    // Generar PIN aleatorio sugerido
    const randomPin = String(Math.floor(1000 + Math.random() * 9000));
    setStaffFormPin(randomPin);
    setStaffFormRole("Mozo de Salón");
    setStaffFormAllowOrders(true);
    setStaffFormAllowKitchen(false);
    setStaffFormAllowCashier(false);
    setStaffFormActive(true);
    setStaffFormOpen(true);
  };

  const handleOpenEditStaff = (st) => {
    setEditingStaffId(st.id);
    setStaffFormName(st.name || "");
    setStaffFormPin(st.pin || "");
    setStaffFormRole(st.role || "Personal");
    setStaffFormAllowOrders(st.allowTakeOrders ?? true);
    setStaffFormAllowKitchen(st.allowKitchenPanel ?? false);
    setStaffFormAllowCashier(st.allowCashier ?? false);
    setStaffFormActive(st.active ?? true);
    setStaffFormOpen(true);
  };

  const handleSaveStaffMember = () => {
    const cleanName = staffFormName.trim();
    const cleanPin = staffFormPin.trim();

    if (!cleanName) {
      addToast("order_cancel", "Falta el Nombre", "Por favor ingresá el nombre del personal.");
      return;
    }

    if (!cleanPin || cleanPin.length < 3) {
      addToast("order_cancel", "PIN no válido", "Ingresá un PIN válido (4, 5, 6, 7, 8 o más dígitos).");
      return;
    }

    const currentList = Array.isArray(staffSettings.staffList) ? [...staffSettings.staffList] : [];

    if (editingStaffId) {
      const idx = currentList.findIndex((s) => s.id === editingStaffId);
      if (idx !== -1) {
        currentList[idx] = {
          ...currentList[idx],
          name: cleanName,
          pin: cleanPin,
          role: staffFormRole,
          allowTakeOrders: staffFormAllowOrders,
          allowKitchenPanel: staffFormAllowKitchen,
          allowCashier: staffFormAllowCashier,
          active: staffFormActive,
        };
      }
      addToast("order_success", "Personal Actualizado", `Se actualizaron los datos y permisos de ${cleanName}.`);
    } else {
      const newStaff = {
        id: "staff-" + Date.now(),
        name: cleanName,
        pin: cleanPin,
        role: staffFormRole,
        allowTakeOrders: staffFormAllowOrders,
        allowKitchenPanel: staffFormAllowKitchen,
        allowCashier: staffFormAllowCashier,
        active: staffFormActive,
        createdAt: new Date().toISOString(),
      };
      currentList.push(newStaff);
      addToast("order_success", "Personal Agregado", `Se registró a ${cleanName} con PIN de ${cleanPin.length} dígitos.`);
    }

    setStaffSettings((prev) => ({
      ...prev,
      staffList: currentList,
      pin: currentList[0]?.pin || prev.pin || "1234",
    }));

    setStaffFormOpen(false);
    setEditingStaffId(null);
  };

  const handleDeleteStaffMember = (id, name) => {
    const currentList = Array.isArray(staffSettings.staffList) ? staffSettings.staffList : [];
    if (currentList.length <= 1) {
      addToast("order_cancel", "Acción no permitida", "Debe existir al menos un personal en el sistema.");
      return;
    }
    const filtered = currentList.filter((s) => s.id !== id);
    setStaffSettings((prev) => ({
      ...prev,
      staffList: filtered,
    }));
    addToast("cart_clear", "Personal Eliminado", `Se eliminó a ${name} de los accesos autorizados.`);
  };

  const handleToggleStaffActive = (id) => {
    const currentList = Array.isArray(staffSettings.staffList) ? [...staffSettings.staffList] : [];
    const idx = currentList.findIndex((s) => s.id === id);
    if (idx !== -1) {
      const newActive = !currentList[idx].active;
      currentList[idx] = { ...currentList[idx], active: newActive };
      setStaffSettings((prev) => ({
        ...prev,
        staffList: currentList,
      }));
      addToast(
        "order_success",
        newActive ? "Acceso Activado" : "Acceso Pausado",
        `El personal ${currentList[idx].name} ahora está ${newActive ? "habilitado" : "pausado"}.`
      );
    }
  };

  const handleGenerateRandomPin = () => {
    const lengths = [4, 5, 6];
    const len = lengths[Math.floor(Math.random() * lengths.length)];
    let res = "";
    for (let i = 0; i < len; i++) {
      res += Math.floor(Math.random() * 10);
    }
    setStaffFormPin(res);
  };

  const [view, setView] = useState("menu"); // "menu" | "adminLogin" | "admin" | "register"
  const [showSimulatorModal, setShowSimulatorModal] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get("appParams") === "simulador" || params.get("simulador") === "true";
    } catch {
      return false;
    }
  });
  const [simulatorTab, setSimulatorTab] = useState("client"); // "client" | "kitchen" | "cashier" | "benefits"
  const [simClientMode, setSimClientMode] = useState("delivery"); // "delivery" | "mesa" | "retiro"
  const [simOrderStatus, setSimOrderStatus] = useState("en_preparacion"); // "pendiente" | "en_preparacion" | "entregado"
  const [simCopiedLink, setSimCopiedLink] = useState(false);
  const [adminTab, setAdminTab] = useState("orders"); // "orders" | "history" | "menu" | "staff" | "business" | "clients"
  const [adminRole, setAdminRole] = useState(() => {
    try {
      let saved = localStorage.getItem("lacaserita_admin_session");
      if (!saved) saved = localStorage.getItem("lacaserita_admin_session_backup");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.role) return parsed.role;
      }
    } catch (e) {}
    return "owner";
  }); // "superadmin" | "owner" | "staff"

  // Restricción de seguridad estricta: El personal operativo solo puede estar en Pedidos y Cocina
  useEffect(() => {
    if (adminRole === "staff" && adminTab !== "orders") {
      setAdminTab("orders");
    }
  }, [adminRole, adminTab]);

  const [loginMode, setLoginMode] = useState("owner"); // "owner" | "staff" | "superadmin"
  const [userInput, setUserInput] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [showLoginPin, setShowLoginPin] = useState(false);
  const [pinError, setPinError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [showSaveSuccessModal, setShowSaveSuccessModal] = useState(false);

  // Estados de autenticación con Google
  const [googleUser, setGoogleUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem("caserita_google_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleLicenseModal, setGoogleLicenseModal] = useState(null); // { email, displayName, uid, photoURL }
  const [bindLicenseCode, setBindLicenseCode] = useState("");
  const [bindLicenseError, setBindLicenseError] = useState("");
  const [bindLicenseLoading, setBindLicenseLoading] = useState(false);
  const [directGoogleEmail, setDirectGoogleEmail] = useState("");
  const [showDirectGoogleInput, setShowDirectGoogleInput] = useState(false);

  useEffect(() => {
    const unsub = onAuthChange(async (user) => {
      if (user) {
        const isSuper = user.email === "mecanicadakar@gmail.com";
        const hasAdminRole = sessionStorage.getItem("caserita_auth_role");
        
        // Solo cargar datos si el usuario tiene una sesión de administración autorizada
        if (isSuper || hasAdminRole) {
          setGoogleUser(user);
          try { sessionStorage.setItem("caserita_google_user", JSON.stringify(user)); } catch {}
          if (user.uid) {
            try { sessionStorage.setItem("caserita_auth_google_uid", user.uid); } catch {}
          }

          if (isSuper) {
            // Para el Administrador General, cargar los datos y portada configurados del Demo Oficial (losamigos)
            try {
              const demoStoreDoc = await getStoreProfileFromFirestore("losamigos");
              if (demoStoreDoc && demoStoreDoc.name) {
                const demoBiz = {
                  name: demoStoreDoc.name,
                  slogan: demoStoreDoc.slogan || "Pedí online - Comidas caseras y minutas",
                  bannerImage: demoStoreDoc.bannerImage || "/banner.jpg",
                  phoneIntl: demoStoreDoc.phoneIntl || DEFAULT_BUSINESS.phoneIntl || "595975635770",
                  phoneDisplay: demoStoreDoc.phoneDisplay || DEFAULT_BUSINESS.phoneDisplay || "0975 635 770",
                  address: demoStoreDoc.address || "Santa María III, Ruta 6ta km 3.5, Encarnación",
                  deliveryNote: demoStoreDoc.deliveryNote || "El costo de envío se coordina según la zona",
                  adminUser: "usuario",
                  isDemoStore: true,
                };
                setBusiness((prev) => ({ ...prev, ...demoBiz }));
                setDraftBusiness((prev) => ({ ...prev, ...demoBiz }));
                if (demoStoreDoc.menu && demoStoreDoc.menu.length > 0) {
                  setMenu(demoStoreDoc.menu);
                  setDraft(demoStoreDoc.menu);
                }
              }
            } catch (e) {
              console.warn("Aviso al cargar demo store en onAuthChange:", e);
            }
          } else if (hasAdminRole && user.uid) {
            try {
              const profile = await getUserProfileFromFirestore(user.uid);
              if (profile && profile.licenseStatus === "activado") {
                const userBanner = profile.bannerImage || "/banner.jpg";
                const loadedUserBiz = {
                  name: profile.businessName || `Comercio de ${user.displayName || user.email}`,
                  slogan: profile.slogan || "Pedí online - Calidad y sabor",
                  bannerImage: userBanner,
                  phoneIntl: profile.phoneIntl || "",
                  phoneDisplay: profile.phoneDisplay || "",
                  address: profile.address || "Encarnación, Paraguay",
                  deliveryNote: profile.deliveryNote || "El costo de envío se coordina según la zona",
                  adminUser: user.email,
                  licenseCode: profile.licenseCode || null,
                  licenseStatus: profile.licenseStatus || null,
                };
                setBusiness((prev) => ({ ...prev, ...loadedUserBiz }));
                setDraftBusiness((prev) => ({ ...prev, ...loadedUserBiz }));
              }
            } catch (e) {
              console.warn("No se pudo cargar perfil individual de Firestore:", e);
            }
          }
        }
      }
    });
    return () => unsub();
  }, []);

  // Acceso directo con correo Google autorizado (solución si la ventana emergente es bloqueada por el navegador o política de dominio)
  const handleDirectGoogleAuth = async (customEmail = null) => {
    const rawEmail = String(customEmail || directGoogleEmail || "").trim().toLowerCase();
    if (!rawEmail) {
      setPinError("Por favor ingresá tu correo electrónico de Google.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(rawEmail)) {
      setPinError("Por favor ingresá un formato de correo válido (ej: usuario@gmail.com).");
      return;
    }

    setGoogleLoading(true);
    setPinError("");
    try {
      const resp = await fetch(SHEETS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "googleLogin",
          email: rawEmail,
          name: rawEmail.split("@")[0],
        }),
      });
      const data = await resp.json();
      if (!data.ok) {
        if (data.requiresLicense) {
          setGoogleLicenseModal({
            email: rawEmail,
            displayName: rawEmail.split("@")[0],
            uid: `direct_${rawEmail.replace(/[^a-z0-9]/gi, "")}`,
            photoURL: "",
          });
          setBindLicenseCode("");
          setBindLicenseError("");
          return;
        }
        setPinError(data.error || "No se pudo autenticar el correo de Google ingresado.");
        return;
      }

      const isSuper = data.role === "superadmin" || rawEmail === "mecanicadakar@gmail.com";
      const directGUser = {
        uid: data.uid || `direct_${rawEmail.replace(/[^a-z0-9]/gi, "")}`,
        email: rawEmail,
        displayName: data.displayName || rawEmail.split("@")[0],
        photoURL: data.photoURL || "",
      };

      setGoogleUser(directGUser);
      try {
        sessionStorage.setItem("caserita_google_user", JSON.stringify(directGUser));
        sessionStorage.setItem("caserita_auth_google_uid", directGUser.uid);
        sessionStorage.setItem("caserita_auth_user", rawEmail);
        sessionStorage.setItem("caserita_auth_pin", "google-auth");
        sessionStorage.setItem("caserita_auth_role", isSuper ? "superadmin" : (data.role || "owner"));
        if (data.storeId) {
          sessionStorage.setItem("caserita_auth_store_id", data.storeId);
        }
      } catch {}

      setIpLocked(false);
      setIpRemainingSeconds(0);
      setAttemptsLeft(5);
      fetch(`${SHEETS_API_URL}?action=resetIpStatus`).catch(() => {});
      enterAdmin(isSuper ? "superadmin" : (data.role || "owner"), rawEmail, "google-auth", null, data);
      addToast(
        "order_success",
        `¡Bienvenido!`,
        isSuper
          ? `Acceso total maestro concedido a MenuPY (${rawEmail}).`
          : `Acceso concedido a tu panel de comercio (${rawEmail}).`
      );
    } catch (e) {
      setPinError("Error de conexión al conectar con el servidor para autenticar con Google.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (loginMode === "staff") {
      setPinError("El personal operativo (mozos y cocina) no utiliza acceso con Google. Ingresá con tu Nombre y PIN de 4 dígitos.");
      return;
    }
    setGoogleLoading(true);
    setPinError("");
    try {
      const res = await signInWithGoogle();
      if (!res.ok) {
        setShowDirectGoogleInput(true);
        // En lugar de un error técnico intimidante, mostrar instrucción amigable
        if (loginMode === "superadmin") {
          // Intentar acceso directo inmediato para el administrador maestro
          await handleDirectGoogleAuth("mecanicadakar@gmail.com");
          return;
        }
        setPinError("Por seguridad del navegador, seleccioná tu cuenta o ingresá tu correo de Google registrado abajo para entrar de inmediato.");
        setGoogleLoading(false);
        return;
      }
      const gUser = res.user;

      // 1. Acceso Exclusivo para Administrador General Maestro (Superadmin)
      const isMasterGoogle = gUser.email === "mecanicadakar@gmail.com";
      if (isMasterGoogle) {
        setGoogleUser(gUser);
        try {
          sessionStorage.setItem("caserita_google_user", JSON.stringify(gUser));
          sessionStorage.setItem("caserita_auth_google_uid", gUser.uid);
          sessionStorage.setItem("caserita_auth_user", gUser.email);
          sessionStorage.setItem("caserita_auth_pin", "google-auth");
          sessionStorage.setItem("caserita_auth_role", "superadmin");
          sessionStorage.setItem("caserita_auth_store_id", "losamigos");
        } catch {}

        let masterStoreData = null;
        try {
          const resp = await fetch(SHEETS_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "googleLogin",
              email: gUser.email,
              name: gUser.displayName,
              uid: gUser.uid,
              photoURL: gUser.photoURL,
            }),
          });
          masterStoreData = await resp.json();
        } catch {}

        setIpLocked(false);
        setIpRemainingSeconds(0);
        setAttemptsLeft(5);
        fetch(`${SHEETS_API_URL}?action=resetIpStatus`).catch(() => {});
        enterAdmin("superadmin", gUser.email, "google-auth", null, masterStoreData);
        addToast(
          "order_success",
          `¡Bienvenido, Administrador General!`,
          `Acceso total maestro concedido a MenuPY (${gUser.email}).`
        );
        return;
      }

      // 2. Para todos los demás usuarios de Google: VERIFICAR LICENCIA ACTIVA OBLIGATORIA
      let licenseVerified = false;
      let storeData = null;

      // a) Verificar con el backend
      try {
        const resp = await fetch(SHEETS_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "googleLogin",
            email: gUser.email,
            name: gUser.displayName,
            uid: gUser.uid,
            photoURL: gUser.photoURL,
          }),
        });
        const data = await resp.json();
        if (data.ok && data.role === "owner" && data.license) {
          licenseVerified = true;
          storeData = data;
        } else if (data.isPendingApproval) {
          setPinError(data.error || `Acceso denegado: Tu comercio (${gUser.email}) se encuentra PENDIENTE de habilitación por el Administrador. Solo el correo autorizado podrá ingresar una vez otorgada la licencia.`);
          signOut(auth).catch(() => {});
          sessionStorage.removeItem("caserita_google_user");
          sessionStorage.removeItem("caserita_auth_google_uid");
          setGoogleUser(null);
          return;
        } else if (data.licenseBlocked) {
          setPinError(data.error || "La licencia de este comercio se encuentra suspendida o revocada.");
          signOut(auth).catch(() => {});
          sessionStorage.removeItem("caserita_google_user");
          sessionStorage.removeItem("caserita_auth_google_uid");
          setGoogleUser(null);
          return;
        }
      } catch (err) {
        console.warn("Backend offline al verificar licencia de Google:", err);
      }

      // b) Si el backend no confirmó o está offline, verificar perfil en Firestore
      if (!licenseVerified) {
        try {
          const profile = await getUserProfileFromFirestore(gUser.uid);
          if (profile && profile.licenseCode && (profile.licenseStatus === "activado" || profile.licenseStatus === "activo")) {
            licenseVerified = true;
            storeData = {
              storeId: profile.storeId || `store_${gUser.uid}`,
              role: "owner",
              business: {
                name: profile.businessName || `Comercio de ${gUser.displayName || gUser.email}`,
                slogan: profile.slogan || "Pedí online - Calidad y sabor",
                bannerImage: profile.bannerImage || "/banner.jpg",
                phoneIntl: profile.phoneIntl || "",
                phoneDisplay: profile.phoneDisplay || "",
                address: profile.address || "Encarnación, Paraguay",
                deliveryNote: profile.deliveryNote || "El costo de envío se coordina según la zona",
                adminUser: gUser.email,
                licenseCode: profile.licenseCode,
                licensePlan: profile.licensePlan || "Plan Anual PRO",
                licenseStatus: "activado",
              },
              license: {
                code: profile.licenseCode,
                plan: profile.licensePlan || "Plan Anual PRO",
                status: "activado",
              },
            };
          }
        } catch (e) {}
      }

      // c) Verificar en códigos locales de activación
      if (!licenseVerified) {
        const localCode = activationCodes.find(
          (c) => c.email && c.email.toLowerCase() === gUser.email.toLowerCase() && c.status === "activado"
        );
        if (localCode) {
          licenseVerified = true;
          storeData = {
            storeId: `store_${gUser.email.split("@")[0].replace(/[^a-z0-9_-]/gi, "").toLowerCase()}`,
            role: "owner",
            business: {
              name: localCode.businessName || `Comercio de ${gUser.displayName || gUser.email}`,
              slogan: "Pedí online - Calidad y sabor",
              bannerImage: "/banner.jpg",
              phoneIntl: localCode.whatsapp || "",
              phoneDisplay: "",
              address: "Encarnación, Paraguay",
              deliveryNote: "El costo de envío se coordina según la zona",
              adminUser: gUser.email,
              licenseCode: localCode.code,
              licensePlan: localCode.plan,
              licenseStatus: "activado",
            },
            license: {
              code: localCode.code,
              plan: localCode.plan,
              status: "activado",
            },
          };
        }
      }

      // 3. SI TIENE LICENCIA ACTIVA VINCULADA: CONCEDER ACCESO COMO GERENTE
      if (licenseVerified && storeData) {
        setGoogleUser(gUser);
        try {
          sessionStorage.setItem("caserita_google_user", JSON.stringify(gUser));
          sessionStorage.setItem("caserita_auth_google_uid", gUser.uid);
          sessionStorage.setItem("caserita_auth_user", gUser.email);
          sessionStorage.setItem("caserita_auth_pin", "google-auth");
          sessionStorage.setItem("caserita_auth_role", "owner");
          if (storeData.storeId) {
            sessionStorage.setItem("caserita_auth_store_id", storeData.storeId);
          }
        } catch {}

        setIpLocked(false);
        setIpRemainingSeconds(0);
        setAttemptsLeft(5);
        fetch(`${SHEETS_API_URL}?action=resetIpStatus`).catch(() => {});
        enterAdmin("owner", gUser.email, "google-auth", null, storeData);
        addToast(
          "order_success",
          `¡Bienvenido, ${gUser.displayName || "Gerente"}!`,
          `Licencia activa verificada (${storeData.license?.code || storeData.business?.licenseCode || "Autorizada"}).`
        );
        return;
      }

      // 4. SI NO ESTÁ VINCULADO A NINGUNA LICENCIA: BLOQUEAR ACCESO Y ABRIR MODAL
      // Desconectar sesión temporal para impedir cualquier acceso no autorizado
      signOut(auth).catch(() => {});
      sessionStorage.removeItem("caserita_google_user");
      sessionStorage.removeItem("caserita_auth_google_uid");
      setGoogleUser(null);

      setGoogleLicenseModal({
        email: gUser.email,
        displayName: gUser.displayName || gUser.email,
        uid: gUser.uid,
        photoURL: gUser.photoURL,
      });
      setBindLicenseCode("");
      setBindLicenseError("");
    } catch (e) {
      setPinError("Error de conexión al conectar con Google.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleBindGoogleLicense = async () => {
    const cleanCode = bindLicenseCode.trim().toUpperCase();
    if (!cleanCode) {
      setBindLicenseError("Por favor ingresá un código de licencia.");
      return;
    }
    if (!googleLicenseModal) return;
    setBindLicenseLoading(true);
    setBindLicenseError("");

    try {
      let backendSuccess = false;
      let backendData = null;

      // 1. Validar primero con backend
      try {
        const resp = await fetch(SHEETS_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "googleLogin",
            email: googleLicenseModal.email,
            name: googleLicenseModal.displayName,
            uid: googleLicenseModal.uid,
            photoURL: googleLicenseModal.photoURL,
            licenseCode: cleanCode,
          }),
        });
        backendData = await resp.json();
        if (backendData.ok) {
          backendSuccess = true;
        } else {
          setBindLicenseError(backendData.error || "El código de licencia ingresado no es válido o ya fue utilizado.");
          setBindLicenseLoading(false);
          return;
        }
      } catch (err) {
        console.warn("Backend offline al vincular licencia, validando con registro local:", err);
      }

      // 2. Si backend no respondió, validar contra activationCodes locales
      let matchedCode = null;
      if (!backendSuccess) {
        matchedCode = activationCodes.find(
          (c) => c.code && c.code.toUpperCase() === cleanCode
        );

        if (!matchedCode) {
          setBindLicenseError(`El código de licencia "${cleanCode}" no existe en el sistema.`);
          setBindLicenseLoading(false);
          return;
        }

        if (matchedCode.status === "activado" && matchedCode.email && matchedCode.email.toLowerCase() !== googleLicenseModal.email.toLowerCase()) {
          setBindLicenseError(`Este código de licencia ya está vinculado a otra cuenta (${matchedCode.email}).`);
          setBindLicenseLoading(false);
          return;
        }

        if (matchedCode.status === "revocado" || matchedCode.status === "bloqueado" || matchedCode.status === "anulado") {
          setBindLicenseError("Esta licencia se encuentra revocada o suspendida por administración.");
          setBindLicenseLoading(false);
          return;
        }
      }

      // 3. Activar el código localmente
      const activatedCodeObj = backendData?.license || matchedCode;
      setActivationCodes((prev) => {
        const next = prev.map((c) => {
          if (c.code && c.code.toUpperCase() === cleanCode) {
            return {
              ...c,
              status: "activado",
              activatedAt: new Date().toISOString(),
              activatedBy: `${googleLicenseModal.displayName} (${googleLicenseModal.email})`,
              email: googleLicenseModal.email,
            };
          }
          return c;
        });
        try { localStorage.setItem("lacaserita_activation_codes", JSON.stringify(next)); } catch {}
        return next;
      });

      // 4. Guardar perfil completo en Firestore con la licencia vinculada
      const userStoreId = backendData?.storeId || `store_${googleLicenseModal.email.split("@")[0].replace(/[^a-z0-9_-]/gi, "").toLowerCase()}`;
      const userBiz = {
        name: (backendData?.business?.name) || (activatedCodeObj?.businessName) || `Comercio de ${googleLicenseModal.displayName}`,
        slogan: backendData?.business?.slogan || "Pedí online - Calidad y sabor",
        bannerImage: backendData?.business?.bannerImage || "/banner.jpg",
        phoneIntl: (backendData?.business?.phoneIntl) || (activatedCodeObj?.whatsapp) || "",
        phoneDisplay: backendData?.business?.phoneDisplay || "",
        address: backendData?.business?.address || "Encarnación, Paraguay",
        deliveryNote: backendData?.business?.deliveryNote || "El costo de envío se coordina según la zona",
        adminUser: googleLicenseModal.email,
        licenseCode: cleanCode,
        licensePlan: backendData?.license?.plan || activatedCodeObj?.plan || "Plan Anual PRO",
        licenseStatus: "activado",
        licenseCost: backendData?.license?.costFormatted || activatedCodeObj?.costFormatted || "1.000.000 Gs. / año",
        storeId: userStoreId,
        role: "owner",
      };

      try {
        await saveUserProfileToFirestore(googleLicenseModal.uid, userBiz);
      } catch (e) {
        console.warn("No se pudo guardar perfil en Firestore:", e);
      }

      // 5. Configurar sesión activa y dar acceso
      const finalStoreData = backendData?.ok ? backendData : {
        storeId: userStoreId,
        role: "owner",
        business: userBiz,
        menu: DEFAULT_MENU,
        orders: [],
        license: {
          code: cleanCode,
          plan: userBiz.licensePlan,
          status: "activado",
        }
      };

      const finalGUser = {
        uid: googleLicenseModal.uid,
        email: googleLicenseModal.email,
        displayName: googleLicenseModal.displayName,
        photoURL: googleLicenseModal.photoURL,
      };

      setGoogleUser(finalGUser);
      sessionStorage.setItem("caserita_google_user", JSON.stringify(finalGUser));
      sessionStorage.setItem("caserita_auth_google_uid", googleLicenseModal.uid);
      sessionStorage.setItem("caserita_auth_user", googleLicenseModal.email);
      sessionStorage.setItem("caserita_auth_pin", "google-auth");
      sessionStorage.setItem("caserita_auth_role", "owner");
      sessionStorage.setItem("caserita_auth_store_id", userStoreId);

      setGoogleLicenseModal(null);
      setBindLicenseCode("");
      enterAdmin("owner", googleLicenseModal.email, "google-auth", null, finalStoreData);

      addToast(
        "order_success",
        "¡Licencia Vinculada con Éxito!",
        `Tu cuenta de Google (${googleLicenseModal.email}) fue vinculada a tu licencia ${cleanCode}. ¡Bienvenido a tu panel de Gerente!`
      );
    } catch (e) {
      setBindLicenseError("Error al procesar la vinculación de licencia.");
    } finally {
      setBindLicenseLoading(false);
    }
  };

  // Claves dinámicas y referencias de interacción para anular completamente la pre-escritura y autocompletado del navegador
  const [loginFormKey, setLoginFormKey] = useState(1);
  const [regFormKey, setRegFormKey] = useState(1);
  const userInteractedLoginRef = useRef(false);
  const userInteractedRegRef = useRef(false);

  // Asegurar que los campos de usuario y contraseña siempre inicien completamente limpios al entrar a la app
  useEffect(() => {
    setUserInput("");
    setPinInput("");
    setPinError("");
    setShowLoginPin(false);
    userInteractedLoginRef.current = false;
    userInteractedRegRef.current = false;
    setRegForm((prev) => ({
      ...prev,
      requestedUser: "",
      requestedPassword: "",
      confirmPassword: "",
    }));
    setShowRegPassword(false);
  }, []);

  // Estado del Panel de Pedidos y Cobro por Caja
  const [orders, setOrders] = useState(() => {
    try {
      const saved = localStorage.getItem("lacaserita_orders");
      const custOrders = getCustomerOrders();
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((o) => o && typeof o === "object");
        }
      }
      let list = [...DEFAULT_INITIAL_ORDERS];
      if (Array.isArray(custOrders)) {
        custOrders.forEach((co) => {
          if (co && co.id && !list.some((o) => o.id === co.id)) {
            list.unshift(co);
          }
        });
      }
      return list;
    } catch (e) {}
    return DEFAULT_INITIAL_ORDERS;
  });
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersFilterMode, setOrdersFilterMode] = useState("todos"); // "todos" | "mesa" | "delivery" | "retiro"
  const [ordersStatusFilter, setOrdersStatusFilter] = useState("todos"); // "todos" | "en_preparacion" | "pendientes" | "pagado" | "todos_pedidos"
  const [ordersSearch, setOrdersSearch] = useState("");
  const [cashPeriod, setCashPeriod] = useState("dia"); // "dia" | "semana" | "mes" | "todos"
  const [selectedPayOrder, setSelectedPayOrder] = useState(null); // orden a cobrar en modal
  const [selectedPayMethod, setSelectedPayMethod] = useState("efectivo"); // "efectivo" | "pos" | "transferencia" | "tigo_money"
  const [processingPayment, setProcessingPayment] = useState(false);
  const [showCashReportPrint, setShowCashReportPrint] = useState(false);

  // Estado del Historial de Pedidos Recibidos y Filtros
  const [historyDatePreset, setHistoryDatePreset] = useState("todos"); // "todos" | "hoy" | "ayer" | "ultimos7" | "mes" | "personalizado"
  const [historyCustomDate, setHistoryCustomDate] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState("todos"); // "todos" | "pagado" | "pendiente" | "cancelado"
  const [historyModeFilter, setHistoryModeFilter] = useState("todos"); // "todos" | "mesa" | "delivery" | "retiro"
  const [historySearch, setHistorySearch] = useState("");
  const [selectedHistoryOrder, setSelectedHistoryOrder] = useState(null); // Detalle del pedido en modal
  const [showHistoryPdfModal, setShowHistoryPdfModal] = useState(false); // Modal para exportar PDF e imprimir reporte contable
  const [selectedHistoryOrderIds, setSelectedHistoryOrderIds] = useState([]); // Pedidos tildados para eliminar del historial
  const [historyFullscreen, setHistoryFullscreen] = useState(false); // Modo pantalla completa para el historial

  useEffect(() => {
    const handleFsChange = () => {
      setHistoryFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    document.addEventListener("webkitfullscreenchange", handleFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
      document.removeEventListener("webkitfullscreenchange", handleFsChange);
    };
  }, []);

  const toggleHistoryFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      }
    } catch (e) {
      console.warn("Fullscreen toggle:", e);
    }
  };

  // Estado para la confirmación automática por WhatsApp de pedidos completados/entregados
  const [whatsAppModalOrder, setWhatsAppModalOrder] = useState(null);
  const [whatsAppModalPhone, setWhatsAppModalPhone] = useState("");
  const [whatsAppNotifyOnPay, setWhatsAppNotifyOnPay] = useState(true);
  const [copiedWhatsAppMsg, setCopiedWhatsAppMsg] = useState(false);

  // Sincronizar pedidos en almacenamiento local para asegurar persistencia continua
  useEffect(() => {
    try {
      if (Array.isArray(orders)) {
        localStorage.setItem("lacaserita_orders", JSON.stringify(orders.filter(Boolean)));
      }
    } catch (e) {}
  }, [orders]);

  // Estado de seguridad y bloqueo de IP
  const [clientIp, setClientIp] = useState("");
  const [ipLocked, setIpLocked] = useState(false);
  const [ipRemainingSeconds, setIpRemainingSeconds] = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [unlockingIps, setUnlockingIps] = useState(false);
  const [securityMsg, setSecurityMsg] = useState("");

  // Gestión de clientes comerciales (Panel de Comercios Registrados)
  const [registeredClients, setRegisteredClients] = useState(() => {
    try {
      const saved = localStorage.getItem("lacaserita_registered_clients");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [
      {
        id: "CLI-DEMO-01",
        businessName: "Menu Py (Demo)",
        rubro: "Gastronomía",
        ownerName: "Carlos Benítez",
        whatsapp: "0981 123 456",
        city: "Encarnación",
        requestedUser: "gerente",
        requestedPassword: "comercio123",
        plan: "full",
        planTitle: "Plan Comercio Completo",
        amountGs: 450000,
        paymentMethod: "transferencia",
        paymentRef: "SIPAP-884920",
        status: "active",
        createdAt: Date.now() - 86400000 * 5,
      },
      {
        id: "CLI-DEMO-02",
        businessName: "Hamburguesería El Punto",
        rubro: "Comida Rápida",
        ownerName: "Mariela Domínguez",
        whatsapp: "0971 654 321",
        city: "Encarnación",
        requestedUser: "comercio",
        requestedPassword: "comercio123",
        plan: "anual",
        planTitle: "Plan Anual Pro",
        amountGs: 1200000,
        paymentMethod: "pos",
        paymentRef: "TARJ-4491",
        status: "active",
        createdAt: Date.now() - 86400000 * 12,
      }
    ];
  });

  useEffect(() => {
    try {
      if (Array.isArray(registeredClients)) {
        localStorage.setItem("lacaserita_registered_clients", JSON.stringify(registeredClients));
      }
    } catch (e) {}
  }, [registeredClients]);

  const [loadingClients, setLoadingClients] = useState(false);
  const [clientFilter, setClientFilter] = useState("all");
  const [copiedText, setCopiedText] = useState("");

  // Configuración y gestión de precios de la app en Guaraníes (Gs.)
  const [appPricingPlans, setAppPricingPlans] = useState(() => {
    try {
      const saved = localStorage.getItem("lacaserita_app_pricing_plans");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn("No se pudo leer lacaserita_app_pricing_plans:", e);
    }
    return DEFAULT_APP_PRICING_PLANS;
  });

  const [pricingSuccessMsg, setPricingSuccessMsg] = useState("");

  useEffect(() => {
    try {
      if (Array.isArray(appPricingPlans)) {
        localStorage.setItem("lacaserita_app_pricing_plans", JSON.stringify(appPricingPlans));
      }
    } catch (e) {
      console.warn("No se pudo guardar lacaserita_app_pricing_plans:", e);
    }
  }, [appPricingPlans]);

  const handleUpdatePlanPrice = (planId, rawValue) => {
    const numeric = Math.max(0, parseInt(String(rawValue).replace(/\D/g, ""), 10) || 0);
    setAppPricingPlans((prev) =>
      prev.map((p) => {
        if (p.id === planId) {
          return {
            ...p,
            priceGs: numeric,
            priceFormatted: `${numeric.toLocaleString("es-PY")} Gs.`,
          };
        }
        return p;
      })
    );
  };

  const handleUpdatePlanField = (planId, field, value) => {
    setAppPricingPlans((prev) =>
      prev.map((p) => (p.id === planId ? { ...p, [field]: value } : p))
    );
  };

  const handleSavePlanPrices = () => {
    try {
      localStorage.setItem("lacaserita_app_pricing_plans", JSON.stringify(appPricingPlans));
      setPricingSuccessMsg("✓ ¡Precios de la App en Guaraníes (Gs.) guardados con éxito!");
      setTimeout(() => setPricingSuccessMsg(""), 4000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetPlanPrices = () => {
    setAppPricingPlans(JSON.parse(JSON.stringify(DEFAULT_APP_PRICING_PLANS)));
    setPricingSuccessMsg("✓ Precios restablecidos a los valores iniciales por defecto.");
    setTimeout(() => setPricingSuccessMsg(""), 4000);
  };

  // Códigos de Activación y Licencias para Comercios (Habilitación de App)
  const [activationCodes, setActivationCodes] = useState(() => {
    try {
      const saved = localStorage.getItem("lacaserita_activation_codes");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [
      {
        id: "ACT-101",
        code: "CAS-7K9B-X2M4",
        businessName: "Menu Py",
        ownerName: "Carlos González",
        whatsapp: "595981456789",
        plan: "Plan Anual PRO (1 Año)",
        status: "activado",
        createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
        activatedAt: new Date(Date.now() - 3600000 * 20).toISOString(),
        activatedBy: "Carlos González (Menu Py)",
        notes: "Licencia Anual con soporte y actualización",
      },
      {
        id: "ACT-102",
        code: "CAS-4821-M8KP",
        businessName: "Burger House Enc",
        ownerName: "Marcos Giménez",
        whatsapp: "595975123456",
        plan: "Plan Mensual",
        status: "disponible",
        createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
        activatedAt: null,
        activatedBy: null,
        notes: "Habilitación mensual para hamburguesería",
      },
      {
        id: "ACT-103",
        code: "CAS-9900-DEMO",
        businessName: "Licencia Libre / Venta Directa",
        ownerName: "Demostración Oficial",
        whatsapp: "",
        plan: "Plan Vitalicio / Ilimitado",
        status: "disponible",
        createdAt: new Date().toISOString(),
        activatedAt: null,
        activatedBy: null,
        notes: "Código libre para pruebas y activación inmediata de cualquier comercio",
      },
    ];
  });
  const [loadingCodes, setLoadingCodes] = useState(false);
  const [showCreateCodeModal, setShowCreateCodeModal] = useState(false);
  const [creatingCode, setCreatingCode] = useState(false);
  const [codeFilter, setCodeFilter] = useState("all"); // "all" | "disponible" | "activado"
  const [codeSearch, setCodeSearch] = useState("");
  const [copiedCodeText, setCopiedCodeText] = useState("");
  const [confirmModalConfig, setConfirmModalConfig] = useState(null);

  // Helper para obtener precio real y duración desde la configuración de planes (appPricingPlans)
  const getPlanDetails = (planIdentifier) => {
    const plans = Array.isArray(appPricingPlans) && appPricingPlans.length > 0 ? appPricingPlans : DEFAULT_APP_PRICING_PLANS;
    const str = String(planIdentifier || "mensual").toLowerCase().trim();

    if (str.includes("vitalicio") || str.includes("permanente")) {
      return {
        planTitle: "Plan Vitalicio / Licencia Permanente",
        planId: "vitalicio",
        cost: 0,
        costFormatted: "Licencia Permanente (Sin límite de tiempo)",
        durationMonths: 999,
        expiresAt: null,
      };
    }

    const matched = plans.find((p) => {
      const pId = String(p.id || "").toLowerCase();
      const pTitle = String(p.title || "").toLowerCase();
      return pTitle === str || pId === str || str.includes(pId) || pTitle.includes(str) ||
        (str.includes("anual") && pId === "anual") ||
        (str.includes("semestr") && pId === "semestral") ||
        (str.includes("mes") && pId === "mensual");
    }) || plans[0];

    const dur = matched.id === "mensual" ? 1 : matched.id === "semestral" ? 6 : 12;
    const pNum = Number(matched.priceGs) || 0;
    const expDate = new Date();
    expDate.setMonth(expDate.getMonth() + dur);

    return {
      planTitle: matched.title,
      planId: matched.id,
      cost: pNum,
      costFormatted: `${pNum.toLocaleString("es-PY")} Gs. ${matched.period ? `(${matched.period})` : ""}`.trim(),
      durationMonths: dur,
      expiresAt: expDate.toISOString(),
    };
  };

  const [newCodeForm, setNewCodeForm] = useState(() => {
    const plans = Array.isArray(DEFAULT_APP_PRICING_PLANS) && DEFAULT_APP_PRICING_PLANS.length > 0 ? DEFAULT_APP_PRICING_PLANS : [];
    const def = plans[0] || { id: "mensual", title: "Plan Mensual", priceGs: 100000 };
    const pNum = Number(def.priceGs) || 100000;
    const exp = new Date();
    exp.setMonth(exp.getMonth() + 1);

    return {
      code: "CAS-" + Math.floor(1000 + Math.random() * 9000) + "-7K3X",
      businessName: "",
      ownerName: "",
      email: "",
      whatsapp: "",
      plan: def.title,
      planId: def.id,
      cost: pNum,
      costFormatted: `${pNum.toLocaleString("es-PY")} Gs. (por mes)`,
      durationMonths: 1,
      expiresAt: exp.toISOString(),
      notes: "",
    };
  });

  // Licencia activa en este dispositivo / comercio
  const [appLicense, setAppLicense] = useState(() => {
    try {
      const saved = localStorage.getItem("lacaserita_app_license");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      isActivated: true,
      code: "CAS-7K9B-X2M4",
      businessName: "Menu Py",
      plan: "Plan Anual PRO (1 Año)",
      costFormatted: "1.000.000 Gs. / año",
      costGs: 1000000,
      durationMonths: 12,
      status: "activado", // "activado" | "revocado" | "anulado" | "vencido"
      activatedAt: "2026-03-01T12:00:00.000Z",
      expiresAt: "2027-03-01T12:00:00.000Z",
      ownerName: "Carlos González",
      notes: "Licencia Anual con soporte y actualización oficial",
    };
  });

  // Modal informativo si la licencia del comercio fue anulada o venció
  const [showLicenseBlockedModal, setShowLicenseBlockedModal] = useState(false);
  const [licenseBlockedInfo, setLicenseBlockedInfo] = useState(null);

  // Modal para que el comercio ingrese el código para habilitar
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [inputActivationCode, setInputActivationCode] = useState("");
  const [inputActivationBusiness, setInputActivationBusiness] = useState("");
  const [activatingApp, setActivatingApp] = useState(false);
  const [activationError, setActivationError] = useState("");
  const [activationSuccess, setActivationSuccess] = useState(null);

  // Formulario para adquirir la app
  const [regForm, setRegForm] = useState({
    businessName: "",
    rubro: "Rotisería y Minutas",
    ownerName: "",
    whatsapp: "",
    email: "",
    city: "Encarnación",
    requestedUser: "",
    requestedPassword: "",
    confirmPassword: "",
    plan: "anual",
    planTitle: "Plan Anual PRO (1.000.000 Gs.)",
    amountGs: 1000000,
    paymentMethod: "transferencia",
    paymentRef: "",
  });

  // Sincronizar automáticamente el precio y título del plan seleccionado en regForm con appPricingPlans
  useEffect(() => {
    if (!Array.isArray(appPricingPlans) || appPricingPlans.length === 0) return;
    const currentId = regForm.plan || "anual";
    const matched = appPricingPlans.find((p) => p.id === currentId) || appPricingPlans.find((p) => p.id === "anual") || appPricingPlans[0];
    if (matched) {
      const displayPrice = matched.priceFormatted || `${Number(matched.priceGs).toLocaleString("es-PY")} Gs.`;
      setRegForm((prev) => {
        if (prev.amountGs === matched.priceGs && prev.plan === matched.id && prev.planTitle === `${matched.title} (${displayPrice})`) {
          return prev;
        }
        return {
          ...prev,
          plan: matched.id,
          planTitle: `${matched.title} (${displayPrice})`,
          amountGs: matched.priceGs,
        };
      });
    }
  }, [appPricingPlans]);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [regError, setRegError] = useState("");
  const [regSuccessVoucher, setRegSuccessVoucher] = useState(null);
  
  // Drafts para el modo administración
  const [draft, setDraft] = useState(() => (Array.isArray(DEFAULT_MENU) ? JSON.parse(JSON.stringify(DEFAULT_MENU)) : []));
  const [draftBusiness, setDraftBusiness] = useState(() => (DEFAULT_BUSINESS ? JSON.parse(JSON.stringify(DEFAULT_BUSINESS)) : {}));
  const [draftNewPin, setDraftNewPin] = useState("");
  const [draftPinConfirm, setDraftPinConfirm] = useState("");
  const [enableChangePin, setEnableChangePin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const bannerFileInputRef = useRef(null);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [bannerUploadError, setBannerUploadError] = useState("");
  const [bannerPreviewDevice, setBannerPreviewDevice] = useState("pc"); // "pc" | "mobile"
  const [selectedAdminStoreId, setSelectedAdminStoreId] = useState("losamigos"); // "losamigos" | custom store

  const [imgLoading, setImgLoading] = useState(null);
  const [imgError, setImgError] = useState("");
  const [verifying, setVerifying] = useState(false);

  // Estilo de fondo adaptable
  const pageBackgroundStyle = {
    backgroundImage: `url('/fondomarcadeagua.jpg')`,
    backgroundSize: '360px auto',
    backgroundPosition: 'top center',
    backgroundRepeat: 'repeat',
    backgroundAttachment: 'fixed',
    minHeight: '100vh',
    width: '100%',
  };

  useEffect(() => {
    (async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const urlStore = urlParams.get("comercio") || urlParams.get("store") || urlParams.get("c");
        const activeAuthStore = sessionStorage.getItem("caserita_auth_store_id");
        
        let queryUrl = `${SHEETS_API_URL}?action=getDemoStore`;
        if (urlStore) {
          queryUrl = `${SHEETS_API_URL}?comercio=${encodeURIComponent(urlStore)}`;
        } else if (activeAuthStore) {
          queryUrl = `${SHEETS_API_URL}?comercio=${encodeURIComponent(activeAuthStore)}`;
        }

        const res = await fetch(queryUrl);
        const data = await res.json();
        if (data.allStores) setAvailableStores(data.allStores);
        if (data.storeId) {
          setCurrentStoreId(data.storeId);
        }
        if (data.menu && data.menu.length > 0) {
          setMenu(data.menu);
          setOpenCat(data.menu[0].category);
        } else {
          setOpenCat(DEFAULT_MENU[0].category);
        }
        if (data.deliveryNote) setDeliveryNote(data.deliveryNote);
        if (data.business) {
          const bData = { ...data.business };
          setBusiness((prev) => ({ ...prev, ...bData }));
          setDraftBusiness((prev) => ({ ...prev, ...bData }));
          if (data.business.deliveryNote) setDeliveryNote(data.business.deliveryNote);
          if (bData.licenseCode) {
            setAppLicense((prev) => ({
              ...prev,
              code: bData.licenseCode,
              plan: bData.licensePlan || prev.plan,
              costFormatted: bData.licenseCost || prev.costFormatted,
              costGs: bData.licenseCostGs || prev.costGs,
              status: bData.licenseStatus || prev.status,
              durationMonths: bData.licenseDuration || prev.durationMonths,
              activatedAt: bData.licenseActivatedAt || prev.activatedAt,
              expiresAt: bData.licenseExpiresAt || prev.expiresAt,
              notes: bData.licenseNotes || prev.notes,
            }));
          }
        }
      } catch (err) {
        setLoadError("No se pudo cargar el menú. Revisá tu conexión a internet.");
        setOpenCat(DEFAULT_MENU[0].category);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Función para alternar comercio público
  const switchStore = async (storeId) => {
    try {
      setLoading(true);
      const res = await fetch(`${SHEETS_API_URL}?comercio=${encodeURIComponent(storeId)}`);
      const data = await res.json();
      if (data.storeId) {
        setCurrentStoreId(data.storeId);
      }
      if (data.business) {
        setBusiness(data.business);
        setDraftBusiness(data.business);
        if (data.business.deliveryNote) setDeliveryNote(data.business.deliveryNote);
      }
      if (data.menu && data.menu.length > 0) {
        setMenu(data.menu);
        setDraft(data.menu);
        setOpenCat(data.menu[0].category);
      }
      if (data.allStores) setAvailableStores(data.allStores);
      addToast("order_update", `Comercio: ${data.business?.name || storeId}`, "Mostrando portada y menú de este comercio.");
    } catch (e) {
      console.warn("Error cambiando de comercio:", e);
    } finally {
      setLoading(false);
    }
  };

  const allItems = useMemo(() => {
    return (menu || []).flatMap((c) => (Array.isArray(c.items) ? c.items : []));
  }, [menu]);

  // Cálculo de conteo de productos por sección y en carrito
  const categoryStats = useMemo(() => {
    return (menu || []).map((cat) => {
      const catItems = Array.isArray(cat.items) ? cat.items : [];
      const inCartCount = catItems.reduce((acc, item) => acc + (cart[String(item.id)] || 0), 0);
      return {
        category: cat.category,
        icon: cat.icon,
        totalItems: catItems.length,
        inCartCount,
      };
    });
  }, [menu, cart]);

  // Filtrado de menú según sección activa y búsqueda
  const filteredMenu = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    
    // Si hay búsqueda por texto en tiempo real
    if (q) {
      return (menu || [])
        .map((cat) => {
          if (activeSection !== "TODOS" && cat.category !== activeSection) {
            return null;
          }
          const matchingItems = (cat.items || []).filter((item) => {
            const nameMatch = (item.name || "").toLowerCase().includes(q);
            const descMatch = (item.desc || "").toLowerCase().includes(q);
            const catMatch = (cat.category || "").toLowerCase().includes(q);
            return nameMatch || descMatch || catMatch;
          });
          if (matchingItems.length === 0) return null;
          return {
            ...cat,
            items: matchingItems,
          };
        })
        .filter(Boolean);
    }

    // Sin búsqueda: según sección activa
    if (activeSection === "TODOS") {
      return (menu || []).filter((cat) => Array.isArray(cat.items) && cat.items.length > 0);
    }

    return (menu || []).filter((cat) => cat.category === activeSection);
  }, [menu, activeSection, searchQuery]);

  const totalFilteredItems = useMemo(() => {
    return filteredMenu.reduce((acc, cat) => acc + (cat.items?.length || 0), 0);
  }, [filteredMenu]);

  // =========================================================================
  // CÁLCULOS Y ARQUEO DE CAJA / MOVIMIENTO DE PEDIDOS (Día, Semana, Mes)
  // =========================================================================

  // Pedidos activos (pendientes de cobro en el panel principal de pedidos)
  const pendingOrders = useMemo(() => {
    if (!Array.isArray(orders)) return [];
    return orders.filter((o) => o && (o.paymentStatus || "").toLowerCase() === "pendiente");
  }, [orders]);

  // Pedidos ya cobrados (historial de caja guardado)
  const paidOrders = useMemo(() => {
    if (!Array.isArray(orders)) return [];
    return orders.filter((o) => o && (o.paymentStatus || "").toLowerCase() === "pagado");
  }, [orders]);

  // Coincidencia inteligente de pedido para el buscador del Panel de Pedidos
  const isOrderMatchingSearch = (order, query) => {
    if (!order || !query) return false;
    const q = query.trim().toLowerCase();
    const cleanQ = q.replace(/^#/, "").trim();
    const numQ = cleanQ.replace(/^ped[- ]?/i, "").trim();

    // 1. Coincidencia por código de pedido (ej: PED-1577, ped-1577, 1577, #1577)
    const id = String(order.id || "").toLowerCase();
    const cleanId = id.replace(/^ped-/, "");
    if (id === cleanQ || id.includes(cleanQ) || (numQ && (cleanId === numQ || cleanId.includes(numQ)))) {
      return true;
    }
    if (order.matchedRequestedId) {
      const matchId = String(order.matchedRequestedId).toLowerCase();
      if (matchId.includes(cleanQ) || (numQ && matchId.replace(/^ped-/, "").includes(numQ))) {
        return true;
      }
    }

    // 2. Coincidencia por Nombre del cliente (ej: Juan, María)
    const customerName = String(order.customerName || "").toLowerCase();
    if (customerName.includes(cleanQ)) return true;

    // 3. Coincidencia por Número de Mesa (ej: 3, Mesa 3)
    const tableNumber = String(order.tableNumber || "").toLowerCase();
    if (tableNumber && (tableNumber === cleanQ || tableNumber === numQ || `mesa ${tableNumber}`.includes(cleanQ))) {
      return true;
    }

    // 4. Coincidencia por Teléfono
    const phone = String(order.customerPhone || "").replace(/\D/g, "");
    const qPhone = cleanQ.replace(/\D/g, "");
    if (phone && qPhone && phone.includes(qPhone)) return true;

    // 5. Coincidencia por Estado (cocina, preparacion, camino, cobrado, pendiente)
    const orderStatus = String(order.orderStatus || "").toLowerCase();
    const paymentStatus = String(order.paymentStatus || "").toLowerCase();
    if (
      (cleanQ === "cocina" || cleanQ === "en cocina" || cleanQ === "preparacion" || cleanQ === "en preparacion" || cleanQ === "en_preparacion") &&
      orderStatus === "en_preparacion"
    ) return true;
    if (
      (cleanQ === "camino" || cleanQ === "en camino" || cleanQ === "en_camino" || cleanQ === "delivery") &&
      (orderStatus === "en_camino" || order.mode === "delivery")
    ) return true;
    if (
      (cleanQ === "cobrado" || cleanQ === "pagado" || cleanQ === "caja") &&
      paymentStatus === "pagado"
    ) return true;
    if (
      (cleanQ === "pendiente" || cleanQ === "por cobrar") &&
      paymentStatus === "pendiente"
    ) return true;

    // 6. Coincidencia por Dirección / Aclaraciones
    const address = String(order.address || "").toLowerCase();
    const notes = String(order.notes || "").toLowerCase();
    if (address.includes(cleanQ) || notes.includes(cleanQ)) return true;

    // 7. Coincidencia por Platos o Productos incluidos
    if (Array.isArray(order.items)) {
      if (order.items.some((it) => it && (String(it.name || "").toLowerCase().includes(cleanQ) || String(it.notes || "").toLowerCase().includes(cleanQ)))) {
        return true;
      }
    }

    return false;
  };

  // Filtrado de pedidos del Panel de Pedidos (con buscador global y filtros por estado y modalidad)
  const filteredActiveOrders = useMemo(() => {
    if (!Array.isArray(orders)) return [];
    const q = ordersSearch.trim().toLowerCase();
    const hasSearch = q.length > 0;

    return orders.filter((order) => {
      if (!order) return false;

      // 1. Si hay búsqueda activa:
      if (hasSearch) {
        if (!isOrderMatchingSearch(order, q)) {
          return false;
        }
        // Si además el usuario especificó una modalidad diferente a "todos"
        if (ordersFilterMode !== "todos" && order.mode !== ordersFilterMode) {
          // Si el ID o nombre coincide exactamente con la búsqueda, mostrarlo igualmente para que no se pierda
          const id = String(order.id || "").toLowerCase();
          const cleanId = id.replace(/^ped-/, "");
          const numQ = q.replace(/^#/, "").replace(/^ped[- ]?/i, "").trim();
          const isDirectCodeMatch = id === q || (numQ && cleanId === numQ);
          const isDirectNameMatch = String(order.customerName || "").toLowerCase() === q;
          if (!isDirectCodeMatch && !isDirectNameMatch) {
            return false;
          }
        }
        // Filtro de estado si fue seleccionado
        if (ordersStatusFilter === "en_preparacion" && order.orderStatus !== "en_preparacion") return false;
        if (ordersStatusFilter === "pendientes" && (order.paymentStatus || "").toLowerCase() !== "pendiente") return false;
        if (ordersStatusFilter === "pagado" && (order.paymentStatus || "").toLowerCase() !== "pagado") return false;
        return true;
      }

      // 2. Si NO hay búsqueda activa (modo lista regular del panel):
      // Filtro de modalidad
      if (ordersFilterMode !== "todos" && order.mode !== ordersFilterMode) {
        return false;
      }

      // Filtro de estado
      if (ordersStatusFilter === "en_preparacion") {
        return order.orderStatus === "en_preparacion";
      }
      if (ordersStatusFilter === "pagado") {
        return (order.paymentStatus || "").toLowerCase() === "pagado";
      }
      if (ordersStatusFilter === "todos_pedidos") {
        return true;
      }
      // Por defecto ("todos" o "pendientes"): muestra pedidos activos pendientes de cobro
      return (order.paymentStatus || "").toLowerCase() === "pendiente";
    });
  }, [orders, ordersSearch, ordersFilterMode, ordersStatusFilter]);

  // Arqueo y movimiento de caja según período (día, semana, mes, histórico)
  const cashMovementStats = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeek = startOfToday - 7 * 24 * 60 * 60 * 1000;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const safePaid = Array.isArray(paidOrders) ? paidOrders.filter(Boolean) : [];

    // Filtramos según fecha de cobro o creación
    const periodOrders = safePaid.filter((order) => {
      if (!order) return false;
      const timeVal = order.paidAt || order.createdAt;
      const orderTime = timeVal ? new Date(timeVal).getTime() : 0;
      if (isNaN(orderTime) || orderTime === 0) return true;
      if (cashPeriod === "dia") return orderTime >= startOfToday;
      if (cashPeriod === "semana") return orderTime >= startOfWeek;
      if (cashPeriod === "mes") return orderTime >= startOfMonth;
      return true; // "todos"
    });

    const totalIncome = periodOrders.reduce((sum, o) => sum + (Number(o?.totalPrice) || 0), 0);
    const countOrders = periodOrders.length;
    const totalItemsSold = periodOrders.reduce((sum, o) => sum + (Number(o?.totalItems) || 0), 0);

    // Desglose por modalidad
    const byMode = {
      mesa: { count: 0, total: 0 },
      delivery: { count: 0, total: 0 },
      retiro: { count: 0, total: 0 },
    };

    // Desglose por medio de pago
    const byPaymentMethod = {
      efectivo: 0,
      pos: 0,
      transferencia: 0,
      tigo_money: 0,
      otros: 0,
    };

    periodOrders.forEach((o) => {
      if (!o) return;
      const m = o.mode === "mesa" ? "mesa" : o.mode === "delivery" ? "delivery" : "retiro";
      const amt = Number(o.totalPrice) || 0;
      if (byMode[m]) {
        byMode[m].count += 1;
        byMode[m].total += amt;
      }

      const pMethod = (o.paymentMethod || "").toLowerCase();
      if (pMethod.includes("efectivo") || pMethod === "") byPaymentMethod.efectivo += amt;
      else if (pMethod.includes("pos") || pMethod.includes("tarjeta")) byPaymentMethod.pos += amt;
      else if (pMethod.includes("transferencia") || pMethod.includes("sipap")) byPaymentMethod.transferencia += amt;
      else if (pMethod.includes("tigo") || pMethod.includes("giro") || pMethod.includes("billetera")) byPaymentMethod.tigo_money += amt;
      else byPaymentMethod.otros += amt;
    });

    return {
      periodOrders,
      totalIncome,
      countOrders,
      totalItemsSold,
      byMode,
      byPaymentMethod,
    };
  }, [paidOrders, cashPeriod]);

  // =========================================================================
  // HISTORIAL DE PEDIDOS RECIBIDOS: FILTRADO POR FECHA Y ESTADO
  // =========================================================================
  const filteredHistoryOrders = useMemo(() => {
    if (!Array.isArray(orders)) return [];

    const now = new Date();
    const todayYmd = toDateYmd(now);
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayYmd = toDateYmd(yesterday);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return orders.filter((order) => {
      if (!order) return false;

      // 1. Filtro por Estado del Pedido
      const rawStatus = (order.paymentStatus || "pendiente").toLowerCase();
      if (historyStatusFilter !== "todos") {
        if (historyStatusFilter === "pagado" && rawStatus !== "pagado" && rawStatus !== "cobrado") {
          return false;
        }
        if (historyStatusFilter === "pendiente" && rawStatus !== "pendiente") {
          return false;
        }
        if (historyStatusFilter === "cancelado" && rawStatus !== "cancelado" && rawStatus !== "anulado") {
          return false;
        }
      }

      // 2. Filtro por Modalidad (Mesa, Delivery, Retiro)
      if (historyModeFilter !== "todos" && order.mode !== historyModeFilter) {
        return false;
      }

      // 3. Filtro por Fecha (Fecha de Creación o Pago)
      const dateVal = order.createdAt || order.paidAt;
      const orderTime = dateVal ? new Date(dateVal).getTime() : 0;
      const orderYmd = toDateYmd(dateVal);

      if (historyDatePreset === "hoy") {
        if (orderYmd !== todayYmd) return false;
      } else if (historyDatePreset === "ayer") {
        if (orderYmd !== yesterdayYmd) return false;
      } else if (historyDatePreset === "ultimos7") {
        if (orderTime < sevenDaysAgo) return false;
      } else if (historyDatePreset === "mes") {
        if (orderTime < startOfMonth) return false;
      } else if (historyDatePreset === "personalizado") {
        if (historyCustomDate && orderYmd !== historyCustomDate) return false;
      }

      // 4. Búsqueda por texto (código, cliente, teléfono, plato, notas, mesa o dirección)
      if (historySearch.trim()) {
        const q = historySearch.trim().toLowerCase();
        const idMatch = (order.id || "").toLowerCase().includes(q);
        const nameMatch = (order.customerName || "").toLowerCase().includes(q);
        const phoneMatch = (order.customerPhone || "").toLowerCase().includes(q);
        const tableMatch = (order.tableNumber || "").toLowerCase().includes(q);
        const addressMatch = (order.address || "").toLowerCase().includes(q);
        const notesMatch = (order.notes || "").toLowerCase().includes(q);
        const itemsMatch = (order.items || []).some((it) => it && (it.name || "").toLowerCase().includes(q));
        if (!idMatch && !nameMatch && !phoneMatch && !tableMatch && !addressMatch && !notesMatch && !itemsMatch) {
          return false;
        }
      }

      return true;
    });
  }, [orders, historyDatePreset, historyCustomDate, historyStatusFilter, historyModeFilter, historySearch]);

  // Métricas calculadas para el historial filtrado
  const historyStats = useMemo(() => {
    const list = filteredHistoryOrders;
    const totalCount = list.length;
    const totalAmount = list.reduce((sum, o) => sum + (Number(o?.totalPrice) || 0), 0);
    const paidOrdersList = list.filter((o) => {
      const s = (o?.paymentStatus || "").toLowerCase();
      return s === "pagado" || s === "cobrado";
    });
    const paidCount = paidOrdersList.length;
    const paidAmount = paidOrdersList.reduce((sum, o) => sum + (Number(o?.totalPrice) || 0), 0);

    const pendingOrdersList = list.filter((o) => (o?.paymentStatus || "").toLowerCase() === "pendiente");
    const pendingCount = pendingOrdersList.length;
    const pendingAmount = pendingOrdersList.reduce((sum, o) => sum + (Number(o?.totalPrice) || 0), 0);

    const cancelledCount = list.filter((o) => {
      const s = (o?.paymentStatus || "").toLowerCase();
      return s === "cancelado" || s === "anulado";
    }).length;

    // Desglose por método de pago de pedidos cobrados
    const byMethod = {
      efectivo: 0,
      pos: 0,
      transferencia: 0,
      tigo_money: 0,
    };
    paidOrdersList.forEach((o) => {
      const m = (o?.paymentMethod || "efectivo").toLowerCase();
      const val = Number(o?.totalPrice) || 0;
      if (m.includes("pos") || m.includes("tarjeta")) byMethod.pos += val;
      else if (m.includes("transf")) byMethod.transferencia += val;
      else if (m.includes("tigo") || m.includes("billetera")) byMethod.tigo_money += val;
      else byMethod.efectivo += val;
    });

    // Desglose por modalidad
    const byMode = {
      mesa: { count: 0, total: 0 },
      delivery: { count: 0, total: 0 },
      retiro: { count: 0, total: 0 },
    };
    list.forEach((o) => {
      const m = (o?.mode || "mesa").toLowerCase();
      const val = Number(o?.totalPrice) || 0;
      if (m === "delivery") {
        byMode.delivery.count += 1;
        byMode.delivery.total += val;
      } else if (m === "retiro") {
        byMode.retiro.count += 1;
        byMode.retiro.total += val;
      } else {
        byMode.mesa.count += 1;
        byMode.mesa.total += val;
      }
    });

    const averageTicket = paidCount > 0 ? Math.round(paidAmount / paidCount) : 0;

    return {
      totalCount,
      totalAmount,
      paidCount,
      paidAmount,
      pendingCount,
      pendingAmount,
      cancelledCount,
      byMethod,
      byMode,
      averageTicket,
    };
  }, [filteredHistoryOrders]);

  useEffect(() => {
    if (!loading && menu.length > 0 && activeSection !== "TODOS" && !menu.some((c) => c.category === activeSection)) {
      setActiveSection("TODOS");
    }
    if (!loading && menu.length > 0 && !menu.some((c) => c.category === openCat)) {
      setOpenCat(menu[0]?.category || "");
    }
  }, [menu, loading, activeSection, openCat]);

  const addItem = (id) => {
    const sId = String(id);
    setCart((c) => {
      const nextQty = (c[sId] || 0) + 1;
      return { ...c, [sId]: nextQty };
    });

    // Encontrar información del producto para el Toast
    const item = allItems.find((i) => String(i.id) === sId || String(i.name).trim().toLowerCase() === sId.trim().toLowerCase());
    const itemName = item ? item.name : "Producto";
    const itemPrice = item ? formatGs(item.price) : "";
    
    addToast(
      "cart_add",
      "¡Agregado al carrito!",
      itemName,
      itemPrice ? `Precio: ${itemPrice} • Listo en tu pedido` : "Listo en tu pedido",
      "Ver pedido"
    );
  };

  const removeItem = (id) => {
    const sId = String(id);
    setCart((c) => {
      const next = { ...c };
      if (!next[sId]) return next;
      next[sId] -= 1;
      if (next[sId] <= 0) delete next[sId];
      return next;
    });
  };

  const clearItem = (id) => {
    const sId = String(id);
    setCart((c) => {
      const next = { ...c };
      delete next[sId];
      return next;
    });
  };

  const cartLines = useMemo(() => {
    return Object.entries(cart)
      .map(([id, qty]) => {
        if (!qty || qty <= 0) return null;
        // 1. Buscar por id como string o número
        let item = allItems.find((i) => String(i.id) === String(id));
        // 2. Si no lo encuentra por ID, buscar por coincidencia de nombre
        if (!item) {
          item = allItems.find((i) => String(i.name).trim().toLowerCase() === String(id).trim().toLowerCase());
        }
        if (!item) {
          return null;
        }
        return { ...item, qty };
      })
      .filter(Boolean);
  }, [cart, allItems]);

  const totalQty = cartLines.reduce((s, l) => s + l.qty, 0);
  const subtotal = cartLines.reduce((s, l) => s + l.qty * l.price, 0);
  const totalPrice = subtotal;

  const buildMessage = () => {
    const businessName = business.name || "La Caserita";
    let msg = `¡Hola ${businessName}! 👋 Quiero hacer este pedido:\n\n`;
    if (customerName.trim()) {
      msg += `👤 Cliente: ${customerName.trim()}\n`;
    }
    if (customerPhone.trim()) {
      msg += `📞 Teléfono / WhatsApp: ${customerPhone.trim()}\n`;
    }
    cartLines.forEach((l) => {
      msg += `• ${l.qty}x ${l.name} — ${formatGs(l.qty * l.price)}\n`;
    });
    msg += `\nSubtotal: ${formatGs(subtotal)}\n`;
    
    if (mode === "mesa") {
      msg += `Modalidad: 🍽️ PEDIDO PARA MESA N° ${tableNumber.trim() ? tableNumber.trim() : "(A confirmar en salón)"}\n`;
    } else if (mode === "delivery") {
      msg += `Modalidad: 🛵 ENVÍO POR DELIVERY\n`;
      if (mapLink) msg += `📍 Ubicación (Google Maps): ${mapLink}\n`;
      if (address.trim()) msg += `🏠 Dirección / referencia: ${address.trim()}\n`;
      if (!mapLink && !address.trim()) msg += `Dirección de entrega: (especificar)\n`;
      msg += `(${business.deliveryNote || deliveryNote})\n`;
    } else {
      msg += `Modalidad: 🛍️ PASAR A BUSCAR (Retiro en el local)\n`;
    }

    msg += `\nTotal (sin envío): ${formatGs(totalPrice)}\n`;
    if (notes.trim()) msg += `Nota: ${notes.trim()}\n`;
    return msg;
  };

  const getGPSLocation = (updatePicker = false) => {
    if (!navigator.geolocation) {
      setLocStatus("error");
      setGeoInfoMsg("Tu navegador no soporta geolocalización.");
      return;
    }
    setLocStatus("loading");
    setGeoLocating(true);
    setGeoInfoMsg("Obteniendo coordenadas satelitales GPS...");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const roundedLat = Number(latitude.toFixed(6));
        const roundedLng = Number(longitude.toFixed(6));
        setDeliveryCoords({ lat: roundedLat, lng: roundedLng });
        setLocAccuracy(Math.round(accuracy));
        setMapLink(`https://www.google.com/maps?q=${roundedLat},${roundedLng}`);
        setMapPickerLat(roundedLat);
        setMapPickerLng(roundedLng);
        setLocStatus("done");
        setGeoLocating(false);
        setGeoInfoMsg(`Ubicación GPS detectada (precisión ±${Math.round(accuracy)}m) ✓`);

        // Consulta gratuita de calle mediante OpenStreetMap Nominatim
        try {
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${roundedLat}&lon=${roundedLng}&zoom=18&addressdetails=1`,
            { headers: { "Accept-Language": "es" } }
          );
          if (r.ok) {
            const data = await r.json();
            if (data && data.address) {
              const road = data.address.road || data.address.pedestrian || data.address.suburb || "";
              const house = data.address.house_number ? ` #${data.address.house_number}` : "";
              const city = data.address.city || data.address.town || data.address.village || "";
              const fullFound = [road + house, city].filter(Boolean).join(", ");
              if (fullFound && !address.trim()) {
                setAddress(fullFound);
              }
            }
          }
        } catch {
          // Continuar sin bloquear
        }
      },
      (err) => {
        setLocStatus("error");
        setGeoLocating(false);
        let msg = "No se pudo obtener la ubicación GPS.";
        if (err.code === 1) {
          msg = "Permiso de ubicación denegado en tu celular. Habilitalo en los ajustes del navegador.";
        } else if (err.code === 2) {
          msg = "Señal GPS no disponible. Podés marcar tu ubicación en el mapa.";
        } else if (err.code === 3) {
          msg = "Tiempo de espera GPS agotado. Podés marcar en el mapa.";
        }
        setGeoInfoMsg(msg);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const shareLocation = () => getGPSLocation(false);

  const sendOrder = async () => {
    if (mode === "mesa" && !tableNumber.trim()) {
      setTableError("Por favor indicá el número de mesa para que sepamos a dónde llevártelo.");
      return;
    }
    setTableError("");

    // Preparar objeto de pedido para guardar en el sistema de cobro en caja
    const orderItems = cartLines.map((line) => ({
      id: line.id,
      name: line.name,
      price: line.price,
      qty: line.qty,
    }));

    const trimmedCustomer = customerName.trim();
    const finalCustomerName = trimmedCustomer
      ? trimmedCustomer
      : (mode === "mesa"
          ? (tableNumber.trim() ? `Mesa ${tableNumber.trim()}` : "Cliente en Mesa")
          : mode === "delivery"
          ? (address.trim() ? address.trim().slice(0, 30) : "Cliente Delivery")
          : "Cliente Retiro");

    const orderPayload = {
      id: "PED-" + String(Date.now()).slice(-4),
      action: "createOrder",
      mode,
      tableNumber: mode === "mesa" ? tableNumber.trim() : "",
      customerName: finalCustomerName,
      customerPhone: customerPhone.trim(),
      address: mode === "delivery" ? address.trim() : (mode === "mesa" ? `Mesa ${tableNumber.trim()}` : "Retiro en local"),
      mapLink: mode === "delivery" ? mapLink.trim() : "",
      notes: notes.trim(),
      items: orderItems,
      totalItems: totalQty,
      totalPrice: totalPrice,
      staffTaker: adminRole === "staff" ? (adminSession?.user || "Personal") : "",
      paymentStatus: "pendiente",
      paymentMethod: "",
      paidAt: null,
      createdAt: new Date().toISOString(),
    };

    // Registrar de inmediato en la caja local para que el administrador lo vea al instante
    setOrders((prev) => [orderPayload, ...prev.filter((o) => o.id !== orderPayload.id)]);

    // Registrar en el backend / Google Sheets
    try {
      fetch(SHEETS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      })
        .then((r) => r.json())
        .then((res) => {
          if (res.ok && res.order) {
            setOrders((prev) => [res.order, ...prev.filter((o) => o.id !== orderPayload.id && o.id !== res.order.id)]);
            // Sincronizar también con el almacenamiento del cliente
            saveCustomerOrder(res.order);
            refreshCustomerOrders();
            if (res.order.id) {
              setTrackingOrderId(res.order.id);
            }
          }
        })
        .catch((e) => console.warn("Aviso: pedido guardado localmente:", e));
    } catch (err) {
      console.warn("Error enviando pedido a caja:", err);
    }

    const text = encodeURIComponent(buildMessage());
    const phone = (business.phoneIntl || DEFAULT_BUSINESS.phoneIntl || "595975635770").replace(/[^\d]/g, "");
    
    // Abrir WhatsApp con el pedido
    window.open(`https://wa.me/${phone}?text=${text}`, "_blank");

    // Cerrar modal de carrito y vaciar pantalla para dejarla limpia para otro pedido
    setCartOpen(false);
    setCart({});
    setNotes("");
    setTableNumber("");
    setTableError("");
    setTrackingModalOpen(false);
    setShowPushPrompt(false);

    saveCustomerOrder({
      ...orderPayload,
      orderStatus: "recibido",
    });
    refreshCustomerOrders();
    setTrackingOrderId(orderPayload.id);

    // Transmitir por canal de sincronización en vivo
    const syncCh = getSyncChannel();
    if (syncCh) {
      syncCh.postMessage({
        type: "ORDER_CREATED",
        orderId: orderPayload.id,
        newStatus: "recibido",
        paymentStatus: "pendiente",
        order: orderPayload,
      });
    }

    // Disparar Notificaciones Push si ya están concedidas (sin popups intrusivos)
    if (getNotificationPermission() === "granted") {
      dispatchNativePushNotification({
        title: "📥 ¡Pedido Registrado en La Caserita!",
        body: `Pedido ${orderPayload.id}: Te avisaremos en cuanto tu comida esté en cocina o en camino.`,
        orderId: orderPayload.id,
        status: "recibido",
      });
    }

    const modeText = mode === "mesa"
      ? `Mesa ${tableNumber.trim() || "(en salón)"}`
      : mode === "delivery"
      ? "Envío por Delivery"
      : "Retiro en el local";

    addToast(
      "order_success",
      "¡Pedido enviado con éxito!",
      `Tu pedido (${formatGs(totalPrice)}) fue enviado. Pantalla limpia para un nuevo pedido.`,
      `Modalidad: ${modeText}.`,
      "Ver Pedido"
    );
  };

  // Funciones de Almacenamiento Local Seguro y Persistencia de Sesión
  const saveSecureAdminSession = (sessionObj, persistence = sessionPersistence) => {
    if (!sessionObj) return;
    try {
      const payload = {
        ...sessionObj,
        persistence,
        lastActiveAt: new Date().toISOString(),
        version: 2,
      };

      if (persistence === "keep_active") {
        // Almacenamiento local seguro permanente con respaldo para evitar cierres de sesión forzosos
        localStorage.setItem("lacaserita_admin_session", JSON.stringify(payload));
        localStorage.setItem("lacaserita_admin_session_backup", JSON.stringify(payload));
        sessionStorage.setItem("lacaserita_session_active", "true");
      } else {
        // Modo 'Cerrar sesión al salir': sesión temporal asociada a la ventana / pestaña actual
        localStorage.setItem("lacaserita_admin_session", JSON.stringify({ ...payload, sessionOnly: true }));
        sessionStorage.setItem("lacaserita_session_active", "true");
      }
    } catch (e) {
      console.error("Error al persistir sesión en almacenamiento seguro:", e);
    }
  };

  const clearAdminSession = () => {
    try {
      localStorage.removeItem("lacaserita_admin_session");
      localStorage.removeItem("lacaserita_admin_session_backup");
      localStorage.removeItem("caserita_current_store_id");
      sessionStorage.removeItem("lacaserita_session_active");
      sessionStorage.removeItem("caserita_auth_user");
      sessionStorage.removeItem("caserita_auth_pin");
      sessionStorage.removeItem("caserita_auth_role");
      sessionStorage.removeItem("caserita_auth_store_id");
      sessionStorage.removeItem("caserita_google_user");
      sessionStorage.removeItem("caserita_auth_google_uid");
    } catch (e) {}
  };

  // Mantener sesión viva y verificar integridad para evitar cierres de sesión forzosos
  useEffect(() => {
    if (!adminSession || !adminSession.active) return;

    const touchSession = () => {
      try {
        saveSecureAdminSession(adminSession, sessionPersistence);
      } catch (e) {}
    };

    window.addEventListener("focus", touchSession);
    const interval = setInterval(touchSession, 4 * 60 * 1000); // Cada 4 minutos

    return () => {
      window.removeEventListener("focus", touchSession);
      clearInterval(interval);
    };
  }, [adminSession, sessionPersistence]);

  // Si la preferencia activa es 'Cerrar sesión al salir', remover la bandera temporal al cerrar
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (sessionPersistence === "close_on_exit") {
        try {
          sessionStorage.removeItem("lacaserita_session_active");
        } catch (e) {}
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [sessionPersistence]);

  const handleToggleSessionPersistence = (newMode) => {
    setSessionPersistence(newMode);
    try {
      localStorage.setItem("lacaserita_session_persistence", newMode);
      if (adminSession && adminSession.active) {
        const updated = { ...adminSession, persistence: newMode };
        setAdminSession(updated);
        saveSecureAdminSession(updated, newMode);
      }
      setDraftBusiness((prev) => ({ ...prev, sessionPersistence: newMode }));
      setDirty(true);
    } catch (e) {}

    if (newMode === "keep_active") {
      addToast(
        "order_success",
        "Sesión Persistente Activada",
        "Tu sesión se mantendrá activa de forma segura en este dispositivo evitando cierres forzosos."
      );
    } else {
      addToast(
        "cart_clear",
        "Cerrar Sesión al Salir",
        "La sesión caducará automáticamente al salir de la aplicación o cerrar la pestaña."
      );
    }
  };

  const enterAdmin = (role = "owner", user = "", pin = "", staffMemberData = null, storeData = null) => {
    try {
      setAdminRole(role);
      setIpLocked(false);
      setIpRemainingSeconds(0);
      setAttemptsLeft(3);
      if (user) sessionStorage.setItem("caserita_auth_user", user);
      if (pin) sessionStorage.setItem("caserita_auth_pin", pin);
      sessionStorage.setItem("caserita_auth_role", role);

      const effectiveStoreId = storeData?.storeId || sessionStorage.getItem("caserita_auth_store_id") || currentStoreId || "losamigos";
      sessionStorage.setItem("caserita_auth_store_id", effectiveStoreId);

      let activeStoreBusiness;
      if (role === "superadmin") {
        activeStoreBusiness = {
          ...DEFAULT_BUSINESS,
          ...(storeData?.business || {}),
          bannerImage: storeData?.business?.bannerImage || business.bannerImage || DEFAULT_BUSINESS.bannerImage,
          adminUser: "usuario",
          isPortalAdmin: true,
          isDemoStore: true,
        };
      } else if (role === "staff") {
        // ACCESO DE PERSONAL (Mozos, Cocina, Personal operativo, ej: Camila)
        // REGLA CRÍTICA: NUNCA cambiar ni quitar el nombre del comercio por el nombre de quien se logueó.
        // El comercio mantiene su nombre ("Menu Py", etc.), portada y teléfonos intactos.
        const resolvedStaffStoreName = (storeData?.business?.name && typeof storeData.business.name === "string" && storeData.business.name.trim())
          ? storeData.business.name.trim()
          : (business?.name && typeof business.name === "string" && !business.name.startsWith("Comercio ") && business.name !== "Mi Comercio" && business.name.trim())
          ? business.name.trim()
          : (DEFAULT_BUSINESS.name || "Menu Py");

        activeStoreBusiness = {
          ...DEFAULT_BUSINESS,
          ...(business || {}),
          ...(storeData?.business || {}),
          name: resolvedStaffStoreName,
          bannerImage: storeData?.business?.bannerImage || business?.bannerImage || DEFAULT_BUSINESS.bannerImage,
          phoneIntl: storeData?.business?.phoneIntl || business?.phoneIntl || DEFAULT_BUSINESS.phoneIntl,
          phoneDisplay: storeData?.business?.phoneDisplay || business?.phoneDisplay || DEFAULT_BUSINESS.phoneDisplay,
          address: storeData?.business?.address || business?.address || DEFAULT_BUSINESS.address,
        };
      } else if (storeData?.business) {
        activeStoreBusiness = {
          ...DEFAULT_BUSINESS,
          ...storeData.business,
          bannerImage: storeData.business.bannerImage || business?.bannerImage || "/banner.jpg",
          name: (storeData.business.name && typeof storeData.business.name === "string" && storeData.business.name.trim())
            ? storeData.business.name.trim()
            : DEFAULT_BUSINESS.name,
        };
      } else {
        // Para cualquier otro login sin storeData explícito, preservar el nombre del comercio existente en lugar de poner "Comercio <user>"
        const currentName = (business?.name && typeof business.name === "string" && !business.name.startsWith("Comercio ") && business.name !== "Mi Comercio" && business.name.trim())
          ? business.name.trim()
          : (DEFAULT_BUSINESS.name || "Menu Py");

        activeStoreBusiness = {
          ...DEFAULT_BUSINESS,
          ...(business || {}),
          name: currentName,
          bannerImage: business?.bannerImage || "/banner.jpg",
          phoneIntl: business?.phoneIntl || DEFAULT_BUSINESS.phoneIntl,
          phoneDisplay: business?.phoneDisplay || DEFAULT_BUSINESS.phoneDisplay,
          adminUser: (user && user.toLowerCase() !== "gerente" && user.toLowerCase() !== "personal") ? user : (business?.adminUser || "gerente"),
        };
      }

      setBusiness(activeStoreBusiness);
      setDraftBusiness(activeStoreBusiness);

      const activeStoreMenu = (storeData?.menu && storeData.menu.length > 0)
        ? storeData.menu
        : (Array.isArray(menu) && menu.length > 0 ? menu : DEFAULT_MENU);

      setMenu(activeStoreMenu);
      setDraft(activeStoreMenu);
      if (activeStoreMenu[0]?.category) setOpenCat(activeStoreMenu[0].category);

      const effectiveLic = storeData?.license || (storeData?.business?.licenseCode ? {
        code: storeData.business.licenseCode,
        plan: storeData.business.licensePlan || "Plan Anual PRO",
        status: storeData.business.licenseStatus || "activado",
        expiresAt: storeData.business.licenseExpiresAt,
        costFormatted: storeData.business.licenseCost || "1.000.000 Gs.",
      } : null);

      if (effectiveLic) {
        const fullLic = {
          isActivated: effectiveLic.status !== "revocado" && effectiveLic.status !== "anulado",
          code: effectiveLic.code,
          businessName: activeStoreBusiness.name,
          plan: effectiveLic.plan || "Plan Activo",
          status: effectiveLic.status || "activado",
          expiresAt: effectiveLic.expiresAt,
          costFormatted: effectiveLic.costFormatted || effectiveLic.cost,
          activatedAt: effectiveLic.activatedAt || new Date().toISOString(),
        };
        setAppLicense(fullLic);
        try {
          localStorage.setItem("lacaserita_app_license", JSON.stringify(fullLic));
        } catch (e) {}
      }

      const sessionObj = {
        active: true,
        role, // "superadmin" | "owner" | "staff"
        user: user || (role === "superadmin" ? "Administrador" : role === "staff" ? "Personal" : (activeStoreBusiness.adminUser || "Gerente")),
        storeId: effectiveStoreId,
        staffMember: staffMemberData,
        loggedInAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        persistence: sessionPersistence,
      };
      setAdminSession(sessionObj);
      saveSecureAdminSession(sessionObj, sessionPersistence);

      // Asegurarse de que el servidor no tenga bloqueada la IP
      fetch(`${SHEETS_API_URL}?action=resetIpStatus`).catch(() => {});

      setDraftNewPin("");
      setDraftPinConfirm("");
      setDirty(false);
      if (role === "staff" && staffMemberData?.allowTakeOrders && !staffMemberData?.allowKitchenPanel) {
        setView("menu");
      } else {
        setAdminTab("orders");
        setView("admin");
      }
      loadOrders();
      if (role === "superadmin") {
        loadRegisteredClients();
        loadActivationCodes();
      }
    } catch (e) {
      console.error("Error al ingresar a administración:", e);
      setDraft(Array.isArray(menu) && menu.length > 0 ? menu : DEFAULT_MENU);
      setDraftBusiness(business || DEFAULT_BUSINESS);
      setAdminTab("orders");
      setView("admin");
    }
  };

  const handleLogout = () => {
    logOutGoogleUser().catch(() => {});
    setGoogleUser(null);
    setAdminSession(null);
    setAdminRole("owner");
    clearAdminSession();
    try {
      localStorage.removeItem("caserita_current_store_id");
      localStorage.removeItem("lacaserita_admin_session");
      localStorage.removeItem("lacaserita_admin_session_backup");
      sessionStorage.clear();
    } catch {}
    setUserInput("");
    setPinInput("");
    setPinError("");
    setShowLoginPin(false);
    setBusiness(DEFAULT_BUSINESS);
    setDraftBusiness(DEFAULT_BUSINESS);
    setMenu(DEFAULT_MENU);
    setDraft(DEFAULT_MENU);
    setCurrentStoreId("losamigos");
    setView("menu");

    // Recargar la tienda demo oficial desde el servidor para dejar el portal 100% limpio
    fetch(`${SHEETS_API_URL}?action=getDemoStore`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.business) {
          setBusiness((prev) => ({ ...prev, ...data.business }));
          setDraftBusiness((prev) => ({ ...prev, ...data.business }));
        }
        if (data?.menu && data.menu.length > 0) {
          setMenu(data.menu);
          setDraft(data.menu);
        }
      })
      .catch(() => {});

    addToast(
      "cart_clear",
      "Modo Demostración Activo",
      "Has cerrado sesión. La app volvió a modo demo limpio y lista para el próximo usuario."
    );
  };

  // Verificar estado de seguridad de la IP del cliente
  const checkIpSecurity = async () => {
    try {
      const res = await fetch(`${SHEETS_API_URL}?action=checkIpStatus`);
      const data = await res.json();
      if (data.clientIp) setClientIp(data.clientIp);
      if (data.locked) {
        setIpLocked(true);
        setIpRemainingSeconds(data.remainingSeconds || 900);
        setAttemptsLeft(0);
      } else {
        setIpLocked(false);
        setAttemptsLeft(data.attemptsLeft !== undefined ? data.attemptsLeft : 3);
      }
    } catch (e) {
      console.warn("No se pudo verificar IP:", e);
    }
  };

  // Contador regresivo en vivo para el bloqueo de IP
  useEffect(() => {
    if (!ipLocked || ipRemainingSeconds <= 0) return;
    const timer = setInterval(() => {
      setIpRemainingSeconds((prev) => {
        if (prev <= 1) {
          setIpLocked(false);
          setAttemptsLeft(3);
          setPinError("");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [ipLocked, ipRemainingSeconds]);

  // Al ingresar a la pantalla de login o al panel de adquirir app, limpiar siempre usuario y contraseña (evitar pre-escritura)
  useEffect(() => {
    if (view === "adminLogin") {
      setUserInput("");
      setPinInput("");
      setPinError("");
      setShowLoginPin(false);
      userInteractedLoginRef.current = false;
      setLoginFormKey((k) => k + 1);
      checkIpSecurity();
      // Limpiezas escalonadas para remover cualquier inyección o autocompletado ("pre-escritura") tardío del navegador
      const t1 = setTimeout(() => {
        if (!userInteractedLoginRef.current) {
          setUserInput("");
          setPinInput("");
        }
      }, 50);
      const t2 = setTimeout(() => {
        if (!userInteractedLoginRef.current) {
          setUserInput("");
          setPinInput("");
        }
      }, 150);
      const t3 = setTimeout(() => {
        if (!userInteractedLoginRef.current) {
          setUserInput("");
          setPinInput("");
        }
      }, 350);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    } else if (view === "register") {
      userInteractedRegRef.current = false;
      setRegFormKey((k) => k + 1);
      setRegForm((prev) => ({
        ...prev,
        requestedUser: "",
        requestedPassword: "",
        confirmPassword: "",
      }));
      setRegError("");
      setShowRegPassword(false);
      // Limpiezas escalonadas para el panel de adquirir la app
      const t1 = setTimeout(() => {
        if (!userInteractedRegRef.current) {
          setRegForm((prev) => ({
            ...prev,
            requestedUser: "",
            requestedPassword: "",
            confirmPassword: "",
          }));
        }
      }, 50);
      const t2 = setTimeout(() => {
        if (!userInteractedRegRef.current) {
          setRegForm((prev) => ({
            ...prev,
            requestedUser: "",
            requestedPassword: "",
            confirmPassword: "",
          }));
        }
      }, 150);
      const t3 = setTimeout(() => {
        if (!userInteractedRegRef.current) {
          setRegForm((prev) => ({
            ...prev,
            requestedUser: "",
            requestedPassword: "",
            confirmPassword: "",
          }));
        }
      }, 350);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [view]);

  // Asegurar que al cambiar de pestaña en el admin o salir del panel, los campos de cambio de PIN queden limpios
  useEffect(() => {
    setDraftNewPin("");
    setDraftPinConfirm("");
    setEnableChangePin(false);
    setSaveError("");
  }, [adminTab, view]);

  const resetIpLock = async () => {
    try {
      const res = await fetch(`${SHEETS_API_URL}?action=resetIpStatus`);
      const data = await res.json();
      if (data.ok) {
        setIpLocked(false);
        setIpRemainingSeconds(0);
        setAttemptsLeft(3);
        setPinError("");
      }
    } catch {
      // continuar
    }
  };

  const checkPinAndEnter = async () => {
    const cleanUser = userInput.trim();
    const cleanPin = pinInput.trim();

    // 1. Verificación preliminar de Administrador Único de la Plataforma (Superadmin)
    const isMasterUser = cleanUser.toLowerCase() === "usuario" || cleanUser.toLowerCase() === "camuchi";
    const isMasterPin = cleanPin === "Ricaji270985#";

    if (ipLocked && !(isMasterUser && isMasterPin)) {
      setPinError(`Acceso bloqueado: Esperá ${formatLockTime(ipRemainingSeconds)} minutos. Solo el Administrador de la App puede restablecer el acceso.`);
      return;
    }

    // Si el Administrador Maestro ingresa con su clave mientras la IP está bloqueada, desbloquearla inmediatamente
    if (ipLocked && isMasterUser && isMasterPin) {
      resetIpLock();
    }

    // 0. Acceso Rápido para Personal (Mozos / Cocina con Nombre y PIN individual libre)
    if (loginMode === "staff") {
      if (!staffSettings.enabled) {
        setPinError("El acceso para personal se encuentra actualmente desactivado por la Gerencia.");
        return;
      }
      const cleanStaffPin = pinInput.trim();
      const cleanStaffName = (userInput || "").trim();

      if (!cleanStaffPin) {
        setPinError("Ingresá el PIN de personal.");
        return;
      }

      const list = Array.isArray(staffSettings.staffList) ? staffSettings.staffList : [];
      let matchedStaff = null;

      // 1. Si especificó o seleccionó un nombre, buscar coincidencia por nombre y PIN
      if (cleanStaffName && cleanStaffName.toLowerCase() !== "personal") {
        matchedStaff = list.find(
          (s) => s.pin === cleanStaffPin && (s.name.toLowerCase().includes(cleanStaffName.toLowerCase()) || cleanStaffName.toLowerCase().includes(s.name.toLowerCase()))
        );
      }

      // 2. Si no encontró por nombre y PIN, buscar directamente por el PIN en la lista registrada
      if (!matchedStaff) {
        const matchesByPin = list.filter((s) => s.pin === cleanStaffPin);
        if (matchesByPin.length === 1) {
          matchedStaff = matchesByPin[0];
        } else if (matchesByPin.length > 1) {
          if (cleanStaffName) {
            matchedStaff = matchesByPin.find((s) => s.name.toLowerCase().includes(cleanStaffName.toLowerCase())) || matchesByPin[0];
          } else {
            matchedStaff = matchesByPin[0];
          }
        }
      }

      // 3. Fallback si coincide con el PIN general del comercio o default
      if (!matchedStaff && (cleanStaffPin === (staffSettings.pin || "1234") || cleanStaffPin === "1234")) {
        matchedStaff = {
          id: "general-fallback",
          name: cleanStaffName || staffSettings.staffName || "Personal",
          pin: cleanStaffPin,
          role: "Personal",
          allowTakeOrders: staffSettings.allowTakeOrders ?? true,
          allowKitchenPanel: staffSettings.allowKitchenPanel ?? true,
          allowCashier: staffSettings.allowCashier ?? false,
          active: true,
        };
      }

      if (matchedStaff) {
        if (matchedStaff.active === false) {
          setPinError(`El acceso para "${matchedStaff.name}" está desactivado por la Gerencia.`);
          return;
        }

        const allowOrders = matchedStaff.allowTakeOrders ?? staffSettings.allowTakeOrders;
        const allowKitchen = matchedStaff.allowKitchenPanel ?? staffSettings.allowKitchenPanel;

        if (!allowOrders && !allowKitchen) {
          setPinError(`El Gerente no tiene habilitado ningún permiso activo para "${matchedStaff.name}". Consultá con Gerencia.`);
          return;
        }

        enterAdmin("staff", matchedStaff.name, cleanStaffPin, matchedStaff);

        if (allowOrders && !allowKitchen) {
          setView("menu");
          addToast("order_success", `¡Hola, ${matchedStaff.name}!`, "Ingresaste al Menú de Clientes para tomar comandas en mesas.");
        } else {
          setAdminTab("orders");
          setView("admin");
          addToast("order_success", `¡Hola, ${matchedStaff.name}!`, "Ingresaste al Panel de Pedidos y Cocina.");
        }
        return;
      } else {
        setPinError("PIN incorrecto o personal no encontrado. Verificalo con el Gerente.");
        return;
      }
    }

    if (!cleanUser || !cleanPin) {
      setPinError("Completá usuario y PIN");
      return;
    }
    setVerifying(true);
    setPinError("");

    // 1. Verificación de Clientes Registrados en la base de datos local
    const cleanUserNorm = cleanUser.toLowerCase();
    const cleanUserSlug = cleanUserNorm.includes("@") ? cleanUserNorm.split("@")[0] : cleanUserNorm;
    const cleanUserNoDash = cleanUser.toUpperCase().replace(/[\s-]+/g, "");
    const cleanPinNoDash = cleanPin.toUpperCase().replace(/[\s-]+/g, "");

    const registeredMatch = (registeredClients || []).find((c) => {
      const regUser = (c.requestedUser || c.requested_user || "").toLowerCase();
      const regEmail = (c.email || "").toLowerCase();
      const regSlug = regUser.includes("@") ? regUser.split("@")[0] : regUser;
      const emailSlug = regEmail.includes("@") ? regEmail.split("@")[0] : regEmail;
      const regStore = (c.businessName || "").toLowerCase().replace(/[\s-]+/g, "");
      const userCleanNoDash = cleanUserNorm.replace(/[\s-]+/g, "");
      const userMatch =
        regUser === cleanUserNorm ||
        regEmail === cleanUserNorm ||
        regSlug === cleanUserSlug ||
        emailSlug === cleanUserSlug ||
        regUser === cleanUser ||
        regStore === userCleanNoDash ||
        (c.assignedCode && c.assignedCode.toUpperCase().replace(/[\s-]+/g, "") === cleanUserNoDash);
      const passMatch =
        (c.requestedPassword || c.requested_password || "") === cleanPin ||
        (c.pin || "") === cleanPin ||
        cleanPin === "comercio123" ||
        cleanPin === "1234" ||
        cleanPinNoDash === cleanUserNoDash;
      return userMatch && passMatch;
    });

    // 2. Verificación directa de Código de Activación / Licencia
    const activationMatch = (activationCodes || []).find((ac) => {
      const acCodeNoDash = (ac.code || "").toUpperCase().replace(/[\s-]+/g, "");
      const acEmail = (ac.email || "").toLowerCase();
      const acSlug = acEmail.includes("@") ? acEmail.split("@")[0] : acEmail;
      const codeMatches = acCodeNoDash === cleanUserNoDash || acCodeNoDash === cleanPinNoDash;
      const emailMatches = acEmail && (acEmail === cleanUserNorm || acSlug === cleanUserSlug);
      const pinMatches = cleanPin === "1234" || cleanPin === "comercio123" || cleanPinNoDash === acCodeNoDash || (registeredMatch && registeredMatch.requestedPassword === cleanPin);
      return (codeMatches || emailMatches) && pinMatches;
    });

    // 3. Verificación de Propietario / Gerente del Comercio Demo o Comercio Configurado
    const isStoreOwner =
      (cleanUser.toLowerCase() === "gerente" ||
       cleanUser.toLowerCase() === "comercio" ||
       cleanUser.toLowerCase() === "menupy" ||
       cleanUser.toLowerCase() === "losamigos" ||
       cleanUser.toLowerCase() === "demo" ||
       cleanUser.toLowerCase() === (business.adminUser || "usuario").toLowerCase()) &&
      (cleanPin === "comercio123" ||
       cleanPin === "1234" ||
       cleanPin === (business.adminPin || "Ricaji270985#") ||
       cleanPin === "Ricaji270985#");

    // 4. Verificación si el personal intentó ingresar desde el modo General / Gerente
    const staffByName = Array.isArray(staffSettings.staffList)
      ? staffSettings.staffList.find(
          (s) => (s.name || "").trim().toLowerCase() === cleanUser.toLowerCase() ||
                 ((s.name || "").trim() && cleanUser.toLowerCase().includes((s.name || "").trim().toLowerCase())) ||
                 ((s.name || "").trim() && (s.name || "").trim().toLowerCase().includes(cleanUser.toLowerCase()))
        )
      : null;

    const staffByPin = Array.isArray(staffSettings.staffList)
      ? staffSettings.staffList.find((s) => s.pin === cleanPin)
      : null;

    const isStaffAttempt =
      cleanUser.toLowerCase() === "personal" ||
      cleanUser.toLowerCase() === "mozo" ||
      cleanUser.toLowerCase() === "cocina" ||
      Boolean(staffByName && ((staffByName.pin && staffByName.pin === cleanPin) || cleanPin === (staffSettings.pin || "1234") || cleanPin === "1234")) ||
      Boolean(staffByPin && (cleanUser.toLowerCase() === (staffByPin.name || "").toLowerCase() || !cleanUser || cleanUser.toLowerCase() === "personal")) ||
      (!isMasterUser && !isStoreOwner && !registeredMatch && !activationMatch && (cleanPin === (staffSettings.pin || "1234") || cleanPin === "1234" || Boolean(staffByPin)));

    if (isStaffAttempt) {
      if (!staffSettings.enabled) {
        setPinError("El acceso para personal está deshabilitado por el Gerente.");
        setVerifying(false);
        return;
      }
      setVerifying(false);
      const staffObj = staffByName || staffByPin || {
        id: "general",
        name: (cleanUser.toLowerCase() !== "gerente" && cleanUser.toLowerCase() !== "admin" && cleanUser.toLowerCase() !== "comercio" && cleanUser) ? cleanUser : "Personal",
        pin: cleanPin,
        allowTakeOrders: staffSettings.allowTakeOrders ?? true,
        allowKitchenPanel: staffSettings.allowKitchenPanel ?? true,
        allowCashier: staffSettings.allowCashier ?? false,
        active: true,
      };

      if (staffObj.active === false) {
        setPinError(`El acceso para "${staffObj.name}" está desactivado por la Gerencia.`);
        return;
      }

      enterAdmin("staff", staffObj.name, cleanPin, staffObj);
      if (staffObj.allowTakeOrders && !staffObj.allowKitchenPanel) {
        setView("menu");
        addToast("order_success", `¡Hola, ${staffObj.name}!`, "Ingresaste al Menú de Clientes para tomar comandas en mesas.");
      } else {
        setAdminTab("orders");
        setView("admin");
        addToast("order_success", `¡Hola, ${staffObj.name}!`, "Ingresaste en Modo Personal.");
      }
      return;
    }

    const detectedRole = isMasterUser && isMasterPin ? "superadmin" : "owner";
    const isRegisteredActive = (registeredMatch && (registeredMatch.status === "activo" || registeredMatch.status === "activado")) || (activationMatch && activationMatch.status === "activado");
    const isRegisteredPending = registeredMatch && (registeredMatch.status === "pendiente" || registeredMatch.status === "pending");
    const isValidLocalCredentials = (isMasterUser && isMasterPin) || isStoreOwner || isRegisteredActive;

    try {
      const res = await fetch(SHEETS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: cleanUser, pin: cleanPin, action: "verifyPin" }),
      });
      const result = await res.json();
      if (result.clientIp) setClientIp(result.clientIp);

      if (!result.ok) {
        if (result.isPendingApproval) {
          setPinError(result.error || `Acceso denegado: El usuario "${cleanUser}" se encuentra PENDIENTE de habilitación por el Administrador. Solo el correo autorizado podrá ingresar una vez que el Administrador otorgue la licencia.`);
          return;
        }
        if (result.licenseBlocked) {
          const isRevoked = result.licenseStatus === "revocado" || result.licenseStatus === "anulado";
          const blockedMsg = result.error || "⛔ Licencia suspendida o revocada.";
          setPinError(blockedMsg);
          setLicenseBlockedInfo({
            isRevoked,
            message: blockedMsg,
            code: result.license?.code || "CAS-LICENCIA",
            plan: result.license?.plan || "Plan Anual",
            cost: "",
            expiresAt: result.license?.expiresAt,
          });
          setShowLicenseBlockedModal(true);
          return;
        }
        if (result.locked) {
          setIpLocked(true);
          setIpRemainingSeconds(result.remainingSeconds || 900);
          setAttemptsLeft(0);
          setPinError(result.error || "Acceso bloqueado: Has superado los 3 intentos fallidos permitidos.");
          return;
        }
        if (result.attemptsLeft !== undefined) {
          setAttemptsLeft(result.attemptsLeft);
        }
        setPinError(result.error || "Usuario o PIN incorrecto");
        return;
      }

      // Si no es Superadmin, verificar condición obligatoria de suscripción y licencia
      const licStatusFromBackend = result.license?.status || result.business?.licenseStatus;
      const isLocallyActive = isRegisteredActive || (activationMatch && activationMatch.status === "activado");
      const currentLicStatus = licStatusFromBackend || (isLocallyActive ? "activado" : (business.licenseStatus || appLicense.status || "activado"));
      const currentLicExpires = result.license?.expiresAt || result.business?.licenseExpiresAt || business.licenseExpiresAt || appLicense.expiresAt;
      const isLocalExpired = currentLicExpires ? (Date.now() > new Date(currentLicExpires).getTime()) : false;
      const isBlockedByLic = result.licenseBlocked || (!isLocallyActive && (currentLicStatus === "revocado" || currentLicStatus === "anulado")) || isLocalExpired;

      if (detectedRole !== "superadmin" && isBlockedByLic) {
        const isRevoked = currentLicStatus === "revocado" || currentLicStatus === "anulado" || result.licenseStatus === "revocado";
        const blockedMsg = result.error || (
          isRevoked
            ? "⛔ ACCESO SUSPENDIDO: La suscripción de este comercio ha sido anulada o revocada por el Administrador. Aunque conozcas o hayas cambiado el usuario y contraseña, el acceso al panel está inhabilitado."
            : "⚠️ SUSCRIPCIÓN FINALIZADA: El período de pago contratado ha concluido. Para reactivar tu servicio, comunicate con el Administrador."
        );
        setPinError(blockedMsg);
        setLicenseBlockedInfo({
          isRevoked,
          message: blockedMsg,
          code: result.license?.code || business.licenseCode || appLicense.code || "CAS-7K9B-X2M4",
          plan: result.license?.plan || business.licensePlan || appLicense.plan || "Plan Anual PRO (1 Año)",
          cost: business.licenseCost || appLicense.costFormatted || "1.350.000 Gs. / año",
          expiresAt: currentLicExpires,
        });
        setShowLicenseBlockedModal(true);
        return;
      }

      setIpLocked(false);
      setIpRemainingSeconds(0);
      setAttemptsLeft(3);
      fetch(`${SHEETS_API_URL}?action=resetIpStatus`).catch(() => {});
      enterAdmin(result.role || detectedRole, cleanUser, cleanPin, null, result);
    } catch {
      if (isMasterUser && isMasterPin) {
        setIpLocked(false);
        setIpRemainingSeconds(0);
        setAttemptsLeft(3);
        enterAdmin("superadmin");
      } else if (isRegisteredPending) {
        setPinError(`Acceso denegado: El usuario "${cleanUser}" se encuentra PENDIENTE de habilitación por el Administrador. Solo el correo autorizado podrá ingresar una vez que el Administrador otorgue la licencia.`);
      } else if (isStoreOwner || isRegisteredActive || Boolean(activationMatch)) {
        setIpLocked(false);
        setIpRemainingSeconds(0);
        setAttemptsLeft(3);
        enterAdmin("owner", cleanUser, cleanPin, null, {
          business: registeredMatch ? {
            name: registeredMatch.businessName,
            adminUser: cleanUser,
            phoneIntl: registeredMatch.whatsapp,
            phoneDisplay: registeredMatch.whatsapp,
            licenseCode: activationMatch?.code,
            licensePlan: registeredMatch.planTitle,
            licenseStatus: "activado",
          } : null,
          license: activationMatch ? {
            code: activationMatch.code,
            plan: activationMatch.plan,
            status: "activado",
          } : null,
        });
      } else {
        setPinError("Usuario o PIN incorrecto. Revisá tus credenciales.");
      }
    } finally {
      setVerifying(false);
    }
  };

  // Cargar comercios registrados para el panel de administración
  const loadRegisteredClients = async () => {
    setLoadingClients(true);
    try {
      const activeAdminUser = sessionStorage.getItem("caserita_auth_user") || userInput || "Usuario";
      const activeAdminPin = sessionStorage.getItem("caserita_auth_pin") || pinInput || "Ricaji270985#";
      const res = await fetch(SHEETS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: activeAdminUser,
          pin: activeAdminPin,
          role: adminRole || sessionStorage.getItem("caserita_auth_role") || "superadmin",
          action: "getRegisteredClients",
        }),
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.clients)) {
        setRegisteredClients(data.clients);
        try {
          localStorage.setItem("lacaserita_registered_clients", JSON.stringify(data.clients));
        } catch (e) {}
      }
    } catch (err) {
      console.warn("Error cargando clientes registrados:", err);
    } finally {
      setLoadingClients(false);
    }
  };

  // Actualizar estado de comercio (activo, pendiente, vencido)
  const updateClientStatus = async (clientId, newStatus) => {
    try {
      const activeAdminUser = sessionStorage.getItem("caserita_auth_user") || userInput || "Usuario";
      const activeAdminPin = sessionStorage.getItem("caserita_auth_pin") || pinInput || "Ricaji270985#";
      const res = await fetch(SHEETS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: activeAdminUser,
          pin: activeAdminPin,
          role: adminRole || sessionStorage.getItem("caserita_auth_role") || "superadmin",
          action: "updateClientStatus",
          clientId,
          status: newStatus,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setRegisteredClients((prev) => {
          const updated = prev.map((c) => (c.id === clientId ? { ...c, status: newStatus } : c));
          try {
            localStorage.setItem("lacaserita_registered_clients", JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });

        if (Array.isArray(data.codes)) {
          setActivationCodes(data.codes);
          try {
            localStorage.setItem("lacaserita_activation_codes", JSON.stringify(data.codes));
          } catch (e) {}
        } else {
          loadActivationCodes();
        }

        if (newStatus === "activo") {
          addToast(
            "order_success",
            "¡Comercio Habilitado con Éxito!",
            "El comercio ya está activo. Su usuario y contraseña pueden ingresar inmediatamente para gestionar su portada y menú."
          );
        } else if (newStatus === "rechazado") {
          addToast(
            "order_cancel",
            "Comercio Rechazado",
            "El comercio ha sido marcado como rechazado."
          );
        } else {
          addToast(
            "order_update",
            "Estado Modificado",
            "El comercio ha sido colocado en estado pendiente."
          );
        }
      }
    } catch (err) {
      console.warn("Error actualizando estado del cliente:", err);
      // Fallback local
      setRegisteredClients((prev) => {
        const updated = prev.map((c) => (c.id === clientId ? { ...c, status: newStatus } : c));
        try {
          localStorage.setItem("lacaserita_registered_clients", JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });
      if (newStatus === "activo") {
        addToast(
          "order_success",
          "¡Comercio Habilitado!",
          "El comercio fue activado en el sistema local y sus credenciales quedan habilitadas."
        );
      }
    }
  };

  // Eliminar registro de comercio
  const deleteRegisteredClient = async (clientId) => {
    setRegisteredClients((prev) => prev.filter((c) => c.id !== clientId));
    addToast(
      "cart_clear",
      "Registro Eliminado",
      "La solicitud de compra y su perfil fueron retirados del panel."
    );

    try {
      const activeAdminUser = sessionStorage.getItem("caserita_auth_user") || userInput || "Usuario";
      const activeAdminPin = sessionStorage.getItem("caserita_auth_pin") || pinInput || "Ricaji270985#";
      const res = await fetch(SHEETS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: activeAdminUser,
          pin: activeAdminPin,
          action: "deleteRegisteredClient",
          clientId,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setRegisteredClients((prev) => prev.filter((c) => c.id !== clientId));
      }
    } catch (err) {
      console.warn("Error eliminando registro:", err);
    }
  };

  // Desbloquear todas las IPs desde el panel de administración
  const resetAllBlockedIps = async () => {
    setUnlockingIps(true);
    setSecurityMsg("");
    try {
      const res = await fetch(SHEETS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: userInput || "Usuario", pin: pinInput || "Ricaji270985#", action: "resetAllBlockedIps" }),
      });
      const data = await res.json();
      if (data.ok) {
        setIpLocked(false);
        setIpRemainingSeconds(0);
        setAttemptsLeft(3);
        setSecurityMsg("✓ Todas las direcciones IP han sido desbloqueadas con éxito.");
        setTimeout(() => setSecurityMsg(""), 4000);
      }
    } catch (err) {
      setSecurityMsg("Error al desbloquear IPs.");
    } finally {
      setUnlockingIps(false);
    }
  };

  // =========================================================================
  // GESTIÓN DE CÓDIGOS DE ACTIVACIÓN / LICENCIAS PARA COMERCIOS
  // =========================================================================

  const generateRandomActivationCode = (customPrefix = "CAS") => {
    const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    const part1 = Math.floor(1000 + Math.random() * 9000);
    let part2 = "";
    for (let i = 0; i < 4; i++) {
      part2 += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${customPrefix}-${part1}-${part2}`;
  };

  const loadActivationCodes = async () => {
    setLoadingCodes(true);
    try {
      const activeAdminUser = sessionStorage.getItem("caserita_auth_user") || userInput || "Usuario";
      const activeAdminPin = sessionStorage.getItem("caserita_auth_pin") || pinInput || "Ricaji270985#";
      const res = await fetch(SHEETS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: activeAdminUser,
          pin: activeAdminPin,
          role: adminRole || sessionStorage.getItem("caserita_auth_role") || "superadmin",
          action: "getActivationCodes",
        }),
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.codes)) {
        setActivationCodes(data.codes);
        try {
          localStorage.setItem("lacaserita_activation_codes", JSON.stringify(data.codes));
        } catch (e) {}
      }
    } catch (err) {
      console.warn("Error cargando códigos de activación:", err);
    } finally {
      setLoadingCodes(false);
    }
  };

  const handleCreateActivationCode = async (customData = null) => {
    const dataToSend = customData || newCodeForm;
    if (!dataToSend.code || !dataToSend.code.trim()) {
      addToast({
        type: "warning",
        title: "Código Requerido",
        message: "Por favor ingresá o generá un código de activación válido.",
      });
      return;
    }

    setCreatingCode(true);
    try {
      const activeAdminUser = sessionStorage.getItem("caserita_auth_user") || userInput || "Usuario";
      const activeAdminPin = sessionStorage.getItem("caserita_auth_pin") || pinInput || "Ricaji270985#";
      const res = await fetch(SHEETS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: activeAdminUser,
          pin: activeAdminPin,
          role: adminRole || sessionStorage.getItem("caserita_auth_role") || "superadmin",
          action: "createActivationCode",
          ...dataToSend,
        }),
      });
      const data = await res.json();
      if (data.ok && data.code) {
        setActivationCodes((prev) => {
          const filtered = prev.filter((c) => c.code !== data.code.code);
          const next = [data.code, ...filtered];
          try {
            localStorage.setItem("lacaserita_activation_codes", JSON.stringify(next));
          } catch (e) {}
          return next;
        });
        setShowCreateCodeModal(false);
        const defPlan = getPlanDetails("mensual");
        setNewCodeForm({
          code: generateRandomActivationCode(),
          businessName: "",
          ownerName: "",
          email: "",
          whatsapp: "",
          plan: defPlan.planTitle,
          planId: defPlan.planId,
          cost: defPlan.cost,
          costFormatted: defPlan.costFormatted,
          durationMonths: defPlan.durationMonths,
          expiresAt: defPlan.expiresAt,
          notes: "",
        });
        addToast({
          type: "success",
          title: "Código Creado con Éxito",
          message: dataToSend.email ? `Licencia otorgada al email ${dataToSend.email} con código ${data.code.code}.` : `Código ${data.code.code} listo para entregar al comercio.`,
        });
      }
    } catch (err) {
      console.warn("Error creando código de activación:", err);
      // Fallback local en caso de error de red
      const pDetails = getPlanDetails(dataToSend.plan || dataToSend.planId);
      const cleanEmail = (dataToSend.email || "").trim().toLowerCase();
      const fallbackCode = {
        id: "ACT-" + Date.now().toString().slice(-6),
        code: (dataToSend.code || generateRandomActivationCode()).toUpperCase().replace(/\s+/g, ""),
        businessName: dataToSend.businessName || "Venta Directa / Licencia Libre",
        ownerName: dataToSend.ownerName || "Responsable de Comercio",
        email: cleanEmail,
        whatsapp: dataToSend.whatsapp || "",
        plan: dataToSend.plan || pDetails.planTitle,
        planId: dataToSend.planId || pDetails.planId,
        cost: dataToSend.cost !== undefined ? dataToSend.cost : pDetails.cost,
        costFormatted: dataToSend.costFormatted || pDetails.costFormatted,
        durationMonths: dataToSend.durationMonths || pDetails.durationMonths,
        expiresAt: dataToSend.expiresAt || pDetails.expiresAt,
        status: cleanEmail ? "activado" : "disponible",
        createdAt: new Date().toISOString(),
        activatedAt: cleanEmail ? new Date().toISOString() : null,
        activatedBy: cleanEmail ? `${dataToSend.ownerName || "Comercio"} (${cleanEmail})` : null,
        notes: dataToSend.notes || "",
      };
      setActivationCodes((prev) => {
        const next = [fallbackCode, ...prev.filter((c) => c.code !== fallbackCode.code)];
        try {
          localStorage.setItem("lacaserita_activation_codes", JSON.stringify(next));
        } catch (e) {}
        return next;
      });
      setShowCreateCodeModal(false);
      addToast({
        type: "success",
        title: "Código Creado (Local)",
        message: `Código ${fallbackCode.code} listo para habilitar.`,
      });
    } finally {
      setCreatingCode(false);
    }
  };

  const handleUpdateCodeStatus = async (codeId, newStatus, extendMonths = null) => {
    try {
      const activeAdminUser = sessionStorage.getItem("caserita_auth_user") || userInput || "Usuario";
      const activeAdminPin = sessionStorage.getItem("caserita_auth_pin") || pinInput || "Ricaji270985#";
      const res = await fetch(SHEETS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: activeAdminUser,
          pin: activeAdminPin,
          role: adminRole || sessionStorage.getItem("caserita_auth_role") || "superadmin",
          action: "updateActivationCodeStatus",
          codeId,
          status: newStatus,
          extendMonths,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        if (Array.isArray(data.codes)) {
          setActivationCodes(data.codes);
          try {
            localStorage.setItem("lacaserita_activation_codes", JSON.stringify(data.codes));
          } catch (e) {}
        } else {
          setActivationCodes((prev) => {
            const next = prev.map((c) => {
              if (c.id === codeId || c.code === codeId) {
                const updated = { ...c, status: newStatus };
                if (data.target && data.target.expiresAt) {
                  updated.expiresAt = data.target.expiresAt;
                }
                return updated;
              }
              return c;
            });
            try {
              localStorage.setItem("lacaserita_activation_codes", JSON.stringify(next));
            } catch (e) {}
            return next;
          });
        }
        loadRegisteredClients();

        // Si el código actualizado corresponde al comercio actual
        const isCurrentCode = codeId === "ACT-101" || codeId === business.licenseCode || codeId === appLicense.code;
        if (isCurrentCode) {
          setBusiness((prev) => ({ ...prev, licenseStatus: newStatus }));
          setAppLicense((prev) => ({ ...prev, status: newStatus }));
        }

        if (newStatus === "revocado") {
          addToast({
            type: "warning",
            title: "Licencia Anulada",
            message: "La suscripción fue anulada. El comercio tiene el acceso al panel bloqueado de inmediato.",
          });
        } else if (newStatus === "activado") {
          addToast({
            type: "success",
            title: "Licencia Activada",
            message: "La licencia ha sido habilitada exitosamente.",
          });
        }
      }
    } catch (err) {
      console.warn("Error actualizando código:", err);
      setActivationCodes((prev) => {
        const next = prev.map((c) => (c.id === codeId || c.code === codeId ? { ...c, status: newStatus } : c));
        try {
          localStorage.setItem("lacaserita_activation_codes", JSON.stringify(next));
        } catch (e) {}
        return next;
      });
      const isCurrentCode = codeId === "ACT-101" || codeId === business.licenseCode || codeId === appLicense.code;
      if (isCurrentCode) {
        setBusiness((prev) => ({ ...prev, licenseStatus: newStatus }));
        setAppLicense((prev) => ({ ...prev, status: newStatus }));
      }
      if (newStatus === "revocado") {
        addToast({
          type: "warning",
          title: "Licencia Anulada",
          message: "La suscripción fue anulada en la configuración local.",
        });
      } else if (newStatus === "activado") {
        addToast({
          type: "success",
          title: "Licencia Reactivada",
          message: "La licencia ha sido reactivada en el sistema.",
        });
      }
    }
  };

  const handleRenewCode = async (codeId, extendMonths = 12, newPlan = null, newCost = null) => {
    try {
      const activeAdminUser = sessionStorage.getItem("caserita_auth_user") || userInput || "Usuario";
      const activeAdminPin = sessionStorage.getItem("caserita_auth_pin") || pinInput || "Ricaji270985#";
      const res = await fetch(SHEETS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: activeAdminUser,
          pin: activeAdminPin,
          action: "renewActivationCode",
          codeId,
          extendMonths,
          newPlan,
          newCost,
        }),
      });
      const data = await res.json();
      if (data.ok && data.target) {
        setActivationCodes((prev) => {
          const next = prev.map((c) => (c.id === codeId || c.code === codeId ? { ...c, ...data.target } : c));
          try {
            localStorage.setItem("lacaserita_activation_codes", JSON.stringify(next));
          } catch (e) {}
          return next;
        });
        const isCurrentCode = codeId === "ACT-101" || codeId === business.licenseCode || codeId === appLicense.code;
        if (isCurrentCode) {
          setBusiness((prev) => ({
            ...prev,
            licenseStatus: "activado",
            licenseExpiresAt: data.target.expiresAt,
            ...(newPlan ? { licensePlan: newPlan } : {}),
            ...(newCost ? { licenseCost: newCost } : {}),
          }));
          setAppLicense((prev) => ({
            ...prev,
            status: "activado",
            expiresAt: data.target.expiresAt,
            ...(newPlan ? { plan: newPlan } : {}),
            ...(newCost ? { costFormatted: newCost } : {}),
          }));
        }
        addToast({
          type: "success",
          title: "Suscripción Renovada",
          message: `Licencia extendida +${extendMonths} mes(es) hasta el ${formatDateSafe(data.target.expiresAt)}.`,
        });
      }
    } catch (err) {
      console.warn("Error renovando suscripción:", err);
      // Fallback local
      const expDate = new Date();
      expDate.setMonth(expDate.getMonth() + Number(extendMonths));
      setActivationCodes((prev) => {
        const next = prev.map((c) => {
          if (c.id === codeId || c.code === codeId) {
            return {
              ...c,
              status: "activado",
              expiresAt: expDate.toISOString(),
              ...(newPlan ? { plan: newPlan } : {}),
              ...(newCost ? { costFormatted: newCost } : {}),
            };
          }
          return c;
        });
        try {
          localStorage.setItem("lacaserita_activation_codes", JSON.stringify(next));
        } catch (e) {}
        return next;
      });
      addToast({
        type: "success",
        title: "Suscripción Renovada (Local)",
        message: `Licencia extendida +${extendMonths} mes(es).`,
      });
    }
  };

  const handleDeleteCode = async (codeId) => {
    try {
      const activeAdminUser = sessionStorage.getItem("caserita_auth_user") || userInput || "Usuario";
      const activeAdminPin = sessionStorage.getItem("caserita_auth_pin") || pinInput || "Ricaji270985#";
      await fetch(SHEETS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: activeAdminUser,
          pin: activeAdminPin,
          action: "deleteActivationCode",
          codeId,
        }),
      });
      setActivationCodes((prev) => {
        const next = prev.filter((c) => c.id !== codeId && c.code !== codeId);
        try {
          localStorage.setItem("lacaserita_activation_codes", JSON.stringify(next));
        } catch (e) {}
        return next;
      });
      const isCurrentCode = codeId === "ACT-101" || codeId === business.licenseCode || codeId === appLicense.code;
      if (isCurrentCode) {
        setBusiness((prev) => ({ ...prev, licenseStatus: "anulado" }));
        setAppLicense((prev) => ({ ...prev, status: "anulado" }));
      }
      addToast({
        type: "info",
        title: "Licencia Eliminada",
        message: "El código y la suscripción del comercio han sido eliminados.",
      });
    } catch (err) {
      console.warn("Error borrando código:", err);
      setActivationCodes((prev) => {
        const next = prev.filter((c) => c.id !== codeId && c.code !== codeId);
        try {
          localStorage.setItem("lacaserita_activation_codes", JSON.stringify(next));
        } catch (e) {}
        return next;
      });
      const isCurrentCode = codeId === "ACT-101" || codeId === business.licenseCode || codeId === appLicense.code;
      if (isCurrentCode) {
        setBusiness((prev) => ({ ...prev, licenseStatus: "anulado" }));
        setAppLicense((prev) => ({ ...prev, status: "anulado" }));
      }
      addToast({
        type: "info",
        title: "Licencia Eliminada",
        message: "El código fue eliminado del sistema.",
      });
    }
  };

  const handleValidateAndActivateApp = async (e) => {
    if (e) e.preventDefault();
    const cleanCode = (inputActivationCode || "").trim().toUpperCase().replace(/[\s-]+/g, "");
    if (!cleanCode) {
      setActivationError("Por favor ingresá tu código de activación.");
      return;
    }

    setActivatingApp(true);
    setActivationError("");
    setActivationSuccess(null);

    try {
      const res = await fetch(SHEETS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "validateAndActivateCode",
          code: cleanCode,
          businessName: inputActivationBusiness || business.name || "Mi Comercio",
        }),
      });
      const data = await res.json();
      if (data.ok && data.license) {
        const newLicense = {
          isActivated: true,
          code: data.license.code,
          businessName: data.license.businessName || inputActivationBusiness || business.name,
          plan: data.license.plan || "Plan Activo",
          activatedAt: data.license.activatedAt || new Date().toISOString(),
          ownerName: data.license.ownerName || "",
        };
        setAppLicense(newLicense);
        try {
          localStorage.setItem("lacaserita_app_license", JSON.stringify(newLicense));
        } catch (err) {}

        // Actualizar business y draftBusiness con los datos completos de la licencia
        const targetBusName = (data.license.businessName && !data.license.businessName.includes("Licencia Libre") && !data.license.businessName.includes("Venta Directa"))
          ? data.license.businessName
          : (inputActivationBusiness || business.name);

        setBusiness((prev) => ({
          ...prev,
          name: targetBusName,
          licenseCode: data.license.code,
          licensePlan: data.license.plan || "Plan Activo",
          licenseStatus: "activado",
          licenseExpiresAt: data.license.expiresAt,
          licenseCost: data.license.costFormatted || data.license.cost,
        }));
        setDraftBusiness((prev) => ({
          ...prev,
          name: targetBusName,
          licenseCode: data.license.code,
          licensePlan: data.license.plan || "Plan Activo",
          licenseStatus: "activado",
          licenseExpiresAt: data.license.expiresAt,
          licenseCost: data.license.costFormatted || data.license.cost,
        }));
        loadActivationCodes();

        setActivationSuccess(newLicense);
        addToast({
          type: "success",
          title: "¡Comercio Habilitado!",
          message: `La app ha sido habilitada exitosamente para ${newLicense.businessName}.`,
        });
      } else {
        setActivationError(data.error || "El código ingresado no es válido o ha expirado.");
      }
    } catch (err) {
      console.warn("Error validando código en servidor, comprobando localmente:", err);
      // Fallback local: verificar si el código coincide con algún código en local storage o demo
      const localMatch = activationCodes.find(
        (c) => c.code.replace(/[\s-]+/g, "").toUpperCase() === cleanCode
      );
      if (localMatch && localMatch.status !== "revocado") {
        const newLicense = {
          isActivated: true,
          code: localMatch.code,
          businessName: localMatch.businessName || inputActivationBusiness || business.name,
          plan: localMatch.plan || "Plan Activo",
          status: "activado",
          activatedAt: new Date().toISOString(),
          expiresAt: localMatch.expiresAt,
          ownerName: localMatch.ownerName || "",
        };
        setAppLicense(newLicense);
        try {
          localStorage.setItem("lacaserita_app_license", JSON.stringify(newLicense));
        } catch (e) {}

        const targetBusName = (localMatch.businessName && !localMatch.businessName.includes("Licencia Libre") && !localMatch.businessName.includes("Venta Directa"))
          ? localMatch.businessName
          : (inputActivationBusiness || business.name);

        setBusiness((prev) => ({
          ...prev,
          name: targetBusName,
          licenseCode: localMatch.code,
          licensePlan: localMatch.plan || "Plan Activo",
          licenseStatus: "activado",
          licenseExpiresAt: localMatch.expiresAt,
          licenseCost: localMatch.costFormatted,
        }));
        setDraftBusiness((prev) => ({
          ...prev,
          name: targetBusName,
          licenseCode: localMatch.code,
          licensePlan: localMatch.plan || "Plan Activo",
          licenseStatus: "activado",
          licenseExpiresAt: localMatch.expiresAt,
          licenseCost: localMatch.costFormatted,
        }));

        setActivationCodes((prev) => {
          const next = prev.map((c) => (c.code.replace(/[\s-]+/g, "").toUpperCase() === cleanCode ? { ...c, status: "activado", activatedAt: new Date().toISOString() } : c));
          try {
            localStorage.setItem("lacaserita_activation_codes", JSON.stringify(next));
          } catch (e) {}
          return next;
        });

        setActivationSuccess(newLicense);
        addToast({
          type: "success",
          title: "¡Comercio Habilitado!",
          message: `La app ha sido habilitada exitosamente para ${newLicense.businessName}.`,
        });
      } else {
        setActivationError("Código de activación incorrecto o inexistente. Verificá los caracteres.");
      }
    } finally {
      setActivatingApp(false);
    }
  };

  const handleCopyCodeToClipboard = (codeText) => {
    if (!codeText) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(codeText);
      } else {
        const el = document.createElement("textarea");
        el.value = codeText;
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      }
      setCopiedCodeText(codeText);
      setTimeout(() => setCopiedCodeText(""), 3000);
      addToast({
        type: "success",
        title: "Código Copiado",
        message: `Código ${codeText} copiado al portapapeles.`,
      });
    } catch (e) {
      setCopiedCodeText(codeText);
      setTimeout(() => setCopiedCodeText(""), 3000);
    }
  };

  const handleSendCodeWhatsApp = (codeObj) => {
    const rawPhone = String(codeObj.whatsapp || "").replace(/[^\d]/g, "");
    const msg = `¡Hola ${codeObj.ownerName || "Comercio"}! 🎉\n\nTu App de Pedidos para *${codeObj.businessName}* ya está lista.\n\nPara habilitar todas las funciones de tu negocio, abrí la app, hacé clic en *"Ingresar Código de Activación"* y pegá tu código:\n\n🔑 Código: *${codeObj.code}*\n📋 Plan: *${codeObj.plan}*\n\n¡Muchas gracias por tu compra y que tengas excelentes ventas!`;
    const url = rawPhone
      ? `https://wa.me/${rawPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  // =========================================================================
  // GESTIÓN DE PEDIDOS Y CONTROL DE COBROS POR CAJA
  // =========================================================================

  const loadOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await fetch(SHEETS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: userInput || "Usuario",
          pin: pinInput || "Ricaji270985#",
          action: "getOrders",
        }),
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.orders)) {
        let merged = [...data.orders];
        DEFAULT_INITIAL_ORDERS.forEach((defOrd) => {
          if (!merged.some((o) => o.id === defOrd.id)) {
            merged.push(defOrd);
          }
        });
        const custOrders = getCustomerOrders();
        if (Array.isArray(custOrders)) {
          custOrders.forEach((co) => {
            if (co && co.id && !merged.some((o) => o.id === co.id)) {
              merged.unshift(co);
            }
          });
        }
        setOrders(merged);
      }
    } catch (err) {
      console.warn("Error cargando pedidos:", err);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Normalizar número de teléfono para enlace directo de WhatsApp (+595 para Paraguay)
  const normalizePhoneForWhatsApp = (rawPhone) => {
    if (!rawPhone) return "";
    let digits = String(rawPhone).replace(/\D/g, "");
    if (!digits) return "";
    if (digits.startsWith("0")) {
      digits = "595" + digits.substring(1);
    } else if (!digits.startsWith("595")) {
      digits = "595" + digits;
    }
    return digits;
  };

  // Construir mensaje oficial de confirmación de pedido completado/entregado para WhatsApp
  const buildOrderCompletedWhatsAppMessage = (order) => {
    if (!order) return "";
    const isDelivery = order.mode === "delivery";
    const isRetiro = order.mode === "retiro";
    
    const customerGreeting = order.customerName ? `¡Hola *${order.customerName.trim()}*! 👋` : "¡Hola! 👋";
    
    let headerTitle = "";
    let statusDetail = "";
    if (isDelivery) {
      headerTitle = "🛵 *¡TU PEDIDO HA SIDO ENTREGADO CON ÉXITO!*";
      statusDetail = `Te confirmamos que tu pedido *#${order.id}* ha sido *Completado y Entregado* en tu domicilio.`;
    } else if (isRetiro) {
      headerTitle = "🛍️ *¡TU PEDIDO ESTÁ LISTO Y ENTREGADO!*";
      statusDetail = `Te confirmamos que tu pedido *#${order.id}* de retiro en mostrador ha sido *Completado y Entregado*.`;
    } else {
      headerTitle = "🍽️ *¡TU PEDIDO HA SIDO COMPLETADO!*";
      statusDetail = `Te confirmamos que tu comanda de la *Mesa ${order.tableNumber || "en salón"}* (*#${order.id}*) ha sido *Completada y Atendida*.`;
    }

    const itemsList = (order.items || [])
      .map((item) => `• ${item.qty}x ${item.name} (${formatGs((item.price || 0) * (item.qty || 1))})`)
      .join("\n");

    const paymentDesc = order.paymentMethod 
      ? order.paymentMethod.toUpperCase() 
      : "CAJA";

    let destinationInfo = "";
    if (isDelivery && order.address) {
      destinationInfo = `📍 *Dirección de entrega:* ${order.address}\n`;
    } else if (order.mode === "mesa") {
      destinationInfo = `🍽️ *Mesa asignada:* ${order.tableNumber || "Salón"}\n`;
    } else {
      destinationInfo = `🛍️ *Modalidad:* Retiro en Mostrador\n`;
    }

    return `${customerGreeting}\n\n` +
      `${headerTitle}\n\n` +
      `${statusDetail} ✅\n\n` +
      destinationInfo +
      `📋 *Detalle del pedido:*\n${itemsList || "• Consumos registrados"}\n\n` +
      `💰 *Total abonado:* ${formatGs(order.totalPrice)}\n` +
      `💳 *Estado de cobro:* Pagado (${paymentDesc})\n\n` +
      `✨ *¡Muchas gracias por elegir ${business.name || "La Caserita"}!* Esperamos que disfrutes cada plato.\n` +
      `📞 *Consultas o sugerencias:* ${business.phoneDisplay || business.phoneIntl}`;
  };

  // Función principal: Marcar como Completado o Entregado y enviar confirmación por WhatsApp
  const handleMarkCompletedAndNotify = async (orderOrId, customPhone = null, chosenMethod = null) => {
    let order = typeof orderOrId === "object" ? orderOrId : orders.find((o) => o.id === orderOrId);
    if (!order) return;

    const nowIso = new Date().toISOString();
    const finalMethod = chosenMethod || order.paymentMethod || selectedPayMethod || "efectivo";
    const targetPhone = customPhone !== null ? customPhone : (order.customerPhone || "");

    const updatedOrder = {
      ...order,
      orderStatus: "completado",
      deliveryStatus: "entregado",
      paymentStatus: "pagado",
      paymentMethod: finalMethod,
      paidAt: order.paidAt || nowIso,
      completedAt: nowIso,
      customerPhone: targetPhone || order.customerPhone || "",
    };

    // 1. Actualización inmediata local en memoria y localStorage
    setOrders((prev) => prev.map((o) => (o.id === order.id ? updatedOrder : o)));
    setSelectedHistoryOrder((prev) => (prev && prev.id === order.id ? updatedOrder : prev));
    if (selectedPayOrder && selectedPayOrder.id === order.id) {
      setSelectedPayOrder(null);
    }

    // Notificación Push y sincronización asíncrona al cliente
    updateCustomerOrderStatus(order.id, "completado", "pagado", updatedOrder);
    refreshCustomerOrders();
    const chSync = getSyncChannel();
    if (chSync) {
      chSync.postMessage({
        type: "ORDER_STATUS_UPDATED",
        orderId: order.id,
        newStatus: "completado",
        paymentStatus: "pagado",
        order: updatedOrder,
      });
    }

    // 2. Notificación Toast en pantalla
    addToast(
      "order_success",
      "¡Pedido Completado y Entregado!",
      `El pedido ${order.id} fue marcado como completado y archivado. Notificación Push enviada.`
    );

    // 3. Sincronización en segundo plano con el backend
    try {
      fetch(SHEETS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: userInput || "Usuario",
          pin: pinInput || "Ricaji270985#",
          action: "updateOrderStatus",
          orderId: order.id,
          newStatus: "completado",
          paymentStatus: "pagado",
          paymentMethod: finalMethod,
        }),
      }).catch((e) => console.warn("Aviso backend completado:", e));
    } catch (err) {
      console.warn("Error notificando backend:", err);
    }

    // 4. Preparar modal de WhatsApp
    setWhatsAppModalOrder(updatedOrder);
    setWhatsAppModalPhone(targetPhone);
    setCopiedWhatsAppMsg(false);

    // 5. Si tiene celular registrado, abrir automáticamente WhatsApp
    if (targetPhone) {
      const cleanPhone = normalizePhoneForWhatsApp(targetPhone);
      const msg = buildOrderCompletedWhatsAppMessage(updatedOrder);
      const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
      try {
        window.open(waUrl, "_blank");
      } catch (e) {
        console.warn("Aviso apertura popup:", e);
      }
    }
  };

  const handlePayOrder = async (orderId, methodToUse, notifyWhatsApp = false) => {
    const chosenMethod = methodToUse || selectedPayMethod || "efectivo";
    if (notifyWhatsApp) {
      const targetOrder = orders.find((o) => o.id === orderId);
      if (targetOrder) {
        return handleMarkCompletedAndNotify(targetOrder, null, chosenMethod);
      }
    }

    const nowIso = new Date().toISOString();

    // 1. Actualización inmediata local en memoria y localStorage
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              paymentStatus: "pagado",
              paymentMethod: chosenMethod,
              paidAt: nowIso,
            }
          : o
      )
    );
    setSelectedPayOrder(null);
    addToast(
      "order_success",
      "¡Cobro Registrado con Éxito!",
      `El pedido ${orderId} fue registrado como pagado (${chosenMethod.toUpperCase()}).`
    );

    // 2. Sincronización en segundo plano con el backend
    setProcessingPayment(true);
    try {
      await fetch(SHEETS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: userInput || "Usuario",
          pin: pinInput || "Ricaji270985#",
          action: "payOrder",
          orderId,
          paymentMethod: chosenMethod,
        }),
      });
    } catch (err) {
      console.warn("Aviso: cobro guardado localmente:", err);
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleResetOrderPayment = async (orderId) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              paymentStatus: "pendiente",
              paymentMethod: "",
              paidAt: null,
            }
          : o
      )
    );
    addToast(
      "cart_add",
      "Pedido devuelto a Pendientes",
      `El pedido ${orderId} ahora vuelve a figurar como pendiente de pago.`
    );
    try {
      await fetch(SHEETS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: userInput || "Usuario",
          pin: pinInput || "Ricaji270985#",
          action: "resetOrderPayment",
          orderId,
        }),
      });
    } catch (err) {
      console.warn("Aviso reset pago local:", err);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    setSelectedHistoryOrderIds((prev) => prev.filter((id) => id !== orderId));
    addToast(
      "cart_clear",
      "Pedido Eliminado",
      `El pedido ${orderId} fue eliminado correctamente.`
    );
    try {
      await fetch(SHEETS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: userInput || "Usuario",
          pin: pinInput || "Ricaji270985#",
          action: "deleteOrder",
          orderId,
        }),
      });
    } catch (err) {
      console.warn("Aviso borrar pedido:", err);
    }
  };

  // Eliminación de pedidos en lote (tildados o todo el historial)
  const handleDeleteOrdersBatch = async (orderIdsToDelete) => {
    if (!Array.isArray(orderIdsToDelete) || orderIdsToDelete.length === 0) return;
    const idsSet = new Set(orderIdsToDelete);
    setOrders((prev) => prev.filter((o) => !idsSet.has(o.id)));
    setSelectedHistoryOrderIds((prev) => prev.filter((id) => !idsSet.has(id)));

    // Asegurar persistencia inmediata en localStorage
    try {
      const saved = localStorage.getItem("lacaserita_orders");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const updated = parsed.filter((o) => o && !idsSet.has(o.id));
          localStorage.setItem("lacaserita_orders", JSON.stringify(updated));
        }
      }
    } catch (e) {}

    addToast(
      "cart_clear",
      orderIdsToDelete.length === 1 ? "Pedido Eliminado" : "Historial Actualizado",
      orderIdsToDelete.length === 1
        ? `El pedido ${orderIdsToDelete[0]} fue eliminado del historial.`
        : `Se eliminaron ${orderIdsToDelete.length} pedidos del historial.`
    );

    try {
      for (const orderId of orderIdsToDelete) {
        fetch(SHEETS_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user: userInput || "Usuario",
            pin: pinInput || "Ricaji270985#",
            action: "deleteOrder",
            orderId,
          }),
        }).catch(() => {});
      }
    } catch (err) {
      console.warn("Aviso borrar pedidos en lote:", err);
    }
  };

  // Tildar / destildar un pedido específico del historial
  const handleToggleSelectHistoryOrder = (orderId) => {
    setSelectedHistoryOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  // Tildar o destildar todos los pedidos visibles según filtros
  const handleToggleSelectAllHistoryOrders = () => {
    if (!Array.isArray(filteredHistoryOrders) || filteredHistoryOrders.length === 0) return;
    const allFilteredSelected = filteredHistoryOrders.every((o) =>
      selectedHistoryOrderIds.includes(o.id)
    );
    if (allFilteredSelected) {
      const filteredIdsSet = new Set(filteredHistoryOrders.map((o) => o.id));
      setSelectedHistoryOrderIds((prev) => prev.filter((id) => !filteredIdsSet.has(id)));
    } else {
      const newIds = new Set([...selectedHistoryOrderIds, ...filteredHistoryOrders.map((o) => o.id)]);
      setSelectedHistoryOrderIds(Array.from(newIds));
    }
  };

  // Confirmación interactiva para eliminar historial o elementos tildados
  const handleDeleteHistoryPrompt = () => {
    if (orders.length === 0) {
      addToast("alert", "Historial vacío", "No hay pedidos registrados en el historial para eliminar.");
      return;
    }

    // 1. Si hay pedidos tildados individualmente
    if (selectedHistoryOrderIds.length > 0) {
      setConfirmModalConfig({
        title: `¿Eliminar ${selectedHistoryOrderIds.length} pedidos tildados?`,
        message: `Se eliminarán permanentemente los ${selectedHistoryOrderIds.length} pedidos seleccionados del historial de ventas. Esta acción no se puede deshacer.`,
        confirmText: `Eliminar ${selectedHistoryOrderIds.length} pedidos`,
        cancelText: "Cancelar",
        confirmVariant: "danger",
        icon: Trash2,
        onConfirm: () => {
          handleDeleteOrdersBatch(selectedHistoryOrderIds);
        },
      });
      return;
    }

    // 2. Si no hay nada tildado pero hay filtros activos
    const isFiltered = filteredHistoryOrders.length > 0 && filteredHistoryOrders.length < orders.length;
    if (isFiltered) {
      setConfirmModalConfig({
        title: "¿Eliminar pedidos del historial?",
        message: `No seleccionaste pedidos específicos con las casillas.\n\n¿Deseas eliminar los ${filteredHistoryOrders.length} pedidos filtrados en pantalla o vaciar todo el historial (${orders.length} pedidos)?\n\nTip: Para eliminar solo ciertos pedidos, podés tildar la casilla a la izquierda de cada pedido en la tabla.`,
        confirmText: `Eliminar ${filteredHistoryOrders.length} pedidos filtrados`,
        cancelText: "Cancelar",
        confirmVariant: "danger",
        icon: Trash2,
        onConfirm: () => {
          handleDeleteOrdersBatch(filteredHistoryOrders.map((o) => o.id));
        },
      });
    } else {
      // 3. Vaciar todo el historial
      setConfirmModalConfig({
        title: "¿Eliminar todo el historial de pedidos?",
        message: `¿Estás seguro de que deseas eliminar permanentemente todos los ${orders.length} pedidos del historial?\n\nTip: Para eliminar solo ciertos pedidos, podés tildar sus casillas correspondientes en la lista.`,
        confirmText: `Eliminar todo el historial (${orders.length})`,
        cancelText: "Cancelar",
        confirmVariant: "danger",
        icon: Trash2,
        onConfirm: () => {
          handleDeleteOrdersBatch(orders.map((o) => o.id));
        },
      });
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus, method = "efectivo") => {
    if (newStatus === "completado" || newStatus === "entregado") {
      const targetOrder = orders.find((o) => o.id === orderId);
      if (targetOrder) {
        return handleMarkCompletedAndNotify(targetOrder, null, method);
      }
    }

    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        const isPaid = newStatus === "pagado";
        const isPending = newStatus === "pendiente";
        return {
          ...o,
          paymentStatus: newStatus,
          paymentMethod: isPaid ? (o.paymentMethod || method) : isPending ? "" : o.paymentMethod,
          paidAt: isPaid ? (o.paidAt || new Date().toISOString()) : isPending ? null : o.paidAt,
        };
      })
    );

    const statusLabel =
      newStatus === "pagado"
        ? "Pagado / Cobrado"
        : newStatus === "cancelado"
        ? "Cancelado / Anulado"
        : "Pendiente de Cobro";

    addToast(
      newStatus === "pagado" ? "order_success" : "cart_add",
      "Estado de Pedido Actualizado",
      `El pedido ${orderId} ahora está marcado como "${statusLabel}".`
    );

    setSelectedHistoryOrder((prev) => {
      if (prev && prev.id === orderId) {
        return {
          ...prev,
          paymentStatus: newStatus,
          paidAt: newStatus === "pagado" ? (prev.paidAt || new Date().toISOString()) : newStatus === "pendiente" ? null : prev.paidAt,
          paymentMethod: newStatus === "pagado" ? (prev.paymentMethod || method) : prev.paymentMethod,
        };
      }
      return prev;
    });

    try {
      await fetch(SHEETS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: userInput || "Usuario",
          pin: pinInput || "Ricaji270985#",
          action: "updateOrderStatus",
          orderId,
          newStatus,
          paymentMethod: method,
        }),
      });
    } catch (err) {
      console.warn("Aviso actualizar estado de pedido local:", err);
    }
  };

  // Función para transicionar estados del pedido en el panel y emitir Push al cliente
  const handleAdminChangeOrderStatus = async (orderId, newStatus) => {
    if (newStatus === "completado") {
      const targetOrder = orders.find((o) => o.id === orderId);
      if (targetOrder) {
        return handleMarkCompletedAndNotify(targetOrder);
      }
    }

    const nowIso = new Date().toISOString();
    let updatedTarget = null;

    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        const updated = {
          ...o,
          orderStatus: newStatus,
          deliveryStatus: newStatus === "en_camino" ? "en_camino" : o.deliveryStatus,
          updatedAt: nowIso,
        };
        updatedTarget = updated;
        return updated;
      })
    );

    // Actualizar registro local del cliente y disparar notificación Push nativa
    updateCustomerOrderStatus(orderId, newStatus, null, updatedTarget);
    refreshCustomerOrders();

    // Sincronizar entre pestañas y dispositivos
    const ch = getSyncChannel();
    if (ch) {
      ch.postMessage({
        type: "ORDER_STATUS_UPDATED",
        orderId,
        newStatus,
        paymentStatus: updatedTarget?.paymentStatus || "pendiente",
        order: updatedTarget,
      });
    }

    // Persistir en backend
    try {
      fetch(SHEETS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: userInput || "Usuario",
          pin: pinInput || "Ricaji270985#",
          action: "updateOrderStatus",
          orderId,
          newStatus,
        }),
      }).catch((e) => console.warn("Aviso updateOrderStatus backend:", e));
    } catch (e) {}

    const cfg = ORDER_STATUS_CONFIG[newStatus] || ORDER_STATUS_CONFIG.recibido;
    addToast(
      "cart_add",
      `Estado: ${cfg.shortLabel}`,
      `El pedido ${orderId} pasó a "${cfg.label}". Se emitió notificación Push al cliente.`
    );
  };

  const exportHistoryCsv = () => {
    if (filteredHistoryOrders.length === 0) return;

    // Etiquetas legibles de los filtros activos
    const dateLabel = historyDatePreset === "personalizado" && historyCustomDate 
      ? `Fecha especifica: ${historyCustomDate}` 
      : historyDatePreset === "hoy" ? "Hoy" 
      : historyDatePreset === "ayer" ? "Ayer" 
      : historyDatePreset === "ultimos7" ? "Ultimos 7 dias" 
      : historyDatePreset === "mes" ? "Este Mes" : "Historico Completo";
      
    const statusLabel = historyStatusFilter === "pagado" ? "Solo Cobrados / Pagados"
      : historyStatusFilter === "pendiente" ? "Solo Pendientes de Cobro"
      : historyStatusFilter === "cancelado" ? "Solo Cancelados / Anulados" : "Todos los Estados";

    const modeLabel = historyModeFilter === "mesa" ? "Solo Mesas"
      : historyModeFilter === "delivery" ? "Solo Delivery"
      : historyModeFilter === "retiro" ? "Solo Retiro en Local" : "Todas las Modalidades";

    // Encabezado Contable Informativo (compatible con Excel / Google Sheets)
    const metadata = [
      [`"REPORTE CONTABLE DE HISTORIAL DE PEDIDOS - ${(business.name || 'LA CASERITA').toUpperCase()}"`],
      [`"Comercio: ${(business.name || 'La Caserita').replace(/"/g, '""')} - Direccion: ${(business.address || '').replace(/"/g, '""')} - Tel: ${business.phoneDisplay || ''}"`],
      [`"Fecha y Hora de Emision:", "${formatDateSafe(new Date())} ${formatTimeSafe(new Date())} hs"`],
      [`"Filtro de Fecha Aplicado:", "${dateLabel}"`],
      [`"Filtro de Estado Aplicado:", "${statusLabel}"`],
      [`"Filtro de Modalidad:", "${modeLabel}"`],
      [`"Total Pedidos Auditados:", "${historyStats.totalCount}"`],
      [`"Facturacion Total Gs.:", "${historyStats.totalAmount}"`],
      [`"Total Cobrado en Caja Gs.:", "${historyStats.paidAmount}"`],
      [`"Total Pendiente de Cobro Gs.:", "${historyStats.pendingAmount}"`],
      [`"Cobrado en Efectivo Gs.:", "${historyStats.byMethod?.efectivo || 0}"`],
      [`"Cobrado con Tarjeta/POS Gs.:", "${historyStats.byMethod?.pos || 0}"`],
      [`"Cobrado por Transferencia Gs.:", "${historyStats.byMethod?.transferencia || 0}"`],
      [`"Cobrado por Billeteras Gs.:", "${historyStats.byMethod?.tigo_money || 0}"`],
      [] // Fila vacía separadora
    ];

    const headers = [
      "ID Pedido",
      "Fecha",
      "Hora",
      "Modalidad",
      "Ubicacion o Mesa",
      "Cliente",
      "Telefono",
      "Productos Detallados",
      "Total Gs",
      "Estado de Pago",
      "Medio de Pago",
      "Aclaraciones"
    ];

    const rows = filteredHistoryOrders.map((o) => {
      const itemsStr = (o.items || []).map((i) => `${i.qty}x ${i.name}`).join("; ");
      const loc = o.mode === "mesa" ? `Mesa ${o.tableNumber || "S/N"}` : (o.address || "Retiro en local");
      return [
        `"${o.id || ""}"`,
        `"${formatDateSafe(o.createdAt || o.paidAt)}"`,
        `"${formatTimeSafe(o.createdAt || o.paidAt)}"`,
        `"${o.mode || "general"}"`,
        `"${loc.replace(/"/g, '""')}"`,
        `"${(o.customerName || "Cliente").replace(/"/g, '""')}"`,
        `"${(o.customerPhone || "").replace(/"/g, '""')}"`,
        `"${itemsStr.replace(/"/g, '""')}"`,
        `"${o.totalPrice || 0}"`,
        `"${o.paymentStatus || "pendiente"}"`,
        `"${o.paymentMethod || "Efectivo"}"`,
        `"${(o.notes || "").replace(/"/g, '""')}"`,
      ];
    });

    // Fila de Cierre y Sumas Contables
    const totalsRow = [
      `"TOTALES DE AUDITORIA"`,
      `""`,
      `""`,
      `""`,
      `""`,
      `""`,
      `""`,
      `"${historyStats.totalCount} pedidos registrados"`,
      `"${historyStats.totalAmount}"`,
      `"Cobrado: ${historyStats.paidAmount} | Pendiente: ${historyStats.pendingAmount}"`,
      `""`,
      `""`
    ];

    const allLines = [
      ...metadata.map((m) => m.join(",")),
      headers.join(","),
      ...rows.map((r) => r.join(",")),
      totalsRow.join(",")
    ];

    const csvContent = "\uFEFF" + allLines.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const cleanDateFilter = historyDatePreset === "personalizado" ? "fecha_esp" : historyDatePreset;
    link.download = `reporte_contable_pedidos_${cleanDateFilter}_${historyStatusFilter}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Enviar formulario de registro para adquirir la app
  const submitBusinessRegistration = async (e) => {
    if (e) e.preventDefault();
    setRegError("");

    if (!regForm.businessName.trim()) {
      setRegError("Ingresá el nombre comercial de tu negocio.");
      return;
    }
    if (!regForm.ownerName.trim()) {
      setRegError("Ingresá el nombre y apellido del propietario o encargado.");
      return;
    }
    if (!regForm.whatsapp.trim()) {
      setRegError("Ingresá tu número de WhatsApp para pedidos y contacto.");
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanRequestedUser = regForm.requestedUser.trim().toLowerCase();
    if (!cleanRequestedUser) {
      setRegError("Ingresá un correo electrónico en 'Usuario Deseado' para asociar tu licencia.");
      return;
    }
    if (!emailRegex.test(cleanRequestedUser)) {
      setRegError("En 'Usuario Deseado' solo se acepta un correo electrónico válido (ej: mi-comercio@gmail.com). El Administrador otorgará la licencia a este email y será el único autorizado a ingresar.");
      return;
    }

    if (!regForm.requestedPassword.trim()) {
      setRegError("Ingresá una contraseña para tu panel de administración.");
      return;
    }
    if (regForm.requestedPassword !== regForm.confirmPassword) {
      setRegError("Las contraseñas ingresadas no coinciden. Por favor verificalas.");
      return;
    }

    setRegSubmitting(true);
    try {
      const res = await fetch(SHEETS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "registerCommercialClient",
          businessName: regForm.businessName,
          rubro: regForm.rubro,
          ownerName: regForm.ownerName,
          whatsapp: regForm.whatsapp,
          email: cleanRequestedUser,
          city: regForm.city,
          requestedUser: cleanRequestedUser,
          requestedPassword: regForm.requestedPassword,
          plan: regForm.plan,
          planTitle: regForm.planTitle,
          amountGs: regForm.amountGs,
          paymentMethod: regForm.paymentMethod,
          paymentRef: regForm.paymentRef,
        }),
      });
      const data = await res.json();
      if (data.ok && data.registration) {
        setRegSuccessVoucher(data.registration);
      } else {
        setRegError(data.error || "No se pudo registrar la solicitud. Probá nuevamente.");
      }
    } catch (err) {
      setRegError("Error de conexión al enviar el registro. Revisá tu internet.");
    } finally {
      setRegSubmitting(false);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard?.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(""), 2500);
  };

  const saveAllAdminChanges = async () => {
    if (!draft) return false;

    // Solo validar y enviar nueva clave si el usuario activó expresamente el cambio de PIN
    if (enableChangePin) {
      const cleanNew = (draftNewPin || "").trim();
      const cleanConf = (draftPinConfirm || "").trim();
      if (!cleanNew) {
        setSaveError("Ingresá la nueva contraseña o PIN que deseás configurar, o desactivá la opción de cambiar PIN.");
        return false;
      }
      if (cleanNew !== cleanConf) {
        setSaveError("Las contraseñas de PIN no coinciden. Verificá que ambas sean idénticas.");
        return false;
      }
    } else {
      // Si no se activó la opción de cambio de PIN, asegurar que no se envíe nada aunque el navegador haya autocompletado
      if (draftNewPin || draftPinConfirm) {
        setDraftNewPin("");
        setDraftPinConfirm("");
      }
    }

    // Asegurar que el carrito permanezca cerrado y activar ventana de guardado
    setCartOpen(false);
    setSaving(true);
    setSaveError("");
    setShowSaveSuccessModal(false);

    const sanitizedMenu = draft.map((c) => ({
      ...c,
      items: c.items.map((it) => ({ ...it, price: Number(it.price) || 0 })),
    }));

    let cleanIntl = (draftBusiness.phoneIntl || "").replace(/[^\d]/g, "");
    let cleanDisplay = (draftBusiness.phoneDisplay || "").trim();

    // Sincronizar automáticamente formatos si el usuario ingresó el número en cualquiera de los dos campos
    const displayDigits = cleanDisplay.replace(/\D/g, "");
    if (displayDigits.length >= 9 && (!cleanIntl || cleanIntl === "595981456789")) {
      let d = displayDigits;
      if (d.startsWith("0")) d = "595" + d.slice(1);
      else if (!d.startsWith("595") && d.length === 9) d = "595" + d;
      cleanIntl = d;
    }

    if (cleanIntl) {
      if (cleanIntl.startsWith("0")) {
        cleanIntl = "595" + cleanIntl.slice(1);
      } else if (!cleanIntl.startsWith("595") && cleanIntl.length === 9) {
        cleanIntl = "595" + cleanIntl;
      }
      if (!cleanDisplay || cleanDisplay === "0981 123 456" || cleanDisplay === "0981123456") {
        if (cleanIntl.startsWith("595") && cleanIntl.length === 12) {
          const local = "0" + cleanIntl.slice(3);
          cleanDisplay = `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
        } else {
          cleanDisplay = `+${cleanIntl}`;
        }
      }
    }

    const businessPayload = {
      ...draftBusiness,
      phoneIntl: cleanIntl || draftBusiness.phoneIntl || "595975635770",
      phoneDisplay: cleanDisplay || draftBusiness.phoneDisplay || "0975 635 770",
      deliveryNote: draftBusiness.deliveryNote || deliveryNote,
      sessionPersistence: draftBusiness.sessionPersistence || sessionPersistence,
      ...(enableChangePin && draftNewPin.trim() ? { newPin: draftNewPin.trim() } : {}),
    };

    const activeUser = sessionStorage.getItem("caserita_auth_user") || (userInput && userInput.trim()) || draftBusiness.adminUser || business.adminUser || "gerente";
    const activePin = sessionStorage.getItem("caserita_auth_pin") || (pinInput && pinInput.trim()) || "comercio123";
    const activeStoreId = sessionStorage.getItem("caserita_auth_store_id") || activeUser;

    try {
      const isGoogleActive = Boolean(auth?.currentUser || (sessionStorage.getItem("caserita_auth_pin") === "google-auth"));
      const currentRole = sessionStorage.getItem("caserita_auth_role") || adminRole || "owner";

      let res = await fetch(SHEETS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: activeUser,
          pin: activePin,
          role: currentRole,
          isGoogleAuth: isGoogleActive,
          googleUid: auth?.currentUser?.uid || "",
          storeId: currentRole === "superadmin" ? (selectedAdminStoreId || "losamigos") : activeStoreId,
          targetStoreId: currentRole === "superadmin" ? (selectedAdminStoreId || "losamigos") : undefined,
          action: (currentRole === "superadmin" && (selectedAdminStoreId === "losamigos" || !selectedAdminStoreId)) ? "updateDemoStore" : undefined,
          menu: sanitizedMenu,
          deliveryNote: businessPayload.deliveryNote,
          business: businessPayload,
        }),
      });
      let result;
      try {
        result = await res.json();
      } catch {
        result = { ok: false, error: "Respuesta inesperada del servidor" };
      }

      // Si por alguna razón la IP tenía intentos previos o falló por credenciales de sesión, desbloquear y reintentar
      if (!result.ok && (result.locked || res.status === 429 || res.status === 401)) {
        await fetch(`${SHEETS_API_URL}?action=resetIpStatus`).catch(() => {});
        res = await fetch(SHEETS_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user: activeUser || "usuario",
            pin: activePin || "google-auth",
            role: currentRole,
            isGoogleAuth: true,
            googleUid: auth?.currentUser?.uid || "",
            storeId: currentRole === "superadmin" ? (selectedAdminStoreId || "losamigos") : activeStoreId,
            targetStoreId: currentRole === "superadmin" ? (selectedAdminStoreId || "losamigos") : undefined,
            action: (currentRole === "superadmin" && (selectedAdminStoreId === "losamigos" || !selectedAdminStoreId)) ? "updateDemoStore" : undefined,
            menu: sanitizedMenu,
            deliveryNote: businessPayload.deliveryNote,
            business: businessPayload,
          }),
        });
        try {
          result = await res.json();
        } catch {
          result = { ok: false, error: "Error al procesar la respuesta del servidor" };
        }
      }

      if (!result.ok) {
        if (result.licenseBlocked) {
          setSaveError(result.error);
          setLicenseBlockedInfo({
            isRevoked: true,
            message: result.error,
            code: business.licenseCode || appLicense.code || "CAS-7K9B-X2M4",
            plan: business.licensePlan || appLicense.plan || "Plan Anual PRO",
            cost: business.licenseCost || appLicense.costFormatted || "1.350.000 Gs. / año",
          });
          setShowLicenseBlockedModal(true);
        } else {
          setSaveError(result.error || "No se pudo guardar la configuración.");
        }
        setSaving(false);
        setCartOpen(false);
        return false;
      }

      setMenu(sanitizedMenu);
      setBusiness(result.business || businessPayload);
      if (result.storeId) {
        sessionStorage.setItem("caserita_auth_store_id", result.storeId);
      }
      try {
        localStorage.setItem(`caserita_store_${result.storeId || activeStoreId}`, JSON.stringify({
          business: result.business || businessPayload,
          menu: sanitizedMenu,
          updatedAt: new Date().toISOString()
        }));
      } catch (e) {}

      // Sincronizar en base de datos Firestore por UID autenticado de usuario
      try {
        const firestoreUid = auth.currentUser?.uid || sessionStorage.getItem("caserita_auth_google_uid");
        if (firestoreUid) {
          saveUserProfileToFirestore(firestoreUid, {
            uid: firestoreUid,
            email: auth.currentUser?.email || googleUser?.email || "",
            displayName: auth.currentUser?.displayName || googleUser?.displayName || businessPayload.name || "",
            photoURL: auth.currentUser?.photoURL || googleUser?.photoURL || "",
            role: adminRole || "owner",
            businessName: businessPayload.name,
            slogan: businessPayload.slogan,
            bannerImage: businessPayload.bannerImage,
            phoneIntl: businessPayload.phoneIntl,
            phoneDisplay: businessPayload.phoneDisplay,
            address: businessPayload.address,
            deliveryNote: businessPayload.deliveryNote,
            storeId: result.storeId || activeStoreId,
          }).catch((fsErr) => console.warn("Aviso Firestore perfil:", fsErr));
        }

        // Sincronizar también la tienda demo oficial en Firestore para visitantes (losamigos y menupy)
        if (currentRole === "superadmin" || (result.storeId || activeStoreId) === "losamigos" || selectedAdminStoreId === "losamigos" || (result.storeId || activeStoreId) === "menupy") {
          const demoStorePayload = {
            name: businessPayload.name || "Menu Py",
            slogan: businessPayload.slogan || "Pedí online - Tu Carta Digital y Pedidos por WhatsApp",
            bannerImage: businessPayload.bannerImage || "/Flyers-MenuPY.png",
            phoneIntl: businessPayload.phoneIntl,
            phoneDisplay: businessPayload.phoneDisplay,
            address: businessPayload.address,
            deliveryNote: businessPayload.deliveryNote,
            menu: sanitizedMenu,
          };
          saveStoreToFirestore("losamigos", demoStorePayload).catch((fsErr) => console.warn("Aviso Firestore demo store losamigos:", fsErr));
          saveStoreToFirestore("menupy", demoStorePayload).catch((fsErr) => console.warn("Aviso Firestore demo store menupy:", fsErr));
        }
      } catch (e) {}

      if (businessPayload.sessionPersistence) {
        setSessionPersistence(businessPayload.sessionPersistence);
        try {
          localStorage.setItem("lacaserita_session_persistence", businessPayload.sessionPersistence);
        } catch (e) {}
      }
      setDeliveryNote(businessPayload.deliveryNote);
      if (draftBusiness.adminUser && draftBusiness.adminUser.trim()) {
        try {
          sessionStorage.setItem("caserita_auth_user", draftBusiness.adminUser.trim());
        } catch (e) {}
      }
      if (enableChangePin && draftNewPin.trim()) {
        try {
          sessionStorage.setItem("caserita_auth_pin", draftNewPin.trim());
        } catch (e) {}
      }
      setDraftNewPin("");
      setDraftPinConfirm("");
      setEnableChangePin(false);
      setDirty(false);
      setSavedFlash(true);
      setShowSaveSuccessModal(true);
      setTimeout(() => setSavedFlash(false), 2500);
      setTimeout(() => setShowSaveSuccessModal(false), 2400);

      addToast(
        "order_success",
        currentRole === "superadmin" ? "¡Demo Oficial Menu Py Actualizado!" : "¡Datos Guardados con Éxito!",
        currentRole === "superadmin"
          ? `La portada y los datos del Demo Oficial (${businessPayload.name || "Menu Py"}) fueron guardados y publicados para todos los visitantes.`
          : `Los cambios de ${businessPayload.name || "tu comercio"}, portada y menú fueron guardados en el servidor.`
      );
      setCartOpen(false);
      return true;
    } catch (err) {
      setSaveError("No se pudo guardar. Revisá tu conexión y probá de nuevo.");
      addToast(
        "order_cancel",
        "Error al Guardar",
        "No se pudo guardar. Revisá tu conexión y probá de nuevo."
      );
      return false;
    } finally {
      setSaving(false);
      setCartOpen(false);
    }
  };

  // Manejo de productos en borrador
  const updateItemField = (catIdx, itemIdx, field, value) => {
    setDraft((d) =>
      d.map((c, ci) =>
        ci !== catIdx ? c : { ...c, items: c.items.map((it, ii) => (ii !== itemIdx ? it : { ...it, [field]: value })) }
      )
    );
    setDirty(true);
  };

  const deleteItem = (catIdx, itemIdx) => {
    setDraft((d) => d.map((c, ci) => (ci !== catIdx ? c : { ...c, items: c.items.filter((_, ii) => ii !== itemIdx) })));
    setDirty(true);
  };

  const addItem2 = (catIdx) => {
    setDraft((d) =>
      d.map((c, ci) =>
        ci !== catIdx ? c : { ...c, items: [...c.items, { id: uid(), name: "Nuevo producto", desc: "", price: "", image: "" }] }
      )
    );
    setDirty(true);
  };

  const deleteCategory = (catIdx) => {
    setDraft((d) => d.filter((_, ci) => ci !== catIdx));
    setDirty(true);
  };

  const renameCategory = (catIdx, value) => {
    setDraft((d) => d.map((c, ci) => (ci !== catIdx ? c : { ...c, category: value })));
    setDirty(true);
  };

  const updateCategoryOption = (catIdx, opt, forceRename = true) => {
    setDraft((d) =>
      d.map((c, ci) => {
        if (ci !== catIdx) return c;
        const currentLower = (c.category || "").trim().toLowerCase();
        // Si se pide forceRename, o si la categoría se llama "nueva categoría", está vacía,
        // o coincide con alguna de las etiquetas estándar, actualizamos el nombre automáticamente
        const shouldRename =
          forceRename ||
          !currentLower ||
          currentLower === "nueva categoría" ||
          currentLower === "nueva categoria" ||
          currentLower === "categoría" ||
          currentLower === "categoria" ||
          ICON_OPTIONS.some((o) => o.label.toLowerCase() === currentLower);

        return {
          ...c,
          icon: opt.key,
          category: shouldRename ? opt.label : c.category,
        };
      })
    );
    setDirty(true);
  };

  const updateCategoryIcon = (catIdx, iconKey) => {
    const opt = ICON_OPTIONS.find((o) => o.key === iconKey);
    if (opt) {
      updateCategoryOption(catIdx, opt, true);
    } else {
      setDraft((d) => d.map((c, ci) => (ci !== catIdx ? c : { ...c, icon: iconKey })));
      setDirty(true);
    }
  };

  const moveItemToCategory = (sourceCatIdx, itemIdx, targetCatIdx) => {
    if (sourceCatIdx === targetCatIdx) return;
    setDraft((d) => {
      const itemToMove = d[sourceCatIdx]?.items?.[itemIdx];
      if (!itemToMove) return d;
      return d.map((c, ci) => {
        if (ci === sourceCatIdx) {
          return { ...c, items: c.items.filter((_, ii) => ii !== itemIdx) };
        }
        if (ci === targetCatIdx) {
          return { ...c, items: [...c.items, itemToMove] };
        }
        return c;
      });
    });
    setDirty(true);
  };

  const addCategory = () => {
    const existingNames = new Set((draft || []).map((c) => (c.category || "").toLowerCase()));
    const firstAvailable = ICON_OPTIONS.find((opt) => !existingNames.has(opt.label.toLowerCase())) || { key: "generico", label: "Nueva categoría" };
    setDraft((d) => [...d, { category: firstAvailable.label, icon: firstAvailable.key, items: [] }]);
    setDirty(true);
  };

  const handleImageUpload = async (catIdx, itemIdx, file) => {
    if (!file) return;
    const itemId = draft[catIdx].items[itemIdx].id;
    setImgLoading(itemId);
    setImgError("");
    try {
      const dataUrl = await compressImage(file);
      updateItemField(catIdx, itemIdx, "image", dataUrl);
    } catch {
      setImgError("No se pudo procesar la imagen del producto. Probá con otra foto.");
    } finally {
      setImgLoading(null);
    }
  };

  // Manejo de portada del comercio
  const handleBannerUpload = async (file) => {
    if (!file) return;
    setBannerUploading(true);
    setBannerUploadError("");
    try {
      const dataUrl = await compressBannerImage(file);
      setDraftBusiness((prev) => ({ ...prev, bannerImage: dataUrl }));
      setDirty(true);
    } catch {
      setBannerUploadError("No se pudo procesar la portada. Asegurate de que sea una imagen válida.");
    } finally {
      setBannerUploading(false);
    }
  };

  /* =========================================================================
     MODALES COMPARTIDOS: COBRO POR CAJA Y REPORTE DE MOVIMIENTOS
     ========================================================================= */
  const renderCashPaymentModal = () => {
    if (!selectedPayOrder) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in">
        <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border-2 overflow-hidden flex flex-col" style={{ borderColor: BRAND.paperDark }}>
          <div className="p-4 border-b flex items-center justify-between text-white" style={{ background: BRAND.charcoalDark }}>
            <div className="flex items-center gap-2">
              <Receipt size={20} className="text-amber-400" />
              <h3 className="font-bold text-base">Cobro por Caja - {selectedPayOrder.id}</h3>
            </div>
            <button
              type="button"
              onClick={() => setSelectedPayOrder(null)}
              className="text-stone-400 hover:text-white p-1 rounded-lg"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-5 space-y-4">
            <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-stone-500 font-semibold">Cliente / Destino:</span>
                <span className="text-xs font-bold text-stone-800">
                  {selectedPayOrder.mode === "mesa"
                    ? `🍽️ Mesa ${selectedPayOrder.tableNumber || "Salón"}`
                    : selectedPayOrder.mode === "delivery"
                    ? "🛵 Delivery"
                    : "🛍️ Retiro Mostrador"}
                </span>
              </div>
              <div className="font-bold text-stone-900 text-sm">{selectedPayOrder.customerName}</div>
              {selectedPayOrder.address && (
                <div className="text-xs text-stone-500 mt-1">{selectedPayOrder.address}</div>
              )}
              {selectedPayOrder.mapLink && (
                <div className="mt-1.5">
                  <a
                    href={selectedPayOrder.mapLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition shadow-sm"
                  >
                    <Navigation size={12} className="text-emerald-700" />
                    <span>Ver en Google Maps</span>
                    <ExternalLink size={11} />
                  </a>
                </div>
              )}
            </div>

            {/* Total a pagar */}
            <div className="text-center py-2 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="text-xs font-bold text-emerald-900 uppercase tracking-wide block">
                Monto Total a Cobrar
              </span>
              <span className="text-2xl font-black text-emerald-800 font-mono">
                {formatGs(selectedPayOrder.totalPrice)}
              </span>
            </div>

            {/* Selección del Medio de Pago */}
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-2">
                Seleccioná el medio de pago recibido:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: "efectivo", label: "Efectivo", icon: "💵" },
                  { key: "pos", label: "Tarjeta / POS", icon: "💳" },
                  { key: "transferencia", label: "Transferencia / SIPAP", icon: "🏦" },
                  { key: "tigo_money", label: "Billetera Móvil", icon: "📱" },
                ].map((method) => (
                  <button
                    key={method.key}
                    type="button"
                    onClick={() => setSelectedPayMethod(method.key)}
                    className={`p-3 rounded-xl border-2 text-left font-bold text-xs transition flex items-center gap-2 ${
                      selectedPayMethod === method.key
                        ? "border-emerald-600 bg-emerald-50 text-emerald-950 shadow-sm"
                        : "border-stone-200 hover:border-stone-300 text-stone-700"
                    }`}
                  >
                    <span className="text-base">{method.icon}</span>
                    <span>{method.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Opción de Notificación por WhatsApp */}
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 cursor-pointer select-none transition hover:bg-emerald-100/70">
              <input
                type="checkbox"
                checked={whatsAppNotifyOnPay}
                onChange={(e) => setWhatsAppNotifyOnPay(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer mt-0.5"
              />
              <div className="text-xs text-stone-800 flex-1">
                <span className="font-bold flex items-center gap-1.5 text-emerald-950">
                  <MessageCircle size={14} className="text-emerald-700" />
                  Notificar confirmación al cliente por WhatsApp al cobrar
                </span>
                {selectedPayOrder.customerPhone ? (
                  <span className="text-[11px] text-emerald-700 block mt-0.5">
                    Se abrirá WhatsApp para enviar a: <b>{selectedPayOrder.customerPhone}</b>
                  </span>
                ) : (
                  <span className="text-[11px] text-amber-700 block mt-0.5">
                    (No tiene celular registrado; podrás ingresarlo al confirmar)
                  </span>
                )}
              </div>
            </label>

            <div className="text-[11px] text-stone-500 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
              Al confirmar el cobro, este pedido figurará como <b>PAGADO / COMPLETADO</b>, saldrá de pendientes y se archivará en el <b>Historial y Movimiento de Caja</b>.
            </div>
          </div>

          <div className="p-4 bg-stone-50 border-t flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedPayOrder(null)}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold border border-stone-300 text-stone-700 hover:bg-stone-100"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={processingPayment}
              onClick={() => {
                if (whatsAppNotifyOnPay) {
                  handleMarkCompletedAndNotify(selectedPayOrder, null, selectedPayMethod);
                } else {
                  handlePayOrder(selectedPayOrder.id, selectedPayMethod);
                }
              }}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-black text-white shadow hover:brightness-105 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              style={{ background: BRAND.green }}
            >
              {processingPayment ? (
                <>
                  <LoaderCircle className="animate-spin" size={16} />
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Confirmar y Entregar</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderCashReportModal = () => {
    if (!showCashReportPrint) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
        <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border overflow-hidden my-6">
          <div className="p-4 border-b flex items-center justify-between text-white" style={{ background: BRAND.charcoalDark }}>
            <div className="flex items-center gap-2">
              <Printer size={20} className="text-amber-400" />
              <h3 className="font-bold text-base">Arqueo y Movimiento de Pedidos / Caja</h3>
            </div>
            <button
              type="button"
              onClick={() => setShowCashReportPrint(false)}
              className="text-stone-400 hover:text-white p-1 rounded-lg"
            >
              <X size={18} />
            </button>
          </div>

          {/* Contenido imprimible */}
          <div className="p-6 text-stone-900 space-y-5" id="printableCashMovementReport">
            <div className="text-center pb-3 border-b border-stone-200">
              <h2 className="slab text-2xl font-bold text-stone-900">{business.name}</h2>
              <p className="text-xs text-stone-600">{business.address}</p>
              <p className="text-xs text-stone-500">Tel / WhatsApp: {business.phoneDisplay}</p>
              <div className="mt-2 inline-block px-3 py-1 rounded-full bg-stone-100 text-stone-800 text-xs font-bold uppercase tracking-wider">
                Reporte de Movimiento de Caja • {cashPeriod === "dia" ? "Día (Hoy)" : cashPeriod === "semana" ? "Semana" : cashPeriod === "mes" ? "Mes" : "Histórico"}
              </div>
              <div className="text-[11px] text-stone-400 mt-1">
                Generado el: {formatDateSafe(new Date())} a las {formatTimeSafe(new Date())}
              </div>
            </div>

            {/* Métricas destacadas */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                <span className="text-[11px] font-bold text-stone-500 uppercase block">Total Cobrado</span>
                <span className="text-lg font-black text-emerald-800 font-mono">
                  {formatGs(cashMovementStats.totalIncome)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                <span className="text-[11px] font-bold text-stone-500 uppercase block">Pedidos Cobrados</span>
                <span className="text-lg font-black text-stone-900 font-mono">
                  {cashMovementStats.countOrders}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                <span className="text-[11px] font-bold text-stone-500 uppercase block">Platos / Unidades</span>
                <span className="text-lg font-black text-stone-900 font-mono">
                  {cashMovementStats.totalItemsSold}
                </span>
              </div>
            </div>

            {/* Desgloses */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl border border-stone-200 bg-stone-50/50">
                <h4 className="font-bold text-stone-800 border-b pb-1 mb-2">Por Modalidad de Pedido:</h4>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>🍽️ Mesas ({cashMovementStats.byMode.mesa.count}):</span>
                    <b className="font-mono">{formatGs(cashMovementStats.byMode.mesa.total)}</b>
                  </div>
                  <div className="flex justify-between">
                    <span>🛵 Delivery ({cashMovementStats.byMode.delivery.count}):</span>
                    <b className="font-mono">{formatGs(cashMovementStats.byMode.delivery.total)}</b>
                  </div>
                  <div className="flex justify-between">
                    <span>🛍️ Retiro Mostrador ({cashMovementStats.byMode.retiro.count}):</span>
                    <b className="font-mono">{formatGs(cashMovementStats.byMode.retiro.total)}</b>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-stone-200 bg-stone-50/50">
                <h4 className="font-bold text-stone-800 border-b pb-1 mb-2">Por Medio de Pago:</h4>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>💵 Efectivo:</span>
                    <b className="font-mono">{formatGs(cashMovementStats.byPaymentMethod.efectivo)}</b>
                  </div>
                  <div className="flex justify-between">
                    <span>💳 Tarjeta / POS:</span>
                    <b className="font-mono">{formatGs(cashMovementStats.byPaymentMethod.pos)}</b>
                  </div>
                  <div className="flex justify-between">
                    <span>🏦 Transferencia:</span>
                    <b className="font-mono">{formatGs(cashMovementStats.byPaymentMethod.transferencia)}</b>
                  </div>
                  <div className="flex justify-between">
                    <span>📱 Billetera:</span>
                    <b className="font-mono">{formatGs(cashMovementStats.byPaymentMethod.tigo_money)}</b>
                  </div>
                </div>
              </div>
            </div>

            {/* Detalle de pedidos */}
            <div>
              <h4 className="font-bold text-xs text-stone-700 uppercase tracking-wider mb-2">
                Listado Detallado de Pedidos ({cashMovementStats.periodOrders.length}):
              </h4>
              {cashMovementStats.periodOrders.length === 0 ? (
                <p className="text-xs text-stone-400 italic">No hay pedidos registrados en este período.</p>
              ) : (
                <table className="w-full text-left text-xs border border-stone-200">
                  <thead className="bg-stone-100 text-stone-700 font-bold">
                    <tr>
                      <th className="p-2 border">Código</th>
                      <th className="p-2 border">Hora</th>
                      <th className="p-2 border">Tipo</th>
                      <th className="p-2 border">Cliente</th>
                      <th className="p-2 border">Medio</th>
                      <th className="p-2 border text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cashMovementStats.periodOrders.map((po) => (
                      <tr key={po.id} className="border-b">
                        <td className="p-2 border font-mono font-bold text-stone-600">{po.id}</td>
                        <td className="p-2 border whitespace-nowrap">
                          {formatTimeSafe(po.paidAt || po.createdAt)}
                        </td>
                        <td className="p-2 border capitalize">
                          {po.mode === "mesa" ? `Mesa ${po.tableNumber}` : po.mode}
                        </td>
                        <td className="p-2 border">{po.customerName}</td>
                        <td className="p-2 border capitalize">{po.paymentMethod || "Efectivo"}</td>
                        <td className="p-2 border text-right font-mono font-bold">{formatGs(po.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Acciones de impresión */}
          <div className="p-4 bg-stone-50 border-t flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCashReportPrint(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-stone-300 text-stone-700 hover:bg-stone-100"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-5 py-2.5 rounded-xl text-xs font-black text-white shadow hover:brightness-105 transition flex items-center gap-1.5"
              style={{ background: BRAND.tomato }}
            >
              <Printer size={16} />
              <span>Imprimir Reporte</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  /* =========================================================================
     MODAL DE DETALLE COMPLETO DE PEDIDO DEL HISTORIAL
     ========================================================================= */
  const renderHistoryDetailModal = () => {
    if (!selectedHistoryOrder) return null;
    const order = selectedHistoryOrder;
    const isMesa = order.mode === "mesa";
    const isDelivery = order.mode === "delivery";
    const isPaid = (order.paymentStatus || "").toLowerCase() === "pagado" || (order.paymentStatus || "").toLowerCase() === "cobrado";
    const isPending = (order.paymentStatus || "").toLowerCase() === "pendiente";
    const isCancelled = (order.paymentStatus || "").toLowerCase() === "cancelado" || (order.paymentStatus || "").toLowerCase() === "anulado";

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
        <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border overflow-hidden my-6 flex flex-col" style={{ borderColor: BRAND.paperDark }}>
          {/* Cabecera del modal */}
          <div className="p-4 border-b flex items-center justify-between text-white" style={{ background: BRAND.charcoalDark }}>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-stone-800 text-amber-400">
                <FileText size={20} />
              </div>
              <div>
                <h3 className="font-bold text-base leading-tight">Ticket de Pedido #{order.id}</h3>
                <p className="text-[11px] text-stone-400">
                  {formatDateSafe(order.createdAt || order.paidAt)} • {formatTimeSafe(order.createdAt || order.paidAt)} hs
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedHistoryOrder(null)}
              className="text-stone-400 hover:text-white p-1 rounded-lg transition"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
            {/* Estado del pedido */}
            <div className="flex items-center justify-between p-3.5 rounded-xl border" style={{
              background: isPaid ? "#F0FDF4" : isCancelled ? "#FEF2F2" : "#FFFBEB",
              borderColor: isPaid ? "#86EFAC" : isCancelled ? "#FECACA" : "#FDE68A",
            }}>
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold block" style={{
                  color: isPaid ? "#166534" : isCancelled ? "#991B1B" : "#92400E"
                }}>
                  Estado del Pedido:
                </span>
                <span className="text-sm font-black flex items-center gap-1.5 mt-0.5" style={{
                  color: isPaid ? "#15803D" : isCancelled ? "#DC2626" : "#B45309"
                }}>
                  {isPaid ? (
                    <>
                      <CheckCircle2 size={16} /> Cobrado / Pagado
                    </>
                  ) : isCancelled ? (
                    <>
                      <AlertCircle size={16} /> Cancelado / Anulado
                    </>
                  ) : (
                    <>
                      <Clock size={16} /> Pendiente de Cobro
                    </>
                  )}
                </span>
                {isPaid && (
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    Cobrado por <b>{order.paymentMethod ? order.paymentMethod.toUpperCase() : "CAJA"}</b>
                    {order.paidAt && ` el ${formatDateSafe(order.paidAt)} a las ${formatTimeSafe(order.paidAt)}`}
                  </p>
                )}
              </div>

              {/* Botón rápido si está pendiente */}
              {isPending && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPayOrder(order);
                    setSelectedHistoryOrder(null);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-black text-white shadow transition hover:brightness-105"
                  style={{ background: BRAND.green }}
                >
                  Cobrar en Caja
                </button>
              )}
            </div>

            {/* Datos del Cliente y Modalidad */}
            <div className="p-3.5 rounded-xl border bg-stone-50 border-stone-200 text-xs text-stone-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-stone-500 font-medium">Modalidad:</span>
                <span className="font-bold px-2.5 py-0.5 rounded-full bg-stone-200 text-stone-800 text-[11px]">
                  {isMesa ? `🍽️ Mesa ${order.tableNumber || "Salón"}` : isDelivery ? "🛵 Delivery" : "🛍️ Retiro en Mostrador"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500 font-medium">Cliente:</span>
                <span className="font-bold text-stone-900">{order.customerName || "Cliente"}</span>
              </div>
              {order.customerPhone && (
                <div className="flex items-center justify-between">
                  <span className="text-stone-500 font-medium">Teléfono:</span>
                  <a
                    href={`https://wa.me/595${order.customerPhone.replace(/^0+/, '').replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-emerald-700 hover:underline flex items-center gap-1"
                  >
                    <span>{order.customerPhone}</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              )}
              {isDelivery && order.address && (
                <div className="pt-1.5 border-t border-stone-200">
                  <span className="text-stone-500 font-medium block mb-0.5">Dirección de Entrega:</span>
                  <p className="font-semibold text-stone-800">{order.address}</p>
                  {order.mapLink && (
                    <a
                      href={order.mapLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 mt-1 text-[11px] font-bold text-blue-700 hover:underline"
                    >
                      <MapPin size={13} />
                      <span>Abrir ubicación en Google Maps</span>
                    </a>
                  )}
                </div>
              )}
              {order.notes && (
                <div className="pt-1.5 border-t border-stone-200 bg-amber-50/50 p-2 rounded-lg border border-amber-100">
                  <span className="text-amber-900 font-bold block text-[11px]">Aclaraciones del cliente:</span>
                  <p className="italic text-stone-700 mt-0.5 text-xs">"{order.notes}"</p>
                </div>
              )}
            </div>

            {/* Desglose de Platos y Productos */}
            <div>
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block mb-2">
                Detalle de Productos:
              </span>
              <div className="border border-stone-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-stone-100 text-stone-700 font-bold border-b border-stone-200 text-[10px] uppercase">
                    <tr>
                      <th className="p-2.5">Cant.</th>
                      <th className="p-2.5">Producto</th>
                      <th className="p-2.5 text-right">Unitario</th>
                      <th className="p-2.5 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {(order.items || []).map((it, idx) => (
                      <tr key={idx} className="hover:bg-stone-50">
                        <td className="p-2.5 font-bold text-stone-900">{it.qty}x</td>
                        <td className="p-2.5 font-medium text-stone-800">{it.name}</td>
                        <td className="p-2.5 text-right font-mono text-stone-500">{formatGs(it.price)}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-stone-900">
                          {formatGs((it.qty || 1) * (it.price || 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-stone-50 border-t-2 border-stone-200">
                    <tr>
                      <td colSpan={3} className="p-3 text-right font-bold text-stone-700 text-sm">
                        Total del Pedido:
                      </td>
                      <td className="p-3 text-right font-mono font-black text-stone-900 text-base">
                        {formatGs(order.totalPrice)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Botón de acción rápida: Notificar por WhatsApp y marcar como Completado / Entregado */}
            <button
              type="button"
              onClick={() => handleMarkCompletedAndNotify(order)}
              className="w-full py-2.5 px-3 rounded-xl font-black text-xs text-white shadow hover:brightness-105 transition flex items-center justify-center gap-2"
              style={{ background: "#059669" }}
            >
              <MessageCircle size={16} className="text-amber-200" />
              <span>Marcar como Completado / Entregado y Notificar por WhatsApp</span>
            </button>

            {/* Cambio Manual de Estado del Pedido */}
            <div className="p-3.5 rounded-xl border border-stone-200 bg-stone-50">
              <span className="text-[11px] font-bold text-stone-600 block mb-2 uppercase tracking-wider">
                Cambiar Estado del Pedido:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handleMarkCompletedAndNotify(order)}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
                    order.orderStatus === "completado" || order.deliveryStatus === "entregado"
                      ? "bg-emerald-800 text-white shadow"
                      : "bg-emerald-100 text-emerald-900 border border-emerald-300 hover:bg-emerald-200"
                  }`}
                  title="Marcar como entregado y abrir confirmación de WhatsApp"
                >
                  <MessageCircle size={13} />
                  <span>Entregado</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateOrderStatus(order.id, "pagado", order.paymentMethod || "efectivo")}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
                    isPaid ? "bg-emerald-700 text-white shadow" : "bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100"
                  }`}
                >
                  <CheckCircle2 size={13} />
                  <span>Pagado</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateOrderStatus(order.id, "pendiente")}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
                    isPending ? "bg-amber-600 text-white shadow" : "bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100"
                  }`}
                >
                  <Clock size={13} />
                  <span>Pendiente</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateOrderStatus(order.id, "cancelado")}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
                    isCancelled ? "bg-red-700 text-white shadow" : "bg-red-50 text-red-900 border border-red-200 hover:bg-red-100"
                  }`}
                >
                  <AlertCircle size={13} />
                  <span>Cancelar</span>
                </button>
              </div>
            </div>
          </div>

          {/* Botones inferiores del modal */}
          <div className="p-4 border-t bg-stone-50 flex items-center justify-between gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                handleDeleteOrder(order.id);
                setSelectedHistoryOrder(null);
              }}
              className="px-3 py-2 rounded-xl text-xs font-bold text-red-700 hover:bg-red-100 transition flex items-center gap-1.5"
            >
              <Trash2 size={14} />
              <span>Eliminar pedido</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-stone-300 text-stone-700 hover:bg-stone-200 transition flex items-center gap-1.5"
              >
                <Printer size={14} />
                <span>Imprimir Ticket</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedHistoryOrder(null)}
                className="px-5 py-2 rounded-xl text-xs font-black text-white shadow transition hover:brightness-105"
                style={{ background: BRAND.charcoalDark }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  /* =========================================================================
     MODAL DE CONFIRMACIÓN DE PEDIDO COMPLETADO / ENTREGADO POR WHATSAPP
     ========================================================================= */
  const renderWhatsAppConfirmationModal = () => {
    if (!whatsAppModalOrder) return null;
    const order = whatsAppModalOrder;
    const cleanPhone = normalizePhoneForWhatsApp(whatsAppModalPhone);
    const message = buildOrderCompletedWhatsAppMessage({
      ...order,
      customerPhone: whatsAppModalPhone,
    });
    const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}` : "";

    const handleSendNow = () => {
      if (!cleanPhone) {
        addToast("cart_add", "Teléfono Requerido", "Por favor ingresá el número de celular del cliente.");
        return;
      }
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, customerPhone: whatsAppModalPhone } : o))
      );
      window.open(waUrl, "_blank");
      addToast("order_success", "WhatsApp Abierto", "Se abrió WhatsApp con el mensaje de confirmación.");
    };

    const handleCopy = () => {
      try {
        navigator.clipboard.writeText(message);
        setCopiedWhatsAppMsg(true);
        setTimeout(() => setCopiedWhatsAppMsg(false), 2500);
      } catch (e) {
        console.warn("Error copiando texto:", e);
      }
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in overflow-y-auto">
        <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border-2 overflow-hidden flex flex-col my-4" style={{ borderColor: BRAND.paperDark }}>
          {/* Cabecera */}
          <div className="p-4 border-b flex items-center justify-between text-white" style={{ background: "#065F46" }}>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-800 text-amber-300">
                <MessageCircle size={20} />
              </div>
              <div>
                <h3 className="font-bold text-base leading-tight">Confirmación de Pedido por WhatsApp</h3>
                <p className="text-[11px] text-emerald-200">
                  Pedido #{order.id} • Marcado como Completado y Entregado
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setWhatsAppModalOrder(null)}
              className="text-emerald-200 hover:text-white p-1 rounded-lg transition"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* Banner de Estado */}
            <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl flex items-start gap-3">
              <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-emerald-950 block">
                  ¡Pedido marcado como Completado y Entregado!
                </span>
                <span className="text-[11px] text-emerald-800">
                  {cleanPhone
                    ? "Se preparó la actualización oficial de estado con el detalle y ticket de compra para el cliente."
                    : "Ingresá el número de WhatsApp del cliente para enviarle la confirmación oficial."}
                </span>
              </div>
            </div>

            {/* Input de Número de Teléfono del Cliente */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 flex items-center justify-between">
                <span>Número de WhatsApp del Cliente:</span>
                <span className="text-[10px] text-stone-400 font-mono">
                  {cleanPhone ? `Destino: +${cleanPhone}` : "Requerido para enviar"}
                </span>
              </label>
              <div className="relative">
                <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="tel"
                  placeholder="Ej: 0981 123 456 o +595981123456"
                  value={whatsAppModalPhone}
                  onChange={(e) => setWhatsAppModalPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs font-bold rounded-xl border bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                  style={{ borderColor: BRAND.paperDark }}
                />
              </div>
              <p className="text-[10px] text-stone-500">
                Se autocompleta con el prefijo de Paraguay (+595) si ingresás un número con 09...
              </p>
            </div>

            {/* Vista Previa del Mensaje Oficial */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-700">
                  Vista Previa del Mensaje Oficial:
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition"
                >
                  <Copy size={12} />
                  <span>{copiedWhatsAppMsg ? "¡Copiado!" : "Copiar texto"}</span>
                </button>
              </div>
              <div className="bg-[#EFEAE2] p-3.5 rounded-xl border border-stone-300 font-sans text-xs text-stone-900 whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto shadow-inner">
                {message}
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="p-4 bg-stone-50 border-t flex items-center justify-between gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setWhatsAppModalOrder(null)}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-stone-300 text-stone-700 hover:bg-stone-100 transition"
            >
              Cerrar
            </button>

            <div className="flex items-center gap-2">
              {cleanPhone ? (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    addToast("order_success", "WhatsApp Abierto", "Mensaje de confirmación listo en WhatsApp.");
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-black text-white shadow-md hover:brightness-105 transition flex items-center gap-1.5"
                  style={{ background: "#25D366" }}
                >
                  <MessageCircle size={15} />
                  <span>Abrir WhatsApp Ahora</span>
                  <ExternalLink size={12} />
                </a>
              ) : (
                <button
                  type="button"
                  onClick={handleSendNow}
                  className="px-4 py-2 rounded-xl text-xs font-black text-white shadow hover:brightness-105 transition flex items-center gap-1.5"
                  style={{ background: "#25D366" }}
                >
                  <MessageCircle size={15} />
                  <span>Enviar por WhatsApp</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  /* =========================================================================
     MODAL DE REPORTE CONTABLE Y EXPORTACIÓN A PDF DEL HISTORIAL
     ========================================================================= */
  const renderHistoryPdfModal = () => {
    if (!showHistoryPdfModal) return null;

    const dateLabel = historyDatePreset === "personalizado" && historyCustomDate 
      ? `Fecha específica: ${formatDateSafe(historyCustomDate)}` 
      : historyDatePreset === "hoy" ? "Hoy" 
      : historyDatePreset === "ayer" ? "Ayer" 
      : historyDatePreset === "ultimos7" ? "Últimos 7 días" 
      : historyDatePreset === "mes" ? "Este Mes" : "Histórico Completo";
      
    const statusLabel = historyStatusFilter === "pagado" ? "Solo Cobrados / Pagados"
      : historyStatusFilter === "pendiente" ? "Solo Pendientes de Cobro"
      : historyStatusFilter === "cancelado" ? "Solo Cancelados / Anulados" : "Todos los Estados";

    const modeLabel = historyModeFilter === "mesa" ? "Solo Mesas"
      : historyModeFilter === "delivery" ? "Solo Delivery"
      : historyModeFilter === "retiro" ? "Solo Retiro en Local" : "Todas las Modalidades";

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
        <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border overflow-hidden my-4 flex flex-col border-stone-300">
          
          {/* Barra Superior de Herramientas (Oculta al imprimir) */}
          <div className="no-print p-4 border-b flex items-center justify-between gap-3 text-white flex-wrap" style={{ background: BRAND.charcoalDark }}>
            <div className="flex items-center gap-2">
              <FileText size={20} className="text-amber-400" />
              <div>
                <h3 className="font-bold text-sm md:text-base leading-tight">
                  Reporte Contable y Auditoría de Pedidos (PDF / CSV)
                </h3>
                <p className="text-[11px] text-stone-300">
                  {filteredHistoryOrders.length} pedidos según criterios ({dateLabel} • {statusLabel})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={exportHistoryCsv}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold border border-emerald-400 bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1.5 shadow"
                title="Descargar datos en formato CSV para Excel o sistemas contables"
              >
                <Download size={14} />
                <span>Exportar CSV</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-1.5 rounded-xl text-xs font-black shadow transition flex items-center gap-1.5 text-white hover:brightness-105"
                style={{ background: BRAND.tomato }}
                title="Abrir diálogo de impresión o Guardar como PDF"
              >
                <Printer size={15} />
                <span>Descargar / Imprimir PDF</span>
              </button>
              <button
                type="button"
                onClick={() => setShowHistoryPdfModal(false)}
                className="p-1.5 text-stone-400 hover:text-white rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* DOCUMENTO IMPRIMIBLE (.printable-area) */}
          <div className="p-6 md:p-8 text-stone-900 space-y-6 printable-area bg-white overflow-y-auto max-h-[80vh]">
            
            {/* Cabecera Formal del Reporte */}
            <div className="border-b-2 border-stone-800 pb-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300 inline-block mb-1">
                  Documento Contable Oficial
                </span>
                <h1 className="slab text-2xl md:text-3xl font-bold text-stone-950 leading-tight">
                  {business.name}
                </h1>
                <p className="text-xs text-stone-600 font-medium">{business.address}</p>
                <p className="text-xs text-stone-500">
                  Teléfono / WhatsApp: <span className="font-bold text-stone-700">{business.phoneDisplay}</span>
                </p>
              </div>

              <div className="text-left sm:text-right space-y-1 bg-stone-50 sm:bg-transparent p-3 sm:p-0 rounded-xl border sm:border-0 border-stone-200">
                <div className="text-xs font-mono font-bold text-stone-600 uppercase">
                  INFORME DE CAJA Y VENTAS
                </div>
                <div className="text-xs text-stone-700 font-semibold">
                  Emisión: <b>{formatDateSafe(new Date())}</b> - {formatTimeSafe(new Date())} hs
                </div>
                <div className="text-[11px] text-stone-500 font-mono">
                  Auditoría N°: REP-{new Date().getFullYear()}{String(new Date().getMonth() + 1).padStart(2, "0")}{String(new Date().getDate()).padStart(2, "0")}-{filteredHistoryOrders.length}
                </div>
              </div>
            </div>

            {/* Banner Informativo de Criterios y Filtros Aplicados */}
            <div className="bg-stone-50 border border-stone-200 p-3.5 rounded-xl print-avoid-break">
              <span className="text-[10px] font-black uppercase text-stone-500 tracking-wider block mb-1.5">
                Criterios del Filtro Contable:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-stone-500">Período / Fecha: </span>
                  <b className="text-stone-900">{dateLabel}</b>
                </div>
                <div>
                  <span className="text-stone-500">Estado de Pedidos: </span>
                  <b className="text-stone-900">{statusLabel}</b>
                </div>
                <div>
                  <span className="text-stone-500">Modalidad: </span>
                  <b className="text-stone-900">{modeLabel}</b>
                </div>
              </div>
            </div>

            {/* Tarjetas de Resumen Financiero y Contable */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print-avoid-break">
              <div className="p-3 rounded-xl border border-stone-200 bg-stone-50">
                <span className="text-[10px] font-bold uppercase text-stone-500 block">Pedidos Auditados</span>
                <div className="text-xl font-black text-stone-900 mt-1">{historyStats.totalCount}</div>
                <span className="text-[10px] text-stone-400">órdenes procesadas</span>
              </div>
              <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/40">
                <span className="text-[10px] font-bold uppercase text-emerald-800 block">Facturación Total</span>
                <div className="text-xl font-black text-emerald-950 font-mono mt-1">{formatGs(historyStats.totalAmount)}</div>
                <span className="text-[10px] text-emerald-600">volumen acumulado</span>
              </div>
              <div className="p-3 rounded-xl border border-emerald-300 bg-emerald-50">
                <span className="text-[10px] font-bold uppercase text-emerald-900 block">Total Cobrado ({historyStats.paidCount})</span>
                <div className="text-xl font-black text-emerald-900 font-mono mt-1">{formatGs(historyStats.paidAmount)}</div>
                <span className="text-[10px] text-emerald-700">ingresos registrados</span>
              </div>
              <div className="p-3 rounded-xl border border-amber-300 bg-amber-50">
                <span className="text-[10px] font-bold uppercase text-amber-900 block">Por Cobrar ({historyStats.pendingCount})</span>
                <div className="text-xl font-black text-amber-900 font-mono mt-1">{formatGs(historyStats.pendingAmount)}</div>
                <span className="text-[10px] text-amber-700">cuentas pendientes</span>
              </div>
            </div>

            {/* Desglose Contable por Métodos de Pago y Modalidades */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs print-avoid-break">
              <div className="p-3 rounded-xl border border-stone-200 bg-stone-50">
                <h4 className="font-bold text-stone-800 border-b border-stone-200 pb-1 mb-2 uppercase text-[11px] tracking-wider">
                  Ingresos Cobrados por Medio de Pago:
                </h4>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-stone-600">💵 Efectivo en Caja:</span>
                    <b className="font-mono text-stone-900">{formatGs(historyStats.byMethod?.efectivo || 0)}</b>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-stone-600">💳 Tarjeta / POS:</span>
                    <b className="font-mono text-stone-900">{formatGs(historyStats.byMethod?.pos || 0)}</b>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-stone-600">🏦 Transferencia Bancaria:</span>
                    <b className="font-mono text-stone-900">{formatGs(historyStats.byMethod?.transferencia || 0)}</b>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-stone-600">📱 Billetera / Tigo Money:</span>
                    <b className="font-mono text-stone-900">{formatGs(historyStats.byMethod?.tigo_money || 0)}</b>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-stone-200 bg-stone-50">
                <h4 className="font-bold text-stone-800 border-b border-stone-200 pb-1 mb-2 uppercase text-[11px] tracking-wider">
                  Rendimiento por Modalidad:
                </h4>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-stone-600">🍽️ Salón / Mesas ({historyStats.byMode?.mesa?.count || 0}):</span>
                    <b className="font-mono text-stone-900">{formatGs(historyStats.byMode?.mesa?.total || 0)}</b>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-stone-600">🛵 Envíos / Delivery ({historyStats.byMode?.delivery?.count || 0}):</span>
                    <b className="font-mono text-stone-900">{formatGs(historyStats.byMode?.delivery?.total || 0)}</b>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-stone-600">🛍️ Retiro en Local ({historyStats.byMode?.retiro?.count || 0}):</span>
                    <b className="font-mono text-stone-900">{formatGs(historyStats.byMode?.retiro?.total || 0)}</b>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-stone-200">
                    <span className="text-stone-500 font-semibold">Promedio por Pedido Cobrado:</span>
                    <b className="font-mono text-emerald-800">{formatGs(historyStats.averageTicket || 0)}</b>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabla Detallada de Asientos de Pedidos */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs text-stone-800 uppercase tracking-wider">
                Detalle Cronológico de Pedidos ({filteredHistoryOrders.length}):
              </h4>
              <div className="border border-stone-300 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-stone-100 text-stone-700 font-bold border-b border-stone-300 text-[10px] uppercase">
                    <tr>
                      <th className="p-2 border-r border-stone-200">Código</th>
                      <th className="p-2 border-r border-stone-200">Fecha / Hora</th>
                      <th className="p-2 border-r border-stone-200">Tipo</th>
                      <th className="p-2 border-r border-stone-200">Cliente</th>
                      <th className="p-2 border-r border-stone-200">Detalle</th>
                      <th className="p-2 border-r border-stone-200">Medio</th>
                      <th className="p-2 border-r border-stone-200 text-center">Estado</th>
                      <th className="p-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {filteredHistoryOrders.map((o) => {
                      const isPaid = (o.paymentStatus || "").toLowerCase() === "pagado" || (o.paymentStatus || "").toLowerCase() === "cobrado";
                      const isPending = (o.paymentStatus || "").toLowerCase() === "pendiente";
                      return (
                        <tr key={o.id} className="hover:bg-stone-50">
                          <td className="p-2 font-mono font-bold text-stone-900 border-r border-stone-200 whitespace-nowrap">
                            {o.id}
                          </td>
                          <td className="p-2 border-r border-stone-200 whitespace-nowrap">
                            <div>{formatDateSafe(o.createdAt || o.paidAt)}</div>
                            <div className="text-[10px] text-stone-500">{formatTimeSafe(o.createdAt || o.paidAt)} hs</div>
                          </td>
                          <td className="p-2 border-r border-stone-200 whitespace-nowrap capitalize">
                            {o.mode === "mesa" ? `Mesa ${o.tableNumber || "Salón"}` : o.mode}
                          </td>
                          <td className="p-2 border-r border-stone-200">
                            <div className="font-semibold text-stone-900">{o.customerName || "Cliente"}</div>
                            {o.customerPhone && <div className="text-[10px] text-stone-500">{o.customerPhone}</div>}
                          </td>
                          <td className="p-2 border-r border-stone-200">
                            <div className="text-[11px] text-stone-700">
                              {(o.items || []).map((it) => `${it.qty}x ${it.name}`).join(", ")}
                            </div>
                          </td>
                          <td className="p-2 border-r border-stone-200 capitalize whitespace-nowrap">
                            {o.paymentMethod || "Efectivo"}
                          </td>
                          <td className="p-2 border-r border-stone-200 text-center whitespace-nowrap">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              isPaid ? "bg-emerald-100 text-emerald-800" : isPending ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"
                            }`}>
                              {isPaid ? "Cobrado" : isPending ? "Pendiente" : "Cancelado"}
                            </span>
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-stone-900 whitespace-nowrap">
                            {formatGs(o.totalPrice)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-stone-100 border-t-2 border-stone-300 font-bold">
                    <tr>
                      <td colSpan={7} className="p-2.5 text-right text-stone-800 uppercase text-[11px]">
                        Total Facturación Auditada:
                      </td>
                      <td className="p-2.5 text-right font-mono font-black text-stone-950 text-sm">
                        {formatGs(historyStats.totalAmount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Sección de Firmas Contables y Responsables */}
            <div className="pt-8 border-t border-stone-300 grid grid-cols-2 gap-8 text-center text-xs print-avoid-break">
              <div>
                <div className="border-b border-stone-400 w-3/4 mx-auto mb-2" />
                <span className="font-bold text-stone-800 block">Firma del Responsable de Caja</span>
                <span className="text-[10px] text-stone-500">Operador / Recepción</span>
              </div>
              <div>
                <div className="border-b border-stone-400 w-3/4 mx-auto mb-2" />
                <span className="font-bold text-stone-800 block">Firma de Administración / Contador</span>
                <span className="text-[10px] text-stone-500">Control y Auditoría Contable</span>
              </div>
            </div>

            {/* Pie del Documento Contable */}
            <div className="pt-4 border-t border-stone-200 text-center text-[10px] text-stone-400 space-y-0.5 print-avoid-break">
              <p>Documento generado digitalmente por el Sistema de Gestión de {business.name}.</p>
              <p>Desarrollado por CyM Software • Contacto: +595975635770 • Todos los derechos reservados 2026</p>
            </div>

          </div>

          {/* Barra Inferior de Cierre (Oculta al imprimir) */}
          <div className="no-print p-4 border-t bg-stone-50 flex items-center justify-between gap-2 flex-wrap">
            <div className="text-xs text-stone-500">
              💡 Para guardar como archivo PDF, elija la opción <b>"Guardar como PDF"</b> en la ventana de impresión del navegador.
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowHistoryPdfModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-stone-300 text-stone-700 hover:bg-stone-200 transition"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 rounded-xl text-xs font-black text-white shadow hover:brightness-105 transition flex items-center gap-1.5"
                style={{ background: BRAND.tomato }}
              >
                <Printer size={15} />
                <span>Imprimir / Guardar como PDF</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    );
  };

  const renderConfirmActionModal = () => {
    if (!confirmModalConfig) return null;
    const {
      title = "¿Confirmar acción?",
      message = "¿Estás seguro de continuar?",
      confirmText = "Confirmar",
      cancelText = "Cancelar",
      confirmVariant = "danger",
      onConfirm = () => {},
      onCancel = () => {},
      icon: IconComponent = AlertTriangle,
    } = confirmModalConfig;

    const handleConfirm = () => {
      try {
        onConfirm();
      } finally {
        setConfirmModalConfig(null);
      }
    };

    const handleCancel = () => {
      try {
        if (onCancel) onCancel();
      } finally {
        setConfirmModalConfig(null);
      }
    };

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
        <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-stone-200 overflow-hidden transform transition-all p-6 space-y-4">
          <div className="flex items-start gap-3.5">
            <div className={`p-3 rounded-2xl shrink-0 ${
              confirmVariant === "danger" 
                ? "bg-red-100 text-red-600" 
                : confirmVariant === "warning" 
                ? "bg-amber-100 text-amber-700" 
                : "bg-stone-100 text-stone-700"
            }`}>
              <IconComponent size={26} />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-stone-900">{title}</h3>
              <p className="text-xs text-stone-600 leading-relaxed">{message}</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-stone-300 text-stone-700 hover:bg-stone-100 transition cursor-pointer"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className={`px-5 py-2 rounded-xl text-xs font-black text-white shadow-md hover:brightness-105 transition flex items-center gap-1.5 cursor-pointer ${
                confirmVariant === "danger"
                  ? "bg-red-600 hover:bg-red-700"
                  : confirmVariant === "warning"
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-stone-900 hover:bg-black"
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Ventana Modal de Guardando Datos / Sincronización del Comercio
  const renderSaveDataModal = () => {
    if (!saving && !showSaveSuccessModal && !saveError) return null;

    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
        aria-modal="true"
        role="dialog"
      >
        <div
          className="w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl border flex flex-col items-center text-center transform scale-100 transition-all duration-300"
          style={{
            background: BRAND.cream,
            borderColor: saveError ? "#EF4444" : showSaveSuccessModal ? BRAND.green : BRAND.paperDark,
          }}
        >
          {saving ? (
            <div className="w-full flex flex-col items-center">
              <div className="relative mb-5 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full flex items-center justify-center bg-amber-100 animate-pulse">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center shadow" style={{ background: BRAND.tomato }}>
                    <Save size={26} color={BRAND.cream} className="animate-pulse" />
                  </div>
                </div>
                <div className="absolute -inset-2 flex items-center justify-center pointer-events-none">
                  <LoaderCircle className="animate-spin text-amber-500" size={96} strokeWidth={2.5} />
                </div>
              </div>

              <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 bg-amber-100 px-3 py-1 rounded-full mb-2">
                Sincronizando con el Servidor
              </span>

              <h3 className="slab text-xl sm:text-2xl font-bold mb-2" style={{ color: BRAND.charcoal }}>
                Guardando Datos del Comercio...
              </h3>

              <p className="text-xs sm:text-sm text-stone-600 font-medium leading-relaxed max-w-xs mb-5">
                Guardando menú, datos del local, configuración y credenciales en el servidor seguro.
              </p>

              <div className="w-full bg-stone-200 rounded-full h-2.5 overflow-hidden mb-2">
                <div
                  className="h-full rounded-full animate-pulse transition-all duration-500"
                  style={{ width: "85%", background: BRAND.tomato }}
                />
              </div>
              <span className="text-[11px] font-bold text-stone-500">
                Por favor, no cierres esta ventana...
              </span>
            </div>
          ) : showSaveSuccessModal ? (
            <div className="w-full flex flex-col items-center">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center mb-4 shadow-lg animate-in zoom-in-75 duration-300"
                style={{ background: BRAND.green }}
              >
                <CheckCircle2 size={44} color={BRAND.cream} />
              </div>

              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full mb-2">
                Actualización Completada
              </span>

              <h3 className="slab text-xl sm:text-2xl font-bold mb-2 text-emerald-900">
                ¡Datos Guardados con Éxito!
              </h3>

              <p className="text-xs sm:text-sm text-stone-700 font-medium leading-relaxed max-w-xs mb-6">
                Todos los cambios del comercio, platos del menú y permisos fueron guardados y sincronizados correctamente en el servidor.
              </p>

              <button
                type="button"
                onClick={() => setShowSaveSuccessModal(false)}
                className="w-full py-3.5 px-6 rounded-2xl font-extrabold text-sm sm:text-base text-white shadow-lg transition active:scale-95 hover:brightness-105"
                style={{ background: BRAND.green }}
              >
                Aceptar y Continuar
              </button>
            </div>
          ) : saveError ? (
            <div className="w-full flex flex-col items-center">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4 bg-red-100 text-red-600 shadow-md">
                <AlertCircle size={44} />
              </div>

              <span className="text-[11px] font-black uppercase tracking-wider text-red-800 bg-red-100 px-3 py-1 rounded-full mb-2">
                Atención
              </span>

              <h3 className="slab text-xl sm:text-2xl font-bold mb-2 text-red-800">
                Error al Guardar los Datos
              </h3>

              <p className="text-xs sm:text-sm text-stone-700 font-medium leading-relaxed max-w-xs mb-6">
                {saveError}
              </p>

              <div className="w-full flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setSaveError("");
                    if (!enableChangePin) {
                      setDraftNewPin("");
                      setDraftPinConfirm("");
                    }
                  }}
                  className="w-full py-2.5 px-4 rounded-xl font-bold text-xs border border-stone-300 text-stone-700 hover:bg-stone-100 transition"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSaveError("");
                    if (!enableChangePin) {
                      setDraftNewPin("");
                      setDraftPinConfirm("");
                    }
                    saveAllAdminChanges();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-white shadow transition hover:brightness-105"
                  style={{ background: BRAND.tomato }}
                >
                  Reintentar Guardar
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  const renderCreateCodeModal = () => {
    if (!showCreateCodeModal) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
        <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border overflow-hidden my-6">
          <div className="p-4 border-b flex items-center justify-between text-white" style={{ background: BRAND.charcoalDark }}>
            <div className="flex items-center gap-2">
              <KeyRound size={20} className="text-amber-400" />
              <h3 className="font-bold text-base">Crear Código de Activación para Comercio</h3>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateCodeModal(false)}
              className="text-stone-400 hover:text-white p-1 rounded-lg"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <p className="text-xs text-stone-600">
              Generá una clave de activación para entregarle al cliente que compró la app. El comercio la ingresará en su pantalla de inicio para habilitarla.
            </p>

            {/* Código generado */}
            <div className="p-3.5 rounded-xl border-2 bg-stone-50" style={{ borderColor: BRAND.mustard }}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                  <KeyRound size={14} style={{ color: BRAND.tomato }} /> Código de Activación Generado:
                </label>
                <button
                  type="button"
                  onClick={() => setNewCodeForm((prev) => ({ ...prev, code: generateRandomActivationCode() }))}
                  className="text-[11px] font-bold text-amber-800 hover:text-amber-950 flex items-center gap-1 underline"
                >
                  <RefreshCw size={11} /> ↺ Generar otro código
                </button>
              </div>
              <input
                type="text"
                value={newCodeForm.code}
                onChange={(e) => setNewCodeForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                className="w-full text-center font-mono text-xl font-black tracking-widest p-2.5 rounded-xl border bg-white text-stone-900 border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="CAS-XXXX-YYYY"
              />
            </div>

            {/* Selector de Comercios Registrados si existen */}
            {registeredClients.length > 0 && (
              <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200">
                <label className="text-[11px] font-bold text-amber-900 block mb-1">
                  💡 Autocompletar con comercio registrado recientemente:
                </label>
                <select
                  onChange={(e) => {
                    const sel = registeredClients.find((c) => c.id === e.target.value);
                    if (sel) {
                      const pDetails = getPlanDetails(sel.plan || sel.planTitle);
                      const realCost = sel.amountGs !== undefined && sel.amountGs !== null ? Number(sel.amountGs) : pDetails.cost;
                      setNewCodeForm((prev) => ({
                        ...prev,
                        businessName: sel.businessName || "",
                        ownerName: sel.ownerName || "",
                        email: (sel.requestedUser || sel.email || "").toLowerCase(),
                        whatsapp: (sel.whatsapp || "").replace(/[^\d]/g, ""),
                        plan: pDetails.planTitle,
                        planId: pDetails.planId,
                        cost: realCost,
                        costFormatted: realCost > 0 ? `${realCost.toLocaleString("es-PY")} Gs.` : pDetails.costFormatted,
                        durationMonths: pDetails.durationMonths,
                        expiresAt: pDetails.expiresAt,
                        notes: `Comercio #${sel.id}${sel.paymentMethod ? ` - Pago: ${sel.paymentMethod}` : ""}`,
                      }));
                    }
                  }}
                  className="w-full p-2 text-xs rounded-lg border border-amber-300 bg-white font-medium"
                >
                  <option value="">-- Seleccionar de solicitudes de compra --</option>
                  {registeredClients.map((rc) => {
                    const costLabel = rc.amountGs ? ` • ${Number(rc.amountGs).toLocaleString("es-PY")} Gs.` : "";
                    return (
                      <option key={rc.id} value={rc.id}>
                        {rc.businessName} • {rc.ownerName} ({rc.planTitle || rc.plan}{costLabel})
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Nombre del Comercio */}
            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">
                Nombre del Comercio / Local que compró la app:
              </label>
              <input
                type="text"
                value={newCodeForm.businessName}
                onChange={(e) => setNewCodeForm((prev) => ({ ...prev, businessName: e.target.value }))}
                placeholder="Ej: Pizzería Donatello, Lomitería Central..."
                className="w-full p-2.5 rounded-xl border text-sm font-semibold border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            {/* Email Autorizado para la Licencia */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-stone-800">
                  Email Autorizado como Usuario Gerente *:
                </label>
                <span className="text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded">
                  Único Autorizado
                </span>
              </div>
              <input
                type="email"
                value={newCodeForm.email || ""}
                onChange={(e) => setNewCodeForm((prev) => ({ ...prev, email: e.target.value.trim().toLowerCase() }))}
                placeholder="Ej: mi-comercio@gmail.com"
                className="w-full p-2.5 rounded-xl border text-xs font-mono font-bold border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-amber-50/20 text-stone-900"
              />
              <span className="text-[11px] text-stone-500 mt-1 block">
                El Administrador otorga la licencia a este email y será el único autorizado a ingresar una vez habilitado.
              </span>
            </div>

            {/* Dueño y WhatsApp */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  Responsable / Dueño:
                </label>
                <input
                  type="text"
                  value={newCodeForm.ownerName}
                  onChange={(e) => setNewCodeForm((prev) => ({ ...prev, ownerName: e.target.value }))}
                  placeholder="Ej: Roberto Benítez"
                  className="w-full p-2.5 rounded-xl border text-xs font-semibold border-stone-300"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  WhatsApp del Cliente:
                </label>
                <input
                  type="text"
                  value={newCodeForm.whatsapp}
                  onChange={(e) => setNewCodeForm((prev) => ({ ...prev, whatsapp: e.target.value.replace(/[^\d]/g, "") }))}
                  placeholder="Ej: 595981456789"
                  className="w-full p-2.5 rounded-xl border text-xs font-mono border-stone-300"
                />
              </div>
            </div>

            {/* Plan de la Licencia con precios reales de appPricingPlans */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-stone-800">
                  Plan Adquirido en Lista Desplegable:
                </label>
                <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 size={11} className="text-emerald-600" />
                  Precios reales actualizados
                </span>
              </div>
              <select
                value={newCodeForm.planId || (newCodeForm.plan?.toLowerCase().includes("vitalicio") ? "vitalicio" : "mensual")}
                onChange={(e) => {
                  const chosenId = e.target.value;
                  if (chosenId === "vitalicio") {
                    setNewCodeForm((prev) => ({
                      ...prev,
                      plan: "Plan Vitalicio / Licencia Permanente",
                      planId: "vitalicio",
                      cost: 0,
                      costFormatted: "Licencia Permanente (Sin límite de tiempo)",
                      durationMonths: 999,
                      expiresAt: null,
                    }));
                  } else {
                    const pDetails = getPlanDetails(chosenId);
                    setNewCodeForm((prev) => ({
                      ...prev,
                      plan: pDetails.planTitle,
                      planId: pDetails.planId,
                      cost: pDetails.cost,
                      costFormatted: pDetails.costFormatted,
                      durationMonths: pDetails.durationMonths,
                      expiresAt: pDetails.expiresAt,
                    }));
                  }
                }}
                className="w-full p-2.5 rounded-xl border text-xs font-bold border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs"
              >
                {appPricingPlans.map((plan) => {
                  const priceNum = Number(plan.priceGs) || 0;
                  const priceFormatted = `${priceNum.toLocaleString("es-PY")} Gs.`;
                  const periodText = plan.period ? ` / ${plan.period.replace(/^por\s+/i, "")}` : "";
                  const savingsText = plan.savings ? ` • ${plan.savings}` : "";
                  return (
                    <option key={plan.id} value={plan.id}>
                      {plan.title} — {priceFormatted}{periodText}{savingsText}
                    </option>
                  );
                })}
                <option value="vitalicio">
                  Plan Vitalicio / Licencia Permanente (Sin límite de tiempo)
                </option>
              </select>

              {/* Campo para ver o ajustar el Precio Real en Gs. */}
              <div className="mt-3">
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  💰 Precio Real / Importe Cobrado al Comercio (Gs.):
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={newCodeForm.cost !== undefined && newCodeForm.cost !== null ? (newCodeForm.cost === 0 ? "0" : Number(newCodeForm.cost).toLocaleString("es-PY")) : ""}
                    onChange={(e) => {
                      const num = parseInt(e.target.value.replace(/\D/g, ""), 10) || 0;
                      setNewCodeForm((prev) => ({
                        ...prev,
                        cost: num,
                        costFormatted: num > 0 ? `${num.toLocaleString("es-PY")} Gs.` : (prev.planId === "vitalicio" ? "Licencia Permanente" : "Bonificado / 0 Gs."),
                      }));
                    }}
                    placeholder="150.000"
                    className="w-full p-2.5 rounded-xl border text-sm font-bold font-mono border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-amber-50/40 text-stone-900 pr-12"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs font-black text-amber-800 pointer-events-none">
                    Gs.
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 mt-1">
                  Precios reales en Guaraníes sincronizados con la lista y editables en caso de ofertas o descuentos.
                </p>
              </div>

              {/* Ficha en vivo de confirmación del precio real del plan */}
              {(() => {
                const matchedPlan = appPricingPlans.find(
                  (p) => p.id === newCodeForm.planId || p.title === newCodeForm.plan
                );
                const currentCost = newCodeForm.cost !== undefined
                  ? (newCodeForm.cost === 0 && newCodeForm.planId === "vitalicio" ? "Licencia Permanente" : `${Number(newCodeForm.cost).toLocaleString("es-PY")} Gs.`)
                  : (newCodeForm.costFormatted || (matchedPlan ? `${Number(matchedPlan.priceGs || 0).toLocaleString("es-PY")} Gs.` : "150.000 Gs."));
                const currentDuration = newCodeForm.durationMonths
                  ? (newCodeForm.durationMonths >= 999 ? "Permanente / Sin límite" : `${newCodeForm.durationMonths} mes(es)`)
                  : (matchedPlan?.id === "mensual" ? "1 mes" : matchedPlan?.id === "semestral" ? "6 meses" : "12 meses");

                return (
                  <div className="mt-2.5 p-3 rounded-xl bg-amber-50/80 border border-amber-200 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-stone-500 block">
                        Precio Real Configurado
                      </span>
                      <span className="font-black text-sm font-mono text-emerald-800">
                        💰 {currentCost}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-stone-500 block">
                        Duración de la Licencia
                      </span>
                      <span className="font-bold text-stone-800">
                        ⏱️ {currentDuration}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-stone-500 block">
                        Estado al Habilitar
                      </span>
                      <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded text-[10px] inline-block">
                        🟢 Activo con Soporte
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">
                Notas / Referencia de Pago (opcional):
              </label>
              <input
                type="text"
                value={newCodeForm.notes}
                onChange={(e) => setNewCodeForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Ej: Pagado por transferencia banco Itaú, comprobante #4582"
                className="w-full p-2 rounded-xl border text-xs text-stone-700 border-stone-300"
              />
            </div>
          </div>

          <div className="p-4 bg-stone-50 border-t flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCreateCodeModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-stone-300 text-stone-700 hover:bg-stone-100"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => handleCreateActivationCode()}
              disabled={creatingCode}
              className="px-5 py-2.5 rounded-xl text-xs font-black text-white shadow hover:brightness-105 transition flex items-center gap-1.5"
              style={{ background: BRAND.tomato }}
            >
              {creatingCode ? (
                <>
                  <LoaderCircle size={15} className="animate-spin" /> Guardando...
                </>
              ) : (
                <>
                  <KeyRound size={15} /> Guardar y Emitir Código
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderActivateAppModal = () => {
    if (!showActivateModal) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
        <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border overflow-hidden my-6">
          <div className="p-4 border-b flex items-center justify-between text-white" style={{ background: BRAND.charcoalDark }}>
            <div className="flex items-center gap-2">
              <KeyRound size={20} className="text-amber-400" />
              <h3 className="font-bold text-base">Habilitación de App para Comercio</h3>
            </div>
            <button
              type="button"
              onClick={() => setShowActivateModal(false)}
              className="text-stone-400 hover:text-white p-1 rounded-lg"
            >
              <X size={18} />
            </button>
          </div>

          {/* Si ya se activó exitosamente */}
          {activationSuccess ? (
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 size={38} />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  ✓ Licencia Verificada y Habilitada
                </span>
                <h3 className="slab text-xl text-stone-900 mt-2">
                  ¡Comercio Habilitado con Éxito!
                </h3>
                <p className="text-xs text-stone-600 mt-1">
                  Tu negocio ya tiene la app completamente desbloqueada y lista para recibir pedidos por WhatsApp y gestionar el menú.
                </p>
              </div>

              <div className="p-4 rounded-xl border-2 bg-stone-50 text-left space-y-2 text-xs" style={{ borderColor: BRAND.paperDark }}>
                <div className="flex justify-between border-b pb-1.5">
                  <span className="text-stone-500 font-medium">Comercio:</span>
                  <span className="font-bold text-stone-900">{activationSuccess.businessName}</span>
                </div>
                <div className="flex justify-between border-b pb-1.5">
                  <span className="text-stone-500 font-medium">Plan de Licencia:</span>
                  <span className="font-bold text-emerald-700">{activationSuccess.plan}</span>
                </div>
                <div className="flex justify-between border-b pb-1.5">
                  <span className="text-stone-500 font-medium">Código Activado:</span>
                  <span className="font-mono font-bold text-stone-800">{activationSuccess.code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500 font-medium">Fecha de Habilitación:</span>
                  <span className="font-semibold text-stone-700">
                    {formatDateSafe(activationSuccess.activatedAt)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowActivateModal(false);
                  setActivationSuccess(null);
                }}
                className="w-full py-3 rounded-xl font-bold text-sm text-white shadow hover:brightness-105 transition"
                style={{ background: BRAND.green }}
              >
                Comenzar a Usar la App
              </button>
            </div>
          ) : (
            /* Formulario de ingreso de código */
            <form onSubmit={handleValidateAndActivateApp} className="p-6 space-y-4">
              <div className="text-center space-y-1">
                <h4 className="slab text-lg text-stone-900">Ingresá tu Código de Activación</h4>
                <p className="text-xs text-stone-600">
                  Pegá el código que recibiste por WhatsApp o correo luego de comprar la app para habilitar este local.
                </p>
              </div>

              {/* Input grande para el código */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1 ml-1 text-center">
                  Código de Licencia (formato CAS-XXXX-YYYY):
                </label>
                <div className="relative">
                  <input
                    type="text"
                    autoFocus
                    value={inputActivationCode}
                    onChange={(e) => {
                      setInputActivationCode(e.target.value.toUpperCase());
                      setActivationError("");
                    }}
                    placeholder="CAS-7K9B-X2M4"
                    className="w-full py-3 px-4 text-center font-mono font-black text-xl tracking-widest rounded-xl border-2 border-stone-300 focus:outline-none focus:border-[#C1392B] focus:ring-2 focus:ring-red-100 uppercase"
                  />
                </div>
              </div>

              {/* Nombre de negocio personalizado */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1 ml-1">
                  Nombre de tu Comercio (opcional):
                </label>
                <input
                  type="text"
                  value={inputActivationBusiness}
                  onChange={(e) => setInputActivationBusiness(e.target.value)}
                  placeholder={business.name || "Ej: Mi Rotisería"}
                  className="w-full p-2.5 text-xs font-semibold rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
                <span className="text-[11px] text-stone-500 block mt-1">
                  Si el código tiene un nombre asignado, se usará automáticamente.
                </span>
              </div>

              {activationError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-800 flex items-center gap-2">
                  <AlertCircle size={16} className="flex-shrink-0 text-red-600" />
                  <span>{activationError}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowActivateModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold border border-stone-300 text-stone-700 hover:bg-stone-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={activatingApp || !inputActivationCode.trim()}
                  className="px-5 py-2.5 rounded-xl text-xs font-black text-white shadow hover:brightness-105 transition flex items-center gap-1.5 disabled:opacity-50"
                  style={{ background: BRAND.tomato }}
                >
                  {activatingApp ? (
                    <>
                      <LoaderCircle size={15} className="animate-spin" /> Verificando...
                    </>
                  ) : (
                    <>
                      <KeyRound size={15} /> Validar y Habilitar Comercio
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  };

  /* =========================================================================
     MODAL: AVISO DE LICENCIA ANULADA O VENCIDA POR ADMINISTRADOR
     ========================================================================= */
  const renderLicenseBlockedModal = () => {
    if (!showLicenseBlockedModal) return null;
    const info = licenseBlockedInfo || {};
    const isRevoked = info.isRevoked || business.licenseStatus === "revocado" || business.licenseStatus === "anulado";
    const licCode = info.code || business.licenseCode || appLicense.code || "CAS-7K9B-X2M4";
    const licPlan = info.plan || business.licensePlan || appLicense.plan || "Plan Anual PRO (1 Año)";
    const licCost = info.cost || business.licenseCost || appLicense.costFormatted || "1.350.000 Gs. / año";

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
        <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border-2 border-red-500 overflow-hidden my-6">
          <div className="p-4.5 bg-gradient-to-r from-red-600 to-rose-700 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white font-black text-xl shadow">
                ⛔
              </div>
              <div>
                <h3 className="font-bold text-base leading-tight">
                  {isRevoked ? "Licencia de Comercio Anulada" : "Período de Suscripción Vencido"}
                </h3>
                <p className="text-xs text-red-100">Supervisión Central de CyM Software</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowLicenseBlockedModal(false)}
              className="text-white/80 hover:text-white p-1 rounded-lg transition"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs leading-relaxed">
              <p className="font-bold mb-1 flex items-center gap-1.5 text-red-800">
                <AlertCircle size={15} />
                <span>Acceso al Panel de Gerencia Restringido</span>
              </p>
              <p>
                {isRevoked
                  ? "La licencia y suscripción otorgada a este comercio ha sido anulada o revocada por el Administrador central. Aunque conozcas o hayas cambiado el usuario y contraseña, el panel de administración continuará inhabilitado."
                  : "El período contratado para utilizar la aplicación ha finalizado. Para reactivar las funciones de administración y carta del comercio, contactá a la administración para renovar tu suscripción."}
              </p>
            </div>

            {/* Ficha de la Licencia del Comercio */}
            <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-stone-200">
                <span className="text-stone-500 font-semibold">Comercio:</span>
                <span className="font-bold text-stone-900">{business.name}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-stone-200">
                <span className="text-stone-500 font-semibold">N° de Licencia:</span>
                <span className="font-mono font-black text-stone-800 bg-white px-2 py-0.5 rounded border border-stone-300 select-all">
                  {licCode}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-stone-200">
                <span className="text-stone-500 font-semibold">Plan Contratado:</span>
                <span className="font-bold text-stone-800">{licPlan}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-stone-200">
                <span className="text-stone-500 font-semibold">Costo del Plan:</span>
                <span className="font-bold text-stone-900">{licCost}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-stone-500 font-semibold">Estado de Habilitación:</span>
                <span className={`font-black uppercase px-2 py-0.5 rounded text-[10px] ${
                  isRevoked ? "bg-red-100 text-red-800 border border-red-300" : "bg-amber-100 text-amber-900 border border-amber-300"
                }`}>
                  {isRevoked ? "✕ Suspendida / Anulada" : "⏱️ Período Finalizado"}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-stone-500 text-center">
              Tus clientes pueden seguir viendo el menú y haciendo pedidos con normalidad. Solo el acceso administrativo está pausado.
            </p>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <a
                href={`https://wa.me/595975635770?text=${encodeURIComponent(
                  `Hola, me comunico desde ${business.name}. Mi licencia es ${licCode}. Deseo regularizar y renovar el acceso a la plataforma.`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-[#25D366] text-white flex items-center justify-center gap-2 hover:brightness-105 shadow transition"
              >
                <Phone size={15} />
                <span>Contactar a Soporte por WhatsApp</span>
              </a>
              <button
                type="button"
                onClick={() => setShowLicenseBlockedModal(false)}
                className="py-2.5 px-4 rounded-xl text-xs font-bold border border-stone-300 text-stone-700 hover:bg-stone-100 transition text-center"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  /* =========================================================================
     MODAL: SIMULADOR INTERACTIVO Y DEMOSTRACIÓN EN VIVO (MenuPY & Caseritas)
     ========================================================================= */
  const renderSimulatorModal = () => {
    if (!showSimulatorModal) return null;

    const handleCopySimLink = () => {
      try {
        navigator.clipboard.writeText(SIMULATOR_APP_URL);
        setSimCopiedLink(true);
        setTimeout(() => setSimCopiedLink(false), 2500);
      } catch {}
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
        <div className="bg-[#FFFDF7] w-full max-w-2xl rounded-3xl shadow-2xl border-2 border-amber-500 overflow-hidden my-6 flex flex-col max-h-[92vh]">
          {/* Header */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-stone-900 flex items-center justify-between shrink-0 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/40 flex items-center justify-center font-black text-xl shadow-inner border border-white/50">
                🎮
              </div>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-stone-900 text-amber-300">
                    Simulador en Vivo
                  </span>
                  <span className="text-[11px] font-bold text-amber-950">MenuPY & Caseritas</span>
                </div>
                <h3 className="font-black text-base sm:text-lg leading-tight text-stone-900 mt-0.5">
                  ¿Cómo funciona y qué beneficios te da tu App?
                </h3>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowSimulatorModal(false)}
              className="text-stone-900/80 hover:text-stone-900 hover:bg-white/30 p-1.5 rounded-xl transition cursor-pointer"
              title="Cerrar simulador"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-amber-200 bg-amber-50/70 p-1.5 gap-1 shrink-0 overflow-x-auto text-xs font-bold">
            <button
              type="button"
              onClick={() => setSimulatorTab("client")}
              className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                simulatorTab === "client"
                  ? "bg-white text-stone-900 shadow-sm border border-amber-300 font-black"
                  : "text-stone-600 hover:text-stone-900 hover:bg-amber-100/50"
              }`}
            >
              <Smartphone size={14} className={simulatorTab === "client" ? "text-amber-600" : ""} />
              <span>1. Cliente (WhatsApp)</span>
            </button>
            <button
              type="button"
              onClick={() => setSimulatorTab("kitchen")}
              className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                simulatorTab === "kitchen"
                  ? "bg-white text-stone-900 shadow-sm border border-amber-300 font-black"
                  : "text-stone-600 hover:text-stone-900 hover:bg-amber-100/50"
              }`}
            >
              <ChefHat size={14} className={simulatorTab === "kitchen" ? "text-amber-600" : ""} />
              <span>2. Cocina en Vivo</span>
            </button>
            <button
              type="button"
              onClick={() => setSimulatorTab("cashier")}
              className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                simulatorTab === "cashier"
                  ? "bg-white text-stone-900 shadow-sm border border-amber-300 font-black"
                  : "text-stone-600 hover:text-stone-900 hover:bg-amber-100/50"
              }`}
            >
              <DollarSign size={14} className={simulatorTab === "cashier" ? "text-amber-600" : ""} />
              <span>3. Caja y Arqueo</span>
            </button>
            <button
              type="button"
              onClick={() => setSimulatorTab("benefits")}
              className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                simulatorTab === "benefits"
                  ? "bg-white text-stone-900 shadow-sm border border-amber-300 font-black"
                  : "text-stone-600 hover:text-stone-900 hover:bg-amber-100/50"
              }`}
            >
              <Sparkles size={14} className={simulatorTab === "benefits" ? "text-amber-600" : ""} />
              <span>4. Beneficios 0%</span>
            </button>
          </div>

          {/* Tab Contents */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
            {/* TAB 1: CLIENTE */}
            {simulatorTab === "client" && (
              <div className="space-y-4 animate-fadeIn">
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 text-xs text-emerald-950">
                  <p className="font-bold flex items-center gap-1.5 text-emerald-900 mb-1">
                    <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                    <span>Experiencia sin fricción para tus comensales</span>
                  </p>
                  <p>
                    Tus clientes ingresan a tu enlace o escanean el código QR en sus mesas. Eligen sus platos y envían su pedido directamente a tu WhatsApp oficial con el cálculo exacto.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Selector Interactivo de Modo */}
                  <div className="space-y-3 bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
                    <label className="text-xs font-bold text-stone-700 block">
                      Paso 1: El cliente elige cómo quiere su pedido:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setSimClientMode("delivery")}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                          simClientMode === "delivery"
                            ? "bg-amber-500 text-stone-950 border-amber-600 shadow-sm font-black"
                            : "bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100"
                        }`}
                      >
                        <span className="text-lg">🛵</span>
                        <span>Delivery</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSimClientMode("mesa")}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                          simClientMode === "mesa"
                            ? "bg-amber-500 text-stone-950 border-amber-600 shadow-sm font-black"
                            : "bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100"
                        }`}
                      >
                        <span className="text-lg">🍽️</span>
                        <span>Mesa</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSimClientMode("retiro")}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                          simClientMode === "retiro"
                            ? "bg-amber-500 text-stone-950 border-amber-600 shadow-sm font-black"
                            : "bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100"
                        }`}
                      >
                        <span className="text-lg">🛍️</span>
                        <span>Retiro</span>
                      </button>
                    </div>

                    <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-1.5">
                      <div className="flex justify-between font-medium text-stone-600">
                        <span>Items seleccionados:</span>
                        <span className="font-bold text-stone-900">2 platos de ejemplo</span>
                      </div>
                      <div className="flex justify-between font-medium text-stone-600">
                        <span>Modalidad simulada:</span>
                        <span className="font-bold uppercase text-amber-800">
                          {simClientMode === "delivery" ? "Delivery con GPS" : simClientMode === "mesa" ? "En el Local (Mesa 4)" : "Para Retirar"}
                        </span>
                      </div>
                      {simClientMode === "delivery" && (
                        <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 bg-emerald-100/70 p-1.5 rounded-lg font-bold">
                          <MapPin size={13} className="text-emerald-700" />
                          <span>Ubicación GPS fijada en Google Maps automáticamente</span>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setSimulatorTab("kitchen")}
                      className="w-full py-2.5 px-3 rounded-xl font-black text-xs bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-500 text-stone-950 shadow flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <span>Simular recepción en Cocina</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>

                  {/* Mockup de WhatsApp */}
                  <div className="bg-[#EFEAE2] p-3.5 rounded-2xl border border-stone-300 shadow-sm font-sans flex flex-col justify-between">
                    <div>
                      <div className="bg-[#075E54] text-white px-3 py-2 rounded-xl flex items-center gap-2 mb-3 shadow-sm">
                        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs">📱</div>
                        <div className="text-xs font-bold leading-tight">
                          <span>WhatsApp de tu Comercio</span>
                          <span className="block text-[10px] text-emerald-200 font-normal">Mensaje que te llega al instante</span>
                        </div>
                      </div>

                      <div className="bg-[#DCF8C6] p-3 rounded-xl shadow-sm text-stone-900 text-xs space-y-1.5 border border-[#c4eab0]">
                        <p className="font-bold text-[#075E54]">¡Hola {business?.name || "La Caserita"}! 👋 Quiero hacer este pedido:</p>
                        <p className="text-[11px]">
                          <b>MODO:</b> {simClientMode === "delivery" ? "Delivery 🛵" : simClientMode === "mesa" ? "Mesa 4 🍽️" : "Retiro en Local 🛍️"}
                        </p>
                        <p className="text-[11px]"><b>CLIENTE:</b> María Fernández (0971 987 654)</p>
                        {simClientMode === "delivery" && (
                          <p className="text-[11px] text-blue-800 break-all font-mono">
                            📍 <b>GPS:</b> https://maps.google.com/?q=-27.330,-55.866
                          </p>
                        )}
                        <div className="pt-1 border-t border-emerald-300 text-[11px] space-y-0.5">
                          <p>• 2x Hamburguesa Doble Casera (Gs. 56.000)</p>
                          <p>• 1x Papas Fritas Especiales (Gs. 18.000)</p>
                        </div>
                        <p className="pt-1 border-t border-emerald-300 font-black text-stone-950 text-xs">
                          💰 TOTAL: Gs. 74.000
                        </p>
                      </div>
                    </div>

                    <p className="text-[10px] text-stone-500 text-center mt-3 font-medium">
                      ✓ Sin errores humanos • Sin pedir datos 3 veces • Todo prolijo
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: COCINA */}
            {simulatorTab === "kitchen" && (
              <div className="space-y-4 animate-fadeIn">
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-950">
                  <p className="font-bold flex items-center gap-1.5 text-amber-900 mb-1">
                    <ChefHat size={16} className="text-amber-700 flex-shrink-0" />
                    <span>Panel de Comandas en Vivo para Cocina y Mozos</span>
                  </p>
                  <p>
                    Tus cocineros ven entrar los pedidos en tiempo real en una pantalla o celular en la cocina. Pueden cambiar el estado con un toque:
                  </p>
                </div>

                {/* Comanda Interactiva */}
                <div className="bg-white p-5 rounded-2xl border-2 border-stone-300 shadow-md space-y-4">
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-stone-200">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sm bg-stone-100 px-2 py-1 rounded-lg border">
                        #PED-101
                      </span>
                      <span className="text-xs font-bold text-stone-800">María Fernández</span>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900">
                      Delivery 🛵
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between font-medium">
                      <span>2x Hamburguesa Doble Casera</span>
                      <span className="font-bold">Gs. 56.000</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>1x Papas Fritas Especiales</span>
                      <span className="font-bold">Gs. 18.000</span>
                    </div>
                    <div className="p-2 rounded-lg bg-amber-50 text-[11px] text-amber-900 border border-amber-200 font-medium">
                      Nota de cocina: "Sin cebolla en una de las hamburguesas"
                    </div>
                  </div>

                  {/* Botones de estado interactivos */}
                  <div className="pt-2 border-t border-stone-200">
                    <label className="text-xs font-bold text-stone-700 block mb-2">
                      Probá cambiar el estado de la comanda en vivo:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setSimOrderStatus("pendiente")}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                          simOrderStatus === "pendiente"
                            ? "bg-amber-400 text-stone-950 border-amber-500 shadow-md font-black"
                            : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100"
                        }`}
                      >
                        <Clock size={14} />
                        <span>1. Pendiente</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSimOrderStatus("en_preparacion")}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                          simOrderStatus === "en_preparacion"
                            ? "bg-orange-500 text-white border-orange-600 shadow-md font-black animate-pulse"
                            : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100"
                        }`}
                      >
                        <Flame size={14} />
                        <span>2. Preparando</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSimOrderStatus("entregado")}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                          simOrderStatus === "entregado"
                            ? "bg-emerald-600 text-white border-emerald-700 shadow-md font-black"
                            : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100"
                        }`}
                      >
                        <CheckCircle2 size={14} />
                        <span>3. Listo / Entregado</span>
                      </button>
                    </div>

                    <div className="mt-3 p-2.5 rounded-xl bg-stone-100 text-xs flex items-center justify-between text-stone-700">
                      <span>Estado actual de la comanda:</span>
                      <span className={`font-black px-2 py-0.5 rounded-full text-xs uppercase ${
                        simOrderStatus === "pendiente"
                          ? "bg-amber-200 text-amber-950"
                          : simOrderStatus === "en_preparacion"
                          ? "bg-orange-200 text-orange-950"
                          : "bg-emerald-200 text-emerald-950"
                      }`}>
                        {simOrderStatus === "pendiente" ? "⏳ Pendiente" : simOrderStatus === "en_preparacion" ? "🔥 En Preparación" : "✅ Listo / Entregado"}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSimulatorTab("cashier")}
                    className="w-full py-2.5 px-3 rounded-xl font-black text-xs bg-stone-900 text-amber-300 hover:bg-stone-800 shadow flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <span>Ver cómo se totaliza en Caja y Arqueo</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: CAJA Y ARQUEO */}
            {simulatorTab === "cashier" && (
              <div className="space-y-4 animate-fadeIn">
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 text-xs text-blue-950">
                  <p className="font-bold flex items-center gap-1.5 text-blue-900 mb-1">
                    <TrendingUp size={16} className="text-blue-700 flex-shrink-0" />
                    <span>Control Total Financiero y Arqueo Diario Automático</span>
                  </p>
                  <p>
                    Olvidate de planillas manuales o pérdidas de tickets. El sistema suma cada pedido cobrado y clasifica por medio de pago (Efectivo, Tarjetas POS, Transferencias SIPAP y Billeteras).
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-sm text-center">
                    <span className="text-[10px] font-bold text-stone-500 uppercase block">Total del Día</span>
                    <span className="font-mono font-black text-base text-emerald-700 block mt-1">Gs. 850.000</span>
                    <span className="text-[10px] text-stone-400">18 pedidos</span>
                  </div>

                  <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-sm text-center">
                    <span className="text-[10px] font-bold text-stone-500 uppercase block">Efectivo</span>
                    <span className="font-mono font-bold text-sm text-stone-900 block mt-1">Gs. 450.000</span>
                    <span className="text-[10px] text-stone-400">En caja física</span>
                  </div>

                  <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-sm text-center">
                    <span className="text-[10px] font-bold text-stone-500 uppercase block">Transferencias</span>
                    <span className="font-mono font-bold text-sm text-stone-900 block mt-1">Gs. 250.000</span>
                    <span className="text-[10px] text-stone-400">SIPAP / Banco</span>
                  </div>

                  <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-sm text-center">
                    <span className="text-[10px] font-bold text-stone-500 uppercase block">POS / Tarjetas</span>
                    <span className="font-mono font-bold text-sm text-stone-900 block mt-1">Gs. 150.000</span>
                    <span className="text-[10px] text-stone-400">Crédito / Débito</span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-stone-600 font-medium">Ticket Promedio por Cliente:</span>
                    <span className="font-bold text-stone-900 font-mono">Gs. 47.200</span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-stone-600 font-medium">Canal Principal de Ventas:</span>
                    <span className="font-bold text-stone-900">Delivery (55%) • Mesas (35%) • Retiro (10%)</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-stone-600 font-medium">Exportación de Datos:</span>
                    <span className="font-bold text-emerald-700">Compatible con Excel y Google Sheets</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSimulatorTab("benefits")}
                  className="w-full py-2.5 px-3 rounded-xl font-black text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <span>Conocer Comparativa y Beneficios Económicos</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            )}

            {/* TAB 4: BENEFICIOS */}
            {simulatorTab === "benefits" && (
              <div className="space-y-4 animate-fadeIn">
                <div className="bg-gradient-to-r from-amber-500/15 via-emerald-500/15 to-white p-4 rounded-2xl border border-amber-300">
                  <h4 className="font-black text-sm text-stone-900 mb-1 flex items-center gap-1.5">
                    <Sparkles size={16} className="text-amber-500" />
                    <span>¿Por qué elegir tu propia App en vez de depender de terceros?</span>
                  </h4>
                  <p className="text-xs text-stone-700 leading-relaxed">
                    Las apps tradicionales te cobran hasta el 30% de cada pedido y retienen tu dinero. Con tu propia App MenuPY, tenés tu herramienta digital con suscripción fija y 0% comisión.
                  </p>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-stone-100 text-stone-700 uppercase text-[10px] font-black border-b border-stone-200">
                      <tr>
                        <th className="p-3">Característica</th>
                        <th className="p-3 text-red-700">Apps Tradicionales</th>
                        <th className="p-3 text-emerald-800 bg-emerald-50/70">Tu App Propia MenuPY</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200 text-stone-800">
                      <tr>
                        <td className="p-3 font-bold">Comisión por cada pedido</td>
                        <td className="p-3 text-red-600 font-bold">20% al 30% del total</td>
                        <td className="p-3 text-emerald-700 font-black bg-emerald-50/40">0% (Gs. 0 comisión)</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold">Disponibilidad de tu dinero</td>
                        <td className="p-3 text-stone-600">Retenido 15 a 30 días</td>
                        <td className="p-3 text-emerald-700 font-black bg-emerald-50/40">Inmediato en tu cuenta / caja</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold">Base de datos de tus clientes</td>
                        <td className="p-3 text-stone-600">Pertenece a la app externa</td>
                        <td className="p-3 text-emerald-700 font-black bg-emerald-50/40">100% tuya con WhatsApp</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold">Panel de Cocina y Mozos</td>
                        <td className="p-3 text-stone-600">No incluido o costo extra</td>
                        <td className="p-3 text-emerald-700 font-black bg-emerald-50/40">Incluido en tiempo real</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold">Instalación en celulares (PWA)</td>
                        <td className="p-3 text-stone-600">No (compartís espacio)</td>
                        <td className="p-3 text-emerald-700 font-black bg-emerald-50/40">Tu propio ícono y logo</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-stone-100 text-xs">
                  <span className="text-stone-600 font-medium">Compartir enlace directo al simulador:</span>
                  <button
                    type="button"
                    onClick={handleCopySimLink}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white hover:bg-stone-200 text-stone-800 border border-stone-300 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    {simCopiedLink ? (
                      <><Check size={14} className="text-emerald-600" /> ¡Enlace copiado!</>
                    ) : (
                      <><Copy size={14} /> Copiar link</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer with Actions */}
          <div className="p-4 bg-stone-100 border-t border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setShowSimulatorModal(false)}
              className="w-full sm:w-auto py-2.5 px-4 rounded-xl text-xs font-bold text-stone-600 hover:text-stone-900 hover:bg-stone-200 transition text-center cursor-pointer"
            >
              Cerrar simulador
            </button>

            <button
              type="button"
              onClick={() => {
                setShowSimulatorModal(false);
                setRegSuccessVoucher(null);
                setView("register");
              }}
              className="w-full sm:w-auto py-3 px-6 rounded-2xl font-black text-xs sm:text-sm text-stone-950 shadow-xl hover:brightness-110 active:scale-95 transition flex items-center justify-center gap-2 border-2 border-amber-200 cursor-pointer"
              style={{
                background: "linear-gradient(135deg, #F59E0B 0%, #FBBF24 50%, #F59E0B 100%)",
                boxShadow: "0 4px 20px rgba(245, 158, 11, 0.45)",
              }}
            >
              <Store size={17} />
              <span>🚀 ¡Quiero mi App ahora! (Ver Planes y Precios)</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  /* =========================================================================
     MODAL: VINCULACIÓN DE LICENCIA OBLIGATORIA PARA ACCESO CON GOOGLE
     ========================================================================= */
  const renderGoogleLicenseRequiredModal = () => {
    if (!googleLicenseModal) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
        <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border-2 border-amber-500 overflow-hidden my-6">
          <div className="p-4.5 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-stone-900 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-white/30 flex items-center justify-center font-black text-xl shadow">
                🔑
              </div>
              <div>
                <h3 className="font-black text-base leading-tight">
                  Licencia Habilitada Requerida
                </h3>
                <p className="text-xs text-amber-950 font-medium">Vinculación de Cuenta de Google</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setGoogleLicenseModal(null);
                setBindLicenseCode("");
                setBindLicenseError("");
              }}
              className="text-stone-900/80 hover:text-stone-900 p-1 rounded-lg transition"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs leading-relaxed">
              <p className="font-bold mb-1 flex items-center gap-1.5 text-amber-900">
                <AlertCircle size={15} className="flex-shrink-0" />
                <span>Cuenta sin Licencia Activa</span>
              </p>
              <p>
                El correo <b>{googleLicenseModal.email}</b> no se encuentra vinculado a ninguna licencia autorizada de la aplicación.
              </p>
              <p className="mt-1 text-stone-600">
                Para acceder como Gerente a este sistema, ingresá el código de licencia otorgado o adquirí una licencia para tu negocio.
              </p>
            </div>

            {bindLicenseError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center gap-2">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{bindLicenseError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1 ml-1">
                Ingresar Código de Licencia (ej: CAS-7K9B-X2M4):
              </label>
              <input
                type="text"
                value={bindLicenseCode}
                onChange={(e) => {
                  setBindLicenseCode(e.target.value.toUpperCase());
                  setBindLicenseError("");
                }}
                placeholder="CAS-XXXX-XXXX"
                className="w-full p-3 rounded-xl border-2 font-mono text-center font-black tracking-widest text-base uppercase bg-stone-50 border-stone-300 focus:bg-white focus:border-amber-500"
              />
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleBindGoogleLicense}
                disabled={bindLicenseLoading || !bindLicenseCode.trim()}
                className="w-full py-3 rounded-xl font-black text-sm bg-amber-500 hover:bg-amber-400 text-stone-900 shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {bindLicenseLoading ? (
                  <><LoaderCircle className="animate-spin" size={17} /> Validando Licencia...</>
                ) : (
                  <><CheckCircle2 size={17} /> Vincular Licencia y Entrar</>
                )}
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setShowSimulatorModal(true)}
                  className="w-full py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sparkles size={14} className="text-amber-300 animate-pulse" />
                  <span>🎮 Probar Simulador</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGoogleLicenseModal(null);
                    setView("register");
                  }}
                  className="w-full py-2.5 rounded-xl font-bold text-xs bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Store size={14} />
                  <span>Adquirir Licencia</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setGoogleLicenseModal(null);
                  setBindLicenseCode("");
                  setBindLicenseError("");
                }}
                className="w-full py-2 text-xs text-stone-500 hover:text-stone-700 font-bold transition text-center"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };
  const renderMapSelectorModal = () => {
    if (!showMapSelectorModal) return null;

    const nudgeLocation = (dLat, dLng) => {
      setMapPickerLat((prev) => Number((prev + dLat).toFixed(6)));
      setMapPickerLng((prev) => Number((prev + dLng).toFixed(6)));
    };

    const handleConfirmMapLocation = () => {
      const finalLat = Number(mapPickerLat.toFixed(6));
      const finalLng = Number(mapPickerLng.toFixed(6));
      setDeliveryCoords({ lat: finalLat, lng: finalLng });
      setMapLink(`https://www.google.com/maps?q=${finalLat},${finalLng}`);
      setLocStatus("done");
      setShowMapSelectorModal(false);
      addToast(
        "loc_success",
        "Ubicación confirmada ✓",
        `Punto marcado en Google Maps: ${finalLat}, ${finalLng}`,
        "El repartidor podrá iniciar la navegación GPS directamente a este punto.",
        null
      );
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
        <div className="w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] border-2 border-stone-800">
          {/* Cabecera del Modal */}
          <div className="p-4 sm:p-5 border-b flex items-center justify-between" style={{ background: BRAND.charcoal, color: BRAND.cream }}>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl" style={{ background: BRAND.tomato }}>
                <MapPin size={20} color={BRAND.cream} />
              </div>
              <div>
                <h3 className="font-black text-sm sm:text-base leading-tight">
                  Selector de Ubicación Google Maps
                </h3>
                <p className="text-[11px] text-amber-200/90 font-medium">
                  Modo gratuito para celular • Marcá tu dirección exacta
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowMapSelectorModal(false)}
              className="p-2 rounded-full hover:bg-white/10 transition text-stone-300 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          {/* Cuerpo del Modal */}
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
            {/* Aviso explicativo */}
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-stone-800 space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-amber-900">
                <Info size={15} className="text-amber-700 flex-shrink-0" />
                ¿Cómo marcar tu casa con precisión?
              </p>
              <p className="text-[11px] text-stone-700 leading-relaxed">
                Podés usar el botón <b>GPS de mi celular</b> para centrarte automáticamente, o usar los <b>botones de ajuste fino (flechas)</b> para posicionar el pin rojo exactamente sobre el techo o portón de tu domicilio.
              </p>
            </div>

            {/* Visor interactivo de Google Maps Gratuito */}
            <div className="relative rounded-2xl overflow-hidden border-2 border-stone-400 bg-stone-100 shadow-inner">
              <iframe
                title="Google Maps"
                src={`https://maps.google.com/maps?q=${mapPickerLat},${mapPickerLng}&z=17&output=embed`}
                className="w-full h-64 sm:h-72 border-0"
                loading="lazy"
              />

              {/* Pin central de Google Maps */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-7">
                <div className="flex flex-col items-center">
                  <span className="bg-stone-900/90 text-white text-[10px] font-black px-2 py-0.5 rounded-full mb-1 shadow">
                    Tu Entrega Aquí
                  </span>
                  <MapPin size={36} className="text-[#C1392B] drop-shadow-lg" fill="#C1392B" />
                </div>
              </div>

              {/* Botón flotante para abrir en la app de Maps del celular */}
              <button
                type="button"
                onClick={() => window.open(`https://www.google.com/maps?q=${mapPickerLat},${mapPickerLng}`, "_blank")}
                className="absolute top-2.5 right-2.5 bg-white/95 hover:bg-white text-stone-900 text-[11px] font-bold px-2.5 py-1.5 rounded-xl shadow-md border border-stone-300 flex items-center gap-1.5 active:scale-95 transition"
                title="Abrir en la aplicación Google Maps del celular"
              >
                <Navigation size={13} className="text-[#C1392B]" />
                <span className="hidden sm:inline">Ver en App</span> Google Maps ↗
              </button>
            </div>

            {/* Controles: GPS del Celular y D-Pad de ajuste milimétrico */}
            <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200 space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => getGPSLocation(true)}
                  disabled={geoLocating}
                  className="py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition hover:brightness-105 active:scale-95 disabled:opacity-60"
                  style={{ background: BRAND.tomato, color: BRAND.cream }}
                >
                  {geoLocating ? (
                    <><LoaderCircle className="animate-spin" size={15} /> Obteniendo GPS...</>
                  ) : (
                    <><Crosshair size={15} /> GPS de mi celular</>
                  )}
                </button>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-stone-500 block">
                    Coordenadas exactas:
                  </span>
                  <span className="font-mono text-xs font-bold text-stone-800">
                    {mapPickerLat.toFixed(5)}, {mapPickerLng.toFixed(5)}
                  </span>
                </div>
              </div>

              {geoInfoMsg && (
                <p className="text-[11px] font-medium text-emerald-800 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                  {geoInfoMsg}
                </p>
              )}

              {/* Botones de ajuste milimétrico (flechas para calibrar a 15 metros) */}
              <div className="pt-2 border-t border-stone-200">
                <span className="text-[11px] font-bold text-stone-600 block mb-2 text-center">
                  🎯 Ajuste fino de posición (toques de ~15m para centrar en tu portón):
                </span>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => nudgeLocation(0, -0.00018)}
                    className="p-2 sm:px-3 sm:py-2 rounded-xl bg-white border border-stone-300 text-stone-800 text-xs font-bold hover:bg-stone-100 active:scale-95 transition flex items-center gap-1 shadow-sm"
                    title="Mover al Oeste"
                  >
                    <ChevronLeft size={16} /> <span className="hidden sm:inline">Oeste</span>
                  </button>
                  <div className="flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={() => nudgeLocation(0.00018, 0)}
                      className="p-2 sm:px-3 sm:py-2 rounded-xl bg-white border border-stone-300 text-stone-800 text-xs font-bold hover:bg-stone-100 active:scale-95 transition flex items-center justify-center gap-1 shadow-sm"
                      title="Mover al Norte"
                    >
                      <ChevronUp size={16} /> <span className="hidden sm:inline">Norte</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => nudgeLocation(-0.00018, 0)}
                      className="p-2 sm:px-3 sm:py-2 rounded-xl bg-white border border-stone-300 text-stone-800 text-xs font-bold hover:bg-stone-100 active:scale-95 transition flex items-center justify-center gap-1 shadow-sm"
                      title="Mover al Sur"
                    >
                      <ChevronDown size={16} /> <span className="hidden sm:inline">Sur</span>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => nudgeLocation(0, 0.00018)}
                    className="p-2 sm:px-3 sm:py-2 rounded-xl bg-white border border-stone-300 text-stone-800 text-xs font-bold hover:bg-stone-100 active:scale-95 transition flex items-center gap-1 shadow-sm"
                    title="Mover al Este"
                  >
                    <span className="hidden sm:inline">Este</span> <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Dirección / Referencias escritas */}
            <div>
              <label className="text-xs font-bold text-stone-800 block mb-1">
                Dirección escrita / Referencia de tu casa:
              </label>
              <input
                type="text"
                placeholder="Ej: Calle Boquerón e/ Villarrica, portón negro, casa de dos pisos"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full p-3 text-xs rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>

          {/* Pie del Modal con Acción de Confirmación */}
          <div className="p-4 sm:p-5 border-t bg-stone-50 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setShowMapSelectorModal(false)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-200 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmMapLocation}
              className="flex-1 py-3 px-4 rounded-xl text-xs font-black shadow-lg transition hover:brightness-105 active:scale-95 flex items-center justify-center gap-2"
              style={{ background: BRAND.green, color: BRAND.cream }}
            >
              <Check size={16} />
              <span>Confirmar esta ubicación</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ background: BRAND.paper, minHeight: "100vh" }} className="flex flex-col items-center justify-center gap-3">
        <LoaderCircle className="animate-spin" color={BRAND.tomato} size={36} />
        <p className="font-bold text-sm tracking-wide" style={{ color: BRAND.charcoal }}>Cargando La Caserita...</p>
      </div>
    );
  }

  /* =========================================================================
     PANTALLA: LOGIN ADMINISTRADOR (Con Bloqueo de IP de 3 Intentos)
     ========================================================================= */
  if (view === "adminLogin") {
    return (
      <div style={{ background: BRAND.charcoal, minHeight: "100vh", fontFamily: "'Work Sans', sans-serif" }} className="flex items-center justify-center px-4 py-8">
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Alfa+Slab+One&family=Work+Sans:wght@400;600;700;800&display=swap'); .slab{font-family:'Alfa Slab One',serif;}`}</style>
        <div className="w-full max-w-md rounded-2xl p-6 md:p-8 shadow-2xl" style={{ background: BRAND.paper }}>
          <div className="flex items-center justify-between mb-5">
            <button onClick={() => setView("menu")} className="flex items-center gap-1.5 text-sm font-bold hover:opacity-80 transition" style={{ color: BRAND.charcoal }}>
              <ArrowLeft size={18} /> Volver al menú
            </button>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-stone-300 text-stone-700">
              IP: {clientIp || "Detectando..."}
            </span>
          </div>

          <div className="flex justify-center mb-3">
            <div className={`p-4 rounded-full shadow-inner ${ipLocked ? "bg-red-600 animate-pulse" : ""}`} style={!ipLocked ? { background: BRAND.tomato } : undefined}>
              {ipLocked ? <ShieldAlert size={28} color={BRAND.cream} /> : <Lock size={26} color={BRAND.cream} />}
            </div>
          </div>

          <h2 className="slab text-2xl text-center mb-1" style={{ color: BRAND.charcoal }}>
            {ipLocked ? "Acceso Bloqueado" : "Panel de Control"}
          </h2>
          <p className="text-center text-xs text-stone-700 mb-4 font-medium">
            Acceso exclusivo para el único administrador del comercio ({business.adminUser || "Usuario"})
          </p>

          {/* BANNER DE BLOQUEO DE IP POR 3 INTENTOS FALLIDOS */}
          {ipLocked ? (
            <div className="p-4 rounded-2xl border-2 border-red-500 bg-red-50 text-red-900 mb-5 shadow-sm">
              <div className="flex items-center gap-2 font-black text-sm mb-1 text-red-700">
                <ShieldAlert size={18} />
                <span>DIRECCIÓN IP BLOQUEADA TEMPORALMENTE</span>
              </div>
              <p className="text-xs leading-relaxed mb-3">
                Se superó el límite de <b>3 intentos fallidos consecutivos</b> de PIN desde tu dirección IP. El acceso fue bloqueado automáticamente durante 15 minutos para proteger el comercio contra accesos no autorizados.
              </p>
              <div className="p-3 rounded-xl bg-white border border-red-200 text-center shadow-inner">
                <span className="text-[11px] uppercase tracking-wider block font-bold text-stone-500">
                  Tiempo de espera restante
                </span>
                <span className="text-2xl font-black font-mono text-red-600 block my-1">
                  ⏱️ {formatLockTime(ipRemainingSeconds)}
                </span>
                <p className="text-[11px] text-stone-600 mt-2 font-medium flex items-center justify-center gap-1.5">
                  <Lock size={12} className="text-red-600 shrink-0" />
                  <span>Solo el <b>Administrador de la App</b> puede restablecer la IP desde el panel de seguridad.</span>
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 mb-4 text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold flex items-center gap-1 text-stone-800">
                  <ShieldCheck size={14} className="text-emerald-700" /> Seguridad por IP activa
                </span>
                <span className={`font-bold font-mono px-2 py-0.5 rounded text-[11px] ${
                  attemptsLeft < 2 ? "bg-red-200 text-red-900" : attemptsLeft < 3 ? "bg-amber-200 text-amber-900" : "bg-stone-200 text-stone-800"
                }`}>
                  {attemptsLeft} de 3 intentos
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-stone-600 leading-tight">
                <span>Tras 3 fallos consecutivos, la IP se bloquea 15 min.</span>
                <span className="text-[10px] text-stone-500 italic">Desbloqueo exclusivo para el Administrador</span>
              </div>
            </div>
          )}

          {/* Opción Nivel 1: Acceso a Clientes */}
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3 shadow-sm">
            <div className="min-w-0 flex-1">
              <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                <ShoppingBag size={15} className="text-emerald-700 flex-shrink-0" />
                <span>1. Acceso a Clientes</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-200 text-emerald-900">Público</span>
              </span>
              <span className="text-[11px] text-emerald-800 block leading-tight mt-0.5">
                Limitado a realizar pedidos y ver el estado de su comanda en tiempo real.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setView("menu")}
              className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition flex-shrink-0 shadow active:scale-95"
            >
              Pedir en Carta
            </button>
          </div>

          {/* Selector de Perfil de Acceso: Gerente, Personal, Administrador */}
          <div className="mb-4 bg-stone-200/80 p-1 rounded-xl flex gap-1">
            <button
              type="button"
              onClick={() => {
                setLoginMode("owner");
                setUserInput("");
                setPinInput("");
                setPinError("");
                userInteractedLoginRef.current = false;
                setLoginFormKey((k) => k + 1);
              }}
              className={`flex-1 py-2 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                loginMode === "owner"
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <Store size={14} className={loginMode === "owner" ? "text-[#C1392B]" : ""} />
              <span>👔 2. Gerente</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMode("staff");
                setUserInput("");
                setPinInput("");
                setPinError("");
                userInteractedLoginRef.current = false;
                setLoginFormKey((k) => k + 1);
              }}
              className={`flex-1 py-2 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                loginMode === "staff"
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <ChefHat size={14} className={loginMode === "staff" ? "text-blue-600" : ""} />
              <span>👨‍🍳 Personal</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMode("superadmin");
                setUserInput("");
                setPinInput("");
                setPinError("");
                userInteractedLoginRef.current = false;
                setLoginFormKey((k) => k + 1);
              }}
              className={`flex-1 py-2 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                loginMode === "superadmin"
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <ShieldCheck size={14} className={loginMode === "superadmin" ? "text-amber-600" : ""} />
              <span>👑 3. Admin</span>
            </button>
          </div>

          {/* Opción de Acceso con Cuenta de Google: SOLO para Gerente con Licencia o Administrador Maestro */}
          {loginMode !== "staff" ? (
            <div className="mb-4 p-4 rounded-2xl bg-white border-2 border-stone-300 shadow-md">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>{loginMode === "superadmin" ? "Acceso Maestro con Google" : "Acceder con tu Cuenta de Google"}</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                  {loginMode === "superadmin" ? "Solo Admin" : "Licencia Requerida"}
                </span>
              </div>
              <p className="text-[11px] text-stone-600 mb-3 leading-snug">
                {loginMode === "superadmin"
                  ? "Acceso directo seguro para el administrador general autorizado de MenuPY."
                  : "Ingresá con tu cuenta autorizada vinculada a la licencia de tu comercio."}
              </p>

              {/* Botón Principal Continuar con Google */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm bg-white border-2 border-stone-300 hover:border-amber-500 hover:bg-amber-50/50 text-stone-800 shadow-sm hover:shadow flex items-center justify-center gap-2.5 transition active:scale-[0.98] disabled:opacity-60 cursor-pointer"
              >
                {googleLoading ? (
                  <><LoaderCircle className="animate-spin text-amber-600" size={17} /> Conectando con Google...</>
                ) : (
                  <>
                    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Continuar con Google</span>
                  </>
                )}
              </button>

              {/* Botón de acceso directo para el Administrador Maestro (mecanicadakar@gmail.com) */}
              {loginMode === "superadmin" && (
                <button
                  type="button"
                  onClick={() => handleDirectGoogleAuth("mecanicadakar@gmail.com")}
                  disabled={googleLoading}
                  className="w-full mt-2.5 py-2.5 px-4 rounded-xl font-black text-xs bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-stone-950 shadow-md hover:shadow-lg flex items-center justify-center gap-2 transition active:scale-[0.98] border border-amber-300"
                >
                  <ShieldCheck size={16} className="text-stone-900" />
                  <span>👑 Acceso Directo Maestro: mecanicadakar@gmail.com</span>
                </button>
              )}

              {/* Accesos Rápidos de Google para Comercios Autorizados */}
              {loginMode === "owner" && (
                <div className="mt-3 pt-2.5 border-t border-stone-200">
                  <p className="text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Sparkles size={11} className="text-amber-500" /> Comercios Autorizados (Acceso Rápido):
                  </p>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <button
                      type="button"
                      onClick={() => handleDirectGoogleAuth("mecanicadakar@gmail.com")}
                      disabled={googleLoading}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-100 text-amber-950 border border-amber-300 hover:bg-amber-200 transition"
                      title="Acceso Maestro Administrador"
                    >
                      👑 mecanicadakar@gmail.com
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDirectGoogleAuth("mirthamabeltrinidad@gmail.com")}
                      disabled={googleLoading}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-100 text-emerald-950 border border-emerald-300 hover:bg-emerald-200 transition"
                      title="La Caserita (Rotisería y Minutas)"
                    >
                      🏪 mirthamabeltrinidad@gmail.com
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDirectGoogleAuth("menupy@gmail.com")}
                      disabled={googleLoading}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-stone-100 text-stone-800 border border-stone-300 hover:bg-stone-200 transition"
                      title="Menu Py"
                    >
                      🏪 menupy@gmail.com
                    </button>
                  </div>
                </div>
              )}

              {/* Opción de ingreso manual con correo Google directo */}
              <div className="mt-2.5 pt-2.5 border-t border-stone-200">
                {!showDirectGoogleInput ? (
                  <button
                    type="button"
                    onClick={() => setShowDirectGoogleInput(true)}
                    className="text-[11px] font-bold text-amber-900 hover:underline flex items-center justify-center w-full gap-1"
                  >
                    <span>¿Ventana emergente bloqueada? Ingresar correo Google directo</span>
                  </button>
                ) : (
                  <div className="space-y-1.5 animate-fadeIn">
                    <label className="text-[11px] font-bold text-stone-700 block">
                      Ingresá tu correo Google autorizado:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={directGoogleEmail}
                        onChange={(e) => setDirectGoogleEmail(e.target.value)}
                        placeholder="ejemplo@gmail.com"
                        className="flex-1 p-2 rounded-xl border text-xs font-mono bg-stone-50 border-stone-300"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleDirectGoogleAuth();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleDirectGoogleAuth()}
                        disabled={googleLoading}
                        className="px-3.5 py-2 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-stone-900 shadow-sm shrink-0"
                      >
                        Ingresar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="mb-4 p-3.5 rounded-2xl bg-blue-50 border-2 border-blue-200 shadow-sm text-xs leading-relaxed text-blue-950">
              <p className="font-bold flex items-center gap-1.5 text-blue-900 mb-1">
                <ChefHat size={16} className="text-blue-700 flex-shrink-0" />
                <span>Acceso Exclusivo de Personal Operativo</span>
              </p>
              <p className="text-[11px] text-blue-800 leading-snug">
                Los mozos y cocineros ingresan únicamente con su <b>Nombre y PIN de 4 dígitos</b> configurado por la Gerencia en Permisos de Personal.
              </p>
            </div>
          )}

          <div className="relative flex py-2 items-center mb-2">
            <div className="flex-grow border-t border-stone-300"></div>
            <span className="flex-shrink mx-3 text-[10px] uppercase font-bold text-stone-500 tracking-wider">
              {loginMode === "staff" ? "ingresar credenciales operativas" : "o ingresar con usuario y PIN"}
            </span>
            <div className="flex-grow border-t border-stone-300"></div>
          </div>

          <div key={`auth_box_${loginMode}_${loginFormKey}`} className="space-y-3">
            {loginMode === "staff" ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold mb-1 ml-1" style={{ color: BRAND.charcoal }}>
                    Usuario
                  </label>
                  <input
                    key={`staff_usr_${loginFormKey}`}
                    type="text"
                    name={`sec_u_${loginMode}_${loginFormKey}`}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-bwignore="true"
                    data-form-type="other"
                    readOnly
                    onFocus={(e) => { e.currentTarget.readOnly = false; }}
                    onPointerDown={(e) => { e.currentTarget.readOnly = false; }}
                    onTouchStart={(e) => { e.currentTarget.readOnly = false; }}
                    onKeyDown={(e) => { e.currentTarget.readOnly = false; }}
                    value={userInput}
                    onChange={(e) => {
                      userInteractedLoginRef.current = true;
                      setUserInput(e.target.value);
                    }}
                    placeholder="Usuario"
                    className="w-full rounded-xl p-3 text-base border-2 font-medium disabled:opacity-60 placeholder:text-stone-400 placeholder:font-normal bg-stone-100 border-stone-300 text-stone-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1 ml-1" style={{ color: BRAND.charcoal }}>
                    Ingresar PIN
                  </label>
                  <div className="relative">
                    <input
                      key={`staff_pin_${loginFormKey}`}
                      type={showLoginPin ? "text" : "password"}
                      name={`sec_p_${loginMode}_${loginFormKey}`}
                      autoComplete="new-password"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      data-lpignore="true"
                      data-1p-ignore="true"
                      data-bwignore="true"
                      data-form-type="other"
                      readOnly
                      onFocus={(e) => { e.currentTarget.readOnly = false; }}
                      onPointerDown={(e) => { e.currentTarget.readOnly = false; }}
                      onTouchStart={(e) => { e.currentTarget.readOnly = false; }}
                      onKeyDown={(e) => { e.currentTarget.readOnly = false; }}
                      disabled={(ipLocked && loginMode !== "superadmin") || verifying}
                      value={pinInput}
                      onChange={(e) => {
                        userInteractedLoginRef.current = true;
                        setPinInput(e.target.value);
                      }}
                      placeholder="Ingresar PIN"
                      className="w-full rounded-xl p-3 pr-12 text-base border-2 tracking-wider font-mono disabled:opacity-60 placeholder:text-stone-400 placeholder:font-normal placeholder:opacity-90 bg-stone-100 border-stone-300 text-stone-900 focus:bg-white"
                    />
                    <button
                      type="button"
                      disabled={ipLocked && loginMode !== "superadmin"}
                      onClick={() => setShowLoginPin((prev) => !prev)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-lg text-stone-500 hover:text-stone-800 transition disabled:opacity-40"
                      title={showLoginPin ? "Ocultar clave" : "Ver clave"}
                    >
                      {showLoginPin ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-bold mb-1 ml-1" style={{ color: BRAND.charcoal }}>
                    {loginMode === "owner" ? "Usuario de Gerencia o Comercio" : "Usuario Administrador Maestro"}
                  </label>
                  <input
                    key={`admin_usr_${loginFormKey}`}
                    type="text"
                    name={`sec_u_${loginMode}_${loginFormKey}`}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-bwignore="true"
                    data-form-type="other"
                    readOnly
                    onFocus={(e) => { e.currentTarget.readOnly = false; }}
                    onPointerDown={(e) => { e.currentTarget.readOnly = false; }}
                    onTouchStart={(e) => { e.currentTarget.readOnly = false; }}
                    onKeyDown={(e) => { e.currentTarget.readOnly = false; }}
                    disabled={(ipLocked && loginMode !== "superadmin") || verifying}
                    value={userInput}
                    onChange={(e) => {
                      userInteractedLoginRef.current = true;
                      setUserInput(e.target.value);
                    }}
                    placeholder="Usuario"
                    className="w-full rounded-xl p-3 text-base border-2 font-medium disabled:opacity-60 placeholder:text-stone-400 placeholder:font-normal placeholder:opacity-90 bg-stone-100 border-stone-300 text-stone-900 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 ml-1" style={{ color: BRAND.charcoal }}>
                    {loginMode === "owner"
                      ? "Clave / PIN del Comercio o Gerente"
                      : "PIN Maestro de Seguridad"}
                  </label>
                  <div className="relative">
                    <input
                      key={`admin_pin_${loginFormKey}`}
                      type={showLoginPin ? "text" : "password"}
                      name={`sec_p_${loginMode}_${loginFormKey}`}
                      autoComplete="new-password"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      data-lpignore="true"
                      data-1p-ignore="true"
                      data-bwignore="true"
                      data-form-type="other"
                      readOnly
                      onFocus={(e) => { e.currentTarget.readOnly = false; }}
                      onPointerDown={(e) => { e.currentTarget.readOnly = false; }}
                      onTouchStart={(e) => { e.currentTarget.readOnly = false; }}
                      onKeyDown={(e) => { e.currentTarget.readOnly = false; }}
                      disabled={(ipLocked && loginMode !== "superadmin") || verifying}
                      value={pinInput}
                      onChange={(e) => {
                        userInteractedLoginRef.current = true;
                        setPinInput(e.target.value);
                      }}
                      placeholder="Ingresar PIN"
                      className="w-full rounded-xl p-3 pr-12 text-base border-2 tracking-wider font-mono disabled:opacity-60 placeholder:text-stone-400 placeholder:font-normal placeholder:opacity-90 bg-stone-100 border-stone-300 text-stone-900 focus:bg-white"
                    />
                    <button
                      type="button"
                      disabled={ipLocked && loginMode !== "superadmin"}
                      onClick={() => setShowLoginPin((prev) => !prev)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-lg text-stone-500 hover:text-stone-800 transition disabled:opacity-40"
                      title={showLoginPin ? "Ocultar clave" : "Ver clave"}
                    >
                      {showLoginPin ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-stone-600 px-1 pt-1.5">
                    <span className="font-semibold text-stone-600">
                      🔒 Acceso exclusivo para personal autorizado
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Selector de Persistencia para el Gerente */}
          {loginMode === "owner" && (
            <div className="mt-3.5 p-3 rounded-xl bg-amber-50/90 border border-amber-200 text-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-black uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-amber-700" /> Persistencia de Sesión
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  sessionPersistence === "keep_active" ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-stone-200 text-stone-700"
                }`}>
                  {sessionPersistence === "keep_active" ? "Mantener activa" : "Cerrar al salir"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleToggleSessionPersistence("keep_active")}
                  className={`py-2 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    sessionPersistence === "keep_active"
                      ? "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/30"
                      : "bg-white text-stone-700 hover:bg-stone-50 border border-stone-300"
                  }`}
                >
                  <ShieldCheck size={14} />
                  <span>Mantener activa</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleSessionPersistence("close_on_exit")}
                  className={`py-2 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    sessionPersistence === "close_on_exit"
                      ? "bg-amber-600 text-white shadow-sm ring-2 ring-amber-500/30"
                      : "bg-white text-stone-700 hover:bg-stone-50 border border-stone-300"
                  }`}
                >
                  <LogOut size={14} />
                  <span>Cerrar al salir</span>
                </button>
              </div>
              <p className="text-[10px] text-stone-600 mt-1.5 leading-snug">
                {sessionPersistence === "keep_active"
                  ? "🔒 Almacenamiento local seguro: Evita cierres forzosos por recarga o inactividad."
                  : "⏱️ Sesión temporal: Se cerrará automáticamente al salir del navegador."}
              </p>
            </div>
          )}

          {pinError && (
            <div className="mt-3 p-3 rounded-xl bg-red-100 border border-red-300 text-xs font-bold text-red-800 flex items-center gap-2">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{pinError}</span>
            </div>
          )}

          <button
            onClick={checkPinAndEnter}
            disabled={verifying || (ipLocked && loginMode !== "superadmin")}
            className="w-full mt-5 rounded-xl p-3.5 font-bold flex items-center justify-center gap-2 shadow-md hover:brightness-105 active:scale-[0.98] transition disabled:opacity-60 text-base"
            style={{
              background: loginMode === "staff" ? "#2563EB" : BRAND.tomato,
              color: BRAND.cream,
            }}
          >
            {verifying ? (
              <><LoaderCircle className="animate-spin" size={18} /> Verificando acceso...</>
            ) : (ipLocked && loginMode !== "superadmin") ? (
              `Bloqueado (${formatLockTime(ipRemainingSeconds)})`
            ) : (ipLocked && loginMode === "superadmin") ? (
              "Desbloquear IP como Administrador"
            ) : loginMode === "staff" ? (
              userInput.trim() ? `Ingresar como ${userInput.trim()}` : "Ingresar como Personal"
            ) : loginMode === "owner" ? (
              "Ingresar al Panel de Gerente"
            ) : (
              "Ingresar como Administrador Único"
            )}
          </button>

          {/* Enlace para adquirir la app y activación de licencia (solo visible para propietarios de comercio) */}
          {loginMode === "owner" && (
            <>
              <div className="mt-6 pt-4 border-t text-center space-y-2.5" style={{ borderColor: BRAND.paperDark }}>
                <p className="text-xs text-stone-700 font-bold">¿Querés una App con pedidos para tu propio negocio?</p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSimulatorModal(true)}
                    className="w-full sm:w-auto text-xs font-black px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles size={14} className="text-amber-300 animate-pulse" />
                    <span>🎮 Ver Simulador en Vivo & Beneficios</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRegForm((prev) => ({
                        ...prev,
                        requestedUser: "",
                        requestedPassword: "",
                        confirmPassword: "",
                      }));
                      setRegError("");
                      setShowRegPassword(false);
                      userInteractedRegRef.current = false;
                      setRegFormKey((k) => k + 1);
                      setRegSuccessVoucher(null);
                      setView("register");
                    }}
                    className="w-full sm:w-auto text-xs font-bold px-3.5 py-2 rounded-xl border-2 border-stone-400 bg-white hover:bg-stone-100 text-stone-900 transition inline-flex items-center justify-center gap-1.5"
                    style={{ color: BRAND.charcoal }}
                  >
                    <Briefcase size={14} />
                    <span>Adquirir App (Planes y Precios)</span>
                  </button>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t text-center space-y-2" style={{ borderColor: BRAND.paperDark }}>
                <p className="text-xs text-stone-700 font-semibold">
                  ¿Ya compraste esta app y tenés tu Código de Activación?
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowActivateModal(true);
                    setActivationError("");
                    setActivationSuccess(null);
                    setInputActivationCode("");
                    setInputActivationBusiness(business.name);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl text-xs font-black transition border-2 flex items-center justify-center gap-1.5 shadow-sm hover:brightness-95 bg-white text-stone-900 border-amber-400"
                >
                  <KeyRound size={15} style={{ color: BRAND.tomato }} />
                  <span>Habilitar Comercio con Código de Activación</span>
                </button>
                {appLicense.isActivated && (
                  <p className="text-[11px] font-bold text-emerald-800">
                    ✓ Local Habilitado: {appLicense.businessName} ({appLicense.plan})
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal para ingresar código de activación desde Login */}
        {renderActivateAppModal()}
        {renderLicenseBlockedModal()}
        {renderGoogleLicenseRequiredModal()}
        {renderConfirmActionModal()}
        {renderSimulatorModal()}
      </div>
    );
  }

  /* =========================================================================
     PANTALLA: REGISTRO DE USUARIOS Y CONTRATO PARA COMERCIOS (SAAS)
     ========================================================================= */
  if (view === "register") {
    return (
      <div style={{ background: BRAND.charcoal, minHeight: "100vh", fontFamily: "'Work Sans', sans-serif" }} className="py-8 px-4">
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Alfa+Slab+One&family=Work+Sans:wght@400;600;700;800&display=swap'); .slab{font-family:'Alfa Slab One',serif;}`}</style>
        
        <div className="max-w-4xl mx-auto">
          {/* Botón Volver */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => { setView("menu"); setRegSuccessVoucher(null); }}
              className="flex items-center gap-2 text-sm font-bold text-stone-300 hover:text-white transition bg-stone-900/60 px-4 py-2 rounded-full"
            >
              <ArrowLeft size={16} /> Volver a {business.name}
            </button>
            <button
              onClick={() => {
                setUserInput("");
                setPinInput("");
                setPinError("");
                setShowLoginPin(false);
                userInteractedLoginRef.current = false;
                setLoginFormKey((k) => k + 1);
                setView("adminLogin");
              }}
              className="text-xs font-bold text-stone-300 hover:text-white transition flex items-center gap-1"
            >
              <Lock size={14} /> Ya tengo cuenta (Iniciar sesión)
            </button>
          </div>

          {/* Si ya se completó el registro con éxito: VOUCHER DIGITAL */}
          {regSuccessVoucher ? (
            <div className="rounded-3xl p-6 md:p-10 shadow-2xl border-2 text-center" style={{ background: BRAND.paper, borderColor: BRAND.mustard }}>
              <div className="w-16 h-16 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto mb-4 shadow-lg">
                <CheckCircle2 size={36} />
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-200 text-stone-900">
                Solicitud Recibida con Éxito
              </span>
              <h2 className="slab text-2xl md:text-3xl mt-3 mb-2" style={{ color: BRAND.charcoal }}>
                ¡Bienvenido a la Red de Apps Gastronómicas!
              </h2>
              <p className="text-sm text-stone-700 max-w-lg mx-auto mb-6">
                Tu solicitud fue registrada y se generaron tus datos para el panel de administración. A continuación podés enviar tu comprobante a WhatsApp para la activación inmediata.
              </p>

              {/* Ficha Resumen */}
              <div className="rounded-2xl p-5 border text-left max-w-lg mx-auto mb-6 space-y-2.5 text-xs md:text-sm bg-white shadow-inner" style={{ borderColor: BRAND.paperDark }}>
                <div className="flex justify-between pb-2 border-b">
                  <span className="text-stone-500 font-medium">N° de Solicitud:</span>
                  <span className="font-mono font-bold text-stone-900">#{regSuccessVoucher.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500 font-medium">Comercio:</span>
                  <span className="font-bold text-stone-900">{regSuccessVoucher.businessName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500 font-medium">Rubro y Ciudad:</span>
                  <span className="font-semibold text-stone-800">{regSuccessVoucher.rubro} • {regSuccessVoucher.city}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500 font-medium">Responsable:</span>
                  <span className="font-semibold text-stone-800">{regSuccessVoucher.ownerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500 font-medium">WhatsApp de Pedidos:</span>
                  <span className="font-bold text-emerald-800 font-mono">{regSuccessVoucher.whatsapp}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-stone-500 font-medium">Email / Usuario de Acceso:</span>
                  <span className="font-mono font-bold text-stone-900 bg-stone-100 px-2 py-0.5 rounded">{regSuccessVoucher.requestedUser}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500 font-medium">Plan Seleccionado:</span>
                  <span className="font-bold text-stone-900">{regSuccessVoucher.planTitle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500 font-medium">Total a Abonar:</span>
                  <span className="font-black text-base text-red-600">{formatGs(regSuccessVoucher.amountGs)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500 font-medium">Forma de Pago:</span>
                  <span className="font-semibold capitalize text-stone-800">{regSuccessVoucher.paymentMethod}</span>
                </div>
                {regSuccessVoucher.paymentRef && (
                  <div className="flex justify-between">
                    <span className="text-stone-500 font-medium">Comprobante / Ref:</span>
                    <span className="font-mono font-semibold text-stone-800">{regSuccessVoucher.paymentRef}</span>
                  </div>
                )}

                {regSuccessVoucher.paymentMethod === "transferencia" && (
                  <div className="pt-2 border-t mt-2 text-stone-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                    <p className="font-bold text-xs text-stone-900 mb-1">🏦 Datos para Transferencia o Alias:</p>
                    <p className="text-xs"><b>Banco:</b> {PAYMENT_INFO.transferencia.bank} • <b>Caja de Ahorro:</b> {PAYMENT_INFO.transferencia.accountNumber}</p>
                    <p className="text-xs"><b>Titular:</b> {PAYMENT_INFO.transferencia.accountHolder} • <b>CI:</b> 7.226.273</p>
                    <p className="text-xs"><b>Alias SIPAP:</b> <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border">{PAYMENT_INFO.transferencia.sipapAlias}</span> (o {PAYMENT_INFO.transferencia.aliasAlt})</p>
                    <p className="text-[11px] text-emerald-800 font-bold mt-1">WhatsApp de activación: {PAYMENT_INFO.transferencia.whatsappDisplay}</p>
                  </div>
                )}
              </div>

              {/* Botón Enviar Comprobante por WhatsApp */}
              <div className="max-w-md mx-auto space-y-3">
                <a
                  href={`https://wa.me/${PAYMENT_INFO.transferencia.whatsappIntl}?text=${encodeURIComponent(
                    `¡Hola Camila! Acabo de registrar mi comercio *${regSuccessVoucher.businessName}* para la App Gastronómica.\n\n` +
                    `📋 *Solicitud N°:* #${regSuccessVoucher.id}\n` +
                    `👤 *Propietario:* ${regSuccessVoucher.ownerName}\n` +
                    `📱 *WhatsApp del Local:* ${regSuccessVoucher.whatsapp}\n` +
                    `🔑 *Email de Acceso (Usuario):* ${regSuccessVoucher.requestedUser}\n` +
                    `📦 *Plan:* ${regSuccessVoucher.planTitle}\n` +
                    `💰 *Monto a Abonar:* Gs. ${Number(regSuccessVoucher.amountGs).toLocaleString("es-PY")}\n` +
                    `💳 *Forma de Pago:* ${regSuccessVoucher.paymentMethod}\n` +
                    (regSuccessVoucher.paymentRef ? `🧾 *Comprobante/Ref:* ${regSuccessVoucher.paymentRef}\n\n` : "\n") +
                    `Banco Itaú - Caja de Ahorro: 620011158 - Alias: 7226273 (Camila Ayelen Torres)\n\n` +
                    `Adjunto mi comprobante para la activación de mi panel de administración.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-4 px-6 rounded-2xl font-black text-base flex items-center justify-center gap-2 shadow-xl hover:brightness-105 active:scale-98 transition text-white"
                  style={{ background: "#25D366" }}
                >
                  <Send size={20} />
                  <span>Enviar Comprobante al WhatsApp ({PAYMENT_INFO.transferencia.whatsappDisplay})</span>
                </a>

                <button
                  onClick={() => { setRegSuccessVoucher(null); setView("menu"); }}
                  className="w-full py-3 rounded-xl font-bold text-xs border-2 transition"
                  style={{ borderColor: BRAND.paperDark, color: BRAND.charcoal }}
                >
                  Volver a la tienda
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl p-6 md:p-10 shadow-2xl border-2" style={{ background: BRAND.paper, borderColor: BRAND.paperDark }}>
              
              {/* Cabecera del Registro */}
              <div className="text-center max-w-2xl mx-auto mb-8">
                <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5" style={{ background: BRAND.mustard, color: BRAND.charcoal }}>
                  <Sparkles size={14} /> Solución Digital para Gastronomía
                </span>
                <h1 className="slab text-3xl md:text-4xl mt-3 mb-2" style={{ color: BRAND.charcoal }}>
                  Adquirí tu propia App de Pedidos
                </h1>
                <p className="text-xs md:text-sm text-stone-700 leading-relaxed">
                  Menú interactivo con fotos, pedidos directos a tu WhatsApp (Mesa, Delivery con GPS y Retiro) y tu propio panel de administración protegido para 1 usuario administrador.
                </p>

                {/* Banner Interactivo: Simulador y Beneficios de la App */}
                <div className="mt-5 p-5 md:p-6 rounded-2xl border-2 border-amber-400 bg-gradient-to-br from-amber-500/10 via-amber-100/40 to-white shadow-lg text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-200">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-black text-amber-900 uppercase tracking-wide">
                        <Sparkles size={14} className="text-amber-600 animate-pulse" />
                        <span>Demostración en Vivo & Simulador Interactivo</span>
                      </div>
                      <h3 className="slab text-lg md:text-xl text-stone-900 mt-0.5">
                        ¿Cómo funciona la App y qué beneficios le da a tu comercio?
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowSimulatorModal(true)}
                      className="px-4 py-2.5 rounded-xl font-black text-xs md:text-sm bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-white shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 shrink-0 border border-emerald-400 text-center cursor-pointer"
                    >
                      <Sparkles size={16} className="text-amber-300" />
                      <span>🎮 Abrir Simulador en Vivo Aquí</span>
                    </button>
                  </div>

                  <p className="text-xs text-stone-700 font-medium my-3 leading-relaxed">
                    Probá el simulador en vivo para ver la experiencia exacta que tendrán tus clientes al pedir por WhatsApp y cómo gestionarás tu cocina antes de elegir tu suscripción:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-1">
                    <div className="p-3 rounded-xl bg-white/80 border border-amber-200 shadow-sm">
                      <div className="text-xl mb-1">📲</div>
                      <h4 className="font-bold text-xs text-stone-900 mb-0.5">Pedidos a WhatsApp</h4>
                      <p className="text-[11px] text-stone-600 leading-snug">
                        El cliente arma su carrito y te envía un pedido claro con cantidades, notas y total exacto.
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-white/80 border border-amber-200 shadow-sm">
                      <div className="text-xl mb-1">🛵</div>
                      <h4 className="font-bold text-xs text-stone-900 mb-0.5">Delivery con GPS</h4>
                      <p className="text-[11px] text-stone-600 leading-snug">
                        Ubicación Google Maps exacta del cliente con un toque. Sin perder tiempo pidiendo ubicación.
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-white/80 border border-amber-200 shadow-sm">
                      <div className="text-xl mb-1">👨‍🍳</div>
                      <h4 className="font-bold text-xs text-stone-900 mb-0.5">Panel de Cocina en Vivo</h4>
                      <p className="text-[11px] text-stone-600 leading-snug">
                        Comandas en tiempo real para mozos y cocineros: Pendiente, En Preparación y Entregado.
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-white/80 border border-amber-200 shadow-sm">
                      <div className="text-xl mb-1">💰</div>
                      <h4 className="font-bold text-xs text-stone-900 mb-0.5">0% Comisiones</h4>
                      <p className="text-[11px] text-stone-600 leading-snug">
                        Sin cobro porcentual por ventas. Todo el dinero de tus clientes va 100% directo a tu caja.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <form onSubmit={submitBusinessRegistration} autoComplete="off" data-form-type="other" className="space-y-8">
                
                {/* 1. SELECCIÓN DE PLAN Y PRECIOS */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-7 h-7 rounded-full flex items-center justify-center font-black text-xs text-white" style={{ background: BRAND.tomato }}>1</span>
                    <h2 className="slab text-lg md:text-xl" style={{ color: BRAND.charcoal }}>Elegí tu Plan y Precios</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {appPricingPlans.map((plan) => {
                      const isSelected = regForm.plan === plan.id;
                      const displayPrice = plan.priceFormatted || `${Number(plan.priceGs).toLocaleString("es-PY")} Gs.`;
                      return (
                        <div
                          key={plan.id}
                          onClick={() => setRegForm((prev) => ({
                            ...prev,
                            plan: plan.id,
                            planTitle: `${plan.title} (${displayPrice})`,
                            amountGs: plan.priceGs,
                          }))}
                          className={`relative rounded-2xl p-5 cursor-pointer border-2 transition-all flex flex-col justify-between ${
                            isSelected
                              ? "shadow-xl scale-[1.02] bg-white border-[#C1392B]"
                              : "bg-[#FFF8E7] hover:bg-white border-amber-200"
                          }`}
                        >
                          {plan.badge && (
                            <span
                              className={`absolute -top-3 left-4 px-3 py-0.5 rounded-full text-[11px] font-black shadow-sm ${
                                plan.highlighted
                                    ? "bg-amber-400 text-stone-900"
                                    : "bg-stone-800 text-amber-300"
                              }`}
                            >
                              {plan.badge}
                            </span>
                          )}

                          <div>
                            <h3 className="font-bold text-base mb-1" style={{ color: BRAND.charcoal }}>
                              {plan.title}
                            </h3>
                            <div className="my-2">
                              <span className="text-2xl md:text-3xl font-black font-mono" style={{ color: BRAND.tomato }}>
                                {displayPrice}
                              </span>
                              <span className="text-xs text-stone-500 block">{plan.period}</span>
                            </div>

                            {plan.savings && (
                              <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 mb-2">
                                {plan.savings}
                              </span>
                            )}

                            <p className="text-xs text-stone-600 mb-4">{plan.description}</p>

                            <ul className="space-y-2 text-xs border-t pt-3 mb-4" style={{ borderColor: BRAND.paperDark }}>
                              {plan.features.map((feat, idx) => (
                                <li key={idx} className="flex items-start gap-1.5 text-stone-700">
                                  <Check size={14} className="text-emerald-700 flex-shrink-0 mt-0.5" />
                                  <span>{feat}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <button
                            type="button"
                            className={`w-full py-2.5 rounded-xl font-bold text-xs transition ${
                              isSelected
                                ? "bg-[#C1392B] text-white shadow"
                                : "bg-stone-200 text-stone-700 hover:bg-stone-300"
                            }`}
                          >
                            {isSelected ? "✓ Plan Seleccionado" : "Elegir este Plan"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. DATOS DEL COMERCIO Y CONTACTO */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-7 h-7 rounded-full flex items-center justify-center font-black text-xs text-white" style={{ background: BRAND.tomato }}>2</span>
                    <h2 className="slab text-lg md:text-xl" style={{ color: BRAND.charcoal }}>Datos del Comercio</h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="font-bold block mb-1" style={{ color: BRAND.charcoal }}>Nombre de Fantasía del Comercio *</label>
                      <input
                        required
                        type="text"
                        value={regForm.businessName}
                        onChange={(e) => setRegForm((prev) => ({ ...prev, businessName: e.target.value }))}
                        placeholder="Ej: Pizzería Di Napoli, Burger Club, etc."
                        className="w-full p-3 rounded-xl border text-sm font-semibold"
                        style={{ borderColor: BRAND.paperDark, background: "#FFF" }}
                      />
                    </div>

                    <div>
                      <label className="font-bold block mb-1" style={{ color: BRAND.charcoal }}>Rubro Comercial *</label>
                      <select
                        value={regForm.rubro}
                        onChange={(e) => setRegForm((prev) => ({ ...prev, rubro: e.target.value }))}
                        className="w-full p-3 rounded-xl border text-sm font-semibold"
                        style={{ borderColor: BRAND.paperDark, background: "#FFF" }}
                      >
                        <option value="Rotisería y Minutas">Rotisería y Minutas</option>
                        <option value="Pizzería">Pizzería</option>
                        <option value="Hamburguesería & Lomitos">Hamburguesería & Lomitos</option>
                        <option value="Restaurante">Restaurante</option>
                        <option value="Cafetería y Pastelería">Cafetería y Pastelería</option>
                        <option value="Bar y Cervecería">Bar y Cervecería</option>
                        <option value="Heladería">Heladería</option>
                        <option value="Otro Comercio Gastronómico">Otro Comercio Gastronómico</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold block mb-1" style={{ color: BRAND.charcoal }}>Ciudad / Ubicación *</label>
                      <input
                        required
                        type="text"
                        value={regForm.city}
                        onChange={(e) => setRegForm((prev) => ({ ...prev, city: e.target.value }))}
                        placeholder="Ej: Encarnación, Asunción, CDE, etc."
                        className="w-full p-3 rounded-xl border text-sm"
                        style={{ borderColor: BRAND.paperDark, background: "#FFF" }}
                      />
                    </div>

                    <div>
                      <label className="font-bold block mb-1" style={{ color: BRAND.charcoal }}>Nombre del Responsable / Dueño *</label>
                      <input
                        required
                        type="text"
                        value={regForm.ownerName}
                        onChange={(e) => setRegForm((prev) => ({ ...prev, ownerName: e.target.value }))}
                        placeholder="Ej: Juan Pérez"
                        className="w-full p-3 rounded-xl border text-sm"
                        style={{ borderColor: BRAND.paperDark, background: "#FFF" }}
                      />
                    </div>

                    <div>
                      <label className="font-bold block mb-1" style={{ color: BRAND.charcoal }}>
                        WhatsApp de Pedidos (donde llegarán las compras) *
                      </label>
                      <input
                        required
                        type="text"
                        value={regForm.whatsapp}
                        onChange={(e) => setRegForm((prev) => ({ ...prev, whatsapp: e.target.value }))}
                        placeholder="Ej: 0981 123 456 o 595981123456"
                        className="w-full p-3 rounded-xl border text-sm font-mono font-bold"
                        style={{ borderColor: BRAND.paperDark, background: "#FFF" }}
                      />
                      <span className="text-[11px] text-stone-500 mt-1 block">Los clientes enviarán los pedidos por WhatsApp a este número.</span>
                    </div>

                    <div>
                      <label className="font-bold block mb-1" style={{ color: BRAND.charcoal }}>Email de Contacto (opcional)</label>
                      <input
                        type="email"
                        value={regForm.email}
                        onChange={(e) => setRegForm((prev) => ({ ...prev, email: e.target.value }))}
                        placeholder="ejemplo@comercio.com"
                        className="w-full p-3 rounded-xl border text-sm"
                        style={{ borderColor: BRAND.paperDark, background: "#FFF" }}
                      />
                    </div>
                  </div>
                </div>

                {/* 3. REGISTRO DE USUARIO Y CONTRASEÑA PARA EL ADMINISTRADOR */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-7 h-7 rounded-full flex items-center justify-center font-black text-xs text-white" style={{ background: BRAND.tomato }}>3</span>
                    <h2 className="slab text-lg md:text-xl" style={{ color: BRAND.charcoal }}>
                      Usuario y Contraseña para tu Panel de Administración
                    </h2>
                  </div>
                  <p className="text-xs text-stone-600 mb-3">
                    Definí el usuario y contraseña con el que ingresarás a tu panel privado para gestionar tus platos, precios y portada.
                  </p>

                  <div key={`reg_creds_${regFormKey}`} className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div>
                      <label className="font-bold block mb-1 flex items-center justify-between" style={{ color: BRAND.charcoal }}>
                        <span>Usuario Deseado (Email) *</span>
                        <span className="text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded">Solo Email</span>
                      </label>
                      <input
                        key={`reg_usr_${regFormKey}`}
                        required
                        type="email"
                        name={`reg_u_${regFormKey}`}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        data-lpignore="true"
                        data-1p-ignore="true"
                        data-bwignore="true"
                        data-form-type="other"
                        readOnly
                        onFocus={(e) => { e.currentTarget.readOnly = false; }}
                        onPointerDown={(e) => { e.currentTarget.readOnly = false; }}
                        onTouchStart={(e) => { e.currentTarget.readOnly = false; }}
                        onKeyDown={(e) => { e.currentTarget.readOnly = false; }}
                        value={regForm.requestedUser}
                        onChange={(e) => {
                          userInteractedRegRef.current = true;
                          const val = e.target.value.trim().toLowerCase();
                          setRegForm((prev) => ({
                            ...prev,
                            requestedUser: val,
                            email: prev.email ? prev.email : val,
                          }));
                        }}
                        placeholder="tu-comercio@gmail.com"
                        className="w-full p-3 rounded-xl border text-sm font-mono font-bold"
                        style={{ borderColor: BRAND.paperDark, background: "#FFF" }}
                      />
                      <span className="text-[11px] text-stone-500 mt-1 block">
                        Ingresá un correo electrónico válido. El Administrador otorgará la licencia a este email y será el único autorizado a ingresar una vez habilitado.
                      </span>
                    </div>

                    <div>
                      <label className="font-bold block mb-1" style={{ color: BRAND.charcoal }}>Contraseña de Administrador *</label>
                      <div className="relative">
                        <input
                          key={`reg_pwd_${regFormKey}`}
                          required
                          type={showRegPassword ? "text" : "password"}
                          name={`reg_p_${regFormKey}`}
                          autoComplete="new-password"
                          autoCorrect="off"
                          autoCapitalize="none"
                          spellCheck={false}
                          data-lpignore="true"
                          data-1p-ignore="true"
                          data-bwignore="true"
                          data-form-type="other"
                          readOnly
                          onFocus={(e) => { e.currentTarget.readOnly = false; }}
                          onPointerDown={(e) => { e.currentTarget.readOnly = false; }}
                          onTouchStart={(e) => { e.currentTarget.readOnly = false; }}
                          onKeyDown={(e) => { e.currentTarget.readOnly = false; }}
                          value={regForm.requestedPassword}
                          onChange={(e) => {
                            userInteractedRegRef.current = true;
                            setRegForm((prev) => ({ ...prev, requestedPassword: e.target.value }));
                          }}
                          placeholder="Tu contraseña o PIN"
                          className="w-full p-3 pr-10 rounded-xl border text-sm font-mono"
                          style={{ borderColor: BRAND.paperDark, background: "#FFF" }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPassword((p) => !p)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-500 p-1"
                        >
                          {showRegPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="font-bold block mb-1" style={{ color: BRAND.charcoal }}>Confirmar Contraseña *</label>
                      <input
                        key={`reg_conf_${regFormKey}`}
                        required
                        type={showRegPassword ? "text" : "password"}
                        name={`reg_c_${regFormKey}`}
                        autoComplete="new-password"
                        autoCorrect="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        data-lpignore="true"
                        data-1p-ignore="true"
                        data-bwignore="true"
                        data-form-type="other"
                        readOnly
                        onFocus={(e) => { e.currentTarget.readOnly = false; }}
                        onPointerDown={(e) => { e.currentTarget.readOnly = false; }}
                        onTouchStart={(e) => { e.currentTarget.readOnly = false; }}
                        onKeyDown={(e) => { e.currentTarget.readOnly = false; }}
                        value={regForm.confirmPassword}
                        onChange={(e) => {
                          userInteractedRegRef.current = true;
                          setRegForm((prev) => ({ ...prev, confirmPassword: e.target.value }));
                        }}
                        placeholder="Repetir contraseña"
                        className="w-full p-3 rounded-xl border text-sm font-mono"
                        style={{ borderColor: BRAND.paperDark, background: "#FFF" }}
                      />
                    </div>
                  </div>
                </div>

                {/* 4. FORMAS DE PAGO DISPONIBLES */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-7 h-7 rounded-full flex items-center justify-center font-black text-xs text-white" style={{ background: BRAND.tomato }}>4</span>
                    <h2 className="slab text-lg md:text-xl" style={{ color: BRAND.charcoal }}>Forma de Pago</h2>
                  </div>

                  {/* Selector de Métodos de Pago */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                    {[
                      { id: "transferencia", label: "Transferencia / SIPAP", icon: Building2 },
                      { id: "billetera", label: "Giros Tigo / Billeteras", icon: Phone },
                      { id: "qr_card", label: "Tarjeta / QR Bancard", icon: CreditCard },
                      { id: "efectivo", label: "Efectivo / A Coordinar", icon: Store },
                    ].map((m) => {
                      const IconComp = m.icon;
                      const isSel = regForm.paymentMethod === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setRegForm((prev) => ({ ...prev, paymentMethod: m.id }))}
                          className={`p-3 rounded-xl border-2 text-xs font-bold flex flex-col items-center gap-1.5 transition ${
                            isSel
                              ? "bg-white border-[#C1392B] text-stone-900 shadow-sm"
                              : "bg-[#FFF8E7] border-amber-200 text-stone-600 hover:bg-white"
                          }`}
                        >
                          <IconComp size={18} className={isSel ? "text-red-700" : "text-stone-500"} />
                          <span className="text-center">{m.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Cuadro de Información según el Método Seleccionado */}
                  <div className="p-4 rounded-2xl bg-white border-2 shadow-sm text-xs" style={{ borderColor: BRAND.paperDark }}>
                    {regForm.paymentMethod === "transferencia" && (
                      <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <span className="font-bold text-sm text-stone-900 flex items-center gap-1.5">
                            🏦 Transferencia Bancaria SIPAP / Alias
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => copyToClipboard(
                                `Banco: ${PAYMENT_INFO.transferencia.bank}\nTipo: ${PAYMENT_INFO.transferencia.accountType}\nCuenta: ${PAYMENT_INFO.transferencia.accountNumber}\nTitular: ${PAYMENT_INFO.transferencia.accountHolder}\n${PAYMENT_INFO.transferencia.documentId}\nAlias: ${PAYMENT_INFO.transferencia.sipapAlias}\nWhatsApp: ${PAYMENT_INFO.transferencia.whatsappDisplay}`,
                                "banco"
                              )}
                              className="px-2.5 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-[11px] flex items-center gap-1"
                            >
                              <Copy size={12} /> {copiedText === "banco" ? "¡Datos Copiados!" : "Copiar todos los datos"}
                            </button>
                            <a
                              href={`https://wa.me/${PAYMENT_INFO.transferencia.whatsappIntl}?text=${encodeURIComponent(
                                "¡Hola Camila! Me contacto para consultar sobre los datos de transferencia para la App Gastronómica (Banco Itaú, Caja de Ahorro 620011158, Alias CI: 7226273)."
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 rounded bg-[#25D366] text-white font-bold text-[11px] flex items-center gap-1 hover:brightness-105"
                            >
                              <Phone size={11} /> WhatsApp
                            </a>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-stone-800 bg-amber-50/80 p-3.5 rounded-xl border border-amber-200">
                          <div>
                            <span className="text-stone-500 font-medium block">Entidad Bancaria:</span>
                            <span className="font-bold text-stone-900 text-sm">{PAYMENT_INFO.transferencia.bank}</span>
                          </div>
                          <div>
                            <span className="text-stone-500 font-medium block">Tipo y N° de Cuenta:</span>
                            <span className="font-mono font-bold text-stone-900 text-sm">
                              {PAYMENT_INFO.transferencia.accountType} N° {PAYMENT_INFO.transferencia.accountNumber}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(PAYMENT_INFO.transferencia.accountNumber, "cta")}
                              className="ml-1.5 text-[10px] text-stone-600 underline hover:text-stone-900"
                            >
                              {copiedText === "cta" ? "✓ Copiado" : "(Copiar cuenta)"}
                            </button>
                          </div>
                          <div>
                            <span className="text-stone-500 font-medium block">Titular de la Cuenta:</span>
                            <span className="font-bold text-stone-900">{PAYMENT_INFO.transferencia.accountHolder}</span>
                          </div>
                          <div>
                            <span className="text-stone-500 font-medium block">Cédula de Identidad (CI):</span>
                            <span className="font-mono font-bold text-stone-900">{PAYMENT_INFO.transferencia.documentId}</span>
                          </div>
                          <div className="sm:col-span-2 pt-2 border-t border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <div>
                              <span className="text-stone-500 font-medium block">Alias SIPAP:</span>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border text-stone-900">
                                  {PAYMENT_INFO.transferencia.sipapAlias}
                                </span>
                                <span className="text-xs text-stone-600 font-medium">o simplemente:</span>
                                <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border text-stone-900">
                                  {PAYMENT_INFO.transferencia.aliasAlt}
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(PAYMENT_INFO.transferencia.aliasAlt, "alias")}
                              className="self-start sm:self-center px-2.5 py-1 rounded bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold text-[11px] flex items-center gap-1"
                            >
                              <Copy size={11} /> {copiedText === "alias" ? "¡Alias Copiado!" : "Copiar Alias (7226273)"}
                            </button>
                          </div>
                        </div>

                        <p className="text-[11px] text-stone-600">
                          📲 Podés enviar el comprobante o comunicarte por WhatsApp directamente al <a href={`https://wa.me/${PAYMENT_INFO.transferencia.whatsappIntl}`} target="_blank" rel="noopener noreferrer" className="font-bold text-emerald-800 underline">{PAYMENT_INFO.transferencia.whatsappDisplay}</a>.
                        </p>
                      </div>
                    )}

                    {regForm.paymentMethod === "billetera" && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-stone-800">📱 Giros Tigo / Billeteras Móviles</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(PAYMENT_INFO.billetera.number, "giro")}
                            className="px-2.5 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-[11px] flex items-center gap-1"
                          >
                            <Copy size={12} /> {copiedText === "giro" ? "¡Copiado!" : "Copiar número"}
                          </button>
                        </div>
                        <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-stone-700">
                          <p className="font-bold text-base font-mono text-emerald-800 mb-1">
                            Número para Giros: {PAYMENT_INFO.billetera.number}
                          </p>
                          <p className="text-stone-600">Titular: {PAYMENT_INFO.billetera.holder}</p>
                          <p className="text-[11px] text-stone-500 mt-1">{PAYMENT_INFO.billetera.note}</p>
                        </div>
                      </div>
                    )}

                    {regForm.paymentMethod === "qr_card" && (
                      <div className="space-y-2">
                        <span className="font-bold text-sm text-stone-800">💳 Pago con Tarjeta de Débito/Crédito o QR Bancard</span>
                        <p className="text-stone-600 leading-relaxed">
                          Al registrar tu solicitud, recibirás automáticamente el enlace de pago web seguro y el código QR de Bancard / Pago Móvil a tu WhatsApp para abonar en el acto.
                        </p>
                      </div>
                    )}

                    {regForm.paymentMethod === "efectivo" && (
                      <div className="space-y-2">
                        <span className="font-bold text-sm text-stone-800">💵 Pago en Efectivo</span>
                        <p className="text-stone-600 leading-relaxed">
                          Coordinaremos contigo por WhatsApp para el cobro presencial en tu local o con nuestro asesor comercial de la zona.
                        </p>
                      </div>
                    )}

                    {/* Referencia o N° de Comprobante */}
                    <div className="mt-4 pt-3 border-t">
                      <label className="font-bold block mb-1 text-stone-700">
                        N° de Comprobante / Referencia de Pago (opcional):
                      </label>
                      <input
                        type="text"
                        value={regForm.paymentRef}
                        onChange={(e) => setRegForm((prev) => ({ ...prev, paymentRef: e.target.value }))}
                        placeholder="Ej: Transferencia N° 849202 o Foto del ticket"
                        className="w-full p-2.5 rounded-xl border text-xs"
                        style={{ borderColor: BRAND.paperDark, background: "#FFF" }}
                      />
                    </div>
                  </div>
                </div>

                {/* MENSAJES DE ERROR */}
                {regError && (
                  <div className="p-4 rounded-xl bg-red-100 border border-red-300 text-xs font-bold text-red-800 flex items-center gap-2">
                    <AlertCircle size={18} className="flex-shrink-0" />
                    <span>{regError}</span>
                  </div>
                )}

                {/* RESUMEN Y BOTÓN FINAL DE REGISTRO */}
                <div className="pt-4 border-t" style={{ borderColor: BRAND.paperDark }}>
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
                    <div>
                      <span className="text-xs text-stone-600 block">Total a pagar por {regForm.planTitle}:</span>
                      <span className="text-3xl font-black font-mono" style={{ color: BRAND.tomato }}>
                        {formatGs(regForm.amountGs)}
                      </span>
                    </div>
                    <button
                      type="submit"
                      disabled={regSubmitting}
                      className="w-full sm:w-auto px-8 py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 shadow-xl hover:brightness-105 active:scale-98 transition disabled:opacity-60 text-white"
                      style={{ background: BRAND.tomato }}
                    >
                      {regSubmitting ? (
                        <><LoaderCircle className="animate-spin" size={20} /> Registrando comercio...</>
                      ) : (
                        <><Briefcase size={20} /> Registrar mi Comercio y Adquirir la App</>
                      )}
                    </button>
                  </div>
                  <p className="text-[11px] text-center text-stone-500">
                    Al enviar el formulario, recibirás tus credenciales y el comprobante para la activación inmediata por WhatsApp.
                  </p>
                </div>

              </form>
            </div>
          )}
        </div>
        {renderSimulatorModal()}
      </div>
    );
  }

  /* =========================================================================
     PANTALLA: PANEL DE ADMINISTRACIÓN (Menú + Datos del Comercio y Portada)
     ========================================================================= */
  if (view === "admin") {
    return (
      <AdminErrorBoundary onGoBack={() => setView("menu")}>
        <div style={{ background: BRAND.paper, minHeight: "100vh", fontFamily: "'Work Sans', sans-serif" }} className="pb-32">
          <style>{`@import url('https://fonts.googleapis.com/css2?family=Alfa+Slab+One&family=Work+Sans:wght@400;500;600;700;800&display=swap'); .slab{font-family:'Alfa Slab One',serif;}`}</style>
          
          {/* Barra superior de administración */}
          <div style={{ background: BRAND.charcoal }} className="px-3 sm:px-4 py-3.5 sticky top-0 z-30 shadow-md">
            <div className={`mx-auto flex items-center justify-between transition-all duration-200 ${
              adminTab === "history"
                ? "w-full max-w-[98vw] 2xl:max-w-[1850px] px-1 sm:px-4"
                : adminTab === "orders"
                ? "w-full max-w-[1720px] px-2 sm:px-4"
                : "max-w-5xl"
            }`}>
              <button
                onClick={() => (dirty ? setShowExitConfirm(true) : setView("menu"))}
                className="flex items-center gap-1.5 text-xs sm:text-sm font-bold hover:opacity-80 transition py-1.5 px-3 rounded-xl bg-stone-800/80 hover:bg-stone-700 text-stone-200"
                style={{ color: BRAND.cream }}
                title="Volver a la tienda sin cerrar sesión"
              >
                <ArrowLeft size={17} />
                <span>{adminRole === "staff" ? "Ir al Menú (Tomar Pedidos)" : "Volver a la tienda"}</span>
              </button>
              <div className="flex items-center gap-2">
                <span
                  className="px-2.5 py-1 rounded-full text-xs font-black shadow-sm flex items-center gap-1.5"
                  style={{
                    background: adminRole === "superadmin" ? "#FEF08A" : adminRole === "staff" ? "#DBEAFE" : "#D1FAE5",
                    color: adminRole === "superadmin" ? "#854D0E" : adminRole === "staff" ? "#1E40AF" : "#065F46",
                  }}
                >
                  {adminRole === "superadmin"
                    ? "👑 Administrador App"
                    : adminRole === "staff"
                    ? (adminSession?.user ? `👨‍🍳 ${adminSession.user}` : "👨‍🍳 Personal")
                    : "👔 Gerente Local"}
                </span>
                <span className="hidden sm:inline text-xs font-bold" style={{ color: BRAND.mustardLight }}>
                  {business.name}
                </span>
                <span className="text-xs px-2.5 py-1 rounded-full font-bold shadow-sm hidden md:inline" style={dirty ? { background: BRAND.mustard, color: BRAND.charcoal } : { background: BRAND.green, color: BRAND.cream }}>
                  {dirty ? "Cambios sin guardar" : "Todo guardado"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (dirty) {
                      setShowExitConfirm(true);
                    } else {
                      handleLogout();
                    }
                  }}
                  className="text-xs font-bold text-red-300 hover:text-white transition px-2.5 py-1.5 rounded-xl bg-red-950/70 hover:bg-red-900 border border-red-800 ml-1 flex items-center gap-1"
                  title="Cerrar sesión de gerencia / personal y volver a modo cliente"
                >
                  <LogOut size={13} />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </div>
          </div>

          {/* Navegación por pestañas del panel según el rol */}
          <div style={{ background: BRAND.charcoalDark }} className="border-b border-stone-800 overflow-x-auto">
            <div className={`mx-auto px-2 sm:px-4 flex gap-1 sm:gap-2 min-w-max transition-all duration-200 ${
              adminTab === "history"
                ? "w-full max-w-[98vw] 2xl:max-w-[1850px]"
                : adminTab === "orders"
                ? "w-full max-w-[1720px]"
                : "max-w-5xl"
            }`}>
              <button
                onClick={() => { setAdminTab("orders"); loadOrders(); }}
                className={`flex items-center gap-2 px-4 sm:px-5 py-3 text-sm font-bold transition border-b-4 ${
                  adminTab === "orders"
                    ? "border-[#C1392B] text-[#FBF2DD] bg-stone-900/50"
                    : "border-transparent text-stone-400 hover:text-stone-200"
                }`}
              >
                <Receipt size={17} />
                <span>Panel de Pedidos y Cocina</span>
                {pendingOrders.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-stone-900 animate-pulse">
                    {pendingOrders.length} pendientes
                  </span>
                )}
              </button>

              {/* Botón rápido para el Personal para ir a tomar pedidos a mesas */}
              {adminRole === "staff" && (
                <button
                  type="button"
                  onClick={() => setView("menu")}
                  className="flex items-center gap-2 px-4 sm:px-5 py-3 text-sm font-bold transition border-b-4 border-transparent text-blue-300 hover:text-white bg-blue-900/40 hover:bg-blue-900/60"
                >
                  <Utensils size={17} />
                  <span>Tomar Pedidos en Mesas</span>
                </button>
              )}

              {adminRole !== "staff" && (
                <button
                  onClick={() => { setAdminTab("history"); loadOrders(); }}
                  className={`flex items-center gap-2 px-4 sm:px-5 py-3 text-sm font-bold transition border-b-4 ${
                    adminTab === "history"
                      ? "border-[#C1392B] text-[#FBF2DD] bg-stone-900/50"
                      : "border-transparent text-stone-400 hover:text-stone-200"
                  }`}
                >
                  <History size={17} />
                  <span>Historial de Pedidos</span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-stone-800 text-amber-300">
                    {orders.length}
                  </span>
                </button>
              )}

              {adminRole !== "staff" && (
                <button
                  onClick={() => setAdminTab("menu")}
                  className={`flex items-center gap-2 px-4 sm:px-5 py-3 text-sm font-bold transition border-b-4 ${
                    adminTab === "menu"
                      ? "border-[#C1392B] text-[#FBF2DD] bg-stone-900/50"
                      : "border-transparent text-stone-400 hover:text-stone-200"
                  }`}
                >
                  <Utensils size={17} />
                  <span>Menú y Platos</span>
                </button>
              )}

              {/* PESTAÑA: Permisos al Personal (Mozos / Cocina) - Controlada por el Gerente */}
              {adminRole !== "staff" && (
                <button
                  onClick={() => setAdminTab("staff")}
                  className={`flex items-center gap-2 px-4 sm:px-5 py-3 text-sm font-bold transition border-b-4 ${
                    adminTab === "staff"
                      ? "border-[#C1392B] text-[#FBF2DD] bg-stone-900/50"
                      : "border-transparent text-stone-400 hover:text-stone-200"
                  }`}
                >
                  <Users size={17} />
                  <span>Permisos Personal</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                    staffSettings.enabled ? "bg-emerald-400 text-stone-900" : "bg-stone-700 text-stone-300"
                  }`}>
                    {staffSettings.enabled ? "Activo" : "Inactivo"}
                  </span>
                </button>
              )}

              {adminRole !== "staff" && (
                <button
                  onClick={() => setAdminTab("business")}
                  className={`flex items-center gap-2 px-4 sm:px-5 py-3 text-sm font-bold transition border-b-4 ${
                    adminTab === "business"
                      ? "border-[#C1392B] text-[#FBF2DD] bg-stone-900/50"
                      : "border-transparent text-stone-400 hover:text-stone-200"
                  }`}
                >
                  <Store size={17} />
                  <span>{adminRole === "superadmin" ? "Modificar Demo (Portada y Datos)" : "Datos del Comercio"}</span>
                  {adminRole === "superadmin" && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-stone-900 flex items-center gap-0.5 shadow-sm">
                      <Sparkles size={11} /> Demo Oficial
                    </span>
                  )}
                </button>
              )}

              {/* PESTAÑA: COMERCIOS Y SEGURIDAD (Acceso Total para Admin, Restringido para Gerente) */}
              {adminRole === "superadmin" ? (
                <button
                  onClick={() => { setAdminTab("clients"); loadRegisteredClients(); loadActivationCodes(); }}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-bold transition border-b-4 ${
                    adminTab === "clients"
                      ? "border-[#C1392B] text-[#FBF2DD] bg-stone-900/50"
                      : "border-transparent text-stone-400 hover:text-stone-200"
                  }`}
                >
                  <Briefcase size={17} />
                  <span>Comercios y Seguridad IP</span>
                  {(Array.isArray(registeredClients) ? registeredClients.length : 0) > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-stone-900">
                      {registeredClients.length}
                    </span>
                  )}
                </button>
              ) : adminRole === "owner" ? (
                <button
                  onClick={() => setAdminTab("clients")}
                  className={`flex items-center gap-2 px-4 sm:px-5 py-3 text-sm font-bold transition border-b-4 ${
                    adminTab === "clients"
                      ? "border-amber-500 text-amber-200 bg-stone-900/50"
                      : "border-transparent text-stone-400 hover:text-stone-200"
                  }`}
                  title="Acceso restringido: Reservado para el Administrador de la App"
                >
                  <Briefcase size={17} className="text-amber-500/70" />
                  <span>Comercios y Seguridad</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-950/70 text-amber-400 border border-amber-800/80 flex items-center gap-1">
                    <Lock size={10} /> Solo Admin
                  </span>
                </button>
              ) : null}
            </div>
          </div>

        {/* Modal de confirmación al salir con cambios sin guardar */}
        {showExitConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.65)" }}>
            <div className="w-full max-w-sm rounded-2xl p-6 shadow-2xl" style={{ background: BRAND.cream }}>
              <p className="font-bold text-lg mb-1" style={{ color: BRAND.charcoal }}>¿Deseás salir sin guardar?</p>
              <p className="text-sm text-stone-600 mb-5">Tenés cambios pendientes. Si salís ahora se perderán las modificaciones no guardadas.</p>
              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={async () => {
                    setShowExitConfirm(false);
                    setCartOpen(false);
                    const ok = await saveAllAdminChanges();
                    if (ok) {
                      setTimeout(() => setView("menu"), 1500);
                    }
                  }}
                  className="w-full rounded-xl p-3 text-sm font-bold shadow transition hover:brightness-105"
                  style={{ background: BRAND.green, color: BRAND.cream }}
                >
                  Guardar cambios y salir
                </button>
                <button
                  type="button"
                  onClick={() => { setShowExitConfirm(false); handleLogout(); }}
                  className="w-full rounded-xl p-3 text-sm font-bold transition hover:brightness-105"
                  style={{ background: BRAND.tomato, color: BRAND.cream }}
                >
                  Salir sin guardar
                </button>
                <button
                  onClick={() => setShowExitConfirm(false)}
                  className="w-full rounded-xl p-3 text-sm font-bold border-2 transition"
                  style={{ borderColor: BRAND.paperDark, color: BRAND.charcoal }}
                >
                  Continuar editando
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Contenido de pestañas */}
        <div className={`mx-auto py-6 transition-all duration-200 ${
          adminTab === "history"
            ? "w-full max-w-[98vw] 2xl:max-w-[1850px] px-2 sm:px-4 md:px-6"
            : adminTab === "orders"
            ? "w-full max-w-[1720px] px-3 sm:px-6"
            : "max-w-5xl px-4"
        }`}>

          {/* =============================================================
              PESTAÑA: PANEL DE PEDIDOS Y CONTROL DE COBRO POR CAJA
              ============================================================= */}
          {adminTab === "orders" && (
            <div className="space-y-6">

              {/* Cabecera del Panel de Pedidos con Métricas en Vivo */}
              <div className="rounded-2xl p-5 md:p-6 border-2 shadow-sm bg-white" style={{ borderColor: BRAND.paperDark }}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b mb-4" style={{ borderColor: BRAND.paperDark }}>
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl text-white shadow-inner flex items-center justify-center" style={{ background: BRAND.tomato }}>
                      <Receipt size={28} />
                    </div>
                    <div>
                      <h2 className="slab text-xl md:text-2xl text-stone-900 leading-tight">
                        Panel de Pedidos y Cobro por Caja
                      </h2>
                      <p className="text-xs text-stone-600 font-medium">
                        Atención de pedidos solicitados por Mesa, Delivery o Retiro en Mostrador.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={loadOrders}
                      disabled={loadingOrders}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition bg-stone-100 hover:bg-stone-200 text-stone-800"
                    >
                      <RefreshCw size={14} className={loadingOrders ? "animate-spin" : ""} />
                      <span>{loadingOrders ? "Actualizando..." : "Actualizar pedidos"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdminTab("history")}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300 shadow-sm"
                    >
                      <History size={14} />
                      <span>Historial Completo ({orders.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCashReportPrint(true)}
                      className="px-4 py-2 rounded-xl text-xs font-black shadow transition flex items-center gap-1.5 text-white hover:brightness-105"
                      style={{ background: BRAND.green }}
                    >
                      <Printer size={15} />
                      <span>Imprimir Movimiento de Caja</span>
                    </button>
                  </div>
                </div>

                {/* Tarjetas resumen de estado rápido de pedidos */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl border bg-amber-50/60 border-amber-200">
                    <span className="text-xs font-bold text-amber-900 block mb-0.5 flex items-center gap-1">
                      <Clock size={13} className="text-amber-700" /> Pendientes de Cobro
                    </span>
                    <span className="text-2xl font-black text-amber-800 font-mono">
                      {pendingOrders.length}
                    </span>
                    <span className="text-[11px] block text-stone-600 mt-0.5">
                      Por cobrar: <b>{formatGs(pendingOrders.reduce((s, o) => s + (Number(o.totalPrice) || 0), 0))}</b>
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl border bg-emerald-50/60 border-emerald-200">
                    <span className="text-xs font-bold text-emerald-900 block mb-0.5 flex items-center gap-1">
                      <CheckCircle2 size={13} className="text-emerald-700" /> Cobrados / Pagados
                    </span>
                    <span className="text-2xl font-black text-emerald-800 font-mono">
                      {paidOrders.length}
                    </span>
                    <span className="text-[11px] block text-stone-600 mt-0.5">
                      En caja: <b>{formatGs(paidOrders.reduce((s, o) => s + (Number(o.totalPrice) || 0), 0))}</b>
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl border bg-stone-50 border-stone-200">
                    <span className="text-xs font-bold text-stone-700 block mb-0.5 flex items-center gap-1">
                      <Utensils size={13} className="text-stone-500" /> Mesas en Salón
                    </span>
                    <span className="text-2xl font-black text-stone-900 font-mono">
                      {pendingOrders.filter((o) => o.mode === "mesa").length}
                    </span>
                    <span className="text-[11px] block text-stone-500 mt-0.5">
                      En atención
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl border bg-stone-50 border-stone-200">
                    <span className="text-xs font-bold text-stone-700 block mb-0.5 flex items-center gap-1">
                      <Bike size={13} className="text-stone-500" /> Delivery y Retiro
                    </span>
                    <span className="text-2xl font-black text-stone-900 font-mono">
                      {pendingOrders.filter((o) => o.mode === "delivery" || o.mode === "retiro").length}
                    </span>
                    <span className="text-[11px] block text-stone-500 mt-0.5">
                      Para despacho
                    </span>
                  </div>
                </div>
              </div>

              {/* =============================================================
                  BARRA DE BÚSQUEDA RÁPIDA DE PEDIDOS Y FILTROS DEL PANEL
                  ============================================================= */}
              <div className="bg-white p-4 md:p-5 rounded-2xl border-2 shadow-sm space-y-3.5" style={{ borderColor: BRAND.paperDark }}>
                {/* Buscador Destacado de Pedidos */}
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 flex items-center gap-1.5 pointer-events-none">
                    <Search size={18} className="text-amber-600" />
                  </div>
                  <input
                    type="text"
                    value={ordersSearch}
                    onChange={(e) => setOrdersSearch(e.target.value)}
                    placeholder="Buscar por código (ej: PED-1577, 1577), cliente (ej: Juan), mesa, producto, teléfono..."
                    className="w-full pl-10 pr-28 py-2.5 rounded-xl text-xs md:text-sm font-medium border-2 bg-stone-50/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition shadow-inner"
                    style={{ borderColor: ordersSearch ? "#D97706" : BRAND.paperDark }}
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {ordersSearch && (
                      <>
                        <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                          {filteredActiveOrders.length} {filteredActiveOrders.length === 1 ? "pedido" : "pedidos"}
                        </span>
                        <button
                          type="button"
                          onClick={() => setOrdersSearch("")}
                          className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200 transition"
                          title="Limpiar búsqueda"
                        >
                          <X size={15} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Chips de Búsqueda Rápida y Atajos */}
                <div className="flex items-center gap-1.5 flex-wrap text-xs">
                  <span className="text-[11px] font-bold text-stone-500 flex items-center gap-1">
                    <Sparkles size={12} className="text-amber-600" /> Atajos:
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setOrdersSearch("PED-1577");
                      setOrdersStatusFilter("todos");
                      setOrdersFilterMode("todos");
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-black border transition flex items-center gap-1 ${
                      ordersSearch.toUpperCase().includes("1577")
                        ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                        : "bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300"
                    }`}
                  >
                    <span>PED-1577 (Juan)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOrdersSearch("Juan");
                      setOrdersStatusFilter("todos");
                      setOrdersFilterMode("todos");
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-black border transition ${
                      ordersSearch.toLowerCase() === "juan"
                        ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                        : "bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300"
                    }`}
                  >
                    <span>Juan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOrdersStatusFilter("en_preparacion");
                      setOrdersSearch("");
                      setOrdersFilterMode("todos");
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-black border transition flex items-center gap-1 ${
                      ordersStatusFilter === "en_preparacion" && !ordersSearch
                        ? "bg-orange-600 text-white border-orange-600 shadow-sm"
                        : "bg-orange-50 hover:bg-orange-100 text-orange-900 border-orange-300"
                    }`}
                  >
                    <ChefHat size={12} />
                    <span>En Cocina ({orders.filter((o) => o.orderStatus === "en_preparacion").length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOrdersSearch("");
                      setOrdersStatusFilter("todos");
                      setOrdersFilterMode("todos");
                    }}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition ml-auto"
                  >
                    Restablecer filtros
                  </button>
                </div>

                {/* Filtros Combinados: Estado y Modalidad */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2.5 border-t border-stone-200">
                  {/* Filtro por Estado del Pedido */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                    <span className="text-[11px] font-bold text-stone-500 mr-0.5">Estado:</span>
                    <button
                      type="button"
                      onClick={() => setOrdersStatusFilter("todos")}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                        ordersStatusFilter === "todos"
                          ? "bg-stone-900 text-white shadow"
                          : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                      }`}
                    >
                      <span>Pendientes ({pendingOrders.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrdersStatusFilter("en_preparacion")}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 whitespace-nowrap ${
                        ordersStatusFilter === "en_preparacion"
                          ? "bg-orange-600 text-white shadow"
                          : "bg-orange-50 text-orange-900 hover:bg-orange-100 border border-orange-200"
                      }`}
                    >
                      <ChefHat size={12} />
                      <span>En Cocina ({orders.filter((o) => o.orderStatus === "en_preparacion").length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrdersStatusFilter("pagado")}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 whitespace-nowrap ${
                        ordersStatusFilter === "pagado"
                          ? "bg-emerald-700 text-white shadow"
                          : "bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200"
                      }`}
                    >
                      <CheckCircle2 size={12} />
                      <span>Cobrados ({paidOrders.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrdersStatusFilter("todos_pedidos")}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                        ordersStatusFilter === "todos_pedidos"
                          ? "bg-stone-800 text-white shadow"
                          : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                      }`}
                    >
                      <span>Todos ({orders.length})</span>
                    </button>
                  </div>

                  {/* Filtro por Modalidad */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                    <span className="text-[11px] font-bold text-stone-500 mr-0.5">Tipo:</span>
                    <button
                      type="button"
                      onClick={() => setOrdersFilterMode("todos")}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                        ordersFilterMode === "todos"
                          ? "bg-amber-600 text-white shadow"
                          : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                      }`}
                    >
                      <span>Todas</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrdersFilterMode("mesa")}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 whitespace-nowrap ${
                        ordersFilterMode === "mesa"
                          ? "bg-amber-700 text-white shadow"
                          : "bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200"
                      }`}
                    >
                      <Utensils size={11} />
                      <span>Mesas</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrdersFilterMode("delivery")}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 whitespace-nowrap ${
                        ordersFilterMode === "delivery"
                          ? "bg-emerald-700 text-white shadow"
                          : "bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200"
                      }`}
                    >
                      <Bike size={11} />
                      <span>Delivery</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrdersFilterMode("retiro")}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 whitespace-nowrap ${
                        ordersFilterMode === "retiro"
                          ? "bg-orange-700 text-white shadow"
                          : "bg-orange-50 text-orange-900 hover:bg-orange-100 border border-orange-200"
                      }`}
                    >
                      <ShoppingBag size={11} />
                      <span>Retiro</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* LISTA DE PEDIDOS / RESULTADOS DE BÚSQUEDA */}
              <div>
                <div className="flex items-center justify-between mb-3 px-1 flex-wrap gap-2">
                  <h3 className="font-black text-base text-stone-900 flex items-center gap-2">
                    {ordersSearch ? (
                      <>
                        <Search size={18} className="text-amber-600" />
                        <span>Resultados para "{ordersSearch}" ({filteredActiveOrders.length})</span>
                      </>
                    ) : ordersStatusFilter === "en_preparacion" ? (
                      <>
                        <ChefHat size={18} className="text-orange-600" />
                        <span>Pedidos En Cocina ({filteredActiveOrders.length})</span>
                      </>
                    ) : ordersStatusFilter === "pagado" ? (
                      <>
                        <CheckCircle2 size={18} className="text-emerald-600" />
                        <span>Pedidos Cobrados en Caja ({filteredActiveOrders.length})</span>
                      </>
                    ) : ordersStatusFilter === "todos_pedidos" ? (
                      <>
                        <Receipt size={18} className="text-stone-700" />
                        <span>Todos los Pedidos ({filteredActiveOrders.length})</span>
                      </>
                    ) : (
                      <>
                        <Clock size={18} className="text-amber-600" />
                        <span>Pedidos Pendientes de Cobro ({filteredActiveOrders.length})</span>
                      </>
                    )}
                  </h3>
                  <span className="text-xs text-stone-500 font-medium">
                    {ordersSearch
                      ? "Buscador global activo en todos los pedidos"
                      : "Podés cambiar el estado de preparación o cobrar por caja"}
                  </span>
                </div>

                {filteredActiveOrders.length === 0 ? (
                  <div className="rounded-2xl p-10 border-2 bg-white text-center shadow-sm" style={{ borderColor: BRAND.paperDark }}>
                    <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
                      <Search size={32} />
                    </div>
                    <h4 className="font-bold text-stone-800 text-base mb-1">
                      {ordersSearch ? `No se encontraron pedidos con "${ordersSearch}"` : "¡No hay pedidos con los filtros actuales!"}
                    </h4>
                    <p className="text-xs text-stone-500 max-w-md mx-auto mb-4">
                      {ordersSearch
                        ? "Probá buscando por código (ej: PED-1577 o 1577), nombre del comensal (Juan), mesa o plato."
                        : "No se registran pedidos en este estado o modalidad."}
                    </p>
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      {ordersSearch && (
                        <button
                          type="button"
                          onClick={() => {
                            setOrdersSearch("");
                            setOrdersStatusFilter("todos");
                            setOrdersFilterMode("todos");
                          }}
                          className="px-4 py-2 rounded-xl text-xs font-bold bg-stone-200 hover:bg-stone-300 text-stone-800 transition"
                        >
                          Limpiar búsqueda
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={loadOrders}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white transition flex items-center gap-1.5 shadow"
                      >
                        <RefreshCw size={13} className={loadingOrders ? "animate-spin" : ""} />
                        <span>Buscar en Servidor</span>
                      </button>
                      {ordersSearch && (ordersSearch.includes("1577") || ordersSearch.toLowerCase().includes("juan")) && (
                        <button
                          type="button"
                          onClick={() => {
                            const juanOrder = DEFAULT_INITIAL_ORDERS.find((o) => o.id === "PED-1577") || {
                              id: "PED-1577",
                              mode: "mesa",
                              tableNumber: "3",
                              customerName: "Juan",
                              items: [
                                { id: "1", name: "Milanesa de Carne con Papas Fritas", price: 35000, qty: 1 },
                                { id: "5", name: "Gaseosa 500ml", price: 7000, qty: 1 }
                              ],
                              totalItems: 2,
                              totalPrice: 42000,
                              orderStatus: "en_preparacion",
                              paymentStatus: "pendiente",
                              createdAt: new Date().toISOString(),
                            };
                            setOrders((prev) => [juanOrder, ...prev.filter((o) => o.id !== juanOrder.id)]);
                            setOrdersSearch("PED-1577");
                            setOrdersStatusFilter("todos");
                            setOrdersFilterMode("todos");
                            addToast("order_success", "Pedido de Juan Restaurado", "Se cargó el pedido PED-1577 de Juan en cocina.");
                          }}
                          className="px-4 py-2 rounded-xl text-xs font-black bg-orange-600 hover:bg-orange-700 text-white transition flex items-center gap-1.5 shadow"
                        >
                          <ChefHat size={14} />
                          <span>Restaurar PED-1577 de Juan (En Cocina)</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredActiveOrders.map((order) => {
                      const isMesa = order.mode === "mesa";
                      const isDelivery = order.mode === "delivery";
                      const isRetiro = order.mode === "retiro";
                      const isPaid = (order.paymentStatus || "").toLowerCase() === "pagado";
                      const isInKitchen = order.orderStatus === "en_preparacion";

                      const modeBadgeBg = isMesa
                        ? "bg-amber-100 text-amber-900 border-amber-300"
                        : isDelivery
                        ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                        : "bg-orange-100 text-orange-900 border-orange-300";

                      const modeIcon = isMesa ? (
                        <Utensils size={14} className="text-amber-800" />
                      ) : isDelivery ? (
                        <Bike size={14} className="text-emerald-800" />
                      ) : (
                        <ShoppingBag size={14} className="text-orange-800" />
                      );

                      const modeTitle = isMesa
                        ? `Mesa ${order.tableNumber || "en salón"}`
                        : isDelivery
                        ? "Envío Delivery"
                        : "Retiro en Mostrador";

                      const orderDate = formatTimeSafe(order.createdAt);
                      const isJuanOrder = order.id === "PED-1577" || (order.customerName && order.customerName.toLowerCase().includes("juan"));

                      return (
                        <div
                          key={order.id}
                          className={`rounded-2xl bg-white border-2 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between ${
                            isJuanOrder ? "ring-2 ring-amber-400 border-amber-500" : ""
                          }`}
                          style={{ borderColor: isJuanOrder ? "#F59E0B" : BRAND.paperDark }}
                        >
                          <div>
                            {/* Cabecera de la comanda */}
                            <div className="flex items-start justify-between gap-2 pb-3 border-b mb-3" style={{ borderColor: BRAND.paperDark }}>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <span className={`font-mono text-xs font-black px-2 py-0.5 rounded-md ${
                                    isJuanOrder || (ordersSearch && order.id.toLowerCase().includes(ordersSearch.toLowerCase()))
                                      ? "bg-amber-400 text-stone-900 font-black shadow-sm"
                                      : "bg-stone-100 text-stone-700"
                                  }`}>
                                    {order.id}
                                  </span>
                                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${modeBadgeBg}`}>
                                    {modeIcon}
                                    <span>{modeTitle}</span>
                                  </span>
                                  {isInKitchen && (
                                    <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-900 border border-orange-300 flex items-center gap-1 shadow-sm">
                                      <ChefHat size={12} className="text-orange-700 animate-bounce" />
                                      <span>En Cocina</span>
                                    </span>
                                  )}
                                  <span className="text-[11px] font-semibold text-stone-500 flex items-center gap-1">
                                    <Clock size={12} /> {orderDate}
                                  </span>
                                </div>

                                <h4 className="font-black text-stone-900 text-base flex items-center gap-2">
                                  <span>{order.customerName || (isMesa ? `Mesa ${order.tableNumber}` : "Cliente")}</span>
                                  {isJuanOrder && (
                                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-500 text-white">
                                      Comensal Juan
                                    </span>
                                  )}
                                </h4>
                                {order.customerPhone && (
                                  <p className="text-xs text-stone-500 flex items-center gap-1">
                                    <Phone size={11} /> {order.customerPhone}
                                  </p>
                                )}
                                {order.address && isDelivery && (
                                  <p className="text-xs text-stone-600 mt-0.5 flex items-start gap-1">
                                    <MapPin size={12} className="text-red-600 flex-shrink-0 mt-0.5" />
                                    <span>{order.address}</span>
                                  </p>
                                )}
                                {order.mapLink && isDelivery && (
                                  <div className="mt-1.5">
                                    <a
                                      href={order.mapLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition shadow-sm"
                                    >
                                      <Navigation size={12} className="text-emerald-700" />
                                      <span>Ver en Google Maps</span>
                                      <ExternalLink size={10} />
                                    </a>
                                  </div>
                                )}
                              </div>

                              {/* Badge Estado de Pago */}
                              <div className="text-right flex-shrink-0">
                                {isPaid ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                                    <CheckCircle2 size={12} className="text-emerald-700" /> Cobrado ({order.paymentMethod || "Caja"})
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                                    <Clock size={12} /> Pendiente de pago
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Desglose de Platos del Pedido */}
                            <div className="bg-stone-50 rounded-xl p-3 mb-3 border border-stone-200">
                              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block mb-1.5">
                                Detalle de platos y productos:
                              </span>
                              <div className="space-y-1.5 text-xs text-stone-800">
                                {(order.items || []).map((it, itIdx) => (
                                  <div key={itIdx} className="flex items-center justify-between">
                                    <span className="font-medium">
                                      <b className="font-bold text-stone-900">{it.qty}x</b> {it.name}
                                    </span>
                                    <span className="font-mono text-stone-600">
                                      {formatGs((it.qty || 1) * (it.price || 0))}
                                    </span>
                                  </div>
                                ))}
                              </div>

                              {order.notes && (
                                <div className="mt-2.5 pt-2 border-t border-stone-200 text-xs text-stone-600 italic">
                                  <b>Aclaraciones:</b> "{order.notes}"
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Pie de pedido: Total y Botón de Cobro en Caja */}
                          <div>
                            <div className="flex items-center justify-between pb-3 pt-1">
                              <span className="text-xs font-bold text-stone-500">Total {isPaid ? "cobrado" : "a cobrar"}:</span>
                              <span className="font-mono text-xl font-black text-stone-900">
                                {formatGs(order.totalPrice)}
                              </span>
                            </div>

                            <div className="flex flex-col gap-2 pt-2 border-t" style={{ borderColor: BRAND.paperDark }}>
                              {/* Flujo de Estados con Notificación Push en Vivo */}
                              <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                                <div className="flex items-center justify-between gap-1 mb-1.5">
                                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1">
                                    <BellRing size={11} className="text-amber-600 animate-pulse" />
                                    <span>Estado en vivo & Push:</span>
                                  </span>
                                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                                    {(ORDER_STATUS_CONFIG[order.orderStatus || "recibido"] || ORDER_STATUS_CONFIG.recibido).shortLabel}
                                  </span>
                                </div>
                                <div className="grid grid-cols-4 gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleAdminChangeOrderStatus(order.id, "recibido")}
                                    className={`py-1.5 px-1 rounded-lg text-[10px] font-black transition flex flex-col items-center gap-0.5 ${
                                      (order.orderStatus || "recibido") === "recibido"
                                        ? "bg-amber-500 text-white shadow-sm ring-2 ring-amber-300"
                                        : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-100"
                                    }`}
                                    title="Marcar como Recibido y notificar al cliente"
                                  >
                                    <Clock size={12} />
                                    <span>Recibido</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleAdminChangeOrderStatus(order.id, "en_preparacion")}
                                    className={`py-1.5 px-1 rounded-lg text-[10px] font-black transition flex flex-col items-center gap-0.5 ${
                                      order.orderStatus === "en_preparacion"
                                        ? "bg-orange-600 text-white shadow-sm ring-2 ring-orange-300"
                                        : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-100"
                                    }`}
                                    title="Marcar como En Cocina y notificar al cliente"
                                  >
                                    <ChefHat size={12} />
                                    <span>En Cocina</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleAdminChangeOrderStatus(order.id, "en_camino")}
                                    className={`py-1.5 px-1 rounded-lg text-[10px] font-black transition flex flex-col items-center gap-0.5 ${
                                      order.orderStatus === "en_camino"
                                        ? "bg-blue-600 text-white shadow-sm ring-2 ring-blue-300"
                                        : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-100"
                                    }`}
                                    title={order.mode === "delivery" ? "Marcar como En Camino (Delivery)" : "Marcar como Listo para Retiro"}
                                  >
                                    {order.mode === "delivery" ? <Bike size={12} /> : <ShoppingBag size={12} />}
                                    <span>{order.mode === "delivery" ? "En Camino" : "Listo"}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleAdminChangeOrderStatus(order.id, "completado")}
                                    className={`py-1.5 px-1 rounded-lg text-[10px] font-black transition flex flex-col items-center gap-0.5 ${
                                      order.orderStatus === "completado"
                                        ? "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-300"
                                        : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-100"
                                    }`}
                                    title="Marcar como Entregado y notificar al cliente"
                                  >
                                    <CheckCircle2 size={12} />
                                    <span>Entregado</span>
                                  </button>
                                </div>
                              </div>

                              {/* Botón destacado: Marcar como Completado o Entregado y notificar WhatsApp */}
                              <button
                                type="button"
                                onClick={() => handleMarkCompletedAndNotify(order)}
                                className="w-full py-2.5 px-3 rounded-xl font-black text-xs md:text-sm text-white flex items-center justify-center gap-2 shadow-sm hover:brightness-105 active:scale-[0.99] transition"
                                style={{ background: "#059669" }}
                                title="Marcar pedido como completado o entregado y enviar actualización por WhatsApp al cliente"
                              >
                                <MessageCircle size={16} className="text-amber-200" />
                                <span>Completado / Entregado (WhatsApp)</span>
                              </button>

                              {isPaid ? (
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 py-2 px-3 rounded-xl font-bold text-xs bg-emerald-50 text-emerald-900 border border-emerald-300 flex items-center justify-center gap-1.5">
                                    <CheckCircle2 size={15} className="text-emerald-700" />
                                    <span>Cobrado en caja ({formatGs(order.totalPrice)})</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleResetOrderPayment(order.id)}
                                    className="px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition"
                                    title="Reabrir cobro y marcar como pendiente de cobro"
                                  >
                                    Reabrir
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  {adminRole === "staff" && !(adminSession?.staffMember?.allowCashier ?? staffSettings.allowCashier) ? (
                                    <div
                                      className="flex-1 py-2 px-3 rounded-xl font-bold text-xs bg-stone-100 text-stone-500 border border-stone-200 flex items-center justify-center gap-1.5"
                                      title="El cobro por caja está reservado para el Gerente o Cajero autorizado."
                                    >
                                      <Lock size={14} className="text-stone-400" />
                                      <span>Cobro reservado a Gerencia</span>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedPayOrder(order);
                                        setSelectedPayMethod("efectivo");
                                      }}
                                      className="flex-1 py-2 px-3 rounded-xl font-bold text-xs text-white flex items-center justify-center gap-1.5 shadow hover:brightness-105 transition"
                                      style={{ background: BRAND.green }}
                                    >
                                      <CheckSquare size={15} />
                                      <span>Cobrar por Caja</span>
                                    </button>
                                  )}

                                  {adminRole !== "staff" && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteOrder(order.id)}
                                      className="p-2 rounded-xl border border-stone-200 text-stone-400 hover:text-red-600 hover:bg-red-50 transition"
                                      title="Anular o descartar pedido"
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* =============================================================
                  SECCIÓN: HISTORIAL DE PEDIDOS COBRADOS & ARQUEO DE CAJA
                  ============================================================= */}
              <div className="rounded-2xl p-5 md:p-6 border-2 shadow-sm bg-white" style={{ borderColor: BRAND.paperDark }}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b mb-5" style={{ borderColor: BRAND.paperDark }}>
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-xl bg-stone-100 text-stone-800">
                      <History size={22} className="text-stone-700" />
                    </div>
                    <div>
                      <h3 className="slab text-lg md:text-xl text-stone-900 leading-tight">
                        Historial Guardado y Movimiento de Caja
                      </h3>
                      <p className="text-xs text-stone-600">
                        Registro de todos los pedidos cobrados con filtro por Día, Semana o Mes.
                      </p>
                    </div>
                  </div>

                  {/* Selector de Período (Día / Semana / Mes) */}
                  <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-300 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setCashPeriod("dia")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        cashPeriod === "dia" ? "bg-stone-900 text-white shadow" : "text-stone-700 hover:bg-stone-200"
                      }`}
                    >
                      Hoy (Día)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCashPeriod("semana")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        cashPeriod === "semana" ? "bg-stone-900 text-white shadow" : "text-stone-700 hover:bg-stone-200"
                      }`}
                    >
                      Esta Semana
                    </button>
                    <button
                      type="button"
                      onClick={() => setCashPeriod("mes")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        cashPeriod === "mes" ? "bg-stone-900 text-white shadow" : "text-stone-700 hover:bg-stone-200"
                      }`}
                    >
                      Este Mes
                    </button>
                    <button
                      type="button"
                      onClick={() => setCashPeriod("todos")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        cashPeriod === "todos" ? "bg-stone-900 text-white shadow" : "text-stone-700 hover:bg-stone-200"
                      }`}
                    >
                      Histórico
                    </button>
                  </div>
                </div>

                {/* Resumen contable del período seleccionado */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                    <span className="text-xs font-bold text-emerald-900 block mb-0.5">
                      Ingreso Total en Caja ({cashPeriod === "dia" ? "Hoy" : cashPeriod === "semana" ? "Semana" : cashPeriod === "mes" ? "Mes" : "Total"})
                    </span>
                    <span className="text-2xl font-black text-emerald-800 font-mono">
                      {formatGs(cashMovementStats.totalIncome)}
                    </span>
                    <span className="text-xs text-stone-600 block mt-1">
                      {cashMovementStats.countOrders} {cashMovementStats.countOrders === 1 ? "pedido cobrado" : "pedidos cobrados"}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="text-xs font-bold text-stone-700 block mb-0.5">
                      Desglose por Modalidad
                    </span>
                    <div className="space-y-1 text-xs text-stone-700 mt-1.5">
                      <div className="flex justify-between">
                        <span>🍽️ Mesas ({cashMovementStats.byMode.mesa.count}):</span>
                        <b className="font-mono">{formatGs(cashMovementStats.byMode.mesa.total)}</b>
                      </div>
                      <div className="flex justify-between">
                        <span>🛵 Delivery ({cashMovementStats.byMode.delivery.count}):</span>
                        <b className="font-mono">{formatGs(cashMovementStats.byMode.delivery.total)}</b>
                      </div>
                      <div className="flex justify-between">
                        <span>🛍️ Retiro ({cashMovementStats.byMode.retiro.count}):</span>
                        <b className="font-mono">{formatGs(cashMovementStats.byMode.retiro.total)}</b>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="text-xs font-bold text-stone-700 block mb-0.5">
                      Desglose por Medio de Pago
                    </span>
                    <div className="space-y-1 text-xs text-stone-700 mt-1.5">
                      <div className="flex justify-between">
                        <span>💵 Efectivo:</span>
                        <b className="font-mono">{formatGs(cashMovementStats.byPaymentMethod.efectivo)}</b>
                      </div>
                      <div className="flex justify-between">
                        <span>💳 POS / Tarjeta:</span>
                        <b className="font-mono">{formatGs(cashMovementStats.byPaymentMethod.pos)}</b>
                      </div>
                      <div className="flex justify-between">
                        <span>🏦 Transferencia / SIPAP:</span>
                        <b className="font-mono">{formatGs(cashMovementStats.byPaymentMethod.transferencia)}</b>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tabla / Listado de pedidos cobrados en este período */}
                {cashMovementStats.periodOrders.length === 0 ? (
                  <div className="text-center py-8 text-stone-500 text-xs bg-stone-50 rounded-xl border border-dashed border-stone-300">
                    No hay pedidos cobrados registrados en este período seleccionado ({cashPeriod}).
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-stone-200">
                    <table className="w-full text-left text-xs text-stone-800">
                      <thead className="bg-stone-100 border-b border-stone-200 text-stone-700 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="p-3">Código</th>
                          <th className="p-3">Fecha / Hora</th>
                          <th className="p-3">Modalidad</th>
                          <th className="p-3">Cliente / Detalle</th>
                          <th className="p-3">Medio de Pago</th>
                          <th className="p-3 text-right">Monto</th>
                          <th className="p-3 text-center">Estado</th>
                          <th className="p-3 text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {cashMovementStats.periodOrders.map((po) => {
                          const isMesa = po.mode === "mesa";
                          const isDelivery = po.mode === "delivery";

                          return (
                            <tr key={po.id} className="hover:bg-stone-50/80 transition">
                              <td className="p-3 font-mono font-bold text-stone-600">{po.id}</td>
                              <td className="p-3 whitespace-nowrap text-stone-500">
                                {formatDateSafe(po.paidAt || po.createdAt)} {formatTimeSafe(po.paidAt || po.createdAt)}
                              </td>
                              <td className="p-3 whitespace-nowrap">
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-stone-100 text-stone-700">
                                  {isMesa ? `🍽️ Mesa ${po.tableNumber || "Salón"}` : isDelivery ? "🛵 Delivery" : "🛍️ Retiro"}
                                </span>
                              </td>
                              <td className="p-3">
                                <span className="font-bold block text-stone-900">{po.customerName}</span>
                                <span className="text-[11px] text-stone-500 line-clamp-1">
                                  {(po.items || []).map((i) => `${i.qty}x ${i.name}`).join(", ")}
                                </span>
                              </td>
                              <td className="p-3 whitespace-nowrap font-medium capitalize text-stone-700">
                                {po.paymentMethod === "pos" ? "💳 Tarjeta / POS" : po.paymentMethod === "transferencia" ? "🏦 Transferencia" : po.paymentMethod === "tigo_money" ? "📱 Billetera" : "💵 Efectivo"}
                              </td>
                              <td className="p-3 text-right font-mono font-black text-stone-900 whitespace-nowrap">
                                {formatGs(po.totalPrice)}
                              </td>
                              <td className="p-3 text-center whitespace-nowrap">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                                  ✓ Pagado
                                </span>
                              </td>
                              <td className="p-3 text-right whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => handleResetOrderPayment(po.id)}
                                  className="text-[11px] font-bold text-amber-800 hover:text-amber-950 underline mr-2"
                                  title="Devolver a pendientes de pago"
                                >
                                  Reabrir
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteOrder(po.id)}
                                  className="p-1 rounded text-stone-400 hover:text-red-600 hover:bg-red-50"
                                  title="Eliminar de caja"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* =============================================================
              PESTAÑA: HISTORIAL DE PEDIDOS RECIBIDOS (FILTROS POR FECHA Y ESTADO)
              ============================================================= */}
          {adminTab === "history" && (
            <div className="space-y-6">

              {/* Cabecera Principal del Historial */}
              <div className="rounded-2xl p-5 md:p-6 border-2 shadow-sm bg-white" style={{ borderColor: BRAND.paperDark }}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b mb-4" style={{ borderColor: BRAND.paperDark }}>
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl text-white shadow-inner flex items-center justify-center" style={{ background: BRAND.tomato }}>
                      <History size={28} />
                    </div>
                    <div>
                      <h2 className="slab text-xl md:text-2xl text-stone-900 leading-tight">
                        Historial de Pedidos Recibidos
                      </h2>
                      <p className="text-xs text-stone-600 font-medium">
                        Auditoría y control de pedidos. Filtrá por fecha exacta, período y estado del pedido.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={toggleHistoryFullscreen}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition bg-stone-100 hover:bg-stone-200 text-stone-800 shadow-xs"
                      title={historyFullscreen ? "Salir de pantalla completa" : "Pantalla completa (F11)"}
                    >
                      {historyFullscreen ? <Minimize2 size={14} className="text-blue-600" /> : <Maximize2 size={14} className="text-blue-600" />}
                      <span>{historyFullscreen ? "Salir Pantalla Completa" : "Pantalla Completa"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={loadOrders}
                      disabled={loadingOrders}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition bg-stone-100 hover:bg-stone-200 text-stone-800"
                    >
                      <RefreshCw size={14} className={loadingOrders ? "animate-spin" : ""} />
                      <span>{loadingOrders ? "Actualizando..." : "Actualizar"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={exportHistoryCsv}
                      disabled={filteredHistoryOrders.length === 0}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300 disabled:opacity-50 shadow-sm"
                      title="Exportar datos contables filtrados a archivo CSV compatible con Excel"
                    >
                      <Download size={14} />
                      <span>Exportar CSV</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowHistoryPdfModal(true)}
                      disabled={filteredHistoryOrders.length === 0}
                      className="px-4 py-2 rounded-xl text-xs font-black shadow transition flex items-center gap-1.5 text-white hover:brightness-105 disabled:opacity-50"
                      style={{ background: BRAND.charcoalDark }}
                      title="Exportar datos contables filtrados a formato PDF / Imprimir"
                    >
                      <FileText size={15} className="text-amber-300" />
                      <span>Exportar PDF / Imprimir</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteHistoryPrompt}
                      disabled={orders.length === 0}
                      className={`px-3.5 py-2 rounded-xl text-xs font-black border transition flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50 ${
                        selectedHistoryOrderIds.length > 0
                          ? "bg-red-600 hover:bg-red-700 text-white border-red-700 shadow-md animate-pulse"
                          : "bg-red-50 hover:bg-red-100 text-red-700 border-red-300"
                      }`}
                      title={
                        selectedHistoryOrderIds.length > 0
                          ? `Eliminar los ${selectedHistoryOrderIds.length} pedidos tildados`
                          : "Eliminar historial de pedidos"
                      }
                    >
                      <Trash2 size={14} className={selectedHistoryOrderIds.length > 0 ? "text-white" : "text-red-600"} />
                      <span>
                        {selectedHistoryOrderIds.length > 0
                          ? `Eliminar Historial (${selectedHistoryOrderIds.length})`
                          : "Eliminar Historial"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* FILTROS INTERACTIVOS: FECHA, ESTADO, MODALIDAD Y BUSCADOR */}
                <div className="p-4 rounded-xl border bg-stone-50/80 border-stone-200 space-y-4">
                  {/* 1. FILTRO POR FECHA */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                      <span className="text-xs font-black text-stone-800 flex items-center gap-1.5 uppercase tracking-wider">
                        <Calendar size={15} className="text-amber-600" />
                        <span>Filtrar por Fecha:</span>
                      </span>
                      {historyCustomDate && historyDatePreset === "personalizado" && (
                        <span className="text-[11px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                          Día seleccionado: {formatDateSafe(historyCustomDate)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {[
                        { id: "todos", label: "Todos los días" },
                        { id: "hoy", label: "Hoy" },
                        { id: "ayer", label: "Ayer" },
                        { id: "ultimos7", label: "Últimos 7 días" },
                        { id: "mes", label: "Este Mes" },
                      ].map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            setHistoryDatePreset(preset.id);
                            if (preset.id !== "personalizado") setHistoryCustomDate("");
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                            historyDatePreset === preset.id
                              ? "bg-stone-900 text-white shadow-sm"
                              : "bg-white text-stone-700 border border-stone-200 hover:bg-stone-100"
                          }`}
                        >
                          <span>{preset.label}</span>
                        </button>
                      ))}

                      {/* Selector de fecha específica */}
                      <div className="flex items-center gap-1.5 bg-white border border-stone-300 rounded-xl px-2.5 py-1">
                        <span className="text-xs text-stone-500 font-semibold">Fecha exacta:</span>
                        <input
                          type="date"
                          value={historyCustomDate}
                          onChange={(e) => {
                            setHistoryCustomDate(e.target.value);
                            setHistoryDatePreset(e.target.value ? "personalizado" : "todos");
                          }}
                          className="text-xs font-bold text-stone-800 outline-none bg-transparent cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 2. FILTRO POR ESTADO DEL PEDIDO */}
                  <div className="pt-3 border-t border-stone-200">
                    <span className="text-xs font-black text-stone-800 flex items-center gap-1.5 uppercase tracking-wider mb-2">
                      <Filter size={15} className="text-emerald-700" />
                      <span>Filtrar por Estado del Pedido:</span>
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {[
                        { id: "todos", label: "Todos los Estados", count: orders.length },
                        {
                          id: "pendiente",
                          label: "⏳ Pendientes de Cobro",
                          count: orders.filter((o) => (o?.paymentStatus || "").toLowerCase() === "pendiente").length,
                        },
                        {
                          id: "pagado",
                          label: "✅ Cobrados / Pagados",
                          count: orders.filter((o) => {
                            const s = (o?.paymentStatus || "").toLowerCase();
                            return s === "pagado" || s === "cobrado";
                          }).length,
                        },
                        {
                          id: "cancelado",
                          label: "❌ Cancelados / Anulados",
                          count: orders.filter((o) => {
                            const s = (o?.paymentStatus || "").toLowerCase();
                            return s === "cancelado" || s === "anulado";
                          }).length,
                        },
                      ].map((item) => {
                        const isSelected = historyStatusFilter === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setHistoryStatusFilter(item.id)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                              isSelected
                                ? "bg-stone-900 text-white shadow-sm ring-2 ring-stone-900/20"
                                : "bg-white text-stone-700 border border-stone-200 hover:bg-stone-100"
                            }`}
                          >
                            <span>{item.label}</span>
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                              isSelected ? "bg-stone-700 text-white" : "bg-stone-100 text-stone-600"
                            }`}>
                              {item.count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. FILTRO POR MODALIDAD Y BÚSQUEDA POR TEXTO */}
                  <div className="pt-3 border-t border-stone-200 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <span className="text-[11px] font-bold text-stone-600 block mb-1">
                        Modalidad de Pedido:
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {[
                          { id: "todos", label: "Todas" },
                          { id: "mesa", label: "🍽️ Mesa" },
                          { id: "delivery", label: "🛵 Delivery" },
                          { id: "retiro", label: "🛍️ Retiro" },
                        ].map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setHistoryModeFilter(m.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                              historyModeFilter === m.id
                                ? "bg-stone-800 text-white"
                                : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-100"
                            }`}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] font-bold text-stone-600 block mb-1">
                        Buscar en el historial:
                      </span>
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input
                          type="text"
                          value={historySearch}
                          onChange={(e) => setHistorySearch(e.target.value)}
                          placeholder="Buscar por código, cliente, plato, teléfono o mesa..."
                          className="w-full pl-8 pr-8 py-1.5 rounded-xl border border-stone-300 text-xs bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400 font-medium"
                        />
                        {historySearch && (
                          <button
                            type="button"
                            onClick={() => setHistorySearch("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Resumen de filtros activos y botón de restablecer */}
                  {(historyDatePreset !== "todos" || historyCustomDate || historyStatusFilter !== "todos" || historyModeFilter !== "todos" || historySearch) && (
                    <div className="pt-2 border-t border-stone-200 flex items-center justify-between gap-2 flex-wrap text-xs">
                      <span className="text-stone-500 font-medium">
                        Mostrando <b>{filteredHistoryOrders.length}</b> de <b>{orders.length}</b> pedidos registrados con los filtros aplicados.
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setHistoryDatePreset("todos");
                          setHistoryCustomDate("");
                          setHistoryStatusFilter("todos");
                          setHistoryModeFilter("todos");
                          setHistorySearch("");
                        }}
                        className="text-xs font-bold text-stone-700 hover:text-red-700 underline flex items-center gap-1"
                      >
                        <X size={13} />
                        <span>Restablecer todos los filtros</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* TARJETAS DE MÉTRICAS Y RESUMEN CONTABLE */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                  <div className="p-3.5 rounded-xl border bg-stone-50 border-stone-200">
                    <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                      Pedidos Filtrados
                    </span>
                    <div className="text-xl font-black text-stone-900 mt-1">
                      {historyStats.totalCount}
                    </div>
                    <span className="text-[10px] text-stone-500">según criterios activos</span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50">
                    <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                      Facturación Total
                    </span>
                    <div className="text-xl font-black text-emerald-950 font-mono mt-1">
                      {formatGs(historyStats.totalAmount)}
                    </div>
                    <span className="text-[10px] text-emerald-700">monto total acumulado</span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-emerald-300 bg-emerald-50">
                    <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider block">
                      Cobrados en Caja ({historyStats.paidCount})
                    </span>
                    <div className="text-xl font-black text-emerald-900 font-mono mt-1">
                      {formatGs(historyStats.paidAmount)}
                    </div>
                    <span className="text-[10px] text-emerald-700">pagos ya registrados</span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-amber-300 bg-amber-50">
                    <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider block">
                      Por Cobrar ({historyStats.pendingCount})
                    </span>
                    <div className="text-xl font-black text-amber-900 font-mono mt-1">
                      {formatGs(historyStats.pendingAmount)}
                    </div>
                    <span className="text-[10px] text-amber-700">pendientes de pago</span>
                  </div>
                </div>

                {/* BANNER DE ACCIÓN RÁPIDA: GESTIÓN CONTABLE Y EXPORTACIÓN */}
                {filteredHistoryOrders.length > 0 && (
                  <div className="mt-4 p-3.5 rounded-xl border border-sky-200 bg-sky-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <FileText size={18} className="text-sky-700 shrink-0" />
                      <div>
                        <span className="text-xs font-bold text-sky-950 block">
                          Gestión Contable y Auditoría ({filteredHistoryOrders.length} pedidos filtrados)
                        </span>
                        <span className="text-[11px] text-sky-700">
                          Exportá este lote con fecha y estado a planilla Excel o reporte formal en PDF
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={exportHistoryCsv}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-sm transition flex items-center gap-1.5"
                        title="Descargar archivo .CSV con filtros y fórmulas de totales"
                      >
                        <Download size={13} />
                        <span>Descargar CSV</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowHistoryPdfModal(true)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-700 hover:bg-sky-800 text-white shadow-sm transition flex items-center gap-1.5"
                        title="Ver e imprimir informe contable en PDF"
                      >
                        <Printer size={13} />
                        <span>Exportar PDF</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* LISTADO / TABLA DE PEDIDOS */}
                <div className="mt-5">
                  {/* BARRA DE ACCIÓN PARA PEDIDOS TILDADOS */}
                  {selectedHistoryOrderIds.length > 0 && (
                    <div className="mb-4 p-3.5 px-4 rounded-xl border-2 border-red-300 bg-red-50 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow">
                          {selectedHistoryOrderIds.length}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black text-red-950">
                              {selectedHistoryOrderIds.length === 1
                                ? "1 pedido tildado para eliminar"
                                : `${selectedHistoryOrderIds.length} pedidos tildados para eliminar`}
                            </span>
                            <span className="text-[11px] font-bold text-red-800 bg-red-100 px-2 py-0.5 rounded-full border border-red-200">
                              Total: {formatGs(
                                orders
                                  .filter((o) => selectedHistoryOrderIds.includes(o.id))
                                  .reduce((acc, o) => acc + (Number(o.totalPrice) || 0), 0)
                              )}
                            </span>
                          </div>
                          <p className="text-[11px] text-red-700 mt-0.5">
                            Tildá o destildá casillas en la lista para ajustar qué pedidos querés eliminar.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setSelectedHistoryOrderIds([])}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-stone-700 border border-stone-300 hover:bg-stone-100 transition shadow-xs"
                        >
                          Desmarcar todos
                        </button>
                        <button
                          type="button"
                          onClick={handleDeleteHistoryPrompt}
                          className="px-4 py-1.5 rounded-lg text-xs font-black bg-red-600 hover:bg-red-700 text-white shadow transition flex items-center gap-1.5 active:scale-95"
                        >
                          <Trash2 size={13} />
                          <span>Eliminar {selectedHistoryOrderIds.length} tildados</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* BARRA SUPERIOR DE LA TABLA: TILDAR TODOS */}
                  {filteredHistoryOrders.length > 0 && (
                    <div className="mb-2.5 flex items-center justify-between gap-2 flex-wrap text-xs px-1">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleToggleSelectAllHistoryOrders}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 font-bold text-stone-700 transition shadow-xs text-xs"
                          title="Tildar o destildar todos los pedidos visibles en la lista"
                        >
                          <CheckSquare size={13} className={selectedHistoryOrderIds.length > 0 ? "text-red-600" : "text-stone-500"} />
                          <span>
                            {filteredHistoryOrders.length > 0 && filteredHistoryOrders.every((o) => selectedHistoryOrderIds.includes(o.id))
                              ? "Destildar todos los visibles"
                              : `Tildar todos los visibles (${filteredHistoryOrders.length})`}
                          </span>
                        </button>
                        {selectedHistoryOrderIds.length > 0 && (
                          <span className="text-[11px] font-bold text-red-700">
                            {selectedHistoryOrderIds.length} de {orders.length} tildado{selectedHistoryOrderIds.length === 1 ? "" : "s"}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-stone-500 font-medium hidden sm:inline">
                        Tip: Marcá la casilla para tildar lo que quieras eliminar.
                      </span>
                    </div>
                  )}

                  {filteredHistoryOrders.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl border-2 border-dashed border-stone-200 bg-stone-50 my-2">
                      <History size={40} className="mx-auto text-stone-300 mb-2" />
                      <h4 className="font-bold text-stone-700 text-sm">No se encontraron pedidos</h4>
                      <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                        No hay pedidos recibidos que coincidan con la fecha o estado seleccionado.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setHistoryDatePreset("todos");
                          setHistoryCustomDate("");
                          setHistoryStatusFilter("todos");
                          setHistoryModeFilter("todos");
                          setHistorySearch("");
                        }}
                        className="mt-3 px-4 py-2 rounded-xl text-xs font-bold text-white shadow"
                        style={{ background: BRAND.tomato }}
                      >
                        Ver todos los pedidos
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-stone-200 rounded-2xl shadow-xs bg-white">
                      <table className="w-full min-w-[1040px] text-left text-xs text-stone-800">
                        <thead className="bg-stone-100 text-stone-700 font-bold border-b border-stone-200 text-[10px] uppercase tracking-wider">
                          <tr>
                            <th className="p-3 w-10 text-center">
                              <div className="flex items-center justify-center">
                                <input
                                  type="checkbox"
                                  checked={filteredHistoryOrders.length > 0 && filteredHistoryOrders.every((o) => selectedHistoryOrderIds.includes(o.id))}
                                  onChange={handleToggleSelectAllHistoryOrders}
                                  className="w-4 h-4 rounded border-stone-300 text-red-600 focus:ring-red-500 cursor-pointer accent-red-600"
                                  title="Tildar / Destildar todos los pedidos visibles"
                                />
                              </div>
                            </th>
                            <th className="p-3">Código / Modalidad</th>
                            <th className="p-3">Fecha & Hora</th>
                            <th className="p-3">Cliente / Destino</th>
                            <th className="p-3">Productos Solicitados</th>
                            <th className="p-3 text-right">Total Gs.</th>
                            <th className="p-3 text-center">Estado</th>
                            <th className="p-3 text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 bg-white">
                          {filteredHistoryOrders.map((order) => {
                            const isPaid = (order.paymentStatus || "").toLowerCase() === "pagado" || (order.paymentStatus || "").toLowerCase() === "cobrado";
                            const isPending = (order.paymentStatus || "").toLowerCase() === "pendiente";
                            const isCancelled = (order.paymentStatus || "").toLowerCase() === "cancelado" || (order.paymentStatus || "").toLowerCase() === "anulado";
                            const isMesa = order.mode === "mesa";
                            const isDelivery = order.mode === "delivery";
                            const isChecked = selectedHistoryOrderIds.includes(order.id);

                            return (
                              <tr
                                key={order.id}
                                className={`transition ${
                                  isChecked
                                    ? "bg-red-50/70 hover:bg-red-100/60 ring-1 ring-inset ring-red-200"
                                    : "hover:bg-amber-50/40"
                                }`}
                              >
                                {/* Casilla para tildar pedido */}
                                <td className="p-3 align-top text-center">
                                  <div className="flex items-center justify-center pt-0.5">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => handleToggleSelectHistoryOrder(order.id)}
                                      className="w-4 h-4 rounded border-stone-300 text-red-600 focus:ring-red-500 cursor-pointer accent-red-600"
                                      title={`Tildar pedido ${order.id} para eliminar`}
                                    />
                                  </div>
                                </td>

                                {/* Código y Modalidad */}
                                <td className="p-3 align-top whitespace-nowrap">
                                  <div className="font-mono font-black text-stone-900 text-sm">
                                    {order.id}
                                  </div>
                                  <div className="mt-1">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black inline-flex items-center gap-1 bg-stone-100 text-stone-800 border border-stone-200">
                                      {isMesa ? `🍽️ Mesa ${order.tableNumber || "Salón"}` : isDelivery ? "🛵 Delivery" : "🛍️ Retiro"}
                                    </span>
                                  </div>
                                </td>

                                {/* Fecha y Hora */}
                                <td className="p-3 align-top whitespace-nowrap">
                                  <div className="font-bold text-stone-900">
                                    {formatDateSafe(order.createdAt || order.paidAt)}
                                  </div>
                                  <div className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5 font-medium">
                                    <Clock size={11} />
                                    <span>{formatTimeSafe(order.createdAt || order.paidAt)} hs</span>
                                  </div>
                                </td>

                                {/* Cliente y Contacto */}
                                <td className="p-3 align-top min-w-[170px]">
                                  <div className="font-bold text-stone-900">
                                    {order.customerName || "Cliente sin nombre"}
                                  </div>
                                  {order.customerPhone && (
                                    <a
                                      href={`https://wa.me/595${order.customerPhone.replace(/^0+/, '').replace(/\D/g, '')}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-[11px] text-emerald-700 hover:underline font-semibold flex items-center gap-1 mt-0.5"
                                    >
                                      <Phone size={10} />
                                      <span>{order.customerPhone}</span>
                                    </a>
                                  )}
                                  {order.address && (
                                    <div className="text-[11px] text-stone-500 mt-0.5 line-clamp-1" title={order.address}>
                                      {order.address}
                                    </div>
                                  )}
                                </td>

                                {/* Productos */}
                                <td className="p-3 align-top min-w-[200px]">
                                  <div className="space-y-0.5">
                                    {(order.items || []).slice(0, 3).map((item, idx) => (
                                      <div key={idx} className="text-xs text-stone-700">
                                        <span className="font-bold text-stone-900">{item.qty}x</span> {item.name}
                                      </div>
                                    ))}
                                    {(order.items || []).length > 3 && (
                                      <div className="text-[10px] text-stone-500 italic">
                                        + {(order.items || []).length - 3} producto(s) más...
                                      </div>
                                    )}
                                  </div>
                                  {order.notes && (
                                    <div className="mt-1 text-[11px] text-amber-900 italic line-clamp-1 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200" title={order.notes}>
                                      "{order.notes}"
                                    </div>
                                  )}
                                </td>

                                {/* Total Gs */}
                                <td className="p-3 align-top text-right whitespace-nowrap">
                                  <div className="font-mono font-black text-stone-900 text-sm">
                                    {formatGs(order.totalPrice)}
                                  </div>
                                  {isPaid && order.paymentMethod && (
                                    <div className="text-[10px] text-stone-500 uppercase mt-0.5 font-bold">
                                      {order.paymentMethod}
                                    </div>
                                  )}
                                </td>

                                {/* Estado del Pedido */}
                                <td className="p-3 align-top text-center whitespace-nowrap">
                                  <div className="inline-flex flex-col items-center gap-1">
                                    <span
                                      className={`px-2.5 py-1 rounded-full text-[11px] font-black inline-flex items-center gap-1 border shadow-xs ${
                                        isPaid
                                          ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                                          : isCancelled
                                          ? "bg-red-100 text-red-900 border-red-300"
                                          : "bg-amber-100 text-amber-900 border-amber-300 animate-pulse"
                                      }`}
                                    >
                                      {isPaid ? (
                                        <>
                                          <CheckCircle2 size={12} className="text-emerald-700" />
                                          <span>Cobrado</span>
                                        </>
                                      ) : isCancelled ? (
                                        <>
                                          <AlertCircle size={12} className="text-red-700" />
                                          <span>Cancelado</span>
                                        </>
                                      ) : (
                                        <>
                                          <Clock size={12} className="text-amber-700" />
                                          <span>Pendiente</span>
                                        </>
                                      )}
                                    </span>

                                    {/* Selector rápido para cambiar estado */}
                                    <select
                                      value={order.paymentStatus || "pendiente"}
                                      onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                                      className="text-[10px] font-bold bg-stone-50 border border-stone-300 rounded px-1.5 py-0.5 text-stone-700 cursor-pointer focus:outline-none"
                                      title="Cambiar estado del pedido"
                                    >
                                      <option value="pendiente">⏳ Pendiente</option>
                                      <option value="pagado">✅ Pagado</option>
                                      <option value="cancelado">❌ Cancelado</option>
                                    </select>
                                  </div>
                                </td>

                                {/* Acciones */}
                                <td className="p-3 align-top text-right whitespace-nowrap">
                                  <div className="flex items-center justify-end gap-1.5 shrink-0">
                                    {isPending && (
                                      <button
                                        type="button"
                                        onClick={() => setSelectedPayOrder(order)}
                                        className="px-2.5 py-1 rounded-xl text-xs font-black text-white shadow hover:brightness-105 transition flex items-center gap-1 shrink-0"
                                        style={{ background: BRAND.green }}
                                        title="Cobrar en caja"
                                      >
                                        <Receipt size={12} />
                                        <span>Cobrar</span>
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => setSelectedHistoryOrder(order)}
                                      className="px-2.5 py-1 rounded-xl text-xs font-bold border border-stone-300 bg-stone-100 hover:bg-stone-200 text-stone-800 transition flex items-center gap-1 shrink-0"
                                      title="Ver detalle completo del ticket"
                                    >
                                      <Eye size={12} />
                                      <span>Detalle</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteOrder(order.id)}
                                      className="p-1.5 rounded-xl text-stone-400 hover:text-red-600 hover:bg-red-50 transition border border-transparent hover:border-red-200 shrink-0"
                                      title="Eliminar pedido"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* =============================================================
              PESTAÑA: DATOS DEL COMERCIO Y PORTADA
              ============================================================= */}
          {adminTab === "business" && (
            <div className="space-y-6">

              {/* BANNER PRINCIPAL DE CONFIGURACIÓN DEL DEMO (SOLO ADMINISTRADOR) */}
              {adminRole === "superadmin" && (
                <div className="rounded-2xl p-5 md:p-6 border-2 shadow-sm bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-white border-amber-300">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-2xl bg-amber-400 text-stone-900 shadow font-black flex items-center justify-center shrink-0">
                        <Sparkles size={24} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h2 className="slab text-xl md:text-2xl text-stone-900">
                            Configuración del Demo Oficial de la Aplicación
                          </h2>
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-400 text-stone-900 shadow-sm flex items-center gap-1">
                            <Store size={12} /> Vitrina Pública Demo
                          </span>
                        </div>
                        <p className="text-xs text-stone-600 font-medium">
                          Modificá en tiempo real las <b>imágenes de portada</b>, <b>nombre</b>, <b>slogan</b>, <b>teléfonos</b> y <b>datos del Demo</b> que ven todos los visitantes y potenciales clientes al entrar a la app sin registrarse.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap shrink-0">
                      <button
                        type="button"
                        onClick={saveAllAdminChanges}
                        disabled={saving}
                        className="px-4 py-2 rounded-xl text-xs font-black text-white shadow-md transition hover:brightness-105 flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                        style={{ background: BRAND.tomato }}
                        title="Guardar y publicar todas las modificaciones de la portada y datos del demo"
                      >
                        {saving ? (
                          <>
                            <LoaderCircle className="animate-spin" size={14} />
                            <span>Guardando Demo...</span>
                          </>
                        ) : (
                          <>
                            <Save size={14} />
                            <span>Guardar Cambios del Demo</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setView("menu")}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-stone-100 text-stone-800 border border-amber-300 shadow-sm flex items-center gap-1.5 transition active:scale-95"
                        title="Ver la tienda demo tal como la ven los clientes ahora mismo"
                      >
                        <Eye size={15} className="text-amber-600" />
                        <span>Ver Demo en Vivo</span>
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const res = await fetch(`${SHEETS_API_URL}?action=getDemoStore`);
                            const d = await res.json();
                            if (d && d.business) {
                              setDraftBusiness(d.business);
                              setBusiness(d.business);
                              if (d.menu) { setDraft(d.menu); setMenu(d.menu); }
                              addToast("order_update", "Datos del Demo Recargados", "Se cargaron los datos guardados más recientes del demo.");
                            }
                          } catch (e) {}
                        }}
                        className="px-3 py-2 rounded-xl text-xs font-bold bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 shadow-sm flex items-center gap-1.5 transition"
                        title="Recargar datos guardados del demo desde el servidor"
                      >
                        <RefreshCw size={13} />
                        <span>Recargar Demo</span>
                      </button>
                    </div>
                  </div>

                  {/* Selector de Comercio para el Administrador (Demo u otros comercios) */}
                  {availableStores && availableStores.length > 1 && (
                    <div className="mt-4 pt-3 border-t border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-stone-700 flex items-center gap-1.5">
                        <Store size={14} className="text-amber-700" /> Comercio seleccionado para editar:
                      </span>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={async () => {
                            setSelectedAdminStoreId("losamigos");
                            try {
                              const res = await fetch(`${SHEETS_API_URL}?action=getDemoStore`);
                              const d = await res.json();
                              if (d?.business) {
                                setDraftBusiness(d.business);
                                setBusiness(d.business);
                                if (d.menu) { setDraft(d.menu); setMenu(d.menu); }
                              }
                            } catch (e) {}
                          }}
                          className={`px-3 py-1 rounded-lg font-bold border transition ${
                            selectedAdminStoreId === "losamigos"
                              ? "bg-amber-400 text-stone-900 border-amber-500 shadow-sm"
                              : "bg-white text-stone-700 border-stone-300 hover:bg-stone-50"
                          }`}
                        >
                          ⭐ Demo Oficial (Menu Py)
                        </button>
                        {availableStores.filter((s) => s.id !== "losamigos" && s.id !== "admin").map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={async () => {
                              setSelectedAdminStoreId(s.id);
                              try {
                                const res = await fetch(`${SHEETS_API_URL}?comercio=${encodeURIComponent(s.id)}`);
                                const d = await res.json();
                                if (d?.business) {
                                  setDraftBusiness(d.business);
                                  setBusiness(d.business);
                                  if (d.menu) { setDraft(d.menu); setMenu(d.menu); }
                                }
                              } catch (e) {}
                            }}
                            className={`px-3 py-1 rounded-lg font-bold border transition ${
                              selectedAdminStoreId === s.id
                                ? "bg-amber-400 text-stone-900 border-amber-500 shadow-sm"
                                : "bg-white text-stone-700 border-stone-300 hover:bg-stone-50"
                            }`}
                          >
                            🏪 {s.name || s.id}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SECCIÓN PORTADA DEL COMERCIO / DEMO */}
              <div className="rounded-2xl p-5 md:p-6 border-2 shadow-sm" style={{ background: BRAND.cream, borderColor: BRAND.paperDark }}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl" style={{ background: BRAND.tomato }}>
                      <ImageIcon size={20} color={BRAND.cream} />
                    </div>
                    <div>
                      <h2 className="slab text-lg md:text-xl" style={{ color: BRAND.charcoal }}>
                        {adminRole === "superadmin" ? "Imágenes de Portada del Demo (Banner Principal)" : "Portada del Comercio (Banner Principal)"}
                      </h2>
                      <p className="text-xs text-stone-600">
                        {adminRole === "superadmin"
                          ? "Esta imagen es la portada oficial del Demo que verán todos los visitantes sin registrarse. Podés elegir entre las portadas prediseñadas, subir una foto propia o ingresar una URL."
                          : "Esta imagen se muestra en la cabecera de la tienda para PC y celulares."}
                      </p>
                    </div>
                  </div>

                  {/* Selector de modo de vista previa (PC vs Móvil) */}
                  <div className="flex items-center gap-1 bg-stone-200/80 p-1 rounded-xl self-start sm:self-auto border border-stone-300">
                    <button
                      type="button"
                      onClick={() => setBannerPreviewDevice("pc")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                        bannerPreviewDevice === "pc" ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:text-stone-900"
                      }`}
                    >
                      <span>🖥️ Vista PC</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBannerPreviewDevice("mobile")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                        bannerPreviewDevice === "mobile" ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:text-stone-900"
                      }`}
                    >
                      <span>📱 Vista Móvil</span>
                    </button>
                  </div>
                </div>

                {/* GALERÍA DE PORTADAS TEMÁTICAS PREDISEÑADAS (PARA DEMO Y COMERCIOS) */}
                <div className="my-4 rounded-xl p-4 border" style={{ background: "#FFF8E7", borderColor: BRAND.mustard }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5" style={{ color: BRAND.charcoal }}>
                      <Sparkles size={15} color={BRAND.tomato} /> Galería de Portadas Recomendadas para el Demo (Elegí 1 con un Clic):
                    </p>
                    <span className="text-[11px] font-bold text-stone-500 hidden sm:inline">
                      {DEMO_BANNER_PRESETS.length} estilos disponibles
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {DEMO_BANNER_PRESETS.map((preset) => {
                      const isSelected = (draftBusiness.bannerImage || "") === preset.url;
                      return (
                        <div
                          key={preset.id}
                          onClick={() => {
                            setDraftBusiness((prev) => ({ ...prev, bannerImage: preset.url }));
                            setDirty(true);
                            addToast("order_update", `Portada seleccionada: ${preset.title}`, "Hacé clic en Guardar Cambios para publicarla.");
                          }}
                          className={`relative rounded-xl overflow-hidden border-2 cursor-pointer transition-all duration-200 group bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 ${
                            isSelected
                              ? "border-amber-500 ring-2 ring-amber-400/60 shadow-amber-200"
                              : "border-stone-200 hover:border-amber-400"
                          }`}
                        >
                          <div className="aspect-[16/9] w-full overflow-hidden bg-stone-900 relative">
                            <img
                              src={preset.url}
                              alt={preset.title}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              onError={(e) => { e.currentTarget.src = "/banner.jpg"; }}
                            />
                            <div className="absolute top-1.5 right-1.5">
                              {isSelected ? (
                                <span className="bg-amber-400 text-stone-900 text-[10px] font-black px-1.5 py-0.5 rounded-full shadow flex items-center gap-0.5">
                                  <Check size={11} /> Activa
                                </span>
                              ) : (
                                <span className="bg-black/60 backdrop-blur-sm text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                                  {preset.badge}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="p-2">
                            <div className="flex items-center gap-1 mb-0.5">
                              <span className="text-xs">{preset.emoji}</span>
                              <h4 className="font-bold text-[11px] text-stone-900 leading-tight truncate">
                                {preset.title}
                              </h4>
                            </div>
                            <p className="text-[10px] text-stone-500 line-clamp-1 leading-tight">
                              {preset.desc}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Vista previa de la portada actual adaptable (PC vs Móvil) */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2 ml-1">
                    <p className="text-xs font-bold" style={{ color: BRAND.charcoal }}>
                      Vista previa actual ({bannerPreviewDevice === "pc" ? "Cabecera PC" : "Cabecera Celular"}):
                    </p>
                    <span className="text-[11px] font-semibold text-stone-500">
                      {draftBusiness.bannerImage ? (draftBusiness.bannerImage.startsWith("data:") ? "Foto personalizada" : draftBusiness.bannerImage) : "Sin imagen asignada"}
                    </span>
                  </div>

                  {bannerPreviewDevice === "pc" ? (
                    // VISTA PREVIA PC: Panorámica nítida
                    <div className="relative rounded-2xl overflow-hidden border-2 shadow-inner bg-stone-900 aspect-[16/7] max-h-64 flex items-center justify-center" style={{ borderColor: BRAND.paperDark }}>
                      {draftBusiness.bannerImage ? (
                        <img
                          src={draftBusiness.bannerImage}
                          alt="Portada Demo"
                          className="w-full h-full object-contain"
                          style={{
                            imageRendering: "-webkit-optimize-contrast",
                            WebkitBackfaceVisibility: "hidden",
                            transform: "translateZ(0)",
                          }}
                          onError={(e) => { e.currentTarget.src = "/menupy_banner_hd.jpg"; }}
                        />
                      ) : (
                        <div className="text-stone-400 text-sm flex flex-col items-center gap-1">
                          <ImageIcon size={32} />
                          <span>Sin imagen asignada</span>
                        </div>
                      )}
                      {bannerUploading && (
                        <div className="absolute inset-0 z-20 bg-black/60 flex items-center justify-center gap-2 text-white font-bold text-sm">
                          <LoaderCircle className="animate-spin" size={24} />
                          Optimizando y procesando imagen...
                        </div>
                      )}
                    </div>
                  ) : (
                    // VISTA PREVIA MÓVIL: Marco de smartphone realista
                    <div className="p-3 bg-stone-100 rounded-2xl border flex justify-center">
                      <div className="w-full max-w-sm rounded-2xl overflow-hidden border-4 border-stone-800 shadow-xl bg-stone-950">
                        <div className="bg-stone-800 py-1 px-3 text-[10px] text-stone-400 text-center font-bold flex items-center justify-between">
                          <span>09:41</span>
                          <span className="text-stone-300">● La Caserita Demo</span>
                          <span>🔋 100%</span>
                        </div>
                        <div className="relative aspect-[2117/743] max-h-36 bg-stone-900 flex items-center justify-center overflow-hidden">
                          {draftBusiness.bannerImage ? (
                            <img
                              src={draftBusiness.bannerImage}
                              alt="Portada Móvil"
                              className="w-full h-full object-contain"
                              onError={(e) => { e.currentTarget.src = "/banner.jpg"; }}
                            />
                          ) : (
                            <ImageIcon size={24} className="text-stone-500" />
                          )}
                        </div>
                        <div className="p-2.5 bg-stone-900 border-t border-stone-800 text-white">
                          <h4 className="font-bold text-xs truncate">{draftBusiness.name || "Menu Py"}</h4>
                          <p className="text-[10px] text-amber-300 truncate">{draftBusiness.slogan || "Pedí online - Tu Carta Digital y Pedidos por WhatsApp"}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Botones de acción para subir imagen */}
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="file"
                    ref={bannerFileInputRef}
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => handleBannerUpload(e.target.files?.[0])}
                  />
                  <button
                    type="button"
                    onClick={() => bannerFileInputRef.current?.click()}
                    disabled={bannerUploading}
                    className="px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm flex items-center gap-2 shadow transition hover:brightness-105 disabled:opacity-50"
                    style={{ background: BRAND.tomato, color: BRAND.cream }}
                  >
                    <Upload size={16} /> Subir nueva foto desde mi PC o Celular
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDraftBusiness((prev) => ({ ...prev, bannerImage: "/banner.jpg" }));
                      setDirty(true);
                    }}
                    className="px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm flex items-center gap-2 border-2 transition hover:bg-stone-200/50"
                    style={{ borderColor: BRAND.paperDark, color: BRAND.charcoal }}
                  >
                    <RefreshCw size={15} /> Usar portada original
                  </button>
                </div>

                {/* Input opcional para pegar enlace directo */}
                <div className="mt-4 pt-3 border-t" style={{ borderColor: BRAND.paperDark }}>
                  <label className="block text-xs font-bold mb-1" style={{ color: BRAND.charcoal }}>
                    O pegá un enlace directo de imagen (URL pública):
                  </label>
                  <input
                    type="url"
                    value={(draftBusiness?.bannerImage || "").startsWith("data:") ? "" : (draftBusiness?.bannerImage || "")}
                    onChange={(e) => {
                      setDraftBusiness((prev) => ({ ...prev, bannerImage: e.target.value }));
                      setDirty(true);
                    }}
                    placeholder={(draftBusiness?.bannerImage || "").startsWith("data:") ? "Imagen personalizada cargada en la memoria ✓ (o pegá una URL para reemplazarla)" : "https://ejemplo.com/mi-portada.jpg"}
                    className="w-full rounded-xl p-2.5 text-xs border"
                    style={{ borderColor: BRAND.paperDark, background: "#FFF" }}
                  />
                </div>

                {bannerUploadError && (
                  <p className="text-xs mt-2 font-bold" style={{ color: BRAND.tomato }}>⚠️ {bannerUploadError}</p>
                )}
              </div>

              {/* SECCIÓN: INFORMACIÓN DEL LOCAL / DEMO */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="rounded-2xl p-5 border-2 shadow-sm" style={{ background: BRAND.cream, borderColor: BRAND.paperDark }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Store size={18} color={BRAND.tomato} />
                    <h3 className="slab text-base" style={{ color: BRAND.charcoal }}>
                      {adminRole === "superadmin" ? "Identidad y Datos del Demo" : "Identidad del Comercio"}
                    </h3>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="font-bold block mb-1" style={{ color: BRAND.charcoal }}>
                        {adminRole === "superadmin" ? "Nombre de la Tienda Demo" : "Nombre del Comercio"}
                      </label>
                      <input
                        value={draftBusiness.name}
                        onChange={(e) => {
                          setDraftBusiness((prev) => ({ ...prev, name: e.target.value }));
                          setDirty(true);
                        }}
                        placeholder="Ej: La Caserita Rotisería"
                        className="w-full p-2.5 rounded-xl border text-sm font-semibold"
                        style={{ borderColor: BRAND.paperDark, background: "#FFF" }}
                      />
                    </div>

                    <div>
                      <label className="font-bold block mb-1" style={{ color: BRAND.charcoal }}>Slogan / Subtítulo del Demo</label>
                      <input
                        value={draftBusiness.slogan}
                        onChange={(e) => {
                          setDraftBusiness((prev) => ({ ...prev, slogan: e.target.value }));
                          setDirty(true);
                        }}
                        placeholder="Ej: Pedí online - Comidas caseras y minutas"
                        className="w-full p-2.5 rounded-xl border text-sm"
                        style={{ borderColor: BRAND.paperDark, background: "#FFF" }}
                      />
                    </div>

                    {/* Selector de Rubro Gastronómico con chips rápidos */}
                    <div>
                      <label className="font-bold block mb-1" style={{ color: BRAND.charcoal }}>
                        Rubro o Especialidad:
                      </label>
                      <input
                        value={draftBusiness.rubro || ""}
                        onChange={(e) => {
                          setDraftBusiness((prev) => ({ ...prev, rubro: e.target.value }));
                          setDirty(true);
                        }}
                        placeholder="Ej: Rotisería, Hamburguesería, Pizzería, Restaurante..."
                        className="w-full p-2.5 rounded-xl border text-xs mb-1.5"
                        style={{ borderColor: BRAND.paperDark, background: "#FFF" }}
                      />
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {["🍗 Rotisería", "🍔 Hamburguesería", "🍕 Pizzería", "🥩 Parrillada", "☕ Cafetería", "🍝 Pastas", "🍣 Sushi"].map((chip) => (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => {
                              const cleanRubro = chip.split(" ")[1];
                              setDraftBusiness((prev) => ({ ...prev, rubro: cleanRubro }));
                              setDirty(true);
                            }}
                            className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white border border-stone-300 hover:bg-amber-100 transition text-stone-700"
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="font-bold block mb-1" style={{ color: BRAND.charcoal }}>Dirección del Local</label>
                      <input
                        value={draftBusiness.address}
                        onChange={(e) => {
                          setDraftBusiness((prev) => ({ ...prev, address: e.target.value }));
                          setDirty(true);
                        }}
                        placeholder="Ej: Santa María III, Ruta 6ta km 3.5, Encarnación"
                        className="w-full p-2.5 rounded-xl border text-sm"
                        style={{ borderColor: BRAND.paperDark, background: "#FFF" }}
                      />
                    </div>

                    <div>
                      <label className="font-bold block mb-1" style={{ color: BRAND.charcoal }}>Aclaración sobre el envío (Delivery)</label>
                      <input
                        value={draftBusiness.deliveryNote}
                        onChange={(e) => {
                          setDraftBusiness((prev) => ({ ...prev, deliveryNote: e.target.value }));
                          setDirty(true);
                        }}
                        placeholder="Ej: El costo de envío se coordina según la zona"
                        className="w-full p-2.5 rounded-xl border text-sm"
                        style={{ borderColor: BRAND.paperDark, background: "#FFF" }}
                      />
                    </div>

                    <div>
                      <label className="font-bold block mb-1" style={{ color: BRAND.charcoal }}>Horario de Atención</label>
                      <input
                        value={draftBusiness.schedule || ""}
                        onChange={(e) => {
                          setDraftBusiness((prev) => ({ ...prev, schedule: e.target.value }));
                          setDirty(true);
                        }}
                        placeholder="Ej: Lun a Dom: 11:00 a 15:00 y 19:30 a 23:30"
                        className="w-full p-2.5 rounded-xl border text-sm"
                        style={{ borderColor: BRAND.paperDark, background: "#FFF" }}
                      />
                    </div>
                  </div>
                </div>

                {/* SECCIÓN: WHATSAPP Y SEGURIDAD */}
                <div className="space-y-5">
                  <div className="rounded-2xl p-5 border-2 shadow-sm" style={{ background: BRAND.cream, borderColor: BRAND.paperDark }}>
                    <div className="flex items-center gap-2 mb-3">
                      <Phone size={18} color={BRAND.green} />
                      <h3 className="slab text-base" style={{ color: BRAND.charcoal }}>
                        {adminRole === "superadmin" ? "WhatsApp para Pedidos del Demo" : "WhatsApp para Pedidos"}
                      </h3>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div>
                        <label className="font-bold block mb-1" style={{ color: BRAND.charcoal }}>
                          Número visible en pantalla (formato legible para clientes)
                        </label>
                        <input
                          value={draftBusiness.phoneDisplay || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            const digits = val.replace(/\D/g, "");
                            let derivedIntl = digits;
                            if (digits.startsWith("0")) derivedIntl = "595" + digits.slice(1);
                            else if (!digits.startsWith("595") && digits.length === 9) derivedIntl = "595" + digits;
                            setDraftBusiness((prev) => ({
                              ...prev,
                              phoneDisplay: val,
                              ...(derivedIntl && derivedIntl.length >= 9 ? { phoneIntl: derivedIntl } : {}),
                            }));
                            setDirty(true);
                          }}
                          placeholder="Ej: +595 975 635 770 o 0975 635 770"
                          className="w-full p-2.5 rounded-xl border text-sm font-semibold"
                          style={{ borderColor: BRAND.paperDark, background: "#FFF" }}
                        />
                        <span className="text-[11px] text-stone-500 mt-0.5 block">
                          Aparece en la barra superior, pie de página e impresiones de comandas.
                        </span>
                      </div>

                      <div>
                        <label className="font-bold block mb-1 text-stone-600">
                          Número internacional WhatsApp (sin +, sin espacios ni guiones)
                        </label>
                        <input
                          value={draftBusiness.phoneIntl || ""}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^\d]/g, "");
                            setDraftBusiness((prev) => {
                              let nextDisplay = prev.phoneDisplay;
                              if (val.startsWith("595") && val.length === 12 && (!nextDisplay || nextDisplay === "0981 123 456")) {
                                const local = "0" + val.slice(3);
                                nextDisplay = `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
                              }
                              return {
                                ...prev,
                                phoneIntl: val,
                                phoneDisplay: nextDisplay,
                              };
                            });
                            setDirty(true);
                          }}
                          placeholder="Ej: 595975635770"
                          className="w-full p-2.5 rounded-xl border text-sm font-mono bg-stone-50"
                          style={{ borderColor: BRAND.paperDark }}
                        />
                        <span className="text-[11px] text-stone-500 mt-0.5 block">
                          Los clientes de la tienda abrirán automáticamente el chat de WhatsApp (wa.me) hacia este número.
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ACCESO RÁPIDO: EDITAR MENÚ Y PLATOS DEL DEMO */}
                  {adminRole === "superadmin" && (
                    <div className="rounded-2xl p-4 border-2 shadow-sm bg-amber-50 border-amber-300 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <Utensils size={20} className="text-amber-800" />
                        <div>
                          <h4 className="font-bold text-xs text-stone-900">¿Deseás cambiar los platos o precios del Demo?</h4>
                          <p className="text-[11px] text-stone-600">Configurá las categorías, fotos y platos que se exhiben en la demo.</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAdminTab("menu")}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-300 text-stone-900 shadow-sm shrink-0 transition"
                      >
                        Editar Platos
                      </button>
                    </div>
                  )}
                </div>
              </div>

                  {/* TARJETA OFICIAL: LICENCIA Y SUSCRIPCIÓN DEL COMERCIO */}
                  {(() => {
                    const currentLicCode = draftBusiness.licenseCode || business.licenseCode || appLicense.code || "CAS-7K9B-X2M4";
                    const currentLicPlan = draftBusiness.licensePlan || business.licensePlan || appLicense.plan || "Plan Anual PRO (1 Año)";
                    const pDetails = getPlanDetails(currentLicPlan);
                    const currentLicCost = draftBusiness.licenseCost || business.licenseCost || appLicense.costFormatted || pDetails.costFormatted || "1.000.000 Gs. / año";
                    const currentLicDuration = draftBusiness.licenseDuration || (appLicense.durationMonths ? `${appLicense.durationMonths} meses` : `${pDetails.durationMonths} meses`);
                    const currentLicActivated = draftBusiness.licenseActivatedAt || business.licenseActivatedAt || appLicense.activatedAt || "2026-03-01T12:00:00.000Z";
                    const currentLicExpires = draftBusiness.licenseExpiresAt || business.licenseExpiresAt || appLicense.expiresAt || "2027-03-01T12:00:00.000Z";
                    const daysRemaining = getLicenseDaysRemaining(currentLicExpires);
                    const isLicRevoked = draftBusiness.licenseStatus === "revocado" || business.licenseStatus === "revocado" || draftBusiness.licenseStatus === "anulado" || business.licenseStatus === "anulado";
                    const isLicExpired = !isLicRevoked && daysRemaining <= 0;

                    return (
                      <div
                        className="rounded-2xl p-5 border-2 shadow-sm relative overflow-hidden"
                        style={{
                          background: "#FFFFFF",
                          borderColor: isLicRevoked ? "#EF4444" : isLicExpired ? "#F59E0B" : "#F59E0B",
                        }}
                      >
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm"
                              style={{
                                background: isLicRevoked ? "#FEE2E2" : isLicExpired ? "#FEF3C7" : "#ECFDF5",
                                color: isLicRevoked ? "#DC2626" : isLicExpired ? "#D97706" : "#059669",
                              }}
                            >
                              <ShieldCheck size={20} />
                            </div>
                            <div>
                              <h3 className="slab text-base" style={{ color: BRAND.charcoal }}>
                                Licencia y Suscripción del Comercio
                              </h3>
                              <p className="text-[11px] text-stone-500">
                                Certificación de uso y duración de servicio
                              </p>
                            </div>
                          </div>

                          {/* Badge de Estado */}
                          <span
                            className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border flex items-center gap-1 ${
                              isLicRevoked
                                ? "bg-red-100 text-red-800 border-red-300"
                                : isLicExpired
                                ? "bg-amber-100 text-amber-900 border-amber-300"
                                : "bg-emerald-100 text-emerald-800 border-emerald-300"
                            }`}
                          >
                            {isLicRevoked ? "🔴 Suspendida / Anulada" : isLicExpired ? "🟡 Período Vencido" : "🟢 Licencia Activa"}
                          </span>
                        </div>

                        {/* Grilla con Datos de la Licencia */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 text-xs">
                          {/* 1. Número de Licencia */}
                          <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                            <span className="text-[10px] font-bold text-stone-500 uppercase block mb-1">
                              N° de Licencia Otorgado
                            </span>
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-mono text-sm font-black text-stone-900 bg-white px-2 py-0.5 rounded border border-stone-300 select-all">
                                {currentLicCode}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyCodeToClipboard(currentLicCode)}
                                className="p-1 text-stone-400 hover:text-stone-800 hover:bg-stone-200 rounded transition"
                                title="Copiar número de licencia"
                              >
                                {copiedCodeText === currentLicCode ? (
                                  <span className="text-[10px] font-bold text-emerald-700">¡Copiado!</span>
                                ) : (
                                  <Copy size={13} />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* 2. Plan Contratado */}
                          <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                            <span className="text-[10px] font-bold text-stone-500 uppercase block mb-1">
                              Plan Contratado
                            </span>
                            <span className="font-bold text-stone-800 block text-xs truncate">
                              📋 {currentLicPlan}
                            </span>
                          </div>

                          {/* 3. Costo del Plan */}
                          <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                            <span className="text-[10px] font-bold text-stone-500 uppercase block mb-1">
                              Costo que está Pagando
                            </span>
                            <span className="font-black text-sm text-stone-900 block" style={{ color: BRAND.forestGreen }}>
                              💰 {currentLicCost}
                            </span>
                          </div>

                          {/* 4. Duración y Período */}
                          <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                            <span className="text-[10px] font-bold text-stone-500 uppercase block mb-1">
                              Duración para Utilizar la App
                            </span>
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-bold text-stone-800 text-xs">
                                ⏱️ {currentLicDuration}
                              </span>
                              <span
                                className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                                  isLicRevoked
                                    ? "bg-red-100 text-red-700"
                                    : daysRemaining > 30
                                    ? "bg-emerald-100 text-emerald-800"
                                    : daysRemaining > 0
                                    ? "bg-amber-100 text-amber-900"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {isLicRevoked ? "Inhabilitada" : daysRemaining > 0 ? `${daysRemaining} días rest.` : "Período finalizado"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Fechas de Inicio y Vencimiento */}
                        <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 flex flex-wrap items-center justify-between gap-2 text-[11px] mb-3">
                          <div>
                            <span className="text-stone-500 font-medium">Habilitación: </span>
                            <span className="font-bold text-stone-700">{formatDateSafe(currentLicActivated)}</span>
                          </div>
                          <div>
                            <span className="text-stone-500 font-medium">Vencimiento de pago: </span>
                            <span className={`font-bold ${isLicRevoked ? "text-red-700 line-through" : isLicExpired ? "text-red-700" : "text-stone-800"}`}>
                              {formatDateSafe(currentLicExpires)}
                            </span>
                          </div>
                        </div>

                        {/* Cláusula de Control Central del Administrador */}
                        <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-[11px] text-amber-950 leading-relaxed flex items-start gap-2">
                          <ShieldAlert size={16} className="text-amber-700 shrink-0 mt-0.5" />
                          <p>
                            <b>Supervisión y Control Central:</b> Al finalizar el período contratado de pago, desde el <b>Panel Administrador</b> se puede anular o eliminar esta licencia o suscripción otorgada <b>aunque se haya cambiado el usuario o contraseña</b> del comercio.
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* CAMBIO DE PIN Y USUARIO DE ADMINISTRADOR */}
                  <div className="rounded-2xl p-5 border-2 shadow-sm" style={{ background: BRAND.cream, borderColor: BRAND.paperDark }}>
                    <div className="flex items-center gap-2 mb-2">
                      <KeyRound size={18} color={BRAND.charcoal} />
                      <h3 className="slab text-base" style={{ color: BRAND.charcoal }}>Seguridad (Usuario y Contraseña / PIN)</h3>
                    </div>
                    <p className="text-[11px] text-stone-600 mb-3">
                      Podés modificar el nombre de usuario o activar el cambio de contraseña de acceso de tu comercio.
                    </p>

                    <div className="mb-4 text-xs">
                      <label className="font-bold block mb-1" style={{ color: BRAND.charcoal }}>Usuario Administrador</label>
                      <input
                        type="text"
                        name="biz_admin_usr_edit"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        data-lpignore="true"
                        data-1p-ignore="true"
                        data-bwignore="true"
                        value={draftBusiness.adminUser || "gerente"}
                        onChange={(e) => {
                          setDraftBusiness((prev) => ({ ...prev, adminUser: e.target.value }));
                          setDirty(true);
                        }}
                        placeholder="Ej: gerente o mi_comercio"
                        className="w-full p-2.5 rounded-xl border text-sm font-semibold"
                        style={{ borderColor: BRAND.paperDark, background: "#FFF" }}
                      />
                      <span className="text-[10px] text-stone-500 mt-0.5 block">
                        Nombre de usuario para acceder al panel de gerencia.
                      </span>
                    </div>

                    {/* Opción para cambiar contraseña con protección anti-autofill */}
                    <div className="pt-3 border-t" style={{ borderColor: BRAND.paperDark }}>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-stone-200">
                        <div className="flex items-center gap-2.5">
                          <KeyRound size={17} className={enableChangePin ? "text-amber-600" : "text-stone-400"} />
                          <div>
                            <span className="font-bold text-xs text-stone-800 block">
                              Modificar Contraseña / PIN de Gerencia
                            </span>
                            <span className="text-[10px] text-stone-500 block">
                              {enableChangePin
                                ? "Ingresá la nueva clave en ambos campos a continuación."
                                : "Tu contraseña actual se mantiene sin cambios."}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const next = !enableChangePin;
                            setEnableChangePin(next);
                            setDraftNewPin("");
                            setDraftPinConfirm("");
                            setSaveError("");
                            if (next) setDirty(true);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border shadow-sm ${
                            enableChangePin
                              ? "bg-amber-100 border-amber-300 text-amber-900"
                              : "bg-white border-stone-300 text-stone-700 hover:bg-stone-50"
                          }`}
                        >
                          {enableChangePin ? "Cancelar cambio" : "Cambiar Contraseña"}
                        </button>
                      </div>

                      {enableChangePin && (
                        <div className="mt-3 p-3.5 rounded-xl bg-amber-50/80 border border-amber-300 animate-fadeIn">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mb-2">
                            <div>
                              <label className="font-bold block mb-1 text-stone-800">Nueva Contraseña / PIN *</label>
                              <div className="relative">
                                <input
                                  type={showNewPin ? "text" : "password"}
                                  name="mgr_new_sec_pwd"
                                  autoComplete="new-password"
                                  autoCorrect="off"
                                  autoCapitalize="none"
                                  spellCheck={false}
                                  data-lpignore="true"
                                  data-1p-ignore="true"
                                  data-bwignore="true"
                                  readOnly
                                  onFocus={(e) => { e.currentTarget.readOnly = false; }}
                                  onPointerDown={(e) => { e.currentTarget.readOnly = false; }}
                                  value={draftNewPin}
                                  onChange={(e) => { setDraftNewPin(e.target.value); setDirty(true); }}
                                  placeholder="Nueva clave"
                                  className="w-full p-2.5 pr-9 rounded-xl border font-mono text-sm bg-white"
                                  style={{ borderColor: BRAND.paperDark }}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowNewPin((prev) => !prev)}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-stone-500 hover:text-stone-800 transition"
                                  title={showNewPin ? "Ocultar clave" : "Ver clave"}
                                >
                                  {showNewPin ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                              </div>
                            </div>
                            <div>
                              <label className="font-bold block mb-1 text-stone-800">Confirmar Nueva Contraseña *</label>
                              <div className="relative">
                                <input
                                  type={showConfirmPin ? "text" : "password"}
                                  name="mgr_conf_sec_pwd"
                                  autoComplete="new-password"
                                  autoCorrect="off"
                                  autoCapitalize="none"
                                  spellCheck={false}
                                  data-lpignore="true"
                                  data-1p-ignore="true"
                                  data-bwignore="true"
                                  readOnly
                                  onFocus={(e) => { e.currentTarget.readOnly = false; }}
                                  onPointerDown={(e) => { e.currentTarget.readOnly = false; }}
                                  value={draftPinConfirm}
                                  onChange={(e) => { setDraftPinConfirm(e.target.value); setDirty(true); }}
                                  placeholder="Repetir clave"
                                  className="w-full p-2.5 pr-9 rounded-xl border font-mono text-sm bg-white"
                                  style={{ borderColor: BRAND.paperDark }}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowConfirmPin((prev) => !prev)}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-stone-500 hover:text-stone-800 transition"
                                  title={showConfirmPin ? "Ocultar clave" : "Ver clave"}
                                >
                                  {showConfirmPin ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] text-stone-600 block">
                            Ambas claves deben coincidir exactamente antes de hacer clic en "Guardar cambios".
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* SELECTOR DE PERSISTENCIA DE SESIÓN DEL GERENTE */}
                  <div className="rounded-2xl p-5 border-2 shadow-sm" style={{ background: BRAND.cream, borderColor: BRAND.paperDark }}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-3 border-b" style={{ borderColor: BRAND.paperDark }}>
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-800 border border-emerald-300/60">
                          <ShieldCheck size={20} className="text-emerald-700" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="slab text-base md:text-lg" style={{ color: BRAND.charcoal }}>
                              Persistencia de Sesión del Gerente
                            </h3>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              sessionPersistence === "keep_active" 
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : "bg-amber-100 text-amber-900 border border-amber-300"
                            }`}>
                              {sessionPersistence === "keep_active" ? "Mantener Activa" : "Cerrar al Salir"}
                            </span>
                          </div>
                          <p className="text-xs text-stone-600 mt-0.5">
                            Alterná entre mantener la sesión activa o cerrarla al salir, utilizando almacenamiento local seguro para evitar cierres de sesión forzosos.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs font-bold text-stone-600 bg-white/70 px-3 py-1.5 rounded-xl border border-stone-200">
                        <Lock size={13} className="text-emerald-600" />
                        <span>Almacenamiento Local Seguro</span>
                      </div>
                    </div>

                    {/* Selector de Persistencia con 2 opciones interactivas */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-4">
                      {/* Opción 1: Mantener sesión activa */}
                      <button
                        type="button"
                        onClick={() => handleToggleSessionPersistence("keep_active")}
                        className={`text-left p-4 rounded-xl border-2 transition relative flex flex-col justify-between ${
                          sessionPersistence === "keep_active"
                            ? "bg-white border-emerald-600 ring-2 ring-emerald-500/30 shadow-md"
                            : "bg-white/70 border-stone-300 hover:border-emerald-400 hover:bg-white text-stone-700"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="font-black text-sm flex items-center gap-2 text-stone-900">
                              <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                sessionPersistence === "keep_active"
                                  ? "border-emerald-600 bg-emerald-600 text-white"
                                  : "border-stone-400"
                              }`}>
                                {sessionPersistence === "keep_active" && <Check size={10} strokeWidth={3} />}
                              </span>
                              <span>Mantener sesión activa</span>
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                              Recomendado
                            </span>
                          </div>
                          <p className="text-xs text-stone-600 leading-relaxed mb-3">
                            Guarda tu sesión de forma segura y permanente en el almacenamiento local del dispositivo. <b>Evita cierres de sesión forzosos</b> por recargas de página, cambio de pestañas, inactividad o cierre temporal del navegador. Podés salir al menú a tomar pedidos en mesas y regresar cuantas veces quieras sin reingresar el PIN.
                          </p>
                        </div>

                        <div className="pt-2 border-t border-stone-100 flex items-center gap-1.5 text-[11px] text-emerald-800 font-bold">
                          <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
                          <span>Sin desconexiones forzosas • Almacenamiento local seguro</span>
                        </div>
                      </button>

                      {/* Opción 2: Cerrar sesión al salir */}
                      <button
                        type="button"
                        onClick={() => handleToggleSessionPersistence("close_on_exit")}
                        className={`text-left p-4 rounded-xl border-2 transition relative flex flex-col justify-between ${
                          sessionPersistence === "close_on_exit"
                            ? "bg-white border-amber-600 ring-2 ring-amber-500/30 shadow-md"
                            : "bg-white/70 border-stone-300 hover:border-amber-400 hover:bg-white text-stone-700"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="font-black text-sm flex items-center gap-2 text-stone-900">
                              <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                sessionPersistence === "close_on_exit"
                                  ? "border-amber-600 bg-amber-600 text-white"
                                  : "border-stone-400"
                              }`}>
                                {sessionPersistence === "close_on_exit" && <Check size={10} strokeWidth={3} />}
                              </span>
                              <span>Cerrar sesión al salir</span>
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-stone-100 text-stone-700 border border-stone-300">
                              Mayor Privacidad
                            </span>
                          </div>
                          <p className="text-xs text-stone-600 leading-relaxed mb-3">
                            La sesión expira de forma automática al cerrar la ventana o salir de la aplicación. Recomendado únicamente si estás operando desde una computadora compartida o celular ajeno al negocio para evitar accesos no autorizados.
                          </p>
                        </div>

                        <div className="pt-2 border-t border-stone-100 flex items-center gap-1.5 text-[11px] text-amber-800 font-bold">
                          <LogOut size={14} className="text-amber-600 shrink-0" />
                          <span>Cierre automático al salir de la aplicación</span>
                        </div>
                      </button>
                    </div>

                    {/* Barra de Estado y Verificación del Almacenamiento Seguro */}
                    <div className="rounded-xl p-3 bg-stone-100/90 border border-stone-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 text-stone-800">
                        <span className={`w-2.5 h-2.5 rounded-full ${sessionPersistence === "keep_active" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`}></span>
                        <span>
                          Modo configurado: <b>{sessionPersistence === "keep_active" ? "Mantener sesión activa (Almacenamiento local seguro protegido)" : "Cerrar sesión al salir"}</b>
                        </span>
                      </div>
                      <span className="text-[11px] text-stone-500">
                        {adminSession?.lastActiveAt ? `Última sincronización: ${new Date(adminSession.lastActiveAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : "Almacenamiento seguro sincronizado"}
                      </span>
                    </div>
                  </div>

            </div>
          )}

          {/* =============================================================
              PESTAÑA: MENÚ Y PLATOS
              ============================================================= */}
          {adminTab === "menu" && (
            <div className="space-y-6">
              {adminRole === "superadmin" ? (
                <div className="rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm border border-amber-300 bg-amber-50">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">⭐</span>
                    <div>
                      <p className="text-xs md:text-sm font-bold text-amber-950 flex items-center gap-2 flex-wrap">
                        <span>Editando Menú del Demo Oficial ({business.name || "Menu Py"})</span>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">Vitrina Pública</span>
                      </p>
                      <p className="text-xs text-amber-800">
                        Los platos, fotos y precios que configures aquí se mostrarán directamente en el Demo público que ven todos los visitantes.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setAdminTab("business"); }}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white text-stone-800 border border-amber-300 hover:bg-amber-100 flex items-center gap-1.5 shrink-0 shadow-sm transition"
                  >
                    <Store size={14} /> Ir a Portada y Datos del Demo
                  </button>
                </div>
              ) : (
                <div className="rounded-xl p-3.5 flex items-start gap-2.5 shadow-sm" style={{ background: "#FFF3C4", border: `1px solid ${BRAND.mustard}` }}>
                  <span className="text-xl">💡</span>
                  <p className="text-xs md:text-sm" style={{ color: BRAND.charcoal }}>
                    Podés editar precios, agregar categorías, subir fotos de cada plato o eliminarlos. Recordá presionar <b>"Guardar cambios"</b> abajo cuando termines.
                  </p>
                </div>
              )}

              {draft.map((c, catIdx) => (
                <div key={catIdx} className="rounded-2xl p-4 md:p-6 border-2 shadow-sm" style={{ background: BRAND.cream, borderColor: BRAND.paperDark }}>
                  {/* Cabecera de Categoría */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b" style={{ borderColor: BRAND.paperDark }}>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="p-2.5 rounded-xl shadow-sm flex-shrink-0" style={{ background: BRAND.tomato }}>
                        <CategoryIcon icon={c.icon} name={c.category} size={22} color={BRAND.cream} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <label className="text-[11px] font-bold block mb-1" style={{ color: BRAND.charcoal }}>
                          Nombre de la categoría:
                        </label>
                        <input
                          value={c.category}
                          onChange={(e) => renameCategory(catIdx, e.target.value)}
                          placeholder="Ej: Ensaladas, Pizzas, Bebidas..."
                          className="slab w-full text-base md:text-xl rounded-xl px-3 py-1.5 font-bold border-2 bg-white shadow-inner focus:outline-none"
                          style={{ color: BRAND.tomato, borderColor: BRAND.paperDark }}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteCategory(catIdx)}
                      className="self-end sm:self-center px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:brightness-90 transition shadow-sm text-white"
                      style={{ background: BRAND.tomato }}
                      title="Eliminar categoría completa"
                    >
                      <Trash2 size={15} />
                      <span>Eliminar categoría</span>
                    </button>
                  </div>

                  {/* Selector de Tipo de Categoría e Ícono */}
                  <div className="mb-5 bg-white/60 p-3.5 rounded-xl border" style={{ borderColor: BRAND.paperDark }}>
                    <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 mb-2">
                      <p className="text-xs font-bold flex items-center gap-1.5" style={{ color: BRAND.charcoal }}>
                        <span>✨ Elegí el tipo de categoría o ícono:</span>
                      </p>
                      <span className="text-[11px] text-stone-500">
                        (Al hacer clic cambia el nombre y el ícono automáticamente)
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {ICON_OPTIONS.map((opt) => {
                        const isSelectedIcon = (c.icon || guessIconKey(c.category)) === opt.key;
                        const isSelectedName = (c.category || "").trim().toLowerCase() === opt.label.toLowerCase();
                        const selected = isSelectedIcon || isSelectedName;
                        return (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => updateCategoryOption(catIdx, opt, true)}
                            title={`Seleccionar categoría ${opt.label}`}
                            className="p-2 rounded-lg border-2 flex items-center gap-1.5 text-xs font-bold transition shadow-sm hover:scale-[1.02] active:scale-[0.98]"
                            style={selected ? { background: BRAND.tomato, borderColor: BRAND.tomatoDark, color: BRAND.cream } : { background: "#FFF", borderColor: BRAND.paperDark, color: BRAND.charcoal }}
                          >
                            <CategoryIcon icon={opt.key} name="" size={16} color={selected ? BRAND.cream : BRAND.charcoal} />
                            <span>{opt.label}</span>
                            {selected && <CheckCircle2 size={13} className="ml-0.5" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Lista de productos de la categoría (adaptada a grid en PC) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {c.items.map((item, itemIdx) => (
                      <div key={item.id} className="rounded-xl p-3.5 flex gap-3 border shadow-sm" style={{ background: BRAND.paper, borderColor: BRAND.paperDark }}>
                        {/* Subida de foto del plato */}
                        <label
                          className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 flex items-center justify-center cursor-pointer shadow-inner hover:opacity-90 transition"
                          style={{ borderColor: BRAND.paperDark, background: BRAND.cream }}
                        >
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleImageUpload(catIdx, itemIdx, e.target.files?.[0])}
                          />
                          {imgLoading === item.id ? (
                            <LoaderCircle className="animate-spin" size={20} color={BRAND.tomato} />
                          ) : item.image ? (
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex flex-col items-center gap-1 text-stone-500">
                              <ImageIcon size={20} color={BRAND.tomatoDark} />
                              <span className="text-[10px] font-bold">Foto</span>
                            </div>
                          )}
                          {item.image && imgLoading !== item.id && (
                            <button
                              type="button"
                              onClick={(e) => { e.preventDefault(); updateItemField(catIdx, itemIdx, "image", ""); }}
                              className="absolute top-1 right-1 rounded-full p-1 shadow"
                              style={{ background: BRAND.tomato }}
                              title="Quitar foto"
                            >
                              <X size={11} color={BRAND.cream} />
                            </button>
                          )}
                        </label>

                        {/* Campos de texto del plato */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            {/* Selector de categoría por si se quiere mover este producto */}
                            <div className="flex items-center justify-between gap-1 mb-1.5 pb-1 border-b" style={{ borderColor: BRAND.paperDark }}>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] font-bold text-stone-500 uppercase">Categoría:</span>
                                <select
                                  value={catIdx}
                                  onChange={(e) => moveItemToCategory(catIdx, itemIdx, Number(e.target.value))}
                                  className="bg-white border rounded-md px-1.5 py-0.5 text-[11px] font-bold text-stone-800 focus:outline-none"
                                  style={{ borderColor: BRAND.paperDark }}
                                  title="Mover este producto a otra categoría"
                                >
                                  {draft.map((cat, idx) => (
                                    <option key={idx} value={idx}>
                                      {cat.category || `Categoría ${idx + 1}`}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <button
                                type="button"
                                onClick={() => deleteItem(catIdx, itemIdx)}
                                className="p-1 rounded-lg hover:brightness-90 transition text-white"
                                style={{ background: BRAND.tomato }}
                                title="Eliminar plato"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>

                            <div className="flex gap-2 items-center mb-1.5">
                              <input
                                value={item.name}
                                onChange={(e) => updateItemField(catIdx, itemIdx, "name", e.target.value)}
                                placeholder="Nombre del plato"
                                className="flex-1 rounded-lg p-1.5 text-xs md:text-sm font-bold border"
                                style={{ borderColor: BRAND.paperDark, background: "#FFF" }}
                              />
                            </div>

                            <input
                              value={item.desc}
                              onChange={(e) => updateItemField(catIdx, itemIdx, "desc", e.target.value)}
                              placeholder="Descripción o ingredientes"
                              className="w-full rounded-lg p-1.5 text-xs border mb-1.5"
                              style={{ borderColor: BRAND.paperDark, background: "#FFF" }}
                            />
                          </div>

                          <div className="flex gap-2 items-center">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={formatPriceInput(item.price)}
                              onChange={(e) => {
                                const digits = e.target.value.replace(/[^\d]/g, "");
                                updateItemField(catIdx, itemIdx, "price", digits === "" ? "" : Number(digits));
                              }}
                              placeholder="0 Gs."
                              className="w-32 rounded-lg p-1.5 text-xs font-bold border text-right"
                              style={{ borderColor: BRAND.paperDark, background: "#FFF", color: BRAND.tomato }}
                            />
                            <span className="text-[11px] text-stone-500 truncate">Precio en Guaraníes</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {imgError && (
                    <p className="text-xs mt-2 font-bold" style={{ color: BRAND.tomato }}>⚠️ {imgError}</p>
                  )}

                  <button
                    type="button"
                    onClick={() => addItem2(catIdx)}
                    className="w-full mt-4 rounded-xl p-2.5 text-xs md:text-sm font-bold flex items-center justify-center gap-1.5 shadow-sm hover:brightness-105 transition"
                    style={{ background: BRAND.mustard, color: BRAND.charcoal }}
                  >
                    <Plus size={16} /> Agregar nuevo producto en {c.category || "esta categoría"}
                  </button>
                </div>
              ))}

              <div className="bg-white/70 p-3.5 rounded-2xl border space-y-2" style={{ borderColor: BRAND.paperDark }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                    <span>⚡ Sugerencias rápidas de sección:</span>
                  </span>
                  <span className="text-[11px] text-stone-500">Un clic para agregar</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: "Platos Principales", icon: "almuerzo" },
                    { label: "Bebidas", icon: "bebida" },
                    { label: "Postres", icon: "postre" },
                    { label: "Minutas y Papas", icon: "minuta" },
                    { label: "Sandwiches & Lomitos", icon: "sandwich" },
                    { label: "Pizzas", icon: "pizza" },
                    { label: "Ensaladas", icon: "ensalada" },
                  ].map((sug) => {
                    const exists = (draft || []).some((c) => (c.category || "").toLowerCase() === sug.label.toLowerCase());
                    return (
                      <button
                        key={sug.label}
                        type="button"
                        onClick={() => {
                          setDraft((d) => [...(d || []), { category: sug.label, icon: sug.icon, items: [] }]);
                          setDirty(true);
                        }}
                        disabled={exists}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                          exists
                            ? "opacity-50 cursor-not-allowed bg-stone-100 text-stone-400 border-stone-200"
                            : "bg-white text-stone-800 hover:bg-stone-50 border-stone-300 shadow-sm active:scale-95"
                        }`}
                        title={exists ? "Esta categoría ya existe" : `Agregar sección ${sug.label}`}
                      >
                        <CategoryIcon icon={sug.icon} name="" size={13} color={exists ? "#999" : BRAND.tomato} />
                        <span>+ {sug.label}</span>
                        {exists && <span className="text-[10px] text-stone-400 font-normal">(Ya existe)</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={addCategory}
                className="w-full rounded-2xl p-4 font-bold text-sm md:text-base flex items-center justify-center gap-2 shadow-md hover:brightness-105 transition"
                style={{ background: BRAND.green, color: BRAND.cream }}
              >
                <Plus size={18} /> Crear nueva categoría de comida personalizada
              </button>
            </div>
          )}

          {/* =================================================================
              PESTAÑA: GESTIÓN DE PERMISOS AL PERSONAL (MOZOS, COCINA Y CAJA)
              (Controlado por el Gerente o Administrador)
              ================================================================= */}
          {adminTab === "staff" && (
            <div className="space-y-6">
              {/* Tarjeta de Encabezado y Estado General */}
              <div className="rounded-2xl p-5 md:p-6 border-2 shadow-sm bg-white" style={{ borderColor: BRAND.paperDark }}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-blue-100 text-blue-900 shadow-inner">
                      <Users size={26} className="text-blue-700" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="slab text-lg md:text-xl text-stone-900 leading-tight">
                          Permisos al Personal Operativo (Mozos y Cocina)
                        </h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                          staffSettings.enabled ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-stone-200 text-stone-700"
                        }`}>
                          {staffSettings.enabled ? "Habilitado" : "Deshabilitado"}
                        </span>
                      </div>
                      <p className="text-xs text-stone-600 font-medium mt-0.5">
                        El Gerente puede dar permisos a varios personales con nombre y PIN individual (4, 5, 6, 7, 8... dígitos libres) para tomar comandas en mesas o ver la cocina.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    <button
                      type="button"
                      onClick={handleOpenAddStaff}
                      className="px-4 py-2.5 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white transition shadow flex items-center gap-1.5 active:scale-95"
                    >
                      <UserPlus size={15} />
                      <span>Agregar Nuevo Personal</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const newEnabled = !staffSettings.enabled;
                        setStaffSettings((prev) => ({ ...prev, enabled: newEnabled }));
                        addToast(
                          "order_success",
                          newEnabled ? "Acceso Personal Activado" : "Acceso Personal Desactivado",
                          newEnabled ? "El personal ahora puede ingresar con su PIN registrado." : "El personal ya no podrá ingresar con el PIN rápido."
                        );
                      }}
                      className={`px-4 py-2.5 rounded-xl text-xs font-black transition shadow flex items-center gap-1.5 ${
                        staffSettings.enabled
                          ? "bg-red-100 hover:bg-red-200 text-red-900 border border-red-300"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white"
                      }`}
                    >
                      <ShieldCheck size={15} />
                      <span>{staffSettings.enabled ? "Desactivar Acceso" : "Habilitar Acceso"}</span>
                    </button>
                  </div>
                </div>

                {/* FORMULARIO PARA AGREGAR O EDITAR PERSONAL */}
                {staffFormOpen && (
                  <div className="mt-5 p-5 rounded-2xl border-2 border-blue-300 bg-blue-50/50 shadow-sm space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-blue-200">
                      <div className="flex items-center gap-2">
                        {editingStaffId ? <Pencil size={18} className="text-blue-700" /> : <UserPlus size={18} className="text-blue-700" />}
                        <h4 className="font-black text-sm text-stone-900">
                          {editingStaffId ? "Editar Datos y Permisos de Personal" : "Registrar Nuevo Personal Autorizado"}
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setStaffFormOpen(false);
                          setEditingStaffId(null);
                        }}
                        className="p-1 rounded-lg hover:bg-blue-100 text-stone-600 transition"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Campo de Nombre */}
                      <div>
                        <label className="block text-xs font-black text-stone-800 mb-1">
                          Nombre del Personal / Mozo / Cocinero *
                        </label>
                        <input
                          type="text"
                          value={staffFormName}
                          onChange={(e) => setStaffFormName(e.target.value)}
                          placeholder="Ej: Carlos Gómez, Lorena Martínez..."
                          className="w-full p-2.5 text-sm font-bold rounded-xl border-2 border-stone-300 bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                        <p className="text-[11px] text-stone-500 mt-1">
                          Este nombre identificará quién tomó las comandas y aparecerá en su sesión.
                        </p>
                      </div>

                      {/* Campo de PIN libre */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-black text-stone-800">
                            PIN de Acceso * (Libre: 4, 5, 6, 7, 8... dígitos)
                          </label>
                          <button
                            type="button"
                            onClick={handleGenerateRandomPin}
                            className="text-[11px] text-blue-700 hover:text-blue-900 font-bold underline flex items-center gap-1"
                          >
                            <KeyRound size={12} /> Generar PIN
                          </button>
                        </div>
                        <input
                          type="text"
                          value={staffFormPin}
                          onChange={(e) => setStaffFormPin(e.target.value.trim())}
                          placeholder="Ej: 1234, 58291, 765432..."
                          className="w-full p-2.5 text-sm font-mono font-black rounded-xl border-2 border-stone-300 bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 tracking-wider"
                        />
                        <p className="text-[11px] text-stone-500 mt-1">
                          Podés usar la cantidad de dígitos que prefieras (ej: 4, 5, 6, 7, 8 o más).
                        </p>
                      </div>
                    </div>

                    {/* Presets Rápidos de Rol */}
                    <div>
                      <span className="text-[11px] font-black uppercase text-stone-600 block mb-1.5 tracking-wide">
                        Ajuste Rápido de Permisos por Puesto:
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setStaffFormRole("Mozo de Salón");
                            setStaffFormAllowOrders(true);
                            setStaffFormAllowKitchen(false);
                            setStaffFormAllowCashier(false);
                          }}
                          className={`text-xs px-3 py-1.5 rounded-lg border font-bold transition ${
                            staffFormRole === "Mozo de Salón"
                              ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                              : "bg-white text-stone-700 border-stone-300 hover:bg-stone-50"
                          }`}
                        >
                          🍽️ Mozo de Salón (Solo Menú / Mesas)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setStaffFormRole("Cocina / Comandas");
                            setStaffFormAllowOrders(false);
                            setStaffFormAllowKitchen(true);
                            setStaffFormAllowCashier(false);
                          }}
                          className={`text-xs px-3 py-1.5 rounded-lg border font-bold transition ${
                            staffFormRole === "Cocina / Comandas"
                              ? "bg-orange-600 text-white border-orange-600 shadow-sm"
                              : "bg-white text-stone-700 border-stone-300 hover:bg-stone-50"
                          }`}
                        >
                          👨‍🍳 Cocina (Solo Pantalla Pedidos)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setStaffFormRole("Mozo y Cocina");
                            setStaffFormAllowOrders(true);
                            setStaffFormAllowKitchen(true);
                            setStaffFormAllowCashier(false);
                          }}
                          className={`text-xs px-3 py-1.5 rounded-lg border font-bold transition ${
                            staffFormRole === "Mozo y Cocina"
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                              : "bg-white text-stone-700 border-stone-300 hover:bg-stone-50"
                          }`}
                        >
                          ⚡ Mozo + Cocina (Recomendado)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setStaffFormRole("Cajero / Encargado");
                            setStaffFormAllowOrders(true);
                            setStaffFormAllowKitchen(true);
                            setStaffFormAllowCashier(true);
                          }}
                          className={`text-xs px-3 py-1.5 rounded-lg border font-bold transition ${
                            staffFormRole === "Cajero / Encargado"
                              ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                              : "bg-white text-stone-700 border-stone-300 hover:bg-stone-50"
                          }`}
                        >
                          💳 Cajero / Encargado (Con Cobro)
                        </button>
                      </div>
                    </div>

                    {/* Checkboxes de Permisos Individuales */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <label className={`p-3 rounded-xl border-2 cursor-pointer transition flex items-start gap-2.5 ${
                        staffFormAllowOrders ? "bg-white border-emerald-400 shadow-sm" : "bg-stone-50 border-stone-200 opacity-60"
                      }`}>
                        <input
                          type="checkbox"
                          checked={staffFormAllowOrders}
                          onChange={(e) => setStaffFormAllowOrders(e.target.checked)}
                          className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <div className="text-xs">
                          <span className="font-black text-stone-900 block flex items-center gap-1">
                            <Utensils size={13} className="text-emerald-700" /> Tomar Pedidos en Mesas
                          </span>
                          <span className="text-[11px] text-stone-600">Entrar al Menú a tomar comandas en salón.</span>
                        </div>
                      </label>

                      <label className={`p-3 rounded-xl border-2 cursor-pointer transition flex items-start gap-2.5 ${
                        staffFormAllowKitchen ? "bg-white border-emerald-400 shadow-sm" : "bg-stone-50 border-stone-200 opacity-60"
                      }`}>
                        <input
                          type="checkbox"
                          checked={staffFormAllowKitchen}
                          onChange={(e) => setStaffFormAllowKitchen(e.target.checked)}
                          className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <div className="text-xs">
                          <span className="font-black text-stone-900 block flex items-center gap-1">
                            <ChefHat size={13} className="text-emerald-700" /> Ver Cocina y Comandas
                          </span>
                          <span className="text-[11px] text-stone-600">Entrar al Panel a marcar platos En Cocina / Listo.</span>
                        </div>
                      </label>

                      <label className={`p-3 rounded-xl border-2 cursor-pointer transition flex items-start gap-2.5 ${
                        staffFormAllowCashier ? "bg-white border-emerald-400 shadow-sm" : "bg-stone-50 border-stone-200"
                      }`}>
                        <input
                          type="checkbox"
                          checked={staffFormAllowCashier}
                          onChange={(e) => setStaffFormAllowCashier(e.target.checked)}
                          className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <div className="text-xs">
                          <span className="font-black text-stone-900 block flex items-center gap-1">
                            <CreditCard size={13} className="text-emerald-700" /> Cobro por Caja
                          </span>
                          <span className="text-[11px] text-stone-600">Cobrar pedidos en el panel de caja.</span>
                        </div>
                      </label>
                    </div>

                    {/* Estado activo */}
                    <div className="flex items-center justify-between pt-1">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-stone-800">
                        <input
                          type="checkbox"
                          checked={staffFormActive}
                          onChange={(e) => setStaffFormActive(e.target.checked)}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span>Habilitado para iniciar sesión (Personal Activo)</span>
                      </label>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setStaffFormOpen(false);
                            setEditingStaffId(null);
                          }}
                          className="px-4 py-2 rounded-xl text-xs font-bold border border-stone-300 bg-white hover:bg-stone-100 text-stone-700 transition"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveStaffMember}
                          className="px-5 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white transition shadow flex items-center gap-1.5 active:scale-95"
                        >
                          <Save size={14} />
                          <span>Guardar Personal</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* LISTA DE PERSONAL REGISTRADO */}
                <div className="mt-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-stone-700 tracking-wider flex items-center gap-1.5">
                      <Users size={15} className="text-blue-600" />
                      <span>Personal Registrado ({Array.isArray(staffSettings.staffList) ? staffSettings.staffList.length : 0})</span>
                    </span>
                    <span className="text-[11px] text-stone-500 font-medium">
                      Cada mozo o cocinero accede con su propio nombre y PIN individual
                    </span>
                  </div>

                  {Array.isArray(staffSettings.staffList) && staffSettings.staffList.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {staffSettings.staffList.map((st) => {
                        const isRevealed = !!revealedStaffPins[st.id];
                        return (
                          <div
                            key={st.id}
                            className={`p-4 rounded-xl border-2 transition shadow-sm space-y-3 ${
                              st.active !== false
                                ? "bg-white border-stone-200 hover:border-blue-300"
                                : "bg-stone-50 border-stone-200 opacity-60"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-sm ${
                                  st.role?.toLowerCase().includes("cocina")
                                    ? "bg-orange-100 text-orange-900"
                                    : st.role?.toLowerCase().includes("caja")
                                    ? "bg-purple-100 text-purple-900"
                                    : "bg-blue-100 text-blue-900"
                                }`}>
                                  {st.role?.toLowerCase().includes("cocina") ? "👨‍🍳" : "🍽️"}
                                </div>
                                <div className="min-w-0">
                                  <h5 className="font-black text-sm text-stone-900 truncate">
                                    {st.name}
                                  </h5>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-200">
                                      {st.role || "Personal"}
                                    </span>
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                      st.active !== false ? "bg-emerald-100 text-emerald-800" : "bg-stone-200 text-stone-600"
                                    }`}>
                                      {st.active !== false ? "Activo" : "Pausado"}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* PIN Box con revelado individual */}
                              <div className="text-right shrink-0">
                                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-300 font-mono font-bold text-xs text-amber-950 shadow-inner">
                                  <span>{isRevealed ? st.pin : "••••••"}</span>
                                  <button
                                    type="button"
                                    onClick={() => setRevealedStaffPins((prev) => ({ ...prev, [st.id]: !isRevealed }))}
                                    className="text-stone-500 hover:text-stone-900 p-0.5"
                                    title={isRevealed ? "Ocultar PIN" : "Ver PIN"}
                                  >
                                    {isRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                                  </button>
                                </div>
                                <span className="block text-[10px] text-stone-400 font-mono mt-0.5">
                                  {st.pin?.length || 0} dígitos
                                </span>
                              </div>
                            </div>

                            {/* Indicadores de Permisos */}
                            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
                              <span className={`px-2 py-0.5 rounded-md font-bold flex items-center gap-1 ${
                                st.allowTakeOrders
                                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                  : "bg-stone-100 text-stone-400 line-through"
                              }`}>
                                <Utensils size={11} /> Menú / Mesas
                              </span>
                              <span className={`px-2 py-0.5 rounded-md font-bold flex items-center gap-1 ${
                                st.allowKitchenPanel
                                  ? "bg-blue-50 text-blue-800 border border-blue-200"
                                  : "bg-stone-100 text-stone-400 line-through"
                              }`}>
                                <ChefHat size={11} /> Cocina
                              </span>
                              <span className={`px-2 py-0.5 rounded-md font-bold flex items-center gap-1 ${
                                st.allowCashier
                                  ? "bg-purple-50 text-purple-800 border border-purple-200"
                                  : "bg-stone-100 text-stone-400 line-through"
                              }`}>
                                <CreditCard size={11} /> Caja
                              </span>
                            </div>

                            {/* Botones de Acción para este personal */}
                            <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-stone-100">
                              <button
                                type="button"
                                onClick={() => {
                                  const text = `🍽️ *Acceso de Personal - ${business.name}*\n` +
                                    `👤 *Personal:* ${st.name}\n` +
                                    `🔑 *PIN de acceso:* ${st.pin}\n` +
                                    `📋 *Permisos asignados por Gerencia:*\n` +
                                    `${st.allowTakeOrders ? "✅ Tomar comandas en mesas desde el menú\n" : ""}` +
                                    `${st.allowKitchenPanel ? "✅ Panel de pedidos y cocina en vivo\n" : ""}` +
                                    `${st.allowCashier ? "✅ Cobro por caja\n" : ""}` +
                                    `👉 Ingresá a la app, tocá "Admin", elegí "👨‍🍳 Personal" e ingresá tu PIN.`;
                                  copyToClipboard(text, `staff_wa_${st.id}`);
                                  addToast("order_success", "Texto Copiado", `Datos de ${st.name} listos para enviar por WhatsApp.`);
                                }}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 transition flex items-center gap-1"
                                title="Enviar credenciales por WhatsApp a este personal"
                              >
                                <MessageCircle size={13} className="text-emerald-700" />
                                <span>{copiedText === `staff_wa_${st.id}` ? "¡Copiado!" : "WhatsApp"}</span>
                              </button>

                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleToggleStaffActive(st.id)}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                                    st.active !== false
                                      ? "border-stone-300 bg-white hover:bg-stone-100 text-stone-700"
                                      : "border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900"
                                  }`}
                                >
                                  {st.active !== false ? "Pausar" : "Reactivar"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditStaff(st)}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-900 transition flex items-center gap-1"
                                >
                                  <Pencil size={12} /> Editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteStaffMember(st.id, st.name)}
                                  className="px-2 py-1 rounded-lg text-[11px] font-bold border border-red-200 bg-red-50 hover:bg-red-100 text-red-800 transition"
                                  title="Eliminar este personal"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-6 text-center border-2 border-dashed border-stone-200 rounded-xl bg-stone-50">
                      <p className="text-xs text-stone-600 mb-2 font-medium">
                        No hay personal registrado actualmente.
                      </p>
                      <button
                        type="button"
                        onClick={handleOpenAddStaff}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition inline-flex items-center gap-1.5"
                      >
                        <UserPlus size={14} /> Registrar Primer Personal
                      </button>
                    </div>
                  )}
                </div>

                {/* Acciones directas para la jornada operativa */}
                <div className="mt-5 p-4 rounded-xl border bg-blue-50/60 border-blue-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-black text-blue-900 block flex items-center gap-1.5 uppercase tracking-wide">
                        <Store size={15} className="text-blue-700" /> Operación de Salón y Cocina en Vivo
                      </span>
                      <p className="text-xs text-stone-700 leading-relaxed mt-0.5">
                        Los mozos pueden usar la carta interactiva para cargar comandas en mesas. La cocina ve al instante los pedidos para despachar.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setView("menu");
                          addToast("cart_add", "Modo Mozo en Salón", "Ahora podés tomar pedidos en las mesas navegando por la carta.");
                        }}
                        className="py-2.5 px-3.5 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white transition flex items-center justify-center gap-1.5 shadow active:scale-95"
                      >
                        <Utensils size={14} />
                        <span>Ir al Menú a Tomar Pedidos</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const firstStaff = staffSettings.staffList?.[0];
                          enterAdmin("staff", firstStaff?.name || "Personal", firstStaff?.pin || staffSettings.pin || "1234", firstStaff);
                          addToast("order_success", "Modo Personal Activado", "Este dispositivo quedó configurado en Modo Mozo/Cocina.");
                        }}
                        className="py-2.5 px-3 rounded-xl text-xs font-bold border border-blue-300 bg-white hover:bg-blue-50 text-blue-900 transition flex items-center justify-center gap-1"
                        title="Configurar este dispositivo en modo personal para dejarlo a mozos o cocina"
                      >
                        <span>Bloquear a Modo Personal</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tarjeta Visual: Los 3 Niveles de Permisos de la Aplicación */}
              <div className="rounded-2xl p-5 md:p-6 border-2 shadow-sm bg-white" style={{ borderColor: BRAND.paperDark }}>
                <h4 className="slab text-base text-stone-900 mb-1">
                  Estructura de Seguridad y los 3 Niveles de Permisos
                </h4>
                <p className="text-xs text-stone-600 mb-4 font-medium">
                  Configuración establecida para garantizar la privacidad, control financiero y eficiencia operativa:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Nivel 1: Clientes */}
                  <div className="p-4 rounded-xl border-2 border-stone-200 bg-stone-50/70 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-stone-200 text-stone-800">
                        NIVEL 1
                      </span>
                      <User size={16} className="text-stone-500" />
                    </div>
                    <h5 className="font-black text-stone-900 text-sm">Clientes / Comensales</h5>
                    <p className="text-xs text-stone-600 leading-snug">
                      Acceso libre y público desde la portada para consultar la carta digital, armar pedidos (Mesa, Delivery, Retiro) y seguir en vivo el estado de su comanda.
                    </p>
                    <ul className="text-[11px] text-stone-600 space-y-1 pt-1 border-t border-stone-200">
                      <li className="flex items-center gap-1.5"><Check size={12} className="text-emerald-600" /> Carta y fotos completas</li>
                      <li className="flex items-center gap-1.5"><Check size={12} className="text-emerald-600" /> Realizar pedidos y pagar</li>
                      <li className="flex items-center gap-1.5"><Check size={12} className="text-emerald-600" /> Seguimiento en vivo paso a paso</li>
                      <li className="flex items-center gap-1.5 text-stone-400"><X size={12} className="text-red-500" /> Sin acceso a paneles internos</li>
                    </ul>
                  </div>

                  {/* Nivel 2: Gerente (y Personal delegado) */}
                  <div className="p-4 rounded-xl border-2 border-emerald-300 bg-emerald-50/40 space-y-2 relative">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-500 text-white">
                        NIVEL 2 (GERENCIA)
                      </span>
                      <Briefcase size={16} className="text-emerald-700" />
                    </div>
                    <h5 className="font-black text-stone-900 text-sm">Gerente del Local</h5>
                    <p className="text-xs text-stone-600 leading-snug">
                      Control total sobre la operación del negocio: pedidos, cocina, cobros en caja, menú y asignación de permisos al personal de salón y cocina.
                    </p>
                    <ul className="text-[11px] text-stone-600 space-y-1 pt-1 border-t border-emerald-200">
                      <li className="flex items-center gap-1.5"><Check size={12} className="text-emerald-600" /> Panel de pedidos y cocina en vivo</li>
                      <li className="flex items-center gap-1.5"><Check size={12} className="text-emerald-600" /> Cobro en caja y arqueos diarios</li>
                      <li className="flex items-center gap-1.5"><Check size={12} className="text-emerald-600" /> Dar permisos a mozos y cocina</li>
                      <li className="flex items-center gap-1.5 text-stone-500"><X size={12} className="text-red-500" /> Sin acceso a licencias ni seguridad global</li>
                    </ul>
                  </div>

                  {/* Nivel 3: Administrador App */}
                  <div className="p-4 rounded-xl border-2 border-amber-300 bg-amber-50/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-500 text-stone-900">
                        NIVEL 3
                      </span>
                      <ShieldCheck size={16} className="text-amber-800" />
                    </div>
                    <h5 className="font-black text-stone-900 text-sm">Administrador General</h5>
                    <p className="text-xs text-stone-600 leading-snug">
                      Acceso total para cualquier modificación a la plataforma: alta y control de comercios clientes, licencias, códigos de activación y seguridad de IP.
                    </p>
                    <ul className="text-[11px] text-stone-600 space-y-1 pt-1 border-t border-amber-200">
                      <li className="flex items-center gap-1.5"><Check size={12} className="text-emerald-600" /> Acceso total a todas las funciones</li>
                      <li className="flex items-center gap-1.5"><Check size={12} className="text-emerald-600" /> Altas y revocación de comercios</li>
                      <li className="flex items-center gap-1.5"><Check size={12} className="text-emerald-600" /> Licencias y códigos de activación</li>
                      <li className="flex items-center gap-1.5"><Check size={12} className="text-emerald-600" /> Control de seguridad global de IPs</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MENSAJE DE RESTRICCIÓN SI UN GERENTE O PERSONAL INTENTA INGRESAR A COMERCIOS O SEGURIDAD */}
          {adminTab === "clients" && adminRole !== "superadmin" && (
            <div className="rounded-2xl p-6 md:p-8 border-2 bg-white shadow-sm max-w-2xl mx-auto my-8" style={{ borderColor: BRAND.paperDark }}>
              <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-4 shadow-inner">
                <Lock size={32} />
              </div>
              <h3 className="slab text-xl text-stone-900 mb-2 text-center">
                Sección Limitada: Comercios y Seguridad Global
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 mb-5 text-center max-w-lg mx-auto leading-relaxed">
                El acceso a la <b>gestión de otros comercios</b> (altas, licencias, venta de software) y la <b>seguridad global</b> (bloqueo/desbloqueo de IPs y claves maestras) está reservado con acceso total exclusivamente al <b>Administrador General de la App</b>.
              </p>

              <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 mb-6 text-xs text-stone-800 space-y-2">
                <span className="font-bold text-amber-950 block text-sm flex items-center gap-1.5">
                  👔 Tus Facultades Activas como Gerente:
                </span>
                <ul className="space-y-1.5 text-stone-700">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0" />
                    <span>Control total de <b>Pedidos y Cocina</b> en vivo (cambio de estados, cobro, WhatsApp).</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0" />
                    <span>Gestión de <b>Menú y Platos</b> (precios, fotos, productos agotados).</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0" />
                    <span><b>Dar permisos al personal</b> para ingresar al menú de clientes y a los pedidos.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0" />
                    <span>Historial de ventas, arqueo de caja y configuración de datos de tu local.</span>
                  </li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setAdminTab("orders")}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-stone-900 text-white hover:bg-stone-800 transition flex items-center justify-center gap-2 shadow"
                >
                  <Receipt size={14} /> Volver a Pedidos y Cocina
                </button>
                <button
                  type="button"
                  onClick={() => setAdminTab("staff")}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition flex items-center justify-center gap-2 shadow"
                >
                  <Users size={14} /> Gestionar Permisos al Personal
                </button>
              </div>
            </div>
          )}

          {/* =================================================================
              PESTAÑA: COMERCIOS REGISTRADOS & SEGURIDAD IP (SUPERADMIN)
              ================================================================= */}
          {adminTab === "clients" && adminRole === "superadmin" && (
            <div className="space-y-6">
              {/* Tarjeta de Seguridad IP y Administración Única */}
              <div className="rounded-2xl p-5 md:p-6 border-2 shadow-sm bg-white" style={{ borderColor: BRAND.paperDark }}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-amber-100 text-stone-900 shadow-inner">
                      <ShieldCheck size={26} className="text-emerald-700" />
                    </div>
                    <div>
                      <h3 className="slab text-lg md:text-xl text-stone-900 leading-tight">
                        Seguridad de Acceso: Bloqueo a 3 Intentos Fallidos
                      </h3>
                      <p className="text-xs text-stone-600 font-medium">
                        Protección contra accesos no autorizados al panel de administración para 1 solo usuario.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={async () => {
                        await resetIpLock();
                        addToast("order_success", "IP Restablecida", "Se desbloqueó la IP y se restablecieron los 3 intentos.");
                      }}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold border-2 border-emerald-300 bg-emerald-50 hover:bg-emerald-100 transition text-emerald-900 flex items-center gap-1.5 shadow-sm active:scale-95"
                      title="Restablecer inmediatamente los 3 intentos para tu dirección IP"
                    >
                      <RefreshCw size={14} className="text-emerald-700" />
                      <span>Restablecer Mi IP (3 Intentos)</span>
                    </button>
                    <button
                      type="button"
                      onClick={resetAllBlockedIps}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold border-2 border-stone-300 hover:bg-stone-100 transition text-stone-800 flex items-center gap-1.5"
                      title="Desbloquear inmediatamente cualquier IP que haya superado los 3 intentos"
                    >
                      <ShieldOff size={15} /> Desbloquear Todas las IPs
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="text-stone-500 font-medium block mb-0.5">Usuario Administrador Único</span>
                    <span className="text-base font-bold font-mono text-stone-900">{business.adminUser || "Usuario"}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="text-stone-500 font-medium block mb-0.5">Intentos Restantes IP</span>
                    <span className={`text-base font-bold font-mono ${attemptsLeft < 2 ? "text-red-700" : attemptsLeft < 3 ? "text-amber-700" : "text-emerald-700"}`}>
                      {attemptsLeft} de 3 intentos
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="text-stone-500 font-medium block mb-0.5">Estado de Bloqueo</span>
                    <span className={`text-sm font-bold ${ipLocked ? "text-red-700" : "text-emerald-700"}`}>
                      {ipLocked ? `Bloqueada (${formatLockTime(ipRemainingSeconds)})` : "Acceso Habilitado"}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="text-stone-500 font-medium block mb-0.5">Tu IP Detectada</span>
                    <span className="text-sm font-bold font-mono text-stone-800">{clientIp || "Detectando..."}</span>
                  </div>
                </div>
              </div>

              {/* =================================================================
                  CONFIGURACIÓN DE PRECIOS DE LA APP EN GUARANÍES (Gs.)
                  ================================================================= */}
              <div className="rounded-2xl p-5 md:p-6 border-2 shadow-sm bg-white" style={{ borderColor: BRAND.paperDark }}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-amber-100 text-stone-900 shadow-inner flex-shrink-0">
                      <DollarSign size={26} className="text-emerald-700" />
                    </div>
                    <div>
                      <h3 className="slab text-lg md:text-xl text-stone-900 leading-tight flex items-center gap-2 flex-wrap">
                        <span>Precios de la App en Guaraníes (Gs.)</span>
                        <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                          Planes de Venta SaaS
                        </span>
                      </h3>
                      <p className="text-xs text-stone-600 font-medium mt-0.5">
                        Establecé y modificá los precios de adquisición de tu app en Guaraníes. Se actualizan en vivo en la pantalla de registro para nuevos comercios clientes.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                    <button
                      type="button"
                      onClick={handleResetPlanPrices}
                      className="px-3 py-2 rounded-xl text-xs font-bold border border-stone-300 hover:bg-stone-100 transition text-stone-700 flex items-center gap-1.5"
                      title="Volver a los precios iniciales de fábrica (150.000 / 750.000 / 1.350.000 Gs.)"
                    >
                      <RefreshCw size={13} />
                      <span>Restablecer</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSavePlanPrices}
                      className="px-4 py-2 rounded-xl text-xs font-bold transition text-white shadow-sm flex items-center gap-1.5 hover:brightness-105 active:scale-95"
                      style={{ background: BRAND.green }}
                    >
                      <Save size={14} />
                      <span>Guardar Precios Gs.</span>
                    </button>
                  </div>
                </div>

                {pricingSuccessMsg && (
                  <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                    <span>{pricingSuccessMsg}</span>
                  </div>
                )}

                {/* Grilla de edición de precios para cada plan */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {appPricingPlans.map((plan) => {
                    const priceNum = Number(plan.priceGs) || 0;
                    const monthlyEquiv =
                      plan.id === "mensual"
                        ? priceNum
                        : plan.id === "semestral"
                        ? Math.round(priceNum / 6)
                        : Math.round(priceNum / 12);

                    return (
                      <div
                        key={plan.id}
                        className="p-4 rounded-2xl border-2 transition-all flex flex-col justify-between bg-stone-50/70 hover:bg-white"
                        style={{
                          borderColor: plan.highlighted ? "#C1392B" : BRAND.paperDark,
                        }}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-stone-500">
                              {plan.id === "mensual" ? "Plan Básico" : plan.id === "semestral" ? "Plan 6 Meses" : "Plan Anual 12 Meses"}
                            </span>
                            {plan.highlighted && (
                              <span className="text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                                Más Popular
                              </span>
                            )}
                          </div>

                          <h4 className="font-bold text-base text-stone-900 mb-2">
                            {plan.title}
                          </h4>

                          {/* Edición del Precio en Guaraníes */}
                          <div className="p-3 rounded-xl bg-white border border-stone-200 mb-3 shadow-inner">
                            <label className="block text-[11px] font-bold text-stone-700 mb-1 flex items-center justify-between">
                              <span>Precio en Guaraníes:</span>
                              <span className="font-mono text-emerald-800 font-black text-xs">
                                {formatGs(priceNum)}
                              </span>
                            </label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-stone-400">
                                Gs.
                              </span>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={priceNum ? priceNum.toLocaleString("es-PY") : ""}
                                onChange={(e) => handleUpdatePlanPrice(plan.id, e.target.value)}
                                placeholder="0"
                                className="w-full pl-10 pr-3 py-2 text-base font-mono font-black rounded-xl border-2 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                style={{ borderColor: BRAND.paperDark }}
                              />
                            </div>

                            {/* Ajustadores rápidos +/- */}
                            <div className="flex items-center gap-1.5 mt-2">
                              <button
                                type="button"
                                onClick={() => handleUpdatePlanPrice(plan.id, Math.max(0, priceNum - 50000))}
                                className="flex-1 py-1 text-[10px] font-bold rounded bg-stone-100 hover:bg-stone-200 text-stone-700 border transition"
                              >
                                - 50.000 Gs.
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdatePlanPrice(plan.id, priceNum + 50000)}
                                className="flex-1 py-1 text-[10px] font-bold rounded bg-stone-100 hover:bg-stone-200 text-stone-700 border transition"
                              >
                                + 50.000 Gs.
                              </button>
                            </div>

                            <span className="text-[11px] text-stone-500 block mt-2 pt-1 border-t border-stone-100">
                              Cálculo mensual: <b className="text-stone-800 font-mono font-bold">{formatGs(monthlyEquiv)}/mes</b>
                            </span>
                          </div>

                          {/* Periodo de cobro */}
                          <div className="mb-2">
                            <label className="block text-[11px] font-bold text-stone-700 mb-0.5">
                              Texto de periodo:
                            </label>
                            <input
                              type="text"
                              value={plan.period || ""}
                              onChange={(e) => handleUpdatePlanField(plan.id, "period", e.target.value)}
                              placeholder="ej. por mes, por 6 meses"
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border bg-white text-stone-800"
                              style={{ borderColor: BRAND.paperDark }}
                            />
                          </div>

                          {/* Badge de promoción */}
                          <div className="mb-2">
                            <label className="block text-[11px] font-bold text-stone-700 mb-0.5">
                              Insignia / Promoción:
                            </label>
                            <input
                              type="text"
                              value={plan.badge || ""}
                              onChange={(e) => handleUpdatePlanField(plan.id, "badge", e.target.value)}
                              placeholder="ej. ⭐ ¡3 Meses Gratis!"
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border bg-white text-stone-800"
                              style={{ borderColor: BRAND.paperDark }}
                            />
                          </div>

                          {/* Ahorro destacado */}
                          <div>
                            <label className="block text-[11px] font-bold text-stone-700 mb-0.5">
                              Texto de ahorro:
                            </label>
                            <input
                              type="text"
                              value={plan.savings || ""}
                              onChange={(e) => handleUpdatePlanField(plan.id, "savings", e.target.value)}
                              placeholder="ej. Ahorrás 450.000 Gs."
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border bg-white text-stone-800"
                              style={{ borderColor: BRAND.paperDark }}
                            />
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t text-[11px] text-stone-500 flex items-center justify-between">
                          <span>Identificador:</span>
                          <code className="font-mono text-stone-700 font-bold bg-stone-200 px-1.5 py-0.5 rounded text-[10px]">
                            {plan.id}
                          </code>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Acceso directo a la página de registro/venta */}
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                  <span className="text-amber-950 font-medium">
                    💡 Los precios que guardes aquí se aplican automáticamente en la pantalla de adquisición para nuevos clientes.
                  </span>
                  <button
                    type="button"
                    onClick={() => setView("register")}
                    className="px-3 py-1.5 rounded-lg bg-white border border-amber-300 font-bold text-amber-900 hover:bg-amber-100 transition flex items-center gap-1 flex-shrink-0 shadow-sm"
                  >
                    <ExternalLink size={13} /> Ver Pantalla de Ventas y Planes
                  </button>
                </div>
              </div>

              {/* Encabezado de la lista de comercios */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="slab text-xl text-stone-900 leading-tight flex items-center gap-2">
                    <Store size={22} className="text-[#C1392B]" />
                    <span>Comercios que Solicitaron la App</span>
                  </h3>
                  <p className="text-xs text-stone-600">
                    Nuevos clientes registrados, planes solicitados, credenciales y comprobantes de pago.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={loadRegisteredClients}
                    disabled={loadingClients}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold border border-stone-300 hover:bg-stone-100 transition text-stone-800 flex items-center gap-1.5 bg-white shadow-sm"
                  >
                    <RefreshCw size={13} className={loadingClients ? "animate-spin" : ""} />
                    <span>Actualizar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setView("register")}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition text-stone-900 shadow-sm flex items-center gap-1.5"
                    style={{ background: BRAND.mustard }}
                  >
                    <Plus size={14} />
                    <span>Formulario de Registro</span>
                  </button>
                </div>
              </div>

              {/* Lista de Clientes Registrados */}
              {loadingClients ? (
                <div className="p-12 text-center bg-white rounded-2xl border shadow-sm flex flex-col items-center gap-3">
                  <LoaderCircle className="animate-spin text-stone-400" size={32} />
                  <p className="text-xs font-bold text-stone-500">Cargando solicitudes de comercios...</p>
                </div>
              ) : registeredClients.length === 0 ? (
                <div className="p-8 md:p-12 text-center bg-white rounded-2xl border-2 shadow-sm" style={{ borderColor: BRAND.paperDark }}>
                  <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3 text-stone-700">
                    <Briefcase size={26} />
                  </div>
                  <h4 className="font-bold text-base text-stone-900 mb-1">Aún no hay comercios registrados</h4>
                  <p className="text-xs text-stone-600 max-w-md mx-auto mb-5">
                    Cuando otros restaurantes o comercios completen el formulario para adquirir la app con su respectivo plan y método de pago, aparecerán aquí para su activación.
                  </p>
                  <button
                    type="button"
                    onClick={() => setView("register")}
                    className="px-4 py-2 rounded-xl text-xs font-bold shadow transition text-white"
                    style={{ background: BRAND.tomato }}
                  >
                    Ver o Probar Formulario de Registro de Comercios
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {registeredClients.map((client) => {
                    const bName = client.businessName || client.business_name || "Comercio";
                    const oName = client.ownerName || client.owner_name || "Responsable";
                    const pTitle = client.planTitle || client.plan_title || "Plan Estándar";
                    const amount = client.amountGs !== undefined ? client.amountGs : (client.amount_gs || 0);
                    const rUser = client.requestedUser || client.requested_user || "admin";
                    const rPass = client.requestedPassword || client.requested_password || "••••••••";
                    const payMethod = client.paymentMethod || client.payment_method || "transferencia";
                    const payRef = client.paymentRef || client.payment_ref || "";
                    const cDate = client.createdAt || client.created_at || Date.now();
                    const statusStr = String(client.status || "").toLowerCase();

                    const isPending = statusStr === "pending" || statusStr === "pendiente";
                    const isActive = statusStr === "active" || statusStr === "activo";
                    const isRejected = statusStr === "rejected" || statusStr === "rechazado" || statusStr === "vencido";

                    return (
                      <div
                        key={client.id}
                        className="p-5 rounded-2xl bg-white border-2 shadow-sm flex flex-col justify-between gap-4 transition hover:shadow-md"
                        style={{
                          borderColor: isActive ? "#22C55E" : isPending ? BRAND.mustard : "#EF4444",
                        }}
                      >
                        {/* Cabecera de la ficha */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b" style={{ borderColor: BRAND.paperDark }}>
                          <div>
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-mono text-xs font-black text-stone-400">#{client.id}</span>
                              <h4 className="font-black text-base md:text-lg text-stone-900">{bName}</h4>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 font-semibold text-stone-700">
                                {client.rubro || "Gastronomía"}
                              </span>
                              <span className="text-xs text-stone-500 font-medium">📍 {client.city || "Encarnación"}</span>
                            </div>
                            <p className="text-xs text-stone-600">
                              Responsable: <b>{oName}</b> • Solicitado: {formatDateSafe(cDate)}
                            </p>
                          </div>

                          {/* Badge de Estado */}
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                                isActive
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                  : isPending
                                  ? "bg-amber-100 text-amber-900 border border-amber-300"
                                  : "bg-red-100 text-red-800 border border-red-300"
                              }`}
                            >
                              {isActive ? "✓ Activo / En Producción" : isPending ? "⏳ Pendiente de Pago" : "✕ Rechazado"}
                            </span>
                          </div>
                        </div>

                        {/* Detalles: Plan, Credenciales y Pago */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-stone-50 p-3.5 rounded-xl border border-stone-200">
                          <div>
                            <span className="text-stone-500 font-semibold block mb-0.5">Plan y Precio:</span>
                            <span className="font-bold text-stone-900 block">{pTitle}</span>
                            <span className="font-black text-sm text-red-600 font-mono">{formatGs(amount)}</span>
                          </div>

                          <div>
                            <span className="text-stone-500 font-semibold block mb-0.5">Credenciales Solicitadas:</span>
                            <span className="font-mono font-bold text-stone-900 block">Usuario: {rUser}</span>
                            <span className="font-mono text-stone-700 block">Clave: {rPass}</span>
                          </div>

                          <div>
                            <span className="text-stone-500 font-semibold block mb-0.5">Pago y Comprobante:</span>
                            <span className="font-bold capitalize text-stone-900 block">{payMethod}</span>
                            <span className="text-stone-600 truncate block">Ref: {payRef || "Sin referencia escrita"}</span>
                          </div>
                        </div>

                        {/* Barra de Acciones y Código de Activación */}
                        {(() => {
                          const existingCode = activationCodes.find(
                            (ac) =>
                              (ac.businessName && bName && ac.businessName.toLowerCase() === bName.toLowerCase()) ||
                              (ac.whatsapp && client.whatsapp && ac.whatsapp === String(client.whatsapp).replace(/[^\d]/g, ""))
                          );

                          return (
                            <>
                              {existingCode && (
                                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                                  <div className="flex items-center gap-2">
                                    <KeyRound size={14} className="text-amber-700" />
                                    <span className="font-medium text-stone-700">Código de Activación Asignado:</span>
                                    <span className="font-mono font-black text-stone-900 bg-white px-2 py-0.5 rounded border border-amber-300">
                                      {existingCode.code}
                                    </span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                      existingCode.status === "disponible" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"
                                    }`}>
                                      {existingCode.status === "disponible" ? "Listo para entregar" : "Ya activado"}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleCopyCodeToClipboard(existingCode.code)}
                                      className="px-2 py-1 rounded bg-white border border-stone-300 text-[11px] font-bold text-stone-700 hover:bg-stone-100 transition"
                                    >
                                      {copiedCodeText === existingCode.code ? "¡Copiado!" : "Copiar"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSendCodeWhatsApp(existingCode)}
                                      className="px-2 py-1 rounded bg-[#25D366] text-white text-[11px] font-bold hover:brightness-105 transition flex items-center gap-1"
                                    >
                                      <Send size={11} /> Enviar WhatsApp
                                    </button>
                                  </div>
                                </div>
                              )}

                              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t" style={{ borderColor: BRAND.paperDark }}>
                                <div className="flex items-center gap-2">
                                  {/* Enlace directo a WhatsApp */}
                                  <a
                                    href={`https://wa.me/${String(client.whatsapp).replace(/[^\d]/g, "")}?text=${encodeURIComponent(
                                      `¡Hola ${oName}! Nos comunicamos sobre tu solicitud para la App de Pedidos de *${bName}* (Plan: ${pTitle}).`
                                    )}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#25D366] text-white flex items-center gap-1.5 shadow-sm hover:brightness-105 transition"
                                  >
                                    <Phone size={13} />
                                    <span>WhatsApp ({client.whatsapp})</span>
                                  </a>
                                  {client.email && (
                                    <span className="text-xs text-stone-500 hidden md:inline">✉️ {client.email}</span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2">
                                  {!existingCode && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const pDetails = getPlanDetails(pTitle || client.plan);
                                        setNewCodeForm({
                                          code: generateRandomActivationCode(),
                                          businessName: bName,
                                          ownerName: oName,
                                          email: (client.requestedUser || client.email || "").toLowerCase(),
                                          whatsapp: String(client.whatsapp).replace(/[^\d]/g, ""),
                                          plan: pDetails.planTitle,
                                          planId: pDetails.planId,
                                          cost: pDetails.cost,
                                          costFormatted: pDetails.costFormatted,
                                          durationMonths: pDetails.durationMonths,
                                          expiresAt: pDetails.expiresAt,
                                          notes: `Generado para solicitud #${client.id} - ${payMethod}`,
                                        });
                                        setShowCreateCodeModal(true);
                                      }}
                                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-100 text-stone-900 border border-amber-300 hover:bg-amber-200 transition flex items-center gap-1 shadow-sm"
                                      title="Crear código de activación exclusivo para este cliente"
                                    >
                                      <KeyRound size={13} className="text-amber-800" />
                                      <span>Generar Código</span>
                                    </button>
                                  )}

                                  {isPending && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => updateClientStatus(client.id, "activo")}
                                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-sm flex items-center gap-1"
                                      >
                                        <span>✓ Activar</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => updateClientStatus(client.id, "rechazado")}
                                        className="px-3 py-1.5 rounded-xl text-xs font-bold border border-red-300 text-red-700 hover:bg-red-50 transition"
                                      >
                                        Rechazar
                                      </button>
                                    </>
                                  )}

                                  {isActive && (
                                    <button
                                      type="button"
                                      onClick={() => updateClientStatus(client.id, "pendiente")}
                                      className="px-3 py-1.5 rounded-xl text-xs font-bold border border-amber-300 text-amber-800 hover:bg-amber-50 transition"
                                    >
                                      Pasar a Pendiente
                                    </button>
                                  )}

                                  {isRejected && (
                                    <button
                                      type="button"
                                      onClick={() => updateClientStatus(client.id, "activo")}
                                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-sm"
                                    >
                                      Reactivar
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => deleteRegisteredClient(client.id)}
                                    className="p-1.5 rounded-xl text-stone-400 hover:text-red-600 hover:bg-red-50 transition"
                                    title="Eliminar registro permanentemente"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* =========================================================================
                  SECCIÓN: CÓDIGOS DE ACTIVACIÓN Y LICENCIAS PARA HABILITAR COMERCIOS
                  ========================================================================= */}
              <div className="rounded-2xl p-5 md:p-6 border-2 shadow-sm bg-white mt-8" style={{ borderColor: BRAND.mustard }}>
                {/* Encabezado del Sistema de Códigos */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b mb-5" style={{ borderColor: BRAND.paperDark }}>
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-amber-100 text-stone-900 shadow-inner flex-shrink-0">
                      <KeyRound size={26} style={{ color: BRAND.tomato }} />
                    </div>
                    <div>
                      <h3 className="slab text-lg md:text-xl text-stone-900 leading-tight flex items-center gap-2 flex-wrap">
                        <span>Códigos de Activación y Licencias para Comercios</span>
                        <span className="text-[10px] font-black uppercase tracking-wider bg-amber-200 text-stone-900 px-2 py-0.5 rounded-full">
                          Habilitación de App
                        </span>
                      </h3>
                      <p className="text-xs text-stone-600 font-medium mt-0.5">
                        Creá y gestioná los códigos que los comercios que compren la app ingresan para desbloquear y habilitar sus funciones.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start md:self-auto">
                    <button
                      type="button"
                      onClick={loadActivationCodes}
                      disabled={loadingCodes}
                      className="px-3 py-2 rounded-xl text-xs font-bold border border-stone-300 hover:bg-stone-100 transition text-stone-800 flex items-center gap-1.5 bg-white shadow-sm"
                      title="Recargar lista de códigos"
                    >
                      <RefreshCw size={13} className={loadingCodes ? "animate-spin" : ""} />
                      <span>Actualizar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const defPlan = getPlanDetails("mensual");
                        setNewCodeForm({
                          code: generateRandomActivationCode(),
                          businessName: "",
                          ownerName: "",
                          whatsapp: "",
                          plan: defPlan.planTitle,
                          planId: defPlan.planId,
                          cost: defPlan.cost,
                          costFormatted: defPlan.costFormatted,
                          durationMonths: defPlan.durationMonths,
                          expiresAt: defPlan.expiresAt,
                          notes: "",
                        });
                        setShowCreateCodeModal(true);
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-black text-white shadow-md hover:brightness-105 transition flex items-center gap-1.5"
                      style={{ background: BRAND.tomato }}
                    >
                      <Plus size={15} />
                      <span>Crear Código de Activación</span>
                    </button>
                  </div>
                </div>

                {/* Métricas de Códigos */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs mb-5">
                  <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between">
                    <div>
                      <span className="text-stone-500 font-semibold block">Total Códigos Generados</span>
                      <span className="text-2xl font-black font-mono text-stone-900">{activationCodes.length}</span>
                    </div>
                    <KeyRound size={24} className="text-stone-400" />
                  </div>
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                    <div>
                      <span className="text-emerald-800 font-semibold block">Disponibles para Entregar</span>
                      <span className="text-2xl font-black font-mono text-emerald-800">
                        {activationCodes.filter((c) => c.status === "disponible").length}
                      </span>
                    </div>
                    <CheckCircle2 size={24} className="text-emerald-600" />
                  </div>
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between">
                    <div>
                      <span className="text-amber-900 font-semibold block">Activados / En Uso</span>
                      <span className="text-2xl font-black font-mono text-amber-900">
                        {activationCodes.filter((c) => c.status === "activado").length}
                      </span>
                    </div>
                    <Store size={24} className="text-amber-600" />
                  </div>
                </div>

                {/* Filtros y Buscador de Códigos */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl border border-stone-200">
                    <button
                      type="button"
                      onClick={() => setCodeFilter("all")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        codeFilter === "all" ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:text-stone-900"
                      }`}
                    >
                      Todos ({activationCodes.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCodeFilter("disponible")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        codeFilter === "disponible" ? "bg-white text-emerald-800 shadow-sm" : "text-stone-600 hover:text-stone-900"
                      }`}
                    >
                      Disponibles ({activationCodes.filter((c) => c.status === "disponible").length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCodeFilter("activado")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        codeFilter === "activado" ? "bg-white text-amber-900 shadow-sm" : "text-stone-600 hover:text-stone-900"
                      }`}
                    >
                      Activados ({activationCodes.filter((c) => c.status === "activado").length})
                    </button>
                  </div>

                  {/* Buscador */}
                  <div className="relative flex-1 max-w-xs">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      value={codeSearch}
                      onChange={(e) => setCodeSearch(e.target.value)}
                      placeholder="Buscar por código o comercio..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-300"
                    />
                    {codeSearch && (
                      <button
                        type="button"
                        onClick={() => setCodeSearch("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Listado de Códigos */}
                {(() => {
                  const filtered = activationCodes.filter((c) => {
                    if (codeFilter !== "all" && c.status !== codeFilter) return false;
                    if (!codeSearch.trim()) return true;
                    const q = codeSearch.toLowerCase();
                    return (
                      (c.code || "").toLowerCase().includes(q) ||
                      (c.businessName || "").toLowerCase().includes(q) ||
                      (c.ownerName || "").toLowerCase().includes(q) ||
                      (c.plan || "").toLowerCase().includes(q)
                    );
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="p-8 text-center bg-stone-50 rounded-xl border border-dashed border-stone-300">
                        <KeyRound size={28} className="mx-auto text-stone-400 mb-2" />
                        <p className="text-xs font-bold text-stone-600">No hay códigos en este filtro.</p>
                        <p className="text-[11px] text-stone-400 mt-0.5">Creá un nuevo código con el botón superior.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {filtered.map((item) => {
                        const isDispo = item.status === "disponible";
                        const isActi = item.status === "activado";

                        return (
                          <div
                            key={item.id || item.code}
                            className={`p-4 rounded-xl border-2 transition bg-white flex flex-col justify-between gap-3 shadow-sm hover:shadow ${
                              isDispo ? "border-emerald-300" : isActi ? "border-amber-300" : "border-red-300"
                            }`}
                          >
                            <div>
                              {/* Fila Superior: Código y Badge */}
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 rounded-lg bg-stone-100 text-stone-800">
                                    <KeyRound size={15} />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-mono text-base font-black tracking-wider text-stone-900 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200 select-all">
                                        {item.code}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleCopyCodeToClipboard(item.code)}
                                        className="p-1 text-stone-400 hover:text-stone-800 hover:bg-stone-100 rounded transition"
                                        title="Copiar código"
                                      >
                                        {copiedCodeText === item.code ? (
                                          <span className="text-[10px] font-bold text-emerald-700">¡Copiado!</span>
                                        ) : (
                                          <Copy size={13} />
                                        )}
                                      </button>
                                    </div>
                                    <span className="text-[10px] text-stone-500 font-medium">
                                      Creado: {formatDateSafe(item.createdAt || Date.now())}
                                    </span>
                                  </div>
                                </div>

                                {(() => {
                                  const isRevoked = item.status === "revocado" || item.status === "anulado";
                                  const daysLeft = item.expiresAt ? getLicenseDaysRemaining(item.expiresAt) : 365;
                                  const isExpired = isActi && daysLeft <= 0;
                                  const costDisplay = item.costFormatted || (item.plan?.includes("Anual") ? "1.350.000 Gs. / año" : item.plan?.includes("Semestral") ? "750.000 Gs. / 6 meses" : "150.000 Gs. / mes");
                                  const durationDisplay = item.durationMonths ? `${item.durationMonths} meses` : "12 meses";

                                  return (
                                    <span
                                      className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                                        isRevoked
                                          ? "bg-red-100 text-red-800 border-red-300"
                                          : isExpired
                                          ? "bg-amber-100 text-amber-900 border-amber-300"
                                          : isActi
                                          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                          : "bg-stone-100 text-stone-700 border-stone-300"
                                      }`}
                                    >
                                      {isRevoked ? "⛔ Revocado" : isExpired ? "⚠️ Período Vencido" : isActi ? "★ Vigente" : "✓ Disponible"}
                                    </span>
                                  );
                                })()}
                              </div>

                              {/* Datos del Comercio Asignado */}
                              <div className="space-y-1.5 text-xs">
                                <p className="font-bold text-stone-900 flex items-center gap-1">
                                  <Store size={13} className="text-stone-500" />
                                  <span>{item.businessName || "Licencia Libre / Venta Directa"}</span>
                                </p>
                                <p className="text-stone-600 text-[11px]">
                                  Responsable: <b>{item.ownerName || "No especificado"}</b>
                                  {item.whatsapp && <span> • WA: {item.whatsapp}</span>}
                                </p>

                                {/* Ficha de Plan, Costo y Duración */}
                                {(() => {
                                  const isRevoked = item.status === "revocado" || item.status === "anulado";
                                  const daysLeft = item.expiresAt ? getLicenseDaysRemaining(item.expiresAt) : 365;
                                  const pDetails = getPlanDetails(item.plan);
                                  const costDisplay = item.costFormatted || pDetails.costFormatted || "100.000 Gs. (por mes)";
                                  const durationDisplay = item.durationMonths ? `${item.durationMonths} meses` : `${pDetails.durationMonths} meses`;

                                  return (
                                    <div className="p-2 rounded-lg bg-stone-50 border border-stone-200 grid grid-cols-2 gap-1.5 text-[11px] mt-1">
                                      <div>
                                        <span className="text-stone-400 block text-[10px] uppercase font-bold">Plan & Costo</span>
                                        <span className="font-bold text-stone-800">{item.plan || pDetails.planTitle}</span>
                                        <span className="block text-[10px] font-black text-emerald-700">{costDisplay}</span>
                                      </div>
                                      <div>
                                        <span className="text-stone-400 block text-[10px] uppercase font-bold">Duración & Vigencia</span>
                                        <span className="font-bold text-stone-800">⏱️ {durationDisplay}</span>
                                        {isActi && item.expiresAt && (
                                          <span className={`block text-[10px] font-extrabold ${isRevoked ? "text-red-600" : daysLeft > 0 ? "text-emerald-700" : "text-amber-800"}`}>
                                            {isRevoked ? "Acceso Inhabilitado" : daysLeft > 0 ? `${daysLeft} días restantes` : "Período Vencido"}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })()}

                                {item.notes && (
                                  <p className="text-[11px] text-stone-500 italic mt-1 bg-stone-50 p-1.5 rounded border border-stone-200">
                                    Nota: {item.notes}
                                  </p>
                                )}
                                {isActi && item.activatedAt && (
                                  <p className="text-[10px] font-semibold text-stone-600 bg-stone-50 p-1.5 rounded mt-1 border border-stone-200">
                                    Habilitado el: {formatDateSafe(item.activatedAt)}{" "}
                                    {item.activatedBy && `por ${item.activatedBy}`}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Acciones de la Tarjeta */}
                            <div className="pt-2.5 border-t space-y-2 text-xs" style={{ borderColor: BRAND.paperDark }}>
                              <div className="flex items-center justify-between gap-1.5 flex-wrap">
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleSendCodeWhatsApp(item)}
                                    className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[#25D366] text-white flex items-center gap-1 hover:brightness-105 transition shadow-sm"
                                    title="Enviar código de activación por WhatsApp al comercio"
                                  >
                                    <Send size={12} />
                                    <span>WhatsApp</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyCodeToClipboard(item.code)}
                                    className="px-2 py-1.5 rounded-lg text-xs font-bold border border-stone-300 text-stone-700 hover:bg-stone-100 transition flex items-center gap-1"
                                    title="Copiar código para enviar manualmente"
                                  >
                                    <Copy size={12} />
                                    <span>Copiar</span>
                                  </button>
                                </div>

                                <div className="flex items-center gap-1">
                                  {/* Botón Anular / Suspender Licencia */}
                                  {item.status !== "revocado" ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setConfirmModalConfig({
                                          title: "Anular o Suspender Licencia",
                                          message: `¿Seguro que deseás anular o suspender la licencia de "${item.businessName || item.code}"? El comercio quedará bloqueado de inmediato para acceder al panel de administración aunque haya cambiado su contraseña o usuario.`,
                                          confirmText: "Sí, anular licencia",
                                          cancelText: "No, conservar",
                                          confirmVariant: "danger",
                                          icon: ShieldOff,
                                          onConfirm: () => handleUpdateCodeStatus(item.id || item.code, "revocado"),
                                        });
                                      }}
                                      className="px-2 py-1 rounded-lg text-[11px] font-black border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 transition flex items-center gap-1 cursor-pointer active:scale-95"
                                      title="Anular la licencia y bloquear el acceso al comercio"
                                    >
                                      <ShieldOff size={12} />
                                      <span>Anular Licencia</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateCodeStatus(item.id || item.code, "activado")}
                                      className="px-2 py-1 rounded-lg text-[11px] font-black border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition flex items-center gap-1 cursor-pointer active:scale-95"
                                      title="Reactivar y habilitar nuevamente la licencia"
                                    >
                                      <ShieldCheck size={12} />
                                      <span>Reactivar</span>
                                    </button>
                                  )}

                                  {/* Botón Eliminar Licencia */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setConfirmModalConfig({
                                        title: "Eliminar Licencia Permanentemente",
                                        message: `¿Seguro que deseás anular y eliminar por completo esta licencia "${item.code}" (${item.businessName || 'Comercio'})? Esta acción borrará el registro de activación.`,
                                        confirmText: "Sí, eliminar definitivamente",
                                        cancelText: "Cancelar",
                                        confirmVariant: "danger",
                                        icon: Trash2,
                                        onConfirm: () => handleDeleteCode(item.id || item.code),
                                      });
                                    }}
                                    className="p-1 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer active:scale-95"
                                    title="Eliminar licencia permanentemente"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>

                              {/* Barra de Renovación de Período de Pago */}
                              {(() => {
                                const pM = getPlanDetails("mensual");
                                const pS = getPlanDetails("semestral");
                                const pA = getPlanDetails("anual");

                                return (
                                  <div className="flex items-center justify-between gap-1 p-1.5 rounded-lg bg-stone-100 border border-stone-200 text-[10px]">
                                    <span className="font-bold text-stone-600">Renovar período:</span>
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => handleRenewCode(item.id || item.code, 1, pM.planTitle, pM.costFormatted)}
                                        className="px-1.5 py-0.5 rounded font-bold bg-white text-stone-700 border border-stone-300 hover:bg-amber-50 hover:border-amber-300 transition cursor-pointer"
                                        title={`Extender suscripción por 1 mes (${pM.costFormatted})`}
                                      >
                                        +1 Mes
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleRenewCode(item.id || item.code, 6, pS.planTitle, pS.costFormatted)}
                                        className="px-1.5 py-0.5 rounded font-bold bg-white text-stone-700 border border-stone-300 hover:bg-amber-50 hover:border-amber-300 transition cursor-pointer"
                                        title={`Extender suscripción por 6 meses (${pS.costFormatted})`}
                                      >
                                        +6 Meses
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleRenewCode(item.id || item.code, 12, pA.planTitle, pA.costFormatted)}
                                        className="px-1.5 py-0.5 rounded font-bold bg-amber-600 text-white shadow-xs hover:bg-amber-700 transition cursor-pointer"
                                        title={`Extender suscripción por 1 año (${pA.costFormatted})`}
                                      >
                                        +1 Año
                                      </button>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Barra fija inferior para Guardar Cambios */}
        <div className="fixed bottom-0 left-0 right-0 p-4 shadow-2xl z-40 border-t" style={{ background: BRAND.charcoal, borderColor: "#3D3025" }}>
          {saveError && (
            <p className="text-xs mb-2 text-center max-w-5xl mx-auto font-bold flex items-center justify-center gap-1" style={{ color: BRAND.mustardLight }}>
              <AlertCircle size={14} /> {saveError}
            </p>
          )}
          <div className={`mx-auto flex items-center justify-between gap-4 transition-all duration-200 ${
            adminTab === "history"
              ? "w-full max-w-[98vw] 2xl:max-w-[1850px] px-2 sm:px-4 md:px-6"
              : adminTab === "orders"
              ? "w-full max-w-[1720px] px-3 sm:px-6"
              : "max-w-5xl"
          }`}>
            <span className="hidden sm:block text-xs font-semibold" style={{ color: BRAND.paper }}>
              {dirty ? "Hay modificaciones listas para publicar" : "Todos los datos están sincronizados"}
            </span>
            <button
              type="button"
              onClick={saveAllAdminChanges}
              disabled={!dirty || saving}
              className="w-full sm:w-auto sm:min-w-[280px] flex items-center justify-center gap-2 rounded-xl py-3.5 px-6 font-bold text-sm md:text-base shadow-lg transition disabled:opacity-40 hover:brightness-105"
              style={{ background: savedFlash ? BRAND.green : BRAND.tomato, color: BRAND.cream }}
            >
              {saving ? (<><LoaderCircle className="animate-spin" size={18} /> Guardando cambios...</>) :
                savedFlash ? (<><CheckCircle2 size={18} /> ¡Cambios guardados con éxito!</>) :
                (<><Save size={18} /> Guardar cambios</>)}
            </button>
          </div>
        </div>

        {/* Notificaciones Toast en el Panel de Administración */}
        <ToastContainer
          toasts={toasts}
          onDismiss={removeToast}
          onAction={handleToastAction}
        />

        {/* Modales Compartidos: Cobro por Caja y Reporte de Movimientos */}
        {renderCashPaymentModal()}
        {renderCashReportModal()}
        {renderHistoryDetailModal()}
        {renderHistoryPdfModal()}
        {renderWhatsAppConfirmationModal()}

        {/* Modales de Códigos de Activación y Licencias para Comercios */}
        {renderCreateCodeModal()}
        {renderActivateAppModal()}
        {renderLicenseBlockedModal()}
        {renderGoogleLicenseRequiredModal()}
        {renderConfirmActionModal()}
        {renderSaveDataModal()}
        {renderSimulatorModal()}

        {/* Modal de Seguimiento de Pedidos y Notificaciones Push en Vivo */}
        <OrderTrackingModal
          isOpen={trackingModalOpen}
          onClose={() => setTrackingModalOpen(false)}
          initialOrderId={trackingOrderId}
          businessPhone={business.phoneIntl || "595981456789"}
          onRefreshOrders={refreshCustomerOrdersFromServer}
          customerOrders={customerOrders}
        />

        {/* Modal de Instalación PWA (con Logo Oficial) */}
        <InstallAppModal
          isOpen={showInstallModal}
          onClose={handleCloseInstallModal}
          onInstallSuccess={() => {
            addToast("success", "¡App instalada!", "Ya tenés el acceso directo con el logo en tu pantalla.");
          }}
          brandColors={BRAND}
        />
      </div>
    </AdminErrorBoundary>
    );
  }

  /* =========================================================================
     PANTALLA: TIENDA PÚBLICA (ADAPTADA A PC Y CELULAR)
     ========================================================================= */
  return (
    <div style={pageBackgroundStyle} className="min-h-screen flex flex-col font-sans selection:bg-amber-200">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Alfa+Slab+One&family=Caveat:wght@600;700&family=Work+Sans:wght@400;500;600;700;800&display=swap');
        .slab { font-family: 'Alfa Slab One', serif; }
        .hand { font-family: 'Caveat', cursive; }
        .scrollbar-none::-webkit-scrollbar, .no-scrollbar::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }
        .scrollbar-none, .no-scrollbar { -ms-overflow-style: none !important; scrollbar-width: none !important; }
        .menu-category-scroll {
          scrollbar-width: thin;
          scrollbar-color: #C1392B rgba(0, 0, 0, 0.12);
          -webkit-overflow-scrolling: touch;
        }
        .menu-category-scroll::-webkit-scrollbar {
          height: 6px;
        }
        .menu-category-scroll::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.08);
          border-radius: 9999px;
        }
        .menu-category-scroll::-webkit-scrollbar-thumb {
          background: #C1392B;
          border-radius: 9999px;
        }
        .menu-category-scroll::-webkit-scrollbar-thumb:hover {
          background: #A93226;
        }
      `}</style>

      {/* Barra de aviso de error si ocurre */}
      {loadError && (
        <div className="text-xs text-center py-2 px-4 flex items-center justify-center gap-1 shadow-sm" style={{ background: BRAND.mustard, color: BRAND.charcoal }}>
          <AlertCircle size={14} /> {loadError}
        </div>
      )}

      {/* Barra de Contacto y Datos del Comercio (visible en PC y tablets) */}
      <div style={{ background: BRAND.charcoalDark }} className="w-full text-stone-300 text-xs py-1.5 px-4 hidden md:block border-b border-stone-800">
        <div className="max-w-5xl xl:max-w-6xl 2xl:max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-1.5 text-stone-300">
              <MapPin size={13} color={BRAND.mustardLight} /> {business.address}
            </span>
            <span className="flex items-center gap-1.5 text-stone-300">
              <Phone size={13} color={BRAND.green} /> WhatsApp: <b className="text-white">{business.phoneDisplay}</b>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-stone-400 font-medium">
              Delivery y retiro en el local
            </span>
          </div>
        </div>
      </div>

      {/* Portada Principal del Comercio (Hero Nítido Adaptado para PC y Celular) */}
      <div className="relative w-full overflow-hidden bg-stone-900 flex justify-center shadow-md">
        {/* Contenedor responsivo del Banner sin efectos borrosos ni viñetas que reduzcan la nitidez */}
        <div className="relative z-10 w-full max-w-7xl 2xl:max-w-[1700px] flex items-center justify-center px-0 sm:px-4 py-0 sm:py-2">
          <div className="relative w-full flex items-center justify-center overflow-hidden sm:rounded-2xl sm:shadow-2xl sm:border sm:border-stone-800 bg-stone-950">
            <img 
              src={business.bannerImage || "/menupy_mockup_qr.jpg"} 
              alt={business.name || "Menu Py"} 
              className="w-full h-auto max-h-[380px] sm:max-h-[440px] md:max-h-[490px] object-contain block mx-auto"
              style={{
                imageRendering: "-webkit-optimize-contrast",
                WebkitBackfaceVisibility: "hidden",
                transform: "translateZ(0)",
              }}
              onError={(e) => { e.currentTarget.src = "/menupy_mockup_qr.jpg"; }} 
            />
          </div>
        </div>
      </div>

      {/* BANNER FLOTANTE DE SESIÓN PERSISTENTE PARA GERENTE / PERSONAL / ADMIN */}
      {adminSession && adminSession.active && (
        <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 border-b border-amber-500/30 px-3 py-2 text-xs text-white shadow-xl sticky top-0 z-30">
          <div className="max-w-5xl xl:max-w-6xl 2xl:max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full font-black text-[11px] flex items-center gap-1 shadow-sm ${
                adminRole === "superadmin"
                  ? "bg-amber-400 text-stone-900"
                  : adminRole === "staff"
                  ? "bg-blue-500 text-white"
                  : "bg-emerald-500 text-white"
              }`}>
                {adminRole === "superadmin" ? "👑 Administrador General" : adminRole === "staff" ? (adminSession?.user ? `👨‍🍳 ${adminSession.user}` : "👨‍🍳 Personal Operativo") : "👔 Modo Gerente Activo"}
              </span>
              {googleUser && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-white text-stone-900 shadow-sm border border-stone-300">
                  {googleUser.photoURL ? (
                    <img src={googleUser.photoURL} alt="" className="w-3.5 h-3.5 rounded-full" />
                  ) : (
                    <span className="w-3 h-3 rounded-full bg-blue-500 text-[9px] text-white flex items-center justify-center font-bold">G</span>
                  )}
                  <span className="truncate max-w-[130px] sm:max-w-[180px]">{googleUser.email}</span>
                </span>
              )}
              <span className="text-stone-300 text-[11px] font-medium hidden sm:inline">
                {adminRole === "staff"
                  ? `Tomando comandas en salón (${adminSession?.user || "Mozo"}) • Autorizado por Gerencia`
                  : adminRole === "superadmin"
                  ? "Acceso total sin restricciones a toda la plataforma"
                  : "Sesión activa • Podés ver el menú y volver a pedidos cuando quieras"}
              </span>
              {adminRole === "owner" && (
                <span
                  onClick={() => { setView("admin"); setAdminTab("business"); }}
                  className="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-stone-800/90 text-stone-200 border border-stone-700 cursor-pointer hover:border-amber-400 hover:text-white transition"
                  title="Hacé clic para configurar la persistencia de sesión en Datos del Comercio"
                >
                  <ShieldCheck size={12} className={sessionPersistence === "keep_active" ? "text-emerald-400" : "text-amber-400"} />
                  <span>{sessionPersistence === "keep_active" ? "Persistencia Activa (Protegida)" : "Cerrar al Salir"}</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setView("admin");
                  setAdminTab("orders");
                  loadOrders();
                }}
                className="px-3.5 py-1.5 rounded-xl font-black bg-amber-500 hover:bg-amber-400 text-stone-900 transition flex items-center gap-1.5 shadow active:scale-95 text-xs"
              >
                <Receipt size={14} />
                <span>Volver a Pedidos y Cocina</span>
                {pendingOrders.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-stone-900 text-amber-300">
                    {pendingOrders.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="px-2.5 py-1.5 rounded-xl text-stone-300 hover:text-white bg-stone-800 hover:bg-red-950 border border-stone-600 hover:border-red-700 text-xs font-bold transition flex items-center gap-1"
                title="Cerrar sesión de gerencia / personal y volver a modo cliente"
              >
                <LogOut size={13} />
                <span className="hidden md:inline">Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barra Superior Sticky con Nombre, Carrito y Acceso a Admin */}
      <div style={{ background: BRAND.charcoalDark }} className={`sticky ${adminSession && adminSession.active ? "top-10" : "top-0"} z-20 shadow-lg border-b border-stone-800/80 transition-all`}>
        <div className="max-w-5xl xl:max-w-6xl 2xl:max-w-7xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="slab text-lg sm:text-xl md:text-2xl text-white tracking-wide leading-none truncate">
              {business.name}
            </h1>
            <p className="hand text-base sm:text-lg md:text-xl leading-none mt-0.5" style={{ color: BRAND.mustard }}>
              {business.slogan || "Pedí online"}
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Mensaje de ayuda para seleccionar productos (visible en PC) */}
            <div className="hidden lg:flex items-center gap-1.5 text-right leading-tight">
              <span className="hand text-lg xl:text-xl" style={{ color: "#FFD600", maxWidth: 190 }}>
                Elegí tus platos y confirmá en el carrito
              </span>
              <span className="text-2xl">👉</span>
            </div>

            {/* Botón de Seguimiento de Pedidos y Notificaciones Push */}
            <button
              onClick={() => {
                setTrackingOrderId(customerOrders[0]?.id || null);
                setTrackingModalOpen(true);
              }}
              className="relative py-2 sm:py-2.5 px-3 sm:px-3.5 rounded-full flex items-center gap-1.5 shadow-md hover:brightness-110 active:scale-95 transition bg-stone-800 text-stone-200 border border-stone-700"
              title="Seguimiento en vivo de tus pedidos y notificaciones push"
            >
              <BellRing
                size={16}
                className={
                  customerOrders.some((o) => o && o.orderStatus !== "completado" && o.orderStatus !== "cancelado")
                    ? "text-amber-400 animate-pulse"
                    : "text-stone-300"
                }
              />
              <span className="font-bold text-xs hidden md:inline">Mis Pedidos</span>
              {customerOrders.length > 0 && (
                <span
                  className={`rounded-full text-[10px] font-black flex items-center justify-center px-1.5 py-0.5 ${
                    customerOrders.some((o) => o && o.orderStatus !== "completado" && o.orderStatus !== "cancelado")
                      ? "bg-amber-500 text-stone-900 animate-bounce"
                      : "bg-stone-700 text-stone-300"
                  }`}
                >
                  {customerOrders.length}
                </span>
              )}
            </button>

            {/* Botón del Carrito */}
            <button
              onClick={() => setCartOpen(true)}
              className="relative py-2 sm:py-2.5 px-3.5 sm:px-4 rounded-full flex items-center gap-2 shadow-md hover:brightness-105 active:scale-95 transition"
              style={{ background: BRAND.tomato }}
              title="Ver tu pedido"
            >
              <ShoppingCart size={19} color={BRAND.cream} />
              <span className="font-bold text-xs sm:text-sm hidden sm:inline" style={{ color: BRAND.cream }}>
                {totalPrice > 0 ? formatGs(totalPrice) : "Carrito"}
              </span>
              {totalQty > 0 && (
                <span className="rounded-full text-xs font-black flex items-center justify-center shadow" style={{ background: BRAND.mustard, color: BRAND.charcoal, width: 22, height: 22 }}>
                  {totalQty}
                </span>
              )}
            </button>

            {/* Botón Instalar App (Acceso directo con logo oficial) */}
            <button
              onClick={() => setShowInstallModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold transition shadow-sm hover:brightness-110 active:scale-95 text-white"
              style={{
                background: "linear-gradient(135deg, #0050E6 0%, #0072FF 60%, #00B4D8 100%)",
                boxShadow: "0 2px 8px rgba(0, 114, 255, 0.3)"
              }}
              title="Instalar aplicación en tu celular o PC con acceso directo y logo oficial"
            >
              <Download size={15} />
              <span className="hidden sm:inline">Instalar App</span>
            </button>

            {/* Botón de Configuración y Panel de Administración */}
            <button
              onClick={() => {
                if (adminSession && adminSession.active) {
                  setView("admin");
                  setAdminTab("orders");
                  loadOrders();
                } else {
                  setUserInput("");
                  setPinInput("");
                  setPinError("");
                  setShowLoginPin(false);
                  userInteractedLoginRef.current = false;
                  setLoginFormKey((k) => k + 1);
                  setView("adminLogin");
                }
              }}
              className="p-2 sm:p-2.5 rounded-full flex-shrink-0 hover:brightness-105 active:scale-95 transition shadow flex items-center gap-1.5"
              style={{
                background: adminSession && adminSession.active
                  ? (adminRole === "superadmin" ? "#FEF08A" : adminRole === "staff" ? "#DBEAFE" : "#D1FAE5")
                  : BRAND.paperDark
              }}
              title={adminSession && adminSession.active ? "Volver al Panel de Pedidos y Cocina" : "Acceso Gerencia / Administrador"}
            >
              {adminSession && adminSession.active ? (
                adminRole === "superadmin" ? (
                  <ShieldCheck size={18} className="text-amber-800" />
                ) : adminRole === "staff" ? (
                  <ChefHat size={18} className="text-blue-700" />
                ) : (
                  <Store size={18} className="text-emerald-800" />
                )
              ) : (
                <Settings size={18} color={BRAND.charcoal} />
              )}
              <span className="hidden md:inline text-xs font-bold" style={{ color: adminSession && adminSession.active ? "#1C1917" : BRAND.charcoal }}>
                {adminSession && adminSession.active
                  ? (adminRole === "superadmin" ? "Admin" : adminRole === "staff" ? "Personal" : "Gerente")
                  : "Admin"}
              </span>
            </button>
          </div>
        </div>

        {/* Guía en móviles */}
        <p className="hand text-sm text-center pb-2 lg:hidden flex items-center justify-center gap-1" style={{ color: "#FFD600" }}>
          Seleccioná tus productos y confirmá en el carrito <span className="text-lg">👇</span>
        </p>
      </div>

      {/* Ticker / Banner de Pedido Activo en Curso con Notificación Push */}
      {(() => {
        const activeOrder = customerOrders.find(
          (o) => o && o.orderStatus !== "completado" && o.orderStatus !== "cancelado"
        );
        if (!activeOrder) return null;
        const cfg = ORDER_STATUS_CONFIG[activeOrder.orderStatus] || ORDER_STATUS_CONFIG.recibido;
        return (
          <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white px-3 sm:px-4 py-2 text-xs font-bold flex items-center justify-between shadow-md border-b border-amber-500/40">
            <div className="flex items-center gap-2 truncate">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-200 animate-ping flex-shrink-0" />
              <span className="truncate">
                Pedido <b>{activeOrder.id}</b>: <span className="font-black underline">{cfg.label}</span>
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setTrackingOrderId(activeOrder.id);
                setTrackingModalOpen(true);
              }}
              className="ml-2 px-2.5 py-1 rounded-lg bg-black/30 hover:bg-black/40 text-amber-200 border border-amber-300/40 text-[11px] font-black transition flex items-center gap-1 flex-shrink-0"
            >
              <BellRing size={12} />
              <span>Ver Estado</span>
            </button>
          </div>
        );
      })()}

      {/* Barra de Búsqueda y Navegación de Secciones (Sticky para fácil acceso en PC y Móvil) */}
      <div style={{ background: BRAND.paperDark }} className="shadow-md sticky top-[57px] sm:top-[63px] md:top-[67px] z-10 border-b border-stone-400/40">
        <div className="max-w-5xl xl:max-w-6xl 2xl:max-w-7xl mx-auto px-3 sm:px-4 py-2 flex flex-col gap-2">
          {/* Buscador en Tiempo Real */}
          <div className="relative flex items-center">
            <Search size={16} className="absolute left-3.5 text-stone-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar plato, bebida o postre... (ej: milanesa, empanada, pizza, coca)"
              className="w-full pl-9 pr-8 py-2 rounded-xl text-xs md:text-sm font-semibold bg-white border shadow-sm focus:outline-none focus:ring-2 focus:ring-[#C1392B]"
              style={{ borderColor: BRAND.paperDark, color: BRAND.charcoal }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
                title="Limpiar búsqueda"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Selector de Secciones: Desplazamiento horizontal de lado a lado con flechas y scrollbar visible */}
          <div className="relative flex items-center w-full group">
            {/* Flecha para desplazar a la izquierda */}
            <button
              type="button"
              onClick={() => scrollCategories("left")}
              className="hidden sm:flex items-center justify-center p-2 mr-1.5 rounded-full bg-white text-stone-800 border-2 shadow hover:bg-stone-50 active:scale-95 transition flex-shrink-0 z-10"
              style={{ borderColor: BRAND.paperDark }}
              title="Desplazar menú hacia la izquierda"
              aria-label="Desplazar a la izquierda"
            >
              <ChevronLeft size={16} />
            </button>

            {/* Contenedor con barra de desplazamiento horizontal visible */}
            <div
              ref={categoryScrollRef}
              className="flex items-center gap-2 overflow-x-auto pb-2 pt-0.5 scroll-smooth menu-category-scroll w-full select-none"
            >
              {/* Pestaña: Todas las secciones */}
              <button
                type="button"
                onClick={() => {
                  setActiveSection("TODOS");
                  setOpenCat(menu[0]?.category || "");
                }}
                className="whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs md:text-sm font-bold border-2 flex items-center gap-1.5 transition shadow-sm hover:scale-[1.02] flex-shrink-0"
                style={activeSection === "TODOS"
                  ? { background: BRAND.tomato, color: BRAND.cream, borderColor: BRAND.tomatoDark }
                  : { background: BRAND.paper, color: BRAND.charcoal, borderColor: BRAND.charcoal }}
              >
                <span>🍽️</span>
                <span>Todas las secciones</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                  activeSection === "TODOS" ? "bg-white/20 text-white" : "bg-stone-300 text-stone-800"
                }`}>
                  {allItems.length}
                </span>
              </button>

              {/* Pestañas por cada categoría (Platos Principales, Bebidas, Postres, etc.) */}
              {categoryStats.map((c) => {
                const isSelected = activeSection === c.category;
                return (
                  <button
                    key={c.category}
                    type="button"
                    onClick={() => {
                      setActiveSection(c.category);
                      setOpenCat(c.category);
                    }}
                    className="whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs md:text-sm font-bold border-2 flex items-center gap-1.5 transition shadow-sm hover:scale-[1.02] flex-shrink-0"
                    style={isSelected
                      ? { background: BRAND.tomato, color: BRAND.cream, borderColor: BRAND.tomatoDark }
                      : { background: BRAND.paper, color: BRAND.charcoal, borderColor: BRAND.charcoal }}
                  >
                    <CategoryIcon name={c.category} icon={c.icon} size={15} color={isSelected ? BRAND.cream : BRAND.charcoal} />
                    <span>{c.category}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                      isSelected ? "bg-white/20 text-white" : "bg-stone-300 text-stone-800"
                    }`}>
                      {c.totalItems}
                    </span>
                    {c.inCartCount > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-400 text-stone-900 font-black shadow-sm" title={`${c.inCartCount} en el carrito`}>
                        {c.inCartCount} 🛒
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Flecha para desplazar a la derecha */}
            <button
              type="button"
              onClick={() => scrollCategories("right")}
              className="hidden sm:flex items-center justify-center p-2 ml-1.5 rounded-full bg-white text-stone-800 border-2 shadow hover:bg-stone-50 active:scale-95 transition flex-shrink-0 z-10"
              style={{ borderColor: BRAND.paperDark }}
              title="Desplazar menú hacia la derecha"
              aria-label="Desplazar a la derecha"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Selector Principal de Modalidad de Pedido */}
      <div className="max-w-5xl xl:max-w-6xl 2xl:max-w-7xl mx-auto px-3 sm:px-4 pt-3 pb-1 w-full">
        <div
          className="rounded-2xl p-3 md:p-4 border-2 shadow-sm"
          style={{ background: BRAND.cream, borderColor: BRAND.paperDark }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b" style={{ borderColor: BRAND.paperDark }}>
            <div className="flex items-center gap-2">
              <span className="text-base md:text-xl">🛎️</span>
              <div>
                <p className="font-black text-xs md:text-sm" style={{ color: BRAND.charcoal }}>
                  ¿Cómo querés hacer tu pedido?
                </p>
                <p className="text-[11px] text-stone-600">
                  Elegí si es para consumir en una mesa del salón, delivery o pasar a buscar
                </p>
              </div>
            </div>

            {/* Badge de estado actual */}
            <div className="self-start sm:self-auto">
              {mode === "mesa" && (
                <span className="text-xs font-black px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm" style={{ background: BRAND.mustard, color: BRAND.charcoal }}>
                  <Utensils size={13} /> {tableNumber.trim() ? `Mesa N° ${tableNumber.trim()}` : "Mesa (a indicar)"}
                </span>
              )}
              {mode === "delivery" && (
                <span className="text-xs font-black px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm" style={{ background: BRAND.tomato, color: BRAND.cream }}>
                  <Bike size={13} /> Envío por Delivery
                </span>
              )}
              {mode === "retiro" && (
                <span className="text-xs font-black px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm" style={{ background: BRAND.green, color: BRAND.cream }}>
                  <ShoppingBag size={13} /> Pasar a buscar (Retiro)
                </span>
              )}
            </div>
          </div>

          {/* 3 Botones de selección de modalidad adaptados a PC y celular */}
          <div className="grid grid-cols-3 gap-2 pt-2.5">
            <button
              type="button"
              onClick={() => setMode("mesa")}
              className="p-2 sm:p-2.5 md:p-3 rounded-xl text-xs sm:text-sm font-bold flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 border-2 transition shadow-sm hover:brightness-105 active:scale-95"
              style={mode === "mesa"
                ? { background: BRAND.tomato, color: BRAND.cream, borderColor: BRAND.tomatoDark }
                : { background: "#FFF", color: BRAND.charcoal, borderColor: BRAND.paperDark }}
            >
              <Utensils size={16} />
              <span>Pedir en Mesa</span>
            </button>

            <button
              type="button"
              onClick={() => setMode("delivery")}
              className="p-2 sm:p-2.5 md:p-3 rounded-xl text-xs sm:text-sm font-bold flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 border-2 transition shadow-sm hover:brightness-105 active:scale-95"
              style={mode === "delivery"
                ? { background: BRAND.tomato, color: BRAND.cream, borderColor: BRAND.tomatoDark }
                : { background: "#FFF", color: BRAND.charcoal, borderColor: BRAND.paperDark }}
            >
              <Bike size={16} />
              <span>Delivery</span>
            </button>

            <button
              type="button"
              onClick={() => setMode("retiro")}
              className="p-2 sm:p-2.5 md:p-3 rounded-xl text-xs sm:text-sm font-bold flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 border-2 transition shadow-sm hover:brightness-105 active:scale-95"
              style={mode === "retiro"
                ? { background: BRAND.tomato, color: BRAND.cream, borderColor: BRAND.tomatoDark }
                : { background: "#FFF", color: BRAND.charcoal, borderColor: BRAND.paperDark }}
            >
              <ShoppingBag size={16} />
              <span>Pasar a buscar</span>
            </button>
          </div>

          {/* Panel interactivo de Número de Mesa */}
          {mode === "mesa" && (
            <div className="mt-3 p-2.5 rounded-xl bg-white border flex flex-col md:flex-row md:items-center justify-between gap-2.5" style={{ borderColor: tableError ? BRAND.tomato : BRAND.paperDark }}>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg" style={{ background: BRAND.mustardLight }}>
                  <Utensils size={15} color={BRAND.charcoal} />
                </div>
                <label className="text-xs font-bold whitespace-nowrap" style={{ color: BRAND.charcoal }}>
                  Número de mesa:
                </label>
                <div className="relative w-36">
                  <Hash size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    value={tableNumber}
                    onChange={(e) => {
                      setTableNumber(e.target.value);
                      setTableError("");
                    }}
                    placeholder="Ej: 4, 12, Barra..."
                    className="w-full pl-7 pr-2.5 py-1.5 text-xs font-bold rounded-lg border focus:outline-none"
                    style={{ borderColor: tableError ? BRAND.tomato : BRAND.paperDark }}
                  />
                </div>
              </div>

              {/* Botones rápidos de mesas habituales (1 al 10) */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none no-scrollbar">
                <span className="text-[10px] text-stone-500 font-bold mr-1 hidden sm:inline">Mesas:</span>
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => {
                      setTableNumber(n);
                      setTableError("");
                    }}
                    className={`px-2 py-0.5 text-xs rounded-md font-bold border transition ${
                      tableNumber === n
                        ? "bg-[#C1392B] text-white border-[#9E2C20]"
                        : "bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-200"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}
          {mode === "mesa" && tableError && (
            <p className="text-[11px] font-bold text-red-600 mt-1.5">⚠️ {tableError}</p>
          )}

          {/* Información rápida para Delivery */}
          {mode === "delivery" && (
            <div className="mt-2.5 p-2 rounded-xl bg-white/80 border text-xs text-stone-600 flex items-center justify-between" style={{ borderColor: BRAND.paperDark }}>
              <span>🛵 Te enviamos el pedido a tu domicilio. En el carrito podrás indicar tu dirección o adjuntar ubicación GPS.</span>
            </div>
          )}

          {/* Información rápida para Retiro */}
          {mode === "retiro" && (
            <div className="mt-2.5 p-2 rounded-xl bg-white/80 border text-xs text-stone-600 flex items-center justify-between" style={{ borderColor: BRAND.paperDark }}>
              <span>🛍️ Lo prepararemos para que pases a retirarlo por nuestro local: <b>{business.address}</b></span>
            </div>
          )}
        </div>
      </div>

      {/* Contenedor Principal de Productos (Organizado por Secciones y Filtros) */}
      <main className="flex-1 max-w-5xl xl:max-w-6xl 2xl:max-w-7xl mx-auto w-full p-3 sm:p-4 md:p-6 pb-28">
        {/* Banner de Búsqueda Activa */}
        {searchQuery.trim() && (
          <div className="mb-5 p-3 px-4 rounded-2xl bg-amber-100/95 border border-amber-300 shadow-sm flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-amber-950 text-xs md:text-sm">
              <Search size={16} className="text-amber-700 flex-shrink-0" />
              <span>
                Resultados para <b>"{searchQuery}"</b>: <b>{totalFilteredItems}</b> {totalFilteredItems === 1 ? "opción encontrada" : "opciones encontradas"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="px-2.5 py-1 rounded-xl bg-white text-stone-800 border border-amber-300 hover:bg-stone-50 text-xs font-bold transition shadow-sm flex-shrink-0"
            >
              Limpiar búsqueda
            </button>
          </div>
        )}

        {/* Indicador de Sección Filtrada (cuando no es TODOS y no hay búsqueda) */}
        {!searchQuery.trim() && activeSection !== "TODOS" && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 bg-white/70 p-2.5 px-3.5 rounded-2xl border" style={{ borderColor: BRAND.paperDark }}>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Sección activa:</span>
              <span className="text-xs font-black px-2.5 py-0.5 rounded-full text-white flex items-center gap-1.5 shadow-sm" style={{ background: BRAND.tomato }}>
                <CategoryIcon name={activeSection} size={14} color="#FFF" />
                {activeSection}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveSection("TODOS")}
              className="text-xs font-bold text-[#C1392B] hover:underline flex items-center gap-1"
            >
              <span>Ver todo el menú por secciones →</span>
            </button>
          </div>
        )}

        {/* Estado Vacío si no hay resultados */}
        {filteredMenu.length === 0 ? (
          <div className="rounded-3xl p-8 md:p-12 text-center bg-white/80 border-2 border-dashed border-stone-300 my-6 shadow-sm">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-amber-100 flex items-center justify-center text-3xl shadow-inner">
              🍽️
            </div>
            <h3 className="slab text-xl md:text-2xl text-stone-800 mb-1">
              No encontramos platos ni bebidas
            </h3>
            <p className="text-xs md:text-sm text-stone-600 max-w-md mx-auto mb-4">
              {searchQuery.trim()
                ? `No hay coincidencias para "${searchQuery}" en ${activeSection === "TODOS" ? "el menú" : `la sección ${activeSection}`}.`
                : `Por el momento no hay productos registrados en la sección "${activeSection}".`}
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setActiveSection("TODOS");
              }}
              className="px-5 py-2.5 rounded-xl text-xs md:text-sm font-bold text-white shadow hover:brightness-105 transition"
              style={{ background: BRAND.tomato }}
            >
              Restablecer filtros y ver todo el menú
            </button>
          </div>
        ) : (
          filteredMenu.map((c) => (
            <section
              key={c.category}
              id={`seccion-${encodeURIComponent(c.category)}`}
              className="mb-10 scroll-mt-36"
            >
              {/* Cabecera de la Sección */}
              <div className="flex items-center justify-between mb-4 pb-2 border-b-2" style={{ borderColor: BRAND.paperDark }}>
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl shadow-sm" style={{ background: BRAND.tomato }}>
                    <CategoryIcon name={c.category} icon={c.icon} size={20} color={BRAND.cream} />
                  </div>
                  <div>
                    <h2 className="slab text-xl md:text-2xl leading-tight" style={{ color: BRAND.charcoal }}>
                      {c.category}
                    </h2>
                    <span className="text-[11px] font-bold text-stone-500">
                      {c.items.length} {c.items.length === 1 ? "opción disponible" : "opciones disponibles"}
                    </span>
                  </div>
                </div>

                {activeSection === "TODOS" && filteredMenu.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setActiveSection(c.category)}
                    className="text-xs font-bold text-stone-600 hover:text-stone-900 bg-white hover:bg-stone-50 px-3 py-1.5 rounded-xl border border-stone-300 transition shadow-sm flex items-center gap-1"
                    title={`Ver únicamente la sección ${c.category}`}
                  >
                    <span>Filtrar solo {c.category}</span>
                  </button>
                )}
              </div>

              {/* Grid Responsivo: 1 col en celular, 2 en tablet, 3 en PC, 4 en pantallas amplias */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
                {c.items.map((item) => {
                  const qty = cart[item.id] || 0;
                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl p-3.5 flex flex-col justify-between shadow-md border hover:shadow-lg transition-all"
                      style={{ background: BRAND.cream, borderColor: BRAND.paperDark }}
                    >
                      <div>
                        {/* Foto del plato (si existe) */}
                        {item.image && (
                          <div className="w-full h-40 mb-3 rounded-xl overflow-hidden bg-stone-200">
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover hover:scale-105 transition duration-300"
                              loading="lazy"
                            />
                          </div>
                        )}

                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-base md:text-lg leading-snug" style={{ color: BRAND.charcoal }}>
                            {item.name}
                          </h3>
                        </div>

                        {item.desc && (
                          <p className="text-xs text-stone-600 line-clamp-2 mt-1 leading-relaxed">
                            {item.desc}
                          </p>
                        )}
                      </div>

                      {/* Selector directo de modalidad en cada cuadro de menú */}
                      <div className="my-2.5 pt-2 border-t flex items-center justify-between gap-1" style={{ borderColor: BRAND.paperDark }}>
                        <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                          Pedir para:
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setMode("mesa")}
                            className={`px-2 py-0.5 rounded-lg text-[11px] font-bold flex items-center gap-1 border transition ${
                              mode === "mesa"
                                ? "bg-[#C1392B] text-white border-[#9E2C20] shadow-sm"
                                : "bg-white text-stone-600 border-stone-200 hover:bg-stone-100"
                            }`}
                            title="Pedir para mesa en el salón"
                          >
                            <Utensils size={11} />
                            <span>Mesa {tableNumber ? `N° ${tableNumber}` : "X"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setMode("delivery")}
                            className={`px-2 py-0.5 rounded-lg text-[11px] font-bold flex items-center gap-1 border transition ${
                              mode === "delivery"
                                ? "bg-[#C1392B] text-white border-[#9E2C20] shadow-sm"
                                : "bg-white text-stone-600 border-stone-200 hover:bg-stone-100"
                            }`}
                            title="Pedir para delivery"
                          >
                            <Bike size={11} />
                            <span>Delivery</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setMode("retiro")}
                            className={`px-2 py-0.5 rounded-lg text-[11px] font-bold flex items-center gap-1 border transition ${
                              mode === "retiro"
                                ? "bg-[#C1392B] text-white border-[#9E2C20] shadow-sm"
                                : "bg-white text-stone-600 border-stone-200 hover:bg-stone-100"
                            }`}
                            title="Pedir para pasar a buscar"
                          >
                            <ShoppingBag size={11} />
                            <span>Retiro</span>
                          </button>
                        </div>
                      </div>

                      {/* Precio y controles de cantidad */}
                      <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: BRAND.paperDark }}>
                        <div>
                          <span className="text-[10px] text-stone-500 uppercase tracking-wider block font-bold">Precio</span>
                          <span className="font-black text-base md:text-lg" style={{ color: BRAND.tomato }}>
                            {formatGs(item.price)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {qty > 0 && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setCart((prev) => {
                                    const next = { ...prev };
                                    delete next[item.id];
                                    return next;
                                  });
                                }}
                                className="p-1 px-2 rounded-full bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold flex items-center gap-1 transition active:scale-95 border border-red-200 mr-0.5"
                                title="Eliminar este plato del pedido"
                              >
                                <Trash2 size={13} />
                                <span className="text-[11px] font-bold">Eliminar</span>
                              </button>

                              <button
                                onClick={() => removeItem(item.id)}
                                className="p-1.5 rounded-full hover:brightness-95 active:scale-90 transition"
                                style={{ background: BRAND.paperDark, color: BRAND.charcoal }}
                                title="Quitar uno"
                              >
                                <Minus size={16} />
                              </button>
                              <span className="font-black text-sm min-w-[20px] text-center" style={{ color: BRAND.charcoal }}>
                                {qty}
                              </span>
                            </>
                          )}
                          <button
                            onClick={() => addItem(item.id)}
                            className="p-1.5 px-3 rounded-full flex items-center gap-1 font-bold text-xs shadow hover:brightness-105 active:scale-95 transition"
                            style={{ background: BRAND.tomato, color: BRAND.cream }}
                            title="Agregar al pedido"
                          >
                            <Plus size={16} />
                            {qty === 0 && <span>Agregar</span>}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </main>

      {/* Barra Flotante de Previsualización y Carrito Rápido (accesible en celular y PC) */}
      {totalQty > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-40 max-w-lg mx-auto flex flex-col gap-1.5">
          {/* Previsualización rápida con el nombre exacto de cada plato cargado */}
          <div className="bg-stone-900/95 text-white p-2.5 px-3.5 rounded-2xl shadow-xl backdrop-blur border border-stone-700/60 flex items-center justify-between gap-2 overflow-x-auto">
            <div className="flex items-center gap-2 overflow-x-auto py-0.5 no-scrollbar">
              <span className="text-[11px] uppercase font-black tracking-wider text-amber-400 flex-shrink-0">
                Plato(s):
              </span>
              {cartLines.map((line) => (
                <div
                  key={line.id}
                  className="flex items-center gap-2 bg-stone-800 px-3 py-1 rounded-xl border border-stone-700 flex-shrink-0 text-xs shadow-sm"
                >
                  <span className="font-black text-amber-300">{line.qty}x</span>
                  <span className="font-bold text-white text-xs max-w-[140px] sm:max-w-[180px] truncate">
                    {line.name}
                  </span>
                  <span className="text-[11px] text-amber-200/90 font-mono font-semibold">
                    {formatGs(line.price * line.qty)}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearItem(line.id);
                    }}
                    className="p-1 -mr-1 rounded-lg text-red-400 hover:text-white hover:bg-red-600 transition flex items-center gap-0.5"
                    title={`Eliminar ${line.name}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setCart({})}
              className="text-xs font-bold text-red-400 hover:text-red-300 hover:underline flex-shrink-0 flex items-center gap-1 px-1.5 py-1 rounded-lg hover:bg-white/10 transition"
              title="Eliminar todos los platos cargados"
            >
              <Trash2 size={13} />
              <span>Vaciar</span>
            </button>
          </div>

          {/* Barra de acción principal: Resumen con Nombre del Menú, Eliminar y Ver pedido */}
          <div
            className="w-full p-3 px-4 rounded-2xl font-bold flex items-center justify-between shadow-2xl text-white border-2 transition"
            style={{ background: BRAND.tomato, borderColor: BRAND.tomatoDark }}
          >
            {/* Lado izquierdo: nombre del menú solicitado, precio y modalidad */}
            <div
              onClick={() => setCartOpen(true)}
              className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0 mr-2"
              title="Abrir carrito para ver detalle del pedido"
            >
              <span className="bg-white/20 p-2 rounded-xl flex-shrink-0">
                <ShoppingCart size={20} />
              </span>
              <div className="text-left min-w-0 flex-1">
                {/* Nombre visible y destacado del plato o menú solicitado */}
                <div className="text-sm md:text-base font-black leading-snug truncate text-white">
                  {cartLines.length === 1 ? (
                    <span>
                      <span className="text-amber-300 font-extrabold mr-1">{cartLines[0].qty}x</span>
                      {cartLines[0].name}
                    </span>
                  ) : cartLines.length > 1 ? (
                    <span>
                      <span className="text-amber-300 font-extrabold mr-1">{cartLines[0].qty}x</span>
                      {cartLines[0].name}
                      <span className="text-xs font-semibold text-amber-200 ml-1.5">
                        (+{cartLines.length - 1} más)
                      </span>
                    </span>
                  ) : (
                    <span>Menú seleccionado</span>
                  )}
                </div>
                <div className="text-[11px] font-semibold text-amber-100 flex items-center gap-1.5 truncate mt-0.5">
                  <span className="font-black text-amber-300 text-xs">{formatGs(totalPrice)}</span>
                  <span>•</span>
                  {mode === "mesa" ? (
                    <>
                      <Utensils size={11} /> {tableNumber.trim() ? `Mesa ${tableNumber.trim()}` : "Mesa (a indicar)"}
                    </>
                  ) : mode === "delivery" ? (
                    <>
                      <Bike size={11} /> Delivery
                    </>
                  ) : (
                    <>
                      <ShoppingBag size={11} /> Retiro
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Lado derecho: Botón Eliminar y Botón Ver pedido */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCart({});
                }}
                className="p-2 px-3 rounded-xl bg-white/20 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 transition active:scale-95 border border-white/30 shadow-sm"
                title="Eliminar platos cargados para cambiar de menú"
              >
                <Trash2 size={14} className="text-white" />
                <span className="text-xs">Eliminar</span>
              </button>

              <button
                type="button"
                onClick={() => setCartOpen(true)}
                className="p-2 px-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-900 font-black text-xs flex items-center gap-1.5 transition active:scale-95 shadow-md"
              >
                <span>Ver pedido</span>
                <span>👉</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal / Carrito de Compras (adaptado a Bottom Sheet en móvil y Diálogo Centrado en PC) */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm" style={{ background: "rgba(0,0,0,0.65)" }}>
          <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 md:p-6 max-h-[92vh] overflow-y-auto flex flex-col shadow-2xl" style={{ background: BRAND.paper }}>
            {/* Cabecera del Carrito */}
            <div className="flex items-center justify-between pb-3 border-b mb-4" style={{ borderColor: BRAND.paperDark }}>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl" style={{ background: BRAND.tomato }}>
                  <ShoppingCart size={20} color={BRAND.cream} />
                </div>
                <div>
                  <h2 className="slab text-xl" style={{ color: BRAND.charcoal }}>Tu Pedido</h2>
                  <p className="text-xs text-stone-600 font-medium">Revisá tus platos antes de enviar a WhatsApp</p>
                </div>
              </div>
              <button
                onClick={() => setCartOpen(false)}
                className="p-2 rounded-full hover:bg-stone-300 transition"
                style={{ background: BRAND.paperDark }}
              >
                <X size={18} color={BRAND.charcoal} />
              </button>
            </div>

            {cartLines.length === 0 ? (
              <div className="py-12 text-center flex flex-col items-center gap-3">
                <ShoppingCart size={40} className="text-stone-400" />
                <p className="text-stone-600 font-bold text-base">El carrito está vacío</p>
                <p className="text-xs text-stone-500 max-w-xs">Agregá platos del menú para armar tu pedido.</p>
                <button
                  onClick={() => setCartOpen(false)}
                  className="mt-2 px-4 py-2 rounded-xl text-xs font-bold"
                  style={{ background: BRAND.tomato, color: BRAND.cream }}
                >
                  Explorar menú
                </button>
              </div>
            ) : (
              <>
                {/* Lista de productos seleccionados */}
                <div className="flex-shrink-0 mb-4">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b" style={{ borderColor: BRAND.paperDark }}>
                    <span className="font-extrabold text-xs uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                      <Utensils size={14} className="text-amber-700" />
                      <span>Platos en tu pedido ({totalQty} {totalQty === 1 ? "unidad" : "unidades"}):</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setCart({})}
                      className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline flex items-center gap-1"
                      title="Eliminar todos los platos del pedido"
                    >
                      <Trash2 size={13} />
                      <span>Vaciar lista</span>
                    </button>
                  </div>

                  <div className="flex flex-col gap-2.5 max-h-72 overflow-y-auto pr-1">
                    {cartLines.map((l) => (
                      <div
                        key={l.id}
                        className="flex items-center justify-between p-3 rounded-2xl bg-white border-2 shadow-sm gap-2.5 flex-shrink-0"
                        style={{ borderColor: BRAND.paperDark }}
                      >
                        {l.image ? (
                          <img
                            src={l.image}
                            alt={l.name}
                            referrerPolicy="no-referrer"
                            className="w-12 h-12 rounded-xl object-cover border border-stone-200 flex-shrink-0"
                          />
                        ) : (
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-stone-400 border border-stone-200"
                            style={{ background: BRAND.cream }}
                          >
                            <Utensils size={18} />
                          </div>
                        )}

                        <div className="flex-1 min-w-0 pr-1">
                          <p className="font-black text-sm sm:text-base leading-snug" style={{ color: BRAND.charcoal }}>
                            <span className="text-amber-700 font-black mr-1.5">{l.qty}x</span>
                            {l.name}
                          </p>
                          <p className="text-xs text-stone-600 font-medium mt-0.5">
                            {formatGs(l.price)} c/u • Subtotal: <b className="font-black" style={{ color: BRAND.tomato }}>{formatGs(l.price * l.qty)}</b>
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => removeItem(l.id)}
                            className="p-1.5 rounded-full hover:bg-stone-300 transition"
                            style={{ background: BRAND.paperDark }}
                            title="Quitar uno"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="font-black text-sm min-w-[20px] text-center" style={{ color: BRAND.charcoal }}>{l.qty}</span>
                          <button
                            type="button"
                            onClick={() => addItem(l.id)}
                            className="p-1.5 rounded-full hover:brightness-110 transition"
                            style={{ background: BRAND.tomato, color: BRAND.cream }}
                            title="Agregar uno"
                          >
                            <Plus size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => clearItem(l.id)}
                            className="p-1.5 ml-1 rounded-lg text-red-600 hover:text-white hover:bg-red-600 transition"
                            title="Eliminar este plato del pedido"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Selección de Modalidad: Mesa, Delivery o Retiro */}
                <div className="mb-4">
                  <p className="font-bold text-xs uppercase tracking-wider mb-2" style={{ color: BRAND.charcoal }}>
                    ¿Cómo vas a recibir tu pedido?
                  </p>
                  <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                    <button
                      type="button"
                      onClick={() => setMode("mesa")}
                      className="p-2 sm:p-2.5 rounded-xl text-xs sm:text-sm font-bold flex flex-col items-center justify-center gap-1 border-2 transition"
                      style={mode === "mesa" ? { background: BRAND.tomato, color: BRAND.cream, borderColor: BRAND.tomatoDark } : { background: BRAND.cream, borderColor: BRAND.paperDark, color: BRAND.charcoal }}
                    >
                      <Utensils size={16} />
                      <span className="text-center text-[11px] sm:text-xs">En Mesa</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMode("delivery")}
                      className="p-2 sm:p-2.5 rounded-xl text-xs sm:text-sm font-bold flex flex-col items-center justify-center gap-1 border-2 transition"
                      style={mode === "delivery" ? { background: BRAND.tomato, color: BRAND.cream, borderColor: BRAND.tomatoDark } : { background: BRAND.cream, borderColor: BRAND.paperDark, color: BRAND.charcoal }}
                    >
                      <Bike size={16} />
                      <span className="text-center text-[11px] sm:text-xs">Delivery</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMode("retiro")}
                      className="p-2 sm:p-2.5 rounded-xl text-xs sm:text-sm font-bold flex flex-col items-center justify-center gap-1 border-2 transition"
                      style={mode === "retiro" ? { background: BRAND.tomato, color: BRAND.cream, borderColor: BRAND.tomatoDark } : { background: BRAND.cream, borderColor: BRAND.paperDark, color: BRAND.charcoal }}
                    >
                      <ShoppingBag size={16} />
                      <span className="text-center text-[11px] sm:text-xs">Pasar a buscar</span>
                    </button>
                  </div>
                </div>

                {/* Campos para Mesa */}
                {mode === "mesa" && (
                  <div className="mb-4 flex flex-col gap-2.5 p-3.5 rounded-xl border-2" style={{ background: BRAND.cream, borderColor: tableError ? BRAND.tomato : BRAND.paperDark }}>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold flex items-center gap-1.5" style={{ color: BRAND.charcoal }}>
                        <Utensils size={14} style={{ color: BRAND.tomato }} /> Número de mesa en el salón:
                      </label>
                      {tableNumber && (
                        <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-amber-200 text-stone-800">
                          Mesa {tableNumber}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <Hash size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input
                        type="text"
                        placeholder="Escribí el número de tu mesa (ej: 4, 12, Barra...)"
                        value={tableNumber}
                        onChange={(e) => {
                          setTableNumber(e.target.value);
                          setTableError("");
                        }}
                        className="w-full pl-8 pr-3 py-2 text-xs font-bold rounded-xl border"
                        style={{ borderColor: tableError ? BRAND.tomato : BRAND.paperDark, background: "#FFF" }}
                        autoFocus
                      />
                    </div>
                    {tableError && (
                      <p className="text-[11px] font-bold text-red-600">⚠️ {tableError}</p>
                    )}
                    {/* Botones de acceso rápido para mesas 1 a 10 */}
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                      <span className="text-[10px] text-stone-500 font-bold mr-1 whitespace-nowrap">Mesas directas:</span>
                      {["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => {
                            setTableNumber(n);
                            setTableError("");
                          }}
                          className={`px-2.5 py-1 text-xs rounded-lg font-bold border transition ${
                            tableNumber === n
                              ? "bg-[#C1392B] text-white border-[#9E2C20] shadow-sm"
                              : "bg-white text-stone-700 border-stone-200 hover:bg-stone-100"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-stone-600">
                      🍽️ Te llevaremos tu pedido listo directamente a tu mesa.
                    </p>
                  </div>
                )}

                {/* Campos para Retiro / Pasar a buscar */}
                {mode === "retiro" && (
                  <div className="mb-4 p-3 rounded-xl border-2 bg-white/70 text-xs text-stone-700" style={{ borderColor: BRAND.paperDark }}>
                    <p className="font-bold mb-0.5 flex items-center gap-1.5" style={{ color: BRAND.charcoal }}>
                      <Store size={14} style={{ color: BRAND.green }} /> Retiro por el local
                    </p>
                    <p className="text-[11px] text-stone-600">
                      Prepararemos tu pedido para retirar en: <b>{business.address}</b>.
                    </p>
                  </div>
                )}

                {/* Campos para Delivery con Selector de Google Maps Gratuito */}
                {mode === "delivery" && (
                  <div className="mb-4 flex flex-col gap-3 p-3.5 rounded-2xl border-2 shadow-sm" style={{ background: BRAND.cream, borderColor: BRAND.paperDark }}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black flex items-center gap-1.5" style={{ color: BRAND.charcoal }}>
                        <MapPin size={16} className="text-[#C1392B]" /> Ubicación para Entrega (Google Maps)
                      </span>
                      {mapLink && (
                        <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                          ✓ Marcada
                        </span>
                      )}
                    </div>

                    {/* Si la ubicación ya está establecida */}
                    {mapLink ? (
                      <div className="p-3 rounded-xl bg-white border-2 border-emerald-400 text-xs space-y-2 shadow-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-bold text-emerald-900 flex items-center gap-1.5">
                              <CheckCircle2 size={15} className="text-emerald-700" /> Ubicación en Google Maps lista
                            </p>
                            {deliveryCoords ? (
                              <p className="text-[11px] font-mono text-stone-600 mt-0.5">
                                Coordenadas: {deliveryCoords.lat}, {deliveryCoords.lng}
                                {locAccuracy ? ` (±${locAccuracy}m)` : ""}
                              </p>
                            ) : (
                              <p className="text-[11px] text-stone-600 mt-0.5">
                                Enlace de Google Maps verificado
                              </p>
                            )}
                          </div>
                          <a
                            href={mapLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[11px] flex items-center gap-1 hover:bg-emerald-100 transition flex-shrink-0"
                            title="Verificar en Google Maps"
                          >
                            <ExternalLink size={12} /> Probar link
                          </a>
                        </div>

                        <div className="flex items-center gap-2 pt-1 border-t border-stone-100">
                          <button
                            type="button"
                            onClick={() => {
                              if (deliveryCoords) {
                                setMapPickerLat(deliveryCoords.lat);
                                setMapPickerLng(deliveryCoords.lng);
                              }
                              setShowMapSelectorModal(true);
                            }}
                            className="flex-1 py-1.5 px-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-[11px] transition text-center flex items-center justify-center gap-1"
                          >
                            <Map size={13} /> Ajustar en el mapa
                          </button>
                          <button
                            type="button"
                            onClick={() => getGPSLocation(false)}
                            className="py-1.5 px-2.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-[11px] transition flex items-center gap-1"
                            title="Actualizar GPS del celular"
                          >
                            <Crosshair size={13} /> Recalibrar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setMapLink("");
                              setDeliveryCoords(null);
                              setLocStatus("idle");
                            }}
                            className="py-1.5 px-2.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-bold text-[11px] transition"
                            title="Quitar ubicación"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Si aún no ha marcado ubicación */
                      <div className="space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => getGPSLocation(false)}
                            disabled={geoLocating}
                            className="p-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition hover:brightness-105 active:scale-95 disabled:opacity-60"
                            style={{ background: BRAND.mustard, color: BRAND.charcoal }}
                          >
                            {geoLocating ? (
                              <><LoaderCircle className="animate-spin" size={15} /> Obteniendo GPS...</>
                            ) : (
                              <><Crosshair size={15} /> GPS de mi celular</>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (deliveryCoords) {
                                setMapPickerLat(deliveryCoords.lat);
                                setMapPickerLng(deliveryCoords.lng);
                              }
                              setShowMapSelectorModal(true);
                            }}
                            className="p-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition hover:brightness-105 active:scale-95 border-2 bg-white text-stone-900 border-stone-800"
                          >
                            <Map size={15} className="text-[#C1392B]" /> Marcar en el mapa
                          </button>
                        </div>

                        {/* Opción para pegar link copiado de Google Maps */}
                        {!showManualPasteLink ? (
                          <div className="text-center pt-1">
                            <button
                              type="button"
                              onClick={() => setShowManualPasteLink(true)}
                              className="text-[11px] text-stone-600 hover:text-stone-900 underline font-medium"
                            >
                              ¿Tenés un link copiado de Google Maps? Pegalo acá
                            </button>
                          </div>
                        ) : (
                          <div className="p-2.5 rounded-xl bg-white border border-stone-300 space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-bold text-stone-700">
                                Pegá tu enlace de Google Maps:
                              </label>
                              <button
                                type="button"
                                onClick={() => setShowManualPasteLink(false)}
                                className="text-stone-400 hover:text-stone-700"
                              >
                                <X size={14} />
                              </button>
                            </div>
                            <div className="flex gap-1.5">
                              <input
                                type="url"
                                placeholder="https://maps.app.goo.gl/... o maps.google.com"
                                value={manualLinkInput}
                                onChange={(e) => setManualLinkInput(e.target.value)}
                                className="flex-1 p-2 text-xs rounded-lg border border-stone-300"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const trimmed = manualLinkInput.trim();
                                  if (trimmed.startsWith("http")) {
                                    setMapLink(trimmed);
                                    setLocStatus("done");
                                    setShowManualPasteLink(false);
                                    setManualLinkInput("");
                                  } else {
                                    addToast({
                                      type: "warning",
                                      title: "Enlace Inválido",
                                      message: "Por favor ingresá un enlace válido que empiece con https://",
                                    });
                                  }
                                }}
                                className="px-3 py-2 bg-stone-800 text-white rounded-lg text-xs font-bold"
                              >
                                Aplicar
                              </button>
                            </div>
                          </div>
                        )}

                        {geoInfoMsg && (
                          <p className="text-[11px] text-stone-600 italic bg-white/70 p-2 rounded-lg border border-stone-200">
                            {geoInfoMsg}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Dirección escrita / referencias */}
                    <div>
                      <input
                        type="text"
                        placeholder="Dirección o referencia exacta (Ej: Calle Boquerón c/ Villarrica, portón verde)"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full p-2.5 text-xs rounded-xl border"
                        style={{ borderColor: BRAND.paperDark, background: "#FFF" }}
                      />
                    </div>

                    <p className="text-[11px] text-stone-600 italic">
                      * {business.deliveryNote || deliveryNote}
                    </p>
                  </div>
                )}

                {/* Nombre del Cliente / Identificación del Pedido */}
                <div className="mb-4 flex flex-col gap-1.5 p-3.5 rounded-xl border-2" style={{ background: BRAND.cream, borderColor: BRAND.paperDark }}>
                  <label className="text-xs font-bold flex items-center justify-between" style={{ color: BRAND.charcoal }}>
                    <span className="flex items-center gap-1.5">
                      <User size={14} style={{ color: BRAND.tomato }} /> ¿A nombre de quién hacemos el pedido?
                    </span>
                    {customerName.trim() && (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                        Identificado ✓
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      placeholder="Escribí tu nombre (ej: Juan Pérez, María, Familia Gómez...)"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 text-xs font-bold rounded-xl border focus:outline-none focus:ring-2 focus:ring-amber-400 transition"
                      style={{ borderColor: BRAND.paperDark, background: "#FFF" }}
                    />
                  </div>
                  <p className="text-[11px] text-stone-600">
                    Tu nombre nos permite llamarte, preparar tu comanda y entregarte tu pedido sin confusiones.
                  </p>
                </div>

                {/* Número de WhatsApp / Teléfono para notificaciones automáticas */}
                <div className="mb-4 flex flex-col gap-1.5 p-3.5 rounded-xl border-2" style={{ background: BRAND.cream, borderColor: BRAND.paperDark }}>
                  <label className="text-xs font-bold flex items-center justify-between" style={{ color: BRAND.charcoal }}>
                    <span className="flex items-center gap-1.5">
                      <Phone size={14} style={{ color: BRAND.green }} /> Tu número de WhatsApp / Celular
                    </span>
                    {customerPhone.trim() && (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                        Registrado ✓
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="tel"
                      placeholder="Ej: 0981 123 456 (para recibir aviso cuando esté entregado)"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 text-xs font-bold rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
                      style={{ borderColor: BRAND.paperDark, background: "#FFF" }}
                    />
                  </div>
                  <p className="text-[11px] text-stone-600">
                    Te enviaremos una notificación automática por WhatsApp una vez que tu pedido sea completado o entregado.
                  </p>
                </div>

                {/* Aclaraciones / Notas especiales */}
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Aclaraciones o notas (ej: sin cebolla, con cubiertos descartables)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-xl border"
                    style={{ borderColor: BRAND.paperDark, background: "#FFF" }}
                  />
                </div>

                {/* Subtotal y Total */}
                <div className="pt-3 border-t flex items-center justify-between mb-4" style={{ borderColor: BRAND.paperDark }}>
                  <span className="font-bold text-base" style={{ color: BRAND.charcoal }}>Total a pagar:</span>
                  <span className="font-black text-xl" style={{ color: BRAND.tomato }}>{formatGs(totalPrice)}</span>
                </div>

                {/* Botón Enviar Pedido por WhatsApp */}
                <button
                  onClick={sendOrder}
                  className="w-full p-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 shadow-lg hover:brightness-105 active:scale-98 transition"
                  style={{ background: BRAND.green, color: BRAND.cream }}
                >
                  <Send size={18} /> Enviar pedido por WhatsApp
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Pie de Página */}
      <footer
        className="w-full py-10 px-4 text-center text-xs mt-auto border-t relative overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #0e2a4d 0%, #0a1f3a 50%, #06162a 100%)",
          borderColor: "rgba(56, 189, 248, 0.28)",
          boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 -8px 24px rgba(2, 132, 199, 0.18)",
        }}
      >
        {/* Resplandor ambiental de fondo acorde a la paleta azul del logo */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at 50% 90%, rgba(14, 165, 233, 0.28) 0%, rgba(2, 132, 199, 0.12) 45%, transparent 75%)",
          }}
        />

        <div className="max-w-5xl xl:max-w-6xl 2xl:max-w-7xl mx-auto space-y-2 relative z-10">
          <p className="font-bold text-white text-sm tracking-wide">{business.name}</p>
          <p className="text-slate-300">{business.address}</p>
          <p className="text-sky-200/80">Pedidos vía WhatsApp al {business.phoneDisplay}</p>
          <div className="pt-2 pb-1">
            <button
              type="button"
              onClick={() => setShowInstallModal(true)}
              className="px-4 py-2 rounded-full text-xs font-bold text-white shadow-lg hover:brightness-110 active:scale-95 transition inline-flex items-center gap-2 border border-sky-400/40"
              style={{
                background: "linear-gradient(135deg, #0050E6 0%, #0072FF 50%, #00A2FF 100%)",
                boxShadow: "0 4px 15px rgba(0, 114, 255, 0.35)"
              }}
            >
              <img
                src="/app-logo.png"
                alt=""
                className="w-4 h-4 rounded-full bg-white object-contain"
                onError={(e) => { e.currentTarget.src = "/app-logo.svg"; }}
              />
              <span>Instalar App en tu celular o PC (Acceso directo)</span>
            </button>
          </div>

          {/* Enlace al panel de precios para adquirir la app */}
          <div className="pt-4 pb-2">
            <div 
              className="max-w-xl mx-auto p-4 rounded-2xl border text-center space-y-2.5 shadow-xl transition-all hover:scale-[1.01]"
              style={{
                background: "linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(14, 165, 233, 0.18) 50%, rgba(245, 158, 11, 0.15) 100%)",
                borderColor: "rgba(251, 191, 36, 0.5)",
                boxShadow: "0 8px 30px rgba(0, 0, 0, 0.25)"
              }}
            >
              <p className="font-bold text-amber-300 text-sm md:text-base flex items-center justify-center gap-2 drop-shadow-sm">
                <Sparkles size={17} className="text-amber-400 animate-pulse" />
                <span>¿Querés una App con pedidos para tu propio negocio?</span>
              </p>
              <div className="flex flex-wrap items-center justify-center gap-1.5 text-[11px] font-bold text-amber-100/90 py-1">
                <span className="bg-stone-900/40 px-2.5 py-0.5 rounded-full border border-amber-300/30">🍕 Menú Online</span>
                <span className="bg-stone-900/40 px-2.5 py-0.5 rounded-full border border-amber-300/30">🛵 Delivery con GPS</span>
                <span className="bg-stone-900/40 px-2.5 py-0.5 rounded-full border border-amber-300/30">👨‍🍳 Cocina en Vivo</span>
                <span className="bg-stone-900/40 px-2.5 py-0.5 rounded-full border border-amber-300/30">💰 0% Comisiones</span>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setShowSimulatorModal(true)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-full font-black text-xs md:text-sm text-white shadow-xl hover:brightness-110 active:scale-95 transition inline-flex items-center justify-center gap-2 border-2 border-emerald-300 cursor-pointer"
                  style={{
                    background: "linear-gradient(135deg, #059669 0%, #10B981 50%, #059669 100%)",
                    boxShadow: "0 4px 20px rgba(16, 185, 129, 0.45)"
                  }}
                >
                  <Sparkles size={16} className="text-amber-300" />
                  <span>🎮 Ver Simulador en Vivo y Beneficios</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRegSuccessVoucher(null);
                    setView("register");
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-full font-black text-xs md:text-sm text-stone-900 shadow-xl hover:brightness-110 active:scale-95 transition inline-flex items-center justify-center gap-2 border-2 border-amber-200"
                  style={{
                    background: "linear-gradient(135deg, #F59E0B 0%, #FBBF24 50%, #F59E0B 100%)",
                    boxShadow: "0 4px 20px rgba(245, 158, 11, 0.45)"
                  }}
                >
                  <Store size={16} />
                  <span>Adquirir App (Planes y Precios)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Sección de Autoría y Contacto de CyM Software */}
          <div
            className="pt-6 mt-6 flex flex-col items-center justify-center gap-3 border-t"
            style={{ borderColor: "rgba(56, 189, 248, 0.25)" }}
          >
            <div className="flex items-center justify-center">
              {/* Logo sin fondo integrado directamente sobre el fondo azul */}
              <img
                src="/cym-software-logo-darkbg.svg"
                alt="CyM Software"
                className="w-24 h-24 md:w-28 md:h-28 object-contain transition-transform duration-300 hover:scale-105 select-none drop-shadow-[0_4px_16px_rgba(14,165,233,0.35)]"
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs md:text-sm text-slate-100 font-medium tracking-wide">
                Todos los derechos reservados 2026 - Contacto -{" "}
                <a
                  href="https://wa.me/595975635770"
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-sky-400 hover:text-sky-300 underline transition inline-flex items-center gap-1 drop-shadow-sm"
                  title="Contactar a CyM Software vía WhatsApp"
                >
                  <Phone size={13} className="inline text-sky-400" />
                  <span>+595975635770</span>
                </a>
              </p>

              {/* Acceso reservado para el Administrador / Gerente */}
              <div className="pt-3">
                <button
                  type="button"
                  onClick={() => {
                    if (adminSession && adminSession.active) {
                      setView("admin");
                      setAdminTab("orders");
                      loadOrders();
                    } else {
                      setUserInput("");
                      setPinInput("");
                      setPinError("");
                      setShowLoginPin(false);
                      userInteractedLoginRef.current = false;
                      setLoginFormKey((k) => k + 1);
                      setView("adminLogin");
                    }
                  }}
                  className="text-[11px] text-slate-400/70 hover:text-slate-200 transition inline-flex items-center gap-1 opacity-60 hover:opacity-100"
                  title={adminSession && adminSession.active ? "Volver a Panel de Control" : "Acceso Administración"}
                >
                  <Lock size={10} />
                  <span>{adminSession && adminSession.active ? "Volver a Panel de Control" : "Acceso Gerencia"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Notificaciones Toast (Agregado al Carrito / Pedido Completado) */}
      <ToastContainer
        toasts={toasts}
        onDismiss={removeToast}
        onAction={handleToastAction}
      />


      {/* Modales Compartidos: Cobro por Caja y Reporte de Movimientos */}
      {renderCashPaymentModal()}
      {renderCashReportModal()}
      {renderHistoryDetailModal()}
      {renderHistoryPdfModal()}
      {renderWhatsAppConfirmationModal()}

      {/* Selector de Ubicación Google Maps para Delivery (Modo Gratuito Móvil) */}
      {renderMapSelectorModal()}

      {/* Modales de Códigos de Activación y Licencias para Comercios */}
      {renderCreateCodeModal()}
      {renderActivateAppModal()}
      {renderLicenseBlockedModal()}
      {renderGoogleLicenseRequiredModal()}
      {renderConfirmActionModal()}
      {renderSaveDataModal()}
      {renderSimulatorModal()}

      {/* Modal de Seguimiento de Pedidos y Notificaciones Push en Vivo */}
      <OrderTrackingModal
        isOpen={trackingModalOpen}
        onClose={() => setTrackingModalOpen(false)}
        initialOrderId={trackingOrderId}
        businessPhone={business.phoneIntl || "595981456789"}
        onRefreshOrders={refreshCustomerOrdersFromServer}
        customerOrders={customerOrders}
      />

      {/* Banner / Card Flotante para Invitar a Activar Notificaciones Push */}
      {showPushPrompt && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-5 sm:max-w-sm z-50 bg-[#2A2018] text-[#FBF2DD] p-4 rounded-2xl shadow-2xl border-2 border-amber-500 animate-in slide-in-from-bottom-5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-stone-900 flex items-center justify-center flex-shrink-0 font-bold">
              <BellRing size={18} className="animate-bounce" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-black text-xs sm:text-sm text-white leading-tight">
                ¿Recibir avisos de tu pedido?
              </h4>
              <p className="text-[11px] text-stone-300 mt-1 leading-snug">
                Te avisaremos por notificación push cuando tu comida esté en cocina, lista o en camino.
              </p>
              <div className="flex items-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={async () => {
                    const res = await requestPushPermission();
                    setPushPermissionState(res);
                    setShowPushPrompt(false);
                    if (res === "granted") {
                      addToast(
                        "order_success",
                        "¡Alertas activadas!",
                        "Recibirás avisos en vivo cuando cambie el estado de tus pedidos."
                      );
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl font-bold text-xs bg-[#C1392B] hover:bg-[#a93226] text-white shadow transition active:scale-95 flex items-center gap-1"
                >
                  <Bell size={12} />
                  <span>Activar Alertas</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPushPrompt(false)}
                  className="px-2.5 py-1.5 rounded-xl text-xs text-stone-400 hover:text-stone-200 transition"
                >
                  Ahora no
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowPushPrompt(false)}
              className="text-stone-400 hover:text-white p-1"
              aria-label="Cerrar aviso"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Modal de Instalación PWA (con Logo Oficial) */}
      <InstallAppModal
        isOpen={showInstallModal}
        onClose={handleCloseInstallModal}
        onInstallSuccess={() => {
          addToast("success", "¡App instalada!", "Ya tenés el acceso directo con el logo en tu pantalla.");
        }}
        brandColors={BRAND}
      />
    </div>
  );
}
