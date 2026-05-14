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
  return (
    <div className="rich-text-editor mt-1.5 overflow-hidden rounded-lg border border-border bg-secondary/60">
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
