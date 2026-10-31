// Read-only by default. See STORAGE_MIGRATION.md for usage and rollback.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { MongoClient, BSON } = require('mongoose').mongo;

const DATABASE = 'energy_solutions_test';
const TARGET_HOST = 'elvoejaktvqdhxddezbk.supabase.co';
const TARGET_PATH = '/storage/v1/object/public/elsfiles/';
const FIELDS = {
  staff: ['profileImage', 'coverImage'],
  products: ['featuredImage', 'images', 'documents', 'videos'],
  categories: ['image'],
  services: ['image', 'gallery'],
  projects: ['clientLogo', 'images.featured', 'images.gallery', 'images.beforeAfter'],
  news: ['coverImage', 'images'],
  landing_slides: ['media.imageUrl'],
  testimonials: ['author.image', 'mediaUrl', 'thumbnailUrl'],
  users: ['profileImage'],
  orders: ['items.productSnapshot.image'],
};

function appwriteKey(value) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !url.hostname.endsWith('.appwrite.io')) return null;
    const match = url.pathname.match(/^\/v1\/storage\/buckets\/([^/]+)\/files\/([^/]+)\/(?:view|download|preview)$/);
    const project = url.searchParams.get('project');
    return match && project ? `${project}/${match[1]}/${match[2]}` : null;
  } catch { return null; }
}

function validateTarget(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.hostname !== TARGET_HOST ||
      !url.pathname.startsWith(TARGET_PATH) || url.pathname === TARGET_PATH ||
      url.username || url.password || url.search || url.hash || url.port) {
    throw new Error(`Expected a public Supabase file URL in ${TARGET_HOST}${TARGET_PATH}`);
  }
}

function parseMappings(text) {
  const urls = text.match(/https?:\/\/[^\s<>"']+/g) || [];
  const mappings = new Map();
  let pending = null;
  let pairs = 0;
  for (const url of urls) {
    const key = appwriteKey(url);
    if (key) {
      if (pending) throw new Error('An Appwrite URL has no paired Supabase URL.');
      pending = { oldUrl: url, key };
    } else {
      validateTarget(url);
      if (!pending) throw new Error('A Supabase URL has no preceding Appwrite URL.');
      const previous = mappings.get(pending.key);
      if (previous && previous.newUrl !== url) throw new Error(`Conflicting replacements for ${pending.key}`);
      mappings.set(pending.key, { ...pending, newUrl: url });
      pending = null;
      pairs++;
    }
  }
  if (pending || !pairs) throw new Error('The mapping file is empty or ends with an unpaired URL.');
  return { mappings, pairs };
}

// Resolve nested fields through arrays, retaining MongoDB numeric update paths.
function visitField(value, parts, prefix, callback) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => visitField(item, parts, [...prefix, String(index)], callback));
  } else if (!parts.length) {
    if (value && Object.getPrototypeOf(value) === Object.prototype) {
      for (const [key, item] of Object.entries(value)) visitField(item, [], [...prefix, key], callback);
    } else callback(value, prefix.join('.'));
  } else if (value && typeof value === 'object') {
    const [key, ...rest] = parts;
    if (Object.hasOwn(value, key)) visitField(value[key], rest, [...prefix, key], callback);
  }
}

function planDocument(collection, document, mappings) {
  const changes = [];
  const seen = new Set();
  for (const field of FIELDS[collection] || []) {
    visitField(document, field.split('.'), [], (oldUrl, fieldPath) => {
      const key = appwriteKey(oldUrl);
      const entry = mappings.get(key);
      if (entry && !seen.has(fieldPath)) {
        changes.push({ path: fieldPath, oldUrl, newUrl: entry.newUrl, key });
        seen.add(fieldPath);
      }
    });
  }
  return changes.length ? { collection, id: document._id, changes } : null;
}

function updateFor(entry, rollback = false) {
  const filter = { _id: entry.id };
  const $set = {};
  for (const change of entry.changes) {
    filter[change.path] = rollback ? change.newUrl : change.oldUrl;
    $set[change.path] = rollback ? change.oldUrl : change.newUrl;
  }
  return { filter, update: { $set } };
}

