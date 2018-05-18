const mongoURL = "mongodb://127.0.0.1:27017/";
const dbName = 'remindmebot';

/*
    Inserts a document to collection 'user' in DB 'remindmebot'
    reminderContent - what to remind about (any text)
    reminderTime - time of the day [Date()]
    reminderFrequency - no_repeat, daily, weekly, monthly, Monday, Tuesday, Wednesday, Thursday, Friday,
    Saturday, Sunday, weekdays, days_off
*/
function createReminder(user, reminderContent, reminderTime, reminderFrequency) {
    const MongoClient = require("mongodb").MongoClient;
    const url = mongoURL;

    MongoClient.connect(url, function(err, db) {
        if (err) throw err;

        const dbo = db.db(dbName);
        const myReminder = {
            reminderContent: reminderContent,
            reminderTime: reminderTime,
            reminderFrequency: reminderFrequency
        };
        dbo.collection(user).insertOne(myReminder, (err, res) => {
            if (err) throw err;
            if (res) {
                console.log(`A reminder ${reminderContent} for ${reminderTime} (repeat ${reminderFrequency}) was set!`);
                return true;
            } else {
                console.log("Failed to set a reminder");
                return false;
            };

            db.close();
        });
    });
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
                    return true;
                } else {
                    console.log("No duplicates found");
                    return false;
                };
                db.close();
            });
    });
}


/*
    Removes a document with reminderDocID (_id) for user
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
                        } else {
                            console.log("Reminder successfully deleted!");
                        };
                        db.close();
                    });
                    return true;
                } else {
                    // No document with reminderNumber found
                    console.log("Reminder not found");
                    return false;
                };
                db.close();
            });
    });
}

//console.log(checkForDuplicates('FB_ID1', 'Stand up', new Date(2018, 4 , 19, 10, 20)));
//createReminder('FB_ID2', 'Stand up', new Date(2018, 4 , 20, 10, 20), 'daily');
//deleteReminder('FB_ID2', 2);