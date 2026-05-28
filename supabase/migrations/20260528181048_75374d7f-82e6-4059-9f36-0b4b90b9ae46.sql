
-- 1. Snapshot phone on appointments
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS client_phone text;

-- 2. WhatsApp template in contact_settings
ALTER TABLE public.contact_settings
  ADD COLUMN IF NOT EXISTS whatsapp_message_template text NOT NULL
  DEFAULT 'Olá {cliente}! Passando para confirmar seu atendimento ({procedimento}) no dia {data} às {hora}. Studio Taiane Oliveira 💖';

-- 3. Expense category
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS category text;
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);

-- 4. Appointment payments
CREATE TABLE IF NOT EXISTS public.appointment_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  payment_method text,
  paid_at date NOT NULL DEFAULT current_date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointment_payments TO authenticated;
GRANT ALL ON public.appointment_payments TO service_role;

ALTER TABLE public.appointment_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read appointment_payments"
  ON public.appointment_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert appointment_payments"
  ON public.appointment_payments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update appointment_payments"
  ON public.appointment_payments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete appointment_payments"
  ON public.appointment_payments FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_appointment_payments_appt ON public.appointment_payments(appointment_id);
