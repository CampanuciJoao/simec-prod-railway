// Ficheiro: src/components/ChatBot.jsx
import React, { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRobot, faPaperPlane, faMinus } from '@fortawesome/free-solid-svg-icons';
import { enviarMensagemAoAgente } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { exportarOSManutencaoPDF, exportarRelatorioPDF } from '../utils/pdfUtils';

// Importação com o caminho correto para a pasta styles
import '../styles/components/ChatBot.css';

function ChatBot() {
    const [isOpen, setIsOpen] = useState(false);
    const [mensagem, setMensagem] = useState('');
    const [historico, setHistorico] = useState([
        { role: 'assistant', text: 'Olá! Sou a SIMEC-IA. Como posso ajudar na engenharia clínica hoje?' }
    ]);
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef(null);
    const { addToast } = useToast();

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [historico]);

    const getAuthToken = () => {
        return localStorage.getItem('token');
    };

    const executarAcaoAgente = async (resposta) => {
        if (!resposta?.acao) return;

        const token = getAuthToken();

        if (resposta.acao === 'GERAR_PDF_OS' && resposta.contexto?.manutencaoId) {
            try {
                const r = await fetch(
                    `${import.meta.env.VITE_API_URL || ''}/api/pdf-data/manutencao/${resposta.contexto.manutencaoId}`,
                    {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: token ? `Bearer ${token}` : ''
                        }
                    }
                );

                if (!r.ok) {
                    throw new Error('Falha ao buscar dados da OS para PDF.');
                }

                const manutencao = await r.json();
                exportarOSManutencaoPDF(manutencao);
                addToast('PDF da OS gerado com sucesso.', 'success');
            } catch (error) {
                console.error('[CHATBOT_PDF_OS_ERROR]', error);
                addToast('Não consegui gerar o PDF da OS.', 'error');
            }

            return;
        }

        if (resposta.acao === 'GERAR_PDF_RELATORIO' && Array.isArray(resposta.contexto?.ids)) {
            try {
                const r = await fetch(
                    `${import.meta.env.VITE_API_URL || ''}/api/pdf-data/relatorio`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: token ? `Bearer ${token}` : ''
                        },
                        body: JSON.stringify({
                            ids: resposta.contexto.ids
                        })
                    }
                );

                if (!r.ok) {
                    throw new Error('Falha ao buscar dados do relatório para PDF.');
                }

                const resultado = await r.json();
                exportarRelatorioPDF(resultado, 'relatorio_manutencoes');
                addToast('PDF do relatório gerado com sucesso.', 'success');
            } catch (error) {
                console.error('[CHATBOT_PDF_RELATORIO_ERROR]', error);
                addToast('Não consegui gerar o PDF do relatório.', 'error');
            }
        }
    };

    const handleEnviar = async (e) => {
        e.preventDefault();
        if (!mensagem.trim() || loading) return;

        const textoMensagem = mensagem;

        const novaMensagemUsuario = { role: 'user', text: textoMensagem };
        setHistorico(prev => [...prev, novaMensagemUsuario]);
        setMensagem('');
        setLoading(true);

        try {
            const data = await enviarMensagemAoAgente(textoMensagem);

            const payload = data?.resposta ?? {};
            const mensagemAssistente =
                typeof payload === 'string'
                    ? payload
                    : payload?.mensagem || 'Sem resposta do agente.';

            const respostaEstruturada = {
                role: 'assistant',
                text: mensagemAssistente,
                acao: typeof payload === 'object' ? payload?.acao || null : null,
                contexto: typeof payload === 'object' ? payload?.contexto || null : null,
                meta: typeof payload === 'object' ? payload?.meta || null : null
            };

            setHistorico(prev => [...prev, respostaEstruturada]);

            if (respostaEstruturada.acao) {
                await executarAcaoAgente(respostaEstruturada);
            }
        } catch (error) {
            console.error('[CHATBOT_ERROR]', error);
            addToast('A IA está temporariamente indisponível. Tente novamente em breve.', 'info');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="chatbot-wrapper no-print">
            {!isOpen && (
                <button className="chatbot-trigger" onClick={() => setIsOpen(true)}>
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
                        <button className="close-btn" onClick={() => setIsOpen(false)}>
                            <FontAwesomeIcon icon={faMinus} />
                        </button>
                    </div>

                    <div className="chatbot-messages" ref={scrollRef}>
                        {historico.map((msg, index) => (
                            <div key={index} className={`chat-bubble ${msg.role}`}>
                                {typeof msg.text === 'string' ? msg.text : ''}
                            </div>
                        ))}

                        {loading && (
                            <div className="chat-bubble assistant loading">
                                <span>.</span><span>.</span><span>.</span>
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
                        <button type="submit" disabled={loading || !mensagem.trim()}>
                            <FontAwesomeIcon icon={faPaperPlane} />
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}

export default ChatBot;