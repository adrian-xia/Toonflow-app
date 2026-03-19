import { createApp } from "./app";

const port = Number(process.env.PORT ?? 3001);

createApp().listen(port, () => {
  console.log(`[api] listening on http://127.0.0.1:${port}`);
});
