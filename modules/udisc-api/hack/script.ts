import { parseScorecardById } from '../src';
import util from 'util';

const main = async () => {
  // Singles
  // const cardID = 'A3A4OqNSkN';
  // const cardID = 'zMdj5shY4o';
  const cardID = 'ATreaNC48L';

  // Doubles
  // const cardID = '1dcDgZV2X2';
  console.log(`Fetching scorecard ${cardID}...`);
  const result = await parseScorecardById(cardID);
  console.log(util.inspect(result, false, null, true));
};

main().catch(console.error);
