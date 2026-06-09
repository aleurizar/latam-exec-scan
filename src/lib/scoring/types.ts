// ============================================================================
// TYPES - Motor de Calificación de Sellers
// ============================================================================
// Archivo: src/types/scoring.ts
// Purpose: Tipos TypeScript para CONFIG_MOTOR, EMPRESA_SCORES, CONTACTO_SCORES, REGISTRO_FINAL_OUTREACH

import { z } from 'zod';

// ============================================================================
// ENUMS
// ============================================================================
export enum Clasificacion {
  ALTO = 'ALTO',
  MEDIO = 'MEDIO',
  BAJO = 'BAJO',
  BÁSICO = 'BÁSICO',
}

export enum ConfidenceLevel {
  ALTA = 'Alta',
  MEDIA = 'Media',
  BAJA = 'Baja',
}

export enum EmailType {
  CORPORATE = 'corporate',
  GENERIC = 'generic',
}

export enum MLStatus {
  TIENDA_OFICIAL = 'Tienda Oficial',
  BUY_BOX = 'Buy Box',
}

// ============================================================================
// TIPOS BASE PARA CONFIG_MOTOR
// ============================================================================

// Pesos dimensionales y subdimensionales
export interface PesosConfig {
  dimensiones: {
    relevancia: number; // 0-1
    confianza: number;
    contactabilidad: number;
  };
  subdimensiones?: {
    relevancia?: {
      ventas_totales: number;
      mercadolider: number;
    };
    confianza?: {
      website: number;
      linkedin: number;
      email_type: number;
      consistencia: number;
    };
    contactabilidad?: {
      email: number;
      telefono: number;
      whatsapp: number;
      rrss: number;
    };
  };
}

// Escalas de valores (mapeo de valores reales a scores 0-100)
export interface EscalasConfig {
  ventas_totales?: {
    [key: string]: number; // e.g., "500k-plus": 100, "250k-500k": 85
  };
  empleados?: {
    [key: string]: number;
  };
  [key: string]: any;
}

// Gates / Reglas bloqueantes
export interface GateConfig {
  id: string; // e.g., "GATE_NO_CANALES", "GATE_BAJA_RELEVANCIA"
  name: string;
  description: string;
  severity: 'bloqueante' | 'media' | 'baja';
  condition: string; // Human-readable condition
  max_clasificacion?: Clasificacion; // Si se activa, máximo a esta clasificación
}

// Umbrales para clasificación final
export interface UmbralesClasificacion {
  ALTO: [number, number]; // [80, 100]
  MEDIO: [number, number]; // [60, 79]
  BAJO: [number, number]; // [40, 59]
  BÁSICO: [number, number]; // [0, 39]
}

