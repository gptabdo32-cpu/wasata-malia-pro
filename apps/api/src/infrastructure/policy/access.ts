import { TRPCError } from "@trpc/server";
import { PLATFORM_POLICY } from "@shared/platform";
import { ENV as ConfigEnv } from "../config/env";

type MinimalUser = {
  id: number;
  role?: string | null;
  status?: string | null;
};

const ALLOWED_INTERNAL_UPLOAD_PREFIX = PLATFORM_POLICY.trustedUploadPrefix;

export function assertAuthenticated<T extends MinimalUser | null | undefined>(
  user: T,
  message = PLATFORM_POLICY.authRequiredMessage
): asserts user is NonNullable<T> {
  if (!user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message });
  }
}

export function assertAdmin(user: MinimalUser | null | undefined, message = PLATFORM_POLICY.adminRequiredMessage) {
  assertAuthenticated(user);
  if (user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message });
  }
}

export function assertOwnerOrAdmin(
  user: MinimalUser | null | undefined,
  ownerId: number,
  message = "You are not authorized to access this resource"
) {
  assertAuthenticated(user);
  if (user.role !== "admin" && user.id !== ownerId) {
    throw new TRPCError({ code: "FORBIDDEN", message });
  }
}

export function assertParticipantOrAdmin(
  user: MinimalUser | null | undefined,
  participantIds: Array<number | null | undefined>,
  message = "You are not authorized to access this resource"
) {
  assertAuthenticated(user);
  if (user.role === "admin") return;
  if (!participantIds.some((id) => typeof id === "number" && id === user.id)) {
    throw new TRPCError({ code: "FORBIDDEN", message });
  }
}

/**
 * Enforces that user-supplied file URLs only point to our controlled storage space.
 */
export function assertTrustedUploadUrl(url: string, fieldName = "fileUrl"): string {
  const normalized = url.trim();
  if (!normalized) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `${fieldName} is required` });
  }

  if (normalized.startsWith(ALLOWED_INTERNAL_UPLOAD_PREFIX)) {
    return normalized;
  }

  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== PLATFORM_POLICY.allowedHttpsProtocol) {
      throw new Error("Only HTTPS uploads are allowed");
    }

    const allowedHosts = ConfigEnv.allowedUploadHosts;

    if (allowedHosts.length > 0 && !allowedHosts.includes(parsed.host)) {
      throw new Error("Upload host is not allowed");
    }

    return normalized;
  } catch {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Untrusted ${fieldName}. Use the platform storage service or an allowed HTTPS upload URL.`,
    });
  }
}

const MONEY_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;

export function assertPositiveAmount(amount: string, fieldName = "amount"): number {
  const raw = String(amount ?? "").trim();
  if (!raw) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `${fieldName} is required` });
  }
  if (!MONEY_PATTERN.test(raw)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `${fieldName} must be a valid positive number with at most 2 decimal places` });
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `${fieldName} must be a positive number`,
    });
  }

  return Number(parsed.toFixed(2));
}

/**
 * Validates notification / UI links. Supports same-origin relative paths and HTTPS URLs.
 */
export function assertSafeLink(url: string, fieldName = "link"): string {
  const normalized = url.trim();
  if (!normalized) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `${fieldName} is required` });
  }

  if (normalized.startsWith("/")) return normalized;

  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== PLATFORM_POLICY.allowedHttpsProtocol) {
      throw new Error("Only HTTPS links are allowed");
    }
    return normalized;
  } catch {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Untrusted ${fieldName}. Use a relative path or an HTTPS URL.`,
    });
  }
}
