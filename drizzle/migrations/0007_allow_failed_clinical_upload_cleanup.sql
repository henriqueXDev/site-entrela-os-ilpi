CREATE POLICY "clinical failed upload cleanup"
ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'clinical-files'
  AND public.clinical_allowed(auth.uid(), 'upload')
  AND owner_id = auth.uid()::text
  AND NOT EXISTS (
    SELECT 1 FROM public.clinical_documents d
    WHERE d.storage_path = name
  )
);