export interface Document {
  id: string;
  unit_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  processing_status: string;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentUpdate {
  file_name?: string;
}
