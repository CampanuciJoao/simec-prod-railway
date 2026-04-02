// Ficheiro: src/components/ChatBot.jsx
import React, { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRobot, faPaperPlane, faTimes, faMinus, faCommentDots } from '@fortawesome/free-solid-svg-icons';
import { enviarMensagemAoAgente } from '../services/api';
import { useToast } from '../contexts/ToastContext';

function ChatBot() {
    const [isOpen, setIsOpen] = useState(false);
    const [mensagem, setMensagem] = useState('');
    const [historico, setHistorico] = useState([
        { role: 'assistant', text: 'Olá! Sou o Guardião SIMEC. Como posso ajudar na engenharia clínica hoje?' }
    ]);
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef(null);
    const { addToast } = useToast();

    // Scroll automático para a última mensagem
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [historico]);

    const handleEnviar = async (e) => {
        e.preventDefault();
        if (!mensagem.trim() || loading) return;

        const novaMensagemUsuario = { role: 'user', text: mensagem };
        setHistorico(prev => [...prev, novaMensagemUsuario]);
        setMensagem('');
        setLoading(true);

        try {
            const data = await enviarMensagemAoAgente(mensagem);
            setHistorico(prev => [...prev, { role: 'assistant', text: data.resposta }]);
        } catch (error) {
            addToast("O Agente está offline no momento.", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="chatbot-wrapper no-print">
            {/* Botão Flutuante */}
            {!isOpen && (
                <button className="chatbot-trigger" onClick={() => setIsOpen(true)}>
                    <FontAwesomeIcon icon={faCommentDots} size="lg" />
                    <span className="chatbot-tooltip">Fale com o Agente</span>
                </button>
            )}

            {/* Janela de Chat */}
            {isOpen && (
                <div className="chatbot-window">
                    <div className="chatbot-header">
                        <div className="chatbot-info">
                            <FontAwesomeIcon icon={faRobot} />
                            <span>Guardião SIMEC</span>
                        </div>
                        <div className="chatbot-actions">
                            <button onClick={() => setIsOpen(false)}><FontAwesomeIcon icon={faMinus} /></button>
                        </div>
                    </div>

                    <div className="chatbot-messages" ref={scrollRef}>
                        {historico.map((msg, index) => (
                            <div key={index} className={`chat-bubble ${msg.role}`}>
                                {msg.text}
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
                            placeholder="Digite sua dúvida ou comando..." 
                            value={mensagem}
                            onChange={(e) => setMensagem(e.target.value)}
                            disabled={loading}
                        />
                        <button type="submit" disabled={loading}>
                            <FontAwesomeIcon icon={faPaperPlane} />
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}

export default ChatBot;