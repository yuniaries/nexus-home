const COLOR_PATTERN = /^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i;
const ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/;
const ICON_PATTERN = /^[a-z0-9][a-z0-9-]{0,31}$/;
const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);

export class ConfigValidationError extends Error {
  constructor(issues) {
    super("The configuration is invalid.");
    this.name = "ConfigValidationError";
    this.issues = issues;
  }
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function validateConfig(input) {
  const issues = [];

  const issue = (path, message) => issues.push({ path, message });

  const object = (value, path, allowedKeys) => {
    if (!isPlainObject(value)) {
      issue(path, "必须是对象");
      return {};
    }

    for (const key of Object.keys(value)) {
      if (FORBIDDEN_KEYS.has(key)) {
        issue(`${path}.${key}`, "包含被禁止的属性名");
      } else if (!allowedKeys.includes(key)) {
        issue(`${path}.${key}`, "未知配置项");
      }
    }
    return value;
  };

  const string = (value, path, { min = 0, max = 256, pattern } = {}) => {
    if (typeof value !== "string") {
      issue(path, "必须是字符串");
      return "";
    }
    if (value.length < min || value.length > max) {
      issue(path, `长度必须在 ${min} 到 ${max} 个字符之间`);
    }
    if (/\0|[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value)) {
      issue(path, "包含不允许的控制字符");
    }
    if (pattern && !pattern.test(value)) issue(path, "格式不正确");
    return value;
  };

  const boolean = (value, path) => {
    if (typeof value !== "boolean") {
      issue(path, "必须是布尔值");
      return false;
    }
    return value;
  };

  const number = (value, path, min, max) => {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      issue(path, "必须是有限数值");
      return min;
    }
    if (value < min || value > max) issue(path, `必须在 ${min} 到 ${max} 之间`);
    return value;
  };

  const integer = (value, path, min, max) => {
    const result = number(value, path, min, max);
    if (!Number.isInteger(value)) issue(path, "必须是整数");
    return result;
  };

  const enumeration = (value, path, allowed) => {
    if (!allowed.includes(value)) {
      issue(path, `必须是以下值之一：${allowed.join("、")}`);
      return allowed[0];
    }
    return value;
  };

  const color = (value, path) => string(value, path, { min: 7, max: 9, pattern: COLOR_PATTERN });
  const id = (value, path) => string(value, path, { min: 1, max: 64, pattern: ID_PATTERN });