async function checkTargets(mappings) {
  const urls = [...new Set([...mappings.values()].map(entry => entry.newUrl))];
  const checks = [];
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(6, urls.length) }, async () => {
    while (next < urls.length) {
      const url = urls[next++];
      try {
        const response = await fetch(url, { method: 'HEAD', redirect: 'error', signal: AbortSignal.timeout(15000) });
        const type = response.headers.get('content-type') || '';
        checks.push({ url, status: response.status, contentType: type,
          ok: response.status === 200 && !!type && !/text\/html|application\/json/i.test(type) });
      } catch (error) { checks.push({ url, ok: false, error: error.name }); }
    }
  }));
  return checks.sort((a, b) => a.url.localeCompare(b.url));
}

async function scan(db, mappings) {
  const entries = [];
  const unmapped = [];
  const summary = [];
  for (const [collection, fields] of Object.entries(FIELDS)) {
    const projection = Object.fromEntries(fields.map(field => [field, 1]));
    let documents = 0;
    let changes = 0;
    for await (const document of db.collection(collection).find({}, { projection }).maxTimeMS(60000)) {
      documents++;
      const entry = planDocument(collection, document, mappings);
      if (entry) { entries.push(entry); changes += entry.changes.length; }
      for (const field of fields) visitField(document, field.split('.'), [], (value, fieldPath) => {
        const key = appwriteKey(value);
        if (key && !mappings.has(key)) unmapped.push({ collection, id: document._id, path: fieldPath, oldUrl: value, key });
      });
    }
    summary.push({ collection, documentsScanned: documents,
      documentsToChange: entries.filter(entry => entry.collection === collection).length, urlsToChange: changes });
  }
  return { entries, unmapped, summary };
}

function saveJson(filename, data) {
  fs.writeFileSync(filename, BSON.EJSON.stringify(data, null, 2, { relaxed: false }) + '\n', { flag: 'wx', mode: 0o600 });
}

async function execute(db, entries, logPath, rollback = false) {
  const results = [];
  const allowed = new Set(Object.keys(FIELDS));
  for (const entry of entries) {
    if (!allowed.has(entry.collection)) throw new Error('Unexpected collection in plan.');
    const { filter, update } = updateFor(entry, rollback);
    const result = await db.collection(entry.collection).updateOne(filter, update);
    const row = { collection: entry.collection, id: entry.id, matched: result.matchedCount, modified: result.modifiedCount };
    fs.appendFileSync(logPath, BSON.EJSON.stringify(row) + '\n', { mode: 0o600 });
    results.push(row);
    if (result.matchedCount !== 1 || result.modifiedCount !== 1) {
      throw new Error(`Record changed since preview or already restored: ${entry.collection}/${entry.id}. Stopped; inspect journal and backup.`);
    }
    const verified = await db.collection(entry.collection).findOne({ _id: entry.id, ...update.$set }, { projection: { _id: 1 } });
    if (!verified) throw new Error(`Read-back verification failed for ${entry.collection}/${entry.id}`);
  }
  return results;
}

