import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, FormEvent, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Settings, Mail, Lock, Eye, EyeOff, XCircle, Loader2, ShieldCheck } from "lucide-react";
import portada from "@/assets/portada.jpeg";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

const FEATURES = ["Control de equipos", "Alertas inteligentes", "Reportes KPI"];

function LoginPage() {
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      navigate({ to: "/" });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    setError(false);

    const success = await login(email, password);
    if (success) {
      navigate({ to: "/" });
    } else {
      setError(true);
      setIsLoading(false);
    }
  };

  // Don't render the login form if we're still checking session or already authenticated
  if (authLoading || isAuthenticated) return null;

  return (
    <div className="flex h-screen w-full bg-background font-sans text-foreground overflow-hidden">

      {/* LEFT COLUMN - Hidden on mobile */}
      <div className="hidden md:flex relative w-1/2 h-full flex-col justify-end">
        <img
          src={portada}
          alt="MantePro"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(15,23,42,0.92) 0%, rgba(15,23,42,0.55) 55%, rgba(15,23,42,0.25) 100%)' }}
        />

        <div className="relative z-10 p-12 pb-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Settings className="h-5 w-5" />
            </div>
            <h1 className="text-[26px] font-bold text-white tracking-tight">MantePro</h1>
          </div>
          <p className="text-slate-300 text-sm mb-6 max-w-md">
            Sistema de Gestión de Mantenimiento Industrial
          </p>

          <div className="flex flex-wrap gap-2">
            {FEATURES.map(pill => (
              <span
                key={pill}
                className="text-[12px] text-white/90 px-3 py-1 rounded-full border border-white/15"
                style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)' }}
              >
                {pill}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN - Form */}
      <div className="w-full md:w-1/2 h-full flex flex-col relative items-center justify-center p-6 bg-background">

        <ThemeToggle className="absolute top-6 right-6" />

        {/* Mobile Header (Hidden on Desktop) */}
        <div className="absolute top-6 left-6 md:hidden flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Settings className="h-4 w-4" />
          </div>
          <span className="font-bold text-base">MantePro</span>
        </div>

        <div className="w-full max-w-[380px] px-0 md:px-2 py-10">

          <div className="mb-8">
            <span className="inline-block px-2 py-1 rounded text-primary bg-primary/10 text-[11px] font-semibold uppercase tracking-wider mb-4">
              Acceso al sistema
            </span>
            <h2 className="text-[26px] font-bold text-foreground mb-1.5 leading-tight">Bienvenido</h2>
            <p className="text-muted-foreground text-[14px]">Ingresa tus credenciales para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-foreground">Correo electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
                <input
                  type="email"
                  placeholder="nombre@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 bg-card border border-input rounded-md pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/15 transition-all duration-150"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-foreground">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 bg-card border border-input rounded-md pl-11 pr-11 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/15 transition-all duration-150 font-mono tracking-widest placeholder:tracking-normal"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div
                className="flex items-start gap-2.5 p-3 rounded-md bg-critical/10 border border-critical/25"
                style={{ animation: 'slideDownFade 0.15s ease-out' }}
              >
                <XCircle className="h-[18px] w-[18px] text-critical shrink-0 mt-0.5" />
                <p className="text-[13px] text-critical leading-snug">
                  Credenciales incorrectas. Verifica tu correo y contraseña.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full h-11 rounded-md flex items-center justify-center text-[14px] font-semibold text-primary-foreground transition-colors duration-150 mt-2
                ${isLoading
                  ? 'bg-primary/70 cursor-not-allowed'
                  : 'bg-primary hover:bg-primary/90'
                }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                "Iniciar sesión"
              )}
            </button>

          </form>

          <div className="mt-8 pt-6 border-t border-border relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-[12px] text-muted-foreground font-medium">
              Sistema protegido
            </div>
            <div className="flex items-center justify-center gap-1.5 text-muted-foreground text-[12px]">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Tus datos están protegidos</span>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="absolute bottom-6 left-0 right-0 text-center text-muted-foreground/70 text-[12px]">
          MantePro © 2026 · Gestión de Mantenimiento Industrial
        </div>

      </div>

      <style>{`
        @keyframes slideDownFade {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
