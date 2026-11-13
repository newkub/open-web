// open-web preview shell — serves a blank page that decodes a gzip+base64
// payload from location.hash and document.writes it into the document.
// Running on this dedicated origin gives previews a real https URL (so
// history routers like vue-router work) while isolating them from the
// app origin's localStorage (GitHub tokens etc.).

const SHELL_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>open-web preview</title></head>
<body>
<script>
(async function () {
  var h = location.hash.slice(1);
  if (!h) {
    document.body.innerHTML = '<p style="font:14px system-ui;padding:24px;color:#888">open-web preview shell — no payload</p>';
    return;
  }
  try {
    var bin = Uint8Array.from(atob(h), function (c) { return c.charCodeAt(0); });
    var stream = new Blob([bin]).stream().pipeThrough(new DecompressionStream('gzip'));
    var text = await new Response(stream).text();
    document.open();
    document.write(text);
    document.close();
  } catch (e) {
    document.body.innerHTML = '<pre style="color:#ff7b72;background:#0d1117;padding:16px;font:12px/1.5 ui-monospace,Consolas,monospace;white-space:pre-wrap">preview decode error: ' + ((e && e.message) || e) + '</pre>';
  }
})();
</script>
</body></html>`;

export default {
  fetch(): Response {
    return new Response(SHELL_HTML, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
      },
    });
  },
};
