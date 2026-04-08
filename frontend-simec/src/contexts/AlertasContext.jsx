// Ficheiro: src/contexts/AlertasContext.jsx
// VERSÃO PROFISSIONAL - REAL-TIME SILENCIOSO (ATUALIZA APENAS O SINO)

import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { getAlertas, updateAlertaStatus } from '../services/api';
import { useAuth } from './AuthContext';
import { io } from 'socket.io-client';

// 1. Criação do Contexto
const AlertasContext = createContext(null);

// 2. Componente Provider
export const AlertasProvider = ({ children }) => {
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  /**
   * @function carregarAlertas
   * @description Busca os alertas no banco silenciosamente
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
   * @description Mantém o canal de comunicação aberto com o servidor Railway.
   */
  useEffect(() => {
    if (isAuthenticated && !authLoading && user?.id) {
      // 1. Carrega os dados na entrada
      carregarAlertas();

      // 2. Define a URL do servidor (remove o /api para conectar no canal de rádio principal)
      const socketUrl = import.meta.env.VITE_API_URL?.split('/api')[0] || 'http://localhost:5000';
      
      // 3. Conecta ao túnel Socket.io
      const socket = io(socketUrl);

      // 4. OUVIDO ATIVO: Atualiza a interface silenciosamente quando o servidor mandar sinal
      socket.on('atualizar-alertas', () => {
          console.log("📢 WebSocket: Sinal recebido do servidor! Atualizando interface...");
          carregarAlertas(); // Atualiza os dados sem disparar balões na tela
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
   * @description Marca como Visto ou Não Visto
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
      console.error(`Erro ao atualizar status. Revertendo...`, error);
      setAlertas(originalAlertas);
    }
  }, [alertas]);

  /**
   * @function dismissAlerta
   * @description Ação de "Dispensar" o alerta da vista atual
   */
  const dismissAlerta = useCallback(async (alertaId) => {
    const originalAlertas = [...alertas];
    setAlertas(prevAlertas => prevAlertas.filter(alerta => alerta.id !== alertaId));

    try {
      await updateAlertaStatus(alertaId, 'Visto');
    } catch (error) {
      console.error(`Erro ao dispensar alerta. Revertendo...`, error);
      setAlertas(originalAlertas);
    }
  }, [alertas]);


  // 3. Monta o valor a ser fornecido pelo contexto global
  const value = useMemo(() => ({
    alertas,
    loading,
    updateStatus,
    dismissAlerta,
    refetchAlertas: carregarAlertas,
  }), [alertas, loading, updateStatus, dismissAlerta, carregarAlertas]);

  // 4. Retorna o Provider que envolve toda a aplicação
  return (
    <AlertasContext.Provider value={value}>
      {children}
    </AlertasContext.Provider>
  );
};

// 5. Hook customizado para facilitar o uso nos componentes (Ex: AlertasPage)
export const useAlertas = () => {
    const context = useContext(AlertasContext);
    if (context === undefined) {
        throw new Error('useAlertas deve ser usado dentro de um AlertasProvider');
    }
    return context;
};