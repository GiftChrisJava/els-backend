const test = require('node:test');
const assert = require('node:assert/strict');
const { ObjectId } = require('mongoose').mongo;
const { appwriteKey, parseMappings, planDocument, updateFor, main } = require('./migrate-storage-urls.cjs');

const old = 'https://fra.cloud.appwrite.io/v1/storage/buckets/bucket/files/file/view?project=project&impersonateuserid=&mode=admin';
const stored = 'https://fra.cloud.appwrite.io/v1/storage/buckets/bucket/files/file/view?mode=admin&project=project';
const target = 'https://elvoejaktvqdhxddezbk.supabase.co/storage/v1/object/public/elsfiles/portrait.jpg';
const { mappings } = parseMappings(`1. ${old}\nnew url is: ${target}`);

test('matches file identity despite admin query parameters and parameter order', () => {
  assert.equal(appwriteKey(stored), appwriteKey(old));
  assert.equal(appwriteKey(old.replace('project=project', 'project=another')), 'another/bucket/file');
  assert.equal(appwriteKey(old.replace('fra.cloud.appwrite.io', 'appwrite.io.attacker.example')), null);
  assert.equal(appwriteKey(target), null);
});

test('accepts repeated mappings only when replacement agrees', () => {
  const result = parseMappings(`${old}\n${target}\n${stored}\n${target}`);
  assert.equal(result.mappings.size, 1);
  assert.equal(result.pairs, 2);
  assert.throws(() => parseMappings(`${old}\n${target}\n${stored}\n${target.replace('portrait', 'different')}`), /Conflicting/);
});

test('rejects missing pairs, unrelated URLs and private/foreign targets', () => {
  for (const input of ['', old, target, `${old}\n${old}`, `${old}\nhttps://example.com/image.jpg`,
    `${old}\n${target.replace('/public/', '/sign/')}`, `${old}\n${target}?token=temporary`]) {
    assert.throws(() => parseMappings(input));
  }
});

test('plans only allowlisted staff URL fields without changing document', () => {
  const document = { _id: new ObjectId(), profileImage: stored, bio: old, coverImage: 'unrelated' };
  const entry = planDocument('staff', document, mappings);
  assert.equal(entry.id, document._id);
  assert.deepEqual(entry.changes.map(change => change.path), ['profileImage']);
  assert.equal(document.profileImage, stored);
  assert.equal(document.bio, old);
  assert.equal(planDocument('activity_logs', document, mappings), null);
});

test('plans exact product-array elements, retaining unrelated entries', () => {
  const document = { _id: new ObjectId(), featuredImage: old, images: [target, stored, 'https://example.com/other.jpg'] };
  assert.deepEqual(planDocument('products', document, mappings).changes.map(change => change.path), ['featuredImage', 'images.1']);
});

test('handles before/after images and nested order item arrays', () => {
  const project = { _id: new ObjectId(), images: { gallery: [old], beforeAfter: [{ before: stored, after: target }] } };
  assert.deepEqual(planDocument('projects', project, mappings).changes.map(change => change.path), ['images.gallery.0', 'images.beforeAfter.0.before']);
  const order = { _id: new ObjectId(), items: [{ productSnapshot: { image: old } }, { productSnapshot: { image: target } }] };
  assert.deepEqual(planDocument('orders', order, mappings).changes.map(change => change.path), ['items.0.productSnapshot.image']);
});

test('updates require the current old URL; rollback requires the replacement URL', () => {
  const entry = planDocument('staff', { _id: new ObjectId(), profileImage: stored }, mappings);
  const forward = updateFor(entry);
  assert.equal(forward.filter.profileImage, stored);
  assert.equal(forward.update.$set.profileImage, target);
  const rollback = updateFor(entry, true);
  assert.equal(rollback.filter.profileImage, target);
  assert.equal(rollback.update.$set.profileImage, stored);
});

test('second run skips URLs already migrated and unknown files', () => {
  assert.equal(planDocument('staff', { profileImage: target }, mappings), null);
  assert.equal(planDocument('staff', { profileImage: old.replace('/file/', '/unknown/') }, mappings), null);
});

test('requires environment credentials before making any connection', async () => {
  const previous = process.env.MONGODB_URI;
  delete process.env.MONGODB_URI;
  try { await assert.rejects(main([]), /Set MONGODB_URI/); }
  finally { if (previous !== undefined) process.env.MONGODB_URI = previous; }
});
