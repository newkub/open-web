import { useState } from 'react';
import { iconFileFor } from '@wrikka/open-web/icons';

export { iconFileFor };

export function FileIcon({
  path,
  isDir = false,
  size = 15,
  className = '',
}: {
  path: string;
  isDir?: boolean;
  size?: number;
  className?: string;
}) {
  const file = iconFileFor(path, isDir);
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <span className={`fileicon fileicon-fallback ${className}`} style={{ width: size, height: size }} />;
  }
  return (
    <img
      className={`fileicon ${className}`}
      src={`${import.meta.env.BASE_URL}mit-icons/${file}`}
      width={size}
      height={size}
      alt=""
      draggable={false}
      onError={() => setFailed(true)}
    />
  );
}
