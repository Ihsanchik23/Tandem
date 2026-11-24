"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { pluralRu, t } from "@/lib/i18n";
import { Avatar } from "@/components/profile/Avatar";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { SearchIcon } from "@/components/nav/icons";
import { runSearch, type CompanyRow, type PersonRow, type SearchResult, type Tab } from "./search";

const DEBOUNCE_MS = 300;

type State = { key: string; result: SearchResult | null; error: boolean };

// Каталог «Компании / Люди» (ТЗ, раздел 8). Вкладка, запрос и город хранятся в адресе страницы.
export function Catalog() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [tab, setTab] = useState<Tab>(params.get("tab") === "people" ? "people" : "companies");
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [city, setCity] = useState(params.get("city") ?? "");
  // Значения, по которым реально ищем (через 300 мс после ввода).
  const [applied, setApplied] = useState({ query, city });

  const key = `${tab}|${applied.query.trim()}|${applied.city.trim()}`;
  const [state, setState] = useState<State>({ key: "", result: null, error: false });
  const [loadingMore, setLoadingMore] = useState(false);
  const latestKey = useRef(key);

  // Задержка ввода и запись в адрес.
  useEffect(() => {
    const id = setTimeout(() => {
      setApplied({ query, city });
      const next = new URLSearchParams();
      if (tab === "people") next.set("tab", "people");
      if (query.trim()) next.set("q", query.trim());
      if (city.trim()) next.set("city", city.trim());
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [tab, query, city, pathname, router]);

  // Первая страница результатов.
  useEffect(() => {
    latestKey.current = key;
    let cancelled = false;
    runSearch(tab, applied.query, applied.city, 0).then(
      (result) => !cancelled && setState({ key, result, error: false }),
      () => !cancelled && setState({ key, result: null, error: true }),
    );
    return () => {
      cancelled = true;
    };
  }, [key, tab, applied.query, applied.city]);

  async function loadMore() {
    if (!state.result || loadingMore) return;
    const startKey = key;
    setLoadingMore(true);
    try {
      const more = await runSearch(tab, applied.query, applied.city, state.result.items.length);
      if (latestKey.current !== startKey) return;
      setState((s) =>
        s.result && s.result.tab === more.tab
          ? {
              ...s,
              result: { ...more, items: [...s.result.items, ...more.items] } as SearchResult,
            }
          : s,
      );
    } catch {
      setState((s) => ({ ...s, error: true }));
    } finally {
      setLoadingMore(false);
    }
  }

  const loading = state.key !== key;
  const c = t.catalog;
  const result = loading ? null : state.result;

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label={c.tabsLabel} className="grid grid-cols-2 rounded-xl bg-neutral-100 p-1">
        {(["companies", "people"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={`h-10 rounded-lg text-base font-medium transition-colors ${
              tab === value ? "bg-white text-ink shadow-sm" : "text-neutral-600"
            }`}
          >
            {value === "people" ? c.people : c.companies}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <label className="relative block">
          <span className="sr-only">{tab === "people" ? c.peoplePlaceholder : c.companiesPlaceholder}</span>
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400" />
          <input
            type="search"
            enterKeyHint="search"
            autoCapitalize="none"
            autoCorrect="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tab === "people" ? c.peoplePlaceholder : c.companiesPlaceholder}
            className="h-12 w-full rounded-xl border border-neutral-300 bg-white pl-11 pr-4 text-base text-ink placeholder:text-neutral-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </label>
        <label className="flex items-center gap-2">
          <span className="w-14 shrink-0 text-sm font-medium text-neutral-700">{c.city}</span>
          <input
            type="text"
            autoComplete="address-level2"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder={c.cityPlaceholder}
            className="h-10 w-full rounded-xl border border-neutral-300 bg-white px-3 text-base text-ink placeholder:text-neutral-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </label>
      </div>

      {state.error && !loading ? <FormMessage kind="error">{t.errors.searchFailed}</FormMessage> : null}

      {loading ? (
        <ListSkeleton />
      ) : result && result.items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-neutral-300 px-6 py-10 text-center text-base text-neutral-600">
          {result.tab === "people" ? c.emptyPeople : c.emptyCompanies}
        </p>
      ) : result ? (
        <ul className="flex flex-col divide-y divide-neutral-100">
          {result.tab === "people"
            ? result.items.map((p) => <PersonItem key={p.id} p={p} />)
            : result.items.map((o) => <CompanyItem key={o.id} o={o} />)}
        </ul>
      ) : null}

      {result?.hasMore ? (
        <Button type="button" variant="secondary" onClick={loadMore} pending={loadingMore} pendingText={c.loading}>
          {c.loadMore}
        </Button>
      ) : null}
    </div>
  );
}

function PersonItem({ p }: { p: PersonRow }) {
  const name = `${p.first_name} ${p.last_name}`.trim();
  const work = [p.organization_name, p.position].filter(Boolean).join(" · ");
  return (
    <li>
      <Link href={`/@${p.username}`} className="flex items-center gap-3 py-3 hover:bg-neutral-50">
        <Avatar url={p.avatar_url} name={name} size={48} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-medium text-ink">{name || `@${p.username}`}</p>
          <p className="truncate text-sm text-neutral-500">@{p.username}</p>
          {work ? <p className="truncate text-sm text-neutral-600">{work}</p> : null}
        </div>
      </Link>
    </li>
  );
}

// Строка компании пока не нажимается: профиль компании появится в день 3.
function CompanyItem({ o }: { o: CompanyRow }) {
  const members = Number(o.members_count ?? 0);
  const meta = [o.city, `${members} ${pluralRu(members, t.catalog.members)}`].filter(Boolean).join(" · ");
  return (
    <li>
      <Link href={`/c/${o.slug}`} className="flex items-center gap-3 py-3">
        <Avatar url={o.logo_url} name={o.name} size={48} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-medium text-ink">{o.name}</span>
          <span className="block truncate text-sm text-neutral-600">{meta}</span>
        </span>
      </Link>
    </li>
  );
}

function ListSkeleton() {
  return (
    <ul aria-hidden className="flex flex-col gap-4 py-3">
      {[0, 1, 2, 3].map((i) => (
        <li key={i} className="flex items-center gap-3">
          <span className="h-12 w-12 rounded-full bg-neutral-100" />
          <span className="flex flex-1 flex-col gap-2">
            <span className="h-4 w-2/3 rounded bg-neutral-100" />
            <span className="h-3 w-1/3 rounded bg-neutral-100" />
          </span>
        </li>
      ))}
    </ul>
  );
}
