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
        # The Campaign That Worked on the Wrong Users
        ## From ATE to Heterogeneous Treatment Effects (Uplift Modeling)

        **Method:** ATE → CATE → T-Learner / S-Learner / Uplift Modeling
        **Dataset:** Kevin Hillstrom's MineThatData E-Mail Analytics Challenge
        **Key insight:** The average treatment effect hides the fact that your
        campaign helps some users, wastes money on others, and may harm a few.

        ---

        ### The story

        An e-commerce company ran an **email marketing experiment**. 64,000 customers
        were randomly assigned to three groups:

        | Group | Treatment | N |
        |-------|-----------|---|
        | **Men's E-Mail** | Received an email featuring men's merchandise | ~21,300 |
        | **Women's E-Mail** | Received an email featuring women's merchandise | ~21,300 |
        | **No E-Mail** | Control group — no email sent | ~21,400 |

        The outcome: whether the customer **visited the website** and/or **spent money**
        within 2 weeks.

        The overall ATE might be positive — email campaigns "work" on average.
        But **who** do they work on? Should you email everyone? Or target specific
        customers to maximize ROI?

        This notebook walks through:
        1. **Exploring** the experimental data
        2. **Estimating** the Average Treatment Effect (ATE)
        3. **Discovering** heterogeneous effects (CATE)
        4. **Building** uplift models (T-Learner, S-Learner)
        5. **Targeting** decisions based on predicted uplift
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
    from sklearn.model_selection import cross_val_predict
    from sklearn.ensemble import GradientBoostingClassifier, GradientBoostingRegressor
    from sklearn.linear_model import LogisticRegression
    import statsmodels.formula.api as smf

    sns.set_theme(style="whitegrid", font_scale=0.95)
    plt.rcParams["figure.dpi"] = 120
    return (
        GradientBoostingClassifier,
        GradientBoostingRegressor,
        LogisticRegression,
        cross_val_predict,
        np,
        pd,
        plt,
        smf,
        sns,
    )


# ── Section 1: Load the data ────────────────────────────────────────────────
@app.cell
def _(mo):
    mo.md(
        r"""
        ---
        ## 1. Meet the data

        The Hillstrom dataset is a classic in uplift modeling literature.
        It's a **randomized experiment** — no selection bias to worry about.
        The question is purely about heterogeneity.

        | Variable | Description |
        |----------|-------------|
        | `recency` | Months since last purchase |
        | `history` | Dollar value of past purchases |
        | `mens` | 1 = purchased from men's category before |
        | `womens` | 1 = purchased from women's category before |
        | `zip_code` | Surburban / Urban / Rural |
        | `newbie` | 1 = new customer (1st year) |
        | `channel` | Phone / Web / Multichannel (how they last purchased) |
        | `segment` | Treatment group: "Mens E-Mail", "Womens E-Mail", "No E-Mail" |
        | `visit` | 1 = visited website within 2 weeks |
        | `conversion` | 1 = made a purchase within 2 weeks |
        | `spend` | Dollar amount spent within 2 weeks |
        """
    )
    return


@app.cell
def _(pd):
    # Load Hillstrom dataset — prefer local copy, fall back to remote
    import pathlib as _pathlib
    _local = _pathlib.Path(__file__).parent / "data" / "hillstrom.csv"
    if _local.exists():
        hillstrom = pd.read_csv(_local)
    else:
        hillstrom = pd.read_csv(
            "http://www.minethatdata.com/Kevin_Hillstrom_MineThatData_E-MailAnalytics_DataMiningChallenge_2008.03.20.csv"
        )

    print(f"Shape: {hillstrom.shape}")
    print(f"\nSegment distribution:")
    print(hillstrom["segment"].value_counts())
    hillstrom.head()
    return (hillstrom,)


