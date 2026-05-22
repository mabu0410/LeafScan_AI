# Implementation Plan: Subscription & Partners

## Overview

This plan implements the Subscription & Partners feature for LeafScan AI in 7 phases: database models, backend services, API endpoints, diagnosis integration, mobile components, tests, and documentation. Each phase builds incrementally on the previous one, ensuring no orphaned code.

## Tasks

- [ ] 1. Phase 1: Database Models & Schema
  - [ ] 1.1 Add Subscription and ScanQuota models to `backend/app/models/domain.py`
    - Add `Subscription` model with columns: id, user_id (FK unique), tier, started_at, expires_at, created_at, updated_at
    - Add `ScanQuota` model with columns: id, user_id (FK unique), remaining_scans (default 5), last_reset_at, updated_at
    - Add `ScanConsumption` model with columns: id, user_id, scan_id, consumed_at; index on (user_id, consumed_at)
    - Add relationship `subscription` and `scan_quota` on User via backref
    - _Requirements: 1.1, 1.2, 2.6_

  - [ ] 1.2 Add Partner and PartnerProduct models to `backend/app/models/domain.py`
    - Add `Partner` model with columns: id, company_name, contact_email (unique), phone, business_license, product_categories (JSON), status (default "pending_review"), created_at, updated_at
    - Add `PartnerProduct` model with columns: id, partner_id (FK), name, description, image_url, price_range, target_diseases (JSON), target_categories (JSON), product_url, is_active, created_at, updated_at
    - Add indexes: `ix_partner_products_partner_active` on (partner_id, is_active)
    - Add relationship between Partner and PartnerProduct
    - _Requirements: 3.1, 4.1_

  - [ ] 1.3 Add ProductImpression model to `backend/app/models/domain.py`
    - Add `ProductImpression` model with columns: id, partner_product_id (FK), scan_id (FK), user_id (FK), impressed_at, clicked (default False)
    - Add index: `ix_impressions_product_date` on (partner_product_id, impressed_at)
    - Add relationship between PartnerProduct and ProductImpression
    - _Requirements: 5.5, 6.1_

  - [ ] 1.4 Add Pydantic schemas to `backend/app/models/schemas.py`
    - Add `SubscriptionStatusDTO` schema (tier, remaining_scans, expires_at)
    - Add `PartnerRegistrationDTO`, `PartnerUpdateDTO` schemas
    - Add `ProductCreateDTO`, `ProductUpdateDTO` schemas
    - Add `PartnerStatsDTO` schema (total_impressions, unique_users, clicks_per_product)
    - Add `RecommendedProductDTO` schema (id, name, image_url, partner_name, product_url)
    - _Requirements: 1.5, 3.1, 4.1, 5.3, 6.2_

- [ ] 2. Phase 2: Backend Services
  - [ ] 2.1 Implement SubscriptionService in `backend/app/services/subscription_service.py`
    - Implement `get_user_subscription(db, user_id)` → returns Subscription or None
    - Implement `assign_free_tier(db, user_id)` → creates Subscription(tier="free") + ScanQuota(remaining=5)
    - Implement `upgrade_to_premium(db, user_id, expires_at)` → updates tier to "premium"
    - Implement `check_and_downgrade_expired(db)` → downgrades expired premium users to free
    - Implement `get_subscription_status(db, user_id)` → returns SubscriptionStatusDTO
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ] 2.2 Implement QuotaEngine in `backend/app/services/quota_engine.py`
    - Implement `check_and_consume(db, user_id)` → checks tier, decrements quota for free, raises QuotaExhaustedError if 0
    - Implement `get_remaining(db, user_id)` → returns remaining scans (None for premium)
    - Implement `reset_daily_quotas(db)` → resets all free-tier quotas to 5
    - Implement `record_consumption(db, user_id, scan_id)` → creates ScanConsumption record
    - Define `QuotaExhaustedError` custom exception
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ] 2.3 Implement PartnerService in `backend/app/services/partner_service.py`
    - Implement `register_partner(db, data)` → creates partner with status "pending_review", rejects duplicate email
    - Implement `approve_partner(db, partner_id)` → sets status to "active"
    - Implement `update_partner_profile(db, partner_id, data)` → updates profile fields
    - Implement `create_product(db, partner_id, data)` → validates disease_keys, enforces 20-active limit
    - Implement `update_product(db, product_id, data)` and `toggle_product_active(db, product_id, active)`
    - Implement `get_partner_products(db, partner_id)` → lists all products for a partner
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ] 2.4 Implement recommendation and stats logic in PartnerService
    - Implement `get_recommendations(db, disease_key, limit=3)` → queries active products matching disease_key (exact first, then category), returns top 3
    - Implement `record_impressions(db, scan_id, product_ids)` → creates ProductImpression records
    - Implement `get_partner_stats(db, partner_id, start_date, end_date)` → validates date range ≤ 90 days, returns stats only for partner's own products
    - _Requirements: 5.1, 5.2, 5.5, 6.1, 6.2, 6.3, 6.4_

