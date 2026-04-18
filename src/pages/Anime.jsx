import { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useDocumentHead } from "@/lib/seo";

/* ── data ───────────────────────────────────────────────────────────── */

const WATCHING = [
  { title: "Hell's Paradise", malId: 46569, mal: "46569/Jigokuraku", episodes: 13, genres: ["Action", "Supernatural"] },
  { title: "To Your Eternity", malId: 41025, mal: "41025/Fumetsu_no_Anata_e", episodes: 60, genres: ["Adventure", "Supernatural"] },
];

const ANIME = [
  { title: "Attack on Titan", malId: 16498, mal: "16498/Shingeki_no_Kyojin", episodes: 94, genres: ["Action", "Dark Fantasy"] },
  { title: "Avatar: The Last Airbender", poster: "https://m.media-amazon.com/images/M/MV5BMDMwMThjYWYtY2Q2OS00OGM2LTlkODQtNDJlZTZmMjAyYmFhXkEyXkFqcGc@._V1_SX300.jpg", extUrl: "https://www.imdb.com/title/tt0417299/", episodes: 61, genres: ["Action", "Adventure"] },
  { title: "The Legend of Korra", poster: "https://m.media-amazon.com/images/M/MV5BMWIyMDNmMGMtZTRjZi00ZWJkLWE2ZjAtMjYwOGFiZGVkZmYzXkEyXkFqcGc@._V1_SX300.jpg", extUrl: "https://www.imdb.com/title/tt1695360/", episodes: 52, genres: ["Action", "Adventure"] },
  { title: "Berserk", malId: 33, mal: "33/Kenpuu_Denki_Berserk", episodes: 25, genres: ["Action", "Dark Fantasy"] },
  { title: "Black Clover", malId: 34572, mal: "34572/Black_Clover", episodes: 170, genres: ["Action", "Shounen"] },
  { title: "Chainsaw Man", malId: 44511, mal: "44511/Chainsaw_Man", episodes: 12, genres: ["Action", "Dark Fantasy"] },
  { title: "Cyberpunk: Edgerunners", malId: 42310, mal: "42310/Cyberpunk__Edgerunners", episodes: 10, genres: ["Action", "Sci-Fi"] },
  { title: "The Daily Life of the Immortal King", malId: 41094, mal: "41094/Xian_Wang_de_Richang_Shenghuo", episodes: 15, genres: ["Comedy", "Fantasy", "Slice of Life"] },
  { title: "Dandadan", malId: 57334, mal: "57334/Dandadan", episodes: 24, genres: ["Action", "Supernatural"] },
  { title: "Death Note", malId: 1535, mal: "1535/Death_Note", episodes: 37, genres: ["Thriller", "Supernatural"] },
  { title: "Demon Slayer", malId: 38000, mal: "38000/Kimetsu_no_Yaiba", episodes: 63, genres: ["Action", "Shounen"] },
  { title: "Dororo", malId: 37520, mal: "37520/Dororo", episodes: 24, genres: ["Action", "Historical"] },
  { title: "Dr. Stone", malId: 38691, mal: "38691/Dr_Stone", episodes: 81, genres: ["Adventure", "Sci-Fi"] },
  { title: "Fate/stay night", malId: 356, mal: "356/Fate_stay_night", episodes: 24, genres: ["Action", "Fantasy"] },
  { title: "Fate/stay night: UBW", malId: 27821, mal: "27821/Fate_stay_night__Unlimited_Blade_Works_Prologue", episodes: 26, genres: ["Action", "Fantasy"] },
  { title: "Fate/Zero", malId: 10087, mal: "10087/Fate_Zero", episodes: 25, genres: ["Action", "Fantasy"] },
  { title: "Fate/strange Fake", malId: 55830, mal: "55830/Fate_strange_Fake", episodes: 13, genres: ["Action", "Fantasy"] },
  { title: "Frieren: Beyond Journey's End", malId: 52991, mal: "52991/Frieren__Beyond_Journey_s_End", episodes: 38, genres: ["Adventure", "Fantasy"] },
  { title: "Fullmetal Alchemist: Brotherhood", malId: 5114, mal: "5114/Fullmetal_Alchemist__Brotherhood", episodes: 64, genres: ["Action", "Fantasy"] },
  { title: "Hunter x Hunter", malId: 11061, mal: "11061/Hunter_x_Hunter_2011", episodes: 148, genres: ["Action", "Adventure"] },
  { title: "Jujutsu Kaisen", malId: 40748, mal: "40748/Jujutsu_Kaisen", episodes: 59, genres: ["Action", "Supernatural"] },
  { title: "Mushoku Tensei", malId: 39535, mal: "39535/Mushoku_Tensei__Isekai_Ittara_Honki_Dasu", episodes: 48, genres: ["Fantasy", "Isekai"] },
  { title: "My Hero Academia", malId: 31964, mal: "31964/Boku_no_Hero_Academia", episodes: 170, genres: ["Action", "Shounen"] },
  { title: "One Punch Man", malId: 30276, mal: "30276/One_Punch_Man", episodes: 36, genres: ["Action", "Comedy"] },
  { title: "Sakamoto Days", malId: 58939, mal: "58939/Sakamoto_Days", mangaMal: "131334/Sakamoto_Days", episodes: 22, genres: ["Action", "Comedy"] },
  { title: "Solo Leveling", malId: 52299, mal: "52299/Ore_dake_Level_Up_na_Ken", episodes: 25, genres: ["Action", "Fantasy"] },
  { title: "Spy x Family", malId: 50265, mal: "50265/Spy_x_Family", episodes: 50, genres: ["Action", "Comedy"] },
  { title: "The Kingdoms of Ruin", malId: 54362, mal: "54362/Hametsu_no_Oukoku", episodes: 12, genres: ["Action", "Fantasy"] },
  { title: "Tokyo Revengers", malId: 42249, mal: "42249/Tokyo_Revengers", episodes: 49, genres: ["Action", "Drama"] },
  { title: "Vinland Saga", malId: 37521, mal: "37521/Vinland_Saga", episodes: 48, genres: ["Action", "Historical"] },
];

