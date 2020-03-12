const Alethi = {
    borderSize : 5,
    lineHeight : 61,
    lineSpacing : 10,
    wordSpacing : 10,
}

const images = new Map()
const imageWidths = new Map()

const sounds = ["A", "B", "CH", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "R", "S", "SH", "T", "TH", "U", "V", "Y", "Z","]["]

const stringSounds = new Map([
    ["A", "A"],
    ["B", "B"],
    ["C", "K"],
    ["D", "D"],
    ["E", "E"],
    ["F", "F"],
    ["G", "G"],
    ["H", "H"],
    ["I", "I"],
    ["J", "J"],
    ["K", "K"],
    ["L", "L"],
    ["M", "M"],
    ["N", "N"],
    ["O", "O"],
    ["P", "P"],
    ["Q", "K"],
    ["R", "R"],
    ["S", "S"],
    ["T", "T"],
    ["U", "U"],
    ["V", "V"],
    ["W", "U"],
    ["Y", "Y"],
    ["Z", "Z"],
    ["CH", "CH"],
    ["SH", "SH"],
    ["TH", "TH"],
    ["][", "]["], // max line height indicator
    [" ", " "],
])

let svgUrl = null

function loadImages() {
    return Promise.all(
        sounds.map(sound =>
            fetch("symbols/" + sound + ".svg")
            .then(response => response.text())
            .then(text => text.replace(/stroke:#[0-9a-fA-F]*;?/g, ''))
            .then(text => text.replace(/stroke-width:[0-9a-zA-Z]*;?/g, ''))
            .then(text => (new window.DOMParser()).parseFromString(text, "text/xml"))
            .then(svgNode => {
                console.log(sound, svgNode)
                images.set(sound, svgNode.querySelector("g"))
                imageWidths.set(sound, parseInt(svgNode.documentElement.getAttribute("width")))
            })
        )
    )
}

function getSymbols() {
    let text = document.getElementById("sourceText").value.trim().toUpperCase()
    const autoHeightMarkers = document.getElementById("autoHeightMarkCheckbox").checked
    text = text.trim()
        .replace(/X/g, "KS")
        .replace(/\|/g, "][")
    const lines = []
    let newParagraph = true
    for (let line of text.split('\n')) {
        line = line.trim()
        const symbols = []
        if (line.length > 0) {
            if (autoHeightMarkers && newParagraph && !line.startsWith("][")) {
                symbols.push("][")
            }
            newParagraph = false
        } else {
            newParagraph = true
        }
        let index = 0
        while (index < line.length) {
            let sound = line.substr(index, 2)
            if (!stringSounds.has(sound)) {
                sound = line.substr(index, 1)
            }
            if (stringSounds.has(sound)) {
                symbols.push(stringSounds.get(sound))
            }
            index += sound.length
        }
        lines.push(symbols)
    }
    return lines
}

function generateText(){
    let imgWidth = 0
    let imgHeight = 0
    const svg = document.getElementById("drawingArea")
    while (svg.hasChildNodes()) {
        svg.removeChild(svg.firstChild)
    }
    setBackground()
    setForeground()

    const italicAngle = document.getElementById("italicsAngleInput").value
    const italicOffset = Alethi.lineHeight * Math.tan(italicAngle*Math.PI/180)

    const lineGroups = []
    const lineWidths = []
    const lines = getSymbols()
    for (let i = 0; i < lines.length; i++) {
        if (i != 0) {
            imgHeight += Alethi.lineSpacing
        }
        let lineWidth = 0
        if (italicOffset < 0) {
            lineWidth -= italicOffset
        }
        const lineGroup = document.createElementNS("http://www.w3.org/2000/svg", "g")
        for (const symbol of lines[i]) {
            if (symbol != " ") {
                const glyph = images.get(symbol).cloneNode(true)
                glyph.setAttribute("transform", "translate("+lineWidth+",0)")
                lineGroup.appendChild(glyph)
                lineWidth += imageWidths.get(symbol)
            } else {
                lineWidth += Alethi.wordSpacing
            }
        }
        if (italicOffset > 0) {
            lineWidth += italicOffset
        }
        if (lineWidth > imgWidth) {
            imgWidth = lineWidth
        }
        svg.appendChild(lineGroup)
        lineWidths.push(lineWidth)
        lineGroups.push(lineGroup)
        imgHeight += Alethi.lineHeight
    }

    const align = document.querySelector("input[name=align]:checked").value
    const scale = document.getElementById("scaleInput").value
    let yOffset = Alethi.borderSize
    for (let i = 0; i < lineGroups.length; i++) {
        const group = lineGroups[i]
        const width = lineWidths[i]
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
    displayImage()
}

function displayImage() {
    const format = document.querySelector("input[name=format]:checked").value

    const svg = document.getElementById("drawingArea")
    const data = (new XMLSerializer()).serializeToString(svg)


    const domURL = window.URL || window.webkitURL || window
    var svgBlob = new Blob([data], {type: "image/svg+xml;charset=utf-8"})
    if (svgUrl != null) {
        domURL.revokeObjectURL(svgUrl)
    }
    svgUrl = domURL.createObjectURL(svgBlob)
    const imageTag = document.getElementById("outputImage")

    if (format == "svg") {
        imageTag.src = svgUrl
    } else if (format == "png") {
        const canvas = document.createElement("canvas")
        const context = canvas.getContext("2d")
        canvas.width = svg.getAttribute("width")
        canvas.height = svg.getAttribute("height")

        var image = new Image()
        image.onload = function(){
            context.drawImage(image, 0, 0, svg.getAttribute("width"), svg.getAttribute("height"))
            imageTag.src = canvas.toDataURL()
        }
        image.src = svgUrl
    }
}

function setBackground() {
    const svg = document.getElementById("drawingArea")
    const transparentBox = document.getElementById("transparentBgCheckbox")
    let style = ""
    if (!transparentBox.checked) {
        const picker = document.getElementById("bgColourPicker")
        style = "background-color: "+picker.value+";"
    }
    svg.setAttribute("style", style)
}

function setForeground() {
    const colour = document.getElementById("fgColourPicker").value
    const scale = document.getElementById("scaleInput").value
    const width = document.getElementById("strokeWidthInput").value / scale
    const style = "stroke:"+colour+";stroke-width:"+width+"px;"
    for (const symbol of images.values()) {
        symbol.setAttribute("style", style)
    }
}

window.onload = function(){
    document.getElementById("sourceText").value =
        "Szeth son son Vallano\n" +
        "Truthless of Shinovar\n" +
        "wore white on the day\n" +
        "he was to kill a king"

    document.querySelectorAll("input, textarea").forEach((input) => {
        input.onchange = generateText
    })

    loadImages()
    .then(generateText)
}
