/**
 * MCI - PDX Flight Intelligence - Google Apps Script API
 * 
 * SETUP:
 * 1. Open your Google Sheet
 * 2. Extensions - Apps Script
 * 3. Delete any code there and paste this entire file
 * 4. Click Deploy - New deployment
 * 5. Select type: Web app
 * 6. Execute as: Me
 * 7. Who has access: Anyone
 * 8. Click Deploy
 * 9. Copy the Web app URL - that is your API endpoint
 */

function doGet(e) {
  try {
    const tab = e.parameter.tab;
    
    if (!tab) {
      return jsonResponse({ error: 'Tab parameter required' }, 400);
    }
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(tab);
    
    if (!sheet) {
      return jsonResponse({ error: 'Tab ' + tab + ' not found' }, 404);
    }
    
    const data = sheet.getDataRange().getValues();
    
    return jsonResponse({ values: data });
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const tab = payload.tab;
    const rowData = payload.rowData;
    
    if (!tab || !rowData) {
      return jsonResponse({ error: 'Tab and rowData required' }, 400);
    }
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(tab);
    
    if (!sheet) {
      return jsonResponse({ error: 'Tab ' + tab + ' not found' }, 404);
    }
    
    sheet.appendRow(rowData);
    
    return jsonResponse({ success: true, rowsAdded: 1 });
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}

function jsonResponse(data, status) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Run this function once to set up your sheet with the correct tabs and headers
 * Click the function name below, then click Run
 */
function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Create trips tab
  let tripsSheet = ss.getSheetByName('trips');
  if (!tripsSheet) {
    tripsSheet = ss.insertSheet('trips');
  }
  tripsSheet.getRange(1, 1, 1, 7).setValues([[
    'id', 'date', 'direction', 'flight_time', 'day_of_week', 'notes', 'total_time'
  ]]);
  
  // Create time_segments tab
  let segmentsSheet = ss.getSheetByName('time_segments');
  if (!segmentsSheet) {
    segmentsSheet = ss.insertSheet('time_segments');
  }
  segmentsSheet.getRange(1, 1, 1, 7).setValues([[
    'id', 'trip_id', 'segment_type', 'start_time', 'end_time', 'duration_minutes', 'notes'
  ]]);
  
  // Create flights tab
  let flightsSheet = ss.getSheetByName('flights');
  if (!flightsSheet) {
    flightsSheet = ss.insertSheet('flights');
  }
  flightsSheet.getRange(1, 1, 1, 15).setValues([[
    'id', 'trip_id', 'airline', 'flight_number', 'route', 'departure_time',
    'scheduled_arrival', 'actual_arrival', 'cash_price', 'miles_used',
    'fees', 'booking_lead_days', 'status', 'delay_minutes', 'notes'
  ]]);
  
  // Delete default Sheet1 if it exists and is empty
  const sheet1 = ss.getSheetByName('Sheet1');
  if (sheet1 && sheet1.getLastRow() === 0) {
    ss.deleteSheet(sheet1);
  }
  
  SpreadsheetApp.getUi().alert('Setup complete! Your sheet now has trips, time_segments, and flights tabs.');
}
