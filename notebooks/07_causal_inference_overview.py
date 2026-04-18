import marimo

__generated_with = "0.23.0"
app = marimo.App(width="medium", css_file="custom.css", auto_download=["html"])


@app.cell
def _():
    import marimo as mo

    return (mo,)


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    # Causal Inference — A Map of the Territory
    ## Ten chapters of Facure's handbook, replicated end-to-end

    Companion notebook for the *Causal Inference: A Map of the Territory* tutorial.
    Replicates every numeric claim cited in the tutorial against the original
    datasets from Matheus Facure's *Python Causality Handbook* (chapters 1–10).

    - **Datasets**: fetched directly from Facure's GitHub
      (`matheusfacure/python-causality-handbook/.../data/`).
    - **Methods covered**: potential outcomes, RCT mean-difference, FWL
      theorem, good vs bad controls, IV / LATE / 2SLS, nearest-neighbour
      matching with bias correction.
    - **Why replicate?** Every number in the web tutorial is traceable to a
      cell below. If a dataset changes upstream, this notebook is the
      ground-truth check.

    ---
    """)
    return


@app.cell
def _():
    import io
    import urllib.request
    import numpy as np
    import pandas as pd
    import statsmodels.formula.api as smf
    from linearmodels.iv import IV2SLS
    from scipy.stats import norm

    BASE = ("https://raw.githubusercontent.com/matheusfacure/"
            "python-causality-handbook/master/"
            "causal-inference-for-the-brave-and-true/data")

    def load(name):
        with urllib.request.urlopen(f"{BASE}/{name}") as r:
            return pd.read_csv(io.BytesIO(r.read()))

    pd.set_option("display.float_format", "{:.4f}".format)
    return IV2SLS, load, norm, np, pd, smf


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ## Ch 1 · Potential outcomes & the bias decomposition

    Facure's 4-school tablet table is a *fictional* example used to make
    the bias decomposition concrete. We reconstruct it to verify the algebra.
    """)
    return


@app.cell
def _(pd):
    sch = pd.DataFrame({
        "i":  [1, 2, 3, 4],
        "y0": [500, 600, 800, 700],
        "y1": [450, 600, 600, 750],
        "t":  [0, 0, 1, 1],
    })
    sch["y"]  = sch.apply(lambda r: r.y1 if r.t == 1 else r.y0, axis=1)
    sch["te"] = sch.y1 - sch.y0
    ate_sch   = sch.te.mean()
    att_sch   = sch.loc[sch.t == 1, "te"].mean()
    naive_sch = sch.loc[sch.t == 1, "y"].mean() - sch.loc[sch.t == 0, "y"].mean()
    bias_sch  = sch.loc[sch.t == 1, "y0"].mean() - sch.loc[sch.t == 0, "y0"].mean()
    print(sch)
    print(f"ATE   = {ate_sch}    ATT   = {att_sch}")
    print(f"naive = {naive_sch}    bias = {bias_sch}")
    print(f"identity: naive = ATT + bias  →  {att_sch} + {bias_sch} = {att_sch + bias_sch}")
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ## Ch 2–3 · Randomization: the online-classroom RCT

    323 students, three formats (face-to-face, online, blended). Following
    Facure, we drop `format_blended == 1` and compare online vs face-to-face.
    """)
    return


@app.cell
def _(load, norm, np, smf):
    oc = load("online_classroom.csv").query("format_blended == 0")
    online = oc.loc[oc.format_ol == 1, "falsexam"]
    f2f    = oc.loc[oc.format_ol == 0, "falsexam"]
    ate_oc = online.mean() - f2f.mean()
    se_oc  = np.sqrt(online.var(ddof=1)/len(online) + f2f.var(ddof=1)/len(f2f))
    z_oc   = ate_oc / se_oc
    p_oc   = 2 * (1 - norm.cdf(abs(z_oc)))
    print(f"n_f2f={len(f2f)}   n_online={len(online)}")
    print(f"mean f2f   = {f2f.mean():.4f}")
    print(f"mean online= {online.mean():.4f}")
    print(f"ATE        = {ate_oc:.4f}")
    print(f"SE(diff)   = {se_oc:.4f}   z = {z_oc:.4f}   p = {p_oc:.4f}")
    reg = smf.ols("falsexam ~ format_ol", data=oc).fit()
    print("\nRegression form (matches by construction):")
    print(reg.summary().tables[1])
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ## Ch 5 · Regression as adjustment (FWL, OVB)

    Wage example. Facure reports **5.36 %** (short) → **4.11 %** (long)
    after controlling for IQ, experience, tenure, age, race, region, urban,
    and family background.

    > **Sample note.** Facure runs `.dropna()` before fitting — this drops
    > rows missing `brthord`, `meduc`, or `feduc`, shrinking `n` from 935
    > to 663. Skipping this step gives a slightly different long-coef (~4.73 %).
    """)
    return


