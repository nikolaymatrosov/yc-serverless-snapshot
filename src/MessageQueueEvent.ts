interface CreatedAt {
    seconds: number;
    nanos: number;
}

interface EventMetadata {
    event_id: string;
    event_type: string;
    created_at: CreatedAt;
    cloud_id: string;
    folder_id: string;
}

interface Attributes {
    ApproximateFirstReceiveTimestamp: string;
    ApproximateReceiveCount: string;
    SentTimestamp: string;
}

interface MessageAttributes {
}

interface Message {
    message_id: string;
    md5_of_body: string;
    body: string;
    attributes: Attributes;
    message_attributes: MessageAttributes;
    md5_of_message_attributes: string;
}

interface Details {
    queue_id: string;
    message: Message;
}

export interface MessageQueueEvent {
    messages: MessageQueueMessage[]
}

interface MessageQueueMessage {
    event_metadata: EventMetadata;
    details: Details;
}
