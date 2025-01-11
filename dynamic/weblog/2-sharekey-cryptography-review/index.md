# Finding 19 Vulnerabilities in One Secure Messenger

_This research was conducted as part of my master's thesis. You can read the full thesis [here](https://github.com/cyber-defence-campus/sharekey-review/blob/master/Pascal-Schaerli_Security-Assessment-of-the-Sharekey-Collaboration-App.pdf) if you're interested in the gory details._

This is my story about my cryptographic review of Sharekey, a privacy-focused collaboration platform designed to provide cryptographically secured communication and data sharing. When I started this project, I thought there would be little to find. After all, they hadn't implemented any cryptographic algorithms themselves, opting instead for the well-reviewed [NaCl](https://github.com/dchest/tweetnacl-js) library. They'd even been audited by a renowned cryptographer who found no major issues in their protocols. However, it didn't take long for my initial assumptions to be proven wrong. Here's how it unfolded.

## About Sharekey

[Sharekey](https://sharekey.com/) positions itself as an alternative to popular messaging and collaboration platforms like Teams, Slack, Dropbox, and WhatsApp. Their target audience is primarily businesses, with a focus on C-suite executives. Sharekey makes strong claims about their encryption, using terms like "App-to-App encryption" - a concept they've coined. They visualize their protocols as being similar to a VPN, securing message transmission between users and their contacts. Sharekey stresses that they are more than just a messenger, but a full collaboration suite. Besides messaging they also offer file sharing, audio and video calls, and usage on as many devices as you want.

![Graphic made by Sharekey to explain their encryption](img/app-to-app.webp)

This project was done in close collaboration with Sharekey. They gave me access to all of their backend code and we had regular meetings to discuss my findings or troubleshoot any issues.


## Key Findings

I had quite a few findings in my thesis, all of which can be read in [section 3.2 of my thesis](https://ethz.ch/content/dam/ethz/special-interest/infk/inst-infsec/appliedcrypto/education/theses/masters-thesis_pascal-schaerli.pdf#section.3.2). All of these findings were responsibly disclosed to Sharekey. Here I'm going to focus on the two most interesting attacks I found.

### Editing Another User's Messages

In the first week of my thesis, my initial concerns about not finding vulnerabilities were quickly disproven. My first significant discovery was the ability to edit other users' messages in both one-on-one and group chats where I was a participant.

To facilitate my research, I have written my own [python client for Sharekey](https://github.com/cyber-defence-campus/sharekey-review/blob/master/client/client.py), with which I could send whatever content I wanted to the backend, freeing me from the shackles imposed on me from the official GUI client. The first thing I implemented was a method to [edit Sharekey messages](https://github.com/cyber-defence-campus/sharekey-review/blob/master/client/client.py#L412-L446). That's how I found that the backend would let me edit any message, no matter if I was the original author or not. A classic [broken access control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/) vulnerability - the backend failed to verify if the user editing a message was also the original sender.

But wait, you may ask. They are still a cryptographically secured messenger, right? Shouldn't their messaging protocol be able to prevent such a thing from happening? Well, almost. In Sharekey you have one long-term encryption key for each channel, which is derived through a Diffie-Hellman key exchange. Messages are signed using the long-term signature key of the sender.

![Message encryption diagram](img/message-encryption-diagram.webp)

So why did this signature not prevent me from editing another user's messages? At that time, Sharekey did not store your messages on your client. Every time you opened the app, all messages would be loaded again from the backend. Signature checks are relatively expensive and slow the app down too much since they would have to be done every time the app is opened. That's why instead of a signature verification all I found when reading their client source code was a big TODO. The plan was to implement signature verification once messages are stored within the client, that way each signature would only need to be verified once.

Thanks to my close contact with Sharekey, I could report this issue quickly, and at least the access control part was fixed within hours of my report. The message caching and signature verification could not be immediately done as that would require a bigger change to their application.

### File Uploads

My next set of findings centered around file sharing. The issues there originated from another engineering problem. Their main backend was written in JavaScript, which wasn't very efficient at processing large amounts of data. That's why for file uploading they have created a second backend in Go, as a more efficient means of handling large file chunks. The metadata of a file would be handled by the JavaScript backend, and the file content which is split up into smaller chunks is then uploaded and handled by the Go server.

![Sharekey backend for file uploading](img/sharekey-backend-for-file-uploading.webp)

The engineering issue they faced there was that they were unable to persist the authenticated session across to the other server. So as an alternative means of authentication, They required each encrypted file chunk to have a signature by the file owner. However, this signature did not cover any intent, such as _"This is chunk &lt;chunk-id&gt; and I want to upload it as part of file &lt;file-id&gt;"_. Instead, it was just a signature over the raw encrypted file contents, a big blob of random-looking bytes. 

Pairing this with the ability to overwrite existing file chunks was a recipe for disaster. When you send a file to an adversary, they can now download all of your file chunks, and for example re-upload them in a different order, without any cryptographic way of detecting such tampering.

![An adversary could download all chunks and re-upload them in a different order.](img/adversary-reorder-chunks.webp)

However, say the adversary is feeling more destructive than that, then they could simply overwrite the data with any other data that was signed by the file owner. As every user just has one long-term signature key, this signed data is readily available, such as from that file's metadata or messages sent from the owner to the adversary. Any of this could be uploaded and used to overwrite existing file chunks. At this point, the data would not be decryptable anymore, since it was not encrypted with the right key and they are using [Authenticated Encryption](https://en.wikipedia.org/wiki/Authenticated_encryption). The user would get some error when trying to view the file, and the file could not be recovered anymore.

![The adversary has overwritten all file chunks with garbage, destroying the file.](img/adversary-destory-chunks.webp)

### Directory Traversal

The title of this section together with the previous attack might already give you goosebumps. Let me show you how an adversary could have been even more destructive.

We're focusing on the file's metadata now, the part handled by the JavaScript backend. While some of the files within this metadata were encrypted, other information like the IDs of the parent folders or the children of a folder were not. The authentication regarding folder structures relied solely on cryptography. The idea was that without the right key, you couldn't read a file's content or name anyway.

However, how you might have guessed this would allow an adversary to obtain the parent folder ID of a file, from there go to the parent of that folder and so on, until they reach the root folder. From there they can enumerate all children files, locating all files within that folder structure. Knowing the file's ID is enough to perform the attacks outlined before. An adversary could use this to destroy all files they just learned about.

But it gets even worse. Each file also had a list of all messaging channels it was shared. The backend would also allow you to see all files shared within any channel. So from getting the file tree, an adversary could recover all channels in which any of these files were shared, and then recover even more files that might belong to other file trees. Finally, after uncovering a full forest of files, the attacker could destroy every one of them.

![Traversing Folders and Channels to destroy all the files](img/path-traversal.webp)

A plausible attack scenario could involve an adversary downloading all encrypted files, and then destroying the originals. While they couldn't read these files, they could hold them for ransom, offering to restore them once payment was received.

Sharekey mitigated this by preventing the re-upload of existing file chunks, so an adversary couldn't overwrite already written files. Fixing all the other issues is more complex, and I proposed a more complex key hierarchy as a potential solution in my thesis.

### Other Issues

There were more findings, all of which did not support an image of a well-matured protocol. For instance, there was no key separation, as they were using the same long-term key for Diffie-Hellman key exchanges as for encrypting data. This is a big violation of cryptography's best practices, as every key should only hold one purpose and most importantly only be used for one algorithm.

Their messaging protocol focused mainly on confidentiality, with other features such as speaker consistency, forward security, and post-compromise security, not being considered in their design. An adversary with access to the backend could easily re-order messages, drop certain messages, and show different messages to different people, which other messengers can protect against. I am not going to explain all of that here, but you can read about it in [section 3.2 of my thesis](https://ethz.ch/content/dam/ethz/special-interest/infk/inst-infsec/appliedcrypto/education/theses/masters-thesis_pascal-schaerli.pdf#section.3.2).

## Conclusions

Cryptography is challenging. Even when using state-of-the-art algorithms, creating a good protocol is no easy task. It requires input from those who have studied such protocols academically; it's not something to learn on the fly. Perhaps a better approach would have been to build their application on established open protocols, like [Signal](https://github.com/signalapp/libsignal). They could have developed their unique features on top of that, maintaining their business use case while benefiting from a solid, well-tested cryptographic foundation.

Sharekey markets itself as a cutting-edge privacy solution, but some of its claims didn't quite align with my findings. This highlights the importance of consumers applying rigorous scrutiny to privacy-focused solutions before fully trusting them. And that's not easy - Sharekey even had a review by a cryptographer before, but the scope was quite narrow, likely just a few days. This contrasts sharply with the six months of research I dedicated to this single product, which cannot be spent on every application out there.

If you can't verify a company's claims yourself, it's wise to rely on solutions that have reached a certain size and have been exposed to enough scrutiny to gain a reasonable level of confidence about their security. The world of secure messaging is complex, and it takes time and expertise to truly evaluate the safety of these systems. My experience with Sharekey serves as a reminder that even well-intentioned products can have hidden vulnerabilities and that ongoing, in-depth security research is crucial in this field.

## Acknowledgments

This project wouldn't have been possible without some awesome people. Big thanks to Dr. Bernhard Tellenbach for his guidance. Also to Prof. Kenny Paterson's lectures that sparked my interest in this field, and for his invaluable support. Finally, also the Sharekey team deserves a shout-out for their openness and commitment to improving their product. Their communication with us was exceptional.