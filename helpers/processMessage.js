'use strict';

/*
    "Simplifications" in MVP:
    1) no "ends on"/till feature - all reminders besides those that execute "once", are repeated forever;
    2) no reminders editing (delete and create a new reminder instead if needed);
*/

const API_AI_TOKEN = 'c2a8b983845543e2b0d54018ad01d2d1';
const apiAiClient = require('apiai')(API_AI_TOKEN);

const FACEBOOK_ACCESS_TOKEN = 'EAATjFac0PR8BAO0hMjmlp9ASuciijPKDbX9Lrv5ZAECz5m8PUGdAx6DO9UX9xlFSNuEcML9ZBqXg56yET4sJZCNOIqHRIQczfAZAZCG0KEZAHlTwLcvnouCeTg6MSONzzNyM1MbSuLqHqjp4SMoXjfg4vK2EI3Uu5hdcJZCpyJX6tXyGdVt09PhXtWMp7CVqQgZD';
const request = require('request');

const mongoURL = "mongodb://127.0.0.1:27017/";
const dbName = 'remindmebot';
const snoozeForMin = 5;

/*
    Inserts a document to collection 'user' in DB 'remindmebot'
    reminderDescription - what to remind about (any text); required
    reminderTime - date-time of reminder (00:00-23:59); required
    reminderDate - is considered if (reminderRecurrence===false), arbitrary date (yyyy-mm-dd, mm 1-12); optional,
        if (!reminderRecurrence && reminderDate=="") {reminderDate = today}
    reminderRecurrence - optional

    Possible variants of reminderRecurrence and reminderDate:
    0) if (reminderRecurrence === false && reminderDate === null) = today (reminder time must be in future);
    1) if (reminderRecurrence === false && reminderDate !== null) = at specific date for eg. 2018-10-05;
    2) if (reminderRecurrence === true) - reminderDate doesn't matter, possible variants of reminderRecurrence:
    2a) "Daily";
    2b) "Weekly" = on the same day of the week as reminder was set;
    2c) arbitrary variants ("Mondays"/"Tuesdays"/"Wednesdays"/"Thursdays"/"Fridays"/"Saturdays"/"Sundays" and their combinations (not all)
    ("Mon-Tue-Wed-Thu-Fri", "Mon-Wed-Fri", "Mon-Tue", "Mon-Wed", "Mon-Fri", "Tue-Thu", "Wed-Fri", "Sat-Sun");
    2d) "Weekdays" (=Mon-Tue-Wed-Thu-Fri);
    2e) "Weekends" (=Sat-Sun);
    2f) "Monthly" on the same day of the month (for eg., 25 or 01)
*/
function createReminder(user, reminderDescription, reminderTime, reminderDate=null, reminderRecurrence=null) {
    return new Promise((resolve, reject) => {

        const MongoClient = require("mongodb").MongoClient;
        const url = mongoURL;

        MongoClient.connect(url, function(err, db) {
            if (err) resolve(false);

            const dbo = db.db(dbName);

            if (!reminderRecurrence && !reminderDate) {
                let today = new Date();
                reminderDate = `${today.getFullYear()}-${today.getMonth()+1}-${today.getDate()}`;
            }

            if (reminderRecurrence) { reminderDate = null; }

            const myReminder = {
                reminderDescription: reminderDescription,
                reminderTime: reminderTime,
                reminderDate: reminderDate,
                reminderRecurrence: reminderRecurrence,
                snoozedToTime: null     // field reserved for saving time (00:00-23:59) to which reminder was postponed,
                                        // reminderTime + snoozeForMin
            };

            console.log('myReminder: ' + myReminder);

            dbo.collection(user).insertOne(myReminder, function(err, res) {
                if (err) resolve(false);
                if (res) {
                    // Logging
                    let recurrenceWording = "";
                    if (!reminderRecurrence) {
                        recurrenceWording = "once";
                        if (reminderTime) {
                            recurrenceWording += ` on ${reminderDate}`;
                        } else {recurrenceWording += "today"}
                    } else {
                        recurrenceWording = `repeatedly (${reminderRecurrence})`;
                    }
                    console.log(`A reminder ${reminderDescription} was set. It will be triggered ${recurrenceWording}`);

                    db.close();
                    resolve(true);
                } else {
                    console.log("Failed to set a reminder");
                    db.close();
                    resolve(false);
                }
            });
        });
    });
}


