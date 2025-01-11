/**
 * XOR two byte arrays of the same length.
 * @param {Uint8Array} a - The first byte array.
 * @param {Uint8Array} b - The second byte array.
 * @returns {Uint8Array} The result of XORing the two byte arrays.
 * @throws {Error} If the input arrays do not have the same length.
 */
function xor(a, b) {
    if (a.length !== b.length) {
        throw new Error("Input arrays must have the same length");
    }
    let result = new Uint8Array(a.length);
    for (let i = 0; i < a.length; i++) {
        result[i] = a[i] ^ b[i];
    }
    return result;
}

function visualize(visualizationElements, ciphertext, modifiedCiphertext, blockOutput, paddingLength) {
    var modifiedPlaintext = xor(blockOutput, modifiedCiphertext.subarray(0, 16));
    var plaintext = xor(blockOutput, ciphertext.subarray(0, 16));


    for (let i = 0; i <= 15; i++) {
        visualizationElements["I"][i].textContent = modifiedCiphertext[i].toString(16).toUpperCase().padStart(2, '0');
        visualizationElements["C"][i].textContent = modifiedCiphertext[i + 16].toString(16).toUpperCase().padStart(2, '0');
        if (16 - i > paddingLength) {
            visualizationElements["O"][i].textContent = "?";
            visualizationElements["P"][i].textContent = "?";
        }
        else {
            visualizationElements["O"][i].textContent = blockOutput[i].toString(16).toUpperCase().padStart(2, '0');
            visualizationElements["P"][i].textContent = modifiedPlaintext[i].toString(16).toUpperCase().padStart(2, '0');
        }
        if (16 - i >= paddingLength) {
            plaintext[i] = 32;
        }
    }

    // hack to make the "ä" in my name appear smoother, does not generalize for all strings
    var text = new TextDecoder().decode(plaintext.subarray(0, 15));
    if (text.includes("�")) {
        text = text.replaceAll("�", "¨");
    }
    if (!text.includes("ä")) {
        text = text.substring(1);
    }

    visualizationElements["T"].innerHTML = text.replaceAll(" ", "&nbsp;");
}

/**
 * Decrypt a single block of ciphertext using a padding oracle attack.
 * @param {Uint8Array} ciphertext - The ciphertext block to decrypt (32 bytes: previous block + current block).
 * @param {Object} encryptor - The encryption oracle object with an isValidCiphertext method.
 * @param {Object} visualizationElements - The HTML elements used for visualization
 * @param {Number} delay - The delay
 * @returns {Promise<Uint8Array>} The decrypted plaintext block.
 */
async function decryptBlockWithPaddingOracle(ciphertext, encryptor, visualizationElements, delay) {
    let blockOutput = new Uint8Array(16);
    for (let paddingLength = 1; paddingLength <= 16; paddingLength++) {

        let padding = new Uint8Array(16).fill(0);
        for (let i = 16 - paddingLength; i < 16; i++) {
            padding[i] = paddingLength;
        }

        for (let guess = 0; guess < 256; guess++) {
            blockOutput[16 - paddingLength] = guess ^ paddingLength;
            let modifiedCiphertext = new Uint8Array(ciphertext);
            modifiedCiphertext.set(xor(blockOutput, padding));

            if (await encryptor.isValidCiphertext(modifiedCiphertext)) {
                if (visualizationElements) {
                    visualize(visualizationElements, ciphertext, modifiedCiphertext, blockOutput, paddingLength);
                }

                if (delay) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                }

                break;
            }
        }
    }

    visualize(visualizationElements, ciphertext, ciphertext, blockOutput, 17);

    return xor(blockOutput, ciphertext.subarray(0, 16));
}

/**
 * Decrypt the entire ciphertext using a padding oracle attack.
 * @param {Uint8Array} ciphertext - The ciphertext to decrypt (including IV).
 * @param {Object} encryptor - The encryption oracle object with an isValidCiphertext method.
 * @returns {Promise<string>} The decrypted plaintext.
 */
async function decryptWithPaddingOracle(ciphertext, encryptor) {
    let plaintext = new Uint8Array(ciphertext.length - 16);
    for (let idx = 0; idx < ciphertext.length - 16; idx += 16) {
        let plaintextBlock = await decryptBlockWithPaddingOracle(ciphertext.subarray(idx, idx + 32), encryptor);
        plaintext.set(plaintextBlock, idx);
    }

    let truncated = plaintext.slice(0, -plaintext[plaintext.length - 1]);
    return new TextDecoder().decode(truncated);
}
