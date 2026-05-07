import assert from 'node:assert/strict';
import test from 'node:test';

import {
  detectarAcao,
  resolverAcaoPorContexto,
  ACTIONS,
  DOMAINS,
} from '../../services/agent/shared/actionResolver.js';

// ─── detectarAcao ─────────────────────────────────────────────────────────────

test('detectarAcao retorna CONFIRMAR_ACAO para "sim"', () => {
  assert.equal(detectarAcao('sim'), ACTIONS.CONFIRMAR_ACAO);
});

test('detectarAcao retorna CONFIRMAR_ACAO para "ok"', () => {
  assert.equal(detectarAcao('ok'), ACTIONS.CONFIRMAR_ACAO);
});

test('detectarAcao retorna CONFIRMAR_ACAO para "pode sim"', () => {
  assert.equal(detectarAcao('pode sim'), ACTIONS.CONFIRMAR_ACAO);
});

test('detectarAcao retorna CANCELAR_ACAO para "não"', () => {
  assert.equal(detectarAcao('não'), ACTIONS.CANCELAR_ACAO);
});

test('detectarAcao retorna CANCELAR_ACAO para "nao"', () => {
  assert.equal(detectarAcao('nao'), ACTIONS.CANCELAR_ACAO);
});

test('detectarAcao retorna CANCELAR_ACAO para "cancelar"', () => {
  assert.equal(detectarAcao('cancelar'), ACTIONS.CANCELAR_ACAO);
});

test('detectarAcao retorna GERAR_PDF_OS para "pdf da os"', () => {
  assert.equal(detectarAcao('pdf da os'), ACTIONS.GERAR_PDF_OS);
});

test('detectarAcao retorna GERAR_PDF_OS para "gere a os"', () => {
  assert.equal(detectarAcao('gere a os'), ACTIONS.GERAR_PDF_OS);
});

test('detectarAcao retorna GERAR_PDF_OS para "quero a os"', () => {
  assert.equal(detectarAcao('quero a os'), ACTIONS.GERAR_PDF_OS);
});

test('detectarAcao retorna ABRIR_OS para "abrir os"', () => {
  assert.equal(detectarAcao('abrir os'), ACTIONS.ABRIR_OS);
});

test('detectarAcao retorna ABRIR_OS para "ver a os"', () => {
  assert.equal(detectarAcao('ver a os'), ACTIONS.ABRIR_OS);
});

test('detectarAcao retorna ABRIR_DOCUMENTO para "abrir pdf"', () => {
  assert.equal(detectarAcao('abrir pdf'), ACTIONS.ABRIR_DOCUMENTO);
});

test('detectarAcao retorna MOSTRAR_COBERTURA para "cobertura"', () => {
  assert.equal(detectarAcao('cobertura'), ACTIONS.MOSTRAR_COBERTURA);
});

test('detectarAcao retorna MOSTRAR_COBERTURA para "o que cobre"', () => {
  assert.equal(detectarAcao('o que cobre'), ACTIONS.MOSTRAR_COBERTURA);
});

test('detectarAcao retorna MOSTRAR_VENCIMENTO para "vencimento"', () => {
  assert.equal(detectarAcao('vencimento'), ACTIONS.MOSTRAR_VENCIMENTO);
});

test('detectarAcao retorna MOSTRAR_VENCIMENTO para "quando vence"', () => {
  assert.equal(detectarAcao('quando vence'), ACTIONS.MOSTRAR_VENCIMENTO);
});

test('detectarAcao retorna MOSTRAR_DADOS_APOLICE para "dados da apolice"', () => {
  assert.equal(detectarAcao('dados da apolice'), ACTIONS.MOSTRAR_DADOS_APOLICE);
});

test('detectarAcao retorna GERAR_PDF para "imprimir"', () => {
  assert.equal(detectarAcao('imprimir'), ACTIONS.GERAR_PDF);
});

test('detectarAcao retorna GERAR_PDF para "pdf"', () => {
  assert.equal(detectarAcao('pdf'), ACTIONS.GERAR_PDF);
});

