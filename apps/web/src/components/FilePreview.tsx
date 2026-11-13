import { useEffect, useState } from 'react';
import { getVfs } from '../vfs';

const MIME: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
  webp: 'image/webp', svg: 'image/svg+xml', avif: 'image/avif', ico: 'image/x-icon',
  mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', m4a: 'audio/mp4', flac: 'audio/flac',
  mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
  pdf: 'application/pdf',
  woff: 'font/woff', woff2: 'font/woff2', ttf: 'font/ttf',
};

function mimeFor(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  return MIME[ext] ?? 'application/octet-stream';
}

/** Renders binary files (images, audio, video, pdf, fonts) via a blob URL. */
export function FilePreview({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [mime, setMime] = useState('');

  useEffect(() => {
    let revoked = '';
    let alive = true;
    setUrl(null);
    void getVfs().then((vfs) => {
      const data = vfs.read_file(path);
      if (!data || !alive) return;
      const m = mimeFor(path);
      const blob = new Blob([data.slice().buffer as ArrayBuffer], { type: m });
      revoked = URL.createObjectURL(blob);
      setMime(m);
      setUrl(revoked);
    });
    return () => {
      alive = false;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [path]);

  if (!url) return <div className="binary-note">Loading {path}…</div>;

  if (mime.startsWith('image/')) {
    return (
      <div className="file-preview file-preview-img">
        <img src={url} alt={path} />
      </div>
    );
  }
  if (mime.startsWith('audio/')) {
    return (
      <div className="file-preview">
        <p className="preview-name">{path}</p>
        <audio controls src={url} />
      </div>
    );
  }
  if (mime.startsWith('video/')) {
    return (
      <div className="file-preview">
        <video controls src={url} />
      </div>
    );
  }
  if (mime === 'application/pdf') {
    return <iframe className="file-preview-pdf" src={url} title={path} />;
  }
  if (mime.startsWith('font/')) {
    return (
      <div className="file-preview">
        <p className="preview-name">{path} ({mime})</p>
        <p className="preview-name">Fonts can't be previewed inline — download via shell.</p>
      </div>
    );
  }
  return <div className="binary-note">Binary file ({mime}) — {path}</div>;
}
