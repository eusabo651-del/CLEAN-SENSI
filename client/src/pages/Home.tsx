import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Apple,
  Anchor,
  BadgeCheck,
  Ban,
  Check,
  ChevronRight,
  CircleHelp,
  Clipboard,
  Clock3,
  Copy,
  Code2,
  Crosshair,
  Crown,
  Gauge,
  Grid3X3,
  Globe2,
  History,
  KeyRound,
  Laptop,
  LayoutDashboard,
  LockKeyhole,
  SlidersHorizontal,
  LogOut,
  Menu,
  MessageCircle,
  MonitorSmartphone,
  MoreHorizontal,
  MoveDown,
  PackagePlus,
  RefreshCw,
  RotateCcw,
  Search,
  Share2,
  Settings2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Trash2,
  Target,
  TerminalSquare,
  UserRound,
  Users,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  DURATION_UNITS,
  OPERATING_SYSTEMS,
  PERFORMANCE_LABELS,
  PERFORMANCE_LEVELS,
  PLAN_CATALOG,
  OS_LABELS,
  planName,
  type SensitivityValues,
} from "@shared/rbxis";

const androidDevices = ["Samsung Galaxy S24", "Samsung Galaxy A54", "Motorola Edge 40", "Xiaomi Redmi Note 13", "Poco X6 Pro", "Asus ROG Phone 7", "OUTROS AND"];
const iosDevices = ["iPhone 15 Pro", "iPhone 14", "iPhone 13", "iPhone 12", "iPhone 11", "iPhone SE (2022)", "OUTROS IPH"];
const valueLabels: { key: keyof SensitivityValues; label: string; icon: string }[] = [
  { key: "general", label: "Geral", icon: "◎" },
  { key: "redDot", label: "Ponto Vermelho", icon: "◉" },
  { key: "scope2x", label: "Mira 2x", icon: "2×" },
  { key: "scope4x", label: "Mira 4x", icon: "4×" },
  { key: "awm", label: "AWM", icon: "⌁" },
];

type View = "home" | "auxilio" | "info" | "profile";
type AdminView = "overview" | "licenses";
const ACTIVATION_NOTICE_STORAGE_KEY = "rbxis_activation_notice_hwid_v1";

function getDeviceId() {
  if (typeof window === "undefined") return "server-device";
  const stored = window.localStorage.getItem("rbxis-device-id");
  if (stored) return stored;
  const value = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem("rbxis-device-id", value);
  return value;
}

async function copyToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const field = document.createElement("textarea");
  field.value = value;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.appendChild(field);
  field.select();
  const copied = document.execCommand("copy");
  field.remove();
  if (!copied) throw new Error("Não foi possível acessar a área de transferência");
}

function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function formatExpiry(value: string | Date | null | undefined) {
  if (!value) return "—";
  const diff = new Date(value).getTime() - Date.now();
  if (diff <= 0) return "Expirada";
  const minutes = Math.ceil(diff / 60_000);
  if (minutes < 60) return `${minutes} min restantes`;
  const hours = Math.ceil(minutes / 60);
  if (hours < 24) return `${hours} h restantes`;
  const days = Math.ceil(hours / 24);
  return days === 1 ? "1 dia restante" : `${days} dias restantes`;
}

function AppLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand-mark ${compact ? "brand-mark-compact" : ""}`}>
      <div className="brand-icon"><img src="/clean-sensi-logo.png" alt="" aria-hidden="true" /></div>
      {!compact && <div><span className="brand-name">CLEAN SENSI</span><span className="brand-caption">PAINEL DE SENSI</span></div>}
    </div>
  );
}

function LoadingScreen() {
  return <div className="loading-screen"><div className="loading-orbit"><Crosshair size={28} /></div><p>CARREGANDO PAINEL</p><span>Conectando com segurança...</span></div>;
}

function LoginScreen() {
  const [adminMode, setAdminMode] = useState(false);
  const [accessKey, setAccessKey] = useState("");
  useEffect(() => { navigator.serviceWorker?.register("/sw.js").catch(() => undefined); }, []);
  const login = trpc.auth.login.useMutation({
    onSuccess: data => {
      localStorage.removeItem("rbxis_admin_mode_v3");
      localStorage.setItem("rbxis_session_token_v3", data.sessionToken);
      if (data.activatedNow) localStorage.setItem(ACTIVATION_NOTICE_STORAGE_KEY, getDeviceId());
      window.location.reload();
    },
    onError: error => toast.error(error.message),
  });
  const adminLogin = trpc.auth.adminLogin.useMutation({
    onSuccess: data => { localStorage.setItem("rbxis_admin_mode_v3", "1"); localStorage.setItem("rbxis_session_token_v3", data.sessionToken); window.location.reload(); },
    onError: error => toast.error(error.message),
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (adminMode) adminLogin.mutate({ adminKey: accessKey });
    else login.mutate({ accessKey, deviceId: getDeviceId() });
  }

  const pending = login.isPending || adminLogin.isPending;
  return (
    <main className="login-shell">
      <div className="login-noise" />
      <div className="login-split-glow" />
      <header className="login-header"><div className="login-brand-wordmark">CLEAN SENSI</div><div className="secure-chip"><ShieldCheck size={14} /> SISTEMA PROTEGIDO</div></header>
      <section className="login-content">
        <div className="login-copy">

          <span className="eyebrow"><span className="eyebrow-dot" /> ACESSO EXCLUSIVO</span>
          <h1>CLEAN<br /><em>SENSI</em></h1>
          <p>Entre com sua chave e acesse seu espaço de controle.</p>
        </div>
        <div className="login-card-wrap">
          <div className="login-card-topline"><span className="red-line" /><span>CLEAN SENSI / {adminMode ? "PRIVATE" : "LICENSE"}</span><span className="online-dot" /></div>
          <div className="login-card">
            <div className="login-card-heading"><div className="card-icon"><LockKeyhole size={21} /></div><div><span className="mini-label">{adminMode ? "PRIVATE" : "ACESSO PRIVATE"}</span><h2>{adminMode ? "Painel administrativo" : "Coloque sua chave abaixo"}</h2></div></div>
            <p className="card-description">{adminMode ? "Acesso restrito ao administrador." : "Informe sua chave de acesso para continuar."}</p>
            <form onSubmit={submit} className="login-form">
              <label><span>{adminMode ? "Chave de administrador" : "Chave de acesso"}</span><div className="input-shell"><KeyRound size={17} /><input value={accessKey} onChange={event => setAccessKey(event.target.value)} placeholder={adminMode ? "XXXXXXXXXX" : "CLEAN-SENSI-XXX-XXXXXXXXXX"} type="password" autoComplete="current-password" autoCapitalize="none" autoCorrect="off" spellCheck={false} required /><button type="button" className="input-action" onClick={() => setAccessKey("")} aria-label="Limpar chave"><X size={15} /></button></div></label>
              <button className="primary-button login-button" disabled={pending}>{pending ? <><RefreshCw size={17} className="spin" /> VALIDANDO...</> : <>{adminMode ? "ENTRAR NO ADMIN" : "ENTRAR NO PAINEL"}<ChevronRight size={18} /></>}</button>
            </form>
            <a className="discord-login-button" href="https://discord.gg/EDBtEVWpTM" target="_blank" rel="noopener noreferrer"><span className="discord-login-icon"><MessageCircle size={17} /></span><span className="discord-login-copy"><b>Discord</b><small>Suporte e comunidade</small></span><ChevronRight size={17} /></a>
            <button type="button" className="text-button admin-toggle" onClick={() => { setAdminMode(value => !value); setAccessKey(""); }}>{adminMode ? "Voltar para acesso de usuário" : "Acesso administrativo"}<ChevronRight size={14} /></button>
            <div className="secure-footer"><Wifi size={13} /> CONEXÃO CRIPTOGRAFADA <span /> <span>SESSÃO PRIVADA</span></div>
          </div>
        </div>
      </section>
      <footer className="login-footer"><span>CLEAN SENSI / AUXILIO DE MIRA</span><span>Auxilio</span><span className="footer-red">●</span></footer>
      <InstallNotice />
    </main>
  );
}

function InstallNotice() {
  const [visible, setVisible] = useState(true);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosGuide, setIosGuide] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), 4000);
    const capture = (event: Event) => { event.preventDefault(); setInstallEvent(event as BeforeInstallPromptEvent); };
    window.addEventListener("beforeinstallprompt", capture);
    return () => { window.clearTimeout(timer); window.removeEventListener("beforeinstallprompt", capture); };
  }, []);
  if (!visible) return null;
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  return <>{<div className="install-notice"><div className="notice-pulse"><MonitorSmartphone size={18} /></div><div><b>Coloque o CLEAN SENSI na tela inicial</b><span>Abra como um app no seu telefone.</span></div><button onClick={async () => { if (installEvent) { await installEvent.prompt(); setVisible(false); } else if (isIos) setIosGuide(true); else if (navigator.share) { await navigator.share({ title: "CLEAN SENSI", text: "Abrir o CLEAN SENSI", url: window.location.href }); setVisible(false); } else toast.info("Toque no menu Compartilhar do navegador e escolha 'Adicionar à tela inicial'."); }} aria-label="Adicionar à tela inicial"><ChevronRight size={18} /></button><button className="notice-close" onClick={() => setVisible(false)} aria-label="Fechar aviso"><X size={15} /></button></div>}{iosGuide && <div className="ios-install-guide" role="dialog" aria-modal="true"><div className="ios-guide-card"><div className="ios-guide-icon"><Share2 size={22} /></div><span className="eyebrow"><span className="eyebrow-dot" /> SAFARI / IPHONE</span><h2>Adicionar à Tela de Início</h2><p>Toque no ícone <b>Compartilhar</b> na barra inferior do Safari, como na imagem, e depois escolha <b>Adicionar à Tela de Início</b>.</p><div className="ios-share-hint"><Share2 size={25} /><span>Ícone Compartilhar</span><ChevronRight size={16} /><span>Adicionar à Tela de Início</span></div><button className="primary-button" onClick={() => setIosGuide(false)}>Entendi</button></div></div>}</>;
}

function UserShell({ children, view, onChangeView, session, onLogout }: { children: React.ReactNode; view: View; onChangeView: (view: View) => void; session: { username: string; planId: string; expiresAt: Date | string; deviceId?: string | null }; onLogout: () => void }) {
  const nav: { id: View; label: string; icon: React.ElementType }[] = [
    { id: "home", label: "Gerar Sensi", icon: Gauge },
    { id: "auxilio", label: "Auxílio", icon: SlidersHorizontal },
    { id: "info", label: "Sobre", icon: CircleHelp },
    { id: "profile", label: "Conta", icon: UserRound },
  ];
  return <div className="app-shell rd-user-shell">
    <aside className="rd-sidebar">
      <div className="rd-sidebar-brand"><AppLogo /></div>
      <span className="rd-nav-label">NAVEGAÇÃO</span>
      <nav className="rd-user-nav" aria-label="Navegação principal">
        {nav.map(item => <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => onChangeView(item.id)}><item.icon size={17} /><span>{item.label}</span></button>)}
      </nav>
      <div className="rd-sidebar-foot">
        <div className="rd-account-block"><span>SESSÃO ATIVA</span><b>{String(session.username ?? "Usuário")}</b></div>
        <button type="button" className="rd-logout" onClick={onLogout}><LogOut size={16} /><span>Sair da conta</span></button>
      </div>
    </aside>
    <main className="app-main rd-user-main">{children}</main>
  </div>;
}
function PageHeading({ kicker, title, description, action }: { kicker: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="page-heading"><div><span className="eyebrow"><span className="eyebrow-dot" /> {kicker}</span><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

function GeneratorPage({ session }: { session: { username: string; planId: string; expiresAt: Date | string } }) {
  const [operatingSystem, setOperatingSystem] = useState<(typeof OPERATING_SYSTEMS)[number]>("android");
  const [device, setDevice] = useState(androidDevices[0]);
  const [performance, setPerformance] = useState<(typeof PERFORMANCE_LEVELS)[number]>("high");
  const [result, setResult] = useState<{ values: SensitivityValues; historyId: number } | null>(null);
  const generate = trpc.generator.generate.useMutation({ onSuccess: data => { setResult(data); toast.success("Sensibilidade gerada com sucesso"); }, onError: error => toast.error(error.message) });
  const favorite = trpc.generator.toggleFavorite.useMutation({ onSuccess: () => toast.success("Favoritos atualizados") });
  const devices = operatingSystem === "android" ? androidDevices : iosDevices;
  useEffect(() => setDevice(devices[0]), [operatingSystem]);
  const isFavorited = false;
  return <div className="page-view"><div className="topbar"><div><span className="topbar-kicker">PAINEL DE CONTROLE</span><h2>Olá, {session.username}<span className="wave">✦</span></h2></div><div className="topbar-actions"><div className="license-pill"><span className="online-dot" /> LICENÇA ATIVA <b>{formatExpiry(session.expiresAt)}</b></div><button className="icon-button" onClick={() => toast.info("Tudo sincronizado")} aria-label="Sincronizar"><RefreshCw size={17} /></button></div></div><section className="hero-panel"><div className="hero-copy"><img className="hero-brand-logo" src="/clean-sensi-logo.png" alt="Logo CLEAN SENSI" /><p>Ajuste os parâmetros abaixo e gere uma configuração pensada para o seu dispositivo.</p><div className="hero-meta"><span><BadgeCheck size={15} /> Configuração personalizada</span><span><Zap size={15} /> Resultado instantâneo</span></div></div><div className="hero-crosshair"><div className="crosshair-ring ring-one" /><div className="crosshair-ring ring-two" /><div className="crosshair-center"><Crosshair size={46} /></div><span className="cross-label label-top">PRECISÃO</span><span className="cross-label label-side">RBX / 01</span></div></section><div className="section-intro"><div><span className="step-index">01 — 03</span><h2>Configure seu setup</h2></div><p>Escolha o sistema, o aparelho e o nível de performance.</p></div><section className="config-grid"><div className="config-card"><div className="config-card-header"><div><span className="card-step">01</span><h3>Sistema operacional</h3></div><span className="config-status"><Check size={12} /> PRONTO</span></div><div className="os-options">{OPERATING_SYSTEMS.map(os => <button key={os} className={`os-option ${operatingSystem === os ? "selected" : ""}`} onClick={() => setOperatingSystem(os)}>{os === "android" ? <Smartphone size={28} /> : <Apple size={28} />}<span>{OS_LABELS[os]}</span>{operatingSystem === os && <b><Check size={13} /></b>}</button>)}</div></div><div className="config-card device-card"><div className="config-card-header"><div><span className="card-step">02</span><h3>Seu aparelho</h3></div><Search size={17} className="muted-icon" /></div><label className="select-shell"><Smartphone size={17} /><select value={device} onChange={event => setDevice(event.target.value)}>{devices.map(item => <option key={item}>{item}</option>)}</select><ChevronRight size={16} /></label><div className="device-detected"><span className="device-signal"><span /><span /><span /></span><span>Dispositivo detectado</span><b>HWID OK</b></div></div><div className="config-card performance-card"><div className="config-card-header"><div><span className="card-step">03</span><h3>Nível de performance</h3></div><Gauge size={17} className="muted-icon" /></div><div className="performance-options">{PERFORMANCE_LEVELS.map(level => <button key={level} className={`performance-option ${performance === level ? "selected" : ""}`} onClick={() => setPerformance(level)}><span className="performance-bars"><i /><i /><i /></span><span><b>{PERFORMANCE_LABELS[level]}</b><small>{level === "low" ? "Economia" : level === "medium" ? "Balanceado" : "Máximo"}</small></span></button>)}</div></div></section><div className="generate-row"><span><LockKeyhole size={14} /> Os dados são processados com segurança.</span><button className="primary-button generate-button" onClick={() => generate.mutate({ operatingSystem, device, performance })} disabled={generate.isPending}>{generate.isPending ? <><RefreshCw size={17} className="spin" /> GERANDO...</> : <><Sparkles size={17} /> GERAR SENSIBILIDADE <ChevronRight size={18} /></>}</button></div>{result && <ResultCard values={result.values} historyId={result.historyId} isFavorited={isFavorited} onFavorite={() => result.historyId && favorite.mutate({ historyId: result.historyId })} />}</div>;
}

function ResultCard({ values, historyId, isFavorited, onFavorite }: { values: SensitivityValues; historyId: number; isFavorited: boolean; onFavorite: () => void }) {
  const copyAll = async () => { await navigator.clipboard?.writeText(valueLabels.map(item => `${item.label}: ${values[item.key]}`).join("\n")); toast.success("Sensibilidade copiada"); };
  return <section className="result-card"><div className="result-header"><div><span className="tag tag-green"><BadgeCheck size={13} /> RESULTADO PRONTO</span><h2>Sensibilidade gerada</h2><p>Configuração salva no seu histórico · ID #{String(historyId).padStart(4, "0")}</p></div><div className="result-actions"><button className="ghost-button" onClick={copyAll}><Copy size={16} /> Copiar tudo</button><button className={`favorite-button ${isFavorited ? "active" : ""}`} onClick={onFavorite} aria-label="Favoritar"><Star size={19} fill={isFavorited ? "currentColor" : "none"} /></button></div></div><div className="values-grid">{valueLabels.map(item => <div className="value-item" key={item.key}><span className="value-icon">{item.icon}</span><span><b>{item.label}</b><small>sensibilidade</small></span><strong>{values[item.key]}</strong><button onClick={async () => { await navigator.clipboard?.writeText(String(values[item.key])); toast.success(`${item.label} copiado`); }} aria-label={`Copiar ${item.label}`}><Clipboard size={14} /></button></div>)}</div></section>;
}

function AuxilioPage() {
  const [tab, setTab] = useState<"aimbot" | "sensi" | "modules" | "injection">("aimbot");
  const [toggles, setToggles] = useState({ light: false, precise: false, stabilize: false, recoil: false, fine: false });
  const [injecting, setInjecting] = useState<string | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>(["[SISTEMA] Auxílio carregado com segurança."]);
  const [quickExit, setQuickExit] = useState(false);
  const toggle = (key: keyof typeof toggles) => setToggles(value => ({ ...value, [key]: !value[key] }));
  const inject = (mode: string) => {
    setInjecting(mode); setActive(null); setLogs(value => [...value, `[INFO] Preparando ${mode}...`]);
    window.setTimeout(() => { setInjecting(null); setActive(mode); setLogs(value => [...value, `[SUCESSO] ${mode} ativo e funcionando!`]); toast.success("Módulo ativado"); }, 1500);
  };
  const openGame = (mode: "normal" | "max") => {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const max = mode === "max";
    const androidPackage = max ? "com.dts.freefiremax" : "com.dts.freefireth";
    const storeUrl = ios ? `https://apps.apple.com/app/${max ? "free-fire-max/id1480516829" : "free-fire/id1300146617"}` : `https://play.google.com/store/apps/details?id=${androidPackage}`;
    const appUrl = ios ? "freefire://" : `intent://#Intent;scheme=freefire;package=${androidPackage};end`;
    let leftPage = false;
    const markHidden = () => { leftPage = true; };
    document.addEventListener("visibilitychange", markHidden, { once: true });
    window.location.href = appUrl;
    window.setTimeout(() => { if (!leftPage && document.visibilityState === "visible") window.location.href = storeUrl; }, 1400);
    setLogs(value => [...value, `[SISTEMA] Abrindo Free Fire ${max ? "MAX" : "Normal"}...`]);
  };
  const quickExitNow = () => {
    setQuickExit(true);
    window.setTimeout(() => {
      localStorage.removeItem("rbxis_session_token_v3");
      sessionStorage.clear();
      try { window.open("", "_self"); window.close(); } catch { /* navegadores podem bloquear o fechamento de abas */ }
      window.setTimeout(() => { if (document.visibilityState === "visible") window.location.replace("about:blank"); }, 120);
    }, 180);
  };
  const tabs: { id: "aimbot" | "sensi" | "modules" | "injection"; label: string; icon?: React.ElementType }[] = [
    { id: "aimbot", label: "AIMBOT", icon: Target },
    { id: "sensi", label: "OTIMIZAÇÃO", icon: ShieldCheck },
    { id: "modules", label: "MÓDULOS", icon: Grid3X3 },
    { id: "injection", label: "TERMUX CODES", icon: TerminalSquare },
  ];
  const titles = { aimbot: "AIMBOT", sensi: "OTIMIZAÇÃO", modules: "MÓDULOS", injection: "TERMUX CODES" };
  const descriptions = { aimbot: "Assistência e ajustes de precisão", sensi: "Escolha a plataforma e o perfil", modules: "Atalhos dos recursos do painel", injection: "Abrir Free Fire normal ou MAX" };
  const sectionNumber = String(tabs.findIndex(item => item.id === tab) + 1).padStart(2, "0");
  return <div className="page-view yx-aux-page">
    {quickExit && <div className="yx-bypass-overlay" role="status" aria-live="polite"><div className="yx-bypass-mark"><LogOut size={22} /></div><b>Saída rápida</b><span>Sessão encerrada neste site.</span></div>}
    <section className="yx-aux-window yx-aux-console">
      <header className="yx-aux-heading">
        <div className="yx-aux-heading-copy"><span>AUXILIO / DE MIRA</span><h1>CLEAN SENSI</h1><p>Ajuste por módulos, sem sair do painel.</p></div>
        <div className="yx-aux-heading-side"><span className="yx-aux-status"><i /> ONLINE</span><span className="yx-aux-mode-count"><b>00</b><small>CLEAN SENSI</small></span></div>
      </header>
      <nav className="yx-aux-tabs" aria-label="Seções do auxílio">
        {tabs.map(item => <button key={item.id} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}>{item.icon && <item.icon size={17} />}<span>{item.label}</span></button>)}
      </nav>
      <div className="yx-aux-title"><div><span>SEÇÃO {sectionNumber} / 04</span><h2>{titles[tab] === "AIMBOT" ? "AUXÍLIO DE MIRA" : titles[tab]}</h2><p>{descriptions[tab]}</p></div><div className="yx-aux-section-number" aria-hidden="true"><b>{sectionNumber}</b><small>/ 04</small></div></div>
      {tab === "aimbot" && <div className="aux-panel-list yx-aim-list">
        <AuxToggle label="Assistência de Mira Leve" description="Movimento suave e natural" value={toggles.light} onClick={() => toggle("light")} />
        <AuxToggle label="Assistência de Mira Precisa" description="Ajuste preciso da resposta" value={toggles.precise} onClick={() => toggle("precise")} />
        <AuxToggle label="Estabilização de Mira" description="Movimento mais consistente" value={toggles.stabilize} onClick={() => toggle("stabilize")} />
        <AuxToggle label="Controle de Recuo" description="Ajuste fino do controle" value={toggles.recoil} onClick={() => toggle("recoil")} />
        <AuxToggle label="Ajuste Fino de Precisão" description="Personalize o perfil de mira" value={toggles.fine} onClick={() => toggle("fine")} />
      </div>}
      {tab === "sensi" && <div className="aux-center-panel yx-performance-panel"><Gauge size={38} /><h2>Selecione seu celular</h2><p>Escolha a plataforma para continuar no gerador.</p><div className="aux-choice-row"><button onClick={() => toast.info("Dispositivo computado com sucesso!")}>iOS</button><button className="selected" onClick={() => toast.info("Dispositivo computado com sucesso!")}>Android</button></div></div>}
      {tab === "modules" && <div className="aux-module-grid yx-module-grid">
        <AuxModule name="Mira leve" active={toggles.light} onClick={() => toggle("light")} />
        <AuxModule name="Mira precisa" active={toggles.precise} onClick={() => toggle("precise")} />
        <AuxModule name="Estabilização" active={toggles.stabilize} onClick={() => toggle("stabilize")} />
        <AuxModule name="Controle de recuo" active={toggles.recoil} onClick={() => toggle("recoil")} />
        <AuxModule name="Ajuste fino" active={toggles.fine} onClick={() => toggle("fine")} />
        <button type="button" className="aux-module" onClick={quickExitNow}><span className="termux-code-icon" aria-hidden="true"><LogOut size={22} /></span><span><b>Bypass</b><small>Saída rápida</small></span><i><ChevronRight size={15} /></i></button>
      </div>}
      {tab === "injection" && <div className="aux-injection yx-injection"><div className="aux-action-row"><button onClick={() => { openGame("normal"); inject("FF NORMAL"); }} disabled={Boolean(injecting)}>ABRIR FF NORMAL</button><button onClick={() => { openGame("max"); inject("FF MAX"); }} disabled={Boolean(injecting)}>ABRIR FF MAX</button></div><div className={`aux-injection-state ${active ? "active" : ""}`}>{injecting ? <><RefreshCw className="spin" size={18} /> Preparando...</> : active ? <><span className="aux-green-dot" /> {active} pronto</> : "Escolha uma versão do jogo"}</div><div className="aux-console">{logs.map((log, index) => <div key={`${log}-${index}`} className={log.includes("SUCESSO") ? "success" : ""}><span>[{new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}]</span> {log}</div>)}</div></div>}
      <footer className="aux-footer">CLEAN SENSI <b> / PERFIL DE MIRA</b></footer>
    </section>
  </div>;
}
function AuxToggle({ label, description, value, onClick }: { label: string; description: string; value: boolean; onClick: () => void }) { return <button type="button" className="aux-toggle-row yx-aim-row" aria-pressed={value} onClick={onClick}><span className="termux-code-icon" aria-hidden="true"><Code2 size={22} /></span><span className="yx-aim-copy"><b>{label}</b><small>{description}</small></span><i className={value ? "on" : ""}><em /></i></button>; }
function AuxModule({ name, active, onClick }: { name: string; active: boolean; onClick: () => void }) { return <button className={`aux-module ${active ? "active" : ""}`} onClick={onClick}><span className="termux-code-icon" aria-hidden="true"><Code2 size={22} /></span><span><b>{name}</b><small>{active ? "Ativado" : "Toque para ativar"}</small></span><i>{active ? <Check size={14} /> : <ChevronRight size={15} />}</i></button>; }

