# Terceira etapa do Prontuário

## Resultado
- Permitir que perfis autorizados solicitem a exclusão de um documento, exame, evolução ou receita, informando o motivo.
- Criar uma fila administrativa para analisar cada solicitação e aprovar ou recusar com justificativa.
- Manter o registro clínico e o arquivo preservados durante todo o processo; nenhuma aprovação apagará dados automaticamente.
- Exibir a situação da solicitação no prontuário e registrar cada ação na auditoria.

## Implementação
- Criar solicitações vinculadas ao paciente e ao registro clínico, com solicitante, motivo, datas, situação e decisão administrativa.
- Aplicar a permissão clínica existente **Solicitar exclusão** e restringir aprovação ou recusa aos administradores.
- Adicionar ações de solicitação nos registros e uma área administrativa de pendências na aba Auditoria.
- Impedir solicitações duplicadas em aberto e proteger o histórico contra edição ou remoção.
- Validar os fluxos no computador e celular e conferir os controles de acesso.

## Limites desta etapa
- Aprovar significa autorizar e registrar a decisão de retenção; não haverá exclusão física ou definitiva automática.
- A eliminação definitiva, se necessária após análise legal, continuará dependendo de um procedimento administrativo separado.
