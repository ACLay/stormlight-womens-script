var images = {}

var sounds = ["A", "B", "CH", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "R", "S", "SH", "T", "TH", "U", "V", "Y", "Z"]

function loadImages() {
    return Promise.all(
        sounds.map(sound =>
            fetch("Women's_Script_" + sound + ".svg")
            .then(response => response.text())
            .then(text => (new window.DOMParser()).parseFromString(text, "text/xml"))
            .then(svgNode => {
                console.log(sound, svgNode)
                images[sound] = svgNode.querySelector("g")
            })
        )
    )
}


function generateText(){
    const text = document.getElementById("sourceText").value.trim().toUpperCase()
    let imgWidth = 0
    let imgHeight = 0
    const svg = document.getElementById("drawingArea")

    let previousLines = 0
    for (const line of text.split('\n')) {
        if (previousLines != 0) {
            imgHeight += 50
        }
        let lineWidth = 0
        let lineSounds = 0
        let remainder = line
        while (remainder.length > 0) {
            let sound = remainder.substr(0, 2)
            if (!sounds.includes(sound)) {
                sound = remainder.substr(0, 1)
            }
            if (sounds.includes(sound)) {
                const xOffSet = (151 * lineSounds) - 174.5
                const yOffSet = imgHeight-651.86218

                let glyph = images[sound].cloneNode(true)
                glyph.setAttribute("transform", "translate("+xOffSet+","+yOffSet+")")
                svg.appendChild(glyph)
            } else {
                sound = " "
            }
            lineWidth += 151
            lineSounds += 1
            remainder = remainder.substr(sound.length)
        }
        if (lineWidth > imgWidth) {
            imgWidth = lineWidth
        }
        imgHeight += 301
        previousLines += 1
    }
    svg.setAttribute("width", imgWidth)
    svg.setAttribute("height", imgHeight)
}

window.onload = function(){
    document.getElementById("generateButton").onclick = generateText
    
    loadImages()
    .then(generateText)
}
