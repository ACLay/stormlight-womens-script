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
])

function getFirstSound(text) {
    let sound = text.substr(0, 2)
    if (!stringSounds.has(sound)) {
        sound = text.substr(0, 1)
    }
    return stringSounds.get(sound)
}

function loadImages() {
    return Promise.all(
        sounds.map(sound =>
            fetch("symbols/" + sound + ".svg")
            .then(response => response.text())
            .then(text => text.replace(/stroke:#[0-9a-fA-F]*;?/g, ''))
            .then(text => (new window.DOMParser()).parseFromString(text, "text/xml"))
            .then(svgNode => {
                console.log(sound, svgNode)
                images.set(sound, svgNode.querySelector("g"))
                imageWidths.set(sound, parseInt(svgNode.documentElement.getAttribute("width")))
            })
        )
    )
}


function generateText(){
    const text = document.getElementById("sourceText").value.trim().toUpperCase()
    const autoHeightMarkers = document.getElementById("autoHeightMarkCheckbox").checked
    let imgWidth = 0
    let imgHeight = 0
    const svg = document.getElementById("drawingArea")
    while (svg.hasChildNodes()) {
        svg.removeChild(svg.firstChild)
    }

    let previousLines = 0
    let newParagraph = true
    const lineGroups = []
    const lineWidths = []
    for (const line of text.split('\n')) {
        if (previousLines != 0) {
            imgHeight += Alethi.lineSpacing
        }
        let lineWidth = 0
        let remainder = line
            .trim()
            .replace(/X/g, "KS")
            .replace(/\|/g, "][")
        if (remainder.length > 0) {
            if (autoHeightMarkers && newParagraph && !remainder.startsWith("][")) {
                remainder = "][" + remainder
            }
            newParagraph = false
        } else {
            newParagraph = true
        }
        const lineGroup = document.createElementNS("http://www.w3.org/2000/svg", "g")
        while (remainder.length > 0) {
            let sound = getFirstSound(remainder)
            if (sounds.includes(sound)) {
                const glyph = images.get(sound).cloneNode(true)
                glyph.setAttribute("transform", "translate("+lineWidth+",0)")
                lineGroup.appendChild(glyph)
                lineWidth += imageWidths.get(sound)
            } else {
                sound = " "
                lineWidth += Alethi.wordSpacing
            }
            remainder = remainder.substr(sound.length)
        }
        if (lineWidth > imgWidth) {
            imgWidth = lineWidth
        }
        svg.appendChild(lineGroup)
        lineWidths.push(lineWidth)
        lineGroups.push(lineGroup)
        imgHeight += Alethi.lineHeight
        previousLines += 1
    }

    const centered = document.getElementById("centeredCheckbox").checked
    let yOffset = Alethi.borderSize
    for (let i = 0; i < lineGroups.length; i++) {
        const group = lineGroups[i]
        const width = lineWidths[i]
        let xOffset = Alethi.borderSize
        if (centered) {
            xOffset += Math.round((imgWidth - width) / 2)
        }
        group.setAttribute("transform", "translate("+xOffset+","+yOffset+")")
        yOffset += Alethi.lineHeight + Alethi.lineSpacing
    }
    
    svg.setAttribute("width", imgWidth + 2 * Alethi.borderSize)
    svg.setAttribute("height", imgHeight + 2 * Alethi.borderSize)
    displayImage()
}

function displayImage() {
    const canvas = document.createElement("canvas")
    const context = canvas.getContext("2d")
    const svg = document.getElementById("drawingArea")

    canvas.width = svg.getAttribute("width")
    canvas.height = svg.getAttribute("height")

    const data = (new XMLSerializer()).serializeToString(svg)
    const domURL = window.URL || window.webkitURL || window

    var image = new Image()
    var svgBlob = new Blob([data], {type: "image/svg+xml;charset=utf-8"})
    var url = domURL.createObjectURL(svgBlob)

    image.onload = function(){
        context.drawImage(image, 0, 0, svg.getAttribute("width"), svg.getAttribute("height"))
        domURL.revokeObjectURL(url)
        const imageTag = document.getElementById("outputImage")
        imageTag.src = canvas.toDataURL()
    }
    image.src = url
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
    const picker = document.getElementById("fgColourPicker")
    const style = "stroke:"+picker.value
    for (const symbol of images.values()) {
        symbol.setAttribute("style", style)
    }
}

window.onload = function(){
    document.getElementById("generateButton").onclick = generateText
    document.getElementById("bgColourPicker").onchange = setBackground
    document.getElementById("transparentBgCheckbox").onchange = setBackground
    document.getElementById("fgColourPicker").onchange = setForeground
    
    document.getElementById("sourceText").value =
        "Szeth son son Vallano\n" +
        "Truthless of Shinovar\n" +
        "wore white on the day\n" +
        "he was to kill a king"

    loadImages()
    .then(() => {
        setBackground()
        setForeground()
        generateText()
    })
}
