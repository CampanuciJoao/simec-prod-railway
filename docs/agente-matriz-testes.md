# Matriz de testes do agente

## Agendamento

| Entrada do usuario | Resultado esperado |
| --- | --- |
| `quero agendar uma preventiva` | entrar no fluxo e pedir unidade |
| `preventiva na tomografia de Coxim amanha das 10h as 11h` | identificar tipo, equipamento, unidade, data e horario |
| `preventiva na tomografia da Matriz dia 21/04/26 as 11:00h` | aceitar data com ano curto e horario com sufixo `h` |
| `agendar preventiva hoje 10h` | aceitar data relativa e horario compacto |
| `sim` apos resumo do agendamento | confirmar e criar a OS |
| `nao` apos resumo do agendamento | cancelar o fluxo sem erro tecnico |
| `TAG 1234` apos lista de ambiguidades | resolver o equipamento escolhido |
| `tomografia` quando houver varios equipamentos | responder com lista de ambiguidades sem travar |
| `novo agendamento` | reiniciar conscientemente ou iniciar novo fluxo sem resposta vaga |

## Relatorio

| Entrada do usuario | Resultado esperado |
| --- | --- |
| `quando foi a ultima preventiva em Coxim?` | responder com uma OS ou informar que nao encontrou |
| `quais preventivas no ultimo ano em Coxim?` | responder com total e sugerir PDF |
| `sim` apos sugestao de PDF | disparar acao contextual coerente |
| `abrir documento` apos retorno de OS | nao cair em handler indefinido |
| `cancelar` apos sugestao de PDF | cancelar a acao contextual sem perder a conversa |

## Seguro

| Entrada do usuario | Resultado esperado |
| --- | --- |
| `me traga o seguro da unidade sede` | localizar a apolice mais recente ou vigente |
| `qual o vencimento da apolice de Coxim?` | responder vencimento sem cair em fluxo vazio |
| `me mostre a cobertura do seguro` | responder cobertura do ultimo seguro consultado |
| `abrir pdf` apos resposta com anexo | acao contextual do documento |
| `abrir pdf` sem anexo | responder claramente que nao ha documento anexado |

## Casos de robustez

| Entrada do usuario | Resultado esperado |
| --- | --- |
| `oi` | saudacao clara, sem forcar dominio |
| `quero ajuda` | resposta orientando capacidades do agente |
| `asdfgh` | fallback amigavel, sem erro tecnico |
| `sim` sem contexto ativo | nao executar acao antiga indevidamente |
| `cancelar isso` | resetar a sessao ativa com mensagem clara |

## Riscos ainda abertos

- As acoes retornadas pelo backend ainda precisam de alinhamento completo com o handler do frontend.
- Sessao contextual de relatorio/seguro continua ativa por design por alguns minutos; isso ajuda follow-up, mas ainda merece refinamento para evitar `sim` fora de contexto.
- Ainda nao existe suite automatizada rodando esses cenarios em teste de integracao.
