import React, { useMemo, useState } from 'react';
import { UserPlus } from 'lucide-react';
import {
  FEATURE_CATEGORIES,
  FEATURE_LABELS,
  FEATURES,
  INSE_DESCRICOES,
  SERIE_IDADE_IDEAL,
  TRANSPORTE_DESCRICOES,
} from '../ml/dataset';
import { evaluateSingleStudent, RandomForestDropoutModel } from '../ml/randomForest';
import { StudentRecord } from '../ml/types';

interface StudentEvaluatorViewProps {
  model: RandomForestDropoutModel;
  nextSuggestedId: string;
  onAddStudent: (student: StudentRecord) => void;
}

interface PresetScenario {
  label: string;
  serie: string;
  idade: number;
  freq: number;
  nota: number;
  faltas: number;
  reprov: number;
  turnoNoturno: 0 | 1;
  inse: number;
  transporte: 0 | 1 | 2;
}

const PRESETS: PresetScenario[] = [
  {
    label: 'Turno Noturno + Distorção',
    serie: '1ª Série EM',
    idade: 18,
    freq: 70.0,
    nota: 5.4,
    faltas: 6,
    reprov: 2,
    turnoNoturno: 1,
    inse: 2,
    transporte: 1,
  },
  {
    label: 'Vulnerabilidade INSE Nível I',
    serie: '9º Ano EF',
    idade: 15,
    freq: 73.0,
    nota: 5.1,
    faltas: 5,
    reprov: 1,
    turnoNoturno: 0,
    inse: 1,
    transporte: 1,
  },
  {
    label: 'Barreira Crítica de Transporte',
    serie: '2ª Série EM',
    idade: 16,
    freq: 66.0,
    nota: 6.3,
    faltas: 8,
    reprov: 0,
    turnoNoturno: 0,
    inse: 3,
    transporte: 2,
  },
  {
    label: 'Perfil Estável',
    serie: '1ª Série EM',
    idade: 15,
    freq: 95.0,
    nota: 8.3,
    faltas: 0,
    reprov: 0,
    turnoNoturno: 0,
    inse: 5,
    transporte: 0,
  },
];

