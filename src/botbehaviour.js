
// Filter Chat

import {BLOCKED_WORDS} from "./constants";

function filterTwitchChat(channel, tags, message, client){
    message = message.toLowerCase();

    //check if message contains blockedwords
    let shouldSendMessage = BLOCKED_WORDS.some(blockedWord => message.includes(blockedWord.toLowerCase()));
    let equalsblockedword = false;
    let blockedwordinsidetext = false;
    if(shouldSendMessage) {
        equalsblockedword = BLOCKED_WORDS.some(blockedWord => message == blockedWord.toLowerCase());
        blockedwordinsidetext = BLOCKED_WORDS.some(blockedWord => message.includes(" " + blockedWord.toLowerCase() + " "));
    }
    if(equalsblockedword || blockedwordinsidetext){
        shouldSendMessage = true;
    }else{
        shouldSendMessage = false;
    }

    if(shouldSendMessage){

        //tell user
        client.say(channel, `/me @${tags.username}, sorry! Deine Nachricht wurde gelöscht StinkyGlitch`)
        //delete message
        client.deletemessage(channel, tags.id)
            .then((data) => {

            }).catch((err) => {

        })

    }
}

export {filterTwitchChat}