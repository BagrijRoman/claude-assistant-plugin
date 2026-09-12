// What a secret looks like in a line of text. Used by secret-commit-guard on the added lines of a diff.
// Every rule names the kind of secret it found; none of them returns the secret itself, so a block message
// can be shown to the model without repeating the value.

/** A value that is obviously a stand-in, not a real secret. */
const PLACEHOLDER = /^(<[^>]*>|\$\{[^}]*\}|\$[A-Za-z_]+|x{3,}|\*{3,}|\.{3}|_+|-+|password|passwd|pass|secret|changeme|change[-_]me|your[-_]?[a-z_-]*|example|placeholder|dummy|redacted|todo|none|null|undefined|true|false)$/i;

/** A value that refers to where the secret lives instead of being one: `process.env.X`, `${VAR}`, a call. */
const REFERENCE = /process\.env|import\.meta\.env|os\.environ|getenv|Deno\.env|config\.get|\$\{|[()[\]]|^[A-Z_][A-Z0-9_]*$/;

const CONNECTION_STRING = /\b(?:mongodb(?:\+srv)?|postgres(?:ql)?|mysql|mariadb|redis|rediss|amqps?|mssql|clickhouse):\/\/[^\s:@/]+:([^\s@/]+)@/i;

const ASSIGNMENT = /\b(?:secret|password|passwd|token|api[_-]?key|private[_-]?key|access[_-]?key|client[_-]?secret|auth[_-]?token|jwt[_-]?secret)[A-Za-z0-9_]*["']?\s*[:=]\s*["'`]?([^\s"'`;,]{16,})["'`]?/i;

const looksLikeValue = (value) => /\d/.test(value) && /[A-Za-z]/.test(value);

const RULES = [
  { kind: 'a private key block', test: (line) => /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(line) },
  { kind: 'an AWS access key id', test: (line) => /\bAKIA[0-9A-Z]{16}\b/.test(line) },
  { kind: 'a JWT', test: (line) => /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{8,}\b/.test(line) },
  { kind: 'a GitHub token', test: (line) => /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{22,})\b/.test(line) },
  { kind: 'a Slack token', test: (line) => /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/.test(line) },
  { kind: 'a Stripe live key', test: (line) => /\b[sr]k_live_[A-Za-z0-9]{16,}\b/.test(line) },
  { kind: 'an OpenAI key', test: (line) => /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/.test(line) },
  { kind: 'a Google API key', test: (line) => /\bAIza[0-9A-Za-z_-]{35}\b/.test(line) },
  {
    kind: 'a connection string with a password',
    test: (line) => {
      const match = CONNECTION_STRING.exec(line);
      return Boolean(match) && !PLACEHOLDER.test(match[1]);
    },
  },
  {
    kind: 'a secret assigned in clear text',
    test: (line) => {
      const match = ASSIGNMENT.exec(line);
      if (!match) return false;
      const value = match[1];
      return looksLikeValue(value) && !PLACEHOLDER.test(value) && !REFERENCE.test(value);
    },
  },
];

/** A line carrying this marker is deliberately allowed: a fake token in a test fixture, with its reason. */
export const ALLOW_MARKER = /allow-secret:/i;

/** The kind of secret found in the line, or null. */
export const findSecret = (line) => {
  if (ALLOW_MARKER.test(line)) return null;
  const hit = RULES.find((rule) => rule.test(line));
  return hit ? hit.kind : null;
};
