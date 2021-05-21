import ChessWebAPI from "chess-web-api";
const ChessAPI = new ChessWebAPI();

export function checkLiveGame() {

    var games, etag;

// Gets the games and stores an etag.
    var trackGames = async function () {
        let response = await ChessAPI.getPlayer('drackrath');

        let game = await ChessAPI.getGameByID(15355972633);

        games = response.body.games;
        etag = response.headers.etag;

        console.log(game.body)
        //console.log(response.body);

        // runs checkGames every 10 seconds.
    }



    var checkGames = async function () {
        // Makes the request but with ifChanged
        let gamesChanged = await ChessAPI.ifChanged(etag, ChessAPI.getPlayer, ['drackrath']);

        // Updates variables if new data is available.
        console.log(gamesChanged);
/*
        if (gamesChanged.changed) {
            games = gamesChanged.response.body.games;
            etag = gamesChanged.response.headers.etag;
        }*/
    }



    //setInterval(trackGames, 10000);

    trackGames()

}