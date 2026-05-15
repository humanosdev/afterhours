import { Screen } from "../../src/components/Screen";
import { ShellCard } from "../../src/components/ShellCard";
import { ShellListRow } from "../../src/components/ShellListRow";
import { TabScreenHeader } from "../../src/components/TabScreenHeader";

const CHAT_ROWS = [
  { title: "Messages", subtitle: "Conversations — web/PWA production today", meta: "Shell" },
  { title: "Group threads", subtitle: "No messages API or realtime in Phase 2H", meta: "—" },
  { title: "Activity", subtitle: "Friend and venue notifications stay on web for now", meta: "Shell" },
];

export default function ChatTabScreen() {
  return (
    <Screen scroll edges={["top", "left", "right"]}>
      <TabScreenHeader
        title="Chat"
        phaseLabel="Phase 2H · Placeholder"
        subtitle="Aligned with web/PWA chat tab. No Supabase reads or push in this phase."
      />

      <ShellCard
        title="Inbox shell"
        description="Read-only placeholder for messages. Production chat remains on web/PWA."
      >
        {CHAT_ROWS.map((row, index) => (
          <ShellListRow
            key={row.title}
            title={row.title}
            subtitle={row.subtitle}
            meta={row.meta}
            isLast={index === CHAT_ROWS.length - 1}
          />
        ))}
      </ShellCard>
    </Screen>
  );
}
