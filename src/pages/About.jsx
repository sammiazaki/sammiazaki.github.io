export default function About() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">About</h1>
      <div className="mt-6 prose prose-slate">
        <p>
          I'm Sam. I write on{" "}
          <a href="https://sammiazaki.substack.com" target="_blank" rel="noopener noreferrer">
            Substack
          </a>{" "}
          and build interactive tutorials here.
        </p>
      </div>
    </div>
  );
}
