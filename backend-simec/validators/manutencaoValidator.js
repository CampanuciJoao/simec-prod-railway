// Ficheiro: backend-simec/validators/manutencaoValidator.js
import { z } from 'zod';

export const manutencaoSchema = z.object({
  // O ID do equipamento é obrigatório para saber o que será consertado
  equipamentoId: z.string().min(1, "O equipamento é obrigatório."),

  // O tipo deve ser um dos quatro permitidos no seu banco de dados
  tipo: z.enum(['Preventiva', 'Corretiva', 'Calibracao', 'Inspecao'], {
    error_map: () => ({ message: "Tipo de manutenção inválido." })
  }),

  // Descrição do serviço
  descricaoProblemaServico: z.string().min(3, "A descrição deve ter pelo menos 3 caracteres."),

  // Datas de agendamento (recebidas como texto ISO e validadas)
  dataHoraAgendamentoInicio: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Data de início inválida."
  }),

  // Data de fim é opcional no agendamento, mas se vier, deve ser válida
  dataHoraAgendamentoFim: z.string().nullable().optional().refine((val) => {
    if (!val) return true;
    return !isNaN(Date.parse(val));
  }, { message: "Data de previsão de término inválida." }),

  // Campos opcionais
  tecnicoResponsavel: z.string().nullable().optional(),
  numeroChamado: z.string().nullable().optional(),
  custoTotal: z.number().nonnegative().optional().nullable(),
});