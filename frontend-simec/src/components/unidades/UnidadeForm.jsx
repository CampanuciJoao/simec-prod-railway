// Ficheiro: frontend-simec/src/components/UnidadeForm.jsx
// VERSÃO FINAL, COMPLETA E COM LISTA DE ESTADOS CORRETA

// --- Core & Routing Dependencies ---
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// --- UI Components & Assets ---
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faTimes, faSpinner } from '@fortawesome/free-solid-svg-icons';

// --- Módulo de Constantes ---
// Definir constantes estáticas fora do componente previne recriações desnecessárias a cada renderização.
const ESTADO_INICIAL_VAZIO = {
  nomeSistema: '',
  nomeFantasia: '',
  cnpj: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  cep: '',
};

// >> CORREÇÃO PRINCIPAL APLICADA AQUI <<
// A lista de estados foi completada para incluir todas as 27 unidades federativas do Brasil.
const ESTADOS_BRASILEIROS = [
  { uf: 'AC', nome: 'Acre' }, { uf: 'AL', nome: 'Alagoas' }, { uf: 'AP', nome: 'Amapá' },
  { uf: 'AM', nome: 'Amazonas' }, { uf: 'BA', nome: 'Bahia' }, { uf: 'CE', nome: 'Ceará' },
  { uf: 'DF', nome: 'Distrito Federal' }, { uf: 'ES', nome: 'Espírito Santo' }, { uf: 'GO', nome: 'Goiás' },
  { uf: 'MA', nome: 'Maranhão' }, { uf: 'MT', nome: 'Mato Grosso' }, { uf: 'MS', nome: 'Mato Grosso do Sul' },
  { uf: 'MG', nome: 'Minas Gerais' }, { uf: 'PA', nome: 'Pará' }, { uf: 'PB', nome: 'Paraíba' },
  { uf: 'PR', nome: 'Paraná' }, { uf: 'PE', nome: 'Pernambuco' }, { uf: 'PI', nome: 'Piauí' },
  { uf: 'RJ', nome: 'Rio de Janeiro' }, { uf: 'RN', nome: 'Rio Grande do Norte' }, { uf: 'RS', nome: 'Rio Grande do Sul' },
  { uf: 'RO', nome: 'Rondônia' }, { uf: 'RR', nome: 'Roraima' }, { uf: 'SC', nome: 'Santa Catarina' },
  { uf: 'SP', nome: 'São Paulo' }, { uf: 'SE', nome: 'Sergipe' }, { uf: 'TO', nome: 'Tocantins' }
];

// --- Módulo de Funções Utilitárias ---
// Funções puras e isoladas para manipulação de strings (máscaras).
const formatarCNPJ = (value) => {
  if (!value) return "";
  return value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d)/, '$1-$2').replace(/(-\d{2})\d+?$/, '$1');
};

const formatarCEP = (value) => {
  if (!value) return "";
  return value.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').replace(/(-\d{3})\d+?$/, '$1');
};

/**
 * @component UnidadeForm
 * @description Componente de apresentação para o formulário de Unidades. É responsável pela
 * renderização dos campos, validação local, formatação de máscaras e gerenciamento do estado
 * do formulário. Delega a lógica de submissão para o componente pai via `onSubmit`.
 */
