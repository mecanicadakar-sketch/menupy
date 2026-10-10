import React, { Component } from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

class RootErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[Menu Py] Application error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    try {
      // Intentar resetear vista en almacenamiento si hubiera
      sessionStorage.clear();
    } catch (e) {}
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ background: "#2A2018", minHeight: "100vh", fontFamily: "'Work Sans', sans-serif" }} className="flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl p-6 md:p-8 shadow-2xl text-center" style={{ background: "#F0E2BF", color: "#2A2018" }}>
            <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4 text-2xl font-bold shadow-inner">
              ⚠️
            </div>
            <h2 className="text-xl font-black mb-2" style={{ color: "#2A2018" }}>
              Panel temporalmente no disponible
            </h2>
            <p className="text-xs text-stone-700 mb-4 leading-relaxed">
              Ocurrió un inconveniente al cargar esta sección. Podés reiniciar la aplicación para volver al menú principal de forma segura.
            </p>
            {this.state.error?.message && (
              <div className="p-3 rounded-xl bg-white/80 border border-stone-300 text-left font-mono text-[11px] text-red-700 mb-4 break-words max-h-32 overflow-y-auto">
                {this.state.error.message}
              </div>
            )}
            <div className="space-y-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white shadow hover:brightness-105 active:scale-95 transition"
                style={{ background: "#C1392B" }}
              >
                Volver al Menú Principal
              </button>
              <button
                type="button"
                onClick={() => this.setState({ hasError: false, error: null })}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-stone-200 text-stone-800 hover:bg-stone-300 transition"
              >
                Reintentar Cargar Vista
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>
);

// Registro de Service Worker para PWA (con detección inmediata de nuevas versiones)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        // Forzar comprobación de versión actualizada
        reg.update().catch(() => {});

        reg.onupdatefound = () => {
          const installingWorker = reg.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
                console.log("[Menu Py] Nueva versión detectada, recargando para mostrar cambios...");
                window.location.reload();
              }
            };
          }
        };
      })
      .catch((err) => {
        console.warn("ServiceWorker registration:", err);
      });
  });
}

