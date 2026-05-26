import { API_BASE_URL } from './api';

export const getExportJsonUrl = (caseId: string) => {
  return `${API_BASE_URL}/cases/${caseId}/export/json`;
};

export const getExportCsvUrl = (caseId: string) => {
  return `${API_BASE_URL}/cases/${caseId}/export/csv`;
};