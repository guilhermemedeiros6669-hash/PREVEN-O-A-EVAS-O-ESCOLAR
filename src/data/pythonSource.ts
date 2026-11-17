export interface PythonModuleFile {
  id: string;
  filename: string;
  role: string;
  content: string;
}

export const PYTHON_MODULES: PythonModuleFile[] = [
  {
    id: 'data_inep',
    filename: 'data_inep.py',
    role: 'Ingestão de CSV real ou simulação dos microdados do INEP (Distorção Idade-Série, Turno Noturno, INSE e Transporte).',
    content: `"""
data_inep.py
Camada de ingestão e engenharia de atributos inspirada nos microdados do INEP
(Censo Escolar, Indicador de Nível Socioeconômico - INSE e Transporte Escolar).
"""

import numpy as np
import pandas as pd

FEATURES = [
    "Frequencia_Pct",
    "Media_Notas",
    "Faltas_Consecutivas",
    "Historico_Reprovacoes",
    "Distorcao_Idade_Serie",
    "Turno_Noturno",
    "INSE_Nivel",
    "Barreira_Transporte",
]

NOMES_VARIAVEIS = {
    "Frequencia_Pct": "Frequência (%)",
    "Media_Notas": "Média de Notas",
    "Faltas_Consecutivas": "Faltas Consecutivas",
    "Historico_Reprovacoes": "Histórico de Reprovações",
    "Distorcao_Idade_Serie": "Distorção Idade-Série (anos)",
    "Turno_Noturno": "Turno Noturno",
    "INSE_Nivel": "Vulnerabilidade Social (INSE)",
    "Barreira_Transporte": "Fatores de Transporte Escolar",
}

CATEGORIA_VARIAVEL = {
    "Frequencia_Pct": "Acadêmico",
    "Media_Notas": "Acadêmico",
    "Faltas_Consecutivas": "Acadêmico",
    "Historico_Reprovacoes": "Acadêmico",
    "Distorcao_Idade_Serie": "Social (INEP)",
    "Turno_Noturno": "Social (INEP)",
    "INSE_Nivel": "Social (INEP)",
    "Barreira_Transporte": "Social (INEP)",
}

SERIE_IDADE_IDEAL = {
    "9º Ano EF": 14,
    "1ª Série EM": 15,
    "2ª Série EM": 16,
    "3ª Série EM": 17,
}


def gerar_microdados_inep_simulados(n_alunos: int = 300, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    series = list(SERIE_IDADE_IDEAL.keys())

    registros = []
    for i in range(n_alunos):
        id_aluno = f"INEP-{2026001 + i}"
        serie = series[int(rng.integers(0, len(series)))]
        idade_ideal = SERIE_IDADE_IDEAL[serie]

        inse_nivel = int(np.clip(np.round(rng.normal(3.2, 1.45)), 1, 7))
        vuln_inse = 1 if inse_nivel <= 2 else 0

        prob_atraso = np.clip(0.18 + vuln_inse * 0.22, 0.10, 0.55)
        distorcao = int(rng.integers(1, 5)) if rng.random() < prob_atraso else 0
        idade = idade_ideal + distorcao

        prob_noturno = np.clip(
            0.12 + (0.42 if distorcao >= 2 else 0.0) + (0.20 if idade >= 18 else 0.0),
            0.08,
            0.80,
        )
        turno_noturno = 1 if rng.random() < prob_noturno else 0

        u_transp = rng.random()
        if u_transp < (0.26 if vuln_inse else 0.11):
            barreira_transporte = 2
        elif u_transp < (0.58 if vuln_inse else 0.35):
            barreira_transporte = 1
        else:
            barreira_transporte = 0

        prob_reprov = np.clip(0.06 + distorcao * 0.22 + vuln_inse * 0.10, 0.04, 0.75)
        reprovacoes = int(rng.binomial(3, prob_reprov))

        freq = float(
            np.clip(
                rng.normal(88.5, 9.0)
                - turno_noturno * 6.5
                - barreira_transporte * 5.2
                - vuln_inse * 3.8
                - distorcao * 2.1
                - reprovacoes * 2.5,
                35.0,
                100.0,
            )
        )
        freq = round(freq, 1)

        faltas = int(
            np.clip(
                np.round(
                    max(
                        0.0,
                        (100.0 - freq) * 0.32
                        + barreira_transporte * 1.4
                        + turno_noturno * 1.2
                        + rng.normal(0.0, 1.9),
                    )
                ),
                0,
                25,
            )
        )

        media = float(
            np.clip(
                5.8
                + (freq - 75.0) * 0.07
                - reprovacoes * 0.5
                - turno_noturno * 0.35
                - (0.45 if inse_nivel <= 2 else 0.0)
                + rng.normal(0.0, 1.2),
                0.5,
                10.0,
            )
        )
        media = round(media, 1)

        logit = (
            -2.2
            + (75.0 - freq) * 0.085
            + (faltas - 5) * 0.18
            + (6.0 - media) * 0.38
            + reprovacoes * 0.42
            + distorcao * 0.52
            + turno_noturno * 0.95
            + (3.5 - inse_nivel) * 0.44
            + barreira_transporte * 0.85
        )
        prob_evasao = 1.0 / (1.0 + np.exp(-logit))
        status_evasao = int(rng.binomial(1, np.clip(prob_evasao, 0.02, 0.98)))

        registros.append(
            {
                "ID_Aluno": id_aluno,
                "Serie_Etapa": serie,
                "Idade": idade,
                "Frequencia_Pct": freq,
                "Media_Notas": media,
                "Faltas_Consecutivas": faltas,
                "Historico_Reprovacoes": reprovacoes,
                "Distorcao_Idade_Serie": distorcao,
                "Turno_Noturno": turno_noturno,
                "INSE_Nivel": inse_nivel,
                "Barreira_Transporte": barreira_transporte,
                "Status_Evasao": status_evasao,
            }
        )

    return pd.DataFrame(registros)


def preparar_csv_inep(df_bruto: pd.DataFrame) -> pd.DataFrame:
    df = df_bruto.copy()
    for col in FEATURES:
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)
    return df
`,
  },
  {
    id: 'modelo_rf',
    filename: 'modelo_rf.py',
    role: 'Treinamento do RandomForestClassifier, validação estratificada, peso global Gini e explicabilidade local (Saabas).',
    content: `"""
modelo_rf.py
Pipeline de Machine Learning com RandomForestClassifier, validação estratificada,
extração da importância global (Gini) e explicabilidade local por estudante.
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import train_test_split

from data_inep import CATEGORIA_VARIAVEL, FEATURES, NOMES_VARIAVEIS


def treinar_random_forest(df: pd.DataFrame, random_state: int = 42) -> dict:
    X = df[FEATURES]
    y = df["Status_Evasao"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.25, stratify=y, random_state=random_state
    )

    modelo = RandomForestClassifier(
        n_estimators=200,
        max_depth=6,
        min_samples_leaf=4,
        class_weight="balanced",
        random_state=random_state,
    )
    modelo.fit(X_train, y_train)

    y_pred = modelo.predict(X_test)
    metricas = {
        "accuracy": accuracy_score(y_test, y_pred),
        "precision": precision_score(y_test, y_pred, zero_division=0),
        "recall": recall_score(y_test, y_pred, zero_division=0),
        "f1": f1_score(y_test, y_pred, zero_division=0),
        "confusion_matrix": confusion_matrix(y_test, y_pred),
        "n_treino": len(X_train),
        "n_teste": len(X_test),
    }

    df_importancia = pd.DataFrame(
        {
            "Variavel": FEATURES,
            "Nome": [NOMES_VARIAVEIS[f] for f in FEATURES],
            "Categoria": [CATEGORIA_VARIAVEL[f] for f in FEATURES],
            "Peso_Gini_Pct": (modelo.feature_importances_ * 100).round(2),
        }
    ).sort_values(by="Peso_Gini_Pct", ascending=False)

    peso_social_total = float(
        df_importancia.loc[
            df_importancia["Categoria"] == "Social (INEP)", "Peso_Gini_Pct"
        ].sum()
    )

    return {
        "modelo": modelo,
        "metricas": metricas,
        "importancia_global": df_importancia,
        "peso_social_total_pct": round(peso_social_total, 1),
    }


def explicar_predicao_aluno(
    modelo: RandomForestClassifier, registro_aluno: pd.DataFrame
) -> dict:
    x_array = registro_aluno[FEATURES].to_numpy(dtype=float)
    contribuicoes = np.zeros(len(FEATURES), dtype=float)

    for arvore in modelo.estimators_:
        tree_ = arvore.tree_
        node_indicator = tree_.decision_path(x_array)
        caminho = node_indicator.indices[
            node_indicator.indptr[0] : node_indicator.indptr[1]
        ]

        for i in range(len(caminho) - 1):
            no_pai = caminho[i]
            no_filho = caminho[i + 1]
            feat_idx = tree_.feature[no_pai]
            if feat_idx >= 0:
                val_pai = tree_.value[no_pai][0]
                val_filho = tree_.value[no_filho][0]
                p_pai = val_pai[1] / val_pai.sum()
                p_filho = val_filho[1] / val_filho.sum()
                contribuicoes[feat_idx] += p_filho - p_pai

    contribuicoes /= len(modelo.estimators_)
    prob_risco = float(modelo.predict_proba(registro_aluno[FEATURES])[0][1])

    contrib_pct = {
        FEATURES[i]: round(float(contribuicoes[i]) * 100, 2)
        for i in range(len(FEATURES))
    }
    fator_critico = max(contrib_pct, key=lambda k: contrib_pct[k])

    return {
        "probabilidade": prob_risco,
        "risco_pct": round(prob_risco * 100, 1),
        "fator_critico": fator_critico,
        "contribuicoes_pct": contrib_pct,
    }
`,
  },
  {
    id: 'plano_intervencao',
    filename: 'plano_intervencao.py',
    role: 'Construção do Plano de Intervenção Preventiva Personalizado com prazo, responsável, ação pedagógica e política pública.',
    content: `"""
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
`,
  },
  {
    id: 'app',
    filename: 'app.py',
    role: 'Dashboard interativo em Streamlit com filtros por risco, turno noturno, INSE e distorção idade-série + Plano de Intervenção.',
    content: `"""
app.py
Dashboard em Streamlit para combate à evasão escolar com microdados do INEP,
Random Forest e Plano de Intervenção Preventiva Personalizado.
"""

import pandas as pd
import streamlit as st

from data_inep import (
    CATEGORIA_VARIAVEL,
    NOMES_VARIAVEIS,
    gerar_microdados_inep_simulados,
    preparar_csv_inep,
)
from modelo_rf import treinar_random_forest
from plano_intervencao import gerar_painel_avaliacoes


@st.cache_resource
def executar_pipeline(df_base: pd.DataFrame):
    resultado_treino = treinar_random_forest(df_base)
    df_avaliado = gerar_painel_avaliacoes(df_base, resultado_treino["modelo"])
    return resultado_treino, df_avaliado


def main():
    st.set_page_config(
        page_title="Alerta Precoce INEP — Combate à Evasão Escolar",
        layout="wide",
    )

    st.title("Sistema Preditivo de Combate à Evasão Escolar (Padrão INEP)")
    st.markdown(
        "Modelo **Random Forest** integrando variáveis sociais dos microdados do INEP "
        "(**Distorção Idade-Série**, **Turno Noturno**, **INSE** e **Transporte Escolar**) "
        "com **Plano de Intervenção Preventiva Personalizado**."
    )

    with st.sidebar:
        st.header("Fonte de Dados (INEP)")
        arquivo_csv = st.file_uploader("Importar CSV de alunos (opcional)", type=["csv"])
        if arquivo_csv is not None:
            df_dados = preparar_csv_inep(pd.read_csv(arquivo_csv))
        else:
            df_dados = gerar_microdados_inep_simulados(n_alunos=260, seed=42)

    treino, df_avaliado = executar_pipeline(df_dados)
    metricas = treino["metricas"]

    with st.sidebar:
        st.header("Filtros do Painel")
        filtro_risco = st.multiselect(
            "Nível de Risco",
            ["Alto Risco", "Risco Médio", "Baixo Risco"],
            default=["Alto Risco", "Risco Médio"],
        )
        filtro_turno = st.selectbox("Turno", ["Todos", "Apenas Noturno", "Apenas Diurno"])
        apenas_inse_critico = st.checkbox("Apenas Alta Vulnerabilidade (INSE <= 2)")
        apenas_distorcao = st.checkbox("Apenas Distorção Idade-Série (>= 2 anos)")

    df_filtrado = df_avaliado.copy()
    if filtro_risco:
        df_filtrado = df_filtrado[df_filtrado["Nivel_Risco"].isin(filtro_risco)]
    if filtro_turno == "Apenas Noturno":
        df_filtrado = df_filtrado[df_filtrado["Turno_Noturno"] == 1]
    elif filtro_turno == "Apenas Diurno":
        df_filtrado = df_filtrado[df_filtrado["Turno_Noturno"] == 0]
    if apenas_inse_critico:
        df_filtrado = df_filtrado[df_filtrado["INSE_Nivel"] <= 2]
    if apenas_distorcao:
        df_filtrado = df_filtrado[df_filtrado["Distorcao_Idade_Serie"] >= 2]

    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Alunos Filtrados", len(df_filtrado))
    c2.metric("Alto Risco (>= 65%)", int((df_avaliado["Nivel_Risco"] == "Alto Risco").sum()))
    c3.metric("Peso das Variáveis Sociais", f"{treino['peso_social_total_pct']:.1f}%")
    c4.metric("Acurácia Random Forest", f"{metricas['accuracy'] * 100:.1f}%")

    aba_painel, aba_plano, aba_pesos = st.tabs(
        [
            "Alunos em Risco",
            "Plano de Intervenção Personalizado",
            "Peso Preditivo das Variáveis Sociais",
        ]
    )

    with aba_painel:
        colunas = [
            "ID_Aluno",
            "Serie_Etapa",
            "Nivel_Risco",
            "Risco_Evasao_Pct",
            "Distorcao_Idade_Serie",
            "Turno_Noturno",
            "INSE_Nivel",
            "Barreira_Transporte",
            "Origem_Fator",
            "Motivo_Principal",
        ]
        st.dataframe(df_filtrado[colunas], use_container_width=True, hide_index=True)

    with aba_plano:
        lista_ids = (
            df_filtrado["ID_Aluno"].tolist()
            if len(df_filtrado) > 0
            else df_avaliado["ID_Aluno"].tolist()
        )
        aluno_sel = st.selectbox("Selecionar Estudante para Intervenção", lista_ids)
        aluno = df_avaliado[df_avaliado["ID_Aluno"] == aluno_sel].iloc[0]

        col_esq, col_dir = st.columns([1.15, 1])
        with col_esq:
            st.subheader(
                f"{aluno['ID_Aluno']} ({aluno['Serie_Etapa']}) — {aluno['Nivel_Risco']} ({aluno['Risco_Evasao_Pct']:.1f}%)"
            )
            st.markdown(f"**Fator Crítico Principal:** {aluno['Motivo_Principal']} ({aluno['Origem_Fator']})")
            st.info(f"**Objetivo do Plano:** {aluno['Plano_Objetivo']}")
            st.write(f"**Ação Pedagógica Imediata:** {aluno['Plano_Acao_Pedagogica']}")
            st.write(f"**Articulação com Políticas Públicas:** {aluno['Plano_Politica_Publica']}")
            st.write(f"**Prazo:** {aluno['Plano_Prazo']} | **Responsável:** {aluno['Plano_Responsavel']}")

        with col_dir:
            st.subheader("Contribuição Local das Variáveis (pp)")
            contrib_series = pd.Series(
                {
                    f"{NOMES_VARIAVEIS[k]} ({CATEGORIA_VARIAVEL[k]})": v
                    for k, v in aluno["Contribuicoes"].items()
                }
            ).sort_values(ascending=True)
            st.bar_chart(contrib_series)

    with aba_pesos:
        st.subheader("Importância Global das Variáveis no Random Forest (Gini)")
        st.dataframe(treino["importancia_global"], use_container_width=True, hide_index=True)
        st.bar_chart(treino["importancia_global"].set_index("Nome")["Peso_Gini_Pct"])


if __name__ == "__main__":
    main()
`,
  },
];

export const COLAB_CELL_1 = `# Célula 1: Instalar dependências no Google Colab
!pip install -q streamlit pandas scikit-learn numpy`;

export const COLAB_CELL_2 = `# Célula 2: Salvar os 4 módulos no diretório atual do Colab
# Use %%writefile data_inep.py, %%writefile modelo_rf.py,
# %%writefile plano_intervencao.py e %%writefile app.py`;

export const COLAB_CELL_3 = `# Célula 3: Descobrir IP público (senha do túnel) e iniciar o dashboard
!wget -q -O - ipv4.icanhazip.com
!streamlit run app.py &>/content/logs.txt &
!npx --yes localtunnel --port 8501`;
