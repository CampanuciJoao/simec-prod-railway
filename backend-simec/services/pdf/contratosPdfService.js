import prisma from '../prismaService.js';

export async function obterDadosPdfContrato({ tenantId, contratoId }) {
  if (!tenantId) throw new Error('TENANT_ID_OBRIGATORIO');
  if (!contratoId) throw new Error('CONTRATO_ID_INVALIDO');

  const contrato = await prisma.contrato.findFirst({
    where: { id: contratoId, tenantId },
    select: {
      id: true,
      numeroContrato: true,
      categoria: true,
      fornecedor: true,
      dataInicio: true,
      dataFim: true,
      status: true,
      equipamentosCobertos: {
        select: {
          id: true,
          modelo: true,
          tag: true,
          status: true,
          unidade: { select: { nomeSistema: true, cnpj: true } },
        },
        orderBy: [
          { unidade: { nomeSistema: 'asc' } },
          { modelo: 'asc' },
        ],
      },
    },
  });

  if (!contrato) throw new Error('CONTRATO_NAO_ENCONTRADO');
  return contrato;
}
