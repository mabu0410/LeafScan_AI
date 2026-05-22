export const vi = {
  common: {
    ok: 'OK',
    cancel: 'Hủy',
    confirm: 'Xác nhận',
    save: 'Lưu',
    delete: 'Xóa',
    edit: 'Sửa',
    back: 'Quay lại',
    next: 'Tiếp theo',
    loading: 'Đang tải...',
    error: 'Lỗi',
    success: 'Thành công',
    retry: 'Thử lại',
    close: 'Đóng',
  },

  auth: {
    login: 'Đăng nhập',
    register: 'Đăng ký',
    logout: 'Đăng xuất',
    email: 'Email',
    password: 'Mật khẩu',
    name: 'Tên',
    forgot_password: 'Quên mật khẩu',
    change_password: 'Đổi mật khẩu',
    current_password: 'Mật khẩu hiện tại',
    new_password: 'Mật khẩu mới',
    confirm_password: 'Xác nhận mật khẩu mới',
    login_success: 'Đăng nhập thành công',
    login_failed: 'Đăng nhập thất bại',
    delete_account: 'Xóa tài khoản',
    delete_account_confirm:
      'Thao tác này sẽ xóa toàn bộ dữ liệu của bạn và không thể hoàn tác. Nhập mật khẩu để xác nhận.',
    delete_account_success: 'Tài khoản đã được xóa vĩnh viễn.',
  },

  profile: {
    title: 'Hồ sơ',
    achievements: 'Thành tích',
    stats: {
      active_days: 'Ngày hoạt động',
      scanned_plants: 'Cây đã quét',
      diseases_detected: 'Bệnh phát hiện',
      healthy_rate: 'Tỷ lệ cây khỏe',
      common_disease: 'Bệnh thường gặp nhất',
    },
    my_plants: 'Vườn của tôi',
    recent_scans: 'Lần quét gần đây',
    settings: {
      title: 'Cài đặt',
      notifications: 'Thông báo',
      dark_mode: 'Chế độ tối',
      auto_save_scan: 'Tự động lưu ảnh quét',
      language: 'Ngôn ngữ',
      camera_permission: 'Quyền camera',
      scan_quality: 'Chất lượng ảnh khi quét',
      clear_cache: 'Xóa bộ nhớ cache',
      granted: 'Đã cấp',
      not_granted: 'Chưa cấp',
      checking: 'Đang kiểm tra',
    },
    account_security: {
      title: 'Tài khoản & Bảo mật',
      change_password: 'Đổi mật khẩu',
      link_google: 'Liên kết Google',
      linked: 'Đã liên kết',
      not_linked: 'Chưa liên kết',
      delete_account: 'Xóa tài khoản',
    },
    app_info: {
      title: 'Thông tin ứng dụng',
      help_feedback: 'Trợ giúp & Phản hồi',
      privacy_policy: 'Chính sách bảo mật',
      terms_of_use: 'Điều khoản sử dụng',
      app_version: 'Phiên bản app',
    },
  },

  scan: {
    title: 'Quét lá cây',
    select_plant: 'Chọn loại cây',
    start_scan: 'Bắt đầu quét',
    scanning: 'Đang quét...',
    scan_complete: 'Quét hoàn tất',
    scan_failed: 'Quét thất bại',
  },

  chat: {
    title: 'Tư vấn AI',
    placeholder: 'Nhập câu hỏi về bệnh cây...',
    send: 'Gửi',
  },

  errors: {
    network: 'Không kết nối được máy chủ',
    timeout: 'Quá thời gian kết nối',
    unknown: 'Đã có lỗi xảy ra',
  },
};

export type I18nResources = typeof vi;
