import axios from 'axios';
import { load as parseHtml } from 'cheerio';

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

// Function to parse scorecard from URL
export const parseScorecardByUrl = async (url: string): Promise<Scorecard> => {
    const response = await axios.get(url);
    const $ = parseHtml(response.data);

    // TODO: actually parse everything correctly.
    const courseName = $('h1.course-name').text().trim();
    const date = $('span.date').text().trim();
    const players: string[] = [];
    const scores: { [player: string]: number[] } = {};

    const scorecard: Scorecard = {
        courseName,
        date,
        players: [],
    };
  
    $('th.player').each((index, element) => {
      const playerName = $(element).text().trim();
      players.push(playerName);
      scores[playerName] = [];
    });
  
    $('td.score').each((index, element) => {
      const score = parseInt($(element).text().trim());
      const playerName = players[index % players.length];
      scores[playerName].push(score);
    });
  
    return scorecard;
  };
