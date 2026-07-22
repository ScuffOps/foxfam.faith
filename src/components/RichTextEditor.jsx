import { useEffect, useRef } from "react";
import ReactQuill, { Quill } from "react-quill";
import "react-quill/dist/quill.snow.css";

const Inline = Quill.import("blots/inline");

class SpoilerBlot extends Inline {
  static blotName = "spoiler";
  static tagName = "span";
  static className = "rt-spoiler";

  static formats(node) {
    return node.classList.contains("rt-spoiler");
  }
}

Quill.register(SpoilerBlot, true);

const modules = {
  toolbar: {
    container: [
      ["bold", "italic", "underline", "strike"],
      [{ header: [2, 3, false] }],
      [{ list: "ordered" }, { list: "bullet" }],
      ["blockquote", "code-block"],
      ["link", "code", "spoiler"],
      ["clean"],
    ],
    handlers: {
      spoiler() {
        const range = this.quill.getSelection();
        if (!range) return;
        const active = this.quill.getFormat(range).spoiler;
        this.quill.format("spoiler", !active);
      },
    },
  },
};

const formats = [
  "bold",
  "italic",
  "underline",
  "strike",
  "header",
  "list",
  "bullet",
  "blockquote",
  "code",
  "code-block",
  "link",
  "spoiler",
];

export default function RichTextEditor({ value, onChange, placeholder, minHeight = 150 }) {
  const editorRef = useRef(null);

  useEffect(() => {
    const toolbar = editorRef.current?.querySelector(".ql-toolbar");
    if (!toolbar) return;
    const labels = {
      ".ql-bold": "Bold",
      ".ql-italic": "Italic",
      ".ql-underline": "Underline",
      ".ql-strike": "Strikethrough",
      ".ql-blockquote": "Block quote",
      ".ql-code-block": "Code block",
      ".ql-link": "Add link",
      ".ql-code": "Inline code",
      ".ql-spoiler": "Spoiler text",
      ".ql-clean": "Clear formatting",
      ".ql-list[value='ordered']": "Numbered list",
      ".ql-list[value='bullet']": "Bulleted list",
    };
    Object.entries(labels).forEach(([selector, label]) => {
      const control = toolbar.querySelector(selector);
      if (control) {
        control.setAttribute("aria-label", label);
        control.setAttribute("title", label);
      }
    });
  }, []);

  return (
    <div ref={editorRef} className="rich-text-editor mt-1.5 overflow-hidden rounded-lg border border-border bg-secondary/60">
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        style={{ minHeight }}
      />
    </div>
  );
}
