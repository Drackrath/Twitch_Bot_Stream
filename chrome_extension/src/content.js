//alert('Grrr.')
'use strict';

const href = window.location.href
const splithref = href.split("/");
const id = splithref[splithref.length-1]
const pattern = /([1-9])/;

//document.querySelectorAll(".wr.")

if(pattern.test(splithref[splithref.length-1])){
    const url = `http://localhost:4000/newgame`
    console.log(url + " " + id)
    const x = new XMLHttpRequest();
    x.open('POST', url);
    x.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    x.send(JSON.stringify({
        id: id
    }));
}

setTimeout(content,1000);

function content() {

    const pieces = document.querySelectorAll(".piece");

    pieces.forEach(element => {

        const id = element.classList[1] + element.classList[2].split("-")[1];

        element.id = id;
        element = document.getElementById(`${id}`);
        element.prevState = JSON.parse(JSON.stringify(element.classList));

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                const {target} = mutation;

                if (mutation.attributeName === 'class') {
                    const currentState = mutation.target.classList
                    if (element.prevState[2] !== currentState[2]) {
                        element.prevState = JSON.parse(JSON.stringify(currentState));
                        console.log(`class ${currentState}`);
                        const remodel = remodelChessNodes();
                        const count = setCount(remodel[2], remodel[3]);

                        console.log("REMODEL: ")
                        console.log(remodel)
                    }
                }
            });
        });

        observer.observe(element, {
            attributes: true,
            attributeOldValue: true,
            attributeFilter: ['class']
        });

    })


    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {

        const remodel = remodelChessNodes()

        const pieces = {
            length: remodel[0]
        }
        const allpieces = remodel[1]
        const board = remodel[2]
        const nodes = remodel[3]

        sendResponse({
            count: pieces.length,
            href: href,
            all_pieces: allpieces,
            board: board,
            nodes: nodes
        })


    })


    function remodelChessNodes() {

        // Get current state ( Pieces from the Board )
        const pieces = document.querySelectorAll(".piece");  // Get all Pieces

        let allpieces = []

        pieces.forEach(p => { // Map pieces into relevant information
            const splitclassname = p.className.split(" ");
            const piece = {
                name: splitclassname[1],
                square: splitclassname[2].split("-")[1],
            }
            allpieces.push(piece)
        })

        let board = [
            [1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1]
        ]

        allpieces.forEach(piece => { // Fill the board with all pieces and create FEN-Notation
            let x_axis = parseInt(piece.square.charAt(0)) - 1;
            let y_axis = parseInt(piece.square.charAt(1)) - 1;

            const s_y_axis = y_axis;

            switch (s_y_axis) {
                case 0:
                    y_axis = 7;
                    break;
                case 1:
                    y_axis = 6;
                    break;
                case 2:
                    y_axis = 5;
                    break;
                case 3:
                    y_axis = 4;
                    break;
                case 4:
                    y_axis = 3;
                    break;
                case 5:
                    y_axis = 2;
                    break;
                case 6:
                    y_axis = 1;
                    break;
                case 7:
                    y_axis = 0;
                    break;
            }

            const fenname = piece.name.charAt(0) == 'w' ? piece.name.charAt(1).toUpperCase() : piece.name.charAt(1)

            board[y_axis][x_axis] = fenname
        })

        const div_nodes = document.querySelectorAll(".move div")

        const nodes = []

        div_nodes.forEach(n => {
            if (n.classList[0] == "white" || n.classList[0] == "black") {
                const node = {
                    side: n.classList[0],
                    move: n.innerHTML,
                }
                nodes.push(node)
            }
        })

        console.log("NODES")
        console.log(nodes)

        return [pieces.length, allpieces, board, nodes]
    }
}

async function setCount(board, nodes) {

    let fen = "";

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
        if (i == 7) break;
        fen += '/'
    }

    const url = `http://localhost:4000/fen`
    const x = new XMLHttpRequest();
    x.open('POST', url);
    x.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    const params = {
        fen: fen,
        nodes: nodes
    }

    x.onreadystatechange = await function () {
        if (x.readyState == XMLHttpRequest.DONE) {

            const id_bestmovefrom = "bestmovefrom"
            const id_bestmoveto = "bestmoveto"

            const json = JSON.parse(x.responseText)
            console.log(`Bester Zug: ${json.bestmove}  Bedrohung: ${json.ponder}`)
            let divfrom, divto;
            if(document.getElementById(id_bestmovefrom) == null || document.getElementById('bestmoveto') == null){
                divfrom = document.createElement('div');
                divto = document.createElement('div');
            }else{
                divfrom = document.getElementById(id_bestmovefrom);
                divto = document.getElementById('bestmoveto');
            }

            let x_axis_to = json.bestmove.charAt(json.bestmove.length -2)
            const y_axis_to = json.bestmove.charAt(json.bestmove.length -1)


            let x_axis_from = json.bestmove.charAt(json.bestmove.length -4)
            let y_axis_from = json.bestmove.charAt(json.bestmove.length -3)

            const array = ["a", "b", "c", "d", "e", "f", "g", "h"]
            x_axis_to = array.indexOf(x_axis_to)+1;
            x_axis_from = array.indexOf(x_axis_from)+1;

            divfrom.className="highlight square-" + x_axis_from + y_axis_from
            divfrom.style= "background-color: rgb(255, 0, 255); opacity: 0.3;";
            divfrom.id = id_bestmovefrom

            divto.className="highlight square-" + x_axis_to + y_axis_to
            divto.style= "background-color: rgb(255, 0, 255); opacity: 0.5;";
            divto.id = id_bestmoveto

            if(document.getElementById(id_bestmovefrom) == null || document.getElementById('bestmoveto') == null){
                const refnode = document.body.querySelector(".coordinates.outside");

                document.body.querySelector(".board").insertBefore(divfrom, refnode);
                document.body.querySelector(".board").insertBefore(divto, refnode);
            }

        }
    }
    x.send(JSON.stringify(params));
}

/*
 var params = {
         "range":"Sheet1!A4:C4",
         "majorDimension": "ROWS",
         "values": [
             ["Hello World","123", "456"]
         ],
     }

const url = `http://localhost:4000/newgame`

console.log(url + " " + id)

const x = new XMLHttpRequest();
x.open('POST', url);
x.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
x.onload = function () {
    alert(x.responseText);
};

x.send(JSON.stringify(params));

 */