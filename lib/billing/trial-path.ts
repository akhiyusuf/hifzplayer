export const TRIAL_START_QUERY = "start_trial";
export const TRIAL_RETURN_PATH = `/pricing?${TRIAL_START_QUERY}=1`;

/** Sign-in (with sign-up on that screen) before the trial can be granted. */
export function trialSignInHref(returnPath = TRIAL_RETURN_PATH) {
  return `/sign-in?redirect_url=${encodeURIComponent(returnPath)}`;
}

export function trialSignUpHref(returnPath = TRIAL_RETURN_PATH) {
  return `/sign-up?redirect_url=${encodeURIComponent(returnPath)}`;
}

export function wantsStartTrial(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "1";
}
