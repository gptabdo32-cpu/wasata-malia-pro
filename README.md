# Wathiqly Enterprise Platform

## V7 governance

This codebase now treats the following as canonical and single-sourced:

- Runtime: `apps/api/src/runtime/index.ts`
- Schema registry: `apps/api/src/infrastructure/db/schema.ts` and its exported `schema` registry
- Policy: `apps/api/src/infrastructure/policy/access.ts` backed by `packages/shared/platform.ts`
- Design system: `apps/web/src/design-system.css`
- Source of truth: `packages/shared/platform.ts`

## Notes

- Legacy layers remain available only as compatibility shims.
- `packages/shared/index.ts` is the preferred public shared barrel.


## Production deployment

1. Copy `.env.example` to `.env` and fill the production values.
2. Run `pnpm install --frozen-lockfile`.
3. Run `pnpm build`.
4. Start locally with `pnpm start:prod` or via `docker compose up --build`.
5. For CI, use `pnpm ci`.

### Production checklist

- Set `DATABASE_URL`, `REDIS_URL`, `CORS_ORIGINS`, `VITE_APP_ID`, and all secrets.
- Keep `JWT_SECRET`, `SERVER_SECRET`, `COOKIE_SECRET`, and `ENCRYPTION_KEY` unique per environment.
- Use HTTPS in front of the app in real deployments.
