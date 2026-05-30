const OpenAI = require('openai');
const Groq = require('groq-sdk');
const Case = require('../models/Case');
const FileRecord = require('../models/FileRecord');
const Event = require('../models/Event');
const InvestigationNote = require('../models/InvestigationNote');
const AuditLog = require('../models/AuditLog');
const { successResponse, errorResponse } = require('../utils/response');
const { logAudit, AUDIT_ACTIONS } = require('../utils/auditLogger');
const logger = require('../utils/logger');

let openaiClient;
let groqClient;

const getAiProvider = () => String(process.env.AI_PROVIDER || 'openai').trim().toLowerCase();

const getOpenAIClient = () => {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  return openaiClient;
};

const getGroqClient = () => {
  if (!process.env.GROQ_API_KEY) {
    return null;
  }

  if (!groqClient) {
    groqClient = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
  }

  return groqClient;
};

const truncate = (value = '', maxLength = 900) => {
  const text = String(value || '');
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
};

const compactCasePayload = ({ caseData, files, events, notes, custodyLogs }) => ({
  case: {
    id: caseData._id.toString(),
    title: caseData.title,
    caseNumber: caseData.caseNumber,
    status: caseData.status,
    priority: caseData.priority,
    category: caseData.category,
    description: truncate(caseData.description, 800),
    createdAt: caseData.createdAt,
    updatedAt: caseData.updatedAt,
  },
  files: files.slice(0, 40).map((file) => ({
    id: file._id.toString(),
    name: file.originalName,
    type: file.fileType,
    mimeType: file.mimeType,
    size: file.fileSize,
    sha256Hash: file.sha256Hash,
    status: file.status,
    errorReason: truncate(file.errorReason, 300),
    eventsExtracted: file.eventsExtracted,
    uploadedAt: file.createdAt,
  })),
  timelineEvents: events.slice(0, 120).map((event) => ({
    id: event._id.toString(),
    timestamp: event.timestamp,
    originalTimestamp: event.originalTimestamp,
    eventType: event.eventType,
    eventSource: event.eventSource,
    title: event.title,
    description: truncate(event.description, 500),
    confidence: event.confidence,
    isBookmarked: event.isBookmarked,
    sourceFile: event.fileRecord?.originalName || '',
    metadata: event.metadata || {},
  })),
  notes: notes.slice(0, 40).map((note) => ({
    id: note._id.toString(),
    findingType: note.findingType,
    body: truncate(note.body, 700),
    tags: note.tags || [],
    createdAt: note.createdAt,
    sourceFile: note.fileRecord?.originalName || '',
    eventTitle: note.event?.title || '',
  })),
  custody: custodyLogs.slice(-50).map((log) => ({
    action: log.action,
    success: log.success,
    createdAt: log.createdAt,
    actor: log.user?.name || log.user?.email || 'System',
    resource: log.resource,
    details: log.details || {},
  })),
  limits: {
    filesIncluded: Math.min(files.length, 40),
    totalFiles: files.length,
    eventsIncluded: Math.min(events.length, 120),
    totalEvents: events.length,
    notesIncluded: Math.min(notes.length, 40),
    totalNotes: notes.length,
  },
});

const parseAiJson = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error('AI response was not valid JSON.');
  }
};

const normalizeAnalysis = (analysis = {}) => ({
  caseSummary: String(analysis.caseSummary || 'No summary was generated.'),
  suspiciousFindings: Array.isArray(analysis.suspiciousFindings)
    ? analysis.suspiciousFindings.map((finding) => ({
        severity: ['low', 'medium', 'high'].includes(finding?.severity)
          ? finding.severity
          : 'low',
        title: String(finding?.title || 'Finding'),
        reason: String(finding?.reason || ''),
        relatedEvidence: String(finding?.relatedEvidence || ''),
      }))
    : [],
  timelineObservations: Array.isArray(analysis.timelineObservations)
    ? analysis.timelineObservations.map(String)
    : [],
  metadataConcerns: Array.isArray(analysis.metadataConcerns)
    ? analysis.metadataConcerns.map(String)
    : [],
  recommendedNextSteps: Array.isArray(analysis.recommendedNextSteps)
    ? analysis.recommendedNextSteps.map(String)
    : [],
  reportDraft: String(analysis.reportDraft || ''),
});

const getAiPrompt = (payload) => `Analyze this forensic case payload and return JSON with keys:
{
  "caseSummary": "3-5 concise sentences",
  "suspiciousFindings": [{"severity":"low|medium|high","title":"...","reason":"...","relatedEvidence":"..."}],
  "timelineObservations": ["..."],
  "metadataConcerns": ["..."],
  "recommendedNextSteps": ["..."],
  "reportDraft": "short formal findings paragraph"
}

Case payload:
${JSON.stringify(payload)}`;