const GENRE_COLORS = {
  Action: "bg-red-50 text-red-600 ring-red-200",
  "Dark Fantasy": "bg-purple-50 text-purple-600 ring-purple-200",
  Shounen: "bg-orange-50 text-orange-600 ring-orange-200",
  "Sci-Fi": "bg-cyan-50 text-cyan-600 ring-cyan-200",
  Fantasy: "bg-indigo-50 text-indigo-600 ring-indigo-200",
  Adventure: "bg-emerald-50 text-emerald-600 ring-emerald-200",
  Thriller: "bg-rose-50 text-rose-600 ring-rose-200",
  Supernatural: "bg-violet-50 text-violet-600 ring-violet-200",
  Historical: "bg-amber-50 text-amber-600 ring-amber-200",
  Comedy: "bg-yellow-50 text-yellow-600 ring-yellow-200",
  Drama: "bg-pink-50 text-pink-600 ring-pink-200",
  Isekai: "bg-sky-50 text-sky-600 ring-sky-200",
  "Slice of Life": "bg-lime-50 text-lime-600 ring-lime-200",
};

const PLACEHOLDER_GRADIENTS = [
  "from-slate-700 to-slate-900",
  "from-indigo-700 to-indigo-900",
  "from-purple-700 to-purple-900",
  "from-rose-700 to-rose-900",
  "from-emerald-700 to-emerald-900",
  "from-cyan-700 to-cyan-900",
  "from-amber-700 to-amber-900",
];

/* ── poster hook (Jikan API + localStorage cache) ───────────────────── */

const CACHE_KEY = "anime-posters-v3";
const CACHE_TTL = 1000 * 60 * 60 * 24 * 7; // 7 days

function useAnimePosters(animeList) {
  const [posters, setPosters] = useState(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const { ts, data } = JSON.parse(raw);
        if (Date.now() - ts < CACHE_TTL) return data;
      }
    } catch { /* ignore */ }
    return {};
  });

  useEffect(() => {
    const missing = animeList.filter((a) => a.malId && !posters[a.malId]);
    if (missing.length === 0) return;

    let cancelled = false;

    async function fetchPosters() {
      const results = { ...posters };
      // stagger requests to respect Jikan rate limit (3/s)
      for (let i = 0; i < missing.length; i++) {
        if (cancelled) return;
        try {
          const res = await fetch(
            `https://api.jikan.moe/v4/anime/${missing[i].malId}`
          );
          if (res.ok) {
            const json = await res.json();
            results[missing[i].malId] = json.data?.images?.jpg?.large_image_url
              || json.data?.images?.jpg?.image_url
              || null;
          }
        } catch { /* skip */ }
        // update incrementally so cards appear one by one
        if (!cancelled) setPosters({ ...results });
        if (i < missing.length - 1) {
          await new Promise((r) => setTimeout(r, 350));
        }
      }
      if (!cancelled) {
        try {
          localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ ts: Date.now(), data: results })
          );
        } catch { /* quota */ }
      }
    }

    fetchPosters();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return posters;
}

