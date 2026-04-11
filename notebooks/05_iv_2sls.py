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
        # The Tax That Revealed Demand
        ## Instrumental Variables and 2SLS

        **Method:** Instrumental Variables (IV) / Two-Stage Least Squares (2SLS)
        **Dataset:** CigarettesSW (Stock & Watson) — 48 US states, 1985 & 1995
        **Key insight:** When your regressor is endogenous, you need an
        external source of variation. Taxes shift supply but not demand —
        the perfect instrument.

        ---

        ### The story

        You want to estimate the **price elasticity of demand** for cigarettes:
        if the price goes up 1%, by what percentage do sales fall?

        Simple regression of quantity on price gives the **wrong answer**. Why?
        Because price is set by **market equilibrium** — it reflects both supply
        AND demand. High demand pushes prices up, creating reverse causality.

        The solution: find something that shifts **supply** (and thus price) but
        doesn't directly affect **demand**. Cigarette **sales taxes** do exactly this.
        States set taxes for revenue reasons, not in response to smoking demand shocks.

        This notebook walks through:
        1. **The endogeneity problem** (supply-demand simultaneity)
        2. **Why OLS fails** (biased toward zero)
        3. **IV intuition** (using taxes to trace out the demand curve)
        4. **2SLS by hand** (step by step)
        5. **2SLS with `linearmodels`**
        6. **Instrument diagnostics** (first-stage F, overidentification)
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
    import statsmodels.api as sm

    sns.set_theme(style="whitegrid", font_scale=0.95)
    plt.rcParams["figure.dpi"] = 120
    return np, pd, plt, sm, smf, sns


# ── Section 1: Load the data ────────────────────────────────────────────────
@app.cell
def _(mo):
    mo.md(
        r"""
        ---
        ## 1. Meet the data

        The **CigarettesSW** dataset from Stock & Watson's "Introduction to Econometrics."
        96 observations: 48 US states × 2 years (1985, 1995).

        | Variable | Description |
        |----------|-------------|
        | `state` | US state |
        | `year` | 1985 or 1995 |
        | `cpi` | Consumer Price Index |
        | `population` | State population |
        | `packs` | Cigarette packs sold per capita |
        | `income` | State personal income (total) |
        | `tax` | Average state + federal cigarette tax (cents/pack) |
        | `price` | Average price per pack (cents, incl. tax) |
        | `taxs` | Average excise tax on cigarettes (cents/pack) — **our instrument** |
        """
    )
    return


@app.cell
def _(np, pd):
    # Load CigarettesSW from Rdatasets
    import pathlib as _pathlib
    _local = _pathlib.Path(__file__).parent / "data" / "CigarettesSW.csv"
    if _local.exists():
        cig = pd.read_csv(_local)
    else:
        url = "https://vincentarelbundock.github.io/Rdatasets/csv/AER/CigarettesSW.csv"
        cig = pd.read_csv(url)

    print(f"Shape: {cig.shape}")
    print(f"Years: {cig['year'].unique()}")
    print(f"States: {cig['state'].nunique()}")

    # Create real (inflation-adjusted) variables and log transforms
    # We'll focus on the cross-sectional variation in 1995
    # and use changes from 1985 to 1995 (first-differenced)

    # Adjust for inflation: divide by CPI and multiply by 100
    cig["rprice"] = cig["price"] / cig["cpi"] * 100  # real price
    cig["rincome"] = cig["income"] / (cig["population"] * cig["cpi"]) * 100  # real income per capita
    cig["rtax"] = cig["tax"] / cig["cpi"] * 100  # real total tax
    cig["rtaxs"] = cig["taxs"] / cig["cpi"] * 100  # real sales tax

    # Log transforms (for elasticity interpretation)
    cig["lpacks"] = np.log(cig["packs"])
    cig["lprice"] = np.log(cig["rprice"])
    cig["lincome"] = np.log(cig["rincome"])
    cig["ltax"] = np.log(cig["rtax"])
    cig["ltaxs"] = np.log(cig["rtaxs"])

    cig.head()
    return (cig,)


@app.cell
def _(cig, pd):
    # Create first-differenced data (1995 - 1985)
    # This removes state fixed effects
    c85 = cig[cig["year"] == 1985].set_index("state")
    c95 = cig[cig["year"] == 1995].set_index("state")

    diff = pd.DataFrame({
        "dlpacks": c95["lpacks"] - c85["lpacks"],
        "dlprice": c95["lprice"] - c85["lprice"],
        "dlincome": c95["lincome"] - c85["lincome"],
        "dltax": c95["ltax"] - c85["ltax"],
        "dltaxs": c95["ltaxs"] - c85["ltaxs"],
    }).dropna()

    print(f"First-differenced data: {len(diff)} states")
    print(f"\nSummary statistics (log changes, 1985→1995):")
    diff.describe().round(4)
    return c85, c95, diff