@app.cell
def _(load, np, smf):
    w = load("wage.csv").dropna()
    w = w.assign(hwage=w["wage"] / w["hours"])

    short = smf.ols("np.log(hwage) ~ educ", data=w).fit()
    print(f"short: coef(educ) = {short.params['educ']:.4f}  "
          f"SE = {short.bse['educ']:.4f}")

    ctrl = ["IQ","exper","tenure","age","married","black","south","urban",
            "sibs","brthord","meduc","feduc"]
    long_ = smf.ols("lhwage ~ educ + " + " + ".join(ctrl), data=w).fit()
    print(f"long:  coef(educ) = {long_.params['educ']:.4f}  "
          f"SE = {long_.bse['educ']:.4f}")
    print(f"bias  = short - long = {short.params['educ'] - long_.params['educ']:.4f}")

    # FWL — regress educ on controls, outcome on controls, then regress resid on resid
    e_res = smf.ols("educ ~ " + " + ".join(ctrl), data=w).fit().resid
    y_res = smf.ols("lhwage ~ " + " + ".join(ctrl), data=w).fit().resid
    fwl = np.cov(y_res, e_res)[0, 1] / np.var(e_res, ddof=1)
    print(f"FWL (regress-on-residuals, manual) = {fwl:.4f}  "
          f"[matches long coef]")
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ## Ch 7 · Good controls vs bad controls

    `collections_email` is a randomized email campaign. Naive regression can't
    detect the effect because `payments` is very noisy. Adding **outcome
    predictors** (`credit_limit`, `risk_score`) tightens the SE and reveals
    the ~4.43 reais effect. The controls are neither confounders (treatment
    was randomized) nor mediators — they just soak up outcome variance.
    """)
    return


@app.cell
def _(load, smf):
    ce = load("collections_email.csv")
    m0 = smf.ols("payments ~ email", data=ce).fit()
    m1 = smf.ols("payments ~ email + credit_limit + risk_score", data=ce).fit()
    print(f"naive:     coef = {m0.params['email']:+.4f}  SE = {m0.bse['email']:.4f}  p = {m0.pvalues['email']:.4f}")
    print(f"+controls: coef = {m1.params['email']:+.4f}  SE = {m1.bse['email']:.4f}  p = {m1.pvalues['email']:.4f}")
    print(f"SE reduction: {(1 - m1.bse['email']/m0.bse['email'])*100:.1f}%")
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ## Ch 9 · Instrumental variables & LATE

    Push-notification experiment: `push_assigned` is randomized but
    `push_delivered` is not — older phones fail to receive the push, and
    older phones correlate with lower income, which confounds the
    purchase outcome.

    | estimand | meaning | expected sign |
    |----------|---------|---------------|
    | naive OLS | biased by income | upward |
    | ITT / reduced form | effect of being *assigned* | attenuated |
    | first stage | compliance rate | positive |
    | LATE (2SLS) | effect on *compliers* | the unbiased answer |

    Facure's "naive OLS" of **27.60** comes from a *joint* regression
    `Y ~ Z + T` where the Z-coef soaks up the assignment effect.
    A simple `Y ~ T` regression gives the more intuitive upward-biased
    13.93 — same story, smaller number.
    """)
    return


