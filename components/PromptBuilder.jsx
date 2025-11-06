'use client';

import { useEffect, useMemo, useState } from 'react';
import { clsx } from 'clsx';

const defaultState = {
  objetivo: '',
  publico: '',
  contexto: '',
  entradas: [],
  tom: 'profissional',
  restricoes: [],
  formato: 'resposta estruturada em t?picos',
  exemplos: '',
  ferramentas: [],
  criterios: [],
  persona: 'Especialista s?nior na ?rea solicitada',
  idioma: 'pt-BR',
  tamanho: 'm?dio',
  estilos: [],
  clarificacoesObrigatorias: true,
};

const stepDefs = [
  { key: 'objetivo', label: 'Objetivo principal', help: 'O que voc? quer obter exatamente?' },
  { key: 'publico', label: 'P?blico-alvo', help: 'Quem vai consumir a sa?da?' },
  { key: 'contexto', label: 'Contexto essencial', help: 'Informa??es de neg?cio, dom?nio, restri??es, fontes.' },
  { key: 'entradas', label: 'Entradas/Vari?veis', help: 'Quais dados o modelo receber?? Adicione como lista.' },
  { key: 'tom', label: 'Tom e voz', help: 'Ex.: profissional, casual, t?cnico, did?tico.' },
  { key: 'restricoes', label: 'Restri??es', help: 'Limites, proibi??es, requisitos normativos.' },
  { key: 'formato', label: 'Formato de sa?da', help: 'T?picos, JSON, tabela Markdown, etc.' },
  { key: 'exemplos', label: 'Exemplos de boa sa?da', help: 'Opcional: um ou mais exemplos.' },
  { key: 'ferramentas', label: 'Ferramentas/Contexto extra', help: 'Links, APIs, bases de conhecimento, documentos.' },
  { key: 'criterios', label: 'Crit?rios de qualidade', help: 'Como avaliar a resposta? Checklist claro.' },
  { key: 'persona', label: 'Persona do assistente', help: 'Quem o modelo deve ?ser? ao responder.' },
  { key: 'idioma', label: 'Idioma de sa?da', help: 'Ex.: pt-BR, en-US, es-ES.' },
  { key: 'tamanho', label: 'Tamanho esperado', help: 'curto | m?dio | longo.' },
  { key: 'estilos', label: 'Diretrizes de estilo', help: 'Palavras proibidas, estrutura, refer?ncias, etc.' },
];