@app.cell
def _(hillstrom, pd):
    # Create binary treatment indicators
    df = hillstrom.copy()
    df["treated"] = (df["segment"] != "No E-Mail").astype(int)
    df["mens_email"] = (df["segment"] == "Mens E-Mail").astype(int)
    df["womens_email"] = (df["segment"] == "Womens E-Mail").astype(int)

    # Encode categoricals for modeling
    df["is_urban"] = (df["zip_code"] == "Urban").astype(int)
    df["is_suburban"] = (df["zip_code"] == "Suburban").astype(int)
    df["ch_web"] = (df["channel"] == "Web").astype(int)
    df["ch_multi"] = (df["channel"] == "Multichannel").astype(int)

    print(f"Treatment rate: {df['treated'].mean():.3f}")
    print(f"Visit rate: {df['visit'].mean():.3f}")
    print(f"Conversion rate: {df['conversion'].mean():.3f}")
    print(f"Mean spend: ${df['spend'].mean():.2f}")
    return (df,)


# ── Section 2: Explore the data ─────────────────────────────────────────────
@app.cell
def _(mo):
    mo.md(
        r"""
        ---
        ## 2. Explore the data

        Since this is a randomized experiment, let's verify balance and look at
        baseline characteristics.
        """
    )
    return


@app.cell
def _(df, pd):
    # Balance check
    covariates = ["recency", "history", "mens", "womens", "newbie"]
    balance = df.groupby("segment")[covariates].mean().round(3).T
    balance
    return balance, covariates


@app.cell
def _(df, plt, sns):
    # Outcome distributions by segment
    _fig, _axes = plt.subplots(1, 3, figsize=(14, 4))

    # Visit rate
    visit_rate = df.groupby("segment")["visit"].mean()
    _axes[0].bar(visit_rate.index, visit_rate.values, color=["#94a3b8", "#2563eb", "#f59e0b"])
    _axes[0].set_ylabel("Visit Rate")
    _axes[0].set_title("Website Visit Rate by Segment")
    _axes[0].tick_params(axis="x", rotation=15)

    # Conversion rate
    conv_rate = df.groupby("segment")["conversion"].mean()
    _axes[1].bar(conv_rate.index, conv_rate.values, color=["#94a3b8", "#2563eb", "#f59e0b"])
    _axes[1].set_ylabel("Conversion Rate")
    _axes[1].set_title("Conversion Rate by Segment")
    _axes[1].tick_params(axis="x", rotation=15)

    # Spend
    spend_mean = df.groupby("segment")["spend"].mean()
    _axes[2].bar(spend_mean.index, spend_mean.values, color=["#94a3b8", "#2563eb", "#f59e0b"])
    _axes[2].set_ylabel("Mean Spend ($)")
    _axes[2].set_title("Average Spend by Segment")
    _axes[2].tick_params(axis="x", rotation=15)

    plt.tight_layout()
    _fig
    return conv_rate, spend_mean, visit_rate


# ── Section 3: Average Treatment Effect ─────────────────────────────────────
@app.cell
def _(mo):
    mo.md(
        r"""
        ---
        ## 3. Average Treatment Effect (ATE)

        Since this is a randomized experiment, the ATE is just the difference in means:

        $$\hat{\tau}_{ATE} = \bar{Y}^{email} - \bar{Y}^{no\ email}$$

        We'll focus on **visit** as the primary outcome (higher rate, more power).
        """
    )
    return


@app.cell
def _(df, np, smf):
    # ATE: any email vs no email
    treated = df[df["treated"] == 1]
    control = df[df["treated"] == 0]

    ate_visit = treated["visit"].mean() - control["visit"].mean()
    ate_conv = treated["conversion"].mean() - control["conversion"].mean()
    ate_spend = treated["spend"].mean() - control["spend"].mean()

    print(f"Average Treatment Effect (any email vs no email):")
    print(f"  Visit:      {ate_visit:.4f} ({ate_visit*100:.2f} pp)")
    print(f"  Conversion: {ate_conv:.4f} ({ate_conv*100:.2f} pp)")
    print(f"  Spend:      ${ate_spend:.2f}")

    # Statistical test
    reg = smf.ols("visit ~ treated", data=df).fit()
    print(f"\nRegression test:")
    print(f"  ATE = {reg.params['treated']:.4f} (SE = {reg.bse['treated']:.4f}, p = {reg.pvalues['treated']:.4f})")
    return ate_conv, ate_spend, ate_visit, control, reg, treated


