import React, { useMemo, useState } from 'react';
import { Download, Search, UserPlus } from 'lucide-react';
import {
  FEATURE_CATEGORIES,
  FEATURE_LABELS,
  FEATURES,
  INSE_DESCRICOES,
  TRANSPORTE_DESCRICOES,
} from '../ml/dataset';
import { ModelMetrics, RiskLevel, StudentEvaluation } from '../ml/types';

interface RiskRosterViewProps {
  evaluations: StudentEvaluation[];
  metrics: ModelMetrics;
  selectedId: string;
  onSelectId: (id: string) => void;
  onNavigateToAdd: () => void;
  onNavigateToPolicies: () => void;
  onExportCsv: () => void;
}

type FilterOption = 'Todos' | RiskLevel;
type ShiftFilter = 'Todos' | 'Noturno' | 'Diurno';

function getRiskTextColor(level: RiskLevel): string {
  switch (level) {
    case 'Alto Risco':
      return 'text-red-700 font-semibold';
    case 'Risco Médio':
      return 'text-amber-700 font-medium';
    case 'Baixo Risco':
      return 'text-emerald-700 font-medium';
  }
}

function getRiskBarColor(level: RiskLevel): string {
  switch (level) {
    case 'Alto Risco':
      return 'bg-red-600';
    case 'Risco Médio':
      return 'bg-amber-500';
    case 'Baixo Risco':
      return 'bg-emerald-600';
  }
}

