import { Route } from 'react-router-dom';

import {
  AlertasPage,
  AuditoriaDetalhadaPage,
  ContratosPage,
  DetalhesContratoPage,
  DetalhesEquipamentoPage,
  DetalhesManutencaoPage,
  DetalhesSeguroPage,
  EquipamentosPage,
  FichaTecnicaPage,
  ManutencoesPage,
  RelatoriosPage,
  SalvarContratoPage,
  SalvarEquipamentoPage,
  SalvarManutencaoPage,
  SalvarSeguroPage,
  SegurosPage,
} from '@/routes/lazyPages';

function OperacionalRouteElements() {
  return (
    <>
      <Route path="equipamentos" element={<EquipamentosPage />} />
      <Route path="equipamentos/adicionar" element={<SalvarEquipamentoPage />} />
      <Route
        path="equipamentos/editar/:equipamentoId"
        element={<SalvarEquipamentoPage />}
      />
      <Route
        path="equipamentos/detalhes/:equipamentoId"
        element={<DetalhesEquipamentoPage />}
      />
      <Route
        path="equipamentos/ficha-tecnica/:id"
        element={<FichaTecnicaPage />}
      />

      <Route path="manutencoes" element={<ManutencoesPage />} />
      <Route
        path="manutencoes/detalhes/:manutencaoId"
        element={<DetalhesManutencaoPage />}
      />
      <Route path="manutencoes/agendar" element={<SalvarManutencaoPage />} />
      <Route
        path="manutencoes/editar/:manutencaoId"
        element={<SalvarManutencaoPage />}
      />

      <Route path="contratos" element={<ContratosPage />} />
      <Route path="contratos/adicionar" element={<SalvarContratoPage />} />
      <Route path="contratos/editar/:id" element={<SalvarContratoPage />} />
      <Route path="contratos/detalhes/:id" element={<DetalhesContratoPage />} />

      <Route path="seguros" element={<SegurosPage />} />
      <Route path="seguros/adicionar" element={<SalvarSeguroPage />} />
      <Route path="seguros/editar/:id" element={<SalvarSeguroPage />} />
      <Route path="seguros/detalhes/:id" element={<DetalhesSeguroPage />} />

      <Route path="relatorios" element={<RelatoriosPage />} />
      <Route path="alertas" element={<AlertasPage />} />
      <Route
        path="auditoria/manutencao/:id"
        element={<AuditoriaDetalhadaPage />}
      />
    </>
  );
}

export default OperacionalRouteElements;
