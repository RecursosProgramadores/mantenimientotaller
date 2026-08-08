import { Settings } from "lucide-react";

export function AppLoadingScreen() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-foreground" style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 2s linear infinite;
        }
      `}</style>
      <div className="flex flex-col items-center">
        <Settings className="h-12 w-12 text-primary animate-spin-slow mb-4" />
        <h1 className="text-xl font-bold">MantePro</h1>
        <p className="text-sm text-muted-foreground mt-1">Cargando sistema...</p>
      </div>
    </div>
  );
}
