import React, { useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { StudentEvaluation } from '../ml/types';

interface PublicPoliciesViewProps {
  evaluations: StudentEvaluation[];
  onInspectStudent: (id: string) => void;
}

type SphereFilter =
  | 'Todas'
  | 'Federal / Estadual'
  | 'Municipal / Intersetorial'
  | 'Sistema de Garantia';

interface PolicyCardData {
  id: string;
  programa: string;
  esfera: Exclude<SphereFilter, 'Todas'>;
  orgao: string;
  fatorSocialRelacionado: string;
  gatilho: string;
  comoEscolaAciona: string;
  documentos: string;
  matchedStudents: StudentEvaluation[];
}

export const PublicPoliciesView: React.FC<PublicPoliciesViewProps> = ({
  evaluations,
  onInspectStudent,
}) => {
  const [sphereFilter, setSphereFilter] = useState<SphereFilter>('Todas');

  const atRisk = useMemo(
    () => evaluations.filter((e) => e.nivelRisco !== 'Baixo Risco'),
    [evaluations]
  );

  const policyCatalog: PolicyCardData[] = useMemo(() => {
    return [
      {
        id: 'busca-ativa',
        programa: 'Busca Ativa Escolar (UNICEF / Undime) e FICAI',
        esfera: 'Sistema de Garantia',
        orgao: 'Secretaria de Educação · Rede Intersetorial · Conselho Tutelar',
        fatorSocialRelacionado: 'Faltas reiteradas e abandono iminente',
        gatilho: 'Frequência abaixo de 75% ou 5+ faltas consecutivas',
        comoEscolaAciona:
          'A coordenação registra o caso na Busca Ativa Escolar para mobilizar agentes comunitários. Esgotadas as ações da escola, envia a Ficha de Comunicação de Aluno Infrequente (FICAI) ao Conselho Tutelar conforme o Art. 56 do ECA.',
        documentos: 'Histórico de frequência, registro das tentativas de contato e endereço atualizado.',
        matchedStudents: atRisk.filter(
          (s) => s.Frequencia_Pct < 75 || s.Faltas_Consecutivas >= 5
        ),
      },
      {
        id: 'pe-de-meia-cras',
        programa: 'CRAS / CadÚnico, Bolsa Família, Pé-de-Meia e PNAE',
        esfera: 'Federal / Estadual',
        orgao: 'CRAS (Assistência Social / SUAS) · MEC · Gestão Escolar',
        fatorSocialRelacionado: 'Vulnerabilidade Social (INSE Nível I–II)',
        gatilho: 'Estudante classificado no INSE Nível I ou II com risco médio ou alto',
        comoEscolaAciona:
          'Emitir declaração de matrícula/frequência regular (mínimo 80% no Sistema Presença para o Pé-de-Meia) e encaminhar os responsáveis ao CRAS para atualização cadastral no CadÚnico, benefícios eventuais e segurança alimentar via PNAE.',
        documentos: 'CPF do estudante, declaração escolar de matrícula e ofício ao CRAS.',
        matchedStudents: atRisk.filter((s) => s.INSE_Nivel <= 2),
      },
      {
        id: 'pnate-transporte',
        programa: 'PNATE (Transporte Escolar) e Passe Livre Estudantil',
        esfera: 'Federal / Estadual',
        orgao: 'Secretaria Estadual / Municipal de Educação (Transporte)',
        fatorSocialRelacionado: 'Fatores de Transporte Escolar (rota parcial ou ausência)',
        gatilho: 'Dependência de rota escolar crítica ou ausência de transporte seguro',
        comoEscolaAciona:
          'Protocolar pedido de inclusão imediata em rota do Transporte Escolar (PNATE) junto à diretoria de ensino/prefeitura ou emitir atestado escolar para Passe Livre Estudantil.',
        documentos: 'Comprovante de residência, indicação do ponto de embarque e matrícula ativa.',
        matchedStudents: atRisk.filter((s) => s.Barreira_Transporte >= 1),
      },
      {
        id: 'noturno-aprendiz',
        programa: 'Acolhimento Turno Noturno, PNAE Jantar e Jovem Aprendiz',
        esfera: 'Municipal / Intersetorial',
        orgao: 'Direção Escolar · Secretaria de Educação · Sistema S / CIEE',
        fatorSocialRelacionado: 'Turno Noturno e pressão de trabalho juvenil',
        gatilho: 'Estudante matriculado no Turno Noturno com queda de frequência ou notas',
        comoEscolaAciona:
          'Garantir jantar escolar completo (PNAE), flexibilizar atividades iniciais para trabalhadores e articular vagas protegidas de Jovem Aprendiz para compatibilizar estudo e trabalho.',
        documentos: 'Atestado de matrícula noturna e plano de flexibilização pedagógica.',
        matchedStudents: atRisk.filter((s) => s.Turno_Noturno === 1),
      },
      {
        id: 'correcao-fluxo',
        programa: 'Política Estadual de Correção de Fluxo, Recomposição e EJA',
        esfera: 'Federal / Estadual',
        orgao: 'Secretaria Estadual de Educação (SEDUC) / Diretoria de Ensino',
        fatorSocialRelacionado: 'Distorção Idade-Série (≥ 2 anos de atraso)',
        gatilho: 'Distorção idade-série de 2+ anos ou histórico de múltiplas reprovações',
        comoEscolaAciona:
          'Matricular o estudante em projetos estaduais de aceleração de aprendizagem, recomposição no contraturno ou Educação de Jovens e Adultos (EJA) flexível compatível com sua faixa etária.',
        documentos: 'Plano de Recomposição Individual, boletim diagnóstico e ata de conselho.',
        matchedStudents: atRisk.filter(
          (s) => s.Distorcao_Idade_Serie >= 2 || s.Historico_Reprovacoes >= 2
        ),
      },
    ];
  }, [atRisk]);

  const filteredPolicies = useMemo(() => {
    if (sphereFilter === 'Todas') return policyCatalog;
    return policyCatalog.filter((p) => p.esfera === sphereFilter);
  }, [policyCatalog, sphereFilter]);

  return (
    <div className="space-y-6">
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <h2 className="text-base font-semibold text-slate-900">
          Protocolo da Escola para Acionamento de Políticas Públicas do Estado
        </h2>
        <p className="mt-1 text-xs text-slate-500 max-w-3xl">
          Mapeamento direto das variáveis sociais dos microdados do INEP (Distorção Idade-Série,
          Turno Noturno, INSE e Transporte Escolar) para os equipamentos públicos da rede de
          proteção.
        </p>

        <div className="mt-5 pt-5 border-t border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-xs font-semibold text-slate-900">
              01. Detecção Precoce e Escuta (0–48h)
            </p>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
              Identificar no painel Random Forest se a raiz do risco é pedagógica ou social (INSE,
              transporte, noturno, distorção) antes de aplicar medidas punitivas.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-900">
              02. Encaminhamento à Rede Setorial (SUAS / SEDUC)
            </p>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
              Acionar CRAS (CadÚnico, Pé-de-Meia, Bolsa Família), Setor de Transporte (PNATE) ou
              programas estaduais de correção de fluxo e recomposição.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-900">
              03. Busca Ativa e Garantia de Direitos (ECA Art. 56)
            </p>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
              Registrar casos persistentes na Busca Ativa Escolar e protocolar FICAI no Conselho
              Tutelar após esgotados os recursos internos da escola.
            </p>
          </div>
        </div>
      </section>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-md overflow-x-auto">
          {(
            [
              'Todas',
              'Federal / Estadual',
              'Municipal / Intersetorial',
              'Sistema de Garantia',
            ] as SphereFilter[]
          ).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setSphereFilter(opt)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                sphereFilter === opt
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500">
          Elegibilidade calculada sobre os{' '}
          <span className="font-mono tabular-nums font-semibold text-slate-800">
            {atRisk.length}
          </span>{' '}
          estudantes em risco médio ou alto.
        </p>
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredPolicies.map((policy) => (
          <article
            key={policy.id}
            className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-slate-500">
                    {policy.esfera} · {policy.orgao}
                  </p>
                  <h3 className="mt-1 text-base font-semibold text-slate-900">
                    {policy.programa}
                  </h3>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xl font-mono tabular-nums font-semibold text-slate-900 block">
                    {policy.matchedStudents.length}
                  </span>
                  <span className="text-[11px] text-slate-500">elegíveis</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-200 space-y-3 text-xs">
                <div>
                  <span className="font-semibold text-slate-800">Variável INEP vinculada: </span>
                  <span className="text-slate-600">{policy.fatorSocialRelacionado}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-800">Gatilho na escola: </span>
                  <span className="text-slate-600">{policy.gatilho}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-800">Como a escola aciona: </span>
                  <span className="text-slate-700 leading-relaxed">{policy.comoEscolaAciona}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-800">Documentação base: </span>
                  <span className="text-slate-600">{policy.documentos}</span>
                </div>
              </div>
            </div>

            {policy.matchedStudents.length > 0 ? (
              <div className="mt-5 pt-4 border-t border-slate-200">
                <p className="text-[11px] font-medium text-slate-500 mb-2">
                  Estudantes prioritários (clique para abrir o plano de intervenção):
                </p>
                <div className="flex flex-wrap gap-2">
                  {policy.matchedStudents.slice(0, 5).map((st) => (
                    <button
                      key={st.ID_Aluno}
                      type="button"
                      onClick={() => onInspectStudent(st.ID_Aluno)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono tabular-nums font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 rounded transition-colors whitespace-nowrap"
                    >
                      <span>{st.ID_Aluno}</span>
                      <span className="text-red-700">({st.riscoPct.toFixed(0)}%)</span>
                      <ArrowRight className="w-3 h-3 text-slate-500" aria-hidden="true" />
                    </button>
                  ))}
                  {policy.matchedStudents.length > 5 ? (
                    <span className="text-xs text-slate-500 self-center">
                      +{policy.matchedStudents.length - 5} outros
                    </span>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="mt-5 pt-4 border-t border-slate-200 text-xs text-slate-500">
                Nenhum estudante da base atual enquadrado neste gatilho.
              </div>
            )}
          </article>
        ))}
      </section>
    </div>
  );
};
