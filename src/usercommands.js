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
            ['!bsg', `/me Bitte keine Zugvorschläge FootYellow`]
        ]


    commandList.forEach(commandTuple =>{
        if(Array.isArray(commandTuple[0]) == true){
            commandTuple[0].forEach(alias => {
                if(message.toLowerCase() === alias){
                    client.say(channel, commandTuple[1]);
                }
            })
        }
        if(message.toLowerCase() === commandTuple[0]){
            client.say(channel, commandTuple[1]);
        }
    })

    if(message.toLowerCase() === commandList[3][0]){
        greedcount++;
    }
}

export {talkResponseTwitchChat}