//takes array of station URLs and saves 'stations.json' with station data

import * as fs from 'fs';

const routes = {
  'Red': 307,
  'Blue': 310,
  'Brown': 313,
  'Green': 312,
  'Orange': 314,
  'Pink': 311,
  'Purple': 308,
  'Yellow': 309
}

const stations = {};

(async () => {
  for (const route in routes) {
    console.log(`https://www.transitchicago.com/traintracker/PredictionMap/tmStations.aspx?routeid=${routes[route]}`)
    const res = await fetch(`https://www.transitchicago.com/traintracker/PredictionMap/tmStations.aspx?routeid=${routes[route]}`)
    const raw = await res.text();
    //console.log(raw)
    const data = JSON.parse(raw)
    if (data.status !== 'OK') return;

    data.dataObject.forEach((station) => {
      if (!stations[station.UniqueStopId]) {
        stations[station.UniqueStopId] = {
          name: station.StopName,
          lat: station.Lat,
          lon: station.Lng,
          routes: []
        }
      }

      stations[station.UniqueStopId].routes.push(route);
    })
  }

  fs.writeFileSync('stations.json', JSON.stringify(stations));
})();

