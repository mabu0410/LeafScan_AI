# Requirements Document

## Introduction

Tài liệu yêu cầu cho tính năng **Subscription & Partners** của LeafScan AI. Tính năng bao gồm 3 phần chính:

1. **Hệ thống gói đăng ký (Subscription)**: Giới hạn số lượt quét bệnh theo gói (Free/Premium), quản lý quota hàng ngày, và nâng cấp gói.
2. **Hệ thống đối tác (Partner Portal)**: Cho phép nhà phân phối phân bón đăng ký làm đối tác, quản lý sản phẩm quảng cáo, và hiển thị sản phẩm liên quan trong kết quả chẩn đoán.
3. **Nâng cấp giao diện trang chủ (Home Screen Redesign)**: Thiết kế lại trang chủ đạt chuẩn production với thông tin subscription, banner đối tác, và UX cải thiện.

## Glossary

- **Subscription_Service**: Module backend quản lý gói đăng ký, quota quét, và trạng thái subscription của người dùng.
- **Quota_Engine**: Thành phần kiểm tra và trừ quota quét bệnh mỗi khi người dùng thực hiện scan.
- **Partner_Service**: Module backend quản lý thông tin đối tác, sản phẩm quảng cáo, và logic hiển thị sản phẩm.
- **Home_Screen**: Màn hình chính của ứng dụng mobile hiển thị tổng quan cho người dùng.
- **Diagnosis_Router**: Endpoint xử lý quét ảnh lá và trả kết quả chẩn đoán bệnh.
- **Partner_Dashboard**: Giao diện web/API cho đối tác quản lý sản phẩm và xem thống kê hiển thị.
- **Scan_Quota**: Số lượt quét bệnh còn lại trong ngày của người dùng theo gói đăng ký.
- **Partner_Product**: Sản phẩm phân bón/thuốc bảo vệ thực vật mà đối tác đăng ký quảng cáo.
- **Free_Tier**: Gói miễn phí với giới hạn 5 lượt quét/ngày.
- **Premium_Tier**: Gói trả phí với lượt quét không giới hạn và tính năng nâng cao.

---

## Requirements

### Requirement 1: Quản lý gói đăng ký người dùng

**User Story:** As a user, I want to have a subscription plan that defines my scan limits, so that I can choose the plan that fits my needs.

#### Acceptance Criteria

1. THE Subscription_Service SHALL assign the Free_Tier to every newly registered user by default.
2. THE Subscription_Service SHALL maintain two tiers: Free_Tier (5 scans per day) and Premium_Tier (unlimited scans per day).
3. WHEN a user upgrades from Free_Tier to Premium_Tier, THE Subscription_Service SHALL update the user subscription record and reset the daily quota to unlimited.
4. WHEN a Premium_Tier subscription expires, THE Subscription_Service SHALL downgrade the user to Free_Tier automatically.
5. THE Subscription_Service SHALL expose an API endpoint that returns the current subscription tier, expiration date, and remaining daily quota for the authenticated user.

---

### Requirement 2: Kiểm soát quota quét bệnh

**User Story:** As a system operator, I want to enforce scan limits based on subscription tier, so that free users are limited and premium users have full access.

#### Acceptance Criteria

1. WHEN a Free_Tier user submits a scan request, THE Quota_Engine SHALL check the remaining daily quota before processing.
2. IF a Free_Tier user has exhausted the daily quota (0 scans remaining), THEN THE Quota_Engine SHALL reject the scan request with HTTP 403 and a message indicating the quota is exceeded.
3. WHEN a Free_Tier user successfully completes a scan, THE Quota_Engine SHALL decrement the remaining daily quota by 1.
4. THE Quota_Engine SHALL reset all Free_Tier user quotas to 5 at 00:00 UTC+7 daily.
5. WHILE a user holds Premium_Tier status, THE Quota_Engine SHALL allow scan requests without quota checks.
6. THE Quota_Engine SHALL record each scan consumption with a timestamp for audit purposes.

---

### Requirement 3: Đăng ký và quản lý đối tác

**User Story:** As a fertilizer distributor, I want to register as a partner on LeafScan AI, so that I can advertise my products to farmers who need them.

#### Acceptance Criteria

1. THE Partner_Service SHALL provide a registration API for new partners requiring: company name, contact email, phone number, business license number, and product categories.
2. WHEN a partner submits a registration request, THE Partner_Service SHALL create the partner record with status "pending_review".
3. WHEN an admin approves a partner, THE Partner_Service SHALL update the partner status to "active" and enable product management access.
4. IF a partner registration contains an email already associated with an existing partner, THEN THE Partner_Service SHALL reject the registration with a descriptive error.
5. THE Partner_Service SHALL allow active partners to update their company profile information.

