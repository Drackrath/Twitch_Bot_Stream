import tmi from 'tmi.js'
import {
    BOT_USERNAME,
    CHANNEL_NAME,
    CLIENT_ID, CLIENT_SECRET,
    OAUTH_TOKEN, OAUTH_TOKEN_PREDICTIONS, OAUTH_TOKEN_REDEMPTIONS, USER_ID
} from "./constants";
import mysql from "mysql";
import {customModeratorCommands} from "./modcommands";
import {filterTwitchChat} from "./botbehaviour";
import {collectVotes, customMixedcommands} from "./mixedcommands";
import {talkResponseTwitchChat} from "./usercommands";
import trackevents from "./events";
import axios from "axios";
import {checkLiveGame} from "./chesscom";
import fetch from 'node-fetch';

const fs = require('fs');

const express = require('express');
const cors = require('cors');
const app = express();

const { Chess } = require('chess.js/chess')

var stockfish = require("stockfish");



//TODO POST-Command with AXIOS https://dev.twitch.tv/docs/authentication/getting-tokens-oauth#oauth-client-credentials-flow
/**
  GET https://id.twitch.tv/oauth2/authorize
 ?client_id=fcghlfnelymmryxnb7yio5vnxna7mf
 &redirect_uri=http://localhost
 &response_type=token
 &scope=channel:manage:predictions
 @type {client}
 */

/**
 * SQL Database Connection
 * @type {Connection}
 */

generateToken(['channel:read:redemptions' , 'channel:read:subscriptions']);

const con = mysql.createConnection({
    host: "192.168.178.26",
    user: "remoteuser",
    password: "2132435465"
});

con.connect(function (err) {
    if (err) throw err;
    console.log("SQL-Database-Connected!");

    con.query("USE twitchDB", function (err) {
        if (err) throw err;
    });
});


export function getDBConnection() {
    return con;
}

/**
 * EVENT subscription
 * @type {PushSubscription}
 */
trackevents();
checkLiveGame();

const client = new tmi.Client({
    options: { debug: true, messagesLogLevel: "info" },
    connection: {
        reconnect: true,
        secure: true
    },
    identity: {
        username: BOT_USERNAME,
        password: "oauth:"+OAUTH_TOKEN
    },
    channels: [ CHANNEL_NAME ]
});
client.connect().catch(console.error);

export function getClient(){
    return client;
}

// Current Date
export function getTimeStamp(addeddays) {
    let currentDate = new Date();
    if(addeddays != null){
        currentDate.setDate(currentDate.getDate() + addeddays)
    }
    let today = currentDate.toISOString().slice(0, 10)
    today = today + " " + currentDate.getHours() + ":" + currentDate.getMinutes() + ":" + currentDate.getSeconds();
    return today;
}

const today = getTimeStamp();

client.on('message', (channel, tags, message, self) => {
    if(self) return;



    if (tags.username === BOT_USERNAME) return;

    //console.log(tags);

    const badges = checkBadges(tags)

    console.log("TAGS: " + JSON.stringify(tags));
    console.log("BADGES: " + badges);

    // Add User to Database and count Messages & Status
    con.query(`INSERT INTO Users VALUES(?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE 
    subscriber = ${badges[0]}, moderator = ${badges[1]}, premium = ${badges[2]}, vip = ${badges[3]}, broadcaster = ${badges[4]}, messagecount = messagecount +1;`,
        [tags['user-id'], tags['display-name'], badges[0], badges[1], badges[2], badges[3], 0, badges[4]] );

    // Check User-VIP-Expiration
    if(badges[3]){
        con.query(`SELECT v.*, u.username from VipList v JOIN Users u ON v.user_id = u.user_id WHERE u.user_id = ${tags['user-id']}`, function (err, result) {
            if (err) throw err;
            if(result.length == 0){
                con.query(`INSERT INTO VipList VALUES(?,?,?,?,?)`, [tags['user-id'], today, true, null, -1]);
            }
        });
        con.query(`SELECT v.*, u.username from VipList v JOIN Users u ON v.user_id = u.user_id`, function (err, result) {
            if (err) throw err;
            result.forEach(res => {
               // console.log(JSON.stringify(res));
                try {
                    if(res.expirationdate == null) {
                        console.log(res.user_id + " " + res.username + " " + res.expirationdate)
                        return;
                    }
                    const expirationdate = new Date(res.expirationdate);
                    let currentDate = new Date();

                    console.log(res.user_id + " " + res.username + " " + expirationdate)

                    if(expirationdate < currentDate){
                        console.log("VIP: EXPIRED. Removing")
                        client.say(channel, `/me @${res.username} Deine VIP-Mitgliedschaft ist leider abgelaufen. Bekomme eine Neue über Giveaways oder besonderes Verhalten. drackrLove`);
                        client.say(channel, `/unvip @${res.username}`)
                        con.query(`DELETE from VipList WHERE user_id = ${res.user_id}`)
                    }
                }catch (e){
                    console.log("VIP: ERROR. CANNOT RESOLVE")
                }
            });
        });
    }

    //console.log("Permission: " + checkPermissions(badges));

    //filterTwitchChat(channel, tags, message, client)

    collectVotes(tags, message);

    if(message.charAt(0) == '!') {

        const command = splitCommand(message);

        con.query(`INSERT INTO Messages VALUES(?,?,?,?)`, [today, tags['user-id'], command[0], command[1]]);

        //User-Commands
        talkResponseTwitchChat(channel, tags, message, client)
        //Mod-Commands
        customModeratorCommands(channel, tags, message, client)
        //Mixed-Commands
        customMixedcommands(channel,tags,message,client)
    }
});

