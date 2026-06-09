// ============================================================================
// SCORING FUNCTIONS - CONTACTO (Contact/Executive Scoring)
// ============================================================================
// Archivo: src/lib/scoring/contacto.ts
// Purpose: Functions to calculate contacto scores: seniority, relevancia_rol, contactabilidad, and apply gates

import { 
  Clasificacion, 
  ConfigMotorJSON, 
  ReasoningContacto,
  ContactoScores 
} from './types';

/**
 * Calcula Score de Seniority del contacto
 * Basado en: nivel jerárquico (C-level, Director, Manager, etc.)
 */
export function calcularScoreSeniority(contacto: {
  seniority?: string;
  position?: string;
  title?: string;
}): { score: number; reasoning: any } {
  let seniorityScore = 0;
  const seniorityLevel = (contacto.seniority || contacto.position || contacto.title || '').toLowerCase();

  // Mapeo de seniority a scores
  if (seniorityLevel.includes('c-level') || seniorityLevel.includes('ceo') || seniorityLevel.includes('cto') || seniorityLevel.includes('cfo')) {
    seniorityScore = 100;
  } else if (seniorityLevel.includes('director') || seniorityLevel.includes('head of')) {
    seniorityScore = 90;
  } else if (seniorityLevel.includes('manager') || seniorityLevel.includes('gerente')) {
    seniorityScore = 75;
  } else if (seniorityLevel.includes('coordinator') || seniorityLevel.includes('specialist')) {
    seniorityScore = 55;
  } else if (seniorityLevel.includes('associate') || seniorityLevel.includes('junior')) {
    seniorityScore = 35;
  } else {
    seniorityScore = 45; // Default para seniority desconocido
  }

  return {
    score: seniorityScore,
    reasoning: {
      seniority_level: contacto.seniority || contacto.position || contacto.title || 'Unknown',
      score: seniorityScore,
      explicacion: `Seniority detectado: ${contacto.seniority || contacto.position || contacto.title || 'Desconocido'}`,
    },
  };
}

/**
 * Calcula Score de Relevancia del Rol
 * Basado en: si es buyer persona (E-commerce Manager, Director Ecommerce, etc.)
 * ICP definido: Ecommerce Manager, Director Ecommerce, dueño, founder
 */
export function calcularScoreRelevanciaRol(contacto: {
  cargo?: string;
  position?: string;
  title?: string;
  departamento?: string;
  department?: string;
}): { score: number; reasoning: any } {
  const rol = (contacto.cargo || contacto.position || contacto.title || '').toLowerCase();
  const departamento = (contacto.departamento || contacto.department || '').toLowerCase();

  let relevanciaScore = 0;
  let esBuyerPersona = false;

  // Buyer persona prioritarios (ICP)
  if (
    rol.includes('ecommerce manager') ||
    rol.includes('ecommerce director') ||
    rol.includes('director ecommerce') ||
    rol.includes('gerente ecommerce') ||
    rol.includes('ceo') ||
    rol.includes('founder') ||
    rol.includes('owner') ||
    rol.includes('dueño')
  ) {
    relevanciaScore = 100;
    esBuyerPersona = true;
  }
  // Secondary targets
  else if (
    rol.includes('sales manager') ||
    rol.includes('marketing manager') ||
    rol.includes('operations manager') ||
    rol.includes('business manager') ||
    departamento.includes('ecommerce') ||
    departamento.includes('ventas')
  ) {
    relevanciaScore = 75;
    esBuyerPersona = true;
  }
  // Lower relevance
  else if (
    rol.includes('analyst') ||
    rol.includes('coordinator') ||
    rol.includes('assistant')
  ) {
    relevanciaScore = 45;
  } else {
    relevanciaScore = 30; // Default bajo para roles no claros
  }

  return {
    score: relevanciaScore,
    reasoning: {
      rol: contacto.cargo || contacto.position || contacto.title || 'Unknown',
      es_buyer_persona: esBuyerPersona,
      score: relevanciaScore,
      explicacion: `Rol: ${contacto.cargo || contacto.position || contacto.title}. Buyer Persona: ${esBuyerPersona ? 'Sí' : 'No'}`,
    },
  };
}

/**
 * Calcula Score de Contactabilidad del contacto
 * Basado en: email_verified (35%) + phone (25%) + whatsapp (25%) + linkedin (15%)
 */
