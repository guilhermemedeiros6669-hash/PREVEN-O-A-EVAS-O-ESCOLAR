"""
app.py
Dashboard em Streamlit para combate à evasão escolar com microdados do INEP,
Random Forest e Plano de Intervenção Preventiva Personalizado.
"""

import pandas as pd
import streamlit as st

from data_inep import (
    CATEGORIA_VARIAVEL,
    NOMES_VARIAVEIS,
    SERIE_IDADE_IDEAL,
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

    # Opção de upload de CSV real ou uso da base simulada INEP
    with st.sidebar:
        st.header("Fonte de Dados (INEP)")
        arquivo_csv = st.file_uploader("Importar CSV de alunos (opcional)", type=["csv"])
        if arquivo_csv is not None:
            df_dados = preparar_csv_inep(pd.read_csv(arquivo_csv))
        else:
            df_dados = gerar_microdados_inep_simulados(n_alunos=260, seed=42)

    treino, df_avaliado = executar_pipeline(df_dados)
    metricas = treino["metricas"]

    # Filtros interativos na barra lateral
    with st.sidebar:
        st.header("Filtros do Painel")
        filtro_risco = st.multiselect(
            "Nível de Risco",
            ["Alto Risco", "Risco Médio", "Baixo Risco"],
            default=["Alto Risco", "Risco Médio"],
        )
        filtro_turno = st.selectbox(
            "Turno",
            ["Todos", "Apenas Noturno", "Apenas Diurno"],
        )
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

    # Indicadores de topo
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
        st.bar_chart(
            treino["importancia_global"].set_index("Nome")["Peso_Gini_Pct"]
        )


if __name__ == "__main__":
    main()
