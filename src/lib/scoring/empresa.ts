// ============================================================================
// SCORING FUNCTIONS - EMPRESA (Company Scoring)
// ============================================================================
// Archivo: src/lib/scoring/empresa.ts
// Purpose: Functions to calculate empresa scores: relevancia, confianza, contactabilidad, and apply gates

import { 
  Clasificacion, 
  ConfigMotorJSON, 
  ReasoningEmpresa,
  EmpresaScores 
} from './types';

/**
 * Calcula Score de Relevancia de la empresa
 * Basado en: ventas_totales (60%) + mercadolider_status (40%)
 */
export function calcularScoreRelevancia(
  empresa: {
    ventas_totales?: number;
    mercadolider?: boolean;
    ml_status?: string;
  },
  escalas: any
): { score: number; reasoning: any } {
  let ventasScore = 0;
  let mercadoliderScore = 0;

  // Ventas: Mapeo a escala 0-100
  if (empresa.ventas_totales) {
    if (empresa.ventas_totales >= 500000) ventasScore = 100;
    else if (empresa.ventas_totales >= 250000) ventasScore = 85;
    else if (empresa.ventas_totales >= 100000) ventasScore = 70;
    else if (empresa.ventas_totales >= 50000) ventasScore = 55;
    else if (empresa.ventas_totales >= 10000) ventasScore = 35;
    else ventasScore = 15;
  }

  // MercadoLíder: Sí=100, No=30
  if (empresa.mercadolider === true) {
    mercadoliderScore = 100;
  } else if (empresa.ml_status === 'Tienda Oficial') {
    mercadoliderScore = 100;
  } else {
    mercadoliderScore = 30;
  }

  const ponderado = ventasScore * 0.6 + mercadoliderScore * 0.4;

  return {
    score: Math.round(ponderado * 100) / 100,
    reasoning: {
      ventas_score: ventasScore,
      ventas_total_value: empresa.ventas_totales || 0,
      mercadolider_score: mercadoliderScore,
      mercadolider_status: empresa.mercadolider || empresa.ml_status || 'No',
      ponderado: Math.round(ponderado * 100) / 100,
      explicacion: `Ventas: ${ventasScore} (${empresa.ventas_totales || 0}), MercadoLíder: ${mercadoliderScore}`,
    },
  };
}

/**
 * Calcula Score de Confianza de la empresa
 * Basado en: website (35%) + linkedin (25%) + email_type (25%) + data_match (15%)
 */
export function calcularScoreConfianza(empresa: {
  website?: string;
  linkedin_url?: string;
  email_corporate?: string;
  email_type?: string;
  data_match_score?: number;
}): { score: number; reasoning: any } {
  let websiteScore = 0;
  let linkedinScore = 0;
  let emailScore = 0;
  let dataMatchScore = 0;

  // Website: Presencia = 100, Ausencia = 30
  websiteScore = empresa.website ? 100 : 30;

  // LinkedIn: Presencia = 100, Ausencia = 30
  linkedinScore = empresa.linkedin_url ? 100 : 30;

  // Email: corporativo=100, genérico=40, ausente=0
  if (empresa.email_corporate) {
    emailScore = empresa.email_type === 'corporate' ? 100 : (empresa.email_type === 'generic' ? 40 : 70);
  } else {
    emailScore = 0;
  }

  // Data Match: uso directo del valor 0-100, si no existe = 0
  dataMatchScore = empresa.data_match_score || 0;

  const ponderado = websiteScore * 0.35 + linkedinScore * 0.25 + emailScore * 0.25 + dataMatchScore * 0.15;

  return {
    score: Math.round(ponderado * 100) / 100,
    reasoning: {
      website: websiteScore,
      linkedin: linkedinScore,
      email_type: emailScore,
      email_type_value: empresa.email_type || 'none',
      data_match: dataMatchScore,
      ponderado: Math.round(ponderado * 100) / 100,
      explicacion: `Website: ${websiteScore}, LinkedIn: ${linkedinScore}, Email: ${emailScore}, Data Match: ${dataMatchScore}`,
    },
  };
}

