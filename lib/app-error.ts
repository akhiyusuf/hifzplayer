/** Recover from the app `error.tsx` boundary. `reset()` alone does not reload the server route. */
export function retryAppError(reset: () => void) {
  try {
    reset();
  } finally {
    if (typeof window !== "undefined") window.location.reload();
  }
}
