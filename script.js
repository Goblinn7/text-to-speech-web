// ==========================
// INIT
// ==========================
const speech = new SpeechSynthesisUtterance();
let voices = [];

const voiceSelect = document.querySelector(".row select");
const textarea = document.querySelector("textarea");
const previewBox = document.getElementById("correctionPreview");
const listenBtn = document.getElementById("listenBtn");
const canvas = document.getElementById("posterCanvas");

const translateBtn = document.getElementById("translateBtn");
const translationResult = document.getElementById("translationResult");

const fromLangSelect = document.getElementById("fromLang");
const toLangSelect = document.getElementById("toLang");
const swapBtn = document.getElementById("swapLang");

let translatedText = "";
let detectedLang = "";

let typingTimer;
const delay = 1000;
let controller;

let bgIndex = 0;


// ==========================
// BACKGROUND IMAGES
// ==========================
const backgrounds = [
    "images/Background.png"
];


// ==========================
// LANGUAGE SWAP
// ==========================
swapBtn.addEventListener("click", () => {

    let temp = fromLangSelect.value;
    fromLangSelect.value = toLangSelect.value;
    toLangSelect.value = temp;

});


// ==========================
// SIMPLE LANGUAGE DETECT
// ==========================
function detectLanguage(text){

    const indonesianWords = [
        "saya","nama","kamu","dia","makan","minum",
        "rumah","sekolah","belajar","halo"
    ];

    const lower = text.toLowerCase();

    for(let word of indonesianWords){
        if(lower.includes(word)){
            return "id";
        }
    }

    return "en";

}


// ==========================
// LOAD VOICES
// ==========================
window.speechSynthesis.onvoiceschanged = () => {

    voices = window.speechSynthesis.getVoices();
    voiceSelect.innerHTML = "";

    voices.forEach((voice, i) => {

        const option = new Option(`${voice.name} (${voice.lang})`, i);
        voiceSelect.appendChild(option);

    });

    if (voices.length > 0) {
        speech.voice = voices[0];
    }

};

voiceSelect.addEventListener("change", () => {
    speech.voice = voices[voiceSelect.value];
});


// ==========================
// PLAY AUDIO
// ==========================
listenBtn.addEventListener("click", () => {

    const text = textarea.value.trim();
    if (!text) return;

    window.speechSynthesis.cancel();

    speech.text = text;

    window.speechSynthesis.speak(speech);

});


// ==========================
// TRANSLATE FEATURE
// ==========================
translateBtn.addEventListener("click", async () => {

    const text = textarea.value.trim();

    if (!text) {
        alert("Please write text first!");
        return;
    }

    translationResult.innerHTML = "Translating...";

    let fromLang = fromLangSelect.value;
    let toLang = toLangSelect.value;

    // AUTO DETECT
    if(fromLang === "auto"){
        fromLang = detectLanguage(text);
        detectedLang = fromLang;
    }

    // FIX jika bahasa sama
    if(fromLang === toLang){

        if(fromLang === "en"){
            toLang = "id";
        }else{
            toLang = "en";
        }

    }

    try {

        const response = await fetch(
            "https://api.mymemory.translated.net/get?q=" +
            encodeURIComponent(text) +
            "&langpair=" + fromLang + "|" + toLang
        );

        const data = await response.json();

        if (
            data &&
            data.responseData &&
            data.responseData.translatedText
        ) {

            translatedText = data.responseData.translatedText;

        } else {

            translatedText = "Translation not available";

        }

        translationResult.innerHTML =
        `
        🌍 Detected: <b>${fromLang.toUpperCase()}</b><br>
        🌍 Translation: <b>${translatedText}</b>
        `;

    } catch (error) {

        console.error("Translate error:", error);

        translationResult.innerHTML =
            "❌ Translation failed";

    }

});