/*
    Checks if the given time (hh:mm, 00:00-23:59) is in future for today
*/
function ifInFuture(someTime) {
    const currentTime = new Date().getTime();

    const givenHours = someTime.split(":")[0];
    const givenMinutes = someTime.split(":")[1];
    const givenTime = new Date().setHours(givenHours, givenMinutes, 0, 0)

    if (givenTime>currentTime) {
        return true;
    } else {
        return false;
    }
}

/*
    Check if such a reminder doesn't exist yet (a reminder with the same reminderContent and on the same reminderTime)
    Other variants including [same reminderTime with different reminderTime] and
    [same reminderTime with different reminderContent] are allowed
*/
function checkForDuplicates(user, reminderContent, reminderTime) {
    const MongoClient = require("mongodb").MongoClient;
    const url = mongoURL;

    MongoClient.connect(url, function(err, db) {
        if (err) throw err;
        const dbo = db.db(dbName);
        dbo.collection(user).findOne(
            {
                reminderContent: reminderContent,
                reminderTime: reminderTime
            },
            function(err, result) {
                if (err) throw err;
                if (result) {
                    console.log("Such reminder already exists");
                    db.close();
                    return true;
                } else {
                    console.log("No duplicates found");
                    db.close();
                    return false;
                }
            });
    });
}


/*
    Removes a document with reminderDocID (_id) for a given user
*/
function deleteReminder(user, reminderDocID) {
    const MongoClient = require("mongodb").MongoClient;
    const url = mongoURL;

    MongoClient.connect(url, function(err, db) {
        if (err) throw err;
        const dbo = db.db(dbName);
        dbo.collection(user).findOne(
            {
                _id: reminderDocID
            },
            function(err, result) {
                if (err) throw err;
                if (result) {
                    // Reminder with reminderNumber found - remove this document
                    const documentToDeleteID = {_id: reminderDocID};
                    dbo.collection(user).deleteOne(documentToDeleteID, function(err, obj) {
                        if (err) {
                            console.log("Failed to delete this reminder");
                            throw err;
                            db.close();
                        } else {
                            console.log("Reminder successfully deleted!");
                        }
                        db.close();
                    });
                    return true;
                } else {
                    // No document with reminderNumber found
                    console.log("Reminder not found");
                    db.close();
                    return false;
                }
            });
    });
}

/*
    Deletes all documents in collection for a given user
*/
function clearAllReminders(user) {
    return new Promise((resolve, reject) => {
        const MongoClient = require("mongodb").MongoClient;
        const url = mongoURL;

        MongoClient.connect(url, function (err, db) {
            if (err) resolve(false);
            const dbo = db.db(dbName);

            dbo.listCollections({name: user}).next(function (err, collinfo) {
                if (collinfo) {
                    dbo.collection(user).drop(function (err, delOK) {
                        if (err) resolve(false);
                        if (delOK) {
                            console.log("Collection for user " + user + " was deleted");
                            db.close();
                            resolve(true);
                        } else {
                            console.log("Failed to delete collection for user " + user);
                            db.close();
                            resolve(false);
                        }
                    });
                } else {
                    console.log("Collection " + user + " not found");
                    db.close();
                    resolve(false);
                }
            });
        });
    });
}


