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

export const uploadEvidenceFiles = async (
  caseId: string,
  files: any[]
): Promise<EvidenceFile[]> => {
  const formData = new FormData();

  for (const file of files) {
    if (file.file) {
      formData.append('files', file.file);
      continue;
    }

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

// Backward-compatible alias for existing single-file call sites.
export const uploadEvidenceFile = async (
  caseId: string,
  file: any
): Promise<EvidenceFile[]> => uploadEvidenceFiles(caseId, [file]);

export const getFilePreviewUrl = async (fileId: string): Promise<string> => {
  const accessToken = await getAccessToken();
  const tokenQuery = accessToken ? `?token=${encodeURIComponent(accessToken)}` : '';
  return `${API_BASE_URL}/files/${fileId}/preview${tokenQuery}`;
};

export const getFileDownloadUrl = async (fileId: string): Promise<string> => {
  const accessToken = await getAccessToken();
  const tokenQuery = accessToken ? `?token=${encodeURIComponent(accessToken)}` : '';
  return `${API_BASE_URL}/files/${fileId}/download${tokenQuery}`;
};

export const getTextFilePreview = async (fileId: string): Promise<string> => {
  const accessToken = await getAccessToken();
  const response = await fetch(`${API_BASE_URL}/files/${fileId}/preview`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });

  const text = await response.text();
  if (!response.ok) {
    try {
      const errorData = JSON.parse(text);
      throw new Error(errorData.message || 'File preview failed.');
    } catch (error: any) {
      throw new Error(error.message || 'File preview failed.');
    }
  }

  return text;
};
