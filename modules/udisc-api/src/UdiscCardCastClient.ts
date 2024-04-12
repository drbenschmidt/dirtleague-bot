import axios from 'axios';
import { load as parseHtml } from 'cheerio';
import { WebSocket, RawData } from 'ws';
import randomstring from 'randomstring';
import type {
  UDiscWsData,
  UDiscWsMethodResult,
  UDiscWsSubResponse,
  PlayersAndUsers,
  UDiscWsGetCardCastResponse,
  ScorecardResult,
  UDiscWsSubScorecardEntryResponse,
  UDiscCardCastPreloadedState,
} from '../types/UdiscCardCastTypes';

const generateServerId = () => {
  return randomstring
    .generate({ charset: 'numeric', length: 3 })
    .padStart(3, '0');
};

const generateSessionId = () => {
  return randomstring.generate({ length: 8, capitalization: 'lowercase' });
};

const generateSubId = () => {
  // QwQK6H3MwErgWcHaa
  return randomstring.generate({ length: 17 });
};

const asUdiscMessage = (obj: Record<string, unknown>): string => {
  const objStr = JSON.stringify(obj).replace(/"/g, '\\"');
  const wrappedStr = `["${objStr}"]`;
  return wrappedStr;
};

type PromiseResolve<T> = (value: T) => void;
type PromiseReject = (reason?: any) => void;

export type CallbackWrapper<D> = {
  id: string;
  expectedMessages: number;
  payloads: Array<D>;
  handle: (value: D) => void;
};

const getCallback = <TReturn, TUdiscMessage>(
  id: string,
  handler: (
    data: TUdiscMessage | TUdiscMessage[],
    resolve: PromiseResolve<TReturn>,
    reject: PromiseReject
  ) => void,
  expectedMessages = 1
): { promise: Promise<TReturn>; callback: CallbackWrapper<TUdiscMessage> } => {
  let resolve: PromiseResolve<TReturn> = (value) => {};
  let reject: PromiseReject = (reason) => {};

  const promise = new Promise<TReturn>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  const callback = {
    id,
    expectedMessages,
    recievedMessages: 0,
    payloads: [],
    handle: (data: TUdiscMessage | TUdiscMessage[]) =>
      handler(data, resolve, reject),
  };

  return { promise, callback };
};

type Callbacks = Record<string, CallbackWrapper<UDiscWsData>>;

export class UdiscCardCastClient {
  callbacks: Callbacks = {};
  callbackId = 0;
  wss?: WebSocket;
  tempMap: Record<string, Record<string, unknown>> = {};

  async open() {
    if (!this.wss) {
      return new Promise<void>((resolve, reject) => {
        const server = generateServerId();
        const sessionId = generateSessionId();
        this.wss = new WebSocket(
          `wss://sync.udisc.com/sockjs/${server}/${sessionId}/websocket`
        );
        this.wss.on('message', this.onMessage.bind(this));
        this.wss.on('open', () => {
          resolve();
          this.send({
            msg: 'connect',
            version: '1',
            support: ['1', 'pre2', 'pre1'],
          });
        });
      });
    }
  }

  async close() {
    this.wss?.close();
    delete this.wss;
  }

  private onMessage(data: RawData, isBinary: boolean) {
    const strData = data.toString();
    // console.log(`ws <- ${strData}`);

    const msgType = strData[0];

    // We're only going to process 'a' messages.
    if (msgType != 'a') {
      return;
    }

    const fixed = strData.slice(3, strData.length - 2).replace(/\\"/g, '"');
    // console.log(`fixed: ${fixed}`);

    // Remove the random a.
    const uDiscMessage = JSON.parse(fixed) as UDiscWsData;

    switch (uDiscMessage.msg) {
      case 'connected':
        // handle session info?
        break;
      case 'result': {
        // response to msg type
        const payload = uDiscMessage as UDiscWsMethodResult;
        const callback = this.callbacks[payload.id];

        if (callback) {
          callback.handle(payload);
        }
        break;
      }
      case 'added': {
        // response to sub type
        const payload = uDiscMessage as UDiscWsSubResponse;
        const callback = this.callbacks[payload.id] || this.tempMap[payload.id];

        if (callback) {
          callback.payloads.push(payload);

          if (callback.expectedMessages == callback.payloads.length) {
            // YUCKY
            callback.handle(callback.payloads as unknown as UDiscWsData);
          }
        }
        break;
      }
      default: {
        // TODO: log?
        break;
      }
    }
  }

  private async send<T extends UDiscWsData>(
    obj: Record<string, unknown>,
    callback?: CallbackWrapper<T>
  ) {
    if (!this.wss || this.wss.readyState != this.wss?.OPEN) {
      console.warn('socket not open, call .open() first.');
      return;
    }

    const payload = asUdiscMessage(obj);
    this.wss?.send(payload);

    if (!callback) {
      return;
    }

    // HACK: we're taking their event model and flattening it into something we can await.
    if (
      obj?.msg === 'sub' &&
      Array.isArray(obj?.params) &&
      Array.isArray(obj?.params[0])
    ) {
      obj.params[0].forEach((objectId) => {
        this.tempMap[objectId] = callback;
      });
    }

    this.callbacks[callback.id] =
      callback as unknown as CallbackWrapper<UDiscWsData>;
  }

  async getPreloadedState(url: string): Promise<UDiscCardCastPreloadedState> {
    const response = await axios.get(url);
    const $ = parseHtml(response.data);
    const scriptTag = $('script').filter((_i, el) => {
      return $(el).text().trimStart().startsWith('window.__PRELOADED_STATE__');
    });
    const scriptTagText = scriptTag
      .text()
      .trimStart()
      .slice('window.__PRELOADED_STATE__ = '.length);
    // console.log(scriptTagText);
    const preloadedState = JSON.parse(
      scriptTagText
    ) as UDiscCardCastPreloadedState;

    return preloadedState;
  }

  async getUsersAndPlayers(
    userIds: string[],
    playerIds: string[]
  ): Promise<PlayersAndUsers> {
    const { callback, promise } = getCallback<
      PlayersAndUsers,
      UDiscWsGetCardCastResponse
    >((this.callbackId++).toString(), (data, resolve, reject) => {
      if (Array.isArray(data)) {
        reject('should not be an array of data');
      } else {
        const result = data.result.players.concat(data.result.users);
        resolve(result);
      }
    });
    await this.send(
      {
        msg: 'method',
        id: callback.id,
        method: 'users.getCardCastUsersAndPlayers',
        params: [{ userIds, playerIds }],
      },
      callback
    );

    return promise;
  }

  async getEntries(entryObjectIds: string[]): Promise<ScorecardResult> {
    const { callback, promise } = getCallback<
      ScorecardResult,
      UDiscWsSubScorecardEntryResponse
    >(
      generateSubId(),
      (data, resolve, reject) => {
        if (Array.isArray(data)) {
          resolve(data.map((v) => v.fields));
        }
      },
      entryObjectIds.length
    );
    this.send(
      {
        msg: 'sub',
        id: callback.id,
        name: 'cardcastEntries',
        params: [entryObjectIds],
      },
      callback
    );

    return promise;
  }
}
