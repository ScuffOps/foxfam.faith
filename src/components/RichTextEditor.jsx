import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

const modules = {
  toolbar: [
    ["bold", "italic", "underline", "strike"],
    [{ header: [2, 3, false] }],
    [{ list: "ordered" }, { list: "bullet" }],
    ["blockquote", "link"],
    ["clean"],
  ],
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
  "link",
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
