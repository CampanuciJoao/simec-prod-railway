-- Adiciona campo 'prazo' (texto livre) em OrcamentoFornecedor.
-- Mesma estrutura semantica de formaPagamento: cada prestador tem
-- seu proprio prazo, comparavel lado-a-lado no orcamento.
-- Exemplos de valores: "Em ate 15 dias uteis", "Imediato",
-- "30 dias apos aprovacao", "Entrega em 7 dias / instalacao em 14".
ALTER TABLE "orcamento_fornecedores" ADD COLUMN "prazo" TEXT;
