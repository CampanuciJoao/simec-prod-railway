import React, { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowsRotate,
  faPlug,
  faSatelliteDish,
  faVialCircleCheck,
} from '@fortawesome/free-solid-svg-icons';

import {
  Button,
  Card,
  Checkbox,
  FormSection,
  InfoCard,
  Input,
  PageHeader,
  PageLayout,
  PageSection,
  PageState,
  ResponsiveGrid,
} from '@/components/ui';
import { useToast } from '@/contexts/ToastContext';
import {
  createPacsConnection,
  getPacsConnections,
  getPacsHealth,
  getPacsRuns,
  syncPacsTenant,
  testPacsConnection,
  updatePacsConnection,
} from '@/services/api';
import { usePacsConnectionTest } from '@/hooks/pacs/usePacsConnectionTest';

const INITIAL_FORM = {
  id: null,
  nome: '',
  baseUrl: '',
  ativo: true,
  apiKey: '',
  username: '',
  password: '',
};

function PacsPage() {
  const { addToast } = useToast();
  const { eventsByConnection } = usePacsConnectionTest();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [connections, setConnections] = useState([]);
  const [health, setHealth] = useState(null);
  const [runs, setRuns] = useState([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [connectionsData, healthData, runsData] = await Promise.all([
        getPacsConnections(),
        getPacsHealth(),
        getPacsRuns(),
      ]);

      setConnections(Array.isArray(connectionsData) ? connectionsData : []);
      setHealth(healthData || null);
      setRuns(Array.isArray(runsData) ? runsData : []);
    } catch (error) {
      addToast(
        error?.response?.data?.message || 'Erro ao carregar modulo PACS.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleChange = (field, value) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const resetForm = () => {
    setFormData(INITIAL_FORM);
  };

  const handleEdit = (connection) => {
    setFormData({
      id: connection.id,
      nome: connection.nome || '',
      baseUrl: connection.baseUrl || '',
      ativo: Boolean(connection.ativo),
      apiKey: '',
      username: '',
      password: '',
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);

      const payload = {
        nome: formData.nome,
        baseUrl: formData.baseUrl,
        ativo: formData.ativo,
        credenciais: {
          apiKey: formData.apiKey || null,
          username: formData.username || null,
          password: formData.password || null,
        },
      };

      if (formData.id) {
        await updatePacsConnection(formData.id, payload);
        addToast('Conexao PACS atualizada com sucesso.', 'success');
      } else {
        await createPacsConnection(payload);
        addToast('Conexao PACS criada com sucesso.', 'success');
      }

      resetForm();
      await loadData();
    } catch (error) {
      addToast(
        error?.response?.data?.message || 'Erro ao salvar conexao PACS.',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (connectionId) => {
    try {
      await testPacsConnection(connectionId);
      addToast('Teste de conexao enfileirado.', 'info');
    } catch (error) {
      addToast(
        error?.response?.data?.message || 'Erro ao testar conexao.',
        'error'
      );
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      await syncPacsTenant();
      addToast('Coleta PACS enfileirada.', 'success');
      await loadData();
    } catch (error) {
      addToast(
        error?.response?.data?.message || 'Erro ao solicitar sync PACS.',
        'error'
      );
    } finally {
      setSyncing(false);
    }
  };

  const connectionCards = useMemo(
    () =>
      connections.map((connection) => {
        const liveEvent = eventsByConnection[connection.id];

        return (
          <Card key={connection.id} className="rounded-3xl">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold">{connection.nome}</h3>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {connection.baseUrl}
                  </p>
                </div>

                <Button variant="secondary" size="sm" onClick={() => handleEdit(connection)}>
                  Editar
                </Button>
              </div>

              <ResponsiveGrid cols={{ base: 1, md: 2 }}>
                <InfoCard label="Status" value={connection.status || 'pendente'} />
                <InfoCard
                  label="Credenciais"
                  value={
                    connection.credenciais?.apiKeyConfigured
                      ? 'API Key'
                      : connection.credenciais?.usernameConfigured
                        ? 'Usuario/senha'
                        : 'Nao configuradas'
                  }
                />
              </ResponsiveGrid>

              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => handleTest(connection.id)}>
                  <FontAwesomeIcon icon={faVialCircleCheck} />
                  Testar conexao
                </Button>
                <Button variant="ghost" onClick={handleSync}>
                  <FontAwesomeIcon icon={faArrowsRotate} />
                  Sincronizar
                </Button>
              </div>

              {liveEvent ? (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {liveEvent.status}: {liveEvent.message}
                </p>
              ) : null}
            </div>
          </Card>
        );
      }),
    [connections, eventsByConnection]
  );

  if (loading) {
    return <PageState loading />;
  }

  return (
    <PageLayout padded fullHeight>
      <div className="space-y-6">
        <PageHeader
          title="Cadastro PACS"
          subtitle="Gerencie conexoes PACS read-only do tenant e acompanhe os ciclos de ingestao."
          icon={faSatelliteDish}
          actions={
            <Button onClick={handleSync} disabled={syncing}>
              <FontAwesomeIcon icon={faArrowsRotate} />
              {syncing ? 'Enfileirando...' : 'Sincronizar agora'}
            </Button>
          }
        />

        <ResponsiveGrid cols={{ base: 1, md: 2, xl: 4 }}>
          <InfoCard icon={faPlug} label="Conexoes" value={health?.totalConnections || connections.length} />
          <InfoCard icon={faPlug} label="Ativas" value={health?.activeConnections || 0} />
          <InfoCard icon={faArrowsRotate} label="Runs recentes" value={runs.length} />
          <InfoCard icon={faVialCircleCheck} label="Ultimo status" value={connections[0]?.status || 'pendente'} />
        </ResponsiveGrid>

        <ResponsiveGrid cols={{ base: 1, xl: 2 }}>
          <PageSection
            title={formData.id ? 'Editar conexao' : 'Nova conexao'}
            description="Configure base URL e credenciais sem trafegar dados clinicos pela UI."
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              <FormSection title="Dados da conexao">
                <ResponsiveGrid preset="form">
                  <Input
                    label="Nome"
                    value={formData.nome}
                    onChange={(event) => handleChange('nome', event.target.value)}
                    required
                  />
                  <Input
                    label="Base URL"
                    value={formData.baseUrl}
                    onChange={(event) => handleChange('baseUrl', event.target.value)}
                    placeholder="https://pacs.exemplo.com/dicom-web"
                    required
                  />
                </ResponsiveGrid>
              </FormSection>

              <FormSection title="Credenciais">
                <ResponsiveGrid preset="form">
                  <Input
                    label="API Key"
                    value={formData.apiKey}
                    onChange={(event) => handleChange('apiKey', event.target.value)}
                  />
                  <Input
                    label="Usuario"
                    value={formData.username}
                    onChange={(event) => handleChange('username', event.target.value)}
                  />
                  <Input
                    label="Senha"
                    type="password"
                    value={formData.password}
                    onChange={(event) => handleChange('password', event.target.value)}
                  />
                </ResponsiveGrid>
              </FormSection>

              <Checkbox
                label="Conexao ativa"
                checked={formData.ativo}
                onChange={(event) => handleChange('ativo', event.target.checked)}
              />

              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Salvando...' : formData.id ? 'Salvar alteracoes' : 'Criar conexao'}
                </Button>
                <Button type="button" variant="secondary" onClick={resetForm}>
                  Limpar
                </Button>
              </div>
            </form>
          </PageSection>

          <PageSection
            title="Conexoes cadastradas"
            description="Valide a conectividade em background e acompanhe o retorno em tempo real."
          >
            <div className="space-y-4">{connectionCards}</div>
          </PageSection>
        </ResponsiveGrid>

        <PageSection
          title="Ultimos runs"
          description="Historico tecnico dos ciclos de ingestao dos ultimos 30 dias."
        >
          <div className="space-y-3">
            {runs.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Nenhum run PACS registrado ainda.
              </p>
            ) : (
              runs.slice(0, 10).map((run) => (
                <Card key={run.id} surface="soft" className="rounded-2xl">
                  <ResponsiveGrid cols={{ base: 1, md: 2, xl: 4 }}>
                    <InfoCard label="Conexao" value={run.connection?.nome || run.connectionId} />
                    <InfoCard label="Status" value={run.status} />
                    <InfoCard label="Estudos lidos" value={run.estudosLidos} />
                    <InfoCard label="Estudos agregados" value={run.estudosAgregados} />
                  </ResponsiveGrid>
                </Card>
              ))
            )}
          </div>
        </PageSection>
      </div>
    </PageLayout>
  );
}

export default PacsPage;