/*
    Checks if a reminder with given reminderID for a given user should be alerted today
*/
function ifReminderIsToday(reminderWasSet, reminderTime, reminderDate, reminderRecurrence, snoozedToTime) {
    // Get today's date and determine time, day of the week (and if it's a weekend/weekday), date, month
    const today = new Date();
    const todaysDateYear = today.getFullYear();
    const todaysDateMonth = today.getMonth()+1; // 0-11 >> 1-12
    const todaysDateDate = today.getDate();
    const dayOfWeek = today.getDay(); // 0-6, Sun=0
    const currentTime = today.getTime(); // ms

    const todayBegan = new Date();
    const todayBeganMS = todayBegan.setHours(0, 0, 0, 0);
    const todayEnds = todayBeganMS + 86400000-1; // ms in 1 day

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
            return (reminderTimeMS>currentTime && reminderTimeMS<todayEnds);
        } else {
            return false;
        }

        // If it's a recurrent reminder
    } else {
        switch(reminderRecurrence) {
            // Daily - check if reminder's time hasn't passed today
            case "Daily":
                return (reminderTimeMS>currentTime && reminderTimeMS<todayEnds);

            // Weekly - check if the day reminder was set === today's day and then check the time
            case "Weekly":
                if (reminderWasSetDay === dayOfWeek) {
                    return (reminderTimeMS>currentTime && reminderTimeMS<todayEnds);
                } else {
                    return false;
                }

            // Monthly - check if the date reminder was set === today's day and then check the time
            case "Monthly":
                if (reminderWasSetDate === todaysDateDate) {
                    return (reminderTimeMS>currentTime && reminderTimeMS<todayEnds);
                } else {
                    return false;
                }

            // Weekends - check if today is a weekend and then check the time
            case "Weekends":
                if (dayOfWeek === 6 || dayOfWeek === 0) {
                    return (reminderTimeMS>currentTime && reminderTimeMS<todayEnds);
                } else {
                    return false;
                }

            // Weekdays - check if today is a week day and then check the time
            case "Weekdays":
                if (dayOfWeek > 0 && dayOfWeek < 6) {
                    return (reminderTimeMS>currentTime && reminderTimeMS<todayEnds);
                } else {
                    return false;
                }

            // "Mondays"
            case "Mondays":
                if (dayOfWeek === 1) {
                    return (reminderTimeMS>currentTime && reminderTimeMS<todayEnds);
                } else {
                    return false;
                }

            // "Tuesdays"
            case "Tuesdays":
                if (dayOfWeek === 2) {
                    return (reminderTimeMS>currentTime && reminderTimeMS<todayEnds);
                } else {
                    return false;
                }

            // "Wednesdays"
            case "Wednesdays":
                if (dayOfWeek === 3) {
                    return (reminderTimeMS>currentTime && reminderTimeMS<todayEnds);
                } else {
                    return false;
                }

            // "Thursdays"
            case "Thursdays":
                if (dayOfWeek === 4) {
                    return (reminderTimeMS>currentTime && reminderTimeMS<todayEnds);
                } else {
                    return false;
                }

            // "Fridays"
            case "Fridays":
                if (dayOfWeek === 5) {
                    return (reminderTimeMS>currentTime && reminderTimeMS<todayEnds);
                } else {
                    return false;
                }

            // "Saturdays"
            case "Saturdays":
                if (dayOfWeek === 6) {
                    return (reminderTimeMS>currentTime && reminderTimeMS<todayEnds);
                } else {
                    return false;
                }

            // "Sundays"
            case "Sundays":
                if (dayOfWeek === 0) {
                    return (reminderTimeMS>currentTime && reminderTimeMS<todayEnds);
                } else {
                    return false;
                }

            // "Mondays, Tuesdays"
            case "Mondays, Tuesdays":
                if (dayOfWeek === 1 || dayOfWeek === 2) {
                    return (reminderTimeMS>currentTime && reminderTimeMS<todayEnds);
                } else {
                    return false;
                }

            // "Mondays, Wednesdays"
            case "Mondays, Wednesdays":
                if (dayOfWeek === 1 || dayOfWeek === 3) {
                    return (reminderTimeMS>currentTime && reminderTimeMS<todayEnds);
                } else {
                    return false;
                }

            // "Mondays, Fridays"
            case "Mondays, Fridays":
                if (dayOfWeek === 1 || dayOfWeek === 5) {
                    return (reminderTimeMS>currentTime && reminderTimeMS<todayEnds);
                } else {
                    return false;
                }

            // "Tuesdays, Thursdays"
            case "Mondays, Thursdays":
                if (dayOfWeek === 2 || dayOfWeek === 4) {
                    return (reminderTimeMS>currentTime && reminderTimeMS<todayEnds);
                } else {
                    return false;
                }

            // "Wednesdays, Fridays"
            case "Wednesdays, Fridays":
                if (dayOfWeek === 3 || dayOfWeek === 5) {
                    return (reminderTimeMS>currentTime && reminderTimeMS<todayEnds);
                } else {
                    return false;
                }

            // "Mondays, Tuesdays, Wednesdays"
            case "Mondays, Tuesdays, Wednesdays":
                if (dayOfWeek === 1 || dayOfWeek === 2 || dayOfWeek === 3) {
                    return(reminderTimeMS>currentTime && reminderTimeMS<todayEnds);
                } else {
                    return false;
                }

            // "Mondays, Tuesdays, Wednesdays, Thursdays"
            case "Mondays, Tuesdays, Wednesdays, Thursdays":
                if (dayOfWeek === 1 || dayOfWeek === 2 || dayOfWeek === 3 || dayOfWeek === 4) {
                    return (reminderTimeMS>currentTime && reminderTimeMS<todayEnds);
                } else {
                    return false;
                }

            // "Mondays, Wednesdays, Fridays"
            case "Mondays, Wednesdays, Fridays":
                if (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5) {
                    return (reminderTimeMS>currentTime && reminderTimeMS<todayEnds);
                } else {
                    return false;
                }
        }
    }

}


