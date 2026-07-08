-- ========================================================================================
-- STEP 2 — GENERATE THE COMPLETE SQL MIGRATION (Tables in order)
-- ========================================================================================

-- 1. instituciones
CREATE TABLE instituciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    logo_url TEXT,
    direccion TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. areas
CREATE TABLE areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institucion_id UUID REFERENCES instituciones(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    descripcion TEXT
);

-- 3. usuarios
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institucion_id UUID REFERENCES instituciones(id) ON DELETE CASCADE,
    auth_user_id UUID UNIQUE,
    nombre TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    rol TEXT CHECK (rol IN ('Admin', 'Supervisor', 'Tecnico', 'Operador')) NOT NULL,
    area TEXT,
    activo BOOLEAN DEFAULT TRUE,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. tipos_mantenimiento
CREATE TABLE tipos_mantenimiento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institucion_id UUID REFERENCES instituciones(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    color TEXT,
    frecuencia TEXT CHECK (frecuencia IN ('Diario', 'Semanal', 'Mensual', 'Semestral', 'Anual', 'A condicion')) NOT NULL,
    duracion_min INTEGER,
    descripcion TEXT,
    activo BOOLEAN DEFAULT TRUE
);

-- 5. actividades_tipo
CREATE TABLE actividades_tipo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_id UUID REFERENCES tipos_mantenimiento(id) ON DELETE CASCADE,
    descripcion TEXT NOT NULL,
    duracion_min INTEGER,
    responsable TEXT,
    orden INTEGER
);

-- 6. maquinas
CREATE TABLE maquinas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    area_id UUID REFERENCES areas(id) ON DELETE SET NULL,
    institucion_id UUID REFERENCES instituciones(id) ON DELETE CASCADE,
    codigo TEXT UNIQUE NOT NULL,
    codigo_patrimonial TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    marca TEXT,
    modelo TEXT,
    numero_serie TEXT,
    anio_fabricacion INTEGER,
    anio_adquisicion INTEGER,
    costo NUMERIC,
    estado TEXT CHECK (estado IN ('Operativo', 'En Revision', 'En Taller', 'Fuera de Servicio')) DEFAULT 'Operativo',
    criticidad TEXT CHECK (criticidad IN ('Alto', 'Medio', 'Bajo')) DEFAULT 'Medio',
    potencia_kw NUMERIC,
    voltaje_v NUMERIC,
    frecuencia_hz NUMERIC,
    peso_kg NUMERIC,
    foto_url TEXT,
    observaciones TEXT,
    umbral_horas_ciclo NUMERIC DEFAULT 30,
    umbral_dias_maximos INTEGER DEFAULT 7,
    umbral_alerta_pct INTEGER DEFAULT 80 CHECK (umbral_alerta_pct BETWEEN 10 AND 90),
    turno_operacion TEXT CHECK (turno_operacion IN ('Mañana', 'Tarde', 'Noche', 'Tiempo completo', 'Variable')),
    dias_operacion TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. maquina_tipos_mantenimiento
CREATE TABLE maquina_tipos_mantenimiento (
    maquina_id UUID REFERENCES maquinas(id) ON DELETE CASCADE,
    tipo_id UUID REFERENCES tipos_mantenimiento(id) ON DELETE CASCADE,
    PRIMARY KEY (maquina_id, tipo_id)
);

