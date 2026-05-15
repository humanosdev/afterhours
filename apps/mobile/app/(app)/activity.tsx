import { Screen } from "../../src/components/Screen";
import { ShellCard } from "../../src/components/ShellCard";
import { ShellListRow } from "../../src/components/ShellListRow";
import { TabScreenHeader } from "../../src/components/TabScreenHeader";

const ACTIVITY_ROWS = [
  { title: "Stories", subtitle: "Moments from friends — web production today", meta: "Shell" },
  { title: "Notifications", subtitle: "Friend online, venue joins — web only", meta: "Shell" },
  { title: "Shares", subtitle: "Activity feed placeholder — no push in 2E", meta: "Shell" },
];

export default function ActivityTabScreen() {
  return (
    <Screen scroll edges={["top", "left", "right"]}>
      <TabScreenHeader
        title="Activity"
        subtitle="Stories and notifications shell. Push and live activity come in a later phase."
      />

      <ShellCard
        title="Your stream"
        description="Read-only product surface — nothing is fetched from Supabase yet except auth."
      >
        {ACTIVITY_ROWS.map((row, index) => (
          <ShellListRow
            key={row.title}
            title={row.title}
            subtitle={row.subtitle}
            meta={row.meta}
            isLast={index === ACTIVITY_ROWS.length - 1}
          />
        ))}
      </ShellCard>
    </Screen>
  );
}
