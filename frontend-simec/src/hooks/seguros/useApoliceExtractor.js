import { useState, useCallback } from 'react';

import { extrairApolicePdf } from '@/services/api/segurosApi';

/**
 * Hook para extrair dados de uma apólice em PDF via IA.
 *
 * Fluxo:
 * 1. extrair(file)              → chama a API, retorna campos/sugestões/avisos
 * 2. Se PDF protegido           → seta requerSenha=true e guarda o arquivo
 * 3. extrairComSenha(senha)     → re-chama a API com a senha
 *
 * O arquivo permanece na memória do componente pai (para virar anexo do
 * seguro quando salvar). Esse hook só orquestra a extração.
 */
export function useApoliceExtractor() {
  const [extraindo, setExtraindo] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState(null);
  const [requerSenha, setRequerSenha] = useState(false);
  const [arquivoPendente, setArquivoPendente] = useState(null);
  const [senhaInvalida, setSenhaInvalida] = useState(false);

  const executarExtracao = useCallback(async (file, senha = null) => {
    setExtraindo(true);
    setErro(null);
    setSenhaInvalida(false);

    try {
      const data = await extrairApolicePdf(file, senha);

      setResultado(data);
      setRequerSenha(false);
      setArquivoPendente(null);
      return { sucesso: true, data };
    } catch (err) {
      const code = err?.response?.data?.code;
      const message = err?.response?.data?.message || 'Erro ao extrair a apólice.';

      if (code === 'ERR_PDF_PROTECTED') {
        setRequerSenha(true);
        setArquivoPendente(file);
        return { sucesso: false, requerSenha: true };
      }

      if (code === 'ERR_PDF_PASSWORD_INVALID') {
        setSenhaInvalida(true);
        setRequerSenha(true);
        setArquivoPendente(file);
        return { sucesso: false, requerSenha: true, senhaInvalida: true };
      }

      setErro({ code, message });
      return { sucesso: false, erro: { code, message } };
    } finally {
      setExtraindo(false);
    }
  }, []);

  const extrair = useCallback(
    (file) => executarExtracao(file, null),
    [executarExtracao]
  );

  const extrairComSenha = useCallback(
    (senha) => {
      if (!arquivoPendente) return Promise.resolve({ sucesso: false });
      return executarExtracao(arquivoPendente, senha);
    },
    [arquivoPendente, executarExtracao]
  );

  const cancelar = useCallback(() => {
    setRequerSenha(false);
    setArquivoPendente(null);
    setErro(null);
    setSenhaInvalida(false);
  }, []);

  const reset = useCallback(() => {
    setExtraindo(false);
    setResultado(null);
    setErro(null);
    setRequerSenha(false);
    setArquivoPendente(null);
    setSenhaInvalida(false);
  }, []);

  return {
    extraindo,
    resultado,
    erro,
    requerSenha,
    senhaInvalida,
    extrair,
    extrairComSenha,
    cancelar,
    reset,
  };
}
