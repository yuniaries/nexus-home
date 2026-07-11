import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BadgeInfo,
  Boxes,
  Check,
  ChevronRight,
  CircleAlert,
  Cloud,
  Code2,
  Copy,
  Download,
  Eye,
  EyeOff,
  Gauge,
  Github,
  GripVertical,
  Image,
  KeyRound,
  Laptop,
  Layers3,
  LayoutDashboard,
  Link2,
  ListRestart,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Mail,
  Menu,
  Monitor,
  MoonStar,
  Palette,
  PanelLeftClose,
  PanelRight,
  Plus,
  Radio,
  RefreshCw,
  RotateCcw,
  Save,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Tablet,
  TerminalSquare,
  Trash2,
  Upload,
  WandSparkles,
  Waves,
  X,
  Zap,
} from "lucide-react";
import defaultConfig from "../../config/default.json";
import { useSiteConfig } from "../config-context";

const sections = [
  { id: "identity", label: "身份与文案", note: "Identity", icon: BadgeInfo },
  { id: "appearance", label: "视觉系统", note: "Appearance", icon: Palette },
  { id: "effects", label: "动效实验室", note: "Motion Lab", icon: Waves },
  { id: "layout", label: "模块编排", note: "Layout", icon: LayoutDashboard },
  { id: "projects", label: "项目轨道", note: "Projects", icon: Boxes },
  { id: "links", label: "连接入口", note: "Links", icon: Link2 },
  { id: "metrics", label: "数据与能力", note: "Data", icon: Gauge },
  { id: "advanced", label: "高级控制", note: "Advanced", icon: Code2 },
  // { id: "advanced", label: "高级控制", note: "Advanced", icon: TerminalSquare },
];

const palettes = [
  { id: "abyss", name: "深海矩阵", colors: ["#63f3ff", "#8b7cff", "#54f7a8", "#050814", "#10182b"] },
  { id: "plasma", name: "等离子夜", colors: ["#ff70dc", "#8c72ff", "#ffb35c", "#09050f", "#1b1024"] },
  { id: "matrix", name: "翡翠终端", colors: ["#64ffb1", "#2ed4ff", "#d5ff6b", "#03100d", "#0c211b"] },
  { id: "solar", name: "日冕信号", colors: ["#ffca64", "#ff705d", "#70cfff", "#100a08", "#231713"] },
];

const iconChoices = [
  ["github", Github], ["notebook", TerminalSquare], ["mail", Mail], ["globe", Radio], ["terminal", Code2],
];

const countryOptions = [
  ["Afghanistan", "阿富汗", "Asia/Kabul"], ["Albania", "阿尔巴尼亚", "Europe/Tirane"], ["Algeria", "阿尔及利亚", "Africa/Algiers"], ["Argentina", "阿根廷", "America/Argentina/Buenos_Aires"], ["Armenia", "亚美尼亚", "Asia/Yerevan"], ["Australia", "澳大利亚", "Australia/Sydney"], ["Austria", "奥地利", "Europe/Vienna"], ["Azerbaijan", "阿塞拜疆", "Asia/Baku"],
  ["Bangladesh", "孟加拉国", "Asia/Dhaka"], ["Belarus", "白俄罗斯", "Europe/Minsk"], ["Belgium", "比利时", "Europe/Brussels"], ["Bolivia", "玻利维亚", "America/La_Paz"], ["Bosnia and Herzegovina", "波黑", "Europe/Sarajevo"], ["Brazil", "巴西", "America/Sao_Paulo"], ["Bulgaria", "保加利亚", "Europe/Sofia"], ["Cambodia", "柬埔寨", "Asia/Phnom_Penh"],
  ["Cameroon", "喀麦隆", "Africa/Douala"], ["Canada", "加拿大", "America/Toronto"], ["Chile", "智利", "America/Santiago"], ["China", "中国大陆", "Asia/Shanghai"], ["Colombia", "哥伦比亚", "America/Bogota"], ["Costa Rica", "哥斯达黎加", "America/Costa_Rica"], ["Croatia", "克罗地亚", "Europe/Zagreb"], ["Cuba", "古巴", "America/Havana"], ["Cyprus", "塞浦路斯", "Asia/Nicosia"], ["Czechia", "捷克", "Europe/Prague"],
  ["Denmark", "丹麦", "Europe/Copenhagen"], ["Dominican Republic", "多米尼加", "America/Santo_Domingo"], ["Ecuador", "厄瓜多尔", "America/Guayaquil"], ["Egypt", "埃及", "Africa/Cairo"], ["Estonia", "爱沙尼亚", "Europe/Tallinn"], ["Ethiopia", "埃塞俄比亚", "Africa/Addis_Ababa"], ["Finland", "芬兰", "Europe/Helsinki"], ["France", "法国", "Europe/Paris"], ["Georgia", "格鲁吉亚", "Asia/Tbilisi"], ["Germany", "德国", "Europe/Berlin"], ["Ghana", "加纳", "Africa/Accra"], ["Greece", "希腊", "Europe/Athens"],
  ["Hong Kong", "中国香港", "Asia/Hong_Kong"], ["Hungary", "匈牙利", "Europe/Budapest"], ["Iceland", "冰岛", "Atlantic/Reykjavik"], ["India", "印度", "Asia/Kolkata"], ["Indonesia", "印度尼西亚", "Asia/Jakarta"], ["Iran", "伊朗", "Asia/Tehran"], ["Iraq", "伊拉克", "Asia/Baghdad"], ["Ireland", "爱尔兰", "Europe/Dublin"], ["Israel", "以色列", "Asia/Jerusalem"], ["Italy", "意大利", "Europe/Rome"], ["Jamaica", "牙买加", "America/Jamaica"], ["Japan", "日本", "Asia/Tokyo"], ["Jordan", "约旦", "Asia/Amman"],
  ["Kazakhstan", "哈萨克斯坦", "Asia/Almaty"], ["Kenya", "肯尼亚", "Africa/Nairobi"], ["Kuwait", "科威特", "Asia/Kuwait"], ["Kyrgyzstan", "吉尔吉斯斯坦", "Asia/Bishkek"], ["Laos", "老挝", "Asia/Vientiane"], ["Latvia", "拉脱维亚", "Europe/Riga"], ["Lebanon", "黎巴嫩", "Asia/Beirut"], ["Libya", "利比亚", "Africa/Tripoli"], ["Lithuania", "立陶宛", "Europe/Vilnius"], ["Luxembourg", "卢森堡", "Europe/Luxembourg"], ["Macau", "中国澳门", "Asia/Macau"], ["Malaysia", "马来西亚", "Asia/Kuala_Lumpur"], ["Mexico", "墨西哥", "America/Mexico_City"], ["Moldova", "摩尔多瓦", "Europe/Chisinau"], ["Mongolia", "蒙古", "Asia/Ulaanbaatar"], ["Morocco", "摩洛哥", "Africa/Casablanca"], ["Myanmar", "缅甸", "Asia/Yangon"],
  ["Nepal", "尼泊尔", "Asia/Kathmandu"], ["Netherlands", "荷兰", "Europe/Amsterdam"], ["New Zealand", "新西兰", "Pacific/Auckland"], ["Nigeria", "尼日利亚", "Africa/Lagos"], ["North Korea", "朝鲜", "Asia/Pyongyang"], ["Norway", "挪威", "Europe/Oslo"], ["Pakistan", "巴基斯坦", "Asia/Karachi"], ["Palestine", "巴勒斯坦", "Asia/Gaza"], ["Panama", "巴拿马", "America/Panama"], ["Peru", "秘鲁", "America/Lima"], ["Philippines", "菲律宾", "Asia/Manila"], ["Poland", "波兰", "Europe/Warsaw"], ["Portugal", "葡萄牙", "Europe/Lisbon"], ["Puerto Rico", "波多黎各", "America/Puerto_Rico"],
  ["Qatar", "卡塔尔", "Asia/Qatar"], ["Romania", "罗马尼亚", "Europe/Bucharest"], ["Russia", "俄罗斯", "Europe/Moscow"], ["Saudi Arabia", "沙特阿拉伯", "Asia/Riyadh"], ["Serbia", "塞尔维亚", "Europe/Belgrade"], ["Singapore", "新加坡", "Asia/Singapore"], ["Slovakia", "斯洛伐克", "Europe/Bratislava"], ["Slovenia", "斯洛文尼亚", "Europe/Ljubljana"], ["South Africa", "南非", "Africa/Johannesburg"], ["South Korea", "韩国", "Asia/Seoul"], ["Spain", "西班牙", "Europe/Madrid"], ["Sri Lanka", "斯里兰卡", "Asia/Colombo"], ["Sweden", "瑞典", "Europe/Stockholm"], ["Switzerland", "瑞士", "Europe/Zurich"],
  ["Taiwan", "中国台湾", "Asia/Taipei"], ["Tajikistan", "塔吉克斯坦", "Asia/Dushanbe"], ["Thailand", "泰国", "Asia/Bangkok"], ["Tunisia", "突尼斯", "Africa/Tunis"], ["Turkey", "土耳其", "Europe/Istanbul"], ["Ukraine", "乌克兰", "Europe/Kyiv"], ["United Arab Emirates", "阿拉伯联合酋长国", "Asia/Dubai"], ["United Kingdom", "英国", "Europe/London"], ["United States", "美国", "America/New_York"], ["Uruguay", "乌拉圭", "America/Montevideo"], ["Uzbekistan", "乌兹别克斯坦", "Asia/Tashkent"], ["Venezuela", "委内瑞拉", "America/Caracas"], ["Vietnam", "越南", "Asia/Ho_Chi_Minh"], ["Yemen", "也门", "Asia/Aden"],
].map(([value, label, timeZone]) => ({ value, label, timeZone }));

