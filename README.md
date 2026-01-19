# Flappy Bird Game 🐦

A complete Flappy Bird game built with React Native and Expo.

## Features

- ✅ Functional components with React hooks
- ✅ Bird falls due to gravity
- ✅ Tap screen to make bird jump
- ✅ Moving pipes from right to left
- ✅ Collision detection (bird vs pipes and ground)
- ✅ Score increases when bird passes a pipe
- ✅ Game over screen with restart button
- ✅ Built with React Native Animated API and requestAnimationFrame
- ✅ Clean, readable code with comments

## How to Run

### Prerequisites

- Node.js installed (v18 or higher recommended)
- npm or yarn package manager
- Expo CLI (optional, but recommended)

### Installation

1. Navigate to the project directory:

   ```bash
   cd flappy-bird
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

### Running the Game

Start the Expo development server:

```bash
npm start
# or
npx expo start
```

You can then:

- **Press `i`** to open in iOS simulator (requires Xcode on Mac)
- **Press `a`** to open in Android emulator (requires Android Studio)
- **Press `w`** to open in web browser
- **Scan QR code** with Expo Go app on your phone

### Playing the Game

1. **Start**: Tap anywhere on the screen to start the game
2. **Jump**: Tap the screen to make the bird jump/flap
3. **Objective**: Navigate through the pipes without colliding
4. **Score**: Each pipe you pass increases your score
5. **Game Over**: If you hit a pipe or the ground, the game ends
6. **Restart**: Tap the "Restart" button to play again

## Game File

The main game logic is located in:
- `app/(tabs)/index.tsx` - Complete Flappy Bird game implementation

## Technical Details

- **Game Loop**: Uses `requestAnimationFrame` for smooth 60fps animation
- **Physics**: Custom gravity and velocity system
- **Collision Detection**: Rectangle-based collision detection for bird vs pipes and ground
- **Animation**: React Native `Animated` API for bird movement
- **State Management**: React hooks (`useState`, `useRef`, `useEffect`)

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