test('detectarAcao retorna null para mensagem sem acao reconhecida', () => {
  assert.equal(detectarAcao('qual o equipamento mais novo'), null);
});

test('detectarAcao e case-insensitive para "SIM"', () => {
  assert.equal(detectarAcao('SIM'), ACTIONS.CONFIRMAR_ACAO);
});

test('detectarAcao prioriza GERAR_PDF_OS sobre CONFIRMAR quando contem "pdf da os"', () => {
  assert.equal(detectarAcao('pode me enviar o pdf da os'), ACTIONS.GERAR_PDF_OS);
});

// ─── resolverAcaoPorContexto — sem sessao ────────────────────────────────────

test('resolverAcaoPorContexto retorna null quando sessao e null', () => {
  assert.equal(resolverAcaoPorContexto(null, 'sim'), null);
});

test('resolverAcaoPorContexto retorna null quando sessao nao tem stateJson', () => {
  assert.equal(resolverAcaoPorContexto({ intent: 'RELATORIO' }, 'sim'), null);
});

test('resolverAcaoPorContexto retorna null quando mensagem nao tem acao', () => {
  const sessao = { stateJson: JSON.stringify({ contexto: { tipo: 'OS_MANUTENCAO' } }), intent: 'RELATORIO' };
  assert.equal(resolverAcaoPorContexto(sessao, 'como vai voce'), null);
});

// ─── resolverAcaoPorContexto — domínio RELATORIO ─────────────────────────────

test('resolverAcaoPorContexto gera PDF OS para contexto OS_MANUTENCAO + "sim"', () => {
  const sessao = {
    intent: 'RELATORIO',
    stateJson: JSON.stringify({ contexto: { tipo: 'OS_MANUTENCAO', osId: 'os-1' } }),
  };
  const resultado = resolverAcaoPorContexto(sessao, 'sim');
  assert.ok(resultado?.matched);
  assert.equal(resultado.action, ACTIONS.GERAR_PDF_OS);
  assert.equal(resultado.domain, DOMAINS.RELATORIO);
});

test('resolverAcaoPorContexto gera PDF OS para contexto OS_MANUTENCAO + "pdf"', () => {
  const sessao = {
    intent: 'RELATORIO',
    stateJson: JSON.stringify({ contexto: { tipo: 'OS_MANUTENCAO' } }),
  };
  const resultado = resolverAcaoPorContexto(sessao, 'quero o pdf');
  assert.ok(resultado?.matched);
  assert.equal(resultado.action, ACTIONS.GERAR_PDF_OS);
});

test('resolverAcaoPorContexto abre OS para contexto OS_MANUTENCAO + "abrir os"', () => {
  const sessao = {
    intent: 'RELATORIO',
    stateJson: JSON.stringify({ contexto: { tipo: 'OS_MANUTENCAO' } }),
  };
  const resultado = resolverAcaoPorContexto(sessao, 'abrir os');
  assert.ok(resultado?.matched);
  assert.equal(resultado.action, ACTIONS.ABRIR_OS);
});

test('resolverAcaoPorContexto gera PDF relatorio para contexto RELATORIO_MANUTENCOES + "sim"', () => {
  const sessao = {
    intent: 'RELATORIO',
    stateJson: JSON.stringify({ contexto: { tipo: 'RELATORIO_MANUTENCOES' } }),
  };
  const resultado = resolverAcaoPorContexto(sessao, 'sim');
  assert.ok(resultado?.matched);
  assert.equal(resultado.action, ACTIONS.GERAR_PDF_RELATORIO);
});

test('resolverAcaoPorContexto cancela para RELATORIO + "nao"', () => {
  const sessao = {
    intent: 'RELATORIO',
    stateJson: JSON.stringify({ contexto: { tipo: 'OS_MANUTENCAO' } }),
  };
  const resultado = resolverAcaoPorContexto(sessao, 'nao');
  assert.ok(resultado?.matched);
  assert.equal(resultado.action, ACTIONS.CANCELAR_ACAO);
});

// ─── resolverAcaoPorContexto — domínio SEGURO ────────────────────────────────

