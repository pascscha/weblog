# Breaking Military-Grade Encryption to Animate My Name

When you visit [my website](https://pascscha.ch), you're greeted with an unconventional banner - a diagram of an encryption scheme, animated to reveal my name letter by letter. While I must admit that the green hacker font is a bit flashy, there is some actual meaningful cryptography going on under the hood. It's a live demonstration of a padding oracle attack against a (purposefully) vulnerable script I wrote that employs "Military Grade" encryption.

## Military Grade Encryption

But what is Military Grade Encryption? This term is often thrown around in marketing materials, insinuating unbreakable security. However, what's usually meant by this is simply the use of [AES (Advanced Encryption Standard)](https://en.wikipedia.org/wiki/Advanced_Encryption_Standard). Sometimes it's specifically used to referr to 256-bit AES, but for the purpose of this attack this does not make a difference. AES is indeed a robust encryption algorithm. However, it's a block cipher, meaning it operates on fixed-size data blocks. All that AES does is provide an invertible function that transforms an input block of data together with a key into an output block of data. That in itself is not particularly useful, as in general, one would want to encrypt more than one block of data. That is why block ciphers like AES usually come with a mode of operation to extend the length of the data they can encrypt.

### AES Modes of Operation

The simplest mode, [Electronic Codebook (ECB)](https://en.wikipedia.org/wiki/Block_cipher_mode_of_operation#Electronic_codebook_(ECB)), encrypts each block independently. Encrypting a large file will split it into smaller blocks, each of which will be encrypted using AES with the encryption key.

![In AES-ECB the plaintext is split into blocks and each block encrypted separately, with the same key.](img/AES-ECB.webp)

Sounds intuitive, right? However, there is an issue with that approach. Namely, if two incoming plaintext blocks are the same, then the corresponding ciphertext blocks will also be the same. So in some cases, you can infer patterns of the plaintext just by viewing the ciphertext. A good example of this is the encryption of an image as follows:

![Left to Right: original image, encrypted with ECB allowing to dicern patterns, encrypted with mode that results in pseudo-randomness](img/ECB-CBC.webp)

This is why we need some sort of randomness for each block to avoid this issue. One method that is still very commonly used today is [AES-CBC (Cipher Block Chaining) mode](https://en.wikipedia.org/wiki/Block_cipher_mode_of_operation#Cipher_block_chaining_(CBC)). When encrypting, it does not pass the plaintext blocks directly through AES but instead XORs the first block with a unique initialization vector. Then each following block is XORed with the encrypted output of the previous block. That way, the input to the AES block cipher changes every time, even if all plaintext blocks were to be the same:

![In AES-CBC mode plaintext blocks are XORed with the previous ciphertext block.](img/AES-CBC.webp)

Modern modes are more complex than that and can offer even more features, such as [Authenticated Encryption](https://en.wikipedia.org/wiki/Authenticated_encryption). As of 2024, [AES-GCM (Galois/Counter Mode)](https://en.wikipedia.org/wiki/Block_cipher_mode_of_operation#Galois/counter_(GCM)) would be a good choice for many applications. However, AES-CBC is still widely used and can provide security in some settings, but it is susceptible to certain pitfalls.

### The Need for Padding

However, there is another technical hurdle when working with Block Ciphers such as AES. You always need to provide each AES operation with a full block of data, all its inputs need to be utilized. But we don't want to restrict our inputs to always fit these constraints, which is why we need to use padding. For this, [PKCS#7 Padding](https://en.wikipedia.org/wiki/Padding_(cryptography)#PKCS#5_and_PKCS#7) is commonly used. This method checks how many bytes we need to fill up to the next block, then fills that block with bytes containing this value. For example (using hexadecimal numbers to represent each byte):

- If our last plaintext block is 3 bytes too short, we add `[0x03, 0x03, 0x03]`
- If we need 1 byte, we add `[0x01]`
- If the plaintext is already a multiple of the block size, we add a full block of padding `[0x10, 0x10, ..., 0x10]`. (This is needed to always be able to undo the padding unambiguously).

This way, the last byte always indicates the padding length, making it easy to remove after decryption. However, if the padding is not correct, for example `[..., 0x04, 0xab, 0x04, 0x04]` where the last byte is `0x03` but the two bytes before that are not, an error is thrown.

This is where a significant vulnerability can arise. If an attacker can submit some ciphertext for decryption and discern whether there was a padding issue or not, they gain some very specific information about how the plaintext looks after decryption. Multiple such checks on whether a ciphertext is valid, called oracle queries, can now be cleverly combined to recover the plaintext from any ciphertext. This is known as a padding oracle attack, and I will show you in detail how it is done.

## The Vulnerable "MilitaryGradeEncryptor"

To illustrate all of this, we can now finally have a look at our [MilitaryGradeEncryptor](/js/banner/MilitaryGradeEncryptor.js). The object holds some plaintext and a secret key and has a function to encrypt that plaintext using the key. Our goal will be to find out the value of that plaintext without directly accessing it or the secret key. Feel free to look through the source code yourself, just don't trust the misinformed comments within, they are for your entertainment only.

The one part that we are going to look at together is the function that introduces the vulnerability. The class exposes an `isValidCiphertext` function, which tries to decrypt a ciphertext, and will return whether there was a padding error or not. In reality a vulnerable applications might not expose such a function as directly as I've done here. But there are many ways to detect padding errors, maybe the server will not catch the error and return a bad status code, or there might be timing based attacks that would allow the attacker to construct such an oracle themselves.

```js
async isValidCiphertext(ciphertext) {
    try {
        // Import the key and prepare the iv and ciphertext blocks.
        // No vulnerabilities yet
        if (this.imported_key === null) {
            this.imported_key = await crypto.subtle.importKey(
                "raw", this.key, { name: "AES-CBC" }, false, ["encrypt", "decrypt"]
            );
        }
        let iv = ciphertext.subarray(0, 16);
        let blocks = ciphertext.subarray(16);

        // Decrypt the data
        await crypto.subtle.decrypt({ name: "AES-CBC", iv: iv }, this.imported_key, blocks);

        // The decrypt method above validates the padding of the decryption.
        // If we reach this point without error, we know the padding is correct
        return true;

    } catch (err) {
        // If there is a padding error, it will be caught here, and we can
        // return false, which will produce a padding oracle
        if (err.name === "OperationError") {
            return false;
        } else {
            throw err;
        }
    }
}
```

## Exploiting the Padding Oracle

Now let me show you how an attacker could use just this validation function to recover the full plaintext of any ciphertext. First, let us remember how AES-CBC works. We look at the case where there is only a single plaintext block. In our attack we managed to obtain a vaild ciphertext from the MilitaryGradeEncryptor, if we have a single plaintext block the ciphertext will constitute of one block for the initialization vector and one block of the ciphertext. This ciphertext should be decrypted and then XORed with the initialization vector. However, we do not know how AES will un-scramble our ciphertext, so we don't know the block cipher output, and hence we also don't know the plaintext.

![We received an initialization vector and ciphertext, and don't know how it decrypts.](img/AES-CBC-0.svg)

Our goal now is to learn the value of the "block cipher output". Once we learn that value, we can bitwise XOR it with the initialization vector we received and obtain the plaintext. We are not going to find the Key or be able to decrypt the AES block cipher for any input block, as we're limiting ourselves to only learn the block cipher output givent that exact ciphertext and key.

For this, we ignore the original initialization vector for now (we'll be using it again at the end), and start over with a new one, which we set to all zeros. We will pass the all-zero initialization vector with the unchanged ciphertext Block to our padding oracle. Since we did not change the ciphertext block, the block cipher output will remain exactly the same. However, since the plaintext is now XORed with a different data, it will likely have a padding error. We don't have a way of knowing what that plaintext is, but using our padding oracle we can detect the padding error.

![Changing the initialization vector to all zeros will likely give us a padding error.](img/AES-CBC-1.svg)

Again, since the ciphertext remains unchanged, the block cipher output is also the same (and will remain the same for the rest of the attack). We start by trying to learn the value of the last byte of this block cipher output. This is done by trying to achieve a valid padding of 1 byte. As discussed before, a PKCS#7 padding of one byte just means that the last plaintext byte must be a `0x01`. What we can do now is to iterate through all 256 possible values for the last byte of our modified initialization vector. For each of those values, we will tell the `MilitaryGradeEncryptor` to decrypt it and see if it reports a padding error or not. There will always be one value that will give us byte `0x01` at the end of the plaintext, and therefore no padding error. For example, if we noticed that with the last initialization vector byte set to `0xC7` there is no padding error, we know that `0xC7  XOR last block cipher output byte = 0x01`. This can then be re-arranged to find `last block cipher output byte = 0xC7 XOR 0x01`, which when applying bitwise XOR leaves us with a last block cipher output byte of `0xC6` in this example.

Please Note, that since we changed the initialization vector, the value of our plaintext here is not the real plaintext. The real plaintext value can be obtained by XORing the block cipher output with the original initialization vector, which we will do at the end.

*(Side Note: There is a small chance, that you will get a padding that's longer than just one byte which means the last plaintext byte was not `0x01`, but we're ignoring this possibility for brevity here.)*

![We found that setting the last byte of the initialization vector to `0xC7` will give no padding error. Therefore the last byte of the block cipher output must be `0xC7 XOR 0x01 = 0xC6`.](img/AES-CBC-2.svg)

Now we move on to the second-to-last byte. To do this, we will try to achieve padding of length two, so the last two bytes of the plaintext have to be `[0x02, 0x02]` for valid padding. Since we now know the last byte of the block cipher output, we know how to change the last byte of the initialization vector such that the last plaintext byte is `0x02`. However, the second last plaintext byte is probably not correct, so we will likely have a padding error now.

![We set the last byte of the initialization vector to `0x02 XOR 0xC6 = 0xC4`, to make the last plaintext byte `0x02`. There will probably be a padding error.](img/AES-CBC-3.svg)

Let's get rid of that padding error again! We'll try all 256 possible values of the second-to-last byte of the initialization vector until we find a value where the padding error disappears. Just like before, we now also learn the value of the second-to-last block cipher output byte.

![After brute forcing the second-to-last initialization vector we found that `C5` gives no padding error. Therefore the secont-to-last byte of the block cipher output has to be `0xC5 XOR 0x02 = 0xC7`.](img/AES-CBC-4.svg)

We can now repeat this process for the third, fourth, fifth last byte, and so on, until we successfully find an initialization vector that produces a full block of padding `[0x10, 0x10, ..., 0x10]`, at which point we will have learned the value for every byte of the block cipher output. Notice, that for every step we only needed to do at most 256 tries until we found a valid padding, so the total number of tries is bounded by `(2^8) * 16`. We could have also just brute-forced the entire IV at once, but that would have been `2^(8*16)` tries, which would take a lot more time. This difference is because the padding oracle allows us to brute-force each byte one-by-one, which makes the attack feasible.

![After brute forcing the first initialization vector byte, we now know the full block cipher output.](img/AES-CBC-5.svg)

And now comes the time to shine for the original initialization vector that we overwrote with zeros at the beginning. We can replace the initialization vector with the original one. When we XOR it bitwise with the block cipher output we just learned, we will have recovered the real plaintext. In this case, it's the bytes encoding the text "Pascal Schärli", which neatly fits into one block with a single byte of padding.

![Substituting the initialization vector with the original one reveals the plaintext.](img/AES-CBC-6.svg)

This entire process is implemented in [paddingOracleDemo.js](/js/banner/paddingOracleDemo.js), feel free to have a look. It used the `isValidCiphertext` function of the `MilitaryGradeEncryptor` to perform a padding oracle attack as described here. I'm also doing a trick where I'm not only using the original initialization vector at the end to reveal the full plaintext at once, but I'm immediately updating the plaintext after each new block cipher output byte we learned, which results in the letter-by-letter animation you see in my banner. The script also updates the SVG diagram within my banner with the relevant information, updating it in real time.

The attack discussed here works for the first block of the ciphertext. However it can be extended to work with multiple blocks, just view the previous ciphertext block as an initialzation vector, and repeat the attack for every block, which is also implemented in the padding oracle demo.

## Conclusions

As you can see, AES by itself does not guarantee secure cryptography. AES-CBC mode is still widely used, despite its possible pitfalls when applied incorrectly. Any algorithm, no matter how secure it is, can be used in an insecure manner, so any claims of security based solely on the set of algorithms being used should be taken with a grain of salt.

When using AES, you're usually better off using other modes of operations, such as AES-GCM, which, besides mitigating the padding oracle attack, also offers [Authenticated Encryption](https://en.wikipedia.org/wiki/Authenticated_encryption). This means that you can detect if a ciphertext was tampered with, providing an additional layer of security.
