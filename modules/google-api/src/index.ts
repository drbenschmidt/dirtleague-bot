import { google } from 'googleapis';

export const getSheetContext = (spreadsheetId: string) => {
    // Google Sheets API setup
    const googleSheets = google.sheets('v4');
    const auth = new google.auth.GoogleAuth({
        keyFile: 'path/to/service-account-key.json', // Replace with your service account key file path
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = googleSheets.spreadsheets;

    return {
        // Function to get the latest data from the Google Spreadsheet
        getData: async () => {
            const request = {
                spreadsheetId,
                auth,
            };

            // TODO: How does the data look?
            // TODO: Handle failure cases
            const response = await sheets.get(request);
            return response.data;
        }
    };
};

// Function to check for changes in the Google Spreadsheet and notify the Discord channel
// async function checkSpreadsheetChanges() {
//   const currentData = await getSpreadsheetData();
//   setInterval(async () => {
//     const newData = await getSpreadsheetData();
//     if (JSON.stringify(newData) !== JSON.stringify(currentData)) {
//       console.log('Spreadsheet updated!');
//       // client.channels.cache.get('YOUR_DISCORD_CHANNEL_ID')?.send('The Google Spreadsheet has been updated!');
//       currentData = newData;
//     }
//   }, 60000); // Check for changes every 1 minute
// }

// // Start checking for changes in the Google Spreadsheet
// checkSpreadsheetChanges();
