import assert from 'node:assert/strict';
import test from 'node:test';

import { InterpretationAgent } from '../../services/agent/agents/InterpretationAgent.js';

// Esses testes travam a regra de classificacao por heuristica — NAO chamam
// LLM (sem OPENAI_API_KEY na pipeline). Quando a heuristica nao decide,
// o resultado cai em OUTRO ou AMBIGUO (path testado em outro lugar).
//
// Caso regressao chave: a frase "gostaria de saber quando foi a ultima
// preventiva na Tomografia Evo da unidade Sede" caia errado em
// AGENDAR_MANUTENCAO antes (LLM sem few-shot). Agora a heuristica forte
// detecta "gostaria de saber" + "quando foi" + "ultima" e devolve RELATORIO
// com confianca 0.92.

function ctxDe(mensagem) {
  // Replica o shape minimo de AgentContext que o InterpretationAgent precisa
  // (mensagem + trilha pra auditoria).
  return { mensagem, trilha: [] };
}

test('CONSULTA: "quando foi a ultima preventiva" -> RELATORIO alta confianca', async () => {
  const r = await InterpretationAgent.executar(
    ctxDe('Olá THiago, gostaria de saber quando foi a ultima preventiva na Tomografia Evo da unidade Sede')
  );
  assert.equal(r.intent, 'RELATORIO');
  assert.ok(r.confianca >= 0.9, `confianca devia ser alta, veio ${r.confianca}`);
  assert.equal(r.metodo, 'heuristica');
});

test('CONSULTA: "qual foi a ultima manutencao" -> RELATORIO', async () => {
  const r = await InterpretationAgent.executar(
    ctxDe('qual foi a ultima manutencao do RM 3T?')
  );
  assert.equal(r.intent, 'RELATORIO');
  assert.ok(r.confianca >= 0.9);
});

test('CONSULTA: "me mostre o historico" -> RELATORIO', async () => {
  const r = await InterpretationAgent.executar(
    ctxDe('me mostre o historico de manutencoes da TC Sede')
  );
  assert.equal(r.intent, 'RELATORIO');
});

test('CONSULTA: "quero saber" sozinho -> RELATORIO', async () => {
  const r = await InterpretationAgent.executar(
    ctxDe('quero saber quais preventivas estao pendentes')
  );
  assert.equal(r.intent, 'RELATORIO');
});

test('ACAO: "agenda uma preventiva" -> AGENDAR_MANUTENCAO alta confianca', async () => {
  const r = await InterpretationAgent.executar(
    ctxDe('agenda uma preventiva pra TC Sede pra terca')
  );
  assert.equal(r.intent, 'AGENDAR_MANUTENCAO');
  assert.ok(r.confianca >= 0.9);
  assert.equal(r.metodo, 'heuristica');
});

test('ACAO: "marcar manutencao" -> AGENDAR_MANUTENCAO', async () => {
  const r = await InterpretationAgent.executar(
    ctxDe('marcar manutencao do mamografo da Sede')
  );
  assert.equal(r.intent, 'AGENDAR_MANUTENCAO');
});

test('ACAO: "preciso agendar" -> AGENDAR_MANUTENCAO', async () => {
  const r = await InterpretationAgent.executar(
    ctxDe('preciso agendar uma preventiva no RM amanha')
  );
  assert.equal(r.intent, 'AGENDAR_MANUTENCAO');
});

test('ACAO: "abrir uma OS" -> AGENDAR_MANUTENCAO', async () => {
  const r = await InterpretationAgent.executar(
    ctxDe('abrir uma OS para a TC')
  );
  assert.equal(r.intent, 'AGENDAR_MANUTENCAO');
});

test('BATCH: "todos os equipamentos vencidos" -> BATCH_AGENDAMENTO', async () => {
  const r = await InterpretationAgent.executar(
    ctxDe('agendar preventiva para todos os equipamentos vencidos')
  );
  assert.equal(r.intent, 'BATCH_AGENDAMENTO');
});

test('ANALYTICS: "top equipamentos com mais corretivas" -> ANALYTICS', async () => {
  const r = await InterpretationAgent.executar(
    ctxDe('me mostre os equipamentos com mais corretivas no ano')
  );
  // "me mostre" eh CONSULTA forte. Em conflito CONSULTA + ANALYTICS,
  // CONSULTA ganha (RELATORIO eh fallback razoavel se LLM nao decidir).
  // O importante eh NAO virar AGENDAR.
  assert.notEqual(r.intent, 'AGENDAR_MANUTENCAO');
  assert.notEqual(r.intent, 'BATCH_AGENDAMENTO');
});

test('SEGURO: "vencimento do seguro" -> SEGURO', async () => {
  const r = await InterpretationAgent.executar(
    ctxDe('quando vence o seguro da TC Sede?')
  );
  assert.equal(r.intent, 'SEGURO');
});

test('RELATORIO fraco: "preventiva" sozinho cai em RELATORIO com confianca menor', async () => {
  const r = await InterpretationAgent.executar(
    ctxDe('preventiva da TC')
  );
  assert.equal(r.intent, 'RELATORIO');
  // Confianca menor — sera alvo de PEDIR_CONFIRMACAO_INTENT no Planner.
  assert.ok(r.confianca < 0.85, `esperava confianca < 0.85, veio ${r.confianca}`);
});

test('CONFLITO consulta+acao na mesma frase: cai no fallback (LLM ou OUTRO)', async () => {
  // "quero saber e depois agendar" tem ambos os sinais. A heuristica
  // devolve null e cai no LLM (se disponivel) ou fallback OUTRO. Importante
  // verificar que NAO escolhe arbitrariamente entre os dois.
  const r = await InterpretationAgent.executar(
    ctxDe('quero saber a ultima preventiva e depois agendar uma nova')
  );
  // Sem LLM no test env, cai em OUTRO (fallback). Com LLM, viraria
  // AGENDAR ou RELATORIO com confianca baixa — o Planner pede confirmacao.
  // O importante: nao foi classificado pela heuristica forte.
  assert.notEqual(r.metodo, 'heuristica');
});
