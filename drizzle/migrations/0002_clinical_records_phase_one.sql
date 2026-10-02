CREATE TABLE public.clinical_assignments (user_id uuid PRIMARY KEY, profile text NOT NULL CHECK (profile IN ('medico','enfermagem','recepcao','financeiro','leitura')), assigned_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.clinical_assignments TO authenticated;
GRANT ALL ON public.clinical_assignments TO service_role;
ALTER TABLE public.clinical_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinical assignments readable" ON public.clinical_assignments FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.clinical_permissions (profile text NOT NULL CHECK (profile IN ('medico','enfermagem','recepcao','financeiro','leitura')), action text NOT NULL CHECK (action IN ('view','create','edit','upload','download','print','request_delete')), allowed boolean NOT NULL DEFAULT false, PRIMARY KEY (profile,action));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinical_permissions TO authenticated;
GRANT ALL ON public.clinical_permissions TO service_role;
ALTER TABLE public.clinical_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinical permissions readable" ON public.clinical_permissions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()));
CREATE POLICY "admin configures clinical permissions" ON public.clinical_permissions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin assigns clinical profiles" ON public.clinical_assignments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
GRANT INSERT, UPDATE, DELETE ON public.clinical_assignments TO authenticated;

CREATE FUNCTION public.clinical_allowed(_user_id uuid, _action text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin') OR (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id) AND EXISTS (SELECT 1 FROM public.clinical_assignments a JOIN public.clinical_permissions p ON p.profile = a.profile WHERE a.user_id = _user_id AND p.action = _action AND p.allowed)); $$;
REVOKE ALL ON FUNCTION public.clinical_allowed(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clinical_allowed(uuid,text) TO authenticated;

CREATE TABLE public.pacientes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nome text NOT NULL, documento text, nascimento date, profissional_responsavel text, status text NOT NULL DEFAULT 'Ativo', foto_url text, created_at timestamptz NOT NULL DEFAULT now(), created_by uuid NOT NULL DEFAULT auth.uid(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE ON public.pacientes TO authenticated;
GRANT ALL ON public.pacientes TO service_role;
ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinical patients view" ON public.pacientes FOR SELECT TO authenticated USING (public.clinical_allowed(auth.uid(), 'view'));
CREATE POLICY "clinical patients create" ON public.pacientes FOR INSERT TO authenticated WITH CHECK (public.clinical_allowed(auth.uid(), 'create') AND created_by = auth.uid());
CREATE POLICY "clinical patients edit" ON public.pacientes FOR UPDATE TO authenticated USING (public.clinical_allowed(auth.uid(), 'edit')) WITH CHECK (public.clinical_allowed(auth.uid(), 'edit') AND created_by IS NOT NULL);

CREATE TABLE public.evolucoes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), paciente_id uuid NOT NULL REFERENCES public.pacientes(id), data_atendimento timestamptz NOT NULL DEFAULT now(), profissional text NOT NULL, especialidade text, tipo_atendimento text, queixa text, evolucao text NOT NULL, condutas text, orientacoes text, observacoes text, retifica_id uuid REFERENCES public.evolucoes(id), motivo_retificacao text, created_at timestamptz NOT NULL DEFAULT now(), created_by uuid NOT NULL DEFAULT auth.uid(), CHECK ((retifica_id IS NULL AND motivo_retificacao IS NULL) OR (retifica_id IS NOT NULL AND nullif(trim(motivo_retificacao), '') IS NOT NULL)));
GRANT SELECT, INSERT ON public.evolucoes TO authenticated;
GRANT ALL ON public.evolucoes TO service_role;
ALTER TABLE public.evolucoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinical evolution view" ON public.evolucoes FOR SELECT TO authenticated USING (public.clinical_allowed(auth.uid(), 'view'));
CREATE POLICY "clinical evolution create" ON public.evolucoes FOR INSERT TO authenticated WITH CHECK (public.clinical_allowed(auth.uid(), 'create') AND created_by = auth.uid() AND (retifica_id IS NULL OR (public.clinical_allowed(auth.uid(), 'edit') AND EXISTS (SELECT 1 FROM public.evolucoes e WHERE e.id = retifica_id AND e.paciente_id = paciente_id))));

CREATE TABLE public.prescricoes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), paciente_id uuid NOT NULL REFERENCES public.pacientes(id), medicamento text NOT NULL, dosagem text NOT NULL, via text, frequencia text, duracao text, quantidade text, orientacoes text, data_prescricao date NOT NULL DEFAULT current_date, prescritor text NOT NULL, status text NOT NULL DEFAULT 'Ativa', retifica_id uuid REFERENCES public.prescricoes(id), motivo_retificacao text, created_at timestamptz NOT NULL DEFAULT now(), created_by uuid NOT NULL DEFAULT auth.uid(), CHECK ((retifica_id IS NULL AND motivo_retificacao IS NULL) OR (retifica_id IS NOT NULL AND nullif(trim(motivo_retificacao), '') IS NOT NULL)));
GRANT SELECT, INSERT ON public.prescricoes TO authenticated;
GRANT ALL ON public.prescricoes TO service_role;
ALTER TABLE public.prescricoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinical prescription view" ON public.prescricoes FOR SELECT TO authenticated USING (public.clinical_allowed(auth.uid(), 'view'));
CREATE POLICY "clinical prescription create" ON public.prescricoes FOR INSERT TO authenticated WITH CHECK (public.clinical_allowed(auth.uid(), 'create') AND created_by = auth.uid() AND (retifica_id IS NULL OR (public.clinical_allowed(auth.uid(), 'edit') AND EXISTS (SELECT 1 FROM public.prescricoes p WHERE p.id = retifica_id AND p.paciente_id = paciente_id))));

