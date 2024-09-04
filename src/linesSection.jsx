const LinesSection = ({ lines }) => (
  <section
    className='headways'
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill,minmax(360px,1fr))",
      maxWidth: "360px",
      alignContent: "start",
      gap: "4px",
    }}
  >
    {lines.map((line) => {
      //console.log(line);

      return (
        <div
          key={line.key}
          style={{
            backgroundColor: `#${line.color}`,
            color: `#${line.textColor}`,
            width: "auto",
            padding: "0px 8px 16px 8px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
            }}
          >
            <h2
              style={{
                fontSize: "36px",
                textAlign: "left",
                fontWeight: "700",
              }}
            >
              {line.name}
            </h2>
            {line.scheduledInService === 0 &&
            line.actuallyInService === 0 ? null : (
              <img
                src={`/icons/${line.textColor}.gif`}
                style={{
                  height: "36px",
                }}
              ></img>
            )}
          </div>
          {line.scheduledInService === 0 && line.actuallyInService === 0 ? (
            <p>No service scheduled or operating.</p>
          ) : (
            <>
              {line.actuallyInService > 0 ? (
                <>
                  <p>There is currently a</p>
                  <p>
                    <span
                      style={{
                        fontSize: "48px",
                        fontWeight: "700",
                      }}
                    >
                      {Math.floor(line.highestHeadway)}
                    </span>{" "}
                    minute
                  </p>
                  <p>gap between buses.</p>
                </>
              ) : (
                <>
                  <p>No buses are running,</p>
                  <p>but there should be :c</p>
                </>
              )}
              <br />
              <p>
                Average headway: <b>{line.meanHeadway}</b> min
              </p>
              <p>
                Median headway: <b>{line.medianHeadway}</b> min
              </p>
              <p>
                Scheduled headway: <b>{line.schFreq}</b> min
              </p>
              <div
                style={{
                  height: "2px",
                  width: "100%",
                  margin: "8px 0px",
                  backgroundColor: "#111",
                }}
              ></div>
              <p>
                <b>{line.actuallyInService}</b> of{" "}
                <b>{line.scheduledInService}</b> scheduled buses are in service.
              </p>
              {line.noETAInService > 0 ? (
                <p>{line.noETAInService} buses have no ETAs</p>
              ) : null}
              <p>
                <b>{line.numBunched}</b> of <b>{line.actuallyInService}</b>{" "}
                running buses are bunched.
              </p>
            </>
          )}
        </div>
      );
    })}
  </section>
);

export default LinesSection;
