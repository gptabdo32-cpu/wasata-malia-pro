export const PLATFORM_VERSION = "v10.0" as const;
export const PLATFORM_NAME = "Wathiqly" as const;

export const PLATFORM_RUNTIME = {
  name: PLATFORM_NAME,
  version: PLATFORM_VERSION,
  apiEntry: "apps/api/src/runtime/index.ts",
  webEntry: "apps/web/src/main.tsx",
  defaultApiPrefix: "/api",
} as const;

export const PLATFORM_POLICY = {
  sessionCookieName: "wathiqly_session",
  authRequiredMessage: "Authentication required",
  adminRequiredMessage: "Administrative access required",
  trustedUploadPrefix: "/uploads/",
  allowedHttpsProtocol: "https:",
  maxUploadSizeMb: 10,
  allowedUploadMimeTypes: ["image/jpeg", "image/png", "application/pdf"] as const,
  allowedRoles: ["user", "admin"] as const,
  allowedKycStatuses: ["none", "pending", "verified", "rejected"] as const,
} as const;

export const THEME_STORAGE_KEY = "wathiqly.theme" as const;

export const DESIGN_SYSTEM_TOKENS = {
  radius: 0.65,
  brand: {
    primary: "oklch(0.623 0.214 259.815)",
    primaryDark: "oklch(0.488 0.243 264.376)",
  },
  surfaces: {
    light: "oklch(1 0 0)",
    dark: "oklch(0.141 0.005 285.823)",
  },
} as const;

export const SOURCE_OF_TRUTH = {
  runtime: PLATFORM_RUNTIME,
  policy: PLATFORM_POLICY,
  designSystem: DESIGN_SYSTEM_TOKENS,
  themeStorageKey: THEME_STORAGE_KEY,
} as const;
