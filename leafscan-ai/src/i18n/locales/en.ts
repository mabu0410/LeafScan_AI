import { I18nResources } from './vi';

export const en: I18nResources = {
  common: {
    ok: 'OK',
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    back: 'Back',
    next: 'Next',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    retry: 'Retry',
    close: 'Close',
  },

  auth: {
    login: 'Login',
    register: 'Sign up',
    logout: 'Logout',
    email: 'Email',
    password: 'Password',
    name: 'Name',
    forgot_password: 'Forgot password',
    change_password: 'Change password',
    current_password: 'Current password',
    new_password: 'New password',
    confirm_password: 'Confirm new password',
    login_success: 'Logged in successfully',
    login_failed: 'Login failed',
    delete_account: 'Delete account',
    delete_account_confirm:
      'This will permanently delete all your data and cannot be undone. Enter your password to confirm.',
    delete_account_success: 'Account deleted permanently.',
  },

  profile: {
    title: 'Profile',
    achievements: 'Achievements',
    stats: {
      active_days: 'Active days',
      scanned_plants: 'Plants scanned',
      diseases_detected: 'Diseases detected',
      healthy_rate: 'Healthy ratio',
      common_disease: 'Most common disease',
    },
    my_plants: 'My Garden',
    recent_scans: 'Recent scans',
    settings: {
      title: 'Settings',
      notifications: 'Notifications',
      dark_mode: 'Dark mode',
      auto_save_scan: 'Auto-save scan images',
      language: 'Language',
      camera_permission: 'Camera permission',
      scan_quality: 'Scan image quality',
      clear_cache: 'Clear cache',
      granted: 'Granted',
      not_granted: 'Not granted',
      checking: 'Checking...',
    },
    account_security: {
      title: 'Account & Security',
      change_password: 'Change password',
      link_google: 'Link Google',
      linked: 'Linked',
      not_linked: 'Not linked',
      delete_account: 'Delete account',
    },
    app_info: {
      title: 'App info',
      help_feedback: 'Help & Feedback',
      privacy_policy: 'Privacy Policy',
      terms_of_use: 'Terms of Use',
      app_version: 'App version',
    },
  },

  scan: {
    title: 'Scan leaf',
    select_plant: 'Select plant',
    start_scan: 'Start scan',
    scanning: 'Scanning...',
    scan_complete: 'Scan complete',
    scan_failed: 'Scan failed',
  },

  chat: {
    title: 'AI Advisor',
    placeholder: 'Ask about plant diseases...',
    send: 'Send',
  },

  errors: {
    network: 'Could not connect to the server',
    timeout: 'Connection timed out',
    unknown: 'Something went wrong',
  },
};
