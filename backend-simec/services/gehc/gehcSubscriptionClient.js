// Cliente WebSocket para o canal de notificacoes CDX do GE Healthcare.
//
// Mapeado ao vivo em 2026-05-16: o portal real abre uma conexao
// graphql-transport-ws com o gateway CDX e se inscreve em
// documentDownloadSubscription. Quando o backend GE termina de gerar a URL
// S3 pre-assinada pro PDF, ele empurra via WS um frame { type: "next" } com
// { email, preSignedUrl }.
//
// Sem o WS, a mutation downloadDocument retorna apenas {status: 202} sem URL
// — nunca conseguiriamos baixar PDFs source '101' (Salesforce), porque o
// portal NUNCA bate direto no my.salesforce.com. O backend GE faz o handoff
// (tem credenciais de Connected App) e entrega o S3 via WS.
//
// Tempo medio do downloadDocument ate o push WS: ~5.8s (captura ao vivo).
//
// Auth: graphql-transport-ws envia connection_init com payload customizado
// (NAO Authorization Bearer). Campos lowercase sem hifen:
//   - accesstoken (JWT GE IDP)
//   - idtoken     (JWT GE IDP, OIDC ID Token)
//   - x-request-id (UUID v4 fresh)
//   - source       ('desktop' — confirmado nos headers HTTP do gateway)
//
// Multiplex: como o filtro server-side e' por accesstoken (=usuario), uma
// conexao recebe TODOS os preSignedUrls do usuario em ordem. Usamos uma
// FIFO queue de resolvers — cada chamada de esperarProximaUrl() reserva o
// proximo frame que chegar.

import { createClient } from 'graphql-ws';
import WebSocket from 'ws';
import crypto from 'crypto';

const WS_URL = 'wss://cx-us-prd-services.cloud.gehealthcare.com/la-prd-shared-services-cdx-notification-subscriptions/graphql';

const SUBSCRIPTION_QUERY = `subscription documentDownloadSubscription {
  documentDownloadSubscription {
    email
    preSignedUrl
    __typename
  }
}`;

const TIMEOUT_DEFAULT_MS = 30_000;

function uuidV4() {
  return crypto.randomUUID();
}

export class GehcSubscriptionClient {
  constructor({ accessToken, idToken }) {
    if (!accessToken || !idToken) {
      throw new Error('GehcSubscriptionClient: accessToken + idToken obrigatorios');
    }
    this.accessToken = accessToken;
    this.idToken = idToken;
    this.queue = [];           // FIFO de { resolve, reject, timer }
    this.connected = false;
    this.disposed = false;
    this.errosWs = [];          // logs de erros WS recentes (debug)

    this.wsClient = createClient({
      url: WS_URL,
      webSocketImpl: WebSocket,
      connectionParams: () => ({
        accesstoken:    accessToken,
        idtoken:        idToken,
        'x-request-id': uuidV4(),
        source:         'desktop',
      }),
      keepAlive: 5_000,
      retryAttempts: 5,
      shouldRetry: () => true,
      on: {
        connected:   () => { this.connected = true;  console.log('[GEHC_WS] conectado.'); },
        closed:      () => { this.connected = false; console.log('[GEHC_WS] fechado.'); },
        error:       (err) => {
          this.errosWs.push({ em: Date.now(), msg: err?.message || String(err) });
          console.error('[GEHC_WS] erro:', err?.message || err);
        },
      },
    });

    this.unsubscribe = this.wsClient.subscribe(
      { query: SUBSCRIPTION_QUERY },
      {
        next: ({ data }) => {
          const url = data?.documentDownloadSubscription?.preSignedUrl;
          if (!url) return;
          const pending = this.queue.shift();
          if (pending) {
            clearTimeout(pending.timer);
            pending.resolve(url);
          } else {
            console.warn('[GEHC_WS] preSignedUrl recebida sem resolver pendente (descartada).');
          }
        },
        error: (err) => {
          console.error('[GEHC_WS] subscription error:', err?.message || err);
          // Falha geral: rejeita todos os pendentes para nao ficarem orfaos.
          while (this.queue.length) {
            const p = this.queue.shift();
            clearTimeout(p.timer);
            p.reject(new Error('WS_SUBSCRIPTION_ERROR'));
          }
        },
        complete: () => console.log('[GEHC_WS] subscription complete.'),
      }
    );
  }

  /**
   * Reserva o proximo preSignedUrl que chegar via WS.
   * IMPORTANTE: chamar ANTES da mutation downloadDocument (corrida).
   *
   * @param {number} timeoutMs - timeout absoluto antes de dar WS_TIMEOUT
   * @returns {Promise<string>} URL S3 pre-assinada
   */
  esperarProximaUrl(timeoutMs = TIMEOUT_DEFAULT_MS) {
    if (this.disposed) return Promise.reject(new Error('WS_CLIENT_DISPOSED'));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = this.queue.findIndex((p) => p.timer === timer);
        if (idx >= 0) this.queue.splice(idx, 1);
        reject(new Error('WS_TIMEOUT'));
      }, timeoutMs);
      this.queue.push({ resolve, reject, timer });
    });
  }

  async dispose() {
    if (this.disposed) return;
    this.disposed = true;
    // Rejeita pendentes
    while (this.queue.length) {
      const p = this.queue.shift();
      clearTimeout(p.timer);
      p.reject(new Error('WS_CLIENT_DISPOSED'));
    }
    try { this.unsubscribe?.(); } catch {}
    try { await this.wsClient.dispose(); } catch {}
  }
}
