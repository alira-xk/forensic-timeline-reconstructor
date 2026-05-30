import { apiRequest } from './api';

export type AiSuspiciousFinding = {
  severity: 'low' | 'medium' | 'high';
  title: string;
  reason: string;
  relatedEvidence: string;
};

export type AiCaseAnalysis = {
  caseSummary: string;
  suspiciousFindings: AiSuspiciousFinding[];
  timelineObservations: string[];
  metadataConcerns: string[];
  recommendedNextSteps: string[];
  reportDraft: string;
};

export type AiCaseSummaryResponse = {
  analysis: AiCaseAnalysis;
  provider?: string;
  model: string;
  generatedAt: string;
  limits: {
    filesIncluded: number;
    totalFiles: number;
    eventsIncluded: number;
    totalEvents: number;
    notesIncluded: number;
    totalNotes: number;
  };
};

export const generateAiCaseSummary = async (
  caseId: string
): Promise<AiCaseSummaryResponse> => {
  const response = await apiRequest(`/ai/case/${caseId}/summary`, {
    method: 'POST',
  });

  return response.data;
};