// ==========================
// AUTO GRAMMAR CHECK
// ==========================
textarea.addEventListener("input", () => {

    clearTimeout(typingTimer);

    typingTimer = setTimeout(() => {
        checkGrammarPreview(textarea.value);
    }, delay);

});


async function checkGrammarPreview(text) {

    if (!text.trim()) {
        previewBox.style.display = "none";
        return;
    }

    if (controller) controller.abort();
    controller = new AbortController();

    try {

        const response = await fetch(
            "https://api.languagetool.org/v2/check",
            {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/x-www-form-urlencoded"
                },
                body: new URLSearchParams({
                    text: text,
                    language: "en-US"
                }),
                signal: controller.signal
            }
        );

        const data = await response.json();

        if (!data.matches || data.matches.length === 0) {
            previewBox.style.display = "none";
            return;
        }

        let correctedText = text;
        let offset = 0;

        data.matches.forEach(match => {

            if (match.replacements.length > 0) {

                const suggestion =
                    match.replacements[0].value;

                const start = match.offset + offset;
                const end = start + match.length;

                correctedText =
                    correctedText.substring(0, start) +
                    suggestion +
                    correctedText.substring(end);

                offset += suggestion.length - match.length;

            }

        });

        if (correctedText !== text) {

            previewBox.style.display = "block";

            previewBox.innerHTML = `
            ✨ AI Correction:
            <span style="color:#00ffd5;font-weight:bold;">
            ${correctedText}
            </span><br>
            <small>Klik untuk mengganti teks asli</small>
            `;

            previewBox.onclick = () => {

                textarea.value = correctedText;
                previewBox.style.display = "none";

            };

        }

    } catch (error) {

        previewBox.style.display = "none";

    }

}


// ==========================
// DRAW POSTER
// ==========================
function drawPoster(text) {

    return new Promise((resolve) => {

        const ctx = canvas.getContext("2d");

        canvas.width = 800;
        canvas.height = 1000;

        const img = new Image();

        img.onload = () => {

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            ctx.fillStyle = "rgba(0,0,0,0.5)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.textAlign = "center";

            ctx.fillStyle = "white";
            ctx.font = "bold 42px Arial";

            ctx.fillText(
                "English Learning Mode",
                canvas.width / 2,
                80
            );

            ctx.fillStyle = "#cccccc";
            ctx.font = "bold 24px Arial";

            ctx.fillText(
                "Original",
                canvas.width / 2,
                160
            );

            ctx.fillStyle = "white";
            ctx.font = "28px Arial";

            wrapText(
                ctx,
                text,
                canvas.width / 2,
                200,
                700,
                40
            );

            if (translatedText) {

                ctx.fillStyle = "#cccccc";
                ctx.font = "bold 24px Arial";

                ctx.fillText(
                    "Translation/Terjemahan",
                    canvas.width / 2,
                    450
                );

                ctx.fillStyle = "#E0E0E0";
                ctx.font = "28px Arial";

                wrapText(
                    ctx,
                    translatedText,
                    canvas.width / 2,
                    500,
                    700,
                    40
                );

            }

            resolve();

        };

        img.src = backgrounds[bgIndex];

    });

}


// ==========================
// TEXT WRAP
// ==========================
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {

    const words = text.split(" ");
    let line = "";

    for (let n = 0; n < words.length; n++) {

        const testLine = line + words[n] + " ";
        const testWidth = ctx.measureText(testLine).width;

        if (testWidth > maxWidth && n > 0) {

            ctx.fillText(line, x, y);

            line = words[n] + " ";
            y += lineHeight;

        } else {

            line = testLine;

        }

    }

    ctx.fillText(line, x, y);

}


// ==========================
// GENERATE POSTER
// ==========================
async function generatePoster() {

    const text = textarea.value.trim();

    if (!text)
        return alert("Please write text first!");

    window.speechSynthesis.cancel();

    canvas.style.display = "block";

    await drawPoster(text);

    speech.text = text;

    window.speechSynthesis.speak(speech);

}