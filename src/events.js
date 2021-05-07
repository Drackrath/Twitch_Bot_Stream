import {CHANNEL_ID, OAUTH_TOKEN_PUBSUB, USER_ID} from "./constants";
import {checkBadges, checkPermissions, connectToDatabase, getClient} from "./app";

const fs = require('fs');
const path = require('path');

const WebSocket = require('ws');

const con = connectToDatabase();



export default function trackevents() {
// setup pubsub
    var pubsub;
    const myname = 'drackrath';

    var ping = {}
    ping.pinger = false;
    ping.start = function () {
        if (ping.pinger) {
            clearInterval(ping.pinger);
        }
        ping.sendPing();

        ping.pinger = setInterval(function () {
            setTimeout(function () {
                ping.sendPing();
                //jitter
            }, Math.floor((Math.random() * 1000) + 1));
        }, (4 * 60 * 1000));
    }// at least ever 5 minutes
    ping.sendPing = function () {
        try {
            pubsub.send(JSON.stringify({
                type: 'PING'
            }));
            ping.awaitPong();
        } catch (e) {
            console.log(e);

            pubsub.close();
            start();
        }
    }
    ping.awaitPong = function () {
        ping.pingtimeout = setTimeout(function () {
            console.log('WS Pong Timeout');
            pubsub.close();
            //start();
        }, 10000)
    }
    ping.gotPong = function () {
        clearTimeout(ping.pingtimeout);
    }


    var requestListen = function (topics, token) {
        let pck = {}
        pck.type = 'LISTEN';
        pck.nonce = myname + '-' + new Date().getTime();

        pck.data = {};
        pck.data.topics = topics;
        if (token) {
            pck.data.auth_token = token;
        }
        pubsub.send(JSON.stringify(pck));
    }


    var start = function () {
        // make new ws connection
        pubsub = new WebSocket('wss://pubsub-edge.twitch.tv');

        pubsub.on('close', function () {
            console.log('disconnected');
            start();
        }).on('open', function () {
            ping.start();

            runAuth();
        });

        pubsub.on('message', function (raw_data, flags) {
            fs.appendFileSync(__dirname + '/pubsub_messages.log', raw_data);

            var data = JSON.parse(raw_data);
            if (data.type == 'RECONNECT') {
                console.log('WS Got Reconnect');
                // restart
                pubsub.close();
            } else if (data.type == 'PONG') {
                ping.gotPong();
            } else if (data.type == 'RESPONSE') {
                console.log(data);
                console.log('RESPONSE: ' + (data.error ? data.error : 'OK'));
            } else if (data.type == 'MESSAGE') {
                console.log("EVENT");
                var msg = JSON.parse(data.data.message);
                console.log(msg);
                const user = msg.data.redemption.user;
                const reward = msg.data.redemption.reward;

                console.log(user);
                console.log(reward);
                /*
                con.query("USE twitchDB", function (err, result) {
                    if (err) throw err;
                    console.log("Result: " + result);
                });*/

                con.query(`INSERT INTO CustomRewards VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE 
                     title = '${reward.title}', prompt = '${reward.prompt}', cost = ${reward.cost}, usetimes = usetimes + 1;`,
                    [reward.id, reward.title, reward.prompt, reward.cost, 1, 0]);

                con.query(`INSERT INTO UserCustomRewards VALUES(?,?,?,?)`,
                    [user.id, reward.id, new Date(msg.data.timestamp), msg.data.redemption.user_input]);

                con.query(`SELECT * FROM CustomRewards WHERE reward_id = '${reward.id}';`, function (err, result) {
                    if (err) throw err;
                    if(result[0].reward_number == 1){
                        console.log("WASSER MARSCH WURDE AUSGELÖST!")
                    }
                    if(result[0].reward_number == 2){
                        let pattern = /([KDTLSBauer])+([a-h])+([1-9])+(\s\>\s)+([a-h])+([1-9])/;
                        console.log(pattern.test(msg.data.redemption.user_input));
                        console.log("ZUG ZIEHEN WURDE AUSGELÖST!")
                    }
                    if(result[0].reward_number == 3){
                        con.query(`INSERT INTO Zitate (user_id,reward_id,datetime,text) VALUES (?,?,?,?)`,
                            [user.id, reward.id, new Date(msg.data.timestamp), msg.data.redemption.user_input]);

                        con.query(`SELECT z.zitat_id, z.text FROM Zitate z ORDER BY z.zitat_id DESC LIMIT 1`, function (err, result){
                            const client = getClient();
                            client.say(client.channels[0], "Dein Zitat wurde unter No°" + result[0].zitat_id + " gespeichert.");
                        });

                        console.log("ZITAT HINZUFÜGEN WURDE AUSGELÖST!")
                    }
                });

            } else {
                console.log(data);
            }
        });
    }

// collect and start
    var runAuth = function () {
        requestListen([
            'channel-points-channel-v1.' + USER_ID
        ], OAUTH_TOKEN_PUBSUB);

    }

    start();
}