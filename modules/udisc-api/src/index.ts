import axios from 'axios';
import { load as parseHtml } from 'cheerio';
import { WebSocket } from 'ws';

export type PlayerRecord = {
    total: number;
    name: String;
};

export type Scorecard = {
    courseName: String;
    layoutName: String;
    date: String;
    numberOfHoles: number;
    layoutPar: number;
    layoutDistance: String;
    players: Array<PlayerRecord>;
};

export const parseScorecardById = async (id: string): Promise<Scorecard> => {
    return parseScorecardByUrl(`https://udisc.com/scorecards/${id}`);
};

export type UDiscCardCastPreloadedState = {
  courseDirectory: unknown;
  designer: unknown;
  leagues: unknown;
  places: unknown;
  scorecards: Array<{
    courseId: number;
    courseName: string;
    endDate: string;
    entries: Array<{
      __type: 'Pointer';
      className: 'ScorecardEntry';
      objectId: string;
    }>;
    holes: Array<{
      basket: {
        latitude: number;
        longitude: number;
      };
      distance: number;
      doglegs: [];
      holeId: string;
      name: string;
      par: number;
      pathConfigurationId: string;
      status: 'active';
      targetPosition: {
        latitude: number;
        longitude: number;
        status: 'active';
        targetPositionId: string;
        targetPositionLabels: Array<{
          labelType: 'custom';
          name: string;
          targetPositionLabelId: string;
        }>;
        targetType: {
          basketModel: {
            basketModelId: string;
            manufacturer: string;
            name: string;
          };
          name: string;
          status: 'active';
          targetTypeId: string;
          type: 'basket';
        };
      };
      teePad: {
        latitude: number;
        longitude: number;
      };
      teePosition: {
        latitude: number;
        longitude: number;
        status: 'active';
        teePositionId: string;
        teePositionLabels: Array<{
          labelType: 'custom';
          name: string;
          teePositionLabelId: string;
        }>;
        teeType: {
          otherName: string;
          status: 'active';
          teeType: 'concrete';
          teeTypeId: string;
        }
      }
    }>;
    holesUpdatedAt: string;
    isFinished: boolean;
    layoutId: number;
    layoutName: string;
    notes: unknown;
    playFormat: 'singles' | 'doubles';
    startDate: string;
    startingHoleIndex: number;
    stepCount: number;
    syncType: number;
    unlinkedPlayers: [];
    users: Array<{
      __type: 'Pointer';
      className: '_User';
      objectId: string;
    }>;
    usesValidSmartLayout: boolean;
    version: number;
    weather: {
      cloudCoverPercent: number;
      humidity: number;
      temperature: number;
      typeId: number;
      wind: {
        direction: number;
        speed: number;
      }
    };
    _created_at: string;
    _id: string;
    _p_createdBy: string;
    _updated_at: string;
  }>;
  storeDirectory: unknown;
};

// Function to parse scorecard from URL
export const parseScorecardByUrl = async (url: string): Promise<Scorecard> => {
  const response = await axios.get(url);
  const $ = parseHtml(response.data);
  const scriptTag = $('script').filter((_i, el) => {
    return $(el).text().trimStart().startsWith('window.__PRELOADED_STATE__');
  });
  const preloadedState = JSON.parse(scriptTag.text()) as UDiscCardCastPreloadedState;

  if (preloadedState.scorecards.length > 1) {
    throw new Error('Unable to handle multiple cards currently.');
  }

  // Grab first scorecard.
  const [scorecard] = preloadedState.scorecards;

  if (!scorecard.isFinished) {
    throw new Error('Unable to parse unfinished scorecard.');
  }

  const courseName = scorecard.courseName
  const date = new Date(scorecard.endDate);

  // Fill in other data from websocket API.
  const scorecardInfo = await getScorecardInfo();

  return scorecard;
};

export type UDiscWsData = {
  msg: "connect" | "method" | "sub" | "result" | "connected" | "added";
};

export type UDiscWsMethodRequest = UDiscWsData & {
  msg: "method";
  id: string;
  method: "users.getCardCastUsersAndPlayers" | "courses.findCourse";
};

export type UDiscWsSubRequest = UDiscWsData & {
  msg: "sub";
  id: string;
  name: 'cardcastEntries';
  params: [];
};

