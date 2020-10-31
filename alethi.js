const Alethi = {
    borderSize : 5,
    lineHeight : 61,
    lineSpacing : 10,
    wordSpacing : 10,

    images : new Map(),
    imageWidths : new Map(),

    symbols : ["A", "B", "CH", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "R", "S", "SH", "T", "TH", "U", "V", "Y", "Z","]["],

    tokens : new Set(["A", "B", "CH", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "R", "S", "SH", "T", "TH", "U", "V", "Y", "Z","]["," "]),

    charSubstitutions : new Map(),

    wordSubstitutions : new Map(),

    imageUrl : null,
}

Alethi.loadImages = function loadImages() {
    return Promise.all(
        Alethi.symbols.map(symbol =>
            fetch("symbols/" + symbol + ".svg")
            .then(response => response.text())
            .then(text => text.replace(/stroke:#[0-9a-fA-F]*;?/g, ''))
            .then(text => text.replace(/stroke-width:[0-9a-zA-Z]*;?/g, ''))
            .then(text => (new window.DOMParser()).parseFromString(text, "text/xml"))
            .then(svgNode => {
                console.log(symbol, svgNode)
                Alethi.images.set(symbol, svgNode.querySelector("g"))
                Alethi.imageWidths.set(symbol, parseInt(svgNode.documentElement.getAttribute("width")))
            })
        )
    )
}

Alethi.loadDefaultWordSubstitutions = function loadDefaultWordSubstitutions() {
    const defaults = "YOU YU\nSON SUN\nQUEUE KYU"
    const textArea = document.getElementById("wordSubstitutionText")
    if (textArea.value !== defaults) {
        textArea.value = defaults
    }
}

Alethi.loadDefaultCharSubstitutions = function loadDefaultCharSubstitutions() {
    const defaults = "CK K\nC K\nQ K\nW U\nX KS\n| ]["
    const textArea = document.getElementById("charSubstitutionText")
    if (textArea.value !== defaults) {
        textArea.value = defaults
    }
}

Alethi.regenerateWordSubstitutions = function regenerateWordSubstitutions() {
    const substitutions = Alethi.generateSubstitutions("wordSubstitutionText", "wordSubstitutionError", escaped => new RegExp(`^${escaped}$`))
    if (substitutions !== null) {
        Alethi.wordSubstitutions = substitutions
        Alethi.generateText()
    }
}

Alethi.regenerateCharSubstitutions = function regenerateCharSubstitutions() {
    const substitutions = Alethi.generateSubstitutions("charSubstitutionText", "charSubstitutionError", escaped => new RegExp(escaped, 'g'))
    if (substitutions !== null) {
        Alethi.charSubstitutions = substitutions
        Alethi.generateText()
    }
}

Alethi.generateSubstitutions = function generateSubstitutions(textInputId, errorOutputId, regexGen) {
    const substitutions = new Map()
    const errors = []
    const text = document.getElementById(textInputId).value.toUpperCase()
    let lineNo = 0
    for (let line of text.split('\n')) {
        line = line.trim()
        lineNo += 1
        if (line.length > 0) {
            const parts = line.split(' ')
            if (parts.length === 2) {
                // Regex character escaper from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
                const escaped = parts[0].replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&')
                const input = regexGen(escaped)
                const output = parts[1]
                // check for valid WS symbols in output
                substitutions.set(input, output)
            } else {
                errors.push(`Line ${lineNo} should be two parts separated by a space`)
            }
        }
    }
    document.getElementById(errorOutputId).innerText = errors.join(", ")
    if (errors.length !== 0) {
        return null
    }
    return substitutions
}

Alethi.getSubstitutedLines = function getSubstitutedLines() {
    let rawLines = document.getElementById("sourceText").value
        .trim()
        .toUpperCase()
        .split("\n")
    const subbedLines = []
    for (let rawLine of rawLines) {
        const rawWords = rawLine.split(" ")
        const subbedWords = []
        for (let word of rawWords) {
            let subbed = false
            for (let [regex, symbols] of Alethi.wordSubstitutions) {
                if (regex.test(word)) {
                    subbedWords.push(symbols)
                    subbed = true
                    break
                }
            }
            if (!subbed) {
                Alethi.charSubstitutions.forEach((tokens, regex) =>
                    word = word.replace(regex, tokens)
                )
                subbedWords.push(word)
            }
        }
        subbedLines.push(subbedWords.join(" "))
    }
    return subbedLines;
}

Alethi.getTokenRows = function getTokenRows() {
    let lines = Alethi.getSubstitutedLines()
    const autoHeightMarkers = document.getElementById("autoHeightMarkCheckbox").checked
    const tokenRows = []
    let newParagraph = true
    for (let line of lines) {
        line = line.trim()
        const tokenRow = []
        if (line.length > 0) {
            if (autoHeightMarkers && newParagraph && !line.startsWith("][")) {
                tokenRow.push("][")
            }
            newParagraph = false
        } else {
            newParagraph = true
        }
        let index = 0
        while (index < line.length) {
            let token = line.substr(index, 2)
            if (!Alethi.tokens.has(token)) {
                token = line.substr(index, 1)
            }
            if (Alethi.tokens.has(token)) {
                tokenRow.push(token)
            }
            index += token.length
        }
        tokenRows.push(tokenRow)
    }
    return tokenRows
}

Alethi.generateText = function generateText() {
    let imgWidth = 0
    let imgHeight = 0
    const svg = document.getElementById("drawingArea")
    while (svg.hasChildNodes()) {
        svg.removeChild(svg.firstChild)
    }
    Alethi.setBackground()
    Alethi.setForeground()

    const italicAngle = document.getElementById("italicsAngleInput").value
    const italicOffset = Alethi.lineHeight * Math.tan(italicAngle*Math.PI/180)

    const rowSymbolGroups = []
    const rowWidths = []
    const tokenRows = Alethi.getTokenRows()
    for (let i = 0; i < tokenRows.length; i++) {
        if (i != 0) {
            imgHeight += Alethi.lineSpacing
        }
        let rowWidth = 0
        if (italicOffset < 0) {
            rowWidth -= italicOffset
        }
        const rowSymbolGroup = document.createElementNS("http://www.w3.org/2000/svg", "g")
        for (const token of tokenRows[i]) {
            if (token != " ") {
                const symbol = Alethi.images.get(token).cloneNode(true)
                symbol.setAttribute("transform", "translate("+rowWidth+",0)")
                rowSymbolGroup.appendChild(symbol)
                rowWidth += Alethi.imageWidths.get(token)
            } else {
                rowWidth += Alethi.wordSpacing
            }
        }
        if (italicOffset > 0) {
            rowWidth += italicOffset
        }
        if (rowWidth > imgWidth) {
            imgWidth = rowWidth
        }
        svg.appendChild(rowSymbolGroup)
        rowWidths.push(rowWidth)
        rowSymbolGroups.push(rowSymbolGroup)
        imgHeight += Alethi.lineHeight
    }

    const align = document.querySelector("input[name=align]:checked").value
    const scale = document.getElementById("scaleInput").value
    let yOffset = Alethi.borderSize
    for (let i = 0; i < rowSymbolGroups.length; i++) {
        const group = rowSymbolGroups[i]
        const width = rowWidths[i]
        let xOffset = Alethi.borderSize + italicOffset
        if (align == "center") {
            xOffset += Math.round((imgWidth - width) / 2)
        } else if (align == "right") {
            xOffset += imgWidth - width
        }
        group.setAttribute("transform", "scale("+scale+") translate("+xOffset+","+yOffset+") skewX("+(-italicAngle)+")")
        yOffset += Alethi.lineHeight + Alethi.lineSpacing
    }
    svg.setAttribute("width", (imgWidth + 2 * Alethi.borderSize) * scale)
    svg.setAttribute("height", (imgHeight + 2 * Alethi.borderSize) * scale)
    const description = document.createElementNS("http://www.w3.org/2000/svg", "desc")
    description.textContent = "The text '" + document.getElementById("sourceText").value + "' displayed in womens script from The Stormlight Archive"
    svg.appendChild(description)
    Alethi.displayImage()
}

Alethi.displayImage = function displayImage() {
    const format = document.querySelector("input[name=format]:checked").value

    const svg = document.getElementById("drawingArea")
    const data = (new XMLSerializer()).serializeToString(svg)


    const domURL = window.URL || window.webkitURL || window
    const svgBlob = new Blob([data], {type: "image/svg+xml;charset=utf-8"})
    if (Alethi.imageUrl != null) {
        domURL.revokeObjectURL(Alethi.imageUrl)
    }
    Alethi.imageUrl = domURL.createObjectURL(svgBlob)
    const imageTag = document.getElementById("outputImage")

    if (format == "svg") {
        // Load the svg blob into the DOM
        imageTag.src = Alethi.imageUrl
    } else if (format == "png") {
        // Render the svg blob to a png blob, and load that into the DOM
        const canvas = document.createElement("canvas")
        const context = canvas.getContext("2d")
        canvas.width = svg.getAttribute("width")
        canvas.height = svg.getAttribute("height")

        const image = new Image()
        image.onload = function(){
            context.drawImage(image, 0, 0, svg.getAttribute("width"), svg.getAttribute("height"))
            domURL.revokeObjectURL(Alethi.imageUrl)
            canvas.toBlob((blob) => {
                Alethi.imageUrl = domURL.createObjectURL(blob)
                imageTag.src = Alethi.imageUrl
            })
        }
        image.src = Alethi.imageUrl
    }
}

Alethi.setBackground = function setBackground() {
    const transparent = document.getElementById("transparentBgCheckbox").checked
    if (!transparent) {
        const colour = document.getElementById("bgColourPicker").value
        const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect")
        bg.setAttribute("width", "100%")
        bg.setAttribute("height", "100%")
        bg.setAttribute("fill", colour)
        const svg = document.getElementById("drawingArea")
        svg.insertBefore(bg, svg.firstChild)
    }
}

Alethi.setForeground = function setForeground() {
    const colour = document.getElementById("fgColourPicker").value
    const scale = document.getElementById("scaleInput").value
    const width = document.getElementById("strokeWidthInput").value / scale
    const style = "stroke:"+colour+";stroke-width:"+width+"px;"
    for (const symbol of Alethi.images.values()) {
        symbol.setAttribute("style", style)
    }
}

window.onload = function() {
    var ua = window.navigator.userAgent;
    var isIE = /MSIE|Trident/.test(ua);
    if (!isIE) {
        document.getElementById("IEWarning").className = "hidden"
    }

    document.getElementById("sourceText").value =
        "Szeth son son Vallano\n" +
        "Truthless of Shinovar\n" +
        "wore white on the day\n" +
        "he was to kill a king"

    document.querySelectorAll("input, #sourceText").forEach((input) => {
        input.onchange = Alethi.generateText
    })
    document.getElementById("wordSubstitutionText").onchange = Alethi.regenerateWordSubstitutions
    document.getElementById("charSubstitutionText").onchange = Alethi.regenerateCharSubstitutions
    document.getElementById("resetWordSubstitutionButton").onclick = Alethi.loadDefaultWordSubstitutions
    document.getElementById("resetCharSubstitutionButton").onclick = Alethi.loadDefaultCharSubstitutions

    Alethi.loadImages()
    .then(Alethi.loadDefaultWordSubstitutions)
    .then(Alethi.loadDefaultCharSubstitutions)
    .then(Alethi.regenerateCharSubstitutions)
    .then(Alethi.generateText)
}
