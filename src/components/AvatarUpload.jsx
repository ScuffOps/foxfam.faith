import { useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Camera } from "lucide-react";

export default function AvatarUpload({ avatarUrl, onUploaded, size = "md" }) {
  const inputRef = useRef(null);
  const dim = size === "lg" ? "h-20 w-20" : "h-12 w-12";
  const iconDim = size === "lg" ? "h-5 w-5" : "h-4 w-4";

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    // Persist to User entity so others can see it
    try {
      await base44.auth.updateMe({ avatar_url: file_url });
    } catch {}
    onUploaded(file_url);
  };

  return (
    <div className="relative inline-block">
      <div
        onClick={() => inputRef.current?.click()}
        className={`${dim} cursor-pointer overflow-hidden rounded-full border-2 border-border bg-secondary transition-opacity hover:opacity-80`}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Camera className={iconDim} />
          </div>
        )}
      </div>
      <div className="pointer-events-none absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
        <Camera className="h-2.5 w-2.5 text-primary-foreground" />
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}