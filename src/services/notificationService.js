// src/services/notificationService.js
// Servicio de notificaciones Push, alertas sonoras y seguimiento asíncrono de pedidos

// Definición exhaustiva del ciclo de vida de los estados del pedido
export const ORDER_STATUS_CONFIG = {
  recibido: {
    id: "recibido",
    label: "Recibido / En Cola",
    shortLabel: "Recibido",
    description: "Tu pedido fue recibido en caja y aguarda su turno de cocina.",
    pushTitle: "📥 ¡Pedido Recibido con Éxito!",
    pushBody: (orderId, mode) =>
      `Pedido ${orderId}: Tu solicitud fue registrada y ya se encuentra en cola de preparación.`,
    color: "#D97706", // Amber 600
    badgeBg: "bg-amber-100 text-amber-900 border-amber-300",
    stepIndex: 0,
    soundFreqs: [440, 554, 659], // A4, C#5, E5 (Acorde Mayor brillante)
  },
  en_preparacion: {
    id: "en_preparacion",
    label: "En Preparación / Cocina",
    shortLabel: "En Cocina",
    description: "Nuestros cocineros están preparando tu pedido con ingredientes frescos.",
    pushTitle: "🍳 ¡Tu pedido está en la cocina!",
    pushBody: (orderId, mode) =>
      `Pedido ${orderId}: ¡Manos a la obra! Se está preparando tu comida con sabor casero.`,
    color: "#EA580C", // Orange 600
    badgeBg: "bg-orange-100 text-orange-900 border-orange-300",
    stepIndex: 1,
    soundFreqs: [523, 659, 784], // C5, E5, G5
  },
  en_camino: {
    id: "en_camino",
    label: "En Camino (Delivery) / Listo para Retiro",
    shortLabel: "En Camino / Listo",
    description: "El delivery va en viaje a tu domicilio o tu pedido está listo en mostrador.",
    pushTitle: (mode) =>
      mode === "delivery" ? "🛵 ¡Tu pedido va en camino!" : "🥡 ¡Tu pedido está listo para retirar!",
    pushBody: (orderId, mode) =>
      mode === "delivery"
        ? `Pedido ${orderId}: El repartidor salió con tu entrega. ¡Tené listo el pago o recibilo pronto!`
        : `Pedido ${orderId}: Ya podés pasar a retirar tu pedido caliente por el mostrador.`,
    color: "#2563EB", // Blue 600
    badgeBg: "bg-blue-100 text-blue-900 border-blue-300",
    stepIndex: 2,
    soundFreqs: [587, 740, 880], // D5, F#5, A5
  },
  completado: {
    id: "completado",
    label: "Entregado / Completado",
    shortLabel: "Entregado",
    description: "Pedido entregado y cobrado. ¡Muchas gracias por elegirnos!",
    pushTitle: "✅ ¡Pedido Entregado! ¡Buen provecho!",
    pushBody: (orderId, mode) =>
      `Pedido ${orderId}: ¡Tu pedido fue entregado con éxito! Que disfrutes de la comida.`,
    color: "#059669", // Emerald 600
    badgeBg: "bg-emerald-100 text-emerald-900 border-emerald-300",
    stepIndex: 3,
    soundFreqs: [523, 659, 784, 1046], // C5, E5, G5, C6 (Fanfarria alegre)
  },
  cancelado: {
    id: "cancelado",
    label: "Cancelado / Anulado",
    shortLabel: "Cancelado",
    description: "Este pedido fue cancelado. Por favor comunicate con el local si tenés dudas.",
    pushTitle: "⚠️ Pedido Cancelado",
    pushBody: (orderId, mode) =>
      `Pedido ${orderId}: Tu pedido fue cancelado. Contactanos por WhatsApp ante cualquier consulta.`,
    color: "#DC2626", // Red 600
    badgeBg: "bg-red-100 text-red-900 border-red-300",
    stepIndex: -1,
    soundFreqs: [440, 370, 311], // Descenso
  },
};

// Canal Broadcast para sincronizar pestañas en tiempo real
let syncChannel = null;
try {
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    syncChannel = new BroadcastChannel("lacaserita_order_sync");
  }
} catch (e) {
  syncChannel = null;
}

export function getSyncChannel() {
  return syncChannel;
}

// Comprueba compatibilidad de notificaciones en el navegador
export function isPushNotificationSupported() {
  if (typeof window === "undefined") return false;
  return "Notification" in window;
}

// Obtiene el estado actual de los permisos del navegador
export function getNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

