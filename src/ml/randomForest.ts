import { createRng, FEATURE_CATEGORIES, FEATURE_LABELS, FEATURES } from './dataset';
import {
  FeatureKey,
  GlobalFeatureImportance,
  InterventionPlan,
  ModelMetrics,
  PublicPolicyAction,
  RiskLevel,
  StudentEvaluation,
  StudentRecord,
} from './types';

interface TreeNode {
  isLeaf: boolean;
  probClass1: number;
  samples: number;
  featureIndex?: number;
  threshold?: number;
  impurityGain?: number;
  left?: TreeNode;
  right?: TreeNode;
}

interface SamplePoint {
  x: number[];
  y: 0 | 1;
  weight: number;
}

export class RandomForestDropoutModel {
  private trees: TreeNode[] = [];
  private featureGiniImportance: number[] = new Array(FEATURES.length).fill(0);

  constructor(
    private nEstimators = 45,
    private maxDepth = 6,
    private minSamplesLeaf = 4,
    private seed = 42
  ) {}

  private extractVector(
    row: Omit<StudentRecord, 'ID_Aluno' | 'Serie_Etapa' | 'Idade' | 'Status_Evasao'>
  ): number[] {
    return [
      row.Frequencia_Pct,
      row.Media_Notas,
      row.Faltas_Consecutivas,
      row.Historico_Reprovacoes,
      row.Distorcao_Idade_Serie,
      row.Turno_Noturno,
      row.INSE_Nivel,
      row.Barreira_Transporte,
    ];
  }

  private weightedGini(samples: SamplePoint[]): { gini: number; p1: number; totalW: number } {
    let w0 = 0;
    let w1 = 0;
    for (const s of samples) {
      if (s.y === 1) w1 += s.weight;
      else w0 += s.weight;
    }
    const totalW = w0 + w1;
    if (totalW === 0) return { gini: 0, p1: 0, totalW: 0 };
    const p0 = w0 / totalW;
    const p1 = w1 / totalW;
    return { gini: 1 - p0 * p0 - p1 * p1, p1, totalW };
  }

  private buildTree(
    samples: SamplePoint[],
    depth: number,
    rng: () => number,
    importanceAccum: number[]
  ): TreeNode {
    const { gini, p1, totalW } = this.weightedGini(samples);

    if (
      depth >= this.maxDepth ||
      samples.length < this.minSamplesLeaf * 2 ||
      gini < 1e-6
    ) {
      return { isLeaf: true, probClass1: p1, samples: samples.length };
    }

    // Random feature subsampling (mtry = 4 out of 8 features)
    const indices = FEATURES.map((_, idx) => idx);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    const candidateFeatures = indices.slice(0, 4);

    let bestGain = 0;
    let bestFeat = -1;
    let bestThreshold = 0;
    let bestLeft: SamplePoint[] = [];
    let bestRight: SamplePoint[] = [];

    for (const featIdx of candidateFeatures) {
      const sorted = [...samples].sort((a, b) => a.x[featIdx] - b.x[featIdx]);
      const values = Array.from(new Set(sorted.map((s) => s.x[featIdx])));
      if (values.length <= 1) continue;

      for (let v = 0; v < values.length - 1; v++) {
        const threshold = (values[v] + values[v + 1]) / 2;
        const left: SamplePoint[] = [];
        const right: SamplePoint[] = [];
        for (const s of sorted) {
          if (s.x[featIdx] <= threshold) left.push(s);
          else right.push(s);
        }

        if (left.length < this.minSamplesLeaf || right.length < this.minSamplesLeaf) {
          continue;
        }

        const gLeft = this.weightedGini(left);
        const gRight = this.weightedGini(right);
        const weightedImpurity =
          (gLeft.totalW / totalW) * gLeft.gini + (gRight.totalW / totalW) * gRight.gini;
        const gain = gini - weightedImpurity;

        if (gain > bestGain) {
          bestGain = gain;
          bestFeat = featIdx;
          bestThreshold = threshold;
          bestLeft = left;
          bestRight = right;
        }
      }
    }

    if (bestFeat === -1 || bestGain <= 1e-5) {
      return { isLeaf: true, probClass1: p1, samples: samples.length };
    }

    importanceAccum[bestFeat] += bestGain * totalW;

    return {
      isLeaf: false,
      probClass1: p1,
      samples: samples.length,
      featureIndex: bestFeat,
      threshold: bestThreshold,
      impurityGain: bestGain,
      left: this.buildTree(bestLeft, depth + 1, rng, importanceAccum),
      right: this.buildTree(bestRight, depth + 1, rng, importanceAccum),
    };
  }

