/** Must match DashboardInterview — total minimum ms from click before interview UI is fully shown */
export const INTERVIEW_LAUNCH_MIN_MS = 5500

export const INTERVIEW_LOADER_UNTIL_KEY = 'prepview_interview_loader_until' as const

export function setInterviewLaunchDeadline() {
  try {
    sessionStorage.setItem(
      INTERVIEW_LOADER_UNTIL_KEY,
      String(Date.now() + INTERVIEW_LAUNCH_MIN_MS)
    )
  } catch {
    /* private mode / quota */
  }
}