  const safeUrl = (value, path) => {
    const result = string(value, path, { min: 1, max: 2048 });
    if (typeof value !== "string") return result;

    if (value === "#" || /^#[a-zA-Z0-9_-]+$/.test(value)) return result;
    if (value.startsWith("/") && !value.startsWith("//")) return result;
    if (/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(value)) return result;

    try {
      const parsed = new URL(value);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") return result;
    } catch {
      // Report the common error below.
    }

    issue(path, "只允许 http(s)、mailto、站内路径或锚点链接");
    return result;
  };

  const array = (value, path, max, itemReader) => {
    if (!Array.isArray(value)) {
      issue(path, "必须是数组");
      return [];
    }
    if (value.length > max) issue(path, `最多允许 ${max} 项`);
    return value.slice(0, max).map((entry, index) => itemReader(entry, `${path}[${index}]`));
  };

  const uniqueIds = (items, path) => {
    const seen = new Set();
    for (const [index, item] of items.entries()) {
      if (seen.has(item.id)) issue(`${path}[${index}].id`, "ID 必须唯一");
      seen.add(item.id);
    }
    return items;
  };

  const root = object(input, "$", [
    "schemaVersion",
    "revision",
    "updatedAt",
    "identity",
    "theme",
    "effects",
    "layout",
    "metrics",
    "capabilities",
    "projects",
    "links",
    "activity",
    "ticker",
  ]);

  const identityInput = object(root.identity, "$.identity", [
    "brand",
    "kicker",
    "name",
    "role",
    "tagline",
    "description",
    "location",
    "availability",
    "avatarText",
    "heroBadge",
    "quote",
    "email",
  ]);
  const identity = {
    brand: string(identityInput.brand, "$.identity.brand", { min: 1, max: 80 }),
    kicker: string(identityInput.kicker, "$.identity.kicker", { min: 1, max: 120 }),
    name: string(identityInput.name, "$.identity.name", { min: 1, max: 80 }),
    role: string(identityInput.role, "$.identity.role", { min: 1, max: 120 }),
    tagline: string(identityInput.tagline, "$.identity.tagline", { min: 1, max: 240 }),
    description: string(identityInput.description, "$.identity.description", { min: 1, max: 1200 }),
    location: string(identityInput.location, "$.identity.location", { min: 0, max: 120 }),
    availability: string(identityInput.availability, "$.identity.availability", { min: 0, max: 80 }),
    avatarText: string(identityInput.avatarText, "$.identity.avatarText", { min: 1, max: 8 }),
    heroBadge: string(identityInput.heroBadge, "$.identity.heroBadge", { min: 0, max: 80 }),
    quote: string(identityInput.quote, "$.identity.quote", { min: 0, max: 500 }),
    email: string(identityInput.email, "$.identity.email", {
      min: 3,
      max: 254,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    }),
  };

  const themeInput = object(root.theme, "$.theme", [
    "preset",
    "primary",
    "secondary",
    "accent",
    "buttonStart",
    "buttonEnd",
    "buttonText",
    "background",
    "surface",
    "text",
    "muted",
    "glassOpacity",
    "blur",
    "radius",
    "glow",
  ]);
  const theme = {
    preset: enumeration(themeInput.preset, "$.theme.preset", ["abyss", "plasma", "matrix", "solar", "aurora", "mono"]),
    primary: color(themeInput.primary, "$.theme.primary"),
    secondary: color(themeInput.secondary, "$.theme.secondary"),
    accent: color(themeInput.accent, "$.theme.accent"),
    buttonStart: color(themeInput.buttonStart, "$.theme.buttonStart"),
    buttonEnd: color(themeInput.buttonEnd, "$.theme.buttonEnd"),
    buttonText: color(themeInput.buttonText, "$.theme.buttonText"),
    background: color(themeInput.background, "$.theme.background"),
    surface: color(themeInput.surface, "$.theme.surface"),
    text: color(themeInput.text, "$.theme.text"),
    muted: color(themeInput.muted, "$.theme.muted"),
    glassOpacity: number(themeInput.glassOpacity, "$.theme.glassOpacity", 0.05, 1),
    blur: number(themeInput.blur, "$.theme.blur", 0, 60),
    radius: number(themeInput.radius, "$.theme.radius", 0, 48),
    glow: number(themeInput.glow, "$.theme.glow", 0, 1),
  };

  const effectsInput = object(root.effects, "$.effects", [
    "motion",
    "ocean",
    "ripples",
    "particles",
    "grid",
    "pointerGlow",
    "waveIntensity",
    "particleDensity",
    "motionSpeed",
  ]);
  const effects = {
    motion: boolean(effectsInput.motion, "$.effects.motion"),
    ocean: boolean(effectsInput.ocean, "$.effects.ocean"),
    ripples: boolean(effectsInput.ripples, "$.effects.ripples"),
    particles: boolean(effectsInput.particles, "$.effects.particles"),
    grid: boolean(effectsInput.grid, "$.effects.grid"),
    pointerGlow: boolean(effectsInput.pointerGlow, "$.effects.pointerGlow"),
    waveIntensity: number(effectsInput.waveIntensity, "$.effects.waveIntensity", 0, 2),
    particleDensity: number(effectsInput.particleDensity, "$.effects.particleDensity", 0, 1),
    motionSpeed: number(effectsInput.motionSpeed, "$.effects.motionSpeed", 0.1, 3),
  };

  const layoutInput = object(root.layout, "$.layout", [
    "density",
    "showClock",
    "showMetrics",
    "showCapabilities",
    "showProjects",
    "showActivity",
    "showQuote",
  ]);
  const layout = {
    density: enumeration(layoutInput.density, "$.layout.density", ["compact", "balanced", "rich"]),
    showClock: boolean(layoutInput.showClock, "$.layout.showClock"),
    showMetrics: boolean(layoutInput.showMetrics, "$.layout.showMetrics"),
    showCapabilities: boolean(layoutInput.showCapabilities, "$.layout.showCapabilities"),
    showProjects: boolean(layoutInput.showProjects, "$.layout.showProjects"),
    showActivity: boolean(layoutInput.showActivity, "$.layout.showActivity"),
    showQuote: boolean(layoutInput.showQuote, "$.layout.showQuote"),
  };

  const metrics = uniqueIds(
    array(root.metrics, "$.metrics", 12, (entry, path) => {
      const item = object(entry, path, ["id", "label", "value", "suffix", "trend"]);
      return {
        id: id(item.id, `${path}.id`),
        label: string(item.label, `${path}.label`, { min: 1, max: 64 }),
        value: string(item.value, `${path}.value`, { min: 1, max: 24 }),
        suffix: string(item.suffix, `${path}.suffix`, { min: 0, max: 16 }),
        trend: string(item.trend, `${path}.trend`, { min: 0, max: 80 }),
      };
    }),
    "$.metrics",
  );

  const capabilities = uniqueIds(
    array(root.capabilities, "$.capabilities", 12, (entry, path) => {
      const item = object(entry, path, ["id", "label", "value", "color"]);
      return {
        id: id(item.id, `${path}.id`),
        label: string(item.label, `${path}.label`, { min: 1, max: 80 }),
        value: number(item.value, `${path}.value`, 0, 100),
        color: color(item.color, `${path}.color`),
      };
    }),
    "$.capabilities",
  );

  const projects = uniqueIds(
    array(root.projects, "$.projects", 32, (entry, path) => {
      const item = object(entry, path, [
        "id",
        "index",
        "title",
        "description",
        "url",
        "status",
        "tags",
        "color",
        "featured",
      ]);
      return {
        id: id(item.id, `${path}.id`),
        index: string(item.index, `${path}.index`, { min: 1, max: 8 }),
        title: string(item.title, `${path}.title`, { min: 1, max: 100 }),
        description: string(item.description, `${path}.description`, { min: 1, max: 600 }),
        url: safeUrl(item.url, `${path}.url`),
        status: string(item.status, `${path}.status`, { min: 1, max: 32 }),
        tags: array(item.tags, `${path}.tags`, 8, (tag, tagPath) =>
          string(tag, tagPath, { min: 1, max: 32 }),
        ),
        color: color(item.color, `${path}.color`),
        featured: boolean(item.featured, `${path}.featured`),
      };
    }),
    "$.projects",
  );

  const links = uniqueIds(
    array(root.links, "$.links", 24, (entry, path) => {
      const item = object(entry, path, ["id", "label", "description", "url", "icon"]);
      return {
        id: id(item.id, `${path}.id`),
        label: string(item.label, `${path}.label`, { min: 1, max: 80 }),
        description: string(item.description, `${path}.description`, { min: 0, max: 160 }),
        url: safeUrl(item.url, `${path}.url`),
        icon: string(item.icon, `${path}.icon`, { min: 1, max: 32, pattern: ICON_PATTERN }),
      };
    }),
    "$.links",
  );

  const activityInput = object(root.activity, "$.activity", ["label", "activeDays", "streak", "signal"]);
  const activity = {
    label: string(activityInput.label, "$.activity.label", { min: 1, max: 80 }),
    activeDays: integer(activityInput.activeDays, "$.activity.activeDays", 0, 366),
    streak: integer(activityInput.streak, "$.activity.streak", 0, 10000),
    signal: number(activityInput.signal, "$.activity.signal", 0, 100),
  };

  const ticker = array(root.ticker, "$.ticker", 24, (entry, path) =>
    string(entry, path, { min: 1, max: 80 }),
  );

  const schemaVersion = integer(root.schemaVersion, "$.schemaVersion", 1, 1);
  const revision = integer(root.revision, "$.revision", 1, Number.MAX_SAFE_INTEGER);
  const updatedAt = string(root.updatedAt, "$.updatedAt", { min: 20, max: 40 });
  if (typeof root.updatedAt === "string" && !Number.isFinite(Date.parse(root.updatedAt))) {
    issue("$.updatedAt", "必须是有效的 ISO 日期");
  }

  if (issues.length > 0) throw new ConfigValidationError(issues.slice(0, 100));

  return {
    schemaVersion,
    revision,
    updatedAt,
    identity,
    theme,
    effects,
    layout,
    metrics,
    capabilities,
    projects,
    links,
    activity,
    ticker,
  };
}

export function configContentSignature(config) {
  const { revision: _revision, updatedAt: _updatedAt, ...content } = config;
  return JSON.stringify(content);
}
