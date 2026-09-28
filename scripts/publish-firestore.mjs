import { readFile } from 'node:fs/promises';
import { createSign } from 'node:crypto';

const [inputPath, keyPath] = process.argv.slice(2);
if (!inputPath || !keyPath) throw Error('Usage: node scripts/publish-firestore.mjs <edition.json> <service-account.json>');

const b64url = value => Buffer.from(value).toString('base64url');
const field = value => {
  if (value === null) return { nullValue: null };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(field) } };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (typeof value === 'object') return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, field(item)])) } };
  throw Error('Unsupported content value');
};

const edition = JSON.parse(await readFile(inputPath, 'utf8'));
if (!/^\d{4}-\d{2}-\d{2}$/.test(edition.date) || !edition.title || !edition.book || !Array.isArray(edition.investment) || !Array.isArray(edition.news)) throw Error('Daily edition is incomplete');
const account = JSON.parse(await readFile(keyPath, 'utf8'));
if (!account.client_email || !account.private_key || !account.token_uri || !account.project_id) throw Error('Invalid Firebase service account');

const now = Math.floor(Date.now() / 1000);
const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
const claims = b64url(JSON.stringify({ iss: account.client_email, scope: 'https://www.googleapis.com/auth/datastore', aud: account.token_uri, iat: now, exp: now + 3600 }));
const unsigned = `${header}.${claims}`;
const signer = createSign('RSA-SHA256');
signer.update(unsigned);
const assertion = `${unsigned}.${signer.sign(account.private_key).toString('base64url')}`;
const tokenResponse = await fetch(account.token_uri, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }) });
if (!tokenResponse.ok) throw Error(`Firebase authentication failed: ${tokenResponse.status}`);
const { access_token: token } = await tokenResponse.json();
const response = await fetch(`https://firestore.googleapis.com/v1/projects/${account.project_id}/databases/(default)/documents/daylightEditions/${encodeURIComponent(edition.date)}`, {
  method: 'PATCH', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
  body: JSON.stringify({ fields: { date: field(edition.date), payload: field(JSON.stringify(edition)), receivedAt: { timestampValue: new Date().toISOString() } } }),
});
if (!response.ok) throw Error(`Firestore write failed: ${response.status}`);
console.log(JSON.stringify({ delivered: true, date: edition.date }));