  public fit(trainRecords: StudentRecord[]): void {
    const rng = createRng(this.seed);
    const nPos = trainRecords.filter((r) => r.Status_Evasao === 1).length;
    const nNeg = trainRecords.length - nPos;

    const w1 = nPos > 0 ? trainRecords.length / (2 * nPos) : 1;
    const w0 = nNeg > 0 ? trainRecords.length / (2 * nNeg) : 1;

    const pool: SamplePoint[] = trainRecords.map((r) => ({
      x: this.extractVector(r),
      y: r.Status_Evasao,
      weight: r.Status_Evasao === 1 ? w1 : w0,
    }));

    this.trees = [];
    const importanceAccum = new Array(FEATURES.length).fill(0);

    for (let t = 0; t < this.nEstimators; t++) {
      const bootstrap: SamplePoint[] = [];
      for (let i = 0; i < pool.length; i++) {
        bootstrap.push(pool[Math.floor(rng() * pool.length)]);
      }
      const treeImp = new Array(FEATURES.length).fill(0);
      const root = this.buildTree(bootstrap, 0, rng, treeImp);
      this.trees.push(root);

      const treeSum = treeImp.reduce((acc, v) => acc + v, 0);
      if (treeSum > 0) {
        for (let f = 0; f < FEATURES.length; f++) {
          importanceAccum[f] += treeImp[f] / treeSum;
        }
      }
    }

    const totalImp = importanceAccum.reduce((acc, v) => acc + v, 0);
    this.featureGiniImportance =
      totalImp > 0
        ? importanceAccum.map((v) => v / totalImp)
        : new Array(FEATURES.length).fill(1 / FEATURES.length);
  }

  public explainStudent(
    student: Omit<StudentRecord, 'ID_Aluno' | 'Serie_Etapa' | 'Idade' | 'Status_Evasao'>
  ): {
    prob: number;
    contribuicoesPct: Record<FeatureKey, number>;
    fatorCritico: FeatureKey;
  } {
    const vec = this.extractVector(student);
    const contribs = new Array(FEATURES.length).fill(0);
    let probSum = 0;

    for (const root of this.trees) {
      let node: TreeNode = root;
      while (!node.isLeaf && node.featureIndex !== undefined && node.threshold !== undefined) {
        const featIdx = node.featureIndex;
        const nextNode = vec[featIdx] <= node.threshold ? node.left : node.right;
        if (!nextNode) break;
        contribs[featIdx] += nextNode.probClass1 - node.probClass1;
        node = nextNode;
      }
      probSum += node.probClass1;
    }

    const nTrees = Math.max(1, this.trees.length);
    const prob = probSum / nTrees;

    const contribuicoesPct = {} as Record<FeatureKey, number>;
    let fatorCritico: FeatureKey = 'Frequencia_Pct';
    let maxPosContrib = -Infinity;

    FEATURES.forEach((key, idx) => {
      const pct = Math.round((contribs[idx] / nTrees) * 1000) / 10;
      contribuicoesPct[key] = pct;
      if (pct > maxPosContrib) {
        maxPosContrib = pct;
        fatorCritico = key;
      }
    });

    return { prob, contribuicoesPct, fatorCritico };
  }

  public getGlobalImportance(): GlobalFeatureImportance[] {
    return FEATURES.map((feature, idx) => ({
      feature,
      label: FEATURE_LABELS[feature],
      category: FEATURE_CATEGORIES[feature],
      importancePct: Math.round(this.featureGiniImportance[idx] * 1000) / 10,
    })).sort((a, b) => b.importancePct - a.importancePct);
  }
}

