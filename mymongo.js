/*
    "Simplifications" in MVP:
    1) no "ends on"/till feature - all reminders besides those that execute "once", are repeated forever;
    2) no reminders editing (delete and create a new reminder instead if needed);
*/

/*
    Time of reminder (hh:mm) will be saved, flag defining if to repeat the reminder and reminder's recurrence
    if it should be repeated or specific date when it should be triggered).

    All reminders will be checked every minute and current time will be analysed (>> date; day of the week/month; if
    weekday or day off) and if reminder's recurrence corresponds to today's characteristics then it's a today's reminder
    and will be alerted at corresponding time
*/

const mongoURL = "mongodb://127.0.0.1:27017/";
const dbName = 'remindmebot';
const snoozeForMin = 5;

/*
    Inserts a document to collection 'user' in DB 'remindmebot'
    reminderDescription - what to remind about (any text)
    reminderTime - date-time of reminder (00:00-23:59)
    ifRepeated - if this reminder is for 1 time or will repeat
    reminderDate - is considered if (ifRepeated===false), arbitrary date (yyyy-mm-dd), if null will be = today
    reminderRecurrence - is considered if (ifRepeated===true)
    snoozedToTime - time (00:00-23:59) to which reminder was postponed, reminderTime + snoozeForMin

    Possible variants:
    0) if (ifRepeated === false && reminderDate === null) = today (reminder time must be in future);
    1) if (ifRepeated === false && reminderDate !== null) = at specific date for eg. 2018-10-05;
    2) if (ifRepeated === true) - reminderDate doesn't matter, possible variants of reminderRecurrence:
    2a) "Daily";
    2b) "Weekly" = on the same day of the week as reminder was set;
    2c) arbitrary variants ("Mondays"/"Tuesdays"/"Wednesdays"/"Thursdays"/"Fridays"/"Saturdays"/"Sundays" and their combinations (not all)
    ("Mon-Tue-Wed-Thu-Fri", "Mon-Wed-Fri", "Mon-Tue", "Mon-Wed", "Mon-Fri", "Tue-Thu", "Wed-Fri", "Sat-Sun");
    2d) "Weekdays" (=Mon-Tue-Wed-Thu-Fri);
    2e) "Weekends" (=Sat-Sun);
    2f) "Monthly" on the same day of the month (for eg., 25 or 01)
*/
function createReminder(user, reminderDescription, reminderTime, ifRepeated=false, reminderDate=null, reminderRecurrence=null) {
    const MongoClient = require("mongodb").MongoClient;
    const url = mongoURL;

    MongoClient.connect(url, function(err, db) {
        if (err) throw err;

        const dbo = db.db(dbName);

        let todaysDate = "";
        if (!ifRepeated && !reminderDate) {
            let today = new Date();
            todaysDate = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
            reminderDate = todaysDate;
        }

        if (ifRepeated) {
            reminderDate = null;
            reminderRecurrence = null;
        }

        const myReminder = {
            reminderDescription: reminderDescription,
            reminderTime: reminderTime,
            ifRepeated: ifRepeated,
            reminderDate: reminderDate,
            reminderRecurrence: reminderRecurrence,
            snoozedToTime: null
        };

        console.log('myReminder: ' + myReminder);

        dbo.collection(user).insertOne(myReminder, function(err, res) {
            if (err) throw err;
            if (res) {
                // Logging
                let recurrenceWording = "";
                if (!ifRepeated) {
                    recurrenceWording = "once";
                    if (reminderTime) {
                        recurrenceWording += ` on ${reminderDate}`;
                    } else {recurrenceWording += "today"}
                } else {
                    recurrenceWording = `repeatedly (${reminderRecurrence})`;
                }
                console.log(`A reminder ${reminderDescription} was set. It will be triggered ${recurrenceWording}`);

                db.close();
                return true;
            } else {
                console.log("Failed to set a reminder");
                db.close();
                return false;
            }
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
    const MongoClient = require("mongodb").MongoClient;
    const url = mongoURL;

    MongoClient.connect(url, function(err, db) {
        if (err) throw err;
        const dbo = db.db(dbName);

        dbo.listCollections({name: user}).next(function(err, collinfo) {
                if (collinfo) {
                    dbo.collection(user).drop(function(err, delOK) {
                        if (err) throw err;
                        if (delOK) {
                            console.log("Collection for user " + user + " was deleted");
                            db.close();
                            return true;
                        } else {
                            console.log("Failed to delete collection for user " + user);
                            db.close();
                            return false;
                        }
                    });
                } else {
                    console.log("Collection " + user + " not found");
                    db.close();
                    return false;
                }
            });
    });
}


/*
    Checks if a reminder with given reminderID for a given user should be alerted today
*/
function ifReminderIsToday(reminderWasSet, reminderTime, ifRepeated, reminderDate, reminderRecurrence, snoozedToTime) {
    // Get today's date and determine time, day of the week (and if it's a weekend/weekday), date, month
    const today = new Date();
    const todaysDateYear = today.getFullYear();
    const todaysDateMonth = today.getMonth(); // 0-11
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
    if (!ifRepeated) {
        console.log('One-time reminder');
        if (reminderDateYear == todaysDateYear &&
            reminderDateMonth == todaysDateMonth &&
            reminderDateDay == todaysDateDate) {
            console.log('Date is today!');
            return (reminderTimeMS>currentTime && reminderTimeMS<todayEnds);
        } else {
            return false;
        }

    // If it's a recurrent reminder
    } else {
        console.log('Recurrent reminder');
        switch(reminderRecurrence) {
            // Daily - check if reminder's time hasn't passed today
            case "Daily":
                console.log('Daily reminder');
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
    const MongoClient = require("mongodb").MongoClient;
    const url = mongoURL;

    let todaysRemindersIDs = [];
    console.log();
    console.log('Todays reminders before: ' + todaysRemindersIDs);

    MongoClient.connect(url, function(err, db) {
        if (err) throw err;
        const dbo = db.db(dbName);

        dbo.collection(user).find({}).toArray(function(err, result) {
            if (err) throw err;

            let reminderID = "";
            let reminderTime = "";
            let ifRepeated = null;
            let reminderDate = "";
            let reminderRecurrence = "";
            let snoozedToTime = "";
            let reminderWasSet = null;
            for (let i=0; i<result.length; i++) {
                reminderID = result[i]["_id"];
                reminderWasSet = result[i]["_id"].getTimestamp();
                reminderTime = result[i]["reminderTime"];
                ifRepeated = result[i]["ifRepeated"];
                reminderDate = result[i]["reminderDate"];
                reminderRecurrence = result[i]["reminderRecurrence"];
                snoozedToTime = result[i]["snoozedToTime"];

                console.log('reminderID ' + reminderID);
                if (ifReminderIsToday(reminderWasSet, reminderTime, ifRepeated, reminderDate, reminderRecurrence, snoozedToTime)) {
                    todaysRemindersIDs.push(reminderID);
                }
            }
            db.close();
            console.log('Todays reminders after: ' + todaysRemindersIDs);
            return todaysRemindersIDs;
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
                    snoozedToTime = result["snoozedToTime"];
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

//snoozeReminder('FBID', ourID, snoozeForMin);
//deleteReminder('FB_ID2', 1);
//clearAllReminders('FB_ID2');
//showAllReminders4Today('FB_ID');

//createReminder('FBID', 'go on', '20:40', ifRepeated=false, reminderDate='2018-04-25', reminderRecurrence='Daily');

//showAllReminders4Today('FBID');