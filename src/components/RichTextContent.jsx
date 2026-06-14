import UserMarkdown from "@/components/UserMarkdown";

const BLOCKED_ELEMENTS = new Set(["script", "style", "iframe", "object", "embed", "link", "meta"]);
const URL_ATTRIBUTES = new Set(["href", "src", "xlink:href", "formaction"]);

function sanitizeHtml(html) {
  const content = String(html || "");

  if (typeof document === "undefined") {
    return content
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
      .replace(/\son\w+=(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
      .replace(/\s(?:href|src|xlink:href|formaction)=(["'])\s*javascript:[\s\S]*?\1/gi, "")
      .replace(/\ssrcdoc=(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  }

  const template = document.createElement("template");
  template.innerHTML = content;

  template.content.querySelectorAll("*").forEach((element) => {
    if (BLOCKED_ELEMENTS.has(element.tagName.toLowerCase())) {
      element.remove();
      return;
    }

    [...element.attributes].forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().replace(/[\u0000-\u001F\u007F\s]+/g, "");
      if (
        name.startsWith("on") ||
        name === "srcdoc" ||
        (URL_ATTRIBUTES.has(name) && value.toLowerCase().startsWith("javascript:"))
      ) {
        element.removeAttribute(attribute.name);
      }
    });
  });

  return template.innerHTML
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+=(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
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
