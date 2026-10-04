import { useQuery } from "@tanstack/react-query";
import { signedUrl } from "../lib/api";
import { cn } from "@/lib/utils";

export function ClienteAvatar({ path, nome, className }: { path: string | null; nome: string; className?: string }) {
  const q = useQuery({
    queryKey: ["diag-signed", path],
    queryFn: () => signedUrl(path!),
    enabled: !!path,
    staleTime: 50 * 60 * 1000,
  });
  const initials = nome.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
  return (
    <div className={cn("h-12 w-12 shrink-0 overflow-hidden rounded-full bg-accent flex items-center justify-center text-sm font-semibold text-accent-foreground", className)}>
      {q.data ? <img src={q.data} alt={nome} className="h-full w-full object-cover" /> : initials || "?"}
    </div>
  );
}
