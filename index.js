const express = require('express');
const bodyParser = require('body-parser');

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.listen(5000, function() {console.log('Webhook server is listening, port 5000')});

const verificationController = require('./controllers/verification');
const messageWebhookController = require('./controllers/messageWebhook');
const functions = require('./helpers/functions');

setInterval(() => {
        console.log("Checking for reminders to alert... (every 60 sec)");
        functions.remindersToAlert();
    }, 60000
);

app.get('/', verificationController);
app.post('/', messageWebhookController);



