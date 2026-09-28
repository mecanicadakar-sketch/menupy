import React, { useState, useEffect } from "react";
import {
  Bell,
  BellRing,
  Clock,
  CheckCircle2,
  ChefHat,
  Bike,
  ShoppingBag,
  Utensils,
  ChevronRight,
  X,
  MessageCircle,
  ExternalLink,
  Volume2,
  RefreshCw,
  AlertTriangle,
  Info
} from "lucide-react";
import {
  ORDER_STATUS_CONFIG,
  getNotificationPermission,
  requestPushPermission,
  sendTestPushNotification,
  getCustomerOrders,
  getSyncChannel
} from "../services/notificationService";

export const OrderTrackingModal = ({
  isOpen,
  onClose,
  initialOrderId = null,
  businessPhone = "595981456789",
  onRefreshOrders = null,
  customerOrders = null
}) => {
  const [orders, setOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [permissionState, setPermissionState] = useState(getNotificationPermission());
  const [testingNotification, setTestingNotification] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Cargar pedidos del cliente
  const loadOrders = () => {
    const list = (customerOrders && customerOrders.length > 0) ? customerOrders : getCustomerOrders();
    setOrders(list);
    if (list.length > 0) {
      if (selectedOrderId && list.some((o) => o.id === selectedOrderId)) {
        // Mantener selección actual
      } else if (initialOrderId && list.some((o) => o.id === initialOrderId)) {
        setSelectedOrderId(initialOrderId);
      } else {
        const active = list.find((o) => o.orderStatus !== "completado" && o.orderStatus !== "cancelado");
        setSelectedOrderId(active ? active.id : list[0].id);
      }
    }
  };

  // Reaccionar a cambios en customerOrders recibido como prop
  useEffect(() => {
    if (isOpen && customerOrders) {
      loadOrders();
    }
  }, [customerOrders, isOpen]);

  useEffect(() => {
    if (isOpen) {
      loadOrders();
      setPermissionState(getNotificationPermission());
      setTestResult(null);

      if (onRefreshOrders) {
        onRefreshOrders();
      }

      // Auto-refresco en vivo cada 3.5 segundos mientras el cliente tiene el modal abierto
      const interval = setInterval(() => {
        if (onRefreshOrders) {
          onRefreshOrders();
        }
        loadOrders();
      }, 3500);

      // Escuchar eventos de sincronización en tiempo real por BroadcastChannel
      const ch = getSyncChannel();
      const handleSync = (ev) => {
        if (ev.data && (ev.data.type === "ORDER_STATUS_UPDATED" || ev.data.type === "ORDER_CREATED")) {
          loadOrders();
        }
      };
      if (ch) {
        ch.addEventListener("message", handleSync);
      }

      return () => {
        clearInterval(interval);
        if (ch) ch.removeEventListener("message", handleSync);
      };
    }
  }, [isOpen, initialOrderId]);

  if (!isOpen) return null;

  const currentOrder = orders.find((o) => o.id === selectedOrderId) || orders[0];
  const currentStatusKey = currentOrder?.orderStatus || (currentOrder?.paymentStatus === "pagado" ? "completado" : "recibido");
  const currentStatusConfig = ORDER_STATUS_CONFIG[currentStatusKey] || ORDER_STATUS_CONFIG.recibido;

  // Pasos de progreso
  const steps = [
    { key: "recibido", label: "Recibido", icon: Clock, desc: "En cola" },
    { key: "en_preparacion", label: "En Cocina", icon: ChefHat, desc: "Preparando" },
    {
      key: "en_camino",
      label: currentOrder?.mode === "delivery" ? "En Camino" : "Listo",
      icon: currentOrder?.mode === "delivery" ? Bike : ShoppingBag,
      desc: currentOrder?.mode === "delivery" ? "Cadete en viaje" : "Para retirar"
    },
    { key: "completado", label: "Entregado", icon: CheckCircle2, desc: "Completado" }
  ];

  const currentStepIdx = currentStatusConfig.stepIndex >= 0 ? currentStatusConfig.stepIndex : 0;
  const isCanceled = currentStatusKey === "cancelado";

  const handleRequestPermission = async () => {
    const perm = await requestPushPermission();
    setPermissionState(perm);
    if (perm === "granted") {
      setTestResult({
        type: "success",
        text: "¡Notificaciones Push activadas con éxito! Recibirás avisos automáticos."
      });
    } else {
      setTestResult({
        type: "error",
        text: "No se pudieron activar las notificaciones. Verificá los permisos de tu navegador."
      });
    }
  };

  const handleTestNotification = async () => {
    setTestingNotification(true);
    setTestResult(null);
    try {
      const res = await sendTestPushNotification();
      if (res.ok) {
        setTestResult({
          type: "success",
          text: "¡Notificación de prueba enviada! Comprobá la barra de notificaciones de tu dispositivo."
        });
      } else {
        setTestResult({
          type: "error",
          text: "No se pudo emitir la notificación. Asegurate de otorgar permisos al navegador."
        });
      }
    } catch (e) {
      setTestResult({
        type: "error",
        text: "Ocurrió un error al enviar la prueba: " + (e.message || String(e))
      });
    } finally {
      setTestingNotification(false);
    }
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    if (onRefreshOrders) {
      await onRefreshOrders();
    }
    loadOrders();
    setTimeout(() => setRefreshing(false), 500);
  };

  const formatPrice = (val) => {
    return Number(val || 0).toLocaleString("es-PY") + " Gs.";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-sm animate-in fade-in">
      <div
        className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden bg-[#FBF2DD] text-[#2A2018] border-2 border-[#D7C49E]"
        style={{ fontFamily: "'Work Sans', sans-serif" }}
      >
        {/* Cabecera del Modal */}
        <div className="px-5 py-4 bg-[#2A2018] text-[#FBF2DD] flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#C1392B] flex items-center justify-center text-white shadow-inner">
              <BellRing size={20} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <span>Seguimiento de Pedidos</span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-600/30 text-emerald-300 border border-emerald-500/40">
                  En Vivo
                </span>
              </h3>
              <p className="text-xs text-stone-300">
                Notificaciones push y actualización de estado en tiempo real
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="p-2 rounded-xl text-stone-300 hover:text-white hover:bg-white/10 transition"
              title="Refrescar estado ahora"
            >
              <RefreshCw size={17} className={refreshing ? "animate-spin" : ""} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-stone-300 hover:text-white hover:bg-white/10 transition"
              aria-label="Cerrar modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Banner de Control de Notificaciones Push */}
        <div className="px-5 py-3.5 bg-amber-500/10 border-b border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-3 h-3 rounded-full flex-shrink-0 ${
                permissionState === "granted"
                  ? "bg-emerald-500 animate-pulse"
                  : permissionState === "denied"
                  ? "bg-red-500"
                  : "bg-amber-500 animate-ping"
              }`}
            />
            <div>
              <span className="text-xs font-black block">
                {permissionState === "granted"
                  ? "🔔 Notificaciones Push Activas en este Navegador"
                  : permissionState === "denied"
                  ? "⚠️ Notificaciones bloqueadas en el navegador"
                  : "🔔 Activá las alertas automáticas de tu pedido"}
              </span>
              <span className="text-[11px] text-stone-600">
                {permissionState === "granted"
                  ? "Recibirás avisos en tu pantalla cuando tu comida pase a cocina o salga en camino."
                  : permissionState === "denied"
                  ? "Habilitá los permisos desde el candado de la barra de direcciones para recibir alertas."
                  : "Te avisaremos con sonido y notificación cuando cambie el estado de tu pedido."}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
            {permissionState !== "granted" ? (
              <button
                type="button"
                onClick={handleRequestPermission}
                className="px-3.5 py-1.5 rounded-xl font-bold text-xs bg-[#C1392B] hover:bg-[#a93226] text-white shadow-sm transition active:scale-95 flex items-center gap-1.5"
              >
                <Bell size={13} />
                <span>Activar Alertas Push</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleTestNotification}
                disabled={testingNotification}
                className="px-3 py-1.5 rounded-xl font-bold text-xs bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm transition active:scale-95 flex items-center gap-1.5"
                title="Emitir sonido y notificación de prueba"
              >
                <Volume2 size={13} />
                <span>{testingNotification ? "Emitiendo..." : "Probar Notificación"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Mensaje de Feedback de Prueba */}
        {testResult && (
          <div
            className={`px-5 py-2.5 text-xs font-medium flex items-center gap-2 ${
              testResult.type === "success"
                ? "bg-emerald-100 text-emerald-900 border-b border-emerald-200"
                : "bg-red-100 text-red-900 border-b border-red-200"
            }`}
          >
            {testResult.type === "success" ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
            <span>{testResult.text}</span>
          </div>
        )}

        {/* Cuerpo del Modal */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {orders.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-stone-200 text-stone-500 flex items-center justify-center mx-auto mb-3">
                <ShoppingBag size={30} />
              </div>
              <h4 className="font-bold text-base text-stone-800 mb-1">
                Aún no realizaste pedidos en este dispositivo
              </h4>
              <p className="text-xs text-stone-500 max-w-sm mx-auto mb-4">
                Cuando hagas un pedido desde el menú principal, aparecerá aquí con seguimiento en vivo y notificaciones push automáticas.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl font-bold text-xs bg-[#C1392B] text-white hover:brightness-105 shadow transition"
              >
                Ver Menú y Hacer un Pedido
              </button>
            </div>
          ) : (
            <>
              {/* Selector de Pedidos si hay varios */}
              {orders.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  <span className="text-xs font-bold text-stone-500 flex-shrink-0">Tus Pedidos:</span>
                  {orders.map((ord) => {
                    const isSelected = ord.id === currentOrder?.id;
                    const st = ORDER_STATUS_CONFIG[ord.orderStatus] || ORDER_STATUS_CONFIG.recibido;
                    return (
                      <button
                        key={ord.id}
                        type="button"
                        onClick={() => setSelectedOrderId(ord.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 flex-shrink-0 border ${
                          isSelected
                            ? "bg-[#2A2018] text-[#FBF2DD] border-[#2A2018] shadow"
                            : "bg-white text-stone-700 border-stone-300 hover:bg-stone-100"
                        }`}
                      >
                        <span>{ord.id}</span>
                        <span className={`w-2 h-2 rounded-full ${isSelected ? "bg-amber-400" : "bg-stone-400"}`} />
                        <span className="text-[10px] opacity-80">{st.shortLabel}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Tarjeta del Pedido Actual */}
              {currentOrder && (
                <div className="rounded-2xl bg-white border-2 border-[#D7C49E] p-4 sm:p-5 shadow-sm space-y-4">
                  {/* Fila Principal: Código, Modalidad y Estado */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded-lg bg-stone-900 text-white">
                          {currentOrder.id}
                        </span>
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full border bg-stone-100 border-stone-300 text-stone-700 capitalize flex items-center gap-1">
                          {currentOrder.mode === "mesa" ? (
                            <Utensils size={12} />
                          ) : currentOrder.mode === "delivery" ? (
                            <Bike size={12} />
                          ) : (
                            <ShoppingBag size={12} />
                          )}
                          <span>
                            {currentOrder.mode === "mesa"
                              ? `Mesa ${currentOrder.tableNumber || ""}`
                              : currentOrder.mode === "delivery"
                              ? "Delivery"
                              : "Retiro"}
                          </span>
                        </span>
                        <span className="text-[11px] text-stone-500 font-medium">
                          {new Date(currentOrder.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit"
                          })} hs.
                        </span>
                      </div>
                      <h4 className="font-black text-stone-900 text-base">
                        {currentOrder.customerName || "Cliente"}
                      </h4>
                      {currentOrder.address && currentOrder.mode === "delivery" && (
                        <p className="text-xs text-stone-600 mt-0.5">
                          📍 {currentOrder.address}
                        </p>
                      )}
                    </div>

                    <div className="text-left sm:text-right">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border ${currentStatusConfig.badgeBg}`}>
                        <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                        <span>{currentStatusConfig.label}</span>
                      </span>
                      <span className="block text-[11px] text-stone-500 mt-1">
                        Total: <b className="text-stone-900 font-mono text-sm">{formatPrice(currentOrder.totalPrice)}</b>
                      </span>
                    </div>
                  </div>

                  {/* LÍNEA DE TIEMPO / BARRA DE PROGRESO DE ESTADO EN VIVO */}
                  {!isCanceled ? (
                    <div className="py-2">
                      <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block mb-3">
                        Progreso en Tiempo Real:
                      </span>
                      <div className="grid grid-cols-4 gap-1 sm:gap-2 relative">
                        {steps.map((st, idx) => {
                          const StepIcon = st.icon;
                          const isDone = currentStepIdx > idx;
                          const isCurrent = currentStepIdx === idx;
                          const isUpcoming = currentStepIdx < idx;

                          return (
                            <div key={st.key} className="flex flex-col items-center text-center relative z-10">
                              <div
                                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm ${
                                  isCurrent
                                    ? "bg-[#C1392B] text-white scale-110 ring-4 ring-red-200 animate-pulse font-black"
                                    : isDone
                                    ? "bg-emerald-600 text-white font-bold"
                                    : "bg-stone-100 text-stone-400 border border-stone-200"
                                }`}
                              >
                                {isDone ? <CheckCircle2 size={18} /> : <StepIcon size={18} />}
                              </div>
                              <span
                                className={`text-[11px] sm:text-xs font-black mt-2 leading-tight ${
                                  isCurrent
                                    ? "text-[#C1392B]"
                                    : isDone
                                    ? "text-emerald-700"
                                    : "text-stone-400"
                                }`}
                              >
                                {st.label}
                              </span>
                              <span className="text-[10px] text-stone-500 hidden sm:inline-block">
                                {st.desc}
                              </span>
                            </div>
                          );
                        })}

                        {/* Línea conectora de fondo */}
                        <div className="absolute top-5 left-[12%] right-[12%] h-1 bg-stone-200 -z-0">
                          <div
                            className="h-full bg-emerald-500 transition-all duration-500"
                            style={{
                              width: `${(Math.min(currentStepIdx, 3) / 3) * 100}%`
                            }}
                          />
                        </div>
                      </div>

                      {/* Explicación del estado actual */}
                      <div className="mt-4 p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950 flex items-start gap-2">
                        <Info size={16} className="text-amber-700 flex-shrink-0 mt-0.5" />
                        <div>
                          <b className="font-bold">{currentStatusConfig.label}:</b>{" "}
                          <span>{currentStatusConfig.description}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-center gap-2">
                      <AlertTriangle size={18} className="text-red-600 flex-shrink-0" />
                      <div>
                        <b>Este pedido figura como cancelado.</b> Podés comunicarte con el local para mayor información.
                      </div>
                    </div>
                  )}

                  {/* Detalle de Productos Pedidos */}
                  <div className="bg-[#FBF2DD]/60 rounded-xl p-3 border border-[#D7C49E]">
                    <span className="text-[11px] font-bold text-stone-600 uppercase tracking-wider block mb-2">
                      Platos y productos del pedido:
                    </span>
                    <div className="space-y-1.5 text-xs">
                      {(currentOrder.items || []).map((it, i) => (
                        <div key={i} className="flex items-center justify-between text-stone-800">
                          <span className="font-medium">
                            <b className="text-stone-900">{it.qty}x</b> {it.name}
                          </span>
                          <span className="font-mono text-stone-600">
                            {formatPrice((it.qty || 1) * (it.price || 0))}
                          </span>
                        </div>
                      ))}
                    </div>
                    {currentOrder.notes && (
                      <div className="mt-2.5 pt-2 border-t border-stone-200 text-xs text-stone-600 italic">
                        <b>Aclaraciones:</b> "{currentOrder.notes}"
                      </div>
                    )}
                  </div>

                  {/* Acciones del Pedido: Contactar por WhatsApp */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2">
                    <span className="text-xs text-stone-500 font-medium">
                      ¿Tenés dudas sobre tu pedido?
                    </span>
                    <a
                      href={`https://wa.me/${businessPhone.replace(/[^\d]/g, "")}?text=${encodeURIComponent(
                        `Hola! Quisiera consultar sobre el estado de mi pedido ${currentOrder.id} (${currentOrder.customerName || "Cliente"}).`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-[#059669] hover:bg-[#047857] text-white transition flex items-center justify-center gap-2 shadow-sm"
                    >
                      <MessageCircle size={15} />
                      <span>Consultar al Local por WhatsApp</span>
                      <ExternalLink size={11} />
                    </a>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Pie del Modal */}
        <div className="px-5 py-3.5 bg-stone-100 border-t border-stone-200 flex items-center justify-between">
          <div className="text-[11px] text-stone-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Sincronización asíncrona activa</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-stone-300 hover:bg-stone-400 text-stone-800 transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
