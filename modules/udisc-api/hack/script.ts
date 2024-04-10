import { parseScorecardById } from '../src';
import util from 'util';

const main = async () => {
    const cardID = 'A3A4OqNSkN';
    console.log(`Fetching scorecard ${cardID}...`);
    const result = await parseScorecardById(cardID);
    console.log(util.inspect(result, false, null, true));
};

main().catch(console.error);