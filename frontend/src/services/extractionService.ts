import { apiRequest } from './api';

export type ExtractionResult = {
  success: boolean;
  message: string;
  extractedFiles: number;
  eventsCreated: number;
  results: {
    fileId: string;
    originalName: string;
    status: string;
    eventsFound?: number;
    error?: string;
  }[];
};

export const extractMetadataForCase = async (
  caseId: string
): Promise<ExtractionResult> => {
  const response = await apiRequest(`/cases/${caseId}/extract`, {
    method: 'POST',
  });

  return response;
};