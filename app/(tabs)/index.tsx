import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableWithoutFeedback,
  Dimensions,
  Animated,
  StatusBar,
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Game constants
const GRAVITY = 0.07; // Reduced gravity for better gameplay
const JUMP_STRENGTH = -7;
const PIPE_WIDTH = 60;
const PIPE_GAP = 180;
const PIPE_SPEED = 3;
const BIRD_SIZE = 40;
const BIRD_COLLISION_SIZE = 32; // Smaller collision box than visual size
const COLLISION_TOLERANCE = 3; // Small tolerance for more forgiving collisions
const GROUND_HEIGHT = 100;

// Calculate initial bird position (center of screen)
const BIRD_START_X = SCREEN_WIDTH / 4;
const BIRD_START_Y = SCREEN_HEIGHT / 2;

interface Pipe {
  id: number;
  x: number;
  topHeight: number;
  bottomHeight: number;
  passed: boolean;
}

const FlappyBirdGame: React.FC = () => {
  // Game state
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [pipes, setPipes] = useState<Pipe[]>([]);
  const [pipeIdCounter, setPipeIdCounter] = useState(0);

  // Bird position and velocity
  const birdY = useRef(new Animated.Value(BIRD_START_Y)).current;
  const birdYValue = useRef(BIRD_START_Y); // Track actual Y position for physics/collision
  const birdVelocity = useRef(0);

  // Animation frame reference
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(Date.now());
  
  // Refs to access current values in game loop
  const pipesRef = useRef<Pipe[]>([]);
  const gameOverRef = useRef(false);

  // Initialize game pipes
  useEffect(() => {
    if (gameStarted && !gameOver) {
      const initialPipes: Pipe[] = [];
      // Start first pipe further away to give player time
      const firstPipeDistance = SCREEN_WIDTH + 200;
      for (let i = 0; i < 3; i++) {
        const pipeX = firstPipeDistance + i * 300;
        const topHeight = Math.random() * (SCREEN_HEIGHT - PIPE_GAP - GROUND_HEIGHT - 100) + 50;
        initialPipes.push({
          id: i,
          x: pipeX,
          topHeight,
          bottomHeight: SCREEN_HEIGHT - GROUND_HEIGHT - topHeight - PIPE_GAP,
          passed: false,
        });
      }
      setPipes(initialPipes);
      pipesRef.current = initialPipes;
      setPipeIdCounter(3);
    }
  }, [gameStarted, gameOver]);

  // Keep refs in sync with state
  useEffect(() => {
    pipesRef.current = pipes;
  }, [pipes]);

  useEffect(() => {
    gameOverRef.current = gameOver;
  }, [gameOver]);

  // Handle game over - defined before game loop so it's accessible
  const handleGameOver = useCallback(() => {
    setGameOver(true);
    setGameStarted(false);
  }, []);

  // Game loop - handles physics and pipe movement
  useEffect(() => {
    // CRITICAL: Don't run game loop at all if game hasn't started
    if (!gameStarted || gameOver) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      // Ensure bird stays at start position when game is not running
      if (!gameStarted) {
        birdYValue.current = BIRD_START_Y;
        birdY.setValue(BIRD_START_Y);
        birdVelocity.current = 0;
      }
      return;
    }

    // Wait for pipes to be initialized before starting game loop
    if (pipes.length === 0) {
      return;
    }

    let currentPipeIdCounter = pipeIdCounter;
    let hasCollided = false; // Flag to prevent multiple collision triggers

    const gameLoop = () => {
      // Double check game is still active
      if (!gameStarted || gameOverRef.current || hasCollided) {
        return;
      }

      const now = Date.now();
      const deltaTime = Math.min(now - lastTimeRef.current, 50); // Cap deltaTime to prevent large jumps
      lastTimeRef.current = now;

      // Update bird physics (gravity) - only when game is running
      birdVelocity.current += GRAVITY * (deltaTime / 16.67); // Normalize to 60fps
      birdYValue.current = birdYValue.current + birdVelocity.current;
      const currentY = birdYValue.current;

      // Check ground collision (using collision size, not visual size)
      if (currentY >= SCREEN_HEIGHT - GROUND_HEIGHT - BIRD_COLLISION_SIZE / 2) {
        if (!hasCollided) {
          hasCollided = true;
          handleGameOver();
        }
        return;
      }

      // Check ceiling collision (using collision size, not visual size)
      if (currentY <= BIRD_COLLISION_SIZE / 2) {
        birdVelocity.current = 0;
        birdYValue.current = BIRD_COLLISION_SIZE / 2;
        birdY.setValue(BIRD_COLLISION_SIZE / 2);
      } else {
        birdY.setValue(currentY);
      }

      // Get current bird position for collision detection
      // Use smaller collision box than visual size for more accurate/fair collisions
      const birdPosY = birdYValue.current;
      const birdLeft = BIRD_START_X - BIRD_COLLISION_SIZE / 2;
      const birdRight = BIRD_START_X + BIRD_COLLISION_SIZE / 2;
      const birdTop = birdPosY - BIRD_COLLISION_SIZE / 2;
      const birdBottom = birdPosY + BIRD_COLLISION_SIZE / 2;

      // Update pipes and check collisions in the same update
      setPipes((prevPipes) => {
        // Don't process if already collided
        if (hasCollided) {
          return prevPipes;
        }

        let updatedPipes = prevPipes.map((pipe) => {
          const newX = pipe.x - PIPE_SPEED;

          // Check if bird passed the pipe (for scoring)
          if (!pipe.passed && newX + PIPE_WIDTH < BIRD_START_X) {
            setScore((prevScore) => prevScore + 1);
            return { ...pipe, x: newX, passed: true };
          }

          // Check collision with this pipe
          // Only check collision if pipe is near the bird (within reasonable range)
          const pipeLeft = newX;
          const pipeRight = newX + PIPE_WIDTH;
          
          // Skip collision check if pipe is too far to the right (not yet reached bird)
          if (pipeRight < birdLeft - COLLISION_TOLERANCE) {
            return { ...pipe, x: newX };
          }
          
          // Skip collision check if pipe is too far to the left (already passed bird)
          if (pipeLeft > birdRight + COLLISION_TOLERANCE) {
            return { ...pipe, x: newX };
          }

          // Check horizontal overlap with tolerance
          if (birdRight > pipeLeft + COLLISION_TOLERANCE && birdLeft < pipeRight - COLLISION_TOLERANCE) {
            // Check vertical overlap with top or bottom pipe
            // Add tolerance to make collisions more forgiving
            const topPipeBottom = pipe.topHeight;
            const bottomPipeTop = SCREEN_HEIGHT - GROUND_HEIGHT - pipe.bottomHeight;
            
            // Only collide if bird is actually overlapping the pipe (with tolerance)
            if (birdTop < topPipeBottom - COLLISION_TOLERANCE || birdBottom > bottomPipeTop + COLLISION_TOLERANCE) {
              if (!hasCollided) {
                hasCollided = true;
                handleGameOver();
              }
              return { ...pipe, x: newX };
            }
          }

          return { ...pipe, x: newX };
        });

        // Remove pipes that are off-screen and add new ones
        updatedPipes = updatedPipes.filter((pipe) => pipe.x + PIPE_WIDTH > 0);

        // Add new pipe when needed
        const lastPipe = updatedPipes[updatedPipes.length - 1];
        if (lastPipe && lastPipe.x < SCREEN_WIDTH - 300) {
          const topHeight =
            Math.random() * (SCREEN_HEIGHT - PIPE_GAP - GROUND_HEIGHT - 100) + 50;
          updatedPipes.push({
            id: currentPipeIdCounter,
            x: SCREEN_WIDTH,
            topHeight,
            bottomHeight: SCREEN_HEIGHT - GROUND_HEIGHT - topHeight - PIPE_GAP,
            passed: false,
          });
          currentPipeIdCounter += 1;
          setPipeIdCounter(currentPipeIdCounter);
        }

        // Update ref for next frame
        pipesRef.current = updatedPipes;

        return updatedPipes;
      });

      if (!hasCollided) {
        animationFrameRef.current = requestAnimationFrame(gameLoop);
      }
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameStarted, gameOver, pipeIdCounter, handleGameOver, pipes.length]);

  // Handle jump on tap
  const handleJump = () => {
    if (!gameStarted) {
      setGameStarted(true);
      setGameOver(false);
      setScore(0);
      // Reset bird position and velocity
      birdYValue.current = BIRD_START_Y;
      birdY.setValue(BIRD_START_Y);
      birdVelocity.current = 0; // Start with zero velocity
      lastTimeRef.current = Date.now(); // Reset timer
      return;
    }

    if (gameOver) {
      return;
    }

    // Make bird jump
    birdVelocity.current = JUMP_STRENGTH;
  };

  // Restart game
  const handleRestart = () => {
    setGameStarted(false);
    setGameOver(false);
    setScore(0);
    setPipes([]);
    // Reset bird position and velocity
    birdYValue.current = BIRD_START_Y;
    birdY.setValue(BIRD_START_Y);
    birdVelocity.current = 0;
    lastTimeRef.current = Date.now(); // Reset timer
  };

  return (
    <TouchableWithoutFeedback onPress={handleJump}>
      <View style={styles.container}>
        <StatusBar hidden />
        
        {/* Sky background */}
        <View style={styles.sky} />

        {/* Pipes */}
        {pipes.map((pipe) => (
          <View key={pipe.id}>
            {/* Top pipe */}
            <View
              style={[
                styles.pipe,
                {
                  left: pipe.x,
                  height: pipe.topHeight,
                  top: 0,
                },
              ]}
            />
            {/* Bottom pipe */}
            <View
              style={[
                styles.pipe,
                {
                  left: pipe.x,
                  height: pipe.bottomHeight,
                  bottom: GROUND_HEIGHT,
                },
              ]}
            />
          </View>
        ))}

        {/* Ground */}
        <View style={styles.ground} />

        {/* Bird */}
        <Animated.View
          style={[
            styles.birdContainer,
            {
              left: BIRD_START_X - BIRD_SIZE / 2,
              top: 0, // Start at top, then translateY will position it
              transform: [{ translateY: birdY }],
            },
          ]}
        >
          {/* Bird body */}
          <View style={styles.birdBody} />
          {/* Bird beak */}
          <View style={styles.birdBeak} />
          {/* Bird eye */}
          <View style={styles.birdEye} />
          {/* Bird wing */}
          <View style={styles.birdWing} />
        </Animated.View>

        {/* Score */}
        {gameStarted && !gameOver && (
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreText}>{score}</Text>
          </View>
        )}

        {/* Start screen */}
        {!gameStarted && !gameOver && (
          <View style={styles.overlay}>
            <Text style={styles.title}>Flappy Bird</Text>
            <Text style={styles.instruction}>Tap to Start</Text>
          </View>
        )}

        {/* Game over screen */}
        {gameOver && (
          <View style={styles.overlay}>
            <Text style={styles.gameOverText}>Game Over</Text>
            <Text style={styles.finalScoreText}>Score: {score}</Text>
            <TouchableWithoutFeedback onPress={handleRestart}>
              <View style={styles.restartButton}>
                <Text style={styles.restartButtonText}>Restart</Text>
              </View>
            </TouchableWithoutFeedback>
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#87CEEB', // Sky blue
    overflow: 'hidden',
  },
  sky: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: GROUND_HEIGHT,
    backgroundColor: '#87CEEB',
  },
  ground: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: GROUND_HEIGHT,
    backgroundColor: '#8B4513', // Brown
    borderTopWidth: 2,
    borderTopColor: '#654321',
  },
  birdContainer: {
    position: 'absolute',
    width: BIRD_SIZE,
    height: BIRD_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  birdBody: {
    width: BIRD_SIZE * 0.7,
    height: BIRD_SIZE * 0.6,
    backgroundColor: '#FFD700', // Gold/yellow
    borderRadius: BIRD_SIZE * 0.35,
    borderWidth: 2,
    borderColor: '#FFA500',
    position: 'absolute',
  },
  birdBeak: {
    position: 'absolute',
    right: -BIRD_SIZE * 0.15,
    top: BIRD_SIZE * 0.25,
    width: 0,
    height: 0,
    borderLeftWidth: BIRD_SIZE * 0.2,
    borderTopWidth: BIRD_SIZE * 0.1,
    borderBottomWidth: BIRD_SIZE * 0.1,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#FF8C00', // Dark orange beak
  },
  birdEye: {
    position: 'absolute',
    left: BIRD_SIZE * 0.2,
    top: BIRD_SIZE * 0.15,
    width: BIRD_SIZE * 0.15,
    height: BIRD_SIZE * 0.15,
    borderRadius: BIRD_SIZE * 0.075,
    backgroundColor: '#000000', // Black eye
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  birdWing: {
    position: 'absolute',
    left: BIRD_SIZE * 0.1,
    top: BIRD_SIZE * 0.3,
    width: BIRD_SIZE * 0.3,
    height: BIRD_SIZE * 0.2,
    backgroundColor: '#FFA500', // Orange wing
    borderRadius: BIRD_SIZE * 0.1,
    borderWidth: 1,
    borderColor: '#FF8C00',
  },
  pipe: {
    position: 'absolute',
    width: PIPE_WIDTH,
    backgroundColor: '#228B22', // Forest green
    borderWidth: 2,
    borderColor: '#006400',
    zIndex: 5,
  },
  scoreContainer: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  scoreText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textShadowColor: '#000000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 30,
  },
  title: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
    textShadowColor: '#000000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  instruction: {
    fontSize: 24,
    color: '#FFFFFF',
    marginTop: 20,
    textShadowColor: '#000000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  gameOverText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FF0000',
    marginBottom: 20,
    textShadowColor: '#000000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  finalScoreText: {
    fontSize: 32,
    color: '#FFFFFF',
    marginBottom: 30,
    textShadowColor: '#000000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  restartButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 10,
    marginTop: 20,
    borderWidth: 2,
    borderColor: '#45A049',
  },
  restartButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default FlappyBirdGame;
