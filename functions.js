'use strict';

const API_AI_TOKEN = 'c2a8b983845543e2b0d54018ad01d2d1';
const apiAiClient = require('apiai')(API_AI_TOKEN);

const FACEBOOK_ACCESS_TOKEN = 'EAATjFac0PR8BAFUhoISYR0W8PSfBtji6fETy3VaZAZCyyM03KJRNSvb8oNPfZCwaENMgO4ypYEF7ZAe3kQ7khNuxGu6HziL2qNIo7pylRMz8ZB6cQZBShkQVBcGZBAvbAIhlvBMfiSZCBca6mrxYQUv4dCvRhvq6Q7L1e3pqmnLt5narraqZCSleFdbwRlTjr33oZD';
const request = require('request');

const mongoURL = "mongodb://127.0.0.1:27017/";
const dbName = 'remindmebot';
const snoozeForMin = 5;

/*
    Returns an array of reminder that should be executed at this minute
*/
module.exports = {
    remindersToAlert: function remindersToAlert() {
        return new Promise((resolve, reject) => {
            //console.log();
            //console.log('************ remindersToAlert ************');
            let userID = "";
            let reminderTimeMS = null;
            let reminderDescription = "";
            let reminderConfirmed = null;
            let todaysDateStr = null;
            let reminderTime = "";
            let allReminderToAlert = [];

            const currTime = new Date();
            currTime.setHours(currTime.getHours() + 3); // to change from UTC/GMT to GMT+3
            const currTimeMS = currTime.getTime();
            console.log("+++++++++++++++");
            console.log("currTimeMS : " + currTimeMS);
            const anotherD = new Date(currTimeMS);
            const anotherH = anotherD.getHours();
            const anotherM = anotherD.getMinutes();
            console.log(`Curr time: ${anotherH}:${anotherM}`);

            const MongoClient = require("mongodb").MongoClient;
            const url = mongoURL;

            MongoClient.connect(url, function (err, db) {
                if (err) reject(false);
                const dbo = db.db(dbName);

                // For every collection in DB
                dbo.listCollections().toArray(function (err, collArray) {
                    if (err) reject(false);

                    //console.log();
                    //console.log('Collections: ' + JSON.stringify(collArray));
                    if (collArray && collArray.length > 0) {
                        // Get a list of reminders and a collection name (=sender ID)
                        for (let i = 0; i < collArray.length; i++) {
                            userID = collArray[i]["name"];

                            //console.log();
                            //console.log('Working with collection ' + userID);

                            // 'Outer' promise chain - get all reminders for given user, then log selected
                            allUsersRemindersFromDB(userID).then(remindersArr => {

                                //console.log();
                                //console.log('Reminders: ' + JSON.stringify(remindersArr));

                                let chain = Promise.resolve();
                                for (let x = 0; x < remindersArr.length; x++) {

                                    chain = chain.then(() => {
                                        reminderConfirmed = remindersArr[x]["reminderConfirmed"];
                                        reminderDescription = remindersArr[x]["reminderDescription"];
                                        let reminderID = remindersArr[x]["_id"];
                                        reminderTime = remindersArr[x]["reminderTime"];
                                        let reminderWasSet = reminderID.getTimestamp();
                                        let reminderDate = remindersArr[x]["reminderDate"];
                                        let reminderRecurrence = remindersArr[x]["reminderRecurrence"];
                                        let snoozedToTime = remindersArr[x]["snoozedToTime"];
                                        if (snoozedToTime) {
                                            reminderTime = snoozedToTime;
                                        }

                                        let reminderHours = Number(reminderTime.split(":")[0]);
                                        let reminderMinutes = Number(reminderTime.split(":")[1]);
                                        let remTime = new Date();
                                        remTime.setHours(reminderHours, reminderMinutes, 0, 0);
                                        reminderTimeMS = remTime.getTime();

                                        const todaysDateY = currTime.getFullYear();
                                        const todaysDateM = currTime.getMonth() + 1;
                                        const todaysDateD = currTime.getDate();
                                        todaysDateStr = `${todaysDateY}-${todaysDateM}-${todaysDateD}`;

                                        //console.log();
                                        //console.log('Reminder #' + reminderID);

                                        return ifReminderIsToday(reminderWasSet, reminderTime, reminderDate, reminderRecurrence, snoozedToTime)

                                            .then(ifToday => {
                                                //console.log("--------------------");
                                                //console.log("ifToday: " + ifToday);
                                                //console.log("reminderTimeMS: " + reminderTimeMS);
                                                //console.log("currTimeMS: " + currTimeMS);
                                                //if (reminderTimeMS < currTimeMS) {
                                                    //console.log("reminderTimeMS<currTimeMS: true");
                                                //} else {
                                                    //console.log("reminderTimeMS<currTimeMS: false");
                                                //}
                                                //console.log("reminderConfirmed: " + reminderConfirmed);
                                                //console.log("todaysDateStr: " + todaysDateStr);
                                                //if (reminderConfirmed != todaysDateStr) {
                                                //    console.log("reminderConfirmed!=todaysDateStr: true");
                                                //} else {
                                                //    console.log("reminderConfirmed!=todaysDateStr: false");
                                                //}
                                                //console.log("--------------------");

                                                if (ifToday && reminderTimeMS < currTimeMS && reminderConfirmed != todaysDateStr) {
                                                    //console.log("(ifToday && reminderTimeMS<currTimeMS && reminderConfirmed!=todaysDateStr): true");

                                                    let speech = `ALERT!\n\nYou asked to remind you about "${reminderDescription}" at ${reminderTime}`;
                                                    const buttonsConfirmSnooze = {
                                                        attachment:{
                                                            type:"template",
                                                            payload:{
                                                                text: speech,
                                                                template_type:"button",
                                                                buttons:[
                                                                    {
                                                                        type:"postback",
                                                                        title:"Confirm",
                                                                        payload:`confirm_reminder ${reminderID}`
                                                                    },
                                                                    {
                                                                        type:"postback",
                                                                        title:"Snooze for 5 min",
                                                                        payload:`snooze_reminder ${reminderID}`
                                                                    }
                                                                ]
                                                            }
                                                        }
                                                    };
                                                    //sendMessage(userID, {text: speech});
                                                    let newMessage = sendMessage(userID, buttonsConfirmSnooze);
                                                    newMessage.then(() => {
                                                       console.log("Alert");
                                                    });

                                                    allReminderToAlert.push(
                                                        {
                                                            "userID": userID,
                                                            "_id": reminderID
                                                        }
                                                    );
                                                    //console.log('allReminderToAlert: ' + JSON.stringify(allReminderToAlert));
                                                } //else {
                                                 //   console.log("(ifToday && reminderTimeMS<currTimeMS && reminderConfirmed!=todaysDateStr): false");
                                                //}
                                            })
                                    })
                                }
                                return allReminderToAlert;
                            })
                                .then(data => {
                                    resolve(data);
                                })
                                .catch((err) => {
                                    console.log("Error happened: " + err);
                                })
                        }

                    } else {
                        resolve(false);
                    }
                });

            });
        });
    }
}