export type UDiscWsSubResponse = UDiscWsData & {
  msg: 'added';
  id: string;
  collection: 'ScoreCard' | 'ScorecardEntry';
  fields: unknown;
};

export type UDiscWsSubScorecardEntryResponse = UDiscWsData & {
  msg: 'added';
  collection: 'ScorecardEntry';
  fields: {
    holeScores: Array<{
      strokes: number;
      changeVersion: number;
    }>;
    players: [];
    users: Array<{
      __type: 'Pointer';
      className: '_User';
      objectId: string;
    }>;
    totalScore: number;
  };
  id: string;
};

export type UDiscWsGetCardCastRequest = UDiscWsMethodRequest & {
  method: "users.getCardCastUsersAndPlayers";
  params: [ { userIds: string[] }];
};

export type UDiscWsFindCourseRequest = UDiscWsMethodRequest & {
  method: "courses.findCourse";
  params: [ { courseId: string }];
}

export type UDiscWsMethodResult = UDiscWsData & {
  msg: "result";
  id: string;
  result: unknown;
};

export type UDiscWsGetCardCastResponse = UDiscWsMethodResult & {
  result: {
    users: Array<{
      _id: string;
      name: string;
      username: string;
    }>
  }
};

export type GetScorecardInfoProps = {
  scorecardEntryObjectIds: string[];
  scorecardUserObjectIds: string[];
};

export type GetScorecardInfoResult = {
  ipcMap: Record<string, unknown>;
  addedMap: Record<string, unknown>;
};