export const RiskRosterView: React.FC<RiskRosterViewProps> = ({
  evaluations,
  metrics,
  selectedId,
  onSelectId,
  onNavigateToAdd,
  onNavigateToPolicies,
  onExportCsv,
}) => {
  const [filter, setFilter] = useState<FilterOption>('Todos');
  const [shiftFilter, setShiftFilter] = useState<ShiftFilter>('Todos');
  const [onlyInseCritical, setOnlyInseCritical] = useState(false);
  const [onlyDistortion, setOnlyDistortion] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const counts = useMemo(() => {
    let alto = 0;
    let medio = 0;
    for (const item of evaluations) {
      if (item.nivelRisco === 'Alto Risco') alto++;
      else if (item.nivelRisco === 'Risco Médio') medio++;
    }
    return {
      total: evaluations.length,
      alto,
      medio,
      socialShare: metrics.socialWeightSharePct,
    };
  }, [evaluations, metrics.socialWeightSharePct]);

  const filteredList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return evaluations.filter((s) => {
      if (filter !== 'Todos' && s.nivelRisco !== filter) return false;
      if (shiftFilter === 'Noturno' && s.Turno_Noturno !== 1) return false;
      if (shiftFilter === 'Diurno' && s.Turno_Noturno !== 0) return false;
      if (onlyInseCritical && s.INSE_Nivel > 2) return false;
      if (onlyDistortion && s.Distorcao_Idade_Serie < 2) return false;
      if (
        q &&
        !s.ID_Aluno.toLowerCase().includes(q) &&
        !s.motivoPrincipal.toLowerCase().includes(q) &&
        !s.Serie_Etapa.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [evaluations, filter, shiftFilter, onlyInseCritical, onlyDistortion, searchQuery]);

  const activeStudent = useMemo(() => {
    return (
      evaluations.find((e) => e.ID_Aluno === selectedId) ??
      filteredList[0] ??
      evaluations[0]
    );
  }, [evaluations, filteredList, selectedId]);

  const sortedContribs = useMemo(() => {
    if (!activeStudent) return [];
    return FEATURES.map((key) => ({
      key,
      label: FEATURE_LABELS[key],
      category: FEATURE_CATEGORIES[key],
      value: activeStudent.contribuicoesPct[key],
    })).sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  }, [activeStudent]);

  const maxAbsContrib = useMemo(() => {
    if (sortedContribs.length === 0) return 10;
    return Math.max(10, ...sortedContribs.map((c) => Math.abs(c.value)));
  }, [sortedContribs]);

  return (
    <div className="space-y-6">
      {/* KPI Summary Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Estudantes Monitorados</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 font-mono tabular-nums">
            {counts.total}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Acurácia RF {(metrics.accuracy * 100).toFixed(1)}%
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Alto Risco (≥ 65%)</p>
          <p className="mt-2 text-2xl font-semibold text-red-700 font-mono tabular-nums">
            {counts.alto}
          </p>
          <p className="mt-1 text-xs text-slate-500">Intervenção prioritária</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Risco Médio (35–64%)</p>
          <p className="mt-2 text-2xl font-semibold text-amber-700 font-mono tabular-nums">
            {counts.medio}
          </p>
          <p className="mt-1 text-xs text-slate-500">Acompanhamento preventivo</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Peso Variáveis Sociais (INEP)</p>
          <p className="mt-2 text-2xl font-semibold text-blue-700 font-mono tabular-nums">
            {counts.socialShare.toFixed(1)}%
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Influência na decisão do modelo
          </p>
        </div>
      </section>

      {/* Main Split: Roster Table + Personalized Intervention Plan */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left: Roster Table */}
        <section className="xl:col-span-7 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Alunos em Risco — Microdados INEP
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Filtre por risco, turno noturno, vulnerabilidade INSE ou distorção idade-série.
              </p>
            </div>
            <button
              type="button"
              onClick={onExportCsv}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              Exportar CSV
            </button>
          </div>

          {/* Filter Toolbar */}
          <div className="px-4 sm:px-5 py-3 border-b border-slate-200 bg-slate-50/70 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-md overflow-x-auto">
                {(['Todos', 'Alto Risco', 'Risco Médio', 'Baixo Risco'] as FilterOption[]).map(
                  (opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setFilter(opt)}
                      className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                        filter === opt
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {opt}
                    </button>
                  )
                )}
              </div>

              <div className="relative w-full md:w-56">
                <Search
                  className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar ID, série ou fator..."
                  aria-label="Buscar aluno por ID, série ou fator"
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400"
                />
              </div>
            </div>

            {/* Social INEP Subfilters */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <label htmlFor="shift-filter" className="text-slate-500">
                  Turno:
                </label>
                <select
                  id="shift-filter"
                  value={shiftFilter}
                  onChange={(e) => setShiftFilter(e.target.value as ShiftFilter)}
                  className="px-2 py-1 text-xs bg-white border border-slate-200 rounded text-slate-800"
                >
                  <option value="Todos">Todos</option>
                  <option value="Noturno">Apenas Noturno</option>
                  <option value="Diurno">Apenas Diurno</option>
                </select>
              </div>

              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyInseCritical}
                  onChange={(e) => setOnlyInseCritical(e.target.checked)}
                  className="accent-slate-900"
                />
                <span>INSE Crítico (Nível I–II)</span>
              </label>

              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyDistortion}
                  onChange={(e) => setOnlyDistortion(e.target.checked)}
                  className="accent-slate-900"
                />
                <span>Distorção Idade-Série (≥ 2 anos)</span>
              </label>
            </div>
          </div>

          {/* Table */}
          {filteredList.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-medium text-slate-800">
                Nenhum estudante encontrado para os filtros aplicados.
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Limpe alguns filtros sociais ou avalie um novo estudante.
              </p>
              <button
                type="button"
                onClick={onNavigateToAdd}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap"
              >
                <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
                Avaliar Novo Aluno
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[680px] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                  <tr className="text-xs font-medium text-slate-500">
                    <th className="py-2.5 px-4 whitespace-nowrap">ID / Série</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Risco</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Prob.</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Distorção</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Turno</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">INSE</th>
                    <th className="py-2.5 px-4 whitespace-nowrap">Motivo Principal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredList.map((student) => {
                    const isSelected = activeStudent?.ID_Aluno === student.ID_Aluno;
                    return (
                      <tr
                        key={student.ID_Aluno}
                        onClick={() => onSelectId(student.ID_Aluno)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-slate-100/90' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <span className="font-mono tabular-nums font-medium text-slate-900 block">
                            {student.ID_Aluno}
                            {student.isManual ? (
                              <span className="ml-1.5 text-[11px] font-sans text-blue-700">
                                (Novo)
                              </span>
                            ) : null}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {student.Serie_Etapa}
                          </span>
                        </td>
                        <td
                          className={`py-2.5 px-3 whitespace-nowrap ${getRiskTextColor(
                            student.nivelRisco
                          )}`}
                        >
                          {student.nivelRisco}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-900 whitespace-nowrap">
                          {student.riscoPct.toFixed(1)}%
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                          {student.Distorcao_Idade_Serie}a
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap text-slate-700">
                          {student.Turno_Noturno === 1 ? 'Noturno' : 'Diurno'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                          Nív. {student.INSE_Nivel}
                        </td>
                        <td className="py-2.5 px-4 text-slate-800 max-w-[190px] truncate">
                          {student.motivoPrincipal}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Right: Individual Student Diagnosis & Personalized Preventive Intervention Plan */}
        <section className="xl:col-span-5 bg-white border border-slate-200 rounded-lg p-5">
          {activeStudent ? (
            <div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-slate-500">
                    {activeStudent.ID_Aluno} · {activeStudent.Serie_Etapa} ·{' '}
                    {activeStudent.Idade} anos · Origem {activeStudent.categoriaFatorCritico}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-900">
                    <span className={getRiskTextColor(activeStudent.nivelRisco)}>
                      {activeStudent.nivelRisco}
                    </span>
                    <span className="text-slate-400 font-normal mx-2">·</span>
                    <span className="font-mono tabular-nums">
                      {activeStudent.riscoPct.toFixed(1)}%
                    </span>
                  </h2>
                </div>
              </div>

              <div className="mt-3 w-full h-2 bg-slate-100 rounded-sm overflow-hidden">
                <div
                  className={`h-full transition-all duration-200 ${getRiskBarColor(
                    activeStudent.nivelRisco
                  )}`}
                  style={{ width: `${Math.min(100, Math.max(2, activeStudent.riscoPct))}%` }}
                />
              </div>

              {/* Academic & INEP Social Indicators */}
              <div className="mt-5 pt-4 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-4 text-xs">
                <div>
                  <span className="text-slate-500 block">Frequência / Faltas</span>
                  <span className="mt-0.5 font-mono tabular-nums font-semibold text-slate-900">
                    {activeStudent.Frequencia_Pct.toFixed(1)}% ·{' '}
                    {activeStudent.Faltas_Consecutivas}d
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Média / Reprovações</span>
                  <span className="mt-0.5 font-mono tabular-nums font-semibold text-slate-900">
                    {activeStudent.Media_Notas.toFixed(1)} ·{' '}
                    {activeStudent.Historico_Reprovacoes}x
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Distorção Idade-Série</span>
                  <span
                    className={`mt-0.5 font-mono tabular-nums font-semibold ${
                      activeStudent.Distorcao_Idade_Serie >= 2
                        ? 'text-red-700'
                        : 'text-slate-900'
                    }`}
                  >
                    {activeStudent.Distorcao_Idade_Serie} ano(s)
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Turno</span>
                  <span className="mt-0.5 font-semibold text-slate-900">
                    {activeStudent.Turno_Noturno === 1 ? 'Noturno' : 'Diurno'}
                  </span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-500 block">INSE (INEP)</span>
                  <span className="mt-0.5 font-medium text-slate-900 block truncate">
                    {INSE_DESCRICOES[activeStudent.INSE_Nivel]}
                  </span>
                </div>
                <div className="col-span-2 sm:col-span-3">
                  <span className="text-slate-500 block">Transporte Escolar</span>
                  <span className="mt-0.5 font-medium text-slate-900 block">
                    {TRANSPORTE_DESCRICOES[activeStudent.Barreira_Transporte]}
                  </span>
                </div>
              </div>

              {/* Personalized Preventive Intervention Plan */}
              <div className="mt-5 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Plano de Intervenção Preventiva Personalizado
                  </h3>
                  <span className="text-[11px] font-mono text-slate-600">
                    {activeStudent.planoIntervencao.prazo}
                  </span>
                </div>

                <div
                  className={`mt-2.5 p-4 rounded-md border text-xs space-y-2.5 leading-relaxed ${
                    activeStudent.nivelRisco === 'Alto Risco'
                      ? 'bg-red-50/50 border-red-200 text-slate-900'
                      : activeStudent.nivelRisco === 'Risco Médio'
                      ? 'bg-amber-50/50 border-amber-200 text-slate-900'
                      : 'bg-emerald-50/50 border-emerald-200 text-slate-900'
                  }`}
                >
                  <div>
                    <span className="font-semibold text-slate-900">Objetivo: </span>
                    <span className="text-slate-800">
                      {activeStudent.planoIntervencao.objetivo}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900">Ação Pedagógica: </span>
                    <span className="text-slate-800">
                      {activeStudent.planoIntervencao.acaoPedagogica}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900">
                      Articulação Social / Estado:{' '}
                    </span>
                    <span className="text-slate-800">
                      {activeStudent.planoIntervencao.articulacaoSocial}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-600">
                    <span>
                      Responsável: <strong>{activeStudent.planoIntervencao.responsavel}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={onNavigateToPolicies}
                      className="font-medium text-slate-800 underline hover:text-slate-950 whitespace-nowrap"
                    >
                      Guia da rede pública
                    </button>
                  </div>
                </div>
              </div>

              {/* Per-Student Feature Attribution */}
              <div className="mt-5 pt-4 border-t border-slate-200">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Peso Local das Variáveis Neste Aluno
                  </h3>
                  <span className="text-[11px] text-slate-500">Saabas (pp)</span>
                </div>

                <div className="mt-3 space-y-2">
                  {sortedContribs.map((item) => {
                    const widthPct = Math.min(
                      100,
                      (Math.abs(item.value) / maxAbsContrib) * 100
                    );
                    const isPositive = item.value >= 0;
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
                              isPositive ? 'text-red-700' : 'text-emerald-700'
                            }`}
                          >
                            {isPositive ? '+' : ''}
                            {item.value.toFixed(1)} pp
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-sm overflow-hidden">
                          <div
                            className={`h-full transition-all duration-200 ${
                              isPositive ? 'bg-red-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.max(3, widthPct)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Selecione um estudante na lista para visualizar o plano de intervenção.
            </p>
          )}
        </section>
      </div>
    </div>
  );
};