@app.cell
def _(mo):
    mo.md(
        r"""
        The email campaign has a small but statistically significant effect on website visits.
        But this is the **average** — it masks potentially large heterogeneity.

        ### By email type
        """
    )
    return


@app.cell
def _(control, df):
    # ATE by email type
    mens = df[df["mens_email"] == 1]
    womens = df[df["womens_email"] == 1]

    print(f"ATE by email type (visit rate):")
    print(f"  Men's email:   {mens['visit'].mean() - control['visit'].mean():.4f}")
    print(f"  Women's email: {womens['visit'].mean() - control['visit'].mean():.4f}")
    return mens, womens


# ── Section 4: Heterogeneous effects ─────────────────────────────────────────
@app.cell
def _(mo):
    mo.md(
        r"""
        ---
        ## 4. Why ATE isn't enough

        The ATE answers: "Does this work on average?" But the real question is:
        "**For whom** does it work, and for whom does it waste money (or harm)?"

        ### Conditional ATE (CATE) by subgroups

        $$\text{CATE}(x) = E[Y_1 - Y_0 \mid X = x]$$

        Let's compute treatment effects for different customer segments.
        """
    )
    return


@app.cell
def _(df, pd, plt):
    # CATE by subgroup — manual computation
    def cate_by_group(data, group_col, outcome="visit"):
        """Compute CATE within subgroups."""
        results = []
        for val in sorted(data[group_col].unique()):
            sub = data[data[group_col] == val]
            t = sub[sub["treated"] == 1][outcome].mean()
            c = sub[sub["treated"] == 0][outcome].mean()
            nt = (sub["treated"] == 1).sum()
            nc = (sub["treated"] == 0).sum()
            results.append({
                "group": f"{group_col}={val}",
                "CATE": t - c,
                "N_treated": nt,
                "N_control": nc,
            })
        return pd.DataFrame(results)

    # CATE by various subgroups
    cates = pd.concat([
        cate_by_group(df, "mens"),
        cate_by_group(df, "womens"),
        cate_by_group(df, "newbie"),
        cate_by_group(df, "channel"),
    ])

    _fig, _ax = plt.subplots(figsize=(10, 6))
    colors = ["#ef4444" if _c < 0 else "#2563eb" for _c in cates["CATE"]]
    _ax.barh(cates["group"], cates["CATE"], color=colors, alpha=0.7)
    _ax.axvline(0, color="#1e293b", linewidth=0.8)
    _ax.set_xlabel("CATE (visit rate)")
    _ax.set_title("Treatment Effect Varies by Customer Segment")

    plt.tight_layout()
    _fig
    return cate_by_group, cates


@app.cell
def _(mo):
    mo.md(
        r"""
        **Key finding:** The treatment effect varies substantially across groups.
        Some segments benefit more than others. Some might even be **harmed**
        (negative CATE — the email annoyed them and they visited *less*).

        But manual subgroup analysis is limited:
        - We can only check one variable at a time
        - Interactions between variables are missed
        - With many subgroups, we risk overfitting to noise

        We need a **model** that predicts individual-level treatment effects.
        """
    )
    return


# ── Section 5: T-Learner ────────────────────────────────────────────────────
@app.cell
def _(mo):
    mo.md(
        r"""
        ---
        ## 5. T-Learner: Two separate models

        The simplest uplift approach. Train **two separate models**:

        1. $\hat{\mu}_1(x)$: predict the outcome for **treated** units
        2. $\hat{\mu}_0(x)$: predict the outcome for **control** units

        The predicted CATE for individual $i$:

        $$\hat{\tau}(x_i) = \hat{\mu}_1(x_i) - \hat{\mu}_0(x_i)$$

        **Pros:** Simple, flexible (any ML model works).
        **Cons:** Noisy when the treatment effect is small relative to the baseline outcome.
        The two models optimize for predicting $Y$, not for predicting $Y_1 - Y_0$.
        """
    )
    return


