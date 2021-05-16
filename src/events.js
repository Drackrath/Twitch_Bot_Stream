import {CHANNEL_ID, CLIENT_ID, OAUTH_TOKEN, OAUTH_TOKEN_PUBSUB, OAUTH_TOKEN_REDEMPTIONS, USER_ID} from "./constants";
import {checkBadges, checkPermissions, getDBConnection, getClient} from "./app";
import axios from "axios";

const fs = require('fs');
const path = require('path');

const WebSocket = require('ws');

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

                //console.log(user);
                //console.log(reward);

                const con = getDBConnection();

                /*
                con.query("USE twitchDB", function (err, result) {
                    if (err) throw err;
                    console.log("Result: " + result);
                });*/

                con.query(`INSERT INTO CustomRewards VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE 
                     title = '${reward.title}', prompt = '${reward.prompt}', cost = ${reward.cost}, usetimes = usetimes + 1;`,
                    [reward.id, reward.title, reward.prompt, reward.cost, 1, 0]);

                //console.log(JSON.stringify(msg.data.redemption));

                if(msg.data.redemption.user_input == null){
                }else if(msg.data.redemption.user_input.length > 250){
                    const client = getClient();
                    client.say(client.channels[0], "Der Text ist zu lange! Deine Kanalpunkte wurden erstattet.");

                    const options = {
                        method: "PATCH",
                        url: 'https://api.twitch.tv/helix/channel_points/custom_rewards/redemptions',
                        headers: {
                            'Client-ID': CLIENT_ID,
                            'Authorization': 'Bearer ' + OAUTH_TOKEN_REDEMPTIONS
                        },
                        params: {
                            id: '',
                            broadcaster_id: USER_ID,
                            reward_id: '',
                            status: ''
                        },
                    };

                    options.params.id = msg.data.redemption.id;
                    options.params.reward_id = reward.id;
                    options.params.status = 'CANCELED';

                    axios.request(options).then(
                        (response) => {
                            const result = response.data;
                            console.log(JSON.stringify("STATUS UPDATED"));

                        },
                        (error) => {
                             console.log(error);
                        }
                    );

                    return;

                }

                con.query(`INSERT INTO UserCustomRewards VALUES(?,?,?,?,?)`,
                    [user.id, reward.id, new Date(msg.data.timestamp), msg.data.redemption.user_input, msg.data.redemption.id], function (err){
                    if (err) {
                        console.log("Length Exceeded: " + msg.data.redemption.user_input.length);
                        console.log("UCR:" + err);
                    }
                    } );

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

                        console.log("Cite Length: " + msg.data.redemption.user_input.length);

                        con.query(`INSERT INTO Zitate (user_id,reward_id,datetime,text) VALUES (?,?,?,?)`,
                            [user.id, reward.id, new Date(msg.data.timestamp), msg.data.redemption.user_input], function (err){
                               if (err){
                                   console.log("Length Exceeded: " + msg.data.redemption.user_input.length);
                               }
                            });

                        con.query(`SELECT z.zitat_id, z.text FROM Zitate z ORDER BY z.zitat_id DESC LIMIT 1`, function (err, result){
                            const client = getClient();
                            client.say(client.channels[0], "Dein Zitat wurde unter No°" + result[0].zitat_id + " gespeichert.");
                        });

                        console.log("ZITAT HINZUFÜGEN WURDE AUSGELÖST!")
                    }
                    if(result[0].reward_number == 4){
                        const options_checklist = {
                            headers: {
                                'Client-ID': CLIENT_ID,
                                'Authorization': 'Bearer ' + OAUTH_TOKEN_REDEMPTIONS
                            },
                            params: {
                                id: '',
                                broadcaster_id: USER_ID,
                                reward_id: 'cda24a36-6874-4e93-982d-50359dcb431a'
                            },
                        };

                        // --------- User bereits auf der Liste und wenn ja, Kanalpunkte rückerstatten --------------
                        const options = {
                            method: "PATCH",
                            url: 'https://api.twitch.tv/helix/channel_points/custom_rewards/redemptions',
                            headers: {
                                'Client-ID': CLIENT_ID,
                                'Authorization': 'Bearer ' + OAUTH_TOKEN_REDEMPTIONS
                            },
                            params: {
                                id: '',
                                broadcaster_id: USER_ID,
                                reward_id: '',
                                status: ''
                            },
                        };


                        con.query(`SELECT q.queue_id, q.user_id, q.redemption_id from Queue q where q.user_id = ${user.id} and q.date = CURRENT_DATE ORDER BY q.queue_id DESC`, function (err, result){
                            if(err) console.log("Wrong parameters")
                            if(result.length == 0){
                                console.log("User not found in Queue")
                                insertUserToQueue();
                            }else{
                                console.log("USER IN LIST: " + JSON.stringify(result));

                                options_checklist.params.id = result[0].redemption_id;

                                const res = result[0]

                                axios.get("https://api.twitch.tv/helix/channel_points/custom_rewards/redemptions",options_checklist).then(
                                    (response) => {
                                        const redemptionstatus = response.data.data[0].status;
                                        console.log("GET REDEMPTION: " + redemptionstatus);

                                        if(redemptionstatus == "FULFILLED" || redemptionstatus == "CANCELED") {
                                            con.query(`UPDATE Queue q SET isdeleted = 1 WHERE q.queue_id = ${res.queue_id}`, function (err, result) {
                                                if (err) throw err;
                                                console.log(result)
                                            });
                                            insertUserToQueue();
                                            console.log("User-Redemption " + redemptionstatus);
                                        }else{
                                            refundChannelPoints(options);
                                        }

                                    },
                                    (error) => {
                                         console.log(error);
                                    }
                                );
                            }

                        });


                        function insertUserToQueue() {

                            con.query(`SELECT q.user_id, q.isdeleted from Queue q WHERE q.user_id = ${user.id} AND isdeleted = 0 AND q.date = CURRENT_DATE`, function (err, result) {
                                if (err) throw err;
                                if (result.length == 0) {
                                    console.log("User not found in Queue");
                                    con.query(`INSERT INTO Queue (user_id,date,redemption_id) VALUES (?,?,?)`,
                                        [user.id, new Date(msg.data.timestamp), msg.data.redemption.id], function (err) {
                                            if (err) {
                                                refundChannelPoints(options);
                                            }
                                        });
                                } else {
                                    console.log("User found in Queue");
                                    refundChannelPoints(options);
                                }
                            });
                        }

                        function refundChannelPoints(options){
                            const client = getClient();
                            client.say(client.channels[0], "Du stehst schon auf der Liste!");

                            options.params.id = msg.data.redemption.id;
                            options.params.reward_id = reward.id;
                            options.params.status = 'CANCELED';

                            axios.request(options).then(
                                (response) => {
                                    const result = response.data;
                                    console.log(JSON.stringify("STATUS UPDATED"));

                                },
                                (error) => {
                                    // console.log(error);
                                }
                            );
                        }

                        con.query('Select q.queue_id, q.date, q.user_id, q.redemption_id, c.reward_id FROM Queue q JOIN UserCustomRewards c ON c.redemption_id = q.redemption_id ' +
                            'JOIN CustomRewards cr ON cr.reward_id = c.reward_id ' +
                            'WHERE q.date != CURRENT_DATE AND isdeleted = 0;', function (err, result){

                            // ---------- Kanalpunkte rückerstatten Nach Ablauf des Tages--------------
                            result.forEach(res => {
                                options.params.id = res.redemption_id;
                                options.params.reward_id = res.reward_id;
                                options.params.status = 'CANCELED';

                                axios.request(options).then(
                                    (response) => {
                                        const result = response.data;
                                        console.log(JSON.stringify("STATUS UPDATED"));

                                    },
                                    (error) => {
                                       // console.log(error);
                                    }
                                );

                                con.query(`UPDATE Queue q SET isdeleted = 1 WHERE q.queue_id = ${res.queue_id}`,function (err, result) {
                                    if (err) throw err;
                                    console.log(result)
                                });

                            });
                        });

                        console.log("LISTE HINZUFÜGEN WURDE AUSGELÖST!")
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