import { Route, Navigate, useParams } from 'react-router-dom';

import {
  AlertasPage,
  AuditoriaDetalhadaPage,
  ContratosPage,
  DetalhesContratoPage,
  DetalhesEquipamentoPage,
  DetalhesManutencaoPage,
  EquipamentosPage,
  ManutencoesPage,
  RelatoriosPage,
  SalvarContratoPage,
  SalvarEquipamentoPage,
  SalvarManutencaoPage,
  SalvarSeguroPage,
  RenovarSeguroPage,
  SegurosPage,
  OrcamentosPage,
  SalvarOrcamentoPage,
  DetalhesOrcamentoPage,
  AbrirOsCorretivaPage,
  DetalhesOsCorretivaPage,
} from '@/routes/lazyPages';

function RedirectOsCorretiva() {
  const { id } = useParams();
  return <Navigate to={`/manutencoes/ocorrencia/${id}`} replace />;
}

function OperacionalRouteElements() {
  return (
    <>
      <Route path="equipamentos" element={<EquipamentosPage />} />
      <Route path="equipamentos/adicionar" element={<SalvarEquipamentoPage />} />
      <Route path="equipamentos/editar/:equipamentoId" element={<SalvarEquipamentoPage />} />
      <Route path="equipamentos/detalhes/:equipamentoId" element={<DetalhesEquipamentoPage />} />

      <Route path="manutencoes" element={<ManutencoesPage />} />
      <Route path="manutencoes/detalhes/:manutencaoId" element={<DetalhesManutencaoPage />} />
      <Route path="manutencoes/agendar" element={<SalvarManutencaoPage />} />
      <Route path="manutencoes/editar/:manutencaoId" element={<SalvarManutencaoPage />} />
      <Route path="manutencoes/ocorrencia/abrir" element={<AbrirOsCorretivaPage />} />
      <Route path="manutencoes/ocorrencia/:id" element={<DetalhesOsCorretivaPage />} />

      <Route path="contratos" element={<ContratosPage />} />
      <Route path="contratos/adicionar" element={<SalvarContratoPage />} />
      <Route path="contratos/editar/:id" element={<SalvarContratoPage />} />
      <Route path="contratos/detalhes/:id" element={<DetalhesContratoPage />} />

      <Route path="seguros" element={<SegurosPage />} />
      <Route path="seguros/adicionar" element={<SalvarSeguroPage />} />
      <Route path="seguros/editar/:id" element={<SalvarSeguroPage />} />
      <Route path="seguros/renovar/:id" element={<RenovarSeguroPage />} />

      <Route path="relatorios" element={<RelatoriosPage />} />
      <Route path="alertas" element={<AlertasPage />} />
      <Route path="auditoria/manutencao/:id" element={<AuditoriaDetalhadaPage />} />

      <Route path="orcamentos" element={<OrcamentosPage />} />
      <Route path="orcamentos/novo" element={<SalvarOrcamentoPage />} />
      <Route path="orcamentos/:id/editar" element={<SalvarOrcamentoPage />} />
      <Route path="orcamentos/:id" element={<DetalhesOrcamentoPage />} />

      {/* Compatibilidade com links antigos */}
      <Route path="os-corretiva" element={<Navigate to="/manutencoes" replace />} />
      <Route path="os-corretiva/abrir" element={<Navigate to="/manutencoes/ocorrencia/abrir" replace />} />
      <Route path="os-corretiva/:id" element={<RedirectOsCorretiva />} />
    </>
  );
}

export default OperacionalRouteElements;
