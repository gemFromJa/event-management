export const buildRegistrationEmail = (
  userName: string,
  event: { title: string; date: string; time: string; location: string }
) => ({
  Subject: { Data: `You're in! Succefully registered for ${event.title}` },
  Body: {
    Html: {
      Data: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
            <h2>You're in, ${userName}!</h2>
            <p>You've registered for <strong>${event.title}</strong>.</p>
            <table style="margin:24px 0;width:100%">
              <tr><td style="color:#888;font-size:13px">Date</td><td>${event.date}</td></tr>
              <tr><td style="color:#888;font-size:13px">Time</td><td>${event.time}</td></tr>
              <tr><td style="color:#888;font-size:13px">Location</td><td>${event.location}</td></tr>
            </table>
            <p style="color:#888;font-size:12px">See you there!!</p>
          </div>
        `,
    },
  },
});
