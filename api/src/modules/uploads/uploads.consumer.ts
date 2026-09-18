import { ReceiveMessageCommand, SQSClient } from "@aws-sdk/client-sqs";

export async function consumeUploads() {
  const QUEUE_URL = process.env.SQS_QUEUE_URL;

  if (!QUEUE_URL) {
    throw new Error("SQS_QUEUE_URL is not configured");
  }

  const sqs = new SQSClient({ region: process.env.AWS_REGION });

  console.log("✨ listening queue");

  while (true) {
    try {
      const { Messages } = await sqs.send(
        new ReceiveMessageCommand({
          QueueUrl: QUEUE_URL,
          MaxNumberOfMessages: 10,
          WaitTimeSeconds: 20,
          VisibilityTimeout: 30,
          MessageSystemAttributeNames: [
            "ApproximateReceiveCount",
            "SentTimestamp",
          ],
          MessageAttributeNames: ["All"],
        }),
      );

      if (!Messages?.length) {
        continue;
      }

      for (const message of Messages) {
        const body = JSON.parse(message.Body ?? "{}");
        console.log(JSON.stringify(body, null, 2));
      }

      console.log("nothing was deleted; messages remain in the queue");
    } catch (error) {
      console.error("error reading the queue:", error);
      await Bun.sleep(5000);
    }
  }
}
