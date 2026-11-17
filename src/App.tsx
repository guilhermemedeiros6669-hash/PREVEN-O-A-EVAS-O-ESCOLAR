import { useMemo, useState } from 'react';
import {
  BarChart3,
  Code2,
  Landmark,
  LayoutDashboard,
  Menu,
  UserPlus,
  X,
} from 'lucide-react';
import { ModelPerformanceView } from './components/ModelPerformanceView';
import { PublicPoliciesView } from './components/PublicPoliciesView';
import { PythonCodeView } from './components/PythonCodeView';
import { RiskRosterView } from './components/RiskRosterView';
import { StudentEvaluatorView } from './components/StudentEvaluatorView';
import { generateInepSimulatedStudents } from './ml/dataset';
import { evaluateSingleStudent, trainAndEvaluatePipeline } from './ml/randomForest';
import { StudentRecord } from './ml/types';

type NavTab = 'roster' | 'evaluate' | 'policies' | 'model' | 'python';

const NAV_ITEMS: { id: NavTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'roster', label: 'Painel de Risco', icon: LayoutDashboard },
  { id: 'evaluate', label: 'Avaliar Aluno', icon: UserPlus },
  { id: 'policies', label: 'Políticas Públicas', icon: Landmark },
  { id: 'model', label: 'Modelo e Dados', icon: BarChart3 },
  { id: 'python', label: 'Código Python & Colab', icon: Code2 },
];

const TAB_TITLES: Record<NavTab, string> = {
  roster: 'Painel de Risco INEP & Plano Preventivo',
  evaluate: 'Simular / Avaliar Estudante',
  policies: 'Rede de Políticas Públicas e Sociais',
  model: 'Peso Preditivo e Microdados INEP',
  python: 'Código Modular em Python (Streamlit)',
};

