import { z } from 'zod';

export const OrigemSchema = z.enum(['real', 'demonstracao']);
export const VisibilidadeSchema = z.enum(['interno', 'restrito']).default('restrito');
export const PerfilInternoSchema = z.enum(['consulta', 'tecnico', 'validador', 'administrador']);
export const PerfilExternoSchema = z.enum(['contato', 'gestor_empresa']);
export const MoedaSchema = z.enum(['BRL', 'USD', 'EUR']);

export const EstadoPropostaSchema = z.enum(['rascunho', 'em_validacao', 'aprovada', 'publicada', 'aceita', 'recusada', 'expirada', 'substituida']);
export const EstadoServicoSchema = z.enum(['planejado', 'em_execucao', 'concluido', 'cancelado']);
export const EstadoLicaoSchema = z.enum(['rascunho', 'em_validacao', 'formalizada', 'superada']);
export const EstadoConteudoSchema = z.enum(['rascunho', 'publicado', 'arquivado']);

export const UsoMaquinaSchema = z.object({
  maquinaId: z.string().min(1),
  horas: z.string().regex(/^\d+(\.\d+)?$/),
  custoHora: z.string().regex(/^\d+(\.\d+)?$/),
});

export const ItemOrcamentoSchema = z.object({
  servicoId: z.string().min(1),
  descricao: z.string().min(3).max(500),
  quantidade: z.string().regex(/^\d+(\.\d+)?$/),
  usos: z.array(UsoMaquinaSchema).min(1),
  custosExtras: z.string().regex(/^\d+(\.\d+)?$/).default('0'),
  percentualLucro: z.string().regex(/^-?\d+(\.\d+)?$/),
});

export const PropostaSchema = z.object({
  id: z.string().uuid(),
  origem: OrigemSchema,
  visibilidade: VisibilidadeSchema,
  estado: EstadoPropostaSchema,
  moeda: MoedaSchema,
  cotacaoBrl: z.string().regex(/^\d+(\.\d+)?$/),
  ajusteComercial: z.string().regex(/^-?\d+(\.\d+)?$/).default('0'),
  justificativaAjuste: z.string().max(1000).optional(),
  itens: z.array(ItemOrcamentoSchema).min(1),
}).superRefine((valor, contexto) => {
  if (valor.ajusteComercial !== '0' && !valor.justificativaAjuste?.trim()) {
    contexto.addIssue({ code: 'custom', path: ['justificativaAjuste'], message: 'Ajustes comerciais exigem justificativa.' });
  }
  if (valor.moeda === 'BRL' && valor.cotacaoBrl !== '1') {
    contexto.addIssue({ code: 'custom', path: ['cotacaoBrl'], message: 'A cotação de BRL deve ser 1.' });
  }
});

export const SolicitacaoSchema = z.object({
  origem: OrigemSchema,
  empresaId: z.string().uuid(),
  servicoId: z.string().uuid(),
  respostas: z.record(z.string(), z.string().max(5000)),
  anexos: z.array(z.object({ nome: z.string(), tipo: z.string(), tamanho: z.number().int().positive() })).max(5),
});

export type Origem = z.infer<typeof OrigemSchema>;
export type PerfilInterno = z.infer<typeof PerfilInternoSchema>;
export type EstadoProposta = z.infer<typeof EstadoPropostaSchema>;
export type ItemOrcamentoEntrada = z.infer<typeof ItemOrcamentoSchema>;
