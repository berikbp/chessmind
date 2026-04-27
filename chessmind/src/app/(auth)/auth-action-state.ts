export interface AuthActionState {
  error: string | null;
  redirectTo?: string;
}

export const initialAuthActionState: AuthActionState = {
  error: null,
};
