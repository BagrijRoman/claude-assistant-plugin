import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { findSecret } from '../bin/lib/secretPatterns.mjs';

// Every value below is fabricated for the test; none is a working credential. Some are split in two
// so that secret scanning on the remote does not take them for real ones.
const SECRETS = {
  'a private key block': '-----BEGIN RSA PRIVATE KEY-----',
  'an AWS access key id': 'aws_access_key_id = AKIAIOSFODNN7EXAMPLE',
  'a JWT': 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
  'a GitHub token': 'GITHUB=ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij',
  'a Slack token': 'xoxb-' + '123456789012-1234567890123-AbCdEfGhIjKlMnOpQrStUvWx',
  'a Stripe live key': "stripe.key = 'sk_live_" + "4eC39HqLyjWDarjtT1zdp7dc'",
  'an OpenAI key': 'OPENAI_API_KEY=sk-proj-abcdefghijklmnopqrstuvwxyz0123456789',
  'a Google API key': 'const key = "AIzaSyA1234567890abcdefghijklmnopqrstuv"',
  'a connection string with a password': 'MONGODB_URI=mongodb+srv://app:S3cretPassw0rd@cluster0.example.net/db',
  'a secret assigned in clear text': 'JWT_SECRET=9f8e7d6c5b4a39281706f5e4d3c2b1a0',
};

describe('findSecret', () => {
  for (const [kind, line] of Object.entries(SECRETS)) {
    it(`finds ${kind}`, () => assert.equal(findSecret(line), kind));
  }

  it('names the kind, never the value', () => {
    for (const line of Object.values(SECRETS)) assert.ok(!Object.values(SECRETS).includes(findSecret(line)));
  });

  it('ignores placeholders', () => {
    for (const line of [
      'JWT_SECRET=<your-jwt-secret>',
      'JWT_SECRET=',
      'JWT_SECRET=changeme',
      'DATABASE_URL=postgres://user:password@localhost:5432/app',
      'MONGODB_URI=mongodb://user:${DB_PASSWORD}@db:27017/app',
      'API_KEY=xxxxxxxxxxxxxxxxxxxxxxxx',
      'PASSWORD=your_password_here',
    ]) assert.equal(findSecret(line), null, line);
  });

  it('ignores references to where a secret lives', () => {
    for (const line of [
      "const secret = process.env.JWT_SECRET ?? 'development-only-secret-1'",
      'jwtSecret: config.get<string>("JWT_SECRET_VALUE_1"),',
      'const apiKey = import.meta.env.VITE_API_KEY_12345678',
      'token = generateToken(user.id, 3600)',
      'PASSWORD_HASH_ROUNDS_DEFAULT_1 = SOME_OTHER_CONSTANT_1',
      'password: `${prefix}-${randomBytes(16).toString("hex")}`',
    ]) assert.equal(findSecret(line), null, line);
  });

  it('ignores ordinary code that mentions the words', () => {
    for (const line of [
      'const apiKeyHeader = "x-api-key-header-name";',
      'password: string;',
      "@ApiProperty({ example: 'password' }) password: string;",
      'export const TOKEN_TTL_SECONDS = 3600;',
      'if (!token) throw new UnauthorizedException("token missing or expired");',
      'const tokenStorageKey = "auth.accessToken";',
      'secret: process.env.JWT_SECRET,',
      'this.logger.warn(`password reset requested for ${email}`);',
    ]) assert.equal(findSecret(line), null, line);
  });

  it('lets a marked fixture line through', () => {
    assert.equal(findSecret(`${SECRETS['a JWT']} // allow-secret: fixture for the jwt parser test`), null);
    assert.equal(findSecret(`${SECRETS['a GitHub token']} # allow-secret: sample in the docs`), null);
  });
});
