-- Seed dữ liệu thật cho trang Vật tư/Marketplace.
-- Dữ liệu này tạo record trong database, không dùng mock frontend.

WITH seed_partners AS (
  SELECT *
  FROM (
    VALUES
      (
        'greenfarm-demo@leafscan.local',
        'Công ty TNHH An Phú Agri Hà Nội',
        'An Phú Agri Hà Nội',
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
        'https://zalo.me/0901000001',
        'https://api.dicebear.com/9.x/initials/png?seed=An%20Ph%C3%BA%20Agri%20H%C3%A0%20N%E1%BB%99i&backgroundColor=16a34a,0f766e,2563eb&textColor=ffffff',
        'https://picsum.photos/seed/leafscan-an-phu-agri-ha-noi/1200/520'
      ),
      (
        'mekong-agri-demo@leafscan.local',
        'Công ty Cổ phần Vật Tư Cửu Long Cần Thơ',
        'Cửu Long Supply Cần Thơ',
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
        'https://zalo.me/0901000002',
        'https://api.dicebear.com/9.x/initials/png?seed=C%E1%BB%ADu%20Long%20Supply%20C%E1%BA%A7n%20Th%C6%A1&backgroundColor=16a34a,0f766e,2563eb&textColor=ffffff',
        'https://picsum.photos/seed/leafscan-cuu-long-supply-can-tho/1200/520'
      ),
      (
        'bioleaf-demo@leafscan.local',
        'Công ty TNHH Lá Xanh Bio TP HCM',
        'Lá Xanh Bio TP HCM',
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
        'https://zalo.me/0901000003',
        'https://api.dicebear.com/9.x/initials/png?seed=L%C3%A1%20Xanh%20Bio%20TP%20HCM&backgroundColor=16a34a,0f766e,2563eb&textColor=ffffff',
        'https://picsum.photos/seed/leafscan-la-xanh-bio-tp-hcm/1200/520'
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
    contact_url,
    logo_url,
    cover_url
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
    logo_url,
    cover_url,
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
    logo_url,
    cover_url,
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
    logo_url = EXCLUDED.logo_url,
    cover_url = EXCLUDED.cover_url,
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

WITH seed_partner_stores AS (
  SELECT *
  FROM (
    VALUES
      (
        'greenfarm-demo@leafscan.local',
        'An Phú Agri Hà Nội',
        'Đại lý vật tư nông nghiệp chuyên phân bón hữu cơ, chế phẩm sinh học và thuốc BVTV cho rau màu.',
        'Số 18 đường Ngọc Hồi, Hoàng Mai, Hà Nội',
        '0901000001',
        'https://api.dicebear.com/9.x/initials/png?seed=An%20Ph%C3%BA%20Agri%20H%C3%A0%20N%E1%BB%99i&backgroundColor=16a34a,0f766e,2563eb&textColor=ffffff',
        'https://picsum.photos/seed/leafscan-an-phu-agri-ha-noi/1200/520'
      ),
      (
        'mekong-agri-demo@leafscan.local',
        'Cửu Long Supply Cần Thơ',
        'Nhà phân phối vật tư cho vườn cây ăn quả, rau màu và cây công nghiệp khu vực miền Tây.',
        'Ấp Bình Hòa, Cái Răng, Cần Thơ',
        '0901000002',
        'https://api.dicebear.com/9.x/initials/png?seed=C%E1%BB%ADu%20Long%20Supply%20C%E1%BA%A7n%20Th%C6%A1&backgroundColor=16a34a,0f766e,2563eb&textColor=ffffff',
        'https://picsum.photos/seed/leafscan-cuu-long-supply-can-tho/1200/520'
      ),
      (
        'bioleaf-demo@leafscan.local',
        'Lá Xanh Bio TP HCM',
        'Đơn vị cung cấp chế phẩm sinh học, vi sinh đất và giải pháp IPM cho vườn nhà.',
        'Khu công nghệ cao, Quận 9, TP. Hồ Chí Minh',
        '0901000003',
        'https://api.dicebear.com/9.x/initials/png?seed=L%C3%A1%20Xanh%20Bio%20TP%20HCM&backgroundColor=16a34a,0f766e,2563eb&textColor=ffffff',
        'https://picsum.photos/seed/leafscan-la-xanh-bio-tp-hcm/1200/520'
      )
  ) AS rows(contact_email, name, description, address, phone, logo_url, cover_url)
),
updated_partner_stores AS (
  UPDATE partner_stores store
  SET
    name = seed.name,
    description = seed.description,
    address = seed.address,
    contact_email = seed.contact_email,
    phone = seed.phone,
    logo_url = seed.logo_url,
    cover_url = seed.cover_url,
    is_active = TRUE,
    is_primary = TRUE,
    updated_at = NOW()
  FROM seed_partner_stores seed
  JOIN partners partner ON partner.contact_email = seed.contact_email
  WHERE store.partner_id = partner.id
    AND store.is_primary = TRUE
  RETURNING store.id
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
  partner.id,
  seed.name,
  seed.description,
  seed.address,
  seed.contact_email,
  seed.phone,
  seed.logo_url,
  seed.cover_url,
  TRUE,
  TRUE,
  NOW(),
  NOW()
FROM seed_partner_stores seed
JOIN partners partner ON partner.contact_email = seed.contact_email
CROSS JOIN (SELECT COUNT(*) FROM updated_partner_stores) updated_count
WHERE NOT EXISTS (
  SELECT 1
  FROM partner_stores store
  WHERE store.partner_id = partner.id
);

WITH seed_products AS (
  SELECT *
  FROM (
    VALUES
      (
        'greenfarm-demo@leafscan.local',
        'Phân hữu cơ vi sinh GreenFarm 5kg',
        'Phân hữu cơ vi sinh dùng cải tạo đất, hỗ trợ rễ khỏe và phục hồi cây sau giai đoạn bệnh.',
        '/uploads/marketplace/greenfarm-phan-huu-co-vi-sinh.png',
        '85.000 - 120.000đ',
        '[]',
        '["Rau củ", "Hoa cảnh", "Cây ăn quả"]',
        'https://greenfarm.example.com/phan-huu-co-vi-sinh'
      ),
      (
        'greenfarm-demo@leafscan.local',
        'Chế phẩm nấm đối kháng Trichoderma',
        'Chế phẩm sinh học hỗ trợ hạn chế nấm đất, phù hợp xử lý giá thể và phòng bệnh vùng rễ.',
        '/uploads/marketplace/greenfarm-trichoderma.png',
        '65.000 - 95.000đ',
        '["tomato_early_blight", "potato_early_blight", "tomato_late_blight"]',
        '["Rau củ", "Cây ăn quả"]',
        'https://greenfarm.example.com/trichoderma'
      ),
      (
        'greenfarm-demo@leafscan.local',
        'Dung dịch đồng sinh học phòng đốm lá',
        'Sản phẩm hỗ trợ phòng đốm lá do vi khuẩn và nấm trên cà chua, ớt và rau màu.',
        '/uploads/marketplace/greenfarm-dong-sinh-hoc-dom-la.png',
        '110.000 - 150.000đ',
        '["tomato_bacterial_spot", "pepper_bacterial_spot", "tomato_septoria_leaf_spot"]',
        '["Rau củ"]',
        'https://greenfarm.example.com/dong-sinh-hoc-dom-la'
      ),
      (
        'greenfarm-demo@leafscan.local',
        'Phân bón lá rong biển phục hồi cây',
        'Bổ sung amino acid và chiết xuất rong biển, hỗ trợ cây phục hồi sau khi cắt bỏ lá bệnh.',
        '/uploads/marketplace/greenfarm-phan-bon-la-rong-bien.png',
        '75.000 - 115.000đ',
        '[]',
        '["Rau củ", "Cây ăn quả", "Hoa cảnh"]',
        'https://greenfarm.example.com/phan-bon-la-rong-bien'
      ),
      (
        'mekong-agri-demo@leafscan.local',
        'Dinh dưỡng Canxi Bo chống nứt trái',
        'Dinh dưỡng bổ sung Canxi Bo cho cà chua, ớt và cây ăn quả trong giai đoạn ra hoa đậu trái.',
        '/uploads/marketplace/mekong-canxi-bo.png',
        '95.000 - 135.000đ',
        '["tomato_healthy", "pepper_healthy"]',
        '["Rau củ", "Cây ăn quả"]',
        'https://mekongagri.example.com/canxi-bo'
      ),
      (
        'mekong-agri-demo@leafscan.local',
        'Thuốc sinh học Neem Oil 500ml',
        'Dầu neem hỗ trợ quản lý sâu chích hút, rệp và nhện đỏ theo hướng sinh học.',
        '/uploads/marketplace/mekong-neem-oil.png',
        '120.000 - 180.000đ',
        '["tomato_spider_mites"]',
        '["Rau củ", "Hoa cảnh", "Cây ăn quả"]',
        'https://mekongagri.example.com/neem-oil'
      ),
      (
        'mekong-agri-demo@leafscan.local',
        'Gói xử lý mốc sương cho khoai tây',
        'Bộ sản phẩm hỗ trợ phòng và quản lý mốc sương trên khoai tây, cà chua trong điều kiện ẩm.',
        '/uploads/marketplace/mekong-goi-xu-ly-moc-suong.png',
        '180.000 - 260.000đ',
        '["potato_late_blight", "tomato_late_blight"]',
        '["Rau củ"]',
        'https://mekongagri.example.com/moc-suong'
      ),
      (
        'mekong-agri-demo@leafscan.local',
        'Phân NPK cân đối cho rau màu',
        'Phân bón NPK cân đối dùng cho rau màu, ngũ cốc và cây vườn cần phục hồi sinh trưởng.',
        '/uploads/marketplace/mekong-npk-rau-mau.png',
        '140.000 - 220.000đ',
        '[]',
        '["Rau củ", "Ngũ cốc", "Cây ăn quả"]',
        'https://mekongagri.example.com/npk-rau-mau'
      ),
      (
        'bioleaf-demo@leafscan.local',
        'BioLeaf Bacillus Subtilis',
        'Chế phẩm Bacillus subtilis hỗ trợ quản lý nấm bệnh trên lá theo hướng sinh học.',
        '/uploads/marketplace/bioleaf-bacillus-subtilis.png',
        '90.000 - 130.000đ',
        '["squash_powdery_mildew", "cherry_powdery_mildew", "tomato_leaf_mold"]',
        '["Rau củ", "Hoa cảnh", "Cây ăn quả"]',
        'https://bioleaf.example.com/bacillus-subtilis'
      ),
      (
        'bioleaf-demo@leafscan.local',
        'Vi sinh đất BioRoot 1kg',
        'Vi sinh đất hỗ trợ hệ rễ, cải thiện đất trồng chậu và luống rau sau nhiều vụ canh tác.',
        '/uploads/marketplace/bioleaf-bioroot-vi-sinh-dat.png',
        '70.000 - 110.000đ',
        '[]',
        '["Rau củ", "Hoa cảnh", "Cây ăn quả"]',
        'https://bioleaf.example.com/bioroot'
      ),
      (
        'bioleaf-demo@leafscan.local',
        'Bẫy dính vàng kiểm soát côn trùng',
        'Bẫy dính vàng giúp theo dõi và giảm mật số côn trùng bay trong vườn nhà.',
        '/uploads/marketplace/bioleaf-bay-dinh-vang.png',
        '35.000 - 55.000đ',
        '["tomato_yellow_leaf_curl_virus"]',
        '["Rau củ", "Hoa cảnh"]',
        'https://bioleaf.example.com/bay-dinh-vang'
      ),
      (
        'bioleaf-demo@leafscan.local',
        'Dung dịch vệ sinh dụng cụ cắt tỉa',
        'Dung dịch dùng vệ sinh kéo cắt tỉa, hạn chế lây nhiễm chéo khi xử lý lá bệnh.',
        '/uploads/marketplace/bioleaf-ve-sinh-dung-cu.png',
        '45.000 - 75.000đ',
        '["tomato_bacterial_spot", "pepper_bacterial_spot", "strawberry_leaf_scorch"]',
        '["Rau củ", "Hoa cảnh", "Cây ăn quả"]',
        'https://bioleaf.example.com/ve-sinh-dung-cu'
      ),
      (
        'greenfarm-demo@leafscan.local',
        'Humic Acid GreenFarm cải tạo đất',
        'Humic acid hỗ trợ cải thiện đất bạc màu, tăng khả năng giữ dinh dưỡng và kích thích rễ non.',
        '/uploads/marketplace/greenfarm-humic-acid.png',
        '80.000 - 125.000đ',
        '[]',
        '["Rau củ", "Cây ăn quả", "Hoa cảnh"]',
        'https://greenfarm.example.com/humic-acid'
      ),
      (
        'greenfarm-demo@leafscan.local',
        'NPK ra hoa đậu trái GreenFarm',
        'Dinh dưỡng NPK chuyên dùng giai đoạn ra hoa, hỗ trợ đậu trái và hạn chế rụng hoa non.',
        '/uploads/marketplace/greenfarm-npk-ra-hoa.png',
        '135.000 - 210.000đ',
        '["tomato_healthy", "pepper_healthy"]',
        '["Rau củ", "Cây ăn quả"]',
        'https://greenfarm.example.com/npk-ra-hoa'
      ),
      (
        'greenfarm-demo@leafscan.local',
        'Silic Kali tăng cứng cây',
        'Bổ sung Silic và Kali giúp thân lá cứng cáp, hỗ trợ cây chống chịu sau thời tiết bất lợi.',
        '/uploads/marketplace/greenfarm-silic-kali.png',
        '95.000 - 145.000đ',
        '[]',
        '["Rau củ", "Cây ăn quả", "Ngũ cốc"]',
        'https://greenfarm.example.com/silic-kali'
      ),
      (
        'greenfarm-demo@leafscan.local',
        'Phân trùn quế GreenFarm 3kg',
        'Phân trùn quế hữu cơ dùng cho rau sạch, cây chậu và vườn nhà cần cải thiện độ tơi xốp.',
        '/uploads/marketplace/greenfarm-phan-trun-que.png',
        '55.000 - 90.000đ',
        '[]',
        '["Rau củ", "Hoa cảnh"]',
        'https://greenfarm.example.com/phan-trun-que'
      ),
      (
        'mekong-agri-demo@leafscan.local',
        'Mekong Magie Kẽm vi lượng',
        'Dinh dưỡng vi lượng Magie Kẽm hỗ trợ xanh lá, giảm vàng lá sinh lý và cải thiện quang hợp.',
        '/uploads/marketplace/mekong-magie-kem.png',
        '85.000 - 130.000đ',
        '[]',
        '["Rau củ", "Cây ăn quả", "Hoa cảnh"]',
        'https://mekongagri.example.com/magie-kem'
      ),
      (
        'mekong-agri-demo@leafscan.local',
        'Kali Sunphat cho cây ăn quả',
        'Kali Sunphat hỗ trợ lớn trái, lên màu và tăng chất lượng nông sản trong giai đoạn nuôi trái.',
        '/uploads/marketplace/mekong-kali-sunphat.png',
        '150.000 - 240.000đ',
        '[]',
        '["Cây ăn quả", "Rau củ"]',
        'https://mekongagri.example.com/kali-sunphat'
      ),
      (
        'mekong-agri-demo@leafscan.local',
        'Amino Acid phục hồi nhanh',
        'Dung dịch amino acid hỗ trợ cây phục hồi sau nắng nóng, ngập úng hoặc sau khi xử lý bệnh.',
        '/uploads/marketplace/mekong-amino-acid.png',
        '90.000 - 155.000đ',
        '[]',
        '["Rau củ", "Cây ăn quả", "Hoa cảnh"]',
        'https://mekongagri.example.com/amino-acid'
      ),
      (
        'mekong-agri-demo@leafscan.local',
        'Hữu cơ khoáng Mekong 10kg',
        'Phân hữu cơ khoáng dùng bón nền, cải thiện đất và cung cấp dinh dưỡng cân đối cho nhiều vụ.',
        '/uploads/marketplace/mekong-huu-co-khoang.png',
        '180.000 - 280.000đ',
        '[]',
        '["Rau củ", "Cây ăn quả", "Ngũ cốc"]',
        'https://mekongagri.example.com/huu-co-khoang'
      ),
      (
        'bioleaf-demo@leafscan.local',
        'BioLeaf EM gốc 1 lít',
        'Chế phẩm EM gốc dùng ủ phân hữu cơ, xử lý mùi và cải thiện hệ vi sinh trong đất.',
        '/uploads/marketplace/bioleaf-em-goc.png',
        '65.000 - 105.000đ',
        '[]',
        '["Rau củ", "Hoa cảnh", "Cây ăn quả"]',
        'https://bioleaf.example.com/em-goc'
      ),
      (
        'bioleaf-demo@leafscan.local',
        'Vi sinh phân giải lân BioP',
        'Vi sinh hỗ trợ phân giải lân khó tan, giúp rễ hấp thu dinh dưỡng hiệu quả hơn.',
        '/uploads/marketplace/bioleaf-phan-giai-lan.png',
        '75.000 - 120.000đ',
        '[]',
        '["Rau củ", "Cây ăn quả", "Ngũ cốc"]',
        'https://bioleaf.example.com/phan-giai-lan'
      ),
      (
        'bioleaf-demo@leafscan.local',
        'Đạm cá Amino BioLeaf',
        'Dinh dưỡng hữu cơ lỏng từ đạm cá, bổ sung amino acid cho cây trồng trong giai đoạn phục hồi.',
        '/uploads/marketplace/bioleaf-dam-ca-amino.png',
        '95.000 - 150.000đ',
        '[]',
        '["Rau củ", "Hoa cảnh", "Cây ăn quả"]',
        'https://bioleaf.example.com/dam-ca-amino'
      ),
      (
        'bioleaf-demo@leafscan.local',
        'Probiotic phun lá BioLeaf',
        'Chế phẩm probiotic phun lá hỗ trợ cân bằng hệ vi sinh bề mặt lá trong vườn rau và cây chậu.',
        '/uploads/marketplace/bioleaf-probiotic-phun-la.png',
        '85.000 - 135.000đ',
        '["squash_powdery_mildew", "cherry_powdery_mildew", "tomato_leaf_mold"]',
        '["Rau củ", "Hoa cảnh"]',
        'https://bioleaf.example.com/probiotic-phun-la'
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
