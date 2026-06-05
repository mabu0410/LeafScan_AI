const ADMIN_EMAILS = (process.env.EXPO_PUBLIC_ADMIN_EMAILS || '')
  .split(',')
  .map((item: string) => item.trim().toLowerCase())
  .filter(Boolean);

export function isAdminAccount(user?: { email?: string; role?: string } | null) {
  const role = (user?.role || '').trim().toLowerCase();
  const email = (user?.email || '').trim().toLowerCase();
  return role === 'admin' || Boolean(email && ADMIN_EMAILS.includes(email));
}
