'use client';

import {
  ClipboardList,
  Loader2,
  Monitor,
  Search,
  SquareMenu,
  UserRound,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  getVisibleOmniStaticItems,
  type OmniStaticItem,
} from '@/lib/omni-search-index';
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from '@/components/ui/popover';
import type { UserRole } from '@/types/auth';
import type {
  OmniSearchAssetResult,
  OmniSearchReportResult,
  OmniSearchResponse,
  OmniSearchUserResult,
} from '@/types/omni-search';

const triggerTextClass =
  'font-text-sm-regular text-sm leading-5 tracking-(--text-sm-regular-letter-spacing) [font-style:var(--text-sm-regular-font-style)]';

const resultItemClass =
  'mb-1 flex min-h-11 items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 transition-colors hover:bg-slate-100';

const sectionHeadingClass =
  '**:[[cmdk-group-heading]]:font-medium **:[[cmdk-group-heading]]:text-slate-400';

const sectionDividerClass = 'my-2 h-px bg-slate-200/90';

interface OmniSearchTriggerProps {
  userRole: UserRole;
}

function SectionEmptyState({
  query,
  entity,
}: {
  query: string;
  entity: string;
}) {
  return (
    <div className="mb-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-center">
      <p className="text-sm font-semibold text-slate-900">No records found</p>
      <p className="mt-1 text-xs text-slate-500">
        Your search &quot;{query}&quot; did not match any {entity}.
      </p>
    </div>
  );
}