@app.cell
def _(GradientBoostingClassifier, df, np, pd):
    # Feature matrix
    feature_cols = ["recency", "history", "mens", "womens", "newbie",
                    "is_urban", "is_suburban", "ch_web", "ch_multi"]

    X = df[feature_cols].values
    y = df["visit"].values
    T = df["treated"].values

    # T-Learner
    # Model for treated
    X_t = X[T == 1]
    y_t = y[T == 1]

    # Model for control
    X_c = X[T == 0]
    y_c = y[T == 0]

    model_t = GradientBoostingClassifier(
        n_estimators=100, max_depth=3, learning_rate=0.1, random_state=42
    )
    model_c = GradientBoostingClassifier(
        n_estimators=100, max_depth=3, learning_rate=0.1, random_state=42
    )

    model_t.fit(X_t, y_t)
    model_c.fit(X_c, y_c)

    # Predict CATE for everyone
    mu1_hat = model_t.predict_proba(X)[:, 1]  # P(visit | treated, X)
    mu0_hat = model_c.predict_proba(X)[:, 1]  # P(visit | control, X)
    tau_t_learner = mu1_hat - mu0_hat

    df_pred = df.copy()
    df_pred["tau_t"] = tau_t_learner

    print(f"T-Learner CATE predictions:")
    print(f"  Mean:   {tau_t_learner.mean():.4f}")
    print(f"  Std:    {tau_t_learner.std():.4f}")
    print(f"  Min:    {tau_t_learner.min():.4f}")
    print(f"  Max:    {tau_t_learner.max():.4f}")
    print(f"  Median: {np.median(tau_t_learner):.4f}")
    return (
        T,
        X,
        X_c,
        X_t,
        df_pred,
        feature_cols,
        model_c,
        model_t,
        mu0_hat,
        mu1_hat,
        tau_t_learner,
        y,
        y_c,
        y_t,
    )


@app.cell
def _(plt, tau_t_learner):
    # Distribution of predicted CATEs
    _fig, _ax = plt.subplots(figsize=(10, 4))

    _ax.hist(tau_t_learner, bins=50, color="#2563eb", alpha=0.7, edgecolor="white")
    _ax.axvline(0, color="#ef4444", linestyle=":", linewidth=1.5)
    _ax.axvline(tau_t_learner.mean(), color="#10b981", linestyle="--", linewidth=1.5,
               label=f"Mean CATE = {tau_t_learner.mean():.4f}")
    _ax.set_xlabel("Predicted CATE (treatment effect on visit probability)")
    _ax.set_ylabel("Count")
    _ax.set_title("T-Learner: Distribution of Individual Treatment Effects")
    _ax.legend()

    plt.tight_layout()
    _fig
    return


# ── Section 6: S-Learner ────────────────────────────────────────────────────
@app.cell
def _(mo):
    mo.md(
        r"""
        ---
        ## 6. S-Learner: Single model with treatment as a feature

        An alternative approach: train **one model** with the treatment indicator
        as an input feature:

        $$\hat{\mu}(x, t) = f(x, t)$$

        Predicted CATE:

        $$\hat{\tau}(x_i) = \hat{\mu}(x_i, 1) - \hat{\mu}(x_i, 0)$$

        **Pros:** Uses all the data efficiently. Can capture treatment-covariate interactions.
        **Cons:** The model may ignore the treatment variable if it has a small effect
        relative to the main effects of covariates. Regularization can shrink the
        treatment effect toward zero.
        """
    )
    return


