export type DocumentRecord = {
  id: string;
  file_name: string;
  file_path: string;
  summary: string | null;
  created_at: string;
};

export type ListDocumentsResponse = {
  documents: DocumentRecord[];
};
