// The I/O contract every dev-assistant hook shares. Node >= 20, no dependencies.
// Claude Code sends the event as JSON on stdin; exit 0 lets the tool call through, exit 2 blocks it and
// hands stderr back to the model as feedback.

export const readPayload = async () => {
  try {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString('utf8').trim();
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const pass = () => process.exit(0);

/** Every block names the hook and the allowed alternative, so the model can recover on its own. */
export const block = (hook, reason, alternative) => {
  process.stderr.write(`[dev-assistant] ${hook} blocked this command: ${reason}\nDo this instead: ${alternative}\n`);
  process.exit(2);
};
