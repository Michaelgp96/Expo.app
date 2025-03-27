// App.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  StyleSheet 
} from 'react-native';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  getDocs 
} from 'firebase/firestore';
import { db } from './firebaseConfig';  // Asegúrate de tener este archivo

// Componente ScoreBoard
const ScoreBoard = ({ onClose }) => {
  const [scores, setScores] = useState([]);

  useEffect(() => {
    const fetchScores = async () => {
      try {
        const scoresRef = collection(db, 'scores');
        const q = query(scoresRef, orderBy('score', 'desc'), limit(10));
        const querySnapshot = await getDocs(q);
        const fetchedScores = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setScores(fetchedScores);
      } catch (error) {
        console.error('Error fetching scores:', error);
      }
    };

    fetchScores();
  }, []);

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>Mejores Puntajes</Text>
        <FlatList 
          data={scores}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.scoreRow}>
              <Text style={styles.scoreText}>{item.name}</Text>
              <Text style={styles.scoreText}>{item.score}</Text>
            </View>
          )}
        />
        <TouchableOpacity style={[styles.button, styles.closeButton]} onPress={onClose}>
          <Text style={styles.buttonText}>Cerrar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Componente NameInput
const NameInput = ({ onStart }) => {
  const [name, setName] = useState('');

  const handleStart = () => {
    if (name.trim()) {
      onStart(name);
    }
  };

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>Ingresa tu Nombre</Text>
        <TextInput 
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Nombre del Jugador"
        />
        <TouchableOpacity 
          style={[styles.button, styles.startButton, { opacity: name.trim() ? 1 : 0.5 }]}
          onPress={handleStart}
          disabled={!name.trim()}
        >
          <Text style={styles.buttonText}>Comenzar Juego</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Componente CustomModal (Modal reutilizable)
const CustomModal = ({ title, children, onClose }) => {
  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>{title}</Text>
        {children}
        <TouchableOpacity style={[styles.button, styles.closeButton]} onPress={onClose}>
          <Text style={styles.buttonText}>Cerrar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Componente Game
const Game = ({ onBack, playerName }) => {
  const screenWidth = 360;
  const screenHeight = 500;
  const carWidth = 40;
  const laneWidth = screenWidth / 3;

  const [carLane, setCarLane] = useState(1);
  const [obstacles, setObstacles] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);

  // Generar obstáculos
  useEffect(() => {
    if (gameOver) return;
    const interval = setInterval(() => {
      const isFast = Math.random() < 0.3;
      setObstacles(prev => [
        ...prev,
        {
          lane: Math.floor(Math.random() * 3),
          top: 0,
          speed: isFast ? 25 : 15,
          points: isFast ? 40 : 10,
          color: isFast ? 'orange' : 'red'
        }
      ]);
    }, 2000);
    return () => clearInterval(interval);
  }, [gameOver]);

  // Mover obstáculos
  useEffect(() => {
    if (gameOver) return;
    const moveInterval = setInterval(() => {
      setObstacles(prev =>
        prev
          .map(obs => {
            const speedMultiplier = 1.5 + score / 1000;
            const newTop = obs.top + obs.speed * speedMultiplier;
            if (newTop > screenHeight) {
              setScore(prevScore => prevScore + obs.points);
              return null;
            }
            return { ...obs, top: newTop };
          })
          .filter(item => item !== null)
      );
    }, 100);
    return () => clearInterval(moveInterval);
  }, [gameOver, score]);

  // Detectar colisiones
  useEffect(() => {
    obstacles.forEach(obs => {
      if (obs.lane === carLane && obs.top > 440 && obs.top < 500) {
        setGameOver(true);
      }
    });
  }, [obstacles, carLane]);

  const moveLeft = () => {
    if (carLane > 0) setCarLane(carLane - 1);
  };

  const moveRight = () => {
    if (carLane < 2) setCarLane(carLane + 1);
  };

  // Guardar puntaje en Firestore
  const saveScore = async () => {
    try {
      await addDoc(collection(db, 'scores'), {
        name: playerName,
        score: score,
        timestamp: new Date()
      });
    } catch (error) {
      console.error("Error saving score:", error);
    }
  };

  const restartGame = () => {
    saveScore();
    setGameOver(false);
    setScore(0);
    setObstacles([]);
    setCarLane(1);
  };

  return (
    <View style={styles.gameContainer}>
      <View style={styles.road}>
        {/* Líneas de carril */}
        {Array.from({ length: 10 }).map((_, index) => (
          <React.Fragment key={`lines-${index}`}>
            <View style={[styles.laneLine, { top: index * 50, left: screenWidth / 2 - 2.5 }]} />
            <View style={[styles.laneLine, { top: index * 50, left: laneWidth / 2 - 2.5 }]} />
            <View style={[styles.laneLine, { top: index * 50, left: 2.5 * laneWidth - 2.5 }]} />
          </React.Fragment>
        ))}
        <View style={[styles.laneBorder, { left: laneWidth - 2.5 }]} />
        <View style={[styles.laneBorder, { left: 2 * laneWidth - 2.5 }]} />
      </View>

      {/* Coche del jugador */}
      <View style={[styles.car, { left: carLane * laneWidth + laneWidth / 2 - carWidth / 2 }]} />

      {/* Obstáculos */}
      {obstacles.map((obs, index) => (
        <View
          key={index}
          style={[styles.obstacle, {
            left: obs.lane * laneWidth + laneWidth / 2 - carWidth / 2,
            top: obs.top,
            backgroundColor: obs.color
          }]}
        />
      ))}

      {/* Puntaje */}
      <Text style={styles.scoreText}>Puntuación: {score}</Text>

      {/* Pantalla de Game Over */}
      {gameOver && (
        <View style={styles.gameOverContainer}>
          <Text style={styles.gameOverText}>Game Over</Text>
          <Text style={styles.finalScore}>Puntaje Final: {score}</Text>
          <TouchableOpacity style={[styles.button, styles.retryButton]} onPress={restartGame}>
            <Text style={styles.buttonText}>Volver a Jugar</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Controles */}
      <TouchableOpacity style={[styles.controlButton, styles.leftButton]} onPress={moveLeft}>
        <Text style={styles.controlButtonText}>⬅️</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.controlButton, styles.rightButton]} onPress={moveRight}>
        <Text style={styles.controlButtonText}>➡️</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, styles.backButton]} onPress={onBack}>
        <Text style={styles.buttonText}>Volver</Text>
      </TouchableOpacity>
    </View>
  );
};

