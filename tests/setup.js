// Run the whole suite in a timezone that is NOT UTC and NOT any location we test
// against. Astronomy is computed for a location, so every displayed value must be
// independent of the machine's clock. If someone reintroduces a bare
// toLocaleTimeString(), these tests fail here even though they would pass on a
// UTC CI runner.
process.env.TZ = 'Asia/Colombo'; // UTC+5:30, deliberately a half-hour offset
