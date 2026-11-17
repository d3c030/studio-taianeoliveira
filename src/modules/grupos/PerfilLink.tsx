import { normUser, urlPerfilInstagram } from "./lib";

export function PerfilLink({ username }: { username: string }) {
  return (
    <a
      href={urlPerfilInstagram(username)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-11 max-w-full items-center break-all align-middle text-inherit hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-ring"
      onClick={(event) => event.stopPropagation()}
    >
      @{normUser(username)}
    </a>
  );
}