function HistoryPage({ favoritesOnly = false }: { favoritesOnly?: boolean }) {
  const query = favoritesOnly ? trpc.generator.favorites.useQuery() : trpc.generator.history.useQuery();
  const favorite = trpc.generator.toggleFavorite.useMutation({ onSuccess: () => query.refetch() });
  const records = query.data ?? [];
  return <div className="page-view"><PageHeading kicker={favoritesOnly ? "COLEÇÃO PESSOAL" : "SEU ARQUIVO"} title={favoritesOnly ? "Favoritos" : "Histórico"} description={favoritesOnly ? "Suas configurações marcadas para acesso rápido." : "Todas as sensibilidades que você já gerou."} action={<button className="ghost-button desktop-action" onClick={() => query.refetch()}><RefreshCw size={16} /> Atualizar</button>} /><div className="list-toolbar"><span>{records.length} configuração{records.length === 1 ? "" : "ões"}</span><span className="toolbar-status"><span className="online-dot" /> SINCRONIZADO</span></div>{query.isLoading ? <LoadingList /> : records.length === 0 ? <EmptyState favoritesOnly={favoritesOnly} /> : <div className="history-list">{records.map(record => <div className="history-item" key={record.id}><div className={`history-os ${record.operatingSystem}`}>{record.operatingSystem === "android" ? <Smartphone size={20} /> : <Apple size={20} />}</div><div className="history-info"><div><b>Sensibilidade {record.device}</b><span>{OS_LABELS[record.operatingSystem]} · {PERFORMANCE_LABELS[record.performance]} · {formatDate(record.createdAt)}</span></div><span className="history-values">{record.general} <small>GERAL</small></span></div><button className={`favorite-button small ${record.favorite ? "active" : ""}`} onClick={() => favorite.mutate({ historyId: record.id })} aria-label="Favoritar"><Star size={17} fill={record.favorite ? "currentColor" : "none"} /></button><ChevronRight className="history-chevron" size={17} /></div>)}</div>}</div>;
}

