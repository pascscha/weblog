async function getDiagramElements(diagramID) {
    var diagramElements = { C: {}, I: {}, O: {}, P: {} };
    for (let i = 0; i <= 15; i++) {
        for (let key in diagramElements) {
            diagramElements[key][i] = undefined;
        }
    }

    // Animate Padding oracle
    await fetch('/img/AES-CBC.svg')
        .then(response => response.text())
        .then(data => {
            // Inline the SVG
            var diagram = document.getElementById(diagramID)
            diagram.innerHTML = data;

            // Find animated text elements by ID (e.g., "P0", "O1", "C2", "I3")
            var allTexts = diagram.querySelectorAll("text[id]");
            allTexts.forEach(function (element) {
                var match = element.id.match(/^([CIOP])([0-9A-F])$/);
                if (match) {
                    diagramElements[match[1]][parseInt(match[2], 16)] = element;
                }
            })
        })
    return diagramElements;
}