@app.cell
def _(IV2SLS, load, smf):
    ap = load("app_engagement_push.csv")

    # Facure's exact OLS spec
    ols = IV2SLS.from_formula(
        "in_app_purchase ~ 1 + push_assigned + push_delivered", ap).fit()
    print("Facure's OLS (Y ~ Z + T):")
    print(ols.summary.tables[1])

    # Intuitive single-regressor version
    simple = smf.ols("in_app_purchase ~ push_delivered", ap).fit()
    print(f"\nSimple OLS (Y ~ T):  coef = {simple.params['push_delivered']:.4f}")

    first = smf.ols("push_delivered ~ push_assigned", ap).fit()
    rf    = smf.ols("in_app_purchase ~ push_assigned", ap).fit()
    iv    = IV2SLS.from_formula(
        "in_app_purchase ~ 1 + [push_delivered ~ push_assigned]", ap).fit()
    print(f"\nfirst stage (T~Z) = {first.params['push_assigned']:.4f}")
    print(f"reduced form (Y~Z) = {rf.params['push_assigned']:.4f}")
    print(f"Wald = RF / first  = {rf.params['push_assigned']/first.params['push_assigned']:.4f}")
    print(f"2SLS LATE          = {iv.params['push_delivered']:.4f}  "
          f"SE = {iv.std_errors['push_delivered']:.4f}")
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ## Ch 10 · Matching & bias correction

    Medicine-recovery dataset: `severity` is a strong confounder — doctors
    give the drug to the sickest patients, so the naive comparison says the
    drug makes recovery *slower*. Matching + bias correction recovers the
    true sign.

    We replicate Facure's two-sided matching estimator:

    $$
    \widehat{ATE} = \frac{1}{N}\sum_{i=1}^{N} (2T_i - 1)\big(Y_i - Y_{j(i)}\big)
    $$

    and the Abadie–Imbens bias-corrected variant that subtracts
    $\hat{\mu}_0(X_i) - \hat{\mu}_0(X_{j(i)})$ for each treated match
    (and symmetrically for controls).
    """)
    return


@app.cell
def _(load, np, pd):
    from sklearn.neighbors import KNeighborsRegressor, NearestNeighbors
    from sklearn.linear_model import LinearRegression
    from sklearn.preprocessing import StandardScaler

    mr = load("medicine_impact_recovery.csv")
    naive_med = (mr.loc[mr.medication == 1, "recovery"].mean()
                 - mr.loc[mr.medication == 0, "recovery"].mean())
    print(f"naive diff (medication - no medication): {naive_med:+.4f} days")

    X_cols = ["severity", "age", "sex"]
    med = mr.copy()
    med[X_cols] = StandardScaler().fit_transform(med[X_cols])
    t = med.query("medication == 1")
    u = med.query("medication == 0")

    mt0 = KNeighborsRegressor(n_neighbors=1).fit(u[X_cols], u["recovery"])
    mt1 = KNeighborsRegressor(n_neighbors=1).fit(t[X_cols], t["recovery"])
    pred = pd.concat([
        t.assign(match=mt0.predict(t[X_cols])),
        u.assign(match=mt1.predict(u[X_cols])),
    ])
    ate_raw = np.mean((2 * pred["medication"] - 1)
                      * (pred["recovery"] - pred["match"]))
    print(f"matching ATE (raw):              {ate_raw:+.4f}")

    ols0 = LinearRegression().fit(u[X_cols], u["recovery"])
    ols1 = LinearRegression().fit(t[X_cols], t["recovery"])
    t_idx = mt0.kneighbors(t[X_cols], n_neighbors=1)[1].ravel()
    u_idx = mt1.kneighbors(u[X_cols], n_neighbors=1)[1].ravel()
    pt = t.assign(
        match=mt0.predict(t[X_cols]),
        bc=ols0.predict(t[X_cols]) - ols0.predict(u.iloc[t_idx][X_cols]),
    )
    pu = u.assign(
        match=mt1.predict(u[X_cols]),
        bc=ols1.predict(u[X_cols]) - ols1.predict(t.iloc[u_idx][X_cols]),
    )
    p2 = pd.concat([pt, pu])
    ate_bc = np.mean((2 * p2["medication"] - 1)
                     * ((p2["recovery"] - p2["match"]) - p2["bc"]))
    print(f"matching ATE (bias-corrected):   {ate_bc:+.4f}")
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ## Key numbers — one-page summary

    | Chapter | Claim | Replicated value |
    |--:|---|---|
    | Ch 1 | ATE / ATT / naive / bias | −50 / −75 / +125 / +200 |
    | Ch 2 | online−f2f difference, SE | −4.91, 1.77 |
    | Ch 3 | p-value two-sided | 0.0054 (OLS p = 0.0038) |
    | Ch 5 | short → long educ coef | 0.0536 → 0.0411 |
    | Ch 7 | email effect, SE before/after controls | +4.43, SE 2.94 → 2.13 |
    | Ch 9 | OLS / ITT / first / LATE | 27.60 / 2.36 / 0.718 / 3.29 |
    | Ch 10 | naive / matching raw / matching BC | +16.9 / −1.0 / −7.4 |

    Every number above is regenerated from scratch by running the cells
    in this notebook — no hard-coded values.
    """)
    return


if __name__ == "__main__":
    app.run()
