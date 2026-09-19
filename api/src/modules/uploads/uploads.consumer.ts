import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
  SQSClient,
} from "@aws-sdk/client-sqs";
import { confirmUpload, type ConfirmUploadInput } from "./uploads.service";

const QUEUE_URL = process.env.SQS_QUEUE_URL;

if (!QUEUE_URL) {
  throw new Error("SQS_QUEUE_URL não configurado");
}

const sqs = new SQSClient({ region: process.env.AWS_REGION });

function* parseNotification(body: string): Generator<ConfirmUploadInput> {
  const { Records } = JSON.parse(body);

  if (!Array.isArray(Records)) return;

  for (const record of Records) {
    const object = record.s3?.object;
    if (!object?.key) continue;

    yield {
      objectKey: decodeURIComponent(object.key.replace(/\+/g, " ")),
      actualSize: object.size ?? null,
      etag: object.eTag ?? null,
    };
  }
}

async function handle(body: string) {
  for (const confirmation of parseNotification(body)) {
    await confirmUpload(confirmation);
  }
}

while (true) {
  let messages;

  try {
    ({ Messages: messages } = await sqs.send(
      new ReceiveMessageCommand({
        QueueUrl: QUEUE_URL,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 20, // long polling
        VisibilityTimeout: 30,
      }),
    ));
  } catch (error) {
    console.error("falha ao ler a fila:", error);
    await Bun.sleep(5000);
    continue;
  }

  for (const message of messages ?? []) {
    try {
      await handle(message.Body ?? "{}");

      await sqs.send(
        new DeleteMessageCommand({
          QueueUrl: QUEUE_URL,
          ReceiptHandle: message.ReceiptHandle,
        }),
      );
    } catch (error) {
      console.error("falha ao processar mensagem:", error);
    }
  }
}
