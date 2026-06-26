async function getDiagramElements(diagramID) {
    var diagramElements = { C: {}, I: {}, O: {}, P: {} };
    for (let i = 0; i <= 15; i++) {
        for (let key in diagramElements) {
            diagramElements[key][i] = undefined;
        }
    }

    var diagram = document.getElementById(diagramID)
    var allTexts = diagram.querySelectorAll("text[id]");
    allTexts.forEach(function (element) {
        var match = element.id.match(/^([CIOP])([0-9A-F])$/);
        if (match) {
            diagramElements[match[1]][parseInt(match[2], 16)] = element;
        }
    })

    return diagramElements;
}