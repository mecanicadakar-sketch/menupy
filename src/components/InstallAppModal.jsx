import React, { useState, useEffect } from "react";
import { Download, Smartphone, Monitor, Share, PlusSquare, CheckCircle2, X, Zap, ArrowRight, QrCode } from "lucide-react";
import QRCode from "qrcode";
import menuPyLogo from "../assets/images/logo-menu-py.png";

export default function InstallAppModal({ isOpen, onClose, onInstallSuccess, brandColors }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [installedSuccessfully, setInstalledSuccessfully] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    // Generar código QR de la aplicación
    try {
      const appUrl = window.location.href;
      QRCode.toDataURL(appUrl, {
        width: 280,
        margin: 1,
        color: { dark: "#1C1917", light: "#FFFFFF" },
      }).then((url) => setQrDataUrl(url)).catch(() => {});
    } catch {}
  }, [isOpen]);

  useEffect(() => {
    // Detectar si ya está instalada en modo standalone
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true ||
      document.referrer.includes("android-app://");
    
    setIsInstalled(isStandalone);

    // Detectar sistema operativo y dispositivo
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    const isMobileDevice = /android|iphone|ipad|ipod|mobile/.test(ua);
    setIsIOS(isIosDevice);
    setIsMobile(isMobileDevice);

    const handleBeforeInstallPrompt = (e) => {
      // Prevenir el banner automático intrusivo del navegador para controlarlo nosotros
      e.preventDefault();
      setDeferredPrompt(e);
      console.log("[PWA] Evento beforeinstallprompt capturado con éxito");
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstalledSuccessfully(true);
      setDeferredPrompt(null);
      if (onInstallSuccess) onInstallSuccess();
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [onInstallSuccess]);

  // Si ya está ejecutándose como PWA instalada, no mostramos el popup
  if (isInstalled && !installedSuccessfully) {
    return null;
  }

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          console.log("[PWA] Instalación aceptada por el usuario");
          setInstalledSuccessfully(true);
          setDeferredPrompt(null);
          setTimeout(() => {
            onClose();
          }, 2400);
        } else {
          console.log("[PWA] Instalación postergada por el usuario");
          onClose();
        }
      } catch (err) {
        console.warn("[PWA] Error al invocar prompt de instalación:", err);
      }
    } else if (!isIOS) {
      // En navegadores de escritorio que no emiten el evento (o si ya se emitió antes)
      alert(
        "Para instalar en tu navegador:\n\n" +
        "• En PC: Hacé clic en el ícono de instalación (⊕ o monitor con flecha) ubicado a la derecha en la barra de direcciones web.\n" +
        "• En Android: Abrí el menú de 3 puntos (⋮) de tu navegador y seleccioná 'Instalar aplicación' o 'Agregar a la pantalla principal'."
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border flex flex-col text-stone-900 bg-white"
        style={{
          boxShadow: "0 25px 50px -12px rgba(28, 21, 16, 0.6)",
          borderColor: "rgba(245, 158, 11, 0.5)"
        }}
      >
        {/* Cabecera superior temática con degradado cálido MenuPy (chocolate y oro) */}
        <div 
          className="relative px-6 pt-7 pb-6 text-center text-white overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #1C1510 0%, #2A1E17 50%, #3D261C 100%)"
          }}
        >
          {/* Círculos decorativos de fondo */}
          <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-amber-500/20 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-amber-600/25 blur-xl pointer-events-none" />

          {/* Botón Cerrar */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3.5 right-3.5 p-1.5 rounded-full bg-black/35 hover:bg-black/55 text-white/90 hover:text-white transition"
            title="Cerrar ventana"
          >
            <X size={18} />
          </button>

          {/* Logo Oficial de la App limpio sin recuadros extra */}
          <div className="relative mx-auto w-28 h-28 sm:w-32 sm:h-32 mb-3 flex items-center justify-center">
            <img
              src={menuPyLogo || "/app-logo.png?v=menupy6"}
              alt="Logo Menú Py"
              className="w-full h-full object-contain drop-shadow-2xl select-none"
              onError={(e) => {
                e.currentTarget.src = "/app-logo.png?v=menupy6";
              }}
            />
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight drop-shadow-sm text-white">
            ¡Instalar Menú Py!
          </h2>

          {/* Frase destacada solicitada por el usuario */}
          <div className="mt-2.5 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 font-black text-xs shadow-lg border border-amber-300">
            <QrCode size={15} className="text-stone-950 flex-shrink-0" />
            <span>Escanea el QR y hace tu pedido</span>
          </div>

          <p className="text-xs text-amber-100/90 font-medium mt-2 max-w-xs mx-auto">
            Accedé a tus pedidos con 1 solo toque desde la pantalla de tu celular o computadora.
          </p>
        </div>

        {/* Cuerpo del Diálogo */}
        <div className="p-5 sm:p-6 space-y-4">
          {installedSuccessfully ? (
            <div className="text-center py-4 space-y-3">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
                <CheckCircle2 size={36} />
              </div>
              <h3 className="text-lg font-bold text-stone-900">
                ¡Aplicación instalada con éxito!
              </h3>
              <p className="text-xs text-stone-600 max-w-xs mx-auto">
                Ya tenés el acceso directo listo con el logo oficial de Menú Py en tu pantalla. Podés abrirla en cualquier momento.
              </p>
            </div>
          ) : isIOS ? (
            /* Guía visual paso a paso para usuarios de iPhone / iPad con Safari */
            <div className="space-y-3 bg-amber-50/70 p-4 rounded-2xl border border-amber-200">
              <div className="flex items-center gap-2 text-stone-900 font-bold text-xs">
                <Smartphone size={16} className="text-amber-600" />
                <span>Cómo instalar en tu iPhone / iPad (Safari):</span>
              </div>

              <div className="space-y-2.5 text-xs text-stone-700">
                <div className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500 text-stone-950 font-bold text-[11px] flex items-center justify-center">
                    1
                  </span>
                  <span>
                    Tocá el botón <b>Compartir</b> <Share size={13} className="inline mx-0.5 text-amber-700" /> en la barra inferior de Safari.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500 text-stone-950 font-bold text-[11px] flex items-center justify-center">
                    2
                  </span>
                  <span>
                    Buscá y seleccioná <b>"Agregar a inicio"</b> <PlusSquare size={13} className="inline mx-0.5 text-amber-700" />.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500 text-stone-950 font-bold text-[11px] flex items-center justify-center">
                    3
                  </span>
                  <span>
                    Tocá <b>"Agregar"</b> arriba a la derecha. ¡Listo! Tendrás el icono directo de Menú Py en tu pantalla.
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Beneficios y acción directa para Android / PC */
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/80 flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800 flex-shrink-0">
                    <QrCode size={14} />
                  </div>
                  <span className="font-semibold text-stone-800 text-[11px] leading-tight">
                    Escanea el QR y hace tu pedido
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 flex-shrink-0">
                    {isMobile ? <Smartphone size={14} /> : <Monitor size={14} />}
                  </div>
                  <span className="font-semibold text-stone-700 text-[11px] leading-tight">
                    {isMobile ? "Acceso en pantalla de inicio" : "Acceso en escritorio PC"}
                  </span>
                </div>
              </div>

              <p className="text-xs text-stone-600 text-center px-1">
                Instalá la app para navegar el menú de <b>Menú Py</b> sin escribir la dirección y pedir por WhatsApp más rápido.
              </p>

              {/* Código QR Escaneable */}
              {qrDataUrl && (
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-stone-50 border border-stone-200">
                  <div className="w-16 h-16 bg-white p-1 rounded-xl border border-stone-200 shrink-0 shadow-sm">
                    <img src={qrDataUrl} alt="QR Menú Py" className="w-full h-full object-contain" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <span className="text-[11px] font-black text-stone-900 block flex items-center gap-1">
                      <QrCode size={13} className="text-amber-600" /> Escaneá y hacé tu pedido
                    </span>
                    <span className="text-[10px] text-stone-500 leading-tight block mt-0.5">
                      Apuntá con tu cámara para abrir el menú interactivo al instante.
                    </span>
                  </div>
                </div>
              )}

              {/* Botón Principal de Instalación */}
              <button
                type="button"
                onClick={handleInstallClick}
                className="w-full py-3.5 px-5 rounded-2xl font-black text-sm text-stone-950 shadow-xl hover:brightness-110 active:scale-95 transition flex items-center justify-center gap-2.5 cursor-pointer border border-amber-300"
                style={{
                  background: "linear-gradient(135deg, #F59E0B 0%, #FBBF24 50%, #F59E0B 100%)",
                  boxShadow: "0 10px 25px -5px rgba(245, 158, 11, 0.45)"
                }}
              >
                <Download size={18} />
                <span>Instalar Aplicación con Logo Oficial</span>
              </button>
            </div>
          )}

          {/* Botón secundario "Ahora no" */}
          <div className="pt-1 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 px-3 text-xs font-bold text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-xl transition text-center"
            >
              Continuar en el navegador web
            </button>
          </div>

          {/* Firma de Autoría */}
          <div className="pt-2 border-t border-stone-100 flex items-center justify-center gap-1.5 text-[10px] text-stone-400">
            <span>Desarrollado y optimizado por</span>
            <span className="font-bold text-amber-700">CyM Software</span>
          </div>
        </div>
      </div>
    </div>
  );
}
