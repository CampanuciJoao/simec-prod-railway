import { InterpretationAgent } from '../agents/InterpretationAgent.js';
import { PlanningAgent } from '../agents/PlanningAgent.js';
import { ValidationAgent } from '../agents/ValidationAgent.js';
import { ExecutionAgent } from '../agents/ExecutionAgent.js';
import { AuditAgent } from '../agents/AuditAgent.js';

const AGENTES = [
  InterpretationAgent,
  PlanningAgent,
  ValidationAgent,
  ExecutionAgent,
  AuditAgent,
];

export const AgentRegistry = {
  listar() {
    return AGENTES.map((a) => ({ nome: a.nome, capacidades: a.capacidades }));
  },

  obter(nome) {
    return AGENTES.find((a) => a.nome === nome) || null;
  },
};
