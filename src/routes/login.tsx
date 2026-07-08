import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, FormEvent, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Settings, Mail, Lock, Eye, EyeOff, XCircle, Loader2 } from "lucide-react";
import portada from "@/assets/portada.jpeg";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

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
    <div className="flex h-screen w-full bg-[#0F1117] font-sans text-white overflow-hidden">
      
      {/* LEFT COLUMN - Hidden on mobile */}
      <div className="hidden md:flex relative w-1/2 h-full bg-gradient-to-t from-[#0F1117] to-[#1A1D27] flex-col justify-end">
        <img 
          src={portada} 
          alt="MantePro Background" 
          className="absolute inset-0 w-full h-full object-cover" 
        />
        <div 
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)' }}
        />
        
        <div className="relative z-10 p-12 pb-16">
          <div className="flex items-center gap-3 mb-4">
            <Settings className="h-10 w-10 text-amber-500" />
            <h1 className="text-[28px] font-bold text-white tracking-tight">MantePro</h1>
          </div>
          <p className="text-slate-400 text-sm mb-6 max-w-md">
            Sistema de Gestión de Mantenimiento Industrial
          </p>
          
          <div className="flex flex-wrap gap-3">
            {["⚙ Control de equipos", "🔔 Alertas inteligentes", "📊 Reportes KPI"].map(pill => (
              <span 
                key={pill} 
                className="text-[12px] text-white px-3 py-1 rounded-full border border-white/12"
                style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)' }}
              >
                {pill}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN - Form */}
      <div className="w-full md:w-1/2 h-full flex flex-col relative items-center justify-center p-6 bg-[#0F1117]">
        
        {/* Mobile Header (Hidden on Desktop) */}
        <div className="absolute top-6 left-6 md:hidden flex items-center gap-2">
          <Settings className="h-6 w-6 text-amber-500" />
          <span className="font-bold text-lg">MantePro</span>
        </div>

        <div className="w-full max-w-[400px] px-0 md:px-8 py-10">
          
          <div className="mb-8">
            <span className="inline-block px-2 py-1 rounded text-amber-500 bg-amber-500/10 text-[11px] font-bold uppercase tracking-wider mb-4">
              Acceso al sistema
            </span>
            <h2 className="text-[32px] font-bold text-white mb-2 leading-tight">Bienvenido</h2>
            <p className="text-slate-400 text-[14px]">Ingresa tus credenciales para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            
            <div className="space-y-1.5 relative group">
              <label className="text-[13px] font-medium text-slate-300">Correo electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10 pointer-events-none" />
                <input 
                  type="email"
                  placeholder="admin@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 bg-[#1A1D27] border border-[#2A2D3A] rounded-[10px] pl-11 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:ring-[3px] focus:ring-amber-500/15 transition-all duration-200"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5 relative group">
              <label className="text-[13px] font-medium text-slate-300">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10 pointer-events-none" />
                <input 
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 bg-[#1A1D27] border border-[#2A2D3A] rounded-[10px] pl-11 pr-11 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:ring-[3px] focus:ring-amber-500/15 transition-all duration-200 font-mono tracking-widest placeholder:tracking-normal"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div 
                className="flex items-start gap-2.5 p-3 rounded-lg bg-red-500/10 border border-red-500/25"
                style={{ animation: 'slideDownFade 0.2s ease-out' }}
              >
                <XCircle className="h-[18px] w-[18px] text-red-500 shrink-0 mt-0.5" />
                <p className="text-[13px] text-red-400 leading-snug">
                  Credenciales incorrectas. Verifica tu correo y contraseña.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full h-12 rounded-[10px] flex items-center justify-center text-[15px] font-semibold text-white transition-all duration-200 mt-2
                ${isLoading 
                  ? 'bg-amber-600/80 cursor-not-allowed opacity-80' 
                  : 'bg-gradient-to-br from-[#F59E0B] to-[#D97706] hover:from-[#FBBF24] hover:to-[#F59E0B] hover:-translate-y-[1px] hover:shadow-[0_4px_20px_rgba(245,158,11,0.4)] active:translate-y-0 active:shadow-sm'
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

          <div className="mt-8 pt-6 border-t border-slate-800 relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0F1117] px-3 text-[12px] text-slate-600 font-medium">
              Sistema protegido
            </div>
            <div className="flex items-center justify-center gap-1.5 text-slate-500 text-[12px]">
              <Lock className="h-3.5 w-3.5" />
              <span>Tus datos están protegidos</span>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="absolute bottom-6 left-0 right-0 text-center text-slate-600 text-[12px]">
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
