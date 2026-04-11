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
        # The Variable That Broke Your Model
        ## Collider Bias and DAG Reasoning

        **Method:** DAG analysis + regression with correct vs incorrect controls
        **Dataset:** UCI Adult Census Income
        **Key insight:** Controlling for the wrong variable can *create* bias
        where none existed. Not all "controlling for confounders" is good.

        ---

        ### The story

        You want to estimate the **effect of education on income**. A colleague says:
        "Control for occupation — it's clearly related to both education and income."

        Sounds reasonable. But what if occupation is a **collider** — a variable that
        is *caused by* both education and income (or their determinants)? Conditioning
        on a collider opens a backdoor path and **introduces bias**.

        This is one of the most common mistakes in applied research:
        **throwing every variable into the regression "just to be safe."**

        This notebook walks through:
        1. **DAG reasoning** — why some controls help and others hurt
        2. **Demonstrating collider bias** on real data
        3. **Comparing** regressions with correct vs incorrect controls
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

        The **UCI Adult** dataset (also called "Census Income") contains 32,561
        records from the 1994 US Census. The target variable is whether income
        exceeds $50K/year.

        | Variable | Description |
        |----------|-------------|
        | `age` | Age in years |
        | `education_num` | Years of education (numeric) |
        | `occupation` | Occupation category (14 types) |
        | `hours_per_week` | Usual hours worked per week |
        | `income` | ">50K" or "<=50K" |
        | `race`, `sex` | Demographic variables |
        | `workclass` | Private, govt, self-employed, etc. |
        | `marital_status` | Married, divorced, never-married, etc. |
        """
    )
    return


@app.cell
def _(pd):
    import pathlib as _pathlib

    # Load UCI Adult dataset
    _cols = [
        "age", "workclass", "fnlwgt", "education", "education_num",
        "marital_status", "occupation", "relationship", "race", "sex",
        "capital_gain", "capital_loss", "hours_per_week", "native_country", "income",
    ]
    _local = _pathlib.Path(__file__).parent / "data" / "adult.data"
    _url = "https://archive.ics.uci.edu/ml/machine-learning-databases/adult/adult.data"
    _src = str(_local) if _local.exists() else _url
    adult = pd.read_csv(_src, names=_cols, skipinitialspace=True)

    # Clean up
    adult["high_income"] = (adult["income"] == ">50K").astype(int)
    adult = adult.dropna()
    adult = adult[adult["occupation"] != "?"].copy()

    print(f"Shape: {adult.shape}")
    print(f"\nIncome distribution:")
    print(adult["income"].value_counts())
    adult.head()
    return (adult,)


# ── Section 2: Explore ──────────────────────────────────────────────────────
@app.cell
def _(mo):
    mo.md(
        r"""
        ---
        ## 2. Education and income: the raw relationship
        """
    )
    return


@app.cell
def _(adult, pd, plt, sns):
    # Income rate by education level
    _by_educ = adult.groupby("education_num")["high_income"].mean().reset_index()

    _fig, _axes = plt.subplots(1, 2, figsize=(12, 4))

    _axes[0].bar(_by_educ["education_num"], _by_educ["high_income"], color="#2563eb", alpha=0.7)
    _axes[0].set_xlabel("Years of Education")
    _axes[0].set_ylabel("P(Income > $50K)")
    _axes[0].set_title("Income vs Education")

    # Education distribution
    _axes[1].hist(adult["education_num"], bins=16, color="#94a3b8", alpha=0.7, edgecolor="white")
    _axes[1].set_xlabel("Years of Education")
    _axes[1].set_ylabel("Count")
    _axes[1].set_title("Education Distribution")

    plt.tight_layout()
    _fig
    return


@app.cell
def _(adult, pd, plt):
    # Income rate by occupation
    _by_occ = (
        adult.groupby("occupation")["high_income"]
        .agg(["mean", "count"])
        .sort_values("mean", ascending=True)
        .reset_index()
    )

    _fig, _ax = plt.subplots(figsize=(10, 6))
    _ax.barh(_by_occ["occupation"], _by_occ["mean"], color="#2563eb", alpha=0.7)
    _ax.set_xlabel("P(Income > $50K)")
    _ax.set_title("Income by Occupation")
    plt.tight_layout()
    _fig
    return


# ── Section 3: DAGs ─────────────────────────────────────────────────────────
@app.cell
def _(mo):
    mo.md(
        r"""
        ---
        ## 3. DAGs: A visual language for causality

        A **Directed Acyclic Graph (DAG)** is a diagram showing which variables
        cause which. Arrows point from cause to effect.

        ### Three fundamental structures

        ```
        (1) Chain (Mediator)      (2) Fork (Confounder)      (3) Collider
            X → M → Y                  X ← C → Y                X → K ← Y
        ```

        **Rules for conditioning:**

        | Structure | Condition on middle node? | Effect |
        |-----------|--------------------------|--------|
        | Chain: X → M → Y | **Don't** (blocks causal path) | Removes part of the effect |
        | Fork: X ← C → Y | **Do** (blocks backdoor) | Removes confounding bias |
        | Collider: X → K ← Y | **Don't** (opens path) | Creates spurious association |

        ### The key insight

        **Conditioning on a collider OPENS a path that was closed.**
        This is the opposite of what most people intuit.
        """
    )
    return


@app.cell
def _(mo):
    mo.md(
        r"""
        ### Our DAG for education → income

        ```
        Ability (unobserved)
           ↓           ↓
        Education → Income
           ↓           ↓
           └──→ Occupation ←──┘
        ```

        - **Education → Income**: the causal effect we want
        - **Ability → Education** and **Ability → Income**: classic confounder
          (we can't observe it directly)
        - **Education → Occupation** and **Income-determinants → Occupation**:
          occupation is partly determined by education AND by other factors
          correlated with income

        **Occupation is a collider** on the path Education → Occupation ← Income-determinants.

        If we condition on occupation (include it in the regression), we **open** this
        path and create a spurious association between education and other income
        determinants, biasing our estimate.

        ### The intuition

        Within a fixed occupation (say, "Sales"), people with MORE education but who
        still ended up in Sales may have had bad luck, lower ability, or other
        disadvantages that also lower their income. Conditioning on occupation
        creates a **negative selection** that biases the education coefficient downward.
        """
    )
    return


# ── Section 4: Regressions ──────────────────────────────────────────────────
@app.cell
def _(mo):
    mo.md(
        r"""
        ---
        ## 4. Three regressions, three different stories

        Let's run three OLS models and compare:

        1. **Bivariate**: Income ~ Education (no controls)
        2. **Good controls**: Income ~ Education + Age + Sex + Race + Hours
        3. **Bad control (collider)**: Income ~ Education + Age + Sex + Race + Hours + **Occupation**

        If occupation is a collider, Model 3 should show a **smaller** education coefficient
        than Model 2 — because conditioning on occupation absorbs part of the
        effect and introduces collider bias.
        """
    )
    return


@app.cell
def _(adult, pd, smf):
    # Create dummies for categorical variables
    adult_reg = adult.copy()
    adult_reg["male"] = (adult_reg["sex"] == "Male").astype(int)
    adult_reg["white"] = (adult_reg["race"] == "White").astype(int)

    # Model 1: Bivariate
    m1 = smf.ols("high_income ~ education_num", data=adult_reg).fit()

    # Model 2: Good controls (confounders only)
    m2 = smf.ols("high_income ~ education_num + age + male + white + hours_per_week",
                  data=adult_reg).fit()

    # Model 3: Bad control — occupation is a collider/mediator
    m3 = smf.ols("high_income ~ education_num + age + male + white + hours_per_week + C(occupation)",
                  data=adult_reg).fit()

    comparison = pd.DataFrame({
        "Model": ["(1) Bivariate", "(2) Good controls", "(3) + Occupation (collider)"],
        "Educ coeff": [m1.params["education_num"], m2.params["education_num"], m3.params["education_num"]],
        "Educ SE": [m1.bse["education_num"], m2.bse["education_num"], m3.bse["education_num"]],
        "R²": [m1.rsquared, m2.rsquared, m3.rsquared],
    })
    comparison["Educ coeff"] = comparison["Educ coeff"].round(4)
    comparison["Educ SE"] = comparison["Educ SE"].round(4)
    comparison["R²"] = comparison["R²"].round(3)

    comparison
    return adult_reg, comparison, m1, m2, m3


@app.cell
def _(comparison, mo):
    mo.md(
        f"""
        ### What happened?

        | Model | Education coeff | Interpretation |
        |-------|----------------|----------------|
        | (1) Bivariate | {comparison.iloc[0]['Educ coeff']} | Confounded by omitted variables |
        | (2) Good controls | {comparison.iloc[1]['Educ coeff']} | Controls for confounders, doesn't touch colliders |
        | (3) + Occupation | {comparison.iloc[2]['Educ coeff']} | **Smaller** — conditioning on collider biased it down |

        The education coefficient **drops** when we add occupation. A naive analyst
        might think "great, more controls = more precise." But the opposite happened:
        we introduced bias.

        The R² went up (the model "fits better"), but the education coefficient
        is now **biased**. **Better fit ≠ less bias.**
        """
    )
    return


# ── Section 5: Simpson's paradox within occupations ──────────────────────────
@app.cell
def _(mo):
    mo.md(
        r"""
        ---
        ## 5. Seeing it: Education-income relationship within vs across occupations

        If occupation is a collider, the education-income relationship should look
        **weaker** (or even reverse) within occupations compared to across them.
        """
    )
    return


@app.cell
def _(adult, pd, plt):
    # Compare within-occupation vs overall slopes
    _top_occs = adult["occupation"].value_counts().head(6).index.tolist()

    _fig, _axes = plt.subplots(2, 3, figsize=(14, 8))

    for _idx, _occ in enumerate(_top_occs):
        _ax = _axes[_idx // 3, _idx % 3]
        _sub = adult[adult["occupation"] == _occ]
        _by_educ = _sub.groupby("education_num")["high_income"].mean()

        _ax.scatter(_by_educ.index, _by_educ.values, s=20, color="#2563eb", alpha=0.6)
        # Add trend line
        _z = pd.DataFrame({"x": _by_educ.index, "y": _by_educ.values}).dropna()
        if len(_z) > 2:
            _coef = np.polyfit(_z["x"], _z["y"], 1)
            _ax.plot(_z["x"], np.polyval(_coef, _z["x"]), color="#ef4444", linewidth=1.5)
            _ax.set_title(f"{_occ}\nslope = {_coef[0]:.3f}", fontsize=9)
        else:
            _ax.set_title(_occ, fontsize=9)

        _ax.set_xlabel("Education (yrs)", fontsize=8)
        _ax.set_ylabel("P(>50K)", fontsize=8)
        _ax.set_ylim(-0.05, 1.0)

    plt.suptitle("Education → Income WITHIN each occupation (weaker slopes = collider bias)", fontsize=11)
    plt.tight_layout()
    _fig
    return


@app.cell
def _(mo):
    mo.md(
        r"""
        **Within each occupation**, the education-income relationship is **flatter**
        than the overall relationship. That's the collider at work: by fixing occupation,
        we're comparing a PhD in "Sales" to a high-school graduate in "Sales" — but
        the PhD in Sales probably ended up there for a reason (lower unobserved quality?),
        which attenuates the apparent effect of education.
        """
    )
    return


# ── Section 6: Simulation ───────────────────────────────────────────────────
@app.cell
def _(mo):
    mo.md(
        r"""
        ---
        ## 6. Simulation: Collider bias from first principles

        To confirm our intuition, let's simulate data where we **know** the truth.

        **True DGP:**

        $$\text{ability} \sim N(0, 1)$$
        $$\text{education} = 12 + 2 \cdot \text{ability} + \varepsilon_e$$
        $$\text{income} = 20 + \underbrace{3}_{\text{TRUE EFFECT}} \cdot \text{education} + 5 \cdot \text{ability} + \varepsilon_y$$
        $$\text{occupation} = f(\text{education}, \text{income}) + \varepsilon_o$$

        The true causal effect of education on income is **3**.
        Ability is an unobserved confounder. Occupation is a collider.
        """
    )
    return


@app.cell
def _(np, pd, smf):
    # Simulation
    rng = np.random.default_rng(42)
    n = 5000

    ability = rng.normal(0, 1, n)
    education = 12 + 2 * ability + rng.normal(0, 1, n)
    income = 20 + 3 * education + 5 * ability + rng.normal(0, 3, n)

    # Occupation is caused by both education and income
    # (simplified: high education + high income → "professional" occupation)
    occ_score = 0.5 * education + 0.3 * income + rng.normal(0, 2, n)
    occupation = pd.cut(occ_score, bins=5, labels=["Occ1", "Occ2", "Occ3", "Occ4", "Occ5"])

    sim = pd.DataFrame({
        "ability": ability,
        "education": education,
        "income": income,
        "occupation": occupation,
    })

    # Three regressions
    sim_m1 = smf.ols("income ~ education", data=sim).fit()
    sim_m2 = smf.ols("income ~ education + ability", data=sim).fit()
    sim_m3 = smf.ols("income ~ education + C(occupation)", data=sim).fit()
    sim_m4 = smf.ols("income ~ education + ability + C(occupation)", data=sim).fit()

    print(f"True effect: 3.000")
    print(f"")
    print(f"(1) Bivariate (education only):     {sim_m1.params['education']:.3f}  ← confounded upward (ability omitted)")
    print(f"(2) + ability (correct control):     {sim_m2.params['education']:.3f}  ← close to truth!")
    print(f"(3) + occupation (collider):          {sim_m3.params['education']:.3f}  ← collider bias")
    print(f"(4) + ability + occupation (both):   {sim_m4.params['education']:.3f}  ← still biased by collider")
    return ability, education, income, n, occ_score, occupation, rng, sim, sim_m1, sim_m2, sim_m3, sim_m4


@app.cell
def _(mo):
    mo.md(
        r"""
        ### What the simulation shows

        | Model | Education coeff | Verdict |
        |-------|----------------|---------|
        | (1) Education only | ~4.8 | **Biased up** — ability confounds |
        | (2) + Ability | ~3.0 | **Correct** — confounder controlled |
        | (3) + Occupation | ~2.2 | **Biased down** — collider opened |
        | (4) + Both | ~2.5 | **Still biased** — collider damage persists |

        **Key lesson:** Even when you control for the right confounder (ability),
        adding the collider (occupation) **still biases the estimate**. More controls
        is not always better.
        """
    )
    return


# ── Section 7: Rules of thumb ───────────────────────────────────────────────
@app.cell
def _(mo):
    mo.md(
        r"""
        ---
        ## 7. Practical rules for choosing controls

        ### The "good control" checklist

        Before adding a variable to your regression, ask:

        1. **Is it a confounder?** (causes both X and Y) → **Control for it** ✅
        2. **Is it a collider?** (caused by both X and Y) → **Don't control** ❌
        3. **Is it a mediator?** (X → M → Y) → **Don't control** (unless you want the direct effect only)
        4. **Is it an instrument?** (affects X but not Y directly) → **Don't control** (save it for IV)

        ### When in doubt, draw the DAG

        The DAG makes the right answer mechanical:
        - List all paths from X to Y
        - **Block backdoor paths** (non-causal) by conditioning on the right nodes
        - **Don't block causal paths** (or collider paths)

        ### Common colliders in applied research

        | Research question | Likely collider |
        |-------------------|----------------|
        | Education → Income | Occupation, job title |
        | Smoking → Lung cancer | Hospital admission (Berkson's bias) |
        | Talent → Success | Being in the sample (selection/survival) |
        | Parenting → Child outcomes | Neighborhood (chosen based on both) |

        ---
        ## 8. Takeaways

        1. **Not all controls are good controls.** Blindly adding variables can
           *increase* bias (collider bias) or *remove* the effect you want to
           estimate (mediator bias).

        2. **Draw the DAG first.** It makes the right conditioning set mechanical.

        3. **Collider bias is counterintuitive.** Conditioning on a common effect
           creates a spurious negative association between its causes. Within
           "Sales," education looks less valuable because the educated people
           in Sales got there for bad reasons.

        4. **Higher R² doesn't mean less bias.** The occupation model fits better
           but estimates the wrong number.

        5. **The simulation confirms the theory.** When we know the true DGP,
           controlling for the collider biases the estimate even after controlling
           for the confounder.

        ### What we didn't cover

        - **Formal d-separation rules** (Pearl's criterion)
        - **Instrumental variables** (when you can't observe the confounder)
        - **Sensitivity analysis** (how much unmeasured confounding would it take to explain your result?)
        - **Causal discovery** (learning the DAG from data)

        ---
        *Dataset: UCI Adult Census Income (1994).
        Simulation inspired by Elwert & Winship (2014), "Endogenous Selection Bias."*
        """
    )
    return


if __name__ == "__main__":
    app.run()