// Componente App principal
export default function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [playerName, setPlayerName] = useState(null);

  const handleStartGame = (name) => {
    setPlayerName(name);
    setIsPlaying(true);
  };

  return (
    <View style={styles.appContainer}>
      {(!isPlaying && playerName === null) && (
        <View style={styles.menuContainer}>
          <Text style={styles.title}>🏎️ Juego de Coches</Text>
          <TouchableOpacity style={[styles.button, styles.startButton]} onPress={() => setPlayerName('')}>
            <Text style={styles.buttonText}>Iniciar Juego 🚗</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.infoButton]} onPress={() => setShowInstructions(true)}>
            <Text style={styles.buttonText}>Instrucciones</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.infoButton]} onPress={() => setShowScoreboard(true)}>
            <Text style={styles.buttonText}>Mejores Puntajes</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.infoButton]} onPress={() => setShowAbout(true)}>
            <Text style={styles.buttonText}>Acerca de</Text>
          </TouchableOpacity>
        </View>
      )}

      {(!isPlaying && playerName === '') && (
        <NameInput onStart={handleStartGame} />
      )}

      {(isPlaying && playerName) && (
        <Game 
          onBack={() => {
            setIsPlaying(false);
            setPlayerName(null);
          }}
          playerName={playerName}
        />
      )}

      {showInstructions && (
        <CustomModal title="Instrucciones" onClose={() => setShowInstructions(false)}>
          <Text style={styles.modalText}>
            Mueve tu coche azul entre los tres carriles usando los botones de dirección. Evita los obstáculos y acumula puntos GENIALESSSS.
          </Text>
        </CustomModal>
      )}

      {showAbout && (
        <CustomModal title="Acerca de" onClose={() => setShowAbout(false)}>
          <Text style={styles.modalText}>
            Este juego fue desarrollado para simular una carretera con obstáculos. Parte del curso de Tecnologías Avanzadas de aplicaciones móviles.
          </Text>
        </CustomModal>
      )}

      {showScoreboard && (
        <ScoreBoard onClose={() => setShowScoreboard(false)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center'
  },
  menuContainer: {
    padding: 24,
    borderRadius: 12,
    backgroundColor: '#333',
    alignItems: 'center'
  },
  title: {
    fontSize: 24,
    color: '#f5f5f5',
    marginBottom: 24,
    textAlign: 'center'
  },
  button: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    width: 200,
    marginVertical: 8
  },
  startButton: {
    backgroundColor: '#3050e8'
  },
  infoButton: {
    backgroundColor: '#30a84f'
  },
  closeButton: {
    backgroundColor: '#e83030'
  },
  retryButton: {
    backgroundColor: '#ffcc00'
  },
  backButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#e83030'
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 8,
    width: '90%',
    maxWidth: 500,
    alignItems: 'center'
  },
  modalTitle: {
    fontSize: 20,
    marginBottom: 16,
    color: '#222'
  },
  modalText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
    color: '#222'
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    width: '100%'
  },
  scoreText: {
    fontSize: 16,
    color: '#222'
  },
  gameContainer: {
    width: 360,
    height: 500,
    backgroundColor: '#222',
    position: 'relative',
    overflow: 'hidden',
    alignSelf: 'center',
    borderRadius: 8,
    marginTop: 20
  },
  road: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: '#555',
    borderWidth: 5,
    borderColor: 'white'
  },
  laneLine: {
    position: 'absolute',
    width: 5,
    height: 30,
    backgroundColor: 'white',
    zIndex: 1
  },
  laneBorder: {
    position: 'absolute',
    width: 5,
    height: '100%',
    backgroundColor: 'white',
    zIndex: 1
  },
  car: {
    position: 'absolute',
    bottom: 10,
    width: 40,
    height: 60,
    backgroundColor: '#3050e8',
    borderRadius: 5,
    zIndex: 2
  },
  obstacle: {
    position: 'absolute',
    width: 40,
    height: 60,
    borderRadius: 5,
    zIndex: 2
  },
  gameOverContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10
  },
  gameOverText: {
    fontSize: 32,
    color: 'white',
    marginBottom: 16,
    fontWeight: 'bold'
  },
  finalScore: {
    fontSize: 20,
    color: 'white',
    marginBottom: 24
  },
  controlButton: {
    position: 'absolute',
    bottom: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 12,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: 'white',
    zIndex: 3
  },
  leftButton: {
    left: 30
  },
  rightButton: {
    right: 30
  },
  controlButtonText: {
    fontSize: 20,
    color: 'white'
  }
});