/*
    Checks if a reminder with given reminderID for a given user should be alerted today
*/
function ifReminderIsToday(reminderWasSet, reminderTime, reminderDate, reminderRecurrence, snoozedToTime) {
    return new Promise((resolve, reject) => {
        // Get today's date and determine time, day of the week (and if it's a weekend/weekday), date, month
        const today = new Date();
        today.setUTCHours(today.getHours() + 3);
        const todaysDateYear = today.getFullYear();
        const todaysDateMonth = today.getMonth() + 1; // 0-11 >> 1-12
        const todaysDateDate = today.getDate();
        const dayOfWeek = today.getDay(); // 0-6, Sun=0
        //const currentTime = today.getTime(); // ms - at first I wanted to display only those todays' reminders that were
        // in future, that is between currentTime and todayEnds, ms

        const todayBeganMS = today.setHours(0, 0, 0, 0);
        const todayEnds = todayBeganMS + 86400000 - 1; // ms in 1 day

        // Working with reminder's time data
        if (snoozedToTime) {
            reminderTime = snoozedToTime;
        }

        // Parse reminderTime and transform it into ms
        const reminderTimeHours = reminderTime.split(":")[0];
        const reminderTimeMinutes = reminderTime.split(":")[1];
        const reminderTimeMS = new Date().setHours(reminderTimeHours, reminderTimeMinutes, 0, 0);

        // To get day of the week and date reminder was set (for "Weekly" recurrence cases) we need _id field
        const reminderWasSetDay = reminderWasSet.getDay();
        const reminderWasSetDate = reminderWasSet.getDate();

        // Parse reminderDate to separate year, month and date
        let reminderDateYear = "";
        let reminderDateMonth = "";
        let reminderDateDay = "";
        if (reminderDate) {
            reminderDateYear = reminderDate.split("-")[0];
            reminderDateMonth = reminderDate.split("-")[1];
            reminderDateDay = reminderDate.split("-")[2];
        }

        // Main check-tree
        // If it's a one-time reminder, check yyyy-mm-dd and then hh:mm
        if (!reminderRecurrence) {
            if (reminderDateYear == todaysDateYear &&
                reminderDateMonth == todaysDateMonth &&
                reminderDateDay == todaysDateDate) {
                console.log("It's today! (ifReminderIsToday)");
                resolve(reminderTimeMS > todayBeganMS && reminderTimeMS < todayEnds);
            } else {
                console.log("It's NOT today! (ifReminderIsToday)");
                resolve(false);
            }

            // If it's a recurrent reminder
        } else {
            switch (reminderRecurrence) {
                // Daily - check if reminder's time hasn't passed today
                case "Daily":
                    if (reminderTimeMS > todayBeganMS && reminderTimeMS < todayEnds) {
                        console.log("It's today! (ifReminderIsToday)");
                        resolve(true);
                    };

                // Weekly - check if the day reminder was set === today's day and then check the time
                case "Weekly":
                    if (reminderWasSetDay === dayOfWeek) {
                        resolve(reminderTimeMS > todayBeganMS && reminderTimeMS < todayEnds);
                    } else {
                        resolve(false);
                    }

                // Monthly - check if the date reminder was set === today's day and then check the time
                case "Monthly":
                    if (reminderWasSetDate === todaysDateDate) {
                        resolve(reminderTimeMS > todayBeganMS && reminderTimeMS < todayEnds);
                    } else {
                        resolve(false);
                    }

                // Weekends - check if today is a weekend and then check the time
                case "Weekends":
                    if (dayOfWeek === 6 || dayOfWeek === 0) {
                        resolve(reminderTimeMS > todayBeganMS && reminderTimeMS < todayEnds);
                    } else {
                        resolve(false);
                    }

                // Weekdays - check if today is a week day and then check the time
                case "Weekdays":
                    if (dayOfWeek > 0 && dayOfWeek < 6) {
                        resolve(reminderTimeMS > todayBeganMS && reminderTimeMS < todayEnds);
                    } else {
                        resolve(false);
                    }

                // "Mondays"
                case "Mondays":
                    if (dayOfWeek === 1) {
                        resolve(reminderTimeMS > todayBeganMS && reminderTimeMS < todayEnds);
                    } else {
                        resolve(false);
                    }

                // "Tuesdays"
                case "Tuesdays":
                    if (dayOfWeek === 2) {
                        resolve(reminderTimeMS > todayBeganMS && reminderTimeMS < todayEnds);
                    } else {
                        resolve(false);
                    }

                // "Wednesdays"
                case "Wednesdays":
                    if (dayOfWeek === 3) {
                        resolve(reminderTimeMS > todayBeganMS && reminderTimeMS < todayEnds);
                    } else {
                        resolve(false);
                    }

                // "Thursdays"
                case "Thursdays":
                    if (dayOfWeek === 4) {
                        resolve(reminderTimeMS > todayBeganMS && reminderTimeMS < todayEnds);
                    } else {
                        resolve(false);
                    }

                // "Fridays"
                case "Fridays":
                    if (dayOfWeek === 5) {
                        resolve(reminderTimeMS > todayBeganMS && reminderTimeMS < todayEnds);
                    } else {
                        resolve(false);
                    }

                // "Saturdays"
                case "Saturdays":
                    if (dayOfWeek === 6) {
                        resolve(reminderTimeMS > todayBeganMS && reminderTimeMS < todayEnds);
                    } else {
                        resolve(false);
                    }

                // "Sundays"
                case "Sundays":
                    if (dayOfWeek === 0) {
                        resolve(reminderTimeMS > todayBeganMS && reminderTimeMS < todayEnds);
                    } else {
                        resolve(false);
                    }

                // "Mondays, Tuesdays"
                case "Mondays, Tuesdays":
                    if (dayOfWeek === 1 || dayOfWeek === 2) {
                        resolve(reminderTimeMS > todayBeganMS && reminderTimeMS < todayEnds);
                    } else {
                        resolve(false);
                    }

                // "Mondays, Wednesdays"
                case "Mondays, Wednesdays":
                    if (dayOfWeek === 1 || dayOfWeek === 3) {
                        resolve(reminderTimeMS > todayBeganMS && reminderTimeMS < todayEnds);
                    } else {
                        resolve(false);
                    }

                // "Mondays, Fridays"
                case "Mondays, Fridays":
                    if (dayOfWeek === 1 || dayOfWeek === 5) {
                        resolve(reminderTimeMS > todayBeganMS && reminderTimeMS < todayEnds);
                    } else {
                        resolve(false);
                    }

                // "Tuesdays, Thursdays"
                case "Mondays, Thursdays":
                    if (dayOfWeek === 2 || dayOfWeek === 4) {
                        resolve(reminderTimeMS > todayBeganMS && reminderTimeMS < todayEnds);
                    } else {
                        resolve(false);
                    }

                // "Wednesdays, Fridays"
                case "Wednesdays, Fridays":
                    if (dayOfWeek === 3 || dayOfWeek === 5) {
                        resolve(reminderTimeMS > todayBeganMS && reminderTimeMS < todayEnds);
                    } else {
                        resolve(false);
                    }

                // "Mondays, Tuesdays, Wednesdays"
                case "Mondays, Tuesdays, Wednesdays":
                    if (dayOfWeek === 1 || dayOfWeek === 2 || dayOfWeek === 3) {
                        resolve(reminderTimeMS > todayBeganMS && reminderTimeMS < todayEnds);
                    } else {
                        resolve(false);
                    }

                // "Mondays, Tuesdays, Wednesdays, Thursdays"
                case "Mondays, Tuesdays, Wednesdays, Thursdays":
                    if (dayOfWeek === 1 || dayOfWeek === 2 || dayOfWeek === 3 || dayOfWeek === 4) {
                        resolve(reminderTimeMS > todayBeganMS && reminderTimeMS < todayEnds);
                    } else {
                        resolve(false);
                    }

                // "Mondays, Wednesdays, Fridays"
                case "Mondays, Wednesdays, Fridays":
                    if (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5) {
                        resolve(reminderTimeMS > todayBeganMS && reminderTimeMS < todayEnds);
                    } else {
                        resolve(false);
                    }
            }
        }
    });
}

/*
    Sends a message to FB Messenger
*/
function sendMessage(senderId, ourMessage) {
    return new Promise((resolve, reject) => {
        request({
            url: 'https://graph.facebook.com/v2.6/me/messages',
            qs: {access_token: FACEBOOK_ACCESS_TOKEN},
            method: 'POST',
            json: {
                recipient: {id: senderId},
                message: ourMessage,
            }
        });
        resolve(true);
    });
}

/*
    Gets all reminders for a given userID
    Separated in a function due to promisification
*/
function allUsersRemindersFromDB(userID) {
    return new Promise((resolve, reject) => {
        const MongoClient = require("mongodb").MongoClient;
        const url = mongoURL;

        MongoClient.connect(url, function (err, db) {
            if (err) reject(false);
            const dbo = db.db(dbName);

            dbo.collection(userID).find({}).toArray(function (err, remindersArr) {
                if (err) reject(false);
                if (remindersArr) {
                    console.log();
                    console.log("Hello from allUsersRemindersFromDB()");
                    resolve(remindersArr);
                }
            });
        });
    });
}

