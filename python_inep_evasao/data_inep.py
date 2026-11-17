"""
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
    """
    Gera dataset realista alinhado ao esquema de variáveis dos microdados do INEP:
      - Distorcao_Idade_Serie: diferença em anos entre NU_IDADE e idade ideal da etapa
      - Turno_Noturno: 1 se matriculado no turno noturno (IN_NOTURNO), 0 caso contrário
      - INSE_Nivel: Indicador de Nível Socioeconômico do INEP (1=Muito Baixo .. 7=Muito Alto)
      - Barreira_Transporte: 0=Acesso regular, 1=Rota parcial, 2=Barreira crítica sem transporte
    """
    rng = np.random.default_rng(seed)
    series = list(SERIE_IDADE_IDEAL.keys())

    registros = []
    for i in range(n_alunos):
        id_aluno = f"INEP-{2026001 + i}"
        serie = series[int(rng.integers(0, len(series)))]
        idade_ideal = SERIE_IDADE_IDEAL[serie]

        # INSE (1 a 7): níveis 1 e 2 representam alta vulnerabilidade social
        inse_nivel = int(np.clip(np.round(rng.normal(3.2, 1.45)), 1, 7))
        vuln_inse = 1 if inse_nivel <= 2 else 0

        # Distorção Idade-Série (>= 0 anos)
        prob_atraso = np.clip(0.18 + vuln_inse * 0.22, 0.10, 0.55)
        distorcao = int(rng.integers(1, 5)) if rng.random() < prob_atraso else 0
        idade = idade_ideal + distorcao

        # Turno Noturno mais frequente em alunos com distorção >= 2 anos
        prob_noturno = np.clip(
            0.12 + (0.42 if distorcao >= 2 else 0.0) + (0.20 if idade >= 18 else 0.0),
            0.08,
            0.80,
        )
        turno_noturno = 1 if rng.random() < prob_noturno else 0

        # Fator de Transporte Escolar (PNATE / deslocamento)
        u_transp = rng.random()
        if u_transp < (0.26 if vuln_inse else 0.11):
            barreira_transporte = 2
        elif u_transp < (0.58 if vuln_inse else 0.35):
            barreira_transporte = 1
        else:
            barreira_transporte = 0

        # Histórico de reprovações
        prob_reprov = np.clip(0.06 + distorcao * 0.22 + vuln_inse * 0.10, 0.04, 0.75)
        reprovacoes = int(rng.binomial(3, prob_reprov))

        # Frequência (%) influenciada pelas barreiras sociais
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

        # Relação não-linear realista para gerar Status_Evasao (0 ou 1)
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
    """
    Padroniza um DataFrame carregado via CSV (ex.: extrato do Censo Escolar)
    garantindo tipos numéricos válidos para o pipeline de Machine Learning.
    """
    df = df_bruto.copy()
    for col in FEATURES:
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)
    return df
