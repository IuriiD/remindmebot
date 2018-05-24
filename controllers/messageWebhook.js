const processMessage = require('../helpers/processMessage');

/*/ v1
module.exports = (req, res) => {
 if (req.body.object === 'page') {
  req.body.entry.forEach(entry => {
   entry.messaging.forEach(event => {
    if (event.message && event.message.text) {
     processMessage(event);
    }
   });
  });

  res.status(200).end();
 }
};
*/

// v2
module.exports = (req, res) => {
    if (req.body.object === 'page') {
        req.body.entry.forEach(entry => {

            if (entry.messaging) {
                entry.messaging.forEach(event => {
                    if (event.message && event.message.text && !event.message.is_echo || event.postback && event.postback.payload) {
                        processMessage(event);
                    }
                })
            }

        });

        res.status(200).end();
    }
};



// Text input
let helo2 = {
    "object": "page",
    "entry": [
        {
            "id": "191533734823967",
            "time": 1527088510400,
            "messaging": [
                // <event>
                {
                    "sender": {
                        "id": "191533734823967"
                    },
                    "recipient": {
                        "id": "1695886667133777"
                    },
                    "timestamp": 1527088486767,
                    "message": {                                            // specific
                        "is_echo": true,
                        "app_id": 1375582045879583,
                        "mid": "mid.$cAAD0xxhhUbNpvtZhb1jjZEYONM4K",
                        "seq": 7912,
                        "text": "Hello!"
                    }
                }
                // <event END>
            ]
        }
    ]
};

// Get started button hit
let hello =
    {
    "object": "page",
    "entry": [
    {
        "id": "191533734823967",
        "time": 1527088896088,
        "messaging": [
            // <event>
            {
                "recipient": {
                    "id": "191533734823967"
                },
                "timestamp": 1527088896088,
                "sender": {
                    "id": "1695886667133777"
                },
                "postback": {                                            // specific
                    "payload": "Greeting",
                    "title": "Get Started"
                }
            }
            // <event END>
        ]
    }
]
};

// some "standby" request after displaying "Get started" button
letsss = {
    "object": "page",
    "entry": [
        {
            "id": "191533734823967",
            "time": 1527103542121,
            "standby": [
                // <event>
                {
                    "recipient": {
                        "id": "191533734823967"
                    },
                    "timestamp": 1527103542121,
                    "sender": {
                        "id": "1695886667133777"
                    },
                    "postback": {                                            // specific
                        "title": "Get Started"
                    }
                }
                // <event END>
            ]
        }
    ]
};

m2essage ={
    "attachment":{
        "type":"template",
            "payload":{
            "template_type":"button",
                "text": "Hi",
                "buttons":[
                {
                    "type":"postback",
                    "url":"Add reminder",
                    "title":"remind me"
                },
                {
                    "type":"postback",
                    "url":"Delete a reminder",
                    "title":"remove this reminder"
                },
                {
                    "type":"postback",
                    "url":"Clear all",
                    "title":"delete all reminders"
                }
            ]
        }
    }
};
