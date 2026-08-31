export function normalizeGitHubLogin(login: string) {
  return login.trim().toLowerCase();
}

export function isAllowedGitHubLogin(login: string, allowedLogin: string) {
  return normalizeGitHubLogin(login) === normalizeGitHubLogin(allowedLogin);
}
