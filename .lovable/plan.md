# Plano de implementação

Escopo grande — vou dividir em 6 frentes, com mudanças mínimas e seguras de banco/UI.

## 1. Clientes — campo `telefone_wpp`

Banco:
- `clients`: já existe `phone`. Vou **reutilizar `phone`** como WhatsApp (DDD+número) em vez de criar coluna nova, evitando duplicidade. Permanece `nullable` — clientes antigos seguem funcionando.
- `appointments`: adicionar coluna `client_phone text null` para guardar o número informado no momento do atendimento (snapshot, opcional).

UI:
- `ClientDialog` / formulário de cliente: campo "WhatsApp (DDD + número)" com máscara leve.
- `AppointmentDialog`: campo opcional "WhatsApp" pré-preenchido com o telefone do cliente selecionado; ao salvar, sincroniza de volta para `clients.phone` se o cliente não tiver número.

## 2. Botão WhatsApp nos atendimentos "a fazer"

- Helper `buildWhatsAppUrl(phone, message)` que normaliza para `55DDDNUMERO` e gera `https://wa.me/<num>?text=<encoded>`.
- Ícone do WhatsApp (lucide `MessageCircle` ou SVG inline) em:
  - cards do `AppointmentsCalendar` (status `a_fazer`)
  - lista "Próximos atendimentos" da home (`src/routes/index.tsx`)
- Mensagem: pega o texto padrão de Configurações com placeholders `{cliente}`, `{data}`, `{hora}`, `{procedimento}`.
- Se não houver telefone, ícone desabilitado com tooltip "Sem WhatsApp cadastrado".

## 3. Configurações — mensagem padrão de WhatsApp

Banco: adicionar `whatsapp_message_template text not null default '...'` em `contact_settings` (tabela já existe e é pública).

UI:
- Em `src/routes/configuracoes.tsx`: textarea "Mensagem padrão de WhatsApp" com dica dos placeholders disponíveis e botão salvar.

## 4. Calendário travado por padrão

- Em `AppointmentsCalendar.tsx`: introduzir estado `unlockedId: string | null`.
- Cards não recebem `draggable=true` por padrão. Adicionar um pequeno **handle** (ícone `GripVertical`) no card; clicar nele alterna `unlockedId` para aquele card.
- Apenas o card com `id === unlockedId` fica arrastável; ao soltar (`onDragEnd`) volta a travar. Visual: borda destacada quando destravado.
- No mobile, mesmo handle serve para "modo mover" antes do toque longo.

## 5. Contas a Receber — pagamentos parciais

Banco — nova tabela:
```
appointment_payments(
  id uuid pk,
  appointment_id uuid not null,
  amount numeric not null,
  payment_method text,
  paid_at date not null default current_date,
  notes text,
  created_at timestamptz default now()
)
```
+ GRANTs + RLS (mesmo padrão autenticado já usado).

Lógica:
- "Valor pago" = soma de `appointment_payments.amount` do atendimento.
- "Saldo" = `appointments.amount - pago`.
- Quando saldo ≤ 0 → marca `status='concluido'` e atualiza `payment_method` para o do último pagamento (ou "Misto" se diferentes). Enquanto saldo > 0, mantém `payment_method='A Receber'`.

UI:
- Em "Contas a Receber" (na home): cada item ganha botão "Registrar pagamento" → modal com valor (default = saldo), método, data, observação.
- Mostra "Pago R$ X de R$ Y · Saldo R$ Z" e histórico de pagamentos expansível.

## 6. BI de Custos

- Adicionar coluna `category text null` em `expenses` (default null = "Outros"). Editável no `ExpenseDialog` com sugestões livres (combobox tipo procedimento).
- Nova rota `src/routes/custos-bi.tsx` (ou aba dentro de `custos.tsx`):
  - **Totais por categoria** (mês atual): barra horizontal + tabela.
  - **MoM**: gráfico de barras agrupadas dos últimos 6 meses, uma série por categoria + linha de total.
  - **Variação %**: cartões mostrando categoria, mês atual vs mês anterior, com seta ▲/▼ e cor.
- Reaproveita Recharts já instalado.

## Detalhes técnicos

- Migrações Supabase em uma só chamada por etapa (1, 3, 5, 6 exigem migração). Vou pedir aprovação antes de cada uma.
- Camada `src/lib/data.ts` ganha: `fetchPayments(appointmentId)`, `createPayment`, `recomputeAppointmentStatus`, `fetchExpensesRange`, `fetchContactSettings`/`updateContactSettings` (se ainda não houver).
- Helper WhatsApp em `src/lib/whatsapp.ts`.
- Sem alterações em auth/Edge Functions.

## Ordem de execução sugerida

1. Migrações (clients/appointments phone snapshot, contact_settings template, appointment_payments, expenses.category) — uma migração combinada.
2. Configurações: salvar mensagem padrão.
3. Cadastro de telefone em clientes/atendimentos.
4. Botão WhatsApp (home + calendário).
5. Lock + handle no calendário.
6. Pagamentos parciais (modal + lógica).
7. BI de Custos (nova tela/aba).

Posso começar pela migração consolidada quando você aprovar?