/**
 * Calcula Score de Contactabilidad de la empresa
 * Basado en: email (35%) + teléfono (25%) + whatsapp (25%) + rrss (15%)
 */
export function calcularScoreContactabilidad(empresa: {
  email_corporate?: string;
  phone?: string;
  whatsapp?: string;
  instagram_url?: string;
  facebook_url?: string;
  twitter_url?: string;
}): { score: number; reasoning: any } {
  let emailScore = 0;
  let phoneScore = 0;
  let whatsappScore = 0;
  let rrssScore = 0;

  // Email: 100 si existe
  emailScore = empresa.email_corporate ? 100 : 0;

  // Teléfono: 100 si existe
  phoneScore = empresa.phone ? 100 : 0;

  // WhatsApp: 100 si existe
  whatsappScore = empresa.whatsapp ? 100 : 0;

  // RRSS: Contar cuántas tiene (máx 3)
  const rrssCount = [
    empresa.instagram_url,
    empresa.facebook_url,
    empresa.twitter_url,
  ].filter(Boolean).length;

  if (rrssCount >= 3) rrssScore = 100;
  else if (rrssCount === 2) rrssScore = 75;
  else if (rrssCount === 1) rrssScore = 50;
  else rrssScore = 0;

  const ponderado = emailScore * 0.35 + phoneScore * 0.25 + whatsappScore * 0.25 + rrssScore * 0.15;

  return {
    score: Math.round(ponderado * 100) / 100,
    reasoning: {
      email: emailScore,
      phone: phoneScore,
      whatsapp: whatsappScore,
      rrss: rrssScore,
      rrss_count: rrssCount,
      ponderado: Math.round(ponderado * 100) / 100,
      explicacion: `Email: ${emailScore}, Teléfono: ${phoneScore}, WhatsApp: ${whatsappScore}, RRSS (${rrssCount}): ${rrssScore}`,
    },
  };
}

/**
 * Aplica GATES (reglas bloqueantes) a los scores de empresa
 * Gates pueden cambiar la clasificación final
 */
export function aplicarGatesEmpresa(
  scores: {
    relevancia: number;
    confianza: number;
    contactabilidad: number;
    final: number;
  },
  empresa: {
    email_corporate?: string;
    phone?: string;
    whatsapp?: string;
  },
  config: ConfigMotorJSON
): { gates_applied: string[]; max_clasificacion?: Clasificacion } {
  const gatesTriggered: string[] = [];
  let maxClasificacion: Clasificacion | undefined = undefined;

  // GATE 1: Sin canales de contacto -> máx BAJO
  const tieneCanales = !!(empresa.email_corporate || empresa.phone || empresa.whatsapp);
  if (!tieneCanales) {
    gatesTriggered.push('GATE_NO_CANALES');
    maxClasificacion = Clasificacion.BAJO;
  }

  // GATE 2: Relevancia muy baja (< 30) -> máx BAJO
  if (scores.relevancia < 30) {
    gatesTriggered.push('GATE_BAJA_RELEVANCIA');
    if (!maxClasificacion) maxClasificacion = Clasificacion.BAJO;
  }

  // GATE 3: Contactabilidad baja (< 60) AND Score >= 80 -> MEDIO (severity media)
  if (scores.contactabilidad < 60 && scores.final >= 80) {
    gatesTriggered.push('GATE_CONTACTABILIDAD_BAJA');
    if (!maxClasificacion || maxClasificacion === Clasificacion.ALTO) {
      maxClasificacion = Clasificacion.MEDIO;
    }
  }

  return {
    gates_applied: gatesTriggered,
    max_clasificacion: maxClasificacion,
  };
}

/**
 * Clasifica empresa según score final
 */
export function clasificarEmpresa(
  scoreFinal: number,
  umbrales: any
): Clasificacion {
  const [altoMin, altoMax] = umbrales.ALTO || [80, 100];
  const [medioMin, medioMax] = umbrales.MEDIO || [60, 79];
  const [bajoMin, bajoMax] = umbrales.BAJO || [40, 59];

  if (scoreFinal >= altoMin && scoreFinal <= altoMax) return Clasificacion.ALTO;
  if (scoreFinal >= medioMin && scoreFinal <= medioMax) return Clasificacion.MEDIO;
  if (scoreFinal >= bajoMin && scoreFinal <= bajoMax) return Clasificacion.BAJO;
  return Clasificacion.BÁSICO;
}