@app.cell
def _(GradientBoostingClassifier, T, X, df_pred, np, pd, y):
    # S-Learner: single model with treatment as feature
    X_with_t = np.column_stack([X, T])

    model_s = GradientBoostingClassifier(
        n_estimators=100, max_depth=3, learning_rate=0.1, random_state=42
    )
    model_s.fit(X_with_t, y)

    # Predict with T=1 and T=0 for everyone
    X_as_treated = np.column_stack([X, np.ones(len(X))])
    X_as_control = np.column_stack([X, np.zeros(len(X))])

    mu1_s = model_s.predict_proba(X_as_treated)[:, 1]
    mu0_s = model_s.predict_proba(X_as_control)[:, 1]
    tau_s_learner = mu1_s - mu0_s

    df_pred["tau_s"] = tau_s_learner

    print(f"S-Learner CATE predictions:")
    print(f"  Mean:   {tau_s_learner.mean():.4f}")
    print(f"  Std:    {tau_s_learner.std():.4f}")
    print(f"  Min:    {tau_s_learner.min():.4f}")
    print(f"  Max:    {tau_s_learner.max():.4f}")
    return X_as_control, X_as_treated, X_with_t, model_s, mu0_s, mu1_s, tau_s_learner


@app.cell
def _(plt, tau_s_learner, tau_t_learner):
    # Compare T-Learner vs S-Learner
    _fig, _axes = plt.subplots(1, 2, figsize=(14, 4))

    _axes[0].hist(tau_t_learner, bins=50, color="#2563eb", alpha=0.7, edgecolor="white")
    _axes[0].axvline(0, color="#ef4444", linestyle=":", linewidth=1.5)
    _axes[0].set_title(f"T-Learner (std = {tau_t_learner.std():.4f})")
    _axes[0].set_xlabel("Predicted CATE")

    _axes[1].hist(tau_s_learner, bins=50, color="#f59e0b", alpha=0.7, edgecolor="white")
    _axes[1].axvline(0, color="#ef4444", linestyle=":", linewidth=1.5)
    _axes[1].set_title(f"S-Learner (std = {tau_s_learner.std():.4f})")
    _axes[1].set_xlabel("Predicted CATE")

    plt.suptitle("T-Learner vs S-Learner: Distribution of Predicted CATEs")
    plt.tight_layout()
    _fig
    return


@app.cell
def _(mo):
    mo.md(
        r"""
        Notice: the S-Learner often produces a **tighter** distribution of CATEs
        (less variance). This is because regularization shrinks the treatment interaction
        effects toward zero. The T-Learner tends to be noisier but potentially captures
        more heterogeneity.

        Neither is clearly better — it depends on the signal-to-noise ratio.
        """
    )
    return


# ── Section 7: Targeting — who should we email? ─────────────────────────────
@app.cell
def _(mo):
    mo.md(
        r"""
        ---
        ## 7. Targeting: Who should we email?

        The whole point of uplift modeling: **target customers with the highest predicted lift**.

        ### Uplift curve (Qini curve)

        Sort customers by predicted CATE (descending). Progressively "email" the top-k%
        and measure the cumulative treatment effect. Compare to:
        - **Random targeting** (the diagonal)
        - **Emailing everyone** (the ATE)

        A good uplift model lifts the curve above the diagonal — you get more bang
        for your marketing buck by targeting the right people.
        """
    )
    return