/*
    Retrieves and returns a list of reminders for today for a given user

    Get reminder's parameters reminderTime, ifRepeated (>> reminderDate or reminderRecurrence), snoozedToTime
    Check if today's time parameters === reminder's time parameters

*/
function showAllReminders4Today(user) {
    return new Promise((resolve, reject) => {
        const MongoClient = require("mongodb").MongoClient;
        const url = mongoURL;

        let todaysRemindersIDs = [];

        MongoClient.connect(url, function(err, db) {
            if (err) resolve(false);
            const dbo = db.db(dbName);

            dbo.collection(user).find({}).toArray(function(err, result) {
                if (err) resolve(false);

                let reminderID = "";
                let reminderTime = "";
                let reminderDate = "";
                let reminderRecurrence = "";
                let snoozedToTime = "";
                let reminderWasSet = null;
                for (let i=0; i<result.length; i++) {
                    reminderID = result[i]["_id"];
                    reminderWasSet = result[i]["_id"].getTimestamp();
                    reminderTime = result[i]["reminderTime"];
                    reminderDate = result[i]["reminderDate"];
                    reminderRecurrence = result[i]["reminderRecurrence"];
                    snoozedToTime = result[i]["snoozedToTime"];

                    console.log('reminderID ' + reminderID);
                    if (ifReminderIsToday(reminderWasSet, reminderTime,
                        reminderDate, reminderRecurrence, snoozedToTime)) {
                        todaysRemindersIDs.push({
                            reminderID: reminderID,
                            reminderDescription: result[i]["reminderDescription"],
                            reminderTime: reminderTime
                        });
                    }
                }
                db.close();
                resolve(todaysRemindersIDs);
            });
        });
    });
}


/*
    "Snoozes" (postpones) reminder with id reminderDocID for a given user for snoozeForMin minutes
*/
function snoozeReminder(user, reminderDocID, snoozeForMin) {
    const MongoClient = require("mongodb").MongoClient;
    const url = mongoURL;
    const myQuery = {"_id": reminderDocID};

    MongoClient.connect(url, function(err, db) {
        if (err) throw err;
        const dbo = db.db(dbName);
        dbo.collection(user).findOne(myQuery, function(err, result) {
            if (err) throw err;
            if (result) {
                // Reminder might be already snoozed
                let snoozedToTime;
                snoozedToTime = result["snoozedToTime"];
                let reminderTime;
                if (!snoozedToTime) {
                    reminderTime = result["reminderTime"];
                } else {
                    reminderTime = snoozedToTime;
                }

                // Transform snoozeForMin into ms
                const snoozeForMS = snoozeForMin + 900000;

                // Transform reminderTime to ms
                const reminderTimeHours = reminderTime.split(":")[0];
                const reminderTimeMinutes = reminderTime.split(":")[1];
                const reminderTimeMS = new Date().setHours(reminderTimeHours, reminderTimeMinutes, 0, 0);

                // Next alert
                const snoozedTillMS = reminderTimeMS + snoozeForMS;

                // Back from ms to hh:mm
                const snoozedTillHelper = new Date(snoozedTillMS);
                const snoozedTillHours = snoozedTillHelper.getHours();
                const snoozedTillMinutes = snoozedTillHelper.getMinutes();
                const snoozedTill = `${snoozedTillHours}:${snoozedTillMinutes}`;

                // Update value in DB
                const newValues =  {$set: {snoozedToTime: snoozedTill}};
                dbo.collection(user).updateOne(myQuery, newValues, function(err, res) {
                    if (err) throw err;
                    console.log(`Document with id ${reminderDocID} was updated`);
                    db.close();
                });
            } else {
                // No document with reminderNumber found
                console.log("Reminder not found");
                db.close();
                return false;
            }
        });
    });
}