- [ ] 3. Checkpoint - Ensure models and services compile correctly
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Phase 3: API Endpoints
  - [ ] 4.1 Create Subscription Router in `backend/app/routers/subscription.py`
    - Implement `GET /api/v1/subscription/status` → returns SubscriptionStatusDTO (requires auth)
    - Implement `POST /api/v1/subscription/upgrade` → upgrades to premium (requires auth)
    - Register router in `backend/app/main.py`
    - _Requirements: 1.5, 1.3_

  - [ ] 4.2 Create Partner Router in `backend/app/routers/partners.py`
    - Implement `POST /api/v1/partners/register` → partner registration (public)
    - Implement `PUT /api/v1/partners/{id}/profile` → update profile (partner auth)
    - Implement `POST /api/v1/partners/{id}/approve` → admin approval (admin auth)
    - Implement `GET /api/v1/partners/{id}/products` → list products (partner auth)
    - Implement `POST /api/v1/partners/{id}/products` → create product (partner auth)
    - Implement `PUT /api/v1/partners/products/{product_id}` → update product (partner auth)
    - Implement `PATCH /api/v1/partners/products/{product_id}/toggle` → activate/deactivate (partner auth)
    - Implement `GET /api/v1/partners/{id}/stats` → impression stats (partner auth)
    - Register router in `backend/app/main.py`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 6.1, 6.2, 6.3, 6.4_

  - [ ] 4.3 Extend Home API in `backend/app/routers/home.py`
    - Add `subscription` field to home summary response (tier, remaining_scans, expires_at)
    - Add `featured_products` field to home summary response (max 2 products with name, image_url, partner_name, product_url)
    - Maintain backward compatibility with existing fields
    - _Requirements: 8.1, 8.2, 8.3_

- [ ] 5. Phase 4: Diagnosis Integration
  - [ ] 5.1 Integrate QuotaEngine into Diagnosis Router
    - Modify `backend/app/routers/diagnose.py` to call `QuotaEngine.check_and_consume()` before AI prediction
    - Add exception handler for `QuotaExhaustedError` → returns HTTP 403 with Vietnamese message
    - Call `QuotaEngine.record_consumption()` after successful scan
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6_

  - [ ] 5.2 Integrate PartnerService recommendations into Diagnosis Router
    - After successful diagnosis, call `PartnerService.get_recommendations(disease_key)`
    - Include `recommended_products` field in diagnosis response (max 3 products)
    - Call `PartnerService.record_impressions(scan_id, product_ids)` for analytics
    - Return empty array when no matching products found
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 6. Checkpoint - Ensure backend API tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Phase 5: Mobile Components
  - [ ] 7.1 Create SubscriptionCard component in `leafscan-ai/src/components/home/SubscriptionCard.tsx`
    - Display tier badge (Free/Premium), remaining scans progress bar, upgrade CTA button
    - Props: `tier`, `remainingScans`, `expiresAt`
    - Disable upgrade CTA when already premium
    - _Requirements: 7.2_

  - [ ] 7.2 Create PartnerBanner component in `leafscan-ai/src/components/home/PartnerBanner.tsx`
    - Horizontal carousel showing up to 2 featured partner products
    - Each item shows product image, name, and partner name
    - Tapping opens product_url in external browser
    - _Requirements: 7.7_

  - [ ] 7.3 Create SkeletonHome component in `leafscan-ai/src/components/home/SkeletonHome.tsx`
    - Skeleton placeholders matching layout of all home screen sections
    - Animated shimmer effect for loading state
    - _Requirements: 7.9_

  - [ ] 7.4 Redesign HomeScreen in `leafscan-ai/src/screens/HomeScreen.tsx`
    - Integrate TopBar (greeting + avatar + notification bell)
    - Integrate SubscriptionCard, GardenHealthCard, QuickScanButton
    - Integrate AttentionPlantsList (horizontal FlatList, plants with health_score < 75)
    - Integrate TodayTipCard, PartnerBanner
    - Implement pull-to-refresh with RefreshControl
    - Show SkeletonHome while loading, error state with retry button on failure
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10_

  - [ ] 7.5 Update `useHomeData` hook to consume extended home API
    - Fetch subscription and featured_products from extended home API response
    - Expose subscription status and featured products to HomeScreen
    - Handle loading, error, and refresh states
    - _Requirements: 8.1, 8.2, 8.3_

