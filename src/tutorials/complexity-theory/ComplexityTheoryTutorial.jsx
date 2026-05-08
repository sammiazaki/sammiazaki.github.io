import {
  TutorialShell,
  StepContent,
  QuizCard,
  InfoBox,
  Tex,
} from "@/components/tutorial";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollText, BookOpen, Sigma, Zap, Lock } from "lucide-react";
import ComplexityTimeline from "./ComplexityTimeline";

const LESSONS = [
  "The lost letter",
  "Before complexity",
  "Algorithm analysis",
  "NP-completeness",
  "Class hierarchy",
  "Why it's hard",
  "Modern currents",
  "Recap & deeper",
];

export default function ComplexityTheoryTutorial() {
  const intro = (
    <>
      <p>
        Complexity theory is the field that answers the question{" "}
        <span className="font-semibold">
          "what does it mean for a problem to be hard?"
        </span>{" "}
        It's also the field where the deepest open question in computer
        science — <span className="font-semibold">P vs NP</span> — has been
        sitting unsolved for fifty years.
      </p>
      <p>
        This tutorial is a tour of the foundations: from Hilbert and Turing,
        through the Cook–Levin theorem, to the three modern barriers that
        explain why P vs NP is so resistant. Light on machinery, heavy on
        ideas, with an animated timeline at the end.
      </p>
    </>
  );

  return (
    <TutorialShell
      title="From Hilbert to NP-Complete"
      description="A foundations tour of computational complexity — from the Entscheidungsproblem and Turing's 1936 answer, through Cook–Levin and Karp's 21 problems, to the three barriers that explain why P vs NP is so hard."
      intro={intro}
      lessons={LESSONS}
    >
      {(step) => (
        <>
          {/* ─────────────────── Step 0: The lost letter ─────────────────── */}
          {step === 0 && (
            <StepContent className="space-y-4">
              <Card className="rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <ScrollText className="h-6 w-6" /> The letter nobody read for thirty years
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700 leading-relaxed">
                  <p>
                    In March 1956, a frail Kurt Gödel wrote a letter to John
                    von Neumann, who was dying of cancer. Buried in the letter
                    is this passage:
                  </p>
                  <InfoBox variant="dark">
                    <p className="italic">
                      "If there really were a machine with [running time]{" "}
                      <Tex math="\varphi(n) \sim k \cdot n" /> ... this would
                      have consequences of the greatest importance. Namely, it
                      would obviously mean that ... the mental work of a
                      mathematician concerning Yes-or-No questions could be
                      completely replaced by a machine."
                    </p>
                  </InfoBox>
                  <InfoBox title="Intuition" variant="outline">
                    Imagine you're a kid doing math homework. Some problems
                    are easy to <em>check</em> ("is 7 a factor of 91?" — just
                    divide) but hard to <em>find</em> ("what are the prime
                    factors of this 200-digit number?"). Gödel was asking: is
                    there always a fast way to find the answer when there's a
                    fast way to check it? <span className="font-semibold">
                    That's P vs NP.</span> Running time{" "}
                    <Tex math="\varphi(n) \sim k \cdot n" /> just means
                    "linear time" — fast.
                  </InfoBox>
                  <p>
                    Gödel was describing what we now call{" "}
                    <span className="font-semibold">P vs NP</span> — fifteen
                    years before Stephen Cook gave it a name. The letter was
                    forgotten until 1988. By then, complexity theory had been
                    a field for two decades, the question had a million-dollar
                    prize attached to it, and nobody had any idea how to
                    answer it.
                  </p>
                  <InfoBox title="The shape of the field" variant="muted">
                    Complexity theory is a story about the gap between a
                    natural question — "is finding a solution as easy as
                    checking one?" — and a formal answer. We're going to walk
                    that gap.
                  </InfoBox>
                </CardContent>
              </Card>
            </StepContent>
          )}

          {/* ─────────────────── Step 1: Before complexity ─────────────────── */}
          {step === 1 && (
            <StepContent className="space-y-4">
              <Card className="rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle className="text-2xl">
                    Before "how hard?", we needed "computable"
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4 text-slate-700 leading-relaxed">
                    <p>
                      In 1928, David Hilbert posed the{" "}
                      <span className="font-semibold">
                        Entscheidungsproblem
                      </span>{" "}
                      <span className="text-slate-500">
                        (German for "decision problem"; pronounced{" "}
                        <em>ent-SHY-doongs-PRO-blem</em>)
                      </span>
                      : is there a mechanical procedure that, given any{" "}
                      <span
                        className="border-b border-dotted border-slate-400"
                        title="A statement built from variables, logical connectives (∧, ∨, ¬, →), and quantifiers (∀ for all, ∃ there exists). Example: ∀x ∃y (y > x)."
                      >
                        first-order logical statement
                      </span>
                      , decides whether it's a{" "}
                      <span
                        className="border-b border-dotted border-slate-400"
                        title="A statement that has been proven true from the axioms — the rules we agree on at the start."
                      >
                        theorem
                      </span>
                      ?
                    </p>
                    <InfoBox title="Intuition" variant="outline">
                      Hilbert wanted a "math robot": you feed it any
                      true-or-false math statement, it grinds for a while,
                      and out pops <span className="font-mono">YES (provable)</span>{" "}
                      or <span className="font-mono">NO (not provable)</span>.
                      A complete automation of mathematical reasoning. Church
                      and Turing both proved, in 1936: <span className="font-semibold">
                      no such robot can exist</span>.
                    </InfoBox>
                    <p>
                      The answer came in 1936, simultaneously, from two
                      directions:
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>
                        <span className="font-semibold">Alonzo Church</span>{" "}
                        invented the{" "}
                        <span
                          className="border-b border-dotted border-slate-400"
                          title="A tiny formal language where everything is a function. Add three rules and you can encode any computation."
                        >
                          λ-calculus
                        </span>{" "}
                        and proved his system could not decide every logical
                        statement.
                      </li>
                      <li>
                        <span className="font-semibold">Alan Turing</span>, in{" "}
                        <em>On Computable Numbers</em>, defined the{" "}
                        <span className="font-semibold">Turing machine</span>{" "}
                        (an idealized computer with an infinite tape and a
                        finite rulebook) and proved the{" "}
                        <span
                          className="border-b border-dotted border-slate-400"
                          title="Given a program and an input, decide whether it eventually stops or runs forever."
                        >
                          Halting Problem
                        </span>{" "}
                        undecidable.
                      </li>
                    </ul>
                    <InfoBox title="Halting Problem — kid version" variant="outline">
                      You build a magic box that reads any program and tells
                      you if it ever finishes. Now I write a sneaky program:{" "}
                      <em>"Ask the magic box about me. If it says I finish,
                      loop forever. If it says I loop forever, finish."</em>{" "}
                      The box is now stuck — whatever it answers is wrong.
                      That's why no such box can exist.
                    </InfoBox>
                    <p>
                      The <span className="font-semibold">Church–Turing thesis</span>{" "}
                      was born: anything we'd reasonably call computable is
                      computable by a Turing machine. Not a theorem — an
                      empirical claim that has held up for ninety years.
                    </p>
                    <p>
                      It's worth pausing to note: <span className="font-semibold">
                      Gödel had already shocked mathematicians in 1931</span>{" "}
                      with his <em>incompleteness theorems</em> — he showed
                      any consistent formal system rich enough to do
                      arithmetic contains true statements it cannot prove.
                      So Hilbert's program was already wounded. Turing and
                      Church finished it: not only are some truths unprovable,
                      <em> some questions are uncomputable</em>. Math has
                      limits, and the limits are concrete.
                    </p>
                  </div>
                  <div className="space-y-4">
                    <InfoBox title="Why this matters for complexity" variant="muted">
                      You cannot ask "how many steps does this algorithm
                      take?" until you've defined what a step is. Turing gave
                      us that definition. Everything after depends on it.
                    </InfoBox>
                    <InfoBox title="The Church–Turing thesis (informal)" variant="formula">
                      <Tex
                        display
                        math="\{\text{computable functions}\} = \{\text{Turing-machine computable}\}"
                      />
                    </InfoBox>
                    <InfoBox title="Halting problem" variant="dark">
                      <span className="text-sm">
                        No algorithm exists that, given an arbitrary program{" "}
                        <Tex math="P" /> and input <Tex math="x" />, decides
                        whether <Tex math="P(x)" /> halts. Proof: classic
                        diagonalization on a self-referential program.
                      </span>
                    </InfoBox>
                  </div>
                </CardContent>
              </Card>
            </StepContent>
          )}

          {/* ─────────────────── Step 2: Algorithm analysis ─────────────────── */}
          {step === 2 && (
            <StepContent className="space-y-4">
              <Card className="rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <Sigma className="h-6 w-6" /> The 1960s: algorithm analysis becomes a discipline
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700 leading-relaxed">
                  <p>
                    For thirty years after Turing, "this algorithm runs in{" "}
                    <Tex math="n^2" /> time" was hand-waving. There was no
                    agreement on what counts as a step, what counts as fast,
                    or how to compare two algorithms when one wins on small
                    inputs and the other on large.
                  </p>
                  <InfoBox title="Big-O — kid version" variant="outline">
                    <p>
                      Imagine cleaning a room with <Tex math="n" /> toys.
                      Picking up each toy once is{" "}
                      <span className="font-semibold">linear, <Tex math="O(n)" /></span> —
                      double the toys, double the time. Comparing every toy
                      to every other toy ("does this go with that?") is{" "}
                      <span className="font-semibold">quadratic,{" "}
                      <Tex math="O(n^2)" /></span> — double the toys, work
                      goes up <em>4×</em>.
                    </p>
                    <p className="mt-2">
                      Now imagine you double the toys again, and again. The
                      <em> rice-on-a-chessboard </em>story: 1, 2, 4, 8, 16, ...
                      grains. By square 64 you owe more rice than exists on
                      Earth. That's{" "}
                      <span className="font-semibold">exponential,{" "}
                      <Tex math="O(2^n)" /></span> — and it's why "polynomial"
                      and "exponential" feel like different universes.
                    </p>
                  </InfoBox>
                  <p>Three things changed this in a single decade.</p>

                  <div className="grid gap-4 md:grid-cols-3">
                    <InfoBox title="Big-O notation (1976)" variant="muted">
                      Introduced by Bachmann (1894) and Landau (1909) for
                      analytic number theory; pulled into CS by Knuth's 1976{" "}
                      <em>SIGACT News</em> paper standardizing{" "}
                      <Tex math="O" />, <Tex math="\Omega" />,{" "}
                      <Tex math="\Theta" />.
                    </InfoBox>
                    <InfoBox title="Edmonds (1965)" variant="muted">
                      In <em>Paths, Trees, and Flowers</em>: polynomial time =
                      "good algorithm" = the right bar for tractable. Why?
                      Compositional, robust to model, matches practice.
                    </InfoBox>
                    <InfoBox title="Hartmanis–Stearns (1965)" variant="muted">
                      <em>On the computational complexity of algorithms</em> —
                      the paper that named the field and proved the time
                      hierarchy theorem. Turing Award, 1993.
                    </InfoBox>
                  </div>

                  <Card className="rounded-lg border-slate-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">
                        The time hierarchy theorem
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <p>
                        For sufficiently well-behaved (time-constructible){" "}
                        <Tex math="f" />, there exist languages decidable in
                        time <Tex math="O(f(n))" /> but not in time{" "}
                        <Tex math="o(f(n)/\log f(n))" />.
                      </p>
                      <InfoBox variant="formula">
                        <Tex
                          display
                          math="\text{DTIME}(f(n)/\log f(n)) \subsetneq \text{DTIME}(f(n))"
                        />
                      </InfoBox>
                      <p>
                        <span className="font-semibold">In English:</span> more
                        time strictly buys you more computational power.
                      </p>
                      <p>
                        <span className="font-semibold">Proof sketch.</span>{" "}
                        Diagonalization. Build a machine that simulates every
                        machine running in <Tex math="f(n)/\log f(n)" /> time
                        and disagrees with each on at least one input. The{" "}
                        <Tex math="\log" /> overhead is the cost of the
                        universal simulator.
                      </p>
                      <InfoBox variant="success">
                        Consequence: <Tex math="\text{P} \subsetneq \text{EXP}" />.
                        This is one of only <em>two</em> unconditional strict
                        separations between standard time/space classes we know.
                      </InfoBox>
                      <p className="mt-3">
                        The other one is the{" "}
                        <span className="font-semibold">space hierarchy
                        theorem</span> (Stearns–Hartmanis–Lewis, 1965), proved
                        the same way but for memory rather than time. It
                        gives <Tex math="\text{NL} \subsetneq \text{PSPACE}" />.
                        Diagonalization is the only tool we have that
                        provides unconditional separations between standard
                        complexity classes.
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="rounded-lg border-slate-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">
                        Concrete: linear vs logarithmic search
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <p>
                        Find <Tex math="x" /> in a sorted list of{" "}
                        <Tex math="n" /> numbers. Two algorithms.
                      </p>
                      <div className="grid gap-3 md:grid-cols-2">
                        <InfoBox title="Linear scan — O(n)" variant="formula">
                          <pre className="text-xs leading-relaxed font-mono overflow-x-auto">{`for i in range(n):
    if a[i] == x:
        return i
return -1`}</pre>
                          <p className="mt-2 text-xs">
                            Doubles when <Tex math="n" /> doubles. For{" "}
                            <Tex math="n=10^9" />: ~10⁹ steps. Seconds.
                          </p>
                        </InfoBox>
                        <InfoBox title="Binary search — O(log n)" variant="formula">
                          <pre className="text-xs leading-relaxed font-mono overflow-x-auto">{`lo, hi = 0, n - 1
while lo <= hi:
    mid = (lo + hi) // 2
    if a[mid] == x: return mid
    if a[mid] < x: lo = mid + 1
    else: hi = mid - 1`}</pre>
                          <p className="mt-2 text-xs">
                            Adds one step when <Tex math="n" /> doubles. For{" "}
                            <Tex math="n=10^9" />: ~30 steps. Microseconds.
                          </p>
                        </InfoBox>
                      </div>
                      <p className="text-xs text-slate-600">
                        Same problem, same correctness, both polynomial.
                        The Big-O class is the difference between
                        "instantaneous" and "noticeable lag" at web scale.
                      </p>
                    </CardContent>
                  </Card>

                  <InfoBox title="Galactic algorithms" variant="warning">
                    <p>
                      Big-O hides constants — and sometimes those constants
                      are{" "}
                      <span className="font-semibold">
                        astronomically large
                      </span>
                      . The fastest known algorithm for matrix
                      multiplication, due to Williams–Xu–Xu–Zhou (2024),
                      runs in <Tex math="O(n^{2.371552})" />. But the
                      hidden constants are so huge that on{" "}
                      <em>any input that fits in the observable universe</em>,
                      the simple <Tex math="O(n^3)" /> algorithm is faster.
                      We call these "galactic": polynomial in name, useless
                      in practice. AKS primality is similar — beautiful, but
                      Miller–Rabin still wins.
                    </p>
                  </InfoBox>
                </CardContent>
              </Card>
            </StepContent>
          )}

          {/* ─────────────────── Step 3: Cook–Levin & Karp ─────────────────── */}
          {step === 3 && (
            <StepContent className="space-y-4">
              <Card className="rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <Zap className="h-6 w-6" /> The Big Bang: Cook, Levin, Karp
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700 leading-relaxed">
                  <p>
                    By 1970 the field had a healthy theory of what's
                    computable in polynomial time, but no theory of what
                    isn't. Then three papers in three years lit the field on
                    fire.
                  </p>
                  <InfoBox title="NP — kid version" variant="outline">
                    <p>
                      <span className="font-semibold">Sudoku.</span> Solving a
                      hard sudoku takes you ages. But if your friend hands
                      you a finished grid, checking it takes{" "}
                      <em>seconds</em> — just look down each row, column, and
                      box.
                    </p>
                    <p className="mt-2">
                      That gap — <em>checking is easy, finding is hard</em> —
                      is exactly what <span className="font-semibold">NP</span>{" "}
                      means. P is "fast to find." NP is "fast to check (given
                      a hint)." The trillion-dollar question is whether they
                      might secretly be the same.
                    </p>
                    <p className="mt-2">
                      <span className="font-semibold">SAT</span> is the
                      "sudoku" of logic: given a giant{" "}
                      <Tex math="\text{AND/OR/NOT}" /> formula over true/false
                      switches, is there a way to flip the switches that
                      makes the whole thing true? Easy to verify a guess.
                      Brutally hard to find one.
                    </p>
                  </InfoBox>

                  <div className="space-y-3">
                    <InfoBox title="Cook (1971): SAT is NP-complete" variant="muted">
                      <p className="text-sm">
                        Cook defines <span className="font-semibold">NP</span>{" "}
                        — decision problems whose "yes" answers have
                        polynomial-size proofs verifiable in polynomial time —
                        and proves that <span className="font-semibold">SAT</span>{" "}
                        is at least as hard as every problem in NP.
                      </p>
                    </InfoBox>

                    <InfoBox title="Proof sketch (constructive)" variant="formula">
                      <p className="text-sm">
                        Given any non-deterministic Turing machine{" "}
                        <Tex math="M" /> running in time <Tex math="p(n)" />,
                        translate "<Tex math="M" /> accepts <Tex math="x" />" into a
                        Boolean formula <Tex math="\varphi_{M,x}" /> with clauses
                        encoding (1) the initial configuration matches{" "}
                        <Tex math="x" />; (2) each step is a valid transition
                        of <Tex math="M" />; (3) the final configuration is
                        accepting. <Tex math="|\varphi_{M,x}| = \text{poly}(|x|)" />.
                        So:
                      </p>
                      <Tex
                        display
                        math="\text{SAT solvable in poly time} \;\Rightarrow\; \text{P} = \text{NP}"
                      />
                    </InfoBox>

                    <InfoBox title="Levin (1973, USSR)" variant="muted">
                      Independently, behind the Iron Curtain and with no
                      knowledge of Cook's work, Leonid Levin proved the same
                      theorem from a search-problem angle. Hence{" "}
                      <span className="font-semibold">Cook–Levin</span>, not
                      just Cook.
                    </InfoBox>

                    <InfoBox title="Karp (1972): the 21 problems" variant="muted">
                      Richard Karp's <em>Reducibility Among Combinatorial
                      Problems</em> shows 21 problems from across operations
                      research, graph theory, and logic — Vertex Cover,
                      Hamiltonian Circuit, TSP, Knapsack, Clique, Set Cover,
                      ... — are all NP-complete via polynomial-time
                      reductions to/from SAT. Suddenly NP-completeness is a
                      research <em>tool</em>, not a curiosity.
                    </InfoBox>

                    <InfoBox title="Garey & Johnson (1979)" variant="dark">
                      The textbook <em>Computers and Intractability</em>{" "}
                      catalogs 300+ NP-complete problems and turns the theory
                      into an engineering practice. Most-cited book in CS.
                    </InfoBox>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle className="text-2xl">
                    A reduction in detail: 3-SAT → Independent Set
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700 leading-relaxed">
                  <p>
                    Karp's paper proves NP-completeness for 21 problems by
                    chaining reductions. Here's the prototype: showing{" "}
                    <span className="font-semibold">Independent Set</span>{" "}
                    is NP-hard by reducing 3-SAT to it. Once you understand
                    one reduction, the rest are variations.
                  </p>

                  <div className="grid gap-4 md:grid-cols-2">
                    <InfoBox title="Setup" variant="muted">
                      <p>
                        <span className="font-semibold">3-SAT input:</span> a
                        Boolean formula in conjunctive normal form, where
                        every clause has exactly 3 literals. Example:
                      </p>
                      <div className="my-2">
                        <Tex
                          display
                          math="\varphi = (x_1 \lor x_2 \lor \neg x_3) \land (\neg x_1 \lor x_2 \lor x_4) \land (\neg x_2 \lor \neg x_3 \lor x_4)"
                        />
                      </div>
                      <p>
                        <span className="font-semibold">Independent Set:</span>{" "}
                        given a graph <Tex math="G" /> and integer{" "}
                        <Tex math="k" />, is there a set of <Tex math="k" />{" "}
                        vertices with no edges between them?
                      </p>
                    </InfoBox>

                    <InfoBox title="Construction" variant="muted">
                      <ol className="list-decimal pl-5 space-y-1 text-sm">
                        <li>
                          For each clause, make a triangle of 3 vertices —
                          one per literal. Edges within a triangle prevent
                          picking two literals from the same clause.
                        </li>
                        <li>
                          Add an edge between every pair of vertices labeled
                          with contradictory literals (e.g.,{" "}
                          <Tex math="x_1" /> and <Tex math="\neg x_1" />).
                          You can never pick both.
                        </li>
                        <li>
                          Set <Tex math="k = m" /> (the number of clauses).
                        </li>
                      </ol>
                    </InfoBox>
                  </div>

                  <InfoBox title="Why it works" variant="formula">
                    <p>
                      An independent set of size <Tex math="m" /> picks
                      exactly one vertex per triangle (one literal per
                      clause), and contradictory literals can't both be
                      chosen. Setting those literals to{" "}
                      <span className="font-mono">true</span> satisfies every
                      clause. Conversely, any satisfying assignment yields
                      such an independent set. So:
                    </p>
                    <div className="mt-2">
                      <Tex
                        display
                        math="\varphi \in \text{3-SAT} \;\Longleftrightarrow\; G_\varphi \text{ has independent set of size } m"
                      />
                    </div>
                    <p className="mt-2">
                      The construction is{" "}
                      <Tex math="O(m)" />, so it's a polynomial-time
                      reduction. Independent Set is NP-hard.
                    </p>
                  </InfoBox>

                  <InfoBox title="The pattern" variant="dark">
                    Every NP-completeness proof follows this template: take
                    an instance of a known-hard problem (3-SAT, almost
                    always), build a "gadget" structure in the target
                    problem that simulates each variable and clause, prove
                    the bidirectional correspondence. The gadgets are the
                    art form.
                  </InfoBox>
                </CardContent>
              </Card>
            </StepContent>
          )}

          {/* ─────────────────── Step 4: Class hierarchy ─────────────────── */}
          {step === 4 && (
            <StepContent className="space-y-4">
              <Card className="rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle className="text-2xl">
                    Reductions and the class hierarchy
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4 text-slate-700 leading-relaxed">
                    <p>
                      A <span className="font-semibold">polynomial-time
                      reduction</span> <Tex math="A \leq_p B" /> is an
                      algorithm that converts instances of <Tex math="A" />{" "}
                      into instances of <Tex math="B" />, in polynomial time,
                      preserving yes/no answers. It says:{" "}
                      <em>if you can solve <Tex math="B" /> fast, you can
                      solve <Tex math="A" /> fast.</em>
                    </p>
                    <p>Reductions work in both directions:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>
                        <span className="font-semibold">Algorithm design</span>{" "}
                        (upper bound): reduce your weird new problem to one
                        with a known fast algorithm.
                      </li>
                      <li>
                        <span className="font-semibold">Hardness</span> (lower
                        bound): reduce a known-hard problem (3-SAT, Vertex
                        Cover, ...) <em>to</em> your problem. Now your problem
                        is at least as hard.
                      </li>
                    </ul>
                    <p>
                      Cook–Levin gives you a universal hardness anchor — SAT
                      — so every reduction can chain back to it.
                    </p>
                    <InfoBox title="Reduction — kid version" variant="outline">
                      You don't know how to multiply, but you know how to
                      add. So you turn "<Tex math="3 \times 4" />" into{" "}
                      "<Tex math="4 + 4 + 4" />". You{" "}
                      <em>reduced</em> multiplication to addition. In
                      complexity, "<Tex math="A \leq_p B" />" means: if I
                      ever get a fast algorithm for <Tex math="B" />, I can
                      use it to get a fast algorithm for <Tex math="A" /> for
                      free.
                    </InfoBox>
                  </div>

                  <div className="space-y-3">
                    <Card className="rounded-lg border-slate-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">The hierarchy</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <InfoBox variant="formula">
                          <Tex
                            display
                            math="\text{P} \subseteq \text{NP} \subseteq \text{PSPACE} \subseteq \text{EXP}"
                          />
                        </InfoBox>
                        <div className="mt-3 space-y-2 text-sm text-slate-700">
                          <div>
                            <span className="font-semibold">Known strict:</span>{" "}
                            <Tex math="\text{P} \subsetneq \text{EXP}" /> (time
                            hierarchy theorem).
                          </div>
                          <div>
                            <span className="font-semibold">Known strict:</span>{" "}
                            <Tex math="\text{NL} \subsetneq \text{PSPACE}" />{" "}
                            (space hierarchy theorem).
                          </div>
                          <div>
                            <span className="font-semibold">Wide open:</span>{" "}
                            <Tex math="\text{P} \stackrel{?}{=} \text{NP}" />,{" "}
                            <Tex math="\text{NP} \stackrel{?}{=} \text{PSPACE}" />.
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <InfoBox variant="warning">
                      Genuinely shocking when first internalized: every other
                      strict containment between standard classes you've seen
                      drawn in a textbook is a <em>conjecture</em>. We cannot
                      prove <Tex math="\text{P} \neq \text{PSPACE}" />, even
                      though the latter contains generalized chess.
                    </InfoBox>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle className="text-2xl">
                    What's actually in each class
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <InfoBox title="P — solvable fast" variant="muted">
                    <p className="text-sm">
                      Sorting, shortest paths, max flow, linear programming
                      (Khachiyan, 1979 — a famous result that surprised
                      everyone), primality testing (AKS, 2002).
                    </p>
                  </InfoBox>
                  <InfoBox title="NP — checkable fast" variant="muted">
                    <p className="text-sm">
                      SAT, 3-coloring, Hamiltonian cycle, subset sum,
                      integer factoring (in NP ∩ coNP, but not known to be
                      NP-complete — and probably isn't, or RSA is doomed for
                      a different reason).
                    </p>
                  </InfoBox>
                  <InfoBox title="PSPACE — polynomial memory" variant="muted">
                    <p className="text-sm">
                      <span className="font-semibold">TQBF</span> (true
                      quantified Boolean formulas, the canonical
                      PSPACE-complete problem); generalized chess, Go, and
                      checkers; many two-player games.
                    </p>
                  </InfoBox>
                  <InfoBox title="EXP — exponential time" variant="muted">
                    <p className="text-sm">
                      Generalized versions of NP problems where the
                      certificate itself can be exponential, plus problems
                      provably outside P by the time hierarchy theorem.
                    </p>
                  </InfoBox>
                </CardContent>
              </Card>

              <Card className="rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle className="text-2xl">
                    Two surprises worth knowing
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700 leading-relaxed">
                  <InfoBox title="Savitch's theorem (1970)" variant="success">
                    <p>
                      For space, non-determinism only buys you a quadratic
                      speedup:
                    </p>
                    <div className="mt-2">
                      <Tex
                        display
                        math="\text{NSPACE}(s(n)) \subseteq \text{DSPACE}(s(n)^2)"
                      />
                    </div>
                    <p className="mt-2">
                      Consequence:{" "}
                      <Tex math="\text{NPSPACE} = \text{PSPACE}" />. So the
                      P vs NP question{" "}
                      <em>has been settled for space</em> — it's just an
                      equality. Why time should be different is part of why
                      P vs NP is so hard: there's no analogous time-based
                      Savitch.
                    </p>
                  </InfoBox>

                  <InfoBox title="The polynomial hierarchy (PH)" variant="muted">
                    <p>
                      NP and coNP are the first two levels of an infinite
                      tower:
                    </p>
                    <div className="mt-2">
                      <Tex
                        display
                        math="\text{P} \subseteq \text{NP} \subseteq \Sigma_2^p \subseteq \Sigma_3^p \subseteq \cdots \subseteq \text{PH} \subseteq \text{PSPACE}"
                      />
                    </div>
                    <p className="mt-2">
                      Each level adds one alternation of "<Tex math="\exists" /> /
                      <Tex math="\forall" />" quantifiers. The whole hierarchy
                      is widely believed strict, none of which is proven. If
                      P = NP, the entire hierarchy collapses to P.
                    </p>
                  </InfoBox>

                  <InfoBox title="Randomized classes (BPP, RP, ZPP)" variant="muted">
                    <p>
                      Algorithms allowed coin flips. Many natural problems
                      had only randomized polynomial-time algorithms for
                      decades — primality being the classic example before
                      AKS. The modern conjecture is{" "}
                      <Tex math="\text{P} = \text{BPP}" />: randomness adds
                      no power for decision problems. We can't prove this
                      either, but the evidence (derandomization theorems by
                      Impagliazzo–Wigderson) is strong.
                    </p>
                  </InfoBox>
                </CardContent>
              </Card>
            </StepContent>
          )}

          {/* ─────────────────── Step 5: The three barriers ─────────────────── */}
          {step === 5 && (
            <StepContent className="space-y-4">
              <Card className="rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <Lock className="h-6 w-6" /> Why P vs NP is hard: the three barriers
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700 leading-relaxed">
                  <p>
                    This is the part most undergraduate courses skip — and
                    it's the part that <em>explains why no one has solved it</em>.
                    Each barrier is a meta-theorem of the form: "any proof
                    technique with property X cannot resolve P vs NP."
                  </p>

                  <div className="grid gap-4 md:grid-cols-3">
                    <Card className="rounded-lg border-slate-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">
                          1. Relativization
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm space-y-2">
                        <div className="text-xs text-slate-500">
                          Baker–Gill–Solovay, 1975
                        </div>
                        <p>
                          There exist oracles <Tex math="A, B" /> with{" "}
                          <Tex math="\text{P}^A = \text{NP}^A" /> and{" "}
                          <Tex math="\text{P}^B \neq \text{NP}^B" />.
                        </p>
                        <p>
                          <span className="font-semibold">Implication:</span>{" "}
                          any proof that works "the same way" with arbitrary
                          oracles cannot resolve P vs NP. This kills nearly
                          all diagonalization-style approaches.
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="rounded-lg border-slate-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">2. Natural proofs</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm space-y-2">
                        <div className="text-xs text-slate-500">
                          Razborov–Rudich, 1997
                        </div>
                        <p>
                          Most circuit lower bounds proceed by exhibiting a
                          "natural" property hard functions have and easy ones
                          don't.
                        </p>
                        <p>
                          <span className="font-semibold">Implication:</span>{" "}
                          if such a natural proof separates P from NP, then
                          strong pseudorandom functions don't exist — which
                          would break essentially all of modern cryptography.
                          Either crypto is broken, or natural proofs can't
                          get there.
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="rounded-lg border-slate-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">3. Algebrization</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm space-y-2">
                        <div className="text-xs text-slate-500">
                          Aaronson–Wigderson, 2008
                        </div>
                        <p>
                          A modern barrier covering proof techniques that
                          combine relativization with algebraic methods (used
                          in <Tex math="\text{IP} = \text{PSPACE}" />).
                        </p>
                        <p>
                          <span className="font-semibold">Implication:</span>{" "}
                          even the strongest known non-relativizing techniques
                          aren't strong enough.
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <InfoBox variant="dark">
                    Separating P from NP requires a proof technique that is
                    simultaneously{" "}
                    <span className="font-semibold">non-relativizing</span>,{" "}
                    <span className="font-semibold">non-natural</span>, and{" "}
                    <span className="font-semibold">non-algebrizing</span>. We
                    don't have many of those. Whoever cracks this is inventing
                    a new proof technique, not just applying old ones harder.
                  </InfoBox>

                  <Card className="rounded-lg border-slate-200 mt-4">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">
                        We have broken some barriers — just not enough
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <p>
                        It would be misleading to suggest no progress has
                        been made. The most celebrated breakthrough is{" "}
                        <span className="font-semibold">
                          IP = PSPACE
                        </span>{" "}
                        (Shamir, 1990), proving that interactive proof
                        systems with polynomial-time verifiers can decide
                        every problem in PSPACE.
                      </p>
                      <p>
                        Why this matters: <em>IP = PSPACE does not
                        relativize</em>. There exist oracles relative to
                        which the equality fails. So Shamir's proof — using
                        the technique of <em>arithmetization</em>, lifting
                        Boolean formulas into low-degree polynomials over a
                        finite field — was the first major non-relativizing
                        result.
                      </p>
                      <p>
                        Then Aaronson–Wigderson (2008) showed even that
                        technique <em>algebrizes</em>, which means it still
                        won't suffice for P vs NP. The frontier moves; the
                        target stays out of reach.
                      </p>
                      <InfoBox variant="formula">
                        <p className="text-xs">
                          <span className="font-semibold">The chain so far:</span>{" "}
                          diagonalization → relativization barrier (1975) →
                          arithmetization breaks relativization (1990) →
                          algebrization barrier (2008) → ???
                        </p>
                      </InfoBox>
                    </CardContent>
                  </Card>

                  <InfoBox title="What might work?" variant="outline">
                    <p>
                      Current candidate techniques include{" "}
                      <span className="font-semibold">
                        geometric complexity theory
                      </span>{" "}
                      (Mulmuley, ongoing) — using representation theory and
                      algebraic geometry to attack lower bounds — and{" "}
                      <span className="font-semibold">
                        proof complexity
                      </span>{" "}
                      lower bounds for resolution and stronger systems.
                      Both are deep, partially blocked themselves, and
                      neither has produced a separation. The honest answer
                      to "what would a P ≠ NP proof look like?" is: we
                      don't know, and that's the problem.
                    </p>
                  </InfoBox>
                </CardContent>
              </Card>
            </StepContent>
          )}

          {/* ─────────────────── Step 6: Modern currents ─────────────────── */}
          {step === 6 && (
            <StepContent className="space-y-4">
              <Card className="rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle className="text-2xl">
                    Modern currents
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <InfoBox title="PCP theorem (1992)" variant="muted">
                    Arora, Lund, Motwani, Sudan, Szegedy (building on
                    Babai–Fortnow–Lund–Szegedy): every NP proof can be
                    rewritten so that a verifier reads only{" "}
                    <span className="font-semibold">3 random bits</span> of
                    it and rejects bad proofs with constant probability.
                    Foundation of <em>hardness of approximation</em>.
                  </InfoBox>
                  <InfoBox title="AKS primality (2002)" variant="muted">
                    Agrawal, Kayal & Saxena prove{" "}
                    <Tex math="\text{PRIMES} \in \text{P}" />. A clean,
                    self-contained, polynomial-time primality test, by an
                    undergrad and his advisors at IIT Kanpur. Rare clean
                    post-1980 result you can teach in full.
                  </InfoBox>
                  <InfoBox title="Fine-grained complexity (2010s)" variant="muted">
                    "P vs NP for polynomial problems." Assuming the Strong
                    Exponential Time Hypothesis (SETH), edit distance probably
                    cannot be computed in <Tex math="O(n^{2-\varepsilon})" />.
                    Tight lower bounds for everyday algorithms.
                  </InfoBox>
                  <InfoBox title="Quantum complexity" variant="muted">
                    The class <span className="font-semibold">BQP</span>{" "}
                    captures problems efficiently solvable on a quantum
                    computer. Shor puts factoring in BQP, but factoring is
                    probably not NP-complete — so{" "}
                    <Tex math="\text{BQP} \subseteq \text{NP}" /> is open.
                  </InfoBox>
                </CardContent>
              </Card>

              <Card className="rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle className="text-2xl">
                    PCP, in slightly more detail
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-slate-700 leading-relaxed">
                  <p>
                    The PCP theorem is genuinely magical and worth a moment.
                    The full statement:
                  </p>
                  <InfoBox variant="formula">
                    <Tex
                      display
                      math="\text{NP} = \text{PCP}(O(\log n),\, O(1))"
                    />
                  </InfoBox>
                  <p>
                    Read: every NP problem has a "probabilistically checkable
                    proof" where the verifier uses{" "}
                    <Tex math="O(\log n)" /> random bits and reads only{" "}
                    <span className="font-semibold">
                      a constant number of bits
                    </span>{" "}
                    of the proof — yet still detects bad proofs with
                    probability ≥ 1/2.
                  </p>
                  <InfoBox title="Why it matters" variant="muted">
                    PCP is the foundation of{" "}
                    <span className="font-semibold">
                      hardness of approximation
                    </span>
                    . For example: assuming P ≠ NP, no polynomial-time
                    algorithm can approximate MAX-3SAT to better than
                    7/8 +{" "}
                    <Tex math="\varepsilon" /> (Håstad, 2001). These tight
                    inapproximability results all chain back to PCP.
                  </InfoBox>
                </CardContent>
              </Card>

              <Card className="rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle className="text-2xl">
                    Fine-grained complexity, concretely
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-slate-700 leading-relaxed">
                  <p>
                    Some everyday algorithms have stood for decades — edit
                    distance at <Tex math="O(n^2)" />, all-pairs shortest
                    paths at <Tex math="O(n^3)" />. Could there be faster
                    algorithms?
                  </p>
                  <p>
                    Fine-grained complexity (Vassilevska Williams and others,
                    2010s) builds a hardness theory{" "}
                    <em>inside P</em>: it shows that conditional on
                    plausible hypotheses, these bounds are essentially tight.
                  </p>
                  <div className="grid gap-3 md:grid-cols-3">
                    <InfoBox title="SETH" variant="muted">
                      <p className="text-xs">
                        <span className="font-semibold">
                          Strong Exponential Time Hypothesis
                        </span>{" "}
                        — for every <Tex math="\varepsilon > 0" />, there is{" "}
                        <Tex math="k" /> such that <Tex math="k" />-SAT
                        cannot be solved in{" "}
                        <Tex math="O(2^{(1-\varepsilon)n})" />. A
                        strengthening of P ≠ NP.
                      </p>
                    </InfoBox>
                    <InfoBox title="Edit distance" variant="muted">
                      <p className="text-xs">
                        Backurs & Indyk (2015): under SETH, edit distance
                        cannot be computed in{" "}
                        <Tex math="O(n^{2-\varepsilon})" />. The classical{" "}
                        <Tex math="O(n^2)" /> dynamic program is essentially
                        optimal.
                      </p>
                    </InfoBox>
                    <InfoBox title="3SUM" variant="muted">
                      <p className="text-xs">
                        Conjectured to require{" "}
                        <Tex math="\Omega(n^{2-o(1)})" /> time, with a deep
                        web of reductions to/from problems in computational
                        geometry.
                      </p>
                    </InfoBox>
                  </div>
                  <InfoBox variant="success">
                    Fine-grained complexity makes the dream of a "field
                    guide to which speedups are possible" concrete. It's
                    where complexity theory meets day-to-day algorithm
                    engineering most directly.
                  </InfoBox>
                </CardContent>
              </Card>

              <Card className="rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle className="text-2xl">The cultural side</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-slate-700 leading-relaxed">
                  <p>
                    P vs NP has its own subculture of failed proofs. Gerhard
                    Woeginger has maintained a public list of attempts —
                    by 2016 it had over 100 entries, roughly 60% claiming
                    P = NP and 40% claiming P ≠ NP.
                  </p>
                  <p>
                    The most famous recent attempt was Vinay Deolalikar's
                    2010 paper claiming P ≠ NP, which was taken seriously
                    enough that Terence Tao, Scott Aaronson, and others spent
                    a frenetic week dissecting it on blogs and a wiki before
                    consensus emerged that the proof had unfixable gaps.
                    Aaronson had pre-committed{" "}
                    <span className="font-semibold">$200,000 of his own
                    money</span> to a P ≠ NP proof; he was that confident it
                    wouldn't hold up.
                  </p>
                  <InfoBox variant="success">
                    This is what a living open problem looks like. The Clay
                    Institute's $1M prize is real but not the point — the
                    point is that an entire field has been organized around
                    a question we cannot answer.
                  </InfoBox>
                </CardContent>
              </Card>
            </StepContent>
          )}

          {/* ─────────────────── Step 7: Recap & deeper ─────────────────── */}
          {step === 7 && (
            <StepContent className="space-y-4">
              <Card className="rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle className="text-2xl">
                    The arc, one more time
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-slate-700 leading-relaxed">
                  <p>
                    Now that you've walked through the ideas, the timeline
                    reads differently. Each emerald dot is a moment a working
                    CS student can name <em>and</em> say something true
                    about. That's the bar.
                  </p>
                  <ComplexityTimeline />
                  <InfoBox title="What you should now be able to say" variant="muted">
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li>
                        Why "polynomial time" is the right definition of
                        tractable, and what would have to go wrong for it not
                        to be.
                      </li>
                      <li>
                        What Cook–Levin actually proves, in one sentence —
                        and why every other NP-completeness reduction chains
                        back to it.
                      </li>
                      <li>
                        Why P vs NP is hard: relativization, natural proofs,
                        algebrization. A new technique is needed.
                      </li>
                      <li>
                        Why we know <Tex math="\text{P} \subsetneq \text{EXP}" />{" "}
                        unconditionally but not{" "}
                        <Tex math="\text{P} \neq \text{NP}" />.
                      </li>
                    </ul>
                  </InfoBox>
                </CardContent>
              </Card>

              <Card className="rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle className="text-2xl">Quick check</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <QuizCard
                    question="Why is the Cook–Levin theorem the most important reduction in CS?"
                    options={[
                      "It proves that SAT is solvable in polynomial time.",
                      "It shows SAT is at least as hard as every problem in NP, giving a universal hardness anchor.",
                      "It proves P ≠ NP via diagonalization.",
                      "It establishes that every NP problem is equivalent to graph coloring.",
                    ]}
                    correctIndex={1}
                    explanation="Cook–Levin shows that any non-deterministic poly-time computation can be encoded as a SAT instance. So a fast algorithm for SAT would yield fast algorithms for all of NP — and conversely, a hardness reduction from SAT gives hardness for free. SAT becomes the universal anchor every NP-completeness proof chains back to."
                  />
                  <QuizCard
                    question="The 'natural proofs' barrier says…"
                    options={[
                      "Most known proof techniques fail to even formalize P vs NP.",
                      "Natural-style circuit lower-bound proofs can't separate P from NP without breaking pseudorandom functions (and thus most cryptography).",
                      "Any proof that uses oracles cannot separate P from NP.",
                      "Diagonalization is fundamentally insufficient for any complexity-class separation.",
                    ]}
                    correctIndex={1}
                    explanation="Razborov–Rudich (1997): a 'natural' proof exhibits an efficiently computable property that hard functions have and easy ones don't. They proved that if such a natural proof separates P from NP, strong pseudorandom function families cannot exist — which would break essentially all of modern cryptography. So either crypto is broken, or natural proofs can't get there."
                  />
                  <QuizCard
                    question="How many unconditional strict separations between standard time/space complexity classes are currently known?"
                    options={[
                      "Zero — every separation is conditional on P ≠ NP.",
                      "Two — both come from hierarchy theorems (time and space).",
                      "Around a dozen, including P ≠ NP under standard assumptions.",
                      "Infinitely many — the polynomial hierarchy is provably strict.",
                    ]}
                    correctIndex={1}
                    explanation="We unconditionally know P ⊊ EXP (time hierarchy theorem) and NL ⊊ PSPACE (space hierarchy theorem). Almost every other strict containment you see in textbooks — including P ≠ NP, NP ≠ PSPACE, and the polynomial hierarchy being strict — is a conjecture."
                  />
                  <QuizCard
                    question="Edmonds (1965) argued polynomial time is the right definition of 'tractable' because…"
                    options={[
                      "Polynomial functions are smooth and differentiable.",
                      "Polynomial-time algorithms compose, the class is robust to changes in the model of computation, and it matches practical experience of which algorithms scale.",
                      "Anything not in polynomial time is undecidable.",
                      "Polynomial time was the only class Turing machines could decide.",
                    ]}
                    correctIndex={1}
                    explanation="Edmonds' 'good algorithm' thesis rests on three properties: composition (poly ∘ poly = poly), robustness (Turing machines, RAM, etc. agree on which problems are in P up to polynomial overhead), and empirical fit (problems known to be in P generally are tractable in practice). It's not a theorem — it's a definition, justified by these three properties."
                  />
                </CardContent>
              </Card>

              <Card className="rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <BookOpen className="h-6 w-6" /> Going deeper
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-slate-700">
                  <p className="leading-relaxed">
                    Roughly increasing depth, all worth your time:
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li>
                      <a
                        href="https://jeffe.cs.illinois.edu/teaching/algorithms/"
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-slate-900 underline decoration-slate-300 hover:decoration-slate-700"
                      >
                        Jeff Erickson, <em>Algorithms</em>
                      </a>{" "}
                      — free, CC-licensed, the best modern intro. Read the
                      NP-hardness chapters.
                    </li>
                    <li>
                      <a
                        href="https://math.mit.edu/~sipser/book.html"
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-slate-900 underline decoration-slate-300 hover:decoration-slate-700"
                      >
                        Michael Sipser, <em>Introduction to the Theory of Computation</em>
                      </a>{" "}
                      — the canonical undergraduate textbook. Beautifully
                      written.
                    </li>
                    <li>
                      <a
                        href="https://theory.cs.princeton.edu/complexity/"
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-slate-900 underline decoration-slate-300 hover:decoration-slate-700"
                      >
                        Arora & Barak, <em>Computational Complexity: A Modern Approach</em>
                      </a>{" "}
                      — the modern complexity bible. Free draft online.
                    </li>
                    <li>
                      <a
                        href="https://complexityzoo.net/Complexity_Zoo"
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-slate-900 underline decoration-slate-300 hover:decoration-slate-700"
                      >
                        The Complexity Zoo
                      </a>{" "}
                      — Aaronson's catalog of 500+ complexity classes.
                    </li>
                    <li>
                      <a
                        href="https://blog.computationalcomplexity.org/"
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-slate-900 underline decoration-slate-300 hover:decoration-slate-700"
                      >
                        Computational Complexity blog
                      </a>{" "}
                      (Fortnow & Gasarch) and{" "}
                      <a
                        href="https://scottaaronson.blog/"
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-slate-900 underline decoration-slate-300 hover:decoration-slate-700"
                      >
                        Shtetl-Optimized
                      </a>{" "}
                      (Aaronson) — the field as a living conversation.
                    </li>
                  </ul>
                  <InfoBox variant="dark">
                    If you ever feel like you've understood it: Gödel asked
                    the question in 1956. We're still trying to answer it.
                  </InfoBox>
                </CardContent>
              </Card>
            </StepContent>
          )}
        </>
      )}
    </TutorialShell>
  );
}
