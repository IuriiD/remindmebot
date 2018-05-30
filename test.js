const printHello = (msg) => {
    console.log(msg);
};

const withTimeOut = (seconds, msg) => {
    return new Promise((resolve, reject) => {
        setTimeout(printHello, seconds*1000, msg);
        resolve(true);
    })
};

const withTimeOut2 = (seconds, msg) => {
    setTimeout(printHello, seconds*1000, msg);
};

/*
withTimeOut(2, 'Hi').then(result => {
        console.log('2nd comment');
    })

    .catch(err => {
        console.log(err);
    })

console.log('3rd comment');

*/

printHello('Hi1');
printHello('Hi2');
printHello('Hi3');

withTimeOut2(2, '\nNow');
printHello('Hi2');
printHello('Hi3');