function usePersistentState(key, initialValue){
  const [value, setValue] = useState(() => {
    if (typeof window === 'undefined') return initialValue;
    const fromUrl = new URLSearchParams(window.location.search).get('s');
    if (fromUrl) {
      try { return JSON.parse(decodeURIComponent(escape(atob(fromUrl)))); } catch {}
    }
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : initialValue;
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue];
}

function ListInput({ label, help, items, onAdd, onRemove, placeholder }){
  const [draft, setDraft] = useState('');
  return (
    <div>
      <label className="label">{label}</label>
      <div className="row">
        <input className="input" placeholder={placeholder} value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter' && draft.trim()){ onAdd(draft.trim()); setDraft(''); } }} />
        <button className="button" onClick={()=>{ if(draft.trim()){ onAdd(draft.trim()); setDraft(''); } }}>Adicionar</button>
      </div>
      {help && <div className="help">{help}</div>}
      <div className="chips" style={{marginTop:8}}>
        {items.map((text, idx) => (
          <span key={idx} className="chip">{text} <button aria-label="Remover" onClick={()=>onRemove(idx)}>?</button></span>
        ))}
      </div>
    </div>
  );
}

function SingleInput({ label, help, value, onChange, as='input', placeholder, options }){
  return (
    <div>
      <label className="label">{label}</label>
      {as==='textarea' ? (
        <textarea className="input" placeholder={placeholder} value={value} onChange={e=>onChange(e.target.value)} />
      ) : as==='select' ? (
        <select className="input" value={value} onChange={e=>onChange(e.target.value)}>
          {options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      ) : (
        <input className="input" placeholder={placeholder} value={value} onChange={e=>onChange(e.target.value)} />
      )}
      {help && <div className="help">{help}</div>}
    </div>
  );
}

export default function PromptBuilder(){
  const [state, setState] = usePersistentState('prompt-builder-v1', defaultState);
  const [step, setStep] = useState(0);
  const [preview, setPreview] = useState('');
  const total = stepDefs.length;
  const pct = Math.round(((step+1)/total)*100);

  const update = (key, value) => setState(prev => ({ ...prev, [key]: value }));
  const addItem = (key, val) => setState(prev => ({ ...prev, [key]: [...prev[key], val] }));
  const removeItem = (key, i) => setState(prev => ({ ...prev, [key]: prev[key].filter((_,idx)=>idx!==i) }));

  const canGenerate = useMemo(() => {
    return state.objetivo.trim().length >= 8; // objetivo m?nimo
  }, [state.objetivo]);

  const encodedState = useMemo(()=>{
    try { return btoa(unescape(encodeURIComponent(JSON.stringify(state)))); } catch { return ''; }
  }, [state]);

  const buildPrompt = () => {
    const linhas = [];
    // Persona e regras gerais
    linhas.push(`Voc? ? ${state.persona}. Responda em ${state.idioma} com tom ${state.tom}.`);
    linhas.push('Siga estritamente as diretrizes abaixo.');
    linhas.push('');

    // Objetivo
    linhas.push('1) Objetivo');
    linhas.push(`- ${state.objetivo}`);

    // P?blico e contexto
    if (state.publico) {
      linhas.push('');
      linhas.push('2) P?blico-alvo');
      linhas.push(`- ${state.publico}`);
    }
    if (state.contexto) {
      linhas.push('');
      linhas.push('3) Contexto essencial');
      linhas.push(state.contexto);
    }

    // Entradas
    if (state.entradas.length) {
      linhas.push('');
      linhas.push('4) Entradas/vari?veis esperadas');
      for (const e of state.entradas) linhas.push(`- {{${e}}}`);
      linhas.push('Preencha cada vari?vel antes de solicitar a resposta.');
    }

    // Restri??es e estilo
    const regras = [];
    if (state.tamanho) regras.push(`Tamanho: ${state.tamanho}`);
    if (state.formato) regras.push(`Formato de sa?da: ${state.formato}`);
    for (const r of state.restricoes) regras.push(r);
    for (const s of state.estilos) regras.push(`Estilo: ${s}`);
    if (regras.length){
      linhas.push('');
      linhas.push('5) Regras e restri??es');
      for (const r of regras) linhas.push(`- ${r}`);
    }

    // Exemplos
    if (state.exemplos){
      linhas.push('');
      linhas.push('6) Exemplos de boa resposta');
      linhas.push(state.exemplos);
    }

    // Ferramentas/contexto
    if (state.ferramentas.length){
      linhas.push('');
      linhas.push('7) Ferramentas/recursos');
      for (const t of state.ferramentas) linhas.push(`- ${t}`);
    }

    // Crit?rios de qualidade
    if (state.criterios.length){
      linhas.push('');
      linhas.push('8) Crit?rios de qualidade (checklist)');
      for (const c of state.criterios) linhas.push(`- [ ] ${c}`);
    }

    // Clarifica??es
    if (state.clarificacoesObrigatorias){
      linhas.push('');
      linhas.push('9) Antes de come?ar:');
      linhas.push('- Se houver ambiguidade, fa?a perguntas de esclarecimento necess?rias ANTES de produzir a resposta.');
      linhas.push('- Caso falte alguma vari?vel em {{chaves}}, solicite-a ao usu?rio.');
    }

    // Instru??o final
    linhas.push('');
    linhas.push('Quando estiver pronto, gere a resposta seguindo rigorosamente os itens acima.');

    return linhas.join('\n');
  };

  useEffect(()=>{ setPreview(buildPrompt()); /* eslint-disable-next-line */ }, [state]);

  const reset = () => setState(defaultState);

  return (
    <div className="grid">
      <section className="card">
        <div className="row" style={{alignItems:'center'}}>
          <h2 className="section-title" style={{marginRight:'auto'}}>Assistente de constru??o</h2>
          <span className="badge">Passo {step+1}/{total}</span>
        </div>
        <div className="progress" aria-hidden>
          <div className="progress-fill" style={{ width: pct + '%' }} />
        </div>
        <div style={{height:12}} />

        {/* Passos din?micos */}
        {stepDefs.map((def, idx)=> (
          <div key={def.key} style={{ display: idx===step ? 'block' : 'none' }}>
            {def.key === 'entradas' && (
              <ListInput
                label={def.label}
                help={def.help}
                items={state.entradas}
                onAdd={(v)=>addItem('entradas', v)}
                onRemove={(i)=>removeItem('entradas', i)}
                placeholder="ex.: cliente_id, periodo, arquivo_csv"
              />
            )}
            {def.key === 'restricoes' && (
              <ListInput
                label={def.label}
                help={def.help}
                items={state.restricoes}
                onAdd={(v)=>addItem('restricoes', v)}
                onRemove={(i)=>removeItem('restricoes', i)}
                placeholder="ex.: sem dados sens?veis; cite fontes; evitar jarg?es"
              />
            )}
            {def.key === 'ferramentas' && (
              <ListInput
                label={def.label}
                help={def.help}
                items={state.ferramentas}
                onAdd={(v)=>addItem('ferramentas', v)}
                onRemove={(i)=>removeItem('ferramentas', i)}
                placeholder="ex.: API X, link do drive, KB interna"
              />
            )}
            {def.key === 'criterios' && (
              <ListInput
                label={def.label}
                help={def.help}
                items={state.criterios}
                onAdd={(v)=>addItem('criterios', v)}
                onRemove={(i)=>removeItem('criterios', i)}
                placeholder="ex.: cobre casos-limite; inclua exemplos; explique decis?es"
              />
            )}

            {['objetivo','publico','contexto','exemplos'].includes(def.key) && (
              <SingleInput
                label={def.label}
                help={def.help}
                value={state[def.key]}
                onChange={(v)=>update(def.key, v)}
                as="textarea"
                placeholder={def.help}
              />
            )}

            {def.key==='tom' && (
              <SingleInput
                label={def.label}
                help={def.help}
                value={state.tom}
                onChange={(v)=>update('tom', v)}
                as="select"
                options={[ 'profissional','did?tico','casual','t?cnico','formal','amig?vel' ]}
              />
            )}

            {def.key==='formato' && (
              <SingleInput
                label={def.label}
                help={def.help}
                value={state.formato}
                onChange={(v)=>update('formato', v)}
                placeholder="ex.: t?picos; JSON com chaves X,Y; tabela Markdown"
              />
            )}

            {def.key==='persona' && (
              <SingleInput
                label={def.label}
                help={def.help}
                value={state.persona}
                onChange={(v)=>update('persona', v)}
                placeholder="ex.: Engenheiro de prompt s?nior, m?dico, advogado, professor"
              />
            )}

            {def.key==='idioma' && (
              <SingleInput
                label={def.label}
                help={def.help}
                value={state.idioma}
                onChange={(v)=>update('idioma', v)}
                placeholder="pt-BR"
              />
            )}

            {def.key==='tamanho' && (
              <SingleInput
                label={def.label}
                help={def.help}
                value={state.tamanho}
                onChange={(v)=>update('tamanho', v)}
                as="select"
                options={[ 'curto','m?dio','longo' ]}
              />
            )}

            {def.key==='estilos' && (
              <ListInput
                label={def.label}
                help={def.help}
                items={state.estilos}
                onAdd={(v)=>addItem('estilos', v)}
                onRemove={(i)=>removeItem('estilos', i)}
                placeholder="ex.: passo-a-passo; citar refer?ncias; evitar siglas"
              />
            )}

            <div className="actions">
              <button className={clsx('button','ghost')} onClick={()=>setStep(Math.max(0, step-1))} disabled={step===0}>Voltar</button>
              <button className={clsx('button','secondary')} onClick={()=>setStep(Math.min(total-1, step+1))} disabled={step===total-1}>Avan?ar</button>
              <button className="button danger" onClick={reset}>Limpar</button>
              <button className="button" onClick={()=>setPreview(buildPrompt())} disabled={!canGenerate}>Gerar preview</button>
            </div>
            {!canGenerate && <div className="help" style={{marginTop:8}}>Escreva um objetivo claro (m?n. 8 caracteres) para habilitar a gera??o.</div>}
          </div>
        ))}

        <hr className="sep" />
        <div className="row">
          <button className="button" onClick={()=>setStep(0)}>In?cio</button>
          <button className="button" onClick={()=>setStep(total-1)}>?ltimo passo</button>
          <button className="button ghost" onClick={()=>{
            navigator.clipboard.writeText(preview);
          }}>Copiar Prompt</button>
          <a className="button secondary" href={`?s=${encodeURIComponent(encodedState)}`}>
            Compartilhar estado
          </a>
          <button className="button ghost" onClick={()=>{
            const blob = new Blob([JSON.stringify(state,null,2)], { type:'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = 'prompt-state.json'; a.click();
            URL.revokeObjectURL(url);
          }}>Exportar JSON</button>
          <label className="button ghost" style={{cursor:'pointer'}}>
            Importar JSON
            <input type="file" accept="application/json" style={{display:'none'}} onChange={async (e)=>{
              const file = e.target.files?.[0]; if(!file) return;
              const text = await file.text();
              try { const obj = JSON.parse(text); setState(prev=>({ ...prev, ...obj })); } catch {}
            }} />
          </label>
        </div>
      </section>

      <aside className="card panel">
        <h3 style={{marginTop:0}}>Preview do Prompt</h3>
        <div className="preview" aria-live="polite">{preview}</div>
        <div className="help" style={{marginTop:8}}>Dica: cole este prompt diretamente em seu modelo (ChatGPT, Claude, Llama, etc.).</div>

        <h4>Modelos</h4>
        <div className="chips">
          <span className="badge">ChatGPT</span>
          <span className="badge">Claude</span>
          <span className="badge">Llama</span>
        </div>
        <div className="small" style={{marginTop:8}}>Compat?vel com m?ltiplos provedores. Evita expor racioc?nio sens?vel e solicita esclarecimentos antes de responder.</div>
      </aside>
    </div>
  );
}