-- 8. maquina_operadores
CREATE TABLE maquina_operadores (
    maquina_id UUID REFERENCES maquinas(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    PRIMARY KEY (maquina_id, usuario_id)
);

-- 9. componentes_criticos
CREATE TABLE componentes_criticos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maquina_id UUID REFERENCES maquinas(id) ON DELETE CASCADE,
    numero INTEGER,
    nombre TEXT NOT NULL,
    funcion TEXT,
    estado TEXT CHECK (estado IN ('Bueno', 'Regular', 'Deteriorado', 'Requiere cambio')) DEFAULT 'Bueno',
    criticidad TEXT CHECK (criticidad IN ('Alto', 'Medio', 'Bajo')) DEFAULT 'Medio',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. uso_ciclos
CREATE TABLE uso_ciclos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maquina_id UUID UNIQUE REFERENCES maquinas(id) ON DELETE CASCADE,
    horas_acumuladas NUMERIC DEFAULT 0,
    iniciado_en TIMESTAMPTZ DEFAULT NOW(),
    ultimo_reset TIMESTAMPTZ DEFAULT NOW(),
    otm_ref_id UUID NULL, -- We'll add FK constraint after creating ordenes_trabajo
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. ordenes_trabajo
CREATE TABLE ordenes_trabajo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maquina_id UUID REFERENCES maquinas(id) ON DELETE CASCADE,
    tipo_id UUID REFERENCES tipos_mantenimiento(id) ON DELETE SET NULL,
    tecnico_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    supervisor_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    numero_otm TEXT UNIQUE NOT NULL,
    fecha_programada DATE,
    hora_inicio TIME,
    hora_fin TIME,
    estado TEXT CHECK (estado IN ('Programado', 'En Proceso', 'Completado', 'Cancelado')) DEFAULT 'Programado',
    estado_post_maquina TEXT CHECK (estado_post_maquina IN ('Operativo', 'En Revision', 'Requiere seguimiento')),
    proximo_mantenimiento DATE,
    hallazgos TEXT,
    costo_repuestos NUMERIC DEFAULT 0,
    costo_mano_obra NUMERIC DEFAULT 0,
    costo_total NUMERIC GENERATED ALWAYS AS (costo_repuestos + costo_mano_obra) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add deferred FK to uso_ciclos
ALTER TABLE uso_ciclos ADD CONSTRAINT fk_ciclo_otm FOREIGN KEY (otm_ref_id) REFERENCES ordenes_trabajo(id) ON DELETE SET NULL;

-- 12. actividades_otm
CREATE TABLE actividades_otm (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orden_id UUID REFERENCES ordenes_trabajo(id) ON DELETE CASCADE,
    actividad_tipo_id UUID REFERENCES actividades_tipo(id) ON DELETE SET NULL,
    descripcion TEXT NOT NULL,
    completada BOOLEAN DEFAULT FALSE,
    observaciones TEXT,
    orden INTEGER
);

-- 13. repuestos_otm
CREATE TABLE repuestos_otm (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orden_id UUID REFERENCES ordenes_trabajo(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    cantidad INTEGER NOT NULL,
    costo_unitario NUMERIC NOT NULL,
    subtotal NUMERIC GENERATED ALWAYS AS (cantidad * costo_unitario) STORED
);

-- 14. uso_logs
CREATE TABLE uso_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maquina_id UUID REFERENCES maquinas(id) ON DELETE CASCADE,
    ciclo_id UUID REFERENCES uso_ciclos(id) ON DELETE CASCADE,
    operador TEXT,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    horas NUMERIC CHECK (horas > 0),
    turno TEXT CHECK (turno IN ('Mañana', 'Tarde', 'Noche', 'Variable')),
    observaciones TEXT,
    registrado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    CONSTRAINT check_fechas CHECK (end_at > start_at)
);

-- 15. talleres_externos
CREATE TABLE talleres_externos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institucion_id UUID REFERENCES instituciones(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    direccion TEXT,
    telefono TEXT,
    contacto TEXT,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    activo BOOLEAN DEFAULT TRUE
);

-- 16. envios_taller
CREATE TABLE envios_taller (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maquina_id UUID REFERENCES maquinas(id) ON DELETE CASCADE,
    taller_id UUID REFERENCES talleres_externos(id) ON DELETE SET NULL,
    autorizado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    fecha_envio DATE,
    fecha_retorno_est DATE,
    fecha_retorno_real DATE,
    tipo_problema TEXT CHECK (tipo_problema IN ('Falla electrica', 'Falla mecanica', 'Desgaste de componentes', 'Calibracion', 'Reparacion mayor', 'Otro')),
    descripcion_problema TEXT,
    condicion_envio TEXT,
    estado TEXT CHECK (estado IN ('En Taller', 'Devuelto', 'Cancelado')) DEFAULT 'En Taller',
    presupuesto NUMERIC,
    costo_final NUMERIC,
    resumen_trabajos TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. componentes_afectados
CREATE TABLE componentes_afectados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    envio_id UUID REFERENCES envios_taller(id) ON DELETE CASCADE,
    componente_id UUID REFERENCES componentes_criticos(id) ON DELETE CASCADE,
    UNIQUE (envio_id, componente_id)
);

-- 18. seguimiento_taller
CREATE TABLE seguimiento_taller (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    envio_id UUID REFERENCES envios_taller(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    estado_nuevo TEXT,
    nota TEXT,
    fecha TIMESTAMPTZ DEFAULT NOW()
);

-- 19. documentos
CREATE TABLE documentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    envio_id UUID REFERENCES envios_taller(id) ON DELETE CASCADE,
    orden_id UUID REFERENCES ordenes_trabajo(id) ON DELETE CASCADE,
    maquina_id UUID REFERENCES maquinas(id) ON DELETE CASCADE,
    nombre_archivo TEXT NOT NULL,
    url TEXT NOT NULL,
    categoria TEXT CHECK (categoria IN ('Diagnostico', 'Manual', 'Presupuesto', 'Fotografia', 'Certificado', 'Factura', 'Informe', 'Otro')),
    tipo_mime TEXT,
    tamanio_bytes INTEGER,
    descripcion TEXT,
    subido_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT has_parent CHECK (envio_id IS NOT NULL OR orden_id IS NOT NULL OR maquina_id IS NOT NULL)
);

-- 20. notificaciones
CREATE TABLE notificaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maquina_id UUID REFERENCES maquinas(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo TEXT CHECK (tipo IN ('warning', 'critical', 'reminder', 'reset')) NOT NULL,
    titulo TEXT NOT NULL,
    mensaje TEXT NOT NULL,
    leida BOOLEAN DEFAULT FALSE,
    accion_tipo TEXT CHECK (accion_tipo IN ('crear_otm', 'ver_historial', 'programar_otm')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 21. kpis_maquina
CREATE TABLE kpis_maquina (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maquina_id UUID REFERENCES maquinas(id) ON DELETE CASCADE,
    anio INTEGER NOT NULL,
    mes INTEGER CHECK (mes BETWEEN 1 AND 12) NOT NULL,
    mtbf_horas NUMERIC,
    mttr_horas NUMERIC,
    disponibilidad_pct NUMERIC,
    cumplimiento_mp_pct NUMERIC,
    costo_periodo NUMERIC DEFAULT 0,
    fallas_count INTEGER DEFAULT 0,
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (maquina_id, anio, mes)
);

-- 22. repuestos_catalogo
CREATE TABLE repuestos_catalogo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institucion_id UUID REFERENCES instituciones(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    referencia TEXT,
    proveedor TEXT,
    precio NUMERIC DEFAULT 0,
    stock_minimo INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ========================================================================================
-- STEP 3 — CREATE ALL INDEXES
-- ========================================================================================

CREATE INDEX idx_maquinas_area ON maquinas(area_id);
CREATE INDEX idx_maquinas_estado ON maquinas(estado);
CREATE INDEX idx_maquinas_institucion ON maquinas(institucion_id);
CREATE INDEX idx_otm_maquina ON ordenes_trabajo(maquina_id);
CREATE INDEX idx_otm_estado ON ordenes_trabajo(estado);
CREATE INDEX idx_otm_fecha ON ordenes_trabajo(fecha_programada);
CREATE INDEX idx_usologs_maquina ON uso_logs(maquina_id);
CREATE INDEX idx_usologs_start ON uso_logs(start_at);
CREATE INDEX idx_notif_usuario ON notificaciones(usuario_id);
CREATE INDEX idx_notif_leida ON notificaciones(leida);
CREATE INDEX idx_envios_maquina ON envios_taller(maquina_id);
CREATE INDEX idx_kpis_maquina_fecha ON kpis_maquina(maquina_id, anio, mes);
CREATE INDEX idx_compcriticos_maquina ON componentes_criticos(maquina_id);
CREATE INDEX idx_doc_orden ON documentos(orden_id);
CREATE INDEX idx_doc_envio ON documentos(envio_id);


-- ========================================================================================
-- STEP 4 — CREATE ALL TRIGGERS
-- ========================================================================================

-- Trigger 1: updated_at
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_maquinas_updated_at BEFORE UPDATE ON maquinas FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tg_otm_updated_at BEFORE UPDATE ON ordenes_trabajo FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tg_envios_updated_at BEFORE UPDATE ON envios_taller FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tg_ciclos_updated_at BEFORE UPDATE ON uso_ciclos FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger 2: Acumular horas al registrar uso
CREATE OR REPLACE FUNCTION acumular_horas_uso() RETURNS trigger AS $$
BEGIN
  UPDATE uso_ciclos SET horas_acumuladas = horas_acumuladas + NEW.horas WHERE maquina_id = NEW.maquina_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_acumular_horas AFTER INSERT ON uso_logs FOR EACH ROW EXECUTE FUNCTION acumular_horas_uso();

-- Trigger 3: Reset ciclo al completar OTM
CREATE OR REPLACE FUNCTION reset_ciclo_on_otm_complete() RETURNS trigger AS $$
BEGIN
  IF NEW.estado = 'Completado' AND OLD.estado != 'Completado' THEN
    UPDATE uso_ciclos SET horas_acumuladas = 0, ultimo_reset = NOW(), otm_ref_id = NEW.id WHERE maquina_id = NEW.maquina_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_reset_ciclo AFTER UPDATE ON ordenes_trabajo FOR EACH ROW EXECUTE FUNCTION reset_ciclo_on_otm_complete();


-- ========================================================================================
-- STEP 5 — ROW LEVEL SECURITY (RLS)
-- ========================================================================================

DO $$
DECLARE 
  t text;
BEGIN
  FOR t IN 
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS acceso_autenticado ON %I;', t);
    EXECUTE format('CREATE POLICY acceso_autenticado ON %I FOR ALL USING (auth.role() = ''authenticated'');', t);
  END LOOP;
END
$$;


-- ========================================================================================
-- STEP 6 — STORAGE BUCKETS
-- ========================================================================================
-- Note: In Supabase, creating buckets is usually done via API or Dashboard. 
-- However, we can create them using the storage schema if permissions allow.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('maquinas-fotos', 'maquinas-fotos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('documentos-otm', 'documentos-otm', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('documentos-taller', 'documentos-taller', false)
ON CONFLICT (id) DO NOTHING;


-- ========================================================================================
-- STEP 7 — SEED DATA
-- ========================================================================================

WITH inst AS (
    INSERT INTO instituciones (nombre) VALUES ('Institución de Mantenimiento Industrial') RETURNING id
),
ar1 AS (INSERT INTO areas (institucion_id, nombre) SELECT id, 'Taller Mecánico' FROM inst RETURNING id),
ar2 AS (INSERT INTO areas (institucion_id, nombre) SELECT id, 'Taller Eléctrico' FROM inst RETURNING id),
ar3 AS (INSERT INTO areas (institucion_id, nombre) SELECT id, 'Producción' FROM inst RETURNING id),
t1 AS (INSERT INTO tipos_mantenimiento (institucion_id, nombre, color, frecuencia, duracion_min) SELECT id, 'Preventivo Diario', '#22C55E', 'Diario', 30 FROM inst RETURNING id),
t2 AS (INSERT INTO tipos_mantenimiento (institucion_id, nombre, color, frecuencia, duracion_min) SELECT id, 'Preventivo Semanal', '#3B82F6', 'Semanal', 60 FROM inst RETURNING id),
t3 AS (INSERT INTO tipos_mantenimiento (institucion_id, nombre, color, frecuencia, duracion_min) SELECT id, 'Preventivo Mensual', '#8B5CF6', 'Mensual', 120 FROM inst RETURNING id),
t4 AS (INSERT INTO tipos_mantenimiento (institucion_id, nombre, color, frecuencia, duracion_min) SELECT id, 'Correctivo', '#EF4444', 'A condicion', 240 FROM inst RETURNING id),
t5 AS (INSERT INTO tipos_mantenimiento (institucion_id, nombre, color, frecuencia, duracion_min) SELECT id, 'Taller Externo', '#F59E0B', 'A condicion', 480 FROM inst RETURNING id),
maq AS (
    INSERT INTO maquinas (institucion_id, area_id, codigo, codigo_patrimonial, nombre, marca, modelo, anio_fabricacion, anio_adquisicion, costo, estado, criticidad, potencia_kw, voltaje_v, peso_kg, umbral_horas_ciclo, umbral_dias_maximos, umbral_alerta_pct, turno_operacion, dias_operacion)
    SELECT inst.id, ar1.id, 'FRS-001', 'PAT-001', 'Fresadora/Taladro-Fresadora', 'OPTIMUM', 'ZX7032', 2014, 2015, 5800, 'Operativo', 'Alto', 1.5, 220, 400, 30, 7, 80, 'Mañana', ARRAY['L','M','X','J','V']
    FROM inst, ar1
    RETURNING id
),
uciclo AS (
    INSERT INTO uso_ciclos (maquina_id, horas_acumuladas, iniciado_en)
    SELECT id, 26, NOW() - INTERVAL '6 days' FROM maq
    RETURNING id
),
cc1 AS (INSERT INTO componentes_criticos (maquina_id, numero, nombre, estado, criticidad) SELECT id, 1, 'Correas trapezoidales', 'Regular', 'Alto' FROM maq RETURNING id),
cc2 AS (INSERT INTO componentes_criticos (maquina_id, numero, nombre, estado, criticidad) SELECT id, 2, 'Guías de desplazamiento', 'Bueno', 'Medio' FROM maq RETURNING id),
cc3 AS (INSERT INTO componentes_criticos (maquina_id, numero, nombre, estado, criticidad) SELECT id, 3, 'Husillo principal', 'Bueno', 'Alto' FROM maq RETURNING id),
cc4 AS (INSERT INTO componentes_criticos (maquina_id, numero, nombre, estado, criticidad) SELECT id, 4, 'Rodamientos del husillo', 'Regular', 'Medio' FROM maq RETURNING id),
cc5 AS (INSERT INTO componentes_criticos (maquina_id, numero, nombre, estado, criticidad) SELECT id, 5, 'Motor eléctrico', 'Bueno', 'Bajo' FROM maq RETURNING id)
INSERT INTO notificaciones (maquina_id, tipo, titulo, mensaje, leida, accion_tipo)
SELECT id, 'warning', 'Mantenimiento próximo — FRS-001', 'La Fresadora ZX7032 ha alcanzado el 87% de su ciclo de uso. Horas actuales: 26h de 30h. Programar mantenimiento preventivo.', false, 'programar_otm' FROM maq;
