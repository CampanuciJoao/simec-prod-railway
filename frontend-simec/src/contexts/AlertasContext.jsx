// Ficheiro: src/contexts/AlertasContext.jsx
// VERSÃO PROFISSIONAL - REAL-TIME COM WEBSOCKETS (SOCKET.IO)

import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { getAlertas, updateAlertaStatus } from '../services/api';
import { useAuth } from './AuthContext';
import { io } from 'socket.io-client'; // Importação do cliente de WebSockets

// 1. Criação do Contexto
const AlertasContext = createContext(null);

// 2. Componente Provider
export const AlertasProvider = ({ children }) => {
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  /**
   * @function carregarAlertas
   * @description Busca os alertas via API (Chamado inicialmente e via WebSocket)
   */
  const carregarAlertas = useCallback(async () => {
    if (!isAuthenticated || authLoading || !user?.id) {
      setAlertas([]);
      if (!authLoading) setLoading(false);
      return;
    }

    try {
      const data = await getAlertas(); 
      setAlertas(data || []);
    } catch (error) {
      console.error("AlertasContext: Falha ao buscar dados de alertas.", error);
      setAlertas([]);
    } finally {
        setLoading(false);
    }
  }, [isAuthenticated, authLoading, user?.id]);

  /**
   * @effect [SISTEMA REAL-TIME]
   * @description Conecta ao servidor via WebSocket e aguarda o "empurrão" de dados.
   * Substitui o antigo setInterval (Polling).
   */
  useEffect(() => {
    if (isAuthenticated && !authLoading && user?.id) {
      // 1. Carrega os alertas assim que o usuário loga
      carregarAlertas();

      // 2. Define a URL do servidor (remove o /api da string para conectar na raiz do socket)
      const socketUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
      
      // 3. Abre o túnel de comunicação real-time
      const socket = io(socketUrl);

      // 4. "Escuta" o servidor. Quando o backend gritar 'atualizar-alertas', o frontend obedece na hora.
      socket.on('atualizar-alertas', () => {
          console.log("📢 WebSocket: O servidor avisou que há novidades! Atualizando...");
          carregarAlertas();
      });

      // 5. Limpeza: Fecha o túnel quando o usuário sai do sistema
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