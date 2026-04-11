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
        # The Form That Saved Lives
        ## Difference-in-Differences on Organ Donation Data

        **Method:** Difference-in-Differences (DiD)
        **Dataset:** Organ Donations — Kessler & Roth (2014)
        **Key insight:** Neither before-vs-after nor treated-vs-control alone
        identifies a causal effect. You need both differences.

        ---

        ### The story

        In **Q3 2011**, California changed its organ donor registration form.
        Instead of a passive opt-in, the new form used **active choice** — explicitly
        asking "Do you want to register as an organ donor?"

        **Did this simple change save lives?**

        Donation rates went up in California after the change. But donation rates
        were changing everywhere — public awareness campaigns, demographic shifts,
        other policies. We need a control group to isolate California's policy effect.

        This notebook walks through:
        1. **Exploring** the panel data
        2. **Failing** with two naive approaches
        3. **Fixing** it with DiD (by hand, then regression)
        4. **Testing** the parallel trends assumption
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

    sns.set_theme(style="whitegrid", font_scale=0.95)
    plt.rcParams["figure.dpi"] = 120
    return np, pd, plt, smf, sns


# ── Section 1: Load the data ────────────────────────────────────────────────
@app.cell
def _(mo):
    mo.md(
        r"""
        ---
        ## 1. Meet the data

        The dataset from Kessler & Roth (2014), bundled in the `causaldata` package
        (from Huntington-Klein's "The Effect").

        | Variable | Description |
        |----------|-------------|
        | `State` | State name |
        | `Quarter` | Calendar quarter (e.g., "Q12011") |
        | `Rate` | Organ donor registration rate |
        | `Quarter_Num` | Numeric quarter (1, 2, 3, ...) |

        Only 162 rows — small enough to see the entire dataset.
        """
    )
    return


@app.cell
def _(pd):
    from causaldata import organ_donations

    df = organ_donations.load_pandas().data.copy()
    print(f"Shape: {df.shape}")
    print(f"States: {df['State'].unique()}")
    print(f"Quarters: {sorted(df['Quarter_Num'].unique())}")
    df.head(20)
    return df, organ_donations


@app.cell
def _(df, pd):
    # Pivot to see the data more clearly
    pivot = df.pivot(index="State", columns="Quarter_Num", values="Rate").round(4)
    pivot.columns = [f"Q{int(c)}" for c in pivot.columns]
    pivot
    return (pivot,)


@app.cell
def _(mo):
    mo.md(
        r"""
        **Key facts:**

        - **27 states**, tracked over **6 quarters** (Q4 2010 – Q1 2012)
        - **California** changed its form in **Q3 2011** (Quarter_Num = 4)
        - The other 26 states serve as controls
        - `Rate` = organ donor registration rate

        Let's define treatment clearly:
        """
    )
    return


@app.cell
def _(df):
    # Define treatment variables
    df["treated_state"] = (df["State"] == "California").astype(int)
    df["post"] = (df["Quarter_Num"] >= 4).astype(int)  # Q3 2011 onward
    df["treated"] = df["treated_state"] * df["post"]  # DiD interaction

    print("Treatment structure:")
    print(df.groupby(["treated_state", "post"]).size().unstack())
    return


# ── Section 2: Visualize ────────────────────────────────────────────────────
@app.cell
def _(mo):
    mo.md(
        r"""
        ---
        ## 2. Visualize the trends

        Before any estimation, look at the data. Are trends parallel before the policy change?
        """
    )
    return


@app.cell
def _(df, plt, sns):
    _fig, _ax = plt.subplots(figsize=(11, 5))

    # Plot each state
    for state in df["State"].unique():
        _state_data = df[df["State"] == state]
        _is_ca = state == "California"
        _ax.plot(
            _state_data["Quarter_Num"],
            _state_data["Rate"],
            linewidth=2.5 if _is_ca else 1.0,
            color="#2563eb" if _is_ca else "#94a3b8",
            alpha=1.0 if _is_ca else 0.5,
            label=state if _is_ca else None,
        )

    # Average of control states
    _ctrl = df[df["treated_state"] == 0].groupby("Quarter_Num")["Rate"].mean()
    _ax.plot(_ctrl.index, _ctrl.values, linewidth=2, color="#f59e0b",
            linestyle="--", label="Control avg (26 states)")

    # Treatment line
    _ax.axvline(4, color="#ef4444", linestyle=":", linewidth=1.5, alpha=0.7, label="Policy change (Q3 2011)")

    _ax.set_xlabel("Quarter")
    _ax.set_ylabel("Donor Registration Rate")
    _ax.set_title("Organ Donor Registration Rates Over Time")
    _ax.legend(loc="upper left", fontsize=9)

    plt.tight_layout()
    _fig
    return


