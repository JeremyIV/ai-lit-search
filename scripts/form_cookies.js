// Helper function to set a cookie
function setCookie(name, value, days) {
    const d = new Date();
    d.setTime(d.getTime() + (days*24*60*60*1000));
    const expires = "expires="+d.toUTCString();
    document.cookie = name + "=" + value + ";" + expires + ";path=/";
}

// Helper function to get a cookie value by name
function getCookie(name) {
    const value = "; " + document.cookie;
    const parts = value.split("; " + name + "=");
    if (parts.length === 2) return parts.pop().split(";").shift();
}

function saveFormValues() {
    console.log("saving values!!")
    const apiKey = document.getElementById("apiKey").value;
    const modelChoice = document.getElementById("modelChoice").value;
    const researchTopic = document.getElementById("researchTopic").value;
    const startingPapers = document.getElementById("startingPapers").value;

    setCookie("apiKey", apiKey, 1);
    setCookie("modelChoice", modelChoice, 1);
    setCookie("researchTopic", researchTopic, 1);
    setCookie("startingPapers", startingPapers, 1);
}

function loadFormValues() {
    console.log("Loading values!!")
    document.getElementById("apiKey").value = getCookie("apiKey") || '';
    console.log(getCookie("apiKey"))
    document.getElementById("modelChoice").value = getCookie("modelChoice") || 'gpt-3.5-turbo';
    document.getElementById("researchTopic").value = getCookie("researchTopic") || '';
    document.getElementById("startingPapers").value = getCookie("startingPapers") || '';
}
//window.onload = loadFormValues;
