import {checkBadges, checkPermissions, connectToDatabase, getTimeStamp, splitCommand} from "./app";


const con = connectToDatabase();
let isrunning = false;
let verlosungs_id = 0;

function customMixedcommands(channel, tags, message, client){
    const today = getTimeStamp();

    const commandNames =
        [
            '!verlosung',
            '!weg'
        ]

    const command = splitCommand(message);
    const splitstring = message.toLowerCase().split(' ');

    const permission = checkPermissions(checkBadges(tags));


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
}

export {customMixedcommands};