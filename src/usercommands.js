//const ChessWebAPI = require('chess-web-api');
import ChessWebAPI from "chess-web-api";
import {getDBConnection, splitCommand} from "./app";

const ChessAPI = new ChessWebAPI();


let greedcount = 1;

function talkResponseTwitchChat(channel, tags, message, client) {
    const con = getDBConnection();

    const alias_discord = [
        '!discord',
        '!dc'
    ]

    const alias_team = [
        '!team',
        '!club'
    ]

    const alias_list = [
        '!list',
        '!queue'
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
            ['!elo', ``],
            ['!zitat', ``],
            ['!coinflip', (Math.round(Math.random())? "/me Ich gewinne!" : "/me Du verlierst!")],
            [alias_list, null],
            ['!margarine', `@${tags['username']} sagt, dass alles in Margarine ist.`],
            [alias_team, `@${tags['username']} trete hier meinem Team bei: https://www.chess.com/club/drackrath`]
        ]


    const splitcom = splitCommand(message)

    commandList.forEach(commandTuple => {
        if (Array.isArray(commandTuple[0]) == true && splitcom[1] == '' && commandTuple[1] != null) {
            console.log("Command has Aliases" + commandTuple)
            commandTuple[0].forEach(alias => {
                console.log("Message: " + message.toLowerCase() + " Alias: " + alias + " equals: " + (message.toLowerCase() === alias))
                if (message.toLowerCase() === alias) {
                    client.say(channel, commandTuple[1]);
                    return;
                }
            })
        }
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
            if(commandTuple[0] == commandList[11][0]){
                getChessPlayer(channel, client);
            }
            client.say(channel, commandTuple[1]);
        }
    })

    if (message.toLowerCase() === commandList[3][0]) {
        greedcount++;
        return;
    }

    if(alias_list.indexOf(message.toLowerCase()) > -1){
        console.log("QUEUE / LIST");
        getQueue(channel, client)
        return;
    }
}



function getQueue(channel, client) {
    const con = getDBConnection();

    let queuelist = '';
    con.query(`SELECT q.*, u.username FROM Queue q JOIN Users u ON q.user_id = u.user_id WHERE q.isdeleted = 0`, function (err, result, fields) {
        if (err) throw err;
        result.forEach(user => {
            queuelist += user.username + ', ';
        })
        client.say(channel, "Warteliste: " + queuelist);
    });

    return;
}

function getRandomCite(channel, client) {
    const con = getDBConnection();

    con.query(`SELECT z.*, u.username FROM Zitate z JOIN Users u ON z.user_id = u.user_id WHERE isdeleted = 0 ORDER BY RAND() LIMIT 1`, function (err, result, fields) {
        if (err) throw err;
        const user = result[0].username;
        const date = new Date(result[0].datetime);
        const text = result[0].text;
        const zitat_id = result[0].zitat_id;

        client.say(channel, "\"" + text + "\" - " + user + " " + (date.getFullYear() !== 9999? date.getDate() + "/" + ((date.getMonth() + 1) + "/" + date.getFullYear()) : "") + " - No°" + zitat_id);
    });
}

function getCite(channel, client, pzitat_id){
    const con = getDBConnection();

    con.query(`SELECT z.*, u.username FROM Zitate z JOIN Users u ON z.user_id = u.user_id WHERE isdeleted = 0 AND z.zitat_id = ${pzitat_id}`, function (err, result, fields) {
        if (err) throw err;
        if(result[0] == null) return;

        const user = result[0].username;
        const date = new Date(result[0].datetime);
        const text = result[0].text;
        const zitat_id = result[0].zitat_id;

        console.log(date);

        client.say(channel, ("\"" + text + "\" - " + user + " " + ((date.getFullYear() !== 9999)? (date.getDate() + "/" + ((date.getMonth() + 1) + "/" + date.getFullYear())) : "") + " - No°" + zitat_id));
    });
}

function getChessPlayer(channel, client) {
    ChessAPI.getPlayerStats('drackrath')
        .then(function(response) {
            console.log('Player Profile', response.body);
            let result = "@drackrath's chess.com elo is: ";
            result += "Bullet: " + response.body.chess_bullet.last.rating;
            result += " Blitz: " + response.body.chess_blitz.last.rating;
            result += " Rapid: " + response.body.chess_rapid.last.rating;
            console.log(result);
            client.say(channel, result);
        }, function(err) {
           // console.error(err);
        });
}


export {talkResponseTwitchChat}