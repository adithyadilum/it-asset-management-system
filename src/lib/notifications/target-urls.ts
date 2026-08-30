/**
 * Where a notification sends the recipient when they click it.
 *
 * `app_notifications.target_url` is persisted at dispatch time and read back
 * verbatim by the bell dropdown, so a wrong value here is baked into every
 * notification already sent — there is no routing table to correct it later.
 * Keeping the destinations in one place is what stops them drifting apart.
 */

/**
 * Where an employee acts on their own assignments: accepting, declining and
 * returning all happen here.
 *
 * Employees have no dashboard — `/dashboard` redirects them straight here — so
 * pointing at `/dashboard` only added a bounce, and the notification copy that
 * told them to go to their dashboard described a page they never see.
 */
export const EMPLOYEE_ASSIGNMENTS_URL = '/my-assets';

/**
 * Where an admin reviews assignment activity.
 */
export const ADMIN_ASSIGNMENTS_URL = '/operations/assignments';

/**
 * Deep link to a single assignment in the employee view.
 *
 * The previous form pointed at `/portal/my-assets`, a route that does not exist
 * in the app tree — every one of those notifications 404'd on click.
 */
export function employeeAssignmentUrl(assignmentId: number | string) {
  return `${EMPLOYEE_ASSIGNMENTS_URL}?assignmentId=${assignmentId}`;
}

/**
 * Deep link to a single assignment in the admin view.
 */
export function adminAssignmentUrl(assignmentId: number | string) {
  return `${ADMIN_ASSIGNMENTS_URL}?assignmentId=${assignmentId}`;
}
