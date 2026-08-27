"use client";

import { useState } from "react";
import { Copy, Check, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { FileDropzone } from "@/components/notes/file-dropzone";
import { QuestionInput } from "@/components/quizzes/question-input";
import { validateStructuredQuiz, parseAiJson, type QuizQuestion } from "@/lib/validation/quiz";
import { gradeQuiz } from "@/lib/quiz-grading";
import { exportQuizToPdf } from "@/lib/pdf-export";
import { cn } from "@/lib/utils";

const QUESTION_TYPES = [
  { value: "multiple_choice", label: "Multiple choice" },
  { value: "true_false", label: "True / False" },
  { value: "identification", label: "Identification" },
  { value: "short_answer", label: "Short answer" },
];

const PLACEHOLDER_NOTE = "[Paste your notes here before sending this prompt to the AI]";

export function GuestQuizFlow() {
  const [notesText, setNotesText] = useState("");
  const [title, setTitle] = useState("My notes");
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty, setDifficulty] = useState<"EASY" | "NORMAL" | "HARD" | "MIXED">("MIXED");
  const [questionTypes, setQuestionTypes] = useState<string[]>(["multiple_choice", "true_false"]);
  const [prompt, setPrompt] = useState("");
  const [copied, setCopied] = useState(false);
  const [pastedJson, setPastedJson] = useState("");
  const [validation, setValidation] = useState<{ valid: boolean; errors?: string[]; questions?: QuizQuestion[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // In-browser quiz-taking state (no server, no persistence)
  const [taking, setTaking] = useState(false);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [result, setResult] = useState<{ score: number; total: number; graded: Record<string, { given: unknown; correct: boolean }> } | null>(null);

  function toggleType(t: string) {
    setQuestionTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  async function handleFileUpload(file: File) {
    setUploading(true);
    setError(null);
    setNotice(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/guest/extract", { method: "POST", body: form });
      const data = await res.json().catch(() => null);
      if (!data) {
        setError("The server sent back something unexpected. Please try again.");
        setUploading(false);
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Couldn't read that file.");
        setUploading(false);
        return;
      }
      setNotesText(data.text);
      setTitle(data.title || "My notes");
      if (data.notice) setNotice(data.notice);
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    }
    setUploading(false);
  }

  async function generatePrompt() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/guest/prompts/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content: notesText.trim() || PLACEHOLDER_NOTE,
          options: { questionCount, difficulty, questionTypes },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't generate prompt.");
        setLoading(false);
        return;
      }
      setPrompt(data.text);
    } catch {
      setError("We couldn't reach the server.");
    }
    setLoading(false);
  }

  function copyPrompt() {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function handleValidate() {
    setError(null);
    try {
      const parsed = parseAiJson(pastedJson);
      const result = validateStructuredQuiz(parsed);
      if (result.success) {
        setValidation({ valid: true, questions: result.data.questions });
      } else {
        setValidation({ valid: false, errors: result.errors.map((e) => `${e.path}: ${e.message}`) });
      }
    } catch (err) {
      setValidation({ valid: false, errors: [err instanceof Error ? err.message : "Invalid JSON."] });
    }
  }

  function startQuiz() {
    setAnswers({});
    setResult(null);
    setTaking(true);
  }

  function submitQuiz() {
    if (!validation?.questions) return;
    const graded = gradeQuiz(validation.questions, answers);
    setResult({ score: graded.score, total: graded.total, graded: graded.gradedAnswers });
    setTaking(false);
  }

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <p className="mb-3 text-sm font-medium text-ink">1. Add your notes (optional but recommended)</p>
        <FileDropzone onFileSelected={handleFileUpload} accept=".md,.txt,.pdf,.docx,.json" />
        {uploading && <p className="mt-2 text-xs text-ink-soft">Reading file…</p>}
        {notice && <p className="mt-2 rounded-lg border border-accent/30 bg-accent-soft/40 p-2.5 text-xs text-accent-dark">{notice}</p>}
        <Textarea rows={6} value={notesText} onChange={(e) => setNotesText(e.target.value)} placeholder="Paste your raw notes here…" className="mt-3 font-mono text-sm" />

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="guest-qcount">Question count</Label>
            <Input id="guest-qcount" type="number" min={1} max={50} value={questionCount} onChange={(e) => setQuestionCount(Number(e.target.value))} />
          </div>
          <div>
            <Label htmlFor="guest-difficulty">Difficulty</Label>
            <select
              id="guest-difficulty"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}
              className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm"
            >
              {["EASY", "NORMAL", "HARD", "MIXED"].map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-3">
          <Label>Question types</Label>
          <div className="flex flex-wrap gap-2">
            {QUESTION_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => toggleType(t.value)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium",
                  questionTypes.includes(t.value) ? "border-accent bg-accent-soft text-accent-dark" : "border-line text-ink-soft hover:bg-ink/5"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        <Button className="mt-4" onClick={generatePrompt} loading={loading} disabled={questionTypes.length === 0}>
          Generate prompt
        </Button>
      </div>

      {prompt && (
        <div className="card p-5">
          <p className="mb-2 text-sm font-medium text-ink">2. Copy this and run it in Claude</p>
          <Textarea readOnly rows={10} value={prompt} className="font-mono text-xs" />
          <Button variant="outline" size="sm" className="mt-2" onClick={copyPrompt}>
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "Copied" : "Copy prompt"}
          </Button>

          <p className="mb-2 mt-5 text-sm font-medium text-ink">3. Paste the AI&apos;s JSON response</p>
          <Textarea
            rows={8}
            value={pastedJson}
            onChange={(e) => {
              setPastedJson(e.target.value);
              setValidation(null);
            }}
            placeholder='{"format": "memora-quiz", ...}'
            className="font-mono text-xs"
          />
          <Button variant="outline" size="sm" className="mt-2" onClick={handleValidate} disabled={!pastedJson.trim()}>
            Validate
          </Button>

          {validation && !validation.valid && (
            <div className="mt-3 rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
              <p className="font-medium">This doesn&apos;t match the expected format:</p>
              <ul className="mt-1 list-disc pl-5">{validation.errors?.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}</ul>
            </div>
          )}

          {validation?.valid && validation.questions && !taking && !result && (
            <div className="mt-4 space-y-3">
              <div className="rounded-lg border border-success/30 bg-success/5 p-3 text-sm text-success">
                {validation.questions.length} questions parsed and ready.
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={startQuiz}>Take quiz now</Button>
                <Button variant="outline" size="sm" onClick={() => exportQuizToPdf(title, validation.questions!)}>
                  <FileText className="h-3.5 w-3.5" /> Export PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const blob = new Blob([JSON.stringify({ format: "memora-quiz-v1", version: "1", title, questions: validation.questions })], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${title.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase()}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  <Download className="h-3.5 w-3.5" /> Export JSON
                </Button>
              </div>
            </div>
          )}

          {taking && validation?.questions && (
            <div className="mt-5 space-y-4">
              {validation.questions.map((q, i) => (
                <div key={q.id} className="card p-4">
                  <p className="mb-3 text-sm font-medium text-ink">{i + 1}. {q.question}</p>
                  <QuestionInput question={q} value={answers[q.id]} onChange={(v) => setAnswers((prev) => ({ ...prev, [q.id]: v }))} />
                </div>
              ))}
              <Button onClick={submitQuiz}>Submit</Button>
            </div>
          )}

          {result && validation?.questions && (
            <div className="mt-5 space-y-3">
              <div className="card p-6 text-center">
                <p className="text-xs uppercase tracking-wide text-ink-faint">Your score</p>
                <p className="mt-1 font-display text-4xl text-ink">{Math.round((result.score / Math.max(result.total, 1)) * 100)}%</p>
                <p className="mt-1 text-sm text-ink-soft">{result.score} out of {result.total} correct</p>
                <Button size="sm" variant="outline" className="mt-3" onClick={startQuiz}>Retake</Button>
              </div>
              {validation.questions.map((q, i) => {
                const graded = result.graded[q.id];
                return (
                  <div key={q.id} className="card p-4">
                    <p className="text-sm font-medium text-ink">{i + 1}. {q.question} {graded?.correct ? "✅" : "❌"}</p>
                    {q.explanation && <p className="mt-1 text-sm text-ink-soft">{q.explanation}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
