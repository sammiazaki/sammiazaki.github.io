import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Github,
  Linkedin,
  FileText,
  Mail,
  ExternalLink,
  GraduationCap,
  Wrench,
  Feather,
  Clapperboard,
  Fingerprint,
  Send,
  MessageCircle,
} from "lucide-react";

const fade = { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 } };
const stagger = { animate: { transition: { staggerChildren: 0.06 } } };

const SOCIAL = [
  { href: "https://github.com/sammiazaki", icon: Github, label: "GitHub" },
  { href: "https://www.linkedin.com/in/sajad-mirzababaei/", icon: Linkedin, label: "LinkedIn" },
  { href: "https://sammiazaki.substack.com", icon: FileText, label: "Substack" },
  { href: "https://t.me/sam_miazaki", icon: Send, label: "Telegram Channel" },
  { href: "https://t.me/SajadMirzababaei", icon: MessageCircle, label: "Telegram" },
  { href: "mailto:ss.mirzababaei@gmail.com", icon: Mail, label: "Email" },
];

const NAV = [
  {
    to: "/noodlelab",
    icon: GraduationCap,
    title: "Chalkboard",
    desc: "Interactive tutorials on things I find fascinating",
    internal: true,
  },
  {
    to: "/notebooks/",
    icon: Wrench,
    title: "Workbench",
    desc: "Marimo notebooks with real data",
  },
  {
    to: "https://sammiazaki.substack.com",
    icon: Feather,
    title: "Substack",
    desc: "Personal reflections & writing",
    external: true,
  },
  {
    to: "/anime",
    icon: Clapperboard,
    title: "Anime Shelf",
    desc: "What I've been watching",
    internal: true,
  },
  {
    to: "/about",
    icon: Fingerprint,
    title: "AboutMe",
    desc: "The human behind the code",
    internal: true,
  },
];

export default function Home() {
  return (
    <motion.div
      className="mx-auto max-w-xl px-6 py-24 space-y-10"
      variants={stagger}
      initial="initial"
      animate="animate"
    >
      {/* intro */}
      <motion.header variants={fade} className="space-y-4">
        <img
          src="/avatar.png"
          alt="Sam Miazaki"
          className="w-24 h-24 rounded-full object-cover border-2 border-slate-200 shadow-sm"
        />
        <h1 className="text-4xl font-bold tracking-tight">Sam Miazaki</h1>
        <p className="text-[15px] text-slate-500 leading-relaxed">
          Real name Sajad Mirzababaei. Data scientist who loves AI for making
          life genuinely easier in so many ways. Always looking to meet people
          who share interests in movies, music, anime, economics, AI, or
          business — if that's you,{" "}
          <a
            href="mailto:ss.mirzababaei@gmail.com"
            className="text-slate-700 underline underline-offset-2 decoration-slate-300 hover:decoration-slate-500 transition-colors"
          >
            say hi
          </a>
          .
        </p>
        <div className="flex gap-3 pt-1">
          {SOCIAL.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target={s.href.startsWith("mailto") ? undefined : "_blank"}
              rel={s.href.startsWith("mailto") ? undefined : "noopener noreferrer"}
              aria-label={s.label}
              className="rounded-lg border border-slate-200 p-2 text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-all"
            >
              <s.icon size={16} />
            </a>
          ))}
        </div>
      </motion.header>

      {/* nav grid */}
      <motion.nav variants={fade} className="space-y-2">
        {NAV.map((item) => {
          const Icon = item.icon;
          const cls =
            "group flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 transition-all hover:shadow-sm hover:border-slate-300";

          const inner = (
            <>
              <div className="rounded-lg bg-slate-50 p-2.5 text-slate-400 group-hover:text-slate-600 group-hover:bg-slate-100 transition-all">
                <Icon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-800">{item.title}</div>
                <div className="text-xs text-slate-400">{item.desc}</div>
              </div>
              {item.external && (
                <ExternalLink size={13} className="text-slate-300 shrink-0" />
              )}
            </>
          );

          if (item.internal) {
            return (
              <Link key={item.title} to={item.to} className={cls}>
                {inner}
              </Link>
            );
          }
          return (
            <a
              key={item.title}
              href={item.to}
              target={item.external ? "_blank" : undefined}
              rel={item.external ? "noopener noreferrer" : undefined}
              className={cls}
            >
              {inner}
            </a>
          );
        })}
      </motion.nav>
    </motion.div>
  );
}
