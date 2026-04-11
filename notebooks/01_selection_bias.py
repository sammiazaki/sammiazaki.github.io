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
    # The Training That Seemed Useless
    ## Selection Bias → Propensity Score Weighting

    **Method:** Propensity Score Weighting (IPW) and Matching

    **Dataset:** LaLonde / National Supported Work (NSW) Demonstration

    **Key insight:** When treatment isn't random, naive comparisons lie.

    An RCT benchmark lets us check if our correction actually works.

    ---

    ### The story

    In the 1970s, the **National Supported Work (NSW)** program offered job training
    to disadvantaged workers — people with limited education, prior arrests, or long
    unemployment spells. A randomized experiment showed the program **raised earnings
    by ~$1,794**.

    But what if we didn't have the experiment? What if we tried to estimate the
    effect by comparing NSW participants to a national survey?

    That's exactly what Robert LaLonde did in 1986. His finding was devastating:
    **observational methods got the wrong sign** — they concluded the program
    *hurt* participants. The problem? Selection bias. The comparison group
    was fundamentally different from NSW participants.

    This notebook walks through:
    1. **Exploring** the experimental and observational data
    2. **Seeing** selection bias in action (the naive estimate)
    3. **Fixing** it with propensity score weighting
    4. **Checking** our answer against the RCT benchmark ($1,794)

    > **Note on the comparison group:** LaLonde's original paper used both the
    > CPS (Current Population Survey) and PSID (Panel Study of Income Dynamics)
    > as non-experimental comparison groups. Here we use the **CPS-1** sample
    > from the `causaldata` package — the same dataset used in Cunningham's
    > *Causal Inference: The Mixtape*. The selection bias story is the same
    > with either comparison group.
    """)
    return


@app.cell
def _():
    import numpy as np
    import pandas as pd
    import matplotlib.pyplot as plt
    import seaborn as sns
    from sklearn.linear_model import LogisticRegression
    import statsmodels.api as sm
    import statsmodels.formula.api as smf

    sns.set_theme(style="whitegrid", font_scale=0.95)
    plt.rcParams["figure.dpi"] = 120
    return LogisticRegression, np, pd, plt, smf


@app.cell
def _(mo):
    mo.md(r"""
    ---
    ## 1. Meet the data

    We need two pieces:

    | Dataset | What it is | N |
    |---------|-----------|---|
    | **NSW experimental** | Randomized: 185 treated + 260 control | 445 |
    | **CPS comparison** | National survey (non-experimental) | ~15,992 |

    The experimental data gives us the **truth** (the RCT benchmark).
    The CPS comparison group creates the **selection bias problem** we'll fix.

    ### Variables

    | Variable | Description |
    |----------|-------------|
    | `treat` | 1 = NSW participant, 0 = control |
    | `age` | Age in years |
    | `educ` | Years of education |
    | `black`, `hisp` | Race indicators |
    | `married` | Married indicator |
    | `nodegree` | 1 = no high school diploma |
    | `re74`, `re75` | Real earnings in 1974, 1975 (pre-treatment) |
    | `re78` | Real earnings in 1978 (**outcome**) |
    """)
    return


@app.cell
def _():
    from causaldata import nsw_mixtape

    # Full experimental sample (treated + randomized controls)
    nsw = nsw_mixtape.load_pandas().data.copy()
    if "marr" in nsw.columns and "married" not in nsw.columns:
        nsw = nsw.rename(columns={"marr": "married"})

    # Separate treated and experimental controls
    nsw_treated = nsw[nsw["treat"] == 1].copy()
    nsw_control = nsw[nsw["treat"] == 0].copy()

    print(f"NSW experimental sample: {len(nsw)} rows")
    print(f"  Treated: {len(nsw_treated)}")
    print(f"  Control: {len(nsw_control)}")
    nsw.head()
    return nsw_control, nsw_treated


@app.cell
def _():
    from causaldata import cps_mixtape

    # Load CPS comparison group (non-experimental)
    psid = cps_mixtape.load_pandas().data.copy()
    psid["treat"] = 0  # all comparison units
    # Align column names with nsw_mixtape (marr -> married)
    if "marr" in psid.columns and "married" not in psid.columns:
        psid = psid.rename(columns={"marr": "married"})

    print(f"CPS comparison group: {len(psid)} rows")
    psid.head()
    return (psid,)


@app.cell
def _(mo):
    mo.md(r"""
    ### The observational dataset

    Now we combine the NSW **treated** group with the CPS **comparison** group.
    This mimics what a researcher would have without the experiment:
    program participants vs. a convenience sample from a national survey.
    """)
    return


@app.cell
def _(nsw_treated, pd, psid):
    # The observational dataset: NSW treated + CPS comparison
    obs = pd.concat([nsw_treated, psid], ignore_index=True)
    print(f"Observational dataset: {len(obs)} rows ({len(nsw_treated)} treated, {len(psid)} CPS controls)")
    return (obs,)


@app.cell
def _(mo):
    mo.md(r"""
    ---
    ## 2. Explore the data — why selection bias exists

    Let's compare the treated group to both control groups.
    If the groups are balanced, naive comparison works. If not, we have selection bias.
    """)
    return


@app.cell
def _(np, nsw_control, nsw_treated, pd, psid):
    # Compare means and standard deviations across the three groups
    covariates = ["age", "educ", "black", "hisp", "married", "nodegree", "re74", "re75"]

    _rows = []
    for _col in covariates:
        _t_mean = nsw_treated[_col].mean()
        _t_sd = nsw_treated[_col].std()
        _c_mean = nsw_control[_col].mean()
        _c_sd = nsw_control[_col].std()
        _p_mean = psid[_col].mean()
        _p_sd = psid[_col].std()
        # SMD: treated vs CPS
        _pooled = np.sqrt((_t_sd**2 + _p_sd**2) / 2)
        _smd = (_t_mean - _p_mean) / _pooled if _pooled > 0 else 0
        _rows.append({
            "Variable": _col,
            "NSW Treated": f"{_t_mean:.2f} ({_t_sd:.2f})",
            "NSW Control": f"{_c_mean:.2f} ({_c_sd:.2f})",
            "CPS Comparison": f"{_p_mean:.2f} ({_p_sd:.2f})",
            "SMD (T vs CPS)": f"{_smd:.2f}",
        })

    balance = pd.DataFrame(_rows).set_index("Variable")
    balance
    return (covariates,)


@app.cell
def _(mo):
    mo.md(r"""
    **Look at the imbalance** (values shown as mean ± SD):

    - NSW participants are younger, less educated, more likely Black, less likely married
    - Their pre-treatment earnings (`re74`, `re75`) are **much lower** — often near zero
    - The CPS group is a general population sample with higher earnings
    - The SMD column shows how far apart the groups are in standard-deviation units — anything above |0.1| is concerning, and several covariates exceed |1.0|

    The randomized NSW control group is balanced with treated (by design).
    The CPS group is **not** — this is the source of selection bias.
    """)
    return


@app.cell
def _(nsw_control, nsw_treated, plt, psid):
    # Visualize the imbalance in pre-treatment earnings using KDE curves
    _fig, _axes = plt.subplots(1, 2, figsize=(12, 4))

    for _ax, _var, _title in [
        (_axes[0], "re74", "Pre-treatment earnings (1974)"),
        (_axes[1], "re75", "Pre-treatment earnings (1975)"),
    ]:
        _ax.hist(nsw_treated[_var], bins=30, alpha=0.5, label="NSW Treated", color="#2563eb", density=True)
        _ax.hist(nsw_control[_var], bins=30, alpha=0.5, label="NSW Control", color="#10b981", density=True)
        # KDE overlay for CPS (too many points for readable histogram overlap)
        _cps_vals = psid[_var][psid[_var] > 0]
        if len(_cps_vals) > 10:
            _cps_vals.plot.kde(ax=_ax, color="#f59e0b", linewidth=2, label="CPS (KDE)")
        _ax.set_xlabel(f"Earnings ($)")
        _ax.set_title(_title)
        _ax.legend(fontsize=8)
        _ax.set_xlim(-2000, 50000)

    plt.tight_layout()
    _fig
    return


@app.cell
def _(mo):
    mo.md(r"""
    The treated group has a massive spike at zero earnings — these are people
    who were unemployed before the program. The CPS group has a normal-ish
    earnings distribution spread across a much higher range. These groups are not comparable.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---
    ## 3. The naive estimate (and the RCT benchmark)

    ### RCT benchmark (the truth)

    With the experimental data, the ATE is just the difference in means:

    $$\hat{\tau}_{RCT} = \bar{Y}^{treated} - \bar{Y}^{control}$$

    This is unbiased because randomization ensures the groups are comparable.
    """)
    return


@app.cell
def _(nsw_control, nsw_treated):
    # RCT benchmark
    rct_ate = nsw_treated["re78"].mean() - nsw_control["re78"].mean()
    print(f"RCT benchmark (experimental estimate):")
    print(f"  Mean earnings, treated:  ${nsw_treated['re78'].mean():,.0f}")
    print(f"  Mean earnings, control:  ${nsw_control['re78'].mean():,.0f}")
    print(f"  ATE = ${rct_ate:,.0f}")
    print(f"\nThis is our target. Any observational method should get close to ${rct_ate:,.0f}.")
    return (rct_ate,)


@app.cell
def _(mo):
    mo.md(r"""
    ### Naive observational estimate

    Now pretend we don't have the experiment. Use the CPS as the control group:

    $$\hat{\tau}_{naive} = \bar{Y}^{treated} - \bar{Y}^{CPS}$$
    """)
    return


@app.cell
def _(nsw_treated, psid):
    # Naive estimate using CPS controls
    naive_ate = nsw_treated["re78"].mean() - psid["re78"].mean()
    print(f"Naive observational estimate:")
    print(f"  Mean earnings, treated:  ${nsw_treated['re78'].mean():,.0f}")
    print(f"  Mean earnings, CPS:     ${psid['re78'].mean():,.0f}")
    print(f"  Naive ATE = ${naive_ate:,.0f}")
    print(f"\nThe naive estimate says the program HURT participants!")
    print(f"The truth (RCT) says it helped by ~$1,794.")
    print(f"That's selection bias at work.")
    return (naive_ate,)


@app.cell
def _(mo):
    mo.md(r"""
    ### Why is the naive estimate so wrong?

    $$\underbrace{\bar{Y}^{T} - \bar{Y}^{CPS}}_{\text{naive}} = \underbrace{\tau}_{\text{true effect}} + \underbrace{\text{Bias}}_{\text{selection}}$$

    The CPS group earns more **not because** the program hurt the treated,
    but because the CPS group was already higher-earning to begin with.
    The naive estimate confounds the treatment effect with pre-existing differences.

    **Selection bias formula:**

    $$\text{Bias} = E[Y_0 | T=1] - E[Y_0 | T=0]$$

    The potential untreated outcome differs between groups. Program participants
    would have earned less *even without* the program — they were selected precisely
    because they were disadvantaged.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---
    ## 4. Can regression fix it?

    Let's try OLS with controls — the first thing most analysts would try:

    $$Y_i = \alpha + \tau \cdot T_i + X_i'\beta + \varepsilon_i$$

    where $X_i$ includes age, education, race, marital status, and pre-treatment earnings.
    """)
    return


@app.cell
def _(obs, rct_ate, smf):
    # OLS with controls on the observational data
    ols_model = smf.ols(
        "re78 ~ treat + age + educ + black + hisp + married + nodegree + re74 + re75",
        data=obs,
    ).fit()

    _ols_ate = ols_model.params["treat"]
    _ols_se = ols_model.bse["treat"]
    _ols_p = ols_model.pvalues["treat"]

    print(f"OLS estimate of treatment effect: ${_ols_ate:,.0f}")
    print(f"  (SE = ${_ols_se:,.0f}, p = {_ols_p:.4f})")
    print(f"  95% CI: [${_ols_ate - 1.96*_ols_se:,.0f}, ${_ols_ate + 1.96*_ols_se:,.0f}]")
    print(f"\nRCT benchmark: ${rct_ate:,.0f}")
    print(f"OLS gap from truth: ${_ols_ate - rct_ate:,.0f}")
    print(f"\nKey coefficients:")
    for _var in ["treat", "re74", "re75", "black", "age", "educ"]:
        print(f"  {_var:>10s}: {ols_model.params[_var]:>10,.1f}  (p={ols_model.pvalues[_var]:.3f})")
    return (ols_model,)


@app.cell
def _(mo):
    mo.md(r"""
    OLS with controls helps — the coefficient on `re74` and `re75` does most of the
    heavy lifting, absorbing the pre-existing earnings gap. But OLS assumes a **linear**
    relationship between covariates and the outcome. If the covariate distributions
    barely overlap (which we saw — they don't!), OLS extrapolates dangerously.

    We need a method that explicitly addresses the **selection mechanism**.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---
    ## 5. Propensity score estimation

    The **propensity score** is the probability of receiving treatment given covariates:

    $$e(X_i) = P(T_i = 1 \mid X_i)$$

    We estimate it with logistic regression:

    $$\log \frac{e(X)}{1 - e(X)} = X'\gamma$$

    ### Why does this help?

    **Rosenbaum & Rubin (1983):** If treatment assignment is independent of
    potential outcomes conditional on $X$ (ignorability), then it's also
    independent conditional on $e(X)$ alone.

    $$\{Y_0, Y_1\} \perp T \mid X \implies \{Y_0, Y_1\} \perp T \mid e(X)$$

    This reduces a high-dimensional balancing problem to a single scalar.

    ### Model specification

    Following Dehejia & Wahba (1999), we include **quadratic terms** for pre-treatment
    earnings (`re74²`, `re75²`) and an interaction (`educ × re74`). A linear-only
    specification produces poor overlap between treated and CPS controls — the logistic
    model becomes too confident in separating the groups, yielding extreme propensity
    scores and unstable weights.
    """)
    return


@app.cell
def _(LogisticRegression, covariates, obs):
    # Estimate propensity scores with quadratic terms (Dehejia-Wahba spec)
    _obs_feat = obs.copy()
    _obs_feat["re74_sq"] = _obs_feat["re74"] ** 2
    _obs_feat["re75_sq"] = _obs_feat["re75"] ** 2
    _obs_feat["educ_re74"] = _obs_feat["educ"] * _obs_feat["re74"]

    _ps_features = covariates + ["re74_sq", "re75_sq", "educ_re74"]
    _X = _obs_feat[_ps_features].values
    _T = _obs_feat["treat"].values

    # Standardize features for stable logistic regression
    _X_mean = _X.mean(axis=0)
    _X_std = _X.std(axis=0)
    _X_std[_X_std == 0] = 1
    _X_scaled = (_X - _X_mean) / _X_std

    _ps_model = LogisticRegression(max_iter=2000, C=1.0, solver="lbfgs")
    _ps_model.fit(_X_scaled, _T)

    obs_ps = obs.copy()
    obs_ps["pscore"] = _ps_model.predict_proba(_X_scaled)[:, 1]

    print("Propensity score summary:")
    print(obs_ps.groupby("treat")["pscore"].describe().round(4))
    print(f"\nFeatures: {_ps_features}")
    return (obs_ps,)


@app.cell
def _(obs_ps, plt):
    # Visualize propensity score distributions
    _fig, _ax = plt.subplots(figsize=(10, 4))

    _treated_ps = obs_ps[obs_ps["treat"] == 1]["pscore"]
    _control_ps = obs_ps[obs_ps["treat"] == 0]["pscore"]

    _ax.hist(_control_ps, bins=50, alpha=0.6, label=f"CPS (N={len(_control_ps)})", color="#f59e0b", density=True)
    _ax.hist(_treated_ps, bins=50, alpha=0.6, label=f"NSW Treated (N={len(_treated_ps)})", color="#2563eb", density=True)
    _ax.set_xlabel("Propensity Score")
    _ax.set_ylabel("Density")
    _ax.set_title("Propensity Score Distribution: Treated vs CPS Controls")
    _ax.axvline(0.1, color="red", linestyle="--", alpha=0.5, label="Common support bound (0.1)")
    _ax.legend()

    # Print overlap statistics
    _pct_cps_below_01 = (_control_ps < 0.1).mean() * 100
    _pct_treated_above_01 = (_treated_ps >= 0.1).mean() * 100
    print(f"CPS controls with pscore < 0.1: {_pct_cps_below_01:.1f}%")
    print(f"Treated units with pscore >= 0.1: {_pct_treated_above_01:.1f}%")

    plt.tight_layout()
    _fig
    return


@app.cell
def _(mo):
    mo.md(r"""
    **Key observation:** Most CPS controls have propensity scores near **zero**
    (they look nothing like the treated). Most treated units have scores spread
    between 0 and 1. The overlap is thin — this is the **positivity problem**.

    Units with extreme propensity scores (near 0 or 1) will get extreme weights,
    which makes the estimator unstable. We'll need to handle this.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---
    ## 6. Inverse Probability Weighting (IPW)

    The IPW estimator reweights observations to create a pseudo-population
    where treatment is independent of covariates.

    ### The math

    $$\hat{\tau}_{IPW} = \frac{1}{N} \sum_{i=1}^{N} \left[ \frac{T_i \cdot Y_i}{e(X_i)} - \frac{(1-T_i) \cdot Y_i}{1 - e(X_i)} \right]$$

    **Intuition:** If a treated unit has a low propensity score (unlikely to be treated
    given their covariates), they're "unusual" — they look like controls but got treated.
    We upweight them because they're informative about what happens when you treat
    people who wouldn't normally be treated.

    ### Horvitz-Thompson weights

    | Group | Weight |
    |-------|--------|
    | Treated | $w_i = \frac{1}{e(X_i)}$ |
    | Control | $w_i = \frac{1}{1 - e(X_i)}$ |

    ### Hand calculation: 3 example units

    Let's make this concrete. Suppose we pick three individuals from our dataset:
    """)
    return


@app.cell
def _(np, obs_ps):
    # Hand calculation with 3 real units from the data
    _treated_ex = obs_ps[obs_ps["treat"] == 1].nsmallest(1, "pscore")
    _treated_hi = obs_ps[obs_ps["treat"] == 1].nlargest(1, "pscore")
    _control_ex = obs_ps[obs_ps["treat"] == 0].nlargest(1, "pscore")

    _examples = [
        ("Treated A (low pscore)", _treated_ex.iloc[0]),
        ("Treated B (high pscore)", _treated_hi.iloc[0]),
        ("Control C (high pscore)", _control_ex.iloc[0]),
    ]

    for _name, _row in _examples:
        _ps = _row["pscore"]
        _y = _row["re78"]
        _t = _row["treat"]
        if _t == 1:
            _w = 1.0 / _ps
            print(f"{_name}:")
            print(f"  e(X) = {_ps:.4f},  Y = ${_y:,.0f}")
            print(f"  Weight = 1/{_ps:.4f} = {_w:.1f}")
            print(f"  → This person looks unusual for a treated unit (low pscore),")
            print(f"    so we upweight them heavily.\n") if _ps < 0.2 else print()
        else:
            _w = 1.0 / (1.0 - _ps)
            print(f"{_name}:")
            print(f"  e(X) = {_ps:.4f},  Y = ${_y:,.0f}")
            print(f"  Weight = 1/(1-{_ps:.4f}) = {_w:.1f}")
            print()

    # Simple weighted mean with just these three
    _t_rows = [e[1] for e in _examples if e[1]["treat"] == 1]
    _c_rows = [e[1] for e in _examples if e[1]["treat"] == 0]
    _tw = [1/r["pscore"] for r in _t_rows]
    _cw = [1/(1-r["pscore"]) for r in _c_rows]
    _wy1 = np.average([r["re78"] for r in _t_rows], weights=_tw)
    _wy0 = np.average([r["re78"] for r in _c_rows], weights=_cw)
    print(f"Weighted mean (treated): ${_wy1:,.0f}")
    print(f"Weighted mean (control): ${_wy0:,.0f}")
    print(f"Mini-IPW ATE = ${_wy1 - _wy0:,.0f}")
    print(f"\n(This is just 3 units — the full estimate uses all {len(obs_ps)} observations.)")
    return


@app.cell
def _(np, obs_ps):
    # IPW estimation — full sample, step by step
    _treated = obs_ps[obs_ps["treat"] == 1]
    _control = obs_ps[obs_ps["treat"] == 0]

    # Horvitz-Thompson weights
    _w_treated = 1.0 / _treated["pscore"]
    _w_control = 1.0 / (1.0 - _control["pscore"])

    # Weighted means
    _y1_ipw = np.average(_treated["re78"], weights=_w_treated)
    _y0_ipw = np.average(_control["re78"], weights=_w_control)
    ipw_ate = _y1_ipw - _y0_ipw

    print(f"IPW estimate (no trimming):")
    print(f"  Weighted mean, treated:  ${_y1_ipw:,.0f}")
    print(f"  Weighted mean, control:  ${_y0_ipw:,.0f}")
    print(f"  IPW ATE = ${ipw_ate:,.0f}")
    print(f"\n  Max treated weight: {_w_treated.max():.1f}")
    print(f"  Max control weight: {_w_control.max():.1f}")
    return (ipw_ate,)


@app.cell
def _(mo):
    mo.md(r"""
    ### Trimming extreme weights

    Extreme propensity scores create extreme weights, making the estimator
    unstable. A common fix: **trim** units outside the common support region.

    **How to choose the threshold?** Look at the propensity score distribution above:
    the vast majority of CPS controls have scores below 0.05 — these units look
    nothing like the treated group and would get enormous weights ($w > 20$).
    We drop units with $e(X) < 0.1$ or $e(X) > 0.9$. This is a standard cutoff
    in the literature (Crump et al., 2009), though results should be checked
    across a range of thresholds.
    """)
    return


@app.cell
def _(np, obs_ps):
    # IPW with trimming
    _trimmed = obs_ps[(obs_ps["pscore"] >= 0.1) & (obs_ps["pscore"] <= 0.9)].copy()
    print(f"After trimming: {len(_trimmed)} rows (dropped {len(obs_ps) - len(_trimmed)})")

    _t = _trimmed[_trimmed["treat"] == 1]
    _c = _trimmed[_trimmed["treat"] == 0]
    print(f"  Treated remaining: {len(_t)}, Controls remaining: {len(_c)}")

    _wt = 1.0 / _t["pscore"]
    _wc = 1.0 / (1.0 - _c["pscore"])

    _y1 = np.average(_t["re78"], weights=_wt)
    _y0 = np.average(_c["re78"], weights=_wc)
    ipw_trimmed = _y1 - _y0

    print(f"\nIPW estimate (trimmed):")
    print(f"  Weighted mean, treated:  ${_y1:,.0f}")
    print(f"  Weighted mean, control:  ${_y0:,.0f}")
    print(f"  IPW ATE = ${ipw_trimmed:,.0f}")
    print(f"  Max weight after trim: {max(_wt.max(), _wc.max()):.1f}")
    return (ipw_trimmed,)


@app.cell
def _(mo):
    mo.md(r"""
    ---
    ## 7. Normalized IPW (Hajek estimator)

    The Horvitz-Thompson weights don't necessarily sum to 1, which can
    amplify estimation error. The **Hajek estimator** normalizes:

    $$\hat{\tau}_{Hajek} = \frac{\sum_i \frac{T_i Y_i}{e(X_i)}}{\sum_i \frac{T_i}{e(X_i)}} - \frac{\sum_i \frac{(1-T_i) Y_i}{1-e(X_i)}}{\sum_i \frac{(1-T_i)}{1-e(X_i)}}$$

    This is just the weighted mean with weights that sum to 1 within each group.
    """)
    return


@app.cell
def _(obs_ps):
    # Hajek (normalized IPW) estimator with trimming
    _tr = obs_ps[(obs_ps["pscore"] >= 0.1) & (obs_ps["pscore"] <= 0.9)].copy()

    _t = _tr[_tr["treat"] == 1]
    _c = _tr[_tr["treat"] == 0]

    # Normalized weights
    _wt = 1.0 / _t["pscore"]
    _wt_norm = _wt / _wt.sum()

    _wc = 1.0 / (1.0 - _c["pscore"])
    _wc_norm = _wc / _wc.sum()

    hajek_y1 = (_wt_norm * _t["re78"]).sum()
    hajek_y0 = (_wc_norm * _c["re78"]).sum()
    hajek_ate = hajek_y1 - hajek_y0

    print(f"Hajek (normalized IPW) estimate:")
    print(f"  Weighted mean, treated:  ${hajek_y1:,.0f}")
    print(f"  Weighted mean, control:  ${hajek_y0:,.0f}")
    print(f"  Hajek ATE = ${hajek_ate:,.0f}")
    return (hajek_ate,)


@app.cell
def _(mo):
    mo.md(r"""
    ---
    ## 8. Did IPW actually fix the imbalance?

    The whole point of IPW is to create balance in covariates between treated
    and control groups. Let's check using **standardized mean differences (SMD)**:

    $$SMD_j = \frac{\bar{X}_j^{treated} - \bar{X}_j^{control}}{\sqrt{(s_j^{T})^2 + (s_j^{C})^2)/2}}$$

    Rule of thumb: $|SMD| < 0.1$ means good balance.
    """)
    return


@app.cell
def _(covariates, np, obs_ps, pd):
    def _compute_smd(data, covs, weight_col=None):
        """Compute standardized mean differences."""
        _t = data[data["treat"] == 1]
        _c = data[data["treat"] == 0]

        _smds = {}
        for _col in covs:
            if weight_col:
                _wt = _t[weight_col] / _t[weight_col].sum()
                _wc = _c[weight_col] / _c[weight_col].sum()
                _mean_t = (_wt * _t[_col]).sum()
                _mean_c = (_wc * _c[_col]).sum()
                _var_t = (_wt * (_t[_col] - _mean_t) ** 2).sum()
                _var_c = (_wc * (_c[_col] - _mean_c) ** 2).sum()
            else:
                _mean_t = _t[_col].mean()
                _mean_c = _c[_col].mean()
                _var_t = _t[_col].var()
                _var_c = _c[_col].var()

            _pooled_sd = np.sqrt((_var_t + _var_c) / 2)
            _smds[_col] = (_mean_t - _mean_c) / _pooled_sd if _pooled_sd > 0 else 0

        return _smds

    # Compute weights for the balance check
    _df = obs_ps[(obs_ps["pscore"] >= 0.1) & (obs_ps["pscore"] <= 0.9)].copy()
    _df["ipw_weight"] = np.where(
        _df["treat"] == 1,
        1.0 / _df["pscore"],
        1.0 / (1.0 - _df["pscore"]),
    )

    _smd_before = _compute_smd(_df, covariates)
    _smd_after = _compute_smd(_df, covariates, weight_col="ipw_weight")

    smd_df = pd.DataFrame({
        "Before IPW": _smd_before,
        "After IPW": _smd_after,
    }).round(3)
    smd_df
    return (smd_df,)


@app.cell
def _(covariates, plt, smd_df):
    # Love plot — visualize balance improvement
    _fig, _ax = plt.subplots(figsize=(8, 5))

    _y_pos = range(len(covariates))
    _ax.scatter(smd_df["Before IPW"], _y_pos, marker="o", s=60, color="#ef4444", label="Before IPW", zorder=3)
    _ax.scatter(smd_df["After IPW"], _y_pos, marker="s", s=60, color="#10b981", label="After IPW", zorder=3)

    # Connect with lines
    for _i, _cov in enumerate(covariates):
        _ax.plot(
            [smd_df.loc[_cov, "Before IPW"], smd_df.loc[_cov, "After IPW"]],
            [_i, _i],
            color="#94a3b8", linewidth=0.8, zorder=1,
        )

    _ax.axvline(0, color="#1e293b", linewidth=0.8)
    _ax.axvline(0.1, color="#f59e0b", linewidth=0.8, linestyle="--", alpha=0.6)
    _ax.axvline(-0.1, color="#f59e0b", linewidth=0.8, linestyle="--", alpha=0.6)

    _ax.set_yticks(list(_y_pos))
    _ax.set_yticklabels(covariates)
    _ax.set_xlabel("Standardized Mean Difference")
    _ax.set_title("Love Plot: Covariate Balance Before and After IPW")
    _ax.legend(loc="lower right")

    plt.tight_layout()
    _fig
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---
    ## 9. Bootstrap standard errors

    Point estimates alone don't tell us how **precise** each method is.
    We use a simple nonparametric bootstrap: resample the observational dataset
    with replacement, re-estimate propensity scores and IPW each time.
    """)
    return


