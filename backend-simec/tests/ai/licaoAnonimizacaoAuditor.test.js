import assert from 'node:assert/strict';
import test from 'node:test';

import { detectarPadroesSuspeitos } from '../../services/ai/licaoAnonimizacaoAuditor.js';

// ─── Casos LIMPOS (texto tecnico genuino — nao deve flagar) ────────────────

test('LIMPO: texto puramente tecnico passa', () => {
  const r = detectarPadroesSuspeitos(
    'Causa raw: nivel de helio em 28% com sinais de quench iminente | Acoes: reposicao de helio realizada'
  );
  assert.equal(r.suspeita, false, `Esperava limpo, padroes=${r.padroes.join(',')}`);
});

test('LIMPO: termos com placeholders ja escapados nao reflagam', () => {
  const r = detectarPadroesSuspeitos(
    'Engenheiro [NOME] verificou em [DATA] que o serial [SERIAL] apresentou falha. Numero de chamado [ID] aberto.'
  );
  assert.equal(r.suspeita, false);
});

test('LIMPO: termos tecnicos comuns em maiuscula nao disparam (GE, RM, TC)', () => {
  const r = detectarPadroesSuspeitos(
    'Equipamento RM da GE com falha. Acionar tecnico para troca de bobina. PM realizada em [DATA].'
  );
  assert.equal(r.suspeita, false);
});

test('LIMPO: inicio de frase com palavra capitalizada eh natural', () => {
  const r = detectarPadroesSuspeitos(
    'Reparo realizado. Troca da bobina principal. Equipamento liberado para operacao.'
  );
  assert.equal(r.suspeita, false);
});

// ─── Casos SUSPEITOS (devem flagar) ────────────────────────────────────────

test('SUSPEITO: nome proprio sem titulo', () => {
  const r = detectarPadroesSuspeitos(
    'Acoes: Joao verificou o equipamento e Maria validou. Troca realizada.'
  );
  assert.equal(r.suspeita, true);
  assert.ok(r.padroes.includes('palavra_capitalizada_sem_titulo'));
});

test('SUSPEITO: titulo + nome (scrub falhou)', () => {
  const r = detectarPadroesSuspeitos(
    'Causa raw: equipamento parado. Dr Silva confirmou a falha.'
  );
  assert.equal(r.suspeita, true);
  assert.ok(r.padroes.includes('titulo_com_nome'));
});

test('SUSPEITO: numero curto isolado de 4-5 digitos', () => {
  const r = detectarPadroesSuspeitos(
    'Equipamento 1234 apresentou falha critica. Troca realizada.'
  );
  assert.equal(r.suspeita, true);
  assert.ok(r.padroes.includes('numero_curto_isolado'));
});

test('SUSPEITO: sigla de cliente (4-6 letras maiusculas isoladas)', () => {
  const r = detectarPadroesSuspeitos(
    'Unidade CRDL sede principal. Falha no compressor.'
  );
  assert.equal(r.suspeita, true);
  assert.ok(r.padroes.includes('sigla_maiuscula'));
});

test('SUSPEITO: telefone parcial', () => {
  const r = detectarPadroesSuspeitos(
    'Contato 9876-5432 para escalonamento. Acoes: reset realizado.'
  );
  assert.equal(r.suspeita, true);
  assert.ok(r.padroes.includes('telefone_parcial'));
});

test('SUSPEITO: trecho retornado contem palavra problematica', () => {
  const r = detectarPadroesSuspeitos(
    'Lorem ipsum dolor sit amet consectetur. Joao reportou problema e foi resolvido pelo time.'
  );
  assert.equal(r.suspeita, true);
  assert.ok(r.trecho && r.trecho.includes('Joao'));
});

// ─── EDGE CASES ────────────────────────────────────────────────────────────

test('EDGE: texto vazio nao suspeita', () => {
  const r = detectarPadroesSuspeitos('');
  assert.equal(r.suspeita, false);
  assert.equal(r.padroes.length, 0);
});

test('EDGE: null/undefined nao quebra', () => {
  assert.equal(detectarPadroesSuspeitos(null).suspeita, false);
  assert.equal(detectarPadroesSuspeitos(undefined).suspeita, false);
});

test('EDGE: numero longo (>=6 digitos) nao eh flagado (ja seria escrubbado antes)', () => {
  // Numero de 7 digitos — o despersonalizar() ja troca por [ID].
  // Mas se chegar puro no detector (por bug), tambem nao deve flagar
  // como "numero curto" (regex eh especifica 4-5 digitos).
  const r = detectarPadroesSuspeitos('Caso 1234567 resolvido com troca de filtro.');
  // 1234567 tem 7 digitos — nao bate RE_NUMERO_CURTO_ISOLADO
  assert.equal(
    r.padroes.includes('numero_curto_isolado'),
    false,
    `Esperava numero longo nao flagar como curto: ${JSON.stringify(r)}`
  );
});

test('EDGE: termos tecnicos em PT-BR com acento nao disparam', () => {
  const r = detectarPadroesSuspeitos(
    'Realização de manutenção preventiva no equipamento. Calibração concluída.'
  );
  // "Realização", "Calibração" no inicio de frase OU sao termos da whitelist.
  // O importante: nao gerar falso positivo.
  // Se a regex de palavra capitalizada pegar "Realização" no inicio, ehInicioDeFrase
  // protege.
  assert.equal(r.suspeita, false, `padroes=${r.padroes.join(',')}`);
});

test('EDGE: lista de acoes com verbos no inicio (Substituicao, Reparo)', () => {
  const r = detectarPadroesSuspeitos(
    'Acoes: Substituicao do compressor. Reparo do sistema de cooling. Teste de leak ok.'
  );
  // "Substituicao" e "Reparo" estao apos ponto/dois pontos — inicio de frase
  assert.equal(r.suspeita, false);
});
