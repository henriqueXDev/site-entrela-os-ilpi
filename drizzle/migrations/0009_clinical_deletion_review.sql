CREATE TABLE public.clinical_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id uuid NOT NULL REFERENCES public.pacientes(id) ON DELETE RESTRICT,
  record_type text NOT NULL CHECK (record_type IN ('evolucoes', 'prescricoes', 'clinical_documents')),
  record_id uuid NOT NULL,
  reason text NOT NULL CHECK (length(trim(reason)) BETWEEN 10 AND 2000),
  requested_by uuid NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovada', 'recusada')),
  decision_reason text,
  decided_by uuid,
  decided_at timestamptz,
  CONSTRAINT clinical_decision_consistent CHECK (
    (status = 'pendente' AND decision_reason IS NULL AND decided_by IS NULL AND decided_at IS NULL)
    OR (status IN ('aprovada','recusada') AND length(trim(decision_reason)) BETWEEN 10 AND 2000 AND decided_by IS NOT NULL AND decided_at IS NOT NULL)
  )
);
GRANT SELECT ON public.clinical_deletion_requests TO authenticated;
GRANT ALL ON public.clinical_deletion_requests TO service_role;
ALTER TABLE public.clinical_deletion_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinical request readable" ON public.clinical_deletion_requests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR (requested_by = auth.uid() AND public.clinical_allowed(auth.uid(), 'view')));
CREATE UNIQUE INDEX clinical_one_pending_request_per_record ON public.clinical_deletion_requests(record_type, record_id) WHERE status = 'pendente';
CREATE INDEX clinical_deletion_requests_patient_date ON public.clinical_deletion_requests(paciente_id, requested_at DESC);
CREATE INDEX clinical_deletion_requests_queue ON public.clinical_deletion_requests(status, requested_at DESC);

CREATE FUNCTION public.request_clinical_deletion(_patient_id uuid, _record_type text, _record_id uuid, _reason text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE new_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.clinical_allowed(auth.uid(), 'request_delete') OR NOT public.clinical_allowed(auth.uid(), 'view') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  IF _reason IS NULL OR length(trim(_reason)) NOT BETWEEN 10 AND 2000 THEN
    RAISE EXCEPTION 'O motivo precisa ter entre 10 e 2000 caracteres';
  END IF;
  IF _record_type = 'evolucoes' THEN
    IF NOT EXISTS (SELECT 1 FROM public.evolucoes WHERE id = _record_id AND paciente_id = _patient_id) THEN RAISE EXCEPTION 'Registro não encontrado para este paciente'; END IF;
  ELSIF _record_type = 'prescricoes' THEN
    IF NOT EXISTS (SELECT 1 FROM public.prescricoes WHERE id = _record_id AND paciente_id = _patient_id) THEN RAISE EXCEPTION 'Registro não encontrado para este paciente'; END IF;
  ELSIF _record_type = 'clinical_documents' THEN
    IF NOT EXISTS (SELECT 1 FROM public.clinical_documents WHERE id = _record_id AND paciente_id = _patient_id) THEN RAISE EXCEPTION 'Registro não encontrado para este paciente'; END IF;
  ELSE
    RAISE EXCEPTION 'Tipo de registro inválido';
  END IF;
  INSERT INTO public.clinical_deletion_requests (paciente_id, record_type, record_id, reason, requested_by)
  VALUES (_patient_id, _record_type, _record_id, trim(_reason), auth.uid()) RETURNING id INTO new_id;
  INSERT INTO public.clinical_audit(paciente_id, actor_id, action, record_type, record_id, details)
  VALUES (_patient_id, auth.uid(), 'solicitacao_exclusao', _record_type, _record_id, jsonb_build_object('request_id', new_id));
  RETURN new_id;
END;
$$;
REVOKE ALL ON FUNCTION public.request_clinical_deletion(uuid,text,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_clinical_deletion(uuid,text,uuid,text) TO authenticated;

CREATE FUNCTION public.decide_clinical_deletion(_request_id uuid, _decision text, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE target public.clinical_deletion_requests%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  IF _decision NOT IN ('aprovada','recusada') OR _decision IS NULL OR _reason IS NULL OR length(trim(_reason)) NOT BETWEEN 10 AND 2000 THEN
    RAISE EXCEPTION 'Decisão e justificativa válidas são obrigatórias';
  END IF;
  SELECT * INTO target FROM public.clinical_deletion_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND OR target.status <> 'pendente' THEN
    RAISE EXCEPTION 'Solicitação não encontrada ou já analisada';
  END IF;
  UPDATE public.clinical_deletion_requests
    SET status = _decision, decision_reason = trim(_reason), decided_by = auth.uid(), decided_at = now()
    WHERE id = _request_id;
  INSERT INTO public.clinical_audit(paciente_id, actor_id, action, record_type, record_id, details)
  VALUES (target.paciente_id, auth.uid(), 'decisao_exclusao', target.record_type, target.record_id,
    jsonb_build_object('request_id', target.id, 'decision', _decision));
END;
$$;
REVOKE ALL ON FUNCTION public.decide_clinical_deletion(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decide_clinical_deletion(uuid,text,text) TO authenticated;
COMMENT ON TABLE public.clinical_deletion_requests IS 'Requests and decisions only; approval never deletes clinical records or stored files.';