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
let openaiClientKey;
let groqClientKey;

const getAiProvider = () => String(process.env.AI_PROVIDER || 'openai').trim().toLowerCase();

const getOpenAIClient = () => {
  const apiKey = String(process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) {
    return null;
  }

  if (!openaiClient || openaiClientKey !== apiKey) {
    openaiClient = new OpenAI({
      apiKey,
    });
    openaiClientKey = apiKey;
  }

  return openaiClient;
};

const getGroqClient = () => {
  const apiKey = String(process.env.GROQ_API_KEY || '').trim();
  if (!apiKey) {
    return null;
  }

  if (!groqClient || groqClientKey !== apiKey) {
    groqClient = new Groq({
      apiKey,
    });
    groqClientKey = apiKey;
  }

  return groqClient;
};

const truncate = (value = '', maxLength = 900) => {
  const text = String(value || '');
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
};

const getAiPayloadLimits = () => ({
  files: Number(process.env.AI_MAX_FILES || 12),
  events: Number(process.env.AI_MAX_EVENTS || 35),
  notes: Number(process.env.AI_MAX_NOTES || 12),
  custody: Number(process.env.AI_MAX_CUSTODY_LOGS || 15),
});

const pickImportantEvents = (events, maxEvents) => {
  const bookmarked = events.filter((event) => event.isBookmarked);
  const errorsOrConcerns = events.filter((event) => (
    /error|failed|missing|unknown|modified|deleted|created/i.test(
      `${event.eventType || ''} ${event.title || ''} ${event.description || ''}`
    )
  ));
  const recent = events.slice(-maxEvents);

  const seen = new Set();
  return [...bookmarked, ...errorsOrConcerns, ...recent]
    .filter((event) => {
      const id = event._id.toString();
      if (seen.has(id)) {
        return false;
      }
      seen.add(id);
      return true;
    })
    .slice(0, maxEvents);
};

const compactCasePayload = ({ caseData, files, events, notes, custodyLogs }) => ({
  ...(() => {
    const limits = getAiPayloadLimits();
    const selectedEvents = pickImportantEvents(events, limits.events);
    const selectedFiles = files
      .filter((file) => file.status !== 'extracted' || file.eventsExtracted || selectedEvents.some((event) => (
        event.fileRecord?._id?.toString?.() === file._id.toString() ||
        event.fileRecord?.toString?.() === file._id.toString()
      )))
      .slice(0, limits.files);

    return {
      case: {
        title: caseData.title,
        caseNumber: caseData.caseNumber,
        status: caseData.status,
        priority: caseData.priority,
        category: caseData.category,
        description: truncate(caseData.description, 350),
        createdAt: caseData.createdAt,
      },
      evidenceStats: {
        totalFiles: files.length,
        totalEvents: events.length,
        totalNotes: notes.length,
        totalCustodyLogs: custodyLogs.length,
      },
      files: selectedFiles.map((file) => ({
        name: file.originalName,
        type: file.fileType,
        size: file.fileSize,
        status: file.status,
        errorReason: truncate(file.errorReason, 120),
        eventsExtracted: file.eventsExtracted,
      })),
      timelineEvents: selectedEvents.map((event) => ({
        timestamp: event.timestamp,
        eventType: event.eventType,
        source: event.eventSource,
        title: truncate(event.title, 90),
        description: truncate(event.description, 180),
        bookmarked: Boolean(event.isBookmarked),
        sourceFile: event.fileRecord?.originalName || '',
      })),
      notes: notes.slice(0, limits.notes).map((note) => ({
        type: note.findingType,
        body: truncate(note.body, 220),
        tags: (note.tags || []).slice(0, 5),
        sourceFile: note.fileRecord?.originalName || '',
      })),
      custody: custodyLogs.slice(-limits.custody).map((log) => ({
        action: log.action,
        success: log.success,
        createdAt: log.createdAt,
        actor: log.user?.name || log.user?.email || 'System',
        resource: log.resource,
      })),
      limits: {
        filesIncluded: selectedFiles.length,
        totalFiles: files.length,
        eventsIncluded: selectedEvents.length,
        totalEvents: events.length,
        notesIncluded: Math.min(notes.length, limits.notes),
        totalNotes: notes.length,
        custodyIncluded: Math.min(custodyLogs.length, limits.custody),
        totalCustodyLogs: custodyLogs.length,
      },
    };
  })(),
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
    max_tokens: Number(process.env.AI_MAX_OUTPUT_TOKENS || 900),
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
      const providerName = getAiProvider() === 'groq' ? 'Groq' : 'OpenAI';
      const connectionHint =
        err.code === 'ECONNRESET' ||
        err.code === 'ETIMEDOUT' ||
        err.code === 'ENOTFOUND' ||
        err.code === 'APIConnectionError';
      const quotaHint =
        err.status === 429 ||
        err.code === 'insufficient_quota';
      const tokenLimitHint =
        err.status === 413 ||
        err.code === 'rate_limit_exceeded';
      const invalidKeyHint =
        err.status === 401 ||
        err.code === 'invalid_api_key';
      const missingConfigHint = err.code === 'AI_NOT_CONFIGURED';

      return errorResponse(
        res,
        missingConfigHint
          ? err.message
          : invalidKeyHint
          ? `${providerName} API key is invalid or was not loaded by the running backend. Update forensic-backend/.env, then fully stop and restart npm run dev.`
          : tokenLimitHint
          ? `${providerName} token limit was reached. The app has reduced the AI payload; restart the backend and try again. If it still happens, lower AI_MAX_EVENTS in forensic-backend/.env.`
          : quotaHint
          ? `${providerName} quota or rate limit is unavailable for this API key. Check your provider account, then try again.`
          : connectionHint
          ? `Could not connect to ${providerName}. Check your internet/VPN/firewall, then try again.`
          : err.message || 'AI request failed.',
        err.status || 502,
        'AI_REQUEST_FAILED'
      );
    }

    next(err);
  }
};
