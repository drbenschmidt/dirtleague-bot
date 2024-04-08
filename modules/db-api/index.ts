import mongoose from 'mongoose';

// MongoDB setup
mongoose.connect('mongodb://localhost:27017/scorecards', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define MongoDB schema
const scorecardSchema = new mongoose.Schema({
  courseName: mongoose.SchemaTypes.String,
  date: mongoose.SchemaTypes.String,
  players: mongoose.SchemaTypes.Array,
  scores: mongoose.Schema.Types.Mixed,
});

const ScorecardModel = mongoose.model('Scorecard', scorecardSchema);

interface ScorecardDocument extends mongoose.Document {
  courseName: string;
  date: string;
  players: string[];
  scores: { [player: string]: number[] };
}

// Function to save scorecard to MongoDB
async function saveScorecard(scorecard: Scorecard): Promise<ScorecardDocument> {
    const newScorecard = new ScorecardModel(scorecard);
    return newScorecard.save();
};
