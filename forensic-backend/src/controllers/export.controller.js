const Event = require('../models/Event');
const Case = require('../models/Case');
const FileRecord = require('../models/FileRecord');
const AuditLog = require('../models/AuditLog');
const InvestigationNote = require('../models/InvestigationNote');
const { errorResponse } = require('../utils/response');
const { logAudit, AUDIT_ACTIONS } = require('../utils/auditLogger');
const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');

const buildQuery = (caseId, query) => {
  const filter = { case: caseId };
  if (query.startDate || query.endDate) {
    filter.timestamp = {};
    if (query.startDate) filter.timestamp.$gte = new Date(query.startDate);
    if (query.endDate) filter.timestamp.$lte = new Date(query.endDate);
  }
  if (query.eventType) filter.eventType = { $in: query.eventType.split(',') };
  if (query.eventSource) filter.eventSource = { $in: query.eventSource.split(',') };
  if (query.fileId) filter.fileRecord = query.fileId;
  if (query.bookmarked === 'true') filter.isBookmarked = true;
  if (query.search) {
    filter.$or = [
      { title: { $regex: query.search, $options: 'i' } },
      { description: { $regex: query.search, $options: 'i' } },
    ];
  }
  return filter;
};

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const formatDateTime = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleString('en-US', { timeZone: 'UTC' }) + ' UTC';
};

const formatBytes = (bytes = 0) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const renderRows = (items, rowRenderer, emptyText) => {
  if (!items.length) {
    return `<tr><td colspan="6" class="muted">${escapeHtml(emptyText)}</td></tr>`;
  }

  return items.map(rowRenderer).join('');
};

