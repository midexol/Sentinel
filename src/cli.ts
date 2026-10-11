import { buildSentinel } from "./runtime.js";
import { reportOnce, shutdownSignal, watch } from "./watcher.js";

const mode = process.argv[2] ?? "once";

if (mode === "watch") {
  watch(buildSentinel(), shutdownSignal())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Sentinel watch loop crashed:", err);
      process.exit(1);
    });
} else {
  reportOnce(buildSentinel())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Sentinel failed:", err);
      process.exit(1);
    });
}
