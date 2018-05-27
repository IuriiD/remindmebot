'use strict';

/*
    "Simplifications" in MVP:
    1) no "ends on"/till feature - all reminders besides those that execute "once", are repeated forever;
    2) no reminders editing (delete and create a new reminder instead if needed);
*/

const API_AI_TOKEN = process.env.DF_TOKEN;
//'c2a8b983845543e2b0d54018ad01d2d1';
const apiAiClient = require('apiai')(API_AI_TOKEN);

const functions = require('./functions');
const templates = require('./templates');

const snoozeForMin = 5;


module.exports = (event) => {
    let senderId = "";
    let message = "";
    let buttonTemplate = "";
    let speech = "";

    if ("message" in event) {
        senderId = event.sender.id;
        message = event.message.text;
    } else if ("postback" in event) {
        senderId = event.sender.id;
        if (event.postback.payload) {
            message = event.postback.payload;
        } else {
            message = event.postback.title;
        }
    }

    let cTime = new Date();
    let utcHours = cTime.getHours();
    cTime.setUTCHours(utcHours+3)
    console.log('Time on server: ' + cTime);

    console.log();
    console.log('message from FB: ');
    console.log(message);

    const apiaiSession = apiAiClient.textRequest(message, {sessionId: 'remindmebot'});

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
        switch(actionTriggered) {
            // Displaying reminders [for today]
            case "reminders.get":
                speech = "";
                AllReminders4Today = functions.showAllReminders4Today(senderId);
                AllReminders4Today.then(function(data) {
                    if (data.length>0) {
                        speech += `Here's what we have for today:\n`;
                        for (let i=0; i<data.length; i++) {
                            if (i>0) { speech += "\n\n"; }
                            speech += `\nReminder # ${i+1}`;
                            speech += `\nTime: ${data[i]["reminderTime"]}`;
                            speech += `\nDescription: ${data[i]["reminderDescription"]}`;
                        }

                        let firstMessage = functions.sendMessage(senderId, {text: speech});
                        firstMessage.then(result => {
                            // Button template - buttons "Add/Remove one/Clear all"
                            buttonTemplate = templates.buttonsAddRemoveOneClearAllReminders;

                            sendMessage(senderId, buttonTemplate);
                        })

                    } else {
                        speech = "Sorry but you have no reminders for today yet";

                        let firstMessage = functions.sendMessage(senderId, {text: speech});
                        firstMessage.then(result => {
                            // Button template - 1 button "Add reminder"
                            buttonTemplate = templates.buttonsAddReminder;

                            functions.sendMessage(senderId, buttonTemplate);
                        })
                    }

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
                    const newReminder = functions.createReminder(senderId, reminderDescription, reminderTime, reminderDate, reminderRecurrence);
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

                            let firstMessage = functions.sendMessage(senderId, {text: speech});
                            firstMessage.then(result => {
                                // Button template - buttons "ShowReminders/AddReminder"
                                buttonTemplate = templates.buttonsShowRemindersAddReminder;

                                functions.sendMessage(senderId, buttonTemplate);
                            })
                        } else {
                            let firstMessage = functions.sendMessage(senderId, {text: speech});
                            firstMessage.then(result => {
                                // Button template - 1 button "Add reminder"
                                buttonTemplate = templates.buttonsAddReminder;

                                functions.sendMessage(senderId, buttonTemplate);
                            })

                        }
                    })
                        .catch(err => {
                            speech = "Kh... Sorry but I failed to save this reminder. Could you please try once again?";

                            // Button template - 1 button "Add reminder"
                            buttonTemplate = templates.buttonsAddReminder;

                            let firstMessage = functions.sendMessage(senderId, {text: speech});
                            firstMessage.then(result => {
                                functions.sendMessage(senderId, buttonTemplate);
                            })
                        })

                } else {
                    // Continue slot-filling
                    speech = dfResponse.result.fulfillment.speech;
                    functions.sendMessage(senderId, {text: speech});
                }
                break;

            // Checking if any reminders exist before deleting all reminders
            case "reminders.remove":
                const reminderQuantity = functions.showAllReminders4Today(senderId);
                reminderQuantity.then(remindersArray => {
                    if (remindersArray.length === 0) {
                        speech = "Sorry but our reminders' list is empty, nothing to delete";
                        functions.sendMessage(senderId, {text: speech});
                    } else {
                        speech = dfResponse.result.fulfillment.speech;
                        functions.sendMessage(senderId, {text: speech});
                    }
                });
                break;

            // Deleting all reminders
            case "reminders.remove-confirmed":
                const userEntered = dfResponse.result.parameters.deletion_confirmation;
                console.log("userEntered: " + userEntered);
                if (userEntered === "CLEAR ALL") {
                    console.log('Deleting reminders...');
                    const remindersDeletionFlag = functions.clearAllReminders(senderId);
                    remindersDeletionFlag.then(function(data) {
                        // Button template - buttons "Add/Remove one/Clear all"
                        buttonTemplate = templates.buttonsAddRemoveOneClearAllReminders;

                        if (data) {
                            speech = "All reminders have been successfully erased!\nWhat shall we do next?";
                        } else {
                            speech = "Unfortunately I failed to delete your reminders.. :(\nWhat should I do next?";
                        }
                        let firstMessage = functions.sendMessage(senderId, {text: speech});
                        firstMessage.then(result => {
                            functions.sendMessage(senderId, buttonTemplate);
                        })
                    })
                        .catch(err => {
                            // Button template - buttons "Add/Remove one/Clear all"
                            buttonTemplate = templates.buttonsAddRemoveOneClearAllReminders;
                            speech = "Unfortunately I failed to delete your reminders.. :(\nWhat should I do next?";
                            let firstMessage = functions.sendMessage(senderId, {text: speech});
                            firstMessage.then(result => {
                                functions.sendMessage(senderId, buttonTemplate);
                            })
                        })
                }
                break;

            // Incorrect reminders confirmation is cached by Default Fallback intent
            case "input.unknown":
                if (contextsList.includes("remove-confirm")) {
                    // Button template - buttons "Add/Remove one/Clear all"
                    buttonTemplate = templates.buttonsAddRemoveOneClearAllReminders;

                    speech += "\nSorry, but you didn't provide a correct confirmation. Reminders were not deleted";

                    let firstMessage = functions.sendMessage(senderId, {text: speech});
                    firstMessage.then(result => {
                        functions.sendMessage(senderId, buttonTemplate);
                    })

                } else {
                    speech = dfResponse.result.fulfillment.speech;
                    let firstMessage = functions.sendMessage(senderId, {text: speech});
                    firstMessage.then(result => {
                        let variants = [templates.imageIDoubleDareYou1, templates.imageIDoubleDareYou2, templates.imageIDoubleDareYou3];
                        functions.sendMessage(senderId, variants[Math.floor(Math.random() * 3)]);
                    })
                }
                break;

            // Deleting at specific reminder
            case "remindersget.deletethisreminder":
                const reminderNumber = Number(dfResponse.result.contexts[0].parameters.number);
                if (reminderNumber !== "" && reminderNumber > 0) {
                    console.log("Reminder to delete: " + reminderNumber);

                    functions.showAllReminders4Today(senderId)
                        .then(remindersArray => {
                            console.log("Got a list of todays reminders, N=" + remindersArray.length);
                            if (reminderNumber<remindersArray.length) {
                                let reminderDocID = remindersArray[reminderNumber-1]["reminderID"];
                                console.log("Reminder to delete has ID " + reminderDocID);
                                return reminderDocID;
                            } else {
                                console.log("User entered a serial number of reminder which is >remindersArray.length")
                                speech = `We don't have a reminder #${reminderNumber}.\nPlease try again`;
                                let firstMessage = functions.sendMessage(senderId, {text: speech});
                                firstMessage.then(result => {
                                    return Promise.reject(false);
                                })
                            }
                        })
                        .then(reminderDocID => {
                            let deleteReminderFlag = functions.deleteReminder(senderId, reminderDocID);
                            console.log("Result of reminder deletion: " + deleteReminderFlag);
                            return deleteReminderFlag;
                        })
                        .then(deleteReminderFlag => {
                            if (deleteReminderFlag) {
                                return functions.showAllReminders4Today(senderId);
                            } else {
                                return false;
                            }
                        })
                        .then(result => {
                            if (result) {
                                if (result.length>0) {
                                    speech += `Deleted!\nHere's what's left:\n`;
                                    for (let i=0; i<result.length; i++) {
                                        if (i>0) { speech += "\n\n"; }
                                        speech += `\nReminder # ${i+1}`;
                                        speech += `\nTime: ${result[i]["reminderTime"]}`;
                                        speech += `\nDescription: ${result[i]["reminderDescription"]}`;
                                    }

                                    // Button template - buttons "Add/Remove one/Clear all"
                                    buttonTemplate = templates.buttonsAddRemoveOneClearAllReminders;

                                } else {
                                    // Button template - 1 button "Add reminder"
                                    buttonTemplate = templates.buttonsAddReminder;

                                    speech = "Done!\nAnd at the moment we don't have any reminders left for today";
                                }
                            } else {
                                // Button template - buttons "Add/Remove one/Clear all"
                                buttonTemplate = templates.buttonsAddRemoveOneClearAllReminders;

                                speech = "Sorry but I failed to remove this reminder";

                            }
                            let firstMessage = functions.sendMessage(senderId, {text: speech});
                            firstMessage.then(result => {
                                functions.sendMessage(senderId, buttonTemplate);
                            })
                        })
                        .catch( error => {
                                console.log("Some error in promise chain: " + error);
                            }
                        );
                } else {
                    speech = dfResponse.result.fulfillment.speech;
                    functions.sendMessage(senderId, {text: speech});
                }
                break;

            // Confirming reminder
            case "alert.confirm":
                let whichID = dfResponse.result.parameters.reminderName;
                console.log();
                console.log("Confirming reminder #" + whichID);
                if (whichID) {
                    let reminderConfirmationFlag = functions.confirmReminder(senderId, whichID);
                    reminderConfirmationFlag.then(result => {
                    console.log("reminderConfirmationFlag: " + result);
                        if (result) {
                            functions.sendMessage(senderId, {text: "Reminder confirmed!"});
                        } else {
                            functions.sendMessage(senderId, {text: "Unfortunately I failed to confirm this reminder. Sorry"});
                        }
                        // Button template - buttons "Add/Remove one/Clear all"
                        buttonTemplate = templates.buttonsShowRemindersAddReminder;
                        functions.sendMessage(senderId, buttonTemplate);
                    })
                }
                break;

            // Snoozing reminder
            case "alert.snooze":
                let remID = dfResponse.result.parameters.reminderName;
                console.log();
                console.log("Snoozing reminder #" + remID);
                if (remID) {
                    let reminderSnoozingFlag = functions.snoozeReminder(senderId, remID, snoozeForMin);
                    reminderSnoozingFlag.then(result => {
                        if (result) {
                            functions.sendMessage(senderId, {text: `Reminder snoozed for ${snoozeForMin} minutes!`});
                        } else {
                            functions.sendMessage(senderId, {text: "Unfortunately I failed to delay this reminder. Sorry"});
                        }
                        // Button template - buttons "Add/Remove one/Clear all"
                        buttonTemplate = templates.buttonsShowRemindersAddReminder;
                        functions.sendMessage(senderId, buttonTemplate);
                    })
                }
                break;

            // Default response (no key intents triggered) - pass DF's response
            default:
                speech = dfResponse.result.fulfillment.speech;
                functions.sendMessage(senderId, {text: speech});
        }
    });

    apiaiSession.on('error', error => console.log(error));
    apiaiSession.end();
};