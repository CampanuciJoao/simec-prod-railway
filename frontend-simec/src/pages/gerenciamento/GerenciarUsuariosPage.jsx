// src/pages/GerenciarUsuariosPage.jsx
// VERSÃO FINAL - COM EDIÇÃO UNIFICADA E VISUALIZAÇÃO DE SENHA CORRIGIDA

import React, { useState, useEffect, useCallback } from 'react';
import { getUsuarios, criarUsuario, updateUsuario, deletarUsuario } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { useModal } from '../hooks/useModal';
import { useAuth } from '../../contexts/AuthContext';
import ModalConfirmacao from '../components/ModalConfirmacao';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrashAlt, faSpinner, faTimes, faSave, faEye, faEyeSlash, faEdit } from '@fortawesome/free-solid-svg-icons';

const UsuarioForm = ({ onSubmit, onCancel, isSubmitting, isEditing = false, initialData = {} }) => {
    const [formData, setFormData] = useState({ nome: '', username: '', senha: '', confirmaSenha: '', role: 'user' });
    const [senhaVisivel, setSenhaVisivel] = useState(false);
    const [confirmaSenhaVisivel, setConfirmaSenhaVisivel] = useState(false);
    const { addToast } = useToast();
    
    useEffect(() => {
        if (isEditing && initialData) {
            setFormData({
                nome: initialData.nome || '',
                username: initialData.username || '',
                role: initialData.role || 'user',
                senha: '', 
                confirmaSenha: ''
            });
        }
    }, [isEditing, initialData]);

    const handleChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (formData.senha && formData.senha !== formData.confirmaSenha) {
            addToast('As senhas não coincidem.', 'error');
            return;
        }

        const dadosParaApi = {
            nome: formData.nome,
            role: formData.role,
        };

        if (formData.senha) {
            dadosParaApi.senha = formData.senha;
        }
        
        if (!isEditing) {
            dadosParaApi.username = formData.username;
        }
        
        onSubmit(dadosParaApi);
    };

    return (
        <div className="form-container-inline" style={{ padding: '25px' }}>
            <form onSubmit={handleSubmit}>
                <h4 style={{ marginTop: 0, fontSize: '1.2em' }}>{isEditing ? `Editando Usuário: ${initialData.nome}` : 'Adicionar Novo Usuário'}</h4>
                <div className="info-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    <div className="form-group"><label>Nome Completo *</label><input type="text" name="nome" value={formData.nome} onChange={handleChange} required disabled={isSubmitting} /></div>
                    <div className="form-group"><label>Nome de Usuário (login) *</label><input type="text" name="username" value={formData.username} onChange={handleChange} required disabled={isSubmitting || isEditing} /></div>
                </div>
                
                <div className="info-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    <div className="form-group" style={{ position: 'relative' }}>
                        <label>{isEditing ? 'Nova Senha (Opcional)' : 'Senha Inicial *'}</label>
                        <input id="senha-nova-usuario" type={senhaVisivel ? 'text' : 'password'} name="senha" value={formData.senha} onChange={handleChange} required={!isEditing} minLength="6" disabled={isSubmitting} placeholder={isEditing ? 'Deixe em branco para não alterar' : ''}/>
                        <FontAwesomeIcon icon={senhaVisivel ? faEyeSlash : faEye} onClick={() => setSenhaVisivel(p => !p)} style={{ position: 'absolute', right: '12px', top: '38px', cursor: 'pointer', color: '#666' }} />
                    </div>
                    <div className="form-group" style={{ position: 'relative' }}>
                        <label>Confirmar Senha</label>
                        <input id="confirma-senha-usuario" type={confirmaSenhaVisivel ? 'text' : 'password'} name="confirmaSenha" value={formData.confirmaSenha} onChange={handleChange} required={!isEditing && !!formData.senha} minLength="6" disabled={isSubmitting} />
                        <FontAwesomeIcon icon={confirmaSenhaVisivel ? faEyeSlash : faEye} onClick={() => setConfirmaSenhaVisivel(p => !p)} style={{ position: 'absolute', right: '12px', top: '38px', cursor: 'pointer', color: '#666' }} />
                    </div>
                </div>
                
                <div className="form-group" style={{ maxWidth: 'calc(50% - 12.5px)' }}><label>Função (Role)</label><select name="role" value={formData.role} onChange={handleChange} disabled={isSubmitting}><option value="user">Usuário Padrão</option><option value="admin">Administrador</option></select></div>
                <div className="form-actions" style={{ justifyContent: 'flex-start' }}>
                    <button type="submit" className="btn btn-primary" disabled={isSubmitting}><FontAwesomeIcon icon={isSubmitting ? faSpinner : faSave} spin={isSubmitting} /> {isSubmitting ? 'Salvando...' : (isEditing ? 'Salvar Alterações' : 'Salvar Usuário')}</button>
                    <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={isSubmitting}><FontAwesomeIcon icon={faTimes} /> Cancelar</button>
                </div>
            </form>
        </div>
    );
};

