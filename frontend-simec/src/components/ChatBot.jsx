// Ficheiro: src/components/ChatBot.jsx
import React, { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRobot, faPaperPlane, faMinus } from '@fortawesome/free-solid-svg-icons';
import { enviarMensagemAoAgente } from '../services/api';
import { useToast } from '../contexts/ToastContext';

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
            addToast("A IA está processando seu crédito Google. Tente em breve.", "info");
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