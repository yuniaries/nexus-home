import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  Box,
  Braces,
  Check,
  ChevronDown,
  CircleDot,
  Clock3,
  Command,
  Cpu,
  ExternalLink,
  Github,
  Globe2,
  Layers3,
  Mail,
  MapPin,
  Menu,
  NotebookPen,
  Orbit,
  Radio,
  Search,
  Settings2,
  Sparkles,
  Terminal,
  Waves,
  X,
  Zap,
} from "lucide-react";
import { OceanCanvas } from "../components/OceanCanvas";
import { useSiteConfig } from "../config-context";

const linkIcons = {
  github: Github,
  notebook: NotebookPen,
  mail: Mail,
  globe: Globe2,
  terminal: Terminal,
};

function formatTime(date) {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function safeHref(url) {
  if (!url || url === "#") return "#projects";
  return url;
}

function GlassCard({ children, className = "", as: Tag = "div", ...props }) {
  return <Tag className={`glass-card ${className}`} {...props}>{children}</Tag>;
}

function SignalMark({ label = "LIVE" }) {
  return (
    <span className="signal-mark">
      <span className="signal-mark__rings"><i /><i /><i /></span>
      <span>{label}</span>
    </span>
  );
}

function TopBar({ config, connection, menuOpen, setMenuOpen, openCommand }) {
  const nav = [
    ["01", "坐标", "#origin"],
    ["02", "项目", "#projects"],
    ["03", "能力", "#capabilities"],
    ["04", "连接", "#contact"],
  ];

  return (
    <header className="topbar">
      <a className="brand-lockup" href="#origin" aria-label="回到顶部">
        <span className="brand-glyph"><i /><i /><i /></span>
        <span>
          <strong>{config.identity.brand}</strong>
          <small>ORBITAL INTERFACE</small>
        </span>
      </a>

      <nav className={`main-nav ${menuOpen ? "is-open" : ""}`} aria-label="主导航">
        {nav.map(([number, label, href]) => (
          <a key={href} href={href} onClick={() => setMenuOpen(false)}>
            <small>{number}</small>{label}
          </a>
        ))}
        <a className="mobile-config-link" href="/config"><Settings2 size={15} /> 配置中枢</a>
      </nav>

      <div className="topbar-actions">
        <button className="command-trigger" type="button" onClick={openCommand} aria-label="打开指令面板">
          <Search size={15} />
          <span>快速导航</span>
          <kbd>⌘ K</kbd>
        </button>
        <button className="menu-trigger" type="button" onClick={() => setMenuOpen(!menuOpen)} aria-label="切换导航菜单">
          {menuOpen ? <X size={19} /> : <Menu size={19} />}
        </button>
      </div>
    </header>
  );
}

function OrbitPortrait({ config }) {
  return (
    <div className="orbit-portrait" aria-label={`${config.identity.name} 的动态标识`}>
      <div className="orbit-track orbit-track--outer"><i /><i /></div>
      <div className="orbit-track orbit-track--inner"><i /></div>
      <div className="portrait-glow" />
      <div className="portrait-core">
        <span>{config.identity.avatarText}</span>
        <small>NODE 08</small>
      </div>
      <span className="orbit-label orbit-label--top">CREATIVE</span>
      <span className="orbit-label orbit-label--right">ENGINEER</span>
      <span className="orbit-label orbit-label--bottom">DESIGN</span>
    </div>
  );
}

function Hero({ config, now }) {
  const actionStyle = {
    "--button-start": config.theme.buttonStart,
    "--button-end": config.theme.buttonEnd,
    "--button-text": config.theme.buttonText,
    color: config.theme.buttonText,
  };

  return (
    <section id="origin" className="hero section-shell">
      <div className="hero-grid">
        <div className="hero-copy">
          <div className="eyebrow-row reveal-up">
            <SignalMark label={config.identity.heroBadge} />
            <span className="eyebrow-line" />
            <span>{config.identity.kicker}</span>
          </div>
          <h1 className="hero-title reveal-up reveal-delay-1" aria-label={`${config.identity.name}，${config.identity.role}`}>
            <span>{config.identity.name}</span>
            <span className="hero-title__role">{config.identity.role}</span>
          </h1>
          <p className="hero-tagline reveal-up reveal-delay-2">{config.identity.tagline}</p>
          <p className="hero-description reveal-up reveal-delay-3">{config.identity.description}</p>

          <div className="hero-actions reveal-up reveal-delay-4">
            <a className="primary-action magnetic-action" href="#projects" style={actionStyle}>
              <span>进入作品轨道</span><ArrowDownRight size={18} />
            </a>
            <a className="text-action" href={`mailto:${config.identity.email}`}>
              建立连接 <ArrowRight size={16} />
            </a>
          </div>

          {config.layout.showClock && <div className="coordinate-strip reveal-up reveal-delay-4">
            <div><MapPin size={14} /><span>{config.identity.location}</span></div>
            <div><Clock3 size={14} /><span>{formatTime(now)}</span></div>
            <div><CircleDot size={14} /><span>{config.identity.availability}</span></div>
          </div>}
        </div>

        <div className="hero-visual reveal-scale">
          <OrbitPortrait config={config} />
          <GlassCard className="floating-module floating-module--signal">
            <Radio size={17} />
            <span><small>SIGNAL</small><strong>87.4%</strong></span>
            <i className="mini-wave"><b /><b /><b /><b /></i>
          </GlassCard>
          <GlassCard className="floating-module floating-module--status">
            <span className="status-orb" />
            <span><small>CURRENT MODE</small><strong>BUILDING FUTURES</strong></span>
          </GlassCard>
        </div>
      </div>

      <div className="hero-index" aria-hidden="true">
        <span>00</span><i /><small>SCROLL TO EXPLORE</small>
      </div>
    </section>
  );
}

function MetricRail({ metrics }) {
  return (
    <section className="metric-rail section-shell" aria-label="关键数据">
      {metrics.map((metric, index) => (
        <div className="metric-cell" key={metric.id || index}>
          <div className="metric-cell__top">
            <span>0{index + 1}</span>
            <Activity size={15} />
          </div>
          <strong>{metric.value}<em>{metric.suffix}</em></strong>
          <div className="metric-cell__meta">
            <span>{metric.label}</span><small>{metric.trend}</small>
          </div>
        </div>
      ))}
    </section>
  );
}

function SectionHeading({ index, kicker, title, description, action }) {
  return (
    <div className="section-heading">
      <div className="section-heading__index"><span>{index}</span><i /></div>
      <div>
        <small>{kicker}</small>
        <h2>{title}</h2>
      </div>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}

function ProjectVisual({ project, index }) {
  return (
    <div className={`project-visual project-visual--${(index % 4) + 1}`} style={{ "--project-color": project.color }} aria-hidden="true">
      <div className="project-grid-plane" />
      <div className="project-sphere"><i /><i /><i /></div>
      <div className="project-axis project-axis--x" />
      <div className="project-axis project-axis--y" />
      <span className="project-data project-data--a">X.{42 + index * 13}</span>
      <span className="project-data project-data--b">N0{index + 1}</span>
      <div className="scan-line" />
    </div>
  );
}

function Projects({ projects }) {
  return (
    <section id="projects" className="projects-section section-shell">
      <SectionHeading
        index="01"
        kicker="SELECTED MISSIONS"
        title="正在构建的坐标"
        description="不是作品陈列，而是一组持续进化的数字系统。每个项目都在解决一个真实的问题，也在测试一种新的可能。"
        action={<span className="section-count">{String(projects.length).padStart(2, "0")} / PROJECTS</span>}
      />

      <div className="project-grid">
        {projects.map((project, index) => (
          <a
            className={`project-card ${project.featured ? "is-featured" : ""}`}
            key={project.id || index}
            href={safeHref(project.url)}
            target={project.url?.startsWith("http") ? "_blank" : undefined}
            rel={project.url?.startsWith("http") ? "noreferrer" : undefined}
            style={{ "--project-color": project.color }}
          >
            <ProjectVisual project={project} index={index} />
            <div className="project-card__body">
              <div className="project-card__meta">
                <span>{project.index || String(index + 1).padStart(2, "0")}</span>
                <span className="project-status"><i />{project.status}</span>
              </div>
              <h3>{project.title}</h3>
              <p>{project.description}</p>
              <div className="project-card__footer">
                <div>{(project.tags || []).map((tag) => <span key={tag}>{tag}</span>)}</div>
                <span className="project-arrow"><ArrowDownRight size={18} /></span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

function CapabilityRadar({ capabilities }) {
  const average = Math.round(capabilities.reduce((sum, item) => sum + Number(item.value || 0), 0) / Math.max(capabilities.length, 1));
  return (
    <div className="capability-radar" style={{ "--radar-value": `${average * 3.6}deg` }}>
      <div className="radar-rings"><i /><i /><i /><i /></div>
      <div className="radar-cross radar-cross--x" />
      <div className="radar-cross radar-cross--y" />
      <div className="radar-sweep" />
      <div className="radar-center"><strong>{average}</strong><small>CORE INDEX</small></div>
      {capabilities.slice(0, 4).map((item, index) => <span key={item.id} className={`radar-point radar-point--${index + 1}`} style={{ "--point-color": item.color }} />)}
    </div>
  );
}

function Capabilities({ capabilities, activity, showActivity = true }) {
  const weeks = useMemo(() => Array.from({ length: 84 }, (_, index) => {
    const seed = (index * 29 + 17) % 97;
    return seed > 78 ? 4 : seed > 57 ? 3 : seed > 34 ? 2 : seed > 18 ? 1 : 0;
  }), []);

  return (
    <section id="capabilities" className="capability-section section-shell">
      <SectionHeading
        index="02"
        kicker="CAPABILITY MATRIX"
        title="跨越边界的能力栈"
        description="策略决定方向，设计建立秩序，工程让想象真正运行。"
      />
      <div className="capability-layout">
        <GlassCard className="radar-card">
          <div className="module-heading"><span><Orbit size={16} /> SYSTEM RADAR</span><small>LIVE ANALYSIS</small></div>
          <CapabilityRadar capabilities={capabilities} />
          <div className="radar-legend">
            {capabilities.map((item) => (
              <div key={item.id}>
                <span><i style={{ background: item.color }} />{item.label}</span>
                <strong>{item.value}<small>%</small></strong>
              </div>
            ))}
          </div>
        </GlassCard>

        <div className="capability-stack">
          {capabilities.map((item, index) => (
            <GlassCard className="capability-row" key={item.id || index}>
              <span className="capability-row__index">0{index + 1}</span>
              <div>
                <span>{item.label}</span>
                <div className="capability-track"><i style={{ width: `${item.value}%`, background: item.color }} /></div>
              </div>
              <strong>{item.value}<small>%</small></strong>
            </GlassCard>
          ))}

          {showActivity && <GlassCard className="activity-card">
            <div className="module-heading"><span><Zap size={16} /> {activity.label}</span><small>LAST 12 WEEKS</small></div>
            <div className="activity-body">
              <div className="activity-grid" aria-label="近期构建活跃度">
                {weeks.map((level, index) => <i key={index} data-level={level} />)}
              </div>
              <div className="activity-stats">
                <div><strong>{activity.activeDays}</strong><small>ACTIVE DAYS</small></div>
                <div><strong>{activity.streak}</strong><small>DAY STREAK</small></div>
                <div><strong>{activity.signal}%</strong><small>SIGNAL</small></div>
              </div>
            </div>
          </GlassCard>}
        </div>
      </div>
    </section>
  );
}

function LinkIcon({ icon }) {
  const Icon = linkIcons[icon] || Globe2;
  return <Icon size={20} />;
}

function Contact({ config }) {
  const actionStyle = {
    "--button-start": config.theme.buttonStart,
    "--button-end": config.theme.buttonEnd,
    "--button-text": config.theme.buttonText,
    color: config.theme.buttonText,
  };

  return (
    <section id="contact" className="contact-section section-shell">
      <GlassCard className="contact-core">
        <div className="contact-orbit" aria-hidden="true"><i /><i /><i /></div>
        <div className="contact-copy">
          <SignalMark label="CHANNEL OPEN" />
          <h2>让下一次<br /><em>好奇心碰撞</em>发生。</h2>
          {config.layout.showQuote && <p>{config.identity.quote}</p>}
          <a className="primary-action" href={`mailto:${config.identity.email}`} style={actionStyle}>
            <span>发送第一束信号</span><Mail size={18} />
          </a>
        </div>
        <div className="contact-links">
          {(config.links || []).map((link, index) => (
            <a key={link.id || index} href={safeHref(link.url)} target={link.url?.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
              <span className="contact-link__icon"><LinkIcon icon={link.icon} /></span>
              <span><strong>{link.label}</strong><small>{link.description}</small></span>
              <ArrowDownRight size={18} />
            </a>
          ))}
        </div>
      </GlassCard>
    </section>
  );
}

function Ticker({ items }) {
  const repeated = [...items, ...items];
  return (
    <div className="ticker" aria-hidden="true">
      <div className="ticker-track">
        {repeated.map((item, index) => <span key={`${item}-${index}`}>{item}<i>✦</i></span>)}
      </div>
    </div>
  );
}

function Footer({ config }) {
  return (
    <footer className="site-footer section-shell">
      <div className="footer-brand"><span className="brand-glyph"><i /><i /><i /></span><strong>{config.identity.brand}</strong></div>
      <p>Designed as a living interface · Configurable in real time</p>
      <div><span>© {new Date().getFullYear()}</span></div>
    </footer>
  );
}

function CommandPalette({ open, onClose, config }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef(null);
  const commands = [
    { label: "回到起点", detail: "首页坐标", href: "#origin", icon: Orbit },
    { label: "查看项目", detail: "进入作品轨道", href: "#projects", icon: Box },
    { label: "能力矩阵", detail: "技能与活跃度", href: "#capabilities", icon: Braces },
    { label: "建立连接", detail: config.identity.email, href: "#contact", icon: Radio },
    { label: "配置中枢", detail: "实时修改主页", href: "/config", icon: Settings2 },
    ...(config.projects || []).map((project) => ({ label: project.title, detail: project.status, href: safeHref(project.url), icon: Layers3 })),
  ];
  const filtered = commands.filter((item) => `${item.label} ${item.detail}`.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      window.setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [open]);

  useEffect(() => setSelected(0), [query]);

  const onSearchKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelected((value) => Math.min(value + 1, Math.max(filtered.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelected((value) => Math.max(value - 1, 0));
    } else if (event.key === "Enter" && filtered[selected]) {
      event.preventDefault();
      window.location.href = filtered[selected].href;
      onClose();
    }
  };

  if (!open) return null;
  return (
    <div className="command-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="command-panel" role="dialog" aria-modal="true" aria-label="快速导航">
        <div className="command-search"><Search size={19} /><input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={onSearchKeyDown} placeholder="输入目标、项目或动作…" /><kbd>ESC</kbd></div>
        <div className="command-list">
          <small>AVAILABLE ROUTES · {filtered.length}</small>
          {filtered.map((item, index) => {
            const Icon = item.icon;
            return <a className={index === selected ? "is-selected" : ""} key={`${item.label}-${index}`} href={item.href} onMouseEnter={() => setSelected(index)} onClick={onClose}><span><Icon size={18} /></span><div><strong>{item.label}</strong><small>{item.detail}</small></div>{index === selected && <kbd>↵</kbd>}<ArrowRight size={15} /></a>;
          })}
          {!filtered.length && <div className="command-empty">没有匹配的坐标</div>}
        </div>
        <div className="command-footer"><span><kbd>↑</kbd><kbd>↓</kbd> 浏览</span><span><kbd>↵</kbd> 打开</span><span><Command size={13} /> K 唤起</span></div>
      </div>
    </div>
  );
}

export function HomePage() {
  const { config, connection } = useSiteConfig();
  const [now, setNow] = useState(new Date());
  const [menuOpen, setMenuOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const embedded = new URLSearchParams(window.location.search).has("embedded");
  const particles = useMemo(() => Array.from({ length: Math.round(20 + Number(config.effects.particleDensity || 0) * 35) }, (_, index) => ({
    id: index,
    x: (index * 37 + 11) % 100,
    y: (index * 53 + 7) % 100,
    size: 1 + ((index * 7) % 3),
    delay: (index % 9) * -0.7,
  })), [config.effects.particleDensity]);

  useEffect(() => {
    document.title = `${config.identity.name} // ${config.identity.role}`;
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    const onKey = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((value) => !value);
      }
      if (event.key === "Escape") {
        setCommandOpen(false);
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [config.identity.name, config.identity.role]);

  useEffect(() => {
    if (!config.effects.pointerGlow) return undefined;
    const onMove = (event) => {
      document.documentElement.style.setProperty("--pointer-x", `${event.clientX}px`);
      document.documentElement.style.setProperty("--pointer-y", `${event.clientY}px`);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [config.effects.pointerGlow]);

  const style = {
    "--primary": config.theme.primary,
    "--secondary": config.theme.secondary,
    "--accent": config.theme.accent,
    "--button-start": config.theme.buttonStart,
    "--button-end": config.theme.buttonEnd,
    "--button-text": config.theme.buttonText,
    "--background": config.theme.background,
    "--surface": config.theme.surface,
    "--text": config.theme.text,
    "--muted": config.theme.muted,
    "--glass-opacity": config.theme.glassOpacity,
    "--glass-blur": `${config.theme.blur}px`,
    "--card-radius": `${config.theme.radius}px`,
    "--glow-strength": config.theme.glow,
    "--motion-speed": config.effects.motionSpeed,
  };

  return (
    <div className={`home-shell density-${config.layout.density} ${embedded ? "is-embedded" : ""} ${config.effects.motion ? "motion-on" : "motion-off"}`} style={style}>
      <div className="ambient-layer" aria-hidden="true">
        <div className="ambient-orb ambient-orb--one" />
        <div className="ambient-orb ambient-orb--two" />
        <div className="ambient-orb ambient-orb--three" />
        {config.effects.grid && <div className="perspective-grid" />}
        {config.effects.pointerGlow && <div className="pointer-aura" />}
        {config.effects.particles && <div className="particle-field">{particles.map((particle) => <i key={particle.id} style={{ left: `${particle.x}%`, top: `${particle.y}%`, width: particle.size, height: particle.size, animationDelay: `${particle.delay}s` }} />)}</div>}
      </div>
      <OceanCanvas theme={config.theme} effects={config.effects} />
      <div className="noise-overlay" aria-hidden="true" />
      <TopBar config={config} connection={connection} menuOpen={menuOpen} setMenuOpen={setMenuOpen} openCommand={() => setCommandOpen(true)} />
      <main>
        <Hero config={config} now={now} />
        {config.layout.showMetrics && <MetricRail metrics={config.metrics} />}
        {config.layout.showProjects && <Projects projects={config.projects} />}
        {config.layout.showCapabilities && <Capabilities capabilities={config.capabilities} activity={config.activity} showActivity={config.layout.showActivity} />}
        <Contact config={config} />
      </main>
      <Ticker items={config.ticker || []} />
      <Footer config={config} />
      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} config={config} />
      {!embedded && <div className="corner-hud corner-hud--left"><Waves size={14} /><span>POINTER RIPPLE ENABLED</span></div>}
      {!embedded && <div className="corner-hud corner-hud--right"><Sparkles size={14} /><span>REV {config.revision}</span></div>}
    </div>
  );
}
