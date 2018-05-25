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


