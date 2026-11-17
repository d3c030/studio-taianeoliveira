import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { descricaoAjuste, type CheckSemana } from "./lib";

export function IndicadorAjuste({ check }: { check?: CheckSemana }) {
  const descricao = descricaoAjuste(check);
  if (!descricao) return null;
  return <TooltipProvider delayDuration={200}><Tooltip><TooltipTrigger asChild>
    <span tabIndex={0} aria-label={descricao} title={descricao} className="inline-flex h-5 w-4 items-center justify-center text-sm font-bold text-primary">•</span>
  </TooltipTrigger><TooltipContent className="max-w-72">{descricao}</TooltipContent></Tooltip></TooltipProvider>;
}