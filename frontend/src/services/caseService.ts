import { apiRequest } from './api';

export type CaseItem = {
  _id: string;
  userId?: string;
  caseNumber?: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'closed' | 'archived';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  category?: 'cybercrime' | 'fraud' | 'data_breach' | 'insider_threat' | 'malware' | 'other';
  createdAt: string;
  updatedAt: string;
};

export type CreateCaseInput = {
  title: string;
  description: string;
  status?: 'open' | 'in_progress' | 'closed' | 'archived';
};

export type UpdateCaseInput = Partial<Pick<CaseItem, 'title' | 'description' | 'status' | 'priority' | 'category'>>;

export type ChainOfCustodyEntry = {
  _id: string;
  action: string;
  label: string;
  summary: string;
  actor: {
    _id: string;
    name: string;
    email: string;
    role?: string;
  } | null;
  resource: string;
  resourceId: string;
  caseId: string;
  fileId?: string | null;
  fileName?: string;
  success: boolean;
  ipAddress?: string;
  details?: {
    sha256Hash?: string;
    files?: Array<{
      fileId: string;
      originalName: string;
      sha256Hash?: string;
      fileType?: string;
      fileSize?: number;
    }>;
    [key: string]: any;
  };
  createdAt: string;
};

export const createCase = async (input: CreateCaseInput): Promise<CaseItem> => {
  const response = await apiRequest('/cases', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  return response.data?.case;
};

export const getCases = async (): Promise<CaseItem[]> => {
  const response = await apiRequest('/cases');
  return response.data || [];
};

export const getCaseById = async (caseId: string): Promise<CaseItem> => {
  const response = await apiRequest(`/cases/${caseId}`);
  return response.data?.case;
};

export const updateCaseById = async (
  caseId: string,
  input: UpdateCaseInput
): Promise<CaseItem> => {
  const response = await apiRequest(`/cases/${caseId}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });

  return response.data?.case;
};

export const deleteCaseById = async (caseId: string): Promise<void> => {
  await apiRequest(`/cases/${caseId}`, {
    method: 'DELETE',
  });
};

export const getChainOfCustody = async (
  caseId: string
): Promise<ChainOfCustodyEntry[]> => {
  const response = await apiRequest(`/cases/${caseId}/chain-of-custody`);
  return response.data || [];
};
