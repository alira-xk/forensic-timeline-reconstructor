import { API_BASE_URL, apiRequest, getAccessToken } from './api';

export type EvidenceFile = {
  _id: string;
  case: string;
  originalName: string;
  storedName: string;
  fileType: string;
  mimeType: string;
  filePath: string;
  sha256Hash: string;
  fileSize: number;
  status: 'pending' | 'processing' | 'processed' | 'failed';
  errorReason?: string;
  createdAt: string;
  updatedAt: string;
};

export const getFilesByCase = async (caseId: string): Promise<EvidenceFile[]> => {
  const response = await apiRequest(`/files/case/${caseId}`);
  return response.data || [];
};

export const uploadEvidenceFile = async (
  caseId: string,
  file: any
): Promise<EvidenceFile[]> => {
  const formData = new FormData();

  if (file.file) {
    formData.append('files', file.file);
  } else {
    formData.append('files', {
      uri: file.uri,
      name: file.name || 'evidence-file',
      type: file.mimeType || 'application/octet-stream',
    } as any);
  }

  const accessToken = await getAccessToken();
  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;

  const response = await fetch(`${API_BASE_URL}/files/upload/${caseId}`, {
    method: 'POST',
    body: formData,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'File upload failed');
  }

  return data.data?.files || [];
};