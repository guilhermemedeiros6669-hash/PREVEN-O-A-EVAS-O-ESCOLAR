import { FeatureCategory, FeatureKey, StudentRecord } from './types';

export const FEATURES: FeatureKey[] = [
  'Frequencia_Pct',
  'Media_Notas',
  'Faltas_Consecutivas',
  'Historico_Reprovacoes',
  'Distorcao_Idade_Serie',
  'Turno_Noturno',
  'INSE_Nivel',
  'Barreira_Transporte',
];

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  Frequencia_Pct: 'Frequência (%)',
  Media_Notas: 'Média de Notas',
  Faltas_Consecutivas: 'Faltas Consecutivas',
  Historico_Reprovacoes: 'Histórico de Reprovações',
  Distorcao_Idade_Serie: 'Distorção Idade-Série (anos)',
  Turno_Noturno: 'Turno Noturno',
  INSE_Nivel: 'Vulnerabilidade Social (INSE)',
  Barreira_Transporte: 'Fatores de Transporte Escolar',
};

export const FEATURE_CATEGORIES: Record<FeatureKey, FeatureCategory> = {
  Frequencia_Pct: 'Acadêmico',
  Media_Notas: 'Acadêmico',
  Faltas_Consecutivas: 'Acadêmico',
  Historico_Reprovacoes: 'Acadêmico',
  Distorcao_Idade_Serie: 'Social (INEP)',
  Turno_Noturno: 'Social (INEP)',
  INSE_Nivel: 'Social (INEP)',
  Barreira_Transporte: 'Social (INEP)',
};

export const SERIE_IDADE_IDEAL: Record<string, number> = {
  '9º Ano EF': 14,
  '1ª Série EM': 15,
  '2ª Série EM': 16,
  '3ª Série EM': 17,
};

export const INSE_DESCRICOES: Record<number, string> = {
  1: 'Nível I — Muito Baixo (Alta Vulnerabilidade)',
  2: 'Nível II — Baixo (Vulnerabilidade Social)',
  3: 'Nível III — Médio-Baixo',
  4: 'Nível IV — Médio',
  5: 'Nível V — Médio-Alto',
  6: 'Nível VI — Alto',
  7: 'Nível VII — Muito Alto',
};

export const TRANSPORTE_DESCRICOES: Record<0 | 1 | 2, string> = {
  0: 'Acesso regular / próximo',
  1: 'Depende de transporte escolar (rota parcial)',
  2: 'Barreira crítica / ausência de transporte',
};

export function createRng(seed: number) {
  let state = seed >>> 0;
  return function next(): number {
    state += 0x6d2b79f5;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleNormal(rng: () => number, mean = 0, std = 1): number {
  const u1 = Math.max(1e-7, rng());
  const u2 = rng();
  const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + z * std;
}

function sampleBinomial(rng: () => number, n: number, p: number): number {
  let successes = 0;
  for (let i = 0; i < n; i++) {
    if (rng() < p) successes++;
  }
  return successes;
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

export function generateInepSimulatedStudents(count = 260, seed = 42): StudentRecord[] {
  const rng = createRng(seed);
  const seriesKeys = Object.keys(SERIE_IDADE_IDEAL);
  const students: StudentRecord[] = [];

  for (let i = 0; i < count; i++) {
    const id = `INEP-${2026001 + i}`;
    const serie = seriesKeys[Math.floor(rng() * seriesKeys.length)];
    const idadeIdeal = SERIE_IDADE_IDEAL[serie];

    // INSE (1 a 7, concentrado nos níveis 1 a 5 típicos da rede pública)
    const inseRaw = Math.round(clamp(sampleNormal(rng, 3.2, 1.45), 1, 7));
    const vulnInse = inseRaw <= 2 ? 1 : 0;

    // Distorção idade-série (maior em contextos de vulnerabilidade)
    const probAtraso = clamp(0.18 + vulnInse * 0.22, 0.1, 0.55);
    const distorcao = rng() < probAtraso ? Math.floor(rng() * 4) + 1 : 0;
    const idade = idadeIdeal + distorcao;

    // Turno Noturno (fortemente associado a distorção >= 2 e idade >= 17)
    const probNoturno = clamp(0.12 + (distorcao >= 2 ? 0.42 : 0) + (idade >= 18 ? 0.2 : 0), 0.08, 0.8);
    const turnoNoturno: 0 | 1 = rng() < probNoturno ? 1 : 0;

    // Transporte Escolar (0 = regular, 1 = depende de rota, 2 = barreira crítica)
    const uTransp = rng();
    const barreiraTransporte: 0 | 1 | 2 =
      uTransp < (vulnInse ? 0.26 : 0.11)
        ? 2
        : uTransp < (vulnInse ? 0.58 : 0.35)
        ? 1
        : 0;

    // Histórico de reprovações correlacionado com distorção e INSE
    const probReprov = clamp(0.06 + distorcao * 0.22 + vulnInse * 0.1, 0.04, 0.75);
    const historicoReprovacoes = sampleBinomial(rng, 3, probReprov);

    // Frequência (%) impactada por turno noturno, transporte e INSE
    const freqRaw =
      sampleNormal(rng, 88.5, 9.0) -
      turnoNoturno * 6.5 -
      barreiraTransporte * 5.2 -
      vulnInse * 3.8 -
      distorcao * 2.1 -
      historicoReprovacoes * 2.5;
    const frequenciaPct = Math.round(clamp(freqRaw, 35, 100) * 10) / 10;

    const faltasBase = Math.max(
      0,
      (100 - frequenciaPct) * 0.32 +
        barreiraTransporte * 1.4 +
        turnoNoturno * 1.2 +
        sampleNormal(rng, 0, 1.9)
    );
    const faltasConsecutivas = Math.round(clamp(faltasBase, 0, 25));

    const notaRaw =
      5.8 +
      (frequenciaPct - 75) * 0.07 -
      historicoReprovacoes * 0.5 -
      turnoNoturno * 0.35 -
      (inseRaw <= 2 ? 0.45 : 0) +
      sampleNormal(rng, 0, 1.2);
    const mediaNotas = Math.round(clamp(notaRaw, 0.5, 10.0) * 10) / 10;

    // Probabilidade latente combinando variáveis acadêmicas e sociais do INEP
    const logit =
      -2.2 +
      (75.0 - frequenciaPct) * 0.085 +
      (faltasConsecutivas - 5) * 0.18 +
      (6.0 - mediaNotas) * 0.38 +
      historicoReprovacoes * 0.42 +
      distorcao * 0.52 +
      turnoNoturno * 0.95 +
      (3.5 - inseRaw) * 0.44 +
      barreiraTransporte * 0.85;

    const probEvasao = 1 / (1 + Math.exp(-logit));
    const statusEvasao: 0 | 1 = rng() < clamp(probEvasao, 0.02, 0.98) ? 1 : 0;

    students.push({
      ID_Aluno: id,
      Serie_Etapa: serie,
      Idade: idade,
      Frequencia_Pct: frequenciaPct,
      Media_Notas: mediaNotas,
      Faltas_Consecutivas: faltasConsecutivas,
      Historico_Reprovacoes: historicoReprovacoes,
      Distorcao_Idade_Serie: distorcao,
      Turno_Noturno: turnoNoturno,
      INSE_Nivel: inseRaw,
      Barreira_Transporte: barreiraTransporte,
      Status_Evasao: statusEvasao,
    });
  }

  return students;
}
