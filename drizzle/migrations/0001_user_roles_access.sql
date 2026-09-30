CREATE TYPE public.app_role AS ENUM ('admin', 'editor', 'viewer');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.can_edit(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','editor'))
$$;

CREATE POLICY "own roles readable" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

INSERT INTO public.user_roles (user_id, role) VALUES
  ('8bbefb1e-f95a-4908-85c5-eb455f41a343', 'admin'),
  ('405e8f17-6f67-4330-a205-d0d15a18b1a6', 'editor');

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['mensalidades','despesas','folha_pagamento','configuracoes'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', CASE t WHEN 'folha_pagamento' THEN 'auth all folha' WHEN 'configuracoes' THEN 'auth all config' ELSE 'auth all '||t END, t);
    EXECUTE format('CREATE POLICY "read %1$s" ON public.%1$I FOR SELECT TO authenticated USING (true)', t);
    EXECUTE format('CREATE POLICY "insert %1$s" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (public.can_edit(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "update %1$s" ON public.%1$I FOR UPDATE TO authenticated USING (public.can_edit(auth.uid())) WITH CHECK (public.can_edit(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "delete %1$s" ON public.%1$I FOR DELETE TO authenticated USING (public.can_edit(auth.uid()))', t);
  END LOOP;
END $$;