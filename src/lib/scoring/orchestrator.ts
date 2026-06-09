// ============================================================================
// SCORING ORCHESTRATOR - Executes full scoring pipeline
// ============================================================================
// Archivo: src/lib/scoring/orchestrator.ts
// Purpose: Main orchestrator that runs empresa scoring, contacto scoring, and merges results

import { 
  Clasificacion, 
  ConfigMotorJSON, 
  ScoringInput,
  ScoringResult,
  RegistroFinalOutreach,
  EmpresaScores,
  ContactoScores,
} from './types';

import {
  calcularScoreFinalEmpresa,
  validarEmpresaParaScoring,
} from './empresa';

import {
  calcularScoreFinalContacto,
  validarContactoParaScoring,
  determinarScoreFinalOutreach,
  determinarCanalRecomendado,
} from './contacto';

/**
 * INPUT CONSOLIDADO para scoring
 * Agrupa todos los datos necesarios de empresa y contacto
 */
export interface ScoringInputConsolidado {
  empresa_id: string; // UUID
  empresa: {
    ventas_totales?: number;
    mercadolider?: boolean;
    ml_status?: string;
    website?: string;
    linkedin_url?: string;
    email_corporate?: string;
    email_type?: string;
    data_match_score?: number;
    phone?: string;
    whatsapp?: string;
    instagram_url?: string;
    facebook_url?: string;
    twitter_url?: string;
  };
  contacto?: {
    id: string; // UUID
    seniority?: string;
    position?: string;
    title?: string;
    cargo?: string;
    departamento?: string;
    department?: string;
    email?: string;
    email_verified?: boolean;
    email_type?: string;
    phone?: string;
    whatsapp?: string;
    linkedin_url?: string;
  };
  config: ConfigMotorJSON;
}

/**
 * RESULTADO CONSOLIDADO
 * Contiene scores empresa, contacto, y registro final listo para outreach
 */
export interface ScoringResultadoConsolidado {
  empresa_scores: EmpresaScores | null;
  contacto_scores: ContactoScores | null;
  registro_final_outreach: RegistroFinalOutreach;
  validaciones: {
    empresa_valida: boolean;
    empresa_errores: string[];
    contacto_valida: boolean;
    contacto_errores: string[];
  };
  metadata: {
    duration_ms: number;
    timestamp: string;
    config_version: number;
  };
}

/**
 * FUNCIÓN PRINCIPAL: Ejecuta el pipeline completo de scoring
 * 
 * Flujo:
 * 1. Validar empresa
 * 2. Calcular scores empresa
 * 3. Si hay contacto:
 *    - Validar contacto
 *    - Calcular scores contacto
 *    - Mezclar scores
 * 4. Crear REGISTRO_FINAL_OUTREACH
 * 5. Determinar si está listo para outreach
 */
