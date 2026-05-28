import assert from 'node:assert/strict';
import test from 'node:test';

import { InterpretationAgent } from '../../services/agent/agents/InterpretationAgent.js';

// Testes do catalogo de equipamentos passado pelo Orchestrator. NAO chama
// LLM (sem credencial no env de teste) — verifica que o contexto carrega
// o catalogo sem quebrar e que a heuristica forte continua tendo
// precedencia (catalogo eh hint pro LLM, nao decide intent).

function ctx(mensagem, catalogoEquipamentos = []) {
  return { mensagem, trilha: [], catalogoEquipamentos };
}

test('CATALOG: presenca de catalogo nao afeta heuristica forte de AGENDAR', async () => {
  const r = await InterpretationAgent.executar(
    ctx('agenda uma preventiva pra TC', [
      'Revolution Evo | Tomografia Computadorizada | TAG 67890 | Cerdil Sede',
      'Revolution ACT | Tomografia Computadorizada | TAG 12345 | Cerdil Sede',
    ])
  );
  assert.equal(r.intent, 'AGENDAR_MANUTENCAO');
  assert.equal(r.metodo, 'heuristica');
});

test('CATALOG: presenca de catalogo nao afeta heuristica forte de CONSULTA', async () => {
  const r = await InterpretationAgent.executar(
    ctx('quando foi a ultima preventiva na Tomografia Evo', [
      'Revolution Evo | Tomografia Computadorizada | TAG 67890 | Cerdil Sede',
    ])
  );
  assert.equal(r.intent, 'RELATORIO');
  assert.ok(r.confianca >= 0.9);
});

test('CATALOG: catalogo vazio nao quebra a interpretacao', async () => {
  const r = await InterpretationAgent.executar(
    ctx('gostaria de saber a ultima manutencao do RM 3T', [])
  );
  assert.equal(r.intent, 'RELATORIO');
});

test('CATALOG: contexto sem catalogoEquipamentos (undefined) nao quebra', async () => {
  // Garantia de compatibilidade — se o Orchestrator nao popular o campo,
  // o InterpretationAgent deve seguir funcionando com catalogo vazio.
  const r = await InterpretationAgent.executar({
    mensagem: 'agenda uma preventiva',
    trilha: [],
    // catalogoEquipamentos ausente intencionalmente
  });
  assert.equal(r.intent, 'AGENDAR_MANUTENCAO');
});