export function getPublicPoliciesForStudent(
  nivelRisco: RiskLevel,
  fatorCritico: FeatureKey,
  student: StudentRecord
): PublicPolicyAction[] {
  if (nivelRisco === 'Baixo Risco') {
    return [
      {
        programa: 'Programa Pé-de-Meia e Sistema Presença (MEC)',
        orgao: 'Secretaria Escolar',
        esfera: 'Federal / Estadual',
        comoAcionar:
          'Manter lançamento mensal da frequência escolar (≥ 80%) no Sistema Presença para assegurar incentivos financeiros.',
      },
    ];
  }

  const policies: PublicPolicyAction[] = [];

  if (
    fatorCritico === 'Frequencia_Pct' ||
    fatorCritico === 'Faltas_Consecutivas' ||
    student.Frequencia_Pct < 75 ||
    student.Faltas_Consecutivas >= 5
  ) {
    policies.push({
      programa: 'Busca Ativa Escolar (UNICEF/Undime) e FICAI',
      orgao: 'Coordenação Escolar · Rede Municipal · Conselho Tutelar',
      esfera: 'Sistema de Garantia',
      comoAcionar:
        'Abrir caso na Busca Ativa Escolar, efetuar contato/visita em 48h e enviar ficha FICAI ao Conselho Tutelar (Art. 56 do ECA) se não houver retorno.',
    });
  }

  if (student.INSE_Nivel <= 2 || fatorCritico === 'INSE_Nivel') {
    policies.push({
      programa: 'CRAS / CadÚnico, Bolsa Família, Pé-de-Meia e PNAE',
      orgao: 'CRAS (Assistência Social / SUAS) · Gestão Escolar',
      esfera: 'Federal / Estadual',
      comoAcionar:
        'Encaminhar responsáveis ao CRAS para atualização do CadÚnico e acesso a benefícios eventuais/transferência de renda; garantir alimentação reforçada via PNAE.',
    });
  }

  if (student.Barreira_Transporte >= 1 || fatorCritico === 'Barreira_Transporte') {
    policies.push({
      programa: 'PNATE (Transporte Escolar) e Passe Livre Estudantil',
      orgao: 'Secretaria Estadual / Municipal de Educação (Transporte)',
      esfera: 'Federal / Estadual',
      comoAcionar:
        'Protocolar inclusão imediata em rota do transporte escolar (PNATE) ou emitir atestado eletrônico para gratuidade no transporte coletivo.',
    });
  }

  if (student.Turno_Noturno === 1 || fatorCritico === 'Turno_Noturno') {
    policies.push({
      programa: 'Acolhimento Turno Noturno, PNAE Jantar e Jovem Aprendiz',
      orgao: 'Direção Escolar · Secretaria de Educação · Sistema S / CIEE',
      esfera: 'Municipal / Intersetorial',
      comoAcionar:
        'Assegurar refeição noturna completa (PNAE), flexibilizar avaliação inicial de horários de chegada e articular jornada protegida de aprendizagem.',
    });
  }

  if (
    student.Distorcao_Idade_Serie >= 2 ||
    fatorCritico === 'Distorcao_Idade_Serie' ||
    fatorCritico === 'Media_Notas' ||
    fatorCritico === 'Historico_Reprovacoes'
  ) {
    policies.push({
      programa: 'Política Estadual de Correção de Fluxo e Recomposição das Aprendizagens',
      orgao: 'Secretaria Estadual de Educação (SEDUC) / Diretoria de Ensino',
      esfera: 'Federal / Estadual',
      comoAcionar:
        'Integrar o aluno em projeto estadual de aceleração de estudos, tutoria de recomposição ou EJA flexível compatível com sua faixa etária.',
    });
  }

  return policies.slice(0, 3);
}

