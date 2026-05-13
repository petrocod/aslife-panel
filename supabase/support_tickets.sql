CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user','support')),
  sender_id UUID,
  message TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company tickets"
  ON public.support_tickets FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can create tickets"
  ON public.support_tickets FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Users can update own tickets"
  ON public.support_tickets FOR UPDATE
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can view own ticket messages"
  ON public.ticket_messages FOR SELECT
  USING (ticket_id IN (SELECT id FROM public.support_tickets WHERE company_id = public.get_user_company_id()));

CREATE POLICY "Users can add messages to own tickets"
  ON public.ticket_messages FOR INSERT
  WITH CHECK (ticket_id IN (SELECT id FROM public.support_tickets WHERE company_id = public.get_user_company_id()));

CREATE POLICY "Service role full access tickets"
  ON public.support_tickets FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access messages"
  ON public.ticket_messages FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_support_tickets_company ON public.support_tickets(company_id);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_ticket_messages_ticket ON public.ticket_messages(ticket_id);
