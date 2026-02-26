/**
 * Filter groups by staff role: admins see all groups, trainers see only groups they coach.
 * @param {Array} groups - List of groups from UserGroup.list()
 * @param {{ email?: string } | null} currentUser - Current staff user
 * @param {boolean} isSystemAdmin - Whether current user is system admin
 * @returns {Array} Filtered groups
 */
export function groupsForStaff(groups, currentUser, isSystemAdmin) {
  if (!Array.isArray(groups)) return [];
  if (isSystemAdmin) return groups;
  const email = (currentUser?.email || '').toLowerCase();
  if (!email) return [];
  return groups.filter((g) => (g.assigned_coach || '').toLowerCase() === email);
}
