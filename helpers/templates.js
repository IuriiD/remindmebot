'use strict';

const buttonsAddRemoveOneClearAllReminders = {
    attachment:{
        type:"template",
        payload:{
            text: "What should I do next?",
            template_type:"button",
            buttons:[
                {
                    type:"postback",
                    title:"Add reminder",
                    payload:"remind me"
                },
                {
                    type:"postback",
                    title:"Delete a reminder",
                    payload:"remove this reminder"
                },
                {
                    type:"postback",
                    title:"Clear all",
                    payload:"delete all reminders"
                }
            ]
        }
    }
};


const buttonsAddReminder = {
    attachment:{
        type:"template",
        payload:{
            template_type:"button",
            text: "What should I do next?",
            buttons:[
                {
                    type:"postback",
                    title:"Add reminder",
                    payload:"remind me"
                }
            ]
        }
    }
};


const buttonsShowRemindersAddReminder = {
    attachment:{
        type:"template",
        payload:{
            text: "What should I do next?",
            template_type:"button",
            buttons:[
                {
                    type:"postback",
                    title:"Today's reminders",
                    payload:"show my reminders"
                },
                {
                    type:"postback",
                    title:"Add reminder",
                    payload:"remind me"
                }
            ]
        }
    }
};


const imageIDoubleDareYou1 = {
    attachment:{
        type:"template",
        payload:{
            template_type:"media",
            elements: [
                {
                    "media_type": "image",
                    "attachment_id": "194248304552510"
                }
            ]
        }
    }
};


const imageIDoubleDareYou2 = {
    attachment:{
        type:"template",
        payload:{
            template_type:"media",
            elements: [
                {
                    "media_type": "image",
                    "attachment_id": "194248447885829"
                }
            ]
        }
    }
};


const imageIDoubleDareYou3 = {
    attachment:{
        type:"template",
        payload:{
            template_type:"media",
            elements: [
                {
                    "media_type": "image",
                    "attachment_id": "194248584552482"
                }
            ]
        }
    }
};

const buttonsConfirmSnooze = (speech, reminderID) => {
    const template = {
        attachment: {
            type: "template",
            payload: {
                text: speech,
                template_type: "button",
                buttons: [
                    {
                        type: "postback",
                        title: "Confirm",
                        payload: `confirm_reminder ${reminderID}`
                    },
                    {
                        type: "postback",
                        title: "Snooze for 5 min",
                        payload: `snooze_reminder ${reminderID}`
                    }
                ]
            }
        }
    };
    return template;
};

module.exports = {
    buttonsAddRemoveOneClearAllReminders,
    buttonsAddReminder,
    buttonsShowRemindersAddReminder,
    imageIDoubleDareYou1,
    imageIDoubleDareYou2,
    imageIDoubleDareYou3,
    buttonsConfirmSnooze
};