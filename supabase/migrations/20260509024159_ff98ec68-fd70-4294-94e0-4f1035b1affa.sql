CREATE TABLE public.user_onboarding (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  tour_completed boolean NOT NULL DEFAULT false,
  tour_skipped boolean NOT NULL DEFAULT false,
  tasks jsonb NOT NULL DEFAULT '{}'::jsonb,
  widget_dismissed boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_onboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own onboarding"
  ON public.user_onboarding FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own onboarding"
  ON public.user_onboarding FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own onboarding"
  ON public.user_onboarding FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_user_onboarding_updated
  BEFORE UPDATE ON public.user_onboarding
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  INSERT INTO public.user_onboarding (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

INSERT INTO public.user_onboarding (user_id)
SELECT id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;