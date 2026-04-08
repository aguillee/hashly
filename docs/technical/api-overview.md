# API Overview

Hashly exposes a REST API for all platform functionality. All endpoints are under `/api/`.

## Public Endpoints (No Auth Required)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/events` | List events with filters (type, source, search, date range, forever mints) |
| GET | `/api/events/[id]` | Get single event details |
| GET | `/api/forever-mints` | List forever mint events (paginated) |
| GET | `/api/collections` | List NFT collections |
| GET | `/api/tokens` | List tokens |
| GET | `/api/ecosystem` | List approved ecosystem projects |
| GET | `/api/leaderboard` | Get seasonal leaderboard |
| GET | `/api/news` | Get aggregated news articles |
| GET | `/api/community/profiles` | List approved community profiles |
| GET | `/api/home-ads` | Get homepage ad carousel |

## Authenticated Endpoints (Wallet Required)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/verify` | Authenticate with wallet signature |
| GET | `/api/auth/me` | Get current user info |
| POST | `/api/events/[id]/vote` | Vote on an event |
| POST | `/api/collections/[id]/vote` | Vote on a collection |
| POST | `/api/tokens/[id]/vote` | Vote on a token |
| POST | `/api/ecosystem/[id]/vote` | Vote on a project |
| GET | `/api/missions` | Get mission progress |
| POST | `/api/missions/claim` | Claim a completed mission |
| POST | `/api/community/profile` | Create community profile |
| PUT | `/api/community/profile` | Update community profile |
| POST | `/api/events` | Submit a new event |
| POST | `/api/ecosystem` | Submit a new project |
| POST | `/api/referral/apply` | Apply a referral code |
| GET | `/api/referral/stats` | Get referral statistics |
| GET | `/api/users/vote-limit` | Check remaining daily votes |
| GET | `/api/users/nfts` | Get user NFT holdings |

## Admin Endpoints

Admin endpoints require an authenticated wallet listed in the `ADMIN_WALLETS` environment variable.

| Method | Endpoint | Description |
|---|---|---|
| PATCH | `/api/admin/events/[id]` | Approve/reject events |
| PATCH | `/api/admin/collections/[id]` | Approve/reject collections |
| PATCH | `/api/admin/ecosystem/[id]` | Approve/reject projects |
| POST | `/api/admin/sync/dreambay` | Sync DreamBay events |
| POST | `/api/admin/sync/kabila` | Sync Kabila events |

## Rate Limiting

All endpoints are rate-limited to prevent abuse. Public endpoints have higher limits than authenticated ones. The rate limiter tracks by IP address and wallet address.

## Data Format

All responses use JSON. Dates are in ISO 8601 format. Pagination uses `page` and `limit` query parameters where applicable.
