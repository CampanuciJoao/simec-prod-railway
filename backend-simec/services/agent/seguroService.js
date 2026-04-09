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

function obterEstadoAnterior(sessaoExistente) {
    if (!sessaoExistente?.stateJson) return {};
    try {
        return JSON.parse(sessaoExistente.stateJson);
    } catch {
        return {};
    }
}

function mergeFiltrosComContexto(filtros, estadoAnterior = {}) {
    return {
        ...filtros,
        unidadeTexto: filtros.unidadeTexto || estadoAnterior.unidadeNome || null,
        equipamentoTexto:
            filtros.equipamentoTexto ||
            estadoAnterior.equipamentoNome ||
            null
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
    await AgentSessionRepository.registrarMensagem(
        sessao.id,
        'agent',
        respostaTexto,
        payload
    );

    return sessao;
}

function construirRespostaAcaoContextual(acaoContextual, estadoAnterior) {
    if (acaoContextual.action === ACTIONS.GERAR_PDF) {
        if (estadoAnterior?.contextoPDF?.anexoId) {
            return respostaPadrao(
                `Perfeito. Vou preparar o PDF da apólice ${estadoAnterior.numeroApolice || ''}.`,
                {
                    acao: 'ABRIR_PDF_SEGURO',
                    contexto: {
                        seguroId: estadoAnterior.seguroId || null,
                        anexoId: estadoAnterior.contextoPDF.anexoId
                    },
                    meta: {
                        tipoResposta: 'SEGURO_ACAO',
                        ultimaAcaoExecutada: ACTIONS.GERAR_PDF
                    }
                }
            );
        }

        return respostaPadrao(
            `Encontrei a apólice ${estadoAnterior.numeroApolice || ''}, mas ela não possui PDF anexado no sistema.`,
            {
                meta: {
                    tipoResposta: 'SEGURO_ACAO',
                    ultimaAcaoExecutada: ACTIONS.GERAR_PDF
                }
            }
        );
    }

    if (acaoContextual.action === ACTIONS.ABRIR_DOCUMENTO) {
        if (estadoAnterior?.contextoPDF?.anexoId) {
            return respostaPadrao(
                `Perfeito. Vou abrir o documento da apólice ${estadoAnterior.numeroApolice || ''}.`,
                {
                    acao: 'ABRIR_PDF_SEGURO',
                    contexto: {
                        seguroId: estadoAnterior.seguroId || null,
                        anexoId: estadoAnterior.contextoPDF.anexoId
                    },
                    meta: {
                        tipoResposta: 'SEGURO_ACAO',
                        ultimaAcaoExecutada: ACTIONS.ABRIR_DOCUMENTO
                    }
                }
            );
        }

        return respostaPadrao(
            `Encontrei a apólice ${estadoAnterior.numeroApolice || ''}, mas ela não possui documento anexado no sistema.`,
            {
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
                ? `As coberturas informadas para esta apólice são: ${estadoAnterior.cobertura}`
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

function construirRespostaDiretaPorPedido(filtros, payload, respostaBase) {
    if (!payload?.seguroId) {
        return respostaPadrao(respostaBase, {
            meta: payload
        });
    }

    if (filtros.pedirCobertura) {
        return respostaPadrao(
            payload.cobertura
                ? `As coberturas da apólice ${payload.numeroApolice} são: ${payload.cobertura}`
                : `Encontrei a apólice ${payload.numeroApolice}, mas ela não possui cobertura descritiva cadastrada.`,
            {
                meta: payload
            }
        );
    }

    if (filtros.pedirVencimento) {
        return respostaPadrao(
            payload.vencimento
                ? `A apólice ${payload.numeroApolice} vence em ${new Date(payload.vencimento).toLocaleDateString('pt-BR')}.`
                : `Encontrei a apólice ${payload.numeroApolice}, mas não localizei a data de vencimento.`,
            {
                meta: payload
            }
        );
    }

    if (filtros.pedirDocumento) {
        if (payload.temAnexo && payload.contextoPDF?.anexoId) {
            return respostaPadrao(
                `Perfeito. Vou abrir o PDF da apólice ${payload.numeroApolice}.`,
                {
                    acao: 'ABRIR_PDF_SEGURO',
                    contexto: {
                        seguroId: payload.seguroId,
                        anexoId: payload.contextoPDF.anexoId
                    },
                    meta: payload
                }
            );
        }

        return respostaPadrao(
            `Encontrei a apólice ${payload.numeroApolice}, mas ela não possui PDF anexado no sistema.`,
            {
                meta: payload
            }
        );
    }

    return respostaPadrao(
        `${respostaBase}${payload.temAnexo ? ' Deseja que eu abra o PDF da apólice, mostre a cobertura ou informe o vencimento?' : ''}`,
        {
            meta: payload
        }
    );
}

export const SeguroService = {
    async processar(mensagem, usuarioNome, sessaoExistente = null, acaoContextual = null) {
        // 1. Follow-up contextual
        if (acaoContextual?.matched) {
            const estadoAnterior = acaoContextual.state || {};
            const resposta = construirRespostaAcaoContextual(
                acaoContextual,
                estadoAnterior
            );

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

        // 2. Extrai filtros + merge com contexto anterior
        const filtrosExtraidos = extrairFiltrosSeguro(mensagem);
        const estadoAnterior = obterEstadoAnterior(sessaoExistente);
        const filtros = mergeFiltrosComContexto(filtrosExtraidos, estadoAnterior);

        // 3. Resolve entidades
        let contexto = {
            unidadeTexto: filtros.unidadeTexto,
            equipamentoTexto: filtros.equipamentoTexto
        };

        contexto = await resolverEntidades(contexto);

        // 4. Se o usuário mandou algo curto como "de coxim" e ainda não resolvemos,
        // tentamos usar o contexto anterior para continuar a conversa
        if (!contexto.unidadeId && !contexto.equipamentoId) {
            if (estadoAnterior?.seguroId) {
                const resposta = respostaPadrao(
                    'Entendi que você está continuando a consulta do seguro anterior, mas não consegui identificar o novo alvo. Pode informar, por exemplo: "da unidade de Coxim", "da sede" ou "da tomografia de Coxim"?',
                    {
                        meta: estadoAnterior
                    }
                );

                await registrarSessaoSeguro(
                    usuarioNome,
                    mensagem,
                    resposta.mensagem,
                    estadoAnterior,
                    sessaoExistente
                );

                return resposta;
            }

            return respostaPadrao(
                "Não consegui identificar a unidade ou o equipamento do seguro. Pode informar novamente, por exemplo: 'me traga o seguro da unidade de Coxim'?"
            );
        }

        // 5. Busca seguro
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

        // 6. Monta resumo e payload
        const respostaTexto = montarResumoSeguro(seguro, contexto);
        const payload = construirPayloadSeguro(seguro, respostaTexto);

        await registrarSessaoSeguro(
            usuarioNome,
            mensagem,
            respostaTexto,
            payload,
            sessaoExistente
        );

        // 7. Se o usuário já pediu algo específico, responde direto
        return construirRespostaDiretaPorPedido(filtros, payload, respostaTexto);
    }
};