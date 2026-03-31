import React, { useState, useEffect, useMemo } from 'react';
import DateInput from './DateInput';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faSave, faShieldAlt, faHospital, faCoins } from '@fortawesome/free-solid-svg-icons';

// Tipos de vínculo para o seguro
const TIPOS_VINCULO = {
    GERAL: 'geral',
    EQUIPAMENTO: 'equipamento',
    UNIDADE: 'unidade',
};

// Estado inicial com todos os novos campos de cobertura
const ESTADO_INICIAL_VAZIO = {
    apoliceNumero: '',
    seguradora: '',
    dataInicio: '',
    dataFim: '',
    tipoVinculo: TIPOS_VINCULO.GERAL,
    equipamentoId: '',
    unidadeId: '',
    cobertura: '',
    // Novos campos financeiros
    premioTotal: 0,
    lmiIncendio: 0,
    lmiDanosEletricos: 0,
    lmiRoubo: 0,
    lmiVidros: 0,
    lmiResponsabilidadeCivil: 0,
    lmiDanosMateriais: 0,
    lmiDanosCorporais: 0,
    lmiDanosMorais: 0,
    lmiAPP: 0
};

function SeguroForm({ 
    onSubmit, 
    initialData = null, 
    isEditing = false, 
    equipamentosDisponiveis = [], 
    unidadesDisponiveis = []      
}) {
    const [formData, setFormData] = useState(ESTADO_INICIAL_VAZIO);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Preenche o formulário ao editar
    useEffect(() => {
        if (isEditing && initialData) {
            let tipoVinculoInicial = TIPOS_VINCULO.GERAL;
            if (initialData.equipamentoId) tipoVinculoInicial = TIPOS_VINCULO.EQUIPAMENTO;
            else if (initialData.unidadeId) tipoVinculoInicial = TIPOS_VINCULO.UNIDADE;

            setFormData({
                ...ESTADO_INICIAL_VAZIO, // Garante que campos nulos do banco fiquem como 0
                ...initialData,
                tipoVinculo: tipoVinculoInicial,
                dataInicio: initialData.dataInicio ? initialData.dataInicio.split('T')[0] : '',
                dataFim: initialData.dataFim ? initialData.dataFim.split('T')[0] : '',
            });
        } else {
            setFormData(ESTADO_INICIAL_VAZIO);
        }
    }, [isEditing, initialData]);
    
    const handleChange = (e) => {
        const { name, value, type } = e.target;
        // Se for campo numérico, converte para número
        const finalValue = type === 'number' ? parseFloat(value) || 0 : value;
        setFormData(prev => ({ ...prev, [name]: finalValue }));
    };

    const handleTipoVinculoChange = (e) => {
        setFormData(prev => ({
            ...prev,
            tipoVinculo: e.target.value,
            equipamentoId: '', 
            unidadeId: '',     
        }));
    };

    const equipamentosFiltradosPorUnidade = useMemo(() => {
        if (formData.tipoVinculo === TIPOS_VINCULO.EQUIPAMENTO && formData.unidadeId) {
            return equipamentosDisponiveis.filter(eq => eq.unidadeId === formData.unidadeId);
        }
        return [];
    }, [formData.tipoVinculo, formData.unidadeId, equipamentosDisponiveis]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            // Prepara os dados para enviar ao servidor
            const payload = {
                ...formData,
                equipamentoId: formData.tipoVinculo === TIPOS_VINCULO.EQUIPAMENTO ? formData.equipamentoId : null,
                unidadeId: formData.tipoVinculo === TIPOS_VINCULO.UNIDADE ? formData.unidadeId : (formData.tipoVinculo === TIPOS_VINCULO.EQUIPAMENTO ? formData.unidadeId : null),
            };

            await onSubmit(payload);
        } catch (err) {
            setError(err.message || 'Ocorreu um erro ao salvar o seguro.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="form-elegante">
            {error && <p className="form-error">{error}</p>}
            
            {/* SEÇÃO 1: DADOS BÁSICOS */}
            <div className="form-section">
                <h4><FontAwesomeIcon icon={faShieldAlt} /> Detalhes da Apólice</h4>
                <div className="info-grid grid-cols-2">
                    <div className="form-group">
                        <label>Número da Apólice *</label>
                        <input type="text" name="apoliceNumero" value={formData.apoliceNumero} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label>Seguradora *</label>
                        <input type="text" name="seguradora" value={formData.seguradora} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label>Início da Vigência *</label>
                        <DateInput name="dataInicio" value={formData.dataInicio} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label>Fim da Vigência *</label>
                        <DateInput name="dataFim" value={formData.dataFim} onChange={handleChange} required />
                    </div>
                </div>
            </div>

            {/* SEÇÃO 2: VÍNCULO */}
            <div className="form-section">
                <h4><FontAwesomeIcon icon={faHospital} /> Objeto Segurado (Vínculo)</h4>
                <div className="form-group">
                    <label>Tipo de Vínculo</label>
                    <select name="tipoVinculo" value={formData.tipoVinculo} onChange={handleTipoVinculoChange}>
                        <option value={TIPOS_VINCULO.GERAL}>Geral (Sem vínculo específico)</option>
                        <option value={TIPOS_VINCULO.UNIDADE}>Vincular à Unidade</option>
                        <option value={TIPOS_VINCULO.EQUIPAMENTO}>Vincular ao Equipamento</option>
                    </select>
                </div>

                {(formData.tipoVinculo === TIPOS_VINCULO.UNIDADE || formData.tipoVinculo === TIPOS_VINCULO.EQUIPAMENTO) && (
                    <div className="form-group">
                        <label>Unidade *</label>
                        <select name="unidadeId" value={formData.unidadeId} onChange={handleChange} required>
                            <option value="">Selecione a Unidade</option>
                            {unidadesDisponiveis.map(u => (
                                <option key={u.id} value={u.id}>{u.nomeSistema}</option>
                            ))}
                        </select>
                    </div>
                )}

                {formData.tipoVinculo === TIPOS_VINCULO.EQUIPAMENTO && (
                    <div className="form-group">
                        <label>Equipamento *</label>
                        <select name="equipamentoId" value={formData.equipamentoId} onChange={handleChange} required disabled={!formData.unidadeId}>
                            <option value="">Selecione o Equipamento</option>
                            {equipamentosFiltradosPorUnidade.map(eq => (
                                <option key={eq.id} value={eq.id}>{eq.modelo} (Tag: {eq.tag})</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* SEÇÃO 3: COBERTURAS (LMI) */}
            <div className="form-section">
                <h4><FontAwesomeIcon icon={faCoins} /> Coberturas e Valores (LMI)</h4>
                <div className="info-grid grid-cols-3">
                    <div className="form-group"><label>Prêmio Total (Custo)</label>
                        <input type="number" step="0.01" name="premioTotal" value={formData.premioTotal} onChange={handleChange} />
                    </div>
                    <div className="form-group"><label>Incêndio / Explosão</label>
                        <input type="number" name="lmiIncendio" value={formData.lmiIncendio} onChange={handleChange} />
                    </div>
                    <div className="form-group"><label>Danos Elétricos</label>
                        <input type="number" name="lmiDanosEletricos" value={formData.lmiDanosEletricos} onChange={handleChange} />
                    </div>
                    <div className="form-group"><label>Roubo / Furto</label>
                        <input type="number" name="lmiRoubo" value={formData.lmiRoubo} onChange={handleChange} />
                    </div>
                    <div className="form-group"><label>Quebra de Vidros</label>
                        <input type="number" name="lmiVidros" value={formData.lmiVidros} onChange={handleChange} />
                    </div>
                    <div className="form-group"><label>Resp. Civil (Terceiros)</label>
                        <input type="number" name="lmiResponsabilidadeCivil" value={formData.lmiResponsabilidadeCivil} onChange={handleChange} />
                    </div>
                    <div className="form-group"><label>Danos Materiais (Auto)</label>
                        <input type="number" name="lmiDanosMateriais" value={formData.lmiDanosMateriais} onChange={handleChange} />
                    </div>
                    <div className="form-group"><label>Danos Corporais (Auto)</label>
                        <input type="number" name="lmiDanosCorporais" value={formData.lmiDanosCorporais} onChange={handleChange} />
                    </div>
                    <div className="form-group"><label>Danos Morais</label>
                        <input type="number" name="lmiDanosMorais" value={formData.lmiDanosMorais} onChange={handleChange} />
                    </div>
                    <div className="form-group"><label>APP (Passageiros)</label>
                        <input type="number" name="lmiAPP" value={formData.lmiAPP} onChange={handleChange} />
                    </div>
                </div>
                <div className="form-group" style={{ marginTop: '15px' }}>
                    <label>Observações da Cobertura</label>
                    <textarea name="cobertura" rows="3" value={formData.cobertura} onChange={handleChange}></textarea>
                </div>
            </div>
            
            <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                    <FontAwesomeIcon icon={isSubmitting ? faSpinner : faSave} spin={isSubmitting} /> 
                    {isSubmitting ? 'Salvando...' : 'Salvar Seguro'}
                </button>
            </div>
        </form>
    );
}

export default SeguroForm;