function GerenciarUsuariosPage() {
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [isSubmittingForm, setIsSubmittingForm] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const { addToast } = useToast();
    const { isOpen: isDeleteModalOpen, modalData: userToDelete, openModal: openDeleteModal, closeModal: closeDeleteModal } = useModal();
    const { user: usuarioLogado } = useAuth();

    const fetchUsuarios = useCallback(async () => {
        try {
            setLoading(true);
            const response = await getUsuarios();
            setUsuarios(response || []);
        } catch (err) {
            addToast('Erro ao carregar usuários.', 'error');
            setUsuarios([]);
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    useEffect(() => { fetchUsuarios(); }, [fetchUsuarios]);

    const handleEditClick = (user) => {
        setEditingUser(user);
        setShowForm(true);
    };

    const handleCancelForm = () => {
        setShowForm(false);
        setEditingUser(null);
    };

    const handleSaveUsuario = async (formData) => {
        setIsSubmittingForm(true);
        try {
            if (editingUser) {
                await updateUsuario(editingUser.id, formData);
                addToast('Usuário atualizado com sucesso!', 'success');
            } else {
                await criarUsuario(formData);
                addToast('Usuário criado com sucesso!', 'success');
            }
            fetchUsuarios();
            handleCancelForm();
        } catch (err) {
            addToast(err.response?.data?.message || 'Ocorreu um erro ao salvar o usuário.', 'error');
        } finally {
            setIsSubmittingForm(false);
        }
    };

    const handleDeletarUsuario = async () => {
        if (!userToDelete) return;
        try { 
            await deletarUsuario(userToDelete.id); 
            addToast('Usuário excluído com sucesso!', 'success'); 
            fetchUsuarios();
        } catch (err) { 
            addToast(err.response?.data?.message || 'Erro ao excluir usuário.', 'error'); 
        }
        closeDeleteModal();
    };

    if (loading) return <div className="page-section"><p style={{ textAlign: 'center' }}><FontAwesomeIcon icon={faSpinner} spin size="2x" /> Carregando...</p></div>;

    return (
        <>
            <ModalConfirmacao isOpen={isDeleteModalOpen} onClose={closeDeleteModal} onConfirm={handleDeletarUsuario} title="Confirmar Exclusão" message={`Tem certeza que deseja excluir o usuário "${userToDelete?.nome}"?`} isDestructive={true} />
            
            <section className="page-section">
                {showForm ? (
                    <UsuarioForm 
                        onSubmit={handleSaveUsuario} 
                        onCancel={handleCancelForm} 
                        isSubmitting={isSubmittingForm} 
                        isEditing={!!editingUser} 
                        initialData={editingUser} 
                    />
                ) : (
                    <>
                        <div className="table-header-actions">
                            <span className="item-count">{usuarios.length} usuário(s) encontrado(s)</span>
                            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                                <FontAwesomeIcon icon={faPlus} /> Novo Usuário
                            </button>
                        </div>

                        <div className="table-responsive-wrapper" style={{ marginTop: '20px' }}>
                            <table className="data-table">
                                <thead><tr><th>Nome Completo</th><th>Nome de Usuário (Login)</th><th>Função (Role)</th><th>Ações</th></tr></thead>
                                <tbody>
                                    {usuarios.length > 0 ? (
                                        usuarios.map(user => (
                                            <tr key={user.id}>
                                                <td>{user.nome}</td>
                                                <td>{user.username}</td>
                                                <td><span className={`status-badge ${user.role === 'admin' ? 'status-os-cancelada' : 'status-ativo'}`}>{user.role === 'admin' ? 'Admin' : 'User'}</span></td>
                                                <td className="actions-cell">
                                                    <button className="btn-action edit" title="Editar Usuário" onClick={() => handleEditClick(user)}><FontAwesomeIcon icon={faEdit} /></button>
                                                    <button className="btn-action delete" title={usuarioLogado?.id === user.id ? "Não é possível excluir a si mesmo" : "Excluir Usuário"} onClick={() => openDeleteModal(user)} disabled={usuarioLogado?.id === user.id}><FontAwesomeIcon icon={faTrashAlt} /></button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan="4" className="table-message">Nenhum usuário encontrado.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </section>
        </>
    );
}

export default GerenciarUsuariosPage;