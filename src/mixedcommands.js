import {checkBadges, checkPermissions, getDBConnection, getTimeStamp, splitCommand} from "./app";


let isrunning = false;
let verlosungs_id = 0;

let pollarray = [];

let collectvotes = false;

let timeout;

function customMixedcommands(channel, tags, message, client){
    const today = getTimeStamp();
    const con = getDBConnection();

    const commandNames =
        [
            '!verlosung',
            '!weg',
            '!so',
            '!poll'
        ]

    const command = splitCommand(message);
    const splitstring = message.toLowerCase().split(' ');

    const permission = checkPermissions(checkBadges(tags));

    // --------------- POLL ------------
    if(command[0] === commandNames[3]) {
        // if(command.length < 2) return;
        if(permission < 3) return;

        if(command[1] == 'end'){
            clearTimeout(timeout);
        }else {

            let time = parseInt(command[1]) * 1000;

            if (isNaN(time)) {
                time = 20000;
            }

            client.say(channel, `Es wurde eine Umfrage für ${time / 1000} Sekunden gestartet. Schreibe 1 oder 2 in den Chat.`);

            collectvotes = true;
            timeout = setTimeout(function () {
                collectvotes = false;
                const counter = [0, 0];
                pollarray.forEach(vote => {
                    if (vote[1] == '1') {
                        counter[0]++
                    }
                    if (vote[1] == '2') {
                        counter[1]++
                    }
                });

                if (counter[0] != counter[1]) {
                    client.say(channel, (counter[0] > counter[1] ? `${counter[0] / (counter[0] + counter[1]) * 100} Stimmen für 1` : `${counter[1] / (counter[0] + counter[1]) * 100} Stimmen für 2`));
                } else {
                    client.say(channel, "Das Ergebnis ist \"perfectly balanced as all things should be\"");
                }
                pollarray.length = 0;
            }, time)
        }
    }

    //---------------- DELETE CITE ----------
    if(command[0] === commandNames[1]) {
        if(command.length < 2) return;
        if(permission < 2) {
            con.query(`UPDATE Zitate SET isdeleted = 1 WHERE zitat_id = ${command[1]}`, function (err, result, fields) {
                if (err) throw err;
                client.say(channel, `/me Zitat No°${command[1]} wurde entfernt`);
            });
        }else if(permission < 4) {
            con.query(`UPDATE Zitate SET isdeleted = 1 WHERE zitat_id = ${command[1]} AND user_id = ${tags['user-id']}`, function (err, result, fields) {
                if (err) throw err;
                if(result.affectedRows == 0){
                    client.say(channel, `/me Zitat No°${command[1]} existiert nicht, oder du bist nicht der Besitzer!`);
                }else{
                    client.say(channel, `/me Zitat No°${command[1]} wurde entfernt`);
                }
            });
        }
    }

    // ------------- VERLOSUNG -----------
    if(command[0] === commandNames[0]) {
        if(permission < 2) {
            if ('start' == command[1]) {
                if(isrunning == true) {
                    client.say(channel, `/me Eine aktive Verlosung läuft bereits. Beende sie mit !verlosung stop um einen Gewinner zu ziehen!`)
                    return;
                }
                client.say(channel, `/me Eine neue Verlosung für eine 14-Tägige VIP-Mitgliedschaft wurde gestartet!`);
                con.query("SELECT v.`Verlosungs_id` FROM Verlosungen v ORDER BY Verlosungs_id DESC LIMIT 1;", function (err, result, fields) {
                    if (err) throw err;
                    console.log(result);
                    verlosungs_id = (result[0].Verlosungs_id);
                    verlosungs_id += 1;
                    console.log(verlosungs_id);
                });
                isrunning = true;
            }
            if ('end' == command[1]){
               if(isrunning){
                   con.query(`SELECT * FROM Verlosungen where verlosungs_id = ${verlosungs_id} ORDER BY RAND() LIMIT 1`, function (err, result, fields) {
                       if (err) throw err;
                       try{
                       console.log(result[0].user_id);
                       }catch{return;}
                       con.query( `UPDATE Verlosungen SET gewinner = 1 WHERE user_id = ${result[0].user_id} AND Verlosungs_id = ${verlosungs_id}`);
                       con.query(`INSERT INTO VipList VALUES(?,?,?,?,?) ON DUPLICATE KEY UPDATE expirationdate = DATE_ADD(expirationdate, interval 14 day), verlosungs_id = ${verlosungs_id}`, [result[0].user_id, today, false, getTimeStamp(14), verlosungs_id]);
                       con.query(`SELECT * FROM Users WHERE user_id = ${result[0].user_id}`, function (err, result, fields) {
                           client.say(channel, `/vip @${result[0].username}`);
                           if(!result[0].vip){
                               client.say(channel, `/me Der Gewinner für eine 14 tägige VIP-Mitgliedschaft ist: @${result[0].username}!`);
                           }else{
                               client.say(channel, `/me Der Gewinner für eine 14 tägige VIP-Mitgliedschaft ist: @${result[0].username}! Da du bereits VIP bist, werden dir weitere 14 Tage gutgeschrieben!`);
                           }
                       })

                   });
                   isrunning = false;
               }
            }
        }else{ // -----------Zuschauer-------------
            if(isrunning == false || verlosungs_id == 0){
                client.say(channel, `/me Aktuell läuft leider keine Verlosung. Wende dich an einen Mod oder den Streamer für Informationen.`);
                return;
            }

            try {
               con.query(`INSERT INTO Verlosungen (datetime, verlosungs_id, user_id, gewinner) VALUES(?,?,?,?);`, [today, verlosungs_id, tags['user-id'], false], function ( err, result, fields){
                        if(err) {
                            client.say(channel, `/me Etwas ist schief gelaufen. VoHiYo Du nimmst wohl bereits an der Verlosung teil!`);
                            return;
                        }else{
                            client.say(channel, `/me @${tags.username} nimmt an der Verlosung für eine VIP-Mitgliedschaft auf meinem Kanal teil! drackrLove`);
                        }
               });
            }catch(e){
                client.say(channel, `/me Du nimmst bereits an der Verlosung teil! drackrNice`);
            }
        }
    }


    // -------- Shout Out (so) ----------
    if(command[0] === commandNames[2]){
        if(permission < 5){
            console.log("Permission granted")
        }else{
            client.say(channel, "Du bist nicht für diese Aktion berechtigt!");
            return;
        }
        if(command[1] == ''){
            client.say(channel, "Kanalname nicht angegeben!");
            return;
        }

        client.say(channel, `Folge @${command[1]} hier: https://www.twitch.tv/${command[1]}! drackrLove `);
    }
}

export function collectVotes(tags, message){
    if(collectvotes){
        let inarray = false;
        pollarray.forEach(vote => {
            if(vote[0] == tags['user-id']){
                inarray = true;
            }
        })

        if((message == '1' || message == '2') && !inarray){
            pollarray.push([tags['user-id'], message])
        }
    }
}

export {customMixedcommands};