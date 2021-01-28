const Alethi = {
    borderSize : 5,
    lineHeight : 61,
    lineSpacing : 10,
    wordSpacing : 10,

    images : new Map(),
    imageWidths : new Map(),

    // The womens script symbols that need lines drawn
    symbols : ["A", "B", "CH", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "R", "S", "SH", "T", "TH", "U", "V", "Y", "Z","]["],

    tokens : new Set(), // All substrings that affect how a line is rendered (symbols and space). Generated on page load.

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
    return Alethi.loadSubstitutions("defaultSubstitutions/word.txt", "wordSubstitutionText")
}

Alethi.loadDefaultCharSubstitutions = function loadDefaultCharSubstitutions() {
    return Alethi.loadSubstitutions("defaultSubstitutions/character.txt", "charSubstitutionText")
}

Alethi.loadSubstitutions = function loadSubstitutions(path, targetTextareaId) {
    const textArea = document.getElementById(targetTextareaId)
    return fetch(path)
        .then(response => response.text())
        .then(text => text.trim())
        .then(text => {
            const different = textArea.value !== text
            textArea.value = text
            return different
        })
}

Alethi.regexEscape = function regexEscape(string) {
    // Regex special character escaper from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
    return string.replace(/[.*+\-?^${}()|[\]\\]/g, "\\$&")
}

Alethi.regenerateWordSubstitutions = function regenerateWordSubstitutions() {
    const substitutions = Alethi.generateSubstitutions("wordSubstitutionText", "wordSubstitutionError", word => new RegExp(`^${Alethi.regexEscape(word)}$`))
    if (substitutions !== null) {
        Alethi.wordSubstitutions = substitutions
        Alethi.generateText()
    }
}

Alethi.regenerateCharSubstitutions = function regenerateCharSubstitutions() {
    const regexBuilder = inputString => {
        const escapedInput = Alethi.regexEscape(inputString)
        const remainderMatcher = Alethi.symbols
            .filter(symbol => symbol.startsWith(inputString))
            .map(symbol => symbol.substring(inputString.length))
            .map(Alethi.regexEscape)
            .join("|")
        if (remainderMatcher.length > 0) {
            // when replacing C's, only look for one's that aren't the start of CH symbols
            return new RegExp(`${escapedInput}(?!${remainderMatcher})`, "g")
        }
        return new RegExp(escapedInput, "g")
    }
    const substitutions = Alethi.generateSubstitutions("charSubstitutionText", "charSubstitutionError", regexBuilder)
    if (substitutions !== null) {
        Alethi.charSubstitutions = substitutions
        Alethi.generateText()
    }
}

Alethi.generateSubstitutions = function generateSubstitutions(textInputId, errorOutputId, regexGen) {
    const tokenRemover = new RegExp(`(.*?)(${Alethi.symbols.map(Alethi.regexEscape).join("|")}|\\\\)`, "g")
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
                const input = regexGen(parts[0])
                const output = parts[1]
                // check for valid WS symbols in output. If only symbols are present, the empty string will be returned
                if (output.replace(tokenRemover, "$1").length === 0) {
                    substitutions.set(input, output)
                } else {
                    errors.push(`#${lineNo} "${line}" does not map only to women's script symbols`)
                }
            } else {
                errors.push(`#${lineNo} "${line}" should be two parts separated by a space`)
            }
        }
    }
    document.getElementById(errorOutputId).innerText = errors.join(", ")
    if (errors.length !== 0) {
        return null
    }
    return substitutions
}

Alethi.getRawLines = function getRawLines() {
    return document.getElementById("sourceText").value
    .trim()
    .toUpperCase()
    .split("\n")
}

