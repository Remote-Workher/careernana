// Lightweight client-side enrollment store.
//
// We use localStorage so a user who has already burned a monthly course-quota
// slot can re-enter the same course player without it counting again.
// (Real source of truth for *quota usage* is `member_monthly_usage` in the DB.)

const KEY_PREFIX = "rw_enrolled_courses:";

function key(userId: string) {
  return `${KEY_PREFIX}${userId}`;
}

function readAll(userId: string): string[] {
  try {
    const raw = localStorage.getItem(key(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function isEnrolled(userId: string | null | undefined, courseId: string): boolean {
  if (!userId || !courseId) return false;
  return readAll(userId).includes(courseId);
}

export function enroll(userId: string, courseId: string): void {
  if (!userId || !courseId) return;
  const set = new Set(readAll(userId));
  set.add(courseId);
  try {
    localStorage.setItem(key(userId), JSON.stringify(Array.from(set)));
  } catch {
    // ignore quota errors
  }
}

export function listEnrolled(userId: string | null | undefined): string[] {
  if (!userId) return [];
  return readAll(userId);
}
