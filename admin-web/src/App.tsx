import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Bell,
  Building2,
  Check,
  ChevronDown,
  CircleDollarSign,
  Clock,
  Download,
  ExternalLink,
  FileText,
  LayoutDashboard,
  Leaf,
  LogOut,
  Menu,
  PackageCheck,
  Pencil,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  Sprout,
  Store,
  TrendingUp,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import {
  createAdminDisease,
  createCareTip,
  deleteAdminDisease,
  deleteCareTip,
  exportAdminRevenueReport,
  getAdminDashboard,
  getAdminRevenueReport,
  listAdminDiseases,
  listAdminInquiries,
  listAdminPayments,
  listAdminScans,
  listAdminUsers,
  listAdminCareTips,
  listNotifications,
  listPendingPartners,
  listPendingProducts,
  loginAdmin,
  markAllNotificationsRead,
  markNotificationRead,
  refundAdminPayment,
  toAssetUrl,
  updateAdminDisease,
  updateCareTip,
  updateAdminUserStatus,
  updatePartnerStatus,
  updateProductStatus,
} from './api';
import {
  AdminDashboardData,
  AdminDiseaseItem,
  AdminDiseasePayload,
  AdminPaymentItem,
  AdminRevenueReportData,
  AdminScanItem,
  AdminUserItem,
  AuthSession,
  CareTip,
  CareTipPayload,
  MarketplaceInquiry,
  NotificationListData,
  PaginatedData,
  PartnerProduct,
  PartnerStore,
} from './types';

const SESSION_KEY = 'leafscan-admin-session';
const PAGE_SIZE = 5;

type RouteName = 'login' | 'dashboard' | 'partners' | 'products' | 'care-tips' | 'users' | 'payments' | 'scans' | 'diseases' | 'inquiries' | 'notifications';
type IconComponent = typeof LayoutDashboard;
type ToastType = 'success' | 'error' | 'info';

interface ToastState {
  message: string;
  type: ToastType;
}

function inferToastType(message: string): ToastType {
  const normalized = message.trim().toLocaleLowerCase('vi');
  if (
    normalized.startsWith('không ') ||
    normalized.includes('thất bại') ||
    normalized.includes('lỗi') ||
    normalized.includes('hết hạn')
  ) {
    return 'error';
  }
  if (normalized.startsWith('có ')) return 'info';
  return 'success';
}

function getInitialRoute(): RouteName {
  const route = window.location.pathname.replace('/', '') as RouteName;
  if (
    route === 'dashboard' ||
    route === 'partners' ||
    route === 'products' ||
    route === 'care-tips' ||
    route === 'users' ||
    route === 'payments' ||
    route === 'scans' ||
    route === 'diseases' ||
    route === 'inquiries' ||
    route === 'notifications'
  ) return route;
  return 'dashboard';
}

function routeTitle(route: RouteName) {
  if (route === 'partners') return 'Duyệt đại lý';
  if (route === 'products') return 'Duyệt sản phẩm';
  if (route === 'care-tips') return 'Mẹo chăm sóc';
  if (route === 'users') return 'Người dùng';
  if (route === 'payments') return 'Thanh toán';
  if (route === 'scans') return 'Lịch sử quét';
  if (route === 'diseases') return 'Bệnh cây';
  if (route === 'inquiries') return 'Yêu cầu tư vấn';
  if (route === 'notifications') return 'Thông báo';
  return 'Tổng quan';
}

function currency(value: string | null) {
  return value || 'Chưa có giá';
}

