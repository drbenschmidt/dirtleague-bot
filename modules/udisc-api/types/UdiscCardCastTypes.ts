export type UDiscWsData = {
  msg: 'connect' | 'method' | 'sub' | 'result' | 'connected' | 'added';
};

export type UDiscWsMethodRequest = UDiscWsData & {
  msg: 'method';
  id: string;
  method: 'users.getCardCastUsersAndPlayers' | 'courses.findCourse';
};

export type UDiscWsSubRequest = UDiscWsData & {
  msg: 'sub';
  id: string;
  name: 'cardcastEntries';
  params: [];
};

export type UDiscWsSubResponse = UDiscWsData & {
  msg: 'added';
  id: string;
  collection: 'ScoreCard' | 'ScorecardEntry' | 'kadira_settings';
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
    players: Array<{
      __type: 'Pointer';
      className: '_Player';
      objectId: string;
    }>;
    users: Array<{
      __type: 'Pointer';
      className: '_User';
      objectId: string;
    }>;
    totalScore: number;
    roundRating: number;
    roundRatingMetadata: {
      reasoning: {
        roundRatingStatus: 'available';
      }
    }
  };
  id: string;
};

export type UDiscWsGetCardCastRequest = UDiscWsMethodRequest & {
  method: 'users.getCardCastUsersAndPlayers';
  params: [{ userIds: string[]; playerIds: string[] }];
};

export type UDiscWsFindCourseRequest = UDiscWsMethodRequest & {
  method: 'courses.findCourse';
  params: [{ courseId: string }];
};

export type UDiscWsMethodResult = UDiscWsData & {
  msg: 'result';
  id: string;
  result: unknown;
};

export type PlayersAndUsers = Array<{
  _id: string;
  name: string;
  fullName: string;
  username: string;
}>;

export type ScorecardResult = Array<{
  holeScores: Array<{
    strokes: number;
    changeVersion: number;
  }>;
  players: Array<{
    __type: 'Pointer';
    className: '_Player';
    objectId: string;
  }>;
  users: Array<{
    __type: 'Pointer';
    className: '_User';
    objectId: string;
  }>;
  totalScore: number;
}>;

export type UDiscWsGetCardCastResponse = UDiscWsMethodResult & {
  result: {
    users: Array<{
      _id: string;
      name: string;
      fullName: string;
      username: string;
    }>;
    players: Array<{
      _id: string;
      name: string;
      fullName: string;
      username: string;
    }>;
  };
};

export type UDiscCardCastPreloadedState = {
  courseDirectory: unknown;
  designer: unknown;
  leagues: unknown;
  places: unknown;
  scorecards: {
    scorecard: {
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
          };
        };
      }>;
      holesUpdatedAt: string;
      isFinished: boolean;
      layoutId: number;
      layoutName: string;
      notes: unknown;
      playFormat: 'singles' | 'teams';
      startDate: string;
      startingHoleIndex: number;
      stepCount: number;
      syncType: number;
      unlinkedPlayers: Array<{
        __type: 'Pointer';
        className: '_Player';
        objectId: string;
      }>;
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
        };
      };
      _created_at: string;
      _id: string;
      _p_createdBy: string;
      _updated_at: string;
    };
  };
  storeDirectory: unknown;
};