/**
 * Aplica gates a clasificación: si un gate activa, puede bajar la clasificación
 */
export function aplicarGatesAClasificacion(
  clasificacion: Clasificacion,
  gatesData: { gates_applied: string[]; max_clasificacion?: Clasificacion }
): Clasificacion {
  if (!gatesData.max_clasificacion) return clasificacion;

  // Si hay máximo por gate, lo aplicamos
  const ranking = [Clasificacion.ALTO, Clasificacion.MEDIO, Clasificacion.BAJO, Clasificacion.BÁSICO];
  const rankingActual = ranking.indexOf(clasificacion);
  const rankingMax = ranking.indexOf(gatesData.max_clasificacion);

  if (rankingMax >= rankingActual) {
    return clasificacion; // No hay cambio
  }
  return gatesData.max_clasificacion;
}

/**
 * FUNCIÓN PRINCIPAL: Calcula Score Final de Empresa
 * Orquesta: relevancia (35%) + confianza (30%) + contactabilidad (35%)
 * Aplica gates
 * Retorna clasificación ALTO/MEDIO/BAJO/BÁSICO
 */
export function calcularScoreFinalEmpresa(
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
  },
  config: ConfigMotorJSON
): {
  score_final: number;
  clasificacion: Clasificacion;
  reasoning: ReasoningEmpresa;
  gates_applied: string[];
} {
  // Step 1: Calcular cada dimensión
  const relevancia = calcularScoreRelevancia(empresa, config.escalas);
  const confianza = calcularScoreConfianza(empresa);
  const contactabilidad = calcularScoreContactabilidad(empresa);

  // Step 2: Ponderar dimensiones
  const pesos = config.pesos.dimensiones;
  const scoreFinal =
    relevancia.score * pesos.relevancia +
    confianza.score * pesos.confianza +
    contactabilidad.score * pesos.contactabilidad;

  const scoreRedondeado = Math.round(scoreFinal * 100) / 100;

  // Step 3: Aplicar gates
  const gatesResult = aplicarGatesEmpresa(
    {
      relevancia: relevancia.score,
      confianza: confianza.score,
      contactabilidad: contactabilidad.score,
      final: scoreRedondeado,
    },
    empresa,
    config
  );

  // Step 4: Clasificar
  let clasificacion = clasificarEmpresa(scoreRedondeado, config.umbrales_clasificacion);
  clasificacion = aplicarGatesAClasificacion(clasificacion, gatesResult);

  // Step 5: Generar reasoning
  const reasoning: ReasoningEmpresa = {
    score_relevancia: relevancia.reasoning,
    score_confianza: confianza.reasoning,
    score_contactabilidad: contactabilidad.reasoning,
    gates: gatesResult.gates_applied.map((gate) => ({
      gate_id: gate,
      triggered: true,
      impact: gate === 'GATE_NO_CANALES' ? 'bloqueante' : 'media',
    })),
    final_note: `Score Final: ${scoreRedondeado}. Clasificación: ${clasificacion}. Gates: ${gatesResult.gates_applied.join(', ') || 'ninguno'}`,
  };

  return {
    score_final: scoreRedondeado,
    clasificacion,
    reasoning,
    gates_applied: gatesResult.gates_applied,
  };
}

/**
 * Valida que empresa tenga datos mínimos requeridos
 */
export function validarEmpresaParaScoring(empresa: any): {
  valido: boolean;
  errores: string[];
} {
  const errores: string[] = [];

  if (!empresa.id) errores.push('Empresa debe tener ID');

  // Validar que al menos tenga un canal de contacto
  const tieneCanales = !!(empresa.email_corporate || empresa.phone || empresa.whatsapp);
  if (!tieneCanales) {
    errores.push('Empresa debe tener al menos un canal de contacto (email, teléfono o WhatsApp)');
  }

  return {
    valido: errores.length === 0,
    errores,
  };
}