const fallbackTimeZones = ["Etc/UTC", "Asia/Shanghai", "Asia/Hong_Kong", "Asia/Tokyo", "Asia/Singapore", "Asia/Kolkata", "Asia/Dubai", "Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Moscow", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "America/Toronto", "America/Sao_Paulo", "Australia/Sydney", "Pacific/Auckland"];
const timeZoneOptions = (typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : fallbackTimeZones).map((value) => ({ value, label: value }));

function utcOffset(timeZone) {
  try {
    const part = new Intl.DateTimeFormat("en", { timeZone, timeZoneName: "shortOffset" }).formatToParts().find((item) => item.type === "timeZoneName")?.value;
    return (part || "UTC").replace("GMT", "UTC");
  } catch {
    return "UTC";
  }
}

function parseLocation(location) {
  const [storedCountry = "", storedTimeZone = ""] = String(location || "").split(" · ");
  const country = countryOptions.find((item) => item.value === storedCountry) || countryOptions.find((item) => item.value === "Hong Kong");
  const timeZone = timeZoneOptions.some((item) => item.value === storedTimeZone) ? storedTimeZone : country.timeZone;
  return { country: country.value, timeZone };
}

function formatLocation(country, timeZone) {
  return `${country} · ${timeZone} · ${utcOffset(timeZone)}`;
}

