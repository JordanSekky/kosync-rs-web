import { useSearchParams } from "@solidjs/router";
import { createMemo } from "solid-js";
import PageHeader from "~/components/PageHeader";
import ProgressFeed from "~/components/ProgressFeed";
import ProgressFilters from "~/components/ProgressFilters";
import { filterFromParams, hasFilter, sameFilter } from "~/lib/filters";
import { createProgressPages } from "~/lib/progress";

export default function Progress() {
  const [search] = useSearchParams();
  const filter = createMemo(() => filterFromParams(search), undefined, { equals: sameFilter });
  const pages = createProgressPages(filter);

  return (
    <>
      <PageHeader title="Progress history" description="Every position pushed by every user, newest first">
        <button type="button" class="btn btn-sm" disabled={pages.loading()} onClick={pages.refresh}>
          Refresh
        </button>
      </PageHeader>

      <div class="space-y-4">
        <ProgressFilters />
        <ProgressFeed pages={pages} filtered={hasFilter(filter())} />
      </div>
    </>
  );
}
