// Ficheiro: src/components/ContratoForm.jsx
// VERSÃO REATORADA - COMPONENTE DE UI PURO

import React, { useState, useEffect, useMemo } from 'react';
import DateInput from '../ui/DateInput';

// Estado inicial padrão para um contrato novo.
const ESTADO_INICIAL_VAZIO = {
    numeroContrato: '',
    categoria: '',
    fornecedor: '',
    dataInicio: '',
    dataFim: '',
    status: 'Ativo',
    unidadesCobertasIds: [],
    equipamentosCobertosIds: []
};

function ContratoForm({ 
    onSubmit, 
    initialData = null, 
    isEditing = false, 
    todosEquipamentos = [], 
    unidadesDisponiveis = [] 
}) {
    const [formData, setFormData] = useState(ESTADO_INICIAL_VAZIO);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Efeito para popular o formulário com dados existentes no modo de edição.
    useEffect(() => {
        if (isEditing && initialData) {
            setFormData({
                numeroContrato: initialData.numeroContrato || '',
                categoria: initialData.categoria || '',
                fornecedor: initialData.fornecedor || '',
                dataInicio: initialData.dataInicio ? initialData.dataInicio.split('T')[0] : '',
                dataFim: initialData.dataFim ? initialData.dataFim.split('T')[0] : '',
                status: initialData.status || 'Ativo',
                // Mapeia os arrays de objetos para arrays de IDs.
                unidadesCobertasIds: initialData.unidadesCobertas?.map(u => u.id) || [],
                equipamentosCobertosIds: initialData.equipamentosCobertos?.map(e => e.id) || []
            });
        } else {
            setFormData(ESTADO_INICIAL_VAZIO);
        }
    }, [isEditing, initialData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCheckboxChange = (type, id) => {
        setFormData(prev => {
            const currentList = prev[type];
            const newList = currentList.includes(id)
                ? currentList.filter(itemId => itemId !== id)
                : [...currentList, id];
            
            const newState = { ...prev, [type]: newList };

            // Lógica para desmarcar equipamentos se a unidade for desmarcada
            if (type === 'unidadesCobertasIds' && !newList.includes(id)) {
                const equipamentosParaRemover = todosEquipamentos
                    .filter(e => e.unidadeId === id)
                    .map(e => e.id);
                
                newState.equipamentosCobertosIds = newState.equipamentosCobertosIds.filter(
                    equipId => !equipamentosParaRemover.includes(equipId)
                );
            }
            return newState;
        });
    };

    const equipamentosFiltrados = useMemo(() => {
        if (formData.unidadesCobertasIds.length === 0) return [];
        return todosEquipamentos.filter(eq => formData.unidadesCobertasIds.includes(eq.unidadeId));
    }, [formData.unidadesCobertasIds, todosEquipamentos]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        // ... (validação de campos) ...
        setIsSubmitting(true);
        try {
            await onSubmit(formData); // Delega a submissão para a função do pai.
        } catch (apiError) {
            setError(apiError.message || 'Ocorreu um erro ao salvar.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="form-elegante">
            {error && <p className="form-error">{error}</p>}
            
            <div className="form-section">
                <h4>Informações do Contrato</h4>
                <div className="info-grid grid-cols-3">
                    <div className="form-group"><label>Número do Contrato *</label><input type="text" name="numeroContrato" value={formData.numeroContrato} onChange={handleChange} required /></div>
                    <div className="form-group"><label>Categoria *</label><select name="categoria" value={formData.categoria} onChange={handleChange} required><option value="">Selecione</option><option value="Manutenção Corretiva">Manutenção Corretiva</option><option value="Manutenção Preventiva">Manutenção Preventiva</option><option value="Full Service">Full Service</option></select></div>
                    <div className="form-group"><label>Fornecedor *</label><input type="text" name="fornecedor" value={formData.fornecedor} onChange={handleChange} required /></div>
                    <div className="form-group"><label>Data de Início *</label><DateInput name="dataInicio" value={formData.dataInicio} onChange={handleChange} required /></div>
                    <div className="form-group"><label>Data de Fim *</label><DateInput name="dataFim" value={formData.dataFim} onChange={handleChange} required /></div>
                    <div className="form-group"><label>Status *</label><select name="status" value={formData.status} onChange={handleChange} required><option value="Ativo">Ativo</option><option value="Expirado">Expirado</option><option value="Cancelado">Cancelado</option></select></div>
                </div>
            </div>
            
            <div className="form-section">
                <h4>Cobertura</h4>
                <div className="form-group">
                    <label>1. Selecione as Unidades para listar os equipamentos</label>
                    <div className="checkbox-group scrollable">
                        {unidadesDisponiveis.map(unidade => (
                            <div key={unidade.id} className="checkbox-item">
                                <input type="checkbox" id={`unidade-${unidade.id}`} checked={formData.unidadesCobertasIds.includes(unidade.id)} onChange={() => handleCheckboxChange('unidadesCobertasIds', unidade.id)} />
                                <label htmlFor={`unidade-${unidade.id}`}>{unidade.nomeSistema}</label>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="form-group">
                    <label>2. Selecione os Equipamentos Cobertos</label>
                    <div className="checkbox-group scrollable">
                        {formData.unidadesCobertasIds.length === 0 ? (
                            <p className="no-data-message" style={{width: '100%'}}>Selecione uma ou mais unidades para listar os equipamentos.</p>
                        ) : equipamentosFiltrados.length > 0 ? (
                            equipamentosFiltrados.map(equip => (
                                <div key={equip.id} className="checkbox-item">
                                    <input type="checkbox" id={`equip-${equip.id}`} checked={formData.equipamentosCobertosIds.includes(equip.id)} onChange={() => handleCheckboxChange('equipamentosCobertosIds', equip.id)} />
                                    <label htmlFor={`equip-${equip.id}`}>{equip.modelo} (Tag: {equip.tag})</label>
                                </div>
                            ))
                        ) : (
                            <p className="no-data-message" style={{width: '100%'}}>Nenhum equipamento encontrado para a(s) unidade(s) selecionada(s).</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="form-actions" style={{ justifyContent: 'flex-end', gap: '10px' }}>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                    {isSubmitting ? 'Salvando...' : 'Salvar Contrato'}
                </button>
            </div>
        </form>
    );
}

export default ContratoForm;