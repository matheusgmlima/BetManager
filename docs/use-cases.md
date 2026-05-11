# Casos de Uso — BetManager

## Atores

| Ator    | Descrição                                              |
|---------|--------------------------------------------------------|
| Usuário | Apostador que utiliza o sistema para gerenciar apostas |
| IA      | Claude API — processa imagens e extrai dados           |
| Sistema | BetManager — processa regras de negócio automaticamente|

---

## Índice

| ID    | Nome                                    | Prioridade |
|-------|-----------------------------------------|------------|
| UC-01 | Registrar apostas via print (IA)        | Alta       |
| UC-02 | Registrar aposta manualmente            | Alta       |
| UC-03 | Visualizar dashboard principal          | Alta       |
| UC-04 | Editar aposta                           | Alta       |
| UC-05 | Excluir aposta                          | Média      |
| UC-06 | Visualizar histórico de apostas         | Alta       |
| UC-07 | Filtrar histórico                       | Alta       |
| UC-08 | Visualizar estatísticas por esporte     | Alta       |
| UC-09 | Visualizar estatísticas por casa        | Alta       |
| UC-10 | Comparar apostas simples vs combinadas  | Média      |
| UC-11 | Definir meta mensal                     | Média      |
| UC-12 | Acompanhar progresso da meta            | Média      |
| UC-13 | Registrar aposta combinada              | Média      |
| UC-14 | Gerenciar casas de apostas              | Baixa      |
| UC-15 | Gerenciar esportes                      | Baixa      |

---

## UC-01 — Registrar Apostas via Print (IA)

**Ator principal:** Usuário  
**Pré-condição:** Sistema em execução; chave da API da Anthropic configurada  
**Pós-condição:** Uma ou mais apostas salvas no banco de dados

### Fluxo Principal

1. Usuário acessa a página "Nova Aposta"
2. Usuário clica em "Enviar Print"
3. Sistema exibe área de upload (drag & drop ou seleção de arquivo)
4. Usuário seleciona ou arrasta uma imagem (PNG, JPG, JPEG, WEBP)
5. Sistema valida o arquivo (tipo e tamanho máximo: 10MB)
6. Sistema exibe indicador de carregamento "Analisando imagem..."
7. Sistema envia imagem para Claude API com prompt estruturado
8. Claude API retorna JSON com apostas detectadas
9. Sistema valida e formata os dados retornados
10. Sistema exibe formulário pré-preenchido com as apostas detectadas
11. Usuário revisa cada aposta e corrige campos incorretos se necessário
12. Usuário clica em "Confirmar e Salvar"
13. Sistema salva todas as apostas no banco de dados
14. Sistema exibe mensagem de sucesso com quantidade de apostas salvas
15. Sistema redireciona para o histórico

### Fluxos Alternativos

**FA-01A: IA não consegue detectar apostas**
- Passo 8: Claude retorna array vazio ou erro de interpretação
- Sistema exibe mensagem: "Não foi possível identificar apostas na imagem. Tente registrar manualmente."
- Sistema redireciona para UC-02

**FA-01B: Imagem com baixa qualidade**
- Passo 8: Claude retorna dados parciais (campos null)
- Sistema exibe os campos identificados e destaca os campos não preenchidos em amarelo
- Usuário preenche os campos em falta manualmente
- Fluxo continua no passo 12

**FA-01C: Usuário remove uma aposta da lista**
- Passo 11: Usuário clica em "Remover" em uma das apostas listadas
- Sistema remove a linha do formulário
- Fluxo continua no passo 12 com as apostas restantes

**FA-01D: Falha na API da Anthropic**
- Passo 8: API retorna erro (timeout, rate limit, etc.)
- Sistema loga o erro em `ai_extraction_logs`
- Sistema exibe mensagem de erro com opção de tentar novamente
- Após 3 falhas, sistema sugere registro manual

### Regras de Negócio

- RN-01: Imagens acima de 10MB são rejeitadas antes do envio para a API
- RN-02: Formatos aceitos: PNG, JPG, JPEG, WEBP
- RN-03: O usuário SEMPRE revisa antes de salvar — nunca salvar automaticamente
- RN-04: Cada extração é logada em `ai_extraction_logs` independente do resultado
- RN-05: Apostas com resultado "pendente" são aceitas (o usuário pode atualizar depois)

---

## UC-02 — Registrar Aposta Manualmente

**Ator principal:** Usuário  
**Pré-condição:** Sistema em execução  
**Pós-condição:** Aposta salva no banco de dados

### Fluxo Principal

1. Usuário acessa a página "Nova Aposta"
2. Usuário clica em "Registro Manual"
3. Sistema exibe formulário com campos:
   - Data (padrão: hoje)
   - Descrição
   - Esporte (dropdown)
   - Casa de apostas (dropdown)
   - Tipo (Simples / Combinada)
   - Valor apostado
   - Odd
   - Retorno total (calculado automaticamente ao preencher odd)
   - Resultado (Ganhou / Perdeu / Void / Pendente)
   - Observações (opcional)