function LoadingList() { return <div className="loading-list">{[1, 2, 3].map(item => <div key={item} className="skeleton-row"><span /><div><i /><i /></div></div>)}</div>; }
function EmptyState({ favoritesOnly }: { favoritesOnly: boolean }) { return <div className="empty-state"><div><History size={24} /></div><h3>{favoritesOnly ? "Nenhum favorito ainda" : "Seu histórico está vazio"}</h3><p>{favoritesOnly ? "Marque uma configuração com estrela para encontrá-la aqui." : "Gere sua primeira sensibilidade e ela aparecerá aqui."}</p></div>; }

function InfoPage() {
  return <div className="page-view">
    <PageHeading kicker="CLEAN SENSI" title="FEITO PARA OS FORTES." description="Precisão é detalhe. Controle é consistência." />
    <div className="about-layout">
      <section className="about-eye-banner" aria-label="Logo CLEAN SENSI">
        <img className="about-brand-logo" src="/clean-sensi-logo.png" alt="Logo CLEAN SENSI" />
      </section>
      <section className="contact-panel">
        <span className="card-step">PRECISA DE AJUDA?</span>
        <h3>Fale com a comunidade.</h3>
        <p>Entre no nosso Discord para receber suporte e acompanhar novidades.</p>
        <a className="contact-button" href="https://discord.gg/EDBtEVWpTM" target="_blank" rel="noreferrer"><span className="contact-letter">D</span><span><b>Entrar no Discord</b><small>Comunidade · suporte</small></span><ChevronRight size={17} /></a>
      </section>
    </div>
    <div className="quote-strip"><span>“</span><p>Deixo-vos a paz, a minha paz vos dou; não vo-la dou como o mundo a dá.</p><span>JOÃO 14:27</span></div>
  </div>;
}