const buildReportHtml = ({ caseData, files, events, bookmarkedEvents, notes, custodyLogs, investigator }) => {
  const generatedAt = new Date();
  const status = caseData.status ? caseData.status.replace('_', ' ') : 'unknown';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(caseData.caseNumber || 'Case')}-forensic-report</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #172033;
      --muted: #667085;
      --line: #d7dee8;
      --panel: #f6f8fb;
      --accent: #2457c5;
      --danger: #b42318;
      --success: #067647;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: var(--ink);
      background: #ffffff;
      font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
      line-height: 1.45;
    }
    .page {
      max-width: 1040px;
      margin: 0 auto;
      padding: 44px;
    }
    header {
      border-bottom: 3px solid var(--ink);
      padding-bottom: 24px;
      margin-bottom: 28px;
    }
    .eyebrow {
      color: var(--accent);
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    h1 {
      font-size: 34px;
      line-height: 1.1;
      margin: 0 0 10px;
    }
    h2 {
      font-size: 20px;
      margin: 34px 0 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--line);
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      margin-top: 22px;
    }
    .metric {
      background: var(--panel);
      border: 1px solid var(--line);
      padding: 14px;
      border-radius: 8px;
    }
    .metric span {
      display: block;
      color: var(--muted);
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
    }
    .metric strong {
      display: block;
      font-size: 24px;
      margin-top: 4px;
    }
    dl {
      display: grid;
      grid-template-columns: 180px 1fr;
      gap: 8px 16px;
      margin: 0;
    }
    dt {
      color: var(--muted);
      font-weight: 800;
    }
    dd {
      margin: 0;
      overflow-wrap: anywhere;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid var(--line);
      margin-top: 10px;
    }
    th, td {
      border-bottom: 1px solid var(--line);
      padding: 10px;
      text-align: left;
      vertical-align: top;
      font-size: 13px;
    }
    th {
      background: var(--panel);
      color: var(--muted);
      font-size: 11px;
      text-transform: uppercase;
    }
    .hash {
      font-family: Consolas, monospace;
      font-size: 11px;
      overflow-wrap: anywhere;
    }
    .tag {
      display: inline-block;
      border-radius: 999px;
      padding: 3px 8px;
      background: #e8eefc;
      color: var(--accent);
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
    }
    .muted { color: var(--muted); }
    .failed { color: var(--danger); font-weight: 800; }
    .verified { color: var(--success); font-weight: 800; }
    .note {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 10px;
      break-inside: avoid;
    }
    .note p { margin: 8px 0 0; }
    footer {
      margin-top: 38px;
      padding-top: 14px;
      border-top: 1px solid var(--line);
      color: var(--muted);
      font-size: 12px;
    }
    @media print {
      body { background: #fff; }
      .page { max-width: none; padding: 24px; }
      h2, table, .note, .metric { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <main class="page">
    <header>
      <div class="eyebrow">Forensic Timeline Reconstructor</div>
      <h1>${escapeHtml(caseData.title)}</h1>
      <dl>
        <dt>Case Number</dt><dd>${escapeHtml(caseData.caseNumber || 'N/A')}</dd>
        <dt>Status</dt><dd>${escapeHtml(status)}</dd>
        <dt>Investigator</dt><dd>${escapeHtml(investigator?.name || investigator?.email || 'N/A')}</dd>
        <dt>Generated</dt><dd>${escapeHtml(formatDateTime(generatedAt))}</dd>
        <dt>Description</dt><dd>${escapeHtml(caseData.description || 'No description provided.')}</dd>
      </dl>
      <section class="summary">
        <div class="metric"><span>Evidence Files</span><strong>${files.length}</strong></div>
        <div class="metric"><span>Timeline Events</span><strong>${events.length}</strong></div>
        <div class="metric"><span>Bookmarks</span><strong>${bookmarkedEvents.length}</strong></div>
        <div class="metric"><span>Notes</span><strong>${notes.length}</strong></div>
      </section>
    </header>

    <section>
      <h2>Evidence Inventory</h2>
      <table>
        <thead><tr><th>File</th><th>Type</th><th>Size</th><th>Status</th><th>SHA-256</th></tr></thead>
        <tbody>
          ${renderRows(files, (file) => `
            <tr>
              <td>${escapeHtml(file.originalName)}</td>
              <td>${escapeHtml(file.fileType)}</td>
              <td>${escapeHtml(formatBytes(file.fileSize))}</td>
              <td>${escapeHtml(file.status)}</td>
              <td class="hash">${escapeHtml(file.sha256Hash || 'N/A')}</td>
            </tr>
          `, 'No evidence files uploaded.')}
        </tbody>
      </table>
    </section>

    <section>
      <h2>Key Timeline Events</h2>
      <table>
        <thead><tr><th>Timestamp</th><th>Type</th><th>Source File</th><th>Description</th><th>Bookmark</th></tr></thead>
        <tbody>
          ${renderRows(events.slice(0, 75), (event) => `
            <tr>
              <td>${escapeHtml(formatDateTime(event.timestamp))}</td>
              <td>${escapeHtml(event.eventType)}</td>
              <td>${escapeHtml(event.fileRecord?.originalName || 'N/A')}</td>
              <td>${escapeHtml(event.description || event.title || 'N/A')}</td>
              <td>${event.isBookmarked ? '<span class="tag">Yes</span>' : '<span class="muted">No</span>'}</td>
            </tr>
          `, 'No timeline events extracted.')}
        </tbody>
      </table>
    </section>

    <section>
      <h2>Investigator Notes</h2>
      ${notes.length ? notes.map((note) => `
        <article class="note">
          <span class="tag">${escapeHtml(note.findingType.replace('_', ' '))}</span>
          <span class="muted">${escapeHtml(formatDateTime(note.createdAt))} by ${escapeHtml(note.createdBy?.name || note.createdBy?.email || 'Investigator')}</span>
          <p>${escapeHtml(note.body)}</p>
        </article>
      `).join('') : '<p class="muted">No investigation notes recorded.</p>'}
    </section>

    <section>
      <h2>Chain of Custody Summary</h2>
      <table>
        <thead><tr><th>Time</th><th>Action</th><th>Actor</th><th>Result</th></tr></thead>
        <tbody>
          ${renderRows(custodyLogs, (log) => `
            <tr>
              <td>${escapeHtml(formatDateTime(log.createdAt))}</td>
              <td>${escapeHtml(log.action.replace(/_/g, ' ').toLowerCase())}</td>
              <td>${escapeHtml(log.user?.name || log.user?.email || 'System')}</td>
              <td class="${log.success ? 'verified' : 'failed'}">${log.success ? 'Verified' : 'Failed'}</td>
            </tr>
          `, 'No custody records found.')}
        </tbody>
      </table>
    </section>

    <footer>
      Report generated from locally stored case data. Validate source evidence with the listed SHA-256 hashes before submission.
    </footer>
  </main>
</body>
</html>`;
};

const getCaseReportData = async (caseId, userId) => {
  const caseData = await Case.findOne({ _id: caseId, investigator: userId })
    .populate('investigator', 'name email role')
    .lean();

  if (!caseData) {
    return null;
  }

  const [files, events, notes, custodyLogs] = await Promise.all([
    FileRecord.find({ case: caseId }).sort({ createdAt: 1 }).lean(),
    Event.find({ case: caseId })
      .sort({ timestamp: 1 })
      .populate('fileRecord', 'originalName fileType sha256Hash')
      .lean(),
    InvestigationNote.find({ case: caseId })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name email role')
      .populate('fileRecord', 'originalName fileType sha256Hash')
      .populate('event', 'title eventType timestamp')
      .lean(),
    AuditLog.find({
      $or: [
        { resource: 'Case', resourceId: caseId },
        { 'details.caseId': caseId },
      ],
    })
      .sort({ createdAt: 1 })
      .populate('user', 'name email role')
      .lean(),
  ]);

  return {
    caseData,
    files,
    events,
    bookmarkedEvents: events.filter((event) => event.isBookmarked),
    notes,
    custodyLogs,
    investigator: caseData.investigator,
  };
};

const addPdfSectionTitle = (doc, title) => {
  doc.moveDown(1.3);
  doc.fontSize(15).fillColor('#172033').font('Helvetica-Bold').text(title);
  doc.moveTo(doc.x, doc.y + 4).lineTo(552, doc.y + 4).strokeColor('#d7dee8').stroke();
  doc.moveDown(0.7);
};

const addPdfKeyValue = (doc, label, value) => {
  doc.fontSize(9).fillColor('#667085').font('Helvetica-Bold').text(label, { continued: true });
  doc.fillColor('#172033').font('Helvetica').text(`  ${value || 'N/A'}`);
};

const addPdfWrappedLine = (doc, text, options = {}) => {
  doc.fontSize(options.size || 9).fillColor(options.color || '#172033').font(options.font || 'Helvetica');
  doc.text(text || 'N/A', {
    width: options.width || 500,
    ellipsis: true,
  });
};

const buildReportPdf = (res, reportData) => {
  const { caseData, files, events, bookmarkedEvents, notes, custodyLogs, investigator } = reportData;
  const doc = new PDFDocument({
    size: 'A4',
    margin: 42,
    info: {
      Title: `${caseData.caseNumber || 'Case'} Forensic Report`,
      Author: investigator?.name || investigator?.email || 'Forensic Timeline Reconstructor',
      Subject: 'Digital evidence investigation report',
    },
  });

  doc.pipe(res);

  doc
    .fontSize(10)
    .fillColor('#2457c5')
    .font('Helvetica-Bold')
    .text('FORENSIC TIMELINE RECONSTRUCTOR');

  doc
    .moveDown(0.4)
    .fontSize(24)
    .fillColor('#172033')
    .font('Helvetica-Bold')
    .text(caseData.title || 'Case Report', { width: 500 });

  doc.moveDown(0.5);
  addPdfKeyValue(doc, 'Case Number', caseData.caseNumber);
  addPdfKeyValue(doc, 'Status', caseData.status?.replace('_', ' '));
  addPdfKeyValue(doc, 'Investigator', investigator?.name || investigator?.email);
  addPdfKeyValue(doc, 'Generated', formatDateTime(new Date()));
  addPdfKeyValue(doc, 'Description', caseData.description || 'No description provided.');

  doc.moveDown(1);
  doc.fontSize(11).fillColor('#172033').font('Helvetica-Bold');
  doc.text(`Evidence Files: ${files.length}`, 42, doc.y, { continued: true, width: 130 });
  doc.text(`Timeline Events: ${events.length}`, { continued: true, width: 150 });
  doc.text(`Bookmarks: ${bookmarkedEvents.length}`, { continued: true, width: 110 });
  doc.text(`Notes: ${notes.length}`);

  addPdfSectionTitle(doc, 'Evidence Inventory');
  if (!files.length) {
    addPdfWrappedLine(doc, 'No evidence files uploaded.', { color: '#667085' });
  } else {
    files.forEach((file, index) => {
      doc.fontSize(10).fillColor('#172033').font('Helvetica-Bold').text(`${index + 1}. ${file.originalName}`);
      addPdfWrappedLine(doc, `Type: ${file.fileType} | Size: ${formatBytes(file.fileSize)} | Status: ${file.status}`, { color: '#667085' });
      addPdfWrappedLine(doc, `SHA-256: ${file.sha256Hash || 'N/A'}`, { font: 'Courier', size: 8, color: '#667085' });
      doc.moveDown(0.4);
    });
  }

  addPdfSectionTitle(doc, 'Key Timeline Events');
  if (!events.length) {
    addPdfWrappedLine(doc, 'No timeline events extracted.', { color: '#667085' });
  } else {
    events.slice(0, 50).forEach((event, index) => {
      doc.fontSize(9).fillColor('#172033').font('Helvetica-Bold').text(`${index + 1}. ${formatDateTime(event.timestamp)} | ${event.eventType}`);
      addPdfWrappedLine(doc, event.description || event.title || 'N/A', { width: 500 });
      addPdfWrappedLine(doc, `Source: ${event.fileRecord?.originalName || 'N/A'}${event.isBookmarked ? ' | Bookmarked' : ''}`, { color: '#667085' });
      doc.moveDown(0.35);
    });
    if (events.length > 50) {
      addPdfWrappedLine(doc, `${events.length - 50} additional events omitted from PDF summary. Use JSON/CSV export for the complete timeline.`, { color: '#667085' });
    }
  }

  addPdfSectionTitle(doc, 'Investigator Notes');
  if (!notes.length) {
    addPdfWrappedLine(doc, 'No investigation notes recorded.', { color: '#667085' });
  } else {
    notes.forEach((note, index) => {
      doc.fontSize(9).fillColor('#2457c5').font('Helvetica-Bold').text(`${index + 1}. ${note.findingType.replace('_', ' ').toUpperCase()} | ${formatDateTime(note.createdAt)}`);
      addPdfWrappedLine(doc, note.body, { width: 500 });
      addPdfWrappedLine(doc, `Added by: ${note.createdBy?.name || note.createdBy?.email || 'Investigator'}`, { color: '#667085' });
      doc.moveDown(0.45);
    });
  }

  addPdfSectionTitle(doc, 'Chain of Custody Summary');
  if (!custodyLogs.length) {
    addPdfWrappedLine(doc, 'No custody records found.', { color: '#667085' });
  } else {
    custodyLogs.slice(-30).forEach((log, index) => {
      const status = log.success ? 'Verified' : 'Failed';
      doc.fontSize(9).fillColor('#172033').font('Helvetica-Bold').text(`${index + 1}. ${formatDateTime(log.createdAt)} | ${log.action.replace(/_/g, ' ').toLowerCase()} | ${status}`);
      addPdfWrappedLine(doc, `Actor: ${log.user?.name || log.user?.email || 'System'}`, { color: '#667085' });
      doc.moveDown(0.35);
    });
  }

  doc.moveDown(1.2);
  doc.fontSize(8).fillColor('#667085').font('Helvetica').text(
    'Report generated from locally stored case data. Validate source evidence with the listed SHA-256 hashes before submission.',
    { width: 500 }
  );

  doc.end();
};

exports.exportJSON = async (req, res, next) => {
  try {
    const { caseId } = req.params;
    const caseData = await Case.findOne({ _id: caseId, investigator: req.user._id });
    if (!caseData) return errorResponse(res, 'Case not found.', 404);

    const filter = buildQuery(caseId, req.query);
    const events = await Event.find(filter)
      .sort({ timestamp: 1 })
      .populate('fileRecord', 'originalName fileType');

    const filename = `${caseData.caseNumber}_timeline_${Date.now()}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    logAudit(req.user._id, AUDIT_ACTIONS.EXPORT_GENERATED, 'Case', caseId, {
      caseId,
      format: 'json',
      count: events.length,
    }, req.ip);

    return res.json({
      caseNumber: caseData.caseNumber,
      caseTitle: caseData.title,
      exportDate: new Date().toISOString(),
      totalEvents: events.length,
      events,
    });
  } catch (err) { next(err); }
};

exports.exportCSV = async (req, res, next) => {
  try {
    const { caseId } = req.params;
    const caseData = await Case.findOne({ _id: caseId, investigator: req.user._id });
    if (!caseData) return errorResponse(res, 'Case not found.', 404);

    const filter = buildQuery(caseId, req.query);
    const events = await Event.find(filter)
      .sort({ timestamp: 1 })
      .populate('fileRecord', 'originalName fileType')
      .lean();

    const rows = events.map((e) => ({
      timestamp: e.timestamp,
      originalTimestamp: e.originalTimestamp,
      eventType: e.eventType,
      eventSource: e.eventSource,
      title: e.title,
      description: e.description,
      confidence: e.confidence,
      sourceFile: e.fileRecord?.originalName || '',
      isBookmarked: e.isBookmarked,
      tags: (e.tags || []).join('; '),
    }));

    const parser = new Parser({
      fields: ['timestamp', 'originalTimestamp', 'eventType', 'eventSource', 'title', 'description', 'confidence', 'sourceFile', 'isBookmarked', 'tags'],
    });
    const csv = parser.parse(rows);

    const filename = `${caseData.caseNumber}_timeline_${Date.now()}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    logAudit(req.user._id, AUDIT_ACTIONS.EXPORT_GENERATED, 'Case', caseId, {
      caseId,
      format: 'csv',
      count: events.length,
    }, req.ip);

    return res.send(csv);
  } catch (err) { next(err); }
};

exports.exportCaseReportHTML = async (req, res, next) => {
  try {
    const { caseId } = req.params;
    const reportData = await getCaseReportData(caseId, req.user._id);
    if (!reportData) return errorResponse(res, 'Case not found.', 404);

    const html = buildReportHtml(reportData);

    const filename = `${reportData.caseData.caseNumber || 'case'}_report_${Date.now()}.html`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    logAudit(req.user._id, AUDIT_ACTIONS.EXPORT_GENERATED, 'Case', caseId, {
      caseId,
      format: 'html_report',
      count: reportData.events.length,
      notes: reportData.notes.length,
      files: reportData.files.length,
    }, req.ip);

    return res.send(html);
  } catch (err) {
    next(err);
  }
};

exports.exportCaseReportPDF = async (req, res, next) => {
  try {
    const { caseId } = req.params;
    const reportData = await getCaseReportData(caseId, req.user._id);
    if (!reportData) return errorResponse(res, 'Case not found.', 404);

    const filename = `${reportData.caseData.caseNumber || 'case'}_report_${Date.now()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    logAudit(req.user._id, AUDIT_ACTIONS.EXPORT_GENERATED, 'Case', caseId, {
      caseId,
      format: 'pdf_report',
      count: reportData.events.length,
      notes: reportData.notes.length,
      files: reportData.files.length,
    }, req.ip);

    return buildReportPdf(res, reportData);
  } catch (err) {
    next(err);
  }
};
