const fs = require('fs');

// 1. AppShell.tsx
let shellCode = fs.readFileSync('src/components/AppShell.tsx', 'utf8');

// The line is: const { machines, records, workshops, allDocuments, notifications } = useMantePro();
// We add "settings"
shellCode = shellCode.replace(
  /const \{ machines, records, workshops, allDocuments, notifications \} = useMantePro\(\);/,
  'const { machines, records, workshops, allDocuments, notifications, settings } = useMantePro();'
);

// We replace the M block and MantePro with settings values.
const oldSidebarBrand = /<div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground font-bold">\s*M\s*<\/div>\s*\{!collapsed && \(\s*<div className="min-w-0">\s*<div className="text-sm font-bold tracking-tight">MantePro<\/div>\s*<div className="text-\[10px\] uppercase tracking-wider text-muted-foreground">Industrial Maint\.<\/div>\s*<\/div>\s*\)\}/;

const newSidebarBrand = `{settings?.institutionLogo ? (
            <img src={settings.institutionLogo} alt="Logo" className="h-9 w-9 shrink-0 rounded-md object-cover border border-border" />
          ) : (
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground font-bold">
              {settings?.institutionName ? settings.institutionName.charAt(0).toUpperCase() : 'M'}
            </div>
          )}
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-bold tracking-tight truncate" title={settings?.institutionName || "MantePro"}>
                {settings?.institutionName || "MantePro"}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Industrial Maint.</div>
            </div>
          )}`;
shellCode = shellCode.replace(oldSidebarBrand, newSidebarBrand);
fs.writeFileSync('src/components/AppShell.tsx', shellCode);

// 2. configuracion.tsx
let configCode = fs.readFileSync('src/routes/configuracion.tsx', 'utf8');

// Remove the Users tab entirely
configCode = configCode.replace(/<TabsTrigger value="users">Usuarios<\/TabsTrigger>/, '');
configCode = configCode.replace(/<TabsContent value="users" className="mt-4"><Users \/><\/TabsContent>/, '');

// Completely replace Org component with a better design
const orgRegex = /function Org\(\) \{[\s\S]*?(?=function Workshops\(\) \{)/;
const newOrg = `function Org() {
  const { settings, updateSettings } = useMantePro();
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h3 className="text-lg font-medium">Perfil de Organización</h3>
        <p className="text-sm text-muted-foreground">Administra la información de tu empresa y personaliza la identidad visual en el sistema.</p>
      </div>
      
      <div className="grid sm:grid-cols-2 gap-6">
        <Card className="bg-card border-border shadow-sm">
          <CardHeader><CardTitle className="text-base font-medium">Detalles Principales</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre de la Empresa / Taller</Label>
              <Input 
                value={settings.institutionName} 
                onChange={(e) => updateSettings({ institutionName: e.target.value })} 
                placeholder="Ej. Taller Metalmecánico del Norte"
              />
            </div>
            <div className="space-y-2">
              <Label>Técnico Responsable / Administrador</Label>
              <Input 
                value="ING. JOHNNY BRYNNER VILCHEZ MIRANDA"
                disabled
                className="bg-muted text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground">El usuario administrador fue configurado globalmente.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardHeader><CardTitle className="text-base font-medium">Identidad Visual</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Logo del Sistema</Label>
              <div className="flex items-center gap-4 mt-2">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 border-dashed border-border bg-muted flex items-center justify-center">
                  {settings.institutionLogo ? (
                    <img src={settings.institutionLogo} alt="Logo" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs text-muted-foreground text-center px-2">Sin logo</span>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <Input type="file" accept="image/*" className="w-full text-xs" onChange={(e) => {
                    const f = e.target.files?.[0]; if (!f) return;
                    const r = new FileReader();
                    r.onload = () => updateSettings({ institutionLogo: r.result as string });
                    r.readAsDataURL(f);
                  }} />
                  <p className="text-[10px] text-muted-foreground">Se recomienda una imagen cuadrada (PNG, JPG) de al menos 256x256 px.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => toast.success("Preferencias guardadas correctamente")}>
          <Save className="h-4 w-4 mr-2" />
          Guardar Cambios
        </Button>
      </div>
    </div>
  );
}

`;
configCode = configCode.replace(orgRegex, newOrg);
fs.writeFileSync('src/routes/configuracion.tsx', configCode);

console.log("Patched AppShell and Configuracion!");
