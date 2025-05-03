from flask import Flask, request, jsonify
from flask_cors import CORS
import serial
import serial.tools.list_ports
import time
import os
import re

import atexit

app = Flask(__name__)
CORS(app, supports_credentials=True)

# Variable global para la conexión serial
arduino = None

# Lista para almacenar las posiciones con bomba
bombas = []

# Lista para almacenar las posiciones verificadas (para mantener sincronización)
casillas_verificadas = []

def encontrar_puerto_arduino():
    """
    Busca automáticamente un puerto donde esté conectado un Arduino.
    Retorna el puerto encontrado o None si no se encuentra.
    """
    print("Buscando puertos disponibles...")
    puertos = list(serial.tools.list_ports.comports())
    
    if not puertos:
        print("No se encontraron puertos seriales disponibles.")
        return None
    
    # Mostrar todos los puertos disponibles
    print("Puertos disponibles:")
    for i, puerto in enumerate(puertos):
        print(f"{i+1}. {puerto.device} - {puerto.description}")
    
    # Primero intentamos encontrar uno que mencione "Arduino" en la descripción
    for puerto in puertos:
        if "arduino" in puerto.description.lower():
            print(f"Arduino detectado automáticamente en: {puerto.device}")
            return puerto.device
    
    # Si no se encuentra por descripción, intentamos el primer puerto disponible
    if puertos:
        print(f"Usando primer puerto disponible: {puertos[0].device}")
        return puertos[0].device
    
    return None

# Intentar conectar con Arduino
def inicializar_arduino():
    puerto = encontrar_puerto_arduino()
    
    if not puerto:
        print("No se detectó ningún Arduino. Por favor, verifica la conexión.")
        return None
    
    try:
        conexion = serial.Serial(port=puerto, baudrate=9600, timeout=3)
        print(f"Conexión con Arduino establecida correctamente en {puerto}")
        time.sleep(2)  # Dar tiempo al Arduino para inicializarse
        return conexion
    except Exception as e:
        print(f"Error al conectar con Arduino: {e}")
        return None

# Inicializar conexión
arduino = inicializar_arduino()

# Función para cerrar la conexión serial al terminar
def cerrar_conexion():
    if arduino and arduino.is_open:
        arduino.close()
        print("Conexión con Arduino cerrada")

# Registrar la función para ejecutarse al salir
atexit.register(cerrar_conexion)

def enviar_comando(comando, espera=0.5, intentos=3):
    """Envía un comando a Arduino y retorna la respuesta"""
    global arduino
    
    # Si no hay conexión, intentar reconectar
    if not arduino or not arduino.is_open:
        print("Intentando reconectar con Arduino...")
        arduino = inicializar_arduino()
        if not arduino:
            return "ERROR: Arduino no conectado. Verifica la conexión física."
    
    try:
        print(f"Enviando comando: {comando}")
        # Limpiar buffer de lectura antes de enviar nuevo comando
        arduino.reset_input_buffer()
        
        # Enviar el comando
        arduino.write(f"{comando}\n".encode())
        
        # Esperar el tiempo especificado para dar tiempo a procesar
        time.sleep(espera)
        
        # Leer respuesta con tiempo de espera mayor para comandos complejos
        respuesta = ""
        for _ in range(intentos):
            datos = arduino.read_all().decode().strip()
            respuesta += datos
            if datos:  # Si recibimos algo, podemos terminar
                break
            time.sleep(0.2)  # Pequeña espera entre intentos
        
        print(f"Respuesta recibida: {respuesta}")
        
        # Si no hay respuesta, devolver un mensaje genérico
        return respuesta or f"Comando '{comando}' enviado correctamente, sin respuesta"
    except Exception as e:
        print(f"Error al comunicarse con Arduino: {e}")
        # Intentar reconectar en caso de error
        arduino = inicializar_arduino()
        return f"ERROR: {str(e)}"

