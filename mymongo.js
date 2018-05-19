/*
"Simplifications" in MVP:
-   reminders can be set with recurrence only "daily"/"weekly"/"monthly"[= every 30 days] from current day,
    no no custom format (for eg., weekly on Tue and Wed; on week days etc) and no "ends on"/till feature -
    all reminders besides those that execute "once", are repeated forever
*/

const mongoURL = "mongodb://127.0.0.1:27017/";
const dbName = 'remindmebot';

/*
    Inserts a document to collection 'user' in DB 'remindmebot'
    reminderDescription - what to remind about (any text)
    reminderTime - date-time of reminder (today or on arbitrary date)
    reminderRecurrence - variants: Once (date), Daily, Weekly, Monthly - for now that's all, no custom format (for eg., weekly on Tue and Wed;
    on week days etc) and no "ends on"/till (all reminders besides those that execute 'once', "live" forever)
*/
function createReminder(user, reminderDescription, reminderTime, reminderRecurrence="once") {
    const MongoClient = require("mongodb").MongoClient;
    const url = mongoURL;

    MongoClient.connect(url, function(err, db) {
        if (err) throw err;

        const dbo = db.db(dbName);
        const myReminder = {
            reminderDescription: reminderDescription,
            reminderTime: reminderTime,
            reminderRecurrence: reminderRecurrence,
            nextAlert: nextAlert(reminderTime, reminderRecurrence)
        };
        console.log('myReminder: ' + myReminder['nextAlert']);
        dbo.collection(user).insertOne(myReminder, function(err, res) {
            if (err) throw err;
            if (res) {
                const remTime = new Date(reminderTime).toString();
                console.log("A reminder " + reminderDescription + " for " + remTime + " (repeat " + reminderRecurrence + ") was set!");
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
    Calculates and returns time of the next alert in milliseconds since midnight Jan 1 1970
*/
function nextAlert(reminderTime, reminderRecurrence) {
    // reminderRecurrence = once - reminderTime of today's date
    // reminderRecurrence = daily - every 86400000 ms
    // reminderRecurrence = weekly - every 604800000 ms
    // reminderRecurrence = monthly - every 30days = 2592000000ms
    let nextAlert = new Date().getTime();
    const currTime = new Date().getTime();
    console.log();
    console.log("Current time: " + new Date());

    switch (reminderRecurrence) {
        case "Daily":
            if (reminderTime > currTime) {
                nextAlert = reminderTime;
            } else {
                nextAlert = reminderTime;
                while (nextAlert<currTime) {
                    nextAlert += 86400000;
                }
            }
            console.log('Daily, next on: ' + new Date(nextAlert).toString());
            break;
        case "Weekly":
            if (reminderTime > currTime) {
                nextAlert = reminderTime;
            } else {
                nextAlert = reminderTime;
                while (nextAlert<currTime) {
                    nextAlert += 604800000;
                }
            }
            console.log('Weekly, next on: ' + new Date(nextAlert).toString());
            break;
        case "Monthly":
            if (reminderTime > currTime) {
                nextAlert = reminderTime;
            } else {
                nextAlert = reminderTime;
                while (nextAlert<currTime) {
                    nextAlert += 2592000000;
                }
            }
            console.log('Monthly, next on: ' + new Date(nextAlert).toString());
            break;
        default:
            nextAlert = reminderTime;
            console.log('Once, on: ' + new Date(nextAlert).toString());
            break;
    }
    return nextAlert;
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
    Retrieves and returns a list of documents/reminders for today for a given user
*/
function showAllReminders4Today(user) {
    const MongoClient = require("mongodb").MongoClient;
    const url = mongoURL;

    const todaysDate = new Date();
    todaysDate.setHours(0, 0, 0, 0);

    const todayBegan = todaysDate.getTime();
    const todayEnds = todayBegan + 86400000-1; // ms in 1 day

    let todaysReminders = [];

    console.log('todayBegan (ms) = ' + todayBegan + '(' + new Date(todayBegan).toString() + ')');
    console.log('todayEnds (ms) = ' + todayEnds + '(' + new Date(todayEnds).toString() + ')');


    MongoClient.connect(url, function(err, db) {
        if (err) throw err;
        const dbo = db.db(dbName);

        dbo.collection(user).find({
            $and: [
                {nextAlert: {$gt: todayBegan}},
                {nextAlert: {$lt: todayEnds}},
            ]
        }).toArray(function(err, result) {
                if (err) throw err;
                console.log(result);

                /*for (i=0; i<result.length; i++) {
                    const alertTime = result[i]['nextAlert'];
                    if (alertTime>todayBegan && alertTime<todayEnds) {
                        console.log(result[i]);
                        console.log(typeof result[i]);
                        todaysReminders.push(result[i]);
                    }
                    }*/
                db.close();
            });
    });
    console.log(todaysReminders);
    return todaysReminders;
}

//console.log(checkForDuplicates('FB_ID1', 'Stand up', new Date(2018, 4 , 19, 10, 20)));
//createReminder('FB_ID2', 'Eat', new Date(2018, 4, 19, 11, 50).getTime(), 'Daily');
//deleteReminder('FB_ID2', 1);
//clearAllReminders('FB_ID2');
//showAllReminders4Today('FB_ID');

//const today = new Date();
//today.setHours(0, 0, 0, 0);
//const numbers = today.getTime();
//console.log(numbers);

//const remTime = new Date(2018, 4, 19, 10, 20).getTime();
//const mytime = nextAlert(remTime, "Monthly");

showAllReminders4Today('FB_ID2');