export function calcularScoreContactabilidadContacto(contacto: {
  email?: string;
  email_verified?: boolean;
  email_type?: string;
  phone?: string;
  whatsapp?: string;
  linkedin_url?: string;
}): { score: number; reasoning: any } {
  let emailScore = 0;
  let phoneScore = 0;
  let whatsappScore = 0;
  let linkedinScore = 0;

  // Email: verificado=100, no verificado=50, ausente=0
  if (contacto.email) {
    emailScore = contacto.email_verified ? 100 : (contacto.email_type === 'corporate' ? 80 : 50);
  } else {
    emailScore = 0;
  }

  // Teléfono: 100 si existe
  phoneScore = contacto.phone ? 100 : 0;

  // WhatsApp: 100 si existe
  whatsappScore = contacto.whatsapp ? 100 : 0;

  // LinkedIn: 100 si existe
  linkedinScore = contacto.linkedin_url ? 100 : 0;

  const ponderado = emailScore * 0.35 + phoneScore * 0.25 + whatsappScore * 0.25 + linkedinScore * 0.15;

  return {
    score: Math.round(ponderado * 100) / 100,
    reasoning: {
      email_verified: contacto.email_verified || false,
      email_type: contacto.email_type || 'none',
      email: emailScore,
      phone: phoneScore,
      whatsapp: whatsappScore,
      linkedin: linkedinScore,
      ponderado: Math.round(ponderado * 100) / 100,
      explicacion: `Email: ${emailScore}, Teléfono: ${phoneScore}, WhatsApp: ${whatsappScore}, LinkedIn: ${linkedinScore}`,
    },
  };
}

/**
 * Aplica GATES (reglas bloqueantes) a los scores de contacto
 */
export function aplicarGatesContacto(
  scores: {
    seniority: number;
    relevancia_rol: number;
    contactabilidad: number;
    final: number;
  },
  contacto: {
    email?: string;
    email_verified?: boolean;
    phone?: string;
    whatsapp?: string;
  },
  config: ConfigMotorJSON
): { gates_applied: string[]; max_clasificacion?: Clasificacion } {
  const gatesTriggered: string[] = [];
  let maxClasificacion: Clasificacion | undefined = undefined;

  // GATE 1: Sin canales de contacto -> máx BAJO
  const tieneCanales = !!(contacto.email || contacto.phone || contacto.whatsapp);
  if (!tieneCanales) {
    gatesTriggered.push('GATE_CONTACTO_NO_CANALES');
    maxClasificacion = Clasificacion.BAJO;
  }

  // GATE 2: Email no verificado Y sin teléfono -> máx MEDIO
  const emailNoVerificado = contacto.email && !contacto.email_verified;
  const sinTelefono = !contacto.phone && !contacto.whatsapp;
  if (emailNoVerificado && sinTelefono) {
    gatesTriggered.push('GATE_CONTACTO_EMAIL_NO_VERIFICADO');
    if (!maxClasificacion || maxClasificacion === Clasificacion.ALTO) {
      maxClasificacion = Clasificacion.MEDIO;
    }
  }

  // GATE 3: Baja relevancia de rol (< 40) -> máx BAJO
  if (scores.relevancia_rol < 40) {
    gatesTriggered.push('GATE_CONTACTO_ROL_BAJO');
    if (!maxClasificacion) maxClasificacion = Clasificacion.BAJO;
  }

  return {
    gates_applied: gatesTriggered,
    max_clasificacion: maxClasificacion,
  };
}

/**
 * Clasifica contacto según score final
 */
