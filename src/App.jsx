import { useState, useEffect } from "react";
import routes from "./lines";
const endpoint = "https://store.transitstat.us/passio_go/rutgers/trains";

const weekDays = ["U", "M", "T", "W", "R", "F", "S"];

const App = () => {
  const [destinationHeadways, setDestinationHeadways] = useState({});
  const [runNumbers, setRunNumbers] = useState([]);
  const [buses, setBuses] = useState([]);
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    const updateData = async () => {
      const response = await fetch(endpoint);
      const data = await response.json();

      const dayOfWeek = weekDays[new Date().getDay()];

      const now = new Date();
      const timeStamp = Number(`${now.getHours()}${now.getMinutes()}`);

      let newLines = {};
      Object.keys(routes).forEach((routeKey) => {
        const route = routes[routeKey];

        const todaySchedule = route.schedule[dayOfWeek];
        const currentSchedule = todaySchedule.filter(
          (schedule) =>
            Number(schedule.min) <= timeStamp &&
            Number(schedule.max) > timeStamp
        )[0];

        newLines[routeKey] = {
          key: routeKey,
          name: route.name,
          color: route.color,
          textColor: route.textColor,
          schFreq: currentSchedule ? currentSchedule.freq : 0,
          etasByStop: {},
          headwaysByStop: {},
          highestHeadway: 0,
          medianHeadway: 0,
          meanHeadway: 0,
          scheduledInService: currentSchedule
            ? Math.ceil(route.timeToComplete / currentSchedule.freq)
            : 0,
          actuallyInService: 0,
          numBunched: 0,
        };
      });

      Object.keys(data).forEach((busNumber) => {
        const bus = data[busNumber];

        if (!newLines[bus.lineCode]) {
          console.log(bus.lineCode);
          return;
        }

        bus.predictions.forEach((stop) => {
          if (!newLines[bus.lineCode]["etasByStop"][stop.stationID]) {
            newLines[bus.lineCode]["etasByStop"][stop.stationID] = [];
          }

          newLines[bus.lineCode]["etasByStop"][stop.stationID].push(
            stop.actualETA
          );
        });

        newLines[bus.lineCode].actuallyInService++;
      });

      //calculate headways
      Object.keys(newLines).forEach((lineKey) => {
        const line = newLines[lineKey];

        Object.keys(line.etasByStop).forEach((stopKey) => {
          const stop = line.etasByStop[stopKey];

          let headways = [];

          stop
            .sort((a, b) => a - b)
            .forEach((eta, index, array) => {
              if (index === 0) return;

              headways.push((eta - array[index - 1]) / 1000 / 60);
            });

          newLines[lineKey]["headwaysByStop"][stopKey] = headways;
        });
      });

      //find highest headway
      Object.keys(newLines).forEach((lineKey) => {
        const line = newLines[lineKey];

        Object.keys(line.headwaysByStop).forEach((stopKey) => {
          const stop = line.headwaysByStop[stopKey];

          stop.forEach((headway) => {
            if (headway > newLines[lineKey].highestHeadway) {
              newLines[lineKey].highestHeadway = headway;
            }
          });
        });
      });

      //find the median headway of each line
      Object.keys(newLines).forEach((lineKey) => {
        const line = newLines[lineKey];

        const headways = Object.values(line.headwaysByStop)
          .flat()
          .sort((a, b) => a - b);
        const middle = Math.ceil(headways.length / 2);

        newLines[lineKey].medianHeadway = headways[middle];
      });

      //find the mean headway of each line
      Object.keys(newLines).forEach((lineKey) => {
        const line = newLines[lineKey];

        const headways = Object.values(line.headwaysByStop)
          .flat()
          .sort((a, b) => a - b);
        const sum = headways.reduce((a, b) => a + b, 0);
        const avg = sum / headways.length;

        newLines[lineKey].meanHeadway = Math.round(avg);
      });

      //figure out how many trains are bunched
      Object.keys(newLines).forEach((lineKey) => {
        const line = newLines[lineKey];

        //find the stop where the most trains are bunched
        let mostBunchedStop = null;
        let mostBunchedStopCount = 0;

        Object.keys(line.headwaysByStop).forEach((stopKey) => {
          const stop = line.headwaysByStop[stopKey];

          let bunchedCount = 0;

          stop.forEach((headway) => {
            if (headway < line.schFreq / 4) {
              bunchedCount++;
            }
          });

          //accounting for the fact that the number of actual headways is one less than the number of trains
          if (bunchedCount > 0) {
            bunchedCount++;
          }

          if (bunchedCount > mostBunchedStopCount) {
            mostBunchedStop = stopKey;
            mostBunchedStopCount = bunchedCount;
          }
        });

        newLines[lineKey].numBunched = mostBunchedStopCount;
      });

      console.log(newLines);

      console.log("Updated Data");

      setLines(newLines);

      setLastUpdated(new Date());
      setLoading(false);
    };

    updateData();

    setInterval(() => {
      updateData();
    }, 30000);
  }, []);

  return (
    <>
      <h1>CTA System Headways</h1>
      <p>
        v0.0.1 | Made by <a href='https://piemadd.com/'>Piero</a> in
        collaboration with <a href='https://twitter.com/jeremyzorek'>Jeremy</a>{" "}
        and <a href='https://www.youtube.com/@alexwithclipboard'>Alex</a>
      </p>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <p>
            Last Updated:{" "}
            {lastUpdated.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          <p
            style={{
              textAlign: "center",
              marginBottom: "8px",
            }}
          >
            {runNumbers.length} trains are currently running
          </p>
          <main>
            <section className='headways'>
              {Object.values(destinationHeadways).map((destination) => {
                return (
                  <div
                    key={`${destination.line}-${destination.stationKey}`}
                    style={{
                      backgroundColor: lines[destination.line].color,
                      color: lines[destination.line].textColor,
                    }}
                  >
                    <p>{lines[destination.line].name} Line towards</p>
                    <h2>{destination.stationKey}</h2>
                    {destination.numOfTrains === 1 ? (
                      <p>Only train terminates</p>
                    ) : null}
                    <p
                      style={{
                        fontSize: "1.5rem",
                      }}
                    >
                      {destination.headways}
                    </p>
                    {destination.numOfTrains === 1 ? null : (
                      <p>
                        {destination.numOfTrains}{" "}
                        {destination.numOfTrains === 1 ? "train" : "trains"}{" "}
                        running
                      </p>
                    )}
                  </div>
                );
              })}
            </section>
          </main>
        </>
      )}
    </>
  );
};

export default App;
