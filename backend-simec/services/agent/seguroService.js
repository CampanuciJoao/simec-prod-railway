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

function formatarMoedaBR(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

function formatarDataBR(data) {
    if (!data) return null;

    try {
        return new Date(data).toLocaleDateString('pt-BR');
    } catch {
        return null;
    }
}

function montarListaCoberturas(seguro) {
    if (!seguro) return [];

    const coberturas = [
        { rotulo: 'APP', valor: seguro.lmiAPP },
        { rotulo: 'Danos Corporais', valor: seguro.lmiDanosCorporais },
        { rotulo: 'Danos Elétricos', valor: seguro.lmiDanosEletricos },
        { rotulo: 'Danos Materiais', valor: seguro.lmiDanosMateriais },
        { rotulo: 'Danos Morais', valor: seguro.lmiDanosMorais },
        { rotulo: 'Incêndio', valor: seguro.lmiIncendio },
        { rotulo: 'Responsabilidade Civil', valor: seguro.lmiResponsabilidadeCivil },
        { rotulo: 'Roubo / Furto', valor: seguro.lmiRoubo },
        { rotulo: 'Vidros', valor: seguro.lmiVidros }
    ]
        .filter(item => Number(item.valor || 0) > 0)
        .map(item => `${item.rotulo}: ${formatarMoedaBR(item.valor)}`);

    return coberturas;
}

function montarMensagemCoberturas(payload) {
    const coberturasEstruturadas = Array.isArray(payload?.coberturasDetalhadas)
        ? payload.coberturasDetalhadas
        : [];

    if (coberturasEstruturadas.length > 0) {
        return `As coberturas cadastradas para a apólice ${payload.numeroApolice} são:\n- ${coberturasEstruturadas.join('\n- ')}`;
    }

    if (payload?.cobertura) {
        return `A descrição de cobertura cadastrada para a apólice ${payload.numeroApolice} é: ${payload.cobertura}`;
    }

    return `Encontrei a apólice ${payload?.numeroApolice || ''}, mas não há coberturas cadastradas com valor no sistema.`;
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

function enriquecerPayloadSeguro(seguro, payloadBase) {
    if (!seguro) return payloadBase;

    return {
        ...payloadBase,
        seguroId: seguro.id,
        numeroApolice: seguro.apoliceNumero || payloadBase.numeroApolice || null,
        seguradora: seguro.seguradora || payloadBase.seguradora || null,
        cobertura: seguro.cobertura || payloadBase.cobertura || null,
        vencimento: seguro.dataFim || payloadBase.vencimento || null,
        premioTotal: seguro.premioTotal ?? 0,
        coberturasDetalhadas: montarListaCoberturas(seguro)
    };
}

function construirRespostaAcaoContextual(acaoContextual, estadoAnterior) {
    if (acaoContextual.action === ACTIONS.CANCELAR_ACAO) {
        return respostaPadrao(
            'Tudo bem. Não vou abrir PDF nem buscar mais detalhes desse seguro. Posso ajudar com outra coisa.',
            {
                meta: {
                    tipoResposta: 'SEGURO_ACAO',
                    ultimaAcaoExecutada: ACTIONS.CANCELAR_ACAO
                }
            }
        );
    }

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
        return respostaPadrao(montarMensagemCoberturas(estadoAnterior), {
            meta: {
                tipoResposta: 'SEGURO_ACAO',
                ultimaAcaoExecutada: ACTIONS.MOSTRAR_COBERTURA,
                coberturasDetalhadas: estadoAnterior.coberturasDetalhadas || []
            }
        });
    }

    if (acaoContextual.action === ACTIONS.MOSTRAR_VENCIMENTO) {
        const vencimentoFormatado = formatarDataBR(estadoAnterior.vencimento);

        return respostaPadrao(
            vencimentoFormatado
                ? `O vencimento da apólice ${estadoAnterior.numeroApolice || ''} é em ${vencimentoFormatado}.`
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
        const vencimentoFormatado = formatarDataBR(estadoAnterior.vencimento);

        return respostaPadrao(
            `Apólice ${estadoAnterior.numeroApolice || 'N/A'}, seguradora ${estadoAnterior.seguradora || 'N/A'}${vencimentoFormatado ? `, vencimento em ${vencimentoFormatado}` : ''}.`,
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
        return respostaPadrao(montarMensagemCoberturas(payload), {
            meta: payload
        });
    }

    if (filtros.pedirVencimento) {
        const vencimentoFormatado = formatarDataBR(payload.vencimento);

        return respostaPadrao(
            vencimentoFormatado
                ? `A apólice ${payload.numeroApolice} vence em ${vencimentoFormatado}.`
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
        `${respostaBase}${payload.temAnexo ? ' Deseja que eu abra o PDF da apólice, mostre a cobertura ou informe o vencimento?' : ' Deseja que eu mostre a cobertura ou informe o vencimento?'}`,
        {
            meta: payload
        }
    );
}

export const SeguroService = {
    async processar(mensagem, usuarioNome, sessaoExistente = null, acaoContextual = null) {
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

        const filtrosExtraidos = extrairFiltrosSeguro(mensagem);
        const estadoAnterior = obterEstadoAnterior(sessaoExistente);
        const filtros = mergeFiltrosComContexto(filtrosExtraidos, estadoAnterior);

        let contexto = {
            unidadeTexto: filtros.unidadeTexto,
            equipamentoTexto: filtros.equipamentoTexto
        };

        contexto = await resolverEntidades(contexto);

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

        const respostaTexto = montarResumoSeguro(seguro, contexto);
        const payloadBase = construirPayloadSeguro(seguro, respostaTexto);
        const payload = enriquecerPayloadSeguro(seguro, payloadBase);

        await registrarSessaoSeguro(
            usuarioNome,
            mensagem,
            respostaTexto,
            payload,
            sessaoExistente
        );

        return construirRespostaDiretaPorPedido(filtros, payload, respostaTexto);
    }
};