import UserMarkdown from "@/components/UserMarkdown";

function sanitizeHtml(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/\shref=(["'])javascript:[\s\S]*?\1/gi, "");
}

function looksLikeHtml(value) {
  return /<\/?[a-z][\s\S]*>/i.test(String(value || ""));
}

export function getRichTextPlainText(value) {
  const content = String(value || "");
  if (typeof document === "undefined") {
    return content.replace(/<[^>]*>/g, "").trim();
  }
  const element = document.createElement("div");
  element.innerHTML = sanitizeHtml(content);
  return element.textContent.trim();
}

function handleRichTextClick(event) {
  const spoiler = event.target.closest?.(".rt-spoiler");
  if (!spoiler) return;
  spoiler.classList.toggle("is-revealed");
}

export default function RichTextContent({ children, className = "", inline = false, style }) {
  const content = String(children || "");
  if (!content.trim()) return null;

  if (!looksLikeHtml(content)) {
    return (
      <UserMarkdown className={className} inline={inline} style={style}>
        {content}
      </UserMarkdown>
    );
  }

  const Component = inline ? "span" : "div";
  return (
    <Component
      className={`rich-text-content ${className}`}
      style={style}
      onClick={handleRichTextClick}
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }}
    />
  );
}
