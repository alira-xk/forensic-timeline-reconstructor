import { API_BASE_URL, apiRequest } from './api';

export type EvidenceFile = {
  _id: string;
  caseId: string;
  originalName: string;
  storedName: string;
  fileType: string;
  mimeType: string;
  filePath: string;
  hash: string;
  size: number;
  status: 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED';
  errorReason?: string;
  createdAt: string;
  updatedAt: string;
};

export const getFilesByCase = async (caseId: string): Promise<EvidenceFile[]> => {
  const response = await apiRequest(`/cases/${caseId}/files`);
  return response.data;
};

export const uploadEvidenceFile = async (
  caseId: string,
  file: any
): Promise<EvidenceFile> => {
  const formData = new FormData();

  if (file.file) {
    formData.append('evidence', file.file);
  } else {
    formData.append('evidence', {
      uri: file.uri,
      name: file.name || 'evidence-file',
      type: file.mimeType || 'application/octet-stream',
    } as any);
  }

  const response = await fetch(`${API_BASE_URL}/cases/${caseId}/files`, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'File upload failed');
  }

  return data.data;
};