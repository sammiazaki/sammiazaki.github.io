import marimo

__generated_with = "0.23.0"
app = marimo.App(width="medium", css_file="custom.css")


# ── Title ────────────────────────────────────────────────────────────────────
@app.cell
def _():
    import marimo as mo
    return (mo,)


@app.cell
def _(mo):
    mo.md(
        r"""
        # The Threshold You Shouldn't Trust
        ## RDD Diagnostics: When Discontinuities Lie

        **Method:** Regression Discontinuity Design — diagnostics and robustness
        **Dataset:** Synthetic (full control over the DGP)
        **Key insight:** An RDD estimate is only as good as its assumptions.
        This notebook teaches you to *break* an RDD before you trust one.

        ---

        ### The story

        A university awards scholarships to students scoring **≥ 80** on an entrance exam.
        You want to estimate the **causal effect of the scholarship on graduation rates**.

        RDD seems perfect — students just above and below 80 are nearly identical,
        so the jump in outcomes at the cutoff estimates the causal effect.

        But what if:
        - Students **manipulate** their scores to land just above 80?
        - Your estimate **changes wildly** with different bandwidth choices?
        - There are **jumps at fake cutoffs** too?
        - **Pre-treatment covariates** jump at the cutoff?

        This notebook teaches you to **diagnose** these problems before trusting
        any RDD estimate.
        """
    )
    return


# ── Imports ──────────────────────────────────────────────────────────────────
@app.cell
def _():
    import numpy as np
    import pandas as pd
    import matplotlib.pyplot as plt
    import seaborn as sns
    import statsmodels.formula.api as smf
    from scipy import stats

    sns.set_theme(style="whitegrid", font_scale=0.95)
    plt.rcParams["figure.dpi"] = 120
    return np, pd, plt, smf, sns, stats


# ── Section 1: Generate clean data ──────────────────────────────────────────
@app.cell
def _(mo):
    mo.md(
        r"""
        ---
        ## 1. Generate the data (clean version first)

        We'll start with a **clean** dataset where RDD assumptions hold perfectly,
        then progressively break things.

        **True DGP (clean):**

        $$\text{score}_i \sim N(75, 10^2)$$
        $$T_i = \mathbb{1}[\text{score}_i \geq 80]$$
        $$Y_i = 50 + 0.5 \cdot \text{score}_i + \underbrace{8}_{\text{TRUE EFFECT}} \cdot T_i + \varepsilon_i, \quad \varepsilon_i \sim N(0, 5^2)$$

        The true treatment effect is **8 percentage points** on graduation rate.
        """
    )
    return


@app.cell
def _(np, pd):
    def generate_rdd_data(n=5000, effect=8, manipulation=False, manip_strength=0.5, seed=42):
        """Generate RDD data with optional manipulation."""
        rng = np.random.default_rng(seed)

        # Running variable
        score = rng.normal(75, 10, n)

        # Manipulation: some students just below 80 get pushed above
        if manipulation:
            near_below = (score >= 77) & (score < 80)
            push = rng.random(n) < manip_strength  # probability of manipulation
            score = np.where(near_below & push, score + (80 - score) + rng.uniform(0, 1, n), score)

        cutoff = 80
        treatment = (score >= cutoff).astype(int)

        # Pre-treatment covariates (shouldn't jump at cutoff)
        gpa_hs = 2.5 + 0.03 * score + rng.normal(0, 0.3, n)  # correlated with score
        parent_income = 40000 + 500 * score + rng.normal(0, 10000, n)

        # Outcome
        noise = rng.normal(0, 5, n)
        graduation = 50 + 0.5 * score + effect * treatment + noise

        return pd.DataFrame({
            "score": score,
            "treatment": treatment,
            "graduation": graduation,
            "gpa_hs": gpa_hs,
            "parent_income": parent_income,
        })

    # Clean data (no manipulation)
    df_clean = generate_rdd_data(n=5000, effect=8, manipulation=False)
    print(f"Clean dataset: {len(df_clean)} observations")
    print(f"  Treated (score ≥ 80): {df_clean['treatment'].sum()}")
    print(f"  Control (score < 80): {(1 - df_clean['treatment']).sum():.0f}")
    return df_clean, generate_rdd_data


