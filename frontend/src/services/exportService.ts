import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { API_BASE_URL, getAccessToken } from './api';

export const getExportJsonUrl = (caseId: string) => {
  return `${API_BASE_URL}/export/json/${caseId}`;
};

export const getExportCsvUrl = (caseId: string) => {
  return `${API_BASE_URL}/export/csv/${caseId}`;
};

type ExportFormat = 'json' | 'csv';
type DownloadFormat = ExportFormat | 'html';

const getFilenameFromHeaders = (headers: Headers, fallback: string) => {
  const disposition = headers.get('content-disposition') || '';
  const match = disposition.match(/filename="?([^"]+)"?/i);
  return match?.[1] || fallback;
};

const downloadOnWeb = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

const saveOnNative = async (content: string, filename: string) => {
  const fileUri = `${FileSystem.documentDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(fileUri, content, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  return fileUri;
};

export const exportTimeline = async (caseId: string, format: ExportFormat) => {
  const endpoint =
    format === 'json'
      ? getExportJsonUrl(caseId)
      : getExportCsvUrl(caseId);

  return downloadAuthenticatedFile(
    endpoint,
    format,
    `timeline_export_${Date.now()}.${format}`
  );
};

const downloadAuthenticatedFile = async (
  endpoint: string,
  format: DownloadFormat,
  fallbackFilename: string
) => {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('You must be logged in to export files.');
  }

  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const content = await response.text();

  if (!response.ok) {
    try {
      const errorData = JSON.parse(content);
      throw new Error(errorData.message || 'Export failed.');
    } catch (error: any) {
      throw new Error(error.message || 'Export failed.');
    }
  }

  const mimeType =
    format === 'json'
      ? 'application/json'
      : format === 'csv'
        ? 'text/csv'
        : 'text/html';
  const filename = getFilenameFromHeaders(
    response.headers,
    fallbackFilename
  );

  if (Platform.OS === 'web') {
    downloadOnWeb(content, filename, mimeType);
    return { filename };
  }

  const fileUri = await saveOnNative(content, filename);
  return { filename, fileUri };
};

export const exportTimelineJson = (caseId: string) => exportTimeline(caseId, 'json');
export const exportTimelineCsv = (caseId: string) => exportTimeline(caseId, 'csv');

export const exportCaseReportHtml = (caseId: string) =>
  downloadAuthenticatedFile(
    `${API_BASE_URL}/export/report/html/${caseId}`,
    'html',
    `case_report_${Date.now()}.html`
  );

export const exportCaseReportPdf = async (caseId: string) => {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('You must be logged in to export files.');
  }

  const endpoint = `${API_BASE_URL}/export/report/pdf/${caseId}`;
  const fallbackFilename = `case_report_${Date.now()}.pdf`;

  if (Platform.OS !== 'web') {
    const fileUri = `${FileSystem.documentDirectory}${fallbackFilename}`;
    const result = await FileSystem.downloadAsync(endpoint, fileUri, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (result.status < 200 || result.status >= 300) {
      throw new Error('Report export failed.');
    }

    return { filename: fallbackFilename, fileUri: result.uri };
  }

  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const content = await response.text();
    try {
      const errorData = JSON.parse(content);
      throw new Error(errorData.message || 'Report export failed.');
    } catch (error: any) {
      throw new Error(error.message || 'Report export failed.');
    }
  }

  const filename = getFilenameFromHeaders(response.headers, fallbackFilename);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);

  return { filename };
};