@app.cell
def _(mo):
    mo.md(
        r"""
        We use **first differences** (1995 minus 1985) to remove state fixed effects.
        This means we're asking: "In states where the price rose more, did packs sold
        fall more?"

        All variables are in **logs**, so coefficients are **elasticities**:
        a coefficient of -1.2 means a 1% price increase → 1.2% decrease in packs sold.
        """
    )
    return


# ── Section 2: The endogeneity problem ──────────────────────────────────────
@app.cell
def _(mo):
    mo.md(
        r"""
        ---
        ## 2. The endogeneity problem

        ### Supply and demand

        The equilibrium price $P^*$ and quantity $Q^*$ are determined simultaneously:

        **Demand:** $Q^d = \alpha_0 + \alpha_1 P + \alpha_2 \text{Income} + u^d$

        **Supply:** $Q^s = \beta_0 + \beta_1 P + \beta_2 \text{Cost} + u^s$

        At equilibrium: $Q^d = Q^s = Q^*$ and $P = P^*$

        ### Why OLS is biased

        We want to estimate the demand elasticity $\alpha_1$. But the observed $(P^*, Q^*)$
        is a **mix of supply and demand shifts**:

        $$\text{Cov}(P^*, u^d) \neq 0$$

        Price is correlated with the demand error because:
        - A positive demand shock ($u^d > 0$) shifts demand out
        - This raises equilibrium price
        - So high prices are associated with high demand (positive correlation)
        - OLS attributes this to "high prices cause high demand" — **wrong sign!**

        This is the classic **simultaneity bias**. OLS estimates a mix of the
        demand and supply curves, not the demand curve alone.
        """
    )
    return


# ── Section 3: OLS (biased) ─────────────────────────────────────────────────
@app.cell
def _(mo):
    mo.md(
        r"""
        ---
        ## 3. OLS: The biased estimate
        """
    )
    return


@app.cell
def _(diff, plt, smf):
    # OLS: log packs on log price
    ols_model = smf.ols("dlpacks ~ dlprice", data=diff).fit()

    print(f"OLS estimate of price elasticity:")
    print(f"  β = {ols_model.params['dlprice']:.4f} (SE = {ols_model.bse['dlprice']:.4f})")
    print(f"\n{ols_model.summary().tables[1]}")
    print(f"\nThis is biased toward zero (attenuated) due to simultaneity.")
    print(f"The true demand elasticity should be more negative.")
    return (ols_model,)


@app.cell
def _(diff, ols_model, plt, np):
    # Scatter plot
    _fig, _ax = plt.subplots(figsize=(8, 6))

    _ax.scatter(diff["dlprice"], diff["dlpacks"], s=30, color="#2563eb", alpha=0.6, edgecolor="white")

    # OLS line
    _xs = np.linspace(diff["dlprice"].min(), diff["dlprice"].max(), 100)
    _ax.plot(_xs, ols_model.params["Intercept"] + ols_model.params["dlprice"] * _xs,
            color="#ef4444", linewidth=2, label=f"OLS: β = {ols_model.params['dlprice']:.3f}")

    _ax.set_xlabel("Δ log(Price)")
    _ax.set_ylabel("Δ log(Packs)")
    _ax.set_title("OLS: Price Elasticity of Cigarette Demand")
    _ax.legend()

    plt.tight_layout()
    _fig
    return


@app.cell
def _(mo):
    mo.md(
        r"""
        The OLS slope is negative (demand curves slope down), but it's **biased
        toward zero** because price increases driven by demand are correlated
        with higher quantity. We're not tracing out the demand curve — we're
        tracing out a mix of demand and supply.
        """
    )
    return