export async function ejecutarScoringCompleto(
  input: ScoringInputConsolidado
): Promise<ScoringResultadoConsolidado> {
  const startTime = performance.now();

  // PASO 1: Validar empresa
  const validacionEmpresa = validarEmpresaParaScoring(input.empresa);
  if (!validacionEmpresa.valido) {
    throw new Error(`Empresa inválida: ${validacionEmpresa.errores.join(', ')}`);
  }

  // PASO 2: Calcular scores empresa
  const scoringEmpresa = calcularScoreFinalEmpresa(input.empresa, input.config);

  // PASO 3: Procesamiento de contacto (si existe)
  let scoringContacto = null;
  let validacionContacto = { valido: true, errores: [] };

  if (input.contacto && input.contacto.id) {
    validacionContacto = validarContactoParaScoring(input.contacto);
    if (validacionContacto.valido) {
      scoringContacto = calcularScoreFinalContacto(input.contacto, input.config);
    }
  }

  // PASO 4: Calcular score final outreach
  // Si no hay contacto, usar score empresa. Si hay, mezclar con prioridad a contacto.
  let scoreFinalOutreach: number;
  let clasificacionFinal: Clasificacion;
  let canalRecomendado: 'email' | 'whatsapp' | 'linkedin' | 'phone' = 'email';

  if (scoringContacto) {
    // Hay contacto: mezclar scores (contacto 60%, empresa 40%)
    scoreFinalOutreach = determinarScoreFinalOutreach(
      scoringEmpresa.score_final,
      scoringContacto.score_final,
      'contacto_weighted'
    );
    
    // Clasificación: usar la mejor de contacto vs empresa, pero aplicar gates
    const scores = [scoringEmpresa.clasificacion, scoringContacto.clasificacion];
    const ranking = [Clasificacion.ALTO, Clasificacion.MEDIO, Clasificacion.BAJO, Clasificacion.BÁSICO];
    const mejorClasificacion = scores.reduce((prev, curr) => {
      return ranking.indexOf(prev) < ranking.indexOf(curr) ? prev : curr;
    });
    clasificacionFinal = mejorClasificacion;
    
    // Canal recomendado desde contacto
    canalRecomendado = determinarCanalRecomendado(input.contacto!);
  } else {
    // Sin contacto: usar solo score empresa
    scoreFinalOutreach = scoringEmpresa.score_final;
    clasificacionFinal = scoringEmpresa.clasificacion;
    canalRecomendado = 'email'; // default
  }

  // PASO 5: Determinar si está listo para outreach
  // Reglas: ALTO = ready, MEDIO = ready, BAJO/BÁSICO = not ready
  const readyToOutreach = [Clasificacion.ALTO, Clasificacion.MEDIO].includes(clasificacionFinal);

  // PASO 6: Calcular priority rank (0-100 inversamente, mejor score = rank menor)
  const priorityRank = Math.max(1, 100 - Math.round(scoreFinalOutreach));

  // PASO 7: Crear REGISTRO_FINAL_OUTREACH
  const registroFinal: RegistroFinalOutreach = {
    id: 0, // Se asigna en la DB
    empresa_id: input.empresa_id as any, // Será UUID en la DB
    contacto_id_primario: input.contacto?.id as any || null,
    empresa_scores_id: null, // Se asigna post-save
    contacto_scores_id: null, // Se asigna post-save
    score_final_outreach: Math.round(scoreFinalOutreach * 100) / 100,
    clasificacion_final: clasificacionFinal,
    ready_to_outreach: readyToOutreach,
    priority_rank: readyToOutreach ? priorityRank : null,
    channel_recomendado: canalRecomendado,
    prepared_for_crm: false,
    prepared_for_lemlist: false,
    prepared_for_instantly: false,
    universo_sellers: null,
    source_data: {
      empresa_sources: ['internal', 'enriquecimiento'],
      contacto_sources: input.contacto ? ['apollo', 'linkedin'] : [],
      enrichment_date: new Date().toISOString(),
      processing_time_ms: Math.round(performance.now() - startTime),
    },
    last_sent_to_platform: null,
    last_sent_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: null,
  };

  // PASO 8: Compilar resultado consolidado
  const endTime = performance.now();

  const resultado: ScoringResultadoConsolidado = {
    empresa_scores: validacionEmpresa.valido
      ? {
          id: 0,
          empresa_id: input.empresa_id as any,
          config_motor_id: 0,
          score_relevancia: scoringEmpresa.reasoning.score_relevancia?.ponderado || 0,
          score_confianza: scoringEmpresa.reasoning.score_confianza?.ponderado || 0,
          score_contactabilidad: scoringEmpresa.reasoning.score_contactabilidad?.ponderado || 0,
          score_final: scoringEmpresa.score_final,
          clasificacion: scoringEmpresa.clasificacion,
          gates_applied: scoringEmpresa.gates_applied,
          reasoning_json: scoringEmpresa.reasoning,
          is_current: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: null,
        }
      : null,
    contacto_scores: validacionContacto.valido && scoringContacto
      ? {
          id: 0,
          contacto_id: input.contacto!.id as any,
          empresa_id: input.empresa_id as any,
          config_motor_id: 0,
          score_seniority: scoringContacto.reasoning.score_seniority?.score || 0,
          score_relevancia_rol: scoringContacto.reasoning.score_relevancia_rol?.score || 0,
          score_contactabilidad: scoringContacto.reasoning.score_contactabilidad?.ponderado || 0,
          score_final: scoringContacto.score_final,
          clasificacion: scoringContacto.clasificacion,
          gates_applied: scoringContacto.gates_applied,
          reasoning_json: scoringContacto.reasoning,
          is_current: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: null,
        }
      : null,
    registro_final_outreach: registroFinal,
    validaciones: {
      empresa_valida: validacionEmpresa.valido,
      empresa_errores: validacionEmpresa.errores,
      contacto_valida: validacionContacto.valido,
      contacto_errores: validacionContacto.errores,
    },
    metadata: {
      duration_ms: Math.round(endTime - startTime),
      timestamp: new Date().toISOString(),
      config_version: input.config.version,
    },
  };

  return resultado;
}