function ProfilePage({ session, onLogout }: { session: { username: string; planId: string; expiresAt: Date | string; deviceId?: string | null }; onLogout: () => void }) {
  return <div className="page-view"><PageHeading kicker="SUA CONTA" title="Perfil & acesso" description="Gerencie os detalhes da sua licença." /><section className="profile-card"><div className="profile-main"><div className="profile-avatar">{String(session.username ?? "Usuário").slice(0, 1).toUpperCase()}</div><div><span className="tag tag-green"><BadgeCheck size={13} /> ACESSO ATIVO</span><h2>{session.username}</h2><p>Usuário desde 2026</p></div></div><div className="profile-grid"><div><span>PLANO ATUAL</span><b>{planName(session.planId)}</b><small>Licença individual</small></div><div><span>VALIDADE</span><b>{formatExpiry(session.expiresAt)}</b><small>até {formatDate(session.expiresAt)}</small></div><div><span>DISPOSITIVO</span><b>{session.deviceId ? "Vinculado" : "Pendente"}</b><small>HWID protegido</small></div></div></section><section className="security-card"><div className="security-icon"><LockKeyhole size={19} /></div><div><b>Seu acesso está protegido</b><p>Esta licença pode ser utilizada somente no primeiro dispositivo vinculado. Para trocar de aparelho, fale com o administrador.</p></div><BadgeCheck className="security-check" size={22} /></section><button className="logout-button" onClick={onLogout}><LogOut size={17} /> Sair da conta</button></div>;
}

function UserApp({ session, onLogout }: { session: { username: string; planId: string; expiresAt: Date | string; deviceId?: string | null }; onLogout: () => void }) {
  const [view, setView] = useState<View>("auxilio");
  useEffect(() => { navigator.serviceWorker?.register("/sw.js").catch(() => undefined); }, []);
  return <UserShell view={view} onChangeView={setView} session={session} onLogout={onLogout}>{view === "home" && <GeneratorPage session={session} />}{view === "auxilio" && <AuxilioPage />}{view === "info" && <InfoPage />}{view === "profile" && <ProfilePage session={session} onLogout={onLogout} />}</UserShell>;
}

