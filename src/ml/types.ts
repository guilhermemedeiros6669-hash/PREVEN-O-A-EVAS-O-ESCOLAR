export type FeatureKey =
  | 'Frequencia_Pct'
  | 'Media_Notas'
  | 'Faltas_Consecutivas'
  | 'Historico_Reprovacoes'
  | 'Distorcao_Idade_Serie'
  | 'Turno_Noturno'
  | 'INSE_Nivel'
  | 'Barreira_Transporte';

export type FeatureCategory = 'Acadêmico' | 'Social (INEP)';

export type RiskLevel = 'Alto Risco' | 'Risco Médio' | 'Baixo Risco';

export interface PublicPolicyAction {
  programa: string;
  orgao: string;
  esfera: 'Federal / Estadual' | 'Municipal / Intersetorial' | 'Sistema de Garantia';
  comoAcionar: string;
}

export interface InterventionPlan {
  objetivo: string;
  acaoPedagogica: string;
  articulacaoSocial: string;
  prazo: string;
  responsavel: string;
  politicasPublicas: PublicPolicyAction[];
}

export interface StudentRecord {
  ID_Aluno: string;
  Serie_Etapa: string;
  Idade: number;
  Frequencia_Pct: number;
  Media_Notas: number;
  Faltas_Consecutivas: number;
  Historico_Reprovacoes: number;
  Distorcao_Idade_Serie: number; // anos de atraso (>= 0)
  Turno_Noturno: 0 | 1; // 0 = Diurno, 1 = Noturno
  INSE_Nivel: number; // 1 (Muito Baixo) a 7 (Muito Alto) - escala INEP
  Barreira_Transporte: 0 | 1 | 2; // 0 = Acesso regular, 1 = Rota parcial/distante, 2 = Barreira crítica sem transporte
  Status_Evasao: 0 | 1;
}

export interface StudentEvaluation extends StudentRecord {
  probabilidadeRisco: number;
  riscoPct: number;
  nivelRisco: RiskLevel;
  fatorCritico: FeatureKey;
  categoriaFatorCritico: FeatureCategory;
  motivoPrincipal: string;
  contribuicoesPct: Record<FeatureKey, number>;
  planoIntervencao: InterventionPlan;
  isManual?: boolean;
}

export interface ConfusionMatrix {
  tn: number;
  fp: number;
  fn: number;
  tp: number;
}

export interface GlobalFeatureImportance {
  feature: FeatureKey;
  label: string;
  category: FeatureCategory;
  importancePct: number;
}

export interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  trainSize: number;
  testSize: number;
  dropoutRatePct: number;
  socialWeightSharePct: number;
  confusionMatrix: ConfusionMatrix;
  globalImportance: GlobalFeatureImportance[];
}
