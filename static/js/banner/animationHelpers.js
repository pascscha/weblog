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

            var textElements = diagram.querySelectorAll("div");
            textElements.forEach(function (element) {
                var text = element.textContent;
                var match = text.match(/^([CIOP])([0-9A-F])$/);

                if (match) {
                    var type, index;
                    diagramElements[match[1]][parseInt(match[2], 16)] = element;
                }
            })
        })
    return diagramElements;
}