function AdminShell({ children, view, onChangeView, onLogout }: { children: React.ReactNode; view: AdminView; onChangeView: (view: AdminView) => void; onLogout: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const go = (next: AdminView) => { onChangeView(next); setMenuOpen(false); };
  return <div className="admin-shell"><button className="admin-menu-button" onClick={() => setMenuOpen(value => !value)} aria-label="Abrir menu"><Menu size={20} /></button>{menuOpen && <div className="admin-menu-popover"><b>CLEADMIN00 ADMIN</b><button onClick={() => go("overview")}><Settings2 size={16} /> Config</button><button onClick={() => go("licenses")}><PackagePlus size={16} /> Gerenciar</button><button onClick={() => go("licenses")}><KeyRound size={16} /> Chaves</button></div>}<aside className="admin-sidebar"><div className="admin-logo"><AppLogo /><span className="admin-badge">ADMIN</span></div><div className="admin-nav"><span className="sidebar-section-label">CONTROLE</span><button className={view === "overview" ? "active" : ""} onClick={() => go("overview")}><LayoutDashboard size={18} /> Config</button><button className={view === "licenses" ? "active" : ""} onClick={() => go("licenses")}><KeyRound size={18} /> Chaves</button></div><div className="admin-sidebar-footer"><div className="admin-identity"><div className="admin-avatar"><Crown size={16} /></div><div><b>CLEADMIN00</b><span>Administrador</span></div></div><button className="sidebar-logout" onClick={onLogout}><LogOut size={16} /> Sair</button></div></aside><main className="admin-main"><header className="admin-topbar"><div className="admin-mobile-logo"><AppLogo compact /></div><div><span className="topbar-kicker">CONTROL CENTER</span><h2>Olá, CLEADMIN00 <Crown size={18} /></h2></div><div className="admin-top-actions"><span className="admin-online"><span className="online-dot" /> SISTEMA ONLINE</span><button className="icon-button" onClick={() => toast.info("Painel atualizado")}><RefreshCw size={17} /></button><button className="admin-mobile-exit" onClick={onLogout}><LogOut size={16} /></button></div></header>{children}</main></div>;
}

function AdminOverview({ onGoLicenses }: { onGoLicenses: () => void }) {
  const stats = trpc.admin.stats.useQuery();
  const licenses = trpc.admin.licenses.useQuery();
  const latest = licenses.data?.slice(0, 4) ?? [];
  return <div className="admin-content"><div className="admin-heading"><div><span className="eyebrow"><span className="eyebrow-dot" /> VISÃO GERAL</span><h1>Seu painel de controle.</h1><p>Monitore acessos, licenças e a saúde do seu produto em um só lugar.</p></div><button className="primary-button" onClick={onGoLicenses}><PackagePlus size={17} /> Criar acesso</button></div><div className="stats-grid"><AdminStat label="Total de usuários" value={stats.data?.total ?? 0} detail="acessos criados" icon={Users} tone="red" /><AdminStat label="Licenças ativas" value={stats.data?.active ?? 0} detail="em funcionamento" icon={BadgeCheck} tone="green" /><AdminStat label="Chaves revogadas" value={stats.data?.revoked ?? 0} detail="não podem acessar" icon={Ban} tone="gray" /><AdminStat label="Dispositivos vinculados" value={latest.filter(item => item.deviceId).length} detail="últimos acessos" icon={Smartphone} tone="purple" /></div><div className="admin-overview-grid"><section className="admin-panel-card quick-panel"><div className="panel-title"><div><span className="card-step">ATIVIDADE</span><h3>Últimos acessos</h3></div><button className="text-button" onClick={onGoLicenses}>Ver todos <ChevronRight size={14} /></button></div>{latest.length === 0 ? <EmptyAdmin /> : <div className="admin-recent-list">{latest.map(item => <div key={item.id} className="admin-recent"><div className="mini-avatar">{String(item.username ?? item.accessKey ?? "Usuário").slice(0, 1).toUpperCase()}</div><div><b>{item.username}</b><span>{planName(item.planId)} · {item.deviceId ? "Dispositivo vinculado" : "Aguardando primeiro login"}</span></div><StatusPill status={item.status} /></div>)}</div>}</section><section className="admin-panel-card health-panel"><div className="panel-title"><div><span className="card-step">SAÚDE DO SISTEMA</span><h3>Operação segura</h3></div><ShieldCheck className="green-icon" size={20} /></div><div className="health-score"><div className="health-circle">100<span>%</span></div><div><b>Tudo funcionando</b><p>Banco de dados, autenticação e gerador operacionais.</p></div></div><div className="health-lines"><span><i /> API de licenças <b>Online</b></span><span><i /> Vínculo por HWID <b>Ativo</b></span><span><i /> Sessões seguras <b>Ativo</b></span></div></section></div></div>;
}
function AdminStat({ label, value, detail, icon: Icon, tone }: { label: string; value: number; detail: string; icon: React.ElementType; tone: string }) { return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={19} /></div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>; }
function EmptyAdmin() { return <div className="admin-empty"><Users size={23} /><span>Nenhum acesso criado ainda.</span></div>; }
function StatusPill({ status }: { status: string }) { return <span className={`status-pill ${status}`}><i />{status === "active" ? "Ativa" : status === "blocked" ? "Bloqueada" : "Revogada"}</span>; }

function AdminLicenses() {
  const licenses = trpc.admin.licenses.useQuery();
  const stats = trpc.admin.stats.useQuery();
  const create = trpc.admin.createLicense.useMutation({ onSuccess: data => { setCreatedKey(data?.accessKey ?? ""); setFormOpen(false); licenses.refetch(); stats.refetch(); toast.success("Acesso criado com sucesso"); }, onError: error => toast.error(error.message) });
  const update = trpc.admin.updateLicense.useMutation({ onSuccess: () => { licenses.refetch(); stats.refetch(); toast.success("Licença atualizada"); }, onError: error => toast.error(error.message) });
  const revoke = trpc.admin.revokeLicense.useMutation({ onSuccess: () => { licenses.refetch(); stats.refetch(); toast.success("Chave revogada"); } });
  const remove = trpc.admin.deleteLicense.useMutation({ onSuccess: () => { licenses.refetch(); stats.refetch(); toast.success("Key excluída da MockAPI"); }, onError: error => toast.error(error.message) });
  const block = trpc.admin.blockLicense.useMutation({ onSuccess: () => { licenses.refetch(); stats.refetch(); toast.success("Usuário bloqueado"); } });
  const resetDevice = trpc.admin.resetDevice.useMutation({ onSuccess: () => { licenses.refetch(); toast.success("Vínculo de dispositivo resetado"); } });
  const resetAll = trpc.admin.resetAll.useMutation({ onSuccess: data => { licenses.refetch(); stats.refetch(); toast.success(`${data.count} keys excluídas da MockAPI`); }, onError: error => toast.error(error.message) });
  const [formOpen, setFormOpen] = useState(false);
  const [createdKey, setCreatedKey] = useState("");
  const [username, setUsername] = useState("");
  const [planId, setPlanId] = useState("weekly");
  const [durationValue, setDurationValue] = useState(30);
  const [durationUnit, setDurationUnit] = useState<(typeof DURATION_UNITS)[number]>("days");
  const [query, setQuery] = useState("");
  const allLicenses = licenses.data ?? [];
  const filtered = allLicenses.filter(item => String(item.username ?? item.accessKey ?? "").toLowerCase().includes(query.toLowerCase()) || String(item.accessKey ?? "").toLowerCase().includes(query.toLowerCase()));
  const copyAllKeys = async () => {
    const text = allLicenses.map(item => `${item.accessKey}${item.used || item.deviceId || item.lastLoginAt ? " (usada)" : ""}`).filter(Boolean).join("\n");
    if (!text) { toast.info("Não há keys para copiar"); return; }
    try { await copyToClipboard(text); toast.success(`${allLicenses.length} keys copiadas`); }
    catch { toast.error("Não foi possível copiar as keys"); }
  };
  const confirmResetAll = () => {
    const count = allLicenses.length;
    if (!count) { toast.info("Não há keys para excluir"); return; }
    if (window.confirm(`ATENÇÃO: isso excluirá permanentemente todas as ${count} keys da MockAPI. Essa ação não pode ser desfeita. Deseja continuar?`)) resetAll.mutate({ confirm: true });
  };
  const submit = (event: React.FormEvent) => { event.preventDefault(); create.mutate({ username, planId, durationValue, durationUnit }); };
  const handlePlanChange = (nextPlanId: string) => {
    setPlanId(nextPlanId);
    if (nextPlanId === "hourly") { setDurationValue(1); setDurationUnit("hours"); }
    else if (planId === "hourly") { setDurationValue(1); setDurationUnit("days"); }
  };
  return <div className="admin-content"><div className="admin-heading"><div><span className="eyebrow"><span className="eyebrow-dot" /> GESTÃO DE ACESSOS</span><h1>Licenças & usuários.</h1><p>Keys salvas na MockAPI: crie, revogue, bloqueie ou exclua permanentemente.</p></div><button className="primary-button" onClick={() => { setCreatedKey(""); setFormOpen(true); }}><PackagePlus size={17} /> Criar novo acesso</button></div>{createdKey && <div className="created-key-banner"><div className="notice-pulse"><KeyRound size={18} /></div><div><span>CHAVE GERADA · COPIE AGORA</span><b>{createdKey}</b></div><button onClick={async () => { try { await copyToClipboard(createdKey); toast.success("Chave copiada"); } catch { toast.error("Não foi possível copiar a chave"); } }}><Copy size={16} /> Copiar</button><button className="banner-close" onClick={() => setCreatedKey("")}><X size={16} /></button></div>}<div className="license-toolbar"><div className="search-shell"><Search size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar por usuário ou chave..." /></div><div className="license-toolbar-actions"><div className="toolbar-count"><b>{allLicenses.length}</b> keys totais · {filtered.length} encontradas</div><button type="button" className="license-action" onClick={copyAllKeys} disabled={licenses.isLoading || !allLicenses.length}><Clipboard size={15} /> Copiar all</button><button type="button" className="license-action reset" onClick={confirmResetAll} disabled={licenses.isLoading || resetAll.isPending || !allLicenses.length}><Trash2 size={15} /> {resetAll.isPending ? "Excluindo..." : "Reset all"}</button></div></div><div className="licenses-table"><div className="table-head"><span>USUÁRIO</span><span>PLANO</span><span>DISPOSITIVO</span><span>VALIDADE</span><span>STATUS</span><span>AÇÕES</span></div>{licenses.isLoading ? <LoadingList /> : filtered.length === 0 ? <EmptyAdmin /> : filtered.map(item => <div className="table-row" key={item.id}><div className="user-cell"><div className="mini-avatar">{String(item.username ?? item.accessKey ?? "Usuário").slice(0, 1).toUpperCase()}</div><div><b>{item.username}</b><span className="key-text">{item.accessKey}</span></div></div><div><select className="plan-select" value={item.planId} onChange={event => update.mutate({ id: item.id, planId: event.target.value })}>{PLAN_CATALOG.map(plan => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></div><div className="device-cell">{item.deviceId ? <><Smartphone size={15} /><span>Vinculado<br /><small>{String(item.deviceId).slice(0, 12)}...</small></span></> : <><Laptop size={15} /><span className="muted-text">Aguardando<br /><small>primeiro login</small></span></>}</div><div className="expiry-cell">{item.planId === "perm" ? <><b>Acesso permanente</b><span>sem expiração</span></> : !item.lastLoginAt ? <><b>Aguardando ativação</b><span>{item.planId === "hourly" ? "1 hora após o primeiro login" : "contagem a partir do primeiro login"}</span></> : <><b>{formatDate(item.expiresAt)}</b><span>{formatExpiry(item.expiresAt)}</span></>}</div><StatusPill status={item.status} /><div className="row-actions"><button type="button" title="Copiar chave" aria-label={`Copiar chave de ${item.username}`} onClick={async () => { try { await copyToClipboard(item.accessKey); toast.success("Chave copiada"); } catch { toast.error("Não foi possível copiar a chave"); } }}><Copy size={15} /></button><button title="Resetar dispositivo" onClick={() => resetDevice.mutate({ id: item.id })}><RotateCcw size={15} /></button><button title="Bloquear usuário" onClick={() => block.mutate({ id: item.id })}><Ban size={15} /></button><button title="Revogar chave" className="danger-action" onClick={() => revoke.mutate({ id: item.id })}><Trash2 size={15} /></button><button title="Excluir definitivamente da MockAPI" className="danger-action" onClick={() => { if (window.confirm("Excluir esta key da MockAPI definitivamente?")) remove.mutate({ id: item.id }); }}><X size={15} /></button></div></div>)}</div>{formOpen && <CreateLicenseModal username={username} setUsername={setUsername} planId={planId} setPlanId={handlePlanChange} durationValue={durationValue} setDurationValue={setDurationValue} durationUnit={durationUnit} setDurationUnit={setDurationUnit} onSubmit={submit} onClose={() => setFormOpen(false)} pending={create.isPending} />}</div>;
}

function PlanPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selected = PLAN_CATALOG.find(plan => plan.id === value) ?? PLAN_CATALOG[0];

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); triggerRef.current?.focus(); }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return <div className="plan-picker" ref={pickerRef}>
    <button ref={triggerRef} type="button" className="input-shell plan-picker-trigger" aria-haspopup="listbox" aria-expanded={open} aria-label={`Plano: ${selected.name} — ${selected.description}`} onClick={() => setOpen(current => !current)} onKeyDown={event => { if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); } }}>
      <Crown size={16} aria-hidden="true" /><span>{selected.name} — {selected.description}</span><ChevronRight className="plan-picker-chevron" size={16} aria-hidden="true" />
    </button>
    {open && <div className="plan-picker-options" role="listbox" aria-label="Opções de plano">
      {PLAN_CATALOG.map(plan => <button key={plan.id} type="button" role="option" aria-selected={value === plan.id} className={value === plan.id ? "selected" : ""} onClick={() => { onChange(plan.id); setOpen(false); triggerRef.current?.focus(); }}>
        <span><b>{plan.name}</b><small>{plan.description}</small></span>{value === plan.id && <Check size={17} aria-hidden="true" />}
      </button>)}
    </div>}
  </div>;
}