/*
    Generates ObjectID from a proper hex string
*/
function generateID(hexString) {
    const ObjectID = require("mongodb").ObjectID;
    return ObjectID;
}


function sendTextMessage(senderId, text) {
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: { access_token: FACEBOOK_ACCESS_TOKEN },
        method: 'POST',
        json: {
            recipient: { id: senderId },
            message: { text },
        }
    });
};

module.exports = (event) => {
    const senderId = event.sender.id;
    const message = event.message.text;

    console.log();
    console.log('message from FB: ');
    console.log(message);
    //console.log();
    //console.log('event object from FB: ');
    //console.log(event);

    const apiaiSession = apiAiClient.textRequest(message, {sessionId: 'remindmebot'});

    apiaiSession.on('response', (dfResponse) => {
        console.log();
        console.log('Response from DF:');
        console.log(dfResponse);

        const actionTriggered = dfResponse.result.action;


        let AllReminders4Today = [];
        let actionIncomplete = true;
        let speech = "";
        switch(actionTriggered) {
            // Displaying reminders [for today]
            case "reminders.get":
                speech = "";
                AllReminders4Today = showAllReminders4Today(senderId);
                AllReminders4Today.then(function(data) {
                    for (let i=0; i<data.length; i++) {
                        if (i>0) { speech += "\n\n"; }
                        speech += `${data[i]["reminderTime"]}\n${data[i]["reminderDescription"]}`;
                    }
                    sendTextMessage(senderId, speech);
                });
                break;

            // Saving a reminder
            case "reminders.add":
                speech = "";
                let reminderDescription = "";
                let reminderTime = "";
                let reminderRecurrence = null;
                let reminderDate = null;

                actionIncomplete = dfResponse.result.actionIncomplete;

                if (!actionIncomplete) {
                    // All required info entered (reminderDescription and reminderTime)
                    reminderDescription = dfResponse.result.parameters.name;
                    reminderTime = dfResponse.result.parameters.time.slice(0, 5); // 10:00:00 >> 10:00
                    reminderRecurrence = dfResponse.result.parameters.recurrence;
                    if (!reminderRecurrence) {
                        reminderDate = dfResponse.result.parameters.date; // 2018-05-22, month 1-12
                    }

                    // Save reminder to db
                    const newReminder = createReminder(senderId, reminderDescription, reminderTime, reminderDate, reminderRecurrence);
                    newReminder.then(function(data) {
                        if (data) {
                            let reminderRecurrenceWording = "";
                            let reminderDateWording = "";
                            if (reminderRecurrence) {
                                reminderRecurrenceWording = ` (${reminderRecurrence})`;
                            }
                            if (reminderDate) {
                                reminderDateWording = `${reminderDate}`;
                            }
                            speech = `A reminder "${reminderDescription}" at ${reminderTime} ${reminderDateWording}${reminderRecurrenceWording} was successfully sheduled!`;
                        } else {
                            speech = "Kh... Sorry but I failed to save this reminder. Could you please try once again?";
                        }
                        sendTextMessage(senderId, speech);
                    });

                } else {
                    // Continue slot-filling
                    speech = dfResponse.result.fulfillment.speech;
                    sendTextMessage(senderId, speech);
                }
                break;

            // Deleting all reminders
            case "reminders.remove - context:confirm - comment:confirmation":
                const userEntered = dfResponse.result.parameters.deletion_confirmation;
                if (userEntered !== "CLEAR ALL") {
                    speech = "Sorry, but you didn't provide correct confirmation. Reminders were not deleted";
                } else {
                    const remindersDeletionFlag = clearAllReminders(senderId);
                    remindersDeletionFlag.then(function(data) {
                        if (data) {
                            speech = "All reminders have been successfully erased!";
                        } else {
                            speech = "Unfortunately I failed to delete your reminders.. :(";
                        }
                        sendTextMessage(senderId, speech);
                    });

                }
                break;

            // Default response (no key intents triggered) - pass DF's response
            default:
                speech = "";
                speech = dfResponse.result.fulfillment.speech;
                sendTextMessage(senderId, speech);
        }
    });

    apiaiSession.on('error', error => console.log(error));
    apiaiSession.end();
};