@app.cell
def _(mo):
    mo.md(
        r"""
        **Visual takeaway:** California (blue) and the control average (orange dashed)
        track each other fairly closely before Q3 2011. After the policy change,
        California appears to jump. But let's be rigorous.
        """
    )
    return


# ── Section 3: Two naive estimates ───────────────────────────────────────────
@app.cell
def _(mo):
    mo.md(
        r"""
        ---
        ## 3. Two naive estimates (and why both fail)

        ### Naive #1: Before-vs-after (California only)

        $$\hat{\tau}_1 = \bar{Y}_{CA}^{after} - \bar{Y}_{CA}^{before}$$

        Problem: if donation rates were trending up everywhere, we'd attribute the
        secular trend to California's policy.
        """
    )
    return


@app.cell
def _(df, np):
    ca = df[df["State"] == "California"]
    ca_before = ca[ca["post"] == 0]["Rate"].mean()
    ca_after = ca[ca["post"] == 1]["Rate"].mean()
    naive_ba = ca_after - ca_before

    print(f"Naive #1: Before-vs-After (California only)")
    print(f"  CA before:  {ca_before:.4f}")
    print(f"  CA after:   {ca_after:.4f}")
    print(f"  Difference: {naive_ba:.4f}")
    print(f"\nBut this includes any time trend, not just the policy effect.")
    return ca, ca_after, ca_before, naive_ba


@app.cell
def _(mo):
    mo.md(
        r"""
        ### Naive #2: California vs controls (post-period only)

        $$\hat{\tau}_2 = \bar{Y}_{CA}^{after} - \bar{Y}_{controls}^{after}$$

        Problem: California may have always had different donation rates.
        We'd attribute a **level difference** to the policy.
        """
    )
    return


@app.cell
def _(ca_after, df):
    ctrl_after = df[(df["treated_state"] == 0) & (df["post"] == 1)]["Rate"].mean()
    naive_tc = ca_after - ctrl_after

    print(f"Naive #2: Treated-vs-Control (post-period only)")
    print(f"  CA after:       {ca_after:.4f}")
    print(f"  Controls after: {ctrl_after:.4f}")
    print(f"  Difference:     {naive_tc:.4f}")
    print(f"\nBut this ignores that CA might have been higher/lower to begin with.")
    return ctrl_after, naive_tc


# ── Section 4: DiD by hand ──────────────────────────────────────────────────
@app.cell
def _(mo):
    mo.md(
        r"""
        ---
        ## 4. Difference-in-Differences by hand

        DiD combines both comparisons to cancel out:
        - **Time trends** (things changing for everyone)
        - **Level differences** (permanent differences between groups)

        ### The 2×2 table

        |  | Before | After | Δ (time) |
        |--|--------|-------|----------|
        | **California** | $\bar{Y}_{CA}^{pre}$ | $\bar{Y}_{CA}^{post}$ | $\Delta_{CA}$ |
        | **Controls** | $\bar{Y}_{ctrl}^{pre}$ | $\bar{Y}_{ctrl}^{post}$ | $\Delta_{ctrl}$ |
        | **Δ (group)** | | | **DiD = $\Delta_{CA} - \Delta_{ctrl}$** |

        ### The math

        $$\hat{\tau}_{DiD} = \underbrace{(\bar{Y}_{CA}^{post} - \bar{Y}_{CA}^{pre})}_{\text{CA change}} - \underbrace{(\bar{Y}_{ctrl}^{post} - \bar{Y}_{ctrl}^{pre})}_{\text{control change}}$$

        Equivalently:

        $$\hat{\tau}_{DiD} = \underbrace{(\bar{Y}_{CA}^{post} - \bar{Y}_{ctrl}^{post})}_{\text{post-gap}} - \underbrace{(\bar{Y}_{CA}^{pre} - \bar{Y}_{ctrl}^{pre})}_{\text{pre-gap}}$$

        The control group's change estimates the **counterfactual trend** for California.
        """
    )
    return