function UnidadeForm({ onSubmit, initialData = null, isEditing = false }) {
  const [formData, setFormData] = useState(ESTADO_INICIAL_VAZIO);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  // Efeito para hidratar o formulário com dados iniciais no modo de edição.
  useEffect(() => {
    if (isEditing && initialData) {
      const dadosFormatados = {
        nomeSistema: initialData.nomeSistema || '',
        nomeFantasia: initialData.nomeFantasia || '',
        cnpj: initialData.cnpj ? formatarCNPJ(initialData.cnpj) : '',
        logradouro: initialData.logradouro || '',
        numero: initialData.numero || '',
        complemento: initialData.complemento || '',
        bairro: initialData.bairro || '',
        cidade: initialData.cidade || '',
        estado: initialData.estado || '',
        cep: initialData.cep ? formatarCEP(initialData.cep) : '',
      };
      setFormData(dadosFormatados);
    } else {
      setFormData(ESTADO_INICIAL_VAZIO);
    }
  }, [initialData, isEditing]);

  // Handler de mudança genérico e performático para todos os inputs do formulário.
  const handleChange = (e) => {
    let { name, value } = e.target;
    
    // Aplica formatação de máscara condicionalmente.
    if (name === 'cnpj') value = formatarCNPJ(value);
    if (name === 'cep') value = formatarCEP(value);
    
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handler para a submissão do formulário.
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.nomeSistema || !formData.nomeFantasia) {
      setError('Nome da Unidade e Nome Fantasia são campos obrigatórios.');
      return;
    }
    setIsSubmitting(true);
    
    // Prepara o payload para a API, removendo as máscaras dos campos formatados.
    const dadosParaApi = {
        ...formData,
        cnpj: formData.cnpj.replace(/\D/g, ''),
        cep: formData.cep.replace(/\D/g, ''),
    };

    try {
      await onSubmit(dadosParaApi);
    } catch (apiError) {
      setError(apiError.message || `Erro ao ${isEditing ? 'atualizar' : 'adicionar'} unidade.`);
    } finally {
      // Garante que o estado de submissão seja resetado, reabilitando o botão.
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-elegante">
      {error && <p className="form-error">{error}</p>}

      <div className="form-section">
        <h4>Informações da Unidade</h4>
        <div className="info-grid grid-cols-2">
          <div className="form-group">
            <label htmlFor="nomeSistema">Nome da Unidade (Apelido) *</label>
            <input type="text" id="nomeSistema" name="nomeSistema" value={formData.nomeSistema} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="nomeFantasia">Nome Fantasia *</label>
            <input type="text" id="nomeFantasia" name="nomeFantasia" value={formData.nomeFantasia} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="cnpj">CNPJ</label>
            <input type="text" id="cnpj" name="cnpj" value={formData.cnpj} onChange={handleChange} maxLength="18" placeholder="00.000.000/0000-00"/>
          </div>
        </div>
      </div>
      
      <div className="form-section">
        <h4>Endereço</h4>
        <div className="info-grid grid-cols-3">
            <div className="form-group col-span-2">
                <label htmlFor="logradouro">Logradouro (Rua, Av.)</label>
                <input type="text" id="logradouro" name="logradouro" value={formData.logradouro} onChange={handleChange} />
            </div>
            <div className="form-group">
                <label htmlFor="numero">Número</label>
                <input type="text" id="numero" name="numero" value={formData.numero} onChange={handleChange} />
            </div>
            <div className="form-group">
                <label htmlFor="complemento">Complemento</label>
                <input type="text" id="complemento" name="complemento" value={formData.complemento} onChange={handleChange} />
            </div>
            <div className="form-group">
                <label htmlFor="bairro">Bairro</label>
                <input type="text" id="bairro" name="bairro" value={formData.bairro} onChange={handleChange} />
            </div>
            <div className="form-group">
                <label htmlFor="cep">CEP</label>
                <input type="text" id="cep" name="cep" value={formData.cep} onChange={handleChange} maxLength="9" placeholder="00000-000"/>
            </div>
            <div className="form-group">
                <label htmlFor="cidade">Cidade</label>
                <input type="text" id="cidade" name="cidade" value={formData.cidade} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label htmlFor="estado">Estado (UF)</label>
              <select id="estado" name="estado" value={formData.estado} onChange={handleChange}>
                <option value="">Selecione um Estado</option>
                {/* O JSX itera sobre a constante completa, renderizando todas as opções. */}
                {ESTADOS_BRASILEIROS.map(estado => (
                  <option key={estado.uf} value={estado.uf}>
                    {estado.nome}
                  </option>
                ))}
              </select>
            </div>
        </div>
      </div>
      
      <div className="form-actions" style={{ justifyContent: 'flex-end', display: 'flex', gap: '10px' }}>
        <button type="button" className="btn btn-secondary" onClick={() => navigate('/cadastros/unidades')} disabled={isSubmitting}>
          <FontAwesomeIcon icon={faTimes} /> Cancelar
        </button>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          <FontAwesomeIcon icon={isSubmitting ? faSpinner : faSave} spin={isSubmitting} /> {isSubmitting ? 'Salvando...' : (isEditing ? 'Salvar Alterações' : 'Adicionar Unidade')}
        </button>
      </div>
    </form>
  );
}

export default UnidadeForm;