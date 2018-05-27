function getProm(v) {
    return new Promise(resolve => {
        console.log(v);
        resolve();
    })
}

function Wait() {
    return new Promise(r => setTimeout(r, 1000))
}

let a = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
let chain = Promise.resolve();
for (let i of a) {
    chain = chain.then(() => {
        getProm(i)
    })
        .then(Wait)

}

https://iuriid.github.io/img/rem-7.jpg

curl -X POST -H "Content-Type: application/json" -d '{
"message":{
    "attachment":{
        "type":"image",
            "payload":{
            "is_reusable": true,
                "url":"https://iuriid.github.io/img/rem-9.jpg"
        }
    }
}
}' "https://graph.facebook.com/v2.6/me/message_attachments?access_token=EAATjFac0PR8BAFUhoISYR0W8PSfBtji6fETy3VaZAZCyyM03KJRNSvb8oNPfZCwaENMgO4ypYEF7ZAe3kQ7khNuxGu6HziL2qNIo7pylRMz8ZB6cQZBShkQVBcGZBAvbAIhlvBMfiSZCBca6mrxYQUv4dCvRhvq6Q7L1e3pqmnLt5narraqZCSleFdbwRlTjr33oZD"

imagesIDs = {
    "rem-7": "194248304552510",
    "rem-8": "194248447885829",
    "rem-9": "194248584552482"
}