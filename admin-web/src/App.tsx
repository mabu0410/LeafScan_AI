import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Bell,
  Building2,
  Check,
  CircleDollarSign,
  ExternalLink,
  FileText,
  LayoutDashboard,
  Leaf,
  LogOut,
  PackageCheck,
  Pencil,
  RefreshCw,
  Save,
  ShieldCheck,
  Sprout,
  Store,
  TrendingUp,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import {
  createCareTip,
  deleteCareTip,
  getAdminDashboard,
  listAdminCareTips,
  listPendingPartners,
  listPendingProducts,
  loginAdmin,
  toAssetUrl,
  updateCareTip,
  updatePartnerStatus,
  updateProductStatus,
} from './api';
import { AdminDashboardData, AuthSession, CareTip, CareTipPayload, PartnerProduct, PartnerStore } from './types';

const SESSION_KEY = 'leafscan-admin-session';

type RouteName = 'login' | 'dashboard' | 'partners' | 'products' | 'care-tips';
type IconComponent = typeof LayoutDashboard;

function getInitialRoute(): RouteName {
  const route = window.location.pathname.replace('/', '') as RouteName;
  if (route === 'dashboard' || route === 'partners' || route === 'products' || route === 'care-tips') return route;
  return 'dashboard';
}

function routeTitle(route: RouteName) {
  if (route === 'partners') return 'Duyet dai ly';
  if (route === 'products') return 'Duyet san pham';
  if (route === 'care-tips') return 'Meo cham soc';
  return 'Tong quan';
}

function currency(value: string | null) {
  return value || 'Chua co gia';
}

