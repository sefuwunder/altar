// Altar server: serves the app. Images live in the browser's IndexedDB —
// the server holds no user data.
const ROOT = import.meta.dir;
const TYPES: Record<string, string> = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
};

Bun.serve({
  port: 3042,
  hostname: '127.0.0.1',
  async fetch(req) {
    const url = new URL(req.url);
    let path = url.pathname === '/' ? '/public/index.html' : url.pathname;
    // only serve from public/ and src/
    if (!path.startsWith('/public/') && !path.startsWith('/src/')) {
      path = '/public/index.html';
    }
    const file = Bun.file(`${ROOT}${path}`);
    if (!(await file.exists())) return new Response('Not found', { status: 404 });
    const ext = path.slice(path.lastIndexOf('.'));
    return new Response(file, {
      headers: { 'content-type': TYPES[ext] || 'application/octet-stream' },
    });
  },
});
console.log('Altar on http://127.0.0.1:3042');
