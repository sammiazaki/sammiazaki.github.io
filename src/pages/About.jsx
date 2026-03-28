export default function About() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">About</h1>
      <div className="mt-6 prose prose-slate">
        <p>
          Hi, I'm Sam. I also write personal reflections on{" "}
          <a href="https://sammiazaki.substack.com" target="_blank" rel="noopener noreferrer">
            Substack
          </a>
          — not because I have answers, but because writing helps me see my own
          questions more clearly.
        </p>
        <p>
          This site is a different kind of notebook. When I study something —
          statistics, philosophy, economics, or anything else that makes me
          curious — I find that reading alone doesn't make it stick. What works
          is playing with it: dragging a slider, watching a visualization change,
          getting a quiz wrong and then getting it right.
        </p>
        <p>
          Each tutorial here turns one idea into an interactive exploration. They
          are my study notes, rebuilt as something you can touch. Every tutorial
          links back to the original source it's based on, so you can always go
          deeper.
        </p>
      </div>
    </div>
  );
}