@app.cell
def _(LogisticRegression, covariates, np, obs):
    # Bootstrap IPW standard errors (50 replications)
    _n_boot = 50
    _boot_ipw = []
    _boot_hajek = []

    _ps_features = covariates + ["re74_sq", "re75_sq", "educ_re74"]

    for _b in range(_n_boot):
        _rng = np.random.RandomState(_b)
        _boot_df = obs.sample(n=len(obs), replace=True, random_state=_rng).copy()
        _boot_df["re74_sq"] = _boot_df["re74"] ** 2
        _boot_df["re75_sq"] = _boot_df["re75"] ** 2
        _boot_df["educ_re74"] = _boot_df["educ"] * _boot_df["re74"]

        _X_b = _boot_df[_ps_features].values
        _T_b = _boot_df["treat"].values

        _X_mean = _X_b.mean(axis=0)
        _X_std = _X_b.std(axis=0)
        _X_std[_X_std == 0] = 1
        _X_bs = (_X_b - _X_mean) / _X_std

        try:
            _m = LogisticRegression(max_iter=2000, C=1.0, solver="lbfgs")
            _m.fit(_X_bs, _T_b)
            _boot_df["ps"] = _m.predict_proba(_X_bs)[:, 1]

            _tr = _boot_df[(_boot_df["ps"] >= 0.1) & (_boot_df["ps"] <= 0.9)]
            _t = _tr[_tr["treat"] == 1]
            _c = _tr[_tr["treat"] == 0]

            if len(_t) > 0 and len(_c) > 0:
                _wt = 1.0 / _t["ps"]
                _wc = 1.0 / (1.0 - _c["ps"])

                # IPW
                _boot_ipw.append(np.average(_t["re78"], weights=_wt) - np.average(_c["re78"], weights=_wc))

                # Hajek
                _wt_n = _wt / _wt.sum()
                _wc_n = _wc / _wc.sum()
                _boot_hajek.append((_wt_n * _t["re78"]).sum() - (_wc_n * _c["re78"]).sum())
        except Exception:
            continue

    _ipw_se = np.std(_boot_ipw)
    _hajek_se = np.std(_boot_hajek)
    boot_se_ipw = _ipw_se
    boot_se_hajek = _hajek_se

    print(f"Bootstrap standard errors ({_n_boot} replications):")
    print(f"  IPW (trimmed):   SE = ${_ipw_se:,.0f}")
    print(f"  Hajek (trimmed): SE = ${_hajek_se:,.0f}")
    print(f"\nFor comparison, OLS SE on treat is typically ~$1,000-1,500.")
    return boot_se_hajek, boot_se_ipw


