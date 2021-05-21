import axios from "axios";

document.addEventListener('DOMContentLoaded', function () {

document.querySelector('button').addEventListener('click', onclick, false)
    function onclick () {
           chrome.tabs.query({currentWindow: true, active: true}, function (tabs) {
             chrome.tabs.sendMessage(tabs[0].id, 'hi', setCount)
           })
     }

     function setCount (res) {
        const div = document.createElement('div')
        div.textContent = `${res.count} pieces \n ${res.href}`
        document.body.appendChild(div)

        const pieces = document.createElement('div')
        pieces.textContent = `Pieces \n ${JSON.stringify(res.all_pieces)}`
        document.body.appendChild(pieces)

     }

    axios.get("https://localhost:4000/").then(
        (response) => {
            console.log(response);
        },
        (error) => {
            console.log(error);
        });
}, false)