export function buildInterventionPlan(
  probRisco: number,
  fatorCritico: FeatureKey,
  student: StudentRecord
): { nivelRisco: RiskLevel; planoIntervencao: InterventionPlan } {
  let nivelRisco: RiskLevel = 'Baixo Risco';
  if (probRisco >= 0.65) nivelRisco = 'Alto Risco';
  else if (probRisco >= 0.35) nivelRisco = 'Risco Médio';

  const politicasPublicas = getPublicPoliciesForStudent(nivelRisco, fatorCritico, student);

  if (nivelRisco === 'Baixo Risco') {
    return {
      nivelRisco,
      planoIntervencao: {
        objetivo: 'Manutenção do vínculo escolar e prevenção primária.',
        acaoPedagogica:
          'Acompanhamento mensal em conselho de classe e incentivo à participação em projetos e monitorias.',
        articulacaoSocial:
          'Manter frequência regularizada no Sistema Presença (Pé-de-Meia / Bolsa Família).',
        prazo: 'Monitoramento bimestral',
        responsavel: 'Professor Conselheiro e Secretaria Escolar',
        politicasPublicas,
      },
    };
  }

  const planos: Record<FeatureKey, Omit<InterventionPlan, 'politicasPublicas'>> = {
    Distorcao_Idade_Serie: {
      objetivo: `Reduzir o desengajamento por distorção idade-série (${student.Distorcao_Idade_Serie} ano(s) de atraso na ${student.Serie_Etapa}).`,
      acaoPedagogica:
        'Incluir o estudante em trilha de aceleração/correção de fluxo com tutoria individual e adaptação de metas bimestrais.',
      articulacaoSocial:
        'Avaliar projetos juvenis, qualificação profissional integrada ou EJA flexível junto à Diretoria de Ensino.',
      prazo: 'Até 7 dias úteis',
      responsavel: 'Coordenação Pedagógica e Orientação Educacional',
    },
    Turno_Noturno: {
      objetivo: 'Mitigar fadiga, incompatibilidade de trabalho e insegurança no Turno Noturno.',
      acaoPedagogica:
        'Adotar plano flexível de entregas assíncronas, revisão de horários críticos de entrada e acompanhamento próximo pelos docentes da noite.',
      articulacaoSocial:
        'Garantir jantar escolar completo (PNAE), checar iluminação/transporte no entorno e articular vaga de Jovem Aprendiz protegida.',
      prazo: 'Imediato (até 72h)',
      responsavel: 'Vice-Direção Noturna e Orientação Educacional',
    },
    INSE_Nivel: {
      objetivo: `Superar vulnerabilidade socioeconômica crítica (INSE Nível ${student.INSE_Nivel}/7).`,
      acaoPedagogica:
        'Disponibilizar kit de material didático na escola, acesso à sala de informática/leitura no contraturno e dispensa de taxas.',
      articulacaoSocial:
        'Encaminhar família com ofício ao CRAS para atualização do CadÚnico, inclusão no Bolsa Família / Pé-de-Meia e benefícios eventuais.',
      prazo: 'Até 5 dias úteis',
      responsavel: 'Orientação Educacional e Assistência Social (CRAS)',
    },
    Barreira_Transporte: {
      objetivo: 'Eliminar barreira física de deslocamento casa–escola.',
      acaoPedagogica:
        'Abonar justificadamente atrasos decorrentes de falha logística enquanto a rota é regularizada e disponibilizar roteiros de estudo offline.',
      articulacaoSocial:
        'Solicitar inclusão prioritária no PNATE (Transporte Escolar) ou emitir declaração para Passe Livre Estudantil na Secretaria de Educação.',
      prazo: 'Imediato (até 48h)',
      responsavel: 'Direção Escolar e Setor de Transporte (SEDUC/Prefeitura)',
    },
    Frequencia_Pct: {
      objetivo: `Recuperar assiduidade escolar (frequência atual em ${student.Frequencia_Pct.toFixed(1)}%).`,
      acaoPedagogica:
        'Realizar escuta acolhedora com o estudante e pactuar plano semanal de retomada de presença e reposição de conteúdos.',
      articulacaoSocial:
        'Notificar responsáveis, abrir registro na Busca Ativa Escolar e verificar condicionalidade do Pé-de-Meia / Bolsa Família.',
      prazo: 'Até 48 horas',
      responsavel: 'Coordenação Pedagógica e Busca Ativa Escolar',
    },
    Faltas_Consecutivas: {
      objetivo: `Interromper sequência de ${student.Faltas_Consecutivas} faltas consecutivas antes do abandono formal.`,
      acaoPedagogica:
        'Contato telefônico imediato no mesmo dia e planejamento de acolhimento no retorno para evitar constrangimento acadêmico.',
      articulacaoSocial:
        'Acionar agente comunitário / visita domiciliar; se não houver retorno em 48h, protocolar ficha FICAI ao Conselho Tutelar (Art. 56 ECA).',
      prazo: 'Urgente (24h–48h)',
      responsavel: 'Direção Escolar e Conselho Tutelar (se necessário)',
    },
    Media_Notas: {
      objetivo: `Reverter defasagem de aprendizagem (média atual: ${student.Media_Notas.toFixed(1)}).`,
      acaoPedagogica:
        'Encaminhar para reforço escolar no contraturno, tutoria por pares e avaliação diagnóstica de habilidades básicas.',
      articulacaoSocial:
        'Verificar via PSE/UBS eventuais questões de visão, audição ou saúde emocional que impactam o rendimento.',
      prazo: 'Até 5 dias úteis',
      responsavel: 'Professores Regentes e Coordenação Pedagógica',
    },
    Historico_Reprovacoes: {
      objetivo: `Quebrar ciclo de retenção (${student.Historico_Reprovacoes} reprovação(ões) no histórico).`,
      acaoPedagogica:
        'Construir Plano Educacional Individualizado (PEI) com recuperação contínua e avaliação formativa diversificada.',
      articulacaoSocial:
        'Acionar equipe psicopedagógica da rede / AEE e envolver a família em reuniões quinzenais de acompanhamento.',
      prazo: 'Até 7 dias úteis',
      responsavel: 'Coordenação Pedagógica e Equipe Multiprofissional',
    },
  };

  return {
    nivelRisco,
    planoIntervencao: {
      ...planos[fatorCritico],
      politicasPublicas,
    },
  };
}