4. Usuário preenche os campos
5. Sistema calcula automaticamente o retorno total ao digitar odd
6. Usuário clica em "Salvar Aposta"
7. Sistema valida os campos obrigatórios
8. Sistema salva a aposta
9. Sistema exibe confirmação e limpa o formulário para nova entrada

### Fluxos Alternativos

**FA-02A: Validação falha**
- Passo 7: Campo obrigatório vazio ou valor inválido
- Sistema destaca os campos com erro e exibe mensagem específica
- Usuário corrige e tenta novamente

**FA-02B: Tipo "Combinada" selecionado**
- Passo 3: Usuário seleciona "Combinada"
- Sistema exibe campo adicional para vincular a um grupo existente ou criar novo grupo
- Ver UC-13

### Regras de Negócio

- RN-06: Data não pode ser futura
- RN-07: Valor apostado deve ser maior que zero
- RN-08: Odd, quando informada, deve ser >= 1.0
- RN-09: Retorno total = valor apostado × odd (calculado automaticamente)
- RN-10: Campos obrigatórios: data, descrição, casa, valor apostado, resultado

---

## UC-03 — Visualizar Dashboard Principal

**Ator principal:** Usuário  
**Pré-condição:** Sistema em execução  
**Pós-condição:** Dashboard exibido com dados atualizados

### Fluxo Principal

1. Usuário acessa a página inicial "/"
2. Sistema carrega e exibe:
   - **Cards de resumo:** lucro do dia, semana, mês e ano
   - **Gráfico de lucro acumulado** (últimos 30 dias)
   - **Hit rate** do período selecionado (% de apostas ganhas)
   - **Apostas pendentes** (lista das apostas sem resultado)
   - **Progresso da meta mensal** (barra de progresso)
   - **Últimas 5 apostas** (atalho rápido)
3. Usuário pode alternar o período: Semana / Mês / Ano / Tudo
4. Dashboard atualiza os dados conforme o período selecionado

### Fluxos Alternativos

**FA-03A: Sem dados no período**
- Passo 2: Nenhuma aposta no período selecionado
- Sistema exibe estado vazio com mensagem e botão "Registrar primeira aposta"

---

## UC-04 — Editar Aposta

**Ator principal:** Usuário  
**Pré-condição:** Aposta existente no sistema  
**Pós-condição:** Aposta atualizada no banco de dados

### Fluxo Principal

1. Usuário localiza a aposta (via histórico ou dashboard)
2. Usuário clica no ícone de edição
3. Sistema exibe formulário pré-preenchido com os dados atuais
4. Usuário altera os campos desejados
5. Usuário clica em "Salvar Alterações"
6. Sistema valida e salva
7. Sistema exibe confirmação

### Caso de Uso Importante — Atualizar Resultado Pendente

Este é o uso mais frequente de edição: o usuário registrou a aposta como "pendente" e depois volta para atualizar o resultado.

1. Usuário acessa o dashboard → seção "Apostas Pendentes"
2. Clica no botão de resultado rápido: ✓ (ganhou) ou ✗ (perdeu)
3. Sistema atualiza o resultado e o payout automaticamente
4. Dashboard recalcula instantaneamente

---

## UC-05 — Excluir Aposta

**Ator principal:** Usuário  
**Pré-condição:** Aposta existente  
**Pós-condição:** Aposta removida do banco de dados

### Fluxo Principal

1. Usuário localiza a aposta no histórico
2. Usuário clica no ícone de exclusão
3. Sistema exibe modal de confirmação: "Tem certeza? Esta ação não pode ser desfeita."
4. Usuário confirma
5. Sistema exclui a aposta e atualiza estatísticas

### Regras de Negócio

- RN-11: Exclusão é permanente — não há lixeira
- RN-12: Se a aposta pertence a um grupo combinado, o usuário é alertado que a combinada será afetada

---

## UC-06 — Visualizar Histórico de Apostas

**Ator principal:** Usuário  
**Pré-condição:** Sistema em execução  
**Pós-condição:** Lista de apostas exibida

### Fluxo Principal

1. Usuário acessa "/apostas"
2. Sistema carrega apostas ordenadas por data (mais recente primeiro)
3. Sistema exibe tabela com colunas: Data, Descrição, Esporte, Casa, Valor, Odd, Retorno, Lucro, Resultado
4. Sistema exibe paginação (25 apostas por página)
5. Sistema exibe totalizadores no rodapé: total apostado, total de lucro, hit rate

---

## UC-07 — Filtrar Histórico

**Ator principal:** Usuário  
**Pré-condição:** Histórico carregado  
**Pós-condição:** Histórico filtrado exibido

### Fluxo Principal

