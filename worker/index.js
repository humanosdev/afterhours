self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "AfterHours", body: event.data.text() };
  }

  const title = payload.title || "AfterHours";
  const body = payload.body || "You have a new update.";
  const data = payload.data || {};

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      data,
      badge: "/icon-192.png",
      icon: "/icon-192.png",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  let url = "/notifications";
  if (data.type === "friend_joined_venue" && data.venueId) {
    url = `/map?venueId=${encodeURIComponent(data.venueId)}`;
  } else if (data.type === "friend_nearby") {
    url = "/map";
  } else if (data.type === "friend_story") {
    url = "/stories";
  } else if (data.type === "friend_request_received") {
    url = "/notifications";
  } else if (data.type === "friend_request_accepted" && data.actorId) {
    url = `/profile/${data.actorId}`;
  }

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
      return undefined;
    })
  );
});

self.addEventListener("message", (event) => {
  if (event?.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
