import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  createOrcamento,
  updateOrcamento,
  getOrcamentoById,
} from '@/services/api/orcamentosApi';
import { getUnidades } from '@/services/api/unidadesApi';
import { useToast } from '@/contexts/ToastContext';

function tempId() {
  return `tmp_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

function novoFornecedor(ordem) {
  return { id: tempId(), nome: '', formaPagamento: '', ordem };
}

function novoItem(ordem) {
  return {
    id: tempId(),
    descricao: '',
    data: new Date().toISOString().split('T')[0],
    ordem,
    isDestaque: false,
  };
}

export function useSalvarOrcamento() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { addToast } = useToast();
  const isEditing = Boolean(id);

  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState('PRODUTO');
  const [observacao, setObservacao] = useState('');
  const [unidadeId, setUnidadeId] = useState('');
  const [unidades, setUnidades] = useState([]);
  const [fornecedores, setFornecedores] = useState([novoFornecedor(0)]);
  const [itens, setItens] = useState([novoItem(0)]);
  const [precos, setPrecos] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [errors, setErrors] = useState({});

  // Carrega unidades disponíveis
  useEffect(() => {
    getUnidades()
      .then((lista) => setUnidades(lista || []))
      .catch(() => {});
  }, []);

  // Carrega dados ao editar
  useEffect(() => {
    if (!isEditing) return;
    setLoadingData(true);
    getOrcamentoById(id)
      .then((orc) => {
        setTitulo(orc.titulo || '');
        setTipo(orc.tipo || 'PRODUTO');
        setObservacao(orc.observacao || '');
        setUnidadeId(orc.unidadeId || '');

        const fList = (orc.fornecedores || []).map((f) => ({
          id: f.id,
          nome: f.nome,
          formaPagamento: f.formaPagamento || '',
          ordem: f.ordem,
        }));
        setFornecedores(fList.length ? fList : [novoFornecedor(0)]);

        const iList = (orc.itens || []).map((item) => ({
          id: item.id,
          descricao: item.descricao,
          data: item.data ? item.data.split('T')[0] : '',
          ordem: item.ordem,
          isDestaque: item.isDestaque || false,
        }));
        setItens(iList.length ? iList : [novoItem(0)]);

        const precosMap = {};
        for (const item of orc.itens || []) {
          for (const preco of item.precos || []) {
            precosMap[`${item.id}_${preco.fornecedorId}`] = {
              valor: Number(preco.valor || 0),
              desconto: Number(preco.desconto || 0),
            };
          }
        }
        setPrecos(precosMap);
      })
      .catch(() => addToast('Erro ao carregar orçamento.', 'error'))
      .finally(() => setLoadingData(false));
  }, [id, isEditing, addToast]);

  const adicionarFornecedor = useCallback(() => {
    setFornecedores((prev) => [...prev, novoFornecedor(prev.length)]);
  }, []);

  const removerFornecedor = useCallback((fId) => {
    setFornecedores((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((f) => f.id !== fId).map((f, i) => ({ ...f, ordem: i }));
    });
    setPrecos((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        if (key.endsWith(`_${fId}`)) delete next[key];
      });
      return next;
    });
  }, []);

  const atualizarFornecedor = useCallback((fId, campo, valor) => {
    setFornecedores((prev) =>
      prev.map((f) => (f.id === fId ? { ...f, [campo]: valor } : f))
    );
  }, []);

  const adicionarItem = useCallback(() => {
    setItens((prev) => [...prev, novoItem(prev.length)]);
  }, []);

  const removerItem = useCallback((iId) => {
    setItens((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((i) => i.id !== iId).map((i, idx) => ({ ...i, ordem: idx }));
    });
    setPrecos((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        if (key.startsWith(`${iId}_`)) delete next[key];
      });
      return next;
    });
  }, []);

  const atualizarItem = useCallback((iId, campo, valor) => {
    setItens((prev) =>
      prev.map((i) => (i.id === iId ? { ...i, [campo]: valor } : i))
    );
  }, []);

  const atualizarPreco = useCallback((itemId, fornecedorId, campo, valor) => {
    const key = `${itemId}_${fornecedorId}`;
    setPrecos((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || { valor: 0, desconto: 0 }),
        [campo]: Number(valor) || 0,
      },
    }));
  }, []);

  const calcularTotalFornecedor = useCallback(
    (fId) =>
      itens.reduce((sum, item) => {
        const key = `${item.id}_${fId}`;
        const p = precos[key] || { valor: 0, desconto: 0 };
        return sum + Math.max(0, p.valor - p.desconto);
      }, 0),
    [itens, precos]
  );

  const validar = () => {
    const errs = {};
    if (!titulo.trim()) errs.titulo = 'Título é obrigatório.';
    if (fornecedores.some((f) => !f.nome.trim()))
      errs.fornecedores = 'Todos os fornecedores precisam de nome.';
    if (itens.some((i) => !i.descricao.trim()))
      errs.itens = 'Todos os itens precisam de descrição.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const montar = () => ({
    titulo,
    tipo,
    observacao: observacao || null,
    unidadeId: unidadeId || null,
    fornecedores: fornecedores.map((f) => ({
      id: f.id,
      nome: f.nome,
      formaPagamento: f.formaPagamento || null,
      ordem: f.ordem,
    })),
    itens: itens.map((item) => ({
      id: item.id,
      descricao: item.descricao,
      data: item.data || null,
      ordem: item.ordem,
      isDestaque: item.isDestaque,
      precos: Object.fromEntries(
        fornecedores.map((f) => {
          const key = `${item.id}_${f.id}`;
          return [f.id, precos[key] || { valor: 0, desconto: 0 }];
        })
      ),
    })),
  });

  const salvar = useCallback(async () => {
    if (!validar()) return;
    setLoading(true);
    try {
      const payload = montar();
      if (isEditing) {
        await updateOrcamento(id, payload);
        addToast('Orçamento atualizado com sucesso.', 'success');
        navigate(`/orcamentos/${id}`);
      } else {
        const criado = await createOrcamento(payload);
        addToast('Orçamento criado com sucesso.', 'success');
        navigate(`/orcamentos/${criado.id}`);
      }
    } catch (err) {
      addToast(err?.response?.data?.message || 'Erro ao salvar orçamento.', 'error');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titulo, tipo, observacao, unidadeId, fornecedores, itens, precos, isEditing, id]);

  const cancelar = useCallback(() => navigate('/orcamentos'), [navigate]);

  return {
    isEditing,
    loadingData,
    loading,
    errors,
    titulo,
    setTitulo,
    tipo,
    setTipo,
    observacao,
    setObservacao,
    unidadeId,
    setUnidadeId,
    unidades,
    fornecedores,
    itens,
    precos,
    adicionarFornecedor,
    removerFornecedor,
    atualizarFornecedor,
    adicionarItem,
    removerItem,
    atualizarItem,
    atualizarPreco,
    calcularTotalFornecedor,
    salvar,
    cancelar,
  };
}
