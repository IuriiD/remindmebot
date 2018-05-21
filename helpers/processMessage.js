const API_AI_TOKEN = 'c2a8b983845543e2b0d54018ad01d2d1';
const apiAiClient = require('apiai')(API_AI_TOKEN);

const FACEBOOK_ACCESS_TOKEN = 'EAATjFac0PR8BAO0hMjmlp9ASuciijPKDbX9Lrv5ZAECz5m8PUGdAx6DO9UX9xlFSNuEcML9ZBqXg56yET4sJZCNOIqHRIQczfAZAZCG0KEZAHlTwLcvnouCeTg6MSONzzNyM1MbSuLqHqjp4SMoXjfg4vK2EI3Uu5hdcJZCpyJX6tXyGdVt09PhXtWMp7CVqQgZD';
const request = require('request');

const sendTextMessage = (senderId, text) => {
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
    console.log('event object from FB: ');
    console.log(event);

    const apiaiSession = apiAiClient.textRequest(message, {sessionId: 'remindmebot'});

    apiaiSession.on('response', (response) => {
        console.log();
        console.log('Response from DF:');
        console.log(response);
        const result = response.result.fulfillment.speech;
        sendTextMessage(senderId, result);
    });

    apiaiSession.on('error', error => console.log(error));
    apiaiSession.end();
};