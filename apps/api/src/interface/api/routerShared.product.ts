export function normalizeText(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

export function normalizeProduct(row: any, type: string) {
  if (!row) return null;
  return {
    id: row.id,
    type,
    sellerId: row.sellerId,
    title: row.title,
    description: row.description ?? null,
    category: row.category ?? null,
    price: row.price,
    city: row.city ?? null,
    thumbnailUrl: row.thumbnailUrl ?? row.images?.[0] ?? null,
    previewUrl: row.previewUrl ?? null,
    deliveryType: row.deliveryType ?? null,
    isActive: Boolean(row.isActive ?? true),
    isFeatured: Boolean(row.isFeatured ?? false),
    createdAt: row.createdAt ?? new Date(),
  };
}