- [ ] 8. Checkpoint - Ensure mobile components render correctly
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Phase 6: Tests
  - [ ]* 9.1 Write property tests for SubscriptionService in `backend/tests/test_subscription_service.py`
    - **Property 1: Free_Tier default assignment** — verify new users get tier="free" and remaining_scans=5
    - **Property 2: Upgrade resets quota to unlimited** — verify upgrade sets tier="premium" and bypasses quota
    - **Property 3: Expiration downgrades to Free_Tier** — verify expired premium users get downgraded
    - **Validates: Requirements 1.1, 1.3, 1.4**

  - [ ]* 9.2 Write property tests for QuotaEngine in `backend/tests/test_quota_engine.py`
    - **Property 4: Quota enforcement for Free_Tier** — scan succeeds iff remaining > 0
    - **Property 5: Quota decrement on successful scan** — remaining decreases by 1
    - **Property 6: Premium bypasses quota** — premium users always allowed
    - **Property 7: Scan audit record creation** — ScanConsumption created for every scan
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.5, 2.6**

  - [ ]* 9.3 Write property tests for PartnerService in `backend/tests/test_partner_service.py`
    - **Property 8: Partner registration creates pending_review** — new partners start as pending
    - **Property 9: Duplicate email rejection** — duplicate emails are rejected
    - **Property 10: Disease_key validation on product creation** — invalid disease_keys rejected
    - **Property 11: Active product limit invariant** — max 20 active products enforced
    - **Validates: Requirements 3.2, 3.4, 4.2, 4.4, 4.5**

  - [ ]* 9.4 Write property tests for recommendations and stats in `backend/tests/test_partner_recommendations.py`
    - **Property 12: Diagnosis product matching and ranking** — max 3 products, exact match first
    - **Property 13: Impression recording** — one impression per displayed product
    - **Property 14: Partner stats data isolation** — stats only include own products
    - **Property 15: Date range validation** — reject ranges > 90 days
    - **Validates: Requirements 5.1, 5.2, 5.5, 6.3, 6.4**

  - [ ]* 9.5 Write property test for Home API in `backend/tests/test_home_api_extended.py`
    - **Property 16: Home API featured products limit** — max 2 featured products returned
    - **Validates: Requirements 8.2**

  - [ ]* 9.6 Write integration tests in `backend/tests/integration/`
    - Create `test_diagnosis_quota_flow.py` — full diagnosis flow with quota check + product recommendations
    - Create `test_quota_reset.py` — daily quota reset mechanism
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 5.1, 5.2, 5.3_

  - [ ]* 9.7 Write mobile component tests in `leafscan-ai/__tests__/`
    - Create `SubscriptionCard.test.tsx` — renders tier, quota bar, upgrade CTA
    - Create `PartnerBanner.test.tsx` — renders product carousel, handles empty state
    - Create `SkeletonHome.test.tsx` — renders skeleton placeholders
    - Create `HomeScreen.test.tsx` — loading state, error state with retry, pull-to-refresh
    - _Requirements: 7.1, 7.2, 7.7, 7.9, 7.10_

- [ ] 10. Phase 7: Documentation Update
  - [ ] 10.1 Update `backend/README.md` with new endpoints and environment variables
    - Document subscription endpoints (GET /status, POST /upgrade)
    - Document partner endpoints (register, products, stats)
    - Document extended home API response format
    - Document daily quota reset cron job setup
    - _Requirements: 1.5, 3.1, 6.1, 8.1_

- [ ] 11. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Backend uses Python 3.12 + FastAPI + SQLAlchemy + PostgreSQL
- Mobile uses TypeScript + React Native + Expo SDK 54
- Existing test infrastructure: pytest + hypothesis (backend), Jest (mobile)
- Database tables auto-create via `Base.metadata.create_all()` in `database.py init_db()`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "1.4"] },
    { "id": 2, "tasks": ["2.1", "2.2", "2.3"] },
    { "id": 3, "tasks": ["2.4"] },
    { "id": 4, "tasks": ["4.1", "4.2", "4.3"] },
    { "id": 5, "tasks": ["5.1", "5.2"] },
    { "id": 6, "tasks": ["7.1", "7.2", "7.3"] },
    { "id": 7, "tasks": ["7.4", "7.5"] },
    { "id": 8, "tasks": ["9.1", "9.2", "9.3", "9.4", "9.5"] },
    { "id": 9, "tasks": ["9.6", "9.7"] },
    { "id": 10, "tasks": ["10.1"] }
  ]
}
```
