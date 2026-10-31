// Run after npm run build. No real storage or database writes.
const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { appConfig } = require('../dist/config/app.config');
const { StorageService } = require('../dist/shared/services/storage.service');
const service = new StorageService();
const originalFetch = global.fetch;
let calls;
beforeEach(() => {
  appConfig.supabase = { url: 'https://elvoejaktvqdhxddezbk.supabase.co', bucket: 'elsfiles', secretKey: 'sb_secret_test' };
  calls = [];
  global.fetch = async (url, options) => { calls.push({ url: String(url), options }); return new Response('{}', { status: 200 }); };
});
afterEach(() => { global.fetch = originalFetch; });

test('uploads PNG bytes with the right MIME and a unique public bucket path', async () => {
  const file = { buffer: Buffer.from('png-image'), mimetype: 'image/png', originalname: 'unsafe/name.png' };
  const first = await service.uploadImage(file, 'products/gallery');
  const second = await service.uploadImage(file, 'products/gallery');
  assert.notEqual(first, second);
  assert.match(first, /^https:\/\/elvoejaktvqdhxddezbk.supabase.co\/storage\/v1\/object\/public\/elsfiles\/products\/gallery\/[a-f0-9-]+-image\.png$/);
  assert.equal(calls[0].options.headers.apikey, 'sb_secret_test');
  assert.equal(calls[0].options.headers.Authorization, undefined);
  assert.equal(calls[0].options.headers['Content-Type'], 'image/png');
  assert.equal(calls[0].options.headers['x-upsert'], 'false');
  assert.ok(Buffer.from(calls[0].options.body).equals(file.buffer));
  assert.ok(!first.includes('sb_secret'));
});

test('supports a legacy server JWT without putting it in a public URL', async () => {
  appConfig.supabase.secretKey = 'test-legacy-jwt';
  const url = await service.uploadImage({ buffer: Buffer.from('jpg'), mimetype: 'image/jpeg' }, 'staff');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer test-legacy-jwt');
  assert.ok(!url.includes('test-legacy'));
});

test('simultaneous admin uploads with identical filenames never overwrite one another', async () => {
  const urls = await Promise.all(Array.from({ length: 24 }, () => service.uploadImage({ buffer: Buffer.from('png'), mimetype: 'image/png', originalname: 'photo.png' }, 'staff', 'photo.png')));
  assert.equal(new Set(urls).size, 24);
  assert.equal(calls.length, 24);
  assert.ok(calls.every(call => call.options.headers['x-upsert'] === 'false'));
});

test('missing credentials fail clearly without a request', async () => {
  appConfig.supabase.secretKey = '';
  await assert.rejects(service.uploadImage({ buffer: Buffer.from('png'), mimetype: 'image/png' }), error => error.statusCode === 503);
  assert.equal(calls.length, 0);
});

test('rejects unsupported types, empty/oversized files and invalid folders', async () => {
  for (const file of [{ buffer: Buffer.from('html'), mimetype: 'text/html' }, { buffer: Buffer.alloc(0), mimetype: 'image/png' }, { buffer: Buffer.alloc(10 * 1024 * 1024 + 1), mimetype: 'image/png' }]) {
    await assert.rejects(service.uploadImage(file), error => error.statusCode === 400);
  }
  await assert.rejects(service.uploadImage({ buffer: Buffer.from('png'), mimetype: 'image/png' }, '../outside'));
  assert.equal(calls.length, 0);
});

test('does not re-upload migrated Supabase or existing Appwrite URLs during edits', async () => {
  for (const url of ['https://elvoejaktvqdhxddezbk.supabase.co/storage/v1/object/public/elsfiles/emmanuel.jpg', 'https://fra.cloud.appwrite.io/v1/storage/buckets/a/files/b/view?project=c']) {
    assert.equal(await service.uploadImageFromUrl(url), url);
  }
  assert.equal(calls.length, 0);
});

test('external PNG imports retain the fetched MIME type', async () => {
  global.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    return options?.method === 'POST' ? new Response('{}') : new Response(Buffer.from('png'), { headers: { 'content-type': 'image/png' } });
  };
  const url = await service.uploadImageFromUrl('https://images.example.com/image', 'services');
  assert.match(url, /\.png$/);
  assert.equal(calls[1].options.headers['Content-Type'], 'image/png');
  assert.equal(calls[0].options.headers, undefined); // No server key sent to the external host.
});

test('storage errors never leak the server key or upstream response body', async () => {
  global.fetch = async () => new Response('sensitive-upstream-body', { status: 403 });
  await assert.rejects(service.uploadImage({ buffer: Buffer.from('png'), mimetype: 'image/png' }), error => {
    assert.equal(error.statusCode, 502);
    assert.ok(!error.message.includes('sb_secret') && !error.message.includes('sensitive-upstream'));
    return true;
  });
});

test('deletion is restricted to the configured Supabase project and bucket', async () => {
  for (const url of ['https://other.supabase.co/storage/v1/object/public/elsfiles/file.png', 'https://elvoejaktvqdhxddezbk.supabase.co/storage/v1/object/public/another/file.png', 'https://fra.cloud.appwrite.io/v1/storage/buckets/a/files/b/view']) {
    assert.equal(await service.deleteImage(url), false);
  }
  assert.equal(calls.length, 0);
  assert.equal(await service.deleteImage('https://elvoejaktvqdhxddezbk.supabase.co/storage/v1/object/public/elsfiles/news/a%20b.png'), true);
  assert.deepEqual(JSON.parse(calls[0].options.body), { prefixes: ['news/a b.png'] });
});

test('a failed gallery upload cleans up successful uploads after all complete', async () => {
  let sequence = 0;
  global.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    if (options.method === 'POST' && ++sequence === 2) return new Response('{}', { status: 500 });
    return new Response('{}');
  };
  await assert.rejects(service.uploadMultipleImages([{ buffer: Buffer.from('a'), mimetype: 'image/png' }, { buffer: Buffer.from('b'), mimetype: 'image/png' }], 'news'));
  assert.equal(calls.filter(call => call.options.method === 'DELETE').length, 1);
});