function money(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function dateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Khong ro ngay';
  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function asList(values: string[]) {
  return values.length ? values.join(', ') : 'Chua khai bao';
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
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const navigate = (next: RouteName) => {
    setRoute(next);
    window.history.pushState(null, '', next === 'login' ? '/login' : `/${next}`);
  };

  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
    setPartners([]);
    setProducts([]);
    setCareTips([]);
    setDashboardData(null);
    navigate('login');
  };

  const refresh = async () => {
    if (!session) return;
    setLoading(true);
    setMessage(null);
    try {
      const [dashboardRows, partnerRows, productRows, careTipRows] = await Promise.all([
        getAdminDashboard(session.accessToken),
        listPendingPartners(session.accessToken),
        listPendingProducts(session.accessToken),
        listAdminCareTips(session.accessToken),
      ]);
      setDashboardData(dashboardRows);
      setPartners(partnerRows);
      setProducts(productRows);
      setCareTips(careTipRows);
    } catch (error) {
      if ((error as Error).name === 'AuthError') {
        logout();
        return;
      }
      setMessage((error as Error).message || 'Khong tai duoc du lieu admin.');
    } finally {
      setLoading(false);
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

  const stats = useMemo(
    () => [
      { label: 'Nguoi dung', value: dashboardData?.users.total ?? 0, icon: Users },
      { label: 'Luot quet AI', value: dashboardData?.scans.total ?? 0, icon: BarChart3 },
      { label: 'Doanh thu thanh cong', value: money(dashboardData?.revenue.total_success_vnd ?? 0), icon: CircleDollarSign },
      { label: 'Viec cho duyet', value: (dashboardData?.partners.pending ?? partners.length) + (dashboardData?.products.pending ?? products.length), icon: ShieldCheck },
    ],
    [dashboardData, partners.length, products.length]
  );

  if (!session || route === 'login') {
    return <LoginScreen onLogin={setSession} />;
  }

  const approvePartner = async (partner: PartnerStore, status: 'active' | 'rejected') => {
    setLoading(true);
    setMessage(null);
    try {
      await updatePartnerStatus(session.accessToken, partner.id, status);
      setPartners((rows) => rows.filter((item) => item.id !== partner.id));
      setMessage(status === 'active' ? 'Da duyet ho so dai ly.' : 'Da tu choi ho so dai ly.');
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
      setMessage(status === 'approved' ? 'Da duyet san pham.' : 'Da tu choi san pham.');
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
      setMessage(id ? 'Da cap nhat meo cham soc.' : 'Da tao meo cham soc.');
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
      setMessage('Da xoa meo cham soc.');
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

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandIcon">
            <ShieldCheck size={22} />
          </div>
          <div>
            <div className="brandName">LeafScan Admin</div>
            <div className="brandMeta">Marketplace review</div>
          </div>
        </div>

        <nav className="nav">
          <NavButton icon={LayoutDashboard} label="Tong quan" active={route === 'dashboard'} onClick={() => navigate('dashboard')} />
          <NavButton icon={Building2} label="Dai ly" active={route === 'partners'} onClick={() => navigate('partners')} badge={partners.length} />
          <NavButton icon={PackageCheck} label="San pham" active={route === 'products'} onClick={() => navigate('products')} badge={products.length} />
          <NavButton icon={Leaf} label="Meo cham soc" active={route === 'care-tips'} onClick={() => navigate('care-tips')} badge={careTips.length} />
        </nav>

        <div className="account">
          <div className="accountName">{session.user.name}</div>
          <div className="accountEmail">{session.user.email}</div>
          <button className="ghostButton full" onClick={logout}>
            <LogOut size={16} />
            Dang xuat
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <div className="eyebrow">Admin workspace</div>
            <h1>{routeTitle(route)}</h1>
          </div>
          <button className="secondaryButton" onClick={refresh} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            Tai lai
          </button>
        </header>

        {message && (
          <div className="notice">
            <AlertCircle size={17} />
            {message}
          </div>
        )}

        {route === 'dashboard' && (
          <Dashboard stats={stats} partners={partners} products={products} careTips={careTips} dashboardData={dashboardData} onNavigate={navigate} />
        )}
        {route === 'partners' && (
          <PartnersPage partners={partners} loading={loading} onAction={approvePartner} />
        )}
        {route === 'products' && (
          <ProductsPage products={products} loading={loading} onAction={approveProduct} />
        )}
        {route === 'care-tips' && (
          <CareTipsPage careTips={careTips} loading={loading} onSave={saveCareTip} onDelete={removeCareTip} />
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
      setError((err as Error).message || 'Dang nhap that bai.');
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
        <p>Dang nhap bang tai khoan nam trong ADMIN_EMAILS de duyet marketplace.</p>
        <form onSubmit={submit} className="loginForm">
          <label>
            Email hoac tai khoan
            <input type="text" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin" required />
          </label>
          <label>
            Mat khau
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Nhap mat khau" required />
          </label>
          {error && <div className="formError">{error}</div>}
          <button className="primaryButton" type="submit" disabled={loading}>
            {loading ? 'Dang dang nhap...' : 'Dang nhap'}
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
  const maxScans = Math.max(...(dashboardData?.scan_series.map((item) => item.scans) || [0]), 1);

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
              title="Nguoi dung"
              total={dashboardData.users.total}
              rows={[
                ['Nong dan', dashboardData.users.active],
                ['Doi tac', dashboardData.users.approved],
                ['Admin', dashboardData.users.pending],
              ]}
            />
            <BreakdownCard
              icon={Building2}
              title="Doi tac marketplace"
              total={dashboardData.partners.total}
              rows={[
                ['Cho duyet', dashboardData.partners.pending],
                ['Dang hoat dong', dashboardData.partners.active],
                ['Tu choi', dashboardData.partners.rejected],
                ['Tam khoa', dashboardData.partners.suspended],
              ]}
            />
            <BreakdownCard
              icon={PackageCheck}
              title="San pham vat tu"
              total={dashboardData.products.total}
              rows={[
                ['Cho duyet', dashboardData.products.pending],
                ['Da duyet', dashboardData.products.approved],
                ['Dang bat', dashboardData.products.active],
                ['Tu choi', dashboardData.products.rejected],
              ]}
            />
            <BreakdownCard
              icon={Bell}
              title="Thong bao"
              total={dashboardData.notifications.total}
              rows={[
                ['Token dang bat', dashboardData.notifications.active],
                ['Da gui', dashboardData.notifications.approved],
                ['Dang cho', dashboardData.notifications.pending],
                ['That bai', dashboardData.notifications.rejected],
              ]}
            />
          </div>

          <div className="revenueGrid">
            <section className="panel">
              <div className="sectionHeader">
                <div>
                  <h2>Doanh thu thanh toan</h2>
                  <p>Chi tinh giao dich VNPAY co trang thai success.</p>
                </div>
                <CircleDollarSign size={22} />
              </div>
              <div className="moneyValue">{money(dashboardData.revenue.total_success_vnd)}</div>
              <div className="revenueRows">
                <Info label="Goi user" value={`${money(dashboardData.revenue.user_success_vnd)} / ${dashboardData.revenue.user_success_count} GD`} />
                <Info label="Goi doi tac" value={`${money(dashboardData.revenue.partner_success_vnd)} / ${dashboardData.revenue.partner_success_count} GD`} />
                <Info label="Thanh toan dang cho" value={`${dashboardData.revenue.pending_count} giao dich`} />
              </div>
            </section>

            <section className="panel">
              <div className="sectionHeader">
                <div>
                  <h2>Quet AI 14 ngay</h2>
                  <p>So luot scan_history duoc ghi nhan theo ngay.</p>
                </div>
                <TrendingUp size={22} />
              </div>
              <div className="barChart" aria-label="Bieu do luot quet 14 ngay">
                {dashboardData.scan_series.map((item) => (
                  <div className="barColumn" key={item.date}>
                    <div className="barValue">{item.scans}</div>
                    <div className="barTrack">
                      <div className="barFill" style={{ height: `${Math.max(6, (item.scans / maxScans) * 100)}%` }} />
                    </div>
                    <div className="barLabel">{item.date.slice(5)}</div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="insightGrid">
            <section className="panel">
              <div className="sectionHeader">
                <div>
                  <h2>Benh duoc quet nhieu</h2>
                  <p>Top nhan benh xuat hien trong lich su quet.</p>
                </div>
                <Leaf size={22} />
              </div>
              <RankList
                empty="Chua co lich su quet."
                rows={dashboardData.top_diseases.map((item) => ({
                  key: item.disease_key,
                  title: item.disease_name || item.disease_key,
                  meta: item.avg_confidence == null ? item.disease_key : `${item.disease_key} · TB ${item.avg_confidence}%`,
                  value: `${item.scans} scan`,
                }))}
              />
            </section>

            <section className="panel">
              <div className="sectionHeader">
                <div>
                  <h2>San pham co tuong tac</h2>
                  <p>Xep hang theo impression va click marketplace.</p>
                </div>
                <Store size={22} />
              </div>
              <RankList
                empty="Chua co impression san pham."
                rows={dashboardData.top_products.map((item) => ({
                  key: String(item.product_id),
                  title: item.product_name,
                  meta: item.partner_name || 'Chua ro doi tac',
                  value: `${item.impressions} view · ${item.clicks} click · ${item.click_rate}%`,
                }))}
              />
            </section>
          </div>
        </>
      )}

      <div className="quickGrid">
        <button className="quickCard" onClick={() => onNavigate('partners')}>
          <Building2 size={26} />
          <span>Duyet ho so dai ly</span>
          <strong>{partners.length} dang cho</strong>
        </button>
        <button className="quickCard" onClick={() => onNavigate('products')}>
          <PackageCheck size={26} />
          <span>Duyet san pham</span>
          <strong>{products.length} dang cho</strong>
        </button>
        <button className="quickCard" onClick={() => onNavigate('care-tips')}>
          <Leaf size={26} />
          <span>Quan ly meo cham soc</span>
          <strong>{careTips.length} dang co</strong>
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
  total: number;
  rows: Array<[string, number]>;
}) {
  return (
    <section className="breakdownCard">
      <div className="breakdownHead">
        <Icon size={19} />
        <span>{title}</span>
        <strong>{total}</strong>
      </div>
      <div className="breakdownRows">
        {rows.map(([label, value]) => (
          <div className="breakdownRow" key={label}>
            <span>{label}</span>
            <b>{value}</b>
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

function PartnersPage({
  partners,
  loading,
  onAction,
}: {
  partners: PartnerStore[];
  loading: boolean;
  onAction: (partner: PartnerStore, status: 'active' | 'rejected') => void;
}) {
  if (partners.length === 0) return <EmptyState title="Khong co ho so dai ly cho duyet" />;

  return (
    <div className="reviewGrid">
      {partners.map((partner) => (
        <article className="reviewCard" key={partner.id}>
          <div className="mediaStrip">
            {toAssetUrl(partner.cover_url) ? (
              <img src={toAssetUrl(partner.cover_url) || ''} alt={partner.store_name || partner.company_name} />
            ) : (
              <Store size={34} />
            )}
          </div>
          <div className="cardBody">
            <div className="cardHeader">
              <div>
                <h2>{partner.store_name || partner.company_name}</h2>
                <p>{partner.company_name}</p>
              </div>
              <span className="statusPill">{partner.status}</span>
            </div>

            <dl className="infoGrid">
              <Info label="Email" value={partner.contact_email} />
              <Info label="Dien thoai" value={partner.phone} />
              <Info label="Dia chi" value={partner.address || 'Chua co dia chi'} />
              <Info label="Dai dien" value={partner.representative_name || 'Chua co'} />
              <Info label="Khu vuc" value={partner.service_area || 'Chua co'} />
              <Info label="Nhom san pham" value={asList(partner.product_categories)} />
              <Info label="San pham chinh" value={partner.main_products || 'Chua co'} wide />
              <Info label="Ngay gui" value={dateLabel(partner.created_at)} />
            </dl>

            <div className="linkRow">
              {partner.business_license_file_url && (
                <a href={toAssetUrl(partner.business_license_file_url) || '#'} target="_blank" rel="noreferrer">
                  <FileText size={16} />
                  Giay phep
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
                  Lien he
                </a>
              )}
            </div>

            <ActionRow
              disabled={loading}
              approveLabel="Duyet dai ly"
              rejectLabel="Tu choi"
              onApprove={() => onAction(partner, 'active')}
              onReject={() => onAction(partner, 'rejected')}
            />
          </div>
        </article>
      ))}
    </div>
  );
}

function ProductsPage({
  products,
  loading,
  onAction,
}: {
  products: PartnerProduct[];
  loading: boolean;
  onAction: (product: PartnerProduct, status: 'approved' | 'rejected') => void;
}) {
  if (products.length === 0) return <EmptyState title="Khong co san pham cho duyet" />;

  return (
    <div className="reviewGrid">
      {products.map((product) => (
        <article className="reviewCard product" key={product.id}>
          <div className="productImage">
            {toAssetUrl(product.image_url) ? (
              <img src={toAssetUrl(product.image_url) || ''} alt={product.name} />
            ) : (
              <PackageCheck size={34} />
            )}
          </div>
          <div className="cardBody">
            <div className="cardHeader">
              <div>
                <h2>{product.name}</h2>
                <p>{product.partner_name || `Partner #${product.partner_id}`}</p>
              </div>
              <span className="statusPill">{product.moderation_status}</span>
            </div>

            <p className="description">{product.description || 'Chua co mo ta san pham.'}</p>

            <dl className="infoGrid">
              <Info label="Gia" value={currency(product.price_range)} />
              <Info label="Benh muc tieu" value={asList(product.target_diseases)} />
              <Info label="Danh muc" value={asList(product.target_categories)} />
              <Info label="Trang thai dai ly" value={product.partner_status || 'Khong ro'} />
              <Info label="Ngay gui" value={dateLabel(product.created_at)} />
            </dl>

            <div className="linkRow">
              {product.product_url && (
                <a href={product.product_url} target="_blank" rel="noreferrer">
                  <ExternalLink size={16} />
                  Link san pham
                </a>
              )}
            </div>

            <ActionRow
              disabled={loading}
              approveLabel="Duyet san pham"
              rejectLabel="Tu choi"
              onApprove={() => onAction(product, 'approved')}
              onReject={() => onAction(product, 'rejected')}
            />
          </div>
        </article>
      ))}
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
  onSave,
  onDelete,
}: {
  careTips: CareTip[];
  loading: boolean;
  onSave: (payload: CareTipPayload, id?: number) => Promise<void>;
  onDelete: (tip: CareTip) => Promise<void>;
}) {
  const [editingId, setEditingId] = useState<number | undefined>();
  const [form, setForm] = useState<CareTipFormState>(EMPTY_CARE_TIP_FORM);

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
    if (!window.confirm(`Xoa meo "${tip.title}"?`)) return;
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
            <h2>{editingId ? 'Cap nhat meo' : 'Tao meo moi'}</h2>
            <p>Noi dung nay hien tren mobile Home va thu vien care tips.</p>
          </div>
          {editingId && (
            <button className="ghostLightButton" type="button" onClick={resetForm}>
              Huy sua
            </button>
          )}
        </div>

        <div className="formGrid">
          <label>
            Tieu de
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required minLength={3} />
          </label>
          <label>
            Slug
            <input value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} placeholder="tu-dong-neu-bo-trong" />
          </label>
          <label>
            Danh muc
            <input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} required minLength={2} />
          </label>
          <label>
            Uu tien
            <input type="number" value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })} />
          </label>
          <label className="wideInfo">
            Tom tat
            <textarea value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} required minLength={10} rows={3} />
          </label>
          <label className="wideInfo">
            Noi dung
            <textarea value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} required minLength={20} rows={6} />
          </label>
          <label className="wideInfo">
            Cay phu hop
            <input value={form.suitablePlants} onChange={(event) => setForm({ ...form, suitablePlants: event.target.value })} placeholder="tomato, apple, grape" />
          </label>
          <label>
            Disease ID
            <input type="number" value={form.relatedDiseaseId} onChange={(event) => setForm({ ...form, relatedDiseaseId: event.target.value })} />
          </label>
          <label>
            Trang thai
            <select value={form.isActive ? 'active' : 'inactive'} onChange={(event) => setForm({ ...form, isActive: event.target.value === 'active' })}>
              <option value="active">Dang hien thi</option>
              <option value="inactive">Tam an</option>
            </select>
          </label>
          <label>
            Tu ngay
            <input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} />
          </label>
          <label>
            Den ngay
            <input type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} />
          </label>
          <label>
            Nguon
            <input value={form.sourceName} onChange={(event) => setForm({ ...form, sourceName: event.target.value })} />
          </label>
          <label>
            URL nguon
            <input value={form.sourceUrl} onChange={(event) => setForm({ ...form, sourceUrl: event.target.value })} />
          </label>
          <label className="wideInfo">
            Ghi chu nguon
            <input value={form.sourceNote} onChange={(event) => setForm({ ...form, sourceNote: event.target.value })} />
          </label>
        </div>

        <button className="primaryButton" type="submit" disabled={loading}>
          <Save size={16} />
          {editingId ? 'Luu thay doi' : 'Tao meo'}
        </button>
      </form>

      <div className="careTipList">
        {careTips.length === 0 ? (
          <EmptyState title="Chua co meo cham soc" />
        ) : (
          careTips.map((tip) => (
            <article className="careTipRow" key={tip.id}>
              <div>
                <div className="cardHeader compact">
                  <h2>{tip.title}</h2>
                  <span className="statusPill">{tip.is_active ? 'active' : 'hidden'}</span>
                </div>
                <p>{tip.summary}</p>
                <div className="metaLine">
                  <span>{tip.category}</span>
                  <span>Priority {tip.priority}</span>
                  <span>{tip.slug}</span>
                </div>
              </div>
              <div className="rowActions">
                <button className="secondaryButton" type="button" onClick={() => editTip(tip)} disabled={loading}>
                  <Pencil size={15} />
                  Sua
                </button>
                <button className="rejectButton" type="button" onClick={() => confirmDelete(tip)} disabled={loading}>
                  <Trash2 size={15} />
                  Xoa
                </button>
              </div>
            </article>
          ))
        )}
      </div>
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
      <p>Danh sach nay se tu cap nhat sau khi tai lai du lieu.</p>
    </div>
  );
}
