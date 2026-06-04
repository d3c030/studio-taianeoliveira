import { supabase } from "@/integrations/supabase/client";

export type AppointmentStatus = "a_fazer" | "concluido" | "cancelado";

export const APPOINTMENT_STATUS_LABEL: Record<AppointmentStatus, string> = {
  a_fazer: "A fazer",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export type Appointment = {
  id: string;
  date: string; // YYYY-MM-DD
  time: string | null;
  client_name: string;
  client_id: string | null;
  client_phone: string | null;
  procedure: string | null;
  payment_method: string | null;
  amount: number;
  subtotal: number;
  discount: number;
  notes: string | null;
  status: AppointmentStatus;
  created_at: string;
};

export type AppointmentPayment = {
  id: string;
  appointment_id: string;
  amount: number;
  payment_method: string | null;
  paid_at: string;
  notes: string | null;
  created_at: string;
};

export type Expense = {
  id: string;
  date: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  payment_method: string | null;
  category: string | null;
  notes: string | null;
  created_at: string;
};

export type Client = {
  id: string;
  name: string;
  normalized_name: string;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type AppointmentInput = Omit<
  Appointment,
  "id" | "created_at" | "client_id" | "client_phone" | "status" | "subtotal" | "discount"
> & {
  client_id?: string | null;
  client_phone?: string | null;
  status?: AppointmentStatus;
  subtotal?: number;
  discount?: number;
};
export type ExpenseInput = Omit<Expense, "id" | "created_at" | "category"> & { category?: string | null };
export type ClientInput = Pick<Client, "name" | "phone" | "notes">;

const monthRange = (year: number, monthIdx: number) => {
  const start = new Date(year, monthIdx, 1);
  const end = new Date(year, monthIdx + 1, 1);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { start: fmt(start), end: fmt(end) };
};

export async function fetchAppointments(year: number, monthIdx: number): Promise<Appointment[]> {
  const { start, end } = monthRange(year, monthIdx);
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .gte("date", start)
    .lt("date", end)
    .order("date", { ascending: true })
    .order("time", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Appointment[];
}

export async function fetchUpcomingAppointments(): Promise<Appointment[]> {
  const today = new Date();
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const { data, error } = await supabase
    .from("appointments")
    .select("*, clients(phone)")
    .gte("date", iso)
    .eq("status", "a_fazer")
    .order("date", { ascending: true })
    .order("time", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as any[]).map((a) => ({
    ...a,
    client_phone: a.client_phone ?? a.clients?.phone ?? null,
  })) as Appointment[];

export async function updateAppointmentStatus(id: string, status: AppointmentStatus) {
  const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function completeAppointment(
  id: string,
  data: {
    subtotal: number;
    discount: number;
    amount: number;
    payment_method: string;
  },
) {
  const { error } = await supabase
    .from("appointments")
    .update({
      subtotal: data.subtotal,
      discount: data.discount,
      amount: data.amount,
      payment_method: data.payment_method,
      status: "concluido",
    })
    .eq("id", id);
  if (error) throw error;
}

export async function fetchExpenses(year: number, monthIdx: number): Promise<Expense[]> {
  const { start, end } = monthRange(year, monthIdx);
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .gte("date", start)
    .lt("date", end)
    .order("date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Expense[];
}

export async function fetchExpensesRange(startDate: string, endDate: string): Promise<Expense[]> {
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Expense[];
}

export async function createAppointment(
  input: AppointmentInput,
  deposit?: { amount: number; payment_method: string } | null,
) {
  const { data, error } = await supabase
    .from("appointments")
    .insert(input)
    .select("id")
    .single();
  if (error) throw error;
  const id = data?.id as string;
  if (deposit && deposit.amount > 0 && id) {
    const { error: payErr } = await supabase.from("appointment_payments").insert({
      appointment_id: id,
      amount: deposit.amount,
      payment_method: deposit.payment_method,
      paid_at: new Date().toISOString().slice(0, 10),
      notes: "Sinal (entrada)",
    });
    if (payErr) throw payErr;
  }
  return id;
}

export async function updateAppointment(id: string, input: AppointmentInput) {
  const { error } = await supabase.from("appointments").update(input).eq("id", id);
  if (error) throw error;
}

export async function deleteAppointment(id: string) {
  const { error } = await supabase.from("appointments").delete().eq("id", id);
  if (error) throw error;
}

export async function createExpense(input: ExpenseInput) {
  const { error } = await supabase.from("expenses").insert(input);
  if (error) throw error;
}

export async function updateExpense(id: string, input: ExpenseInput) {
  const { error } = await supabase.from("expenses").update(input).eq("id", id);
  if (error) throw error;
}

export async function deleteExpense(id: string) {
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchReceivables(): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .ilike("payment_method", "a receber")
    .order("date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Appointment[];
}

export async function fetchDistinctProcedures(): Promise<string[]> {
  const { data, error } = await supabase
    .from("appointments")
    .select("procedure")
    .not("procedure", "is", null)
    .limit(2000);
  if (error) return [];
  const set = new Set<string>();
  (data ?? []).forEach((r: { procedure: string | null }) => {
    if (r.procedure) set.add(r.procedure.trim());
  });
  return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

// ===== Clients =====

export async function fetchClients(): Promise<Client[]> {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Client[];
}

export async function fetchClient(id: string): Promise<Client | null> {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as Client) ?? null;
}

export async function fetchClientHistory(clientId: string): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("client_id", clientId)
    .order("date", { ascending: false })
    .order("time", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Appointment[];
}

export async function updateClient(id: string, input: ClientInput) {
  const { error } = await supabase.from("clients").update(input).eq("id", id);
  if (error) throw error;
}

export async function deleteClient(id: string) {
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw error;
}

export type ClientStats = {
  client: Client;
  visits: number;
  total: number;
  lastDate: string | null;
};

export async function fetchClientsWithStats(): Promise<ClientStats[]> {
  const [clientsRes, apptsRes] = await Promise.all([
    supabase.from("clients").select("*"),
    supabase
      .from("appointments")
      .select("client_id, amount, date")
      .not("client_id", "is", null),
  ]);
  if (clientsRes.error) throw clientsRes.error;
  if (apptsRes.error) throw apptsRes.error;

  const stats = new Map<string, { visits: number; total: number; lastDate: string | null }>();
  (apptsRes.data ?? []).forEach((a: { client_id: string | null; amount: number; date: string }) => {
    if (!a.client_id) return;
    const s = stats.get(a.client_id) ?? { visits: 0, total: 0, lastDate: null };
    s.visits += 1;
    s.total += Number(a.amount || 0);
    if (!s.lastDate || a.date > s.lastDate) s.lastDate = a.date;
    stats.set(a.client_id, s);
  });

  return (clientsRes.data as Client[])
    .map((c) => {
      const s = stats.get(c.id) ?? { visits: 0, total: 0, lastDate: null };
      return { client: c, ...s };
    })
    .sort((a, b) => {
      if (a.lastDate && b.lastDate) return b.lastDate.localeCompare(a.lastDate);
      if (a.lastDate) return -1;
      if (b.lastDate) return 1;
      return a.client.name.localeCompare(b.client.name, "pt-BR");
    });
}

// ===== Appointment payments (partial receipts) =====

export async function fetchAppointmentPayments(appointmentId: string): Promise<AppointmentPayment[]> {
  const { data, error } = await supabase
    .from("appointment_payments")
    .select("*")
    .eq("appointment_id", appointmentId)
    .order("paid_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as AppointmentPayment[];
}

export type RegisterPaymentInput = {
  appointmentId: string;
  /** Outstanding balance BEFORE this payment (typically appointment.amount). */
  currentRemaining: number;
  amount: number;
  payment_method: string;
  paid_at?: string;
  notes?: string | null;
};

/**
 * Inserts a payment row, decrements appointment.amount by the paid value,
 * and closes the appointment (status = concluido) when fully paid.
 */
export async function registerAppointmentPayment(input: RegisterPaymentInput) {
  const { appointmentId, currentRemaining, amount, payment_method, paid_at, notes } = input;
  if (amount <= 0) throw new Error("Valor deve ser maior que zero");

  const { error: insErr } = await supabase.from("appointment_payments").insert({
    appointment_id: appointmentId,
    amount,
    payment_method,
    paid_at: paid_at ?? new Date().toISOString().slice(0, 10),
    notes: notes ?? null,
  });
  if (insErr) throw insErr;

  const newRemaining = Math.max(0, Number(currentRemaining) - Number(amount));

  if (newRemaining <= 0.0001) {
    const { error: updErr } = await supabase
      .from("appointments")
      .update({ payment_method, status: "concluido" })
      .eq("id", appointmentId);
    if (updErr) throw updErr;
    return { closed: true, newRemaining: 0 };
  }

  const { error: updErr } = await supabase
    .from("appointments")
    .update({ amount: newRemaining, payment_method: "A Receber" })
    .eq("id", appointmentId);
  if (updErr) throw updErr;
  return { closed: false, newRemaining };
}

export async function deleteAppointmentPayment(id: string) {
  const { error } = await supabase.from("appointment_payments").delete().eq("id", id);
  if (error) throw error;
}


