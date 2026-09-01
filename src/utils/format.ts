export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0 || !bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch (e) {
    return dateString;
  }
}

export function getFileCategory(mimeType: string, filename: string): string {
  const mime = (mimeType || '').toLowerCase();
  const ext = (filename.split('.').pop() || '').toLowerCase();

  if (
    mime.includes('pdf') ||
    mime.includes('document') ||
    mime.includes('text') ||
    mime.includes('word') ||
    ['pdf', 'docx', 'doc', 'txt', 'rtf', 'odt', 'md'].includes(ext)
  ) {
    return 'Documents';
  }
  if (
    mime.includes('sheet') ||
    mime.includes('excel') ||
    mime.includes('csv') ||
    ['xlsx', 'xls', 'csv'].includes(ext)
  ) {
    return 'Spreadsheets';
  }
  if (mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif'].includes(ext)) {
    return 'Images';
  }
  if (mime.startsWith('video/') || ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) {
    return 'Videos';
  }
  if (mime.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(ext)) {
    return 'Audio';
  }
  if (
    mime.includes('zip') ||
    mime.includes('tar') ||
    mime.includes('compressed') ||
    ['zip', 'tar', 'gz', '7z', 'rar'].includes(ext)
  ) {
    return 'Archives';
  }
  return 'Other';
}
