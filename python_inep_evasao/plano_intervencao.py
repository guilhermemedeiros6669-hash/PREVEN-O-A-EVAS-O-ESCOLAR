"""
plano_intervencao.py
Motor de tradução do risco preditivo e dos fatores sociais do INEP em um
Plano de Intervenção Preventiva Personalizado para a equipe pedagógica.
"""

import pandas as pd
from sklearn.ensemble import RandomForestClassifier

from data_inep import CATEGORIA_VARIAVEL, FEATURES, NOMES_VARIAVEIS
from modelo_rf import explicar_predicao_aluno


def classificar_nivel_risco(probabilidade: float) -> str:
    if probabilidade >= 0.65:
        return "Alto Risco"
    if probabilidade >= 0.35:
        return "Risco Médio"
    return "Baixo Risco"


def construir_plano_intervencao(
    nivel_risco: str, fator_critico: str, aluno: dict
) -> dict:
    """
    Gera o Plano de Intervenção Preventiva Personalizado com objetivo,
    ação pedagógica imediata, articulação com políticas públicas, prazo e responsável.
    """
    if nivel_risco == "Baixo Risco":
        return {
            "objetivo": "Manutenção do vínculo escolar e prevenção primária.",
            "acao_pedagogica": "Acompanhamento mensal em conselho de classe e incentivo a projetos escolares.",
            "articulacao_publica": "Manter registro regular no Sistema Presença (Pé-de-Meia / Bolsa Família).",
            "prazo": "Monitoramento bimestral",
            "responsavel": "Professor Conselheiro e Secretaria",
        }

    planos_por_fator = {
        "Distorcao_Idade_Serie": {
            "objetivo": f"Reduzir desengajamento por distorção idade-série ({int(aluno['Distorcao_Idade_Serie'])} ano(s) de atraso).",
            "acao_pedagogica": "Inserir em trilha estadual de correção de fluxo / aceleração de estudos com tutoria individual.",
            "articulacao_publica": "Avaliar EJA flexível ou projetos de qualificação profissional junto à Diretoria de Ensino.",
            "prazo": "Até 7 dias úteis",
            "responsavel": "Coordenação Pedagógica e Orientação Educacional",
        },
        "Turno_Noturno": {
            "objetivo": "Mitigar fadiga, jornada de trabalho e evasão no Turno Noturno.",
            "acao_pedagogica": "Flexibilizar entregas assíncronas e adaptar acolhimento nos horários de entrada.",
            "articulacao_publica": "Garantir jantar escolar completo (PNAE) e articular vaga protegida no Jovem Aprendiz.",
            "prazo": "Imediato (até 72h)",
            "responsavel": "Vice-Direção Noturna e Orientação Educacional",
        },
        "INSE_Nivel": {
            "objetivo": f"Superar vulnerabilidade socioeconômica crítica (INSE Nível {int(aluno['INSE_Nivel'])}/7).",
            "acao_pedagogica": "Fornecer kit escolar na unidade e acesso à sala de estudos no contraturno.",
            "articulacao_publica": "Encaminhar família ao CRAS (CadÚnico, Bolsa Família, Pé-de-Meia e benefícios eventuais).",
            "prazo": "Até 5 dias úteis",
            "responsavel": "Orientação Educacional e CRAS",
        },
        "Barreira_Transporte": {
            "objetivo": "Eliminar barreira logística de deslocamento casa–escola.",
            "acao_pedagogica": "Abonar justificadamente atrasos enquanto a rota é regularizada e disponibilizar material offline.",
            "articulacao_publica": "Solicitar inclusão imediata em rota do PNATE ou emitir declaração para Passe Livre Estudantil.",
            "prazo": "Imediato (até 48h)",
            "responsavel": "Direção Escolar e Setor de Transporte (SEDUC)",
        },
        "Frequencia_Pct": {
            "objetivo": f"Recuperar assiduidade (frequência atual: {aluno['Frequencia_Pct']:.1f}%).",
            "acao_pedagogica": "Escuta acolhedora com o estudante e pactuação semanal de retorno presencial.",
            "articulacao_publica": "Abrir alerta na Busca Ativa Escolar e verificar condicionalidade do Pé-de-Meia.",
            "prazo": "Até 48 horas",
            "responsavel": "Coordenação Pedagógica e Busca Ativa",
        },
        "Faltas_Consecutivas": {
            "objetivo": f"Interromper ciclo de {int(aluno['Faltas_Consecutivas'])} faltas consecutivas.",
            "acao_pedagogica": "Contato telefônico imediato e plano de acolhimento pedagógico no retorno.",
            "articulacao_publica": "Visita domiciliar; sem retorno em 48h, protocolar FICAI no Conselho Tutelar (Art. 56 ECA).",
            "prazo": "Urgente (24h–48h)",
            "responsavel": "Direção Escolar e Conselho Tutelar",
        },
        "Media_Notas": {
            "objetivo": f"Reverter defasagem de aprendizagem (média: {aluno['Media_Notas']:.1f}).",
            "acao_pedagogica": "Encaminhar para reforço escolar no contraturno e tutoria por pares.",
            "articulacao_publica": "Avaliar triagem de saúde visual/emocional via Programa Saúde na Escola (PSE / UBS).",
            "prazo": "Até 5 dias úteis",
            "responsavel": "Professores Regentes e Coordenação",
        },
        "Historico_Reprovacoes": {
            "objetivo": f"Quebrar ciclo de retenção ({int(aluno['Historico_Reprovacoes'])} reprovação(ões)).",
            "acao_pedagogica": "Construir Plano Educacional Individualizado (PEI) com recuperação contínua.",
            "articulacao_publica": "Acionar equipe psicopedagógica / AEE e acompanhamento quinzenal com a família.",
            "prazo": "Até 7 dias úteis",
            "responsavel": "Coordenação Pedagógica",
        },
    }

    return planos_por_fator[fator_critico]


