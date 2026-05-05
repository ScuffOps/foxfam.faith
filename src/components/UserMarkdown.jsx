import ReactMarkdown from "react-markdown";

const blockComponents = {
  a: ({ ...props }) => (
    <a {...props} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:text-primary/80" />
  ),
  p: ({ ...props }) => <p {...props} className="mb-2 last:mb-0" />,
  ul: ({ ...props }) => <ul {...props} className="mb-2 ml-4 list-disc space-y-1 last:mb-0" />,
  ol: ({ ...props }) => <ol {...props} className="mb-2 ml-4 list-decimal space-y-1 last:mb-0" />,
  blockquote: ({ ...props }) => <blockquote {...props} className="border-l-2 border-primary/40 pl-3 italic text-muted-foreground" />,
  code: ({ ...props }) => <code {...props} className="rounded bg-secondary px-1 py-0.5 text-[0.9em] text-foreground" />,
};

const inlineComponents = {
  ...blockComponents,
  p: ({ ...props }) => <span {...props} />,
  ul: ({ ...props }) => <span {...props} />,
  ol: ({ ...props }) => <span {...props} />,
  li: ({ ...props }) => <span {...props} />,
  blockquote: ({ ...props }) => <span {...props} />,
};

export default function UserMarkdown({ children, className = "", inline = false, style }) {
  const content = String(children || "");
  if (!content.trim()) return null;

  if (inline) {
    return (
      <span className={className} style={style}>
        <ReactMarkdown components={inlineComponents}>
          {content}
        </ReactMarkdown>
      </span>
    );
  }

  return (
    <div className={className} style={style}>
      <ReactMarkdown components={blockComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
