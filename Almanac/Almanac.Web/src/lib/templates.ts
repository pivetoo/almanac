import { DocumentType } from '../types/almanac'
import type { DocumentTypeValue } from '../types/almanac'

export const documentTemplates: Record<DocumentTypeValue, string> = {
  [DocumentType.Overview]: `# Nome do módulo

Uma ou duas frases dizendo o que é e para que serve.

## Quando usar

- situação em que este módulo é a resposta certa;
- situação em que NÃO é.

## Como funciona

Descreva o fluxo principal em poucos passos, na ordem em que acontece.

## Pontos de atenção

- armadilhas conhecidas;
- o que quebra quando algo muda.

## Veja também

Módulos e documentos relacionados.
`,
  [DocumentType.Api]: `# Nome do contrato

Resumo do que este contrato expõe e quem o consome.

## Contrato

| Item | Detalhe |
|---|---|
| Rota ou símbolo | \`GET /api/exemplo\` |
| Permissão | \`modulo.ver\` |
| Resposta | envelope \`ApiResponse\` |

## Exemplo

\`\`\`json
{ "message": "", "data": {} }
\`\`\`

## Erros

| Situação | Resultado |
|---|---|
| Não encontrado | 404 |

## Observações

Limites, paginação, efeitos colaterais.
`,
  [DocumentType.BusinessRule]: `# Regra de negócio

Enuncie a regra em uma frase direta.

## Regra

Descreva a regra completa, com as condições e as exceções.

## Por que existe

O problema real que ela evita.

## Onde está no código

Arquivo ou classe que a aplica.

## Como validar

Passos ou teste que provam que a regra está valendo.
`,
  [DocumentType.Decision]: `# Decisão

## Contexto

O que estava acontecendo e qual era a restrição.

## Decisão

O que foi decidido, em uma frase.

## Alternativas descartadas

- alternativa A: por que não;
- alternativa B: por que não.

## Consequências

O que ficou mais fácil e o que ficou mais difícil.
`,
  [DocumentType.Runbook]: `# Procedimento

Quando executar e o que se espera ao final.

## Antes de começar

- pré-requisitos;
- impacto em produção, se houver.

## Passos

1. primeiro passo;
2. segundo passo;
3. terceiro passo.

## Como confirmar que deu certo

O que olhar para ter certeza.

## Se algo der errado

Como desfazer ou a quem recorrer.
`
}