function CreateLicenseModal({ username, setUsername, planId, setPlanId, durationValue, setDurationValue, durationUnit, setDurationUnit, onSubmit, onClose, pending }: { username: string; setUsername: (value: string) => void; planId: string; setPlanId: (value: string) => void; durationValue: number; setDurationValue: (value: number) => void; durationUnit: (typeof DURATION_UNITS)[number]; setDurationUnit: (value: (typeof DURATION_UNITS)[number]) => void; onSubmit: (event: React.FormEvent) => void; onClose: () => void; pending: boolean }) {
  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><div className="modal-card create-license-modal"><div className="modal-heading"><div><span className="eyebrow"><span className="eyebrow-dot" /> NOVO ACESSO</span><h2>Criar uma licença.</h2></div><button className="icon-button" onClick={onClose}><X size={17} /></button></div><p className="modal-description">Escolha um usuário e o tempo de acesso. A chave aleatória será criada automaticamente.</p><form onSubmit={onSubmit} className="admin-form"><label><span>Nome de usuário</span><div className="input-shell"><UserRound size={16} /><input value={username} onChange={event => setUsername(event.target.value)} placeholder="ex: player_pro" required minLength={2} /></div></label><label><span>Plano</span><PlanPicker value={planId} onChange={setPlanId} /></label><div className="form-two"><label><span>Duração</span><div className="input-shell"><Clock3 size={16} /><input type="number" min={1} max={planId === "hourly" ? 1 : 3650} value={durationValue} onChange={event => setDurationValue(Number(event.target.value))} disabled={planId === "hourly"} required /></div></label><label><span>Unidade</span><div className="input-shell"><Globe2 size={16} /><select value={durationUnit} onChange={event => setDurationUnit(event.target.value as (typeof DURATION_UNITS)[number])} disabled={planId === "hourly"}>{DURATION_UNITS.filter(unit => planId === "hourly" ? unit === "hours" : unit !== "hours").map(unit => <option key={unit} value={unit}>{unit === "hours" ? "Horas" : unit === "days" ? "Dias" : unit === "weeks" ? "Semanas" : unit === "months" ? "Meses" : "Anos"}</option>)}</select></div></label></div><div className="modal-info"><ShieldCheck size={16} /><span>A chave só aparecerá neste painel administrativo. O usuário fará login com nome + chave.</span></div><div className="modal-actions"><button type="button" className="ghost-button" onClick={onClose}>Cancelar</button><button type="submit" className="primary-button" disabled={pending}>{pending ? <><RefreshCw size={16} className="spin" /> Criando...</> : <><KeyRound size={16} /> Criar e gerar chave</>}</button></div></form></div></div>;
}