export const getScorecardInfo = async (props: GetScorecardInfoProps): Promise<GetScorecardInfoResult> => {
  const { scorecardEntryObjectIds, scorecardUserObjectIds } = props;

  return new Promise<GetScorecardInfoResult>((resolve, reject) => {
    const server = '335'; // TODO: make random 001-999
    const sessionId = '2heoc4bh'; // TODO: make random lowercase fixed length.
    const wss = new WebSocket(`wss://sync.udisc.com/sockjs/${server}/${sessionId}/websocket`);
    const ipcMap: Record<string, unknown> = {};
    const addedMap: Record<string, unknown> = {};

    wss.on('message', (data) => {
      const strData = data.toString();
      const uDiscMessage = JSON.parse(strData) as UDiscWsData;

      switch (uDiscMessage.msg) {
        case "connected":
          // handle session info?
          break;
        case "result":
          // response to msg type
          // handle IPC result
          ipcMap[(uDiscMessage as UDiscWsMethodResult).id] = (uDiscMessage as UDiscWsMethodResult).result;
          break;
        case "added":
          // response to sub type
          // handle IPC result
          addedMap[(uDiscMessage as UDiscWsSubResponse).id] = (uDiscMessage as UDiscWsSubResponse).fields;
        break;
      }

      // TODO: come up with a better way to mark complete.
      if (Object.keys(ipcMap).length == 2 && Object.keys(addedMap).length == scorecardUserObjectIds.length) {
        resolve({ ipcMap, addedMap });
      }
    });

    wss.on('open', () => {
      // Open with a connect (unneeded?)
      wss.send(JSON.stringify([{
        msg: 'connect',
        version: '1',
        support: ['1', 'pre2', 'pre1']
      }]));

      // Request users and player info
      wss.send(JSON.stringify([{
        msg: 'method',
        id: '1',
        method: 'users.getCardCastUsersAndPlayers',
        params: [{ userIds: scorecardUserObjectIds, playerIds: [] }]
      }]));

      // Request hole scores and totals
      wss.send(JSON.stringify([{
        msg: 'sub',
        id: 'asdfasdfasdfasdf', // generate random ID to match 'NysNizHdbAe6zmD6o',
        name: 'cardcastEntries',
        params: [ scorecardEntryObjectIds ]
      }]));
    });
  });
  
  /**
   * ["{\"msg\":\"connect\",\"version\":\"1\",\"support\":[\"1\",\"pre2\",\"pre1\"]}"]
   * ["{\"msg\":\"method\",\"id\":\"1\",\"method\":\"users.getCardCastUsersAndPlayers\",\"params\":[{\"userIds\":[\"KkSXPgdwi0\",\"oRsXvLA4FA\",\"9kDBu38KA1\",\"QC4adC0p2K\",\"KPS1NzZ81H\",\"ZGvGqdOf7K\",\"ELBhQfqaXw\",\"zoiqxaXH0Q\"],\"playerIds\":[]}]}"]	251	
   * ["{\"msg\":\"method\",\"id\":\"2\",\"method\":\"courses.findCourse\",\"params\":[{\"courseId\":35423}]}"]
   * ["{\"msg\":\"sub\",\"id\":\"QmYT3KjcgbX48dYwC\",\"name\":\"meteor.loginServiceConfiguration\",\"params\":[]}"]
   * ["{\"msg\":\"sub\",\"id\":\"QwQK6H3MwErgWcHaa\",\"name\":\"_roles\",\"params\":[]}"]
   * ["{\"msg\":\"sub\",\"id\":\"NDj82rNcKS8cqQ8t2\",\"name\":\"meteor_autoupdate_clientVersions\",\"params\":[]}"]
   
   * ["{\"msg\":\"sub\",\"id\":\"iHgDmqkrZiZTfy28W\",\"name\":\"currentUser\",\"params\":[]}"]

   * Resp: a["{\"msg\":\"connected\",\"session\":\"xpYoxaKZ3dhnx3RaK\"}"]
   * Resp: a["{\"msg\":\"result\",\"id\":\"1\",\"result\":{\"users\":[{\"_id\":\"9kDBu38KA1\",\"name\":\"Brito\",\"username\":\"dirtleaguebrito\"},{\"_id\":\"ELBhQfqaXw\",\"fullName\":\"Kyle Larson\",\"name\":\"Kyle\",\"username\":\"dudeonthebus\"},{\"_id\":\"KPS1NzZ81H\",\"fullName\":\"John Micheals\",\"name\":\"John Micheals\",\"username\":\"johnmicheals95\"},{\"_id\":\"KkSXPgdwi0\",\"fullName\":\"Kyle Honeyager\",\"name\":\"Actionjakson\",\"username\":\"actionjakson\"},{\"_id\":\"QC4adC0p2K\",\"fullName\":\"Jim Reed\",\"name\":\"Jim\",\"username\":\"harrington26\"},{\"_id\":\"ZGvGqdOf7K\",\"fullName\":\"Kevin Newman\",\"name\":\"Kevin Newman\",\"username\":\"kdnewman\"},{\"_id\":\"oRsXvLA4FA\",\"fullName\":\"Benjamin Schmidt\",\"name\":\"Ben Schmidt\",\"username\":\"drbenschmidt\"},{\"_id\":\"zoiqxaXH0Q\",\"fullName\":\"Aaron Knefelkamp\",\"name\":\"Wronskian\",\"username\":\"wronskian\"}],\"players\":[]}}"]
   * Resp: a["{\"msg\":\"added\",\"collection\":\"ScorecardEntry\",\"id\":\"C8MrENUxBE\",\"fields\":{\"players\":[],\"users\":[{\"__type\":\"Pointer\",\"className\":\"_User\",\"objectId\":\"ZGvGqdOf7K\"}],\"startDate\":{\"$date\":1691943756759},\"holeScores\":[{\"strokes\":3,\"changeVersion\":11},{\"strokes\":3,\"changeVersion\":11},{\"strokes\":3,\"changeVersion\":11},{\"strokes\":6,\"changeVersion\":11},{\"strokes\":3,\"changeVersion\":11},{\"strokes\":4,\"changeVersion\":11},{\"strokes\":3,\"changeVersion\":11},{\"strokes\":4,\"changeVersion\":11},{\"strokes\":4,\"changeVersion\":11}],\"playFormat\":\"singles\",\"includeInHandicaps\":true,\"isFinished\":true,\"layoutId\":85124,\"totalScore\":33,\"version\":2,\"includeInProfile\":true,\"_p_createdBy\":\"_User$KkSXPgdwi0\",\"startingScore\":0,\"courseId\":35423,\"isComplete\":true,\"_created_at\":{\"$date\":1691943758303},\"_updated_at\":{\"$date\":1711831253577},\"needsUpdate\":false,\"scoreChangeCount\":9,\"relativeScore\":3,\"thru\":9,\"endDate\":{\"$date\":1691948943111}}}"]
  
  * * ["{\"msg\":\"sub\",\"id\":\"Z5YZGwjtA2jhFnc6m\",\"name\":\"scorecardForId\",\"params\":[\"A3A4OqNSkN\"]}"] 
  * Resp: a["{\"msg\":\"added\",\"collection\":\"Scorecard\",\"id\":\"A3A4OqNSkN\",\"fields\":{\"startDate\":{\"$date\":1691943756759},\"_p_createdBy\":\"_User$KkSXPgdwi0\",\"layoutId\":85124,\"_created_at\":{\"$date\":1691943758118},\"_updated_at\":{\"$date\":1711831253832},\"courseId\":35423,\"courseName\":\"Orchard Hill Park\",\"entries\":[{\"__type\":\"Pointer\",\"className\":\"ScorecardEntry\",\"objectId\":\"ezaKchuAyb\"},{\"__type\":\"Pointer\",\"className\":\"ScorecardEntry\",\"objectId\":\"oBE2G6leVx\"},{\"__type\":\"Pointer\",\"className\":\"ScorecardEntry\",\"objectId\":\"Ns2X5zowvC\"},{\"__type\":\"Pointer\",\"className\":\"ScorecardEntry\",\"objectId\":\"k0WEBc8LlN\"},{\"__type\":\"Pointer\",\"className\":\"ScorecardEntry\",\"objectId\":\"k3oYn8VTxV\"},{\"__type\":\"Pointer\",\"className\":\"ScorecardEntry\",\"objectId\":\"C8MrENUxBE\"},{\"__type\":\"Pointer\",\"className\":\"ScorecardEntry\",\"objectId\":\"hiqUsXM44F\"},{\"__type\":\"Pointer\",\"className\":\"ScorecardEntry\",\"objectId\":\"IqCttTrrAu\"}],\"holes\":[{\"par\":3,\"basket\":{\"latitude\":43.003308302346454,\"longitude\":-89.27930150384327},\"distance\":90.06693267822266,\"pathConfigurationId\":\"q15U\",\"doglegs\":[],\"targetPosition\":{\"targetPositionId\":\"AFZA\",\"latitude\":43.003308302346454,\"targetPositionLabels\":[{\"targetPositionLabelId\":\"kgEz\",\"labelType\":\"custom\",\"name\":\"Blue\"}],\"targetType\":{\"targetTypeId\":\"bZPN\",\"basketModel\":{\"basketModelId\":\"rtfRfiSjZqhcm3Lhv\",\"name\":\"Mach VII\",\"manufacturer\":\"Disc Golf Association\"},\"name\":\"Blue\",\"type\":\"basket\",\"status\":\"active\"},\"status\":\"active\",\"longitude\":-89.27930150384327},\"name\":\"1\",\"teePosition\":{\"teePositionLabels\":[{\"teePositionLabelId\":\"Bsya\",\"labelType\":\"custom\",\"name\":\"Blue\"}],\"latitude\":43.00313257935436,\"teePositionId\":\"bTET\",\"teeType\":{\"otherName\":\"\",\"teeTypeId\":\"OqNX\",\"teeType\":\"concrete\",\"status\":\"active\"},\"status\":\"active\",\"longitude\":-89.27822314436779},\"holeId\":\"MwAz\",\"teePad\":{\"latitude\":43.00313257935436,\"longitude\":-89.27822314436779},\"status\":\"active\"},{\"par\":3,\"basket\":{\"latitude\":43.00262750460376,\"longitude\":-89.27833816970818},\"distance\":83.79375457763672,\"pathConfigurationId\":\"M4HC\",\"doglegs\":[],\"targetPosition\":{\"targetPositionId\":\"DymR\",\"latitude\":43.00262750460376,\"targetPositionLabels\":[{\"targetPositionLabelId\":\"kgEz\",\"labelType\":\"custom\",\"name\":\"Blue\"}],\"targetType\":{\"targetTypeId\":\"bZPN\",\"basketModel\":{\"basketModelId\":\"rtfRfiSjZqhcm3Lhv\",\"name\":\"Mach VII\",\"manufacturer\":\"Disc Golf Association\"},\"name\":\"Blue\",\"type\":\"basket\",\"status\":\"active\"},\"status\":\"active\",\"longitude\":-89.27833816970818},\"name\":\"2\",\"teePosition\":{\"teePositionLabels\":[{\"teePositionLabelId\":\"Bsya\",\"labelType\":\"custom\",\"name\":\"Blue\"}],\"latitude\":43.00277853562076,\"teePositionId\":\"A4uD\",\"teeType\":{\"otherName\":\"\",\"teeTypeId\":\"OqNX\",\"teeType\":\"concrete\",\"status\":\"active\"},\"status\":\"active\",\"longitude\":-89.2793450298976},\"holeId\":\"tKvH\",\"teePad\":{\"latitude\":43.00277853562076,\"longitude\":-89.2793450298976},\"status\":\"active\"},{\"par\":3,\"basket\":{\"latitude\":43.00171412221983,\"longitude\":-89.27819637739468},\"distance\":95.48576354980469,\"pathConfigurationId\":\"9QsW\",\"doglegs\":[],\"targetPosition\":{\"targetPositionId\":\"Z5KE\",\"latitude\":43.00171412221983,\"targetPositionLabels\":[{\"targetPositionLabelId\":\"kgEz\",\"labelType\":\"custom\",\"name\":\"Blue\"}],\"targetType\":{\"targetTypeId\":\"bZPN\",\"basketModel\":{\"basketModelId\":\"rtfRfiSjZqhcm3Lhv\",\"name\":\"Mach VII\",\"manufacturer\":\"Disc Golf Association\"},\"name\":\"Blue\",\"type\":\"basket\",\"status\":\"active\"},\"status\":\"active\",\"longitude\":-89.27819637739468},\"name\":\"3\",\"teePosition\":{\"teePositionLabels\":[{\"teePositionLabelId\":\"Bsya\",\"labelType\":\"custom\",\"name\":\"Blue\"}],\"latitude\":43.00249670350751,\"teePositionId\":\"AqOa\",\"teeType\":{\"otherName\":\"\",\"teeTypeId\":\"OqNX\",\"teeType\":\"concrete\",\"status\":\"active\"},\"status\":\"active\",\"longitude\":-89.27771211743446},\"holeId\":\"rmLB\",\"teePad\":{\"latitude\":43.00249670350751,\"longitude\":-89.27771211743446},\"status\":\"active\"},{\"par\":4,\"basket\":{\"latitude\":43.00187852835637,\"longitude\":-89.27501527696087},\"distance\":202.51661682128906,\"pathConfigurationId\":\"yjLJ\",\"doglegs\":[],\"targetPosition\":{\"targetPositionId\":\"cEKB\",\"latitude\":43.00187852835637,\"targetPositionLabels\":[{\"targetPositionLabelId\":\"kgEz\",\"labelType\":\"custom\",\"name\":\"Blue\"}],\"targetType\":{\"targetTypeId\":\"bZPN\",\"basketModel\":{\"basketModelId\":\"rtfRfiSjZqhcm3Lhv\",\"name\":\"Mach VII\",\"manufacturer\":\"Disc Golf Association\"},\"name\":\"Blue\",\"type\":\"basket\",\"status\":\"active\"},\"status\":\"active\",\"longitude\":-89.27501527696087},\"name\":\"4\",\"teePosition\":{\"teePositionLabels\":[{\"teePositionLabelId\":\"Bsya\",\"labelType\":\"custom\",\"name\":\"Blue\"}],\"latitude\":43.001698092446986,\"teePositionId\":\"qkOs\",\"teeType\":{\"otherName\":\"\",\"teeTypeId\":\"OqNX\",\"teeType\":\"concrete\",\"status\":\"active\"},\"status\":\"active\",\"longitude\":-89.27748677053728},\"holeId\":\"9ldO\",\"teePad\":{\"latitude\":43.001698092446986,\"longitude\":-89.27748677053728},\"status\":\"active\"},{\"par\":3,\"basket\":{\"latitude\":43.00191697546659,\"longitude\":-89.27732787049104},\"distance\":90.47882080078125,\"pathConfigurationId\":\"RCY9\",\"doglegs\":[],\"targetPosition\":{\"targetPositionId\":\"5UG2\",\"latitude\":43.00191697546659,\"targetPositionLabels\":[{\"targetPositionLabelId\":\"kgEz\",\"labelType\":\"custom\",\"name\":\"Blue\"}],\"targetType\":{\"targetTypeId\":\"bZPN\",\"basketModel\":{\"basketModelId\":\"rtfRfiSjZqhcm3Lhv\",\"name\":\"Mach VII\",\"manufacturer\":\"Disc Golf Association\"},\"name\":\"Blue\",\"type\":\"basket\",\"status\":\"active\"},\"status\":\"active\",\"longitude\":-89.27732787049104},\"name\":\"5\",\"teePosition\":{\"teePositionLabels\":[{\"teePositionLabelId\":\"Bsya\",\"labelType\":\"custom\",\"name\":\"Blue\"}],\"latitude\":43.0021139642665,\"teePositionId\":\"ucH6\",\"teeType\":{\"otherName\":\"\",\"teeTypeId\":\"OqNX\",\"teeType\":\"concrete\",\"status\":\"active\"},\"status\":\"active\",\"longitude\":-89.27625116913647},\"holeId\":\"tQ0S\",\"teePad\":{\"latitude\":43.0021139642665,\"longitude\":-89.27625116913647},\"status\":\"active\"},{\"par\":3,\"basket\":{\"latitude\":43.00327656500821,\"longitude\":-89.2773227628717},\"distance\":112.01380920410156,\"pathConfigurationId\":\"K2OT\",\"doglegs\":[],\"targetPosition\":{\"targetPositionId\":\"7fCK\",\"latitude\":43.00327656500821,\"targetPositionLabels\":[{\"targetPositionLabelId\":\"kgEz\",\"labelType\":\"custom\",\"name\":\"Blue\"}],\"targetType\":{\"targetTypeId\":\"bZPN\",\"basketModel\":{\"basketModelId\":\"rtfRfiSjZqhcm3Lhv\",\"name\":\"Mach VII\",\"manufacturer\":\"Disc Golf Association\"},\"name\":\"Blue\",\"type\":\"basket\",\"status\":\"active\"},\"status\":\"active\",\"longitude\":-89.2773227628717},\"name\":\"6\",\"teePosition\":{\"teePositionLabels\":[{\"teePositionLabelId\":\"Bsya\",\"labelType\":\"custom\",\"name\":\"Blue\"}],\"latitude\":43.00244710431411,\"teePositionId\":\"C4mC\",\"teeType\":{\"otherName\":\"\",\"teeTypeId\":\"OqNX\",\"teeType\":\"concrete\",\"status\":\"active\"},\"status\":\"active\",\"longitude\":-89.27654168654092},\"holeId\":\"M3Xq\",\"teePad\":{\"latitude\":43.00244710431411,\"longitude\":-89.27654168654092},\"status\":\"active\"},{\"par\":4,\"basket\":{\"latitude\":43.003628593789166,\"longitude\":-89.27978759912352},\"distance\":146.48831176757812,\"pathConfigurationId\":\"hP2A\",\"doglegs\":[],\"targetPosition\":{\"targetPositionId\":\"b5w1\",\"latitude\":43.003628593789166,\"targetPositionLabels\":[{\"targetPositionLabelId\":\"kgEz\",\"labelType\":\"custom\",\"name\":\"Blue\"}],\"targetType\":{\"targetTypeId\":\"bZPN\",\"basketModel\":{\"basketModelId\":\"rtfRfiSjZqhcm3Lhv\",\"name\":\"Mach VII\",\"manufacturer\":\"Disc Golf Association\"},\"name\":\"Blue\",\"type\":\"basket\",\"status\":\"active\"},\"status\":\"active\",\"longitude\":-89.27978759912352},\"name\":\"7\",\"teePosition\":{\"teePositionLabels\":[{\"teePositionLabelId\":\"Bsya\",\"labelType\":\"custom\",\"name\":\"Blue\"}],\"latitude\":43.00361059852309,\"teePositionId\":\"4ozi\",\"teeType\":{\"otherName\":\"\",\"teeTypeId\":\"OqNX\",\"teeType\":\"concrete\",\"status\":\"active\"},\"status\":\"active\",\"longitude\":-89.27799116136003},\"holeId\":\"Pfyp\",\"teePad\":{\"latitude\":43.00361059852309,\"longitude\":-89.27799116136003},\"status\":\"active\"},{\"par\":3,\"basket\":{\"latitude\":43.002169806022096,\"longitude\":-89.27961780720145},\"distance\":84.30348205566406,\"pathConfigurationId\":\"huh7\",\"doglegs\":[],\"targetPosition\":{\"targetPositionId\":\"GAET\",\"latitude\":43.002169806022096,\"targetPositionLabels\":[{\"targetPositionLabelId\":\"kgEz\",\"labelType\":\"custom\",\"name\":\"Blue\"}],\"targetType\":{\"targetTypeId\":\"bZPN\",\"basketModel\":{\"basketModelId\":\"rtfRfiSjZqhcm3Lhv\",\"name\":\"Mach VII\",\"manufacturer\":\"Disc Golf Association\"},\"name\":\"Blue\",\"type\":\"basket\",\"status\":\"active\"},\"status\":\"active\",\"longitude\":-89.27961780720145},\"name\":\"8\",\"teePosition\":{\"teePositionLabels\":[{\"teePositionLabelId\":\"Bsya\",\"labelType\":\"custom\",\"name\":\"Blue\"}],\"latitude\":43.00290499045196,\"teePositionId\":\"auND\",\"teeType\":{\"otherName\":\"\",\"teeTypeId\":\"OqNX\",\"teeType\":\"concrete\",\"status\":\"active\"},\"status\":\"active\",\"longitude\":-89.27987403571449},\"holeId\":\"coIN\",\"teePad\":{\"latitude\":43.00290499045196,\"longitude\":-89.27987403571449},\"status\":\"active\"},{\"par\":4,\"basket\":{\"latitude\":43.00245747813044,\"longitude\":-89.27803626459998},\"distance\":163.04745483398438,\"pathConfigurationId\":\"MfcL\",\"doglegs\":[],\"targetPosition\":{\"targetPositionId\":\"BuUC\",\"latitude\":43.00245747813044,\"targetPositionLabels\":[{\"targetPositionLabelId\":\"kgEz\",\"labelType\":\"custom\",\"name\":\"Blue\"}],\"targetType\":{\"targetTypeId\":\"bZPN\",\"basketModel\":{\"basketModelId\":\"rtfRfiSjZqhcm3Lhv\",\"name\":\"Mach VII\",\"manufacturer\":\"Disc Golf Association\"},\"name\":\"Blue\",\"type\":\"basket\",\"status\":\"active\"},\"status\":\"active\",\"longitude\":-89.27803626459998},\"name\":\"9\",\"teePosition\":{\"teePositionLabels\":[{\"teePositionLabelId\":\"Bsya\",\"labelType\":\"custom\",\"name\":\"Blue\"}],\"latitude\":43.00193480266644,\"teePositionId\":\"9fCd\",\"teeType\":{\"otherName\":\"\",\"teeTypeId\":\"OqNX\",\"teeType\":\"concrete\",\"status\":\"active\"},\"status\":\"active\",\"longitude\":-89.27990481166607},\"holeId\":\"I29c\",\"teePad\":{\"latitude\":43.00193480266644,\"longitude\":-89.27990481166607},\"status\":\"active\"}],\"holesUpdatedAt\":{\"$date\":1691943758529},\"isFinished\":true,\"layoutName\":\"Blue tees, Blue baskets\",\"playFormat\":\"singles\",\"startingHoleIndex\":0,\"stepCount\":0,\"syncType\":1,\"unlinkedPlayers\":[],\"users\":[{\"__type\":\"Pointer\",\"className\":\"_User\",\"objectId\":\"KkSXPgdwi0\"},{\"__type\":\"Pointer\",\"className\":\"_User\",\"objectId\":\"oRsXvLA4FA\"},{\"__type\":\"Pointer\",\"className\":\"_User\",\"objectId\":\"9kDBu38KA1\"},{\"__type\":\"Pointer\",\"className\":\"_User\",\"objectId\":\"QC4adC0p2K\"},{\"__type\":\"Pointer\",\"className\":\"_User\",\"objectId\":\"KPS1NzZ81H\"},{\"__type\":\"Pointer\",\"className\":\"_User\",\"objectId\":\"ZGvGqdOf7K\"},{\"__type\":\"Pointer\",\"className\":\"_User\",\"objectId\":\"ELBhQfqaXw\"},{\"__type\":\"Pointer\",\"className\":\"_User\",\"objectId\":\"zoiqxaXH0Q\"}],\"usesValidSmartLayout\":true,\"version\":2,\"weather\":{\"temperature\":295.7,\"humidity\":80,\"cloudCoverPercent\":75,\"typeId\":803,\"wind\":{\"speed\":3.0899948780244864,\"direction\":67.5}},\"endDate\":{\"$date\":1691948943111},\"notes\":null}}"] 
  */
};
