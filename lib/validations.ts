import { z } from "zod";

// ============================================
// USER VALIDATIONS
// ============================================

// Hedera wallet address format: 0.0.XXXXX
export const walletAddressSchema = z
  .string()
  .regex(/^0\.0\.\d+$/, "Invalid Hedera wallet address format");

// ============================================
// EVENT VALIDATIONS
// ============================================

export const createEventSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title must be less than 100 characters")
    .trim(),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(2000, "Description must be less than 2000 characters")
    .trim(),
  mintDate: z.string().datetime({ message: "Invalid date format" }),
  mintPrice: z
    .string()
    .min(1, "Mint price is required")
    .max(50, "Mint price too long"),
  supply: z.number().int().positive().optional().nullable(),
  imageUrl: z
    .string()
    .url("Invalid image URL")
    .refine((url) => url.startsWith("https://"), { message: "Image URL must use HTTPS" })
    .optional()
    .nullable()
    .or(z.literal("")),
  websiteUrl: z
    .string()
    .url("Invalid website URL")
    .optional()
    .nullable()
    .or(z.literal("")),
  twitterUrl: z
    .string()
    .url("Invalid Twitter URL")
    .optional()
    .nullable()
    .or(z.literal("")),
  discordUrl: z
    .string()
    .url("Invalid Discord URL")
    .optional()
    .nullable()
    .or(z.literal("")),
  category: z.enum(["pfp", "art", "gaming", "utility", "music", "other"]).optional().nullable(),
  phases: z
    .array(
      z.object({
        name: z.string().min(1).max(50),
        startDate: z.string().datetime(),
        endDate: z.string().datetime().optional().nullable(),
        price: z.string().min(1).max(50),
        maxPerWallet: z.number().int().positive().optional().nullable(),
        supply: z.number().int().positive().optional().nullable(),
        isWhitelist: z.boolean(),
        order: z.number().int().min(0),
      })
    )
    .optional(),
});

export const updateEventSchema = createEventSchema.partial();

// ============================================
// VOTE VALIDATIONS
// ============================================

export const voteSchema = z.object({
  voteType: z.enum(["UP", "DOWN"]),
  useNftVotes: z.boolean().optional(),
});

// ============================================
// COLLECTION VOTE VALIDATIONS
// ============================================

export const collectionVoteSchema = z.object({
  voteType: z.enum(["UP", "DOWN"]),
  useNftVotes: z.boolean().optional(),
});

// ============================================
// ADMIN VALIDATIONS
// ============================================

export const addAdminSchema = z.object({
  walletAddress: walletAddressSchema,
});

export const updateEventStatusSchema = z.object({
  isApproved: z.boolean().optional(),
  status: z.enum(["UPCOMING", "LIVE"]).optional(),
});

// Token ID format: 0.0.XXXXX
export const tokenIdSchema = z
  .string()
  .regex(/^0\.0\.\d+$/, "Invalid token ID format. Expected: 0.0.xxxxx");

export const adminAddCollectionSchema = z.object({
  tokenId: tokenIdSchema,
  name: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
});

export const adminPendingActionSchema = z.object({
  collectionId: z.string().uuid("Invalid collection ID"),
  action: z.enum(["approve", "reject"]),
});

export const eventPendingActionSchema = z.object({
  eventId: z.string().uuid("Invalid event ID"),
  action: z.enum(["approve", "reject"]),
});

export const submitCollectionSchema = z.object({
  tokenId: tokenIdSchema,
});

// Meetup-specific fields validated separately
export const meetupFieldsSchema = z.object({
  host: z.string().max(100).optional().nullable(),
  language: z.string().max(20).optional().nullable(),
  locationType: z.enum(["IN_PERSON", "ONLINE"]).optional(),
  location: z.string().max(300).optional().nullable(),
  customLinks: z.array(
    z.object({
      name: z.string().max(50),
      url: z.string().url().max(500),
    })
  ).max(10).optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
});

// ============================================
// QUERY VALIDATIONS
// ============================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const eventFiltersSchema = z.object({
  status: z.enum(["UPCOMING", "LIVE", "all"]).optional(),
  category: z.string().optional(),
  search: z.string().max(100).optional(),
  sortBy: z.enum(["date", "votes", "newest"]).optional(),
});

// ============================================
// HELPER FUNCTION
// ============================================

export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const errorMessage = result.error.issues
    .map((e) => `${e.path.join(".")}: ${e.message}`)
    .join(", ");
  return { success: false, error: errorMessage };
}
