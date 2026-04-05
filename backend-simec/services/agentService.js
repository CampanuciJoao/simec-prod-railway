import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from './prismaService.js';
import { getAgora } from './timeService.js';

export const processarComandoAgente = async (perguntaUsuario, usuarioNome = "Admin") => {
    const API_KEY = process.env.GEMINI_API_KEY?.trim();
    if (!API_KEY) throw new Error("Chave não configurada no .env.");

    // Modelos estáveis e suportados pela API v1beta
    const modelosBackup = ["gemini-1.5-flash", "gemini-1.5-flash-8b", "gemini-1.5-pro"];
    let erroUltimaTentativa = null;

    for (const nomeModelo of modelosBackup) {
        try {
            const genAI = new GoogleGenerativeAI(API_KEY);
            const agora = getAgora();

            // 1. DANDO "SUPER OLHOS" PARA A IA
            const equipamentosAtivos = await prisma.equipamento.findMany({
                select: { 
                    id: true, tag: true, modelo: true, fabricante: true, 
                    numeroPatrimonio: true, tipo: true, setor: true,
                    unidade: { select: { nomeFantasia: true, nomeSistema: true } }
                },
                take: 200
            });

            // Lógica de Desambiguação
            const termoBusca = perguntaUsuario.toLowerCase();
            const candidatos = equipamentosAtivos.filter(e => 
                e.modelo.toLowerCase().includes(termoBusca) || 
                e.tag.toLowerCase().includes(termoBusca) ||
                e.unidade.nomeSistema.toLowerCase().includes(termoBusca)
            );

            if (candidatos.length > 1) {
                return `Encontrei ${candidatos.length} equipamentos: ${candidatos.map(e => `${e.modelo} (Tag: ${e.tag})`).join(', ')}. Por favor, seja mais específico citando a Tag ou Patrimônio.`;
            }

            const listaEquipamentosStr = JSON.stringify(equipamentosAtivos);

            // 2. A INSTRUÇÃO MESTRA (Adicionado reforço para não adicionar texto extra)
            const systemInstruction = `
                Você é o Guardião SIMEC, assistente de Engenharia Clínica.
                DATA ATUAL DO SERVIDOR: ${agora.toISOString()}
                Lista de equipamentos: ${listaEquipamentosStr}

                REGRAS:
                1. AGENDAMENTO: Responda APENAS JSON: {"acao_sistema": "CRIAR_MANUTENCAO", "equipamentoId": "ID", "tipo": "Preventiva/Corretiva", "descricao": "...", "dataInicio": "ISO_DATE", "confirmado": false}
                2. RELATÓRIOS: Responda APENAS JSON: {"acao_sistema": "GERAR_RELATORIO", "tipo": "manutencoesRealizadas", "filtros": {"tipo": "...", "periodo": "1_ano"}}
                3. ANÁLISE DE SAÚDE: Responda APENAS JSON: {"acao_sistema": "ANALISAR_SAUDE", "equipamentoId": "ID"}
                
                IMPORTANTE: Não escreva explicações, nem saudações, nem texto fora do bloco JSON. Apenas o JSON puro.
            `;

            const model = genAI.getGenerativeModel({ model: nomeModelo, systemInstruction });

            const historicoBanco = await prisma.chatHistorico.findMany({
                where: { usuario: usuarioNome },
                orderBy: { createdAt: 'asc' },
                take: 10
            });

            const history = historicoBanco.map(msg => ({ role: msg.role, parts: [{ text: msg.mensagem }] }));
            const chat = model.startChat({ history });

            const result = await chat.sendMessage(perguntaUsuario);
            let textoDaIA = result.response.text();
            let respostaFinalTexto = textoDaIA;

            // 5. INTERCEPTANDO AÇÕES
            if (textoDaIA.includes('"acao_sistema":')) {
                let jsonLimpo = textoDaIA.replace(/```json/g, '').replace(/```/g, '').trim();
                const comando = JSON.parse(jsonLimpo);

                if (comando.acao_sistema === "CRIAR_MANUTENCAO") {
                    if (comando.confirmado === true) {
                        const numeroOSGerado = `OS-${Date.now()}`;
                        await prisma.manutencao.create({
                            data: {
                                numeroOS: numeroOSGerado,
                                tipo: comando.tipo,
                                status: "Agendada",
                                descricaoProblemaServico: comando.descricao,
                                dataHoraAgendamentoInicio: new Date(comando.dataInicio),
                                equipamentoId: comando.equipamentoId
                            }
                        });
                        respostaFinalTexto = `✅ Agendamento concluído! OS gerada: ${numeroOSGerado}.`;
                    } else {
                        respostaFinalTexto = `Entendido. Você deseja agendar uma ${comando.tipo} para ${comando.descricao}. Posso confirmar este agendamento? (Responda: "Sim, confirme")`;
                    }
                } 
                else if (comando.acao_sistema === "GERAR_RELATORIO") {
                    const umAnoAtras = new Date(agora);
                    umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1);
                    const contagem = await prisma.manutencao.count({
                        where: { tipo: comando.filtros.tipo, dataConclusao: { gte: umAnoAtras, lte: agora } }
                    });
                    respostaFinalTexto = `📊 Relatório: Encontrei ${contagem} manutenções do tipo ${comando.filtros.tipo} no último ano.`;
                }
                else if (comando.acao_sistema === "ANALISAR_SAUDE") {
                    const ocorrencias = await prisma.ocorrencia.findMany({
                        where: { equipamentoId: comando.equipamentoId, data: { gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1)) } }
                    });
                    const promptSaude = `Analise este histórico de falhas e explique a saúde do ativo: ${JSON.stringify(ocorrencias)}. Responda de forma técnica e oriente o técnico.`;
                    const analise = await chat.sendMessage(promptSaude);
                    respostaFinalTexto = analise.response.text();
                }
            }

            // 6. SALVANDO MEMÓRIA
            await prisma.chatHistorico.createMany({
                data: [
                    { usuario: usuarioNome, role: "user", mensagem: perguntaUsuario },
                    { usuario: usuarioNome, role: "model", mensagem: respostaFinalTexto }
                ]
            });

            return respostaFinalTexto;

        } catch (error) {
            console.error(`Falha no modelo ${nomeModelo}:`, error.message);
            erroUltimaTentativa = error.message;
        }
    }

    throw new Error(`Falha ao processar com IA. Último erro: ${erroUltimaTentativa}`);
};