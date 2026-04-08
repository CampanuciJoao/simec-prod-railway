// simec/backend-simec/services/agent/seguroService.js
import { AgentSessionRepository } from './agentSessionRepository.js';
import { resolverEntidades } from './entityResolver.js';
import { ACTIONS } from './actionResolver.js';
import {
    extrairFiltrosSeguro,
    montarResumoSeguro,
    construirPayloadSeguro
} from './seguroUtils.js';
import {
    buscarSeguroMaisRecente,
    buscarSeguroVigente
} from '../insuranceQueryService.js';

function respostaPadrao(mensagem, extras = {}) {
    return {
        mensagem,
        acao: extras.acao || null,
        contexto: extras.contexto || null,
        meta: extras.meta || null
    };
}

async function registrarSessaoSeguro(
    usuarioNome,
    mensagem,
    respostaTexto,
    payload,
    sessaoExistente = null
) {
    let sessao = sessaoExistente;

    if (!sessao) {
        sessao = await AgentSessionRepository.criarSessao({
            usuario: usuarioNome,
            intent: 'SEGURO',
            step: 'FINALIZADO',
            state: payload
        });
    } else {
        await AgentSessionRepository.salvarSessao(sessao.id, {
            step: 'FINALIZADO',
            state: payload,
            resumo: respostaTexto
        });
    }

    await AgentSessionRepository.registrarMensagem(sessao.id, 'user', mensagem);
    await AgentSessionRepository.registrarMensagem(sessao.id, 'agent', respostaTexto, payload);

    return sessao;
}

function construirRespostaAcaoContextual(acaoContextual, estadoAnterior) {
    if (acaoContextual.action === ACTIONS.GERAR_PDF) {
        return respostaPadrao(
            `Perfeito. Vou preparar o PDF da apólice ${estadoAnterior.numeroApolice || ''}.`,
            {
                acao: 'ABRIR_PDF_SEGURO',
                contexto: {
                    seguroId: estadoAnterior.seguroId || null,
                    anexoId: estadoAnterior?.contextoPDF?.anexoId || null
                },
                meta: {
                    tipoResposta: 'SEGURO_ACAO',
                    ultimaAcaoExecutada: ACTIONS.GERAR_PDF
                }
            }
        );
    }

    if (acaoContextual.action === ACTIONS.ABRIR_DOCUMENTO) {
        return respostaPadrao(
            `Perfeito. Vou abrir o documento da apólice ${estadoAnterior.numeroApolice || ''}.`,
            {
                acao: 'ABRIR_PDF_SEGURO',
                contexto: {
                    seguroId: estadoAnterior.seguroId || null,
                    anexoId: estadoAnterior?.contextoPDF?.anexoId || null
                },
                meta: {
                    tipoResposta: 'SEGURO_ACAO',
                    ultimaAcaoExecutada: ACTIONS.ABRIR_DOCUMENTO
                }
            }
        );
    }

    if (acaoContextual.action === ACTIONS.MOSTRAR_COBERTURA) {
        return respostaPadrao(
            estadoAnterior.cobertura
                ? `A cobertura informada para esta apólice é: ${estadoAnterior.cobertura}`
                : 'Esta apólice não possui uma descrição de cobertura cadastrada.',
            {
                meta: {
                    tipoResposta: 'SEGURO_ACAO',
                    ultimaAcaoExecutada: ACTIONS.MOSTRAR_COBERTURA
                }
            }
        );
    }

    if (acaoContextual.action === ACTIONS.MOSTRAR_VENCIMENTO) {
        return respostaPadrao(
            estadoAnterior.vencimento
                ? `O vencimento desta apólice é em ${new Date(estadoAnterior.vencimento).toLocaleDateString('pt-BR')}.`
                : 'Não encontrei a data de vencimento desta apólice.',
            {
                meta: {
                    tipoResposta: 'SEGURO_ACAO',
                    ultimaAcaoExecutada: ACTIONS.MOSTRAR_VENCIMENTO
                }
            }
        );
    }

    if (acaoContextual.action === ACTIONS.MOSTRAR_DADOS_APOLICE) {
        return respostaPadrao(
            `Apólice ${estadoAnterior.numeroApolice || 'N/A'}, seguradora ${estadoAnterior.seguradora || 'N/A'}.`,
            {
                meta: {
                    tipoResposta: 'SEGURO_ACAO',
                    ultimaAcaoExecutada: ACTIONS.MOSTRAR_DADOS_APOLICE
                }
            }
        );
    }

    return respostaPadrao(
        'Entendi a ação sobre o seguro anterior, mas ainda não tenho um tratador específico para ela.',
        {
            meta: {
                tipoResposta: 'SEGURO_ACAO',
                ultimaAcaoExecutada: acaoContextual.action || null
            }
        }
    );
}

export const SeguroService = {
    async processar(mensagem, usuarioNome, sessaoExistente = null, acaoContextual = null) {
        // 1. Follow-up de ação contextual
        if (acaoContextual?.matched) {
            const estadoAnterior = acaoContextual.state || {};
            const resposta = construirRespostaAcaoContextual(acaoContextual, estadoAnterior);

            await registrarSessaoSeguro(
                usuarioNome,
                mensagem,
                resposta.mensagem,
                {
                    ...estadoAnterior,
                    ultimaAcaoExecutada: acaoContextual.action
                },
                sessaoExistente
            );

            return resposta;
        }

        // 2. Extrai filtros da pergunta
        const filtros = extrairFiltrosSeguro(mensagem);

        // 3. Resolve unidade/equipamento
        let contexto = {
            unidadeTexto: filtros.unidadeTexto,
            equipamentoTexto: filtros.equipamentoTexto
        };

        contexto = await resolverEntidades(contexto);

        if (!contexto.unidadeId && !contexto.equipamentoId) {
            return respostaPadrao(
                "Não consegui identificar a unidade ou o equipamento do seguro. Pode informar novamente, por exemplo: 'me traga o seguro da unidade de Coxim'?"
            );
        }

        // 4. Busca seguro
        let seguro = null;

        if (filtros.somenteVigente) {
            seguro = await buscarSeguroVigente({
                unidadeId: contexto.unidadeId || null,
                equipamentoId: contexto.equipamentoId || null
            });
        } else {
            seguro = await buscarSeguroMaisRecente({
                unidadeId: contexto.unidadeId || null,
                equipamentoId: contexto.equipamentoId || null
            });
        }

        // 5. Monta resposta e payload
        const respostaTexto = montarResumoSeguro(seguro, contexto);
        const payload = construirPayloadSeguro(seguro, respostaTexto);

        await registrarSessaoSeguro(
            usuarioNome,
            mensagem,
            respostaTexto,
            payload,
            sessaoExistente
        );

        return respostaPadrao(
            `${respostaTexto}${payload.temAnexo ? ' Deseja que eu abra o PDF da apólice, mostre a cobertura ou informe o vencimento?' : ''}`,
            {
                meta: payload
            }
        );
    }
};