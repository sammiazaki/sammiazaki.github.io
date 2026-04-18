import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { useDocumentHead } from "@/lib/seo";

const fade = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };
const stagger = { animate: { transition: { staggerChildren: 0.07 } } };

/* ── unified timeline: education + work, newest first ── */
const ROAD = [
  {
    year: "2024",
    tag: "lead",
    title: "Started leading a DS team",
    place: "Partnerz · Dubai (remote)",
    url: "https://partnerz.io/",
    body: "Took ownership of a 4-person data science team building analytics and ML products for Shopify apps. Now I spend my days between roadmap planning, hiring, coaching, and still shipping code — from churn models to fraud detection systems.",
  },
  {
    year: "2023",
    tag: "work",
    title: "Joined Partnerz as Senior DS",
    place: "Partnerz · Dubai (remote)",
    url: "https://partnerz.io/",
    body: "Built the analytics backbone from scratch — 200+ dbt models, multi-environment Airflow pipelines, BigQuery warehouse. Cut compute costs in half along the way. Shipped ML systems for product classification, sentiment analysis, and customer acquisition tracking.",
  },
  {
    year: "2023",
    tag: "edu",
    title: "Finished my MSc",
    place: "Sharif University of Technology · Tehran",
    body: "Graduated 6th out of 150 (GPA 19.57/20). My thesis was on active learning for political tweet classification — sampling strategies, contrastive examples, maximum discrepancy classifiers. Also published Hengam, an adversarially trained transformer for Persian temporal tagging, at AACL.",
  },
  {
    year: "2020",
    tag: "work",
    title: "University meets industry",
    place: "IIS Lab · Sharif University of Technology, Tehran",
    url: "https://www.linkedin.com/company/intelligent-information-solutions-center/about/",
    body: "IIS is a Sharif-based center that bridges academic expertise and real industry needs — I worked here alongside my MSc. I wore two hats. First, I designed the architecture for a last-mile logistics delivery product and coordinated its implementation with a software team. Second, I led a data science project forecasting crude oil prices with time-series models — the predictions turned out remarkably accurate, mostly thanks to an unusually stable global economy that year. That was probably my first real taste of leading a technical effort.",
  },
  {
    year: "2019",
    tag: "work",
    title: "First real job — jumped into everything",
    place: "Paziresh24 · Yazd",
    url: "https://tracxn.com/d/companies/paziresh24/__ttofuqL6G6_zy2K1Eev1vedM3o4VuMoSEmndWiS4GUE",
    body: "Paziresh24 is Iran's online doctor appointment and consultation platform. I joined fresh out of undergrad as a junior who'd touched algorithms, coding, UI/UX, and a bit of data — and this was my first taste of real industry. I started by helping patients find the closest available appointment faster, then owned the doctor search: replaced a plain SQL query with a full ELK stack that dropped response times from seconds to under 200ms. Along the way I picked up Power BI and started pulling insights for executives — probably my baby steps toward causal thinking, or at least the feeling that I'd need it someday.",
  },
  {
    year: "2015",
    tag: "edu",
    title: "Found my thing",
    place: "Isfahan University of Technology · Isfahan",
    body: "I actually started as an Electrical Engineering student. Something felt off for a year — until I discovered algorithms. That was the click. With a lot of patience I switched my major to Computer Engineering and never looked back. Data structures, databases, writing my first real programs — those were great times. I miss them.",
  },
];

const TAG_STYLES = {
  work: "bg-slate-800 text-white",
  lead: "bg-slate-800 text-white",
  edu: "bg-slate-200 text-slate-600",
};
const TAG_LABELS = { work: "work", lead: "lead", edu: "study" };

/* ── small dot on the timeline ── */
const Dot = ({ tag }) => (
  <div className="relative flex flex-col items-center">
    <span
      className={`z-10 h-3 w-3 rounded-full border-2 border-white shadow ${
        tag === "edu" ? "bg-slate-300" : "bg-slate-700"
      }`}
    />
  </div>
);

export default function About() {
  useDocumentHead({
    title: "About",
    description:
      "Sajad Mirzababaei (Sam Miazaki) — data science tech lead at Partnerz, Sharif MSc, focused on causal inference, NLP, and time-series.",
    path: "/about",
    type: "profile",
  });

  return (
    <motion.div
      className="mx-auto max-w-2xl px-6 py-16 space-y-14"
      variants={stagger}
      initial="initial"
      animate="animate"
    >
      {/* header */}
      <motion.header variants={fade} className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">About me</h1>
        <div className="space-y-3 text-[15px] text-slate-500 leading-relaxed">
          <p>
            I'm Sajad — I go by Sam online. I build data products for a living,
            but what actually drives me is trying to understand how things work.
            Systems, incentives, people, markets. If I ever go back to school
            it'll be a PhD in economics — that's the lens I can't put down.
          </p>
          <p>
            I think AI will change the world, but not the way most people
            imagine. Not through some superintelligence moment. It'll happen
            through customization at scale — the commoditization of intelligence
            and the automation of automation itself. The real revolution is
            making knowledge accessible to everyone, not just those who can
            afford it or were born in the right place.
          </p>
          <p>
            I was born and raised in Iran — a place where everyone you meet in
            the street is a politician. Our lives are politically fused whether
            we like it or not. I've tried my best to stay objective through all
            of it. I think about power structures, individual freedom, fairness,
            and how nations shape each other — but I try to reason, not react.
          </p>
          <p>
            I want to build things that last. I'm not sure yet what that looks
            like exactly — and I'm fine with that being unresolved. Here's the
            path so far.
          </p>
        </div>
      </motion.header>

      {/* timeline */}
      <motion.section variants={fade} className="relative">
        {/* vertical line */}
        <div className="absolute left-[21px] top-2 bottom-2 w-px bg-slate-200" />

        <div className="space-y-8">
          {ROAD.map((item, i) => (
            <motion.div
              key={i}
              variants={fade}
              className="relative grid grid-cols-[44px_1fr] gap-3"
            >
              {/* dot column */}
              <div className="flex justify-center pt-1.5">
                <Dot tag={item.tag} />
              </div>

              {/* content */}
              <div className="space-y-1.5 pb-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-xs font-mono text-slate-400">
                    {item.year}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium leading-none ${TAG_STYLES[item.tag]}`}
                  >
                    {TAG_LABELS[item.tag]}
                  </span>
                </div>
                <h3 className="text-[15px] font-semibold text-slate-800 leading-snug">
                  {item.title}
                </h3>
                {item.url ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-slate-400 underline underline-offset-2 decoration-slate-300 hover:text-slate-600 hover:decoration-slate-400 transition-colors"
                  >
                    {item.place}
                  </a>
                ) : (
                  <p className="text-xs text-slate-400">{item.place}</p>
                )}
                <p className="text-sm text-slate-500 leading-relaxed">
                  {item.body}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* non-work */}
      <motion.section variants={fade} className="space-y-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Outside work
        </h2>
        <Link
          to="/anime"
          className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all"
        >
          <div>
            <div className="text-sm font-semibold group-hover:text-slate-700">
              Anime
            </div>
            <p className="mt-1 text-xs text-slate-500">
              26 titles watched and counting.
            </p>
          </div>
          <ChevronRight
            size={16}
            className="text-slate-300 group-hover:text-slate-500 transition-colors"
          />
        </Link>
      </motion.section>
    </motion.div>
  );
}
