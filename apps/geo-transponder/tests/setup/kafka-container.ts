import { KafkaContainer, StartedKafkaContainer } from "@testcontainers/kafka";

const KAFKA_CONTAINER_IMAGE = "confluentinc/cp-kafka:7.4.0";
const KAFKA_CONTAINER_PORT = 9093;
let container: StartedKafkaContainer;

export default async function setup() {
  container = await new KafkaContainer(KAFKA_CONTAINER_IMAGE)
    .withExposedPorts(KAFKA_CONTAINER_PORT)
    .start();

  process.env.KAFKA_BROKERS = `${container.getHost()}:${container.getMappedPort(KAFKA_CONTAINER_PORT)}`;

  return async () => {
    await container.stop();
  };
}