# ── Section 4: The IV idea ──────────────────────────────────────────────────
@app.cell
def _(mo):
    mo.md(
        r"""
        ---
        ## 4. The IV idea

        ### What we need

        A variable $Z$ (the **instrument**) that:

        1. **Relevance:** $Z$ is correlated with the endogenous variable (price)
           $$\text{Cov}(Z, P) \neq 0$$

        2. **Exogeneity (exclusion restriction):** $Z$ affects quantity **only through** price
           $$\text{Cov}(Z, u^d) = 0$$

        ### Sales tax as an instrument

        **Cigarette sales taxes** ($Z = \text{taxs}$) satisfy both conditions:

        1. **Relevance:** Higher taxes → higher prices (taxes are passed through to consumers). ✅
        2. **Exclusion:** Tax rates are set by state legislatures for revenue purposes,
           not in response to cigarette demand shocks. Taxes affect the number of packs
           sold *only* by making them more expensive, not through any other channel. ✅

        ### The Wald estimator (IV with one instrument)

        With a single instrument, the IV estimator is:

        $$\hat{\beta}_{IV} = \frac{\text{Cov}(\Delta \log Q, \Delta \log \text{Tax})}{\text{Cov}(\Delta \log P, \Delta \log \text{Tax})} = \frac{\text{Reduced Form}}{\text{First Stage}}$$

        This is the **ratio of two regressions**:
        - **Reduced form:** How does the instrument affect the outcome directly?
        - **First stage:** How does the instrument affect the endogenous regressor?
        """
    )
    return


# ── Section 5: First stage ──────────────────────────────────────────────────
@app.cell
def _(mo):
    mo.md(
        r"""
        ---
        ## 5. First stage: Tax → Price

        The first stage regression:

        $$\Delta \log P_i = \pi_0 + \pi_1 \cdot \Delta \log \text{Tax}_i + v_i$$

        We need $\pi_1 \neq 0$ (relevance condition). Rule of thumb: **F-statistic > 10**
        in the first stage to avoid weak instrument problems.
        """
    )
    return


@app.cell
def _(diff, plt, np, smf):
    # First stage: tax → price
    first_stage = smf.ols("dlprice ~ dltaxs", data=diff).fit()

    print(f"First Stage: Δlog(Price) ~ Δlog(SalesTax)")
    print(f"  π₁ = {first_stage.params['dltaxs']:.4f} (SE = {first_stage.bse['dltaxs']:.4f})")
    print(f"  t-stat = {first_stage.tvalues['dltaxs']:.2f}")
    print(f"  F-stat = {first_stage.fvalue:.2f}  {'✅ Strong instrument' if first_stage.fvalue > 10 else '⚠️ Weak instrument!'}")
    print(f"  R² = {first_stage.rsquared:.4f}")
    print(f"\n{first_stage.summary().tables[1]}")

    # Plot first stage
    _fig, _ax = plt.subplots(figsize=(8, 5))
    _ax.scatter(diff["dltaxs"], diff["dlprice"], s=30, color="#2563eb", alpha=0.6, edgecolor="white")

    _xs = np.linspace(diff["dltaxs"].min(), diff["dltaxs"].max(), 100)
    _ax.plot(_xs, first_stage.params["Intercept"] + first_stage.params["dltaxs"] * _xs,
            color="#10b981", linewidth=2, label=f"π₁ = {first_stage.params['dltaxs']:.3f}")

    _ax.set_xlabel("Δ log(Sales Tax)")
    _ax.set_ylabel("Δ log(Price)")
    _ax.set_title("First Stage: Do taxes move prices?")
    _ax.legend()

    plt.tight_layout()
    _fig
    return (first_stage,)


# ── Section 6: Reduced form ─────────────────────────────────────────────────
@app.cell
def _(mo):
    mo.md(
        r"""
        ---
        ## 6. Reduced form: Tax → Quantity

        The reduced form regression:

        $$\Delta \log Q_i = \gamma_0 + \gamma_1 \cdot \Delta \log \text{Tax}_i + e_i$$

        This asks: do higher taxes directly predict lower cigarette sales?
        """
    )
    return


@app.cell
def _(diff, smf):
    reduced_form = smf.ols("dlpacks ~ dltaxs", data=diff).fit()

    print(f"Reduced Form: Δlog(Packs) ~ Δlog(SalesTax)")
    print(f"  γ₁ = {reduced_form.params['dltaxs']:.4f} (SE = {reduced_form.bse['dltaxs']:.4f})")
    print(f"\n{reduced_form.summary().tables[1]}")
    return (reduced_form,)


# ── Section 7: Wald / IV estimate by hand ────────────────────────────────────
@app.cell
def _(mo):
    mo.md(
        r"""
        ---
        ## 7. The IV estimate by hand

        ### Method 1: Wald estimator (ratio of reduced form to first stage)

        $$\hat{\beta}_{IV} = \frac{\hat{\gamma}_1}{\hat{\pi}_1} = \frac{\text{Reduced Form coeff}}{\text{First Stage coeff}}$$
        """
    )
    return


