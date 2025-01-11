async function updateDiagrams() {
    let encryptor = new MilitaryGradeEncryptor("Pascal Schärli");

    let ciphertext = await encryptor.getEncryptedSecret();

    const diagramElements0 = await getDiagramElements('aes-cbc-0');

    for (let i = 0; i <= 15; i++) {
        diagramElements0["I"][i].textContent = ciphertext[i].toString(16).toUpperCase().padStart(2, '0');
        diagramElements0["C"][i].textContent = ciphertext[i + 16].toString(16).toUpperCase().padStart(2, '0');
        diagramElements0["O"][i].textContent = "?";
        diagramElements0["P"][i].textContent = "?";
    }

    const diagramElements1 = await getDiagramElements('aes-cbc-1');
    let blockOutput = new Uint8Array(16);
    let paddingLength = 1;


    let padding = new Uint8Array(16).fill(0);
    for (let i = 16 - paddingLength; i < 16; i++) {
        padding[i] = paddingLength;
    }

    for (let guess = 0; guess < 256; guess++) {
        blockOutput[16 - paddingLength] = guess ^ paddingLength;
        let modifiedCiphertext = new Uint8Array(ciphertext);
        modifiedCiphertext.set(xor(blockOutput, padding));

        if (await encryptor.isValidCiphertext(modifiedCiphertext)) {
            for (let i = 0; i <= 15; i++) {
                diagramElements1["I"][i].textContent = modifiedCiphertext[i].toString(16).toUpperCase().padStart(2, '0');
                diagramElements1["C"][i].textContent = modifiedCiphertext[i + 16].toString(16).toUpperCase().padStart(2, '0');
                diagramElements1["O"][i].textContent = "?";
                diagramElements1["P"][i].textContent = "?";
            }
            diagramElements1["P"][15].textContent = 0x01.toString(16).toUpperCase().padStart(2, '0');
            diagramElements1["O"][15].textContent = blockOutput[15].toString(16).toUpperCase().padStart(2, '0');
        }
    }



}

afterRenderHooks.push(updateDiagrams)