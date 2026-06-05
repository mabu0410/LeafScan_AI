-- Seed dữ liệu thật cho trang Vật tư/Marketplace.
-- Dữ liệu này tạo record trong database, không dùng mock frontend.

WITH seed_partners AS (
  SELECT *
  FROM (
    VALUES
      (
        'greenfarm-demo@leafscan.local',
        'Công ty TNHH Vật Tư GreenFarm',
        'GreenFarm Hà Nội',
        'Đại lý vật tư nông nghiệp chuyên phân bón hữu cơ, chế phẩm sinh học và thuốc BVTV cho rau màu.',
        'Số 18 đường Ngọc Hồi, Hoàng Mai, Hà Nội',
        '0901000001',
        'MST-DEMO-GREENFARM-001',
        'Nguyễn Văn Minh',
        'Quản lý cửa hàng',
        'Hà Nội và các tỉnh lân cận',
        'Phân bón hữu cơ, chế phẩm sinh học, thuốc phòng trừ nấm bệnh',
        '["phan_bon", "thuoc_bvtv", "che_pham_sinh_hoc"]',
        'https://greenfarm.example.com',
        'https://zalo.me/0901000001'
      ),
      (
        'mekong-agri-demo@leafscan.local',
        'Công ty Cổ phần Nông Nghiệp Mekong',
        'Mekong Agri Store',
        'Nhà phân phối vật tư cho vườn cây ăn quả, rau màu và cây công nghiệp khu vực miền Tây.',
        'Ấp Bình Hòa, Cái Răng, Cần Thơ',
        '0901000002',
        'MST-DEMO-MEKONG-002',
        'Trần Thị Lan',
        'Đại diện kinh doanh',
        'Cần Thơ, An Giang, Đồng Tháp, Vĩnh Long',
        'Phân bón lá, thuốc sinh học, dinh dưỡng phục hồi cây',
        '["phan_bon", "thuoc_bvtv", "dinh_duong_cay"]',
        'https://mekongagri.example.com',
        'https://zalo.me/0901000002'
      ),
      (
        'bioleaf-demo@leafscan.local',
        'Công ty TNHH BioLeaf Việt Nam',
        'BioLeaf Việt Nam',
        'Đơn vị cung cấp chế phẩm sinh học, vi sinh đất và giải pháp IPM cho vườn nhà.',
        'Khu công nghệ cao, Quận 9, TP. Hồ Chí Minh',
        '0901000003',
        'MST-DEMO-BIOLEAF-003',
        'Lê Quốc Huy',
        'Tư vấn kỹ thuật',
        'TP. Hồ Chí Minh, Bình Dương, Đồng Nai',
        'Chế phẩm vi sinh, thuốc sinh học, phân hữu cơ',
        '["che_pham_sinh_hoc", "thuoc_sinh_hoc", "phan_huu_co"]',
        'https://bioleaf.example.com',
        'https://zalo.me/0901000003'
      )
  ) AS rows(
    contact_email,
    company_name,
    store_name,
    description,
    address,
    phone,
    business_license,
    representative_name,
    representative_role,
    service_area,
    main_products,
    product_categories,
    website_url,
    contact_url
  )
),
upserted_partners AS (
  INSERT INTO partners (
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
    status,
    rejection_reason,
    updated_at
  )
  SELECT
    company_name,
    store_name,
    description,
    address,
    contact_email,
    phone,
    business_license,
    '/uploads/demo_business_license.pdf',
    representative_name,
    representative_role,
    service_area,
    main_products,
    TRUE,
    NOW(),
    product_categories::json,
    website_url,
    contact_url,
    'active',
    NULL,
    NOW()
  FROM seed_partners
  ON CONFLICT (contact_email)
  DO UPDATE SET
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
    status = EXCLUDED.status,
    rejection_reason = NULL,
    updated_at = NOW()
  RETURNING id, contact_email
),
seed_partner_ids AS (
  SELECT id, contact_email FROM upserted_partners
  UNION
  SELECT id, contact_email
  FROM partners
  WHERE contact_email IN (SELECT contact_email FROM seed_partners)
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
  id,
  990000,
  365,
  20,
  'active',
  NOW(),
  NOW() + INTERVAL '365 days',
  NOW()
FROM seed_partner_ids partner
WHERE NOT EXISTS (
  SELECT 1
  FROM partner_memberships membership
  WHERE membership.partner_id = partner.id
    AND membership.status = 'active'
    AND membership.expires_at > NOW()
);

WITH seed_products AS (
  SELECT *
  FROM (
    VALUES
      (
        'greenfarm-demo@leafscan.local',
        'Phân hữu cơ vi sinh GreenFarm 5kg',
        'Phân hữu cơ vi sinh dùng cải tạo đất, hỗ trợ rễ khỏe và phục hồi cây sau giai đoạn bệnh.',
        'https://www.earthmedicineusa.com/cdn/shop/files/50D8FCFF-932F-4A9B-B034-CCA25DF2923E_1024x1024.jpg?v=1765312522',
        '85.000 - 120.000đ',
        '[]',
        '["Rau củ", "Hoa cảnh", "Cây ăn quả"]',
        'https://greenfarm.example.com/phan-huu-co-vi-sinh'
      ),
      (
        'greenfarm-demo@leafscan.local',
        'Chế phẩm nấm đối kháng Trichoderma',
        'Chế phẩm sinh học hỗ trợ hạn chế nấm đất, phù hợp xử lý giá thể và phòng bệnh vùng rễ.',
        'https://www.bioprimeagri.com/assets/uploads/products/57dcd-trichonexus.png',
        '65.000 - 95.000đ',
        '["tomato_early_blight", "potato_early_blight", "tomato_late_blight"]',
        '["Rau củ", "Cây ăn quả"]',
        'https://greenfarm.example.com/trichoderma'
      ),
      (
        'greenfarm-demo@leafscan.local',
        'Dung dịch đồng sinh học phòng đốm lá',
        'Sản phẩm hỗ trợ phòng đốm lá do vi khuẩn và nấm trên cà chua, ớt và rau màu.',
        'https://www.greenhousemegastore.com/cdn/shop/files/bonide-copper-fungicide-5810948_1024x1024.jpg?v=1776327012',
        '110.000 - 150.000đ',
        '["tomato_bacterial_spot", "pepper_bacterial_spot", "tomato_septoria_leaf_spot"]',
        '["Rau củ"]',
        'https://greenfarm.example.com/dong-sinh-hoc-dom-la'
      ),
      (
        'greenfarm-demo@leafscan.local',
        'Phân bón lá rong biển phục hồi cây',
        'Bổ sung amino acid và chiết xuất rong biển, hỗ trợ cây phục hồi sau khi cắt bỏ lá bệnh.',
        'https://agricarecorp.com/cdn/shop/files/Basfoliar_Kelp_O_SL_Agricare_Corporation_600x.jpg?v=1766490457',
        '75.000 - 115.000đ',
        '[]',
        '["Rau củ", "Cây ăn quả", "Hoa cảnh"]',
        'https://greenfarm.example.com/phan-bon-la-rong-bien'
      ),
      (
        'mekong-agri-demo@leafscan.local',
        'Dinh dưỡng Canxi Bo chống nứt trái',
        'Dinh dưỡng bổ sung Canxi Bo cho cà chua, ớt và cây ăn quả trong giai đoạn ra hoa đậu trái.',
        'https://agricarecorp.com/cdn/shop/files/HydroSpeed_CaB-Max_water_soluble_fertilizer_with_calcium_and_boron.jpg?v=1758367291',
        '95.000 - 135.000đ',
        '["tomato_healthy", "pepper_healthy"]',
        '["Rau củ", "Cây ăn quả"]',
        'https://mekongagri.example.com/canxi-bo'
      ),
      (
        'mekong-agri-demo@leafscan.local',
        'Thuốc sinh học Neem Oil 500ml',
        'Dầu neem hỗ trợ quản lý sâu chích hút, rệp và nhện đỏ theo hướng sinh học.',
        'https://www.plantonix.com/cdn/shop/files/neem-oil-16oz_800x.jpg?v=1720042355',
        '120.000 - 180.000đ',
        '["tomato_spider_mites"]',
        '["Rau củ", "Hoa cảnh", "Cây ăn quả"]',
        'https://mekongagri.example.com/neem-oil'
      ),
      (
        'mekong-agri-demo@leafscan.local',
        'Gói xử lý mốc sương cho khoai tây',
        'Bộ sản phẩm hỗ trợ phòng và quản lý mốc sương trên khoai tây, cà chua trong điều kiện ẩm.',
        'https://www.greenhousemegastore.com/cdn/shop/files/bonide-copper-fungicide-4330444.jpg?v=1776327011&width=1080',
        '180.000 - 260.000đ',
        '["potato_late_blight", "tomato_late_blight"]',
        '["Rau củ"]',
        'https://mekongagri.example.com/moc-suong'
      ),
      (
        'mekong-agri-demo@leafscan.local',
        'Phân NPK cân đối cho rau màu',
        'Phân bón NPK cân đối dùng cho rau màu, ngũ cốc và cây vườn cần phục hồi sinh trưởng.',
        'https://agricarecorp.com/cdn/shop/files/Tri20_600x.jpg?v=1740649617',
        '140.000 - 220.000đ',
        '[]',
        '["Rau củ", "Ngũ cốc", "Cây ăn quả"]',
        'https://mekongagri.example.com/npk-rau-mau'
      ),
      (
        'bioleaf-demo@leafscan.local',
        'BioLeaf Bacillus Subtilis',
        'Chế phẩm Bacillus subtilis hỗ trợ quản lý nấm bệnh trên lá theo hướng sinh học.',
        'https://www.kisorganics.com/cdn/shop/files/ScreenShot2025-10-07at2.00.24PM_1024x1024.png?v=1759870855',
        '90.000 - 130.000đ',
        '["squash_powdery_mildew", "cherry_powdery_mildew", "tomato_leaf_mold"]',
        '["Rau củ", "Hoa cảnh", "Cây ăn quả"]',
        'https://bioleaf.example.com/bacillus-subtilis'
      ),
      (
        'bioleaf-demo@leafscan.local',
        'Vi sinh đất BioRoot 1kg',
        'Vi sinh đất hỗ trợ hệ rễ, cải thiện đất trồng chậu và luống rau sau nhiều vụ canh tác.',
        'https://www.plantonix.com/cdn/shop/files/myco-powder-200g_400x.jpg?v=1713376255',
        '70.000 - 110.000đ',
        '[]',
        '["Rau củ", "Hoa cảnh", "Cây ăn quả"]',
        'https://bioleaf.example.com/bioroot'
      ),
      (
        'bioleaf-demo@leafscan.local',
        'Bẫy dính vàng kiểm soát côn trùng',
        'Bẫy dính vàng giúp theo dõi và giảm mật số côn trùng bay trong vườn nhà.',
        'https://cdn.commercev3.net/cdn.arbico-organics.com/images/uploads/1254300-stiky_strip-600x600.jpg',
        '35.000 - 55.000đ',
        '["tomato_yellow_leaf_curl_virus"]',
        '["Rau củ", "Hoa cảnh"]',
        'https://bioleaf.example.com/bay-dinh-vang'
      ),
      (
        'bioleaf-demo@leafscan.local',
        'Dung dịch vệ sinh dụng cụ cắt tỉa',
        'Dung dịch dùng vệ sinh kéo cắt tỉa, hạn chế lây nhiễm chéo khi xử lý lá bệnh.',
        'https://www.dictum.com/media/1d/1c/d9/1752884051/718633_01_P_WE_8-Barnel%20Reinigungsspray%20B%20Clean%20fr_Gartenscheren.jpg?ts=1780365985',
        '45.000 - 75.000đ',
        '["tomato_bacterial_spot", "pepper_bacterial_spot", "strawberry_leaf_scorch"]',
        '["Rau củ", "Hoa cảnh", "Cây ăn quả"]',
        'https://bioleaf.example.com/ve-sinh-dung-cu'
      )
  ) AS rows(
    contact_email,
    name,
    description,
    image_url,
    price_range,
    target_diseases,
    target_categories,
    product_url
  )
),
updated_products AS (
  UPDATE partner_products existing
  SET
    image_url = product.image_url,
    updated_at = NOW()
  FROM seed_products product
  JOIN partners partner ON partner.contact_email = product.contact_email
  WHERE existing.partner_id = partner.id
    AND existing.name = product.name
    AND existing.image_url IS DISTINCT FROM product.image_url
  RETURNING existing.id
)
INSERT INTO partner_products (
  partner_id,
  name,
  description,
  image_url,
  price_range,
  target_diseases,
  target_categories,
  product_url,
  is_active,
  moderation_status,
  rejection_reason,
  created_at,
  updated_at
)
SELECT
  partner.id,
  product.name,
  product.description,
  product.image_url,
  product.price_range,
  product.target_diseases::json,
  product.target_categories::json,
  product.product_url,
  TRUE,
  'approved',
  NULL,
  NOW(),
  NOW()
FROM seed_products product
JOIN partners partner ON partner.contact_email = product.contact_email
CROSS JOIN (SELECT COUNT(*) FROM updated_products) updated_count
WHERE NOT EXISTS (
  SELECT 1
  FROM partner_products existing
  WHERE existing.partner_id = partner.id
    AND existing.name = product.name
);