def gerar_painel_avaliacoes(
    df: pd.DataFrame, modelo: RandomForestClassifier
) -> pd.DataFrame:
    """Executa predição, explicabilidade local e geração do plano por estudante."""
    linhas = []
    for _, row in df.iterrows():
        entrada = pd.DataFrame([row[FEATURES].to_dict()])
        exp = explicar_predicao_aluno(modelo, entrada)
        nivel = classificar_nivel_risco(exp["probabilidade"])
        fator = exp["fator_critico"]
        plano = construir_plano_intervencao(nivel, fator, row.to_dict())

        linhas.append(
            {
                "ID_Aluno": row["ID_Aluno"],
                "Serie_Etapa": row["Serie_Etapa"],
                "Idade": int(row["Idade"]),
                "Frequencia_Pct": row["Frequencia_Pct"],
                "Media_Notas": row["Media_Notas"],
                "Faltas_Consecutivas": int(row["Faltas_Consecutivas"]),
                "Distorcao_Idade_Serie": int(row["Distorcao_Idade_Serie"]),
                "Turno_Noturno": int(row["Turno_Noturno"]),
                "INSE_Nivel": int(row["INSE_Nivel"]),
                "Barreira_Transporte": int(row["Barreira_Transporte"]),
                "Risco_Evasao_Pct": exp["risco_pct"],
                "Nivel_Risco": nivel,
                "Origem_Fator": CATEGORIA_VARIAVEL[fator],
                "Motivo_Principal": NOMES_VARIAVEIS[fator],
                "Contribuicoes": exp["contribuicoes_pct"],
                "Plano_Objetivo": plano["objetivo"],
                "Plano_Acao_Pedagogica": plano["acao_pedagogica"],
                "Plano_Politica_Publica": plano["articulacao_publica"],
                "Plano_Prazo": plano["prazo"],
                "Plano_Responsavel": plano["responsavel"],
            }
        )

    return pd.DataFrame(linhas).sort_values(by="Risco_Evasao_Pct", ascending=False)
