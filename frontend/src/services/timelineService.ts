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
  title?: string;
  timestamp: string;
  originalTimestamp: string;
  eventSource: string;
  description: string;
  isBookmarked?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type GraphNodeType = 'case' | 'file' | 'event' | 'author' | 'gps' | 'timestamp';

export type EvidenceGraphNode = {
  id: string;
  type: GraphNodeType;
  label: string;
};

export type EvidenceGraphLink = {
  source: string;
  target: string;
  relation: string;
};

export type EvidenceGraphData = {
  caseId: string;
  nodes: EvidenceGraphNode[];
  links: EvidenceGraphLink[];
  stats: {
    files: number;
    events: number;
    nodes: number;
    links: number;
  };
};

export const getTimelineByCase = async (
  caseId: string
): Promise<TimelineEvent[]> => {
  const response = await apiRequest(`/timeline/case/${caseId}`);
  return response.data || [];
};

export const getEvidenceGraphByCase = async (
  caseId: string
): Promise<EvidenceGraphData> => {
  const response = await apiRequest(`/timeline/graph/${caseId}`);
  return response.data;
};

export const toggleTimelineBookmark = async (
  eventId: string
): Promise<TimelineEvent> => {
  const response = await apiRequest(`/timeline/bookmark/${eventId}`, {
    method: 'PUT',
  });

  return response.data?.event;
};
