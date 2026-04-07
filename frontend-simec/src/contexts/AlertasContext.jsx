// Ficheiro: src/contexts/AlertasContext.jsx
// VERSÃO PROFISSIONAL - REAL-TIME ESPONTÂNEO COM NOTIFICAÇÃO TOAST

import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { getAlertas, updateAlertaStatus } from '../services/api';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext'; // Importação do sistema de avisos flutuantes
import { io } from 'socket.io-client';

// 1. Criação do Contexto
const AlertasContext = createContext(null);

// 2. Componente Provider
export const AlertasProvider = ({ children }) => {
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { addToast } = useToast(); // Função para disparar o aviso visual na tela

  /**
   * @function carregarAlertas
   * @param {boolean} vindaDoSocket - Se verdadeiro, dispara o aviso visual (Toast)
   */
  const carregarAlertas = useCallback(async (vindaDoSocket = false) => {
    if (!isAuthenticated || authLoading || !user?.id) {
      setAlertas([]);
      if (!authLoading) setLoading(false);
      return;
    }

    try {
      const data = await getAlertas(); 
      setAlertas(data || []);

      // SE FOR UMA ATUALIZAÇÃO EM TEMPO REAL, MOSTRA O AVISO NA TELA
      if (vindaDoSocket) {
          addToast("🔔 Novo alerta de manutenção gerado pelo sistema!", "info");
      }

    } catch (error) {
      console.error("AlertasContext: Falha ao buscar dados de alertas.", error);
      setAlertas([]);
    } finally {
        setLoading(false);
    }
  }, [isAuthenticated, authLoading, user?.id, addToast]);

  /**
   * @effect [SISTEMA REAL-TIME]
   * @description Mantém o túnel aberto com o servidor para atualizações espontâneas.
   */
  useEffect(() => {
    if (isAuthenticated && !authLoading && user?.id) {
      // 1. Carrega os dados assim que o usuário entra
      carregarAlertas();

      // 2. Configura o endereço do servidor
      const socketUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
      
      // 3. Conecta ao túnel de comunicação
      const socket = io(socketUrl);

      // 4. ESCUTA ATIVA: Quando o servidor terminar de processar, ele "empurra" a notícia.
      socket.on('atualizar-alertas', () => {
          console.log("📢 WebSocket: Chegou notificação espontânea!");
          carregarAlertas(true); // 'true' faz o balão aparecer na tela na hora
      });

      return () => {
        socket.disconnect();
        setAlertas([]);
        setLoading(true);
      };
    } else if (!isAuthenticated && !authLoading) {
        setAlertas([]);
        setLoading(false);
    }
  }, [isAuthenticated, authLoading, user?.id, carregarAlertas]);


  /**
   * @function updateStatus
   * @description Atualiza o status de visualização (Visto/NaoVisto)
   */
  const updateStatus = useCallback(async (alertaId, newStatus) => {
    const originalAlertas = alertas;
    
    setAlertas(prevAlertas => 
      prevAlertas.map(alerta => 
        alerta.id === alertaId ? { ...alerta, status: newStatus } : alerta
      )
    );

    try {
      await updateAlertaStatus(alertaId, newStatus); 
    } catch (error) {
      console.error(`Erro ao atualizar status do alerta ${alertaId}. Revertendo...`, error);
      setAlertas(originalAlertas);
    }
  }, [alertas]);

  /**
   * @function dismissAlerta
   * @description Remove o alerta da vista (Ação de Dispensar)
   */
  const dismissAlerta = useCallback(async (alertaId) => {
    const originalAlertas = [...alertas];
    setAlertas(prevAlertas => prevAlertas.filter(alerta => alerta.id !== alertaId));

    try {
      await updateAlertaStatus(alertaId, 'Visto');
    } catch (error) {
      console.error(`Erro ao dispensar o alerta ${alertaId}. Revertendo...`, error);
      setAlertas(originalAlertas);
    }
  }, [alertas]);


  // 3. Monta o valor a ser fornecido pelo contexto.
  const value = useMemo(() => ({
    alertas,
    loading,
    updateStatus,
    dismissAlerta,
    refetchAlertas: carregarAlertas,
  }), [alertas, loading, updateStatus, dismissAlerta, carregarAlertas]);

  // 4. Retorna o Provider
  return (
    <AlertasContext.Provider value={value}>
      {children}
    </AlertasContext.Provider>
  );
};

// 5. Hook customizado
export const useAlertas = () => {
    const context = useContext(AlertasContext);
    if (context === undefined) {
        throw new Error('useAlertas deve ser usado dentro de um AlertasProvider');
    }
    return context;
};