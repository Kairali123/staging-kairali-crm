export async function sendPushNotification(
  message: string,
  userKey?: string,
  device?: string,
  title?: string
) {
  const token =
    process.env.PUSHOVER_APP_TOKEN ||
    process.env.PUSHOVER_TOKEN ||
    process.env.PUSHOVER_API_TOKEN;
  const user =
    userKey || process.env.PUSHOVER_ADMIN_USER_KEY || process.env.PUSHOVER_USER_KEY;

  if (!token || !user) {
    console.log(
      `[Pushover Notification (Simulated)]: Title="${title || "DB Access Request"}", Message="${message.replace(
        /\n/g,
        " "
      )}"`
    );
    return;
  }

  try {
    const params = new URLSearchParams({
      token,
      user,
      message,
    });
    if (device) params.append("device", device);
    if (title) params.append("title", title);

    const response = await fetch("https://api.pushover.net/1/messages.json", {
      method: "POST",
      body: params,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Pushover API returned ${response.status}: ${errorText}`);
    }
  } catch (err) {
    console.error("[sendPushNotification] Error sending Pushover push notification:", err);
  }
}
