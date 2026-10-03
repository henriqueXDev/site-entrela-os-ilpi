CREATE OR REPLACE FUNCTION public.validate_clinical_document()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  previous public.clinical_documents;
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
  IF NEW.replaces_id IS NULL THEN
    IF NEW.version_number <> 1 THEN
      RAISE EXCEPTION 'A new document must start at version 1';
    END IF;
  ELSE
    SELECT * INTO previous FROM public.clinical_documents WHERE id = NEW.replaces_id;
    IF previous.id IS NULL
      OR previous.paciente_id <> NEW.paciente_id
      OR previous.version_group_id <> NEW.version_group_id
      OR previous.kind <> NEW.kind
      OR NEW.version_number <> previous.version_number + 1 THEN
      RAISE EXCEPTION 'Invalid clinical document version chain';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP POLICY "clinical documents upload" ON public.clinical_documents;

CREATE POLICY "clinical documents upload"
ON public.clinical_documents
FOR INSERT TO authenticated
WITH CHECK (
  public.clinical_allowed(auth.uid(), 'upload')
  AND uploaded_by = auth.uid()
);