function AdminApp({ onLogout }: { onLogout: () => void }) {
  const [view, setView] = useState<AdminView>("overview");
  return <AdminShell view={view} onChangeView={setView} onLogout={onLogout}>{view === "overview" ? <AdminOverview onGoLicenses={() => setView("licenses")} /> : <AdminLicenses />}</AdminShell>;
}

function ActivationNotice({ hwid, onClose }: { hwid: string; onClose: () => void }) {
  return <div className="activation-notice-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section className="activation-notice-card" role="dialog" aria-modal="true" aria-labelledby="activation-notice-title"><h2 id="activation-notice-title">LOGIN</h2><span className="activation-hwid-label">HWID</span><code>{hwid}</code><button type="button" onClick={onClose}><Grid3X3 size={16} /> Fechar</button></section></div>;
}

export default function Home() {
  const [activationHwid, setActivationHwid] = useState<string | null>(null);
  const me = trpc.auth.me.useQuery(undefined, { retry: false });
  const logout = trpc.auth.logout.useMutation({ onSuccess: () => { localStorage.removeItem("rbxis_session_token_v3"); localStorage.removeItem("rbxis_admin_mode_v3"); me.refetch(); window.location.reload(); } });
  const rawSession = me.data;
  const session = rawSession && rawSession.role && typeof rawSession.username === "string" && rawSession.username.trim() ? rawSession : null;
  useEffect(() => { if (!me.isLoading && !session) localStorage.removeItem("rbxis_session_token_v3"); }, [me.isLoading, session]);
  useEffect(() => {
    if (session?.role !== "user") return;
    const pendingHwid = localStorage.getItem(ACTIVATION_NOTICE_STORAGE_KEY);
    if (pendingHwid) {
      localStorage.removeItem(ACTIVATION_NOTICE_STORAGE_KEY);
      setActivationHwid(pendingHwid);
    }
  }, [session?.role]);
  const handleLogout = () => logout.mutate();
  const adminMode = localStorage.getItem("rbxis_admin_mode_v3") === "1" && Boolean(localStorage.getItem("rbxis_session_token_v3"));
  if (me.isLoading) return <LoadingScreen />;
  if (adminMode || session?.role === "admin") return <AdminApp onLogout={handleLogout} />;
  if (!session) return <LoginScreen />;
  return <><UserApp session={session} onLogout={handleLogout} />{activationHwid && <ActivationNotice hwid={activationHwid} onClose={() => setActivationHwid(null)} />}</>;
}

declare global {
  interface BeforeInstallPromptEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>; }
}
