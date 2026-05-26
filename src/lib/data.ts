import { supabase } from "@/integrations/supabase/client";

export type Appointment = {
  id: string;
  date: string; // YYYY-MM-DD
  time: string | null;
  client_name: string;
  procedure: string | null;
  payment_method: string | null;
  amount: number;
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
  notes: string | null;
  created_at: string;
};

export type AppointmentInput = Omit<Appointment, "id" | "created_at">;
export type ExpenseInput = Omit<Expense, "id" | "created_at">;

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

export async function createAppointment(input: AppointmentInput) {
  const { error } = await supabase.from("appointments").insert(input);
  if (error) throw error;
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
