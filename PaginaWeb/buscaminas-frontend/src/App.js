import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const FILAS = [1, 2, 3, 4];
const COLUMNAS = [1, 2, 3, 4];
const API_BASE_URL = "http://localhost:5000";

function App() {
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);
  const [estadoConexion, setEstadoConexion] = useState("No verificada");
  const [modoJuego, setModoJuego] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [puntaje, setPuntaje] = useState(0);
  const [casillasMarcadas, setCasillasMarcadas] = useState(Array(16).fill(false));
  const [bombasColocadas, setBombasColocadas] = useState(Array(16).fill(false));

  // Verificar conexión al cargar el componente
  useEffect(() => {
    verificarConexion();
    // También consultamos el estado del juego
    consultarEstadoJuego();
  }, []);

  // Función para verificar conexión con el backend
  const verificarConexion = async () => {
    try {
      setCargando(true);
      const res = await axios.get(`${API_BASE_URL}/status`);
      
      if (res.data.conectado) {
        setEstadoConexion("Conectado");
        setMensaje("Conexión establecida con Arduino.");
      } else {
        setEstadoConexion("Desconectado");
        setMensaje("Arduino no conectado. Verifica la conexión.");
      }
    } catch (error) {
      setEstadoConexion("Desconectado");
      setMensaje("Error: No se puede conectar con el backend.");
      console.error("Error de conexión:", error);
    } finally {
      setCargando(false);
    }
  };

  // Función para consultar el estado actual del juego
  const consultarEstadoJuego = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/estado-juego`);
      console.log("Estado del juego:", res.data);
      
      // Actualizar el estado de bombas colocadas
      if (res.data.posiciones_bombas && Array.isArray(res.data.posiciones_bombas)) {
        const nuevoBombasColocadas = Array(16).fill(false);
        res.data.posiciones_bombas.forEach(pos => {
          nuevoBombasColocadas[pos] = true;
        });
        setBombasColocadas(nuevoBombasColocadas);
        
        // Actualizar contador de bombas en la consola para depuración
        console.log(`Bombas actualizadas: ${res.data.posiciones_bombas.length}`);
      }
      
      // Actualizar casillas verificadas
      if (res.data.posiciones_verificadas && Array.isArray(res.data.posiciones_verificadas)) {
        const nuevasCasillasMarcadas = Array(16).fill(false);
        res.data.posiciones_verificadas.forEach(pos => {
          nuevasCasillasMarcadas[pos] = true;
        });
        setCasillasMarcadas(nuevasCasillasMarcadas);
      }
      
      return res.data; // Retornar los datos para poder usarlos si es necesario
    } catch (error) {
      console.error("Error al consultar estado:", error);
      return null;
    }
  };

  // Función para manejar la adición de bombas
  const manejarBomba = async (fila, columna) => {
    try {
      setCargando(true);
      const res = await axios.post(`${API_BASE_URL}/add`, { fila, columna });
      setMensaje(`(${fila},${columna}): ${res.data.mensaje}`);
      
      // Actualizar la representación visual de las bombas
      const pos = (fila - 1) * 4 + (columna - 1);
      const nuevoEstado = [...bombasColocadas];
      nuevoEstado[pos] = true;
      setBombasColocadas(nuevoEstado);
      
      // Consultar el estado actual del juego para asegurar sincronización
      await consultarEstadoJuego();
      
    } catch (error) {
      console.error("Error al añadir bomba:", error);
      setMensaje(
        `Error al añadir bomba en (${fila},${columna}): ${
          error.response?.data?.mensaje || error.message || "Error desconocido"
        }`
      );
    } finally {
      setCargando(false);
    }
  };

  // Función para eliminar una bomba
  const eliminarBomba = async (fila, columna) => {
    try {
      setCargando(true);
      const res = await axios.post(`${API_BASE_URL}/del`, { fila, columna });
      setMensaje(`(${fila},${columna}): ${res.data.mensaje}`);
      
      // Actualizar la representación visual de las bombas
      const pos = (fila - 1) * 4 + (columna - 1);
      const nuevoEstado = [...bombasColocadas];
      nuevoEstado[pos] = false;
      setBombasColocadas(nuevoEstado);
      
      // Consultar el estado actual del juego para asegurar sincronización
      await consultarEstadoJuego();
      
    } catch (error) {
      console.error("Error al eliminar bomba:", error);
      setMensaje(
        `Error al eliminar bomba en (${fila},${columna}): ${
          error.response?.data?.mensaje || error.message || "Error desconocido"
        }`
      );
    } finally {
      setCargando(false);
    }
  };

  // Función para resetear el juego
  const resetear = async () => {
    try {
      setCargando(true);
      const res = await axios.post(`${API_BASE_URL}/reset`);
      setMensaje(res.data.mensaje);
      
      // Limpiar el estado local
      setBombasColocadas(Array(16).fill(false));
      
    } catch (error) {
      console.error("Error al resetear:", error);
      setMensaje(
        `Error al resetear: ${
          error.response?.data?.mensaje || error.message || "Error desconocido"
        }`
      );
    } finally {
      setCargando(false);
    }
  };

  // Función para iniciar el juego
  const iniciarJuego = async () => {
    try {
      setCargando(true);
      
      // Primero verificamos que haya bombas colocadas
      const estadoActual = await consultarEstadoJuego();
      
      if (!estadoActual || !estadoActual.posiciones_bombas || estadoActual.posiciones_bombas.length === 0) {
        setMensaje("Error: No hay bombas colocadas. Debes colocar al menos una bomba antes de iniciar el juego.");
        return;
      }
      
      if (estadoActual.posiciones_bombas.length === 16) {
        setMensaje("Error: Todas las casillas tienen bombas. Debe haber al menos una casilla sin bomba.");
        return;
      }
      
      // Si hay bombas colocadas, procedemos a iniciar el juego
      const res = await axios.post(`${API_BASE_URL}/iniciar-juego`);
      setMensaje(res.data.mensaje);
      setModoJuego(true);
      setResultado(null);
      setPuntaje(0);
      setCasillasMarcadas(Array(16).fill(false));
    } catch (error) {
      console.error("Error al iniciar el juego:", error);
      setMensaje(
        `Error al iniciar el juego: ${
          error.response?.data?.mensaje || error.message || "Error desconocido"
        }`
      );
    } finally {
      setCargando(false);
    }
  };

  // Función para jugar una posición
  const jugar = async (posicion) => {
    try {
      setCargando(true);
      const res = await axios.post(`${API_BASE_URL}/jugar`, { posicion });
      setMensaje(res.data.mensaje);
      
      // Si la casilla ya fue verificada según el backend
      if (res.data.resultado === 'repetida') {
        // Aseguramos que nuestro estado local refleje que la casilla ya fue marcada
        const nuevoEstadoCasillas = [...casillasMarcadas];
        nuevoEstadoCasillas[posicion - 1] = true;
        setCasillasMarcadas(nuevoEstadoCasillas);
        return;
      }
      
      // Para cualquier otro resultado, marcar la casilla como jugada
      const nuevoEstadoCasillas = [...casillasMarcadas];
      nuevoEstadoCasillas[posicion - 1] = true;
      setCasillasMarcadas(nuevoEstadoCasillas);
      
      // Manejar el resultado
      if (res.data.resultado === 'acierto') {
        setPuntaje(prevPuntaje => prevPuntaje + 1);
      } else if (res.data.resultado === 'bomba') {
        setResultado('derrota');
        setModoJuego(false);
        // Ahora que la partida terminó, consultamos el estado para ver todas las bombas
        await consultarEstadoJuego();
      } else if (res.data.resultado === 'victoria') {
        setResultado('victoria');
        setModoJuego(false);
      }
      
    } catch (error) {
      console.error("Error al jugar:", error);
      setMensaje(
        `Error al jugar posición ${posicion}: ${
          error.response?.data?.mensaje || error.message || "Error desconocido"
        }`
      );
    } finally {
      setCargando(false);
    }
  };

  // Función para cargar un archivo
  const handleFileUpload = async (e) => {
    const archivo = e.target.files[0];
    
    if (!archivo) {
      setMensaje("No se seleccionó ningún archivo.");
      return;
    }
    
    // Verificar extensión del archivo
    if (!archivo.name.toLowerCase().endsWith('.org')) {
      setMensaje("Error: Solo se aceptan archivos con extensión .org");
      e.target.value = null; // Resetear el input de archivo
      return;
    }
    
    try {
      setCargando(true);
      const formData = new FormData();
      formData.append("archivo", archivo);
      
      const res = await axios.post(`${API_BASE_URL}/cargar`, formData);
      setMensaje(res.data.mensaje);
      
      // Actualizar el estado local después de cargar
      await consultarEstadoJuego();
      
    } catch (error) {
      console.error("Error al cargar el archivo:", error);
      setMensaje(
        `Error al cargar el archivo: ${
          error.response?.data?.mensaje || error.message || "Error desconocido"
        }`
      );
    } finally {
      setCargando(false);
      e.target.value = null; // Resetear el input de archivo después del procesamiento
    }
  };

  // Función para empezar un nuevo juego
  const nuevoJuego = async () => {
    try {
      setCargando(true);
      const res = await axios.post(`${API_BASE_URL}/new-game`);
      setMensaje(res.data.mensaje);
      
      // Resetear estados del juego pero mantener las bombas
      setModoJuego(false);
      setResultado(null);
      setPuntaje(0);
      setCasillasMarcadas(Array(16).fill(false));
      
      // Actualizar estado de bombas desde el backend
      await consultarEstadoJuego();
      
    } catch (error) {
      console.error("Error al iniciar nuevo juego:", error);
      setMensaje(
        `Error al iniciar nuevo juego: ${
          error.response?.data?.mensaje || error.message || "Error desconocido"
        }`
      );
    } finally {
      setCargando(false);
    }
  };

  // Función para forzar sincronización
  const sincronizarEstado = async () => {
    try {
      setCargando(true);
      const res = await axios.post(`${API_BASE_URL}/sincronizar`);
      setMensaje(res.data.mensaje);
      await consultarEstadoJuego();
    } catch (error) {
      console.error("Error al sincronizar:", error);
      setMensaje(`Error al sincronizar: ${error.message}`);
    } finally {
      setCargando(false);
    }
  };

  // Función para reiniciar todo (juego y bombas)
  const reiniciarTodo = async () => {
    try {
      setCargando(true);
      const res = await axios.post(`${API_BASE_URL}/reiniciar-todo`);
      setMensaje(res.data.mensaje);
      
      // Resetear todos los estados
      setModoJuego(false);
      setResultado(null);
      setPuntaje(0);
      setCasillasMarcadas(Array(16).fill(false));
      setBombasColocadas(Array(16).fill(false));
      
    } catch (error) {
      console.error("Error al reiniciar todo:", error);
      setMensaje(`Error al reiniciar todo: ${error.message}`);
    } finally {
      setCargando(false);
    }
  };

  // Calcular contadores
  const cantidadBombas = bombasColocadas.filter(b => b).length;
  const cantidadCasillasVerificadas = casillasMarcadas.filter(c => c).length;
  const casillasSeguras = 16 - cantidadBombas;

  // Render del componente
  return (
    <div className="container">
      <header className="header">
        <h1>Buscaminas - {modoJuego ? "Modo Juego" : "Configuración de Bombas"}</h1>
        
        <div className="status-bar">
          <div className={`connection-status ${estadoConexion.toLowerCase()}`}>
            <span className="status-dot"></span>
            <p>Estado: {estadoConexion}</p>
          </div>
          <button 
            onClick={verificarConexion} 
            disabled={cargando}
            className="btn btn-status">
            Verificar conexión
          </button>
          <button 
            onClick={sincronizarEstado} 
            disabled={cargando || estadoConexion === "Desconectado"}
            className="btn btn-sync">
            Sincronizar
          </button>
        </div>
      </header>

      <div className="main-content">
        <div className="game-info">
          {!modoJuego && (
            <div className="config-info">
              <h2>Configuración</h2>
              <div className="stat-container">
                <div className="stat-item">
                  <span className="stat-label">Bombas:</span>
                  <span className="stat-value bomb-count">{cantidadBombas}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Casillas libres:</span>
                  <span className="stat-value safe-count">{casillasSeguras}</span>
                </div>
              </div>
              
              <div className="upload-section">
                <h3>Cargar configuración</h3>
                <label className="file-label">
                  Seleccionar archivo .org:
                  <input 
                    type="file" 
                    onChange={handleFileUpload} 
                    className="file-input" 
                    accept=".org"
                    disabled={cargando || estadoConexion === "Desconectado"}
                  />
                </label>
              </div>
            </div>
          )}

          {modoJuego && (
            <div className="game-stats">
              <h2>Estado del juego</h2>
              <div className="stat-container">
                <div className="stat-item">
                  <span className="stat-label">Puntaje:</span>
                  <span className="stat-value score">{puntaje}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Casillas verificadas:</span>
                  <span className="stat-value">{cantidadCasillasVerificadas}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Casillas restantes:</span>
                  <span className="stat-value">{16 - cantidadCasillasVerificadas}</span>
                </div>
              </div>
              
              {resultado && (
                <div className={`resultado resultado-${resultado}`}>
                  <h3>{resultado === 'victoria' ? '¡FELICIDADES! ¡GANASTE!' : '¡GAME OVER!'}</h3>
                </div>
              )}
            </div>
          )}
          
          <div className="led-indicators">
            <div className={`led ${modoJuego && !resultado ? 'led-blue' : ''}`}>
              <span className="led-label">Jugando</span>
            </div>
            <div className={`led ${resultado === 'derrota' ? 'led-red' : ''}`}>
              <span className="led-label">Game Over</span>
            </div>
            <div className={`led ${resultado === 'victoria' ? 'led-green' : ''}`}>
              <span className="led-label">Victoria</span>
            </div>
          </div>
          
          <div className="action-buttons">
            {!modoJuego ? (
              <>
                <button 
                  className="btn btn-reset" 
                  onClick={resetear}
                  disabled={cargando || estadoConexion === "Desconectado"}
                >
                  Resetear Bombas
                </button>
                
                <button 
                  className="btn btn-start" 
                  onClick={iniciarJuego}
                  disabled={cargando || estadoConexion === "Desconectado" || cantidadBombas === 0 || cantidadBombas === 16}
                >
                  Iniciar Juego
                </button>
              </>
            ) : (
              <button 
                className="btn btn-new-game" 
                onClick={nuevoJuego}
                disabled={cargando || estadoConexion === "Desconectado"}
              >
                Nuevo Juego
              </button>
            )}
            
            <button 
              className="btn btn-reset-all" 
              onClick={reiniciarTodo}
              disabled={cargando || estadoConexion === "Desconectado"}
            >
              Reiniciar Todo
            </button>
          </div>
        </div>

        <div className="grid-container">
          <h2>Tablero 4x4</h2>
          <div className="grid">
            {FILAS.map(fila => (
              <div key={`row-${fila}`} className="grid-row">
                {COLUMNAS.map(columna => {
                  const posicion = (fila - 1) * 4 + columna;
                  const esMarcada = casillasMarcadas[posicion - 1];
                  const tieneBomba = bombasColocadas[posicion - 1];
                  
                  return (
                    <div 
                      key={`${fila}-${columna}`} 
                      className={`cell 
                        ${esMarcada ? 'marcada' : ''} 
                        ${tieneBomba && (!modoJuego || resultado) ? 'bomba' : ''}
                        ${esMarcada && tieneBomba ? 'explosion' : ''}
                        ${esMarcada && !tieneBomba ? 'segura' : ''}
                      `}
                    >
                      <span className="cell-number">{posicion}</span>
                      <span className="cell-coords">{`(${fila},${columna})`}</span>
                      
                      {!modoJuego ? (
                        <div className="cell-buttons">
                          <button 
                            onClick={() => manejarBomba(fila, columna)} 
                            className="btn btn-add"
                            disabled={cargando || estadoConexion === "Desconectado" || tieneBomba}
                            title="Agregar bomba"
                          >
                            +
                          </button>
                          {tieneBomba && (
                            <button 
                              onClick={() => eliminarBomba(fila, columna)} 
                              className="btn btn-del"
                              disabled={cargando || estadoConexion === "Desconectado"}
                              title="Eliminar bomba"
                            >
                              -
                            </button>
                          )}
                        </div>
                      ) : (
                        <button 
                          onClick={() => jugar(posicion)} 
                          className="btn btn-play"
                          disabled={
                            cargando || 
                            estadoConexion === "Desconectado" || 
                            esMarcada || 
                            resultado !== null
                          }
                          title={esMarcada ? "Ya verificada" : "Verificar casilla"}
                        >
                          {esMarcada ? "✓" : "Verificar"}
                        </button>
                      )}
                      
                      {/* Indicadores visuales */}
                      {tieneBomba && (!modoJuego || resultado) && (
                        <span className="bomb-icon">💣</span>
                      )}
                      {esMarcada && tieneBomba && (
                        <span className="explosion-icon">💥</span>
                      )}
                      {esMarcada && !tieneBomba && !modoJuego && (
                        <span className="safe-icon">✓</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {cargando && <div className="loading-overlay">
        <div className="loading-spinner"></div>
        <p>Procesando...</p>
      </div>}
      
      <div className="mensaje-container">
        <p className={`mensaje ${mensaje.includes("Error") ? "mensaje-error" : ""}`}>
          {mensaje || "Esperando acción..."}
        </p>
      </div>
    </div>
  );
}

export default App;