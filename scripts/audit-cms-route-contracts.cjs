// Static inventory of explicit CMS endpoint paths and registered backend routes.
// This checks paths; runtime serializers, methods and roles have separate tests.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
const routes = [], references = [], pages = [];
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
}
function parse(file) { return ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS); }
function visit(node, callback) { callback(node); ts.forEachChild(node, child => visit(child, callback)); }
for (const [name, prefix] of [['sales', '/api/v1/admin/sales'], ['web', '/api/v1/admin/web'], ['system', '/api/v1/admin/system'], ['auth', '/api/v1/auth']]) {
  const file = name === 'auth' ? path.join(root, 'els-backend/src/modules/auth/routes/auth.routes.ts') : path.join(root, `els-backend/src/modules/admin/${name}-admin/routes/${name}-admin.routes.ts`);
  visit(parse(file), node => {
    if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) return;
    const method = node.expression.name.text.toUpperCase(), arg = node.arguments[0];
    if (['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && arg && ts.isStringLiteral(arg)) routes.push({ method, path: prefix + arg.text });
  });
}
for (const file of walk(path.join(root, 'esl-cms/src')).filter(file => /\.tsx?$/.test(file))) {
  if (file.endsWith('page.tsx')) pages.push(path.relative(root, file).replaceAll('\\', '/'));
  visit(parse(file), node => {
    let endpoint;
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) endpoint = node.text;
    else if (ts.isTemplateExpression(node)) endpoint = node.head.text + node.templateSpans.map(span => (ts.isConditionalExpression(span.expression) ? '' : 'PARAM') + span.literal.text).join('');
    if (!endpoint?.startsWith('/api/v1/')) return;
    endpoint = endpoint.split('?')[0];
    const matchedRoutes = routes.filter(route => new RegExp('^' + route.path.replace(/:[^/]+/g, '[^/]+') + '$').test(endpoint));
    let parent = node;
    while (parent && !ts.isFunctionDeclaration(parent)) parent = parent.parent;
    const owner = parent?.name?.text || null;
    references.push({ file: path.relative(root, file).replaceAll('\\', '/'), owner, endpoint, matched: matchedRoutes.length > 0, routeMethods: matchedRoutes.map(route => route.method) });
  });
}
const report = { checkedAt: new Date().toISOString(), pages, routes, references, unmatched: references.filter(ref => !ref.matched) };
fs.mkdirSync(path.resolve(__dirname, '../migration-reports'), { recursive: true });
fs.writeFileSync(path.resolve(__dirname, '../migration-reports/cms-route-contract-inventory.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ pages: pages.length, routes: routes.length, endpointReferences: references.length, unmatched: report.unmatched }, null, 2));
if (report.unmatched.length) process.exitCode = 1;
