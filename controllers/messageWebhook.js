const processMessage = require('../helpers/processMessage');

module.exports = (req, res) => {
    if (req.body.object === 'page') {
        req.body.entry.forEach(entry => {

            if (entry.messaging) {
                entry.messaging.forEach(event => {
                    if (event.message && event.message.text && !event.message.is_echo
                        || event.postback && event.postback.payload) {
                        processMessage(event);
                    }
                })
            }

        });

        res.status(200).end();
    }
};
