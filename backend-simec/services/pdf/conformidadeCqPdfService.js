// Monta o payload para o PDF de Conformidade ANVISA RDC 611/2022 a
// partir dos registros de Controle de Qualidade do tenant. Filtra por
// unidade (escopo de fiscalizacao). Reusa a logica de "vencimento ativo"
// (registro mais recente por equipamento+tipo) que ja eh aplicada no
// resto do modulo.

import prisma from '../prismaService.js';
import { MODALIDADES_REGULADAS_RDC611, MODALIDADES_RECOMENDADAS } from '../controleQualidade/index.js';

const TODAS_MODALIDADES_CQ = [...MODALIDADES_REGULADAS_RDC611, ...MODALIDADES_RECOMENDADAS];

function diasEntre(a, b) {
  return Math.ceil((new Date(a).getTime() - new Date(b).getTime()) / 86_400_000);
}

function statusDoTeste(teste, agora) {
  if (teste.resultado === 'Reprovado') return 'Reprovado';
  if (!teste.dataExecucao) return 'Pendente';
  if (!teste.proximoVencimento) return safeOk(teste);
  const dias = diasEntre(teste.proximoVencimento, agora);
  if (dias < 0) return `Vencido (${Math.abs(dias)}d)`;
  if (dias <= 30) return `Vence em ${dias}d`;
  return 'Conforme';
}

function safeOk(teste) {
  return teste.resultado === 'Aprovado' ? 'Conforme' : (teste.resultado || 'Pendente');
}

export async function obterDadosPdfConformidadeCq({ tenantId, unidadeId }) {
  if (!unidadeId) {
    const e = new Error('UNIDADE_OBRIGATORIA');
    throw e;
  }

  const unidade = await prisma.unidade.findFirst({
    where: { id: unidadeId, tenantId },
    select: { id: true, nomeSistema: true, endereco: true, cnpj: true },
  });
  if (!unidade) {
    const e = new Error('UNIDADE_NAO_ENCONTRADA');
    throw e;
  }

  // Equipamentos da unidade que tem CQ aplicavel (regulados + recomendados).
  // Vendido/Desativado nao entra no relatorio de conformidade vigente.
  const equipamentos = await prisma.equipamento.findMany({
    where: {
      tenantId,
      unidadeId,
      tipo: { in: TODAS_MODALIDADES_CQ },
      status: { notIn: ['Vendido', 'Desativado'] },
    },
    select: { id: true, modelo: true, tag: true, tipo: true, fabricante: true },
    orderBy: [{ tipo: 'asc' }, { modelo: 'asc' }],
  });

  // Busca todos os testes ativos (deletadoEm null) desses equipamentos
  const equipamentoIds = equipamentos.map((e) => e.id);
  const testes = equipamentoIds.length
    ? await prisma.testeQualidade.findMany({
        where: { tenantId, equipamentoId: { in: equipamentoIds }, deletadoEm: null },
        select: {
          id: true,
          equipamentoId: true,
          tipoTesteId: true,
          dataExecucao: true,
          proximoVencimento: true,
          resultado: true,
          numeroLaudo: true,
          pendenciasAcao: true,
          tipoTeste: { select: { codigo: true, nome: true, modalidade: true, obrigatorio: true } },
        },
      })
    : [];

  // Reduz para o registro mais recente por (equipamento, tipo) — vencimento ativo
  const ativosPorChave = new Map();
  for (const t of testes) {
    const chave = `${t.equipamentoId}|${t.tipoTesteId}`;
    const ex = ativosPorChave.get(chave);
    const eMaisRecente =
      !ex ||
      (t.dataExecucao && (!ex.dataExecucao || new Date(t.dataExecucao) > new Date(ex.dataExecucao)));
    if (eMaisRecente) ativosPorChave.set(chave, t);
  }
  const ativos = [...ativosPorChave.values()];

  const agora = new Date();

  // Agrupa para a tabela do PDF: 1 linha por (equipamento, tipoTeste ativo)
  const porModalidade = new Map();
  let conformes = 0;
  let vencidos = 0;
  let reprovacoesPendentes = 0;

  for (const t of ativos) {
    const eq = equipamentos.find((e) => e.id === t.equipamentoId);
    if (!eq) continue;
    const modalidade = t.tipoTeste?.modalidade || eq.tipo;
    if (!porModalidade.has(modalidade)) porModalidade.set(modalidade, []);
    const status = statusDoTeste(t, agora);
    porModalidade.get(modalidade).push({
      equipamentoModelo: eq.modelo,
      equipamentoTag: eq.tag,
      tipoCodigo: t.tipoTeste?.codigo,
      tipoNome: t.tipoTeste?.nome,
      dataExecucao: t.dataExecucao,
      proximoVencimento: t.proximoVencimento,
      resultado: t.resultado,
      statusLabel: status,
    });

    if (status === 'Reprovado') reprovacoesPendentes++;
    else if (status.startsWith('Vencido')) vencidos++;
    else if (status === 'Conforme' || status.startsWith('Vence em')) conformes++;
  }

  // Pendencias abertas — varre TODOS os testes (inclusive antigos) ja que
  // pendencias de execucoes anteriores nao sao "herdadas" pelas renovacoes.
  const pendencias = [];
  for (const t of testes) {
    if (!Array.isArray(t.pendenciasAcao)) continue;
    const eq = equipamentos.find((e) => e.id === t.equipamentoId);
    if (!eq) continue;
    for (const p of t.pendenciasAcao) {
      if (p.resolvido) continue;
      const criado = p.criadoEm ? new Date(p.criadoEm) : null;
      pendencias.push({
        equipamentoModelo: eq.modelo,
        equipamentoTag: eq.tag,
        tipoCodigo: t.tipoTeste?.codigo,
        descricao: p.descricao,
        diasAberta: criado ? diasEntre(agora, criado) : null,
        numeroLaudo: t.numeroLaudo,
      });
    }
  }

  // Equipamentos sem nenhum teste ativo entram como "Sem programa" — uma
  // linha sintetica por modalidade pra deixar visivel ao auditor.
  const equipamentosComTeste = new Set(ativos.map((t) => t.equipamentoId));
  const semPrograma = equipamentos.filter((e) => !equipamentosComTeste.has(e.id));
  for (const eq of semPrograma) {
    const modalidade = eq.tipo;
    if (!porModalidade.has(modalidade)) porModalidade.set(modalidade, []);
    porModalidade.get(modalidade).push({
      equipamentoModelo: eq.modelo,
      equipamentoTag: eq.tag,
      tipoCodigo: '—',
      tipoNome: 'Sem programa de CQ ativado',
      dataExecucao: null,
      proximoVencimento: null,
      resultado: null,
      statusLabel: 'Sem programa',
    });
  }

  const totalEquipamentos = equipamentos.length;
  const percentualConforme = totalEquipamentos === 0
    ? null
    : Math.round((conformes / Math.max(ativos.length, 1)) * 100);

  return {
    unidade,
    emitidoEm: new Date(),
    resumo: {
      totalEquipamentos,
      conformes,
      vencidos,
      reprovacoesPendentes,
      pendenciasAbertas: pendencias.length,
      percentualConforme,
    },
    porModalidade: [...porModalidade.entries()].map(([modalidade, testes]) => ({
      modalidade,
      testes,
    })),
    pendencias,
  };
}
