// Real routes, Multer, validation and controllers; persistence/storage are mocked.
// No live content, email, database or storage changes.
process.env.SUPABASE_SECRET_KEY = 'sb_secret_route_test';
const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const auth = require('../dist/modules/auth/middlewares/auth.middleware');
auth.authenticate = (req, res, next) => {
  if (!req.headers['x-test-role']) return res.status(401).json({ message: 'Authentication required' });
  req.user = { _id: new mongoose.Types.ObjectId('111111111111111111111111'), id: '111111111111111111111111', role: req.headers['x-test-role'] };
  next();
};
const webModule = require('../dist/modules/admin/web-admin/service/web-admin.service');
const sales = require('../dist/modules/admin/sales-admin/services/sales-admin.service').default;
const news = require('../dist/modules/admin/web-admin/service/news.service').newsService;
let saved;
for (const resource of ['Service', 'Project', 'Staff', 'Slide']) {
  webModule.WebAdminService.prototype['create' + resource] = async (_admin, data) => (saved = data);
  webModule.WebAdminService.prototype['update' + resource] = async (_admin, _id, data) => (saved = data);
}
webModule.WebAdminService.prototype.createTestimonial = async (_admin, data) => (saved = data);
for (const resource of ['Product', 'Category']) {
  sales['create' + resource] = async data => (saved = data);
  sales['update' + resource] = async (_id, data) => (saved = data);
}
news.createNews = async (_admin, data) => (saved = data);
news.updateNews = async (_id, _admin, data) => (saved = data);
const app = express();
app.use(express.json());
app.use('/web', require('../dist/modules/admin/web-admin/routes/web-admin.routes').default);
app.use('/sales', require('../dist/modules/admin/sales-admin/routes/sales-admin.routes').default);
app.use((error, _req, res, _next) => res.status(error.statusCode || 500).json({ message: error.message, details: error.details }));
const originalFetch = global.fetch;
let uploads;
beforeEach(() => { saved = null; uploads = []; global.fetch = async (url, options) => { uploads.push({ url: String(url), options }); return new Response('{}'); }; });
afterEach(() => { global.fetch = originalFetch; });
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aFqkAAAAASUVORK5CYII=', 'base64');
const id = '222222222222222222222222';
function url(value) { assert.match(value, /^https:\/\/elvoejaktvqdhxddezbk.supabase.co\/storage\/v1\/object\/public\/elsfiles\//); }
async function send(method, route, fields = {}, files = [], expectedStatus = 200) {
  let req = request(app)[method](route).set('x-test-role', 'system-admin');
  for (const [key, value] of Object.entries(fields)) req = req.field(key, String(value));
  for (const field of files) req = req.attach(field, png, { filename: 'image.png', contentType: 'image/png' });
  const response = await req;
  assert.equal(response.status, expectedStatus, JSON.stringify(response.body));
  assert.equal(uploads.filter(u => u.options.method === 'POST').length, files.length, 'Each file uploaded exactly once');
  return response;
}

test('news create: cover/gallery become public Supabase URLs', async () => {
  await send('post', '/web/news', { title: 'Test news', summary: 'A sufficiently long summary', content: 'A sufficiently long article body for testing.', category: 'Company', isPublished: false }, ['coverImage', 'images'], 201);
  url(saved.coverImage); url(saved.images[0]); assert.equal(saved.isPublished, false);
});
test('news update accepts replacement cover/gallery', async () => {
  await send('patch', '/web/news/' + id, {}, ['coverImage', 'images']); url(saved.coverImage); url(saved.images[0]);
});
test('product create accepts CMS pricing/inventory fields and both image inputs', async () => {
  await send('post', '/sales/products', { name: 'Test product', sku: 'TEST-IMAGE', description: 'Test product description', category: id, 'pricing[price]': 100, 'inventory[quantity]': 5 }, ['featuredImage', 'images'], 201);
  url(saved.featuredImage); url(saved.images[0]);
});
test('product update accepts replacement featured/gallery images', async () => {
  await send('put', '/sales/products/' + id, {}, ['featuredImage', 'images']); url(saved.featuredImage); url(saved.images[0]);
});
test('category create accepts image and icon', async () => {
  await send('post', '/sales/categories', { name: 'Test category', description: 'Test' }, ['image', 'icon'], 201); url(saved.image); url(saved.icon);
});
test('category edit accepts multipart image/icon and preserves explicit false', async () => {
  await send('patch', '/sales/categories/' + id, { isActive: false }, ['image', 'icon']); url(saved.image); url(saved.icon); assert.equal(String(saved.isActive), 'false');
});
test('category status-only JSON edits still work', async () => {
  const res = await request(app).patch('/sales/categories/' + id).set('x-test-role', 'system-admin').send({ isActive: false });
  assert.equal(res.status, 200); assert.equal(saved.isActive, false); assert.equal(uploads.length, 0);
});

test('actual CMS category action sends new files through the multipart route', async () => {
  const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
  const ts = require('typescript');
  const source = fs.readFileSync(path.resolve(__dirname, '../../esl-cms/src/app/sales-admin/categories/actions.ts'), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const context = { exports: {}, FormData, File, console, require: () => ({ apiPatch: async (endpoint, payload) => {
    let req = request(app).patch(endpoint.replace('/api/v1/admin/sales', '/sales')).set('x-test-role', 'system-admin');
    assert.ok(payload instanceof FormData);
    for (const [key, value] of payload.entries()) {
      req = typeof value === 'string' ? req.field(key, value) : req.attach(key, Buffer.from(await value.arrayBuffer()), { filename: value.name, contentType: value.type });
    }
    const response = await req;
    assert.equal(response.status, 200, JSON.stringify(response.body));
    return response.body;
  } }) };
  vm.runInNewContext(code, context);
  const result = await context.exports.updateCategory(id, { name: 'Updated category', image: new File([png], 'image.png', { type: 'image/png' }), icon: new File([png], 'icon.png', { type: 'image/png' }) });
  assert.equal(result.success, true); url(saved.image); url(saved.icon); assert.equal(saved.name, 'Updated category');
});
test('staff create accepts both portrait and cover', async () => {
  await send('post', '/web/staff', { firstName: 'Test', lastName: 'Person', position: 'Engineer', department: 'technical', email: 'test@example.com', bio: 'Test biography' }, ['profileImage', 'coverImage'], 201);
  url(saved.profileImage); url(saved.coverImage);
});
test('staff edit accepts cover and portrait together', async () => {
  await send('patch', '/web/staff/' + id, {}, ['profileImage', 'coverImage']); url(saved.profileImage); url(saved.coverImage);
  assert.equal(saved.isPublished, undefined); assert.equal(saved.status, undefined);
});
test('slide create accepts a file with JSON media metadata', async () => {
  await send('post', '/web/slides', { media: JSON.stringify({ alt: 'New image' }), status: 'active' }, ['slideImage'], 201);
  url(saved.media.imageUrl); assert.equal(saved.media.alt, 'New image');
});
test('slide edit parses multipart file and JSON media', async () => {
  await send('patch', '/web/slides/' + id, { media: JSON.stringify({ alt: 'Updated' }) }, ['slideImage']); url(saved.media.imageUrl); assert.equal(saved.media.alt, 'Updated');
  assert.equal(saved.status, undefined); assert.equal(saved.displayOrder, undefined);
});
test('service create accepts main and gallery images', async () => {
  await send('post', '/web/services', { name: 'Test service', shortDescription: 'Test service description', category: 'solar-installation', features: '[]', pricing: '{}' }, ['image', 'galleryImages'], 201);
  url(saved.image); url(saved.gallery[0]);
});
test('service edit accepts replacement main/gallery', async () => {
  await send('patch', '/web/services/' + id, {}, ['image', 'galleryImages']); url(saved.image); url(saved.gallery[0]);
});
test('project create accepts featured/gallery images', async () => {
  await send('post', '/web/projects', { title: 'Test project', client: 'Test client', description: 'Project description', category: 'commercial', duration: '2 weeks', startDate: '2026-10-31', location: JSON.stringify({ city: 'Lilongwe', country: 'Malawi' }) }, ['featuredImage', 'galleryImages'], 201);
  url(saved.images.featured); url(saved.images.gallery[0]);
});
test('project edit accepts replacement featured/gallery', async () => {
  await send('patch', '/web/projects/' + id, {}, ['featuredImage', 'galleryImages']); url(saved.images.featured); url(saved.images.gallery[0]);
  assert.equal(saved.isPublished, undefined); assert.equal(saved.status, undefined);
});
test('testimonial author image reaches its nested field', async () => {
  await send('post', '/web/testimonials/upload', { content: 'This is a sufficiently long testimonial.', rating: 5, author: JSON.stringify({ name: 'Test customer' }) }, ['authorImage'], 201);
  url(saved.author.image);
});
test('unauthenticated requests cannot reach storage', async () => {
  const response = await request(app).post('/web/news').attach('coverImage', png, 'test.png');
  assert.equal(response.status, 401); assert.equal(uploads.length, 0);
});
test('an unauthorized role cannot upload product images', async () => {
  const response = await request(app).post('/sales/products').set('x-test-role', 'helpdesk').attach('featuredImage', png, 'test.png');
  assert.equal(response.status, 403); assert.equal(uploads.length, 0);
});

// The real CMS serializers feed the real Express routes. Only the API transport,
// storage HTTP requests and persistence are substituted.
function loadCmsActions(relativePath, role) {
  const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
  const ts = require('typescript');
  const source = fs.readFileSync(path.resolve(__dirname, '../../esl-cms/src', relativePath), 'utf8');
  const transport = async (method, endpoint, body) => {
    let req = request(app)[method](endpoint.replace('/api/v1/admin/web', '/web').replace('/api/v1/admin/sales', '/sales')).set('x-test-role', role);
    if (body instanceof FormData) {
      for (const [key, value] of body.entries()) req = typeof value === 'string' ? req.field(key, value) : req.attach(key, Buffer.from(await value.arrayBuffer()), { filename: value.name, contentType: value.type });
    } else if (body) req = req.send(body);
    const response = await req;
    assert.ok([200, 201].includes(response.status), `${endpoint}: ${JSON.stringify(response.body)}`);
    return response.body;
  };
  const api = {
    apiPost: (endpoint, body) => transport('post', endpoint, body),
    apiPatch: (endpoint, body) => transport('patch', endpoint, body),
    apiPut: (endpoint, body) => transport('put', endpoint, body),
    apiRequest: (endpoint, options = {}) => transport((options.method || 'GET').toLowerCase(), endpoint, options.body),
  };
  const context = { exports: {}, FormData, File, URLSearchParams, console, localStorage: { getItem: () => 'isolated-test-token' }, require: () => api };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
  return context.exports;
}

const imageFile = () => new File([png], 'photo.png', { type: 'image/png' });
const fullStaff = () => ({ firstName: 'Test', lastName: 'Person', displayName: 'Test Person', position: 'Engineer', department: 'technical', email: 'test@example.com', phone: '+265999999999', bio: 'Test biography', joinedDate: '2026-10-31', profileImage: imageFile(), coverImage: imageFile() });
const cases = [
  ['news', 'app/web-admin/news/actions.ts', 'createNews', 'updateNews', () => ({ title: 'Test news', summary: 'A sufficiently long summary', content: 'A sufficiently long article body.', category: 'Company', coverImage: imageFile(), images: [imageFile()] }), data => [data], data => [id, data]],
  ['product', 'app/sales-admin/products/actions.ts', 'createProduct', 'updateProduct', () => ({ name: 'Test product', sku: 'TEST-CMS', description: 'A product description', shortDescription: 'Test product', category: id, pricing: { price: 100 }, inventory: { quantity: 5 }, featuredImage: imageFile(), images: [imageFile()] }), data => [data], data => [id, data]],
  ['staff', 'app/web-admin/staff/action.ts', 'createStaffMember', 'updateStaffMember', fullStaff, data => [data], data => [{ ...data, _id: id }]],
  ['slide', 'app/web-admin/slides/actions.ts', 'createSlide', 'updateSlide', () => ({ title: 'Test slide', media: { alt: 'Photo' }, status: 'active', displayOrder: 1, slideImage: imageFile() }), data => [data], data => [{ ...data, _id: id }]],
  ['service', 'app/web-admin/services/action.ts', 'createService', 'updateService', () => ({ name: 'Test service', shortDescription: 'Test service description', longDescription: 'A full service description.', category: 'solar-installation', features: [], pricing: {}, duration: '2 weeks', status: 'active', isFeatured: false, image: imageFile(), galleryImages: [imageFile()] }), data => [data], data => [{ ...data, _id: id }]],
  ['project', 'app/web-admin/projects/action.ts', 'createProject', 'updateProject', () => ({ title: 'Test project', client: 'Test client', description: 'Project description', category: 'commercial', status: 'completed', duration: '2 weeks', startDate: '2026-10-31', location: { city: 'Lilongwe', country: 'Malawi' }, technologies: [], teamSize: 1, projectValue: { amount: 100, currency: 'MWK' }, isPublished: false, featuredImage: imageFile(), galleryImages: [imageFile()] }), data => [data], data => [{ ...data, _id: id }]],
];
for (const [name, source, create, update, data, createArgs, updateArgs] of cases) {
  for (const operation of ['create', 'update']) test(`actual CMS ${name} ${operation} serializer matches the backend upload contract`, async () => {
    const actions = loadCmsActions(source, name === 'product' ? 'sales-admin' : 'web-admin');
    const result = await actions[operation === 'create' ? create : update](...(operation === 'create' ? createArgs(data()) : updateArgs(data())));
    assert.equal(result.success, true, JSON.stringify(result));
    assert.ok(saved);
    const expectedFiles = name === 'slide' ? 1 : 2;
    assert.equal(uploads.filter(upload => upload.options.method === 'POST').length, expectedFiles);
    assert.ok(JSON.stringify(saved).includes('supabase.co/storage/v1/object/public/elsfiles/'));
  });
}

test('actual CMS testimonial serializer matches the backend upload contract', async () => {
  const actions = loadCmsActions('app/web-admin/testimonials/action.ts', 'web-admin');
  const result = await actions.createTestimonial({ content: 'A sufficiently long testimonial.', rating: 5, author: { name: 'Test customer' }, type: 'text', authorImage: imageFile() });
  assert.equal(result.success, true, JSON.stringify(result));
  url(saved.author.image);
});
