import type { Request } from 'express';

export type AuthenticatedRequest = Request & {
  user?: JwtPayload;
};
export type JwtPayload = {
  userId: string;
  email?: string;
};

export type DataBodyExpert = {
  prompt: string;
};

export type DataBodySpirits = {
  imageUrl?: string;
  base64Image?: string;
  prompt: string;
};
