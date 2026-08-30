import { FileInput, Layers, ListChecks, Timer, GraduationCap, Share2, LineChart } from "lucide-react";

const features = [
  {
    icon: FileInput,
    title: "Import memories",
    text: "Bring in memories from PDF or TXT files, or paste content from Google Docs and Notion.",
  },
  {
    icon: Layers,
    title: "Build reviewers",
    text: "Turn raw memories into organized reviewers with headings, tables, definitions, and callouts.",
  },
  {
    icon: ListChecks,
    title: "Generate quizzes",
    text: "Mix multiple choice, identification, matching, and short answer questions from your own material.",
  },
  {
    icon: Timer,
    title: "Exam mode",
    text: "Timed, strict, or practice exams with randomization and configurable attempt limits.",
  },
  {
    icon: GraduationCap,
    title: "Study modes",
    text: "Flashcards, mistake review, and mastery practice that focus on your weak spots.",
  },
  {
    icon: Share2,
    title: "Sharing",
    text: "Share a reviewer or quiz with another Memoria user, with view or edit permissions.",
  },
];

export function Features() {
  return (
    <section id="features" className="border-t border-line bg-surface/40 px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-xl">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">Everything you need to study smarter</h2>
          <p className="mt-3 text-ink-soft">
            One organized place for the material you already have — not another app trying to write it for you.
          </p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="card p-6 transition-shadow hover:shadow-card-hover">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft">
                <f.icon className="h-5 w-5 text-accent-dark" />
              </div>
              <h3 className="font-display text-lg text-ink">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{f.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