/**
 * Versión simplificada: solo scoring sin persistencia
 * Útil para testing y preview
 */
export function scoringPreview(
  input: ScoringInputConsolidado
): Omit<ScoringResultadoConsolidado, 'empresa_scores' | 'contacto_scores'> {
  const startTime = performance.now();

  // Quick validation
  const validacionEmpresa = validarEmpresaParaScoring(input.empresa);
  const validacionContacto = input.contacto ? validarContactoParaScoring(input.contacto) : { valido: true, errores: [] };

  // Quick scoring (sin crear objetos DB completos)
  const scoringEmpresa = calcularScoreFinalEmpresa(input.empresa, input.config);
  let scoringContacto = null;

  if (input.contacto && validacionContacto.valido) {
    scoringContacto = calcularScoreFinalContacto(input.contacto, input.config);
  }

  // Score final
  const scoreFinalOutreach = scoringContacto
    ? determinarScoreFinalOutreach(
        scoringEmpresa.score_final,
        scoringContacto.score_final,
        'contacto_weighted'
      )
    : scoringEmpresa.score_final;

  const clasificacionFinal = scoringContacto
    ? [scoringEmpresa.clasificacion, scoringContacto.clasificacion].reduce((prev, curr) => {
        const ranking = [Clasificacion.ALTO, Clasificacion.MEDIO, Clasificacion.BAJO, Clasificacion.BÁSICO];
        return ranking.indexOf(prev) < ranking.indexOf(curr) ? prev : curr;
      })
    : scoringEmpresa.clasificacion;

  const readyToOutreach = [Clasificacion.ALTO, Clasificacion.MEDIO].includes(clasificacionFinal);
  const priorityRank = readyToOutreach ? Math.max(1, 100 - Math.round(scoreFinalOutreach)) : null;

  const registroFinal: RegistroFinalOutreach = {
    id: 0,
    empresa_id: input.empresa_id as any,
    contacto_id_primario: input.contacto?.id as any || null,
    empresa_scores_id: null,
    contacto_scores_id: null,
    score_final_outreach: Math.round(scoreFinalOutreach * 100) / 100,
    clasificacion_final: clasificacionFinal,
    ready_to_outreach: readyToOutreach,
    priority_rank: priorityRank,
    channel_recomendado: input.contacto ? determinarCanalRecomendado(input.contacto) : 'email',
    prepared_for_crm: false,
    prepared_for_lemlist: false,
    prepared_for_instantly: false,
    universo_sellers: null,
    source_data: null,
    last_sent_to_platform: null,
    last_sent_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: null,
  };

  const endTime = performance.now();

  return {
    registro_final_outreach: registroFinal,
    validaciones: {
      empresa_valida: validacionEmpresa.valido,
      empresa_errores: validacionEmpresa.errores,
      contacto_valida: validacionContacto.valido,
      contacto_errores: validacionContacto.errores,
    },
    metadata: {
      duration_ms: Math.round(endTime - startTime),
      timestamp: new Date().toISOString(),
      config_version: input.config.version,
    },
  };
}
