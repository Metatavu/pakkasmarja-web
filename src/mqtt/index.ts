import * as _ from "lodash";
import * as mqtt from "mqtt";
import { IClientOptions } from "mqtt";

/**
 * Message subscribe callback handler
 */
export type OnMessageCallback = (message: any) => void;

export interface MqttConfig {
  username?: string,
  password?: string,
  host: string,
  port: number,
  secure: boolean,
  topic: string,
  topicPrefix: string,
  topicPostfix: string,
  path?: string
}

interface PendingMessage {
  subtopic: string,
  message: string | Buffer
}

/**
 * Class that handles MQTT connection
 */
export class MqttConnection {
  
  private pending: Array<PendingMessage>;
  private config: MqttConfig;
  private client?: mqtt.MqttClient;
  private subscribers: Map<String, Array<OnMessageCallback>>;

  /**
   * Constructor
   */
  constructor () {
    this.pending = [];
    this.subscribers = new Map();
  }

  public connect = (config: MqttConfig) => {
    this.config = config;

    const url = (config.secure ? "wss://" : "ws://") + config.host + ":" + config.port + (config.path || "");
    const options: IClientOptions = { 
      username: config.username,
      password: config.password,
      host: config.host,
      port: config.port,
      keepalive: 30 
    };

    this.client = mqtt.connect(url, options);
    this.client.subscribe(`${config.topicPrefix}${config.topic}${config.topicPostfix}`);
    this.client.on("connect", () => this.onClientConnect());
    this.client.on("close", () => this.onClientClose());
    this.client.on("offline", () => this.onClientOffline());
    this.client.on("error", (error) => this.onClientError(error));
    this.client.on("message", (topic, payload, packet) => this.onClientMessage(topic, payload, packet));
  }

  /**
   * Publishes a message
   * 
   * @param subtopic subtopic
   * @param message message
   * @returns promise for sent package
   */
  public publish = (subtopic: string, message: any): Promise<mqtt.Packet> => {
    return new Promise((resolve, reject) => {
      if (!this.client) {
        this.pending.push({
          subtopic: subtopic,
          message: message
        });

        return;
      }

      const topic = `${this.config.topicPrefix}${this.config.topic}/${subtopic}/`;
      this.client.publish(topic, JSON.stringify(message), (error?: Error, packet?: mqtt.Packet) => {
        if (error) {
          reject(error);
        } else {
          resolve(packet);
        }
      });
    });
  }
  
  /**
   * Subscribes to given subtopic
   * 
   * @param subtopic subtopic
   * @param onMessage message handler
   */
  public subscribe = (subtopic: string, onMessage: OnMessageCallback) => {
    const topicSubscribers = this.subscribers.get(subtopic) || [];
    topicSubscribers.push(onMessage);
    this.subscribers.set(subtopic, topicSubscribers);
  }

  /**
   * Unsubscribes from given subtopic
   * 
   * @param subtopic subtopic
   * @param onMessage message handler
   */
  public unsubscribe = (subtopic: string, onMessage: OnMessageCallback) => {
    const topicSubscribers = this.subscribers.get(subtopic) || [];
    const subscriberIndex = topicSubscribers.findIndex(subscriber => Object.is(subscriber, onMessage));
    if (subscriberIndex > -1) {
      topicSubscribers.splice(subscriberIndex, 1);
      this.subscribers.set(subtopic, topicSubscribers);
    }
  }

  /**
   * Disconnects from the server
   */
  public disconnect = () => {
    if (this.client) {
      this.client.end();
    }
  }

  /**
   * Handles client connect event
   */
  private onClientConnect = () => {
    console.log("MQTT connection open");

    while (this.pending.length) {
      const pendingMessage: PendingMessage = this.pending.shift()!;
      this.publish(pendingMessage.subtopic, pendingMessage.message);
    }
  }

  /**
   * Handles client close event
   */
  private onClientClose = () => {
    console.log("MQTT connection closed");
  }

  /**
   * Handles client offline event
   */
  private onClientOffline = () => {
    console.log("MQTT connection offline");
  }

  /**
   * Handles client error event
   */
  private onClientError = (error: Error) => {
    console.error("MQTT connection error", error);
  }

  /**
   * Handles client message event
   */
  private onClientMessage = (topic: string, payload: Buffer, packet: mqtt.Packet) => {
    const topicStripped = _.trim(topic, "/");
    const subtopicIndex = topicStripped.lastIndexOf("/") + 1;
    const subtopic = topicStripped.substr(subtopicIndex);
    const message = JSON.parse(payload.toString());
    const topicSubscribers = this.subscribers.get(subtopic) || [];
    topicSubscribers.forEach((topicSubscriber: OnMessageCallback) => {
      topicSubscriber(message);
    });
  }

}

export const mqttConnection = new MqttConnection();