# Corrigir "Criar grupo" no Check de Grupos

## O que já conferi
- As duas contas da equipe têm permissão de equipe, então não é falta de acesso.
- Nos registros da sua prévia não aparece nenhuma tentativa de salvar um grupo: o toque em "Criar" não chegou a enviar nada.

## O que vou fazer
1. Abrir a tela Check de Grupos logada, digitar um nome e tocar em Criar, para ver exatamente onde trava (botão, campo vazio, ou erro ao abrir o grupo novo).
2. Corrigir a causa encontrada.
3. Deixar o botão mais claro: fica desativado com o campo vazio, mostra "Criando…" enquanto salva e mostra a mensagem de erro em português se algo falhar.
4. Testar de novo criando um grupo de teste, conferir que ele abre e aparece na lista, e apagar o grupo de teste.

## Detalhes técnicos
- Função `criar` em `src/modules/grupos/pages.tsx`: adicionar estado de carregamento, try/catch, toast de erro, invalidar a lista `["grupos"]`.
- Conferir rota `/grupos/$grupoId` e a navegação após o insert.
- Nada fora do módulo de grupos será alterado.
