// Ficheiro: src/components/ChatBot.jsx
import React, { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRobot, faPaperPlane, faMinus } from '@fortawesome/free-solid-svg-icons';
import { enviarMensagemAoAgente } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { exportarOSManutencaoPDF, exportarRelatorioPDF } from '../utils/pdfUtils';

import '../styles/components/ChatBot.css';

function ChatBot() {
    const [isOpen, setIsOpen] = useState(false);
    const [mensagem, setMensagem] = useState('');
    const [historico, setHistorico] = useState([
        {
            role: 'assistant',
            text: 'Olá! Sou a SIMEC-IA. Como posso ajudar na engenharia clínica hoje?'
        }
    ]);
    const [loading, setLoading] = useState(false);

    const scrollRef = useRef(null);
    const { addToast } = useToast();

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [historico, loading]);

    const getAuthToken = () => {
        try {
            const userInfo = localStorage.getItem('userInfo');
            if (!userInfo) return null;

            const parsed = JSON.parse(userInfo);
            return parsed?.token || null;
        } catch (error) {
            console.error('[CHATBOT_TOKEN_ERROR]', error);
            return null;
        }
    };

    const getApiBaseUrl = () => {
        const envUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        return envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`;
    };

    const getApiOriginUrl = () => {
        const apiBaseUrl = getApiBaseUrl();
        return apiBaseUrl.replace(/\/api$/, '');
    };

    const normalizarRespostaAgente = (data) => {
        const payload = data?.resposta ?? {};

        if (typeof payload === 'string') {
            return {
                role: 'assistant',
                text: payload,
                acao: null,
                contexto: null,
                meta: null
            };
        }

        return {
            role: 'assistant',
            text: payload?.mensagem || 'Sem resposta do agente.',
            acao: payload?.acao || null,
            contexto: payload?.contexto || null,
            meta: payload?.meta || null
        };
    };

    const buscarDadosOSParaPDF = async (manutencaoId, token, apiBaseUrl) => {
        const response = await fetch(
            `${apiBaseUrl}/pdf-data/manutencao/${manutencaoId}`,
            {
                method: 'GET',
                headers: {
                    Authorization: token ? `Bearer ${token}` : ''
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Falha ao buscar dados da OS para PDF. Status: ${response.status}`);
        }

        return response.json();
    };

    const buscarDadosRelatorioParaPDF = async (ids, token, apiBaseUrl) => {
        const response = await fetch(
            `${apiBaseUrl}/pdf-data/relatorio`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({ ids })
            }
        );

        if (!response.ok) {
            throw new Error(`Falha ao buscar dados do relatório para PDF. Status: ${response.status}`);
        }

        return response.json();
    };

    const buscarSeguroPorId = async (seguroId, token, apiBaseUrl) => {
        const response = await fetch(
            `${apiBaseUrl}/seguros/${seguroId}`,
            {
                method: 'GET',
                headers: {
                    Authorization: token ? `Bearer ${token}` : ''
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Falha ao buscar dados do seguro. Status: ${response.status}`);
        }

        return response.json();
    };

    const executarAcaoAgente = async (resposta) => {
        if (!resposta?.acao) return;

        const token = getAuthToken();
        const apiBaseUrl = getApiBaseUrl();
        const apiOriginUrl = getApiOriginUrl();

        try {
            // PDF DA OS
            if (resposta.acao === 'GERAR_PDF_OS') {
                const manutencaoId = resposta.contexto?.manutencaoId;

                if (!manutencaoId) {
                    throw new Error('manutencaoId não informado para gerar PDF da OS.');
                }

                const manutencao = await buscarDadosOSParaPDF(
                    manutencaoId,
                    token,
                    apiBaseUrl
                );

                exportarOSManutencaoPDF(manutencao);
                addToast('PDF da OS gerado com sucesso.', 'success');
                return;
            }

            // PDF DO RELATÓRIO
            if (resposta.acao === 'GERAR_PDF_RELATORIO') {
                const ids = resposta.contexto?.ids;

                if (!Array.isArray(ids) || ids.length === 0) {
                    throw new Error('IDs não informados para gerar PDF do relatório.');
                }

                const resultado = await buscarDadosRelatorioParaPDF(
                    ids,
                    token,
                    apiBaseUrl
                );

                exportarRelatorioPDF(resultado, 'relatorio_manutencoes');
                addToast('PDF do relatório gerado com sucesso.', 'success');
                return;
            }

            // ABRIR OS
            if (resposta.acao === 'ABRIR_OS') {
                const manutencaoId = resposta.contexto?.manutencaoId;

                if (!manutencaoId) {
                    throw new Error('manutencaoId não informado para abrir OS.');
                }

                window.open(`/manutencoes/detalhes/${manutencaoId}`, '_blank', 'noopener,noreferrer');
                addToast('Abrindo detalhes da OS.', 'success');
                return;
            }

            // ABRIR PDF / DOCUMENTO DO SEGURO
            if (
                resposta.acao === 'ABRIR_PDF_SEGURO' ||
                resposta.acao === 'ABRIR_DOCUMENTO'
            ) {
                const seguroId = resposta.contexto?.seguroId;

                if (!seguroId) {
                    throw new Error('seguroId não informado para abrir documento do seguro.');
                }

                const seguro = await buscarSeguroPorId(
                    seguroId,
                    token,
                    apiBaseUrl
                );

                const anexos = Array.isArray(seguro?.anexos) ? seguro.anexos : [];
                const anexo =
                    anexos.find(a => a.id === resposta.contexto?.anexoId) ||
                    anexos[0] ||
                    null;

                if (!anexo?.path) {
                    throw new Error('Nenhum PDF/anexo encontrado para este seguro.');
                }

                const urlDocumento = `${apiOriginUrl}/${anexo.path}`;
                window.open(urlDocumento, '_blank', 'noopener,noreferrer');
                addToast('Abrindo documento.', 'success');
                return;
            }
        } catch (error) {
            console.error('[CHATBOT_EXECUTAR_ACAO_ERROR]', error);
            addToast('Não consegui executar a ação solicitada.', 'error');
        }
    };

    const handleEnviar = async (e) => {
        e.preventDefault();

        if (!mensagem.trim() || loading) return;

        const textoMensagem = mensagem.trim();

        setHistorico(prev => [
            ...prev,
            { role: 'user', text: textoMensagem }
        ]);

        setMensagem('');
        setLoading(true);

        try {
            const data = await enviarMensagemAoAgente(textoMensagem);
            const respostaEstruturada = normalizarRespostaAgente(data);

            setHistorico(prev => [...prev, respostaEstruturada]);

            if (respostaEstruturada.acao) {
                await executarAcaoAgente(respostaEstruturada);
            }
        } catch (error) {
            console.error('[CHATBOT_ERROR]', error);
            addToast(
                'A IA está temporariamente indisponível. Tente novamente em breve.',
                'info'
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="chatbot-wrapper no-print">
            {!isOpen && (
                <button
                    className="chatbot-trigger"
                    onClick={() => setIsOpen(true)}
                >
                    <FontAwesomeIcon icon={faRobot} />
                    <span className="chatbot-tooltip">Falar com SIMEC-IA</span>
                </button>
            )}

            {isOpen && (
                <div className="chatbot-window">
                    <div className="chatbot-header">
                        <div className="chatbot-info">
                            <div className="bot-icon-circle">
                                <FontAwesomeIcon icon={faRobot} />
                            </div>
                            <span className="bot-name">SIMEC-IA</span>
                        </div>

                        <button
                            className="close-btn"
                            onClick={() => setIsOpen(false)}
                        >
                            <FontAwesomeIcon icon={faMinus} />
                        </button>
                    </div>

                    <div className="chatbot-messages" ref={scrollRef}>
                        {historico.map((msg, index) => (
                            <div
                                key={index}
                                className={`chat-bubble ${msg.role}`}
                            >
                                {typeof msg.text === 'string' ? msg.text : ''}
                            </div>
                        ))}

                        {loading && (
                            <div className="chat-bubble assistant loading">
                                <span>.</span>
                                <span>.</span>
                                <span>.</span>
                            </div>
                        )}
                    </div>

                    <form className="chatbot-input" onSubmit={handleEnviar}>
                        <input
                            type="text"
                            placeholder="Digite aqui..."
                            value={mensagem}
                            onChange={(e) => setMensagem(e.target.value)}
                            disabled={loading}
                        />

                        <button
                            type="submit"
                            disabled={loading || !mensagem.trim()}
                        >
                            <FontAwesomeIcon icon={faPaperPlane} />
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}

export default ChatBot;