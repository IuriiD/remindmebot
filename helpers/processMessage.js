'use strict';

/*
    "Simplifications" in MVP:
    1) no "ends on"/till feature - all reminders besides those that execute "once", are repeated forever;
    2) no reminders editing (delete and create a new reminder instead if needed);
*/

const API_AI_TOKEN = 'c2a8b983845543e2b0d54018ad01d2d1';
const apiAiClient = require('apiai')(API_AI_TOKEN);

const FACEBOOK_ACCESS_TOKEN = 'EAATjFac0PR8BAFUhoISYR0W8PSfBtji6fETy3VaZAZCyyM03KJRNSvb8oNPfZCwaENMgO4ypYEF7ZAe3kQ7khNuxGu6HziL2qNIo7pylRMz8ZB6cQZBShkQVBcGZBAvbAIhlvBMfiSZCBca6mrxYQUv4dCvRhvq6Q7L1e3pqmnLt5narraqZCSleFdbwRlTjr33oZD';
const request = require('request');

const mongoURL = "mongodb://127.0.0.1:27017/";
const dbName = 'remindmebot';
const snoozeForMin = 5;




/*
let hi = [
  {
    "locale":"default",
    "composer_input_disabled":false,
    "call_to_actions":
    [
        {
            "title":"Add a reminder",
            "type":"postback",
            "payload":"remind me"
        },
        {
            "title":"Today's reminders",
            "type":"postback",
            "payload":"show reminders"
        },
        {
            "title":"Clear reminders",
            "type":"postback",
            "payload":"delete reminders"
        }
        ]
      }
    ];


// Call to set up Persistent menu
curl -X POST -H "Content-Type: application/json" -d '{
  "setting_type":"call_to_actions",
  "thread_state":"existing_thread",
  "call_to_actions":[
       {
        "title":"Add a reminder",
        "type":"postback",
        "payload":"remind me"
    },
    {
        "title":"Today's reminders",
        "type":"postback",
        "payload":"show reminders"
    },
    {
        "title":"Clear reminders",
        "type":"postback",
        "payload":"delete reminders"
    }
]
}' "https://graph.facebook.com/v2.6/me/thread_settings?access_token=EAATjFac0PR8BAFUhoISYR0W8PSfBtji6fETy3VaZAZCyyM03KJRNSvb8oNPfZCwaENMgO4ypYEF7ZAe3kQ7khNuxGu6HziL2qNIo7pylRMz8ZB6cQZBShkQVBcGZBAvbAIhlvBMfiSZCBca6mrxYQUv4dCvRhvq6Q7L1e3pqmnLt5narraqZCSleFdbwRlTjr33oZD"


// Call to delete persistent menu
curl -X DELETE -H "Content-Type: application/json" -d '{
  "setting_type":"call_to_actions",
  "thread_state":"existing_thread"
}' "https://graph.facebook.com/v2.6/me/thread_settings?access_token=EAATjFac0PR8BAFUhoISYR0W8PSfBtji6fETy3VaZAZCyyM03KJRNSvb8oNPfZCwaENMgO4ypYEF7ZAe3kQ7khNuxGu6HziL2qNIo7pylRMz8ZB6cQZBShkQVBcGZBAvbAIhlvBMfiSZCBca6mrxYQUv4dCvRhvq6Q7L1e3pqmnLt5narraqZCSleFdbwRlTjr33oZD"


// Call to set up "Get started" button
curl -X POST -H "Content-Type: application/json" -d '{
  "setting_type":"call_to_actions",
  "thread_state":"new_thread",
  "call_to_actions":[
    {
      "payload":"Greeting"
    }
  ]
}' "https://graph.facebook.com/v2.6/me/thread_settings?access_token=EAATjFac0PR8BAFUhoISYR0W8PSfBtji6fETy3VaZAZCyyM03KJRNSvb8oNPfZCwaENMgO4ypYEF7ZAe3kQ7khNuxGu6HziL2qNIo7pylRMz8ZB6cQZBShkQVBcGZBAvbAIhlvBMfiSZCBca6mrxYQUv4dCvRhvq6Q7L1e3pqmnLt5narraqZCSleFdbwRlTjr33oZD"


// Call to add greeting text
curl -X POST -H "Content-Type: application/json" -d '{
  "setting_type":"greeting",
  "greeting":{
    "text":"Hi {{user_first_name}}! Need help to manage your reminders? I can do that ;)"
  }
}' "https://graph.facebook.com/v2.6/me/thread_settings?access_token=EAATjFac0PR8BAFUhoISYR0W8PSfBtji6fETy3VaZAZCyyM03KJRNSvb8oNPfZCwaENMgO4ypYEF7ZAe3kQ7khNuxGu6HziL2qNIo7pylRMz8ZB6cQZBShkQVBcGZBAvbAIhlvBMfiSZCBca6mrxYQUv4dCvRhvq6Q7L1e3pqmnLt5narraqZCSleFdbwRlTjr33oZD"

// Call to delete greeting text
curl -X DELETE -H "Content-Type: application/json" -d '{
  "setting_type":"greeting"
}' "https://graph.facebook.com/v2.6/me/thread_settings?access_token=EAATjFac0PR8BAFUhoISYR0W8PSfBtji6fETy3VaZAZCyyM03KJRNSvb8oNPfZCwaENMgO4ypYEF7ZAe3kQ7khNuxGu6HziL2qNIo7pylRMz8ZB6cQZBShkQVBcGZBAvbAIhlvBMfiSZCBca6mrxYQUv4dCvRhvq6Q7L1e3pqmnLt5narraqZCSleFdbwRlTjr33oZD"


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
            if (err) reject(false);

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
}


/*
    For a given user removes reminder with _id which corresponds to (reminderN-1) in the list reminders left for today
*/
function deleteReminder(user, reminderDocID) {
    return new Promise((resolve, reject) => {

        const MongoClient = require("mongodb").MongoClient;
        const url = mongoURL;

        MongoClient.connect(url, function(err, db) {
            if (err) reject(false);

            const dbo = db.db(dbName);

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
    Deletes all documents in collection for a given user
*/
function clearAllReminders(user) {
    return new Promise((resolve, reject) => {
        console.log("Deleting all reminders for user " + user);
        const MongoClient = require("mongodb").MongoClient;
        const url = mongoURL;

        MongoClient.connect(url, function (err, db) {
            if (err) reject(false);
            const dbo = db.db(dbName);

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
            if (err) reject(false);
            const dbo = db.db(dbName);

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
}


/*
    Sorts a list of reminders by reminderTime; supportive function
*/
function sortRemindersByTime(remindersArray) {
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
}


/*
    Prepares sorting instructions for sortRemindersByTime()
*/
function compareReminders(a, b) {
    const reminderA = a.reminderTimeMin;
    const reminderB = b.reminderTimeMin;

    let comparison = 0;
    if (reminderA > reminderB) {
        comparison = 1;
    } else if (reminderA < reminderB) {
        comparison = -1;
    }
    return comparison;
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

/*
    Sends a text message to FB Messenger
*/
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

    const apiaiSession = apiAiClient.textRequest(message, {sessionId: 'remindmebot3'});

    apiaiSession.on('response', (dfResponse) => {
        console.log();
        console.log('Response from DF:');
        console.log(dfResponse);

        const actionTriggered = dfResponse.result.action;
        const contexts = dfResponse.result.contexts;
        let contextsList = [];
        for (let i=0; i<contexts.length; i++) {
            contextsList.push(contexts[i]["name"]);
        }

        console.log('actionTriggered: ' + actionTriggered);
        console.log('contextsList: ' + contextsList);


        let AllReminders4Today = [];
        let actionIncomplete = true;
        let speech = "";
        switch(actionTriggered) {
            // Displaying reminders [for today]
            case "reminders.get":
                speech = "";
                AllReminders4Today = showAllReminders4Today(senderId);
                AllReminders4Today.then(function(data) {
                    if (data.length>0) {
                        speech += `Here are our reminders left till the end of the day:\n`;
                        for (let i=0; i<data.length; i++) {
                            if (i>0) { speech += "\n\n"; }
                            speech += `\nReminder # ${i+1}`;
                            speech += `\nTime: ${data[i]["reminderTime"]}`;
                            speech += `\nDescription: ${data[i]["reminderDescription"]}`;
                        }
                    } else {
                        speech = "Sorry but you have no reminders for today"
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
                    })
                        .catch(err => {
                            speech = "Kh... Sorry but I failed to save this reminder. Could you please try once again?";
                            sendTextMessage(senderId, speech);
                        })

                } else {
                    // Continue slot-filling
                    speech = dfResponse.result.fulfillment.speech;
                    sendTextMessage(senderId, speech);
                }
                break;

            // Deleting all reminders
            case "reminders.remove-confirmed":
                const userEntered = dfResponse.result.parameters.deletion_confirmation;
                console.log("userEntered: " + userEntered);
                if (userEntered == "CLEAR ALL") {
                    console.log('Deleting reminders...');
                    const remindersDeletionFlag = clearAllReminders(senderId);
                    remindersDeletionFlag.then(function(data) {
                        if (data) {
                            speech = "All reminders have been successfully erased!";
                        } else {
                            speech = "Unfortunately I failed to delete your reminders.. :(";
                        }
                        sendTextMessage(senderId, speech);
                    })
                        .catch(err => {
                            speech = "Unfortunately I failed to delete your reminders.. :(";
                            sendTextMessage(senderId, speech);
                        })
                }
                break;

            // Incorrect reminders confirmation is cached by Default Fallback intent
            case "input.unknown":
                if (contextsList.includes("remove-confirm")) {
                    speech += "\nSorry, but you didn't provide a correct confirmation. Reminders were not deleted";
                    sendTextMessage(senderId, speech);
                } else {
                    speech = dfResponse.result.fulfillment.speech;
                    sendTextMessage(senderId, speech);
                }
                break;

            // Deleting at specific reminder
            case "remindersget.deletethisreminder":
                const reminderNumber = Number(dfResponse.result.contexts[0].parameters.number);
                console.log("Reminder to delete: " + reminderNumber);

                showAllReminders4Today(senderId)
                    .then(remindersArray => {
                        console.log("Got a list of todays reminders, N=" + remindersArray.length);
                        let reminderDocID = remindersArray[reminderNumber-1]["reminderID"];
                        console.log("Reminder to delete has ID " + reminderDocID);
                        return reminderDocID;
                        ;
                    })
                    .then(reminderDocID => {
                        let deleteReminderFlag = deleteReminder(senderId, reminderDocID);
                        console.log("Result of reminder deletion: " + deleteReminderFlag);
                        return deleteReminderFlag;
                    })
                    .then(deleteReminderFlag => {
                        if (deleteReminderFlag) {
                            let remindersArrayUpdated = showAllReminders4Today(senderId);
                            return remindersArrayUpdated;
                        } else {
                            return false;
                        }
                    })
                    .then(result => {
                        if (result) {
                            if (result.length>0) {
                                speech += `\n\nHere's what's left:\n`;
                                for (let i=0; i<result.length; i++) {
                                    if (i>0) { speech += "\n\n"; }
                                    speech += `\nReminder # ${i+1}`;
                                    speech += `\nTime: ${result[i]["reminderTime"]}`;
                                    speech += `\nDescription: ${result[i]["reminderDescription"]}`;
                                }
                            } else {
                                speech = "And at the moment we don't have any reminders left for today";
                            }
                        } else {
                            speech = "Sorry but I failed to remove this reminder";
                        }
                        sendTextMessage(senderId, speech);
                    })
                    .catch( error => {
                            console.log("Some error in promise chain: " + error);
                    }
                    );
                break;

            // Default response (no key intents triggered) - pass DF's response
            default:
                speech = dfResponse.result.fulfillment.speech;
                sendTextMessage(senderId, speech);
        }
    });

    apiaiSession.on('error', error => console.log(error));
    apiaiSession.end();
};