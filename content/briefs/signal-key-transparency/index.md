# Signal adds Key Transparency

[Signal Messenger](https://signal.org/blog/automatic-key-verification/) just added Key Transparency (KT) for automatic key verification. It's good but a bit timid.

I'm comparing their KT with the one used by [Proton](https://schaerli.org/weblog/5-proton/), where I disclosed some weaknesses earlier this year.

### 1. Audit Check (external auditors verify logs are append-only)

Proton's KT is still in "beta" after several years and still doesn't have any external auditors. Signal has their KT logs regularly verified by both Cloudflare and Trail of Bits.

### 2. Self-Check (verify your own keys are stored correctly)

With Proton I found the self-check address/index was provided by the potentially untrusted backend and never verified. Signal does this correctly, the address is provided by the user. However, if the check fails on Signal it ignores it at first, only showing an error if the failure persists after one day.

### 3. Connection-Check (verify your peer's keys)

With Proton this is done automatically, though in some cases failures are not reported in the UI at all. For Signal this only happens when you manually click a button, and failures just fall back to manual verification of the Safety Number.

Overall Signal's implementation looks solid and the issues I reported to Proton don't seem to apply to them. But the usage is clearly very careful for now: KT verification is not deemed enough for persisting trust (no "shield" symbol in chat), failures just fall back to manual verification, and self-audit only shows errors after a failure persists for a day. These are all reasonable choices to ensure a stable user experience. I presume they will tighten the KT once they see it running smoothly, maybe automated checks of connections or quicker failure notifications in the future.

<socials/>