# ── Section 2: The RDD estimate ──────────────────────────────────────────────
@app.cell
def _(mo):
    mo.md(
        r"""
        ---
        ## 2. The RDD estimate (quick review)

        The basic RDD idea: compare outcomes **just above** and **just below** the cutoff.
        Use local linear regression within a bandwidth $h$ of the cutoff:

        $$Y_i = \alpha + \tau \cdot T_i + \beta_1 (X_i - c) + \beta_2 \cdot T_i \cdot (X_i - c) + \varepsilon_i$$

        where $X_i$ is the running variable (score), $c = 80$ is the cutoff, and
        $T_i = \mathbb{1}[X_i \geq c]$.
        """
    )
    return


@app.cell
def _(df_clean, plt, smf):
    # Basic RDD plot
    cutoff = 80
    bw = 10

    _fig, _ax = plt.subplots(figsize=(10, 5))

    # Scatter all data (faded)
    _ax.scatter(df_clean["score"], df_clean["graduation"], s=3, alpha=0.15, color="#94a3b8")

    # Binned means
    df_clean["score_bin"] = (df_clean["score"] // 1).astype(int)
    _binned = df_clean.groupby("score_bin")["graduation"].mean()
    _ax.scatter(_binned.index + 0.5, _binned.values, s=20, color="#1e293b", alpha=0.7, zorder=3)

    # Local linear regression on each side
    _left = df_clean[(df_clean["score"] >= cutoff - bw) & (df_clean["score"] < cutoff)]
    _right = df_clean[(df_clean["score"] >= cutoff) & (df_clean["score"] <= cutoff + bw)]

    if len(_left) > 5 and len(_right) > 5:
        _left_fit = smf.ols("graduation ~ score", data=_left).fit()
        _right_fit = smf.ols("graduation ~ score", data=_right).fit()

        _xs_left = [cutoff - bw, cutoff]
        _xs_right = [cutoff, cutoff + bw]
        _ax.plot(_xs_left, [_left_fit.predict({"score": [x]}).values[0] for x in _xs_left],
                color="#2563eb", linewidth=2)
        _ax.plot(_xs_right, [_right_fit.predict({"score": [x]}).values[0] for x in _xs_right],
                color="#2563eb", linewidth=2)

        # The jump at the cutoff
        _y_left = _left_fit.predict({"score": [cutoff]}).values[0]
        _y_right = _right_fit.predict({"score": [cutoff]}).values[0]
        _ax.annotate("", xy=(cutoff, _y_right), xytext=(cutoff, _y_left),
                    arrowprops=dict(arrowstyle="<->", color="#ef4444", linewidth=2))
        _ax.text(cutoff + 0.5, (_y_left + _y_right) / 2, f"τ ≈ {_y_right - _y_left:.1f}",
                color="#ef4444", fontsize=11, fontweight="bold")

    _ax.axvline(cutoff, color="#ef4444", linestyle=":", linewidth=1.5, alpha=0.7)
    _ax.set_xlabel("Entrance Exam Score")
    _ax.set_ylabel("Graduation Rate (%)")
    _ax.set_title("RDD: Jump at the Scholarship Cutoff (score = 80)")

    plt.tight_layout()
    _fig
    return (bw, cutoff)


@app.cell
def _(cutoff, df_clean, smf):
    # Formal local linear regression
    bw_formal = 10
    _local = df_clean[abs(df_clean["score"] - cutoff) <= bw_formal].copy()
    _local["centered"] = _local["score"] - cutoff

    rdd_model = smf.ols("graduation ~ treatment * centered", data=_local).fit()
    print(f"Local linear RDD estimate (bandwidth = {bw_formal}):")
    print(f"  τ = {rdd_model.params['treatment']:.2f} (SE = {rdd_model.bse['treatment']:.2f})")
    print(f"  True effect = 8.00")
    print(f"\n{rdd_model.summary().tables[1]}")
    return bw_formal, rdd_model


# ── Section 3: Diagnostic 1 — Density test ───────────────────────────────────
@app.cell
def _(mo):
    mo.md(
        r"""
        ---
        ## 3. Diagnostic 1: McCrary Density Test

        **Question:** Is there manipulation at the cutoff?

        If students can control their scores, those just below 80 might push themselves
        above. This creates a **bunching** of observations just above the cutoff —
        visible as a discontinuity in the **density** of the running variable.

        The **McCrary (2008) test** checks whether the density of the running variable
        is continuous at the cutoff. A jump in density suggests manipulation.

        ### Clean data (no manipulation)
        """
    )
    return


@app.cell
def _(cutoff, df_clean, np, plt, stats):
    def density_test_plot(data, cutoff, title, ax):
        """Plot histogram and kernel density around the cutoff."""
        scores = data["score"]

        # Histogram
        bins = np.arange(scores.min(), scores.max() + 1, 1)
        ax.hist(scores, bins=bins, density=True, alpha=0.5, color="#94a3b8", edgecolor="white")

        # KDE on each side
        left_scores = scores[scores < cutoff]
        right_scores = scores[scores >= cutoff]

        if len(left_scores) > 10:
            kde_left = stats.gaussian_kde(left_scores)
            xs_left = np.linspace(left_scores.min(), cutoff, 200)
            ax.plot(xs_left, kde_left(xs_left), color="#2563eb", linewidth=2, label="Left of cutoff")

        if len(right_scores) > 10:
            kde_right = stats.gaussian_kde(right_scores)
            xs_right = np.linspace(cutoff, right_scores.max(), 200)
            ax.plot(xs_right, kde_right(xs_right), color="#f59e0b", linewidth=2, label="Right of cutoff")

        ax.axvline(cutoff, color="#ef4444", linestyle=":", linewidth=1.5)
        ax.set_title(title, fontsize=11)
        ax.set_xlabel("Score")
        ax.set_ylabel("Density")
        ax.legend(fontsize=8)

    _fig, _ax = plt.subplots(figsize=(10, 4))
    density_test_plot(df_clean, cutoff, "McCrary Test: Clean Data (no manipulation)", _ax)
    plt.tight_layout()
    _fig
    return (density_test_plot,)


@app.cell
def _(mo):
    mo.md(
        r"""
        **Clean data:** The density is smooth across the cutoff. No bunching. ✅

        ### Now let's add manipulation
        """
    )
    return


@app.cell
def _(cutoff, density_test_plot, generate_rdd_data, plt):
    # Generate data WITH manipulation
    df_manip = generate_rdd_data(n=5000, effect=8, manipulation=True, manip_strength=0.6)

    _fig, _axes = plt.subplots(1, 2, figsize=(14, 4))
    density_test_plot(df_manip, cutoff, "McCrary Test: WITH Manipulation", _axes[0])

    # Zoom in near cutoff
    _near = df_manip[(df_manip["score"] >= 75) & (df_manip["score"] <= 85)]
    density_test_plot(_near, cutoff, "Zoomed in (75-85)", _axes[1])

    plt.tight_layout()
    _fig
    return (df_manip,)


@app.cell
def _(mo):
    mo.md(
        r"""
        **Manipulated data:** Clear bunching just above 80. The density jumps at the cutoff.
        This is a **red flag** — manipulation means units just above the cutoff are
        systematically different from those just below, violating the RDD assumption.

        ### Formal test

        We can also test this statistically using the `rdrobust` package's density test:
        """
    )
    return


@app.cell
def _(df_clean, df_manip, np, stats):
    def _mccrary_bintest(scores, cutoff, bw=5):
        """Simple density discontinuity test using bin counts around cutoff."""
        _left = scores[(scores >= cutoff - bw) & (scores < cutoff)]
        _right = scores[(scores >= cutoff) & (scores < cutoff + bw)]
        _nl, _nr = len(_left), len(_right)
        _n = _nl + _nr
        # Under H0 of no manipulation, proportion right should be ~0.5
        _p_hat = _nr / _n if _n > 0 else 0.5
        _se = np.sqrt(0.25 / _n)  # SE under H0: p=0.5
        _z = (_p_hat - 0.5) / _se
        _pval = 2 * (1 - stats.norm.cdf(abs(_z)))
        return _z, _pval, _nl, _nr

    # Try rddensity first, fall back to simple bin test
    try:
        from rddensity import rddensity as _rddensity_fn
        _use_rddensity = True
    except ImportError:
        _use_rddensity = False

    # Clean data
    print("=== McCrary Density Test: Clean Data ===")
    if _use_rddensity:
        try:
            _density_clean = _rddensity_fn(df_clean["score"], c=80)
            print(f"  Test statistic: {_density_clean.hat['t']:.3f}")
            print(f"  p-value: {_density_clean.hat['p']:.3f}")
        except Exception:
            _z, _pval, _nl, _nr = _mccrary_bintest(df_clean["score"], 80)
            print(f"  (rddensity unavailable, using simple bin test)")
            print(f"  Left of cutoff: {_nl}, Right: {_nr}")
            print(f"  Z-statistic: {_z:.3f}, p-value: {_pval:.3f}")
    else:
        _z, _pval, _nl, _nr = _mccrary_bintest(df_clean["score"], 80)
        print(f"  Left of cutoff: {_nl}, Right: {_nr}")
        print(f"  Z-statistic: {_z:.3f}, p-value: {_pval:.3f}")

    print()

    # Manipulated data
    print("=== McCrary Density Test: Manipulated Data ===")
    if _use_rddensity:
        try:
            _density_manip = _rddensity_fn(df_manip["score"], c=80)
            print(f"  Test statistic: {_density_manip.hat['t']:.3f}")
            print(f"  p-value: {_density_manip.hat['p']:.3f}")
        except Exception:
            _z, _pval, _nl, _nr = _mccrary_bintest(df_manip["score"], 80)
            print(f"  (rddensity unavailable, using simple bin test)")
            print(f"  Left of cutoff: {_nl}, Right: {_nr}")
            print(f"  Z-statistic: {_z:.3f}, p-value: {_pval:.3f}")
    else:
        _z, _pval, _nl, _nr = _mccrary_bintest(df_manip["score"], 80)
        print(f"  Left of cutoff: {_nl}, Right: {_nr}")
        print(f"  Z-statistic: {_z:.3f}, p-value: {_pval:.3f}")
    return


# ── Section 4: Diagnostic 2 — Bandwidth sensitivity ─────────────────────────
@app.cell
def _(mo):
    mo.md(
        r"""
        ---
        ## 4. Diagnostic 2: Bandwidth Sensitivity

        The RDD estimate depends on the **bandwidth** — how far from the cutoff
        we look. A good RDD estimate should be **stable** across reasonable bandwidths.

        If the estimate swings wildly as you change the bandwidth, the design is fragile.

        ### The trade-off

        | Narrow bandwidth | Wide bandwidth |
        |-----------------|----------------|
        | Less bias (units more similar) | More bias (units less comparable) |
        | More variance (fewer observations) | Less variance (more observations) |
        """
    )
    return


@app.cell
def _(cutoff, df_clean, np, plt, smf):
    # Bandwidth sensitivity analysis
    _bandwidths = np.arange(3, 20, 1)
    _estimates = []

    for _h in _bandwidths:
        _local = df_clean[abs(df_clean["score"] - cutoff) <= _h].copy()
        _local["centered"] = _local["score"] - cutoff
        if len(_local) < 20:
            continue

        _m = smf.ols("graduation ~ treatment * centered", data=_local).fit()
        _estimates.append({
            "bandwidth": _h,
            "estimate": _m.params["treatment"],
            "se": _m.bse["treatment"],
            "n": len(_local),
        })

    _bw_df = pd.DataFrame(_estimates)
    _bw_df["ci_lo"] = _bw_df["estimate"] - 1.96 * _bw_df["se"]
    _bw_df["ci_hi"] = _bw_df["estimate"] + 1.96 * _bw_df["se"]

    _fig, _axes = plt.subplots(1, 2, figsize=(14, 5))

    # Estimate vs bandwidth
    _axes[0].fill_between(_bw_df["bandwidth"], _bw_df["ci_lo"], _bw_df["ci_hi"],
                         alpha=0.2, color="#2563eb")
    _axes[0].plot(_bw_df["bandwidth"], _bw_df["estimate"], "o-", color="#2563eb",
                 markersize=5, linewidth=1.5)
    _axes[0].axhline(8, color="#10b981", linestyle="--", linewidth=1.5, label="True effect = 8")
    _axes[0].set_xlabel("Bandwidth")
    _axes[0].set_ylabel("RDD Estimate")
    _axes[0].set_title("Bandwidth Sensitivity: Clean Data")
    _axes[0].legend()

    # N observations vs bandwidth
    _axes[1].bar(_bw_df["bandwidth"], _bw_df["n"], color="#94a3b8", alpha=0.7)
    _axes[1].set_xlabel("Bandwidth")
    _axes[1].set_ylabel("N observations in window")
    _axes[1].set_title("Sample Size by Bandwidth")

    plt.tight_layout()
    _fig
    return


@app.cell
def _(mo):
    mo.md(
        r"""
        **Clean data:** The estimate is stable across bandwidths, hovering around 8. ✅
        The confidence intervals shrink as bandwidth increases (more data), but the
        point estimate barely changes.
        """
    )
    return


# ── Section 5: Diagnostic 3 — Placebo cutoffs ───────────────────────────────
@app.cell
def _(mo):
    mo.md(
        r"""
        ---
        ## 5. Diagnostic 3: Placebo Cutoffs

        If our RDD is valid, there should be a jump **only at the real cutoff (80)**.
        Estimating "effects" at **fake cutoffs** (e.g., 70, 75, 85, 90) should give
        **zero** — there's no treatment there.

        If we find large "effects" at placebo cutoffs, something is wrong with our
        specification (e.g., a nonlinear relationship we're not modeling).
        """
    )
    return


@app.cell
def _(df_clean, np, pd, plt, smf):
    # Placebo cutoffs
    _placebo_cutoffs = [65, 70, 72, 75, 77, 80, 83, 85, 88, 90, 95]
    _placebo_results = []

    for _c in _placebo_cutoffs:
        _df = df_clean[abs(df_clean["score"] - _c) <= 10].copy()
        _df["T_placebo"] = (df_clean.loc[_df.index, "score"] >= _c).astype(int)
        _df["centered"] = _df["score"] - _c

        if len(_df) < 20 or _df["T_placebo"].nunique() < 2:
            continue

        _m = smf.ols("graduation ~ T_placebo * centered", data=_df).fit()
        _placebo_results.append({
            "cutoff": _c,
            "estimate": _m.params["T_placebo"],
            "se": _m.bse["T_placebo"],
            "is_real": _c == 80,
        })

    _placebo_df = pd.DataFrame(_placebo_results)

    _fig, _ax = plt.subplots(figsize=(10, 5))

    for _, _row in _placebo_df.iterrows():
        _color = "#ef4444" if _row["is_real"] else "#94a3b8"
        _marker = "D" if _row["is_real"] else "o"
        _ax.errorbar(_row["cutoff"], _row["estimate"], yerr=1.96 * _row["se"],
                    fmt=_marker, color=_color, capsize=4, markersize=8 if _row["is_real"] else 5)

    _ax.axhline(0, color="#1e293b", linewidth=0.8)
    _ax.axhline(8, color="#10b981", linestyle="--", linewidth=1, alpha=0.5, label="True effect")
    _ax.set_xlabel("Cutoff Value")
    _ax.set_ylabel("Estimated 'Effect'")
    _ax.set_title("Placebo Cutoffs: Only the real cutoff (80) should show an effect")
    _ax.legend()

    plt.tight_layout()
    _fig
    return


@app.cell
def _(mo):
    mo.md(
        r"""
        **Clean data:** Only the real cutoff (80, red diamond) shows a large effect.
        The placebo cutoffs are all near zero. ✅

        This is exactly what we want to see. If placebo cutoffs showed large effects,
        it would suggest a nonlinear relationship that our local linear model misses.
        """
    )
    return


# ── Section 6: Diagnostic 4 — Covariate balance ─────────────────────────────
@app.cell
def _(mo):
    mo.md(
        r"""
        ---
        ## 6. Diagnostic 4: Covariate Balance at the Cutoff

        RDD assumes that units just above and below the cutoff are **comparable**
        on pre-treatment characteristics. We can check this by testing whether
        covariates (like high school GPA or parent income) **jump at the cutoff**.

        If they do, something is confounding the running variable — the groups
        aren't as-good-as-random near the cutoff.
        """
    )
    return


@app.cell
def _(cutoff, df_clean, pd, plt, smf):
    # Covariate balance test
    _covs = ["gpa_hs", "parent_income"]
    _cov_labels = ["High School GPA", "Parent Income ($)"]
    _bw_cov = 10

    _fig, _axes = plt.subplots(1, 2, figsize=(14, 5))

    for _idx, (_cov, _label) in enumerate(zip(_covs, _cov_labels)):
        _ax = _axes[_idx]
        _local = df_clean[abs(df_clean["score"] - cutoff) <= _bw_cov].copy()
        _local["centered"] = _local["score"] - cutoff

        # Binned means
        _local["score_bin"] = (_local["score"] // 1).astype(int)
        _binned_cov = _local.groupby("score_bin")[_cov].mean()
        _ax.scatter(_binned_cov.index + 0.5, _binned_cov.values, s=20, color="#1e293b", alpha=0.7)

        # Test for jump
        _m = smf.ols(f"{_cov} ~ treatment * centered", data=_local).fit()
        _jump = _m.params["treatment"]
        _pval = _m.pvalues["treatment"]

        _ax.axvline(cutoff, color="#ef4444", linestyle=":", linewidth=1.5)
        _ax.set_xlabel("Score")
        _ax.set_ylabel(_label)
        _ax.set_title(f"{_label}: jump = {_jump:.2f} (p = {_pval:.3f})")

    plt.suptitle("Covariate Balance at Cutoff (should see NO jump)", fontsize=12)
    plt.tight_layout()
    _fig
    return


@app.cell
def _(mo):
    mo.md(
        r"""
        **Clean data:** No significant jumps in pre-treatment covariates at the cutoff. ✅

        The p-values should be large (non-significant), indicating that GPA and parent
        income are continuous at the cutoff — the groups are comparable.
        """
    )
    return


# ── Section 7: Breaking the RDD ─────────────────────────────────────────────
@app.cell
def _(mo):
    mo.md(
        r"""
        ---
        ## 7. Breaking the RDD: What manipulation does

        Now let's see what happens when students **manipulate** their scores.
        We regenerate the data with manipulation turned on and re-run all diagnostics.
        """
    )
    return


@app.cell
def _(cutoff, df_manip, pd, plt, smf):
    # RDD estimate on manipulated data
    _local = df_manip[abs(df_manip["score"] - cutoff) <= 10].copy()
    _local["centered"] = _local["score"] - cutoff
    _m_manip = smf.ols("graduation ~ treatment * centered", data=_local).fit()

    print(f"RDD estimate on MANIPULATED data:")
    print(f"  τ = {_m_manip.params['treatment']:.2f} (SE = {_m_manip.bse['treatment']:.2f})")
    print(f"  True effect = 8.00")
    print(f"\n  The estimate is biased because manipulators just above 80")
    print(f"  are systematically different from non-manipulators just below 80.")
    return


@app.cell
def _(cutoff, df_manip, np, pd, plt, smf):
    # Bandwidth sensitivity on manipulated data
    _bws = np.arange(3, 20, 1)
    _ests = []
    for _h in _bws:
        _loc = df_manip[abs(df_manip["score"] - cutoff) <= _h].copy()
        _loc["centered"] = _loc["score"] - cutoff
        if len(_loc) < 20:
            continue
        _m = smf.ols("graduation ~ treatment * centered", data=_loc).fit()
        _ests.append({"bandwidth": _h, "estimate": _m.params["treatment"], "se": _m.bse["treatment"]})

    _bw_manip = pd.DataFrame(_ests)

    _fig, _ax = plt.subplots(figsize=(10, 5))
    _ax.fill_between(_bw_manip["bandwidth"],
                    _bw_manip["estimate"] - 1.96 * _bw_manip["se"],
                    _bw_manip["estimate"] + 1.96 * _bw_manip["se"],
                    alpha=0.2, color="#ef4444")
    _ax.plot(_bw_manip["bandwidth"], _bw_manip["estimate"], "o-",
            color="#ef4444", markersize=5, linewidth=1.5)
    _ax.axhline(8, color="#10b981", linestyle="--", linewidth=1.5, label="True effect = 8")
    _ax.set_xlabel("Bandwidth")
    _ax.set_ylabel("RDD Estimate")
    _ax.set_title("Bandwidth Sensitivity: MANIPULATED Data (estimates are biased)")
    _ax.legend()

    plt.tight_layout()
    _fig
    return


# ── Section 8: Using rdrobust ────────────────────────────────────────────────
@app.cell
def _(mo):
    mo.md(
        r"""
        ---
        ## 8. Optimal bandwidth with `rdrobust`

        The `rdrobust` package implements Calonico, Cattaneo, and Titiunik (2014)'s
        optimal bandwidth selection and bias-corrected confidence intervals.

        This is the **gold standard** for RDD estimation in practice.
        """
    )
    return


@app.cell
def _(df_clean):
    from rdrobust import rdrobust as _rdrobust_fn

    # rdrobust on clean data
    print("=== rdrobust: Clean Data ===")
    _rdr_clean = _rdrobust_fn(df_clean["graduation"], df_clean["score"], c=80)
    print(_rdr_clean)
    return


@app.cell
def _(df_manip):
    from rdrobust import rdrobust as _rdrobust_fn2

    # rdrobust on manipulated data
    print("=== rdrobust: Manipulated Data ===")
    _rdr_manip = _rdrobust_fn2(df_manip["graduation"], df_manip["score"], c=80)
    print(_rdr_manip)
    return


# ── Section 9: Summary ──────────────────────────────────────────────────────
@app.cell
def _(mo):
    mo.md(
        r"""
        ---
        ## 9. The RDD Diagnostic Checklist

        Before trusting any RDD estimate, run these four checks:

        | Diagnostic | What to look for | Red flag |
        |-----------|-----------------|----------|
        | **McCrary density test** | Smooth density at cutoff | Bunching above cutoff |
        | **Bandwidth sensitivity** | Stable estimates across bandwidths | Estimates swing wildly |
        | **Placebo cutoffs** | Zero effect at fake cutoffs | Large effects at wrong places |
        | **Covariate balance** | No jumps in pre-treatment vars | Significant covariate jumps |

        ### Takeaways

        1. **An RDD is only as good as its diagnostics.** The estimate itself is easy;
           the hard part is verifying the assumptions.

        2. **Manipulation is the #1 threat.** If people can precisely control the
           running variable, the groups just above and below the cutoff are NOT comparable.

        3. **Bandwidth choice matters but shouldn't matter too much.** If your estimate
           is fragile to bandwidth, the local linearity assumption may fail.

        4. **Always report the diagnostic plots.** A paper that shows only the RDD
           estimate without McCrary, bandwidth sensitivity, and covariate balance
           is incomplete.

        5. **`rdrobust` is your friend.** It handles optimal bandwidth selection,
           bias correction, and robust inference. Use it.

        ### What we didn't cover

        - **Fuzzy RDD** (imperfect compliance at the cutoff)
        - **Donut hole RDD** (dropping observations right at the cutoff)
        - **Geographic/spatial RDD** (discontinuity in space, not a score)
        - **Regression kink design** (discontinuity in the slope, not level)

        ---
        *Synthetic data. Diagnostics follow McCrary (2008) and
        Cattaneo, Idrobo & Titiunik (2020), "A Practical Introduction to
        Regression Discontinuity Designs."*
        """
    )
    return


if __name__ == "__main__":
    app.run()