@app.cell
def _(df, pd):
    # Compute the 2x2 table
    means = df.groupby(["treated_state", "post"])["Rate"].mean().unstack()
    means.columns = ["Before", "After"]
    means.index = ["Controls", "California"]
    means["Δ (time)"] = means["After"] - means["Before"]

    # DiD
    did_hand = means.loc["California", "Δ (time)"] - means.loc["Controls", "Δ (time)"]

    print("2×2 Table of Means:")
    print(means.round(4).to_string())
    print(f"\nDiD estimate = {means.loc['California', 'Δ (time)']:.4f} - {means.loc['Controls', 'Δ (time)']:.4f} = {did_hand:.4f}")
    return did_hand, means


@app.cell
def _(mo):
    mo.md(
        r"""
        ### Step-by-step arithmetic

        Let's plug in the actual numbers:
        """
    )
    return


@app.cell
def _(means):
    ca_pre = means.loc["California", "Before"]
    ca_post = means.loc["California", "After"]
    ctrl_pre = means.loc["Controls", "Before"]
    ctrl_post = means.loc["Controls", "After"]

    print(f"California: {ca_post:.4f} - {ca_pre:.4f} = {ca_post - ca_pre:+.4f}")
    print(f"Controls:   {ctrl_post:.4f} - {ctrl_pre:.4f} = {ctrl_post - ctrl_pre:+.4f}")
    print(f"")
    print(f"DiD = {ca_post - ca_pre:+.4f} - ({ctrl_post - ctrl_pre:+.4f}) = {(ca_post - ca_pre) - (ctrl_post - ctrl_pre):+.4f}")
    return ca_post, ca_pre, ctrl_post, ctrl_pre


# ── Section 5: DiD as regression ─────────────────────────────────────────────
@app.cell
def _(mo):
    mo.md(
        r"""
        ---
        ## 5. DiD as regression

        The 2×2 arithmetic is equivalent to running:

        $$Y_{st} = \alpha + \beta_1 \cdot \text{CA}_s + \beta_2 \cdot \text{Post}_t + \tau \cdot (\text{CA}_s \times \text{Post}_t) + \varepsilon_{st}$$

        | Coefficient | Interpretation |
        |-------------|---------------|
        | $\alpha$ | Control group mean, pre-period |
        | $\beta_1$ | Level difference (CA vs controls, pre-period) |
        | $\beta_2$ | Time trend (shared by all states) |
        | $\tau$ | **DiD estimate** — the treatment effect |

        The coefficient on the interaction term $\text{CA} \times \text{Post}$
        is exactly the DiD estimate.
        """
    )
    return


@app.cell
def _(df, smf):
    did_reg = smf.ols("Rate ~ treated_state * post", data=df).fit()
    print(did_reg.summary().tables[1])
    print(f"\nDiD estimate (interaction coeff): {did_reg.params['treated_state:post']:.4f}")
    return (did_reg,)


@app.cell
def _(mo):
    mo.md(
        r"""
        ### With state and time fixed effects

        For a more robust specification, include **state fixed effects** (absorb
        permanent state-level differences) and **quarter fixed effects** (absorb
        quarter-specific shocks):

        $$Y_{st} = \alpha_s + \gamma_t + \tau \cdot D_{st} + \varepsilon_{st}$$

        where $D_{st} = 1$ for California in Q3 2011 onward.
        """
    )
    return


@app.cell
def _(df, smf):
    # Two-way fixed effects
    did_fe = smf.ols("Rate ~ treated + C(State) + C(Quarter_Num)", data=df).fit()

    print(f"TWFE DiD estimate: {did_fe.params['treated']:.4f}")
    print(f"  (SE = {did_fe.bse['treated']:.4f}, p = {did_fe.pvalues['treated']:.4f})")
    return (did_fe,)


