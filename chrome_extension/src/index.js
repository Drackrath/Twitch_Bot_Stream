document.addEventListener('DOMContentLoaded', function () {

    function request() {

    }

document.querySelector('button').addEventListener('click', onclick, false)
    function onclick () {
           chrome.tabs.query({currentWindow: true, active: true}, function (tabs) {
             chrome.tabs.sendMessage(tabs[0].id, 'hi', setCount)
           })
        request();
     }

     async function setCount(res) {
         const div = document.createElement('div')
         div.textContent = `${res.count} pieces \n ${res.href}`
         document.body.appendChild(div)

         let fen = "";

         const board = res.board;

         const pattern = /([1-9])/;

         for (let i = 0; i < 8; i++) {
             for (let j = 0; j < 8; j++) {
                 if (pattern.test(fen.charAt(fen.length - 1)) && typeof board[i][j] == "number") {
                     const temp = fen.charAt(fen.length - 1)
                     fen = fen.substring(0, fen.length - 1)
                     fen += parseInt(temp) + 1;
                 } else {
                     fen += board[i][j];
                 }
             }
             if(i == 7) break;
             fen += '/'
         }

         const url = `http://localhost:4000/fen`
         const x = new XMLHttpRequest();
         x.open('POST', url);
         x.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
         const params = {
             fen: fen,
             nodes: res.nodes
         }

         x.onreadystatechange = await function() {
             if (x.readyState == XMLHttpRequest.DONE) {
                 const div = document.createElement('div')
                 const json = JSON.parse(x.responseText)

                 const div_fen = document.createElement('div')
                 div_fen.textContent = `FEN: ${json.fen}`
                 document.body.appendChild(div_fen)

                 div.textContent = `Bester Zug: ${json.bestmove}  Bedrohung: ${json.ponder}`
                 document.body.appendChild(div)
             }
         }
         x.send(JSON.stringify(params));
     }
}, false)

