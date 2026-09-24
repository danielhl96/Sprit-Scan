export type AuthenticatedRequest = Request & {
  user?: JwtPayload;
};
export type JwtPayload = {
  userId: string;
  email?: string;
};
