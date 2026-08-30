const steps = [
  { label: "Import", text: "Upload your PDF or TXT memories into Memoria." },
  { label: "Generate a prompt", text: "Memoria writes a ready-to-use prompt from your memories." },
  { label: "Paste into Claude", text: "Take the prompt to Claude or another AI assistant you already use." },
  { label: "Import the result", text: "Bring the structured file back into Memoria and review it before saving." },
  { label: "Study", text: "Turn it into quizzes, exams, and flashcards, and track your progress." },
];

export function Workflow() {
  return (
    <section id="workflow" className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-xl">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">How the AI-assisted workflow works</h2>
          <p className="mt-3 text-ink-soft">
            Memoria never calls an AI API itself. It generates the prompt — you decide which AI assistant
            processes it, and you review everything before it&apos;s saved.
          </p>
        </div>

        <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map((step, i) => (
            <li key={step.label} className="relative rounded-card border border-line bg-surface p-5">
              <span className="font-display text-2xl text-accent-dark">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-3 font-display text-base text-ink">{step.label}</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