export const StudentEvaluatorView: React.FC<StudentEvaluatorViewProps> = ({
  model,
  nextSuggestedId,
  onAddStudent,
}) => {
  const [studentId, setStudentId] = useState(nextSuggestedId);
  const [serie, setSerie] = useState('1ª Série EM');
  const [idade, setIdade] = useState(18);
  const [freq, setFreq] = useState(70.0);
  const [nota, setNota] = useState(5.4);
  const [faltas, setFaltas] = useState(6);
  const [reprov, setReprov] = useState(2);
  const [turnoNoturno, setTurnoNoturno] = useState<0 | 1>(1);
  const [inse, setInse] = useState(2);
  const [transporte, setTransporte] = useState<0 | 1 | 2>(1);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const distorcaoCalculada = useMemo(() => {
    const ideal = SERIE_IDADE_IDEAL[serie] ?? 15;
    return Math.max(0, idade - ideal);
  }, [serie, idade]);

  const liveEvaluation = useMemo(() => {
    const draft: StudentRecord = {
      ID_Aluno: studentId.trim() || nextSuggestedId,
      Serie_Etapa: serie,
      Idade: idade,
      Frequencia_Pct: freq,
      Media_Notas: nota,
      Faltas_Consecutivas: faltas,
      Historico_Reprovacoes: reprov,
      Distorcao_Idade_Serie: distorcaoCalculada,
      Turno_Noturno: turnoNoturno,
      INSE_Nivel: inse,
      Barreira_Transporte: transporte,
      Status_Evasao: freq < 75 || inse <= 2 || transporte === 2 ? 1 : 0,
    };
    return evaluateSingleStudent(draft, model, true);
  }, [
    studentId,
    nextSuggestedId,
    serie,
    idade,
    freq,
    nota,
    faltas,
    reprov,
    distorcaoCalculada,
    turnoNoturno,
    inse,
    transporte,
    model,
  ]);

  const sortedContribs = useMemo(() => {
    return FEATURES.map((key) => ({
      key,
      label: FEATURE_LABELS[key],
      category: FEATURE_CATEGORIES[key],
      value: liveEvaluation.contribuicoesPct[key],
    })).sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  }, [liveEvaluation]);

  const maxAbs = Math.max(10, ...sortedContribs.map((c) => Math.abs(c.value)));

  const applyPreset = (p: PresetScenario) => {
    setSerie(p.serie);
    setIdade(p.idade);
    setFreq(p.freq);
    setNota(p.nota);
    setFaltas(p.faltas);
    setReprov(p.reprov);
    setTurnoNoturno(p.turnoNoturno);
    setInse(p.inse);
    setTransporte(p.transporte);
    setFeedbackMsg(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const idToSave = studentId.trim() || nextSuggestedId;
    onAddStudent({
      ID_Aluno: idToSave,
      Serie_Etapa: serie,
      Idade: idade,
      Frequencia_Pct: freq,
      Media_Notas: nota,
      Faltas_Consecutivas: faltas,
      Historico_Reprovacoes: reprov,
      Distorcao_Idade_Serie: distorcaoCalculada,
      Turno_Noturno: turnoNoturno,
      INSE_Nivel: inse,
      Barreira_Transporte: transporte,
      Status_Evasao: liveEvaluation.probabilidadeRisco >= 0.5 ? 1 : 0,
    });
    setFeedbackMsg(
      `Estudante ${idToSave} adicionado ao painel (${liveEvaluation.riscoPct.toFixed(
        1
      )}% · ${liveEvaluation.nivelRisco}).`
    );
    const numMatch = idToSave.match(/(\d+)$/);
    if (numMatch) {
      const nextNum = parseInt(numMatch[1], 10) + 1;
      setStudentId(`INEP-${nextNum}`);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Form */}
      <section className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-6">
        <div className="pb-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">
            Simular ou Cadastrar Estudante (Variáveis INEP)
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            A distorção idade-série é calculada automaticamente a partir da série e idade. O plano
            de intervenção é ajustado em tempo real.
          </p>
        </div>

        <div className="mt-4">
          <span className="text-xs font-medium text-slate-600 block mb-2">
            Cenários de simulação rápida
          </span>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p)}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-md transition-colors whitespace-nowrap"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label
                htmlFor="student-id"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                ID (INEP)
              </label>
              <input
                id="student-id"
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full px-3 py-1.5 text-sm font-mono bg-white border border-slate-200 rounded-md text-slate-900"
                required
              />
            </div>

            <div>
              <label
                htmlFor="serie-select"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Etapa / Série
              </label>
              <select
                id="serie-select"
                value={serie}
                onChange={(e) => setSerie(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-md text-slate-900"
              >
                {Object.keys(SERIE_IDADE_IDEAL).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="idade-input"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Idade (Distorção: {distorcaoCalculada}a)
              </label>
              <input
                id="idade-input"
                type="number"
                min={13}
                max={24}
                value={idade}
                onChange={(e) => setIdade(Math.max(13, parseInt(e.target.value || '15', 10)))}
                className="w-full px-3 py-1.5 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-md text-slate-900"
              />
            </div>
          </div>

          {/* Academic Controls */}
          <div className="pt-3 border-t border-slate-200 space-y-4">
            <h3 className="text-xs font-semibold text-slate-900">
              01. Indicadores Acadêmicos e Frequência
            </h3>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <label htmlFor="freq-range" className="font-medium text-slate-700">
                  Frequência Escolar (%)
                </label>
                <span className="font-mono tabular-nums font-semibold text-slate-900">
                  {freq.toFixed(1)}%
                </span>
              </div>
              <input
                id="freq-range"
                type="range"
                min={30}
                max={100}
                step={0.5}
                value={freq}
                onChange={(e) => setFreq(parseFloat(e.target.value))}
                className="w-full accent-slate-900"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <label htmlFor="nota-range" className="font-medium text-slate-700">
                  Média de Notas (0 a 10)
                </label>
                <span className="font-mono tabular-nums font-semibold text-slate-900">
                  {nota.toFixed(1)}
                </span>
              </div>
              <input
                id="nota-range"
                type="range"
                min={0}
                max={10}
                step={0.1}
                value={nota}
                onChange={(e) => setNota(parseFloat(e.target.value))}
                className="w-full accent-slate-900"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="faltas-input"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Faltas Consecutivas
                </label>
                <input
                  id="faltas-input"
                  type="number"
                  min={0}
                  max={30}
                  value={faltas}
                  onChange={(e) => setFaltas(Math.max(0, parseInt(e.target.value || '0', 10)))}
                  className="w-full px-3 py-1.5 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-md text-slate-900"
                />
              </div>

              <div>
                <label
                  htmlFor="reprov-input"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Histórico de Reprovações
                </label>
                <input
                  id="reprov-input"
                  type="number"
                  min={0}
                  max={6}
                  value={reprov}
                  onChange={(e) => setReprov(Math.max(0, parseInt(e.target.value || '0', 10)))}
                  className="w-full px-3 py-1.5 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-md text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* INEP Social Controls */}
          <div className="pt-3 border-t border-slate-200 space-y-4">
            <h3 className="text-xs font-semibold text-slate-900">
              02. Variáveis Sociais Reais (Microdados INEP)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="turno-select"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Turno da Matrícula
                </label>
                <select
                  id="turno-select"
                  value={turnoNoturno}
                  onChange={(e) => setTurnoNoturno(Number(e.target.value) as 0 | 1)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-md text-slate-900"
                >
                  <option value={0}>Diurno / Integral</option>
                  <option value={1}>Turno Noturno</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="transp-select"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Transporte Escolar (PNATE)
                </label>
                <select
                  id="transp-select"
                  value={transporte}
                  onChange={(e) => setTransporte(Number(e.target.value) as 0 | 1 | 2)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-md text-slate-900"
                >
                  <option value={0}>{TRANSPORTE_DESCRICOES[0]}</option>
                  <option value={1}>{TRANSPORTE_DESCRICOES[1]}</option>
                  <option value={2}>{TRANSPORTE_DESCRICOES[2]}</option>
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <label htmlFor="inse-range" className="font-medium text-slate-700">
                  Vulnerabilidade Social — INSE (1 = Muito Baixo · 7 = Muito Alto)
                </label>
                <span className="font-mono tabular-nums font-semibold text-slate-900">
                  Nível {inse}
                </span>
              </div>
              <input
                id="inse-range"
                type="range"
                min={1}
                max={7}
                step={1}
                value={inse}
                onChange={(e) => setInse(parseInt(e.target.value, 10))}
                className="w-full accent-slate-900"
              />
              <p className="mt-1 text-[11px] text-slate-500">{INSE_DESCRICOES[inse]}</p>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
              Adicionar ao Painel de Risco
            </button>
          </div>

          {feedbackMsg ? (
            <p className="text-xs text-emerald-700 font-medium">{feedbackMsg}</p>
          ) : null}
        </form>
      </section>

      {/* Live Output */}
      <section className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-6">
        <div className="pb-4 border-b border-slate-200">
          <p className="text-xs text-slate-500">
            {liveEvaluation.ID_Aluno} · {liveEvaluation.Serie_Etapa} · Distorção{' '}
            {liveEvaluation.Distorcao_Idade_Serie} ano(s) · Origem{' '}
            {liveEvaluation.categoriaFatorCritico}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">
            <span
              className={
                liveEvaluation.nivelRisco === 'Alto Risco'
                  ? 'text-red-700'
                  : liveEvaluation.nivelRisco === 'Risco Médio'
                  ? 'text-amber-700'
                  : 'text-emerald-700'
              }
            >
              {liveEvaluation.nivelRisco}
            </span>
            <span className="text-slate-400 font-normal mx-2">·</span>
            <span className="font-mono tabular-nums">
              {liveEvaluation.riscoPct.toFixed(1)}% de probabilidade
            </span>
          </h2>
        </div>

        {/* Personalized Intervention Plan */}
        <div className="mt-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900">
              Plano de Intervenção Preventiva Personalizado
            </h3>
            <span className="text-[11px] font-mono text-slate-600">
              {liveEvaluation.planoIntervencao.prazo}
            </span>
          </div>

          <div
            className={`mt-2.5 p-4 rounded-md border text-xs space-y-2.5 leading-relaxed ${
              liveEvaluation.nivelRisco === 'Alto Risco'
                ? 'bg-red-50/50 border-red-200 text-slate-900'
                : liveEvaluation.nivelRisco === 'Risco Médio'
                ? 'bg-amber-50/50 border-amber-200 text-slate-900'
                : 'bg-emerald-50/50 border-emerald-200 text-slate-900'
            }`}
          >
            <div>
              <span className="font-semibold">Motivo Principal: </span>
              <span>
                {liveEvaluation.motivoPrincipal} ({liveEvaluation.categoriaFatorCritico})
              </span>
            </div>
            <div>
              <span className="font-semibold">Objetivo: </span>
              <span>{liveEvaluation.planoIntervencao.objetivo}</span>
            </div>
            <div>
              <span className="font-semibold">Ação Pedagógica: </span>
              <span>{liveEvaluation.planoIntervencao.acaoPedagogica}</span>
            </div>
            <div>
              <span className="font-semibold">Articulação Social / Estado: </span>
              <span>{liveEvaluation.planoIntervencao.articulacaoSocial}</span>
            </div>
            <div className="pt-2 border-t border-slate-200/80 text-[11px] text-slate-600">
              Responsável: <strong>{liveEvaluation.planoIntervencao.responsavel}</strong>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900">
            Peso Local das Variáveis (Acadêmicas + Sociais INEP)
          </h3>
          <div className="mt-4 space-y-2.5">
            {sortedContribs.map((item) => {
              const widthPct = Math.min(100, (Math.abs(item.value) / maxAbs) * 100);
              const isPos = item.value >= 0;
              return (
                <div key={item.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <span className="text-slate-700 font-medium truncate">
                      {item.label}{' '}
                      <span className="text-[11px] text-slate-400 font-normal">
                        ({item.category})
                      </span>
                    </span>
                    <span
                      className={`font-mono tabular-nums font-medium shrink-0 ${
                        isPos ? 'text-red-700' : 'text-emerald-700'
                      }`}
                    >
                      {isPos ? '+' : ''}
                      {item.value.toFixed(1)} pp
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-sm overflow-hidden">
                    <div
                      className={`h-full transition-all duration-150 ${
                        isPos ? 'bg-red-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.max(3, widthPct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};