export function clasificarContacto(
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
export function aplicarGatesAClasificacionContacto(
  clasificacion: Clasificacion,
  gatesData: { gates_applied: string[]; max_clasificacion?: Clasificacion }
): Clasificacion {
  if (!gatesData.max_clasificacion) return clasificacion;

  const ranking = [Clasificacion.ALTO, Clasificacion.MEDIO, Clasificacion.BAJO, Clasificacion.BÁSICO];
  const rankingActual = ranking.indexOf(clasificacion);
  const rankingMax = ranking.indexOf(gatesData.max_clasificacion);

  if (rankingMax >= rankingActual) {
    return clasificacion;
  }
  return gatesData.max_clasificacion;
}

/**
 * FUNCIÓN PRINCIPAL: Calcula Score Final de Contacto
 * Orquesta: seniority (40%) + relevancia_rol (35%) + contactabilidad (25%)
 * Aplica gates
 * Retorna clasificación ALTO/MEDIO/BAJO/BÁSICO
 */
export function calcularScoreFinalContacto(
  contacto: {
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
  },
  config: ConfigMotorJSON
): {
  score_final: number;
  clasificacion: Clasificacion;
  reasoning: ReasoningContacto;
  gates_applied: string[];
} {
  // Step 1: Calcular cada dimensión
  const seniority = calcularScoreSeniority(contacto);
  const relevanciaRol = calcularScoreRelevanciaRol(contacto);
  const contactabilidad = calcularScoreContactabilidadContacto(contacto);

  // Step 2: Ponderar dimensiones (40% / 35% / 25%)
  // Si no existen pesos específicos para contacto, usamos estos defaults
  const pesosContacto = config.pesos.subdimensiones?.contacto || {
    seniority: 0.40,
    relevancia_rol: 0.35,
    contactabilidad: 0.25,
  };

  const scoreFinal =
    seniority.score * (pesosContacto.seniority || 0.40) +
    relevanciaRol.score * (pesosContacto.relevancia_rol || 0.35) +
    contactabilidad.score * (pesosContacto.contactabilidad || 0.25);

  const scoreRedondeado = Math.round(scoreFinal * 100) / 100;

  // Step 3: Aplicar gates
  const gatesResult = aplicarGatesContacto(
    {
      seniority: seniority.score,
      relevancia_rol: relevanciaRol.score,
      contactabilidad: contactabilidad.score,
      final: scoreRedondeado,
    },
    contacto,
    config
  );

  // Step 4: Clasificar
  let clasificacion = clasificarContacto(scoreRedondeado, config.umbrales_clasificacion);
  clasificacion = aplicarGatesAClasificacionContacto(clasificacion, gatesResult);

  // Step 5: Generar reasoning
  const reasoning: ReasoningContacto = {
    score_seniority: seniority.reasoning,
    score_relevancia_rol: relevanciaRol.reasoning,
    score_contactabilidad: contactabilidad.reasoning,
    gates: gatesResult.gates_applied.map((gate) => ({
      gate_id: gate,
      triggered: true,
      impact: gate === 'GATE_CONTACTO_NO_CANALES' ? 'bloqueante' : 'media',
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
 * Valida que contacto tenga datos mínimos requeridos
 */
export function validarContactoParaScoring(contacto: any): {
  valido: boolean;
  errores: string[];
} {
  const errores: string[] = [];

  if (!contacto.id) errores.push('Contacto debe tener ID');

  // Validar que al menos tenga un canal de contacto
  const tieneCanales = !!(contacto.email || contacto.phone || contacto.whatsapp);
  if (!tieneCanales) {
    errores.push('Contacto debe tener al menos un canal de contacto (email, teléfono o WhatsApp)');
  }

  return {
    valido: errores.length === 0,
    errores,
  };
}

/**
 * Compara scores empresa vs contacto y determina score final outreach
 * Score final = MAX(empresa, contacto) o promedio ponderado según estrategia
 */
export function determinarScoreFinalOutreach(
  scoreEmpresa: number,
  scoreContacto: number,
  estrategia: 'max' | 'average' | 'empresa_weighted' | 'contacto_weighted' = 'contacto_weighted'
): number {
  switch (estrategia) {
    case 'max':
      return Math.max(scoreEmpresa, scoreContacto);
    case 'average':
      return (scoreEmpresa + scoreContacto) / 2;
    case 'empresa_weighted':
      // Empresa 60%, Contacto 40%
      return scoreEmpresa * 0.6 + scoreContacto * 0.4;
    case 'contacto_weighted':
      // Contacto 60%, Empresa 40% (prioriza contacto - recomendado para outreach)
      return scoreContacto * 0.6 + scoreEmpresa * 0.4;
    default:
      return scoreContacto * 0.6 + scoreEmpresa * 0.4;
  }
}

/**
 * Determina canal de contacto recomendado basado en disponibilidad
 */
export function determinarCanalRecomendado(contacto: {
  email?: string;
  email_verified?: boolean;
  phone?: string;
  whatsapp?: string;
  linkedin_url?: string;
}): 'email' | 'whatsapp' | 'linkedin' | 'phone' {
  // Prioridad: email verificado > whatsapp > linkedin > phone
  if (contacto.email && contacto.email_verified) return 'email';
  if (contacto.whatsapp) return 'whatsapp';
  if (contacto.linkedin_url) return 'linkedin';
  if (contacto.phone) return 'phone';
  return 'email'; // default
}
