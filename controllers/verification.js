module.exports = (req, res) => {
 const hubChallenge = req.query['hub.challenge'];
 const hubMode = req.query['hub.mode'];
 const verifyTokenMatches = (req.query['hub.verify_token'] === 'remindmebot');
 if (hubMode && verifyTokenMatches) {
   console.log('Verification Ok');
   res.status(200).send(hubChallenge);
  } else {
   console.log('Verification failed');
   res.status(403).end();
  }
};