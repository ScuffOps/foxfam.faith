import { useRef, useState } from "react";
import { communityClient } from "@/api/communityClient";
import { Camera, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { getUploadValidationError } from "@/lib/uploadSafety";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export default function AvatarUpload({ avatarUrl, onUploaded, size = "md" }) {
  const inputRef = useRef(null);
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const dim = size === "lg" ? "h-20 w-20" : "h-12 w-12";
  const iconDim = size === "lg" ? "h-5 w-5" : "h-4 w-4";

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const validationError = getUploadValidationError(file, { maxBytes: MAX_AVATAR_BYTES });
    if (validationError || !file.type.startsWith("image/")) {
      toast({ title: "Choose a safe image", description: validationError || "Profile pictures must be image files.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const { file_url } = await communityClient.integrations.Core.UploadFile({ file, folder: "avatars" });
      await communityClient.auth.updateMe({ avatar_url: file_url });
      onUploaded(file_url);
      toast({ title: "Profile picture updated" });
    } catch (error) {
      toast({ title: "Profile picture could not be saved", description: error?.message || "Try another image.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        aria-label="Change profile picture"
        className={`${dim} cursor-pointer overflow-hidden rounded-full border-2 border-border bg-secondary transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-wait`}
      >
        {uploading ? (
          <span className="flex h-full w-full items-center justify-center"><Loader2 className={`${iconDim} animate-spin`} /></span>
        ) : avatarUrl ? (
          <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Camera className={iconDim} />
          </div>
        )}
      </button>
      <div className="pointer-events-none absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
        <Camera className="h-2.5 w-2.5 text-primary-foreground" />
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}
