export interface CurrentUser {
  readonly id: string;
}

const PLACEHOLDER_CURRENT_USER: CurrentUser = {
  id: "owner-1",
};

// Temporary owner-only seam for S1. No session, cookie, or auth behavior lives here.
export function getCurrentUser(): CurrentUser {
  return PLACEHOLDER_CURRENT_USER;
}
