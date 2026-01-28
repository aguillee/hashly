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
  status: z.enum(["UPCOMING", "LIVE", "ENDED"]).optional(),
});

// ============================================
// QUERY VALIDATIONS
// ============================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const eventFiltersSchema = z.object({
  status: z.enum(["UPCOMING", "LIVE", "ENDED", "all"]).optional(),
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