---

### Requirement 4: Quản lý sản phẩm quảng cáo của đối tác

**User Story:** As a partner, I want to manage my advertised products, so that farmers see relevant fertilizers and pesticides in their diagnosis results.

#### Acceptance Criteria

1. THE Partner_Service SHALL allow active partners to create product listings with: product name, description, image URL, price range, target diseases (list of disease_key), and target plant categories.
2. WHEN a partner creates a product listing, THE Partner_Service SHALL validate that all referenced disease_key values exist in the diseases table.
3. THE Partner_Service SHALL allow partners to update, activate, or deactivate their product listings.
4. THE Partner_Service SHALL limit each partner to a maximum of 20 active product listings.
5. IF a partner attempts to create a product listing exceeding the 20-active limit, THEN THE Partner_Service SHALL reject the request with a descriptive error.

---

### Requirement 5: Hiển thị sản phẩm đối tác trong kết quả chẩn đoán

**User Story:** As a user, I want to see relevant fertilizer and pesticide recommendations after a diagnosis, so that I can easily find products to treat my plant's disease.

#### Acceptance Criteria

1. WHEN the Diagnosis_Router returns a disease result, THE Partner_Service SHALL query active partner products matching the diagnosed disease_key.
2. THE Partner_Service SHALL return a maximum of 3 partner products per diagnosis result, sorted by relevance (exact disease match first, then category match).
3. THE Diagnosis_Router SHALL include the matched partner products in the diagnosis response under a "recommended_products" field.
4. WHILE no active partner products match the diagnosed disease, THE Diagnosis_Router SHALL return an empty "recommended_products" array.
5. THE Partner_Service SHALL record each product impression (display) with the scan_id and partner_product_id for analytics.

---

### Requirement 6: Thống kê hiển thị cho đối tác

**User Story:** As a partner, I want to view statistics about how often my products are shown to users, so that I can evaluate advertising effectiveness.

#### Acceptance Criteria

1. THE Partner_Dashboard SHALL provide an API endpoint returning impression counts per product for a specified date range.
2. THE Partner_Dashboard SHALL provide total impressions, unique user reach, and click-through count per product.
3. WHEN a partner requests statistics, THE Partner_Dashboard SHALL return data only for products owned by that partner.
4. THE Partner_Dashboard SHALL support filtering statistics by date range (start_date, end_date) with a maximum range of 90 days.

---

### Requirement 7: Nâng cấp giao diện trang chủ

**User Story:** As a user, I want a polished, production-quality home screen, so that I have a clear overview of my garden health, subscription status, and relevant recommendations.

#### Acceptance Criteria

1. THE Home_Screen SHALL display the user greeting, avatar, and notification bell in a top bar section.
2. THE Home_Screen SHALL display a subscription status card showing the current tier name, remaining daily scans (for Free_Tier), and an upgrade CTA button.
3. THE Home_Screen SHALL display a garden health summary card with average health percentage and number of plants needing attention.
4. THE Home_Screen SHALL display a "Quick Scan" action button with prominent visual treatment for easy access.
5. THE Home_Screen SHALL display a horizontally scrollable list of attention plants (health_score < 75) with thumbnail, name, and health indicator.
6. THE Home_Screen SHALL display a "Today's Tip" card with title, summary, and category icon.
7. THE Home_Screen SHALL display a partner products banner section showing up to 2 featured partner products with image, name, and partner logo.
8. WHEN the user pulls down on the Home_Screen, THE Home_Screen SHALL refresh all displayed data.
9. WHILE data is loading, THE Home_Screen SHALL display skeleton placeholders instead of a spinner.
10. IF the Home_Screen fails to load data, THEN THE Home_Screen SHALL display an error state with a retry button and a descriptive message.

---

### Requirement 8: API trang chủ mở rộng

**User Story:** As a mobile developer, I want the home API to return subscription and partner data alongside existing garden data, so that the home screen can render all sections in a single request.

#### Acceptance Criteria

1. THE Home_Screen backend API SHALL return subscription information (tier, remaining_scans, expires_at) in the response payload.
2. THE Home_Screen backend API SHALL return up to 2 featured partner products (name, image_url, partner_name, product_url) in the response payload.
3. THE Home_Screen backend API SHALL maintain backward compatibility with existing fields (user, stats, today_tip, attention_plants, recent_scans).
4. THE Home_Screen backend API SHALL respond within 500ms for the 95th percentile of requests.
