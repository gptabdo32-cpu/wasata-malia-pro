import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  json,
  uniqueIndex,
  check,
  sql,
} from "drizzle-orm/mysql-core";

// ============ CORE USER & AUTH ============

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  userType: mysqlEnum("userType", ["buyer", "seller", "both"]).default("buyer").notNull(),
  status: mysqlEnum("status", ["active", "suspended"]).default("active").notNull(),
  
  // Profile & KYC
  bio: text("bio"),
  city: varchar("city", { length: 100 }),
  profileImage: text("profileImage"),
  kycStatus: mysqlEnum("kycStatus", ["none", "pending", "verified", "rejected"]).default("none").notNull(),
  identityDocumentUrl: text("identityDocumentUrl"),
  identityVerifiedAt: timestamp("identityVerifiedAt"),
  phoneVerifiedAt: timestamp("phoneVerifiedAt"),
  
  isTrustedSeller: boolean("isTrustedSeller").default(false).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============ WALLET & FINANCIALS ============

export const wallets = mysqlTable("wallets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  balance: decimal("balance", { precision: 15, scale: 2 }).default("0.00").notNull(),
  pendingBalance: decimal("pendingBalance", { precision: 15, scale: 2 }).default("0.00").notNull(),
  totalEarned: decimal("totalEarned", { precision: 15, scale: 2 }).default("0.00").notNull(),
  totalWithdrawn: decimal("totalWithdrawn", { precision: 15, scale: 2 }).default("0.00").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const transactions = mysqlTable("transactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["deposit", "withdrawal", "payment", "refund", "commission", "transfer"]).notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["pending", "completed", "failed", "reversed"]).default("pending").notNull(),
  reference: varchar("reference", { length: 100 }),
  referenceType: varchar("referenceType", { length: 50 }), // e.g., "escrow", "withdrawal", "p2p"
  referenceId: int("referenceId"),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

export const depositRequests = mysqlTable("depositRequests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  convertedAmount: decimal("convertedAmount", { precision: 15, scale: 2 }).notNull(),
  paymentMethod: varchar("paymentMethod", { length: 50 }).notNull(),
  paymentDetails: text("paymentDetails"), // Encrypted JSON
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  adminNotes: text("adminNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const withdrawalRequests = mysqlTable("withdrawalRequests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  paymentMethod: varchar("paymentMethod", { length: 50 }).notNull(),
  paymentDetails: text("paymentDetails"), // Encrypted JSON
  status: mysqlEnum("status", ["pending", "processing", "completed", "rejected"]).default("pending").notNull(),
  adminNotes: text("adminNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type InsertWithdrawalRequest = typeof withdrawalRequests.$inferInsert;

// ============ ESCROW SYSTEM ============

export const escrows = mysqlTable("escrows", {
  id: int("id").autoincrement().primaryKey(),
  buyerId: int("buyerId").notNull(),
  sellerId: int("sellerId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  commissionAmount: decimal("commissionAmount", { precision: 15, scale: 2 }).notNull(),
  commissionPaidBy: mysqlEnum("commissionPaidBy", ["buyer", "seller", "split"]).default("seller").notNull(),
  status: mysqlEnum("status", [
    "PENDING",
    "LOCKED",
    "RELEASED",
    "DISPUTED",
    "REFUNDED",
    "CANCELLED"
  ]).default("PENDING").notNull(),
  
  // Dispute fields
  disputeReason: text("disputeReason"),
  disputeRaisedBy: int("disputeRaisedBy"),
  disputeRaisedAt: timestamp("disputeRaisedAt"),
  disputeResolution: text("disputeResolution"),
  disputeResolvedAt: timestamp("disputeResolvedAt"),
  
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Escrow = typeof escrows.$inferSelect;
export type InsertEscrow = typeof escrows.$inferInsert;

export const escrowMilestones = mysqlTable("escrowMilestones", {
  id: int("id").autoincrement().primaryKey(),
  escrowId: int("escrowId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["pending", "in_progress", "completed", "released", "disputed"]).default("pending").notNull(),
  verificationType: mysqlEnum("verificationType", ["manual", "github_commit", "github_pr", "url_check"]).default("manual"),
  verificationData: json("verificationData"),
  completedAt: timestamp("completedAt"),
  releasedAt: timestamp("releasedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type InsertEscrowMilestone = typeof escrowMilestones.$inferInsert;

// ============ DISPUTE MANAGEMENT ============

export const disputes = mysqlTable("disputes", {
  id: int("id").autoincrement().primaryKey(),
  escrowId: int("escrowId").notNull(),
  initiatorId: int("initiatorId").notNull(),
  reason: text("reason").notNull(),
  status: mysqlEnum("status", ["open", "under_review", "resolved", "closed"]).default("open").notNull(),
  resolution: mysqlEnum("resolution", ["buyer_refund", "seller_payout", "split"]).nullable(),
  adminId: int("adminId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  uniqueEscrowDispute: uniqueIndex("disputes_escrow_unique_idx").on(table.escrowId),
}));

export const disputeMessages = mysqlTable("disputeMessages", {
  id: int("id").autoincrement().primaryKey(),
  escrowId: int("escrowId").notNull(),
  senderId: int("senderId").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const disputeEvidence = mysqlTable("disputeEvidence", {
  id: int("id").autoincrement().primaryKey(),
  escrowId: int("escrowId").notNull(),
  uploaderId: int("uploaderId").notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileType: mysqlEnum("fileType", ["image", "video", "document"]).notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ============ PRODUCTS & SERVICES ============

export const digitalProducts = mysqlTable("digitalProducts", {
  id: int("id").autoincrement().primaryKey(),
  sellerId: int("sellerId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }).notNull(),
  price: decimal("price", { precision: 15, scale: 2 }).notNull(),
  thumbnailUrl: text("thumbnailUrl"),
  previewUrl: text("previewUrl"),
  deliveryType: mysqlEnum("deliveryType", ["instant", "manual", "email"]).default("manual").notNull(),
  productCodes: json("productCodes"),
  isActive: boolean("isActive").default(true).notNull(),
  isFeatured: boolean("isFeatured").default(false).notNull(),
  salesCount: int("salesCount").default(0).notNull(),
  averageRating: decimal("averageRating", { precision: 3, scale: 2 }).default("0.00").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type InsertDigitalProduct = typeof digitalProducts.$inferInsert;

export const physicalProducts = mysqlTable("physicalProducts", {
  id: int("id").autoincrement().primaryKey(),
  sellerId: int("sellerId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }).notNull(),
  price: decimal("price", { precision: 15, scale: 2 }).notNull(),
  condition: mysqlEnum("condition", ["new", "used"]).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  images: json("images"),
  isActive: boolean("isActive").default(true).notNull(),
  isFeatured: boolean("isFeatured").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const vehicles = mysqlTable("vehicles", {
  id: int("id").autoincrement().primaryKey(),
  sellerId: int("sellerId").notNull(),
  make: varchar("make", { length: 100 }).notNull(),
  model: varchar("model", { length: 100 }).notNull(),
  year: int("year").notNull(),
  price: decimal("price", { precision: 15, scale: 2 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const services = mysqlTable("services", {
  id: int("id").autoincrement().primaryKey(),
  sellerId: int("sellerId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  price: decimal("price", { precision: 15, scale: 2 }).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ============ REVIEWS & TRUST ============

export const reviews = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  reviewerId: int("reviewerId").notNull(),
  revieweeId: int("revieweeId").notNull(),
  rating: int("rating").notNull(),
  comment: text("comment"),
  escrowId: int("escrowId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const aiArbitratorAnalyses = mysqlTable("aiArbitratorAnalyses", {
  id: int("id").autoincrement().primaryKey(),
  escrowId: int("escrowId").notNull(),
  fairnessScore: int("fairnessScore").notNull(),
  legalRiskLevel: mysqlEnum("legalRiskLevel", ["low", "medium", "high", "critical"]).notNull(),
  analysisResults: json("analysisResults").notNull(),
  summary: text("summary").notNull(),
  status: mysqlEnum("status", ["pending", "completed", "failed"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type InsertReview = typeof reviews.$inferInsert;

// ============ SAGA STATE MACHINE ============

export const escrowSagaInstances = mysqlTable("escrow_saga_instances", {
  id: int("id").autoincrement().primaryKey(),
  correlationId: varchar("correlationId", { length: 64 }).notNull().unique(),
  escrowId: int("escrowId").notNull(),
  status: mysqlEnum("status", ["INIT", "ESCROW_CREATED", "FUNDS_PENDING", "COMPLETED", "FAILED"]).default("INIT").notNull(),
  payload: json("payload").notNull(),
  error: text("error"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EscrowSagaInstance = typeof escrowSagaInstances.$inferSelect;
export type InsertEscrowSagaInstance = typeof escrowSagaInstances.$inferInsert;

export const trustedSellerSubscriptions = mysqlTable("trustedSellerSubscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  plan: mysqlEnum("plan", ["monthly", "yearly"]).notNull(),
  status: mysqlEnum("status", ["active", "expired", "cancelled"]).default("active").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type InsertTrustedSellerSubscription = typeof trustedSellerSubscriptions.$inferInsert;

// ============ NOTIFICATIONS & CHAT ============

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: varchar("type", { length: 50 }).notNull(), // e.g., "escrow", "payment", "system", "dispute"
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  link: text("link"),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type InsertNotification = typeof notifications.$inferInsert;

export const chatConversations = mysqlTable("chatConversations", {
  id: int("id").autoincrement().primaryKey(),
  buyerId: int("buyerId").notNull(),
  sellerId: int("sellerId").notNull(),
  lastMessage: text("lastMessage"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  uniqueConversationPair: uniqueIndex("chat_conversations_pair_idx").on(table.buyerId, table.sellerId),
}));

export type InsertChatConversation = typeof chatConversations.$inferInsert;

export const chatMessages = mysqlTable("chatMessages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  senderId: int("senderId").notNull(),
  message: text("message").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type InsertChatMessage = typeof chatMessages.$inferInsert;

export const chatReadReceipts = mysqlTable("chatReadReceipts", {
  id: int("id").autoincrement().primaryKey(),
  messageId: int("messageId").notNull(),
  userId: int("userId").notNull(),
  readAt: timestamp("readAt").defaultNow().notNull(),
});

export type InsertChatReadReceipt = typeof chatReadReceipts.$inferInsert;

export const chatMessageReactions = mysqlTable("chatMessageReactions", {
  id: int("id").autoincrement().primaryKey(),
  messageId: int("messageId").notNull(),
  userId: int("userId").notNull(),
  reaction: varchar("reaction", { length: 50 }).notNull(),
});

export type InsertChatMessageReaction = typeof chatMessageReactions.$inferInsert;

export const chatAttachments = mysqlTable("chatAttachments", {
  id: int("id").autoincrement().primaryKey(),
  messageId: int("messageId").notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileType: varchar("fileType", { length: 50 }).notNull(),
  fileName: varchar("fileName", { length: 255 }),
});

export type InsertChatAttachment = typeof chatAttachments.$inferInsert;

// ============ SYSTEM & ADMIN ============

export const platformSettings = mysqlTable("platformSettings", {
  id: int("id").autoincrement().primaryKey(),
  siteName: varchar("siteName", { length: 100 }).default("Wathiqly").notNull(),
  maintenanceMode: boolean("maintenanceMode").default(false).notNull(),
  escrowFeePercentage: decimal("escrowFeePercentage", { precision: 5, scale: 2 }).default("5.00").notNull(),
  minWithdrawalAmount: decimal("minWithdrawalAmount", { precision: 15, scale: 2 }).default("10.00").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type InsertPlatformSettings = typeof platformSettings.$inferInsert;

export const adminLogs = mysqlTable("adminLogs", {
  id: int("id").autoincrement().primaryKey(),
  adminId: int("adminId").notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  targetType: varchar("targetType", { length: 50 }),
  targetId: int("targetId"),
  details: text("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type InsertAdminLog = typeof adminLogs.$inferInsert;

export const auditLogs = mysqlTable("auditLogs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entityType", { length: 50 }).notNull(),
  entityId: varchar("entityId", { length: 64 }).notNull(),
  oldValue: text("oldValue"),
  newValue: text("newValue"),
  correlationId: varchar("correlationId", { length: 64 }).default("").notNull(),
  metadata: json("metadata"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ============ ADVANCED FEATURES (IoT, Blockchain, Ledger) ============

export const iotDevices = mysqlTable("iotDevices", {
  id: int("id").autoincrement().primaryKey(),
  escrowId: int("escrowId").notNull(),
  deviceId: varchar("deviceId", { length: 100 }).notNull(),
  deviceType: mysqlEnum("deviceType", ["gps_tracker", "temp_sensor", "humidity_sensor", "impact_sensor", "smart_lock"]).notNull(),
  secureToken: varchar("secureToken", { length: 255 }).unique().notNull(),
  lastReading: json("lastReading"),
  status: mysqlEnum("status", ["active", "inactive", "triggered", "tampered"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type InsertIotDevice = typeof iotDevices.$inferInsert;

export const blockchainLogs = mysqlTable("blockchainLogs", {
  id: int("id").autoincrement().primaryKey(),
  escrowId: int("escrowId").notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  txHash: varchar("txHash", { length: 255 }).notNull(),
  network: varchar("network", { length: 50 }).default("polygon_mumbai"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type InsertBlockchainLog = typeof blockchainLogs.$inferInsert;

export const milestoneSignatures = mysqlTable("milestoneSignatures", {
  id: int("id").autoincrement().primaryKey(),
  milestoneId: int("milestoneId").notNull(),
  userId: int("userId").notNull(),
  signature: text("signature").notNull(),
  signedAt: timestamp("signedAt").defaultNow().notNull(),
});

export type InsertMilestoneSignature = typeof milestoneSignatures.$inferInsert;

export const timedLinks = mysqlTable("timedLinks", {
  id: int("id").autoincrement().primaryKey(),
  linkToken: varchar("linkToken", { length: 64 }).notNull().unique(),
  createdBy: int("createdBy").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  status: mysqlEnum("status", ["active", "expired", "used", "cancelled"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const inspectionReports = mysqlTable("inspectionReports", {
  id: int("id").autoincrement().primaryKey(),
  escrowId: int("escrowId"),
  inspectorId: int("inspectorId").notNull(),
  summary: text("summary").notNull(),
  conditionScore: int("conditionScore").default(0),
  mediaUrls: json("mediaUrls"),
  status: mysqlEnum("status", ["pending", "completed", "approved", "rejected"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});


export const mediatorRequests = mysqlTable("mediator_requests", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  escrowId: int("escrowId").notNull(),
  requestedBy: int("requestedBy").notNull(),
  mediatorId: int("mediatorId"),
  status: mysqlEnum("status", ["pending", "accepted", "active", "resolved", "cancelled"]).default("pending").notNull(),
  fee: decimal("fee", { precision: 15, scale: 2 }).default("10.00").notNull(),
  feeTransactionId: int("feeTransactionId"),
  reason: text("reason"),
  requestedAt: timestamp("requestedAt").defaultNow().notNull(),
  acceptedAt: timestamp("acceptedAt"),
  resolvedAt: timestamp("resolvedAt"),
  resolution: text("resolution"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const schema = {
  users,
  wallets,
  transactions,
  depositRequests,
  withdrawalRequests,
  escrows,
  escrowMilestones,
  disputes,
  disputeMessages,
  disputeEvidence,
  digitalProducts,
  physicalProducts,
  vehicles,
  services,
  reviews,
  aiArbitratorAnalyses,
  escrowSagaInstances,
  trustedSellerSubscriptions,
  notifications,
  chatConversations,
  chatMessages,
  chatReadReceipts,
  chatMessageReactions,
  chatAttachments,
  platformSettings,
  adminLogs,
  auditLogs,
  iotDevices,
  blockchainLogs,
  milestoneSignatures,
  timedLinks,
  inspectionReports,
  mediatorRequests,
} as const;

export type Schema = typeof schema;

// ============ AUTH & OTP ============

export const otpChallenges = mysqlTable("otp_challenges", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  challengeId: varchar("challengeId", { length: 64 }).notNull(),
  codeHash: varchar("codeHash", { length: 255 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  attempts: int("attempts").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OtpChallenge = typeof otpChallenges.$inferSelect;
export type InsertOtpChallenge = typeof otpChallenges.$inferInsert;

export const databaseSchema = schema;
