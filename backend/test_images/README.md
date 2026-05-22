# Test Images

Đặt các ảnh test vào thư mục này với đúng tên file:

- `non_leaf_laptop.jpg`
- `non_leaf_screen.jpg`
- `non_leaf_soil.jpg`
- `leaf_strawberry_spot.jpg`
- `leaf_corn_gray_spot.jpg`

Chạy test pipeline:

```bash
python scripts/test_scan_pipeline.py test_images/non_leaf_laptop.jpg
python scripts/test_scan_pipeline.py test_images/leaf_strawberry_spot.jpg --selected-plant-key Tomato
```

Kỳ vọng:

- `non_leaf_laptop.jpg` => `NO_LEAF_DETECTED`
- `non_leaf_screen.jpg` => `NO_LEAF_DETECTED`
- `non_leaf_soil.jpg` => `NO_LEAF_DETECTED`
- Ảnh lá rõ => pass validator rồi mới chạy model
- Nếu `--selected-plant-key` không khớp plant dự đoán => `PLANT_MISMATCH`
