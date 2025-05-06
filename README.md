# Teacher Nexus Frontend

React-based frontend for the Teacher Nexus platform.

## Video Chat Feature

The platform now includes real-time video chat capabilities for tutor-student sessions using WebRTC technology.

### Features

- Peer-to-peer video and audio communication
- Screen sharing capabilities
- Mute audio/disable video controls
- Fullscreen mode
- Connection status indicators
- Automatically restricts access to active session times only

### Technical Implementation

The video chat feature is implemented using:

- **WebRTC** - For peer-to-peer media connections
- **Django Channels** - For WebSocket-based signaling
- **Redis** - As the channel layer backend for Django Channels
- **STUN/TURN** - For NAT traversal and fallback relay

### Architecture

1. **Signaling Server**: Django Channels provides the WebSocket connection for exchanging offers, answers, and ICE candidates.
2. **Authentication**: JWT token-based authentication for secure connections.
3. **Session Management**: Only allows users to join sessions they are participants in and only during the scheduled time window.
4. **Media Handling**: Manages local and remote media streams, and provides controls for audio, video, and screen sharing.

### Usage

Video chat is accessed directly from the session card by clicking the "Join Now" button during the active session window (15 minutes before scheduled time until the end of the session).

## Project Setup

### Prerequisites

- Node.js (v14+)
- npm or yarn
- Backend server running

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm start
```

### Environment Variables

Create a `.env` file with:

```
REACT_APP_API_BASE_URL=http://localhost:8000
```

### Building for Production

```bash
npm run build
```

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `node server-check.js`

Runs a diagnostic tool to check the backend server connectivity and API endpoints. This is useful for troubleshooting "Network Error" issues during login.

## Troubleshooting

### Network Error During Login

If you encounter a "Network Error" when trying to log in, follow these steps:

1. Check if the backend server is running:
   ```
   cd ../..  # Navigate to the project root
   python manage.py runserver
   ```

2. Verify the API URL in your `.env` file:
   ```
   REACT_APP_API_BASE_URL=http://localhost:8000
   ```

3. Run the server connection diagnostic tool:
   ```
   node server-check.js
   ```

4. Check CORS settings in the backend `settings.py`:
   ```python
   CORS_ALLOWED_ORIGINS = [
       'http://localhost:3000',
   ]
   ```

5. Ensure the login endpoint exists in the backend `urls.py`:
   ```python
   path('login/', LoginUserAPIView.as_view()),
   ```

6. Restart both the frontend and backend servers after making changes.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
