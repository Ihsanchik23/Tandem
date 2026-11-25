"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { pluralRu, t } from "@/lib/i18n";
import { Avatar } from "@/components/profile/Avatar";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { FilterIcon, SearchIcon } from "@/components/nav/icons";
import {
  runSearch,
  type CompanyRow,
  type PersonRow,
  type SearchResult,
  type StaffSize,
  type Tab,
} from "./search";

const DEBOUNCE_MS = 300;
const STAFF_SIZES: StaffSize[] = ["all", "0-10", "11-50", "51-200", "201+"];

type State = { key: string; result: SearchResult | null; error: boolean };
type Selection = { person: string | null; company: string | null };

function readStaffSize(value: string | null): StaffSize {
  return STAFF_SIZES.find((size) => size === value) ?? "all";
}

function catalogUrl(pathname: string, tab: Tab, query: string, city: string, staffSize: StaffSize, selection: Selection) {
  const next = new URLSearchParams();
  if (tab === "people") next.set("tab", "people");
  if (query.trim()) next.set("q", query.trim());
  if (city.trim()) next.set("city", city.trim());
  if (staffSize !== "all") next.set("size", staffSize);
  if (selection.person) next.set("person", selection.person);
  else if (selection.company) next.set("company", selection.company);
  const qs = next.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

// Один каталог на телефоне; на широком экране рядом остаётся открытый профиль.
export function Catalog() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [tab, setTab] = useState<Tab>(params.get("tab") === "people" ? "people" : "companies");
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [city, setCity] = useState(params.get("city") ?? "");
  const [staffSize, setStaffSize] = useState<StaffSize>(readStaffSize(params.get("size")));
  const [filterOpen, setFilterOpen] = useState(false);
  const [applied, setApplied] = useState({ query, city, staffSize });
  const [state, setState] = useState<State>({ key: "", result: null, error: false });
  const [loadingMore, setLoadingMore] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<Selection>({ person: params.get("person"), company: params.get("company") });
  const selectedPerson = params.get("person");
  const selectedCompany = params.get("company");
  const key = `${tab}|${applied.query.trim()}|${applied.city.trim()}|${applied.staffSize}`;
  const latestKey = useRef(key);

  useEffect(() => {
    selectionRef.current = { person: selectedPerson, company: selectedCompany };
  }, [selectedPerson, selectedCompany]);

  useEffect(() => {
    if (!filterOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!filterRef.current?.contains(event.target as Node)) setFilterOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFilterOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [filterOpen]);

  // Запрос, город и размер компании сохраняются в адресе после короткой задержки.
  useEffect(() => {
    const id = setTimeout(() => {
      setApplied({ query, city, staffSize });
      router.replace(catalogUrl(pathname, tab, query, city, staffSize, selectionRef.current), { scroll: false });
    }, DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [tab, query, city, staffSize, pathname, router]);

  useEffect(() => {
    latestKey.current = key;
    let cancelled = false;
    runSearch(tab, applied.query, { city: applied.city, staffSize: applied.staffSize }, 0).then(
      (result) => !cancelled && setState({ key, result, error: false }),
      () => !cancelled && setState({ key, result: null, error: true }),
    );
    return () => {
      cancelled = true;
    };
  }, [key, tab, applied.query, applied.city, applied.staffSize]);

  async function loadMore() {
    if (!state.result || loadingMore) return;
    const startKey = key;
    setLoadingMore(true);
    try {
      const more = await runSearch(tab, applied.query, { city: applied.city, staffSize: applied.staffSize }, state.result.items.length);
      if (latestKey.current !== startKey) return;
      setState((current) =>
        current.result && current.result.tab === more.tab
          ? { ...current, result: { ...more, items: [...current.result.items, ...more.items] } as SearchResult }
          : current,
      );
    } catch {
      setState((current) => ({ ...current, error: true }));
    } finally {
      setLoadingMore(false);
    }
  }

  function selectTab(value: Tab) {
    if (value === tab) return;
    selectionRef.current = { person: null, company: null };
    setTab(value);
    router.replace(catalogUrl(pathname, value, query, city, staffSize, selectionRef.current), { scroll: false });
  }

  function openPreview(event: MouseEvent<HTMLAnchorElement>, kind: "person" | "company", value: string) {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      !window.matchMedia("(min-width: 768px)").matches
    ) return;
    event.preventDefault();
    selectionRef.current = kind === "person" ? { person: value, company: null } : { person: null, company: value };
    router.push(catalogUrl(pathname, tab, query, city, staffSize, selectionRef.current), { scroll: false });
  }

  const c = t.catalog;
  const loading = state.key !== key;
  const result = loading ? null : state.result;
  const filtersActive = Boolean(city.trim()) || (tab === "companies" && staffSize !== "all");
  const sizeLabels: Record<StaffSize, string> = {
    all: c.staffAny,
    "0-10": c.staffUpTo10,
    "11-50": c.staff11To50,
    "51-200": c.staff51To200,
    "201+": c.staff201Plus,
  };

  return (
    <div className="flex min-w-0 flex-col">
      <div role="tablist" aria-label={c.tabsLabel} className="mb-5 grid grid-cols-2 border-b border-neutral-200">
        {(["companies", "people"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            aria-controls="catalog-results"
            onClick={() => selectTab(value)}
            className={`relative h-11 text-base font-semibold transition-colors ${tab === value ? "text-ink after:absolute after:inset-x-0 after:bottom-[-1px] after:h-0.5 after:bg-ink" : "text-neutral-500 hover:text-ink"}`}
          >
            {value === "people" ? c.people : c.companies}
          </button>
        ))}
      </div>

      <div className="mb-5 flex items-center gap-2">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">{tab === "people" ? c.peoplePlaceholder : c.companiesPlaceholder}</span>
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-500" />
          <input
            type="search"
            enterKeyHint="search"
            autoCapitalize="none"
            autoCorrect="off"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={c.searchPlaceholder}
            className="h-11 w-full rounded-full border-0 bg-neutral-100 pl-12 pr-4 text-base text-ink placeholder:text-neutral-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </label>
        <div ref={filterRef} className="relative shrink-0">
          <button
            type="button"
            aria-label={c.filters}
            aria-expanded={filterOpen}
            title={c.filters}
            onClick={() => setFilterOpen((open) => !open)}
            className={`relative flex h-11 w-11 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${filtersActive ? "bg-ink text-white" : "bg-neutral-100 text-ink hover:bg-neutral-200"}`}
          >
            <FilterIcon className="h-5 w-5" />
          </button>
          {filterOpen ? (
            <div role="group" aria-label={c.filters} className="absolute right-0 top-full z-30 mt-2 w-[min(90vw,320px)] rounded-2xl border border-neutral-200 bg-white p-4 shadow-xl">
              <p className="mb-4 text-base font-semibold text-ink">{c.filters}</p>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
                {c.city}
                <input
                  type="text"
                  autoComplete="address-level2"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  placeholder={c.cityPlaceholder}
                  className="h-11 rounded-xl border border-neutral-300 bg-white px-3 text-base font-normal text-ink placeholder:text-neutral-400 focus:border-accent focus:outline-none"
                />
              </label>
              {tab === "companies" ? (
                <div className="mt-5">
                  <p className="mb-2 text-sm font-medium text-ink">{c.staffSize}</p>
                  <div className="flex flex-wrap gap-2">
                    {STAFF_SIZES.map((size) => (
                      <button
                        key={size}
                        type="button"
                        aria-pressed={staffSize === size}
                        onClick={() => setStaffSize(size)}
                        className={`rounded-full px-3 py-2 text-sm transition-colors ${staffSize === size ? "bg-ink text-white" : "bg-neutral-100 text-ink hover:bg-neutral-200"}`}
                      >
                        {sizeLabels[size]}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {filtersActive ? (
                <button type="button" onClick={() => { setCity(""); setStaffSize("all"); }} className="mt-5 text-sm font-medium text-accent hover:underline">
                  {c.clearFilters}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div id="catalog-results" role="tabpanel" aria-label={tab === "people" ? c.people : c.companies}>
        {state.error && !loading ? <FormMessage kind="error">{t.errors.searchFailed}</FormMessage> : null}
        {loading ? (
          <ListSkeleton />
        ) : result && result.items.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-neutral-300 px-5 py-9 text-center text-sm text-ink">
            {result.tab === "people" ? c.emptyPeople : c.emptyCompanies}
          </p>
        ) : result ? (
          <ul className="flex flex-col gap-1">
            {result.tab === "people"
              ? result.items.map((person) => (
                  <PersonItem key={person.id} person={person} selected={selectedPerson === person.username} onOpen={openPreview} />
                ))
              : result.items.map((company) => (
                  <CompanyItem key={company.id} company={company} selected={selectedCompany === company.slug} onOpen={openPreview} />
                ))}
          </ul>
        ) : null}
      </div>

      {result?.hasMore ? (
        <div className="mt-4">
          <Button type="button" variant="secondary" onClick={loadMore} pending={loadingMore} pendingText={c.loading}>
            {c.loadMore}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

type OpenPreview = (event: MouseEvent<HTMLAnchorElement>, kind: "person" | "company", value: string) => void;

function PersonItem({ person, selected, onOpen }: { person: PersonRow; selected: boolean; onOpen: OpenPreview }) {
  const name = `${person.first_name} ${person.last_name}`.trim() || t.catalog.personUnknown;
  const detail = [person.organization_name, person.position].filter(Boolean).join(" · ") || person.city;
  return (
    <li>
      <Link
        href={`/@${person.username}`}
        prefetch={false}
        onClick={(event) => onOpen(event, "person", person.username)}
        aria-current={selected ? "true" : undefined}
        className={`-mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-neutral-100 ${selected ? "bg-neutral-100" : ""}`}
      >
        <Avatar url={person.avatar_url} name={name} size={52} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-semibold text-ink">{name}</span>
          {detail ? <span className="block truncate text-sm text-neutral-500">{detail}</span> : null}
        </span>
      </Link>
    </li>
  );
}

function CompanyItem({ company, selected, onOpen }: { company: CompanyRow; selected: boolean; onOpen: OpenPreview }) {
  const members = Number(company.members_count ?? 0);
  const detail = [company.city, `${members} ${pluralRu(members, t.catalog.members)}`].filter(Boolean).join(" · ");
  return (
    <li>
      <Link
        href={`/c/${company.slug}`}
        prefetch={false}
        onClick={(event) => onOpen(event, "company", company.slug)}
        aria-current={selected ? "true" : undefined}
        className={`-mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-neutral-100 ${selected ? "bg-neutral-100" : ""}`}
      >
        <Avatar url={company.logo_url} name={company.name} size={52} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-semibold text-ink">{company.name}</span>
          <span className="block truncate text-sm text-neutral-500">{detail}</span>
        </span>
      </Link>
    </li>
  );
}

function ListSkeleton() {
  return (
    <ul aria-hidden className="flex flex-col gap-3 py-2">
      {[0, 1, 2, 3].map((index) => (
        <li key={index} className="flex items-center gap-3">
          <span className="h-[52px] w-[52px] rounded-full bg-neutral-100" />
          <span className="flex flex-1 flex-col gap-2">
            <span className="h-4 w-2/3 rounded bg-neutral-100" />
            <span className="h-3 w-1/3 rounded bg-neutral-100" />
          </span>
        </li>
      ))}
    </ul>
  );
}
