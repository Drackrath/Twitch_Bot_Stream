import {CLIENT_ID, OAUTH_TOKEN, USER_ID, } from "./constants";
import axios from "axios";
import {checkBadges, checkPermissions, getDBConnection, splitCommand} from "./app"
import tmi from 'tmi.js'


function customModeratorCommands(channel, tags, message, client) {
    const commandNames =
        [
            '!raid',
            '!title',
            '!butter'
        ]

    if(checkPermissions(checkBadges(tags)) > 1) return;

    let command = splitCommand(message);

    console.log(command)

    // --------------- BUTTER ------------
    if(command[0] === commandNames[2]) {
        if(command.length < 2) return;
        client.say(channel, `@${tags['username']} sagt, dass alles in Butter ist.`);
    }

    // --------------- RAID ------------
    if(command[0] === commandNames[0]) {
        if(command.length < 2) return;
        client.say(channel, `/raid @${command[1]}`);
    }

    // --------------- TITLE -----------
    else if(command[0] === commandNames[1]) {
        const options = {
            method: "PATCH",
            url: 'https://api.twitch.tv/helix/channels',
            headers: {
                'Client-ID': CLIENT_ID,
                'Authorization': 'Bearer ' + OAUTH_TOKEN
            },
            params: {
                broadcaster_id: USER_ID,
                title: command[1]
            },
        };

        if(command[1] == ''){
            console.log("Titel Name nicht angegeben!");
            options.method = "GET";
            options.params.title = "";
        }

        // Abfrage Axios aktueller Titel
        axios.request(options).then(
            (response) => {
                var result = response.data;
                if(command[1] == ''){
                    client.say(channel, `Aktueller Titel: ` + result.data[0].title);
                }else{
                    client.say(channel, `Der Twitch-Kanal Titel wurde geändert!`);
                }
            },
            (error) => {
                console.log(error);
            }
        );
    }

}

export {customModeratorCommands};