// Solicita permiso al usuario para recibir notificaciones Push
export async function requestPushPermission() {
  if (!isPushNotificationSupported()) {
    return "unsupported";
  }
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      localStorage.setItem("lacaserita_push_enabled", "true");
      // Reproducir sonido suave de bienvenida
      playOrderChime([523, 659, 784]);
    } else if (permission === "denied") {
      localStorage.setItem("lacaserita_push_enabled", "false");
    }
    return permission;
  } catch (err) {
    console.warn("[PushNotifications] Error al solicitar permiso:", err);
    return "denied";
  }
}

// Reproduce campanada melódica suave sintetizada con Web Audio API (100% libre de assets externos)
export function playOrderChime(frequencies = [523, 659, 784]) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    frequencies.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0, now + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.55);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.6);
    });
  } catch (err) {
    // Silencioso en caso de no interacción previa del usuario
  }
}

// Envía notificación Push nativa mediante el Service Worker registrado
export async function dispatchNativePushNotification({
  title,
  body,
  orderId,
  status,
  vibrate = [200, 100, 200],
}) {
  // 1. Reproducir campana sonora
  const config = ORDER_STATUS_CONFIG[status] || ORDER_STATUS_CONFIG.recibido;
  playOrderChime(config.soundFreqs);

  // 2. Vibración del dispositivo
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(vibrate);
    } catch (e) {}
  }

  // 3. Comprobar permisos
  if (getNotificationPermission() !== "granted") {
    return false;
  }

  const notificationOptions = {
    body,
    icon: "/app-logo-192.png",
    badge: "/favicon-32.png",
    vibrate,
    tag: orderId ? `order-${orderId}` : "caserita-order-notification",
    renotify: true,
    data: {
      orderId,
      status,
      url: "/",
      timestamp: Date.now(),
    },
    actions: [
      { action: "track_order", title: "Ver Estado" },
      { action: "close_order", title: "Cerrar" },
    ],
  };

  // Intentar mostrar mediante Service Worker (requerido en móviles y PWA)
  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(title, notificationOptions);
        return true;
      }
    }
  } catch (swErr) {
    console.warn("[PushNotifications] ServiceWorker notification error, intentando constructor nativo:", swErr);
  }

  // Fallback con Notification constructor estándar
  try {
    new Notification(title, notificationOptions);
    return true;
  } catch (nativeErr) {
    console.warn("[PushNotifications] Fallback nativo no disponible en este contexto:", nativeErr);
    return false;
  }
}

// ===================================================================
// GESTIÓN DE PEDIDOS DEL CLIENTE EN LOCALSTORAGE
// ===================================================================

const CUSTOMER_ORDERS_KEY = "lacaserita_customer_orders";

// Obtiene los pedidos realizados por el usuario en este dispositivo
export function getCustomerOrders() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOMER_ORDERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

// Guarda o actualiza un pedido en el registro del cliente
export function saveCustomerOrder(order) {
  if (typeof window === "undefined" || !order || !order.id) return;
  try {
    const list = getCustomerOrders();
    const existingIdx = list.findIndex((o) => o.id === order.id);
    const orderData = {
      id: order.id,
      mode: order.mode || "mesa",
      tableNumber: order.tableNumber || "",
      customerName: order.customerName || "",
      customerPhone: order.customerPhone || "",
      address: order.address || "",
      notes: order.notes || "",
      items: order.items || [],
      totalItems: order.totalItems || 0,
      totalPrice: order.totalPrice || 0,
      orderStatus: order.orderStatus || (order.paymentStatus === "pagado" ? "completado" : "recibido"),
      paymentStatus: order.paymentStatus || "pendiente",
      paymentMethod: order.paymentMethod || "",
      createdAt: order.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastNotifiedStatus: order.lastNotifiedStatus || order.orderStatus || "recibido",
    };

    if (existingIdx >= 0) {
      list[existingIdx] = { ...list[existingIdx], ...orderData };
    } else {
      list.unshift(orderData);
    }

    localStorage.setItem(CUSTOMER_ORDERS_KEY, JSON.stringify(list.slice(0, 30)));
    return orderData;
  } catch (e) {
    console.warn("[PushNotifications] Error al guardar pedido del cliente:", e);
  }
}

