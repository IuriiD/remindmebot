const API_AI_TOKEN = 'c2a8b983845543e2b0d54018ad01d2d1';
const apiAiClient = require('apiai')(API_AI_TOKEN);

const FACEBOOK_ACCESS_TOKEN = 'EAATjFac0PR8BAGcYjBtZBaIAjnNIrpbNYcsoNWQRLOo1yanXxhTsGsaGsfi7CDHwJZClrV9P4Qz0aXEi1KPEZAcyzO0JcMDWMvWwLq7AoM7iCEDVYa2ZClkcVF5FxqhOrseUvA0w0nIayyaasqnT1zMEkAsvEf8FepVsgsotqGrAyTLLbyZAFRxj3scGrFsEZD';
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

    const apiaiSession = apiAiClient.textRequest(message, {sessionId: 'remindmebot'});

    apiaiSession.on('response', (response) => {
        const result = response.result.fulfillment.speech;
        sendTextMessage(senderId, result);
    });

    apiaiSession.on('error', error => console.log(error));
    apiaiSession.end();
};