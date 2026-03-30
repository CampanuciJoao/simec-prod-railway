// Ficheiro: src/components/abas-equipamento/TabHistorico.jsx
// VERSÃO 8.0 - HISTÓRICO UNIFICADO (MANUTENÇÕES + OCORRÊNCIAS)

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getManutencoes, getOcorrenciasPorEquipamento, addOcorrencia } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { formatarDataHora } from '../../utils/timeUtils';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHistory, faEye, faSpinner, faPlus, faSave, faTimes, faFileMedical, faTools } from '@fortawesome/free-solid-svg-icons';

function TabHistorico({ equipamentoId }) {
  const { addToast } = useToast();
  
  const [historicoBruto, setHistoricoBruto] = useState({ manutencoes: [], ocorrencias: [] });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Estado do formulário de ocorrência rápida
  const [novaOcorrencia, setNovaOcorrencia] = useState({ titulo: '', descricao: '', tipo: 'Operacional', tecnico: '' });

  const carregarTudo = useCallback(async () => {
    if (!equipamentoId) return;
    setLoading(true);
    try {
      // Busca as duas fontes de dados ao mesmo tempo
      const [manuts, ocorrs] = await Promise.all([
        getManutencoes({ equipamentoId }),
        getOcorrenciasPorEquipamento(equipamentoId)
      ]);
      setHistoricoBruto({ manutencoes: manuts || [], ocorrencias: ocorrs || [] });
    } catch (error) {
      addToast('Erro ao carregar histórico completo.', 'error');
    } finally {
      setLoading(false);
    }
  }, [equipamentoId, addToast]);

  useEffect(() => { carregarTudo(); }, [carregarTudo]);

  // LÓGICA DE MISTURA: Junta Manutenções e Ocorrências em uma única lista organizada por data
  const linhaDoTempo = useMemo(() => {
    const m = historicoBruto.manutencoes.map(item => ({
      id: item.id,
      data: item.dataHoraAgendamentoInicio,
      tipoPrincipal: 'Manutenção',
      subtipo: item.tipo,
      titulo: `OS: ${item.numeroOS}`,
      descricao: item.descricaoProblemaServico,
      status: item.status,
      link: `/manutencoes/detalhes/${item.id}`,
      isOS: true
    }));

    const o = historicoBruto.ocorrencias.map(item => ({
      id: item.id,
      data: item.data,
      tipoPrincipal: 'Ocorrência',
      subtipo: item.tipo,
      titulo: item.titulo,
      descricao: item.descricao,
      status: 'Registrado',
      link: null,
      isOS: false
    }));

    // Junta tudo e ordena da mais recente para a mais antiga
    return [...m, ...o].sort((a, b) => new Date(b.data) - new Date(a.data));
  }, [historicoBruto]);

  const handleSalvarOcorrencia = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await addOcorrencia({ ...novaOcorrencia, equipamentoId });
      addToast('Evento registrado no histórico!', 'success');
      setNovaOcorrencia({ titulo: '', descricao: '', tipo: 'Operacional', tecnico: '' });
      setShowForm(false);
      carregarTudo();
    } catch (err) {
      addToast('Erro ao salvar registro.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="section-header" style={{ marginBottom: '20px' }}>
        <h3 className="tab-title">
          <FontAwesomeIcon icon={faHistory} /> Histórico de Vida do Equipamento
        </h3>
        {!showForm && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
            <FontAwesomeIcon icon={faPlus} /> Registrar Ocorrência
          </button>
        )}
      </div>

      {/* Formulário Rápido (Aparece apenas quando clica em Adicionar) */}
      {showForm && (
        <div className="page-section" style={{ background: 'var(--cor-fundo-pagina-light)', border: '1px solid var(--cor-borda-light)', marginBottom: '20px' }}>
          <h4 style={{ marginBottom: '15px' }}>Novo Registro na Ficha Técnica</h4>
          <form onSubmit={handleSalvarOcorrencia} className="form-elegante">
            <div className="form-group">
              <label>Título do Evento *</label>
              <input type="text" value={novaOcorrencia.titulo} onChange={e => setNovaOcorrencia({...novaOcorrencia, titulo: e.target.value})} placeholder="Ex: Queda de energia, Ajuste de rede..." required />
            </div>
            <div className="info-grid grid-cols-2">
              <div className="form-group">
                <label>Categoria</label>
                <select value={novaOcorrencia.tipo} onChange={e => setNovaOcorrencia({...novaOcorrencia, tipo: e.target.value})}>
                  <option value="Operacional">Operacional</option>
                  <option value="Ajuste">Ajuste / Configuração</option>
                  <option value="Infraestrutura">Infraestrutura</option>
                  <option value="Software">Software</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>
              <div className="form-group">
                <label>Técnico / Responsável</label>
                <input type="text" value={novaOcorrencia.tecnico} onChange={e => setNovaOcorrencia({...novaOcorrencia, tecnico: e.target.value})} placeholder="Seu nome" />
              </div>
            </div>
            <div className="form-group">
              <label>Descrição</label>
              <textarea rows="2" value={novaOcorrencia.descricao} onChange={e => setNovaOcorrencia({...novaOcorrencia, descricao: e.target.value})}></textarea>
            </div>
            <div className="form-actions" style={{ justifyContent: 'flex-start', gap: '10px', borderTop: 'none', paddingTop: 0 }}>
              <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
                <FontAwesomeIcon icon={submitting ? faSpinner : faSave} spin={submitting} /> Salvar no Histórico
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowForm(false)}>
                <FontAwesomeIcon icon={faTimes} /> Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <FontAwesomeIcon icon={faSpinner} spin /> Carregando histórico completo...
        </div>
      ) : linhaDoTempo.length > 0 ? (
        <div className="table-responsive-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Data / Hora</th>
                <th>Origem</th>
                <th>Título / Evento</th>
                <th>Status / Tipo</th>
                <th className="text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {linhaDoTempo.map((item, index) => (
                <tr key={`${item.id}-${index}`} style={{ borderLeft: item.isOS ? '4px solid #3b82f6' : '4px solid #8b5cf6' }}>
                  <td data-label="Data">{formatarDataHora(item.data)}</td>
                  <td data-label="Origem">
                    <span style={{ fontSize: '0.85em', fontWeight: 'bold', color: item.isOS ? '#3b82f6' : '#8b5cf6' }}>
                      <FontAwesomeIcon icon={item.isOS ? faTools : faFileMedical} style={{ marginRight: '5px' }} />
                      {item.tipoPrincipal.toUpperCase()}
                    </span>
                  </td>
                  <td data-label="Título">
                    <strong>{item.titulo}</strong>
                    <div style={{ fontSize: '0.85em', color: 'var(--cor-texto-secundario-light)' }}>{item.descricao}</div>
                  </td>
                  <td data-label="Status">
                    <span className={`status-badge status-os-${item.status.toLowerCase().replace(/\s+/g, '-')}`}>
                      {item.subtipo || item.status}
                    </span>
                  </td>
                  <td className="actions-cell text-right">
                    {item.link ? (
                      <Link to={item.link} className="btn-action view" title="Ver OS Completa">
                        <FontAwesomeIcon icon={faEye} />
                      </Link>
                    ) : (
                      <span title="Registro Manual" style={{ opacity: 0.3 }}><FontAwesomeIcon icon={faFileMedical} /></span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="no-data-message">Nenhum registro encontrado no histórico deste equipamento.</p>
      )}
    </div>
  );
}

export default TabHistorico;