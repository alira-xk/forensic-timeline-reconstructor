import { apiRequest } from './api';

export type TimelineEvent = {
  _id: string;
  caseId: string;
  fileId?: {
    _id: string;
    originalName: string;
    fileType: string;
    hash: string;
  };
  eventType: string;
  timestamp: string;
  rawTimestamp: string;
  source: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};

export const getTimelineByCase = async (
  caseId: string
): Promise<TimelineEvent[]> => {
  const response = await apiRequest(`/cases/${caseId}/timeline`);
  return response.data;
};