Alethi.getSubstitutedLines = function getSubstitutedLines(rawLines) {
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

Alethi.getTokenRows = function getTokenRows(substitutedLines) {
    const autoHeightMarkers = document.getElementById("autoHeightMarkCheckbox").checked
    const tokenRows = []
    let newParagraph = true
    for (let line of substitutedLines) {
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
    const tokenRows = Alethi.getTokenRows(Alethi.getSubstitutedLines(Alethi.getRawLines()))
    //console.log(JSON.stringify(tokenRows)) // write tokens to generate tokenising test suite entries
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
    const svgBlob = new Blob([data], {type: "image/svg+xml"})
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

Alethi.testTokenisation = function testTokenisation(verbose = false) {
    const results = new Map([
        ["pass", 0],
        ["fail", 0]
    ])
    const tester = (expectedTokens, text) => {
        const subbedLines = Alethi.getSubstitutedLines(text.toUpperCase().split("\n"))
        const generatedTokens = Alethi.getTokenRows(subbedLines)
        generatedRepr = JSON.stringify(generatedTokens)
        expectedRepr = JSON.stringify(expectedTokens)
        const equal = generatedRepr === expectedRepr
        if (equal) {
            results.set("pass", results.get("pass") + 1)
            if (verbose) {
                console.log(["pass", text])
            }
        } else {
            results.set("fail", results.get("fail") + 1)
            if (verbose) {
                console.log(["fail", text, subbedLines, generatedTokens, generatedRepr, expectedRepr])
            }
        }
    }
    tests = new Map([
        // Way of Kings - Navani's notebook - pain knife
        [
            "Cold gravity pain heat wind",
            [["][","K","O","L","D"," ","G","R","A","V","I","T","Y"," ","P","A","I","N"," ","H","E","A","T"," ","U","I","N","D"]]
        ],
        [
            "The cut and type of the\ngem determines what kind of\nspren are attracted to it\nand can be imprisoned in it",
            [["][","TH","E"," ","K","U","T"," ","A","N","D"," ","T","Y","P","E"," ","O","F"," ","TH","E"],["J","E","M"," ","D","E","T","E","R","M","I","N","E","S"," ","U","H","A","T"," ","K","I","N","D"," ","O","F"],["S","P","R","E","N"," ","A","R","E"," ","A","T","T","R","A","K","T","E","D"," ","T","O"," ","I","T"],["A","N","D"," ","K","A","N"," ","B","E"," ","I","M","P","R","I","S","O","N","E","D"," ","I","N"," ","I","T"]]
        ],
        [
            "there must be thousands of viable combinations",
            [["][","TH","E","R","E"," ","M","U","S","T"," ","B","E"," ","TH","O","U","S","A","N","D","S"," ","O","F"," ","V","I","A","B","L","E"," ","K","O","M","B","I","N","A","T","I","O","N","S"]]
        ],
        [
            "Remove outer covering\nto infuse fabrial with\nstormlight",
            [["][","R","E","M","O","V","E"," ","O","U","T","E","R"," ","K","O","V","E","R","I","N","G"],["T","O"," ","I","N","F","U","S","E"," ","F","A","B","R","I","A","L"," ","U","I","TH"],["S","T","O","R","M","L","I","G","H","T"]]
        ],
        [
            "Once a spren is captured and the\ngem infused with stormlight the\nfabrial can be used in machines",
            [["][","O","N","S","E"," ","A"," ","S","P","R","E","N"," ","I","S"," ","K","A","P","T","U","R","E","D"," ","A","N","D"," ","TH","E"],["J","E","M"," ","I","N","F","U","S","E","D"," ","U","I","TH"," ","S","T","O","R","M","L","I","G","H","T"," ","TH","E"],["F","A","B","R","I","A","L"," ","K","A","N"," ","B","E"," ","U","S","E","D"," ","I","N"," ","M","A","CH","I","N","E","S"]]
        ],
        [
            "The pain knife is used\nas a means of protection\nSharp blades pierce an\nattackers clothing and\ncause crippling pain",
            [["][","TH","E"," ","P","A","I","N"," ","K","N","I","F","E"," ","I","S"," ","U","S","E","D"],["A","S"," ","A"," ","M","E","A","N","S"," ","O","F"," ","P","R","O","T","E","K","T","I","O","N"],["SH","A","R","P"," ","B","L","A","D","E","S"," ","P","I","E","R","S","E"," ","A","N"],["A","T","T","A","K","E","R","S"," ","K","L","O","TH","I","N","G"," ","A","N","D"],["K","A","U","S","E"," ","K","R","I","P","P","L","I","N","G"," ","P","A","I","N"]]
        ],
        [
            "Retractable blades cause crippling pain\nDial pushes blades to four set lengths",
            [["][","R","E","T","R","A","K","T","A","B","L","E"," ","B","L","A","D","E","S"," ","K","A","U","S","E"," ","K","R","I","P","P","L","I","N","G"," ","P","A","I","N"],["D","I","A","L"," ","P","U","SH","E","S"," ","B","L","A","D","E","S"," ","T","O"," ","F","O","U","R"," ","S","E","T"," ","L","E","N","G","TH","S"]]
        ],
        // Way of Kings - Navani's notebook - emotion bracelet
        [
            "The pattern cannot be seen by the naked eye",
            [["][","TH","E"," ","P","A","T","T","E","R","N"," ","K","A","N","N","O","T"," ","B","E", " ","S","E","E","N"," ","B","Y"," ","TH","E"," ","N","A","K","E","D"," ","E","Y","E"]]
        ],
        [
            "Examples of stormlight patterns",
            [["][","E","K","S","A","M","P","L","E","S"," ","O","F"," ","S","T","O","R","M","L","I","G","H","T"," ","P","A","T","T","E","R","N","S"]]
        ],
        [
            "Patterns of stormlight filtered\nthrough the fabrial determine\nthe power of the gem",
            [["][","P","A","T","T","E","R","N","S"," ","O","F"," ","S","T","O","R","M","L","I","G","H","T"," ","F","I","L","T","E","R","E","D"],["TH","R","O","U","G","H"," ","TH","E"," ","F","A","B","R","I","A","L"," ","D","E","T","E","R","M","I","N","E"],["TH","E"," ","P","O","U","E","R"," ","O","F"," ","TH","E"," ","J","E","M"]]
        ],
        [
            "Fabrials allow creation of things\nlike the emotion bracelet made of\nten fabrials working together",
            [["][","F","A","B","R","I","A","L","S"," ","A","L","L","O","U"," ","K","R","E","A","T","I","O","N"," ","O","F"," ","TH","I","N","G","S"],["L","I","K","E"," ","TH","E"," ","E","M","O","T","I","O","N"," ","B","R","A","S","E","L","E","T"," ","M","A","D","E"," ","O","F"],["T","E","N"," ","F","A","B","R","I","A","L","S"," ","U","O","R","K","I","N","G"," ","T","O","G","E","TH","E","R"]]
        ],
        [
            "Man betrayed by a close friend",
            [["][","M","A","N"," ","B","E","T","R","A","Y","E","D"," ","B","Y"," ","A"," ","K","L","O","S","E"," ","F","R","I","E","N","D"]]
        ],
        [
            "Woman who has just been proposed to",
            [["][","U","O","M","A","N"," ","U","H","O"," ","H","A","S"," ","J","U","S","T"," ","B","E","E","N"," ","P","R","O","P","O","S","E","D"," ","T","O"]]
        ],
        [
            "Man who discovered his betrothed lied to him",
            [["][","M","A","N"," ","U","H","O"," ","D","I","S","K","O","V","E","R","E","D"," ","H","I","S"," ","B","E","T","R","O","TH","E","D"," ","L","I","E","D"," ","T","O"," ","H","I","M"]]
        ],
        [
            "Mother at wedding of only son",
            [["][","M","O","TH","E","R"," ","A","T"," ","U","E","D","D","I","N","G"," ","O","F"," ","O","N","L","Y"," ","S","O","N"]]
        ],
        [
            "Anticipation\nanger\ndisgust\nsadness\nlove\nhate\njoy\ntrust\nfear\nsurprise",
            [["][","A","N","T","I","S","I","P","A","T","I","O","N"],["A","N","G","E","R"],["D","I","S","G","U","S","T"],["S","A","D","N","E","S","S"],["L","O","V","E"],["H","A","T","E"],["J","O","Y"],["T","R","U","S","T"],["F","E","A","R"],["S","U","R","P","R","I","S","E"]]
        ],
        [
            "The trick of the emotion bracelet is first\nlearning to read it and second learning\nto tell if the bracelet is reading your emotions, your subject's\nemotions, or the emotions of the person in the next room over",
            [["][","TH","E"," ","T","R","I","K"," ","O","F"," ","TH","E"," ","E","M","O","T","I","O","N"," ","B","R","A","S","E","L","E","T"," ","I","S"," ","F","I","R","S","T"],["L","E","A","R","N","I","N","G"," ","T","O"," ","R","E","A","D"," ","I","T"," ","A","N","D"," ","S","E","K","O","N","D"," ","L","E","A","R","N","I","N","G"],["T","O"," ","T","E","L","L"," ","I","F"," ","TH","E"," ","B","R","A","S","E","L","E","T"," ","I","S"," ","R","E","A","D","I","N","G"," ","Y","O","U","R"," ","E","M","O","T","I","O","N","S"," ","Y","O","U","R"," ","S","U","B","J","E","K","T","S"],["E","M","O","T","I","O","N","S"," ","O","R"," ","TH","E"," ","E","M","O","T","I","O","N","S"," ","O","F"," ","TH","E"," ","P","E","R","S","O","N"," ","I","N"," ","TH","E"," ","N","E","K","S","T"," ","R","O","O","M"," ","O","V","E","R"]]
        ],
        // Words of Radiance - Navani's notebook - archery tower
        [
            "Fabrial for an archer tower",
            [["][","F","A","B","R","I","A","L"," ","F","O","R"," ","A","N"," ","A","R","CH","E","R"," ","T","O","U","E","R"]]
        ],
        [
            "Reversal principle of conjoined\ncompounded custom cut amethysts",
            [["][","R","E","V","E","R","S","A","L"," ","P","R","I","N","S","I","P","L","E"," ","O","F"," ","K","O","N","J","O","I","N","E","D"],["K","O","M","P","O","U","N","D","E","D"," ","K","U","S","T","O","M"," ","K","U","T"," ","A","M","E","TH","Y","S","T","S"]]
        ],
        [
            "Aids in drying bowstrings",
            [["][","A","I","D","S"," ","I","N"," ","D","R","Y","I","N","G"," ","B","O","U","S","T","R","I","N","G","S"]]
        ],
        [
            "Idea\n\nArchers during the weeping",
            [["][","I","D","E","A"],[],["][","A","R","CH","E","R","S"," ","D","U","R","I","N","G"," ","TH","E"," ","U","E","E","P","I","N","G"]]
        ],
        // Oathbringer - Navani's notebook - skyships
        [
            "Too fanciful ha",
            [["][","T","O","O"," ","F","A","N","S","I","F","U","L"," ","H","A"]]
        ],
        [
            "Ask Rushu how to\nkeep the mast from\nripping off",
            [["][","A","S","K"," ","R","U","SH","U"," ","H","O","U"," ","T","O"],["K","E","E","P"," ","TH","E"," ","M","A","S","T"," ","F","R","O","M"],["R","I","P","P","I","N","G"," ","O","F","F"]]
        ],
        [
            "Jasnah's favorite",
            [["][","J","A","S","N","A","H","S"," ","F","A","V","O","R","I","T","E"]]
        ],
        // Oathbringer - Navani's notebook - swiss army watch
        [
            "Touch the gems in the correct combination to\nrelease a shock from the front nodes that will\nincapacitate an attacker",
            // This tokenisation differs from the illustration. Unlike in Way of Kings, a G is used at the start of GEM. I switched it to J for consistency.
            [["][","T","O","U","CH"," ","TH","E"," ","J","E","M","S"," ","I","N"," ","TH","E"," ","K","O","R","R","E","K","T"," ","K","O","M","B","I","N","A","T","I","O","N"," ","T","O"],["R","E","L","E","A","S","E"," ","A"," ","SH","O","K"," ","F","R","O","M"," ","TH","E"," ","F","R","O","N","T"," ","N","O","D","E","S"," ","TH","A","T"," ","U","I","L","L"],["I","N","K","A","P","A","S","I","T","A","T","E"," ","A","N"," ","A","T","T","A","K","E","R"]]
        ],
        [
            "top view\nside view\nstormpiece\ntimepiece",
            [["][","T","O","P"," ","V","I","E","U"],["S","I","D","E"," ","V","I","E","U"],["S","T","O","R","M","P","I","E","S","E"],["T","I","M","E","P","I","E","S","E"]]
        ],
        // Oathbringer - End ketek
        [
            "United\nnew beginnings sing\n][Defying truth\nlove\nTruth defy\n][Sing beginnings\nnew unity",
            [["][","U","N","I","T","E","D"],["N","E","U"," ","B","E","G","I","N","N","I","N","G","S"," ","S","I","N","G"],["][","D","E","F","Y","I","N","G"," ","T","R","U","TH"],["L","O","V","E"],["T","R","U","TH"," ","D","E","F","Y"],["][","S","I","N","G"," ","B","E","G","I","N","N","I","N","G","S"],["N","E","U"," ","U","N","I","T","Y"]]
        ]
    ])
    tests.forEach(tester)
    console.log(results)
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

    Alethi.tokens = new Set(Alethi.symbols).add(" ")
    document.querySelectorAll(".symbolList").forEach(element => {
        element.innerText = Alethi.symbols.join(", ")
    })
    document.getElementById("symbolDisplay").innerHTML = Alethi.symbols
        .map(symbol => `<img src="symbols/${symbol}.svg"><p>${symbol}</p>`)
        .join("")
        .replace("<p>][</p>","<p>][<br>(line height)</p>")

    Alethi.loadImages()
    .then(Alethi.loadDefaultWordSubstitutions)
    .then(Alethi.loadDefaultCharSubstitutions)
    .then(Alethi.regenerateWordSubstitutions)
    .then(Alethi.regenerateCharSubstitutions)
    .then(Alethi.generateText)
}