export function trainAndEvaluatePipeline(
  students: StudentRecord[],
  seed = 42
): {
  model: RandomForestDropoutModel;
  metrics: ModelMetrics;
  evaluations: StudentEvaluation[];
} {
  const pos = students.filter((s) => s.Status_Evasao === 1);
  const neg = students.filter((s) => s.Status_Evasao === 0);

  const posTestCount = Math.max(1, Math.floor(pos.length * 0.25));
  const negTestCount = Math.max(1, Math.floor(neg.length * 0.25));

  const testSet = [...pos.slice(0, posTestCount), ...neg.slice(0, negTestCount)];
  const trainSet = [...pos.slice(posTestCount), ...neg.slice(negTestCount)];

  const model = new RandomForestDropoutModel(45, 6, 4, seed);
  model.fit(trainSet);

  let tn = 0;
  let fp = 0;
  let fn = 0;
  let tp = 0;

  for (const row of testSet) {
    const { prob } = model.explainStudent(row);
    const pred: 0 | 1 = prob >= 0.5 ? 1 : 0;
    if (row.Status_Evasao === 1 && pred === 1) tp++;
    else if (row.Status_Evasao === 0 && pred === 0) tn++;
    else if (row.Status_Evasao === 0 && pred === 1) fp++;
    else if (row.Status_Evasao === 1 && pred === 0) fn++;
  }

  const totalTest = Math.max(1, testSet.length);
  const accuracy = (tp + tn) / totalTest;
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  const globalImportance = model.getGlobalImportance();
  const socialWeightSharePct =
    Math.round(
      globalImportance
        .filter((g) => g.category === 'Social (INEP)')
        .reduce((acc, g) => acc + g.importancePct, 0) * 10
    ) / 10;

  const metrics: ModelMetrics = {
    accuracy,
    precision,
    recall,
    f1,
    trainSize: trainSet.length,
    testSize: testSet.length,
    dropoutRatePct: (pos.length / Math.max(1, students.length)) * 100,
    socialWeightSharePct,
    confusionMatrix: { tn, fp, fn, tp },
    globalImportance,
  };

  const evaluations = evaluateStudents(students, model);

  return { model, metrics, evaluations };
}

export function evaluateSingleStudent(
  student: StudentRecord,
  model: RandomForestDropoutModel,
  isManual = false
): StudentEvaluation {
  const { prob, contribuicoesPct, fatorCritico } = model.explainStudent(student);
  const { nivelRisco, planoIntervencao } = buildInterventionPlan(
    prob,
    fatorCritico,
    student
  );

  return {
    ...student,
    probabilidadeRisco: prob,
    riscoPct: Math.round(prob * 1000) / 10,
    nivelRisco,
    fatorCritico,
    categoriaFatorCritico: FEATURE_CATEGORIES[fatorCritico],
    motivoPrincipal: FEATURE_LABELS[fatorCritico],
    contribuicoesPct,
    planoIntervencao,
    isManual,
  };
}

export function evaluateStudents(
  students: StudentRecord[],
  model: RandomForestDropoutModel
): StudentEvaluation[] {
  return students
    .map((s) => evaluateSingleStudent(s, model))
    .sort((a, b) => b.probabilidadeRisco - a.probabilidadeRisco);
}
