const AUTH_UNAVAILABLE_MESSAGE = "Foxfam could not verify your session. Your saved data has not been changed.";

export function classifyAuthFailure(error) {
  if (Number(error?.status) === 401) return null;
  return {
    type: "auth_unavailable",
    message: AUTH_UNAVAILABLE_MESSAGE,
  };
}

export function isAuthUnavailable(authError) {
  return ["auth_unavailable", "unknown"].includes(authError?.type);
}
