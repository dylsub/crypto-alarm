// App.jsx
import React, { useEffect, useState, useRef } from "react";
import { Alchemy } from "alchemy-sdk";
import "./App.css";

// Replace with your Alchemy API key:
const apiKey = "demo";
const alchemy = new Alchemy({ apiKey });

const App = () => {
  const [prices, setPrices] = useState([]);
  const [error, setError] = useState(null);
  const [priceRanges, setPriceRanges] = useState(
    JSON.parse(localStorage.getItem("priceRanges")) || [] // Load from localStorage
  );
  const [audioEnabled, setAudioEnabled] = useState(false); // Track if alarm is enabled
  const audioRef = useRef(new Audio("/alarm.mp3")); // Reference to alarm audio

  const enableAudio = () => {
    setAudioEnabled(true);
  };

  const checkPriceAlerts = (priceList) => {
    let alertActive = false;

    // Check if any price is out of range
    priceList.forEach(({ symbol, price }) => {
      const range = priceRanges.find((range) => range.symbol === symbol);
      if (range) {
        const { min, max } = range;
        if (price < parseFloat(min) || price > parseFloat(max)) {
          alertActive = true;
        }
      }
    });

    // Handle alert state (play/stop audio and change background)
    const appElement = document.querySelector(".app");
    if (alertActive) {
      appElement.style.backgroundColor = "red"; // Set background to red
      if (audioEnabled && audioRef.current.paused) {
        audioRef.current.play(); // Play alarm
      }
    } else {
      appElement.style.backgroundColor = ""; // Reset background
      if (audioEnabled) {
        audioRef.current.pause(); // Stop alarm
        audioRef.current.currentTime = 0; // Reset audio to start
      }
    }
  };

  useEffect(() => {
    const symbols = ["SOL", "TRUMP", "MELANIA"];

    const fetchPrices = () => {
      alchemy.prices
        .getTokenPriceBySymbol(symbols)
        .then((data) => {
          const priceList = data.data.map(({ symbol, prices }) => {
            const price =
              prices.find((price) => price.currency === "usd")?.value || 0;
            return { symbol, price };
          });

          setPrices(priceList);

          // Merge new prices with existing ranges
          setPriceRanges((prevRanges) => {
            const updatedRanges = priceList.map(({ symbol, price }) => {
              const existingRange = prevRanges.find(
                (range) => range.symbol === symbol
              );
              return {
                symbol,
                min: existingRange?.min ?? "",
                max: existingRange?.max ?? price * 3,
              };
            });

            // Save to localStorage
            localStorage.setItem("priceRanges", JSON.stringify(updatedRanges));

            return updatedRanges;
          });

          // Check for price alerts
          checkPriceAlerts(priceList);
        })
        .catch((err) => {
          console.error("Error fetching prices:", err);
          setError("Failed to fetch prices. Please try again later.");
        });
    };

    // Fetch prices immediately
    fetchPrices();

    // Set up interval to refetch prices every 5 seconds
    const intervalId = setInterval(fetchPrices, 5000);

    // Clear interval on component unmount
    return () => clearInterval(intervalId);
  }, [priceRanges, audioEnabled]);

  const handleRangeChange = (symbol, newMin, newMax) => {
    setPriceRanges((prevRanges) => {
      const updatedRanges = prevRanges.map((range) =>
        range.symbol === symbol ? { ...range, min: newMin, max: newMax } : range
      );

      // Save updated ranges to localStorage
      localStorage.setItem("priceRanges", JSON.stringify(updatedRanges));
      return updatedRanges;
    });
  };

  return (
    <div className="app">
      <header>
        <h1>Crypto Prices Tracker</h1>
      </header>
      <main>
        <section>
          <h2>Latest Token Prices</h2>
          {error ? (
            <p className="error">{error}</p>
          ) : (
            <ul className="prices-list">
              {prices.map(({ symbol, price }) => (
                <li key={symbol}>
                  <div>
                    {symbol}: ${price}
                    <div>
                      <label>
                        Min:
                        <input
                          type="number"
                          step="0.01"
                          value={
                            priceRanges.find((range) => range.symbol === symbol)
                              ?.min || 0
                          }
                          onChange={(e) => {
                            const value = e.target.value;
                            handleRangeChange(
                              symbol,
                              value === "" ? "" : parseFloat(value),
                              priceRanges.find(
                                (range) => range.symbol === symbol
                              )?.max || price * 3
                            );
                          }}
                          placeholder="Enter Min"
                        />
                      </label>
                      <label>
                        Max:
                        <input
                          type="number"
                          step="0.01"
                          value={
                            priceRanges.find((range) => range.symbol === symbol)
                              ?.max || ""
                          }
                          onChange={(e) => {
                            const value = e.target.value;
                            handleRangeChange(
                              symbol,
                              priceRanges.find(
                                (range) => range.symbol === symbol
                              )?.min || 0,
                              value === "" ? "" : parseFloat(value)
                            );
                          }}
                          placeholder="Enter Max"
                        />
                      </label>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
        {!audioEnabled && (
          <button onClick={enableAudio} className="enable-audio">
            Enable Alarm
          </button>
        )}
      </main>
      <footer>
        <p>Powered by Alchemy SDK</p>
      </footer>
    </div>
  );
};

export default App;
