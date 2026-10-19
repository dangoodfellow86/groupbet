-- 009_user_feedback.sql
-- Player Feedback & Support submissions table with Row Level Security (RLS) enabled

CREATE TABLE IF NOT EXISTS public.user_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  display_name VARCHAR(100),
  contact_email VARCHAR(255),
  category VARCHAR(50) NOT NULL DEFAULT 'GENERAL_FEEDBACK',
  rating INT CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  message TEXT NOT NULL,
  league_id UUID REFERENCES public.leagues(id) ON DELETE SET NULL,
  page_url TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'NEW',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON public.user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON public.user_feedback(created_at DESC);

-- Enable Row Level Security (RLS) immediately
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

-- Owner-only SELECT policy so authenticated users can only view their own feedback via Data API,
-- protecting contact emails and feedback messages from public scraping.
-- All INSERT/UPDATE/DELETE operations happen via validated Next.js Server Actions using the server DB pool.
DROP POLICY IF EXISTS "Users can view own feedback" ON public.user_feedback;
CREATE POLICY "Users can view own feedback"
  ON public.user_feedback
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE auth_id = (select auth.uid())::text
    )
  );
