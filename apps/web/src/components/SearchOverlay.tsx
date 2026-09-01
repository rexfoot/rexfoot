"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Search, X, Loader2, Newspaper, PlayCircle, Trophy } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { TeamCrest } from "@/components/TeamCrest";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { cn } from "@/lib/cn";

interface SearchResults {
  articles: { id: string; slug: string; title: string; coverImageUrl: string | null }[];
  videos: { id: string; slug: string; title: string; thumbnailUrl: string | null }[];
  teams: { id: string; slug: string; name: string; crestUrl: string | null }[];
  players: { id: string; slug: string; displayName: string; photoUrl: string | null }[];
  competitions: { id: string; slug: string; name: string; logoUrl: string | null }[];
}

const EMPTY_RESULTS: SearchResults = { articles: [], videos: [], teams: [], players: [], competitions: [] };

/** Icône de recherche + overlay modal — instantané pendant la saisie (section 22 du plan). */
export function SearchOverlay({ className }: { className?: string }) {
  const t = useTranslations("search");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function close() {
    setOpen(false);
    setQuery("");
    setResults(EMPTY_RESULTS);
  }

  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => inputRef.current?.focus(), 0);
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    window.addEventListener("keydown", handleKey);
    return () => {
      clearTimeout(id);
      window.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  useEffect(() => {
    const id = setTimeout(() => {
      if (query.trim().length < 2) {
        setResults(EMPTY_RESULTS);
        setLoading(false);
        return;
      }
      setLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(query)}`)
        .then((res) => res.json())
        .then((data: SearchResults) => setResults(data))
        .catch(() => setResults(EMPTY_RESULTS))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(id);
  }, [query]);

  const hasQuery = query.trim().length >= 2;
  const totalResults =
    results.articles.length + results.videos.length + results.teams.length + results.players.length + results.competitions.length;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={t("open")}
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rf-bg-card text-rf-fg-muted transition-colors hover:text-rf-fg",
          className,
        )}
      >
        <Search size={19} />
        <span className="sr-only">{t("open")}</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 px-4 pt-20 backdrop-blur-sm" onClick={close}>
          <div
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-lg rounded-2xl border border-rf-border bg-rf-bg-card shadow-2xl"
          >
            <div className="flex items-center gap-3 border-b border-rf-border px-4 py-3">
              <Search size={18} className="shrink-0 text-rf-fg-subtle" />
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("placeholder")}
                className="min-w-0 flex-1 bg-transparent text-sm text-rf-fg placeholder:text-rf-fg-subtle focus:outline-none"
              />
              {loading && <Loader2 size={16} className="shrink-0 animate-spin text-rf-fg-subtle" />}
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="shrink-0 rounded p-1 text-rf-fg-subtle transition-colors hover:text-rf-fg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[60vh] space-y-4 overflow-y-auto p-3">
              {!hasQuery && <p className="px-2 py-4 text-center text-sm text-rf-fg-subtle">{t("minChars")}</p>}

              {hasQuery && !loading && totalResults === 0 && (
                <p className="px-2 py-4 text-center text-sm text-rf-fg-subtle">{t("noResults", { query })}</p>
              )}

              {results.teams.length > 0 && (
                <ResultGroup title={t("teams")}>
                  {results.teams.map((team) => (
                    <ResultRow key={team.id} href={`/teams/${team.slug}`} onNavigate={close}>
                      <TeamCrest crestUrl={team.crestUrl} teamName={team.name} size="sm" />
                      {team.name}
                    </ResultRow>
                  ))}
                </ResultGroup>
              )}

              {results.players.length > 0 && (
                <ResultGroup title={t("players")}>
                  {results.players.map((player) => (
                    <ResultRow key={player.id} href={`/players/${player.slug}`} onNavigate={close}>
                      <PlayerAvatar photoUrl={player.photoUrl} displayName={player.displayName} size="sm" />
                      {player.displayName}
                    </ResultRow>
                  ))}
                </ResultGroup>
              )}

              {results.competitions.length > 0 && (
                <ResultGroup title={t("competitions")}>
                  {results.competitions.map((competition) => (
                    <ResultRow key={competition.id} href={`/competitions/${competition.slug}`} onNavigate={close}>
                      {competition.logoUrl ? (
                        <Image
                          src={competition.logoUrl}
                          alt=""
                          width={28}
                          height={28}
                          className="h-7 w-7 shrink-0 object-contain"
                          unoptimized
                        />
                      ) : (
                        <Trophy size={18} className="shrink-0 text-rf-fg-subtle" />
                      )}
                      {competition.name}
                    </ResultRow>
                  ))}
                </ResultGroup>
              )}

              {results.articles.length > 0 && (
                <ResultGroup title={t("articles")}>
                  {results.articles.map((article) => (
                    <ResultRow key={article.id} href={`/news/${article.slug}`} onNavigate={close}>
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-rf-bg-elevated">
                        <Newspaper size={14} className="text-rf-fg-subtle" />
                      </span>
                      <span className="truncate">{article.title}</span>
                    </ResultRow>
                  ))}
                </ResultGroup>
              )}

              {results.videos.length > 0 && (
                <ResultGroup title={t("videos")}>
                  {results.videos.map((video) => (
                    <ResultRow key={video.id} href={`/video/${video.slug}`} onNavigate={close}>
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-rf-bg-elevated">
                        <PlayCircle size={14} className="text-rf-fg-subtle" />
                      </span>
                      <span className="truncate">{video.title}</span>
                    </ResultRow>
                  ))}
                </ResultGroup>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ResultGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 px-2 text-xs font-semibold tracking-wide text-rf-fg-subtle uppercase">{title}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function ResultRow({ href, onNavigate, children }: { href: string; onNavigate: () => void; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="flex items-center gap-2.5 rounded-xl px-2 py-2 text-sm font-medium text-rf-fg transition-colors hover:bg-rf-bg-elevated"
    >
      {children}
    </Link>
  );
}
