import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Shared renderer for both Notes and Reviewers. Deliberately does NOT use
// rehype-raw, so any raw HTML in the source is rendered as literal text
// rather than executed — this is what keeps user- and AI-provided Markdown
// safe to render without a separate sanitization pass.
export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="memora-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