1. Usuário acessa o histórico (UC-06)
2. Usuário utiliza os filtros disponíveis:
   - **Período:** seletor de data inicial e final
   - **Resultado:** Todos / Ganhou / Perdeu / Void / Pendente
   - **Esporte:** multiselect
   - **Casa:** multiselect
   - **Tipo:** Todos / Simples / Combinada
   - **Busca por texto:** na descrição da aposta
3. Sistema aplica filtros e atualiza a tabela em tempo real
4. Totalizadores do rodapé refletem apenas as apostas filtradas

---

## UC-08 — Visualizar Estatísticas por Esporte

**Ator principal:** Usuário  
**Pré-condição:** Ao menos uma aposta registrada com resultado  
**Pós-condição:** Estatísticas por esporte exibidas

### Fluxo Principal

1. Usuário acessa "/estatisticas"
2. Sistema exibe tabela/cards por esporte contendo:
   - Total de apostas
   - Apostas ganhas / perdidas
   - Hit rate (%)
   - Total apostado
   - Lucro total
   - Lucro médio por aposta
3. Sistema exibe gráfico de barras comparando lucro por esporte
4. Usuário pode filtrar por período

---

## UC-09 — Visualizar Estatísticas por Casa de Apostas

**Ator principal:** Usuário  
**Pré-condição:** Ao menos uma aposta registrada com resultado  
**Pós-condição:** Estatísticas por casa exibidas

### Fluxo Principal

1. Usuário acessa "/estatisticas" → aba "Por Casa"
2. Sistema exibe tabela por casa de apostas com as mesmas métricas do UC-08
3. Sistema destaca qual casa tem melhor hit rate e maior lucro

---

## UC-10 — Comparar Apostas Simples vs Combinadas

**Ator principal:** Usuário  
**Pré-condição:** Apostas de ambos os tipos registradas  
**Pós-condição:** Comparativo exibido

### Fluxo Principal

1. Usuário acessa "/estatisticas" → aba "Simples vs Combinadas"
2. Sistema exibe comparativo lado a lado:
   - Hit rate de cada tipo
   - Lucro médio por aposta
   - Lucro total por tipo
   - ROI (retorno sobre o investimento) de cada tipo
3. Sistema exibe recomendação baseada nos dados ("Suas apostas simples têm ROI X% maior")

---

## UC-11 — Definir Meta Mensal

**Ator principal:** Usuário  
**Pré-condição:** Sistema em execução  
**Pós-condição:** Meta salva para o mês/ano especificado

### Fluxo Principal

1. Usuário acessa "/metas"
2. Usuário clica em "Nova Meta"
3. Sistema exibe formulário: mês, ano, valor objetivo (R$), observações
4. Usuário preenche e confirma
5. Sistema salva a meta

### Regras de Negócio

- RN-13: Apenas uma meta por mês/ano
- RN-14: Meta pode ser editada a qualquer momento

---

## UC-12 — Acompanhar Progresso da Meta

**Ator principal:** Usuário  
**Pré-condição:** Meta definida para o mês atual  
**Pós-condição:** Progresso exibido

### Fluxo Principal

1. Usuário acessa o dashboard ou "/metas"
2. Sistema exibe para a meta do mês atual:
   - Objetivo (R$)
   - Lucro atual (R$)
   - Percentual atingido (%)
   - Barra de progresso visual
   - Projeção: "No ritmo atual, você atingirá a meta em X dias"
3. Sistema exibe histórico de metas anteriores com status (atingida / não atingida)

---

## UC-13 — Registrar Aposta Combinada

**Ator principal:** Usuário  
**Pré-condição:** Sistema em execução  
**Pós-condição:** Grupo de apostas combinadas salvo

### Fluxo Principal

1. Usuário acessa "Nova Aposta" → seleciona "Combinada"
2. Sistema exibe interface de múltiplas seleções
3. Usuário adiciona cada seleção da combinada (mínimo 2)
4. Para cada seleção: preenche descrição, esporte, odd
5. Sistema calcula a odd total automaticamente (produto das odds)
6. Usuário informa o valor apostado e resultado
7. Sistema salva o grupo e todas as seleções
8. Resultado individual de cada seleção é salvo como "pendente" até atualização

---

## UC-14 — Gerenciar Casas de Apostas

**Ator principal:** Usuário  
**Pré-condição:** Sistema em execução  
**Pós-condição:** Casa adicionada/editada/desativada

### Fluxo Principal

1. Usuário acessa "/configuracoes" → "Casas de Apostas"
2. Sistema exibe lista de casas cadastradas
3. Usuário pode adicionar nova casa (nome, cor)
4. Usuário pode desativar casas não utilizadas (não aparecem nos dropdowns)

### Regras de Negócio

- RN-15: Não é possível excluir uma casa que possui apostas associadas — apenas desativar

---

## UC-15 — Gerenciar Esportes

Idêntico ao UC-14, porém para esportes. Mesmas regras aplicadas.
