import { apiRequest } from './api';

export type TimelineEvent = {
  _id: string;
  case: string;
  fileRecord?: {
    _id: string;
    originalName: string;
    fileType: string;
    sha256Hash: string;
  };
  eventType: string;
  timestamp: string;
  originalTimestamp: string;
  eventSource: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};

export const getTimelineByCase = async (
  caseId: string
): Promise<TimelineEvent[]> => {
  const response = await apiRequest(`/timeline/case/${caseId}`);
  return response.data || [];
};