def sincronizar_estado_arduino():
    """
    Intenta sincronizar el estado actual del backend con el Arduino.
    Útil cuando se pierde la conexión o hay inconsistencias.
    """
    try:
        # Primero reiniciamos el Arduino a un estado conocido
        enviar_comando("NEW GAME", espera=1)
        time.sleep(0.5)
        
        # Si hay bombas configuradas, las agregamos nuevamente
        for pos in bombas:
            fila = (pos // 4) + 1
            columna = (pos % 4) + 1
            enviar_comando(f"ADD X:{fila}, Y:{columna}", espera=0.3)
        
        return True
    except Exception as e:
        print(f"Error al sincronizar estado: {e}")
        return False

@app.route('/status', methods=['GET'])
def verificar_estado():
    """Verifica el estado de la conexión con Arduino"""
    global arduino
    
    if not arduino:
        arduino = inicializar_arduino()
        
    estado = {
        "conectado": arduino is not None and arduino.is_open,
        "puerto": arduino.port if arduino and arduino.is_open else "No conectado",
        "bombas_activas": len(bombas),
        "casillas_verificadas": len(casillas_verificadas)
    }
    
    return jsonify(estado)

@app.route('/add', methods=['POST'])
def agregar_bomba():
    """Agrega una bomba en la posición especificada"""
    try:
        global bombas
        data = request.json
        if not data:
            return jsonify({'mensaje': "No se recibieron datos válidos."}), 400
            
        fila = data.get('fila')
        columna = data.get('columna')
        
        if not fila or not columna:
            return jsonify({'mensaje': "Faltan parámetros (fila o columna)."}), 400
            
        if not (1 <= fila <= 4 and 1 <= columna <= 4):
            return jsonify({'mensaje': "Posición fuera de rango (debe ser 1-4)."}), 400
            
        pos = (fila - 1) * 4 + (columna - 1)
        
        # Evitar duplicados en la lista del backend
        if pos in bombas:
            print(f"La bomba ya existe en posición ({fila},{columna})")
            return jsonify({
                'mensaje': f"Ya existe una bomba en la posición ({fila},{columna}).",
                'total_bombas': len(bombas),
                'posiciones_bombas': bombas
            })
            
        # Enviar el comando al Arduino en el formato correcto y esperar respuesta
        respuesta = enviar_comando(f"ADD X:{fila}, Y:{columna}", espera=1)
        print(f"Respuesta a ADD X:{fila}, Y:{columna}: {respuesta}")
        
        if "ERROR" in respuesta or "ya existe" in respuesta.lower():
            return jsonify({
                'mensaje': f"Error o la bomba ya existe: {respuesta}",
                'total_bombas': len(bombas)
            }), 400
        
        # Si el Arduino aceptó la bomba, la guardamos en nuestra lista
        if pos not in bombas:
            bombas.append(pos)
            print(f"Bomba agregada en posición ({fila},{columna}). Total bombas ahora: {len(bombas)}")
        
        # Retornar información más completa
        return jsonify({
            'mensaje': f"Bomba colocada en posición ({fila},{columna})",
            'total_bombas': len(bombas),
            'posiciones_bombas': bombas,
            'respuesta_arduino': respuesta
        })
    except Exception as e:
        print(f"ERROR al agregar bomba: {str(e)}")
        return jsonify({'mensaje': f"Error del servidor: {str(e)}"}), 500

@app.route('/del', methods=['POST'])
def eliminar_bomba():
    """Elimina una bomba de la posición especificada"""
    try:
        global bombas
        data = request.json
        if not data:
            return jsonify({'mensaje': "No se recibieron datos válidos."}), 400
            
        fila = data.get('fila')
        columna = data.get('columna')
        
        if not fila or not columna:
            return jsonify({'mensaje': "Faltan parámetros (fila o columna)."}), 400
            
        if not (1 <= fila <= 4 and 1 <= columna <= 4):
            return jsonify({'mensaje': "Posición fuera de rango (debe ser 1-4)."}), 400
            
        pos = (fila - 1) * 4 + (columna - 1)
        
        # Verificar si existe la bomba en la lista del backend
        if pos not in bombas:
            return jsonify({
                'mensaje': f"No existe una bomba en la posición ({fila},{columna}).",
                'total_bombas': len(bombas)
            })
            
        # Enviar el comando al Arduino en el formato correcto
        respuesta = enviar_comando(f"DEL X:{fila}, Y:{columna}", espera=1)
        print(f"Respuesta a DEL X:{fila}, Y:{columna}: {respuesta}")
        
        if "ERROR" in respuesta or "no hay bomba" in respuesta.lower():
            return jsonify({
                'mensaje': f"Error o no existe la bomba: {respuesta}",
                'total_bombas': len(bombas)
            }), 400
            
        # Si el Arduino aceptó la eliminación, la quitamos de nuestra lista
        if pos in bombas:
            bombas.remove(pos)
            print(f"Bomba eliminada de posición ({fila},{columna}). Total bombas ahora: {len(bombas)}")
            
        return jsonify({
            'mensaje': f"Bomba eliminada de la posición ({fila},{columna})",
            'total_bombas': len(bombas),
            'posiciones_bombas': bombas
        })
    except Exception as e:
        print(f"ERROR al eliminar bomba: {str(e)}")
        return jsonify({'mensaje': f"Error del servidor: {str(e)}"}), 500

@app.route('/reset', methods=['POST'])
def resetear():
    """Resetea todas las bombas y el estado del juego"""
    try:
        global bombas, casillas_verificadas
        
        bombas_antes = len(bombas)
        
        # Limpiar la lista de bombas del backend
        bombas.clear()
        
        # Limpiar la lista de casillas verificadas
        casillas_verificadas.clear()
        
        # Enviar comando de reseteo al Arduino
        respuesta = enviar_comando("RESET", espera=1)
        print(f"Respuesta a RESET: {respuesta}")
        
        if "ERROR" in respuesta:
            return jsonify({'mensaje': f"Error: {respuesta}"}), 500
            
        return jsonify({
            'mensaje': f"Todas las bombas han sido eliminadas ({bombas_antes} bombas eliminadas) y el juego ha sido reiniciado"
        })
    except Exception as e:
        print(f"ERROR al resetear: {str(e)}")
        return jsonify({'mensaje': f"Error al resetear: {str(e)}"}), 500
    
@app.route('/iniciar-juego', methods=['POST'])
def iniciar_juego():
    """Envía el comando para iniciar el juego"""
    try:
        global bombas, casillas_verificadas
        
        print("=== INICIANDO JUEGO ===")
        print(f"Estado de bombas antes de iniciar: {bombas}")
        
        # Verificar si hay suficientes bombas para jugar (al menos 1)
        if len(bombas) == 0:
            return jsonify({
                'mensaje': "No hay bombas configuradas. Agrega al menos una bomba antes de iniciar.",
                'estado': "configurando",
                'bombas_actuales': len(bombas)
            }), 400
            
        # Verificar si hay casillas libres para jugar (al menos 1)
        if len(bombas) == 16:
            return jsonify({
                'mensaje': "Todas las casillas tienen bombas. Elimina al menos una bomba antes de iniciar.",
                'estado': "configurando"
            }), 400
        
        # Limpiar la lista de casillas verificadas
        casillas_verificadas.clear()
        
        # Asegurarnos que estamos en el estado correcto antes de enviar JUGAR
        # Primero enviamos NEW GAME para asegurar que estamos en modo configuración
        enviar_comando("NEW GAME", espera=1)
        time.sleep(0.5)
        
        # Hacer una copia de seguridad de las bombas
        bombas_backup = bombas.copy()
        
        # Enviar de nuevo las bombas para asegurar que están configuradas correctamente
        respuesta_reset = enviar_comando("RESET", espera=1)
        print(f"Reset antes de configurar: {respuesta_reset}")
        
        # Reconfigurar todas las bombas
        for pos in bombas_backup:
            fila = (pos // 4) + 1
            columna = (pos % 4) + 1
            respuesta_add = enviar_comando(f"ADD X:{fila}, Y:{columna}", espera=0.3)
            print(f"Reconfigurando bomba en ({fila},{columna}): {respuesta_add}")
        
        # Ahora enviar el comando JUGAR al Arduino
        print(f"Enviando comando JUGAR. Bombas configuradas: {bombas_backup}")
        respuesta = enviar_comando("JUGAR", espera=1)
        print(f"Respuesta al iniciar juego: {respuesta}")
        
        # Verificar si la respuesta indica algún problema
        if "ERROR" in respuesta or "no hay bombas" in respuesta.lower():
            print("Error detectado en la respuesta. Abortando...")
            return jsonify({
                'mensaje': f"Error al iniciar juego: {respuesta}",
                'estado': "configurando"
            }), 500
        
        # Verificar estado final
        print(f"Estado de bombas después de iniciar: {bombas}")
        
        return jsonify({
            'mensaje': "Juego iniciado correctamente",
            'estado': "jugando",
            'bombas': len(bombas),
            'casillas_libres': 16 - len(bombas)
        })
    except Exception as e:
        print(f"ERROR en iniciar_juego: {str(e)}")
        return jsonify({'mensaje': f"Error al iniciar el juego: {str(e)}"}), 500

@app.route('/jugar', methods=['POST'])
def jugar():
    """Juega una posición en el tablero"""
    try:
        global bombas, casillas_verificadas
        data = request.json
        if not data or 'posicion' not in data:
            return jsonify({'mensaje': "Datos inválidos o falta posición."}), 400
            
        try:
            posicion = int(data['posicion'])
        except ValueError:
            return jsonify({'mensaje': "La posición debe ser un número."}), 400
            
        if not (1 <= posicion <= 16):  # Verificar rango (1-16 para interfaz de usuario)
            return jsonify({'mensaje': "Posición fuera de rango."}), 400
          
        # Convertir de la posición 1-16 al índice 0-15 para la lista bombas  
        indice_bomba = posicion - 1
        print(f"Jugando posición {posicion} (índice {indice_bomba})")
        
        # Ya no verificamos si la casilla ha sido jugada previamente
        # Simplemente registramos que esta casilla se está jugando ahora
        if indice_bomba not in casillas_verificadas:
            casillas_verificadas.append(indice_bomba)
            print(f"Añadida posición {posicion} a casillas verificadas")
        
        # Verificar si esta posición tiene una bomba según nuestro registro
        tiene_bomba_local = indice_bomba in bombas
        print(f"¿Tiene bomba según registro local?: {tiene_bomba_local}")
        
        # Enviar el comando al Arduino - damos tiempo de espera para este comando
        respuesta = enviar_comando(str(posicion), espera=1)
        print(f"Posición jugada: {posicion}, respuesta Arduino: {respuesta}")
        
        # Analizar la respuesta del Arduino para determinar el resultado
        respuesta_lower = respuesta.lower()
        
        # Manejar casos específicos
        if "ya verificada" in respuesta_lower or "posicion ya verificada" in respuesta_lower:
            # Ignoramos mensajes de "ya verificada" y tomamos la acción según nuestro conocimiento
            print(f"Arduino reportó 'ya verificada' pero lo ignoramos")
            
            if tiene_bomba_local:
                return jsonify({
                    'mensaje': "¡BOOM! Has encontrado una bomba", 
                    'resultado': 'bomba',
                    'respuesta_arduino': "Bomba encontrada (ignorando mensaje de ya verificada)"
                })
            else:
                # Si no hay bomba, es un acierto
                return jsonify({
                    'mensaje': "Acierto correcto", 
                    'resultado': 'acierto',
                    'respuesta_arduino': "Acierto (ignorando mensaje de ya verificada)",
                    'casillas_verificadas': len(casillas_verificadas)
                })
        elif "game over" in respuesta_lower:
            # Si hay game over, asegurarnos de que esta posición esté en nuestra lista de bombas
            if indice_bomba not in bombas:
                bombas.append(indice_bomba)
                print(f"Sincronizando: Añadida bomba en posición {posicion} a nuestra lista")
                
            return jsonify({
                'mensaje': "¡BOOM! Has encontrado una bomba", 
                'resultado': 'bomba',
                'respuesta_arduino': respuesta
            })
        elif "acierto correcto" in respuesta_lower:
            # Si Arduino reporta acierto pero teníamos una bomba registrada, corregir nuestro registro
            if indice_bomba in bombas:
                bombas.remove(indice_bomba)
                print(f"Corrigiendo registro: Eliminada bomba en posición {posicion} de nuestra lista")
                
            return jsonify({
                'mensaje': "Acierto correcto", 
                'resultado': 'acierto',
                'respuesta_arduino': respuesta,
                'casillas_verificadas': len(casillas_verificadas)
            })
        elif "ganaste" in respuesta_lower:
            return jsonify({
                'mensaje': "¡Felicidades! Has ganado el juego", 
                'resultado': 'victoria',
                'respuesta_arduino': respuesta
            })
        else:
            # Para cualquier otra respuesta no reconocida, usamos nuestro conocimiento local
            if tiene_bomba_local:
                # Si según nuestro registro hay bomba, asumimos que es game over
                return jsonify({
                    'mensaje': "¡BOOM! Has encontrado una bomba (predicción del servidor)", 
                    'resultado': 'bomba',
                    'respuesta_arduino': respuesta
                })
            else:
                # En caso contrario asumimos acierto
                return jsonify({
                    'mensaje': "Acierto correcto (predicción del servidor)", 
                    'resultado': 'acierto',
                    'respuesta_arduino': respuesta
                })
    except Exception as e:
        print(f"ERROR en función jugar: {str(e)}")
        return jsonify({'mensaje': f"Error en el servidor: {str(e)}"}), 500
    
@app.route('/estado-juego', methods=['GET'])
def estado_juego():
    """Obtiene el estado actual del juego"""
    try:
        global bombas, casillas_verificadas
        # Ahora también reportamos las casillas verificadas
        return jsonify({
            'bombas_configuradas': len(bombas),
            'posiciones_bombas': bombas,  # Solo para debugging, no mostrar en producción
            'casillas_verificadas': len(casillas_verificadas),
            'posiciones_verificadas': casillas_verificadas,  # Solo para debugging, no mostrar en producción
            'casillas_restantes': 16 - len(casillas_verificadas)
        })
    except Exception as e:
        return jsonify({'mensaje': f"Error al obtener estado: {str(e)}"}), 500

@app.route('/new-game', methods=['POST'])
def nuevo_juego():
    """Reinicia el juego a modo configuración"""
    try:
        global bombas, casillas_verificadas
        
        # Limpiar la lista de casillas verificadas del backend
        casillas_verificadas.clear()
        
        # No limpiamos las bombas porque queremos conservarlas para la próxima partida
        # Enviar comando de nuevo juego al Arduino
        respuesta = enviar_comando("NEW GAME", espera=1)
        
        if "ERROR" in respuesta:
            return jsonify({'mensaje': f"Error: {respuesta}"}), 500
            
        return jsonify({
            'mensaje': "Juego reiniciado, ahora en modo configuración",
            'bombas_actuales': len(bombas)
        })
    except Exception as e:
        return jsonify({'mensaje': f"Error al reiniciar juego: {str(e)}"}), 500

@app.route('/reiniciar-todo', methods=['POST'])
def reiniciar_todo():
    """Reinicia completamente el juego, borrando todas las bombas"""
    try:
        global bombas, casillas_verificadas
        
        # Limpiar todas las listas
        bombas.clear()
        casillas_verificadas.clear()
        
        # Primero reiniciar el juego 
        enviar_comando("NEW GAME", espera=1)
        time.sleep(0.5)
        
        # Luego resetear la RAM (eliminar todas las bombas)
        respuesta = enviar_comando("RESET", espera=1)
        
        if "ERROR" in respuesta:
            return jsonify({'mensaje': f"Error: {respuesta}"}), 500
            
        return jsonify({'mensaje': "Juego completamente reiniciado. Todas las bombas eliminadas."})
    except Exception as e:
        return jsonify({'mensaje': f"Error al reiniciar todo: {str(e)}"}), 500

@app.route('/puertos', methods=['GET'])
def listar_puertos():
    """Obtener lista de puertos disponibles para diagnóstico"""
    try:
        puertos = list(serial.tools.list_ports.comports())
        puertos_info = []
        
        for puerto in puertos:
            info = {
                "puerto": puerto.device,
                "descripcion": puerto.description,
                "fabricante": puerto.manufacturer if hasattr(puerto, 'manufacturer') else "Desconocido",
                "vid": puerto.vid if hasattr(puerto, 'vid') else None,
                "pid": puerto.pid if hasattr(puerto, 'pid') else None
            }
            puertos_info.append(info)
            
        return jsonify({
            "total_puertos": len(puertos_info),
            "puertos": puertos_info,
            "puerto_actual": arduino.port if arduino and arduino.is_open else None
        })
    except Exception as e:
        return jsonify({'mensaje': f"Error al obtener puertos: {str(e)}"}), 500

@app.route('/conectar/<puerto>', methods=['POST'])
def conectar_a_puerto(puerto):
    """Conecta manualmente a un puerto específico"""
    global arduino
    
    try:
        # Cerrar conexión existente si hay
        if arduino and arduino.is_open:
            arduino.close()
            
        # Intentar conectar al nuevo puerto
        arduino = serial.Serial(port=puerto, baudrate=9600, timeout=3)
        time.sleep(2)
        
        # Intentar sincronizar estado
        sincronizado = sincronizar_estado_arduino()
        
        return jsonify({
            "conectado": True,
            "puerto": puerto,
            "sincronizado": sincronizado,
            "mensaje": "Conexión establecida correctamente"
        })
    except Exception as e:
        return jsonify({
            "conectado": False,
            "puerto": puerto,
            "mensaje": f"Error al conectar: {str(e)}"
        }), 500

@app.route('/sincronizar', methods=['POST'])
def forzar_sincronizacion():
    """Fuerza la sincronización del estado entre el backend y el Arduino"""
    try:
        sincronizado = sincronizar_estado_arduino()
        if sincronizado:
            return jsonify({'mensaje': "Estado sincronizado correctamente"})
        else:
            return jsonify({'mensaje': "Error al sincronizar estado"}), 500
    except Exception as e:
        return jsonify({'mensaje': f"Error al sincronizar: {str(e)}"}), 500
    

# Agrega este código al final de tu archivo Flask, justo antes de "if __name__ == '__main__':"

@app.route('/cargar', methods=['POST'])
def cargar_archivo():
    """Carga un archivo .org con configuración de bombas"""
    try:
        global bombas
        
        # Verificar si se recibió un archivo
        if 'archivo' not in request.files:
            return jsonify({'mensaje': "No se recibió ningún archivo"}), 400
            
        archivo = request.files['archivo']
        
        # Verificar si se seleccionó un archivo
        if archivo.filename == '':
            return jsonify({'mensaje': "No se seleccionó ningún archivo"}), 400
            
        # Verificar la extensión del archivo
        if not archivo.filename.lower().endswith('.org'):
            return jsonify({'mensaje': "El archivo debe tener extensión .org"}), 400
            
        # Leer el contenido del archivo
        contenido = archivo.read().decode('utf-8')
        
        # Procesar el archivo línea por línea
        lineas = contenido.splitlines()
        
        # Primero, limpiar las bombas existentes
        bombas_antes = len(bombas)
        bombas.clear()
        
        # Resetear el estado en Arduino
        enviar_comando("NEW GAME", espera=1)
        time.sleep(0.5)
        enviar_comando("RESET", espera=1)
        time.sleep(0.5)
        
        # Contador de bombas procesadas con éxito
        bombas_procesadas = 0
        errores = []
        
        # Expresión regular para detectar comandos ADD
        # Esto busca patrones como: ADD x:1, y:2 o ADD x:3, y:4
        # También maneja comentarios en la misma línea: ADD x:3, y:1/////aqui
        patron_add = re.compile(r'ADD\s+x:(\d+),?\s*y:(\d+)(?:\s*\/\/.*)?')
        
        for linea in lineas:
            linea = linea.strip()
            # Ignorar líneas vacías y comentarios
            if not linea or linea.startswith('//'):
                continue
                
            # Buscar comandos ADD
            match = patron_add.search(linea)
            if match:
                try:
                    fila = int(match.group(1))
                    columna = int(match.group(2))
                    
                    # Verificar que la fila y columna estén en el rango correcto
                    if 1 <= fila <= 4 and 1 <= columna <= 4:
                        # Calcular la posición en el arreglo
                        pos = (fila - 1) * 4 + (columna - 1)
                        
                        # Verificar si la bomba ya está en la lista
                        if pos not in bombas:
                            # Enviar el comando al Arduino
                            respuesta = enviar_comando(f"ADD X:{fila}, Y:{columna}", espera=0.3)
                            
                            # Si no hay error, agregar a la lista
                            if "ERROR" not in respuesta and "ya existe" not in respuesta.lower():
                                bombas.append(pos)
                                bombas_procesadas += 1
                                print(f"Bomba agregada en ({fila},{columna}) desde archivo")
                            else:
                                errores.append(f"Error al agregar bomba en ({fila},{columna}): {respuesta}")
                    else:
                        errores.append(f"Posición fuera de rango: ({fila},{columna})")
                except Exception as e:
                    errores.append(f"Error al procesar línea '{linea}': {str(e)}")
            else:
                # Si la línea no está vacía, no es un comentario y no es un comando ADD reconocido
                if linea and linea.upper().startswith('ADD'):
                    errores.append(f"Comando no reconocido: {linea}")
        
        # Generar mensaje de respuesta
        if bombas_procesadas > 0:
            mensaje = f"Archivo cargado con éxito. Se configuraron {bombas_procesadas} bombas."
            if errores:
                mensaje += f" Se encontraron {len(errores)} errores."
        else:
            if errores:
                mensaje = f"No se pudieron configurar bombas. Se encontraron {len(errores)} errores."
            else:
                mensaje = "El archivo no contenía comandos ADD válidos."
        
        return jsonify({
            'mensaje': mensaje,
            'bombas_procesadas': bombas_procesadas,
            'errores': errores,
            'bombas_anteriores': bombas_antes,
            'bombas_actuales': len(bombas),
            'posiciones_bombas': bombas
        })
        
    except Exception as e:
        print(f"ERROR al cargar archivo: {str(e)}")
        return jsonify({'mensaje': f"Error al procesar el archivo: {str(e)}"}), 500

if __name__ == '__main__':
    # Si no hay conexión con Arduino, mostrar mensaje pero iniciar el servidor igualmente
    if not arduino:
        print("ADVERTENCIA: No se pudo conectar con Arduino. El servidor iniciará de todos modos.")
        print("Usa los endpoints /puertos y /conectar/<puerto> para gestionar la conexión.")
    
    print("Servidor del Buscaminas iniciado en http://localhost:5000")
    app.run(debug=False, host='0.0.0.0', port=5000)


