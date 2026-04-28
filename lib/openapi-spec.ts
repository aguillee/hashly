/**
 * OpenAPI 3.0 spec for the Hashly Public API.
 *
 * Served at /api/v1/openapi.json and rendered by Swagger UI on /api-docs.
 * The spec is the single source of truth for documentation; the actual route
 * handlers under app/api/v1/* implement what's described here.
 *
 * NOTE: Keep this in sync when you add/change a v1 endpoint.
 */

export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Hashly Public API",
    version: "1.0.0",
    description: [
      "Read-only access to Hashly's public datasets — events, leaderboard, ",
      "tokens, NFT collections and ecosystem projects on Hedera.",
      "",
      "All requests require an API key. Get one by contacting [@hashly_h](https://x.com/hashly_h).",
    ].join(""),
    contact: {
      name: "Hashly",
      url: "https://hash-ly.com",
      email: "hello@hash-ly.com",
    },
  },
  servers: [
    { url: "https://hash-ly.com/api/v1", description: "Production" },
    { url: "http://localhost:3000/api/v1", description: "Local dev" },
  ],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: "http",
        scheme: "bearer",
        description:
          "Pass your API key as `Authorization: Bearer <key>`. " +
          "Alternatively, you can pass `?api_key=<key>` as a query param.",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: { type: "string", example: "Missing API key." },
          code: {
            type: "string",
            enum: [
              "MISSING_API_KEY",
              "INVALID_API_KEY",
              "API_DISABLED",
              "RATE_LIMITED",
              "NOT_FOUND",
              "INTERNAL",
            ],
          },
        },
      },
      Event: {
        type: "object",
        properties: {
          id: { type: "string", example: "cmo7b3gw10000b00je5rnuu6z" },
          title: { type: "string", example: "Hedera DeFi Meetup #7" },
          description: { type: "string" },
          mintDate: { type: "string", format: "date-time", nullable: true },
          endDate: { type: "string", format: "date-time", nullable: true },
          mintPrice: { type: "string", example: "20 HBAR", nullable: true },
          supply: { type: "integer", nullable: true, example: 1000 },
          imageUrl: { type: "string", format: "uri", nullable: true },
          status: {
            type: "string",
            enum: ["UPCOMING", "LIVE", "ENDED"],
          },
          isForeverMint: { type: "boolean" },
          source: { type: "string", enum: ["SENTX", "KABILA", null], nullable: true },
          event_type: {
            type: "string",
            enum: ["MINT_EVENT", "ECOSYSTEM_MEETUP", "HACKATHON"],
          },
          host: { type: "string", nullable: true },
          location: { type: "string", nullable: true },
          location_type: {
            type: "string",
            enum: ["ONLINE", "IN_PERSON", "HYBRID", null],
            nullable: true,
          },
          votesUp: { type: "integer" },
          votesDown: { type: "integer" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      EventList: {
        type: "object",
        properties: {
          events: { type: "array", items: { $ref: "#/components/schemas/Event" } },
          total: { type: "integer", example: 142 },
          hasMore: { type: "boolean" },
        },
      },
      Token: {
        type: "object",
        properties: {
          id: { type: "string" },
          tokenAddress: { type: "string", example: "0.0.731861" },
          symbol: { type: "string", example: "SAUCE" },
          name: { type: "string", example: "SaucerSwap" },
          icon: { type: "string", format: "uri", nullable: true },
          totalVotes: { type: "integer" },
          rank: { type: "integer", example: 1 },
          priceUsd: { type: "number", nullable: true },
          marketCap: { type: "number", nullable: true },
        },
      },
      Collection: {
        type: "object",
        properties: {
          id: { type: "string" },
          tokenAddress: { type: "string", example: "0.0.7235629" },
          name: { type: "string", example: "Santuario Hedera" },
          image: { type: "string", format: "uri", nullable: true },
          owners: { type: "integer" },
          supply: { type: "integer" },
          totalVotes: { type: "integer" },
          rank: { type: "integer", example: 1 },
        },
      },
      LeaderboardEntry: {
        type: "object",
        properties: {
          rank: { type: "integer", example: 1 },
          walletAddress: { type: "string", example: "0.0.1097530" },
          alias: { type: "string", nullable: true, example: "PEMACLA" },
          missionPoints: { type: "integer" },
          badgePoints: { type: "integer" },
          badgeCount: { type: "integer" },
          referralPoints: { type: "integer" },
          totalPoints: { type: "integer" },
        },
      },
      EcosystemProject: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string", example: "HashPack" },
          slug: { type: "string", example: "hashpack" },
          categories: {
            type: "array",
            items: {
              type: "string",
              enum: [
                "DEFI", "TOOLS", "MARKETPLACE", "DATA", "COMMUNITY",
                "WALLET", "BRIDGE", "GAMING", "NFT", "EDUCATION",
                "INFRASTRUCTURE", "OTHER",
              ],
            },
          },
          countryCode: { type: "string", example: "ES" },
          logoUrl: { type: "string", format: "uri", nullable: true },
          description: { type: "string" },
          websiteUrl: { type: "string", format: "uri" },
          twitterUrl: { type: "string", format: "uri", nullable: true },
          discordUrl: { type: "string", format: "uri", nullable: true },
          telegramUrl: { type: "string", format: "uri", nullable: true },
          createdAt: { type: "string", format: "date-time" },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: "Missing or invalid API key.",
        content: {
          "application/json": { schema: { $ref: "#/components/schemas/Error" } },
        },
      },
      RateLimited: {
        description: "Too many requests.",
        content: {
          "application/json": { schema: { $ref: "#/components/schemas/Error" } },
        },
      },
      NotFound: {
        description: "Resource not found.",
        content: {
          "application/json": { schema: { $ref: "#/components/schemas/Error" } },
        },
      },
    },
  },
  security: [{ ApiKeyAuth: [] }],
  tags: [
    { name: "Events", description: "NFT mints, meetups and hackathons." },
    { name: "Tokens", description: "Top fungible tokens by community votes." },
    { name: "Collections", description: "Top NFT collections by community votes." },
    { name: "Leaderboard", description: "Season leaderboard." },
    { name: "Ecosystem", description: "Approved ecosystem projects building on Hedera." },
  ],
  paths: {
    "/events": {
      get: {
        tags: ["Events"],
        summary: "List events",
        description: "Returns approved events. Filter by status, type and source.",
        parameters: [
          {
            name: "status",
            in: "query",
            schema: { type: "string", enum: ["upcoming", "live", "ended", "all"] },
            description: "Filter by lifecycle state. Default excludes ENDED.",
          },
          {
            name: "eventType",
            in: "query",
            schema: { type: "string", enum: ["MINT_EVENT", "ECOSYSTEM_MEETUP", "HACKATHON"] },
          },
          {
            name: "source",
            in: "query",
            schema: { type: "string", enum: ["SENTX", "KABILA"] },
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
          },
          {
            name: "offset",
            in: "query",
            schema: { type: "integer", minimum: 0, default: 0 },
          },
        ],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/EventList" } },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/events/{id}": {
      get: {
        tags: ["Events"],
        summary: "Get event by ID",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Event" } },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/tokens/top": {
      get: {
        tags: ["Tokens"],
        summary: "Top tokens by votes",
        parameters: [
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 30 },
          },
        ],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    tokens: { type: "array", items: { $ref: "#/components/schemas/Token" } },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/collections/top": {
      get: {
        tags: ["Collections"],
        summary: "Top NFT collections by votes",
        parameters: [
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 30 },
          },
        ],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    collections: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Collection" },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/leaderboard": {
      get: {
        tags: ["Leaderboard"],
        summary: "Season leaderboard",
        parameters: [
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 50 },
          },
        ],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    leaderboard: {
                      type: "array",
                      items: { $ref: "#/components/schemas/LeaderboardEntry" },
                    },
                    season: {
                      type: "object",
                      properties: {
                        number: { type: "integer" },
                        name: { type: "string" },
                        startDate: { type: "string", format: "date-time" },
                        endDate: { type: "string", format: "date-time" },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/ecosystem": {
      get: {
        tags: ["Ecosystem"],
        summary: "List approved ecosystem projects",
        parameters: [
          { name: "category", in: "query", schema: { type: "string" } },
          { name: "country", in: "query", schema: { type: "string", example: "ES" } },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 50 },
          },
          {
            name: "offset",
            in: "query",
            schema: { type: "integer", minimum: 0, default: 0 },
          },
        ],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    projects: {
                      type: "array",
                      items: { $ref: "#/components/schemas/EcosystemProject" },
                    },
                    total: { type: "integer" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
  },
} as const;
