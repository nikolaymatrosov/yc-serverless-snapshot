const AWS = require('aws-sdk');
const fs = require('fs');

const ymq = new AWS.SQS({
    'region': 'ru-central1',
    'endpoint': 'https://message-queue.api.cloud.yandex.net',
});

async function createQueue() {
    const params = {
        'QueueName': 'snapshot-tasks',
    };

    const { QueueUrl } = await ymq.createQueue(params).promise();

    console.log('Queue created, URL: ' + QueueUrl);
    const { Attributes: { QueueArn } } = await ymq.getQueueAttributes({
        QueueUrl,
        AttributeNames: ['All']
    }).promise();

    return { QueueUrl, QueueArn };
}

class Config {
    constructor(path) {
        this.path = path;
        this.data = fs.readFileSync(this.path, 'utf8');
    }

    set(name, value) {
        const newRecord = `${name}=${value}\n`;
        if (this.data.match(RegExp(`${name}=.*\n`, 'g'))) {
            this.data = this.data.replace(
                RegExp(`${name}=.*\n`, 'g'),
                newRecord
            )
        } else {
            this.data = `${this.data}\n${newRecord}`
        }
        return this;
    }

    write() {
        fs.writeFileSync(this.path, this.data, 'utf8');
        return this;
    }
}


async function main() {
    const { QueueUrl, QueueArn } = await createQueue();
    try {
        new Config('.env')
            .set('QUEUE_URL', QueueUrl)
            .set('QUEUE_ARN', QueueArn)
            .write();
    } catch (err) {
        return console.log(err);
    }
}


main()
    .catch(e => console.log(e));