# ── Section 6: Parallel trends ───────────────────────────────────────────────
@app.cell
def _(mo):
    mo.md(
        r"""
        ---
        ## 6. Testing the parallel trends assumption

        DiD requires that, **absent treatment**, California and the controls
        would have followed the **same trend**. This is untestable in the post-period
        (that's the counterfactual), but we can check it in the pre-period.

        ### Visual check

        If trends are parallel before Q3 2011, we have more confidence the assumption holds.

        ### Event study regression

        Run a regression with leads and lags relative to the treatment date:

        $$Y_{st} = \alpha_s + \gamma_t + \sum_{k \neq -1} \delta_k \cdot \mathbb{1}[\text{CA}_s \times (t = k)] + \varepsilon_{st}$$

        The $\delta_k$ for $k < 0$ (pre-treatment) should be **zero** if parallel trends holds.
        $k = -1$ is the reference period.
        """
    )
    return


@app.cell
def _(df, np, pd, smf):
    # Event study: relative time indicators
    df["rel_time"] = df["Quarter_Num"] - 4  # 0 = treatment quarter

    # Create dummies for each relative time period × California
    # Omit k = -1 as reference
    # Use safe column names (no hyphens) to avoid patsy parsing issues
    rel_times = sorted(df["rel_time"].unique())

    def _safe_col(k):
        """Column name safe for patsy formulas (no hyphens)."""
        if k < 0:
            return f"ca_kn{abs(k)}"
        return f"ca_kp{k}"

    for k in rel_times:
        if k == -1:
            continue
        df[_safe_col(k)] = ((df["treated_state"] == 1) & (df["rel_time"] == k)).astype(int)

    # Build formula
    event_vars = [_safe_col(k) for k in rel_times if k != -1]
    formula = "Rate ~ " + " + ".join(event_vars) + " + C(State) + C(Quarter_Num)"

    event_model = smf.ols(formula, data=df).fit()

    # Extract event study coefficients
    event_coefs = pd.DataFrame({
        "k": [k for k in rel_times if k != -1],
        "coef": [event_model.params[_safe_col(k)] for k in rel_times if k != -1],
        "se": [event_model.bse[_safe_col(k)] for k in rel_times if k != -1],
    })
    event_coefs["ci_lo"] = event_coefs["coef"] - 1.96 * event_coefs["se"]
    event_coefs["ci_hi"] = event_coefs["coef"] + 1.96 * event_coefs["se"]

    # Add reference period
    ref_row = pd.DataFrame({"k": [-1], "coef": [0], "se": [0], "ci_lo": [0], "ci_hi": [0]})
    event_coefs = pd.concat([event_coefs, ref_row]).sort_values("k").reset_index(drop=True)

    event_coefs
    return _safe_col, event_coefs, event_model, event_vars, formula, ref_row, rel_times


@app.cell
def _(event_coefs, plt):
    # Event study plot
    _fig, _ax = plt.subplots(figsize=(11, 5))

    _pre = event_coefs[event_coefs["k"] < 0]
    _post = event_coefs[event_coefs["k"] >= 0]

    # Pre-treatment (should be ~0)
    _ax.errorbar(_pre["k"], _pre["coef"], yerr=1.96 * _pre["se"],
                fmt="o", color="#94a3b8", capsize=3, markersize=5, label="Pre-treatment")

    # Post-treatment
    _ax.errorbar(_post["k"], _post["coef"], yerr=1.96 * _post["se"],
                fmt="s", color="#2563eb", capsize=3, markersize=5, label="Post-treatment")

    _ax.axhline(0, color="#1e293b", linewidth=0.8)
    _ax.axvline(-0.5, color="#ef4444", linewidth=1.5, linestyle=":", alpha=0.7, label="Treatment")
    _ax.fill_between([-0.5, _post["k"].max() + 0.5], -0.02, 0.02,
                    alpha=0.05, color="#94a3b8")

    _ax.set_xlabel("Quarters relative to policy change")
    _ax.set_ylabel("Coefficient (δ_k)")
    _ax.set_title("Event Study: Pre-treatment coefficients should be ≈ 0")
    _ax.legend(fontsize=9)

    plt.tight_layout()
    _fig
    return


