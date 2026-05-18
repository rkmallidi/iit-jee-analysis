import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, LogOut, Palette, Settings, Camera, Loader2, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth";
import { uploadUserAvatar, updateUser } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { getInitials } from "@/lib/utils";

interface HeaderProps {
  title: string;
}

// ── Self photo update dialog ───────────────────────────────────────────────────
function MyPhotoDialog({ onClose }: { onClose: () => void }) {
  const { user, setUser } = useAuthStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(user?.avatar_url ?? null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  if (!user) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum size is 5 MB.", variant: "destructive" });
      return;
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = ev => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSave = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const res = await uploadUserAvatar(user.id, selectedFile);
      setUser(res.data);
      toast({ title: "Photo updated" });
      onClose();
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    setUploading(true);
    try {
      const res = await updateUser(user.id, { clear_avatar: true });
      setUser(res.data);
      toast({ title: "Photo removed" });
      onClose();
    } catch {
      toast({ title: "Failed to remove photo", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const initials = getInitials(user.full_name);

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-primary" /> My Photo
          </DialogTitle>
          <DialogDescription>
            Update the photo shown on your account.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-5 py-2">
          {/* Preview with hover camera overlay */}
          <div className="relative group cursor-pointer" onClick={() => fileRef.current?.click()}>
            {preview ? (
              <img src={preview} alt="Preview" className="h-28 w-28 rounded-full object-cover border-2 border-border shadow" />
            ) : (
              <div className="h-28 w-28 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl border-2 border-border shadow">
                {initials}
              </div>
            )}
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Camera className="h-6 w-6 text-white" />
            </div>
            {uploading && (
              <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                <Loader2 className="h-6 w-6 text-white animate-spin" />
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-1.5 w-full">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button type="button" variant="outline" className="w-full" onClick={() => fileRef.current?.click()} disabled={uploading}>
              <Camera className="mr-2 h-4 w-4" /> Choose Photo
            </Button>
            <p className="text-[11px] text-muted-foreground">JPEG, PNG, WebP or GIF · max 5 MB</p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          {user.avatar_url && !selectedFile && (
            <Button type="button" variant="ghost" className="text-destructive hover:text-destructive mr-auto" onClick={handleRemove} disabled={uploading}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remove
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onClose} disabled={uploading}>Cancel</Button>
          <Button type="button" onClick={handleSave} disabled={!selectedFile || uploading}>
            {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Photo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Header ─────────────────────────────────────────────────────────────────────
export default function Header({ title }: HeaderProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [photoOpen, setPhotoOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const avatarSrc = user?.avatar_url ?? null;

  return (
    <>
      <header className="flex items-center justify-between px-6 py-3.5 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-30">
        <div>
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          <p className="text-xs text-muted-foreground">
            {user?.roles.map((r) => r.name).join(" · ")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-4 w-4" />
          </Button>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
                <Avatar className="h-9 w-9">
                  {avatarSrc && <AvatarImage src={avatarSrc} alt={user?.full_name} className="object-cover" />}
                  <AvatarFallback className="text-xs">
                    {user ? getInitials(user.full_name) : "??"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                {/* Mini profile at top of menu */}
                <div className="flex items-center gap-3 py-1">
                  <Avatar className="h-10 w-10 shrink-0">
                    {avatarSrc && <AvatarImage src={avatarSrc} alt={user?.full_name} className="object-cover" />}
                    <AvatarFallback className="text-sm">{user ? getInitials(user.full_name) : "??"}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold truncate">{user?.full_name}</span>
                    <span className="text-xs font-normal text-muted-foreground truncate">{user?.email ?? user?.roles.map(r => r.name).join(", ")}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setPhotoOpen(true)}>
                <Camera className="mr-2 h-4 w-4" /> Update Photo
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                <Palette className="mr-2 h-4 w-4" /> Theme Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                <Settings className="mr-2 h-4 w-4" /> Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {photoOpen && <MyPhotoDialog onClose={() => setPhotoOpen(false)} />}
    </>
  );
}
