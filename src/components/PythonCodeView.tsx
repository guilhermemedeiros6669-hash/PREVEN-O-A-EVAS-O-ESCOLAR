import React, { useMemo, useState } from 'react';
import { Check, Copy, Download } from 'lucide-react';
import {
  COLAB_CELL_1,
  COLAB_CELL_2,
  COLAB_CELL_3,
  PYTHON_MODULES,
} from '../data/pythonSource';

export const PythonCodeView: React.FC = () => {
  const [activeModuleId, setActiveModuleId] = useState<string>(PYTHON_MODULES[0].id);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const activeModule = useMemo(
    () => PYTHON_MODULES.find((m) => m.id === activeModuleId) ?? PYTHON_MODULES[0],
    [activeModuleId]
  );

  const handleCopy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      setCopiedKey(null);
    }
  };

  const handleDownloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/x-python;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Colab Instructions */}
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="pb-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">
            Arquitetura Modular em Python (4 Módulos) & Google Colab
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            O projeto foi dividido em 4 arquivos limpos para manutenção profissional: ingestão
            INEP (<span className="font-mono">data_inep.py</span>), Random Forest (
            <span className="font-mono">modelo_rf.py</span>), plano preventivo (
            <span className="font-mono">plano_intervencao.py</span>) e dashboard (
            <span className="font-mono">app.py</span>).
          </p>
        </div>

        <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[
            {
              key: 'c1',
              title: '01. Instalar Bibliotecas',
              desc: 'Instala Streamlit, Pandas, Scikit-Learn e NumPy no ambiente Colab.',
              code: COLAB_CELL_1,
            },
            {
              key: 'c2',
              title: '02. Criar os 4 Módulos',
              desc: 'Salve cada arquivo abaixo na pasta raiz do Colab usando %%writefile.',
              code: COLAB_CELL_2,
            },
            {
              key: 'c3',
              title: '03. Publicar Streamlit',
              desc: 'Copie o IP retornado por wget e informe como senha no localtunnel.',
              code: COLAB_CELL_3,
            },
          ].map((step) => (
            <div
              key={step.key}
              className="border border-slate-200 rounded-md p-4 bg-slate-50 flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold text-slate-900">{step.title}</h3>
                  <button
                    type="button"
                    onClick={() => handleCopy(step.key, step.code)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 whitespace-nowrap"
                  >
                    {copiedKey === step.key ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" aria-hidden="true" />
                        Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" aria-hidden="true" />
                        Copiar
                      </>
                    )}
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-600">{step.desc}</p>
              </div>
              <pre className="p-3 bg-slate-900 text-slate-100 rounded text-[11px] font-mono overflow-x-auto leading-relaxed">
                <code>{step.code}</code>
              </pre>
            </div>
          ))}
        </div>
      </section>

      {/* Modular Code Browser */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md overflow-x-auto">
            {PYTHON_MODULES.map((mod) => (
              <button
                key={mod.id}
                type="button"
                onClick={() => setActiveModuleId(mod.id)}
                className={`px-3 py-1.5 text-xs font-mono font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  activeModule.id === mod.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {mod.filename}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleCopy(activeModule.id, activeModule.content)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              {copiedKey === activeModule.id ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                  Copiar {activeModule.filename}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => handleDownloadFile(activeModule.filename, activeModule.content)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              Baixar .py
            </button>
          </div>
        </div>

        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
          {activeModule.role}
        </div>

        <pre className="p-6 bg-slate-950 text-slate-100 text-xs font-mono overflow-x-auto max-h-[600px] overflow-y-auto leading-relaxed">
          <code>{activeModule.content}</code>
        </pre>
      </section>
    </div>
  );
};