CREATE TABLE public.clinical_audit (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), paciente_id uuid REFERENCES public.pacientes(id), actor_id uuid NOT NULL, action text NOT NULL, record_type text NOT NULL, record_id uuid, details jsonb NOT NULL DEFAULT '{}'::jsonb, occurred_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.clinical_audit TO authenticated;
GRANT ALL ON public.clinical_audit TO service_role;
ALTER TABLE public.clinical_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinical audit admin view" ON public.clinical_audit FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE FUNCTION public.audit_clinical_mutation() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN INSERT INTO public.clinical_audit(paciente_id,actor_id,action,record_type,record_id,details) VALUES (CASE WHEN TG_TABLE_NAME = 'pacientes' THEN NEW.id ELSE NEW.paciente_id END, auth.uid(), CASE WHEN TG_OP = 'INSERT' AND NEW.retifica_id IS NOT NULL THEN 'retificacao' WHEN TG_OP = 'INSERT' THEN 'criacao' ELSE 'alteracao' END, TG_TABLE_NAME, NEW.id, CASE WHEN TG_OP = 'UPDATE' THEN jsonb_build_object('antes',to_jsonb(OLD),'depois',to_jsonb(NEW)) WHEN NEW.retifica_id IS NOT NULL THEN jsonb_build_object('retifica_id',NEW.retifica_id) ELSE '{}'::jsonb END); RETURN NEW; END; $$;
-- Patients have no retifica_id, so use a dedicated trigger for them.
CREATE FUNCTION public.audit_patient_mutation() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN INSERT INTO public.clinical_audit(paciente_id,actor_id,action,record_type,record_id,details) VALUES (NEW.id,auth.uid(),CASE WHEN TG_OP = 'INSERT' THEN 'criacao' ELSE 'alteracao' END,'pacientes',NEW.id,CASE WHEN TG_OP = 'UPDATE' THEN jsonb_build_object('antes',to_jsonb(OLD),'depois',to_jsonb(NEW)) ELSE '{}'::jsonb END); RETURN NEW; END; $$;
CREATE TRIGGER audit_pacientes AFTER INSERT OR UPDATE ON public.pacientes FOR EACH ROW EXECUTE FUNCTION public.audit_patient_mutation();
CREATE TRIGGER audit_evolucoes AFTER INSERT ON public.evolucoes FOR EACH ROW EXECUTE FUNCTION public.audit_clinical_mutation();
CREATE TRIGGER audit_prescricoes AFTER INSERT ON public.prescricoes FOR EACH ROW EXECUTE FUNCTION public.audit_clinical_mutation();
CREATE FUNCTION public.log_clinical_access(_patient_id uuid, _action text, _record_type text DEFAULT 'pacientes', _record_id uuid DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN IF NOT public.clinical_allowed(auth.uid(), CASE WHEN _action = 'impressao' THEN 'print' ELSE 'view' END) OR _action NOT IN ('acesso','impressao') OR NOT EXISTS (SELECT 1 FROM public.pacientes WHERE id = _patient_id) THEN RAISE EXCEPTION 'Access denied'; END IF; INSERT INTO public.clinical_audit(paciente_id,actor_id,action,record_type,record_id) VALUES (_patient_id,auth.uid(),_action,_record_type,_record_id); END; $$;
REVOKE ALL ON FUNCTION public.log_clinical_access(uuid,text,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_clinical_access(uuid,text,text,uuid) TO authenticated;
CREATE INDEX evolucoes_patient_date_idx ON public.evolucoes(paciente_id,data_atendimento DESC);
CREATE INDEX prescricoes_patient_date_idx ON public.prescricoes(paciente_id,data_prescricao DESC);
CREATE INDEX clinical_audit_patient_date_idx ON public.clinical_audit(paciente_id,occurred_at DESC);