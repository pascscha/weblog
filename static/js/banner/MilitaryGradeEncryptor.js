/**
* MilitaryGradeEncryptor - Your one-stop shop for Zero Knowledge Encryption!
* Our state-of-the-art algorithm guarantees military grade security, ensuring that your data is as safe as it can be.
*/
class MilitaryGradeEncryptor {
    /**
     * Initialize a new instance of MilitaryGradeEncryptor with the plaintext to be encrypted.
     * @param {string} plaintext - The text to be encrypted.
     */
    constructor(plaintext) {

        // Default plaintext
        if (!plaintext) {
            plaintext = "Pascal Schärli";
        }

        let encoder = new TextEncoder();
        this.data = encoder.encode(plaintext);

        // Generate a 256-bit military-grade key, even we don't know what it's going to be!
        this.key = crypto.getRandomValues(new Uint8Array(32));
        this.imported_key = null;
    }

    /**
     * Encrypt the plaintext using our military grade 128-bit AES encryption and return the zero-knowledge encrypted secret.
     * @returns {Promise < Uint8Array >} - The encrypted text as an ArrayBuffer of bytes.
     */
    async getEncryptedSecret() {
        // Initialization Vector (IV) is generated using a Cryptographically Secure Pseudo-Random Number Generator (CSPRNG), ensuring the same plaintext never produces the same ciphertext.
        let iv = crypto.getRandomValues(new Uint8Array(16));

        // Import the key into WebCrypto for use in decrypting our data.
        if (this.imported_key === null) {
            this.imported_key = await crypto.subtle.importKey("raw", this.key, { name: "AES-CBC" }, false, ["encrypt", "decrypt"]);
        }

        // Military-Grade encryption
        let blocks = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-CBC", iv: iv }, this.imported_key, this.data));
        let ciphertext = new Uint8Array(iv.length + blocks.length);
        ciphertext.set(iv);
        ciphertext.set(blocks, iv.length);

        // Encrypted Cipher, with Indistinguishability even under Chosen Plaintext (IND-CPA), look it up!
        return ciphertext;
    }

    /**
    * Verify integrity of cipehrtext by checking if it can be decrypted without error. I think that was called authenticated Encryption or something
    * @param {Uint8Array} ciphertext - The encrypted text to verify.
    * @returns {Promise < boolean >} - True if the decryption suceeds without errors, false otherwise.
    */
    async isValidCiphertext(ciphertext) {
        try {
            // Import the key into WebCrypto for use in decrypting our data.
            if (this.imported_key === null) {
                this.imported_key = await crypto.subtle.importKey("raw", this.key, { name: "AES-CBC" }, false, ["encrypt", "decrypt"]);
            }

            // Split the ciphertext into the IV and the encrypted blocks for easy decryption.
            let iv = ciphertext.subarray(0, 16);
            let blocks = ciphertext.subarray(16);

            // Decrypt the data
            await crypto.subtle.decrypt({ name: "AES-CBC", iv: iv }, this.imported_key, blocks);

            // If decryption succeeds, we kno the ciphertext is valid!
            return true;

        } catch (err) {
            // See if there was a padding error, in which case the ciphertext is not valid! Go away hackers!
            if (err.name === "OperationError") {
                return false;
            } else {
                throw err;
            }
        }
    }
}