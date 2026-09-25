# Ride Fare Calculator 🚕

A React Native (Expo) mobile app that works out the **driving distance** and **ride fare** between two places in Sri Lanka and shows the route on a map.

It uses only free, open services, so **no Google Maps or API keys are needed**:

| Feature | Service |
| --- | --- |
| Map | [OpenStreetMap](https://www.openstreetmap.org) tiles shown with [Leaflet](https://leafletjs.com) inside a WebView |
| Suggestions while typing | [Photon](https://photon.komoot.io) |
| Place search with the Set button | [Nominatim](https://nominatim.org) |
| Driving route and distance | [OSRM](https://project-osrm.org) |

## Features

- Start typing a **Start** or **Drop** location and tap one of the suggestions, or type the full name and tap **Set**.
- Tap **Calculate Fare & Route** to get the driving route.
- The map shows a green start pin, a red drop pin and the route as a blue line.
- The trip summary shows:
  - **Total fare** in LKR
  - **Distance** in km
  - **Estimated drive time**
  - **Rate per km**
- **Confirm Ride** shows a confirmation with the trip details.
- Clear messages for empty fields, places that can't be found, missing routes, network errors and slow connections.

### How the fare is calculated

```
Total Fare (LKR) = Distance (km) × 120
```

The result is rounded to the nearest rupee.

## Requirements

- [Node.js](https://nodejs.org) (LTS version)
- One of these to run the app:
  - An Android or iPhone with the **Expo Go** app ([Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent) / [App Store](https://apps.apple.com/app/expo-go/id982107779)). It must support **Expo SDK 57**, so update it to the latest version.
  - An Android emulator from Android Studio.
- An internet connection. The map, place search and routing all come from online services.

## Setup

1. **Open the project folder**

   ```bash
   cd DistanceCalculatorApp
   ```

2. **Install the dependencies**

   ```bash
   npm install
   ```

3. **Start the development server**

   ```bash
   npx expo start
   ```

   A QR code appears in the terminal.

4. **Open the app**

   - **Android phone:** open Expo Go, tap **Scan QR code** and scan the code in the terminal.
   - **iPhone:** scan the QR code with the Camera app.
   - **Android emulator:** press `a` in the terminal.

### Troubleshooting

| Problem | Fix |
| --- | --- |
| The phone can't connect to the dev server | Put the phone and computer on the same Wi-Fi, or run `npx expo start --tunnel` |
| The QR code doesn't scan | In Expo Go, tap **Enter URL manually** and type the `exp://…` address shown in the terminal |
| "SDK version not supported" in Expo Go | Update Expo Go from the app store |
| The map, search or route doesn't load | Check that the phone has internet access |

### Useful commands while it's running

| Key or command | Action |
| --- | --- |
| `r` | Reload the app |
| `a` | Open the app on an Android emulator |
| `Ctrl + C` | Stop the server |

## Project structure

```
DistanceCalculatorApp/
├── App.js                        # Main screen: state, search/route logic, layout
├── src/
│   ├── app/
│   │   ├── index.tsx             # Home tab; shows the screen from App.js
│   │   └── _layout.tsx           # Tab navigation (Expo Router)
│   ├── components/
│   │   ├── LocationInput.js      # Location text box + Set button
│   │   ├── MapView.js            # Leaflet map in a WebView (markers, route line)
│   │   ├── StatRow.js            # One "label ... value" row
│   │   └── TripSummary.js        # Fare card + Confirm Ride button
│   ├── constants/config.js       # Settings, colours, API URLs, map HTML
│   ├── hooks/useLocationSuggestions.js  # Suggestions while typing (Photon)
│   └── utils/helpers.js          # fetchJson, error messages, number/time formatting
├── app.json                      # Expo app settings
└── package.json                  # Dependencies and scripts
```

The app uses [Expo Router](https://docs.expo.dev/router/introduction/), so screens live in `src/app/`. The calculator screen is in `App.js`, and the Home tab shows it.

> ⚠️ Don't run `npm run reset-project`. It replaces `src/app/` with a blank app, and the Home tab would stop showing the calculator.

## Configuration

These settings are in [`src/constants/config.js`](src/constants/config.js):

| Setting | Default | What it does |
| --- | --- | --- |
| `RATE_PER_KM` | `120` | Fare per kilometre in LKR |
| `DEFAULT_CENTER` | Colombo (`6.9271, 79.8612`) | Where the map starts |
| `COUNTRY_CODE` | `'lk'` | Limits place search to Sri Lanka. Set it to `''` to search worldwide |
| `REQUEST_TIMEOUT_MS` | `15000` | How long to wait for a network request before showing an error |
| `SEARCH_BBOX` | Sri Lanka | Area suggestions come from. Set it to `null` to suggest places worldwide |
| `SUGGESTION_MIN_CHARS` | `3` | Letters to type before suggestions appear |
| `SUGGESTION_DEBOUNCE_MS` | `400` | Pause after typing before suggestions are fetched |
| `SUGGESTION_LIMIT` | `5` | Maximum suggestions shown |

## Usage limits

The public Photon, Nominatim and OSRM servers are free and meant for light use. Nominatim allows about **1 request per second**. That's fine for development and testing. Before releasing the app to many users, host your own Nominatim and OSRM servers or switch to a paid provider.

## Tech stack

- [Expo](https://expo.dev) SDK 57 and React Native
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [react-native-webview](https://github.com/react-native-webview/react-native-webview)
- [Leaflet](https://leafletjs.com) and OpenStreetMap
- Photon, Nominatim and OSRM

## Credits

Map data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright). Routing by [OSRM](https://project-osrm.org).
