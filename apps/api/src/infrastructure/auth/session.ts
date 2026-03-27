import type { Request } from "express";
import { verifyJWT, type VerifiedJwtPayload } from "../security";
import { extractBearerToken, extractDevelopmentIdentity, extractSessionToken } from "./token";

export async function resolveUserFromRequest(req: Request): Promise<VerifiedJwtPayload | null> {
  const bearer = extractBearerToken(req);
  const session = extractSessionToken(req);
  const token = bearer ?? session;
  if (token) {
    return verifyJWT(token);
  }

  const devIdentity = extractDevelopmentIdentity(req);
  if (devIdentity) {
    return { id: devIdentity.id, role: devIdentity.role ?? "user", type: devIdentity.source };
  }

  return null;
}
