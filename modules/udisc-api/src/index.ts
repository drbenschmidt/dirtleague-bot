import { Scorecard } from '@dirtleague/common';
import { UdiscCardCastClient } from './UdiscCardCastClient';

const UDISC_URL_REGEX = /https:\/\/udisc\.com\/scorecards\/([\w\d]{10})/g;

export const isValidUrl = (url: string): boolean => {
  return UDISC_URL_REGEX.test(url);
};

export const getIdFromUrl = (url: string): string | undefined => {
  try {
    return UDISC_URL_REGEX.exec(url)?.[1];
  } catch {
    return;
  }
}

export const generateUrlById = (id: string): string => {
  return `https://udisc.com/scorecards/${id}`;
};

export const parseScorecardById = async (id: string): Promise<Scorecard> => {
  return parseScorecardByUrl(generateUrlById(id));
};

// Function to parse scorecard from URL
export const parseScorecardByUrl = async (url: string): Promise<Scorecard> => {
  const client = new UdiscCardCastClient();
  await client.open();
  const preloadedState = await client.getPreloadedState(url);
  const scorecard = preloadedState.scorecards.scorecard;

  if (!scorecard.isFinished) {
    client.close();
    throw new Error('Unable to parse unfinished scorecard.');
  }

  const courseName = scorecard.courseName;
  const date = new Date(scorecard.endDate);
  const layoutName = scorecard.layoutName;

  const userIds = scorecard.users.map((u) => u.objectId);
  const playerIds = scorecard.unlinkedPlayers.map((p) => p.objectId);
  const entryIds = scorecard.entries.map((e) => e.objectId);

  const userPlayerInfo = await client.getUsersAndPlayers(userIds, playerIds);
  const entryInfo = await client.getEntries(entryIds);

  const getUser = (objectId: string) => {
    return userPlayerInfo.find((u) => u._id == objectId);
  };

  const playerUserMap = (p: { objectId: string }) => {
    const user = getUser(p.objectId);
    return {
      name: user?.name ?? 'unknown',
      username: user?.username ?? 'unknown',
      fullName: user?.fullName,
    };
  };

  // console.log(scorecardInfo.entries);
  client.close();

  return {
    courseName,
    layoutName,
    date,
    entries: entryInfo.map((entry) => {
      return {
        total: entry.totalScore,
        players: entry.users
          .map(playerUserMap)
          .concat(entry.players.map(playerUserMap)),
      };
    }),
  };
};
