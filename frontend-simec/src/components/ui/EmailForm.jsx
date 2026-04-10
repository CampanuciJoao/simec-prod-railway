// Ficheiro: frontend-simec/src/components/EmailForm.jsx
// Descrição: Componente de formulário "burro" para criar e editar destinatários de e-mail.

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faSave } from '@fortawesome/free-solid-svg-icons';

const EmailForm = ({ initialData, onSubmit, onCancel, isSubmitting }) => {
    // Estado inicial padrão, usado para novos cadastros.
    const getInitialState = () => ({
        nome: '', email: '', diasAntecedencia: 30,
        recebeAlertasContrato: true, recebeAlertasManutencao: false, recebeAlertasSeguro: false,
    });

    const [formData, setFormData] = useState(getInitialState());

    // Popula o formulário com dados existentes quando entramos no modo de edição.
    useEffect(() => {
        if (initialData) {
            setFormData({
                nome: initialData.nome || '',
                email: initialData.email || '',
                diasAntecedencia: initialData.diasAntecedencia || 30,
                recebeAlertasContrato: initialData.recebeAlertasContrato ?? true,
                recebeAlertasManutencao: initialData.recebeAlertasManutencao ?? false,
                recebeAlertasSeguro: initialData.recebeAlertasSeguro ?? false,
            });
        } else {
            setFormData(getInitialState()); // Reseta para um formulário limpo
        }
    }, [initialData]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData); // Delega a submissão para a página pai.
    };

    return (
        <form onSubmit={handleSubmit} className="form-elegante" noValidate>
            <div className="info-grid grid-cols-2">
                <div className="form-group"><label>Nome (Opcional)</label><input type="text" name="nome" value={formData.nome} onChange={handleChange} placeholder="Ex: Gestor Financeiro"/></div>
                <div className="form-group"><label>E-mail *</label><input type="email" name="email" value={formData.email} onChange={handleChange} required disabled={!!initialData} /></div>
            </div>
            <div className="form-group">
                <label>Notificar com quantos dias de antecedência?</label>
                <input type="number" name="diasAntecedencia" value={formData.diasAntecedencia} onChange={handleChange} min="1" max="90"/>
            </div>
            
            <div className="form-section" style={{paddingTop: '15px', marginTop: '15px'}}>
                <h4>Subscrições de Alertas por E-mail</h4>
                <div className="checkbox-group">
                    <div className="checkbox-item"><input type="checkbox" name="recebeAlertasContrato" checked={formData.recebeAlertasContrato} onChange={handleChange} id="cb-contrato"/><label htmlFor="cb-contrato">Contratos</label></div>
                    <div className="checkbox-item"><input type="checkbox" name="recebeAlertasManutencao" checked={formData.recebeAlertasManutencao} onChange={handleChange} id="cb-manutencao"/><label htmlFor="cb-manutencao">Manutenções</label></div>
                    <div className="checkbox-item"><input type="checkbox" name="recebeAlertasSeguro" checked={formData.recebeAlertasSeguro} onChange={handleChange} id="cb-seguro"/><label htmlFor="cb-seguro">Seguros</label></div>
                </div>
            </div>
            
            <div className="modal-actions" style={{borderTop: 'none', paddingTop: '10px', marginTop: '20px'}}>
                <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={isSubmitting}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}><FontAwesomeIcon icon={isSubmitting ? faSpinner : faSave} spin={isSubmitting}/> Salvar</button>
            </div>
        </form>
    );
};

export default EmailForm;
