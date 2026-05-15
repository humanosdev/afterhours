import { Screen } from "../../src/components/Screen";
import { ShellCard } from "../../src/components/ShellCard";
import { ShellListRow } from "../../src/components/ShellListRow";
import { TabScreenHeader } from "../../src/components/TabScreenHeader";

const DISCOVERY_ROWS = [
  { title: "Search friends", subtitle: "Username & display name — not wired in 2E", meta: "Shell" },
  { title: "Search venues", subtitle: "Places near you — requires read-only API later", meta: "Shell" },
  { title: "Recent lookups", subtitle: "Empty — no Supabase queries in this phase", meta: "—" },
];

export default function SearchTabScreen() {
  return (
    <Screen scroll edges={["top", "left", "right"]}>
      <TabScreenHeader
        title="Search"
        subtitle="Discovery shell for friends and venues. No database reads in Phase 2E."
      />

      <ShellCard title="Find people & places" description="Matches web search eventually — read-only first.">
        {DISCOVERY_ROWS.map((row, index) => (
          <ShellListRow
            key={row.title}
            title={row.title}
            subtitle={row.subtitle}
            meta={row.meta}
            isLast={index === DISCOVERY_ROWS.length - 1}
          />
        ))}
      </ShellCard>
    </Screen>
  );
}
