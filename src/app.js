import tmi from 'tmi.js'
import {
    BLOCKED_WORDS,
    BOT_USERNAME,
    CHANNEL_ID,
    CHANNEL_NAME,
    CLIENT_ID,
    OAUTH_TOKEN, USER_ID
} from "./constants";
import axios from "axios";
import mysql from "mysql";
import {customModeratorCommands} from "./modcommands";
import {filterTwitchChat} from "./botbehaviour";
import {customMixedcommands} from "./mixedcommands";
import {talkResponseTwitchChat} from "./usercommands";

/**   Get-Command with AXIOS
  GET https://id.twitch.tv/oauth2/authorize
 ?client_id=fcghlfnelymmryxnb7yio5vnxna7mf
 &redirect_uri=http://localhost
 &response_type=token
 &scope=channel:moderate+chat:edit+chat:read+channel_editor+channel:manage:broadcast
 @type {client}
 */

/**
 * SQL Database Connection
 * @type {Connection}
 */

export function connectToDatabase() {
    const con = mysql.createConnection({
        host: "192.168.178.26",
        user: "remoteuser",
        password: "2132435465"
    });

    con.connect(function (err) {
        if (err) throw err;
        console.log("SQL-Database-Connected!");

        con.query("USE twitchDB", function (err, result) {
            if (err) throw err;
            console.log("Result: " + result);
        });
    });

    return con;
}

const con = connectToDatabase();

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

   // console.log(tags);

    let badges = [
        false, // sub
        false, // mod
        false, // premium
        false // vip
    ]

    try{if(tags.badges.subscriber == '1') badges[0] = true}catch{}
    try{if(tags.mod == true) badges[1] = true}catch{}
    try{if(tags.badges.premium == '1') badges[2] = true}catch{}
    try{if(tags.badges.vip == '1') badges[3] = true}catch{}

    console.log(badges);

    // Add User to Database and count Messages & Status
    con.query(`INSERT INTO Users VALUES(?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE 
    subscriber = ${badges[0]}, moderator = ${badges[1]}, premium = ${badges[2]}, vip = ${badges[3]}, messagecount = messagecount +1;`,
        [tags['user-id'], tags['display-name'], badges[0], badges[1], badges[2], badges[3], 0] );

    // Check User-VIP-Expiration
    if(badges[3]){
        con.query(`SELECT v.*, u.username from VipList v JOIN Users u ON v.user_id = u.user_id`, function (err, result) {
            if (err) throw err;
            result.forEach(res => {
                console.log(JSON.stringify(res));
                try {
                    const expirationdate = new Date(res.expirationdate);

                    let currentDate = new Date();
                    console.log(expirationdate)
                    if(expirationdate < currentDate){
                        console.log("VIP: EXPIRED. Removing")
                        client.say(channel, `/me @${res.username} Deine VIP-Mitgliedschaft ist leider abgelaufen. Bekomme eine Neue über Giveaways oder besonderes Verhalten. drackrLove`);
                        client.say(channel, `/unvip @${res.username}`)
                        con.query(`DELETE from VipList WHERE user_id = ${res.user_id}`)
                    }

                }catch (e){
                    try{
                        if(res.permanent == true){
                            console.log("VIP: permanent");
                            return;
                        }else{
                            console.log("VIP: not permanent. Removing")
                            client.say(channel, `/unvip @${res.username}`)
                            return;
                        }
                    } catch (e){
                        console.log("VIP: ERROR. Removing")
                        client.say(channel, `/unvip @${res.username}`)
                        return;
                    }
                }
            });
            console.log("Result: " + JSON.stringify(result));
        });
    }

    filterTwitchChat(channel, tags, message, client)

    if(message.charAt(0) == '!') {

        const command = splitCommand(message);

        con.query(`INSERT INTO Messages VALUES(?,?,?,?)`, [today, tags['user-id'], command[0], command[1]]);

        talkResponseTwitchChat(channel, tags, message, client)
        customModeratorCommands(channel, tags, message, client)
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

export function checkPermissions(tags){
    try{
        if(tags.badges.broadcaster === '1'){
            return 0
        }else if(tags.mod == true) {
            return 1;
        }else{
            return 2;
        }
    }catch (e){
        if(tags.mod == false) return 2;
    }
}
console.log('app start')