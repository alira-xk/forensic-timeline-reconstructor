const getBooleanValue = (field) => {
  if (field && typeof field === 'object' && 'value' in field) {
    return Boolean(field.value);
  }
  return Boolean(field);
};

const getNumberValue = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const isStrictMailboxVerificationEnabled = () => (
  (process.env.REQUIRE_MAILBOX_VERIFICATION || 'false') === 'true'
);

const getVerificationProvider = () => (
  String(process.env.EMAIL_VERIFICATION_PROVIDER || '').trim().toLowerCase()
);

const verifyWithAbstractApi = async (email) => {
  const apiKey = String(process.env.ABSTRACT_EMAIL_VALIDATION_API_KEY || '').trim();
  if (!apiKey) {
    return {
      ok: false,
      configured: false,
      message: 'Mailbox verification is enabled but ABSTRACT_EMAIL_VALIDATION_API_KEY is missing.',
    };
  }

  const url = new URL('https://emailvalidation.abstractapi.com/v1/');
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('email', email);

  const response = await fetch(url, { method: 'GET' });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      ok: false,
      configured: true,
      message: data.error?.message || 'Email verification service rejected the request.',
    };
  }

  const deliverability = String(data.deliverability || '').toUpperCase();
  const isFormatValid = getBooleanValue(data.is_valid_format);
  const isMxFound = getBooleanValue(data.is_mx_found);
  const isSmtpValid = getBooleanValue(data.is_smtp_valid);
  const isDisposable = getBooleanValue(data.is_disposable_email);
  const qualityScore = getNumberValue(data.quality_score, 0);

  if (!isFormatValid) {
    return { ok: false, configured: true, message: 'Enter a valid email address.' };
  }

  if (isDisposable) {
    return { ok: false, configured: true, message: 'Disposable email addresses are not allowed.' };
  }

  if (!isMxFound) {
    return { ok: false, configured: true, message: 'Email domain cannot receive mail.' };
  }

  if (deliverability && deliverability !== 'DELIVERABLE') {
    return { ok: false, configured: true, message: 'This email inbox could not be verified.' };
  }

  if (!isSmtpValid) {
    return { ok: false, configured: true, message: 'This email inbox does not appear to exist.' };
  }

  if (qualityScore && qualityScore < 0.45) {
    return { ok: false, configured: true, message: 'This email address looks too risky for registration.' };
  }

  return { ok: true, configured: true };
};

const verifyWithCheckMail = async (email) => {
  const apiKey = String(process.env.CHECK_MAIL_API_KEY || '').trim();
  if (!apiKey) {
    return {
      ok: false,
      configured: false,
      message: 'Mailbox verification is enabled but CHECK_MAIL_API_KEY is missing.',
    };
  }

  const body = new URLSearchParams({ email });
  const response = await fetch('https://api.check-mail.org/v2/', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      ok: false,
      configured: true,
      message: data.message || data.error || 'Email verification service rejected the request.',
    };
  }

  const isValid = Boolean(data.valid);
  const shouldBlock = Boolean(data.block);
  const isDisposable = Boolean(data.is_disposable);
  const risk = getNumberValue(data.risk, 0);

  if (!isValid) {
    return { ok: false, configured: true, message: 'This email address is not valid.' };
  }

  if (isDisposable || shouldBlock) {
    return {
      ok: false,
      configured: true,
      message: data.text || 'This email address is not allowed for registration.',
    };
  }

  if (risk >= 85) {
    return {
      ok: false,
      configured: true,
      message: 'This email address looks too risky for registration.',
    };
  }

  return { ok: true, configured: true };
};

const verifyMailboxExists = async (email) => {
  const provider = getVerificationProvider();

  if (!provider) {
    return {
      ok: !isStrictMailboxVerificationEnabled(),
      configured: false,
      message: isStrictMailboxVerificationEnabled()
        ? 'Mailbox verification is required but no EMAIL_VERIFICATION_PROVIDER is configured.'
        : '',
    };
  }

  if (provider === 'abstractapi') {
    return verifyWithAbstractApi(email);
  }

  if (provider === 'checkmail' || provider === 'check-mail') {
    return verifyWithCheckMail(email);
  }

  return {
    ok: false,
    configured: false,
    message: `Unsupported EMAIL_VERIFICATION_PROVIDER "${provider}".`,
  };
};

module.exports = {
  verifyMailboxExists,
};