async function main(args = process.argv.slice(2)) {
  const value = name => {
    const index = args.indexOf(name);
    return index >= 0 ? args[index + 1] : undefined;
  };
  if (!process.env.MONGODB_URI) throw new Error('Set MONGODB_URI in the process environment. Do not put credentials in source.');
  const rollbackFile = value('--rollback');
  if (rollbackFile && !args.includes('--apply')) throw new Error('Rollback requires --apply.');
  const mappingFile = value('--mapping');
  if (!rollbackFile && !mappingFile) throw new Error('Specify --mapping <path to TXT>. Dry run is the default; --apply performs replacements.');
  const reportDir = path.resolve(value('--report-dir') || path.join(__dirname, '../migration-reports'));
  fs.mkdirSync(reportDir, { recursive: true });
  const run = path.join(reportDir, `${new Date().toISOString().replace(/[:.]/g, '-')}-${crypto.randomUUID().slice(0, 8)}`);
  const client = new MongoClient(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 12000, connectTimeoutMS: 12000, socketTimeoutMS: 60000,
    appName: 'ESL-Appwrite-to-Supabase-migration',
  });
  const deadline = setTimeout(() => { console.error('Migration exceeded 5 minutes; inspect saved reports/journal.'); process.exit(1); }, 300000);
  try {
    await client.connect();
    if (client.db().databaseName !== DATABASE) throw new Error(`URI must select ${DATABASE}.`);
    const db = client.db(DATABASE);
    if (rollbackFile) {
      const backup = BSON.EJSON.parse(fs.readFileSync(rollbackFile, 'utf8'));
      if (backup.database !== DATABASE || backup.mode !== 'apply') throw new Error('Invalid apply backup.');
      const results = await execute(db, backup.entries, run + '-rollback.jsonl', true);
      console.log(JSON.stringify({ mode: 'rollback', restoredDocuments: results.length, journal: run + '-rollback.jsonl' }, null, 2));
      return;
    }
    const text = fs.readFileSync(mappingFile, 'utf8');
    const { mappings, pairs } = parseMappings(text);
    const checkedTargets = await checkTargets(mappings);
    const plan = await scan(db, mappings);
    const used = new Set(plan.entries.flatMap(entry => entry.changes.map(change => change.key)));
    const report = { database: DATABASE, mode: args.includes('--apply') ? 'apply' : 'dry-run',
      createdAt: new Date().toISOString(), mappingSha256: crypto.createHash('sha256').update(text).digest('hex'),
      pairs, uniqueOldFiles: mappings.size, checkedTargets, ...plan,
      mappingsWithoutDatabaseMatches: [...mappings.values()].filter(entry => !used.has(entry.key)),
    };
    const reportPath = run + '-plan.json';
    saveJson(reportPath, report);
    const badTargets = checkedTargets.filter(check => !check.ok);
    console.log(JSON.stringify({ database: DATABASE, mode: report.mode, pairs,
      uniqueTargets: checkedTargets.length, publicTargetsPassed: checkedTargets.length - badTargets.length,
      failedTargets: badTargets, summary: plan.summary,
      documentsToChange: plan.entries.length, urlsToChange: plan.entries.reduce((sum, entry) => sum + entry.changes.length, 0),
      unmappedAppwriteUrls: plan.unmapped.length, mappingsWithoutDatabaseMatches: report.mappingsWithoutDatabaseMatches.length,
      reportPath }, null, 2));
    if (badTargets.length) throw new Error('Public target checks failed. No database changes made. See plan.');
    if (args.includes('--apply')) {
      // The complete field-level rollback backup is saved before the first write.
      const results = await execute(db, plan.entries, run + '-applied.jsonl');
      const remaining = await scan(db, mappings);
      saveJson(run + '-verification.json', { database: DATABASE, modifiedDocuments: results.length,
        remainingMatchedUrls: remaining.entries.reduce((sum, entry) => sum + entry.changes.length, 0),
        unmapped: remaining.unmapped, summary: remaining.summary });
      if (remaining.entries.length) throw new Error('Mapped Appwrite URLs remain after migration; inspect verification report.');
      console.log(JSON.stringify({ applied: true, modifiedDocuments: results.length, remainingMatchedUrls: 0,
        backup: reportPath, journal: run + '-applied.jsonl', verification: run + '-verification.json' }, null, 2));
    }
  } finally { clearTimeout(deadline); await client.close(); }
}

module.exports = { appwriteKey, validateTarget, parseMappings, visitField, planDocument, updateFor, checkTargets, scan, main, FIELDS };
if (require.main === module) main().catch(error => {
  // Driver error text may contain credentials. Report the error type, not the URI.
  console.error(error.name === 'Error' ? error.message.replace(/mongodb(?:\+srv)?:\/\/\S+/g, '[connection redacted]') : `Migration failed (${error.name}); check connection/access and saved reports.`);
  process.exitCode = 1;
});