/* ── stats ──────────────────────────────────────────────────────────── */

function computeStats(animeList) {
  const totalEpisodes = animeList.reduce((s, a) => s + a.episodes, 0);
  const avgMinutes = 23;
  const totalMinutes = totalEpisodes * avgMinutes;
  const totalHours = Math.round(totalMinutes / 60);
  const totalDays = (totalHours / 24).toFixed(1);

  const genreCounts = {};
  animeList.forEach((a) =>
    a.genres.forEach((g) => (genreCounts[g] = (genreCounts[g] || 0) + 1))
  );
  const genreRanked = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]);
  const topGenre = genreRanked[0][0];
  const uniqueGenres = genreRanked.length;

  const sorted = [...animeList].sort((a, b) => b.episodes - a.episodes);
  const longest = sorted[0];
  const shortest = sorted[sorted.length - 1];
  const avgEpisodes = Math.round(totalEpisodes / animeList.length);

  // fun comparison: LOTR extended trilogy is ~11.4 hours
  const lotrRewatches = Math.round(totalHours / 11.4);

  return {
    totalEpisodes, totalHours, totalDays, totalMinutes,
    topGenre, uniqueGenres, genreRanked,
    longest, shortest, avgEpisodes, lotrRewatches,
    count: animeList.length,
  };
}

/* ── animation variants ─────────────────────────────────────────────── */

const fade = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };
const stagger = { animate: { transition: { staggerChildren: 0.04 } } };
const cardV = {
  initial: { opacity: 0, y: 16, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35 } },
};

/* ── animated counter ───────────────────────────────────────────────── */

function AnimatedNumber({ value, duration = 1.2, decimals = 0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) { setDisplay(value); return; }
    let start = 0;
    const startTime = performance.now();
    function tick(now) {
      const t = Math.min((now - startTime) / (duration * 1000), 1);
      const ease = 1 - Math.pow(1 - t, 3); // easeOutCubic
      const current = start + (num - start) * ease;
      setDisplay(decimals > 0 ? current.toFixed(decimals) : Math.round(current));
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [inView, value, duration, decimals]);

  return <span ref={ref}>{typeof display === "number" ? display.toLocaleString() : display}</span>;
}

/* ── components ─────────────────────────────────────────────────────── */

