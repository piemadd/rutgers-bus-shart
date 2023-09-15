import { useState, useEffect } from "react";
import routes from "./lines";
const endpoint = "https://store.transitstat.us/passio_go/rutgers/trains";
import banner from "./banner.svg";
import LinesSection from "./linesSection";

const weekDays = ["U", "M", "T", "W", "TH", "F", "S"];

const getCurrentSchedule = (route, timeStamp) => {
  const dayOfWeek = weekDays[new Date().getDay()];
  //console.log("day of week", dayOfWeek);

  console.log(dayOfWeek)

  const todaySchedule = route.schedule[dayOfWeek];
  const currentSchedule = todaySchedule.filter(
    (schedule) =>
      Number(schedule.min) <= timeStamp && Number(schedule.max) > timeStamp
  )[0];

  console.log(currentSchedule);

  return currentSchedule;
};

const App = () => {
  const [destinationHeadways, setDestinationHeadways] = useState({});
  const [lines, setLines] = useState([]);
  const [busesInService, setBusesInService] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    const updateData = async () => {
      const response = await fetch(endpoint);
      const data = await response.json();

      const dayOfWeek = weekDays[new Date().getDay()];
      //console.log("day of week", dayOfWeek);

      const now = new Date();
      const timeStamp = Number(`${now.getHours()}${now.getMinutes()}`);
      //console.log(timeStamp);

      let newLines = {};
      Object.keys(routes).forEach((routeKey) => {
        const route = routes[routeKey];

        const todaySchedule = route.schedule[dayOfWeek];
        const currentSchedule = getCurrentSchedule(route, `${now.getHours()}${now.getMinutes()}`);
        //const currentSchedule = getCurrentSchedule(route, '2046');

        newLines[routeKey] = {
          key: routeKey,
          name: route.name,
          color: route.color,
          textColor: route.textColor,
          schFreq: currentSchedule ? currentSchedule.freq : 0,
          tripLength: route.timeToComplete,
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

      let numInService = 0;
      Object.keys(data).forEach((busNumber) => {
        const bus = data[busNumber];

        if (!newLines[bus.lineCode]) {
          console.log(bus.lineCode);
          return;
        }

        if (bus.predictions.length === 0) {
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
        numInService++;
      });
      setBusesInService(numInService);

      //calculate headways
      Object.keys(newLines).forEach((lineKey) => {
        const line = newLines[lineKey];

        Object.keys(line.etasByStop).forEach((stopKey) => {
          //if more than 0 buses are coming, add the line runtime as the last eta
          if (line.etasByStop[stopKey].length > 0) {
            const lowestETA = Math.min(...line.etasByStop[stopKey]);
            line.etasByStop[stopKey].push(
              lowestETA + line.tripLength * 60 * 1000
            );
          }

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

        if (isNaN(headways[middle])) {
          newLines[lineKey].medianHeadway = 0;
          return;
        }

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

        if (isNaN(avg)) {
          newLines[lineKey].meanHeadway = 0;
          return;
        }

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

      //console.log(newLines);
      //console.log("Updated Data");

      setLines(Object.values(newLines));
      setLastUpdated(new Date());
      setLoading(false);
    };

    updateData();

    setInterval(() => {
      updateData();
    }, 15000);
  }, []);

  return (
    <div
      style={{
        margin: "16px",
        width: "calc(100% - 32px)",
        minHeight: "calc(100vh - 32px)",
      }}
    >
      <div
        style={{
          textAlign: "center",
        }}
      >
        <img
          src={banner}
          alt='RUScrewed Logo'
          style={{
            width: "100%",
            maxWidth: "500px",
          }}
        />
        <h1
          style={{
            color: "#cf102d",
          }}
        >
          RUSCREWED.ORG
        </h1>
        <p>
          &copy;2023 RUScrewed |{" "}
          <a
            style={{
              color: "#cf102d",
            }}
            href='mailto:contact@ruscrewed.org'
          >
            Email Us
          </a>
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
              {busesInService} buses in service
            </p>
          </>
        )}
        <p
          style={{
            margin: "16px",
          }}
        >
          <a
            style={{
              backgroundColor: "#cf102d",
              color: "white",
              padding: "8px",
            }}
            href='https://transitstat.us/rutgers'
            target='_blank'
          >
            Bus Tracker
          </a>
        </p>
        <p
          style={{
            display: "flex",
            flexDirection: "column",
          }}
        >
          <span>Unbunch our buses!</span>
          <span>🚌 ↔ 🚌 ↔ 🚌</span>
        </p>
      </div>
      {loading ? null : (
        <div
          style={{
            width: "100%",
            display: "flex",
            alignContent: "center",
            justifyContent: "center",
            marginTop: "16px",
          }}
        >
          <LinesSection
            lines={lines.sort((a, b) => a.name.localeCompare(b.name))}
          />
        </div>
      )}
    </div>
  );
};

export default App;
