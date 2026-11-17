"""
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
    """
    Treina um RandomForestClassifier com class_weight='balanced' para lidar com
    desequilíbrio de classes e retorna o modelo, métricas e pesos globais.
    """
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
    """
    Calcula a contribuição local de cada variável ao longo dos caminhos das
    árvores da Random Forest (método Saabas / TreeInterpreter nativo),
    identificando qual fator mais elevou o risco de evasão para ESTE aluno.
    """
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
