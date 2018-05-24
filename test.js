let newDay = new Date();
console.log("newDay: " + newDay.getTime());
newDay.setHours(newDay.getHours()+3); // +1 to shift from 0-23 to 1-24; +3 to change from UTC/GMT to GMT+3
console.log("newDay: " + newDay.getTime());