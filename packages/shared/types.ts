/**
 * Shared domain-neutral types.
 * This package intentionally avoids importing from application-specific schemas.
 */

export type UUID = string;
export type ISODateString = string;

export interface MoneyAmount {
  value: string;
  currency: string;
}

export interface Timestamped {
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface PaginationQuery {
  limit?: number;
  offset?: number;
}

export interface PaginationResult<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}
