import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBolt,
  faBuilding,
  faCalendarCheck,
  faCity,
  faIdCard,
  faLocationDot,
  faMapPin,
  faMicrochip,
  faPenToSquare,
  faShieldAlt,
  faWrench,
} from '@fortawesome/free-solid-svg-icons';

import {
  Button,
  InfoCard,
  PageSection,
  ResponsiveGrid,
  StatusBadge,
} from '@/components/ui';
import { formatarData } from '@/utils/timeUtils';
import { useEquipamentoCobertura } from '@/hooks/equipamentos/useEquipamentoCobertura';

// Monta string de endereco a partir dos campos atomicos da Unidade.
// Junta com separadores adequados; campos vazios sao omitidos pra evitar
// virgulas penduradas tipo "Rua X, , Bairro Y".
function montarEnderecoCompleto(unidade) {
  if (!unidade) return null;
  const linha1 = [unidade.logradouro, unidade.numero, unidade.complemento]
    .filter(Boolean)
    .join(', ');
  return linha1 || null;
}

function formatarCnpj(cnpj) {
  if (!cnpj) return null;
  const digitos = String(cnpj).replace(/\D/g, '');
  if (digitos.length !== 14) return cnpj; // ja vem formatado ou eh invalido
  return digitos.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5'
  );
}

function formatarCep(cep) {
  if (!cep) return null;
  const digitos = String(cep).replace(/\D/g, '');
  if (digitos.length !== 8) return cep;
  return digitos.replace(/^(\d{5})(\d{3})$/, '$1-$2');
}

function TabVisaoGeral({ equipamento, editHref }) {
  const { contratosRelacionados, segurosRelacionados } =
    useEquipamentoCobertura(equipamento);

  const unidade = equipamento.unidade || {};
  const enderecoCompleto = montarEnderecoCompleto(unidade);
  const cidadeEstado = [unidade.cidade, unidade.estado].filter(Boolean).join(' / ');
  const cnpjFormatado = formatarCnpj(unidade.cnpj);
  const cepFormatado = formatarCep(unidade.cep);
  const temAlgumDadoLocalizacao =
    cnpjFormatado || enderecoCompleto || unidade.bairro || cidadeEstado || cepFormatado;

  return (
    <div className="space-y-6">
      <ResponsiveGrid cols={{ base: 1, md: 2, xl: 3 }}>
        <InfoCard
          icon={faBolt}
          label="Status operacional"
          value={<StatusBadge value={equipamento.status || 'N/A'} />}
        />
        <InfoCard
          icon={faBuilding}
          label="Unidade"
          value={equipamento.unidade?.nomeSistema || 'N/A'}
        />
        <InfoCard
          icon={faShieldAlt}
          label="Cobertura ativa"
          value={`${contratosRelacionados.length} contrato(s) / ${segurosRelacionados.length} seguro(s)`}
        />
      </ResponsiveGrid>

      {temAlgumDadoLocalizacao ? (
        <PageSection
          title="Localização da unidade"
          description="Dados cadastrais da unidade onde este equipamento opera — vinculados automaticamente ao selecionar a unidade no cadastro."
        >
          <ResponsiveGrid cols={{ base: 1, md: 2, xl: 3 }}>
            <InfoCard
              icon={faBuilding}
              label="Unidade"
              value={
                [unidade.nomeSistema, unidade.nomeFantasia]
                  .filter(Boolean)
                  .join(' · ') || 'N/A'
              }
            />
            <InfoCard
              icon={faIdCard}
              label="CNPJ"
              value={cnpjFormatado || 'N/A'}
            />
            <InfoCard
              icon={faLocationDot}
              label="Endereço"
              value={enderecoCompleto || 'N/A'}
            />
            <InfoCard
              icon={faMapPin}
              label="Bairro"
              value={unidade.bairro || 'N/A'}
            />
            <InfoCard
              icon={faCity}
              label="Cidade / UF"
              value={cidadeEstado || 'N/A'}
            />
            <InfoCard
              icon={faMapPin}
              label="CEP"
              value={cepFormatado || 'N/A'}
            />
          </ResponsiveGrid>
        </PageSection>
      ) : null}

      <PageSection
        title="Resumo do ativo"
        description="Informacoes executivas e operacionais mais relevantes deste equipamento."
      >
        <div className="space-y-5">
          <ResponsiveGrid cols={{ base: 1, md: 2, xl: 3 }}>
            <InfoCard
              icon={faMicrochip}
              label="Modelo"
              value={equipamento.modelo}
            />
            <InfoCard
              icon={faMicrochip}
              label="Tipo"
              value={equipamento.tipo || 'N/A'}
            />
            <InfoCard
              icon={faMicrochip}
              label="Fabricante"
              value={equipamento.fabricante || 'N/A'}
            />
            <InfoCard
              icon={faMicrochip}
              label="Número de série"
              value={equipamento.tag || 'N/A'}
            />
            <InfoCard
              icon={faCalendarCheck}
              label="Instalacao"
              value={formatarData(equipamento.dataInstalacao)}
            />
            <InfoCard
              icon={faWrench}
              label="Patrimonio"
              value={equipamento.numeroPatrimonio || 'N/A'}
            />
            <InfoCard
              icon={faMicrochip}
              label="AE Title"
              value={equipamento.aeTitle || 'N/A'}
            />
            <InfoCard
              icon={faWrench}
              label="Suporte tecnico"
              value={equipamento.telefoneSuporte || 'N/A'}
            />
          </ResponsiveGrid>

          <div className="flex justify-start">
            <Link to={editHref}>
              <Button type="button" variant="secondary">
                <FontAwesomeIcon icon={faPenToSquare} />
                Editar cadastro
              </Button>
            </Link>
          </div>
        </div>
      </PageSection>
    </div>
  );
}

TabVisaoGeral.propTypes = {
  equipamento: PropTypes.object.isRequired,
  editHref: PropTypes.string.isRequired,
};

export default TabVisaoGeral;
