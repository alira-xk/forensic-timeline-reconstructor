import { apiRequest } from './api';

export type FindingType =
  | 'general'
  | 'suspicious'
  | 'needs_review'
  | 'confirmed'
  | 'contradiction'
  | 'report';

export type InvestigationNote = {
  _id: string;
  case: string;
  fileRecord?: {
    _id: string;
    originalName: string;
    fileType: string;
    sha256Hash: string;
  } | null;
  event?: {
    _id: string;
    title: string;
    eventType: string;
    timestamp: string;
  } | null;
  createdBy?: {
    _id: string;
    name: string;
    email: string;
    role?: string;
  };
  body: string;
  tags: string[];
  findingType: FindingType;
  createdAt: string;
  updatedAt: string;
};

export type CreateNoteInput = {
  caseId: string;
  body: string;
  findingType?: FindingType;
  tags?: string[];
  fileRecord?: string | null;
  event?: string | null;
};

export const getNotesByCase = async (
  caseId: string
): Promise<InvestigationNote[]> => {
  const response = await apiRequest(`/notes/case/${caseId}`);
  return response.data || [];
};

export const createInvestigationNote = async (
  input: CreateNoteInput
): Promise<InvestigationNote> => {
  const response = await apiRequest('/notes', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  return response.data?.note;
};

export const deleteInvestigationNote = async (noteId: string): Promise<void> => {
  await apiRequest(`/notes/${noteId}`, {
    method: 'DELETE',
  });
};