@app.cell
def _(df_pred, np, plt):
    def uplift_curve(data, cate_col, outcome="visit", treatment="treated"):
        """Compute uplift curve (cumulative gains)."""
        sorted_df = data.sort_values(cate_col, ascending=False).reset_index(drop=True)
        n = len(sorted_df)

        fractions = np.arange(1, n + 1) / n
        cumulative_uplift = []

        for i in range(1, n + 1):
            top_k = sorted_df.iloc[:i]
            _t = top_k[top_k[treatment] == 1]
            _c = top_k[top_k[treatment] == 0]

            if len(_t) > 0 and len(_c) > 0:
                uplift = _t[outcome].mean() - _c[outcome].mean()
            else:
                uplift = 0
            cumulative_uplift.append(uplift * (i / n))

        return fractions, cumulative_uplift

    # Compute uplift curves
    frac_t, uplift_t = uplift_curve(df_pred, "tau_t")
    frac_s, uplift_s = uplift_curve(df_pred, "tau_s")

    # Random targeting baseline
    overall_ate = df_pred[df_pred["treated"] == 1]["visit"].mean() - df_pred[df_pred["treated"] == 0]["visit"].mean()
    random_uplift = [overall_ate * f for f in frac_t]

    _fig, _ax = plt.subplots(figsize=(10, 6))
    # Subsample for plotting speed
    step = max(1, len(frac_t) // 500)
    _ax.plot(frac_t[::step], uplift_t[::step], color="#2563eb", linewidth=1.5, label="T-Learner")
    _ax.plot(frac_s[::step], uplift_s[::step], color="#f59e0b", linewidth=1.5, label="S-Learner")
    _ax.plot(frac_t[::step], [random_uplift[i] for i in range(0, len(random_uplift), step)],
            color="#94a3b8", linewidth=1.5, linestyle="--", label="Random")

    _ax.set_xlabel("Fraction of customers targeted (sorted by predicted CATE)")
    _ax.set_ylabel("Cumulative uplift")
    _ax.set_title("Uplift Curve: Targeted vs Random Email Campaign")
    _ax.legend()

    plt.tight_layout()
    _fig
    return frac_s, frac_t, overall_ate, random_uplift, step, uplift_curve, uplift_s, uplift_t


@app.cell
def _(mo):
    mo.md(
        r"""
        **If the curve rises above the diagonal, targeting works.** You can get
        more visits (or conversions) by emailing fewer people — specifically the
        ones with the highest predicted uplift.
        """
    )
    return


# ── Section 8: Targeting policy ──────────────────────────────────────────────
@app.cell
def _(mo):
    mo.md(
        r"""
        ---
        ## 8. Building a targeting policy

        ### The four customer types

        | Type | Predicted CATE | Action |
        |------|---------------|--------|
        | **Persuadables** | τ > 0 (high) | Email them — they'll respond |
        | **Sure things** | ~0 (buy regardless) | Don't waste the email |
        | **Lost causes** | ~0 (won't buy regardless) | Don't waste the email |
        | **Sleeping dogs** | τ < 0 | **Definitely don't email** — it hurts |

        The optimal policy: email only the Persuadables.
        """
    )
    return


@app.cell
def _(df_pred, np, pd):
    # Segment customers by T-Learner predicted CATE
    df_policy = df_pred.copy()

    # Define segments based on CATE quantiles
    q25 = np.percentile(df_policy["tau_t"], 25)
    q75 = np.percentile(df_policy["tau_t"], 75)

    df_policy["segment"] = pd.cut(
        df_policy["tau_t"],
        bins=[-np.inf, 0, q25, q75, np.inf],
        labels=["Sleeping Dogs (τ<0)", "Low Uplift", "Medium Uplift", "High Uplift (Persuadables)"],
    )

    # Actual treatment effects by predicted segment
    segment_effects = []
    for _seg in df_policy["segment"].cat.categories:
        _sub = df_policy[df_policy["segment"] == _seg]
        _t = _sub[_sub["treated"] == 1]["visit"].mean()
        _c = _sub[_sub["treated"] == 0]["visit"].mean()
        segment_effects.append({
            "Segment": _seg,
            "N": len(_sub),
            "Predicted CATE (mean)": _sub["tau_t"].mean(),
            "Actual CATE": _t - _c,
            "Visit rate (treated)": _t,
            "Visit rate (control)": _c,
        })

    segment_df = pd.DataFrame(segment_effects).round(4)
    segment_df
    return df_policy, q25, q75, segment_df, segment_effects


@app.cell
def _(mo):
    mo.md(
        r"""
        ### ROI analysis

        If each email costs $0.10 and the average order value is $30:
        """
    )
    return


@app.cell
def _(df_policy, pd):
    email_cost = 0.10
    avg_order_value = 30

    roi_data = []
    for _seg in df_policy["segment"].cat.categories:
        _sub = df_policy[df_policy["segment"] == _seg]
        _n = len(_sub)
        _t = _sub[_sub["treated"] == 1]
        _c = _sub[_sub["treated"] == 0]

        # Incremental conversions from emailing this segment
        _conv_t = _t["conversion"].mean()
        _conv_c = _c["conversion"].mean()
        incremental_conv_rate = _conv_t - _conv_c

        # ROI per customer in this segment
        revenue_per_customer = incremental_conv_rate * avg_order_value
        cost_per_customer = email_cost
        roi = revenue_per_customer - cost_per_customer

        roi_data.append({
            "Segment": _seg,
            "N": _n,
            "Incremental conv rate": incremental_conv_rate,
            "Revenue/customer": revenue_per_customer,
            "Cost/customer": cost_per_customer,
            "Net ROI/customer": roi,
            "Total segment ROI": roi * _n,
        })

    roi_df = pd.DataFrame(roi_data).round(4)
    roi_df
    return avg_order_value, email_cost, roi_data, roi_df


@app.cell
def _(mo):
    mo.md(
        r"""
        **The targeting insight:** Instead of emailing everyone (spending on all 64K customers),
        you can email only the high-uplift segment and get **better ROI per dollar spent**.
        The "sleeping dogs" segment actually **loses** money when emailed.
        """
    )
    return


# ── Section 9: Feature importance ────────────────────────────────────────────
@app.cell
def _(feature_cols, model_c, model_t, np, pd, plt):
    # What drives heterogeneity?
    # Look at feature importance differences between treated and control models
    fi_t = model_t.feature_importances_
    fi_c = model_c.feature_importances_

    fi_df = pd.DataFrame({
        "Feature": feature_cols,
        "Importance (Treated model)": fi_t,
        "Importance (Control model)": fi_c,
        "Difference": fi_t - fi_c,
    }).sort_values("Difference", key=abs, ascending=False)

    _fig, _ax = plt.subplots(figsize=(10, 5))
    _ax.barh(fi_df["Feature"], fi_df["Difference"],
            color=["#2563eb" if d > 0 else "#ef4444" for d in fi_df["Difference"]], alpha=0.7)
    _ax.set_xlabel("Feature Importance Difference (Treated - Control model)")
    _ax.set_title("Which features drive treatment effect heterogeneity?")
    _ax.axvline(0, color="#1e293b", linewidth=0.8)

    plt.tight_layout()
    _fig
    return fi_c, fi_df, fi_t


# ── Section 10: Summary ─────────────────────────────────────────────────────
@app.cell
def _(mo):
    mo.md(
        r"""
        ---
        ## 9. Takeaways

        1. **ATE is not enough.** A campaign that "works on average" may waste money
           on most customers and actively annoy some. The ATE hides heterogeneity.

        2. **CATE reveals who benefits.** Conditional Average Treatment Effects
           let you identify Persuadables (email them), Sure Things (don't bother),
           Lost Causes (don't bother), and Sleeping Dogs (definitely don't email).

        3. **T-Learner vs S-Learner is a bias-variance tradeoff.** T-Learner is
           noisier but captures more heterogeneity. S-Learner is smoother but
           may underestimate treatment effect variation.

        4. **The uplift curve is the key evaluation tool.** If your targeting model's
           curve is above the random diagonal, you're doing better than blanket campaigns.

        5. **ROI math makes it real.** Convert CATEs to dollars. A negative ROI segment
           shouldn't be emailed, regardless of what the average says.

        ### What we didn't cover

        - **X-Learner** (Künzel et al., 2019) — uses cross-fitting for more efficient CATE estimation
        - **Causal Forests** (Wager & Athey, 2018) — tree-based with built-in honest inference
        - **Doubly Robust Learner** — combines propensity score and outcome modeling
        - **Multi-treatment uplift** (men's email vs women's email — which one for whom?)
        - **Calibration** of CATE predictions
        - **Qini coefficient** (area between uplift curve and random baseline)

        ---
        *Dataset: Kevin Hillstrom's MineThatData E-Mail Analytics Challenge (2008).
        See Hillstrom, K. (2008), "The MineThatData E-Mail Analytics and Data Mining Challenge."*
        """
    )
    return


if __name__ == "__main__":
    app.run()