function StatsHero({ stats }) {
  return (
    <motion.div
      variants={fade}
      className="rounded-2xl bg-gradient-to-br from-slate-950 via-[#0f172a] to-slate-900 p-6 md:p-8 text-white overflow-hidden relative"
    >
      {/* decorative glows */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-indigo-500/15 rounded-full blur-[100px]" />
      <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-purple-600/12 rounded-full blur-[80px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/5 rounded-full blur-[120px]" />

      <div className="relative space-y-7">
        {/* ── hero numbers ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          <div>
            <p className="text-5xl md:text-6xl font-black tabular-nums tracking-tight">
              <AnimatedNumber value={stats.count} />
            </p>
            <p className="text-xs text-slate-500 mt-1.5 tracking-wide">anime watched</p>
          </div>
          <div>
            <p className="text-5xl md:text-6xl font-black tabular-nums tracking-tight bg-gradient-to-r from-indigo-400 to-blue-400 bg-clip-text text-transparent">
              <AnimatedNumber value={stats.totalEpisodes} />
            </p>
            <p className="text-xs text-slate-500 mt-1.5 tracking-wide">episodes</p>
          </div>
          <div>
            <p className="text-5xl md:text-6xl font-black tabular-nums tracking-tight bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
              <AnimatedNumber value={stats.totalDays} decimals={1} duration={1.5} />
            </p>
            <p className="text-xs text-slate-500 mt-1.5 tracking-wide">days of watch time</p>
          </div>
          <div>
            <p className="text-5xl md:text-6xl font-black tabular-nums tracking-tight bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              <AnimatedNumber value={stats.totalHours} />
            </p>
            <p className="text-xs text-slate-500 mt-1.5 tracking-wide">hours total</p>
          </div>
        </div>

        {/* ── divider ── */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* ── fun facts ── */}
        <div className="grid gap-2.5 grid-cols-2 lg:grid-cols-4">
          <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-3.5">
            <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-1">Avg per anime</p>
            <p className="text-2xl font-black tabular-nums">{stats.avgEpisodes}</p>
            <p className="text-xs text-slate-500">episodes</p>
          </div>
          <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-3.5">
            <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-1">Genres explored</p>
            <p className="text-2xl font-black tabular-nums">{stats.uniqueGenres}</p>
            <p className="text-xs text-slate-500">unique genres</p>
          </div>
          <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-3.5">
            <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-1">Top genre</p>
            <p className="text-2xl font-black bg-gradient-to-r from-rose-400 to-orange-400 bg-clip-text text-transparent">{stats.topGenre}</p>
            <p className="text-xs text-slate-500">{stats.genreRanked[0][1]} titles</p>
          </div>
          <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-3.5">
            <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-1">LOTR equivalent</p>
            <p className="text-2xl font-black">
              <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">{stats.lotrRewatches}x</span>
            </p>
            <p className="text-xs text-slate-500">extended trilogy</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function AnimeCard({ anime, posterUrl }) {
  const resolvedPoster = anime.poster || posterUrl;
  const gradientClass =
    PLACEHOLDER_GRADIENTS[(anime.malId || anime.title.length) % PLACEHOLDER_GRADIENTS.length];

  return (
    <motion.a
      variants={cardV}
      href={anime.extUrl || `https://myanimelist.net/anime/${anime.mal}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative flex flex-col rounded-xl overflow-hidden bg-white border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
    >
      {/* poster */}
      <div className="relative aspect-[2/3] overflow-hidden bg-slate-100">
        {resolvedPoster ? (
          <img
            src={resolvedPoster}
            alt={anime.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div
            className={`w-full h-full bg-gradient-to-br ${gradientClass} flex items-center justify-center`}
          >
            <span className="text-3xl font-bold text-white/30">
              {anime.title[0]}
            </span>
          </div>
        )}
        {/* episode badge */}
        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
          {anime.episodes} ep
        </div>
      </div>

      {/* info */}
      <div className="p-3">
        <h3 className="text-sm font-semibold text-slate-800 leading-tight line-clamp-2 group-hover:text-slate-950 transition-colors">
          {anime.title}
        </h3>
      </div>
    </motion.a>
  );
}

/* ── page ───────────────────────────────────────────────────────────── */

export default function Anime() {
  const allAnime = useMemo(() => [...WATCHING, ...ANIME], []);
  const posters = useAnimePosters(allAnime);
  const stats = useMemo(() => computeStats([...ANIME, ...WATCHING]), []);

  useDocumentHead({
    title: "Anime Shelf",
    description: "Anime I've watched and am currently watching — 26+ titles across action, fantasy, and slice-of-life.",
    path: "/anime",
  });

  return (
    <motion.div
      className="mx-auto max-w-4xl px-6 py-16 space-y-10"
      variants={stagger}
      initial="initial"
      animate="animate"
    >
      {/* header */}
      <motion.header variants={fade} className="space-y-3">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft size={14} />
          Home
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Anime</h1>
        <p className="text-slate-500 text-sm">
          {ANIME.length + WATCHING.length} titles and counting. Always open to recommendations
          &mdash;{" "}
          <a
            href="mailto:ss.mirzababaei@gmail.com"
            className="underline underline-offset-2 decoration-slate-300 hover:decoration-slate-500 transition-colors"
          >
            send me yours
          </a>
          .
        </p>
      </motion.header>

      {/* stats */}
      <StatsHero stats={stats} />

      {/* currently watching */}
      {WATCHING.length > 0 && (
        <motion.section variants={fade} className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight text-slate-800">
            Currently Watching
          </h2>
          <motion.div
            variants={stagger}
            className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
          >
            {WATCHING.map((a) => (
              <AnimeCard key={a.malId || a.title} anime={a} posterUrl={a.malId ? posters[a.malId] : null} />
            ))}
          </motion.div>
        </motion.section>
      )}

      {/* completed */}
      <motion.section variants={fade} className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight text-slate-800">
          Completed
        </h2>
        <motion.div
          variants={stagger}
          className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
        >
          {ANIME.map((a) => (
            <AnimeCard key={a.malId || a.title} anime={a} posterUrl={a.malId ? posters[a.malId] : null} />
          ))}
        </motion.div>
      </motion.section>
    </motion.div>
  );
}
