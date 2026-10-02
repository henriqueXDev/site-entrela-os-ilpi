CREATE TABLE public.clinical_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id uuid NOT NULL REFERENCES public.pacientes(id) ON DELETE RESTRICT,
  kind text NOT NULL CHECK (kind IN ('documento', 'exame')),
  title text NOT NULL,
  category text NOT NULL,
  description text,
  document_date date,
  encounter_id uuid REFERENCES public.evolucoes(id) ON DELETE SET NULL,
  storage_path text NOT NULL UNIQUE,
  original_filename text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 20971520),
  version_group_id uuid NOT NULL DEFAULT gen_random_uuid(),
  version_number integer NOT NULL DEFAULT 1 CHECK (version_number > 0),
  replaces_id uuid REFERENCES public.clinical_documents(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Arquivado')),
  uploaded_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (version_group_id, version_number)
);

GRANT SELECT, INSERT ON public.clinical_documents TO authenticated;
GRANT ALL ON public.clinical_documents TO service_role;

ALTER TABLE public.clinical_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinical documents view"
ON public.clinical_documents
FOR SELECT TO authenticated
USING (public.clinical_allowed(auth.uid(), 'view'));

CREATE POLICY "clinical documents upload"
ON public.clinical_documents
FOR INSERT TO authenticated
WITH CHECK (
  public.clinical_allowed(auth.uid(), 'upload')
  AND uploaded_by = auth.uid()
  AND (
    (replaces_id IS NULL AND version_number = 1)
    OR EXISTS (
      SELECT 1 FROM public.clinical_documents previous
      WHERE previous.id = replaces_id
        AND previous.paciente_id = paciente_id
        AND previous.version_group_id = version_group_id
        AND version_number = previous.version_number + 1
        AND previous.kind = kind
    )
  )
);

CREATE OR REPLACE FUNCTION public.validate_clinical_document()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.encounter_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.evolucoes e
    WHERE e.id = NEW.encounter_id AND e.paciente_id = NEW.paciente_id
  ) THEN
    RAISE EXCEPTION 'Document encounter must belong to the same patient';
  END IF;
  IF split_part(NEW.storage_path, '/', 1) <> NEW.paciente_id::text THEN
    RAISE EXCEPTION 'Document path must be scoped to the patient';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_clinical_document
BEFORE INSERT ON public.clinical_documents
FOR EACH ROW EXECUTE FUNCTION public.validate_clinical_document();

CREATE OR REPLACE FUNCTION public.audit_clinical_document()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.clinical_audit(paciente_id, actor_id, action, record_type, record_id, details)
  VALUES (
    NEW.paciente_id,
    auth.uid(),
    CASE WHEN NEW.replaces_id IS NULL THEN 'upload' ELSE 'nova_versao' END,
    'clinical_documents',
    NEW.id,
    jsonb_build_object('kind', NEW.kind, 'version', NEW.version_number, 'filename', NEW.original_filename)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_clinical_document
AFTER INSERT ON public.clinical_documents
FOR EACH ROW EXECUTE FUNCTION public.audit_clinical_document();

CREATE TRIGGER protect_clinical_documents
BEFORE UPDATE OR DELETE ON public.clinical_documents
FOR EACH ROW EXECUTE FUNCTION public.reject_clinical_record_changes();

CREATE POLICY "clinical files read"
ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'clinical-files'
  AND public.clinical_allowed(auth.uid(), 'download')
  AND EXISTS (
    SELECT 1 FROM public.pacientes p
    WHERE p.id::text = split_part(name, '/', 1)
  )
);

CREATE POLICY "clinical files upload"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'clinical-files'
  AND public.clinical_allowed(auth.uid(), 'upload')
  AND EXISTS (
    SELECT 1 FROM public.pacientes p
    WHERE p.id::text = split_part(name, '/', 1)
  )
);

CREATE OR REPLACE FUNCTION public.log_clinical_file_action(
  _document_id uuid,
  _action text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target public.clinical_documents;
BEGIN
  SELECT * INTO target FROM public.clinical_documents WHERE id = _document_id;
  IF target.id IS NULL
    OR _action NOT IN ('visualizacao', 'download')
    OR NOT public.clinical_allowed(auth.uid(), 'download') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  INSERT INTO public.clinical_audit(paciente_id, actor_id, action, record_type, record_id, details)
  VALUES (target.paciente_id, auth.uid(), _action, 'clinical_documents', target.id,
    jsonb_build_object('kind', target.kind, 'version', target.version_number));
END;
$$;

CREATE INDEX clinical_documents_patient_kind_date_idx
ON public.clinical_documents (paciente_id, kind, document_date DESC, created_at DESC);

CREATE INDEX clinical_documents_version_group_idx
ON public.clinical_documents (version_group_id, version_number DESC);