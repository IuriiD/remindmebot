const processMessage = require('../helpers/processMessage');

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

// Get started button hit
let hello =
    {
    "object": "page",
    "entry": [
    {
        "id": "191533734823967",
        "time": 1527088896088,
        "messaging": [
            {
                "recipient": {
                    "id": "191533734823967"
                },
                "timestamp": 1527088896088,
                "sender": {
                    "id": "1695886667133777"
                },
                "postback": {
                    "payload": "Greeting",
                    "title": "Get Started"
                }
            }
        ]
    }
]
};

// Text input
let helo2 = {
    "object": "page",
    "entry": [
        {
            "id": "191533734823967",
            "time": 1527088510400,
            "messaging": [
                {
                    "sender": {
                        "id": "191533734823967"
                    },
                    "recipient": {
                        "id": "1695886667133777"
                    },
                    "timestamp": 1527088486767,
                    "message": {
                        "is_echo": true,
                        "app_id": 1375582045879583,
                        "mid": "mid.$cAAD0xxhhUbNpvtZhb1jjZEYONM4K",
                        "seq": 7912,
                        "text": "Hello!"
                    }
                }
            ]
        }
    ]
};

