import { getPdfDataManutencao, getPdfDataRelatorio } from '@/services/api/pdfApi';
import { getSeguroById } from '@/services/api/segurosApi';
import {
  exportarOSManutencaoPDFLazy,
  exportarRelatorioPDFLazy,
} from '@/services/pdf/pdfExportService';

const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

function buildAttachmentUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}/${String(path).replace(/^\/+/, '')}`;
}

function notify(addToast, message, type = 'info') {
  if (typeof addToast === 'function' && message) {
    addToast(message, type);
  }
}

export async function handleChatAction({
  acao,
  contexto,
  meta,
  navigate,
  addToast,
}) {
  if (!acao) return;

  switch (acao) {
    case 'ABRIR_AGENDAMENTO':
      navigate('/manutencoes/agendar');
      return;

    case 'VER_MANUTENCAO':
      if (contexto?.id) {
        navigate(`/manutencoes/detalhes/${contexto.id}`);
        return;
      }
      break;

    case 'ABRIR_OS':
      if (contexto?.manutencaoId) {
        navigate(`/manutencoes/detalhes/${contexto.manutencaoId}`);
        return;
      }
      break;

    case 'GERAR_RELATORIO':
      navigate('/relatorios', {
        state: { filtros: contexto },
      });
      return;

    case 'GERAR_PDF_RELATORIO':
      if (Array.isArray(contexto?.ids) && contexto.ids.length > 0) {
        try {
          const resultado = await getPdfDataRelatorio(contexto.ids);
          await exportarRelatorioPDFLazy(resultado, 'relatorio_chat_agente');
          notify(addToast, 'PDF do relatório gerado com sucesso.', 'success');
          return;
        } catch (error) {
          console.error('[CHAT_ACTION_RELATORIO_PDF_ERROR]', error);
          notify(addToast, 'Nao foi possivel gerar o PDF do relatorio.', 'error');
          return;
        }
      }
      break;

    case 'GERAR_PDF_OS':
      if (contexto?.manutencaoId) {
        try {
          const manutencao = await getPdfDataManutencao(contexto.manutencaoId);
          await exportarOSManutencaoPDFLazy(manutencao);
          notify(addToast, 'PDF da OS gerado com sucesso.', 'success');
          return;
        } catch (error) {
          console.error('[CHAT_ACTION_OS_PDF_ERROR]', error);
          notify(addToast, 'Nao foi possivel gerar o PDF da OS.', 'error');
          return;
        }
      }
      break;

    case 'VER_SEGURO':
      if (contexto?.id) {
        navigate(`/seguros/detalhes/${contexto.id}`);
        return;
      }
      break;

    case 'ABRIR_PDF_SEGURO':
      if (contexto?.seguroId) {
        try {
          const seguro = await getSeguroById(contexto.seguroId);
          const anexo = Array.isArray(seguro?.anexos)
            ? seguro.anexos.find((item) => item.id === contexto.anexoId) ||
              seguro.anexos[0]
            : null;

          const url = buildAttachmentUrl(anexo?.path);

          if (url) {
            window.open(url, '_blank', 'noopener,noreferrer');
            notify(addToast, 'Documento do seguro aberto com sucesso.', 'success');
            return;
          }

          navigate(`/seguros/detalhes/${contexto.seguroId}`);
          notify(
            addToast,
            'Documento nao encontrado. Abrindo os detalhes do seguro.',
            'warning'
          );
          return;
        } catch (error) {
          console.error('[CHAT_ACTION_SEGURO_PDF_ERROR]', error);
          navigate(`/seguros/detalhes/${contexto.seguroId}`);
          notify(
            addToast,
            'Nao foi possivel abrir o documento diretamente. Abrindo os detalhes do seguro.',
            'warning'
          );
          return;
        }
      }
      break;

    case 'GERAR_PDF':
      if (contexto?.url) {
        window.open(contexto.url, '_blank', 'noopener,noreferrer');
        return;
      }
      break;

    case 'NOTIFICAR':
      if (meta?.mensagem) {
        notify(addToast, meta.mensagem, meta.tipo || 'info');
        return;
      }
      break;

    default:
      console.warn('[CHAT_ACTION] Acao nao tratada:', acao, contexto);
      notify(addToast, 'Acao do agente ainda nao suportada pela interface.', 'warning');
      return;
  }

  notify(addToast, 'O agente retornou uma acao sem contexto suficiente.', 'warning');
}
