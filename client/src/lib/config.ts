export const BACKEND_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:5000';

export function getAvatarUrl(avatarPath: string | null | undefined): string {
  if (!avatarPath) return '';
  if (avatarPath.startsWith('http')) return avatarPath;
  return `${BACKEND_URL}${avatarPath}`;
}
