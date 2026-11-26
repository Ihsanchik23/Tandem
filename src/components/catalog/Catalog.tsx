"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { pluralRu, t } from "@/lib/i18n";
import { Avatar } from "@/components/profile/Avatar";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { SearchIcon } from "@/components/nav/icons";
import { ActiveFilters, ChoiceChips, FilterMenu, FilterSection, OptionList, type Option } from "@/components/ui/filters/FilterMenu";
import { CITIES } from "./cities";
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
  // Фильтры (город, размер) применяются сразу; текст поиска — после короткой паузы в наборе.
  const [appliedQuery, setAppliedQuery] = useState(query);
  const [state, setState] = useState<State>({ key: "", result: null, error: false });
  const [loadingMore, setLoadingMore] = useState(false);
  const selectionRef = useRef<Selection>({ person: params.get("person"), company: params.get("company") });
  const selectedPerson = params.get("person");
  const selectedCompany = params.get("company");
  const applied = { query: appliedQuery, city, staffSize };
  const key = `${tab}|${appliedQuery.trim()}|${city.trim()}|${staffSize}`;
  const latestKey = useRef(key);

  useEffect(() => {
    selectionRef.current = { person: selectedPerson, company: selectedCompany };
  }, [selectedPerson, selectedCompany]);

  // Запрос, город и размер компании сохраняются в адресе после короткой задержки.
  useEffect(() => {
    const id = setTimeout(() => {
      setAppliedQuery(query);
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
  const cityValue = city.trim();
  const sizeOn = tab === "companies" && staffSize !== "all";
  const filterCount = (cityValue ? 1 : 0) + (sizeOn ? 1 : 0);
  const resetFilters = () => {
    setCity("");
    setStaffSize("all");
  };
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
        <FilterMenu count={filterCount} onReset={resetFilters} compact large>
          <FilterSection title={c.city} value={cityValue || c.cityAny}>
            <OptionList
              label={c.city}
              searchPlaceholder={c.citySearch}
              options={cityOptions(cityValue, c.cityAny)}
              value={cityValue}
              onChange={setCity}
              freeText={(q) => q}
            />
          </FilterSection>
          {tab === "companies" ? (
            <FilterSection title={c.staffSize}>
              <ChoiceChips
                label={c.staffSize}
                options={STAFF_SIZES.map((size) => ({ value: size, label: sizeLabels[size] }))}
                value={staffSize}
                onChange={setStaffSize}
              />
            </FilterSection>
          ) : null}
        </FilterMenu>
      </div>

      {filterCount > 0 ? (
        <div className="-mt-2 mb-4">
          <ActiveFilters
            items={[
              ...(cityValue ? [{ key: "city", label: cityValue, onRemove: () => setCity("") }] : []),
              ...(sizeOn ? [{ key: "size", label: `${c.staffSize}: ${sizeLabels[staffSize]}`, onRemove: () => setStaffSize("all") }] : []),
            ]}
            onResetAll={resetFilters}
          />
        </div>
      ) : null}

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

// Варианты города: «Любой», выбранный сейчас (если его нет в подсказках), подсказки.
function cityOptions(current: string, anyLabel: string): Option<string>[] {
  const known = CITIES.some((x) => x.toLocaleLowerCase("ru") === current.toLocaleLowerCase("ru"));
  return [
    { value: "", label: anyLabel },
    ...(current && !known ? [{ value: current, label: current }] : []),
    ...CITIES.map((x) => ({ value: x, label: x })),
  ];
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

// Заготовка всего каталога, пока он загружается: вкладки, поиск и строки списка —
// того же размера, что настоящие (страница «Поиск» не прыгает).
export function CatalogSkeleton() {
  return (
    <div aria-hidden className="flex min-w-0 flex-col">
      <div className="mb-5 grid h-11 grid-cols-2 border-b border-neutral-200">
        <span className="m-auto h-4 w-20 rounded bg-neutral-100" />
        <span className="m-auto h-4 w-14 rounded bg-neutral-100" />
      </div>
      <div className="mb-5 flex items-center gap-2">
        <span className="h-11 flex-1 rounded-full bg-neutral-100" />
        <span className="h-11 w-11 rounded-full bg-neutral-100" />
      </div>
      <ListSkeleton rows={6} />
    </div>
  );
}

function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <ul aria-hidden className="flex flex-col gap-3 py-2">
      {Array.from({ length: rows }, (_, index) => index).map((index) => (
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
