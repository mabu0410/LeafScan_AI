-- Seed tài khoản demo cho môi trường local/dev.
-- Chạy lại seed sẽ reset mật khẩu demo về đúng giá trị đã công bố trong README.

UPDATE users
SET phone = NULL
WHERE phone IN ('admin', 'doitac')
  AND email NOT IN ('admin@example.com', 'doitac@example.com');

WITH seed_users AS (
  SELECT *
  FROM (
    VALUES
      (
        'Admin LeafScan',
        'admin@example.com',
        '$2b$12$vPKPalGeUcqbx2Ym8YQd1eLTvk0IppWSenDGKBlCqVHJvC6TrDYci',
        'admin',
        'admin'
      ),
      (
        'Đối tác demo',
        'doitac@example.com',
        '$2b$12$6sb3kTctcJVZJUXdqTgkl.7KgjcS5MBYSsU2dx6UDpweoWi6w1fLe',
        'doitac',
        'partner'
      )
  ) AS rows(name, email, password_hash, phone, role)
)
INSERT INTO users (
  name,
  email,
  password_hash,
  phone,
  role,
  created_at
)
SELECT
  name,
  email,
  password_hash,
  phone,
  role,
  NOW()
FROM seed_users
ON CONFLICT (email)
DO UPDATE SET
  name = EXCLUDED.name,
  password_hash = EXCLUDED.password_hash,
  phone = EXCLUDED.phone,
  role = EXCLUDED.role;

WITH partner_user AS (
  SELECT id
  FROM users
  WHERE email = 'doitac@example.com'
),
released_old_partner_links AS (
  UPDATE partners
  SET user_id = NULL,
      updated_at = NOW()
  WHERE user_id = (SELECT id FROM partner_user)
    AND contact_email <> 'doitac@example.com'
  RETURNING id
),
upserted_partner AS (
  INSERT INTO partners (
    user_id,
    company_name,
    store_name,
    description,
    address,
    contact_email,
    phone,
    business_license,
    business_license_file_url,
    representative_name,
    representative_role,
    service_area,
    main_products,
    advertising_commitment_accepted,
    advertising_commitment_at,
    product_categories,
    website_url,
    contact_url,
    cover_url,
    logo_url,
    status,
    rejection_reason,
    updated_at
  )
  SELECT
    partner_user.id,
    'Công ty TNHH Đối Tác Demo',
    'Cửa hàng Đối Tác Demo',
    'Cửa hàng demo phục vụ kiểm thử luồng đối tác, marketplace và đăng sản phẩm.',
    'Số 01 đường Demo, Quận 1, TP. Hồ Chí Minh',
    'doitac@example.com',
    '0909000001',
    'MST-DEMO-DOITAC-001',
    '/uploads/demo_business_license.pdf',
    'Nguyễn Đối Tác',
    'Chủ cửa hàng',
    'Toàn quốc',
    'Phân bón hữu cơ, chế phẩm sinh học, vật tư chăm sóc cây',
    TRUE,
    NOW(),
    '["phan_bon", "che_pham_sinh_hoc", "vat_tu_cham_soc"]'::json,
    'https://doitac.example.com',
    'https://zalo.me/0909000001',
    '/uploads/demo_partner_cover.jpg',
    '/uploads/demo_partner_logo.jpg',
    'active',
    NULL,
    NOW()
  FROM partner_user
  ON CONFLICT (contact_email)
  DO UPDATE SET
    user_id = EXCLUDED.user_id,
    company_name = EXCLUDED.company_name,
    store_name = EXCLUDED.store_name,
    description = EXCLUDED.description,
    address = EXCLUDED.address,
    phone = EXCLUDED.phone,
    business_license = EXCLUDED.business_license,
    business_license_file_url = EXCLUDED.business_license_file_url,
    representative_name = EXCLUDED.representative_name,
    representative_role = EXCLUDED.representative_role,
    service_area = EXCLUDED.service_area,
    main_products = EXCLUDED.main_products,
    advertising_commitment_accepted = EXCLUDED.advertising_commitment_accepted,
    advertising_commitment_at = EXCLUDED.advertising_commitment_at,
    product_categories = EXCLUDED.product_categories,
    website_url = EXCLUDED.website_url,
    contact_url = EXCLUDED.contact_url,
    cover_url = EXCLUDED.cover_url,
    logo_url = EXCLUDED.logo_url,
    status = EXCLUDED.status,
    rejection_reason = NULL,
    updated_at = NOW()
  RETURNING id
),
partner_ids AS (
  SELECT id FROM upserted_partner
  UNION
  SELECT id
  FROM partners
  WHERE contact_email = 'doitac@example.com'
)
INSERT INTO partner_stores (
  partner_id,
  name,
  description,
  address,
  contact_email,
  phone,
  logo_url,
  cover_url,
  is_active,
  is_primary,
  created_at,
  updated_at
)
SELECT
  partner_ids.id,
  'Cửa hàng Đối Tác Demo',
  'Cửa hàng demo phục vụ kiểm thử luồng quản lý nhiều cửa hàng.',
  'Số 01 đường Demo, Quận 1, TP. Hồ Chí Minh',
  'doitac@example.com',
  '0909000001',
  '/uploads/demo_partner_logo.jpg',
  '/uploads/demo_partner_cover.jpg',
  TRUE,
  TRUE,
  NOW(),
  NOW()
FROM partner_ids
WHERE NOT EXISTS (
  SELECT 1
  FROM partner_stores store
  WHERE store.partner_id = partner_ids.id
);

WITH partner_ids AS (
  SELECT id
  FROM partners
  WHERE contact_email = 'doitac@example.com'
)
INSERT INTO partner_memberships (
  partner_id,
  price_vnd,
  duration_days,
  max_active_products,
  status,
  started_at,
  expires_at,
  created_at
)
SELECT
  partner_ids.id,
  990000,
  365,
  20,
  'active',
  NOW(),
  NOW() + INTERVAL '365 days',
  NOW()
FROM partner_ids
WHERE NOT EXISTS (
  SELECT 1
  FROM partner_memberships membership
  WHERE membership.partner_id = partner_ids.id
    AND membership.status = 'active'
    AND membership.expires_at > NOW()
);
