// Pantalla de carga inicial: se muestra una sola vez, justo después de
// iniciar sesión, mientras se trae del servidor toda la información real
// (máquinas, mantenimientos, talleres, etc.). Antes el dashboard se
// renderizaba de inmediato con todo en cero y solo se corregía al refrescar
// la página manualmente — ver MantePro.tsx (`initializing`).
const LOGO_SRC = `${import.meta.env.BASE_URL}logocarga.png`;

export function LoadingScreen() {
  return (
    <div
      className="fixed inset-0 z-[999] flex flex-col items-center justify-center gap-8"
      style={{ background: "var(--background)" }}
      role="status"
      aria-live="polite"
    >
      {/* Resplandor de fondo, sutil */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(600px circle at 50% 42%, color-mix(in srgb, var(--primary) 12%, transparent), transparent 70%)",
        }}
      />

      <div className="relative flex flex-col items-center gap-6">
        {/* Anillo giratorio + logo */}
        <div className="relative flex h-28 w-28 items-center justify-center">
          <span
            className="absolute inset-0 rounded-full"
            style={{
              border: "3px solid var(--border)",
              borderTopColor: "var(--primary)",
              animation: "mp-spin 1.1s linear infinite",
            }}
          />
          <span
            className="absolute inset-2 rounded-full opacity-60"
            style={{
              border: "3px solid transparent",
              borderBottomColor: "var(--primary)",
              animation: "mp-spin-reverse 1.6s linear infinite",
            }}
          />
          <img
            src={LOGO_SRC}
            alt="MantePro"
            className="relative h-16 w-16 object-contain drop-shadow-sm"
            style={{ animation: "mp-pulse-scale 2.2s ease-in-out infinite" }}
            draggable={false}
          />
        </div>

        <div className="flex flex-col items-center gap-1.5 text-center">
          <span className="text-[15px] font-semibold tracking-tight" style={{ color: "var(--foreground)" }}>
            MantePro
          </span>
          <span className="text-[13px]" style={{ color: "var(--muted-foreground)" }}>
            Cargando tu sistema de mantenimiento
            <span className="mp-loading-dots" aria-hidden="true">
              <span>.</span><span>.</span><span>.</span>
            </span>
          </span>
        </div>

        {/* Barra de progreso indeterminada */}
        <div
          className="h-1 w-48 overflow-hidden rounded-full"
          style={{ background: "var(--border)" }}
        >
          <div
            className="h-full w-1/3 rounded-full"
            style={{ background: "var(--primary)", animation: "mp-progress-slide 1.3s ease-in-out infinite" }}
          />
        </div>
      </div>

      <style>{`
        @keyframes mp-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes mp-spin-reverse {
          to { transform: rotate(-360deg); }
        }
        @keyframes mp-pulse-scale {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.06); opacity: 0.85; }
        }
        @keyframes mp-progress-slide {
          0% { transform: translateX(-110%); }
          100% { transform: translateX(340%); }
        }
        .mp-loading-dots span {
          animation: mp-dot-fade 1.4s infinite;
          opacity: 0;
        }
        .mp-loading-dots span:nth-child(1) { animation-delay: 0s; }
        .mp-loading-dots span:nth-child(2) { animation-delay: 0.2s; }
        .mp-loading-dots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes mp-dot-fade {
          0%, 80%, 100% { opacity: 0; }
          40% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
