var images = {}

var sounds = ["A", "B", "CH", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "R", "S", "SH", "T", "TH", "U", "V", "Y", "Z"]

for (const sound of sounds) {
    var request = new XMLHttpRequest();
    const listener = function(){
        console.log(sound)
        console.log(this.responseXML)
        images[sound] = this.responseXML.documentElement.querySelector("g")
    }
    request.addEventListener("load", listener)
    request.open("GET", "Women's_Script_" + sound + ".svg")
    request.send()
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
    document.getElementById("generateButton").onclick = this.generateText
}