function clone(value) {
  return typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function isPlainRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sameValue(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function hasStableIds(value) {
  return Array.isArray(value) && value.every((item) => isPlainRecord(item) && typeof item.id === "string");
}

function rebaseIdArray(base, local, remote) {
  const baseById = new Map(base.map((item) => [item.id, item]));
  const localById = new Map(local.map((item) => [item.id, item]));
  const remoteById = new Map(remote.map((item) => [item.id, item]));
  const mergedById = new Map(remote.map((item) => [item.id, clone(item)]));

  for (const item of base) {
    if (!localById.has(item.id)) mergedById.delete(item.id);
  }
  for (const localItem of local) {
    const baseItem = baseById.get(localItem.id);
    const remoteItem = remoteById.get(localItem.id);
    if (!baseItem) mergedById.set(localItem.id, clone(localItem));
    else if (remoteItem) mergedById.set(localItem.id, rebaseChanges(baseItem, localItem, remoteItem));
    else if (!sameValue(baseItem, localItem)) mergedById.set(localItem.id, clone(localItem));
  }

  const baseOrder = base.map((item) => item.id).filter((id) => localById.has(id));
  const localOrder = local.map((item) => item.id).filter((id) => baseById.has(id));
  const reordered = !sameValue(baseOrder, localOrder);
  const orderedIds = reordered
    ? [...local.map((item) => item.id), ...remote.map((item) => item.id).filter((id) => !localById.has(id))]
    : [...remote.map((item) => item.id), ...local.map((item) => item.id).filter((id) => !remoteById.has(id))];
  return orderedIds.filter((id, index) => orderedIds.indexOf(id) === index && mergedById.has(id)).map((id) => mergedById.get(id));
}

function rebaseChanges(base, local, remote) {
  if (sameValue(base, local)) return clone(remote);
  if (hasStableIds(base) && hasStableIds(local) && hasStableIds(remote)) return rebaseIdArray(base, local, remote);
  if (!isPlainRecord(base) || !isPlainRecord(local) || !isPlainRecord(remote)) return clone(local);

  const result = clone(remote);
  Object.keys(local).forEach((key) => {
    if (["revision", "updatedAt", "schemaVersion"].includes(key)) return;
    result[key] = rebaseChanges(base[key], local[key], remote[key]);
  });
  if ("schemaVersion" in remote) result.schemaVersion = remote.schemaVersion;
  if ("revision" in remote) result.revision = remote.revision;
  if ("updatedAt" in remote) result.updatedAt = remote.updatedAt;
  return result;
}

function createId(prefix) {
  const random = globalThis.crypto?.randomUUID?.();
  return `${prefix}-${random || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`}`;
}

function getByPath(object, path) {
  return path.split(".").reduce((value, key) => value?.[key], object);
}

function setByPath(object, path, value) {
  const next = clone(object);
  const keys = path.split(".");
  let target = next;
  keys.slice(0, -1).forEach((key) => {
    if (!target[key] || typeof target[key] !== "object") target[key] = {};
    target = target[key];
  });
  target[keys.at(-1)] = value;
  return next;
}

function TextField({ label, hint, value, onChange, multiline = false, type = "text", placeholder, wide = false }) {
  const Element = multiline ? "textarea" : "input";
  return (
    <label className={`field ${wide ? "field--wide" : ""}`}>
      <span className="field__label">{label}{hint && <small>{hint}</small>}</span>
      <Element type={multiline ? undefined : type} value={value ?? ""} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={multiline ? 4 : undefined} />
    </label>
  );
}

function SelectField({ label, hint, value, onChange, options, wide = false }) {
  return (
    <label className={`field ${wide ? "field--wide" : ""}`}>
      <span className="field__label">{label}{hint && <small>{hint}</small>}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function LocationTimeZoneFields({ value, onChange }) {
  const { country, timeZone } = parseLocation(value);
  const setCountry = (nextCountry) => {
    const option = countryOptions.find((item) => item.value === nextCountry);
    onChange(formatLocation(nextCountry, option?.timeZone || timeZone));
  };
  const setTimeZone = (nextTimeZone) => onChange(formatLocation(country, nextTimeZone));
  return <>
    <SelectField label="所在国家 / 地区" hint="覆盖全球主要国家和地区" value={country} onChange={setCountry} options={countryOptions} />
    <SelectField label="时区" hint="完整 IANA 时区库" value={timeZone} onChange={setTimeZone} options={timeZoneOptions} />
  </>;
}

function ColorField({ label, value, onChange }) {
  return (
    <label className="field color-field">
      <span className="field__label">{label}</span>
      <span className="color-control">
        <input type="color" value={value} onChange={(event) => onChange(event.target.value)} aria-label={`${label}颜色选择器`} />
        <i style={{ background: value }} />
        <input value={value} onChange={(event) => onChange(event.target.value)} maxLength={9} />
      </span>
    </label>
  );
}

function RangeField({ label, hint, value, min, max, step = 1, onChange, suffix = "" }) {
  const percent = ((Number(value) - min) / (max - min)) * 100;
  return (
    <label className="range-field">
      <span className="field__label">{label}{hint && <small>{hint}</small>}</span>
      <span className="range-control">
        <input type="range" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.target.value))} style={{ "--range-progress": `${percent}%` }} />
        <output>{value}{suffix}</output>
      </span>
    </label>
  );
}

function Toggle({ label, description, checked, onChange, icon: Icon = Zap }) {
  return (
    <label className={`toggle-card ${checked ? "is-active" : ""}`}>
      <span className="toggle-card__icon"><Icon size={18} /></span>
      <span><strong>{label}</strong><small>{description}</small></span>
      <input type="checkbox" checked={Boolean(checked)} onChange={(event) => onChange(event.target.checked)} />
      <i className="toggle-switch"><b /></i>
    </label>
  );
}

function EditorSection({ eyebrow, title, description, children, actions }) {
  return (
    <section className="editor-section">
      <header className="editor-section__header">
        <div><small>{eyebrow}</small><h2>{title}</h2><p>{description}</p></div>
        {actions && <div className="editor-section__actions">{actions}</div>}
      </header>
      {children}
    </section>
  );
}

function PanelBlock({ title, note, children, icon: Icon, className = "" }) {
  return (
    <div className={`panel-block ${className}`}>
      <div className="panel-block__heading">
        {Icon && <span><Icon size={16} /></span>}
        <div><strong>{title}</strong>{note && <small>{note}</small>}</div>
      </div>
      {children}
    </div>
  );
}

function SecretField({ label, value, onChange, placeholder, visible, onToggle, autoFocus = false, invalid = false, autoComplete, allowChineseComposition = false }) {
  return (
    <label className="login-field">
      <span>{label}</span>
      <div className={invalid ? "has-error" : ""}>
        <KeyRound size={17} />
        <input autoFocus={autoFocus} autoComplete={autoComplete} lang="zh-CN" inputMode="text" type={allowChineseComposition ? "text" : visible ? "text" : "password"} className={allowChineseComposition && !visible ? "secret-answer--masked" : undefined} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
        <button type="button" onClick={onToggle} aria-label={visible ? `隐藏${label}` : `显示${label}`}>{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button>
      </div>
    </label>
  );
}

function AuthGate({ mode = "login", recoveryQuestion = "", canRecover = false, onAuthenticated }) {
  const [screen, setScreen] = useState(mode);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [recoveryPrompt, setRecoveryPrompt] = useState("");
  const [recoveryAnswer, setRecoveryAnswer] = useState("");
  const [confirmRecoveryAnswer, setConfirmRecoveryAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [visible, setVisible] = useState({});
  const [status, setStatus] = useState("idle");
  const toggle = (key) => setVisible((current) => ({ ...current, [key]: !current[key] }));
  const update = (setter) => (value) => { setter(value); setStatus("idle"); };

  useEffect(() => {
    setScreen(mode);
    setStatus("idle");
    setPassword("");
    setConfirmPassword("");
    setRecoveryPrompt("");
    setRecoveryAnswer("");
    setConfirmRecoveryAnswer("");
    setNewPassword("");
    setConfirmNewPassword("");
    setVisible({});
  }, [mode, recoveryQuestion]);

  const isSetup = screen === "setup";
  const isRecover = screen === "recover";
  const recoveryAvailable = Boolean(recoveryQuestion.trim());

  const submit = async (event) => {
    event.preventDefault();
    if (isSetup && password !== confirmPassword) return setStatus("error");
    if (isSetup && (!recoveryPrompt.trim() || !recoveryAnswer.trim() || recoveryAnswer !== confirmRecoveryAnswer)) return setStatus("error");
    if (isRecover && (!recoveryAvailable || newPassword !== confirmNewPassword)) return setStatus("error");
    setStatus("loading");
    try {
      const response = await fetch(isRecover ? "/api/session/recover" : "/api/session", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isRecover ? { recoveryAnswer, newPassword } : isSetup ? { password, recoveryQuestion: recoveryPrompt, recoveryAnswer } : { password }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "认证失败");
      setStatus("success");
      window.setTimeout(() => onAuthenticated(result), 280);
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="login-shell">
      <div className="login-ambient"><i /><i /><i /></div>
      <div className="login-grid" />
      <form className="login-card" onSubmit={submit} lang="zh-CN">
        <div className="login-emblem"><span><LockKeyhole size={28} /></span><i /><i /><i /></div>
        <span className="login-kicker"><ShieldCheck size={14} /> {isSetup ? "INITIALIZE CONFIG CHANNEL" : isRecover ? "PASSWORD RECOVERY" : "SECURE CONFIG CHANNEL"}</span>
        <h1>{isSetup ? "设置第一个管理密码" : isRecover ? "找回并重置密码" : "进入配置中枢"}</h1>
        <p>{isSetup ? "这是第一次打开配置台，请先创建一个管理密码和密保问题。" : isRecover ? "回答已设置的密保问题后，你可以立刻重置新密码。" : "这个入口可以改变公开主页。请输入已设置的管理密码，建立一条安全会话。"}</p>

        {isRecover ? <>
          <label className="login-field"><span>SECURITY QUESTION</span><div className="login-readonly"><ShieldCheck size={16} /><input lang="zh-CN" value={recoveryQuestion} readOnly /></div></label>
          <SecretField label="RECOVERY ANSWER" value={recoveryAnswer} onChange={update(setRecoveryAnswer)} placeholder="输入密保答案" visible={visible.recoveryAnswer} onToggle={() => toggle("recoveryAnswer")} autoFocus invalid={status === "error"} autoComplete="off" allowChineseComposition />
          <SecretField label="NEW PASSWORD" value={newPassword} onChange={update(setNewPassword)} placeholder="输入新密码" visible={visible.newPassword} onToggle={() => toggle("newPassword")} invalid={status === "error"} autoComplete="new-password" />
          <SecretField label="CONFIRM NEW PASSWORD" value={confirmNewPassword} onChange={update(setConfirmNewPassword)} placeholder="再次输入新密码" visible={visible.confirmNewPassword} onToggle={() => toggle("confirmNewPassword")} invalid={status === "error"} autoComplete="new-password" />
        </> : <>
          <SecretField label={isSetup ? "NEW PASSWORD" : "ACCESS KEY"} value={password} onChange={update(setPassword)} placeholder={isSetup ? "输入管理密码" : "输入管理密码"} visible={visible.password} onToggle={() => toggle("password")} autoFocus invalid={status === "error"} autoComplete={isSetup ? "new-password" : "current-password"} />
          {isSetup && <>
            <SecretField label="CONFIRM PASSWORD" value={confirmPassword} onChange={update(setConfirmPassword)} placeholder="再次输入密码确认" visible={visible.confirmPassword} onToggle={() => toggle("confirmPassword")} invalid={status === "error"} autoComplete="new-password" />
            <label className="login-field"><span>SECURITY QUESTION</span><div className={status === "error" ? "has-error" : ""}><BadgeInfo size={17} /><input lang="zh-CN" inputMode="text" autoComplete="off" value={recoveryPrompt} onChange={(event) => update(setRecoveryPrompt)(event.target.value)} placeholder="例如：你最喜欢的城市？" /></div></label>
            <SecretField label="SECURITY ANSWER" value={recoveryAnswer} onChange={update(setRecoveryAnswer)} placeholder="输入密保答案" visible={visible.recoveryAnswer} onToggle={() => toggle("recoveryAnswer")} invalid={status === "error"} autoComplete="off" allowChineseComposition />
            <SecretField label="CONFIRM ANSWER" value={confirmRecoveryAnswer} onChange={update(setConfirmRecoveryAnswer)} placeholder="再次输入答案确认" visible={visible.confirmRecoveryAnswer} onToggle={() => toggle("confirmRecoveryAnswer")} invalid={status === "error"} autoComplete="off" allowChineseComposition />
          </>}
        </>}
        {status === "error" && <small className="login-error"><CircleAlert size={13} /> {isRecover ? "密保答案或新密码有误" : isSetup ? "请确认密码和密保信息" : "密码不正确，请重新确认"}</small>}
        <button className="login-submit" type="submit" disabled={status === "loading" || (isRecover ? !recoveryAvailable || !recoveryAnswer || !newPassword || !confirmNewPassword : !password)}>
          {status === "loading" ? <LoaderCircle className="spin" size={18} /> : status === "success" ? <Check size={18} /> : <ArrowRight size={18} />}
          <span>{status === "loading" ? (isSetup ? "正在创建" : isRecover ? "正在重置" : "正在验证") : status === "success" ? "通道已建立" : isSetup ? "创建密码" : isRecover ? "重置密码" : "解锁控制台"}</span>
        </button>
        {!isSetup && !isRecover && canRecover && <button className="login-link" type="button" onClick={() => setScreen("recover")}>忘记密码？使用密保重置</button>}
        {(isRecover || isSetup) && <button className="login-link" type="button" onClick={() => setScreen("login")}>返回登录</button>}
        <div className="login-foot"><span><i /> AES SESSION</span><span>{isSetup ? "PASSWORD + RECOVERY WILL BE STORED IN DATA DIR" : isRecover ? "RESETS PASSWORD AFTER ANSWER CHECK" : "PASSWORD STORED IN DATA DIR"}</span></div>
      </form>
      <a className="login-back" href="/"><ArrowLeft size={15} /> 返回主页</a>
    </div>
  );
}

function IdentityEditor({ draft, change }) {
  return (
    <EditorSection eyebrow="01 / IDENTITY" title="身份与叙事" description="定义访客进入主页后的第一印象。所有修改都会立即出现在右侧预览。">
      <PanelBlock title="核心标识" note="Brand signature" icon={BadgeInfo}>
        <div className="field-grid">
          <TextField label="品牌签名" hint="左上角标识" value={draft.identity.brand} onChange={(value) => change("identity.brand", value)} />
          <TextField label="头像字母" hint="建议 1–3 字符" value={draft.identity.avatarText} onChange={(value) => change("identity.avatarText", value.slice(0, 3))} />
          <TextField label="主名称" value={draft.identity.name} onChange={(value) => change("identity.name", value)} />
          <TextField label="角色 / 职能" value={draft.identity.role} onChange={(value) => change("identity.role", value)} />
          <TextField label="系统眉题" hint="小型英文标签" value={draft.identity.kicker} onChange={(value) => change("identity.kicker", value)} wide />
          <TextField label="在线状态" value={draft.identity.heroBadge} onChange={(value) => change("identity.heroBadge", value)} />
        </div>
      </PanelBlock>
      <PanelBlock title="主页文案" note="Narrative layer" icon={TerminalSquare}>
        <div className="field-grid">
          <TextField label="核心主张" value={draft.identity.tagline} onChange={(value) => change("identity.tagline", value)} wide />
          <TextField label="个人介绍" value={draft.identity.description} onChange={(value) => change("identity.description", value)} multiline wide />
          <TextField label="页尾引语" value={draft.identity.quote} onChange={(value) => change("identity.quote", value)} multiline wide />
        </div>
      </PanelBlock>
      <PanelBlock title="公开坐标" note="Contact vector" icon={Radio}>
        <div className="field-grid">
          <LocationTimeZoneFields value={draft.identity.location} onChange={(value) => change("identity.location", value)} />
          <TextField label="合作状态" value={draft.identity.availability} onChange={(value) => change("identity.availability", value)} />
          <TextField label="联系邮箱" type="email" value={draft.identity.email} onChange={(value) => change("identity.email", value)} wide />
        </div>
      </PanelBlock>
    </EditorSection>
  );
}

function AppearanceEditor({ draft, change, applyPalette }) {
  return (
    <EditorSection eyebrow="02 / APPEARANCE" title="视觉系统" description="调制光谱、玻璃材质和空间深度。配色会同时作用于海面、光晕与交互反馈。">
      <PanelBlock title="光谱预设" note="Curated palettes" icon={WandSparkles}>
        <div className="palette-grid">
          {palettes.map((palette) => (
            <button key={palette.id} type="button" className={draft.theme.preset === palette.id ? "is-selected" : ""} onClick={() => applyPalette(palette)}>
              <span>{palette.colors.slice(0, 4).map((color) => <i key={color} style={{ background: color }} />)}</span>
              <strong>{palette.name}</strong><small>{palette.id.toUpperCase()}</small>
              {draft.theme.preset === palette.id && <Check size={15} />}
            </button>
          ))}
        </div>
      </PanelBlock>
      <PanelBlock title="自定义光谱" note="Color channels" icon={Palette}>
        <div className="field-grid field-grid--colors">
          <ColorField label="主信号色" value={draft.theme.primary} onChange={(value) => change("theme.primary", value)} />
          <ColorField label="次信号色" value={draft.theme.secondary} onChange={(value) => change("theme.secondary", value)} />
          <ColorField label="强调色" value={draft.theme.accent} onChange={(value) => change("theme.accent", value)} />
          <ColorField label="背景色" value={draft.theme.background} onChange={(value) => change("theme.background", value)} />
          <ColorField label="玻璃底色" value={draft.theme.surface} onChange={(value) => change("theme.surface", value)} />
          <ColorField label="正文色" value={draft.theme.text} onChange={(value) => change("theme.text", value)} />
          <ColorField label="次级文字" value={draft.theme.muted} onChange={(value) => change("theme.muted", value)} />
        </div>
      </PanelBlock>
      <PanelBlock title="玻璃材质" note="Glass material" icon={Layers3}>
        <div className="range-grid">
          <RangeField label="玻璃不透明度" value={draft.theme.glassOpacity} min={0.12} max={0.9} step={0.01} onChange={(value) => change("theme.glassOpacity", value)} />
          <RangeField label="高斯模糊" value={draft.theme.blur} min={4} max={48} suffix="px" onChange={(value) => change("theme.blur", value)} />
          <RangeField label="卡片圆角" value={draft.theme.radius} min={8} max={42} suffix="px" onChange={(value) => change("theme.radius", value)} />
          <RangeField label="光晕强度" value={draft.theme.glow} min={0.1} max={1} step={0.01} onChange={(value) => change("theme.glow", value)} />
        </div>
      </PanelBlock>
    </EditorSection>
  );
}

function EffectsEditor({ draft, change }) {
  const toggles = [
    ["effects.motion", "全局动效", "控制入场、漂浮和扫描动画", Sparkles],
    ["effects.ocean", "深海曲面", "持续流动的海面线场", Waves],
    ["effects.ripples", "点击涟漪", "鼠标点击任意位置激起波澜", Radio],
    ["effects.particles", "空间粒子", "背景中的微型漂浮光点", Sparkles],
    ["effects.grid", "透视网格", "强化数字空间的纵深感", LayoutDashboard],
    ["effects.pointerGlow", "指针光场", "光晕会追随鼠标移动", Zap],
  ];
  return (
    <EditorSection eyebrow="03 / MOTION LAB" title="动效实验室" description="调整整个界面的生命感。系统会尊重访客设备上的“减少动态效果”设置。">
      <PanelBlock title="环境引擎" note="Realtime effects" icon={Sparkles}>
        <div className="toggle-grid">
          {toggles.map(([path, label, description, Icon]) => <Toggle key={path} label={label} description={description} checked={getByPath(draft, path)} onChange={(value) => change(path, value)} icon={Icon} />)}
        </div>
      </PanelBlock>
      <PanelBlock title="物理参数" note="Simulation controls" icon={SlidersHorizontal}>
        <div className="range-grid">
          <RangeField label="海浪强度" value={draft.effects.waveIntensity} min={0.1} max={1.5} step={0.01} onChange={(value) => change("effects.waveIntensity", value)} />
          <RangeField label="粒子密度" value={draft.effects.particleDensity} min={0} max={1} step={0.01} onChange={(value) => change("effects.particleDensity", value)} />
          <RangeField label="动效速度" value={draft.effects.motionSpeed} min={0.25} max={2} step={0.05} suffix="×" onChange={(value) => change("effects.motionSpeed", value)} />
        </div>
      </PanelBlock>
      <div className="info-banner"><ShieldCheck size={17} /><div><strong>自适应性能保护</strong><p>高密度画布会自动限制像素比例；系统检测到“减少动态效果”时，持续动画会暂停。</p></div></div>
    </EditorSection>
  );
}

function LayoutEditor({ draft, change }) {
  const modules = [
    ["layout.showMetrics", "关键数据轨", "Hero 下方的四格数字模块", Activity],
    ["layout.showProjects", "项目轨道", "主要项目与视觉化项目卡片", Boxes],
    ["layout.showCapabilities", "能力矩阵", "雷达图、能力值与构建频率", Gauge],
    ["layout.showClock", "实时坐标", "Hero 中的所在地和本地时钟", Cloud],
    ["layout.showActivity", "活动热力图", "近期构建活跃度显示", Zap],
    ["layout.showQuote", "页尾引语", "连接模块中的个性化表达", TerminalSquare],
  ];
  return (
    <EditorSection eyebrow="04 / LAYOUT" title="模块编排" description="控制首页的信息密度与模块可见性。即使关闭部分模块，响应式布局也会自动补位。">
      <PanelBlock title="信息密度" note="Spatial density" icon={PanelRight}>
        <div className="segmented-control segmented-control--large">
          {[["compact", "克制", "更多留白"], ["balanced", "均衡", "推荐"], ["rich", "丰富", "信息饱满"]].map(([value, label, note]) => (
            <button key={value} type="button" className={draft.layout.density === value ? "is-active" : ""} onClick={() => change("layout.density", value)}><strong>{label}</strong><small>{note}</small></button>
          ))}
        </div>
      </PanelBlock>
      <PanelBlock title="模块开关" note="Homepage modules" icon={LayoutDashboard}>
        <div className="toggle-grid">
          {modules.map(([path, label, description, Icon]) => <Toggle key={path} label={label} description={description} checked={getByPath(draft, path)} onChange={(value) => change(path, value)} icon={Icon} />)}
        </div>
      </PanelBlock>
    </EditorSection>
  );
}

function moveItem(list, index, direction) {
  const next = [...list];
  const target = index + direction;
  if (target < 0 || target >= next.length) return next;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function ProjectsEditor({ draft, updateArray }) {
  const add = () => updateArray("projects", [...draft.projects, {
    id: createId("project"),
    index: String(draft.projects.length + 1).padStart(2, "0"),
    title: "NEW MISSION",
    description: "描述这个项目正在解决的问题，以及它为何值得存在。",
    url: "#",
    status: "CONCEPT",
    tags: ["NEW"],
    color: draft.theme.primary,
    featured: false,
  }]);
  const update = (index, key, value) => updateArray("projects", draft.projects.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  const remove = (index) => updateArray("projects", draft.projects.filter((_, itemIndex) => itemIndex !== index));
  const move = (index, direction) => updateArray("projects", moveItem(draft.projects, index, direction));

  return (
    <EditorSection eyebrow="05 / PROJECTS" title="项目轨道" description="添加、排序和编辑首页项目。第一张标记为“重点”的项目会自动获得更大的视觉权重。" actions={<button className="button button--primary" type="button" onClick={add}><Plus size={16} /> 新建项目</button>}>
      <div className="collection-list">
        {draft.projects.map((project, index) => (
          <PanelBlock key={project.id} className="collection-card" title={`${String(index + 1).padStart(2, "0")} · ${project.title || "未命名项目"}`} note={project.status} icon={GripVertical}>
            <div className="collection-actions">
              <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="向上移动"><ArrowUp size={15} /></button>
              <button type="button" onClick={() => move(index, 1)} disabled={index === draft.projects.length - 1} aria-label="向下移动"><ArrowDown size={15} /></button>
              <button type="button" className="danger" onClick={() => remove(index)} aria-label="删除项目"><Trash2 size={15} /></button>
            </div>
            <div className="field-grid">
              <TextField label="项目名称" value={project.title} onChange={(value) => update(index, "title", value)} />
              <TextField label="状态" value={project.status} onChange={(value) => update(index, "status", value)} />
              <TextField label="项目链接" value={project.url} onChange={(value) => update(index, "url", value)} wide />
              <TextField label="项目简介" value={project.description} onChange={(value) => update(index, "description", value)} multiline wide />
              <TextField label="标签" hint="用逗号分隔" value={(project.tags || []).join(", ")} onChange={(value) => update(index, "tags", value.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 6))} />
              <ColorField label="项目信号色" value={project.color} onChange={(value) => update(index, "color", value)} />
            </div>
            <label className="inline-check"><input type="checkbox" checked={Boolean(project.featured)} onChange={(event) => update(index, "featured", event.target.checked)} /><i><Check size={12} /></i><span>作为重点项目展示</span></label>
          </PanelBlock>
        ))}
      </div>
      {!draft.projects.length && <div className="empty-state"><Boxes size={28} /><strong>项目轨道还是空的</strong><p>添加第一个项目，让主页开始讲述你的工作。</p><button className="button button--primary" type="button" onClick={add}><Plus size={16} /> 添加项目</button></div>}
    </EditorSection>
  );
}

function LinksEditor({ draft, updateArray }) {
  const add = () => updateArray("links", [...draft.links, { id: createId("link"), label: "New link", description: "A new connection", url: "#", icon: "globe" }]);
  const update = (index, key, value) => updateArray("links", draft.links.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  return (
    <EditorSection eyebrow="06 / LINKS" title="连接入口" description="管理页尾的外部入口。建议保持 3–5 个高质量链接，让选择清晰而有重量。" actions={<button className="button button--primary" type="button" onClick={add}><Plus size={16} /> 添加入口</button>}>
      <div className="link-editor-grid">
        {draft.links.map((link, index) => (
          <PanelBlock key={link.id} className="link-editor-card" title={link.label || "未命名入口"} note={`LINK 0${index + 1}`} icon={Link2}>
            <button className="card-delete" type="button" onClick={() => updateArray("links", draft.links.filter((_, itemIndex) => itemIndex !== index))} aria-label="删除入口"><Trash2 size={15} /></button>
            <div className="field-grid">
              <TextField label="显示名称" value={link.label} onChange={(value) => update(index, "label", value)} />
              <TextField label="简短说明" value={link.description} onChange={(value) => update(index, "description", value)} />
              <TextField label="目标地址" value={link.url} onChange={(value) => update(index, "url", value)} wide />
            </div>
            <div className="icon-picker"><span>图标</span><div>{iconChoices.map(([name, Icon]) => <button key={name} type="button" className={link.icon === name ? "is-active" : ""} onClick={() => update(index, "icon", name)} aria-label={name}><Icon size={17} /></button>)}</div></div>
          </PanelBlock>
        ))}
      </div>
    </EditorSection>
  );
}

function MetricsEditor({ draft, updateArray, change }) {
  const updateMetric = (index, key, value) => updateArray("metrics", draft.metrics.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  const updateCapability = (index, key, value) => updateArray("capabilities", draft.capabilities.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  return (
    <EditorSection eyebrow="07 / DATA" title="数据与能力" description="把抽象能力变成可扫描的信号。数据可以是实际统计，也可以是你希望传达的能力坐标。">
      <PanelBlock title="关键数据轨" note="Hero metrics" icon={Activity}>
        <div className="metric-editor-grid">
          {draft.metrics.map((metric, index) => (
            <div className="metric-editor" key={metric.id}><span>0{index + 1}</span><TextField label="名称" value={metric.label} onChange={(value) => updateMetric(index, "label", value)} /><div className="metric-value-fields"><TextField label="数值" value={metric.value} onChange={(value) => updateMetric(index, "value", value)} /><TextField label="单位" value={metric.suffix} onChange={(value) => updateMetric(index, "suffix", value)} /></div><TextField label="趋势说明" value={metric.trend} onChange={(value) => updateMetric(index, "trend", value)} /></div>
          ))}
        </div>
      </PanelBlock>
      <PanelBlock title="能力矩阵" note="Radar vectors" icon={Gauge}>
        <div className="capability-editor-list">
          {draft.capabilities.map((item, index) => (
            <div key={item.id} className="capability-editor-row"><span className="capability-color"><input type="color" value={item.color} onChange={(event) => updateCapability(index, "color", event.target.value)} /><i style={{ background: item.color }} /></span><input value={item.label} onChange={(event) => updateCapability(index, "label", event.target.value)} /><RangeField label="强度" value={item.value} min={0} max={100} suffix="%" onChange={(value) => updateCapability(index, "value", value)} /></div>
          ))}
        </div>
      </PanelBlock>
      <PanelBlock title="构建频率" note="Activity module" icon={Zap}>
        <div className="field-grid">
          <TextField label="模块标题" value={draft.activity.label} onChange={(value) => change("activity.label", value)} wide />
          <TextField label="活跃天数" type="number" value={draft.activity.activeDays} onChange={(value) => change("activity.activeDays", Number(value))} />
          <TextField label="连续天数" type="number" value={draft.activity.streak} onChange={(value) => change("activity.streak", Number(value))} />
          <RangeField label="信号强度" value={draft.activity.signal} min={0} max={100} suffix="%" onChange={(value) => change("activity.signal", value)} />
        </div>
      </PanelBlock>
    </EditorSection>
  );
}

function AdvancedEditor({ draft, replaceDraft, exportConfig, resetConfig }) {
  const [json, setJson] = useState(() => JSON.stringify(draft, null, 2));
  const [jsonStatus, setJsonStatus] = useState("idle");
  const fileRef = useRef(null);
  useEffect(() => setJson(JSON.stringify(draft, null, 2)), [draft.revision]);

  const applyJson = () => {
    try {
      const parsed = JSON.parse(json);
      replaceDraft(parsed);
      setJsonStatus("success");
      window.setTimeout(() => setJsonStatus("idle"), 1600);
    } catch {
      setJsonStatus("error");
    }
  };
  const importFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        replaceDraft(parsed);
        setJson(JSON.stringify(parsed, null, 2));
        setJsonStatus("success");
      } catch { setJsonStatus("error"); }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  return (
    <EditorSection eyebrow="08 / ADVANCED" title="高级控制" description="导入、导出或直接编辑完整配置。应用前会在服务端进行结构与大小校验。">
      <div className="advanced-actions">
        <button className="utility-card" type="button" onClick={exportConfig}><span><Download size={19} /></span><div><strong>导出快照</strong><small>下载当前 JSON 配置</small></div><ChevronRight size={16} /></button>
        <button className="utility-card" type="button" onClick={() => fileRef.current?.click()}><span><Upload size={19} /></span><div><strong>导入配置</strong><small>从本地 JSON 恢复</small></div><ChevronRight size={16} /></button>
        <button className="utility-card utility-card--danger" type="button" onClick={resetConfig}><span><RotateCcw size={19} /></span><div><strong>恢复默认</strong><small>重置所有主页内容</small></div><ChevronRight size={16} /></button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importFile} />
      </div>
      <PanelBlock title="配置源代码" note={`SCHEMA V${draft.schemaVersion || 1}`} icon={Code2} className="code-panel">
        <div className="code-toolbar"><span><i /><i /><i /> config.json</span><button type="button" onClick={() => navigator.clipboard?.writeText(json)}><Copy size={14} /> 复制</button></div>
        <textarea spellCheck="false" value={json} onChange={(event) => { setJson(event.target.value); setJsonStatus("idle"); }} />
        <div className="code-footer">
          <span className={jsonStatus === "error" ? "has-error" : jsonStatus === "success" ? "has-success" : ""}>{jsonStatus === "error" ? <><CircleAlert size={14} /> JSON 格式有误</> : jsonStatus === "success" ? <><Check size={14} /> 已应用并同步</> : <><ShieldCheck size={14} /> 修改只会作用于允许的配置字段</>}</span>
          <button className="button button--primary" type="button" onClick={applyJson}><Code2 size={15} /> 应用 JSON</button>
        </div>
      </PanelBlock>
      <div className="info-banner info-banner--warning"><CircleAlert size={17} /><div><strong>安全边界</strong><p>主页不会执行配置中的 HTML、CSS 或 JavaScript；链接协议与字段长度也会由服务端过滤。</p></div></div>
    </EditorSection>
  );
}

function PreviewPane({ draft, device, setDevice, previewRef, collapsed, setCollapsed }) {
  const widths = { desktop: "100%", tablet: "820px", mobile: "390px" };
  return (
    <aside className={`preview-pane ${collapsed ? "is-collapsed" : ""}`}>
      <div className="preview-toolbar">
        <div><span className="preview-live"><i /> LIVE PREVIEW</span><small>输入即预览 · 保存后广播</small></div>
        <div className="device-switcher">
          <button type="button" className={device === "desktop" ? "is-active" : ""} onClick={() => setDevice("desktop")} aria-label="桌面预览"><Monitor size={15} /></button>
          <button type="button" className={device === "tablet" ? "is-active" : ""} onClick={() => setDevice("tablet")} aria-label="平板预览"><Tablet size={15} /></button>
          <button type="button" className={device === "mobile" ? "is-active" : ""} onClick={() => setDevice("mobile")} aria-label="手机预览"><Smartphone size={15} /></button>
        </div>
        <div className="preview-actions">
          <button type="button" onClick={() => { if (previewRef.current) previewRef.current.src = `/?embedded=1&t=${Date.now()}`; }} aria-label="刷新预览"><RefreshCw size={15} /></button>
          <a href="/" target="_blank" aria-label="新窗口打开主页"><ArrowRight size={15} /></a>
          <button type="button" onClick={() => setCollapsed(true)} aria-label="收起预览"><PanelLeftClose size={15} /></button>
        </div>
      </div>
      <div className="preview-stage" data-device={device}>
        <div className="preview-browser" style={{ width: widths[device] }}>
          <div className="preview-browser__chrome"><span><i /><i /><i /></span><div><LockKeyhole size={11} /><span>{window.location.host}</span></div><RefreshCw size={12} /></div>
          <iframe ref={previewRef} src="/?embedded=1" title="主页实时预览" />
        </div>
      </div>
      <div className="preview-meta"><span>REV {draft.revision}</span><span>{device.toUpperCase()} VECTOR</span></div>
    </aside>
  );
}

function SaveIndicator({ status, revision }) {
  const states = {
    idle: [Cloud, `修订版 ${revision}`],
    dirty: [LoaderCircle, "等待同步"],
    saving: [LoaderCircle, "正在同步"],
    saved: [Check, "已同步到主页"],
    error: [CircleAlert, "同步失败"],
    conflict: [RefreshCw, "已合并远端版本"],
  };
  const [Icon, label] = states[status] || states.idle;
  return <span className={`save-indicator is-${status}`}><Icon size={14} className={status === "saving" || status === "dirty" ? "spin" : ""} />{label}</span>;
}

export function ConfigPage() {
  const { config, connection, setConfig, mergeConfig } = useSiteConfig();
  const [draft, setDraft] = useState(() => clone(config));
  const [activeSection, setActiveSection] = useState("identity");
  const [device, setDevice] = useState("desktop");
  const [previewCollapsed, setPreviewCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [auth, setAuth] = useState({ loading: true, required: false, setupRequired: false, recoveryRequired: false, recoveryQuestion: "", authenticated: false });
  const saveTimer = useRef(null);
  const latestDraft = useRef(draft);
  const previewRef = useRef(null);
  const editingRef = useRef(false);
  const savingRef = useRef(false);
  const pendingRef = useRef(null);
  const baseConfigRef = useRef(clone(config));
  const latestRemoteRef = useRef(clone(config));

  useEffect(() => {
    fetch("/api/session", { credentials: "same-origin" })
      .then((response) => response.json())
      .then((data) => {
        const required = Boolean(data.passwordRequired ?? data.required);
        const setupRequired = Boolean(data.setupRequired);
        const recoveryRequired = Boolean(data.recoveryRequired);
        const recoveryQuestion = typeof data.recoveryQuestion === "string" ? data.recoveryQuestion : "";
        setAuth({ loading: false, required, setupRequired, recoveryRequired, recoveryQuestion, authenticated: Boolean(data.authenticated) });
      })
      .catch(() => setAuth({ loading: false, required: true, setupRequired: false, recoveryRequired: false, recoveryQuestion: "", authenticated: false }));
  }, []);

  useEffect(() => {
    if (
      !editingRef.current ||
      Number(config.revision) > Number(latestRemoteRef.current.revision)
    ) latestRemoteRef.current = clone(config);
    if (!editingRef.current && !sameValue(config, draft)) {
      setDraft(clone(config));
      latestDraft.current = clone(config);
      baseConfigRef.current = clone(config);
    }
  }, [config, draft]);

  const postPreview = useCallback((next) => {
    previewRef.current?.contentWindow?.postMessage({ type: "nexus:preview", config: next }, window.location.origin);
  }, []);

  const persist = useCallback(async (next) => {
    if (savingRef.current) {
      pendingRef.current = next;
      return;
    }
    savingRef.current = true;
    setSaveStatus("saving");
    try {
      const expectedRevision = Number(baseConfigRef.current.revision) || 1;
      const payload = { ...next, revision: expectedRevision };
      const response = await fetch("/api/config", {
        method: "PUT",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "If-Match": String(expectedRevision),
        },
        body: JSON.stringify(payload),
      });
      if (response.status === 401) {
        setAuth((value) => ({ ...value, authenticated: false, required: true }));
        const error = new Error("session expired");
        error.status = 401;
        throw error;
      }
      const data = await response.json().catch(() => null);
      if (response.status === 409) {
        const remote = mergeConfig(data?.config || data);
        const local = pendingRef.current || latestDraft.current;
        pendingRef.current = null;
        const rebased = rebaseChanges(baseConfigRef.current, local, remote);
        baseConfigRef.current = clone(remote);
        setDraft(rebased);
        latestDraft.current = rebased;
        setConfig(remote);
        setSaveStatus("conflict");
        savingRef.current = false;
        window.setTimeout(() => persist(rebased), 120);
        return;
      }
      if (!response.ok) {
        const error = new Error(data?.error || "save failed");
        error.status = response.status;
        throw error;
      }
      const saved = mergeConfig(data?.config || data);
      const committed = Number(latestRemoteRef.current.revision) > Number(saved.revision)
        ? latestRemoteRef.current
        : saved;
      baseConfigRef.current = clone(committed);
      setConfig(committed);
      const pending = pendingRef.current;
      pendingRef.current = null;
      savingRef.current = false;
      if (pending) {
        const rebased = rebaseChanges(payload, pending, committed);
        setDraft(rebased);
        latestDraft.current = rebased;
        postPreview(rebased);
        setSaveStatus("dirty");
        window.setTimeout(() => persist(rebased), 60);
      } else {
        setDraft(committed);
        latestDraft.current = committed;
        setSaveStatus("saved");
        editingRef.current = false;
        window.setTimeout(() => setSaveStatus("idle"), 1800);
      }
    } catch (error) {
      savingRef.current = false;
      pendingRef.current = null;
      setSaveStatus("error");
      if (!error?.status && editingRef.current) {
        window.setTimeout(() => persist(latestDraft.current), 1000);
      }
    }
  }, [mergeConfig, postPreview, setConfig]);

  const queueSave = useCallback((next) => {
    latestDraft.current = next;
    editingRef.current = true;
    if (savingRef.current) pendingRef.current = next;
    setSaveStatus("dirty");
    setConfig(mergeConfig(next));
    postPreview(next);
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => persist(latestDraft.current), 360);
  }, [mergeConfig, persist, postPreview, setConfig]);

  useEffect(() => () => window.clearTimeout(saveTimer.current), []);

  const replaceDraft = useCallback((nextValue) => {
    const next = mergeConfig(nextValue);
    next.revision = draft.revision;
    setDraft(next);
    queueSave(next);
  }, [draft.revision, mergeConfig, queueSave]);

  const change = useCallback((path, value) => {
    const next = setByPath(latestDraft.current, path, value);
    setDraft(next);
    queueSave(next);
  }, [queueSave]);

  const updateArray = useCallback((key, value) => {
    const next = { ...latestDraft.current, [key]: value };
    setDraft(next);
    queueSave(next);
  }, [queueSave]);

  const applyPalette = (palette) => {
    const [primary, secondary, accent, background, surface] = palette.colors;
    const current = latestDraft.current;
    const next = { ...current, theme: { ...current.theme, preset: palette.id, primary, secondary, accent, background, surface } };
    setDraft(next);
    queueSave(next);
  };

  const exportConfig = () => {
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `nexus-config-rev-${draft.revision}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const resetConfig = () => {
    if (!window.confirm("确定恢复默认配置？当前内容会被默认值替换。")) return;
    replaceDraft({ ...clone(defaultConfig), revision: draft.revision });
  };

  const logout = async () => {
    await fetch("/api/session", { method: "DELETE", credentials: "same-origin" }).catch(() => {});
    setAuth((value) => ({ ...value, authenticated: false }));
  };

  const activeMeta = sections.find((item) => item.id === activeSection) || sections[0];
  const editor = useMemo(() => {
    const props = { draft, change, updateArray };
    switch (activeSection) {
      case "identity": return <IdentityEditor {...props} />;
      case "appearance": return <AppearanceEditor {...props} applyPalette={applyPalette} />;
      case "effects": return <EffectsEditor {...props} />;
      case "layout": return <LayoutEditor {...props} />;
      case "projects": return <ProjectsEditor {...props} />;
      case "links": return <LinksEditor {...props} />;
      case "metrics": return <MetricsEditor {...props} />;
      case "advanced": return <AdvancedEditor draft={draft} replaceDraft={replaceDraft} exportConfig={exportConfig} resetConfig={resetConfig} />;
      default: return null;
    }
  }, [activeSection, draft, change, updateArray]);

  if (auth.loading) return <div className="config-loading"><div className="config-loader"><i /><i /><i /></div><span>ESTABLISHING CONFIG CHANNEL</span></div>;
  if (auth.setupRequired) return <AuthGate mode="setup" onAuthenticated={(result) => setAuth((value) => ({ ...value, authenticated: true, setupRequired: false, required: true, recoveryRequired: true, recoveryQuestion: result?.recoveryQuestion || value.recoveryQuestion }))} />;
  if (auth.required && !auth.authenticated) return <AuthGate mode="login" canRecover={auth.recoveryRequired} recoveryQuestion={auth.recoveryQuestion} onAuthenticated={(result) => setAuth((value) => ({ ...value, authenticated: true, recoveryRequired: Boolean(result?.recoveryRequired ?? value.recoveryRequired), recoveryQuestion: result?.recoveryQuestion || value.recoveryQuestion }))} />;

  return (
    <div className="config-shell">
      <header className="config-header">
        <div className="config-header__brand"><button type="button" className="sidebar-mobile-trigger" onClick={() => setSidebarOpen(true)}><Menu size={18} /></button><a href="/"><span className="config-logo"><i /><i /><i /></span><div><strong>NEXUS / CONTROL</strong><small>REALTIME CONFIGURATION SYSTEM</small></div></a></div>
        <div className="config-header__center"><span className={`server-status is-${connection}`}><i />{connection === "live" ? "LIVE CHANNEL" : connection.toUpperCase()}</span><span>REVISION {draft.revision}</span></div>
        <div className="config-header__actions">
          <SaveIndicator status={saveStatus} revision={draft.revision} />
          <a href="/" target="_blank"><Eye size={15} /><span>查看主页</span></a>
          {auth.required && <button type="button" onClick={logout} aria-label="退出配置会话"><LogOut size={15} /></button>}
        </div>
      </header>

      <div className="config-workspace">
        <aside className={`config-sidebar ${sidebarOpen ? "is-open" : ""}`}>
          <div className="sidebar-mobile-head"><strong>CONFIG MODULES</strong><button type="button" onClick={() => setSidebarOpen(false)}><X size={18} /></button></div>
          <div className="sidebar-context"><span>ACTIVE HOME</span><strong>{draft.identity.name}</strong><small>{draft.identity.role}</small></div>
          <nav aria-label="配置分区">
            <small>CONFIGURATION</small>
            {sections.map((section, index) => {
              const Icon = section.icon;
              return <button key={section.id} type="button" className={activeSection === section.id ? "is-active" : ""} onClick={() => { setActiveSection(section.id); setSidebarOpen(false); }}><span><Icon size={17} /></span><div><strong>{section.label}</strong><small>{section.note}</small></div><em>0{index + 1}</em><ChevronRight size={14} /></button>;
            })}
          </nav>
          <div className="sidebar-tools"><small>QUICK ACTIONS</small><button type="button" onClick={exportConfig}><Download size={15} /> 导出配置</button><button type="button" onClick={resetConfig}><ListRestart size={15} /> 恢复默认</button></div>
          <div className="sidebar-foot"><ShieldCheck size={14} /><span><strong>SERVER PERSISTED</strong><small>Atomic JSON · SSE Broadcast</small></span></div>
        </aside>
        {sidebarOpen && <button className="sidebar-scrim" type="button" onClick={() => setSidebarOpen(false)} aria-label="关闭侧栏" />}

        <main className="config-editor">
          <div className="config-breadcrumb"><span>CONFIG</span><ChevronRight size={12} /><strong>{activeMeta.note.toUpperCase()}</strong><small>所有更改自动保存</small></div>
          {editor}
        </main>

        {previewCollapsed ? <button className="preview-restore" type="button" onClick={() => setPreviewCollapsed(false)}><PanelRight size={17} /><span>打开实时预览</span><i /></button> : <PreviewPane draft={draft} device={device} setDevice={setDevice} previewRef={previewRef} collapsed={previewCollapsed} setCollapsed={setPreviewCollapsed} />}
      </div>
    </div>
  );
}
