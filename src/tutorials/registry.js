// Tutorial registry — add new tutorials here.
// Each entry maps a URL slug to its metadata and lazy-loaded component.

import { lazy } from "react";

const tutorials = [
  {
    slug: "ci-overlap",
    title: "Overlapping Confidence Intervals",
    description:
      "Why overlap between two separate confidence intervals is not the right test for whether two estimates differ.",
    date: "2026-03-29",
    tags: ["inference", "confidence intervals", "hypothesis testing"],
    source: {
      title: "Overlapping Confidence Intervals and Statistical (In)Significance",
      author: "Vasco Yasenov",
      url: "https://vyasenov.github.io/blog/overlapping-conf-intervals.html",
    },
    component: lazy(() => import("./ci-overlap/CIOverlapTutorial.jsx")),
  },
  {
    slug: "distributions",
    title: "Probability Distributions",
    description:
      "A comprehensive interactive guide to discrete and continuous distributions, their parameters, shapes, and the Central Limit Theorem.",
    date: "2026-03-29",
    tags: [
      "probability",
      "distributions",
      "normal",
      "binomial",
      "poisson",
      "CLT",
      "beta",
    ],
    component: lazy(() => import("./distributions/DistributionsTutorial.jsx")),
  },
  {
    slug: "propensity-score",
    title: "Propensity Score",
    description:
      "An interactive guide to propensity scores: selection bias, inverse probability weighting, covariate balance, and positivity.",
    date: "2026-03-30",
    tags: ["causal inference", "propensity score", "IPTW", "observational data"],
    source: {
      title: "Propensity Score — Causal Inference for the Brave and True",
      author: "Matheus Facure",
      url: "https://matheusfacure.github.io/python-causality-handbook/11-Propensity-Score.html",
    },
    component: lazy(() => import("./propensity-score/PropensityScoreTutorial.jsx")),
  },
  {
    slug: "doubly-robust",
    title: "Doubly Robust Estimation",
    description:
      "Learn how combining propensity scores and outcome regression creates an estimator that only needs one model to be correct.",
    date: "2026-03-31",
    tags: ["causal inference", "propensity score", "regression", "doubly robust"],
    source: {
      title: "Doubly Robust Estimation — Causal Inference for the Brave and True",
      author: "Matheus Facure",
      url: "https://matheusfacure.github.io/python-causality-handbook/12-Doubly-Robust-Estimation.html",
    },
    component: lazy(() => import("./doubly-robust/DoublyRobustTutorial.jsx")),
  },
];

export default tutorials;

export function getTutorial(slug) {
  return tutorials.find((t) => t.slug === slug);
}
