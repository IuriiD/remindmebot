'use strict';

const request = require('request');
//const mongoURL = "mongodb://127.0.0.1:27017/";
const mongoURL = "mongodb://IuriiD:mlab111@ds137650.mlab.com:37650/remindmebot";
const dbName = 'remindmebot';

const templates = require('./templates');
const keys = require('../keys');

const FACEBOOK_ACCESS_TOKEN = keys.FBTOKEN;
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
const createReminder = (user, reminderDescription, reminderTime, reminderDate=null, reminderRecurrence=null) => {
    return new Promise((resolve, reject) => {

        const MongoClient = require("mongodb").MongoClient;
        const url = mongoURL;

        MongoClient.connect(url, function(err, db) {
            if (err) reject(false);

            const dbo = db.db();

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
                snoozedToTime: null,     // field reserved for saving time (00:00-23:59) to which reminder was postponed,
                                         // reminderTime + snoozeForMin
                reminderConfirmed: null  // all reminders today with reminderTime/snoozedToTime in past have to be confirmed
            };

            console.log('myReminder: ' + myReminder);

            dbo.collection(user).insertOne(myReminder, function(err, res) {
                if (err) reject(false);
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
                    reject(false);
                }
            });
        });
    });
};


/*
Returns an array of reminder that should be executed at this minute
*/
const remindersToAlert = () => {
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
        let originalReminderTime = "";

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
            const dbo = db.db();

            // For every collection in DB
            dbo.listCollections().toArray(function (err, collArray) {
                if (err) reject(false);

                if (collArray && collArray.length > 0) {
                    // Get a list of reminders and a collection name (=sender ID)
                    for (let i = 0; i < collArray.length; i++) {
                        userID = collArray[i]["name"];
                        console.log("USER " + userID);

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
                                    originalReminderTime = remindersArr[x]["reminderTime"];
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

                                    return ifReminderIsToday(reminderWasSet, reminderTime, reminderDate, reminderRecurrence, snoozedToTime)

                                        .then(ifToday => {
                                            if (ifToday && reminderTimeMS < currTimeMS && reminderConfirmed != todaysDateStr) {

                                                let speech = `ALERT!\n\nYou asked to remind you about "${reminderDescription}" at ${originalReminderTime}`;


                                                let newMessage = sendMessage(userID, templates.buttonsConfirmSnooze(speech, reminderID));
                                                newMessage.then(() => {
                                                    console.log("Alert");
                                                });
                                            }
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
};


/*
    Checks if a reminder with given reminderID for a given user should be alerted today
*/
const ifReminderIsToday = (reminderWasSet, reminderTime, reminderDate, reminderRecurrence, snoozedToTime) => {
    return new Promise((resolve, reject) => {
        // Get today's date and determine time, day of the week (and if it's a weekend/weekday), date, month
        let today = new Date();
        today.setHours(today.getHours() + 3);
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
};

const ifReminderIsToday1 = (reminderWasSet, reminderTime, reminderDate, reminderRecurrence, snoozedToTime) => {
        // Get today's date and determine time, day of the week (and if it's a weekend/weekday), date, month
        let today = new Date();
        today.setHours(today.getHours() + 3);
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
                return (reminderTimeMS > todayBeganMS && reminderTimeMS < todayEnds);
            } else {
                console.log("It's NOT today! (ifReminderIsToday)");
                return false;
            }

            // If it's a recurrent reminder
        } else {
            switch (reminderRecurrence) {
                // Daily - check if reminder's time hasn't passed today
                case "Daily":
                    if (reminderTimeMS > todayBeganMS && reminderTimeMS < todayEnds) {
                        console.log("It's today! (ifReminderIsToday)");
                        return true;
                    };

                // Weekly - check if the day reminder was set === today's day and then check the time
                case "Weekly":
                    if (reminderWasSetDay === dayOfWeek) {
                        resolve(reminderTimeMS > todayBeganMS && reminderTimeMS < todayEnds);
                    } else {
                        return false;
                    }

                // Monthly - check if the date reminder was set === today's day and then check the time
                case "Monthly":
                    if (reminderWasSetDate === todaysDateDate) {
                        resolve(reminderTimeMS > todayBeganMS && reminderTimeMS < todayEnds);
                    } else {
                        return false;
                    }

                // Weekends - check if today is a weekend and then check the time
                case "Weekends":
                    if (dayOfWeek === 6 || dayOfWeek === 0) {
                        resolve(reminderTimeMS > todayBeganMS && reminderTimeMS < todayEnds);
                    } else {
                        return false;
                    }

                // Weekdays - check if today is a week day and then check the time
                case "Weekdays":
                    if (dayOfWeek > 0 && dayOfWeek < 6) {
                        resolve(reminderTimeMS > todayBeganMS && reminderTimeMS < todayEnds);
                    } else {
                        return false;
                    }

                // "Mondays"
                case "Mondays":
                    if (dayOfWeek === 1) {
                        resolve(reminderTimeMS > todayBeganMS && reminderTimeMS < todayEnds);
                    } else {
                        return false;
                    }

                // "Tuesdays"
                case "Tuesdays":
                    if (dayOfWeek === 2) {
                        resolve(reminderTimeMS > todayBeganMS && reminderTimeMS < todayEnds);
                    } else {
                        return false;
                    }

                // "Wednesdays"
                case "Wednesdays":
                    if (dayOfWeek === 3) {
                        resolve(reminderTimeMS > todayBeganMS && reminderTimeMS < todayEnds);
                    } else {
                        return false;
                    }

                // "Thursdays"
                case "Thursdays":
                    if (dayOfWeek === 4) {
                        resolve(reminderTimeMS > todayBeganMS && reminderTimeMS < todayEnds);
                    } else {
                        return false;
                    }

                // "Fridays"
                case "Fridays":
                    if (dayOfWeek === 5) {
                        resolve(reminderTimeMS > todayBeganMS && reminderTimeMS < todayEnds);
                    } else {
                        return false;
                    }

                // "Saturdays"
                case "Saturdays":
                    if (dayOfWeek === 6) {
                        resolve(reminderTimeMS > todayBeganMS && reminderTimeMS < todayEnds);
                    } else {
                        return false;
                    }

                // "Sundays"
                case "Sundays":
                    if (dayOfWeek === 0) {
                        resolve(reminderTimeMS > todayBeganMS && reminderTimeMS < todayEnds);
                    } else {
                        return false;
                    }

                // "Mondays, Tuesdays"
                case "Mondays, Tuesdays":
                    if (dayOfWeek === 1 || dayOfWeek === 2) {
                        resolve(reminderTimeMS > todayBeganMS && reminderTimeMS < todayEnds);
                    } else {
                        return false;
                    }

                // "Mondays, Wednesdays"
                case "Mondays, Wednesdays":
                    if (dayOfWeek === 1 || dayOfWeek === 3) {
                        resolve(reminderTimeMS > todayBeganMS && reminderTimeMS < todayEnds);
                    } else {
                        return false;
                    }

                // "Mondays, Fridays"
                case "Mondays, Fridays":
                    if (dayOfWeek === 1 || dayOfWeek === 5) {
                        resolve(reminderTimeMS > todayBeganMS && reminderTimeMS < todayEnds);
                    } else {
                        return false;
                    }

                // "Tuesdays, Thursdays"
                case "Mondays, Thursdays":
                    if (dayOfWeek === 2 || dayOfWeek === 4) {
                        resolve(reminderTimeMS > todayBeganMS && reminderTimeMS < todayEnds);
                    } else {
                        return false;
                    }

                // "Wednesdays, Fridays"
                case "Wednesdays, Fridays":
                    if (dayOfWeek === 3 || dayOfWeek === 5) {
                        resolve(reminderTimeMS > todayBeganMS && reminderTimeMS < todayEnds);
                    } else {
                        return false;
                    }

                // "Mondays, Tuesdays, Wednesdays"
                case "Mondays, Tuesdays, Wednesdays":
                    if (dayOfWeek === 1 || dayOfWeek === 2 || dayOfWeek === 3) {
                        resolve(reminderTimeMS > todayBeganMS && reminderTimeMS < todayEnds);
                    } else {
                        return false;
                    }

                // "Mondays, Tuesdays, Wednesdays, Thursdays"
                case "Mondays, Tuesdays, Wednesdays, Thursdays":
                    if (dayOfWeek === 1 || dayOfWeek === 2 || dayOfWeek === 3 || dayOfWeek === 4) {
                        resolve(reminderTimeMS > todayBeganMS && reminderTimeMS < todayEnds);
                    } else {
                        return false;
                    }

                // "Mondays, Wednesdays, Fridays"
                case "Mondays, Wednesdays, Fridays":
                    if (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5) {
                        resolve(reminderTimeMS > todayBeganMS && reminderTimeMS < todayEnds);
                    } else {
                        return false;
                    }
            }
        }
};

/*
    Sends a message to FB Messenger
*/
const sendMessage = (senderId, ourMessage) => {
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
        console.log('sendMessage message');
        resolve(true);
    });
};


/*
    For a given user removes reminder with _id which corresponds to (reminderN-1) in the list reminders left for today
*/
const deleteReminder = (user, reminderDocID) => {
    return new Promise((resolve, reject) => {

        const MongoClient = require("mongodb").MongoClient;
        const url = mongoURL;

        MongoClient.connect(url, function(err, db) {
            if (err) reject(false);

            const dbo = db.db();

            dbo.collection(user).findOne(
                {
                    _id: reminderDocID
                },
                function(err, result) {
                    if (err) reject(false);
                    if (result) {
                        // Reminder with reminderNumber found - remove this document
                        const documentToDeleteID = {_id: reminderDocID};
                        dbo.collection(user).deleteOne(documentToDeleteID, function(err, obj) {
                            if (err) {
                                console.log("Failed to delete this reminder");
                                db.close();
                                resolve(false);
                            }
                            if (obj) {
                                console.log("Reminder successfully deleted!");
                                db.close();
                                resolve(true);
                            }
                        });

                    } else {
                        // No document with reminderNumber found
                        console.log("Reminder not found");
                        db.close();
                        resolve(false);
                    }
                });
        });
    });
};


/*
    Checks if the given time (hh:mm, 00:00-23:59) is in future for today
*/
const ifInFuture = (someTime) => {
    const currentTime = new Date().getTime();

    const givenHours = someTime.split(":")[0];
    const givenMinutes = someTime.split(":")[1];
    const givenTime = new Date().setHours(givenHours, givenMinutes, 0, 0)

    if (givenTime>currentTime) {
        return true;
    } else {
        return false;
    }
};


/*
    Check if such a reminder doesn't exist yet (a reminder with the same reminderContent and on the same reminderTime)
    Other variants including [same reminderTime with different reminderTime] and
    [same reminderTime with different reminderContent] are allowed
*/
const checkForDuplicates = (user, reminderContent, reminderTime) => {
    const MongoClient = require("mongodb").MongoClient;
    const url = mongoURL;

    MongoClient.connect(url, function(err, db) {
        if (err) throw err;
        const dbo = db.db();
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
};


/*
    Deletes all documents in collection for a given user
*/
const clearAllReminders = (user) => {
    return new Promise((resolve, reject) => {
        console.log("Deleting all reminders for user " + user);
        const MongoClient = require("mongodb").MongoClient;
        const url = mongoURL;

        MongoClient.connect(url, function (err, db) {
            if (err) reject(false);
            const dbo = db.db();

            dbo.listCollections({name: user}).next(function (err, collinfo) {
                if (collinfo) {
                    dbo.collection(user).drop(function (err, delOK) {
                        if (err) reject(false);
                        if (delOK) {
                            console.log("Collection for user " + user + " was deleted");
                            db.close();
                            resolve(true);
                        } else {
                            console.log("Failed to delete collection for user " + user);
                            db.close();
                            reject(false);
                        }
                    });
                } else {
                    console.log("Collection " + user + " not found");
                    db.close();
                    reject(false);
                }
            });
        });
    });
};


/*
    Gets all reminders for a given userID
    Separated in a function due to promisification
*/
const allUsersRemindersFromDB = (userID) => {
    return new Promise((resolve, reject) => {
        const MongoClient = require("mongodb").MongoClient;
        const url = mongoURL;

        MongoClient.connect(url, function (err, db) {
            if (err) reject(false);
            const dbo = db.db();

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
};


/*
    Retrieves and returns a list of reminders for today for a given user

*/
const showAllReminders4Today = (user) => {
    return new Promise((resolve, reject) => {
        const MongoClient = require("mongodb").MongoClient;
        const url = mongoURL;

        let todaysRemindersIDs = [];

        MongoClient.connect(url, function(err, db) {
            if (err) reject(false);
            const dbo = db.db();

            dbo.collection(user).find({}).toArray(function(err, result) {
                if (err) reject(false);

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
                resolve(sortRemindersByTime(todaysRemindersIDs));
            });
        });
    });
};


/*
    Sorts a list of reminders by reminderTime; supportive function
*/
const sortRemindersByTime = (remindersArray) => {
    // reminderTime is saved as a string "hh:mm"; let's add an int value (hh * 60 + mm) to each reminder object
    let newRemindersArray = remindersArray;
    console.log("newRemindersArray: " + newRemindersArray);
    let reminderTime = "";
    let reminderTimeMin = "";
    let reminderTimeHoursInt = "";
    let reminderTimeMinutesInt = "";
    for (let i=0; i<remindersArray.length; i++) {
        reminderTime = remindersArray[i]["reminderTime"];
        reminderTimeHoursInt = Number(reminderTime.split(":")[0]);
        reminderTimeMinutesInt = Number(reminderTime.split(":")[1]);
        reminderTimeMin = reminderTimeHoursInt * 60 + reminderTimeMinutesInt;
        newRemindersArray[i]["reminderTimeMin"] = reminderTimeMin;
    }
    return newRemindersArray.sort(compareReminders);
};


/*
    Prepares sorting instructions for sortRemindersByTime()
*/
const compareReminders = (a, b) => {
    const reminderA = a.reminderTimeMin;
    const reminderB = b.reminderTimeMin;

    let comparison = 0;
    if (reminderA > reminderB) {
        comparison = 1;
    } else if (reminderA < reminderB) {
        comparison = -1;
    }
    return comparison;
};


/*
    "Snoozes" (postpones) reminder with id reminderDocID for a given user for snoozeForMin minutes from current time
*/
const snoozeReminder = (user, reminderDocID, snoozeForMin) => {
    // Get current time, correct hours from GMT to GTM+3 (Kiev), set hour, get time in ms, add snoozeForMin, convert
    // back to "hh:mm"
    return new Promise((resolve, reject) => {
        let today = new Date();
        const todaysHours = today.getHours() + 3;
        const todaysMinutes = today.getMinutes();
        console.log(`Current time: ${todaysHours}:${todaysMinutes}`);

        today.setHours(todaysHours, todaysMinutes, 0, 0);
        let snoozedToTimeMS = today.getTime() + snoozeForMin * 60 * 1000;

        const snoozedDate = new Date(snoozedToTimeMS);
        const snoozedHours = snoozedDate.getHours();
        const snoozedMinutes = snoozedDate.getMinutes();
        const snoozedToTime = `${snoozedHours}:${snoozedMinutes}`;
        console.log("snoozedToTime: " + snoozedToTime);

        const MongoClient = require("mongodb").MongoClient;
        const url = mongoURL;
        const ObjectId = require('mongodb').ObjectID;
//
        MongoClient.connect(url, function (err, db) {
            if (err) throw err;
            const dbo = db.db();

            console.log("reminderDocID: " + reminderDocID);
            dbo.collection(user).updateOne({"_id": new ObjectId(reminderDocID)}, {$set: {"snoozedToTime": snoozedToTime}}, function (err, res) {
                if (err) {
                    console.log(err);
                    db.close();
                    throw err;
                }
                if (res) {
                    console.log(`Reminder ${reminderDocID} was snoozed`);
                    resolve(true);
                    db.close();
                }
            });
        });
    });
};


/*
    Reminder confirmation means that the field reminderConfirmed gets todays' date timestamp (e.g. 2018-05-25)
    and snoozedToTime field is set to null
*/
const confirmReminder = (user, reminderDocID) => {
    return new Promise((resolve, reject) => {
        console.log();
        console.log(`Confirming reminder ${reminderDocID} for user ${user}`);
        const MongoClient = require("mongodb").MongoClient;
        const ObjectId = require('mongodb').ObjectID;
        const url = mongoURL;


        const today = new Date();
        const todaysYear = today.getFullYear();
        const todaysMonth = today.getMonth()+1;
        const todaysDate = today.getDate();
        const todaysDateStr = `${todaysYear}-${todaysMonth}-${todaysDate}`;

        const myQuery = {"_id": new ObjectId(reminderDocID)};
        MongoClient.connect(url, function(err, db) {
            if (err) throw err;
            const dbo = db.db();

            dbo.collection(user).findOne(myQuery, function(err, res) {
                if (err) throw err;
                if (res) {
                    console.log("Here");
                    dbo.collection(user).updateOne(myQuery, {$set: {"reminderConfirmed": todaysDateStr, "snoozedToTime": null}}, function(err, res) {
                        if (err) {
                            throw err;
                            db.close();
                        }
                        if (res) {
                            console.log(`Reminder was confirmed`);
                            db.close();
                            resolve(true);
                        }

                    });
                } else {
                    // No document with reminderNumber found
                    console.log("Reminder not found");
                    db.close();
                    resolve(false);
                }
            });
        });
    });
};

module.exports = {
    ifReminderIsToday,
    remindersToAlert,
    createReminder,
    sendMessage,
    allUsersRemindersFromDB,
    deleteReminder,
    ifInFuture,
    checkForDuplicates,
    clearAllReminders,
    showAllReminders4Today,
    sortRemindersByTime,
    compareReminders,
    snoozeReminder,
    confirmReminder
};