test('resolverAcaoPorContexto retorna MOSTRAR_COBERTURA para seguro + "cobertura"', () => {
  const sessao = {
    intent: 'SEGURO',
    stateJson: JSON.stringify({ contexto: { seguroId: 'seg-1' } }),
  };
  const resultado = resolverAcaoPorContexto(sessao, 'cobertura');
  assert.ok(resultado?.matched);
  assert.equal(resultado.action, ACTIONS.MOSTRAR_COBERTURA);
  assert.equal(resultado.domain, DOMAINS.SEGURO);
});

test('resolverAcaoPorContexto retorna MOSTRAR_VENCIMENTO para seguro + "vencimento"', () => {
  const sessao = {
    intent: 'SEGURO',
    stateJson: JSON.stringify({ contexto: { seguroId: 'seg-1' } }),
  };
  const resultado = resolverAcaoPorContexto(sessao, 'vencimento');
  assert.ok(resultado?.matched);
  assert.equal(resultado.action, ACTIONS.MOSTRAR_VENCIMENTO);
});

test('resolverAcaoPorContexto retorna GERAR_PDF para seguro + "sim"', () => {
  const sessao = {
    intent: 'SEGURO',
    stateJson: JSON.stringify({ contexto: { seguroId: 'seg-1' } }),
  };
  const resultado = resolverAcaoPorContexto(sessao, 'sim');
  assert.ok(resultado?.matched);
  assert.equal(resultado.action, ACTIONS.GERAR_PDF);
});

test('resolverAcaoPorContexto cancela para SEGURO + "cancelar"', () => {
  const sessao = {
    intent: 'SEGURO',
    stateJson: JSON.stringify({ contexto: { seguroId: 'seg-1' } }),
  };
  const resultado = resolverAcaoPorContexto(sessao, 'cancelar');
  assert.ok(resultado?.matched);
  assert.equal(resultado.action, ACTIONS.CANCELAR_ACAO);
});

// ─── resolverAcaoPorContexto — acaoSugerida ──────────────────────────────────

test('resolverAcaoPorContexto respeita acaoSugerida GERAR_PDF_OS em sessao RELATORIO', () => {
  const sessao = {
    intent: 'RELATORIO',
    stateJson: JSON.stringify({
      contexto: { acaoSugerida: ACTIONS.GERAR_PDF_OS, tipo: 'OS_MANUTENCAO' },
    }),
  };
  const resultado = resolverAcaoPorContexto(sessao, 'sim');
  assert.ok(resultado?.matched);
  assert.equal(resultado.action, ACTIONS.GERAR_PDF_OS);
});

test('resolverAcaoPorContexto retorna null para intent desconhecido', () => {
  const sessao = {
    intent: 'AGENDAMENTO',
    stateJson: JSON.stringify({ contexto: { tipo: 'algo' } }),
  };
  const resultado = resolverAcaoPorContexto(sessao, 'sim');
  assert.equal(resultado, null);
});

// ─── resolverAcaoPorContexto — domínio CONTRATO ──────────────────────────────

test('resolverAcaoPorContexto gera PDF para CONTRATO + "sim"', () => {
  const sessao = {
    intent: 'CONTRATO',
    stateJson: JSON.stringify({ contexto: { contratoId: 'ct-1' } }),
  };
  const resultado = resolverAcaoPorContexto(sessao, 'sim');
  assert.ok(resultado?.matched);
  assert.equal(resultado.action, ACTIONS.GERAR_PDF);
  assert.equal(resultado.domain, DOMAINS.CONTRATO);
});

test('resolverAcaoPorContexto abre documento para CONTRATO + "abrir pdf"', () => {
  const sessao = {
    intent: 'CONTRATO',
    stateJson: JSON.stringify({ contexto: { contratoId: 'ct-1' } }),
  };
  const resultado = resolverAcaoPorContexto(sessao, 'abrir pdf');
  assert.ok(resultado?.matched);
  assert.equal(resultado.action, ACTIONS.ABRIR_DOCUMENTO);
});