// Estructura completa de config_json
export interface ConfigMotorJSON {
  version: number;
  motor_type: string;
  pesos: PesosConfig;
  escalas: EscalasConfig;
  gates: GateConfig[];
  umbrales_clasificacion: UmbralesClasificacion;
  descripcion?: string;
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// TABLE TYPES
// ============================================================================

// CONFIG_MOTOR (database table)
export interface ConfigMotor {
  id: number;
  version_number: number;
  motor_type: string;
  config_json: ConfigMotorJSON;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
  description: string | null;
}

// EMPRESA_SCORES (database table)
export interface EmpresaScores {
  id: number;
  empresa_id: number;
  config_motor_id: number;
  score_relevancia: number;
  score_confianza: number;
  score_contactabilidad: number;
  score_final: number;
  clasificacion: Clasificacion;
  gates_applied: string[] | null;
  reasoning_json: ReasoningEmpresa | null;
  is_current: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

// Reasoning detail for empresa
export interface ReasoningEmpresa {
  score_relevancia?: {
    ventas_score: number;
    mercadolider_score: number;
    ponderado: number;
    explicacion: string;
  };
  score_confianza?: {
    website: number;
    linkedin: number;
    email_type: number;
    consistencia: number;
    ponderado: number;
    explicacion: string;
  };
  score_contactabilidad?: {
    email: number;
    telefono: number;
    whatsapp: number;
    rrss: number;
    ponderado: number;
    explicacion: string;
  };
  gates?: Array<{
    gate_id: string;
    triggered: boolean;
    impact: string;
  }>;
  final_note: string;
}

// CONTACTO_SCORES (database table)
export interface ContactoScores {
  id: number;
  contacto_id: number;
  empresa_id: number;
  config_motor_id: number;
  score_seniority: number;
  score_relevancia_rol: number;
  score_contactabilidad: number;
  score_final: number;
  clasificacion: Clasificacion;
  gates_applied: string[] | null;
  reasoning_json: ReasoningContacto | null;
  is_current: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

// Reasoning detail for contacto
export interface ReasoningContacto {
  score_seniority?: {
    seniority_level: string;
    score: number;
    explicacion: string;
  };
  score_relevancia_rol?: {
    rol: string;
    es_buyer_persona: boolean;
    score: number;
    explicacion: string;
  };
  score_contactabilidad?: {
    email_verified: boolean;
    email_type: string;
    phone: boolean;
    whatsapp: boolean;
    linkedin: boolean;
    ponderado: number;
    explicacion: string;
  };
  gates?: Array<{
    gate_id: string;
    triggered: boolean;
    impact: string;
  }>;
  final_note: string;
}

// REGISTRO_FINAL_OUTREACH (database table)
export interface RegistroFinalOutreach {
  id: number;
  empresa_id: number;
  contacto_id_primario: number | null;
  empresa_scores_id: number | null;
  contacto_scores_id: number | null;
  score_final_outreach: number;
  clasificacion_final: Clasificacion;
  ready_to_outreach: boolean;
  priority_rank: number | null;
  channel_recomendado: 'email' | 'whatsapp' | 'linkedin' | 'phone' | null;
  prepared_for_crm: boolean;
  prepared_for_lemlist: boolean;
  prepared_for_instantly: boolean;
  universo_sellers: string | null;
  source_data: SourceDataJSON | null;
  last_sent_to_platform: string | null;
  last_sent_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

// Source data tracking
export interface SourceDataJSON {
  empresa_sources?: string[];
  contacto_sources?: string[];
  enrichment_date?: string;
  processing_time_ms?: number;
  [key: string]: any;
}

// ============================================================================
// ZOD SCHEMAS (for validation)
// ============================================================================

const PesosConfigSchema = z.object({
  dimensiones: z.object({
    relevancia: z.number().min(0).max(1),
    confianza: z.number().min(0).max(1),
    contactabilidad: z.number().min(0).max(1),
  }),
  subdimensiones: z.optional(z.record(z.any())),
});

const GateConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  severity: z.enum(['bloqueante', 'media', 'baja']),
  condition: z.string(),
  max_clasificacion: z.enum(['ALTO', 'MEDIO', 'BAJO', 'BÁSICO']).optional(),
});

const UmbralesSchema = z.object({
  ALTO: z.tuple([z.number(), z.number()]),
  MEDIO: z.tuple([z.number(), z.number()]),
  BAJO: z.tuple([z.number(), z.number()]),
  BÁSICO: z.tuple([z.number(), z.number()]),
});

export const ConfigMotorJSONSchema = z.object({
  version: z.number(),
  motor_type: z.string(),
  pesos: PesosConfigSchema,
  escalas: z.record(z.any()),
  gates: z.array(GateConfigSchema),
  umbrales_clasificacion: UmbralesSchema,
  descripcion: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const ConfigMotorSchema = z.object({
  id: z.number(),
  version_number: z.number(),
  motor_type: z.string(),
  config_json: ConfigMotorJSONSchema,
  is_active: z.boolean(),
  created_at: z.string(),
  created_by: z.string().nullable(),
  updated_at: z.string(),
  updated_by: z.string().nullable(),
  description: z.string().nullable(),
});

export const EmpresaScoresSchema = z.object({
  id: z.number(),
  empresa_id: z.number(),
  config_motor_id: z.number(),
  score_relevancia: z.number(),
  score_confianza: z.number(),
  score_contactabilidad: z.number(),
  score_final: z.number(),
  clasificacion: z.enum(['ALTO', 'MEDIO', 'BAJO', 'BÁSICO']),
  gates_applied: z.array(z.string()).nullable(),
  reasoning_json: z.record(z.any()).nullable(),
  is_current: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
  created_by: z.string().nullable(),
});

export const ContactoScoresSchema = z.object({
  id: z.number(),
  contacto_id: z.number(),
  empresa_id: z.number(),
  config_motor_id: z.number(),
  score_seniority: z.number(),
  score_relevancia_rol: z.number(),
  score_contactabilidad: z.number(),
  score_final: z.number(),
  clasificacion: z.enum(['ALTO', 'MEDIO', 'BAJO', 'BÁSICO']),
  gates_applied: z.array(z.string()).nullable(),
  reasoning_json: z.record(z.any()).nullable(),
  is_current: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
  created_by: z.string().nullable(),
});

export const RegistroFinalOutreachSchema = z.object({
  id: z.number(),
  empresa_id: z.number(),
  contacto_id_primario: z.number().nullable(),
  empresa_scores_id: z.number().nullable(),
  contacto_scores_id: z.number().nullable(),
  score_final_outreach: z.number(),
  clasificacion_final: z.enum(['ALTO', 'MEDIO', 'BAJO', 'BÁSICO']),
  ready_to_outreach: z.boolean(),
  priority_rank: z.number().nullable(),
  channel_recomendado: z.enum(['email', 'whatsapp', 'linkedin', 'phone']).nullable(),
  prepared_for_crm: z.boolean(),
  prepared_for_lemlist: z.boolean(),
  prepared_for_instantly: z.boolean(),
  universo_sellers: z.string().nullable(),
  source_data: z.record(z.any()).nullable(),
  last_sent_to_platform: z.string().nullable(),
  last_sent_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  created_by: z.string().nullable(),
});

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface ScoringInput {
  empresa_id: number;
  empresa_data: {
    ventas_totales?: number;
    mercadolider?: boolean;
    website?: string;
    linkedin_url?: string;
    email_corporate?: string;
    phone?: string;
    whatsapp?: string;
    rrss_count?: number;
    [key: string]: any;
  };
  contacto_data?: {
    seniority?: string;
    cargo?: string;
    email?: string;
    email_verified?: boolean;
    phone?: string;
    whatsapp?: string;
    linkedin_url?: string;
    [key: string]: any;
  };
}

export interface ScoringResult {
  empresa_scores: EmpresaScores;
  contacto_scores?: ContactoScores;
  registro_final: RegistroFinalOutreach;
  processing_metadata: {
    duration_ms: number;
    gates_triggered: string[];
    warnings: string[];
  };
}