const generateWithOpenAI = async (payload) => {
  const client = getOpenAIClient();
  if (!client) {
    const err = new Error('OPENAI_API_KEY is missing. Add it to forensic-backend/.env and restart the backend.');
    err.status = 503;
    err.code = 'AI_NOT_CONFIGURED';
    throw err;
  }

  const model = process.env.OPENAI_MODEL || process.env.AI_MODEL || 'gpt-4.1-mini';
  const response = await client.responses.create({
    model,
    instructions: [
      'You are a careful digital forensics assistant.',
      'Analyze only the provided case data. Do not invent facts.',
      'Flag uncertainty clearly. Do not claim legal conclusions.',
      'Return only valid JSON with the requested keys.',
    ].join(' '),
    input: getAiPrompt(payload),
  }, {
    timeout: 60000,
    maxRetries: 1,
  });

  return {
    model,
    provider: 'openai',
    text: response.output_text || '',
  };
};

const generateWithGroq = async (payload) => {
  const client = getGroqClient();
  if (!client) {
    const err = new Error('GROQ_API_KEY is missing. Add it to forensic-backend/.env and restart the backend.');
    err.status = 503;
    err.code = 'AI_NOT_CONFIGURED';
    throw err;
  }

  const model = process.env.GROQ_MODEL || process.env.AI_MODEL || 'llama-3.1-8b-instant';
  const response = await client.chat.completions.create({
    model,
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: [
          'You are a careful digital forensics assistant.',
          'Analyze only the provided case data. Do not invent facts.',
          'Flag uncertainty clearly. Do not claim legal conclusions.',
          'Return only valid JSON with the requested keys.',
        ].join(' '),
      },
      {
        role: 'user',
        content: getAiPrompt(payload),
      },
    ],
  });

  return {
    model,
    provider: 'groq',
    text: response.choices?.[0]?.message?.content || '',
  };
};

const generateAiAnalysis = async (payload) => {
  const provider = getAiProvider();

  if (provider === 'groq') {
    return generateWithGroq(payload);
  }

  if (provider === 'openai') {
    return generateWithOpenAI(payload);
  }

  const err = new Error(`Unsupported AI_PROVIDER "${provider}". Use "groq" or "openai".`);
  err.status = 400;
  err.code = 'AI_PROVIDER_UNSUPPORTED';
  throw err;
};

exports.generateCaseSummary = async (req, res, next) => {
  try {
    const { caseId } = req.params;
    const caseData = await Case.findOne({ _id: caseId, investigator: req.user._id })
      .populate('investigator', 'name email role')
      .lean();

    if (!caseData) {
      return errorResponse(res, 'Case not found.', 404);
    }

    const [files, events, notes, custodyLogs] = await Promise.all([
      FileRecord.find({ case: caseId }).sort({ createdAt: 1 }).lean(),
      Event.find({ case: caseId })
        .sort({ timestamp: 1 })
        .populate('fileRecord', 'originalName fileType sha256Hash')
        .lean(),
      InvestigationNote.find({ case: caseId })
        .sort({ createdAt: -1 })
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

    const payload = compactCasePayload({ caseData, files, events, notes, custodyLogs });

    const aiResult = await generateAiAnalysis(payload);
    const aiText = aiResult.text || '';
    if (!aiText.trim()) {
      return errorResponse(
        res,
        'AI returned an empty response. Try again, or check your AI provider/model in forensic-backend/.env.',
        502,
        'AI_EMPTY_RESPONSE'
      );
    }

    const analysis = normalizeAnalysis(parseAiJson(aiText));

    logAudit(req.user._id, AUDIT_ACTIONS.AI_SUMMARY_GENERATED, 'Case', caseId, {
      caseId,
      provider: aiResult.provider,
      model: aiResult.model,
      eventsIncluded: payload.limits.eventsIncluded,
      filesIncluded: payload.limits.filesIncluded,
      notesIncluded: payload.limits.notesIncluded,
    }, req.ip);

    return successResponse(res, 'AI case summary generated.', {
      analysis,
      provider: aiResult.provider,
      model: aiResult.model,
      generatedAt: new Date().toISOString(),
      limits: payload.limits,
    });
  } catch (err) {
    logger.error('AI case summary failed', {
      message: err.message,
      status: err.status,
      code: err.code,
      type: err.type,
      cause: err.cause?.message,
    });

    if (err?.status || err?.code) {
      const connectionHint =
        err.code === 'ECONNRESET' ||
        err.code === 'ETIMEDOUT' ||
        err.code === 'ENOTFOUND' ||
        err.code === 'APIConnectionError';
      const quotaHint =
        err.status === 429 ||
        err.code === 'insufficient_quota';
      const missingConfigHint = err.code === 'AI_NOT_CONFIGURED';

      return errorResponse(
        res,
        missingConfigHint
          ? err.message
          : quotaHint
          ? 'OpenAI quota is unavailable for this API key. Check billing/credits on your OpenAI account, then try again.'
          : connectionHint
          ? 'Could not connect to OpenAI. Check your internet/VPN/firewall, then try again.'
          : err.message || 'AI request failed.',
        err.status || 502,
        'AI_REQUEST_FAILED'
      );
    }

    next(err);
  }
};