function SectionSkeletonRows({ count = 2 }: { count?: number }) {
  return (
    <div className="space-y-1" data-testid="omni-skeleton-group">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={`skeleton-${index}`}
          data-testid="omni-skeleton-row"
          className="flex min-h-11 items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 animate-pulse"
        >
          <div className="size-4 rounded bg-slate-200" />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="h-3 w-1/3 rounded bg-slate-200" />
            <div className="h-2.5 w-1/2 rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function OmniSearchTrigger({ userRole }: OmniSearchTriggerProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const openShortcutFrameRef = useRef<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [assetsResults, setAssetsResults] = useState<OmniSearchAssetResult[]>(
    []
  );
  const [reportsResults, setReportsResults] = useState<
    OmniSearchReportResult[]
  >([]);
  const [usersResults, setUsersResults] = useState<OmniSearchUserResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const normalizedQuery = searchValue.trim();

  const handleOpenChange = (nextOpen: boolean) => {
    setIsOpen(nextOpen);

    if (!nextOpen) {
      setAssetsResults([]);
      setReportsResults([]);
      setUsersResults([]);
      setSearchError(null);
      setIsSearching(false);
    }
  };

  // Keep Pages instant with a static frontend index.
  const pageResults = useMemo(
    () => getVisibleOmniStaticItems(normalizedQuery, userRole),
    [normalizedQuery, userRole]
  );

  // Keep keyboard shortcut logic colocated with dialog state.
  useEffect(() => {
    const handleGlobalShortcut = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'k') {
        return;
      }

      if (!event.metaKey && !event.ctrlKey) {
        return;
      }

      if (event.altKey) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (openShortcutFrameRef.current !== null) {
        cancelAnimationFrame(openShortcutFrameRef.current);
      }

      // Defer opening to the next frame so the shortcut key event
      // does not immediately trigger a close in the same interaction cycle.
      openShortcutFrameRef.current = requestAnimationFrame(() => {
        openShortcutFrameRef.current = null;
        setIsOpen(true);
        inputRef.current?.focus();
      });
    };

    window.addEventListener('keydown', handleGlobalShortcut);

    return () => {
      window.removeEventListener('keydown', handleGlobalShortcut);

      if (openShortcutFrameRef.current !== null) {
        cancelAnimationFrame(openShortcutFrameRef.current);
        openShortcutFrameRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (normalizedQuery.length < 2) {
      setAssetsResults([]);
      setUsersResults([]);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    let isCancelled = false;
    const controller = new AbortController();
    const debouncedSearch = setTimeout(async () => {
      setIsSearching(true);
      setSearchError(null);
      setAssetsResults([]);
      setReportsResults([]);
      setUsersResults([]);

      try {
        const response = await fetch(
          `/api/v1/search?q=${encodeURIComponent(normalizedQuery)}`,
          {
            method: 'GET',
            signal: controller.signal,
            headers: {
              Accept: 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch omni search results.');
        }

        const payload = (await response.json()) as OmniSearchResponse;
        if (isCancelled) {
          return;
        }

        setAssetsResults(payload.assets);
        setReportsResults(payload.reports);
        setUsersResults(payload.users);
      } catch (error) {
        if (isCancelled || controller.signal.aborted) {
          return;
        }

        setAssetsResults([]);
        setReportsResults([]);
        setUsersResults([]);
        setSearchError(
          error instanceof Error
            ? error.message
            : 'Failed to fetch omni search results.'
        );
      } finally {
        if (!isCancelled) {
          setIsSearching(false);
        }
      }
    }, 250);

    return () => {
      isCancelled = true;
      controller.abort();
      clearTimeout(debouncedSearch);
    };
  }, [isOpen, normalizedQuery]);

  // Match combobox behavior: execute selection and close immediately.
  const handleSelectHref = (href: string) => {
    router.push(href);
    handleOpenChange(false);
  };

  const totalResultsCount =
    pageResults.length +
    assetsResults.length +
    reportsResults.length +
    usersResults.length;

  const shouldShowResultSections = normalizedQuery.length >= 2 || isSearching;

  const shouldShowPagesEmptyState =
    normalizedQuery.length >= 2 && pageResults.length === 0;

  const shouldShowAssetsEmptyState =
    normalizedQuery.length >= 2 &&
    !isSearching &&
    assetsResults.length === 0 &&
    !searchError;

  const shouldShowReportsEmptyState =
    normalizedQuery.length >= 2 &&
    !isSearching &&
    reportsResults.length === 0 &&
    !searchError;

  const shouldShowUsersEmptyState =
    normalizedQuery.length >= 2 &&
    !isSearching &&
    usersResults.length === 0 &&
    !searchError;

  const renderStaticItem = (item: OmniStaticItem, group: 'page' | 'report') => {
    const Icon = group === 'page' ? SquareMenu : ClipboardList;

    return (
      <CommandItem
        key={item.id}
        value={`${item.label} ${item.description} ${item.keywords}`}
        onSelect={() => handleSelectHref(item.href)}
        className={resultItemClass}
      >
        <Icon className="size-4 text-slate-500" />

        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm text-slate-900">{item.label}</span>
          <span className="truncate text-xs text-slate-500">
            {item.description}
          </span>
        </div>
      </CommandItem>
    );
  };

  const renderReportItem = (item: OmniSearchReportResult) => {
    return (
      <CommandItem
        key={item.id}
        value={`${item.label} ${item.description}`}
        onSelect={() => handleSelectHref(item.href)}
        className={resultItemClass}
      >
        <ClipboardList className="size-4 text-slate-500" />

        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm text-slate-900">{item.label}</span>
          <span className="truncate text-xs text-slate-500">
            {item.description}
          </span>
        </div>
      </CommandItem>
    );
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverAnchor asChild>
        <div className="flex h-9 w-112.5 items-center rounded-lg border border-solid border-slate-200 bg-white shadow-box-shadow-shadow-xs">
          <div className="flex items-center py-1.5 pl-3 pr-0">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
          </div>

          <div className="flex h-9 flex-1 items-center px-2">
            <input
              ref={inputRef}
              value={searchValue}
              onChange={(event) => {
                setSearchValue(event.target.value);
                if (!isOpen) {
                  setIsOpen(true);
                }
              }}
              onFocus={() => setIsOpen(true)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault();
                  setIsOpen(false);
                  inputRef.current?.blur();
                }
              }}
              aria-label="Omni Search"
              placeholder="Search..."
              className={`w-full bg-transparent text-slate-500 outline-none placeholder:text-slate-500 ${triggerTextClass}`}
            />
          </div>

          <div className="flex items-center gap-1 py-1.5 pl-0 pr-3">
            {['⌘', 'K'].map((key) => (
              <div
                key={key}
                className="flex h-5 w-5 flex-col items-center justify-center overflow-hidden rounded-lg bg-slate-50 px-1 py-0"
              >
                <span className="font-text-xs-regular text-(length:--text-xs-regular-font-size) leading-(--text-xs-regular-line-height) tracking-(--text-xs-regular-letter-spacing) text-slate-500 [font-style:var(--text-xs-regular-font-style)]">
                  {key}
                </span>
              </div>
            ))}
          </div>
        </div>
      </PopoverAnchor>

      <PopoverContent
        side="bottom"
        sideOffset={8}
        align="center"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        className="w-[720px] max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white p-0 shadow-box-shadow-shadow-xl"
      >
        <Command shouldFilter={false} className="rounded-xl! bg-white p-0">
          <CommandList className="max-h-93 px-3 py-2">
            {searchError ? (
              <div className="px-1 pb-2 pt-1 text-xs text-red-600">
                {searchError}
              </div>
            ) : null}

            {shouldShowResultSections ? (
              <>
                <CommandGroup
                  heading="Pages"
                  className={`px-0 ${sectionHeadingClass}`}
                >
                  {pageResults.map((item) => renderStaticItem(item, 'page'))}

                  {shouldShowPagesEmptyState ? (
                    <SectionEmptyState query={normalizedQuery} entity="pages" />
                  ) : null}
                </CommandGroup>

                <div className={sectionDividerClass} />

                <CommandGroup
                  heading="Assets"
                  className={`px-0 ${sectionHeadingClass}`}
                >
                  {isSearching ? <SectionSkeletonRows /> : null}

                  {!isSearching
                    ? assetsResults.map((asset) => (
                        <CommandItem
                          key={asset.id}
                          value={`${asset.assetTag} ${asset.name ?? ''} ${asset.serialNumber ?? ''} ${asset.category}`}
                          onSelect={() => handleSelectHref(`/assets/${asset.id}`)}
                          className={resultItemClass}
                        >
                          <Monitor className="size-4 text-slate-500" />

                          <div className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate text-sm text-slate-900">
                              {asset.name ?? asset.assetTag}
                            </span>
                            <span className="truncate text-xs text-slate-500">
                              {asset.assetTag}
                              {asset.serialNumber
                                ? ` • ${asset.serialNumber}`
                                : ''}
                            </span>
                          </div>
                        </CommandItem>
                      ))
                    : null}

                  {shouldShowAssetsEmptyState ? (
                    <SectionEmptyState query={normalizedQuery} entity="assets" />
                  ) : null}
                </CommandGroup>

                <div className={sectionDividerClass} />

                <CommandGroup
                  heading="Reports"
                  className={`px-0 ${sectionHeadingClass}`}
                >
                  {isSearching ? <SectionSkeletonRows count={1} /> : null}

                  {!isSearching
                    ? reportsResults.map((item) => renderReportItem(item))
                    : null}

                  {shouldShowReportsEmptyState ? (
                    <SectionEmptyState query={normalizedQuery} entity="reports" />
                  ) : null}
                </CommandGroup>

                <div className={sectionDividerClass} />

                <CommandGroup
                  heading="Users"
                  className={`px-0 ${sectionHeadingClass}`}
                >
                  {isSearching ? <SectionSkeletonRows /> : null}

                  {!isSearching
                    ? usersResults.map((user) => (
                        <CommandItem
                          key={user.id}
                          value={`${user.name} ${user.email} ${user.department}`}
                          onSelect={() => handleSelectHref('/settings/roles')}
                          className={resultItemClass}
                        >
                          <UserRound className="size-4 text-slate-500" />

                          <div className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate text-sm text-slate-900">
                              {user.name}
                            </span>
                            <span className="truncate text-xs text-slate-500">
                              {user.email} • {user.department}
                            </span>
                          </div>
                        </CommandItem>
                      ))
                    : null}

                  {shouldShowUsersEmptyState ? (
                    <SectionEmptyState query={normalizedQuery} entity="users" />
                  ) : null}
                </CommandGroup>
              </>
            ) : normalizedQuery.length === 0 ? (
              <div className="px-1 py-6 text-center text-xs text-slate-500">
                Start typing to search pages, assets, reports, and users.
              </div>
            ) : null}

            <div className="mt-2 border-t border-slate-200 px-1 pt-2 text-xs text-slate-500">
              {isSearching && normalizedQuery.length >= 2 ? (
                <span className="inline-flex items-center gap-1">
                  <Loader2 className="size-3.5 animate-spin" />
                  Searching...
                </span>
              ) : (
                `${totalResultsCount} results`
              )}
            </div>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
