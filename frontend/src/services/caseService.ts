import { apiRequest } from './api';

export type CaseItem = {
  _id: string;
  userId?: string;
  title: string;
  description: string;
  status: 'Active' | 'Pending' | 'Closed';
  createdAt: string;
  updatedAt: string;
};

export type CreateCaseInput = {
  title: string;
  description: string;
  status?: 'Active' | 'Pending' | 'Closed';
};

export const createCase = async (input: CreateCaseInput): Promise<CaseItem> => {
  const response = await apiRequest('/cases', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  return response.data;
};

export const getCases = async (): Promise<CaseItem[]> => {
  const response = await apiRequest('/cases');
  return response.data || [];
};

export const getCaseById = async (caseId: string): Promise<CaseItem> => {
  const response = await apiRequest(`/cases/${caseId}`);
  return response.data;
};

export const deleteCaseById = async (caseId: string): Promise<void> => {
  await apiRequest(`/cases/${caseId}`, {
    method: 'DELETE',
  });
};