@app.cell
def _(mo):
    mo.md(r"""
    ---
    ## 10. Scorecard: How close did we get?
    """)
    return


@app.cell
def _(
    boot_se_hajek,
    boot_se_ipw,
    hajek_ate,
    ipw_ate,
    ipw_trimmed,
    naive_ate,
    ols_model,
    pd,
    rct_ate,
):
    results = pd.DataFrame({
        "Method": [
            "RCT Benchmark (truth)",
            "Naive (treated - CPS)",
            "OLS with controls",
            "IPW (no trimming)",
            "IPW (trimmed)",
            "Hajek (normalized IPW, trimmed)",
        ],
        "ATE Estimate": [
            rct_ate,
            naive_ate,
            ols_model.params["treat"],
            ipw_ate,
            ipw_trimmed,
            hajek_ate,
        ],
        "SE": [
            "—",
            "—",
            f"${ols_model.bse['treat']:,.0f}",
            "—",
            f"${boot_se_ipw:,.0f}",
            f"${boot_se_hajek:,.0f}",
        ],
    })
    results["ATE Estimate"] = results["ATE Estimate"].map(lambda x: f"${x:,.0f}")
    results
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---
    ## 11. Takeaways

    1. **Selection bias is real and dangerous.** The naive estimate got the wrong
       sign — it said the program hurt participants when it actually helped.

    2. **OLS with controls helps but isn't magic.** It relies on linearity and
       extrapolates when covariate distributions don't overlap.

    3. **Propensity score specification matters.** Adding quadratic terms for
       pre-treatment earnings (following Dehejia & Wahba) dramatically improves
       overlap and produces more credible estimates than a linear-only model.

    4. **Propensity score weighting recovers a reasonable estimate** by reweighting
       the comparison group to look like the treated group.

    5. **Diagnostics matter.** Check propensity score overlap, trim extremes,
       and verify covariate balance. Without these checks, IPW can fail silently.

    6. **The RCT benchmark is invaluable.** We could check our answer because
       we had experimental data. In practice, you won't — which makes the
       diagnostics even more important.

    ### What we didn't cover (yet)

    - **Matching** (nearest-neighbor, caliper matching)
    - **Doubly robust estimation** (combine IPW + outcome regression)
    - **Sensitivity analysis** (what if unconfoundedness fails?)

    ---
    *Dataset: LaLonde (1986) / Dehejia & Wahba (1999). NSW experimental data
    + CPS-1 comparison group via `causaldata` package.*
    """)
    return


if __name__ == "__main__":
    app.run()
