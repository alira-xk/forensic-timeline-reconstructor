import { apiRequest } from './api';

export type ExtractionResult = {
  success: boolean;
  message: string;
  filesQueued?: number;
  status?: string;
};

export type ExtractionStatus = {
  pending: number;
  processing: number;
  processed: number;
  failed: number;
  total: number;
  totalEvents: number;
  isComplete: boolean;
};

export const extractMetadataForCase = async (
  caseId: string
): Promise<ExtractionResult> => {
  const response = await apiRequest(`/extraction/case/${caseId}`, {
    method: 'POST',
  });

  return {
    success: response.success,
    message: response.message,
    filesQueued: response.data?.filesQueued,
    status: response.data?.status,
  };
};

export const getExtractionStatus = async (
  caseId: string
): Promise<ExtractionStatus> => {
  const response = await apiRequest(`/extraction/status/${caseId}`);
  return response.data;
};

export const extractMetadataForFile = async (
  fileId: string
): Promise<ExtractionResult> => {
  const response = await apiRequest(`/extraction/file/${fileId}`, {
    method: 'POST',
  });

  return {
    success: response.success,
    message: response.message,
    filesQueued: 1,
    status: response.data?.status,
  };
};
