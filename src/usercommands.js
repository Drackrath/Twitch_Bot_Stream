//const ChessWebAPI = require('chess-web-api');
import ChessWebAPI from "chess-web-api";
import {connectToDatabase, splitCommand} from "./app";

const ChessAPI = new ChessWebAPI();
const con = connectToDatabase();

let greedcount = 1;

function talkResponseTwitchChat(channel, tags, message, client) {

    const alias_discord = [
        '!discord',
        '!dc'
    ]

    const commandList =
        [
            ['!wp', '/me Excellent SeemsGood'],
            //TODO: League of Legends API abfragen
            // ['!smurf', 'FunnyOs: $(leagueoflegends FunnyOs euw) |  Lœx: $(leagueoflegends Lœx euw)'],
            // ['!elo', '$(leagueoflegends Radnaxel euw)'],

            ['!lag', '/me Danke und jetzt darfst du mit laggen, sodass sich der Lag mit dir synchronisiert.'],
            ['!omg', '/me OH MY GOD ! NotLikeThis NotLikeThis PJSalt'],
            //TODO FIX IT
            ['!gg', '/me GOOOD GAAAME !! Poooound'],
            ['!delay', '/me Erzähl mir wie groß mein Delay ist SeriousSloth'],
            [alias_discord, '/me Join my Discord: https://discord.gg/muVYP5hZpY Enjoy SeemsGood'],
            ['!unlurk', `/me Willkommen Zurück! ${tags.username} VirtualHug`],
            ['!lurk', `/me Viel Spaß beim Lurken ${tags.username} ! PopCorn`],
            ['!name', `/me Bekommst du nicht LUL`],
            ['!bsg', `/me Bitte keine Zugvorschläge FootYellow`],
            ['!clap', `/me Clap drackrFacepalm `],
            ['!rank', `/me Clap drackrFacepalm ${getChessPlayer()}`],
            ['!zitat', ``]
        ]


    commandList.forEach(commandTuple => {
        if (Array.isArray(commandTuple[0]) == true) {
            commandTuple[0].forEach(alias => {
                if (message.toLowerCase() === alias) {
                    client.say(channel, commandTuple[1]);
                }
            })
        }

        const splitcom = splitCommand(message)

        if (splitcom[0] === commandTuple[0]) {
            if(commandTuple[0] == commandList[12][0]){

                console.log("ZITAT COMMAND")
                const isnumber = !isNaN(parseInt(splitcom[1]))

                console.log("NUMBER: " + isnumber + " SPLITCOM: " + splitcom[1])

                if(splitcom[1] == ''){
                    getRandomCite(channel, client);
                }else if(isnumber){
                    getCite(channel, client, splitcom[1])
                }
                return;
            }
            client.say(channel, commandTuple[1]);
        }
    })

    if (message.toLowerCase() === commandList[3][0]) {
        greedcount++;
    }
}


function getRandomCite(channel, client) {
    con.query(`SELECT z.*, u.username FROM Zitate z JOIN Users u ON z.user_id = u.user_id WHERE isdeleted = 0 ORDER BY RAND() LIMIT 1`, function (err, result, fields) {
        if (err) throw err;
        const user = result[0].username;
        const date = new Date(result[0].datetime);
        const text = result[0].text;
        const zitat_id = result[0].zitat_id;

        console.log(date);

        client.say(channel, ("\"" + text + "\" - " + user + " " + date.getDate() + "/" + (date.getMonth() + 1) + "/" + date.getFullYear() + " - No°" + zitat_id));
    });
}

function getCite(channel, client, pzitat_id){
    con.query(`SELECT z.*, u.username FROM Zitate z JOIN Users u ON z.user_id = u.user_id WHERE isdeleted = 0 AND z.zitat_id = ${pzitat_id}`, function (err, result, fields) {
        if (err) throw err;
        if(result[0] == null) return;

        const user = result[0].username;
        const date = new Date(result[0].datetime);
        const text = result[0].text;
        const zitat_id = result[0].zitat_id;

        console.log(date);

        client.say(channel, ("\"" + text + "\" - " + user + " " + date.getDate() + "/" + (date.getMonth() + 1) + "/" + date.getFullYear() + " - No°" + zitat_id));
    });
}

function getChessPlayer() {
    ChessAPI.getPlayerStats('drackrath')
        .then(function(response) {
           // console.log('Player Profile', response.body);
        }, function(err) {
           // console.error(err);
        });
}

export {talkResponseTwitchChat}