export function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('roster');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [seed, setSeed] = useState(42);
  const [manualStudents, setManualStudents] = useState<StudentRecord[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  const simulatedDataset = useMemo(
    () => generateInepSimulatedStudents(260, seed),
    [seed]
  );

  const pipeline = useMemo(
    () => trainAndEvaluatePipeline(simulatedDataset, seed),
    [simulatedDataset, seed]
  );

  const allEvaluations = useMemo(() => {
    const manualEvals = manualStudents.map((s) =>
      evaluateSingleStudent(s, pipeline.model, true)
    );
    return [...manualEvals, ...pipeline.evaluations].sort(
      (a, b) => b.probabilidadeRisco - a.probabilidadeRisco
    );
  }, [manualStudents, pipeline]);

  const effectiveSelectedId = useMemo(() => {
    if (
      selectedStudentId &&
      allEvaluations.some((e) => e.ID_Aluno === selectedStudentId)
    ) {
      return selectedStudentId;
    }
    return allEvaluations[0]?.ID_Aluno ?? '';
  }, [allEvaluations, selectedStudentId]);

  const nextSuggestedId = useMemo(() => {
    return `INEP-${2026001 + simulatedDataset.length + manualStudents.length}`;
  }, [simulatedDataset.length, manualStudents.length]);

  const handleAddStudent = (student: StudentRecord) => {
    setManualStudents((prev) => [student, ...prev]);
    setSelectedStudentId(student.ID_Aluno);
  };

  const handleRegenerate = () => {
    setSeed((prev) => prev + 17);
    setSelectedStudentId('');
  };

  const handleInspectStudentFromPolicy = (id: string) => {
    setSelectedStudentId(id);
    setActiveTab('roster');
  };

  const handleExportCsv = () => {
    const headers = [
      'ID_Aluno',
      'Serie_Etapa',
      'Idade',
      'Nivel_Risco',
      'Risco_Evasao_Pct',
      'Origem_Fator',
      'Motivo_Principal',
      'Frequencia_Pct',
      'Media_Notas',
      'Faltas_Consecutivas',
      'Historico_Reprovacoes',
      'Distorcao_Idade_Serie',
      'Turno_Noturno',
      'INSE_Nivel',
      'Barreira_Transporte',
      'Plano_Objetivo',
      'Plano_Acao_Pedagogica',
      'Plano_Articulacao_Social',
      'Plano_Prazo',
      'Plano_Responsavel',
    ];
    const escapeCsv = (val: string | number) =>
      `"${String(val).replace(/"/g, '""')}"`;

    const rows = allEvaluations.map((e) =>
      [
        e.ID_Aluno,
        e.Serie_Etapa,
        e.Idade,
        e.nivelRisco,
        e.riscoPct.toFixed(1),
        e.categoriaFatorCritico,
        e.motivoPrincipal,
        e.Frequencia_Pct.toFixed(1),
        e.Media_Notas.toFixed(1),
        e.Faltas_Consecutivas,
        e.Historico_Reprovacoes,
        e.Distorcao_Idade_Serie,
        e.Turno_Noturno,
        e.INSE_Nivel,
        e.Barreira_Transporte,
        e.planoIntervencao.objetivo,
        e.planoIntervencao.acaoPedagogica,
        e.planoIntervencao.articulacaoSocial,
        e.planoIntervencao.prazo,
        e.planoIntervencao.responsavel,
      ]
        .map(escapeCsv)
        .join(',')
    );

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'plano_intervencao_evasao_inep.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const navigateTo = (tab: NavTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 border-r border-slate-200 bg-white">
        <div className="h-16 px-6 flex items-center border-b border-slate-200">
          <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
            Sentinela Escolar
          </span>
        </div>

        <nav className="flex-1 p-4 space-y-1" aria-label="Navegação principal">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigateTo(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 text-[11px] text-slate-500 leading-relaxed">
          Microdados INEP · Distorção Idade-Série, Turno Noturno, INSE e Transporte Escolar.
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative z-10 w-64 max-w-[80vw] bg-white border-r border-slate-200 flex flex-col">
            <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200">
              <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
                Sentinela Escolar
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Fechar menu"
                className="p-2 text-slate-500 hover:text-slate-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="p-4 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigateTo(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>
      ) : null}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Header */}
        <header className="h-16 px-4 sm:px-6 border-b border-slate-200 bg-white flex items-center justify-between gap-8">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir menu"
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs sm:text-sm min-w-0">
              <span className="text-slate-500 whitespace-nowrap hidden sm:inline">
                Coordenação Pedagógica
              </span>
              <span className="text-slate-400 hidden sm:inline" aria-hidden="true">
                /
              </span>
              <h1 className="font-semibold text-slate-900 truncate">
                {TAB_TITLES[activeTab]}
              </h1>
            </div>
          </div>

          <div className="shrink-0">
            {activeTab === 'evaluate' ? (
              <button
                type="button"
                onClick={() => navigateTo('roster')}
                className="px-4 py-2 text-xs font-medium text-slate-900 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
              >
                Ver Lista de Risco
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigateTo('evaluate')}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
              >
                <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
                Avaliar Novo Aluno
              </button>
            )}
          </div>
        </header>

        {/* Viewport Container */}
        <main className="flex-1 p-4 sm:p-6 max-w-[1440px] w-full mx-auto">
          {activeTab === 'roster' ? (
            <RiskRosterView
              evaluations={allEvaluations}
              metrics={pipeline.metrics}
              selectedId={effectiveSelectedId}
              onSelectId={setSelectedStudentId}
              onNavigateToAdd={() => navigateTo('evaluate')}
              onNavigateToPolicies={() => navigateTo('policies')}
              onExportCsv={handleExportCsv}
            />
          ) : null}

          {activeTab === 'evaluate' ? (
            <StudentEvaluatorView
              model={pipeline.model}
              nextSuggestedId={nextSuggestedId}
              onAddStudent={handleAddStudent}
            />
          ) : null}

          {activeTab === 'policies' ? (
            <PublicPoliciesView
              evaluations={allEvaluations}
              onInspectStudent={handleInspectStudentFromPolicy}
            />
          ) : null}

          {activeTab === 'model' ? (
            <ModelPerformanceView
              metrics={pipeline.metrics}
              dataset={simulatedDataset}
              seed={seed}
              onRegenerateDataset={handleRegenerate}
            />
          ) : null}

          {activeTab === 'python' ? <PythonCodeView /> : null}
        </main>
      </div>
    </div>
  );
}

export default App;
