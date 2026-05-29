import { apiRequest } from './api';

export type ExtractionResult = {
  success: boolean;
  message: string;
  filesQueued?: number;
  status?: string;
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