function money(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function numberLabel(value: number) {
  return new Intl.NumberFormat('vi-VN').format(value || 0);
}

function metricValue(value: number | string) {
  return typeof value === 'number' ? numberLabel(value) : value;
}

function dateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Không rõ ngày';
  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function dateInputValue(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function asList(values: string[]) {
  return values.length ? values.join(', ') : 'Chưa khai báo';
}

function statusLabel(value: string | null | undefined) {
  const labels: Record<string, string> = {
    active: 'Đang hoạt động',
    approved: 'Đã duyệt',
    hidden: 'Tạm ẩn',
    inactive: 'Tạm ẩn',
    pending: 'Đang chờ',
    pending_review: 'Chờ duyệt',
    rejected: 'Từ chối',
    suspended: 'Tạm khóa',
    success: 'Thành công',
    failed: 'Thất bại',
    invalid: 'Không hợp lệ',
    refunded: 'Đã hoàn tiền',
    expired: 'Hết hạn',
    healthy: 'Khỏe mạnh',
    moderate: 'Trung bình',
    severe: 'Nặng',
    new: 'Mới',
    contacted: 'Đã liên hệ',
    closed: 'Đã đóng',
    partner_review: 'Duyệt đại lý',
    product_review: 'Duyệt sản phẩm',
    payment: 'Thanh toán',
    care_task: 'Lịch chăm sóc',
    system: 'Hệ thống',
  };
  return labels[value || ''] || value || 'Không rõ';
}

function statusPillClass(value: string | null | undefined) {
  const key = String(value || 'unknown')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-');
  return `statusPill status-${key}`;
}

function planLabel(value: string) {
  const labels: Record<string, string> = {
    personal_monthly: 'Cá nhân tháng',
    personal_yearly: 'Cá nhân năm',
    pro_monthly: 'Pro tháng',
    pro_yearly: 'Pro năm',
  };
  return labels[value] || value;
}

function transactionKindLabel(value: string) {
  return value === 'partner' ? 'Gói đại lý' : 'Gói người dùng';
}

function paginateRows<T>(rows: T[], page: number, pageSize = PAGE_SIZE) {
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(Math.max(page, 1), pageCount);
  const start = (safePage - 1) * pageSize;
  return {
    page: safePage,
    pageCount,
    rows: rows.slice(start, start + pageSize),
    start: rows.length ? start + 1 : 0,
    end: Math.min(start + pageSize, rows.length),
  };
}

export function App() {
  const [session, setSession] = useState<AuthSession | null>(() => {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthSession;
    } catch {
      return null;
    }
  });
  const [route, setRoute] = useState<RouteName>(() => (session ? getInitialRoute() : 'login'));
  const [partners, setPartners] = useState<PartnerStore[]>([]);
  const [products, setProducts] = useState<PartnerProduct[]>([]);
  const [careTips, setCareTips] = useState<CareTip[]>([]);
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
  const [notificationInbox, setNotificationInbox] = useState<NotificationListData | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [globalSearch, setGlobalSearch] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [seenApprovalCounts, setSeenApprovalCounts] = useState<{ partners: number; products: number } | null>(null);
  const [previousRoute, setPreviousRoute] = useState<RouteName | null>(null);

  const setMessage = (message: string | null, type?: ToastType) => {
    setToast(message ? { message, type: type || inferToastType(message) } : null);
  };

  const navigate = (next: RouteName) => {
    setNotificationsOpen(false);
    setSidebarOpen(false);
    if (next !== route) {
      setPreviousRoute(route);
    }
    setRoute(next);
    window.history.pushState(null, '', next === 'login' ? '/login' : `/${next}`);
  };

  const goBackFromScans = () => {
    const target = previousRoute && previousRoute !== 'login' && previousRoute !== route ? previousRoute : 'dashboard';
    navigate(target);
  };

  const toggleSidebar = () => {
    setNotificationsOpen(false);
    if (window.matchMedia('(max-width: 900px)').matches) {
      setSidebarOpen((open) => !open);
      return;
    }
    setSidebarCollapsed((collapsed) => !collapsed);
  };

  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
    setPartners([]);
    setProducts([]);
    setCareTips([]);
    setDashboardData(null);
    setNotificationInbox(null);
    navigate('login');
  };

  const refresh = async (options: { silent?: boolean } = {}) => {
    if (!session) return;
    if (!options.silent) {
      setLoading(true);
      setMessage(null);
    }
    try {
      const [dashboardRows, partnerRows, productRows, careTipRows, notificationRows] = await Promise.all([
        getAdminDashboard(session.accessToken),
        listPendingPartners(session.accessToken),
        listPendingProducts(session.accessToken),
        listAdminCareTips(session.accessToken),
        listNotifications(session.accessToken),
      ]);
      setDashboardData(dashboardRows);
      setPartners(partnerRows);
      setProducts(productRows);
      setCareTips(careTipRows);
      setNotificationInbox(notificationRows);
    } catch (error) {
      if ((error as Error).name === 'AuthError') {
        logout();
        return;
      }
      if (!options.silent) {
        setMessage((error as Error).message || 'Không tải được dữ liệu admin.');
      }
    } finally {
      if (!options.silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (session) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      if (route === 'login') navigate('dashboard');
      refresh();
    } else {
      navigate('login');
    }
  }, [session]);

  useEffect(() => {
    const onPopState = () => setRoute(session ? getInitialRoute() : 'login');
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [session]);

  useEffect(() => {
    if (!session) return undefined;
    const timer = window.setInterval(() => {
      refresh({ silent: true });
    }, 60000);
    return () => window.clearInterval(timer);
  }, [session]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!session) return undefined;

    let cancelled = false;
    const pollAdminActivity = async () => {
      try {
        const [partnerRows, productRows, notificationRows] = await Promise.all([
          listPendingPartners(session.accessToken),
          listPendingProducts(session.accessToken),
          listNotifications(session.accessToken),
        ]);
        if (cancelled) return;
        setPartners(partnerRows);
        setProducts(productRows);
        setNotificationInbox(notificationRows);
        setDashboardData((current) =>
          current
            ? {
                ...current,
                partners: { ...current.partners, pending: partnerRows.length },
                products: { ...current.products, pending: productRows.length },
              }
            : current
        );
      } catch (error) {
        if ((error as Error).name === 'AuthError') {
          logout();
        }
      }
    };

    const timer = window.setInterval(() => {
      pollAdminActivity();
    }, 10000);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        pollAdminActivity();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [session]);

  useEffect(() => {
    const onResize = () => {
      if (!window.matchMedia('(max-width: 900px)').matches) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!sidebarOpen) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [sidebarOpen]);

  const stats = useMemo(
    () => [
      { label: 'Người dùng', value: numberLabel(dashboardData?.users.total ?? 0), icon: Users },
      { label: 'Quét 30 ngày', value: numberLabel(dashboardData?.activity.last_30d ?? dashboardData?.scans.total ?? 0), icon: BarChart3 },
      { label: 'Doanh thu thành công', value: money(dashboardData?.revenue.total_success_vnd ?? 0), icon: CircleDollarSign },
      { label: 'Việc chờ duyệt', value: numberLabel((dashboardData?.partners.pending ?? partners.length) + (dashboardData?.products.pending ?? products.length)), icon: ShieldCheck },
      { label: 'Cửa hàng đang bật', value: numberLabel(dashboardData?.marketplace.stores_active ?? 0), icon: Store },
      { label: 'Gói đại lý active', value: numberLabel(dashboardData?.marketplace.memberships_active ?? 0), icon: PackageCheck },
    ],
    [dashboardData, partners.length, products.length]
  );
  const pendingPartnerCount = dashboardData?.partners.pending ?? partners.length;
  const pendingProductCount = dashboardData?.products.pending ?? products.length;
  const notificationCount = notificationInbox?.unread_count ?? 0;

  useEffect(() => {
    if (!session || !dashboardData) return;
    const nextCounts = { partners: pendingPartnerCount, products: pendingProductCount };
    if (!seenApprovalCounts) {
      setSeenApprovalCounts(nextCounts);
      return;
    }

    const newPartners = Math.max(0, nextCounts.partners - seenApprovalCounts.partners);
    const newProducts = Math.max(0, nextCounts.products - seenApprovalCounts.products);
    if (newPartners || newProducts) {
      const parts = [
        newPartners ? `${newPartners} hồ sơ đại lý mới` : '',
        newProducts ? `${newProducts} sản phẩm mới` : '',
      ].filter(Boolean);
      setMessage(`Có ${parts.join(' và ')} cần duyệt.`);
      setNotificationsOpen(true);
    }
    setSeenApprovalCounts(nextCounts);
  }, [session, dashboardData, pendingPartnerCount, pendingProductCount, seenApprovalCounts]);

  if (!session || route === 'login') {
    return <LoginScreen onLogin={setSession} />;
  }

  const approvePartner = async (partner: PartnerStore, status: 'active' | 'rejected') => {
    setLoading(true);
    setMessage(null);
    try {
      await updatePartnerStatus(session.accessToken, partner.id, status);
      setPartners((rows) => rows.filter((item) => item.id !== partner.id));
      setMessage(status === 'active' ? 'Đã duyệt hồ sơ đại lý.' : 'Đã từ chối hồ sơ đại lý.');
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const approveProduct = async (product: PartnerProduct, status: 'approved' | 'rejected') => {
    setLoading(true);
    setMessage(null);
    try {
      await updateProductStatus(session.accessToken, product.id, status);
      setProducts((rows) => rows.filter((item) => item.id !== product.id));
      setMessage(status === 'approved' ? 'Đã duyệt sản phẩm.' : 'Đã từ chối sản phẩm.');
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const saveCareTip = async (payload: CareTipPayload, id?: number) => {
    setLoading(true);
    setMessage(null);
    try {
      const saved = id
        ? await updateCareTip(session.accessToken, id, payload)
        : await createCareTip(session.accessToken, payload);
      setCareTips((rows) => {
        const exists = rows.some((item) => item.id === saved.id);
        if (exists) {
          return rows.map((item) => (item.id === saved.id ? saved : item));
        }
        return [saved, ...rows];
      });
      setMessage(id ? 'Đã cập nhật mẹo chăm sóc.' : 'Đã tạo mẹo chăm sóc.');
    } catch (error) {
      if ((error as Error).name === 'AuthError') {
        logout();
        return;
      }
      setMessage((error as Error).message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const removeCareTip = async (tip: CareTip) => {
    setLoading(true);
    setMessage(null);
    try {
      await deleteCareTip(session.accessToken, tip.id);
      setCareTips((rows) => rows.filter((item) => item.id !== tip.id));
      setMessage('Đã xóa mẹo chăm sóc.');
    } catch (error) {
      if ((error as Error).name === 'AuthError') {
        logout();
        return;
      }
      setMessage((error as Error).message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const openNotification = async (notificationId: number, routeHint?: unknown) => {
    try {
      await markNotificationRead(session.accessToken, notificationId);
      const nextInbox = await listNotifications(session.accessToken);
      setNotificationInbox(nextInbox);
    } catch (error) {
      setMessage((error as Error).message || 'Không cập nhật được thông báo.');
    }
    const routeFromData = typeof routeHint === 'string' ? routeHint : undefined;
    if (routeFromData === 'partners') navigate('partners');
    else if (routeFromData === 'products') navigate('products');
    else if (routeFromData === 'payments') navigate('payments');
    else if (routeFromData === 'inquiries') navigate('inquiries');
    else navigate('notifications');
  };

  const readAllNotifications = async () => {
    try {
      const nextInbox = await markAllNotificationsRead(session.accessToken);
      setNotificationInbox(nextInbox);
      setMessage('Đã đánh dấu tất cả thông báo là đã đọc.');
    } catch (error) {
      setMessage((error as Error).message || 'Không cập nhật được thông báo.');
    }
  };

  return (
    <div className={`shell ${sidebarCollapsed ? 'sidebarCollapsed' : ''} ${sidebarOpen ? 'sidebarOpen' : ''}`}>
      <button className="sidebarBackdrop" type="button" aria-label="Đóng menu" onClick={() => setSidebarOpen(false)} />
      <aside className="sidebar" id="admin-sidebar">
        <div className="brand">
          <div>
            <div className="brandName">LeafScan Admin</div>
            <div className="brandMeta">Duyệt chợ sản phẩm</div>
          </div>
        </div>

        <nav className="nav">
          <NavButton icon={LayoutDashboard} label="Tổng quan" active={route === 'dashboard'} onClick={() => navigate('dashboard')} />
          <NavButton icon={Building2} label="Đại lý" active={route === 'partners'} onClick={() => navigate('partners')} badge={partners.length} />
          <NavButton icon={PackageCheck} label="Sản phẩm" active={route === 'products'} onClick={() => navigate('products')} badge={products.length} />
          <NavButton icon={Leaf} label="Mẹo chăm sóc" active={route === 'care-tips'} onClick={() => navigate('care-tips')} badge={careTips.length} />
          <NavButton icon={Sprout} label="Bệnh cây" active={route === 'diseases'} onClick={() => navigate('diseases')} badge={dashboardData?.content.diseases_total} />
          <NavButton icon={FileText} label="Yêu cầu tư vấn" active={route === 'inquiries'} onClick={() => navigate('inquiries')} />
          <NavButton icon={Bell} label="Thông báo" active={route === 'notifications'} onClick={() => navigate('notifications')} badge={notificationCount} />
          <NavButton icon={Users} label="Người dùng" active={route === 'users'} onClick={() => navigate('users')} badge={dashboardData?.users.total} />
          <NavButton icon={CircleDollarSign} label="Thanh toán" active={route === 'payments'} onClick={() => navigate('payments')} badge={dashboardData?.revenue.pending_count} />
          <NavButton icon={BarChart3} label="Lịch sử quét" active={route === 'scans'} onClick={() => navigate('scans')} badge={dashboardData?.activity.last_30d} />
        </nav>

        <div className="account">
          <div>
            <div className="accountName">{session.user.name}</div>
            <div className="accountEmail">{session.user.email}</div>
          </div>
          <ChevronDown size={16} />
        </div>
      </aside>

      <main className="main">
        <header className="appHeader">
          <div className="headerLeft">
            <button
              className="menuButton"
              type="button"
              aria-label="Mở hoặc thu gọn menu"
              aria-controls="admin-sidebar"
              aria-expanded={!sidebarCollapsed || sidebarOpen}
              onClick={toggleSidebar}
            >
              <Menu size={21} />
            </button>
            <label className="quickSearch">
              <Search size={18} />
              <input value={globalSearch} onChange={(event) => setGlobalSearch(event.target.value)} placeholder="Tìm kiếm nhanh..." />
              <kbd>Ctrl K</kbd>
            </label>
          </div>
          <div className="topbarActions">
            <div className="notificationMenu">
              <button
                className={`iconButton notificationButton ${notificationCount ? 'hasUnread' : ''}`}
                type="button"
                title="Thông báo"
                aria-label={`Thông báo: ${notificationCount} chưa đọc`}
                aria-expanded={notificationsOpen}
                onClick={() => setNotificationsOpen((open) => !open)}
              >
                <Bell size={19} />
                {notificationCount > 0 && <span className="notificationBadge">{notificationCount > 99 ? '99+' : notificationCount}</span>}
              </button>
              {notificationsOpen && (
                <section className="notificationPanel" aria-label="Thông báo">
                  <div className="notificationHeader">
                    <div>
                      <strong>Thông báo</strong>
                      <small>Dữ liệu lấy từ notification API.</small>
                    </div>
                    <span>{notificationCount ? `${notificationCount} chưa đọc` : 'Đã đọc hết'}</span>
                  </div>

                  {!notificationInbox?.items.length ? (
                    <div className="notificationEmpty">
                      <BadgeCheck size={24} />
                      <strong>Chưa có thông báo</strong>
                      <small>Thông báo mới sẽ hiện tại đây.</small>
                    </div>
                  ) : (
                    <div className="notificationList">
                      {notificationInbox.items.slice(0, 5).map((item) => (
                        <button className={`notificationItem ${item.read_at ? '' : 'unread'}`} type="button" key={item.id} onClick={() => openNotification(item.id, item.data?.route)}>
                          <span className="notificationIcon">
                            <Bell size={18} />
                          </span>
                          <div>
                            <strong>{item.title}</strong>
                            <small>{item.body}</small>
                          </div>
                          {!item.read_at && <b>Mới</b>}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="notificationFooter">
                    <button type="button" onClick={() => navigate('notifications')}>Xem tất cả</button>
                    <button type="button" onClick={readAllNotifications} disabled={!notificationCount}>Đọc tất cả</button>
                  </div>
                </section>
              )}
            </div>
            <button className="secondaryButton" onClick={() => refresh()} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'spin' : ''} />
              Tải lại
            </button>
            <button className="secondaryButton logoutTopButton" onClick={logout}>
              <LogOut size={16} />
              Đăng xuất
            </button>
            <div className="topbarAccount">
              <div>
                <strong>{session.user.name}</strong>
                <small>Quản trị viên</small>
              </div>
              <ChevronDown size={16} />
            </div>
          </div>
        </header>

        <section className={`pageTitle ${route === 'scans' ? 'pageTitleWithBack' : ''}`}>
          {route === 'scans' && (
            <button className="pageBackButton" type="button" onClick={goBackFromScans}>
              <ArrowLeft size={18} />
              Quay lại
            </button>
          )}
          <div className="pageTitleText">
            <div className="eyebrow">Không gian quản trị</div>
            <h1>{routeTitle(route)}</h1>
          </div>
        </section>

        {toast && (
          <div
            className={`actionToast actionToast--${toast.type}`}
            role={toast.type === 'error' ? 'alert' : 'status'}
            aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
          >
            <span className="actionToastIcon">
              {toast.type === 'success' ? <BadgeCheck size={22} /> : toast.type === 'error' ? <AlertCircle size={22} /> : <Bell size={22} />}
            </span>
            <div className="actionToastContent">
              <strong>{toast.type === 'success' ? 'Thành công' : toast.type === 'error' ? 'Có lỗi xảy ra' : 'Thông báo mới'}</strong>
              <span>{toast.message}</span>
            </div>
            <button type="button" className="actionToastClose" aria-label="Đóng thông báo" onClick={() => setToast(null)}>
              <X size={18} />
            </button>
          </div>
        )}

        {route === 'dashboard' && (
          <Dashboard stats={stats} partners={partners} products={products} careTips={careTips} dashboardData={dashboardData} onNavigate={navigate} />
        )}
        {route === 'partners' && (
          <PartnersPage partners={partners} loading={loading} quickSearch={globalSearch} onAction={approvePartner} />
        )}
        {route === 'products' && (
          <ProductsPage products={products} loading={loading} quickSearch={globalSearch} onAction={approveProduct} />
        )}
        {route === 'care-tips' && (
          <CareTipsPage careTips={careTips} loading={loading} quickSearch={globalSearch} onSave={saveCareTip} onDelete={removeCareTip} />
        )}
        {route === 'diseases' && (
          <DiseasesPage token={session.accessToken} quickSearch={globalSearch} onMessage={setMessage} onRefreshDashboard={() => refresh({ silent: true })} />
        )}
        {route === 'inquiries' && (
          <InquiriesPage token={session.accessToken} quickSearch={globalSearch} onMessage={setMessage} />
        )}
        {route === 'notifications' && (
          <NotificationsPage token={session.accessToken} inbox={notificationInbox} onInboxChange={setNotificationInbox} onMessage={setMessage} />
        )}
        {route === 'users' && (
          <UsersPage token={session.accessToken} quickSearch={globalSearch} onMessage={setMessage} />
        )}
        {route === 'payments' && (
          <PaymentsPage token={session.accessToken} quickSearch={globalSearch} onMessage={setMessage} />
        )}
        {route === 'scans' && (
          <ScansPage token={session.accessToken} quickSearch={globalSearch} onMessage={setMessage} />
        )}
      </main>
    </div>
  );
}

function LoginScreen({ onLogin }: { onLogin: (session: AuthSession) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const nextSession = await loginAdmin(email.trim(), password);
      onLogin(nextSession);
    } catch (err) {
      setError((err as Error).message || 'Đăng nhập thất bại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="loginPage">
      <section className="loginPanel">
        <div className="loginMark">
          <ShieldCheck size={28} />
        </div>
        <h1>LeafScan Admin</h1>
        <p>Đăng nhập bằng tài khoản nằm trong ADMIN_EMAILS để duyệt chợ sản phẩm.</p>
        <form onSubmit={submit} className="loginForm">
          <label>
            Email hoặc tài khoản
            <input type="text" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin" required />
          </label>
          <label>
            Mật khẩu
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Nhập mật khẩu" required />
          </label>
          {error && <div className="formError">{error}</div>}
          <button className="primaryButton" type="submit" disabled={loading}>
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            <ArrowRight size={17} />
          </button>
        </form>
      </section>
    </main>
  );
}

function NavButton({
  icon: Icon,
  label,
  active,
  onClick,
  badge,
}: {
  icon: IconComponent;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button className={`navButton ${active ? 'active' : ''}`} onClick={onClick}>
      <Icon size={18} />
      <span>{label}</span>
      {typeof badge === 'number' && badge > 0 && <b>{badge}</b>}
    </button>
  );
}

function Dashboard({
  stats,
  partners,
  products,
  careTips,
  dashboardData,
  onNavigate,
}: {
  stats: Array<{ label: string; value: number | string; icon: IconComponent }>;
  partners: PartnerStore[];
  products: PartnerProduct[];
  careTips: CareTip[];
  dashboardData: AdminDashboardData | null;
  onNavigate: (route: RouteName) => void;
}) {
  const scanSeries = dashboardData?.scan_series || [];
  const chartWidth = 700;
  const chartHeight = 180;
  const chartPaddingX = 26;
  const chartPaddingY = 24;
  const chartInnerWidth = chartWidth - chartPaddingX * 2;
  const chartInnerHeight = chartHeight - chartPaddingY * 2;
  const maxScans = Math.max(...scanSeries.map((item) => item.scans), 1);
  const chartPoints = scanSeries.map((item, index) => {
    const x = chartPaddingX + (scanSeries.length <= 1 ? chartInnerWidth / 2 : (index / (scanSeries.length - 1)) * chartInnerWidth);
    const y = chartPaddingY + chartInnerHeight - (item.scans / maxScans) * chartInnerHeight;
    return { ...item, x, y };
  });
  const chartLinePoints = chartPoints.map((point) => `${point.x},${point.y}`).join(' ');
  const chartAreaPoints = chartPoints.length
    ? `${chartPoints[0].x},${chartHeight - chartPaddingY} ${chartLinePoints} ${chartPoints[chartPoints.length - 1].x},${chartHeight - chartPaddingY}`
    : '';
  const chartGridLines = [0, 1, 2, 3].map((index) => chartPaddingY + (index / 3) * chartInnerHeight);

  return (
    <div className="dashboard">
      <div className="statGrid">
        {stats.map((item) => (
          <div className="statCard" key={item.label}>
            <item.icon size={22} />
            <div>
              <div className="statValue">{item.value}</div>
              <div className="statLabel">{item.label}</div>
            </div>
          </div>
        ))}
      </div>

      {dashboardData && (
        <>
          <div className="analyticsGrid">
            <BreakdownCard
              icon={Users}
              title="Người dùng"
              total={dashboardData.users.total}
              rows={[
                ['Nông dân', dashboardData.users.active],
                ['Đối tác', dashboardData.users.approved],
                ['Quản trị viên', dashboardData.users.pending],
              ]}
            />
            <BreakdownCard
              icon={BarChart3}
              title="Hoạt động quét"
              total={dashboardData.scans.total}
              rows={[
                ['Hôm nay', dashboardData.activity.today],
                ['7 ngày gần đây', dashboardData.activity.last_7d],
                ['30 ngày gần đây', dashboardData.activity.last_30d],
                ['Độ tin cậy trung bình', dashboardData.activity.average_confidence == null ? 'Chưa có' : `${dashboardData.activity.average_confidence}%`],
                ['Ảnh dưới ngưỡng 70%', dashboardData.activity.low_confidence],
              ]}
            />
            <BreakdownCard
              icon={Building2}
              title="Đối tác chợ sản phẩm"
              total={dashboardData.partners.total}
              rows={[
                ['Chờ duyệt', dashboardData.partners.pending],
                ['Đang hoạt động', dashboardData.partners.active],
                ['Từ chối', dashboardData.partners.rejected],
                ['Tạm khóa', dashboardData.partners.suspended],
              ]}
            />
            <BreakdownCard
              icon={Store}
              title="Cửa hàng & gói đại lý"
              total={dashboardData.marketplace.stores_total}
              rows={[
                ['Cửa hàng đang bật', dashboardData.marketplace.stores_active],
                ['Gói đại lý active', dashboardData.marketplace.memberships_active],
                ['Gói đã hết hạn', dashboardData.marketplace.memberships_expired],
                ['Lượt hiển thị sản phẩm', dashboardData.marketplace.impressions_total],
                ['Tỷ lệ nhấp', `${dashboardData.marketplace.click_rate}%`],
              ]}
            />
            <BreakdownCard
              icon={PackageCheck}
              title="Sản phẩm vật tư"
              total={dashboardData.products.total}
              rows={[
                ['Chờ duyệt', dashboardData.products.pending],
                ['Đã duyệt', dashboardData.products.approved],
                ['Đang bật', dashboardData.products.active],
                ['Từ chối', dashboardData.products.rejected],
              ]}
            />
            <BreakdownCard
              icon={ShieldCheck}
              title="Gói người dùng"
              total={dashboardData.subscriptions.total}
              rows={[
                ['Đang dùng trả phí', dashboardData.subscriptions.active],
                ['Miễn phí', dashboardData.subscriptions.pending],
                ['Đã hết hạn', dashboardData.subscriptions.rejected],
              ]}
            />
            <BreakdownCard
              icon={Sprout}
              title="Cây & nội dung"
              total={dashboardData.plants.total}
              rows={[
                ['Cây trong vườn', dashboardData.plants.total],
                ['Bệnh trong thư viện', dashboardData.content.diseases_total],
                ['Mẹo đang hiển thị', dashboardData.content.care_tips_active],
                ['Mẹo tạm ẩn', dashboardData.content.care_tips_hidden],
              ]}
            />
            <BreakdownCard
              icon={Bell}
              title="Thông báo"
              total={dashboardData.notifications.total}
              rows={[
                ['Thiết bị đang bật', dashboardData.notifications.active],
                ['Đã gửi', dashboardData.notifications.approved],
                ['Đang chờ', dashboardData.notifications.pending],
                ['Thất bại', dashboardData.notifications.rejected],
              ]}
            />
          </div>

          <div className="revenueGrid">
            <section className="panel">
              <div className="sectionHeader">
                <div>
                  <h2>Doanh thu thanh toán</h2>
                  <p>Chỉ tính giao dịch VNPAY có trạng thái thành công.</p>
                </div>
                <CircleDollarSign size={22} />
              </div>
              <div className="moneyValue">{money(dashboardData.revenue.total_success_vnd)}</div>
              <div className="revenueRows">
                <Info label="Gói người dùng" value={`${money(dashboardData.revenue.user_success_vnd)} / ${dashboardData.revenue.user_success_count} giao dịch`} />
                <Info label="Gói đối tác" value={`${money(dashboardData.revenue.partner_success_vnd)} / ${dashboardData.revenue.partner_success_count} giao dịch`} />
                <Info label="Thanh toán đang chờ" value={`${dashboardData.revenue.pending_count} giao dịch`} />
                <Info label="Tiền đang chờ" value={money(dashboardData.payments.pending_amount_vnd)} />
                <Info label="Tiền lỗi/không hợp lệ" value={money(dashboardData.payments.failed_amount_vnd)} />
              </div>
            </section>

            <section className="panel">
              <div className="sectionHeader">
                <div>
                  <h2>Trạng thái thanh toán</h2>
                  <p>Tách riêng giao dịch gói người dùng và gói đại lý.</p>
                </div>
                <ShieldCheck size={22} />
              </div>
              <div className="paymentGrid">
                <div>
                  <h3>Người dùng</h3>
                  <Info label="Thành công" value={`${dashboardData.payments.user_success_count} giao dịch`} />
                  <Info label="Đang chờ" value={`${dashboardData.payments.user_pending_count} giao dịch`} />
                  <Info label="Lỗi/không hợp lệ" value={`${dashboardData.payments.user_failed_count} giao dịch`} />
                </div>
                <div>
                  <h3>Đại lý</h3>
                  <Info label="Thành công" value={`${dashboardData.payments.partner_success_count} giao dịch`} />
                  <Info label="Đang chờ" value={`${dashboardData.payments.partner_pending_count} giao dịch`} />
                  <Info label="Lỗi/không hợp lệ" value={`${dashboardData.payments.partner_failed_count} giao dịch`} />
                </div>
              </div>
            </section>

            <section className="panel">
              <div className="sectionHeader">
                <div>
                  <h2>Quét AI 14 ngày</h2>
                  <p>Số lượt quét được ghi nhận theo ngày.</p>
                </div>
                <TrendingUp size={22} />
              </div>
              <div className="lineChart" aria-label="Biểu đồ đường lượt quét 14 ngày">
                <svg className="lineChartSvg" viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img">
                  <title>Biểu đồ đường lượt quét AI 14 ngày</title>
                  {chartGridLines.map((y) => (
                    <line className="lineChartGrid" key={y} x1={chartPaddingX} x2={chartWidth - chartPaddingX} y1={y} y2={y} />
                  ))}
                  {chartAreaPoints && <polygon className="lineChartArea" points={chartAreaPoints} />}
                  {chartLinePoints && <polyline className="lineChartLine" points={chartLinePoints} />}
                  {chartPoints.map((point) => (
                    <g key={point.date}>
                      <circle className={`lineChartPoint ${point.scans > 0 ? 'active' : ''}`} cx={point.x} cy={point.y} r={5} />
                      <text className="lineChartValue" x={point.x} y={Math.max(point.y - 12, 16)}>
                        {point.scans}
                      </text>
                    </g>
                  ))}
                </svg>
                <div className="lineChartLabels">
                  {scanSeries.map((item) => (
                    <span key={item.date}>{item.date.slice(5)}</span>
                  ))}
                </div>
              </div>
            </section>
          </div>

          <div className="insightGrid">
            <section className="panel">
              <div className="sectionHeader">
                <div>
                  <h2>Bệnh được quét nhiều</h2>
                  <p>Top nhãn bệnh xuất hiện trong lịch sử quét.</p>
                </div>
                <Leaf size={22} />
              </div>
              <RankList
                empty="Chưa có lịch sử quét."
                rows={dashboardData.top_diseases.map((item) => ({
                  key: item.disease_key,
                  title: item.disease_name || item.disease_key,
                  meta: item.avg_confidence == null ? item.disease_key : `${item.disease_key} · Trung bình ${item.avg_confidence}%`,
                  value: `${item.scans} lượt quét`,
                }))}
              />
            </section>

            <section className="panel">
              <div className="sectionHeader">
                <div>
                  <h2>Sản phẩm có tương tác</h2>
                  <p>Xếp hạng theo lượt hiển thị và lượt nhấp trong chợ sản phẩm.</p>
                </div>
                <Store size={22} />
              </div>
              <RankList
                empty="Chưa có lượt hiển thị sản phẩm."
                rows={dashboardData.top_products.map((item) => ({
                  key: String(item.product_id),
                  title: item.product_name,
                  meta: item.partner_name || 'Chưa rõ đối tác',
                  value: `${item.impressions} lượt xem · ${item.clicks} lượt nhấp · ${item.click_rate}%`,
                }))}
              />
            </section>

            <section className="panel widePanel">
              <div className="sectionHeader">
                <div>
                  <h2>Giao dịch gần đây</h2>
                  <p>Theo dõi nhanh các thanh toán gói người dùng và gói đại lý.</p>
                </div>
                <CircleDollarSign size={22} />
              </div>
              <TransactionList rows={dashboardData.recent_transactions} />
            </section>
          </div>
        </>
      )}

      <div className="quickGrid">
        <button className="quickCard" onClick={() => onNavigate('partners')}>
          <Building2 size={26} />
          <span>Duyệt hồ sơ đại lý</span>
          <strong>{partners.length} đang chờ</strong>
        </button>
        <button className="quickCard" onClick={() => onNavigate('products')}>
          <PackageCheck size={26} />
          <span>Duyệt sản phẩm</span>
          <strong>{products.length} đang chờ</strong>
        </button>
        <button className="quickCard" onClick={() => onNavigate('care-tips')}>
          <Leaf size={26} />
          <span>Quản lý mẹo chăm sóc</span>
          <strong>{careTips.length} đang có</strong>
        </button>
      </div>
    </div>
  );
}

function BreakdownCard({
  icon: Icon,
  title,
  total,
  rows,
}: {
  icon: IconComponent;
  title: string;
  total: number | string;
  rows: Array<[string, number | string]>;
}) {
  return (
    <section className="breakdownCard">
      <div className="breakdownHead">
        <Icon size={19} />
        <span>{title}</span>
        <strong>{metricValue(total)}</strong>
      </div>
      <div className="breakdownRows">
        {rows.map(([label, value]) => (
          <div className="breakdownRow" key={label}>
            <span>{label}</span>
            <b>{metricValue(value)}</b>
          </div>
        ))}
      </div>
    </section>
  );
}

function RankList({
  rows,
  empty,
}: {
  rows: Array<{ key: string; title: string; meta: string; value: string }>;
  empty: string;
}) {
  if (!rows.length) return <p className="muted">{empty}</p>;
  return (
    <div className="rankList">
      {rows.map((row, index) => (
        <div className="rankRow" key={row.key}>
          <span className="rankNumber">{index + 1}</span>
          <div>
            <strong>{row.title}</strong>
            <small>{row.meta}</small>
          </div>
          <b>{row.value}</b>
        </div>
      ))}
    </div>
  );
}

function TransactionList({
  rows,
}: {
  rows: AdminDashboardData['recent_transactions'];
}) {
  if (!rows.length) return <p className="muted">Chưa có giao dịch thanh toán.</p>;
  return (
    <div className="transactionList">
      {rows.map((row) => (
        <div className="transactionRow" key={`${row.kind}-${row.id}`}>
          <div>
            <strong>{row.owner_name}</strong>
            <small>
              {transactionKindLabel(row.kind)} · {planLabel(row.plan_label)} · {dateLabel(row.created_at)}
            </small>
          </div>
          <b>{money(row.amount_vnd)}</b>
          <span className={statusPillClass(row.status)}>{statusLabel(row.status)}</span>
        </div>
      ))}
    </div>
  );
}

type PaginationItem = number | 'left-ellipsis' | 'right-ellipsis';

function compactPageItems(page: number, pageCount: number): PaginationItem[] {
  if (pageCount <= 9) return Array.from({ length: pageCount }, (_, index) => index + 1);

  const leftSibling = Math.max(page - 1, 2);
  const rightSibling = Math.min(page + 1, pageCount - 1);
  const showLeftEllipsis = leftSibling > 3;
  const showRightEllipsis = rightSibling < pageCount - 2;

  if (!showLeftEllipsis && showRightEllipsis) {
    return [1, 2, 3, 4, 5, 'right-ellipsis', pageCount];
  }

  if (showLeftEllipsis && !showRightEllipsis) {
    return [1, 'left-ellipsis', pageCount - 4, pageCount - 3, pageCount - 2, pageCount - 1, pageCount];
  }

  return [1, 'left-ellipsis', leftSibling, page, rightSibling, 'right-ellipsis', pageCount];
}

function Pagination({
  page,
  pageCount,
  total,
  start,
  end,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  total: number;
  start: number;
  end: number;
  onPageChange: (page: number) => void;
}) {
  if (total === 0) return null;
  const pages = compactPageItems(page, pageCount);
  return (
    <div className="pagination">
      <span className="paginationSummary">
        Hiển thị {start}-{end} / {total}
        <small>Trang {page} / {pageCount}</small>
      </span>
      <div className="paginationButtons">
        <button type="button" className="pageNav" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Trước
        </button>
        {pages.map((item) =>
          typeof item === 'number' ? (
            <button
              key={item}
              type="button"
              aria-current={item === page ? 'page' : undefined}
              className={item === page ? 'active' : ''}
              onClick={() => onPageChange(item)}
            >
              {item}
            </button>
          ) : (
            <span key={item} className="paginationEllipsis">
              ...
            </span>
          )
        )}
        <button type="button" className="pageNav" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>
          Sau
        </button>
      </div>
    </div>
  );
}

function AssetImage({ src, alt, icon: Icon }: { src: string | null | undefined; alt: string; icon: IconComponent }) {
  const [failed, setFailed] = useState(false);
  const url = toAssetUrl(src || null);

  if (!url || failed) {
    return (
      <div className="assetPlaceholder" aria-label={alt}>
        <Icon size={30} />
        <span>{alt}</span>
      </div>
    );
  }

  return <img src={url} alt={alt} onError={() => setFailed(true)} />;
}

function PartnersPage({
  partners,
  loading,
  quickSearch,
  onAction,
}: {
  partners: PartnerStore[];
  loading: boolean;
  quickSearch: string;
  onAction: (partner: PartnerStore, status: 'active' | 'rejected') => void;
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending_review');
  const [areaFilter, setAreaFilter] = useState('all');
  const [page, setPage] = useState(1);
  const query = `${quickSearch} ${search}`.trim().toLowerCase();
  const areaOptions = Array.from(new Set(partners.map((partner) => partner.service_area).filter(Boolean) as string[]));
  const filteredPartners = partners.filter((partner) => {
    const matchesSearch =
      !query ||
      [
        partner.store_name,
        partner.company_name,
        partner.contact_email,
        partner.phone,
        partner.address,
        partner.service_area,
        partner.main_products,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query);
    const matchesStatus = statusFilter === 'all' || partner.status === statusFilter;
    const matchesArea = areaFilter === 'all' || partner.service_area === areaFilter;
    return matchesSearch && matchesStatus && matchesArea;
  });
  const pagination = paginateRows(filteredPartners, page);

  useEffect(() => {
    setPage(1);
  }, [quickSearch, search, statusFilter, areaFilter, partners.length]);

  return (
    <div className="listPage">
      <section className="filterPanel">
        <label className="filterSearch">
          <Search size={18} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm kiếm đại lý..." />
        </label>
        <label className="filterSelect">
          <span>Trạng thái</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">Tất cả trạng thái</option>
            <option value="pending_review">Chờ duyệt</option>
            <option value="active">Đang hoạt động</option>
            <option value="rejected">Từ chối</option>
          </select>
        </label>
        <label className="filterSelect">
          <span>Khu vực</span>
          <select value={areaFilter} onChange={(event) => setAreaFilter(event.target.value)}>
            <option value="all">Tất cả khu vực</option>
            {areaOptions.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>
        </label>
        <div className="filterMetric">
          <Clock size={19} />
          <span>Hồ sơ chờ duyệt</span>
          <strong>{partners.length}</strong>
        </div>
      </section>

      {filteredPartners.length === 0 ? (
        <EmptyState title="Không có hồ sơ đại lý phù hợp" />
      ) : (
        <div className="reviewGrid">
          {pagination.rows.map((partner) => (
            <article className="reviewCard partnerReview" key={partner.id}>
          <div className="mediaStrip">
            <AssetImage src={partner.cover_url} alt={partner.store_name || partner.company_name} icon={Store} />
          </div>
          <div className="cardBody">
            <div className="cardHeader">
              <div>
                <h2>{partner.store_name || partner.company_name}</h2>
                <p>{partner.company_name}</p>
              </div>
              <span className={statusPillClass(partner.status)}>{statusLabel(partner.status)}</span>
            </div>

            <dl className="infoGrid">
              <Info label="Email" value={partner.contact_email} />
              <Info label="Điện thoại" value={partner.phone} />
              <Info label="Địa chỉ" value={partner.address || 'Chưa có địa chỉ'} />
              <Info label="Đại diện" value={partner.representative_name || 'Chưa có'} />
              <Info label="Khu vực" value={partner.service_area || 'Chưa có'} />
              <Info label="Nhóm sản phẩm" value={asList(partner.product_categories)} />
              <Info label="Sản phẩm chính" value={partner.main_products || 'Chưa có'} wide />
              <Info label="Ngày gửi" value={dateLabel(partner.created_at)} />
            </dl>

            <div className="listCardActions">
              {partner.business_license_file_url && (
                <a href={toAssetUrl(partner.business_license_file_url) || '#'} target="_blank" rel="noreferrer">
                  <FileText size={16} />
                  Giấy phép
                </a>
              )}
              {partner.website_url && (
                <a href={partner.website_url} target="_blank" rel="noreferrer">
                  <ExternalLink size={16} />
                  Website
                </a>
              )}
              {partner.contact_url && (
                <a href={partner.contact_url} target="_blank" rel="noreferrer">
                  <ExternalLink size={16} />
                  Liên hệ
                </a>
              )}
            </div>

            <ActionRow
              disabled={loading}
              approveLabel="Duyệt đại lý"
              rejectLabel="Từ chối"
              onApprove={() => onAction(partner, 'active')}
              onReject={() => onAction(partner, 'rejected')}
            />
          </div>
            </article>
          ))}
        </div>
      )}

      <Pagination
        page={pagination.page}
        pageCount={pagination.pageCount}
        total={filteredPartners.length}
        start={pagination.start}
        end={pagination.end}
        onPageChange={setPage}
      />
    </div>
  );
}

function ProductsPage({
  products,
  loading,
  quickSearch,
  onAction,
}: {
  products: PartnerProduct[];
  loading: boolean;
  quickSearch: string;
  onAction: (product: PartnerProduct, status: 'approved' | 'rejected') => void;
}) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const query = `${quickSearch} ${search}`.trim().toLowerCase();
  const categoryOptions = Array.from(new Set(products.flatMap((product) => product.target_categories || []).filter(Boolean)));
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      !query ||
      [
        product.name,
        product.partner_name,
        product.description,
        product.price_range,
        ...(product.target_diseases || []),
        ...(product.target_categories || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query);
    const matchesCategory = categoryFilter === 'all' || (product.target_categories || []).includes(categoryFilter);
    const matchesStatus = statusFilter === 'all' || product.moderation_status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });
  const pagination = paginateRows(filteredProducts, page);

  useEffect(() => {
    setPage(1);
  }, [quickSearch, search, categoryFilter, statusFilter, products.length]);

  return (
    <div className="listPage">
      <section className="filterPanel productFilters">
        <label className="filterSearch">
          <Search size={18} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm kiếm sản phẩm..." />
        </label>
        <label className="filterSelect">
          <span>Danh mục</span>
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            <option value="all">Tất cả danh mục</option>
            {categoryOptions.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label className="filterSelect">
          <span>Trạng thái</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">Tất cả trạng thái</option>
            <option value="pending_review">Chờ duyệt</option>
            <option value="approved">Đã duyệt</option>
            <option value="rejected">Từ chối</option>
          </select>
        </label>
        <div className="filterMetric warning">
          <Clock size={19} />
          <span>Chờ duyệt</span>
          <strong>{products.filter((product) => product.moderation_status === 'pending_review').length}</strong>
        </div>
        <div className="filterMetric success">
          <Check size={19} />
          <span>Đã duyệt</span>
          <strong>{products.filter((product) => product.moderation_status === 'approved').length}</strong>
        </div>
        <div className="filterMetric info">
          <PackageCheck size={19} />
          <span>Đang bật</span>
          <strong>{products.filter((product) => product.is_active).length}</strong>
        </div>
      </section>

      {filteredProducts.length === 0 ? (
        <EmptyState title="Không có sản phẩm phù hợp" />
      ) : (
        <div className="reviewGrid">
          {pagination.rows.map((product) => (
            <article className="reviewCard product" key={product.id}>
          <div className="productImage">
            <AssetImage src={product.image_url} alt={product.name} icon={PackageCheck} />
          </div>
          <div className="cardBody">
            <div className="cardHeader">
              <div>
                <h2>{product.name}</h2>
                <p>{product.partner_name || `Đối tác #${product.partner_id}`}</p>
              </div>
              <span className={statusPillClass(product.moderation_status)}>{statusLabel(product.moderation_status)}</span>
            </div>

            <p className="description">{product.description || 'Chưa có mô tả sản phẩm.'}</p>

            <dl className="infoGrid">
              <Info label="Giá" value={currency(product.price_range)} />
              <Info label="Bệnh mục tiêu" value={asList(product.target_diseases)} />
              <Info label="Danh mục" value={asList(product.target_categories)} />
              <Info label="Trạng thái đại lý" value={statusLabel(product.partner_status)} />
              <Info label="Ngày gửi" value={dateLabel(product.created_at)} />
            </dl>

            <div className="listCardActions productActions">
              {product.product_url && (
                <a href={product.product_url} target="_blank" rel="noreferrer">
                  <ExternalLink size={16} />
                  Link sản phẩm
                </a>
              )}
            </div>

            <ActionRow
              disabled={loading}
              approveLabel="Duyệt sản phẩm"
              rejectLabel="Từ chối"
              onApprove={() => onAction(product, 'approved')}
              onReject={() => onAction(product, 'rejected')}
            />
          </div>
            </article>
          ))}
        </div>
      )}

      <Pagination
        page={pagination.page}
        pageCount={pagination.pageCount}
        total={filteredProducts.length}
        start={pagination.start}
        end={pagination.end}
        onPageChange={setPage}
      />
    </div>
  );
}

function emptyPaginated<T>(): PaginatedData<T> {
  return { items: [], total: 0, page: 1, page_size: PAGE_SIZE, page_count: 1 };
}

function serverRange<T>(data: PaginatedData<T>) {
  return {
    start: data.total ? (data.page - 1) * data.page_size + 1 : 0,
    end: Math.min(data.page * data.page_size, data.total),
  };
}

function UsersPage({
  token,
  quickSearch,
  onMessage,
}: {
  token: string;
  quickSearch: string;
  onMessage: (message: string | null) => void;
}) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PaginatedData<AdminUserItem>>(() => emptyPaginated<AdminUserItem>());
  const query = `${quickSearch} ${search}`.trim();

  const load = async () => {
    setLoading(true);
    try {
      const rows = await listAdminUsers(token, { q: query, role: roleFilter, status: statusFilter, page, pageSize: 10 });
      setData(rows);
    } catch (error) {
      onMessage((error as Error).message || 'Không tải được người dùng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token, query, roleFilter, statusFilter, page]);

  useEffect(() => {
    setPage(1);
  }, [query, roleFilter, statusFilter]);

  const changeStatus = async (user: AdminUserItem) => {
    const nextStatus = user.status === 'suspended' ? 'active' : 'suspended';
    setLoading(true);
    try {
      await updateAdminUserStatus(token, user.id, nextStatus);
      onMessage(nextStatus === 'suspended' ? 'Đã tạm khóa tài khoản.' : 'Đã mở khóa tài khoản.');
      await load();
    } catch (error) {
      onMessage((error as Error).message || 'Không cập nhật được người dùng.');
    } finally {
      setLoading(false);
    }
  };
  const range = serverRange(data);

  return (
    <div className="listPage">
      <section className="filterPanel">
        <label className="filterSearch">
          <Search size={18} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm kiếm người dùng..." />
        </label>
        <label className="filterSelect">
          <span>Vai trò</span>
          <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
            <option value="all">Tất cả vai trò</option>
            <option value="farmer">Nông dân</option>
            <option value="partner">Đối tác</option>
            <option value="admin">Quản trị viên</option>
          </select>
        </label>
        <label className="filterSelect">
          <span>Trạng thái</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="suspended">Tạm khóa</option>
          </select>
        </label>
        <div className="filterMetric">
          <Users size={19} />
          <span>Tổng người dùng</span>
          <strong>{numberLabel(data.total)}</strong>
        </div>
      </section>

      <section className="panel adminListPanel">
        {loading && !data.items.length ? (
          <EmptyState title="Đang tải người dùng..." />
        ) : data.items.length === 0 ? (
          <EmptyState title="Không có người dùng phù hợp" />
        ) : (
          <div className="adminTable">
            <div className="adminTableHead userGrid">
              <span>Người dùng</span>
              <span>Vai trò</span>
              <span>Vườn/Quét</span>
              <span>Ngày tạo</span>
              <span>Thao tác</span>
            </div>
            {data.items.map((user) => (
              <div className="adminTableRow userGrid" key={user.id}>
                <div>
                  <strong>{user.name}</strong>
                  <small>{user.email}{user.phone ? ` · ${user.phone}` : ''}</small>
                </div>
                <div>
                  <span className={statusPillClass(user.role)}>{user.role}</span>
                  <small>{statusLabel(user.status)}</small>
                </div>
                <div>
                  <b>{user.plant_count}</b> cây · <b>{user.scan_count}</b> lượt quét
                </div>
                <span>{dateLabel(user.created_at)}</span>
                <button className={user.status === 'suspended' ? 'approveButton compactButton' : 'rejectButton compactButton'} type="button" disabled={loading} onClick={() => changeStatus(user)}>
                  {user.status === 'suspended' ? 'Mở khóa' : 'Tạm khóa'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
      <Pagination page={data.page} pageCount={data.page_count} total={data.total} start={range.start} end={range.end} onPageChange={setPage} />
    </div>
  );
}

function PaymentsPage({
  token,
  quickSearch,
  onMessage,
}: {
  token: string;
  quickSearch: string;
  onMessage: (message: string | null) => void;
}) {
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [period, setPeriod] = useState<'daily' | 'monthly'>('daily');
  const [startDate, setStartDate] = useState(() => dateInputValue(-29));
  const [endDate, setEndDate] = useState(() => dateInputValue());
  const [partnerFilter, setPartnerFilter] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);
  const [refundingId, setRefundingId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [data, setData] = useState<PaginatedData<AdminPaymentItem>>(() => emptyPaginated<AdminPaymentItem>());
  const [report, setReport] = useState<AdminRevenueReportData | null>(null);
  const query = `${quickSearch} ${search}`.trim();
  const selectedPartnerId = partnerFilter ? Number(partnerFilter) : null;
  const reportKind = selectedPartnerId ? 'partner' : kindFilter;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listAdminPayments(token, { q: query, kind: kindFilter, status: statusFilter, startDate, endDate, page, pageSize: 10 })
      .then((rows) => {
        if (!cancelled) setData(rows);
      })
      .catch((error) => onMessage((error as Error).message || 'Không tải được thanh toán.'))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, query, kindFilter, statusFilter, startDate, endDate, page, reloadKey]);

  useEffect(() => {
    let cancelled = false;
    setReportLoading(true);
    getAdminRevenueReport(token, { startDate, endDate, period, kind: reportKind, partnerId: selectedPartnerId })
      .then((nextReport) => {
        if (!cancelled) setReport(nextReport);
      })
      .catch((error) => onMessage((error as Error).message || 'Không tải được báo cáo doanh thu.'))
      .finally(() => {
        if (!cancelled) setReportLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, startDate, endDate, period, reportKind, selectedPartnerId, reloadKey]);

  useEffect(() => {
    setPage(1);
  }, [query, kindFilter, statusFilter, startDate, endDate]);

  const exportReport = async (format: 'excel' | 'pdf') => {
    setExporting(format);
    try {
      await exportAdminRevenueReport(token, { format, startDate, endDate, period, kind: reportKind, partnerId: selectedPartnerId });
      onMessage(format === 'pdf' ? 'Đã xuất PDF báo cáo doanh thu.' : 'Đã xuất Excel/CSV báo cáo doanh thu.');
    } catch (error) {
      onMessage((error as Error).message || 'Không xuất được báo cáo.');
    } finally {
      setExporting(null);
    }
  };

  const refundPayment = async (payment: AdminPaymentItem) => {
    const reason = window.prompt(`Lý do hoàn tiền cho giao dịch ${payment.txn_ref}?`, 'Admin ghi nhận hoàn tiền thủ công.');
    if (reason === null) return;
    setRefundingId(`${payment.kind}-${payment.id}`);
    try {
      await refundAdminPayment(token, payment, reason);
      onMessage('Đã ghi nhận hoàn tiền và cập nhật quyền gói liên quan.');
      setReloadKey((value) => value + 1);
    } catch (error) {
      onMessage((error as Error).message || 'Không hoàn tiền được giao dịch.');
    } finally {
      setRefundingId(null);
    }
  };

  const range = serverRange(data);
  const partnerOptions = report?.partner_reports || [];
  const payerReports = report?.payer_reports || [];
  const reportMax = Math.max(...(report?.series || []).map((item) => Math.max(item.gross_vnd, item.net_vnd, item.refunded_vnd)), 1);
  const barWidth = 30;
  const barGap = 18;
  const chartHeight = 220;
  const chartPadding = 28;
  const chartWidth = Math.max(620, (report?.series.length || 1) * (barWidth + barGap) + chartPadding * 2);

  return (
    <div className="listPage">
      <section className="filterPanel revenueFilters">
        <label className="filterSearch">
          <Search size={18} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm giao dịch, email, mã đơn..." />
        </label>
        <label className="filterSelect">
          <span>Loại</span>
          <select
            value={kindFilter}
            onChange={(event) => {
              setKindFilter(event.target.value);
              if (event.target.value === 'user') setPartnerFilter('');
            }}
          >
            <option value="all">Tất cả</option>
            <option value="user">Gói người dùng</option>
            <option value="partner">Gói đại lý</option>
          </select>
        </label>
        <label className="filterSelect">
          <span>Trạng thái</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">Tất cả trạng thái</option>
            <option value="pending">Đang chờ</option>
            <option value="success">Thành công</option>
            <option value="failed">Thất bại</option>
            <option value="invalid">Không hợp lệ</option>
            <option value="refunded">Đã hoàn tiền</option>
          </select>
        </label>
        <label className="filterSelect">
          <span>Từ ngày</span>
          <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
        </label>
        <label className="filterSelect">
          <span>Đến ngày</span>
          <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
        </label>
        <label className="filterSelect">
          <span>Biểu đồ</span>
          <select value={period} onChange={(event) => setPeriod(event.target.value as 'daily' | 'monthly')}>
            <option value="daily">Theo ngày</option>
            <option value="monthly">Theo tháng</option>
          </select>
        </label>
        <label className="filterSelect">
          <span>Lọc gói đại lý</span>
          <select value={partnerFilter} onChange={(event) => setPartnerFilter(event.target.value)}>
            <option value="">Tất cả nguồn đại lý</option>
            {partnerOptions.map((partner) => (
              <option key={partner.partner_id} value={partner.partner_id}>
                {partner.partner_name}
              </option>
            ))}
          </select>
        </label>
        <div className="filterMetric">
          <CircleDollarSign size={19} />
          <span>Giao dịch</span>
          <strong>{numberLabel(data.total)}</strong>
        </div>
      </section>

      <div className="revenueReportGrid">
        <section className="panel revenueSummaryPanel">
          <div className="sectionHeader">
            <div>
              <h2>Doanh thu hệ thống</h2>
              <p>{report ? `${report.start_date} - ${report.end_date} · Doanh thu thuộc LeafScan` : 'Đang tải dữ liệu doanh thu.'}</p>
            </div>
            <CircleDollarSign size={22} />
          </div>
          <div className="revenueKpis">
            <Info label="Doanh thu LeafScan gộp" value={money(report?.gross_success_vnd || 0)} />
            <Info label="Phí VNPAY ước tính" value={`${money(report?.vnpay_fee_vnd || 0)} (${report?.fee_percent || 0}% + ${money(report?.fee_fixed_vnd || 0)}/GD)`} />
            <Info label="Doanh thu LeafScan ròng" value={money(report?.net_revenue_vnd || 0)} />
            <Info label="Đã hoàn tiền" value={`${money(report?.refunded_vnd || 0)} / ${report?.refunded_count || 0} GD`} />
            <Info label="Gói người dùng" value={`${money(report?.user_success_vnd || 0)} / ${report?.user_success_count || 0} GD thành công`} />
            <Info label="Gói đại lý" value={`${money(report?.partner_success_vnd || 0)} / ${report?.partner_success_count || 0} GD thành công`} />
          </div>
          <div className="exportRow">
            <button className="secondaryButton compactButton" disabled={!!exporting || reportLoading} type="button" onClick={() => exportReport('excel')}>
              <Download size={15} />
              {exporting === 'excel' ? 'Đang xuất...' : 'Xuất Excel'}
            </button>
            <button className="secondaryButton compactButton" disabled={!!exporting || reportLoading} type="button" onClick={() => exportReport('pdf')}>
              <FileText size={15} />
              {exporting === 'pdf' ? 'Đang xuất...' : 'Xuất PDF'}
            </button>
          </div>
        </section>

        <section className="panel revenueChartPanel">
          <div className="sectionHeader">
            <div>
              <h2>Biểu đồ doanh thu {period === 'monthly' ? 'theo tháng' : 'theo ngày'}</h2>
              <p>So sánh tiền thu vào hệ thống, doanh thu ròng và khoản hoàn tiền.</p>
            </div>
            <TrendingUp size={22} />
          </div>
          <div className="barChart" aria-label="Biểu đồ doanh thu">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img">
              <title>Biểu đồ doanh thu</title>
              {(report?.series || []).map((item, index) => {
                const x = chartPadding + index * (barWidth + barGap);
                const grossHeight = Math.max(2, (item.gross_vnd / reportMax) * 142);
                const netHeight = Math.max(2, (item.net_vnd / reportMax) * 142);
                const refundHeight = item.refunded_vnd ? Math.max(2, (item.refunded_vnd / reportMax) * 142) : 0;
                const baseY = 164;
                return (
                  <g key={item.period}>
                    <rect className="barGross" x={x} y={baseY - grossHeight} width={9} height={grossHeight} rx={3} />
                    <rect className="barNet" x={x + 11} y={baseY - netHeight} width={9} height={netHeight} rx={3} />
                    {refundHeight > 0 && <rect className="barRefund" x={x + 22} y={baseY - refundHeight} width={8} height={refundHeight} rx={3} />}
                    <text className="barLabel" x={x + 15} y={190} textAnchor="middle">{item.period.slice(period === 'monthly' ? 2 : 5)}</text>
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="chartLegend">
            <span><i className="legendGross" /> Gộp</span>
            <span><i className="legendNet" /> Ròng</span>
            <span><i className="legendRefund" /> Hoàn tiền</span>
          </div>
        </section>
      </div>

      <section className="panel adminListPanel partnerRevenuePanel">
        <div className="tableSectionTitle">
          <div>
            <h2>Người/đơn vị đã thanh toán</h2>
            <p>Thống kê ai đã trả tiền cho LeafScan. Với gói đại lý, đây là phí sử dụng nền tảng, không phải doanh thu bán hàng của chủ đại lý.</p>
          </div>
        </div>
        {!payerReports.length ? (
          <EmptyState title="Chưa có người thanh toán trong khoảng này" />
        ) : (
          <div className="adminTable">
            <div className="adminTableHead partnerRevenueGridRow">
              <span>Người thanh toán</span>
              <span>Doanh thu LeafScan</span>
              <span>Phí</span>
              <span>Ròng</span>
              <span>Hoàn tiền</span>
              <span>Giao dịch</span>
            </div>
            {payerReports.map((payer) => (
              <div className="adminTableRow partnerRevenueGridRow" key={`${payer.kind}-${payer.owner_id}`}>
                <div>
                  <strong>{payer.owner_name}</strong>
                  <small>{transactionKindLabel(payer.kind)}{payer.owner_email ? ` · ${payer.owner_email}` : ` #${payer.owner_id}`}</small>
                </div>
                <b>{money(payer.gross_vnd)}</b>
                <span>{money(payer.fee_vnd)}</span>
                <b>{money(payer.net_vnd)}</b>
                <span>{money(payer.refunded_vnd)}</span>
                <div>
                  <strong>{numberLabel(payer.transaction_count)}</strong>
                  <small>{payer.last_paid_at ? `Cuối: ${dateLabel(payer.last_paid_at)}` : 'Chưa thanh toán'}</small>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel adminListPanel">
        <div className="tableSectionTitle">
          <div>
            <h2>Chi tiết giao dịch thanh toán</h2>
            <p>Danh sách từng giao dịch để kiểm tra người trả tiền, mã đơn và trạng thái xử lý.</p>
          </div>
        </div>
        {loading && !data.items.length ? (
          <EmptyState title="Đang tải giao dịch..." />
        ) : data.items.length === 0 ? (
          <EmptyState title="Không có giao dịch phù hợp" />
        ) : (
          <div className="adminTable">
            <div className="adminTableHead paymentGridRow">
              <span>Người thanh toán</span>
              <span>Gói/Mã</span>
              <span>Tiền vào hệ thống</span>
              <span>Trạng thái</span>
              <span>Thời gian</span>
              <span>Thao tác</span>
            </div>
            {data.items.map((payment) => (
              <div className="adminTableRow paymentGridRow" key={`${payment.kind}-${payment.id}`}>
                <div>
                  <strong>{payment.owner_name}</strong>
                  <small>{transactionKindLabel(payment.kind)}{payment.owner_email ? ` · ${payment.owner_email}` : ''}</small>
                </div>
                <div>
                  <strong>{planLabel(payment.plan_label)}</strong>
                  <small>{payment.txn_ref}</small>
                </div>
                <b>{money(payment.amount_vnd)}</b>
                <span className={statusPillClass(payment.status)}>{statusLabel(payment.status)}</span>
                <div>
                  <span>{dateLabel(payment.created_at)}</span>
                  <small>{payment.paid_at ? `Thanh toán ${dateLabel(payment.paid_at)}` : 'Chưa thanh toán'}</small>
                </div>
                <button
                  className="secondaryButton compactButton"
                  disabled={payment.status !== 'success' || refundingId === `${payment.kind}-${payment.id}`}
                  type="button"
                  onClick={() => refundPayment(payment)}
                >
                  <RotateCcw size={15} />
                  {refundingId === `${payment.kind}-${payment.id}` ? 'Đang hoàn...' : 'Hoàn tiền'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
      <Pagination page={data.page} pageCount={data.page_count} total={data.total} start={range.start} end={range.end} onPageChange={setPage} />
    </div>
  );
}

function ScansPage({
  token,
  quickSearch,
  onMessage,
}: {
  token: string;
  quickSearch: string;
  onMessage: (message: string | null) => void;
}) {
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PaginatedData<AdminScanItem>>(() => emptyPaginated<AdminScanItem>());
  const query = `${quickSearch} ${search}`.trim();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listAdminScans(token, { q: query, severity: severityFilter, page, pageSize: 10 })
      .then((rows) => {
        if (!cancelled) setData(rows);
      })
      .catch((error) => onMessage((error as Error).message || 'Không tải được lịch sử quét.'))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, query, severityFilter, page]);

  useEffect(() => {
    setPage(1);
  }, [query, severityFilter]);
  const range = serverRange(data);

  return (
    <div className="listPage">
      <section className="filterPanel">
        <label className="filterSearch">
          <Search size={18} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm người dùng, cây, bệnh..." />
        </label>
        <label className="filterSelect">
          <span>Mức độ</span>
          <select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value)}>
            <option value="all">Tất cả mức độ</option>
            <option value="healthy">Khỏe mạnh</option>
            <option value="moderate">Trung bình</option>
            <option value="severe">Nặng</option>
          </select>
        </label>
        <div className="filterMetric">
          <BarChart3 size={19} />
          <span>Lượt quét</span>
          <strong>{numberLabel(data.total)}</strong>
        </div>
      </section>

      <section className="panel adminListPanel">
        {loading && !data.items.length ? (
          <EmptyState title="Đang tải lịch sử quét..." />
        ) : data.items.length === 0 ? (
          <EmptyState title="Không có lượt quét phù hợp" />
        ) : (
          <div className="adminTable">
            <div className="adminTableHead scanGridRow">
              <span>Ảnh</span>
              <span>Người dùng / cây</span>
              <span>Kết quả</span>
              <span>Độ tin cậy</span>
              <span>Thời gian</span>
            </div>
            {data.items.map((scan) => (
              <div className="adminTableRow scanGridRow" key={scan.id}>
                <div className="scanThumb">
                  <AssetImage src={scan.image_url} alt={`Scan #${scan.id}`} icon={Leaf} />
                </div>
                <div>
                  <strong>{scan.user_name || 'Không rõ người dùng'}</strong>
                  <small>{scan.user_email || 'Không có email'} · {scan.plant_name || 'Không gắn cây'}</small>
                </div>
                <div>
                  <strong>{scan.disease_name || scan.disease_key || 'Không xác định'}</strong>
                  <small>Stage {scan.predicted_stage} · 7 ngày {scan.forecast_stage_7d}</small>
                </div>
                <b>{scan.confidence.toFixed(1)}%</b>
                <span>{dateLabel(scan.scan_date)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
      <Pagination page={data.page} pageCount={data.page_count} total={data.total} start={range.start} end={range.end} onPageChange={setPage} />
    </div>
  );
}

type DiseaseFormState = {
  diseaseKey: string;
  modelClassName: string;
  name: string;
  severity: string;
  description: string;
  symptoms: string;
  treatment: string;
  prevention: string;
  affectedAreaTypical: string;
  imageUrl: string;
};

const EMPTY_DISEASE_FORM: DiseaseFormState = {
  diseaseKey: '',
  modelClassName: '',
  name: '',
  severity: 'moderate',
  description: '',
  symptoms: '',
  treatment: '',
  prevention: '',
  affectedAreaTypical: '0',
  imageUrl: '',
};

function linesToList(value: string) {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function listToLines(values: string[]) {
  return values.join('\n');
}

function diseaseToForm(disease: AdminDiseaseItem): DiseaseFormState {
  return {
    diseaseKey: disease.disease_key || '',
    modelClassName: disease.model_class_name || '',
    name: disease.name || '',
    severity: disease.severity || 'moderate',
    description: disease.description || '',
    symptoms: listToLines(disease.symptoms || []),
    treatment: listToLines(disease.treatment || []),
    prevention: listToLines(disease.prevention || []),
    affectedAreaTypical: String(disease.affected_area_typical || 0),
    imageUrl: disease.image_url || '',
  };
}

function diseaseFormToPayload(form: DiseaseFormState): AdminDiseasePayload {
  return {
    disease_key: form.diseaseKey.trim(),
    model_class_name: nullableText(form.modelClassName),
    name: form.name.trim(),
    severity: nullableText(form.severity),
    description: nullableText(form.description),
    symptoms: linesToList(form.symptoms),
    treatment: linesToList(form.treatment),
    prevention: linesToList(form.prevention),
    affected_area_typical: Number(form.affectedAreaTypical) || 0,
    image_url: nullableText(form.imageUrl),
  };
}

function DiseasesPage({
  token,
  quickSearch,
  onMessage,
  onRefreshDashboard,
}: {
  token: string;
  quickSearch: string;
  onMessage: (message: string | null) => void;
  onRefreshDashboard: () => void;
}) {
  const [rows, setRows] = useState<AdminDiseaseItem[]>([]);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [editingId, setEditingId] = useState<number | undefined>();
  const [form, setForm] = useState<DiseaseFormState>(EMPTY_DISEASE_FORM);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const query = `${quickSearch} ${search}`.trim();

  const load = async () => {
    setLoading(true);
    try {
      const nextRows = await listAdminDiseases(token, { q: query });
      setRows(nextRows);
    } catch (error) {
      onMessage((error as Error).message || 'Không tải được bệnh cây.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token, query]);

  useEffect(() => {
    setPage(1);
  }, [query, severityFilter, rows.length]);

  const filteredRows = rows.filter((row) => severityFilter === 'all' || row.severity === severityFilter);
  const pagination = paginateRows(filteredRows, page, 8);

  const resetForm = () => {
    setEditingId(undefined);
    setForm(EMPTY_DISEASE_FORM);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const payload = diseaseFormToPayload(form);
      const saved = editingId
        ? await updateAdminDisease(token, editingId, payload)
        : await createAdminDisease(token, payload);
      setRows((items) => {
        const exists = items.some((item) => item.id === saved.id);
        return exists ? items.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...items];
      });
      resetForm();
      onMessage(editingId ? 'Đã cập nhật bệnh cây.' : 'Đã tạo bệnh cây.');
      onRefreshDashboard();
    } catch (error) {
      onMessage((error as Error).message || 'Không lưu được bệnh cây.');
    } finally {
      setLoading(false);
    }
  };

  const edit = (row: AdminDiseaseItem) => {
    setEditingId(row.id);
    setForm(diseaseToForm(row));
  };

  const remove = async (row: AdminDiseaseItem) => {
    if (!window.confirm(`Xóa bệnh "${row.name}"?`)) return;
    setLoading(true);
    try {
      await deleteAdminDisease(token, row.id);
      setRows((items) => items.filter((item) => item.id !== row.id));
      if (editingId === row.id) resetForm();
      onMessage('Đã xóa bệnh cây.');
      onRefreshDashboard();
    } catch (error) {
      onMessage((error as Error).message || 'Không xóa được bệnh cây.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="careTipsLayout">
      <form className="careTipForm" onSubmit={submit}>
        <div className="sectionHeader">
          <div>
            <h2>{editingId ? 'Cập nhật bệnh cây' : 'Tạo bệnh cây'}</h2>
            <p>Thông tin dùng cho thư viện bệnh và kết quả chẩn đoán AI.</p>
          </div>
          {editingId && (
            <button className="ghostLightButton" type="button" onClick={resetForm}>
              Hủy sửa
            </button>
          )}
        </div>

        <div className="formGrid">
          <label>
            Mã bệnh
            <input value={form.diseaseKey} onChange={(event) => setForm({ ...form, diseaseKey: event.target.value })} required placeholder="tomato_early_blight" />
          </label>
          <label>
            Model class
            <input value={form.modelClassName} onChange={(event) => setForm({ ...form, modelClassName: event.target.value })} placeholder="Tomato___Early_blight" />
          </label>
          <label>
            Tên bệnh
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required placeholder="Bệnh mốc sương cà chua" />
          </label>
          <label>
            Mức độ
            <select value={form.severity} onChange={(event) => setForm({ ...form, severity: event.target.value })}>
              <option value="healthy">Khỏe mạnh</option>
              <option value="moderate">Trung bình</option>
              <option value="severe">Nặng</option>
            </select>
          </label>
          <label className="wideInfo">
            Mô tả
            <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={4} />
          </label>
          <label className="wideInfo">
            Triệu chứng
            <textarea value={form.symptoms} onChange={(event) => setForm({ ...form, symptoms: event.target.value })} rows={4} placeholder="Mỗi dòng một triệu chứng" />
          </label>
          <label className="wideInfo">
            Điều trị
            <textarea value={form.treatment} onChange={(event) => setForm({ ...form, treatment: event.target.value })} rows={4} placeholder="Mỗi dòng một hướng xử lý" />
          </label>
          <label className="wideInfo">
            Phòng ngừa
            <textarea value={form.prevention} onChange={(event) => setForm({ ...form, prevention: event.target.value })} rows={4} placeholder="Mỗi dòng một biện pháp" />
          </label>
          <label>
            Diện tích ảnh hưởng %
            <input type="number" min="0" max="100" value={form.affectedAreaTypical} onChange={(event) => setForm({ ...form, affectedAreaTypical: event.target.value })} />
          </label>
          <label>
            URL ảnh
            <input value={form.imageUrl} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} />
          </label>
        </div>

        <button className="primaryButton" type="submit" disabled={loading}>
          <Save size={16} />
          {editingId ? 'Lưu bệnh cây' : 'Tạo bệnh cây'}
        </button>
      </form>

      <section className="careTipListPanel">
        <div className="sectionHeader">
          <div>
            <h2>Danh sách bệnh cây</h2>
            <p>Quản lý nội dung bệnh dùng trong thư viện và kết quả quét.</p>
          </div>
        </div>
        <div className="careTipFilters diseaseFilters">
          <label className="filterSearch">
            <Search size={18} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm bệnh cây..." />
          </label>
          <label className="filterSelect">
            <span>Mức độ</span>
            <select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value)}>
              <option value="all">Tất cả mức độ</option>
              <option value="healthy">Khỏe mạnh</option>
              <option value="moderate">Trung bình</option>
              <option value="severe">Nặng</option>
            </select>
          </label>
        </div>
        {loading && !rows.length ? (
          <EmptyState title="Đang tải bệnh cây..." />
        ) : filteredRows.length === 0 ? (
          <EmptyState title="Không có bệnh cây phù hợp" />
        ) : (
          <div className="careTipList">
            {pagination.rows.map((row) => (
              <article className="careTipRow diseaseRow" key={row.id}>
                <div>
                  <div className="cardHeader compact">
                    <h2>{row.name}</h2>
                    <span className={statusPillClass(row.severity)}>{statusLabel(row.severity)}</span>
                  </div>
                  <p>{row.description || 'Chưa có mô tả.'}</p>
                  <div className="metaLine">
                    <span>{row.disease_key}</span>
                    {row.model_class_name && <span>{row.model_class_name}</span>}
                    <span>{row.symptoms.length} triệu chứng</span>
                  </div>
                </div>
                <div className="rowActions">
                  <button className="secondaryButton" type="button" onClick={() => edit(row)} disabled={loading}>
                    <Pencil size={15} />
                    Sửa
                  </button>
                  <button className="rejectButton" type="button" onClick={() => remove(row)} disabled={loading}>
                    <Trash2 size={15} />
                    Xóa
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
        <Pagination page={pagination.page} pageCount={pagination.pageCount} total={filteredRows.length} start={pagination.start} end={pagination.end} onPageChange={setPage} />
      </section>
    </div>
  );
}

function InquiriesPage({
  token,
  quickSearch,
  onMessage,
}: {
  token: string;
  quickSearch: string;
  onMessage: (message: string | null) => void;
}) {
  const [rows, setRows] = useState<MarketplaceInquiry[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const query = `${quickSearch} ${search}`.trim().toLowerCase();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listAdminInquiries(token, statusFilter)
      .then((items) => {
        if (!cancelled) setRows(items);
      })
      .catch((error) => onMessage((error as Error).message || 'Không tải được yêu cầu tư vấn.'))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter, rows.length]);

  const filteredRows = rows.filter((item) => {
    if (!query) return true;
    return [item.name, item.phone, item.email, item.message, item.partner_name, item.product_name, item.store_name]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(query);
  });
  const pagination = paginateRows(filteredRows, page, 10);

  return (
    <div className="listPage">
      <section className="filterPanel">
        <label className="filterSearch">
          <Search size={18} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm người gửi, cửa hàng, sản phẩm..." />
        </label>
        <label className="filterSelect">
          <span>Trạng thái</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">Tất cả trạng thái</option>
            <option value="new">Mới</option>
            <option value="contacted">Đã liên hệ</option>
            <option value="closed">Đã đóng</option>
          </select>
        </label>
        <div className="filterMetric">
          <FileText size={19} />
          <span>Yêu cầu</span>
          <strong>{numberLabel(filteredRows.length)}</strong>
        </div>
      </section>

      <section className="panel adminListPanel">
        {loading && !rows.length ? (
          <EmptyState title="Đang tải yêu cầu tư vấn..." />
        ) : filteredRows.length === 0 ? (
          <EmptyState title="Không có yêu cầu tư vấn phù hợp" />
        ) : (
          <div className="adminTable">
            <div className="adminTableHead inquiryGridRow">
              <span>Người gửi</span>
              <span>Đại lý / sản phẩm</span>
              <span>Nội dung</span>
              <span>Trạng thái</span>
              <span>Thời gian</span>
            </div>
            {pagination.rows.map((item) => (
              <div className="adminTableRow inquiryGridRow" key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <small>{[item.phone, item.email].filter(Boolean).join(' · ') || 'Chưa có liên hệ'}</small>
                </div>
                <div>
                  <strong>{item.partner_name || 'Không rõ đại lý'}</strong>
                  <small>{item.product_name || item.store_name || 'Yêu cầu theo cửa hàng'}</small>
                </div>
                <p className="tableMessage">{item.message}</p>
                <span className={statusPillClass(item.status)}>{statusLabel(item.status)}</span>
                <span>{dateLabel(item.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
      <Pagination page={pagination.page} pageCount={pagination.pageCount} total={filteredRows.length} start={pagination.start} end={pagination.end} onPageChange={setPage} />
    </div>
  );
}

function NotificationsPage({
  token,
  inbox,
  onInboxChange,
  onMessage,
}: {
  token: string;
  inbox: NotificationListData | null;
  onInboxChange: (inbox: NotificationListData) => void;
  onMessage: (message: string | null) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    try {
      onInboxChange(await listNotifications(token));
    } catch (error) {
      onMessage((error as Error).message || 'Không tải được thông báo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  useEffect(() => {
    setPage(1);
  }, [filter, inbox?.items.length]);

  const rows = (inbox?.items || []).filter((item) => {
    if (filter === 'unread') return !item.read_at;
    if (filter === 'read') return Boolean(item.read_at);
    return true;
  });
  const pagination = paginateRows(rows, page, 10);

  const markRead = async (id: number) => {
    try {
      await markNotificationRead(token, id);
      await load();
    } catch (error) {
      onMessage((error as Error).message || 'Không cập nhật được thông báo.');
    }
  };

  const markAll = async () => {
    try {
      onInboxChange(await markAllNotificationsRead(token));
      onMessage('Đã đánh dấu tất cả thông báo là đã đọc.');
    } catch (error) {
      onMessage((error as Error).message || 'Không cập nhật được thông báo.');
    }
  };

  return (
    <div className="listPage">
      <section className="filterPanel">
        <label className="filterSelect">
          <span>Bộ lọc</span>
          <select value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="all">Tất cả</option>
            <option value="unread">Chưa đọc</option>
            <option value="read">Đã đọc</option>
          </select>
        </label>
        <div className="filterMetric">
          <Bell size={19} />
          <span>Chưa đọc</span>
          <strong>{numberLabel(inbox?.unread_count || 0)}</strong>
        </div>
        <button className="secondaryButton" type="button" onClick={load} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
          Tải lại
        </button>
        <button className="secondaryButton" type="button" onClick={markAll} disabled={loading || !(inbox?.unread_count)}>
          <Check size={16} />
          Đọc tất cả
        </button>
      </section>

      <section className="panel adminListPanel">
        {loading && !inbox ? (
          <EmptyState title="Đang tải thông báo..." />
        ) : rows.length === 0 ? (
          <EmptyState title="Không có thông báo phù hợp" />
        ) : (
          <div className="notificationPageList">
            {pagination.rows.map((item) => (
              <article className={`notificationPageItem ${item.read_at ? '' : 'unread'}`} key={item.id}>
                <span className="notificationIcon">
                  <Bell size={18} />
                </span>
                <div>
                  <div className="cardHeader compact">
                    <h2>{item.title}</h2>
                    <span className={statusPillClass(item.read_at ? 'read' : 'unread')}>{item.read_at ? 'Đã đọc' : 'Chưa đọc'}</span>
                  </div>
                  <p>{item.body}</p>
                  <div className="metaLine">
                    <span>{statusLabel(item.notification_type)}</span>
                    <span>{dateLabel(item.created_at)}</span>
                  </div>
                </div>
                {!item.read_at && (
                  <button className="secondaryButton compactButton" type="button" onClick={() => markRead(item.id)} disabled={loading}>
                    <Check size={15} />
                    Đã đọc
                  </button>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
      <Pagination page={pagination.page} pageCount={pagination.pageCount} total={rows.length} start={pagination.start} end={pagination.end} onPageChange={setPage} />
    </div>
  );
}

type CareTipFormState = {
  slug: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  suitablePlants: string;
  relatedDiseaseId: string;
  priority: string;
  isActive: boolean;
  sourceName: string;
  sourceUrl: string;
  sourceNote: string;
  startDate: string;
  endDate: string;
};

const EMPTY_CARE_TIP_FORM: CareTipFormState = {
  slug: '',
  title: '',
  summary: '',
  content: '',
  category: 'general',
  suitablePlants: '',
  relatedDiseaseId: '',
  priority: '0',
  isActive: true,
  sourceName: '',
  sourceUrl: '',
  sourceNote: '',
  startDate: '',
  endDate: '',
};

function listToCsv(values: string[]) {
  return values.join(', ');
}

function csvToList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function nullableText(value: string) {
  const clean = value.trim();
  return clean || null;
}

function toDateInput(value: string | null) {
  return value ? value.slice(0, 10) : '';
}

function careTipToForm(tip: CareTip): CareTipFormState {
  return {
    slug: tip.slug || '',
    title: tip.title || '',
    summary: tip.summary || '',
    content: tip.content || '',
    category: tip.category || 'general',
    suitablePlants: listToCsv(tip.suitable_plants || []),
    relatedDiseaseId: tip.related_disease_id ? String(tip.related_disease_id) : '',
    priority: String(tip.priority ?? 0),
    isActive: tip.is_active,
    sourceName: tip.source_name || '',
    sourceUrl: tip.source_url || '',
    sourceNote: tip.source_note || '',
    startDate: toDateInput(tip.start_date),
    endDate: toDateInput(tip.end_date),
  };
}

function formToCareTipPayload(form: CareTipFormState): CareTipPayload {
  return {
    slug: nullableText(form.slug),
    title: form.title.trim(),
    summary: form.summary.trim(),
    content: form.content.trim(),
    category: form.category.trim(),
    suitable_plants: csvToList(form.suitablePlants),
    related_disease_id: form.relatedDiseaseId.trim() ? Number(form.relatedDiseaseId) : null,
    priority: Number(form.priority) || 0,
    is_active: form.isActive,
    source_name: nullableText(form.sourceName),
    source_url: nullableText(form.sourceUrl),
    source_note: nullableText(form.sourceNote),
    start_date: nullableText(form.startDate),
    end_date: nullableText(form.endDate),
  };
}

function CareTipsPage({
  careTips,
  loading,
  quickSearch,
  onSave,
  onDelete,
}: {
  careTips: CareTip[];
  loading: boolean;
  quickSearch: string;
  onSave: (payload: CareTipPayload, id?: number) => Promise<void>;
  onDelete: (tip: CareTip) => Promise<void>;
}) {
  const [editingId, setEditingId] = useState<number | undefined>();
  const [form, setForm] = useState<CareTipFormState>(EMPTY_CARE_TIP_FORM);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const query = `${quickSearch} ${search}`.trim().toLowerCase();
  const filteredCareTips = careTips.filter((tip) => {
    const matchesSearch =
      !query ||
      [tip.title, tip.summary, tip.content, tip.category, tip.slug, ...(tip.suitable_plants || [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query);
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? tip.is_active : !tip.is_active);
    return matchesSearch && matchesStatus;
  });
  const pagination = paginateRows(filteredCareTips, page);

  useEffect(() => {
    setPage(1);
  }, [quickSearch, search, statusFilter, careTips.length]);

  const editTip = (tip: CareTip) => {
    setEditingId(tip.id);
    setForm(careTipToForm(tip));
  };

  const resetForm = () => {
    setEditingId(undefined);
    setForm(EMPTY_CARE_TIP_FORM);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await onSave(formToCareTipPayload(form), editingId);
      resetForm();
    } catch {
      // Parent state already shows the API error.
    }
  };

  const confirmDelete = async (tip: CareTip) => {
    if (!window.confirm(`Xóa mẹo "${tip.title}"?`)) return;
    try {
      await onDelete(tip);
      if (editingId === tip.id) resetForm();
    } catch {
      // Parent state already shows the API error.
    }
  };

  return (
    <div className="careTipsLayout">
      <form className="careTipForm" onSubmit={submit}>
        <div className="sectionHeader">
          <div>
            <h2>{editingId ? 'Cập nhật mẹo' : 'Tạo mẹo mới'}</h2>
            <p>Nội dung này hiển thị trên trang chủ ứng dụng và thư viện mẹo chăm sóc.</p>
          </div>
          {editingId && (
            <button className="ghostLightButton" type="button" onClick={resetForm}>
              Hủy sửa
            </button>
          )}
        </div>

        <div className="formGrid">
          <label>
            Tiêu đề
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required minLength={3} />
          </label>
          <label>
            Slug
            <input value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} placeholder="tu-dong-neu-bo-trong" />
          </label>
          <label>
            Danh mục
            <input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} required minLength={2} />
          </label>
          <label>
            Ưu tiên
            <input type="number" value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })} />
          </label>
          <label className="wideInfo">
            Tóm tắt
            <textarea value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} required minLength={10} rows={3} />
          </label>
          <label className="wideInfo">
            Nội dung
            <textarea value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} required minLength={20} rows={6} />
          </label>
          <label className="wideInfo">
            Cây phù hợp
            <input value={form.suitablePlants} onChange={(event) => setForm({ ...form, suitablePlants: event.target.value })} placeholder="cà chua, táo, nho" />
          </label>
          <label>
            ID bệnh
            <input type="number" value={form.relatedDiseaseId} onChange={(event) => setForm({ ...form, relatedDiseaseId: event.target.value })} />
          </label>
          <label>
            Trạng thái
            <select value={form.isActive ? 'active' : 'inactive'} onChange={(event) => setForm({ ...form, isActive: event.target.value === 'active' })}>
              <option value="active">Đang hiển thị</option>
              <option value="inactive">Tạm ẩn</option>
            </select>
          </label>
          <label>
            Từ ngày
            <input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} />
          </label>
          <label>
            Đến ngày
            <input type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} />
          </label>
          <label>
            Nguồn
            <input value={form.sourceName} onChange={(event) => setForm({ ...form, sourceName: event.target.value })} />
          </label>
          <label>
            URL nguồn
            <input value={form.sourceUrl} onChange={(event) => setForm({ ...form, sourceUrl: event.target.value })} />
          </label>
          <label className="wideInfo">
            Ghi chú nguồn
            <input value={form.sourceNote} onChange={(event) => setForm({ ...form, sourceNote: event.target.value })} />
          </label>
        </div>

        <button className="primaryButton" type="submit" disabled={loading}>
          <Save size={16} />
          {editingId ? 'Lưu thay đổi' : 'Tạo mẹo'}
        </button>
      </form>

      <section className="careTipListPanel">
        <div className="sectionHeader">
          <div>
            <h2>Danh sách mẹo chăm sóc</h2>
            <p>Quản lý và cập nhật các mẹo chăm sóc hiện có.</p>
          </div>
        </div>
        <div className="careTipFilters">
          <label className="filterSearch">
            <Search size={18} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm kiếm mẹo..." />
          </label>
          <label className="filterSelect">
            <span>Trạng thái</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang hiển thị</option>
              <option value="hidden">Tạm ẩn</option>
            </select>
          </label>
        </div>
        <div className="careTipList">
          {filteredCareTips.length === 0 ? (
            <EmptyState title="Không có mẹo chăm sóc phù hợp" />
          ) : (
            pagination.rows.map((tip) => (
              <article className="careTipRow" key={tip.id}>
                <div>
                  <div className="cardHeader compact">
                    <h2>{tip.title}</h2>
                    <span className={statusPillClass(tip.is_active ? 'active' : 'inactive')}>{tip.is_active ? 'Đang hiển thị' : 'Tạm ẩn'}</span>
                  </div>
                  <p>{tip.summary}</p>
                  <div className="metaLine">
                    <span>{tip.category}</span>
                    <span>Độ ưu tiên {tip.priority}</span>
                    <span>{tip.slug}</span>
                  </div>
                </div>
                <div className="rowActions">
                  <button className="secondaryButton" type="button" onClick={() => editTip(tip)} disabled={loading}>
                    <Pencil size={15} />
                    Sửa
                  </button>
                  <button className="rejectButton" type="button" onClick={() => confirmDelete(tip)} disabled={loading}>
                    <Trash2 size={15} />
                    Xóa
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
        <Pagination
          page={pagination.page}
          pageCount={pagination.pageCount}
          total={filteredCareTips.length}
          start={pagination.start}
          end={pagination.end}
          onPageChange={setPage}
        />
      </section>
    </div>
  );
}

function Info({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? 'wideInfo' : ''}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function ActionRow({
  disabled,
  approveLabel,
  rejectLabel,
  onApprove,
  onReject,
}: {
  disabled: boolean;
  approveLabel: string;
  rejectLabel: string;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className="actionRow">
      <button className="approveButton" disabled={disabled} onClick={onApprove}>
        <Check size={16} />
        {approveLabel}
      </button>
      <button className="rejectButton" disabled={disabled} onClick={onReject}>
        <X size={16} />
        {rejectLabel}
      </button>
    </div>
  );
}

function EmptyState({ title }: { title: string }) {
  return (
    <div className="emptyState">
      <BadgeCheck size={38} />
      <h2>{title}</h2>
      <p>Danh sách này sẽ tự cập nhật sau khi tải lại dữ liệu.</p>
    </div>
  );
}