@app.cell
def _(first_stage, reduced_form):
    # Wald estimator
    wald_iv = reduced_form.params["dltaxs"] / first_stage.params["dltaxs"]

    print(f"Wald IV estimate:")
    print(f"  Reduced form: γ₁ = {reduced_form.params['dltaxs']:.4f}")
    print(f"  First stage:  π₁ = {first_stage.params['dltaxs']:.4f}")
    print(f"  IV = γ₁ / π₁ = {reduced_form.params['dltaxs']:.4f} / {first_stage.params['dltaxs']:.4f} = {wald_iv:.4f}")
    print(f"\nThe demand elasticity is ≈ {wald_iv:.2f}")
    print(f"More negative than OLS — as expected, simultaneity bias was attenuating OLS toward zero.")
    return (wald_iv,)


@app.cell
def _(mo):
    mo.md(
        r"""
        ### Method 2: Two-Stage Least Squares (2SLS) by hand

        **Stage 1:** Regress the endogenous variable on the instrument. Get fitted values.

        $$\Delta \log P_i = \hat{\pi}_0 + \hat{\pi}_1 \cdot \Delta \log \text{Tax}_i$$
        $$\widehat{\Delta \log P_i} = \hat{\pi}_0 + \hat{\pi}_1 \cdot \Delta \log \text{Tax}_i$$

        **Stage 2:** Regress the outcome on the **fitted values** from Stage 1.

        $$\Delta \log Q_i = \beta_0 + \beta_1 \cdot \widehat{\Delta \log P_i} + \varepsilon_i$$

        The coefficient $\beta_1$ is the 2SLS estimate.
        """
    )
    return


@app.cell
def _(diff, first_stage, smf):
    # 2SLS by hand
    # Stage 1: fitted values
    diff_2sls = diff.copy()
    diff_2sls["dlprice_hat"] = first_stage.fittedvalues

    # Stage 2: outcome on fitted values
    stage2 = smf.ols("dlpacks ~ dlprice_hat", data=diff_2sls).fit()

    print(f"2SLS by hand:")
    print(f"  Stage 1: Δlog(Price) = {first_stage.params['Intercept']:.4f} + {first_stage.params['dltaxs']:.4f} × Δlog(Tax)")
    print(f"  Stage 2: Δlog(Packs) = {stage2.params['Intercept']:.4f} + {stage2.params['dlprice_hat']:.4f} × Δlog(Price_hat)")
    print(f"\n  2SLS estimate: β = {stage2.params['dlprice_hat']:.4f}")
    print(f"  (Same as Wald — with one instrument, they're identical)")
    print(f"\n  NOTE: Stage 2 standard errors from manual 2SLS are WRONG.")
    print(f"  You must use a proper IV package for correct SEs.")
    return diff_2sls, stage2


# ── Section 8: Proper 2SLS ──────────────────────────────────────────────────
@app.cell
def _(mo):
    mo.md(
        r"""
        ---
        ## 8. Proper 2SLS with `linearmodels`

        The manual 2SLS gives the right coefficient but **wrong standard errors**
        (they don't account for the generated regressor in Stage 1). Use `linearmodels`
        for correct inference.
        """
    )
    return


@app.cell
def _(diff):
    from linearmodels.iv import IV2SLS

    # Proper 2SLS
    iv_model = IV2SLS.from_formula("dlpacks ~ 1 + [dlprice ~ dltaxs]", data=diff).fit()
    print(iv_model.summary)
    return IV2SLS, iv_model


@app.cell
def _(mo):
    mo.md(
        r"""
        ### Adding income as a control

        We should control for income changes — states with faster income growth
        might have both higher prices and different smoking patterns.

        $$\Delta \log Q_i = \beta_0 + \beta_1 \cdot \Delta \log P_i + \beta_2 \cdot \Delta \log \text{Income}_i + \varepsilon_i$$

        Instrument: $\Delta \log \text{Tax}_i$ for $\Delta \log P_i$
        """
    )
    return


@app.cell
def _(IV2SLS, diff):
    # 2SLS with income control
    iv_income = IV2SLS.from_formula(
        "dlpacks ~ 1 + dlincome + [dlprice ~ dltaxs]", data=diff
    ).fit()
    print(iv_income.summary)
    return (iv_income,)


# ── Section 9: Multiple instruments ──────────────────────────────────────────
@app.cell
def _(mo):
    mo.md(
        r"""
        ---
        ## 9. Multiple instruments and overidentification

        We can also use the **total tax** (sales tax + federal tax) as a second instrument.
        With two instruments for one endogenous variable, we have an **overidentified**
        model — and we can test whether both instruments give the same answer
        (the **Sargan-Hansen J test**).

        If the J test rejects, at least one instrument violates the exclusion restriction.
        """
    )
    return