// Actualiza el estado de un pedido del cliente y dispara notificación si cambió
export function updateCustomerOrderStatus(orderId, newStatus, paymentStatus = null, remoteOrder = null) {
  if (typeof window === "undefined") return null;
  try {
    const list = getCustomerOrders();
    let targetIdx = -1;

    // 1. Búsqueda exacta por ID
    if (orderId) {
      targetIdx = list.findIndex((o) => o.id === orderId);
    }

    // 2. Si viene remoteOrder y tiene matchedRequestedId
    if (targetIdx === -1 && remoteOrder?.matchedRequestedId) {
      targetIdx = list.findIndex((o) => o.id === remoteOrder.matchedRequestedId);
    }

    // 3. Coincidencia por subcadena de ID (ej: PED-1577 vs PED-228778 o variaciones numéricas)
    if (targetIdx === -1 && orderId) {
      const cleanTarget = String(orderId).replace(/^PED-/, "");
      targetIdx = list.findIndex((o) => {
        const cleanO = String(o.id || "").replace(/^PED-/, "");
        return cleanTarget && cleanO && (cleanTarget.startsWith(cleanO.slice(0, 4)) || cleanO.startsWith(cleanTarget.slice(0, 4)));
      });
    }

    // 4. Si no se encontró por ID, buscar coincidencia por cliente y mesa/modo
    if (targetIdx === -1 && remoteOrder) {
      targetIdx = list.findIndex((o) => {
        const nameA = String(o.customerName || "").trim().toLowerCase();
        const nameB = String(remoteOrder.customerName || "").trim().toLowerCase();
        const sameCustomer = nameA && nameB && (nameA === nameB || nameA.includes(nameB) || nameB.includes(nameA));
        const sameTable = (!o.tableNumber && !remoteOrder.tableNumber) || (String(o.tableNumber || "").trim() === String(remoteOrder.tableNumber || "").trim());
        const sameMode = !o.mode || !remoteOrder.mode || o.mode === remoteOrder.mode;
        return sameCustomer && sameTable && sameMode;
      });
    }

    if (targetIdx === -1) return null;

    const currentOrder = list[targetIdx];
    const prevStatus = currentOrder.orderStatus;
    const prevNotified = currentOrder.lastNotifiedStatus;
    const oldId = currentOrder.id;

    // Asignar el ID unificado del backend si correspondía a un reemplazo
    const finalId = orderId || remoteOrder?.id || currentOrder.id;
    const normalizedStatus = newStatus || remoteOrder?.orderStatus || currentOrder.orderStatus;

    const updated = {
      ...currentOrder,
      id: finalId,
      orderStatus: normalizedStatus,
      paymentStatus: paymentStatus || remoteOrder?.paymentStatus || currentOrder.paymentStatus,
      deliveryStatus: remoteOrder?.deliveryStatus || (normalizedStatus === "en_camino" ? "en_camino" : currentOrder.deliveryStatus),
      updatedAt: new Date().toISOString(),
    };

    if (remoteOrder?.items && Array.isArray(remoteOrder.items) && remoteOrder.items.length > 0) {
      updated.items = remoteOrder.items;
      updated.totalPrice = remoteOrder.totalPrice || updated.totalPrice;
      updated.totalItems = remoteOrder.totalItems || updated.totalItems;
    }

    let didChange = false;
    if (normalizedStatus !== prevStatus || normalizedStatus !== prevNotified) {
      didChange = true;
      updated.lastNotifiedStatus = normalizedStatus;

      // Disparar Notificación Push
      const cfg = ORDER_STATUS_CONFIG[normalizedStatus] || ORDER_STATUS_CONFIG.recibido;
      const title = typeof cfg.pushTitle === "function" ? cfg.pushTitle(updated.mode) : cfg.pushTitle;
      const body = typeof cfg.pushBody === "function" ? cfg.pushBody(finalId, updated.mode) : cfg.pushBody;

      dispatchNativePushNotification({
        title,
        body,
        orderId: finalId,
        status: normalizedStatus,
      });
    }

    list[targetIdx] = updated;
    localStorage.setItem(CUSTOMER_ORDERS_KEY, JSON.stringify(list));

    return { order: updated, didChange, oldId, newId: finalId };
  } catch (e) {
    console.warn("[PushNotifications] Error actualizando estado de pedido:", e);
    return null;
  }
}

// Dispara una notificación de prueba para que el usuario verifique la experiencia en su dispositivo
export async function sendTestPushNotification() {
  const perm = await requestPushPermission();
  if (perm !== "granted") {
    return { ok: false, error: "Permiso denegado por el navegador" };
  }

  const success = await dispatchNativePushNotification({
    title: "🔔 ¡Notificaciones Push de La Caserita Activas!",
    body: "¡Excelente! Recibirás alertas instantáneas cuando tu comida esté en cocina, en camino o lista para entrega.",
    orderId: "TEST",
    status: "en_preparacion",
  });

  return { ok: success };
}