export function splitCommand(message){
    const splitcom = message.toLowerCase().split(' ');
    let splitcom1 = splitcom[0];
    let splitcom2 = "";
    if(splitcom.length > 1) {
        splitcom1 = message.toLowerCase().split(' ')[0];
        splitcom2 = message.substring(message.indexOf(' ') + 1);
    }
    return [splitcom1,splitcom2];
}

export function checkBadges(tags){
    let badges = [
        false, // sub
        false, // mod
        false, // premium
        false, // vip
        false // broadcaster
    ]

    try{if(tags.badges.subscriber != '0') badges[0] = true}catch{}
    try{if(tags.mod == true) badges[1] = true}catch{}
    try{if(tags.badges.premium == '1') badges[2] = true}catch{}
    try{if(tags.badges.vip == '1') badges[3] = true}catch{}
    try{if(tags.badges.broadcaster == '1') badges[4] = true}catch{}

    return badges;
}

export function checkPermissions(badges){
    if(badges[4] == 1){ // Broadcaster
        return 0;
    }else if(badges[1] == 1) { // Moderator
        return 1;
    }else if(badges[0] == 1){ // Subscriber
        return 2; //
    }else if(badges[3] == 1){ // VIP
        return  3;
    }else if(badges[2] == 1){ // Premium
        return  4;
    }else{
        return  5; // Basic User
    }

}

function generateToken(scope){
    const payload = {
        params: {
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            grant_type: 'client_credentials',
            scope: scope
        }
    }
    const data = null;

    axios.post('https://id.twitch.tv/oauth2/token', data, payload)
        .then(function (response) {
            fs.writeFileSync(__dirname + '/constants.json', response.data.access_token);
        })
        .catch(function (error) {
            console.log(error);
        });
/*
    const payload2 = {
        headers:{
            'client-id': CLIENT_ID,
            'Authorization': 'Bearer ' + OAUTH_TOKEN_REDEMPTIONS,
            'Content-Type': 'application/json'
        },
        params: {

            broadcaster_id: USER_ID,
            "title": "FLEX2",
            cost: 50000
        }
    }

    axios.post('https://api.twitch.tv/helix/channel_points/custom_rewards', data, payload2)
        .then(function (response) {
           console.log(response);
        })
        .catch(function (error) {
            console.log(error);
        });*/
}



// Middleware Express
app.use(express.json());

//enables cors
app.use(cors({
    'allowedHeaders': ['token', 'Content-Type'],
    'exposedHeaders': ['token'],
    'origin': '*',
    'methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
    'preflightContinue': false
}));

app.get('/', (req, res) => {
    res.send({message: 'API says Hello World!'});
    console.log("Hello World triggered. API working")
});

// User
app.post('/newgame', (req, res) => {
    console.log(req.body)
    console.log("New Game Started: " + req.body.id)

    let id;
    try{
        id = parseInt(req.body.id)

        if(typeof id == 'number'){
           // client.say(client.channels[0], "Eine neue Partie hat begonnen! Setze Kanalpunkte um abzustimmen!");
        }else{
            return;
        }

        const payload = {
            headers:{
                'client-id': CLIENT_ID,
                'Authorization': 'Bearer ' + OAUTH_TOKEN_PREDICTIONS,
                'Content-Type': 'application/json'
            }
        }

        const data = {
                broadcaster_id: USER_ID,
                "title": "Schachpartie:",
                "outcomes": [
                    {
                        "title": "Drackrath gewinnt"
                    },
                    {
                        "title": "Drackrath verliert"
                    }
                ],
                "prediction_window": 60,
        }

        console.log(JSON.stringify(payload))
        console.log(JSON.stringify(data))

        axios.post('https://api.twitch.tv/helix/predictions', data, payload)
            .then(function (response) {
                console.log(response);
            })
            .catch(function (error) {
                console.log(error);
            });

    }catch (err){
        console.log("id is not number")
        console.log(err)
    }

    res.send(req.body);
});

// User
app.post('/fen', (req, res) => {
    // board defaults to the starting position when called with no parameters
    const stock = stockfish();

    const nodes = req.body.nodes

    nodes.forEach(node => {
        node.move = node.move.replace("S", "N");
        node.move = node.move.replace("L", "B");
        node.move = node.move.replace("D", "Q");
        node.move = node.move.replace("T", "R");

        console.log(node.move)
    })

    console.log(nodes)

    const chess = new Chess()
    nodes.forEach(node => {
        const move =  chess.move(node.move)
        if(move == null){
            console.log("ERROR MOVE ON: " + JSON.stringify(node))
        }
    })
    //console.log(chess.history({ verbose: true }))
    console.log(chess.ascii())

    console.log("stockfish started")

    stock.postMessage("uci");
    stock.postMessage("ucinewgame");
    stock.postMessage("position fen " + chess.fen());
    stock.postMessage("go depth 15");
    stock.onmessage = function(event) {
        const data = event.data ? event.data : event
        try{
            if(data.split(" ")[0] == 'bestmove'){
                const params = {
                    bestmove: data.split(" ")[1],
                    ponder: data.split(" ")[3],
                    fen: chess.fen()
                }

                res.send(params);
                console.log(params)
            }
        }catch (err){
                throw err;
        }
        console.log(event.data ? event.data : event);
    };
});
// PORT
const port = process.env.PORT || 4000
app.listen(port, () => console.log('Listening on port ' + port + '...'))

console.log('app start')