@app.cell
def _(IV2SLS, diff):
    # Overidentified model: two instruments
    iv_overid = IV2SLS.from_formula(
        "dlpacks ~ 1 + dlincome + [dlprice ~ dltaxs + dltax]", data=diff
    ).fit()
    print(iv_overid.summary)
    return (iv_overid,)


# ── Section 10: Visual comparison ────────────────────────────────────────────
@app.cell
def _(mo):
    mo.md(
        r"""
        ---
        ## 10. OLS vs IV: Visual comparison
        """
    )
    return


@app.cell
def _(diff, iv_model, np, ols_model, plt):
    _fig, _ax = plt.subplots(figsize=(9, 6))

    _ax.scatter(diff["dlprice"], diff["dlpacks"], s=30, color="#94a3b8", alpha=0.6, edgecolor="white")

    _xs = np.linspace(diff["dlprice"].min(), diff["dlprice"].max(), 100)

    # OLS line
    _ax.plot(_xs, ols_model.params["Intercept"] + ols_model.params["dlprice"] * _xs,
            color="#ef4444", linewidth=2, linestyle="--",
            label=f"OLS: β = {ols_model.params['dlprice']:.3f} (biased)")

    # IV line
    _iv_params = iv_model.params
    _ax.plot(_xs, _iv_params["Intercept"] + _iv_params["dlprice"] * _xs,
            color="#2563eb", linewidth=2,
            label=f"IV:  β = {_iv_params['dlprice']:.3f} (consistent)")

    _ax.set_xlabel("Δ log(Price)")
    _ax.set_ylabel("Δ log(Packs)")
    _ax.set_title("OLS vs IV Estimates of Demand Elasticity")
    _ax.legend(fontsize=10)

    plt.tight_layout()
    _fig
    return


@app.cell
def _(mo):
    mo.md(
        r"""
        The IV line is **steeper** (more negative) than OLS. This makes economic sense:
        OLS is biased toward zero by simultaneity, so it underestimates how much
        consumers cut back when prices rise.
        """
    )
    return


# ── Section 11: Summary ─────────────────────────────────────────────────────
@app.cell
def _(iv_income, iv_model, ols_model, pd, wald_iv):
    results = pd.DataFrame({
        "Method": [
            "OLS (biased)",
            "Wald (by hand)",
            "2SLS (sales tax only)",
            "2SLS + income control",
        ],
        "Price Elasticity": [
            ols_model.params["dlprice"],
            wald_iv,
            iv_model.params["dlprice"],
            iv_income.params["dlprice"],
        ],
    })
    results["Price Elasticity"] = results["Price Elasticity"].round(4)
    results
    return (results,)


@app.cell
def _(mo):
    mo.md(
        r"""
        ---
        ## 11. Takeaways

        1. **Simultaneity bias is real.** OLS estimates of demand elasticity are
           biased toward zero because price and quantity are jointly determined.

        2. **The IV idea is simple.** Find exogenous variation in price (taxes) and
           use it to trace out the demand curve. The Wald estimator is just
           reduced form / first stage.

        3. **2SLS = automated Wald.** It handles multiple instruments, controls,
           and correct standard errors.

        4. **Always check the first stage.** F < 10 means a weak instrument.
           Weak instruments → biased IV estimates (toward OLS).

        5. **Overidentification tests help.** With multiple instruments, the J test
           checks whether they all agree. Rejection means at least one instrument
           is invalid.

        6. **IV estimates LATE, not ATE.** The IV estimate is the Local Average
           Treatment Effect for "compliers" — units whose behavior changes because
           of the instrument. Here: states whose price changes are driven by tax changes.

        ### The instrument validity checklist

        | Condition | Question | How to check |
        |-----------|----------|-------------|
        | **Relevance** | Does Z predict X? | First-stage F > 10 |
        | **Exclusion** | Does Z affect Y only through X? | Economic argument (untestable with one instrument) |
        | **Independence** | Is Z as-good-as-random? | Check Z isn't correlated with confounders |

        ### What we didn't cover

        - **Weak instruments** in detail (Anderson-Rubin confidence sets)
        - **LIML** (Limited Information Maximum Likelihood — more robust to weak instruments)
        - **Shift-share / Bartik instruments**
        - **Judge leniency designs** (judges as instruments for incarceration)
        - **Fuzzy RDD as IV** (the cutoff is the instrument)

        ---
        *Dataset: CigarettesSW from Stock & Watson (2007), "Introduction to Econometrics."
        Available from `Rdatasets`.*
        """
    )
    return


if __name__ == "__main__":
    app.run()
