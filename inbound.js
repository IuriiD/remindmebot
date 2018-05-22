'use strict';

var amqp = require('amqplib');
var mongodb = require('mongodb');
var exec = require('child_process').exec;
var rabbitmq = require('./config/rabbitmq.js');
var env = require('./config/env.js');

// Instance parameter
if (process.argv[2] == undefined) {
    console.log('Instance parameter was not set');
    process.exit(1);
}
var instance = process.argv[2];

var dbConnection = new Promise((resolve, reject) => {
    mongodb.MongoClient.connect(env.mongodb_connection_string, (err, db) => {
        err ? reject(err) : resolve(db);
    });
});

dbConnection.then(function(db) {
    console.log('Database connection established');

    db.on('close', function () {
        console.error('Database connection closed');
        process.exit(1);
    });

    var instanceAmqpSettings = getInstanceAmqpSettings(instance, db);
    instanceAmqpSettings.then(function (amqpSettings) {
        if (amqpSettings) {

            var rabbitConnectionString = 'amqp://' + amqpSettings.username + ':' + amqpSettings.password + '@' + amqpSettings.host + ':' + amqpSettings.port + '/' + amqpSettings.vhost;
            amqp.connect(rabbitConnectionString).then(function(connection) {
                console.log('RabbitMQ connection established');

                process.send('ready'); // Ready signal for the PM2

                process.once('SIGINT', function() {
                    connection.close();
                    setTimeout(function() {
                        process.exit(0);
                    }, 300);
                });

                connection.on('close', function() {
                    console.error('AMQP connection closed');
                    process.exit(1);
                });

                return connection.createChannel().then(function(channel) {
                    var queue = rabbitmq.queues.inbound;
                    var commands = channel.prefetch(1);
                    commands.then(function() {
                        channel.consume(queue.name, processCommand, { noAck: false });
                    });

                    function processCommand(data) {
                        var command = bufToJson(data.content);

                        console.log('Command: %j', command);

                        if (! command) {
                            channel.nack(data, false, false);
                            console.log('Invalid data in the message, removed from the queue');
                            return;
                        }

                        var shellCommand = env.command + ' ' + command.trigger + ' --instance=' + instance;

                        var commandExec = exec(shellCommand, function(error, stdout, stderr) {
                            if (error) {
                                console.error(error);
                                failedInboud(channel, rabbitmq.queues.failed_inbound, command);
                            }
                            channel.ack(data);
                            if (stdout) console.log(stdout);
                            if (stderr) console.log(stderr);
                        });
                        commandExec.stdin.write(JSON.stringify(command));
                        commandExec.stdin.end();
                    }
                }).catch(function (error) {
                    console.error('AMQP channel creation failed ' + error);
                    process.exit(1);
                });
            }).catch(function (error) {
                console.error('AMQP connection failed' + error);
                process.exit(1);
            });
        } else {
            console.error('Could not find instance AMQP settings in the database');
            process.exit(1);
        }
    }).catch(function (error) {
        console.error('Database collection request failed' + error);
        process.exit(1);
    });
}).catch(function (error) {
    console.error('Database connection failed ' + error);
    process.exit(1);
});

function getInstanceAmqpSettings(instance, db) {
    return new Promise((resolve, reject) => {
        db.collection('rabbitmq_settings').findOne({instance_code: instance}, {}, (err, data) => {
            if (err) reject(false);
            if (data) {
                resolve(data);
            } else {
                resolve(false);
            }
        });
    });
}

function failedInboud(channel, queue, data) {
    console.log('Failed inbound');

    return channel.publish(queue.exchange, queue.route, jsonToBuf(data));
}

function bufToJson(buf) {
    var data = false;
    try {
        data = JSON.parse(buf.toString());
    } catch (err) {
        console.log('Invalid json: ' + buf.toString());
    }

    return data;
}

function jsonToBuf(json) {
    return new Buffer.from(JSON.stringify(json));
}