# Filen's password onion made me cry

[Filen](https://filen.io) is a young German end-to-end encrypted cloud storage provider. Five years in, they are on the third version of their crypto protocol. The oldest accounts still authenticate with [long-deprecated](https://www.rfc-editor.org/info/rfc6149/) hash functions like MD2 and MD4, with attacks dating back to [the last millennium](https://doi.org/10.1007/s001459900047). A downgrade attack could trick even recent accounts into using them, which for weak passwords could leak all files to the service provider.

This post walks through some of the cryptographic weaknesses I found and questions if end-to-end encryption is worth it when delivered on a webpage. I responsibly disclosed every finding to Filen and gave them a draft of this post to review before publication. You can find the unabridged list of findings [here](./disclosure/).

<socials/>

## "Zero-knowledge encryption"

Many cloud providers market [cypherpunk](https://en.wikipedia.org/wiki/Cypherpunk)-style privacy as a service, and I call them [cypher](https://en.wikipedia.org/wiki/Cypherpunk)-[SaaS](https://de.wikipedia.org/wiki/Software-as-a-Service). Filen is one of them, and [its website](https://filen.io) promises the following.

> Filen was built around zero-knowledge end-to-end encryption. Neither we, as a service provider, nor any other service agency will ever have access to your files

Such promises are hard to enforce cryptographically. ETH Zürich's [Applied Cryptography Group](https://appliedcrypto.ethz.ch/) found flaws in many of these products with [zkae.io](https://zkae.io) and [brokencloudstorage.info](https://brokencloudstorage.info). While moving to alternative providers in the spirit of [di.day](https://di.day), I reviewed [Proton](https://schaerli.org/weblog/5-proton/), [Internxt](https://schaerli.org/weblog/6-internxt/) and now Filen, and found similar problems.

"Zero-knowledge encryption" has become a common marketing term for such products, but it is [not a thing](https://soatok.blog/2020/09/12/edutech-spyware-is-still-spyware-proctorio-edition/#zero-knowledge) in the cryptographic literature. Zero-knowledge proofs exist, but they are a different primitive, presumably borrowed for the prestige. In practice it means confidentiality against the backend, so the server learns nothing about the contents of a user's files. Unlike other sites, the threat model here must therefore treat the backend as malicious. Whether that is realistic, especially in a browser, is a question for a [later section](#cryptodoesntmatter).

### MD5(MD4(MD2(password)))

End-to-end encrypted storage requires the user to be the sole owner of their keys, which usually means all keys are protected by the password. Normal websites receive the password in plain text and check it on the backend, but if Filen did that, it could decrypt every file. So Filen hashes the password client-side and sends only the hash. The first protocol version computed that hash [roughly](https://github.com/FilenCloudDienste/filen-sdk-ts/blob/6f272ffac11802d5d1a64fb8796871b402db6a71/src/crypto/utils.ts#L304-L313) like this:

```js
function hashPassword(password) {
    return SHA512(SHA384(SHA256(SHA1(password)))) +
           SHA512(MD5(MD4(MD2(password))))
}
```

This looks like every hash function the library supported squashed into one big onion-hash cocktail. While even legacy hashes like these cannot be reversed, if you have a target hash you can re-hash password guesses until one matches, which is why password hashing functions are deliberately slow. This onion is the opposite, incredibly efficient to compute, and that is the real issue. The output also concatenates two independent onions, so an attacker only needs the cheaper half to check a guess, which costs them less than it cost the client.

Filen is the party we need to protect the password from, yet it holds these hashes, so it could crack any v1 password. Luckily the hash was soon replaced by a proper password hashing function. The [latest version](https://github.com/FilenCloudDienste/filen-sdk-ts/blob/6afc650e74bae4003437ca85146860cce44df178/src/crypto/utils.ts#L314-L331) uses [argon2](https://www.password-hashing.net/), which is deliberately slow and memory-hard. However, v1 is still supported for backward compatibility, and at login the client asks the server which hash version to use. So at any login the server can claim your account is v1 and harvest the weak hash. The researchers behind [zkae.io](https://zkae.io) showed similar downgrade attacks against Bitwarden and LastPass.

### Encrypt like it's 1854

The cryptography that protects our privacy can be in direct tension with the usability features that cypher-SaaS may want to offer. Filen faced such an issue when they tried to solve server-side search over encrypted filenames. If you want to search for a file named `banana.png` and you start typing `ba`, they wanted a way to still perform a server-side search. That's why in the versions I reviewed the client [split the filename](https://github.com/FilenCloudDienste/filen-sdk-ts/blob/6f272ffac11802d5d1a64fb8796871b402db6a71/src/utils.ts#L320) into small chunks of length two or more. `banana.png` becomes `ba`, `an`, `na`, `an`, `na`, `a.`, `.p`, `pn`, `ng`, `ban`, `ana`, `nan`, `ana` and so on. These chunks were then hashed with an HMAC and uploaded to the server. The HMAC is keyed with a user secret so the server cannot easily reverse it, but it is deterministic, so when you type `ba` it can be hashed to the same value which then allows for server-side search of that file.

![Filenames were split into chunks, hashed and sent to the server. Equal chunks give equal hashes, so the server can count chunk frequencies and use the overlaps to chain chunks back into full filenames.](img/ngram_search.svg)

This makes it sort of a ["substitution cipher"](https://en.wikipedia.org/wiki/Substitution_cipher), and allows for statistical attacks, similar to breaking 1854's [Playfair cipher](https://en.wikipedia.org/wiki/Playfair_cipher) which is no match for modern cryptanalysis.

Filen informed me that they are moving away from server-side search. Some clients still send the hashes but it's being phased out and the server does not process them anymore. There is research on [searchable encryption](https://en.wikipedia.org/wiki/Searchable_symmetric_encryption), but for this use case I agree with Filen that client-side search is the most pragmatic approach.

### Stranger keys

Filen lets you share files and folders with other users. When you do, the client encrypts the item's metadata, such as name and size, along with its encryption key to the recipient's public key. This is only secure if you authenticate that public key. Without that, a [mallory-in-the-middle](https://signal.org/blog/automatic-key-verification/#mallory-in-the-middle-attack) (MITM) can intercept everything meant for the recipient.

Filen does not authenticate the recipient's public key, a gap common in cypher-SaaS products. I found similar gaps in [Proton](https://schaerli.org/weblog/5-proton/#todokeytransparency) and [Internxt](https://schaerli.org/weblog/6-internxt/#sharingthelot), and [zkae.io](https://zkae.io) found the same kind of issues in Bitwarden, LastPass, Dashlane and 1Password.

What makes it particularly worrying here is that the attack is not limited to the initial share. File uploads, moves, folder creation and renames all [check](https://github.com/FilenCloudDienste/filen-sdk-ts/blob/6f272ffac11802d5d1a64fb8796871b402db6a71/src/cloud/index.ts#L2703-L2727) with the backend whether the parent folder is shared, every time fetching an unauthenticated list of public keys and encrypting the item keys to them. So at any point a malicious backend could claim a folder is shared with a key it controls and gain access to any file you upload, rename or move.

Filen told me that they plan to introduce a trust on first use model and limit sharing to keys of the user's contacts in the future.

## Crypto doesn't matter*

Should we even care about a product's cryptography if it's served as a webpage? If we don't trust the provider, how can we know they will serve us the correct cryptography in the first place? [zkae.io](https://eprint.iacr.org/2026/058.pdf) argues that work like theirs or mine is still worthwhile:

> Before going further, we note that there is a trivial attack against end-to-end encrypted applications that we wish to take out of consideration from the outset. Namely, a user can be supplied with a malicious client which, for example, simply returns the user's master password to the server in the clear. Such an attack would be detectable through code audits and – though possible via an obfuscated functionality – would be very risky for a vendor to conduct. This is especially true for signed software releases (e.g., desktop and mobile clients, browser extensions), as the existence of a signed malicious client would constitute proof of vendor misconduct.

As protocol specialists they reasonably scope this out of their threat model, but as much as I want to agree, I think that understates how feasible delivering bad code still is. It depends on how the software reaches you.

![<b>A</b> unsigned, vendor-controlled channel. <b>B</b> signed, vendor-controlled channel. <b>C</b> third-party store. Red marks a malicious build.](img/client_delivery_all.svg)

Websites are unsigned and re-delivered on every page load, so a vendor could serve a malicious version to only a few high-value targets **(A)**, which is very hard to detect. Desktop apps are often no better. Many are Electron-based, which comes with a [messy](https://blog.doyensec.com/2026/02/16/electron-safe-updater.html) update ecosystem. Filen [does not check](https://github.com/FilenCloudDienste/filen-desktop/blob/74c71053a4197bedca972e12fea417e36382d209/package.json#L142) software signatures when updating, and I reported the same issue to [Proton](https://schaerli.org/weblog/5-proton/#unsignedclients), [Bitwarden](https://github.com/bitwarden/clients/pull/19591) and [Internxt](https://schaerli.org/weblog/6-internxt/#unverifiedupdates). Such targeted attacks have happened before, as in the [Notepad++ compromise](https://cvereports.com/reports/CVE-2025-15556), where an update channel without proper signature verification served malicious builds to only a small set of targets. In my experience most cypher-SaaS are served this way.

Signed software from a vendor-controlled channel **(B)**, like [Signal Desktop for Linux](https://signal.org/download/linux/), still allows targeted attacks, but they are much riskier. A signed malicious build would prove vendor misconduct (or a compromise of the signing keys) if anyone caught it. I still prefer getting software through third-party distributors **(C)**, such as installing [KeePass through F-Droid](https://f-droid.org/packages/com.kunzisoft.keepass.libre/). Malicious apps can still get in there, but the distributor attests that all users get the same version, so a malicious build reaches everyone at once, which is much noisier and quicker to detect. The [Shai Hulud](https://snyk.io/blog/tanstack-npm-packages-compromised/) worm in npm, for example, was caught quickly because it hit so many people.

So the researcher's premise that a bad client is very risky for a vendor holds in **(C)** and, to a lesser degree, in **(B)**. It falls apart in **(A)**, which is how most cypher-SaaS are delivered. And the attacker does not even have to be the vendor. Whoever can intercept HTTPS can serve a malicious client, either with the private keys of eight eMudhra intermediates, which turned out to be [recoverable from their public certificates](https://emudhra.we-have-a-problem.com/), or by [hijacking the DNS of three top-level domains](https://arstechnica.com/security/2026/10/hackers-obtain-counterfeit-tls-certificates-for-google-and-other-large-services/) to mint certificates for Google and other brands.

## *if you cannot trust the code

I don't think this means web-based cryptography never makes sense. I personally prefer self-hosting, with [OpenCloud](https://opencloud.eu/) for file storage and [netbird](https://netbird.io/) for remote access, or [magic-wormhole](https://magic-wormhole.readthedocs.io/en/latest/welcome.html) for sharing files between machines. If you really need a cloud solution, a cypher-SaaS may be reasonable choice, since its vendor has a commercial incentive to respect your privacy. Just be aware that a web-based cypher-SaaS could still read your data by serving you a modified client, a fact its marketing rarely mentions and sometimes even disputes.

Filen carries some bad legacy cryptography it cannot easily drop because of backward compatibility, but they responded quickly to my feedback and went through everything thoroughly. They promise to address many of the points I raised in their upcoming fourth protocol version, maybe even with a sprinkle of post-quantum security.
