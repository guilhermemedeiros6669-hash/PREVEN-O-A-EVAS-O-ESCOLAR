import React from 'react';
import { RefreshCw } from 'lucide-react';
import { ModelMetrics, StudentRecord } from '../ml/types';

interface ModelPerformanceViewProps {
  metrics: ModelMetrics;
  dataset: StudentRecord[];
  seed: number;
  onRegenerateDataset: () => void;
}

export const ModelPerformanceView: React.FC<ModelPerformanceViewProps> = ({
  metrics,
  dataset,
  seed,
  onRegenerateDataset,
}) => {
  const { confusionMatrix: cm, globalImportance } = metrics;
  const maxImp = Math.max(10, ...globalImportance.map((g) => g.importancePct));

  return (
    <div className="space-y-6">
      {/* Header Control Row */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Peso Preditivo do Random Forest (Microdados INEP)
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Treino estratificado (75%, n={metrics.trainSize}) e validação fora da amostra (25%, n=
            {metrics.testSize}) · Peso agregado das variáveis sociais:{' '}
            <span className="font-mono tabular-nums font-semibold text-blue-700">
              {metrics.socialWeightSharePct.toFixed(1)}%
            </span>{' '}
            · Semente <span className="font-mono tabular-nums">{seed}</span>
          </p>
        </div>

        <button
          type="button"
          onClick={onRegenerateDataset}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-900 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
          Regerar Amostra e Retreinar
        </button>
      </div>

      {/* Metrics Row */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Acurácia (Accuracy)</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 font-mono tabular-nums">
            {(metrics.accuracy * 100).toFixed(1)}%
          </p>
          <p className="mt-1 text-xs text-slate-500">Acertos totais no teste</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Precisão (Precision)</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 font-mono tabular-nums">
            {(metrics.precision * 100).toFixed(1)}%
          </p>
          <p className="mt-1 text-xs text-slate-500">Alertas verdadeiros</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Sensibilidade (Recall)</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 font-mono tabular-nums">
            {(metrics.recall * 100).toFixed(1)}%
          </p>
          <p className="mt-1 text-xs text-slate-500">Casos de evasão capturados</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">F1-Score</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 font-mono tabular-nums">
            {(metrics.f1 * 100).toFixed(1)}%
          </p>
          <p className="mt-1 text-xs text-slate-500">Equilíbrio precisão-recall</p>
        </div>
      </section>

      {/* Global Importance + Social Weight Explanation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-slate-900">
            Importância Global das Variáveis (Gini: Acadêmicas vs. Sociais INEP)
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Barras azuis destacam as 4 variáveis sociais dos microdados do INEP; barras escuras
            representam indicadores acadêmicos.
          </p>

          <div className="mt-5 space-y-3.5">
            {globalImportance.map((item) => {
              const widthPct = Math.min(100, (item.importancePct / maxImp) * 100);
              const isSocial = item.category === 'Social (INEP)';
              return (
                <div key={item.feature} className="space-y-1">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <span className="font-medium text-slate-800 truncate">
                      {item.label}{' '}
                      <span
                        className={`text-[11px] font-normal ${
                          isSocial ? 'text-blue-700' : 'text-slate-500'
                        }`}
                      >
                        ({item.category})
                      </span>
                    </span>
                    <span className="font-mono tabular-nums font-semibold text-slate-900 shrink-0">
                      {item.importancePct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-sm overflow-hidden">
                    <div
                      className={`h-full transition-all duration-200 ${
                        isSocial ? 'bg-blue-700' : 'bg-slate-900'
                      }`}
                      style={{ width: `${Math.max(4, widthPct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-slate-900">
            Matriz de Confusão (Conjunto de Teste)
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Comparação entre o status real de evasão (0/1) e a classificação do Random Forest.
          </p>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="p-2 text-left text-slate-500 font-medium">Real \ Previsto</th>
                  <th className="p-2 text-center text-slate-700 font-semibold border border-slate-200 bg-slate-50">
                    Permanece (0)
                  </th>
                  <th className="p-2 text-center text-slate-700 font-semibold border border-slate-200 bg-slate-50">
                    Evasão (1)
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-2 font-semibold text-slate-700 border border-slate-200 bg-slate-50">
                    Permanece (0)
                  </td>
                  <td className="p-4 text-center border border-slate-200 bg-emerald-50/50">
                    <span className="block text-lg font-mono tabular-nums font-semibold text-emerald-800">
                      {cm.tn}
                    </span>
                    <span className="text-[11px] text-slate-600">Verdadeiro Negativo</span>
                  </td>
                  <td className="p-4 text-center border border-slate-200 bg-amber-50/40">
                    <span className="block text-lg font-mono tabular-nums font-semibold text-amber-800">
                      {cm.fp}
                    </span>
                    <span className="text-[11px] text-slate-600">Falso Positivo</span>
                  </td>
                </tr>
                <tr>
                  <td className="p-2 font-semibold text-slate-700 border border-slate-200 bg-slate-50">
                    Evasão (1)
                  </td>
                  <td className="p-4 text-center border border-slate-200 bg-red-50/40">
                    <span className="block text-lg font-mono tabular-nums font-semibold text-red-800">
                      {cm.fn}
                    </span>
                    <span className="text-[11px] text-slate-600">Falso Negativo</span>
                  </td>
                  <td className="p-4 text-center border border-slate-200 bg-emerald-50/50">
                    <span className="block text-lg font-mono tabular-nums font-semibold text-emerald-800">
                      {cm.tp}
                    </span>
                    <span className="text-[11px] text-slate-600">Verdadeiro Positivo</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* How Social Variables Influence Random Forest */}
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-slate-900">
          Como as Variáveis Sociais do INEP Influenciam o Peso Preditivo do Random Forest
        </h3>
        <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 text-xs leading-relaxed">
          <div>
            <p className="font-semibold text-slate-900">1. Distorção Idade-Série</p>
            <p className="mt-1 text-slate-600">
              Cria limiares de corte claros nas árvores (ex.: atraso ≥ 2 anos). Amplifica o ganho de
              impureza Gini quando combinada com histórico de reprovações e queda de notas.
            </p>
          </div>
          <div>
            <p className="font-semibold text-slate-900">2. Turno Noturno</p>
            <p className="mt-1 text-slate-600">
              Atua como variável moderadora nos ramos intermediários: alunos do turno noturno têm
              probabilidade de abandono muito maior mesmo com frequências entre 75% e 82%.
            </p>
          </div>
          <div>
            <p className="font-semibold text-slate-900">3. Vulnerabilidade (INSE)</p>
            <p className="mt-1 text-slate-600">
              Níveis I e II (baixo INSE) deslocam a probabilidade base das folhas para cima,
              capturando pressão econômica e insegurança alimentar antes mesmo da queda severa de
              notas.
            </p>
          </div>
          <div>
            <p className="font-semibold text-slate-900">4. Transporte Escolar</p>
            <p className="mt-1 text-slate-600">
              Explica picos de faltas consecutivas e baixa frequência sem desinteresse pedagógico,
              permitindo separar evasão logística (resolvida via PNATE) de evasão acadêmica.
            </p>
          </div>
        </div>
      </section>

      {/* Dataset Sample Preview */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="p-5 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900">
            Amostra dos Microdados Simulados (Primeiros 15 Registros)
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Esquema alinhado ao Censo Escolar e INSE: Série, Idade, Distorção Idade-Série, Turno
            Noturno (0/1), INSE (1–7), Transporte (0–2) e Status de Evasão (0/1).
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="py-2.5 px-4 font-medium">ID_Aluno</th>
                <th className="py-2.5 px-3 font-medium">Série</th>
                <th className="py-2.5 px-3 text-right font-medium">Freq. (%)</th>
                <th className="py-2.5 px-3 text-right font-medium">Média</th>
                <th className="py-2.5 px-3 text-right font-medium">Distorção</th>
                <th className="py-2.5 px-3 text-right font-medium">Noturno</th>
                <th className="py-2.5 px-3 text-right font-medium">INSE</th>
                <th className="py-2.5 px-3 text-right font-medium">Transp.</th>
                <th className="py-2.5 px-4 text-right font-medium">Evasão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
              {dataset.slice(0, 15).map((row) => (
                <tr key={row.ID_Aluno} className="hover:bg-slate-50">
                  <td className="py-2 px-4 text-slate-900 font-medium">{row.ID_Aluno}</td>
                  <td className="py-2 px-3 font-sans text-slate-700">{row.Serie_Etapa}</td>
                  <td className="py-2 px-3 text-right text-slate-700">
                    {row.Frequencia_Pct.toFixed(1)}
                  </td>
                  <td className="py-2 px-3 text-right text-slate-700">
                    {row.Media_Notas.toFixed(1)}
                  </td>
                  <td className="py-2 px-3 text-right text-slate-700">
                    {row.Distorcao_Idade_Serie}a
                  </td>
                  <td className="py-2 px-3 text-right text-slate-700">{row.Turno_Noturno}</td>
                  <td className="py-2 px-3 text-right text-slate-700">{row.INSE_Nivel}</td>
                  <td className="py-2 px-3 text-right text-slate-700">
                    {row.Barreira_Transporte}
                  </td>
                  <td
                    className={`py-2 px-4 text-right font-semibold ${
                      row.Status_Evasao === 1 ? 'text-red-700' : 'text-emerald-700'
                    }`}
                  >
                    {row.Status_Evasao}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