@app.cell
def _(mo):
    mo.md(
        r"""
        **Interpretation:**

        - **Pre-treatment coefficients** (gray circles) should cluster around zero.
          If they don't, parallel trends fails and the DiD estimate is suspect.
        - **Post-treatment coefficients** (blue squares) show the dynamic treatment
          effect over time. Do they persist? Grow? Fade?
        - The **reference period** ($k = -1$) is set to zero by construction.
        """
    )
    return


# ── Section 7: Placebo test ─────────────────────────────────────────────────
@app.cell
def _(mo):
    mo.md(
        r"""
        ---
        ## 7. Placebo test

        A useful robustness check: pretend the treatment happened at a **different date**
        (e.g., Q2 2011, one quarter before the actual change). If we find an "effect" at the
        fake date, our method is picking up noise, not causality.
        """
    )
    return


@app.cell
def _(df, smf):
    # Placebo: pretend treatment was at Q3 (Quarter_Num=3) instead of Q4
    # Only use pre-treatment data (before Q4)
    pre_data = df[df["Quarter_Num"] < 4].copy()
    pre_data["placebo_post"] = (pre_data["Quarter_Num"] >= 3).astype(int)
    pre_data["placebo_treated"] = pre_data["treated_state"] * pre_data["placebo_post"]

    placebo_reg = smf.ols("Rate ~ treated_state * placebo_post", data=pre_data).fit()

    print(f"Placebo test (fake treatment at Q2 2011):")
    print(f"  Placebo DiD = {placebo_reg.params['treated_state:placebo_post']:.4f}")
    print(f"  (SE = {placebo_reg.bse['treated_state:placebo_post']:.4f}, "
          f"p = {placebo_reg.pvalues['treated_state:placebo_post']:.3f})")
    print(f"\nA large, significant placebo effect would be bad news for our identification.")
    return placebo_reg, pre_data


# ── Section 8: Summary ──────────────────────────────────────────────────────
@app.cell
def _(did_fe, did_hand, did_reg, mo, naive_ba, naive_tc, pd):
    mo.md(
        f"""
        ---
        ## 8. Scorecard

        | Method | Estimate |
        |--------|----------|
        | Naive: before-vs-after (CA only) | {naive_ba:.4f} |
        | Naive: CA vs controls (post only) | {naive_tc:.4f} |
        | DiD by hand (2×2 table) | {did_hand:.4f} |
        | DiD regression (interaction) | {did_reg.params['treated_state:post']:.4f} |
        | DiD with TWFE | {did_fe.params['treated']:.4f} |

        The DiD by hand and DiD regression give the same answer (as they must).
        TWFE gives a slightly different estimate because it uses within-state
        and within-quarter variation more flexibly.
        """
    )
    return


@app.cell
def _(mo):
    mo.md(
        r"""
        ---
        ## 9. Takeaways

        1. **Neither before-vs-after nor treated-vs-control alone works.**
           Before-vs-after confounds treatment with time trends.
           Treated-vs-control confounds treatment with permanent group differences.

        2. **DiD = (change in treated) - (change in controls).** The control group's
           change estimates the counterfactual trend.

        3. **Parallel trends is the key assumption.** Check it visually and with an
           event study. Pre-treatment coefficients ≈ 0 builds confidence.

        4. **Placebo tests provide further reassurance.** If you find effects at
           fake treatment dates, something is wrong.

        5. **With only 162 rows, you can see every data point.** This transparency
           is a pedagogical feature, not a limitation.

        ### What we didn't cover

        - **Staggered adoption** (multiple treatment dates)
        - **Synthetic control** (when you have one treated unit and many potential controls)
        - **Clustering standard errors** (unit-level autocorrelation)
        - **Triple differences** (DiDiD for when parallel trends fails)

        ---
        *Dataset: Kessler & Roth (2014) via `causaldata` package.
        See Huntington-Klein, "The Effect," Ch. 18.*
        """
    )
    return


if __name__ == "__main__":
    app.run()
